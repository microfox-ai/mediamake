/**
 * thumbs: YouTube thumbnails (thumbnails/jobs/<job>/thumbs.json) and music posters / album artwork
 * (thumbnails/jobs/<job>/poster.json), see thumbnails/README.md.
 *
 * Usage: npm run thumbs -w lyrics_videos -- init <job> [--poster] [--brand=<folder>] [--title="…"]
 *        npm run thumbs -w lyrics_videos -- cutout <job> input/photo.jpg [--model=birefnet-portrait] [--point=0.5,0.4] [--all]
 *        npm run thumbs -w lyrics_videos -- render <job> [A1,B2] [--png] [--guides] [--no-sheet]
 *        npm run thumbs -w lyrics_videos -- pick <job> A2            (one final)
 *        npm run thumbs -w lyrics_videos -- pick <job> A2,B1,C3      (three for YouTube's A/B test)
 *        npm run thumbs -w lyrics_videos -- keep <job> B2            (lock thumbnails the user likes as they are)
 *        npm run thumbs -w lyrics_videos -- pick <poster-job> A3 [--to=<release folder>]   (the cover; --to also copies it there as cover.jpg)
 *        npm run thumbs -w lyrics_videos -- canvas <poster-job>      (the Spotify Canvas loop → out/posters/<job>/canvas/remotion.mp4)
 *
 *   init     makes the job folder; with --brand copies the brand's logos, fonts and thumbnail
 *            profile (brands/<brand>/graphics/brand/thumbnail.json) into it
 *   cutout   segments the subject locally (thumbnails/tools/cutout.py) → cutouts/<name>.png
 *   render   checks the spec, downloads missing Google fonts, renders every variant (or the IDs
 *            given) to out/thumbnails/<job>/<ID>.jpg, the labelled sheets, and index.json
 *   pick     copies the chosen IDs to out/thumbnails/<job>/final/ (under YouTube's 2 MB limit);
 *            for a poster, the one cover (3000×3000 JPEG) to out/posters/<job>/final/
 *   keep     snapshots IDs into out/thumbnails/<job>/kept/ (image + resolved spec); render then
 *            leaves them alone and warns if their spec has changed since
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia, renderStill } from '@remotion/renderer';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { type Box, type FontSpec, type JobSpec, KINDS, type ResolvedVariant, TIMESTAMP_ZONE, fontFile, jobKind, jobScale, jobSize, resolveJob, styleVariants } from '../thumbnails/spec.ts';
import { PRESETS } from '../thumbnails/presets/index.ts';
import { ALL_TREATMENTS } from '../thumbnails/treatments.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JOBS = path.join(ROOT, 'thumbnails', 'jobs');
const MAX_BYTES = 2 * 1024 * 1024; // YouTube's thumbnail limit

const rel = (p: string) => path.relative(ROOT, p);
const done = (p: string) => console.log(`✔ ${rel(p)}`);
const warn = (m: string) => console.log(`⚠ ${m}`);

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const [cmd, job, third] = args.filter(a => !a.startsWith('--'));
const flag = (k: string) => flags.find(f => f.startsWith(`--${k}=`))?.slice(k.length + 3);

const jobDir = (j: string) => path.join(JOBS, j);
/** thumbs.json for a thumbnail job, poster.json for a poster. */
const specFile = (j: string) => {
  const found = Object.values(KINDS).map(k => path.join(jobDir(j), k.spec)).find(f => fs.existsSync(f));
  if (!found) throw new Error(`No thumbs.json or poster.json in ${rel(jobDir(j))}: run init first`);
  return found;
};
const readSpec = (j: string) => JSON.parse(fs.readFileSync(specFile(j), 'utf8')) as JobSpec;
/** out/thumbnails/<job>/ or out/posters/<job>/ */
const outDir = (j: string) => path.join(ROOT, 'out', KINDS[jobKind(readSpec(j))].out, j);

