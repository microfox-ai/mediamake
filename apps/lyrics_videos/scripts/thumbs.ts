/**
 * thumbs: YouTube thumbnails from thumbnails/jobs/<job>/thumbs.json (see thumbnails/README.md).
 *
 * Usage: npm run thumbs -w lyrics_videos -- init <job> [--brand=<folder>] [--title="…"]
 *        npm run thumbs -w lyrics_videos -- cutout <job> input/photo.jpg [--model=birefnet-portrait] [--point=0.5,0.4] [--all]
 *        npm run thumbs -w lyrics_videos -- render <job> [A1,B2] [--png] [--guides] [--no-sheet]
 *        npm run thumbs -w lyrics_videos -- pick <job> A2            (one final)
 *        npm run thumbs -w lyrics_videos -- pick <job> A2,B1,C3      (three for YouTube's A/B test)
 *        npm run thumbs -w lyrics_videos -- keep <job> B2            (lock thumbnails the user likes as they are)
 *
 *   init     makes the job folder; with --brand copies the brand's logos, fonts and thumbnail
 *            profile (brands/<brand>/graphics/brand/thumbnail.json) into it
 *   cutout   segments the subject locally (thumbnails/tools/cutout.py) → cutouts/<name>.png
 *   render   checks the spec, downloads missing Google fonts, renders every variant (or the IDs
 *            given) to out/thumbnails/<job>/<ID>.jpg, the labelled sheets, and index.json
 *   pick     copies the chosen IDs to out/thumbnails/<job>/final/ (under YouTube's 2 MB limit)
 *   keep     snapshots IDs into out/thumbnails/<job>/kept/ (image + resolved spec); render then
 *            leaves them alone and warns if their spec has changed since
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderStill } from '@remotion/renderer';
import { type Box, type FontSpec, type JobSpec, type ResolvedVariant, TIMESTAMP_ZONE, fontFile, resolveJob } from '../thumbnails/spec.ts';
import { PRESETS } from '../thumbnails/presets/index.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JOBS = path.join(ROOT, 'thumbnails', 'jobs');
const OUT = path.join(ROOT, 'out', 'thumbnails');
const MAX_BYTES = 2 * 1024 * 1024; // YouTube's thumbnail limit

const rel = (p: string) => path.relative(ROOT, p);
const done = (p: string) => console.log(`✔ ${rel(p)}`);
const warn = (m: string) => console.log(`⚠ ${m}`);

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const [cmd, job, third] = args.filter(a => !a.startsWith('--'));
const flag = (k: string) => flags.find(f => f.startsWith(`--${k}=`))?.slice(k.length + 3);

const jobDir = (j: string) => path.join(JOBS, j);
const readSpec = (j: string) => JSON.parse(fs.readFileSync(path.join(jobDir(j), 'thumbs.json'), 'utf8')) as JobSpec;

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

/** Problems worth fixing before anyone looks: missing files, fonts not in the job, things under YouTube's timestamp. */
const lint = (j: string, spec: JobSpec, variants: ResolvedVariant[]) => {
  const families = new Set((spec.fonts ?? []).map(f => f.family));
  const seen = new Set<string>();
  const once = (m: string) => !seen.has(m) && (seen.add(m), warn(m));
  for (const v of variants) {
    for (const l of v.layers) {
      if ((l.type === 'photo' || l.type === 'cutout' || l.type === 'image' || l.type === 'logo') && l.src && !/^(https?:|data:)/.test(l.src) && !fs.existsSync(path.join(jobDir(j), l.src)))
        once(`${v.id}: ${l.id ?? l.type} needs ${l.src}, which is missing`);
      if (l.type === 'text') {
        const fams = [l.font, ...(Array.isArray(l.lines) ? l.lines.map(x => (typeof x === 'string' ? undefined : x.font)) : [])].filter(Boolean) as string[];
        for (const f of fams) if (!families.has(f)) once(`${v.id}: font "${f}" (${l.id}) is not in the job's fonts: it would fall back to a system font`);
        // attached lines follow their target's letters, so their box says nothing about y
        if (l.box && !l.attach && overlaps(l.box, TIMESTAMP_ZONE)) once(`${v.id}: ${l.id} reaches into the bottom-right corner, where YouTube shows the video length`);
      }
      if (l.type === 'logo' && (l.anchor === 'br' || (l.at && overlaps([l.at[0] - 1, l.at[1] - 1, 2, 2], TIMESTAMP_ZONE))))
        once(`${v.id}: ${l.id} sits under YouTube's timestamp (bottom right); move it`);
    }
  }
  for (const s of spec.styles) {
    const preset = s.preset ?? spec.defaults?.preset;
    if (preset && PRESETS[preset]?.needs.includes('cut') && !(s.hero?.cut ?? spec.defaults?.hero?.cut) && !s.variants.every(v => v.hero?.cut))
      once(`style ${s.id} (${preset}) wants a cutout (hero.cut): make one with \`thumbs cutout\``);
  }
};

