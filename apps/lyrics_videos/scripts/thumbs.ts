/**
 * thumbs: YouTube thumbnails (thumbnails/jobs/<job>/thumbs.json) and music posters / album artwork
 * (thumbnails/jobs/<job>/poster.json), see thumbnails/README.md.
 *
 * Usage: npm run thumbs -w lyrics_videos -- init <job> [--poster] [--brand=<folder>] [--title="…"] [--mood=bright|balanced|dark|as-is]
 *        npm run thumbs -w lyrics_videos -- cutout <job> input/photo.jpg [--model=birefnet-portrait] [--point=0.5,0.4] [--all]
 *        npm run thumbs -w lyrics_videos -- look <job> [--write]         (which treatments suit the picture)
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
 *   look     measures each hero picture and scores every treatment for it and the mood
 *            (thumbnails/look.ts); --write turns a style's "treatments": "auto" into the picks
 *            and their tuning (render does it by itself)
 *   render   checks the spec, downloads missing Google fonts, renders every variant (or the IDs
 *            given) to out/thumbnails/<job>/<ID>.jpg, the labelled sheets, and index.json; for a
 *            poster it first sets the picture's exposure for the job's mood and then lifts any
 *            treatment that came out darker than its plain cover (thumbnails/exposure.ts)
 *   pick     copies the chosen IDs to out/thumbnails/<job>/final/ (under YouTube's 2 MB limit);
 *            for a poster, the one cover (3000×3000 JPEG) to out/posters/<job>/final/
 *   keep     snapshots IDs into out/thumbnails/<job>/kept/ (image + resolved spec); render then
 *            leaves them alone and warns if their spec has changed since
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderMedia, renderStill } from '@remotion/renderer';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { type Box, type FontSpec, type JobSpec, KINDS, type ResolvedVariant, TIMESTAMP_ZONE, fontFile, jobKind, jobScale, jobSize, resolveJob, styleVariants } from '../thumbnails/spec.ts';
import { PRESETS } from '../thumbnails/presets/index.ts';
import { TREATMENTS } from '../thumbnails/treatments.ts';
import { features, pickTreatments, scoreTreatments } from '../thumbnails/look.ts';
import { type ExposureFile, MOODS, type Mood, type Stats, fixFor, levelsFor, curve, summarize } from '../thumbnails/exposure.ts';

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

/** An image's RGB pixels, scaled to `width` px wide. */
const pixels = (file: string, width: number) => {
  const size = imageSize(file);
  if (!size) throw new Error(`Couldn't read ${rel(file)}`);
  const w = Math.min(width, size[0]);
  const h = 2 * Math.round((size[1] * w) / size[0] / 2);
  const r = spawnSync(ffmpegInstaller.path, ['-v', 'error', '-i', file, '-vf', `scale=${w}:${h}`, '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 27 });
  if (r.status !== 0 || r.stdout?.length !== w * h * 3) throw new Error(`Couldn't read ${rel(file)}: ${r.stderr}`);
  return { data: new Uint8Array(r.stdout), w, h };
};

/** Luma and brightest-channel histograms of an image scaled down to 320 px wide. */
const stats = (file: string): Stats => {
  const luma = new Array(256).fill(0);
  const peak = new Array(256).fill(0);
  const px = pixels(file, 320).data;
  for (let i = 0; i + 2 < px.length; i += 3) {
    luma[Math.round(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2])]++;
    peak[Math.max(px[i], px[i + 1], px[i + 2])]++;
  }
  return { luma, peak };
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
  const mood = flag('mood') as Mood | undefined;
  if (mood && !['bright', 'balanced', 'dark', 'as-is'].includes(mood)) throw new Error('--mood is bright, balanced, dark or as-is');
  const spec: JobSpec = { job, ...(poster ? { kind: 'poster' as const, mood: mood ?? 'balanced' } : {}), title: flag('title'), brand, fonts: [], defaults: { params: {} }, styles: [] };
  let rules: string[] = [];
  if (brand) {
    const kit = path.join(ROOT, 'brands', brand);
    const profileFile = path.join(kit, 'graphics', 'brand', 'thumbnail.json');
    if (!fs.existsSync(profileFile)) throw new Error(`No ${rel(profileFile)}: make the brand's thumbnail profile first (create-thumbnail skill, "Brands")`);
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
  // treatments are picked from the picture on the first render (thumbnails/look.ts)
  if (poster) spec.styles = [{ id: 'A', name: 'Art only', idea: 'the picture alone, no text: the base every text version builds on', preset: 'cover', treatments: 'auto' }];
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
          `- mood (poster.json "mood": bright / balanced / dark; dark only when the song is): ${mood ?? 'balanced'}`,
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

/** Each style's hero picture (`src` of its photo layer), resolving "auto" styles as plain to find it. */
const heroes = (spec: JobSpec) => {
  const probe: JobSpec = { ...spec, styles: spec.styles.map(s => (s.treatments === 'auto' ? { ...s, treatments: ['plain'] } : s)) };
  const variants = resolveJob(probe);
  return new Map(
    spec.styles.map(s => {
      const photo = variants.find(v => v.style === s.id)?.layers.find(l => l.type === 'photo' && l.src);
      return [s.id, photo && 'src' in photo ? photo.src : undefined] as const;
    }),
  );
};

/**
 * Scores every treatment for each hero picture as auto-exposure will show it, prints the ranking
 * with reasons, and with `write` fills every "auto" style with the picks and their tuning
 * (poster.json, plus a note in brief.md). Styles with a list are left alone: IDs never move.
 */
const look = (write: boolean) => {
  const spec = readSpec(job);
  const mood: Mood = spec.mood ?? 'balanced';
  const byStyle = heroes(spec);
  const results = new Map<string, ReturnType<typeof scoreTreatments>>();
  const notes: string[] = [];
  for (const src of new Set([...byStyle.values()].filter((v): v is string => !!v))) {
    const file = path.join(jobDir(job), src);
    const px = pixels(file, 480);
    const levels = mood === 'as-is' ? undefined : levelsFor(stats(file), mood);
    const f = features(px.data, px.w, px.h, levels ? curve(levels) : undefined);
    const scored = scoreTreatments(f, mood, Object.keys(TREATMENTS));
    const picked = new Set(pickTreatments(scored).map(p => p.name));
    results.set(src, scored.filter(p => picked.has(p.name)));
    const seen = `light ${f.mean}, contrast ${f.contrast}, black ${Math.round(f.dark * 100)}%, highlights ${Math.round(f.bright * 100)}%, saturation ${f.saturation}, warmth ${f.warmth}, hues ${f.hueSpread}${f.hue === null ? '' : ` (main ${f.hue}°)`}, neon ${Math.round(f.neon * 100)}%, skin ${Math.round(f.skin * 100)}%, detail ${f.detail}, noise ${f.noise}, edges ${f.edges}`;
    const lines = scored.map(p => `  ${picked.has(p.name) ? '✓' : ' '} ${p.name.padEnd(8)} ${p.score.toFixed(2)}  ${p.why.join('; ') || 'neutral'}${p.tune ? `  [tune ${JSON.stringify(p.tune)}]` : ''}`);
    console.log(`◐ ${src} (${mood}): ${seen}\n  palette ${f.palette.map(c => `${c.color} ${Math.round(c.share * 100)}%`).join(' · ')}\n${lines.join('\n')}`);
    notes.push(`- ${src} (${mood}): ${seen}`, ...scored.filter(p => picked.has(p.name)).map(p => `  - ${p.name} ${p.score.toFixed(2)}: ${p.why.join('; ') || 'neutral'}`));
  }
  if (!write) return;
  const auto = spec.styles.filter(s => s.treatments === 'auto');
  if (!auto.length) return console.log('No style has "treatments": "auto"; nothing written');
  for (const s of auto) {
    const picks = results.get(byStyle.get(s.id) ?? '');
    if (!picks) throw new Error(`Style ${s.id}: no hero picture to look at`);
    s.treatments = ['plain', ...picks.map(p => p.name)];
    const tune = Object.fromEntries(picks.filter(p => p.tune).map(p => [p.name, p.tune!]));
    if (Object.keys(tune).length) s.tune = { ...s.tune, ...tune };
    console.log(`✔ style ${s.id}: plain + ${picks.map(p => p.name).join(', ')}`);
  }
  fs.writeFileSync(specFile(job), JSON.stringify(spec, null, 2) + '\n');
  done(specFile(job));
  const brief = path.join(jobDir(job), 'brief.md');
  fs.appendFileSync(brief, `\n## Treatments picked from the picture (${new Date().toISOString().slice(0, 10)}, styles ${auto.map(s => s.id).join(', ')})\n${notes.join('\n')}\n`);
};

const render = async () => {
  if (readSpec(job).styles.some(s => s.treatments === 'auto')) look(true);
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
  const png = flags.includes('--png');
  const ext = png ? 'png' : 'jpg';
  const exposure = poster || spec.mood ? measureSources(spec, variants) : undefined;
  let serveUrl = '';
  let comps: Awaited<ReturnType<typeof getCompositions>> = [];
  // exposure.json is read when bundling, so a change to it needs a new bundle
  const load = async () => {
    if (serveUrl) fs.rmSync(serveUrl, { recursive: true, force: true });
    serveUrl = await bundle({ entryPoint: path.join(ROOT, 'thumbnails/index.ts'), publicDir: JOBS });
    comps = (await getCompositions(serveUrl)).filter(c => c.id.startsWith(`${job}-`) && c.defaultProps.job === job);
    const error = comps.find(c => c.id === `${job}-error`);
    if (error) throw new Error(String(error.defaultProps.message));
  };
  await load();
  const still = async (id: string, file: string, props: Record<string, unknown> = {}) => {
    const composition = comps.find(c => c.id === id);
    if (!composition) throw new Error(`No composition ${id}`);
    const sheet = /sheet/.test(id);
    // posters are designed at 1000×1000 and rendered at 3× (3000×3000); sheets stay at 1×
    await renderStill({ serveUrl, composition: { ...composition, props: { ...composition.defaultProps, ...props } }, output: file, imageFormat: png ? 'png' : 'jpeg', jpegQuality: poster ? 94 : 92, scale: sheet ? 1 : jobScale(spec) });
    if (!poster && !sheet && fs.statSync(file).size > MAX_BYTES) warn(`${rel(file)} is over YouTube's 2 MB (pick re-encodes it)`);
    done(file);
  };
  const todo = variants.filter(v => !(only && !only.includes(v.id)) && !(kept.includes(v.id) && fs.existsSync(path.join(out, `${v.id}.jpg`)))); // kept: leave the user's copy alone
  const renderAll = async (list: ResolvedVariant[]) => {
    for (const v of list) await still(`${job}-${v.id}`, path.join(out, `${v.id}.${ext}`), { guides: flags.includes('--guides') });
  };
  await renderAll(todo);
  if (exposure && exposure.mood !== 'as-is') {
    // the lift is an estimate, so measure again; a few rounds at most
    for (let round = 0; round < 3; round++) {
      const lifted = liftDarkTreatments(exposure, variants, todo, ext);
      if (!lifted.length) break;
      console.log(`↻ re-rendering ${lifted.map(v => v.id).join(', ')} with a lift (they came out darker than their plain cover)`);
      await load();
      await renderAll(lifted);
    }
    reportExposure(exposure, variants, todo, ext);
  }
  if (!flags.includes('--no-sheet')) {
    await still(`${job}-sheet`, path.join(out, `sheet.${ext}`));
    await still(`${job}-sheet-small`, path.join(out, `sheet-small.${ext}`));
  }
  writeIndex(spec, variants, ext);
  fs.rmSync(serveUrl, { recursive: true, force: true });
};

const exposureFile = () => path.join(jobDir(job), 'exposure.json');

/**
 * Measures each hero picture and writes the levels for the job's mood to jobs/<job>/exposure.json
 * (the compositions read it). Fixes from the last render are kept as the starting point.
 */
const measureSources = (spec: JobSpec, variants: ResolvedVariant[]): ExposureFile => {
  const mood: Mood = spec.mood ?? 'balanced';
  const old = fs.existsSync(exposureFile()) ? (JSON.parse(fs.readFileSync(exposureFile(), 'utf8')) as ExposureFile) : undefined;
  // a lift only carries over to the same variant in the same mood
  const keep = (id: string) => old?.mood === mood && old.fixedFor?.[id] === variantHash(variants.find(v => v.id === id));
  const ids = Object.keys(old?.fixes ?? {}).filter(keep);
  const file: ExposureFile = {
    mood,
    sources: {},
    fixes: Object.fromEntries(ids.map(id => [id, old!.fixes[id]])),
    fixedFor: Object.fromEntries(ids.map(id => [id, old!.fixedFor![id]])),
  };
  if (mood !== 'as-is') {
    const sources = new Set(variants.flatMap(v => v.layers.filter(l => l.type === 'photo' && l.src).map(l => (l as { src: string }).src)));
    for (const src of sources) {
      const s = stats(path.join(jobDir(job), src));
      const levels = levelsFor(s, mood);
      file.sources[src] = { levels, before: summarize(s), after: summarize(s, curve(levels)) };
      const { before, after } = file.sources[src];
      console.log(`☀ ${src} (${mood}): mean ${before.mean} → ${after.mean}, bright parts ${before.p90} → ${after.p90}, highlights ${before.p99} → ${after.p99} (white point ${levels.white}, lift ${levels.gamma})`);
    }
  }
  fs.writeFileSync(exposureFile(), JSON.stringify(file, null, 2) + '\n');
  return file;
};

const variantHash = (v?: ResolvedVariant) => (v ? createHash('sha1').update(JSON.stringify(v)).digest('hex').slice(0, 12) : '');

/** The plain cover a treatment variant is compared with: its style's variant without a treatment. */
const plainOf = (v: ResolvedVariant, variants: ResolvedVariant[]) => (v.post ? variants.find(o => o.style === v.style && !o.post) : undefined);

/** Treatments that came out darker than their plain cover allows: raises their fix in exposure.json and returns them. */
const liftDarkTreatments = (exposure: ExposureFile, variants: ResolvedVariant[], rendered: ResolvedVariant[], ext: string) => {
  const keep = MOODS[exposure.mood as Exclude<Mood, 'as-is'>].keep;
  const file = (v: ResolvedVariant) => path.join(outDir(job), `${v.id}.${ext}`);
  const lifted: ResolvedVariant[] = [];
  for (const v of rendered) {
    const plain = plainOf(v, variants);
    if (!plain || !fs.existsSync(file(plain))) continue;
    const s = stats(file(v));
    const target = summarize(stats(file(plain))).mean * keep;
    if (summarize(s).mean >= target * 0.97) continue;
    const fix = +Math.min(2, (exposure.fixes[v.id] ?? 1) * fixFor(s, target)).toFixed(3);
    if (fix <= (exposure.fixes[v.id] ?? 1) + 0.01) continue;
    exposure.fixes[v.id] = fix;
    (exposure.fixedFor ??= {})[v.id] = variantHash(v);
    lifted.push(v);
  }
  if (lifted.length) fs.writeFileSync(exposureFile(), JSON.stringify(exposure, null, 2) + '\n');
  return lifted;
};

/** One line per render: brightness against its plain cover, highlights, lift; warns about covers that stay dark. */
const reportExposure = (exposure: ExposureFile, variants: ResolvedVariant[], rendered: ResolvedVariant[], ext: string) => {
  const mood = MOODS[exposure.mood as Exclude<Mood, 'as-is'>];
  const file = (v: ResolvedVariant) => path.join(outDir(job), `${v.id}.${ext}`);
  const measured = new Map(rendered.map(v => [v.id, summarize(stats(file(v)))]));
  const lines = rendered.map(v => {
    const m = measured.get(v.id)!;
    const plain = plainOf(v, variants);
    const ref = plain && (measured.get(plain.id) ?? (fs.existsSync(file(plain)) ? summarize(stats(file(plain))) : undefined));
    const vs = ref ? ` (${Math.round((m.mean / ref.mean) * 100)}% of ${plain!.id})` : '';
    const fix = exposure.fixes[v.id] ? `, lift ×${exposure.fixes[v.id]}` : '';
    return `  ${v.id.padEnd(4)} ${(v.note ?? '').padEnd(11)} mean ${m.mean.toFixed(2)}${vs}, highlights ${m.p99.toFixed(2)}${fix}`;
  });
  console.log(`exposure (${exposure.mood}):\n${lines.join('\n')}`);
  for (const v of rendered) {
    const m = measured.get(v.id)!;
    if (!v.post && m.mean < mood.mean * 0.6) warn(`${v.id} stays dark (mean ${m.mean}) even with the most lift "${exposure.mood}" allows: use a brighter picture, or "mood": "dark" if the song is dark`);
    if (exposure.mood !== 'dark' && m.p99 < 0.8) warn(`${v.id} has no real highlights (brightest ${m.p99}): it will read flat and dark`);
  }
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
    workflow: jobKind(spec) === 'poster' ? 'create-music-poster' : 'create-thumbnail',
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
    console.error('Usage: npm run thumbs -w lyrics_videos -- init|cutout|look|render|pick|keep|canvas <job> …');
    process.exit(1);
  }
  if (cmd === 'init') init();
  else if (cmd === 'cutout') cutout();
  else if (cmd === 'look') look(flags.includes('--write'));
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