/** Pixel size of an image file (any format ffprobe reads). */
const imageSize = (file: string): [number, number] | null => {
  const r = spawnSync(ffprobeInstaller.path, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file], { encoding: 'utf8' });
  const m = r.stdout?.trim().match(/^(\d+)x(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};

/** What streaming services reject in album artwork (DistroKid's list). */
const ARTWORK_BANNED: [RegExp, string][] = [
  [/https?:|www\.|\.(com|net|org|io|co|in|me|fm|tv)\b/i, 'a website address'],
  [/@\w|\b(instagram|tiktok|twitter|facebook|youtube|snapchat|x\.com)\b/i, 'a social media handle or name'],
  [/\b(spotify|itunes|apple music|deezer|tidal|amazon music|soundcloud)\b/i, 'a streaming service name'],
  [/[$€£₹]\s?\d|\bfree download\b/i, 'a price'],
  [/\b(cd|compact disc|vinyl|cassette|dvd)\b/i, 'a reference to physical media'],
];

/** Google Fonts serves TTF to clients without a browser user agent. */
const fetchFont = async (j: string, f: FontSpec) => {
  const file = path.join(jobDir(j), 'fonts', fontFile(f));
  if (fs.existsSync(file)) return;
  const axis = f.italic ? `ital,wght@1,${f.weight ?? 400}` : `wght@${f.weight ?? 400}`;
  const res = await fetch(`https://fonts.googleapis.com/css2?family=${f.family.replace(/\s+/g, '+')}:${axis}`);
  const url = res.ok ? (await res.text()).match(/url\((https:[^)]+)\)/)?.[1] : undefined;
  if (!url) {
    warn(`${f.family} ${f.weight ?? 400}${f.italic ? ' italic' : ''} is not on Google Fonts (check the name and weights at fonts.google.com), or put the file at ${rel(file)}`);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
  done(file);
};

const overlaps = ([ax, ay, aw, ah]: Box, [bx, by, bw, bh]: Box) => ax < bx + bw && bx < ax + aw && ay < by + bh && by < ay + ah;

/** Problems worth fixing before anyone looks: missing files, fonts not in the job, things under YouTube's timestamp, a poster job with no text-free cover. */
const lint = (j: string, spec: JobSpec, variants: ResolvedVariant[]) => {
  const poster = jobKind(spec) === 'poster';
  const [cw, ch] = jobSize(spec);
  const scale = jobScale(spec);
  const families = new Set((spec.fonts ?? []).map(f => f.family));
  const seen = new Set<string>();
  const once = (m: string) => !seen.has(m) && (seen.add(m), warn(m));
  for (const v of variants) {
    for (const l of v.layers) {
      if ((l.type === 'photo' || l.type === 'cutout' || l.type === 'image' || l.type === 'logo') && l.src && !/^(https?:|data:)/.test(l.src) && !fs.existsSync(path.join(jobDir(j), l.src)))
        once(`${v.id}: ${l.id ?? l.type} needs ${l.src}, which is missing`);
      // album artwork must not look soft: warn when a picture is blown up past its own pixels
      if (poster && (l.type === 'photo' || l.type === 'cutout') && l.src && fs.existsSync(path.join(jobDir(j), l.src))) {
        const dims = imageSize(path.join(jobDir(j), l.src));
        if (dims) {
          const [bw, bh] = (l.box ?? [0, 0, cw, ch]).slice(2) as [number, number];
          const cover = (l.fit ?? 'cover') === 'cover';
          const up = (cover ? Math.max(bw / dims[0], bh / dims[1]) : Math.min(bw / dims[0], bh / dims[1])) * (l.zoom ?? 1) * scale;
          if (up > 3) once(`${l.src} (${dims.join('×')}) is blown up ${up.toFixed(1)}×: below DistroKid's 1000 px minimum in real detail. Upscale it first`);
          else if (up > 1.15) once(`${l.src} (${dims.join('×')}) is blown up ${up.toFixed(1)}× for ${cw * scale}×${ch * scale}: it will look soft. Upscale it (Midjourney Upscale or a fal upscaler) for a crisp cover`);
        }
      }
      if (l.type === 'text') {
        if (poster) {
          const text = (typeof l.lines === 'string' ? [l.lines] : l.lines.map(x => (typeof x === 'string' ? x : x.t))).join(' ');
          for (const [re, what] of ARTWORK_BANNED) if (re.test(text)) once(`${v.id}: "${text}" (${l.id}) looks like ${what}: streaming services reject album artwork with that`);
        }
        const fams = [l.font, ...(Array.isArray(l.lines) ? l.lines.map(x => (typeof x === 'string' ? undefined : x.font)) : [])].filter(Boolean) as string[];
        for (const f of fams) if (!families.has(f)) once(`${v.id}: font "${f}" (${l.id}) is not in the job's fonts: it would fall back to a system font`);
        // attached lines follow their target's letters, so their box says nothing about y
        if (!poster && l.box && !l.attach && overlaps(l.box, TIMESTAMP_ZONE)) once(`${v.id}: ${l.id} reaches into the bottom-right corner, where YouTube shows the video length`);
      }
      if (!poster && l.type === 'logo' && (l.anchor === 'br' || (l.at && overlaps([l.at[0] - 1, l.at[1] - 1, 2, 2], TIMESTAMP_ZONE))))
        once(`${v.id}: ${l.id} sits under YouTube's timestamp (bottom right); move it`);
    }
  }
  for (const s of spec.styles) {
    const preset = s.preset ?? spec.defaults?.preset;
    if (preset && PRESETS[preset]?.needs.includes('cut') && !(s.hero?.cut ?? spec.defaults?.hero?.cut) && !styleVariants(s).every(v => v.hero?.cut))
      once(`style ${s.id} (${preset}) wants a cutout (hero.cut): make one with \`thumbs cutout\``);
  }
  // a poster job always has the art alone; text versions are only ever extra styles on top of it
  const hasText = (v: ResolvedVariant) => v.layers.some(l => l.type === 'text' && (typeof l.lines === 'string' ? l.lines : l.lines.map(x => (typeof x === 'string' ? x : x.t)).join('')).trim() !== '');
  if (poster && variants.some(hasText) && variants.every(hasText))
    warn('Every cover has text: add a style with no text (the picture alone, all treatments) before any text version');
};

const init = () => {
  const dir = jobDir(job);
  for (const d of ['input', 'assets', 'fonts', 'cutouts']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  const brand = flag('brand');
  const poster = flags.includes('--poster');
  const spec: JobSpec = { job, ...(poster ? { kind: 'poster' as const } : {}), title: flag('title'), brand, fonts: [], defaults: { params: {} }, styles: [] };
  let rules: string[] = [];
  if (brand) {
    const kit = path.join(ROOT, 'brands', brand);
    const profileFile = path.join(kit, 'graphics', 'brand', 'thumbnail.json');
    if (!fs.existsSync(profileFile)) throw new Error(`No ${rel(profileFile)}: make the brand's thumbnail profile first (make-thumbnail skill, "Brands")`);
    const profile = JSON.parse(fs.readFileSync(profileFile, 'utf8')) as {
      logos: { file: string; as: string; width?: number; note?: string }[];
      fonts: (FontSpec & { file: string; role?: string })[];
      palette?: Record<string, string>;
      params?: Record<string, unknown>;
      rules?: string[];
    };
    for (const l of profile.logos) fs.copyFileSync(path.join(kit, l.file), path.join(dir, 'assets', l.as)), done(path.join(dir, 'assets', l.as));
    for (const f of profile.fonts) {
      const to = path.join(dir, 'fonts', fontFile({ ...f, file: undefined }));
      fs.copyFileSync(path.join(kit, f.file), to);
      done(to);
      spec.fonts!.push({ family: f.family, weight: f.weight, italic: f.italic });
    }
    // posters carry no logo unless the user asks for one (the files are in assets/ if they do)
    const logos = poster ? [] : profile.logos.slice(0, 1).map(l => ({ src: `assets/${l.as}`, width: l.width }));
    spec.defaults!.params = { palette: profile.palette, ...profile.params, logos };
    rules = profile.rules ?? [];
  }
  // the art alone comes first: a text version is only ever an addition to it
  if (poster) spec.styles = [{ id: 'A', name: 'Art only', idea: 'the picture alone, no text: the base every text version builds on', preset: 'cover', treatments: ALL_TREATMENTS }];
  const file = path.join(dir, KINDS[poster ? 'poster' : 'thumbnail'].spec);
  if (fs.existsSync(file)) warn(`${rel(file)} exists, left as it is`);
  else fs.writeFileSync(file, JSON.stringify(spec, null, 2) + '\n'), done(file);
  const brief = path.join(dir, 'brief.md');
  if (!fs.existsSync(brief)) {
    const lines = poster
      ? [
          `# ${flag('title') ?? job} · cover art`,
          '',
          '## Release',
          '- song title, artist:',
          '- what it is about, the one feeling the cover should leave:',
          '- text versions (ask: title + artist / title only / none); style A, the art with no text, is always made:',
          '- logo (default none; ask):',
          '- fonts the user wants (ask):',
          '- DistroKid release folder (to copy cover.jpg into):',
          '',
          '## Picture',
          '- source(s) in input/, size, square crop or outcrop, upscale needed?:',
          '',
          ...(rules.length ? ['## Brand rules', ...rules.map(r => `- ${r}`), ''] : []),
          '## Styles, treatments and feedback',
          '',
        ]
      : [
      `# ${flag('title') ?? job}`,
      '',
      '## Video',
      '- what it is about, who it is for, the one feeling it should leave:',
      '- title:',
      '- must the title be on the thumbnail? (ask: must / optional / never):',
      '- fonts the user wants (ask; they override the brand fonts):',
      '- source: picture(s) / concept / transcript (input/transcript.txt)',
      '',
      '## The hook',
      '- the claim, emotion or question that makes someone click:',
      '- candidate words (1–3):',
      '',
      '## Logos',
      '- which logos, where they come from, any must-have placement:',
      '',
      ...(rules.length ? ['## Brand rules', ...rules.map(r => `- ${r}`), ''] : []),
      '## Styles (A–D) and feedback',
      '',
        ];
    fs.writeFileSync(brief, lines.join('\n'));
    done(brief);
  }
};

const cutout = () => {
  if (!third) throw new Error('Usage: thumbs cutout <job> input/<file> [--model=…] [--point=x,y] [--all]');
  const r = spawnSync('uv', ['run', '--with', 'rembg[cpu]', '--with', 'scipy', '--with', 'pillow', 'python', 'thumbnails/tools/cutout.py', job, third, ...flags], { cwd: ROOT, encoding: 'utf8' });
  // the model download draws a progress bar; keep only the result lines
  const out = `${r.stdout}\n${r.stderr}`.split(/[\r\n]/).filter(l => /✔|Error|error|Traceback|No such/.test(l));
  console.log(out.join('\n'));
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const render = async () => {
  const spec = readSpec(job);
  if (spec.job !== job) throw new Error(`${path.basename(specFile(job))} "job" is "${spec.job}", the folder is "${job}"`);
  const poster = jobKind(spec) === 'poster';
  const variants = resolveJob(spec);
  lint(job, spec, variants);
  const kept = keptIds();
  for (const v of variants)
    if (kept.includes(v.id) && fs.readFileSync(path.join(outDir(job), 'kept', `${v.id}.json`), 'utf8') !== JSON.stringify(v, null, 2))
      warn(`${v.id} is kept, but its spec has changed since: change it back, or make the change as a new variant`);
  for (const f of spec.fonts ?? []) await fetchFont(job, f);
  const only = third?.split(',');
  const out = outDir(job);
  fs.mkdirSync(out, { recursive: true });
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'thumbnails/index.ts'), publicDir: JOBS });
  const comps = (await getCompositions(serveUrl)).filter(c => c.id.startsWith(`${job}-`) && c.defaultProps.job === job);
  const error = comps.find(c => c.id === `${job}-error`);
  if (error) throw new Error(String(error.defaultProps.message));
  const png = flags.includes('--png');
  const still = async (id: string, file: string, props: Record<string, unknown> = {}) => {
    const composition = comps.find(c => c.id === id);
    if (!composition) throw new Error(`No composition ${id}`);
    const sheet = /sheet/.test(id);
    // posters are designed at 1000×1000 and rendered at 3× (3000×3000); sheets stay at 1×
    await renderStill({ serveUrl, composition: { ...composition, props: { ...composition.defaultProps, ...props } }, output: file, imageFormat: png ? 'png' : 'jpeg', jpegQuality: poster ? 94 : 92, scale: sheet ? 1 : jobScale(spec) });
    if (!poster && !sheet && fs.statSync(file).size > MAX_BYTES) warn(`${rel(file)} is over YouTube's 2 MB (pick re-encodes it)`);
    done(file);
  };
  for (const v of variants) {
    if (only && !only.includes(v.id)) continue;
    if (kept.includes(v.id) && fs.existsSync(path.join(out, `${v.id}.jpg`))) continue; // locked: leave the user's copy alone
    await still(`${job}-${v.id}`, path.join(out, `${v.id}.${png ? 'png' : 'jpg'}`), { guides: flags.includes('--guides') });
  }
  if (!flags.includes('--no-sheet')) {
    await still(`${job}-sheet`, path.join(out, `sheet.${png ? 'png' : 'jpg'}`));
    await still(`${job}-sheet-small`, path.join(out, `sheet-small.${png ? 'png' : 'jpg'}`));
  }
  writeIndex(spec, variants, png ? 'png' : 'jpg');
  fs.rmSync(serveUrl, { recursive: true, force: true });
};