const init = () => {
  const dir = jobDir(job);
  for (const d of ['input', 'assets', 'fonts', 'cutouts']) fs.mkdirSync(path.join(dir, d), { recursive: true });
  const brand = flag('brand');
  const spec: JobSpec = { job, title: flag('title'), brand, fonts: [], defaults: { params: {} }, styles: [] };
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
    spec.defaults!.params = { palette: profile.palette, ...profile.params, logos: profile.logos.slice(0, 1).map(l => ({ src: `assets/${l.as}`, width: l.width })) };
    rules = profile.rules ?? [];
  }
  const specFile = path.join(dir, 'thumbs.json');
  if (fs.existsSync(specFile)) warn(`${rel(specFile)} exists, left as it is`);
  else fs.writeFileSync(specFile, JSON.stringify(spec, null, 2) + '\n'), done(specFile);
  const brief = path.join(dir, 'brief.md');
  if (!fs.existsSync(brief)) {
    const lines = [
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
  if (spec.job !== job) throw new Error(`thumbs.json "job" is "${spec.job}", the folder is "${job}"`);
  const variants = resolveJob(spec);
  lint(job, spec, variants);
  const kept = keptIds();
  for (const v of variants)
    if (kept.includes(v.id) && fs.readFileSync(path.join(OUT, job, 'kept', `${v.id}.json`), 'utf8') !== JSON.stringify(v, null, 2))
      warn(`${v.id} is kept, but its spec has changed since: change it back, or make the change as a new variant`);
  for (const f of spec.fonts ?? []) await fetchFont(job, f);
  const only = third?.split(',');
  const out = path.join(OUT, job);
  fs.mkdirSync(out, { recursive: true });
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'thumbnails/index.ts'), publicDir: JOBS });
  const comps = (await getCompositions(serveUrl)).filter(c => c.id.startsWith(`${job}-`) && c.defaultProps.job === job);
  const error = comps.find(c => c.id === `${job}-error`);
  if (error) throw new Error(String(error.defaultProps.message));
  const png = flags.includes('--png');
  const still = async (id: string, file: string, props: Record<string, unknown> = {}) => {
    const composition = comps.find(c => c.id === id);
    if (!composition) throw new Error(`No composition ${id}`);
    await renderStill({ serveUrl, composition: { ...composition, props: { ...composition.defaultProps, ...props } }, output: file, imageFormat: png ? 'png' : 'jpeg', jpegQuality: 92 });
    if (!/sheet/.test(id) && fs.statSync(file).size > MAX_BYTES) warn(`${rel(file)} is over YouTube's 2 MB (pick re-encodes it)`);
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

type Index = { job: string; title?: string; brand?: string; size: [number, number]; styles: { id: string; name: string; idea?: string; variants: { id: string; file: string; note?: string }[] }[]; sheets: string[]; picked?: string[]; final?: string[]; kept?: string[] };

const indexFile = () => path.join(OUT, job, 'index.json');

/** What the planned /thumbnail-edit screen (and anyone else) reads to find a job's thumbnails by ID. */
const writeIndex = (spec: JobSpec, variants: ResolvedVariant[], ext: string) => {
  const old = fs.existsSync(indexFile()) ? (JSON.parse(fs.readFileSync(indexFile(), 'utf8')) as Index) : undefined;
  const index: Index = {
    job,
    title: spec.title,
    brand: spec.brand,
    size: [1280, 720],
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
  if (!ids.length || ids.length > 3) throw new Error('Pick one ID (the final thumbnail) or up to three (YouTube Test & Compare)');
  const out = path.join(OUT, job);
  const finalDir = path.join(out, 'final');
  fs.rmSync(finalDir, { recursive: true, force: true });
  fs.mkdirSync(finalDir, { recursive: true });
  const final: string[] = [];
  for (const id of ids) {
    const from = ['jpg', 'png'].map(e => path.join(out, `${id}.${e}`)).find(f => fs.existsSync(f));
    if (!from) throw new Error(`No render for ${id} in ${rel(out)}: render it first`);
    const to = path.join(finalDir, `${job}-${id}.jpg`);
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
  console.log(ids.length === 1 ? 'One final thumbnail: upload it in YouTube Studio → Details → Thumbnail.' : `${ids.length} thumbnails for YouTube Studio → Details → Thumbnail → Test & Compare.`);
};

const keptIds = () => {
  const dir = path.join(OUT, job, 'kept');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)) : [];
};

/** Locks thumbnails the user likes: the image and the variant's resolved spec, so later rounds can't drift them. */
const keep = () => {
  const ids = (third ?? '').split(',').filter(Boolean);
  if (!ids.length) throw new Error('Usage: thumbs keep <job> B2[,A1]');
  const variants = resolveJob(readSpec(job));
  const dir = path.join(OUT, job, 'kept');
  fs.mkdirSync(dir, { recursive: true });
  for (const id of ids) {
    const v = variants.find(x => x.id === id);
    const img = path.join(OUT, job, `${id}.jpg`);
    if (!v || !fs.existsSync(img)) throw new Error(`No rendered ${id} in ${rel(path.join(OUT, job))}`);
    fs.copyFileSync(img, path.join(dir, `${job}-${id}.jpg`));
    fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(v, null, 2));
    done(path.join(dir, `${job}-${id}.jpg`));
  }
  if (fs.existsSync(indexFile())) {
    const index = JSON.parse(fs.readFileSync(indexFile(), 'utf8')) as Index;
    fs.writeFileSync(indexFile(), JSON.stringify({ ...index, kept: keptIds() }, null, 2) + '\n');
  }
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
  else throw new Error(`Unknown command ${cmd}`);
};

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