type Index = { schema?: string; job: string; kind?: string; workflow?: string; source?: string; location?: string; path?: string; sourcePath?: string; title?: string; brand?: string; size: [number, number]; styles: { id: string; name: string; idea?: string; variants: { id: string; file: string; note?: string }[] }[]; sheets: string[]; picked?: string[]; final?: string[]; kept?: string[] };

const indexFile = () => path.join(outDir(job), 'index.json');

/** The image-set contract /image-revision reads (see scripts/image-index.ts): the renders by ID, who made them and from what. */
const writeIndex = (spec: JobSpec, variants: ResolvedVariant[], ext: string) => {
  const old = fs.existsSync(indexFile()) ? (JSON.parse(fs.readFileSync(indexFile(), 'utf8')) as Index) : undefined;
  const index: Index = {
    schema: 'mediamake.image-set/v1',
    job,
    kind: jobKind(spec),
    workflow: jobKind(spec) === 'poster' ? 'make-music-poster' : 'make-thumbnail',
    source: path.relative(path.resolve(ROOT, '../..'), specFile(job)),
    location: path.relative(path.resolve(ROOT, '../..'), outDir(job)),
    // absolute, so /image-revision can show the folder in Finder (dev server) or copy the path
    path: outDir(job),
    sourcePath: specFile(job),
    title: spec.title,
    brand: spec.brand,
    size: jobSize(spec).map(n => n * jobScale(spec)) as [number, number],
    styles: spec.styles.map(s => ({ id: s.id, name: s.name, idea: s.idea, variants: variants.filter(v => v.style === s.id).map(v => ({ id: v.id, file: `${v.id}.${ext}`, note: v.note })) })),
    sheets: [`sheet.${ext}`, `sheet-small.${ext}`],
    picked: old?.picked,
    kept: old?.kept,
    final: old?.final,
  };
  fs.writeFileSync(indexFile(), JSON.stringify(index, null, 2) + '\n');
  done(indexFile());
};

const pick = () => {
  const ids = (third ?? '').split(',').filter(Boolean);
  const poster = jobKind(readSpec(job)) === 'poster';
  if (poster && ids.length !== 1) throw new Error('Pick one ID: the cover');
  if (!ids.length || ids.length > 3) throw new Error('Pick one ID (the final thumbnail) or up to three (YouTube Test & Compare)');
  const out = outDir(job);
  const finalDir = path.join(out, 'final');
  fs.rmSync(finalDir, { recursive: true, force: true });
  fs.mkdirSync(finalDir, { recursive: true });
  const final: string[] = [];
  for (const id of ids) {
    const from = ['jpg', 'png'].map(e => path.join(out, `${id}.${e}`)).find(f => fs.existsSync(f));
    if (!from) throw new Error(`No render for ${id} in ${rel(out)}: render it first`);
    const to = path.join(finalDir, `${job}-${id}.jpg`);
    if (poster) {
      // the cover as rendered: 3000×3000 RGB JPEG, what DistroKid asks for
      if (!from.endsWith('.jpg')) spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', from, '-q:v', '2', to]);
      else fs.copyFileSync(from, to);
      const dims = imageSize(to);
      if (!dims || dims[0] !== dims[1] || dims[0] < 1000) warn(`${rel(to)} is ${dims?.join('×') ?? 'unreadable'}: DistroKid needs a square of at least 1000 px (3000 ideal)`);
      done(to);
      final.push(`final/${path.basename(to)}`);
      const release = flag('to');
      if (release) {
        const cover = path.join(release, 'cover.jpg');
        if (fs.existsSync(cover) && !flags.includes('--force')) warn(`${cover} exists: left as it is (pass --force to replace it)`);
        else fs.copyFileSync(to, cover), console.log(`✔ ${cover}`);
      }
      continue;
    }
    // always JPEG at 1280×720, re-encoded until it is under 2 MB
    for (const q of [2, 3, 5, 8]) {
      spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', from, '-vf', 'scale=1280:720', '-q:v', String(q), to]);
      if (fs.statSync(to).size <= MAX_BYTES) break;
    }
    done(to);
    final.push(`final/${path.basename(to)}`);
  }
  if (fs.existsSync(indexFile())) {
    const index = JSON.parse(fs.readFileSync(indexFile(), 'utf8')) as Index;
    fs.writeFileSync(indexFile(), JSON.stringify({ ...index, picked: ids, final }, null, 2) + '\n');
  }
  if (poster) console.log('The cover: upload it as the album artwork on distrokid.com/new (or use the copy in the release folder).');
  else console.log(ids.length === 1 ? 'One final thumbnail: upload it in YouTube Studio → Details → Thumbnail.' : `${ids.length} thumbnails for YouTube Studio → Details → Thumbnail → Test & Compare.`);
};

const keptIds = () => {
  const dir = path.join(outDir(job), 'kept');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)) : [];
};

/** Locks thumbnails the user likes: the image and the variant's resolved spec, so later rounds can't drift them. */
const keep = () => {
  const ids = (third ?? '').split(',').filter(Boolean);
  if (!ids.length) throw new Error('Usage: thumbs keep <job> B2[,A1]');
  const variants = resolveJob(readSpec(job));
  const dir = path.join(outDir(job), 'kept');
  fs.mkdirSync(dir, { recursive: true });
  for (const id of ids) {
    const v = variants.find(x => x.id === id);
    const img = path.join(outDir(job), `${id}.jpg`);
    if (!v || !fs.existsSync(img)) throw new Error(`No rendered ${id} in ${rel(outDir(job))}`);
    fs.copyFileSync(img, path.join(dir, `${job}-${id}.jpg`));
    fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(v, null, 2));
    done(path.join(dir, `${job}-${id}.jpg`));
  }
  if (fs.existsSync(indexFile())) {
    const index = JSON.parse(fs.readFileSync(indexFile(), 'utf8')) as Index;
    fs.writeFileSync(indexFile(), JSON.stringify({ ...index, kept: keptIds() }, null, 2) + '\n');
  }
};

/** The Spotify Canvas: 1080×1920 H.264, silent, 3–8 s, made to loop (see thumbnails/Canvas.tsx). */
const canvas = async () => {
  const spec = readSpec(job);
  if (!spec.canvas) throw new Error(`No "canvas" in ${rel(specFile(job))}: add { "src": "input/<9:16 picture>", "cut"?: "cutouts/…" }`);
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'thumbnails/index.ts'), publicDir: JOBS });
  const composition = (await getCompositions(serveUrl)).find(c => c.id === `${job}-canvas`);
  if (!composition) throw new Error(`No composition ${job}-canvas`);
  const out = path.join(outDir(job), 'canvas', 'remotion.mp4');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const raw = out.replace(/\.mp4$/, '.raw.mp4');
  await renderMedia({ serveUrl, composition, codec: 'h264', crf: 18, imageFormat: 'jpeg', jpegQuality: 95, outputLocation: raw, muted: true });
  fs.rmSync(serveUrl, { recursive: true, force: true });
  // JPEG frames come out full-range (yuvj420p); players and Spotify expect standard yuv420p
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', '-an', out]);
  fs.rmSync(raw);
  done(out);
};

const main = async () => {
  if (!cmd || !job) {
    console.error('Usage: npm run thumbs -w lyrics_videos -- init|cutout|render|pick|keep <job> …');
    process.exit(1);
  }
  if (cmd === 'init') init();
  else if (cmd === 'cutout') cutout();
  else if (cmd === 'render') await render();
  else if (cmd === 'pick') pick();
  else if (cmd === 'keep') keep();
  else if (cmd === 'canvas') await canvas();
  else throw new Error(`Unknown command ${cmd}`);
};

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
