/**
 * wave-lab: shoots waveform lyric video looks as labelled stills — the catalog's entries on the demo
 * song and picture, or a project's storyboard candidates on its own — and makes each set reviewable
 * in mediamake's /image-revision (index.json) with a contact sheet per step.
 *
 * Usage:
 *   npm run wave-lab -w lyrics_videos -- catalog [waves|fonts|captions] [--only=id,id]
 *       → out/waveform-catalog/<step>/<id>.jpg and its README.md gallery (not committed)
 *   npm run wave-lab -w lyrics_videos -- catalog --gallery     only rewrite the gallery
 *   npm run wave-lab -w lyrics_videos -- catalog <step> --sheet=id,id [--out=file.jpg]
 *       a contact sheet of existing shots (a menu to show the user), nothing rendered
 *   npm run wave-lab -w lyrics_videos -- <slug> <looks|waves|fonts|captions|final> [--only=W1,W2] [--at=s,s] [--clip=6]
 *       → out/<slug>/<slug>-storyboard/<step>/<id>.jpg
 *
 * A project's candidates and picks are in projects/<slug>/video/storyboard.ts (see look.ts). Waves
 * and fonts are one still each; caption setups and `final` are four moments of a line in a 2×2 grid.
 * Moments default to the loudest second of the song and the lyric line sung there.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { enableTailwind } from '@remotion/tailwind-v4';
import { CAPTIONS, FONTS, WAVES } from '../catalog/index.ts';
import { ManifestSchema, type LyricLine, type Manifest } from '../src/kit/manifest.ts';
import {
  DEFAULT_CAPTIONS,
  DEFAULT_FONTS,
  captionsRef,
  fontsRef,
  storyboardLook,
  type CatalogEntry,
  type FontSet,
  type Look,
  type Step,
  type Storyboard,
  type WaveDesign,
} from '../src/mediamake/look.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(ROOT, '../..');
const STEPS: Step[] = ['waves', 'fonts', 'captions'];
const DEMO = '_wave-catalog';
/** The catalog's shots and gallery: made on this machine, not committed. */
const CATALOG_SHOTS = path.join(ROOT, 'out', 'waveform-catalog');
const SCALE = 0.5;

type Shot = {
  id: string;
  step: string;
  label: string;
  note: string;
  look: Look;
  manifest: Manifest;
  /** Song seconds: one still, or four for a 2×2 grid. */
  at: number[];
};

const args = process.argv.slice(2);
const flag = (k: string) => args.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [target, stepArg] = args.filter(a => !a.startsWith('--'));
const only = flag('only')?.split(',');
const atFlag = flag('at')?.split(',').map(Number);
/** Seconds of motion per shot (from 2 s before its first moment), as <step>/<id>.mp4 plus one reel. */
const clipSeconds = flag('clip') ? Number(flag('clip')) : 0;
if (!target) {
  console.error('Usage: npm run wave-lab -w lyrics_videos -- catalog [step] | <slug> <looks|waves|fonts|captions|final> [--only=W1,W2] [--at=s,s] [--clip=seconds]');
  process.exit(1);
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const tmpdirFor = (dir: string) => fs.mkdtempSync(path.join(os.tmpdir(), `wave-lab-${path.basename(dir)}-`));
const readManifest = (slug: string) =>
  ManifestSchema.parse(JSON.parse(fs.readFileSync(path.join(ROOT, 'projects', slug, 'manifest.json'), 'utf8')));

// ---------- moments ----------

/** Start of the loudest second (the energy envelope averaged over 1 s). */
const loudest = (m: Manifest): number => {
  const { rate, values } = m.energy;
  const w = Math.max(1, Math.round(rate));
  let best = 0;
  let bestSum = -1;
  for (let i = 0; i + w <= values.length; i++) {
    let sum = 0;
    for (let j = i; j < i + w; j++) sum += values[j];
    if (sum > bestSum) [best, bestSum] = [i, sum];
  }
  return best / rate;
};

/** The line sung at t (or the nearest one with at least three words). */
const lineAt = (m: Manifest, t: number): LyricLine => {
  const lines = m.lyrics.filter(l => l.words.length >= 3);
  const pool = lines.length ? lines : m.lyrics;
  return pool.find(l => l.start <= t && t <= l.end) ?? [...pool].sort((a, b) => Math.abs(a.start - t) - Math.abs(b.start - t))[0];
};

/** Entering, a third in, fully sung, and handing over to the next line. */
const lineMoments = (m: Manifest, line: LyricLine): number[] => {
  const next = m.lyrics.find(l => l.start > line.start);
  const d = line.end - line.start;
  return [line.start - 0.05, line.start + d * 0.35, line.end - 0.12, next ? Math.min(next.start + 0.3, next.end) : line.end + 0.4].map(r2);
};

/** Every lyric line retyped as a font set's sample (a Telugu set shown on English lyrics). */
const withSample = (m: Manifest, sample: string): Manifest => {
  const words = sample.split(/\s+/);
  return {
    ...m,
    lyrics: m.lyrics.map(l => {
      const step = (l.end - l.start) / words.length;
      return {
        id: l.id,
        text: sample,
        start: l.start,
        end: l.end,
        words: words.map((text, i) => ({ text, start: r2(l.start + i * step), end: r2(l.start + (i + 1) * step) })),
      };
    }),
  };
};

// ---------- the demo project for catalog shots ----------

const download = async (url: string, file: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
};

const ensureDemo = async (): Promise<Manifest> => {
  const demo = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/demo/demo.json'), 'utf8'));
  const input = path.join(ROOT, 'projects', DEMO, 'input');
  fs.mkdirSync(input, { recursive: true });
  const song = path.join(input, 'song.mp3');
  if (!fs.existsSync(song)) {
    const full = path.join(os.tmpdir(), `wave-lab-${Date.now()}.mp3`);
    await download(demo.song.url, full);
    const cut = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(demo.song.from), '-to', String(demo.song.to), '-i', full, '-c:a', 'libmp3lame', '-b:a', '192k', song]);
    fs.rmSync(full, { force: true });
    if (cut.status !== 0) throw new Error(`ffmpeg could not cut the demo song: ${cut.stderr}`);
  }
  const picture = path.join(input, `cover${path.extname(new URL(demo.picture).pathname) || '.jpg'}`);
  if (!fs.existsSync(picture)) await download(demo.picture, picture);
  fs.copyFileSync(path.join(ROOT, 'catalog/demo/lyrics.json'), path.join(input, 'lyrics.json'));
  fs.writeFileSync(path.join(input, 'project.json'), JSON.stringify({ title: demo.title, artist: demo.artist }, null, 2));
  const prep = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', 'scripts/prepare.ts', DEMO], { cwd: ROOT, encoding: 'utf8' });
  if (prep.status !== 0) throw new Error(`prepare failed for the demo:\n${prep.stderr || prep.stdout}`);
  return readManifest(DEMO);
};

// ---------- shot lists ----------

const catalogShots = async (steps: Step[]): Promise<Shot[]> => {
  const m = await ensureDemo();
  const demo = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog/demo/demo.json'), 'utf8'));
  const line = m.lyrics.find(l => l.text === demo.moments.line) ?? lineAt(m, demo.moments.waves[0]);
  const shots: Shot[] = [];
  const add = <T>(step: Step, table: Record<string, CatalogEntry<T>>, make: (e: CatalogEntry<T>) => Omit<Shot, 'id' | 'step' | 'label' | 'note'>) => {
    if (!steps.includes(step)) return;
    for (const [id, e] of Object.entries(table)) {
      if (only && !only.includes(id)) continue;
      shots.push({ id, step, label: id, note: `${e.name}. ${e.about} (${e.source})`, ...make(e) });
    }
  };
  add('waves', WAVES as Record<string, CatalogEntry<WaveDesign>>, e => ({
    manifest: m,
    look: { wave: e.value, fonts: fontsRef(DEFAULT_FONTS), captions: null },
    at: demo.moments.waves,
  }));
  add('fonts', FONTS as Record<string, CatalogEntry<FontSet>>, e => ({
    manifest: e.value.sample ? withSample(m, e.value.sample) : m,
    look: { wave: null, fonts: e.value, captions: captionsRef(e.shotWith?.captions ?? DEFAULT_CAPTIONS) },
    at: demo.moments.fonts,
  }));
  add('captions', CAPTIONS, e => ({
    manifest: m,
    look: { wave: null, fonts: fontsRef(e.shotWith?.fonts ?? DEFAULT_FONTS), captions: e.value },
    at: lineMoments(m, line),
  }));
  return shots;
};

const storyboardShots = async (slug: string, step: Step | 'final'): Promise<Shot[]> => {
  const file = path.join(ROOT, 'projects', slug, 'video', 'storyboard.ts');
  if (!fs.existsSync(file)) throw new Error(`No ${path.relative(ROOT, file)}: write the storyboard first`);
  const sb = (await import(pathToFileURL(file).href)).default as Storyboard;
  const m = readManifest(slug);
  const loud = loudest(m);
  const line = lineAt(m, loud + 0.5);
  const at = atFlag ?? sb.at?.[step as Step];
  if (step === 'final') {
    const verse = lineAt(m, m.audio.duration * 0.25);
    return [
      {
        id: 'final',
        step,
        label: 'final',
        note: `The picked look: wave ${sb.pick?.wave}, fonts ${sb.pick?.fonts}, captions ${sb.pick?.captions}`,
        look: storyboardLook(sb),
        manifest: m,
        // the title card, the hook line a third in and fully sung, a verse line
        at: at ?? [2, lineMoments(m, line)[1], r2(line.end - 0.12), r2(verse.end - 0.12)],
      },
    ];
  }
  const candidates = sb[step] ?? {};
  if (!Object.keys(candidates).length) throw new Error(`storyboard.ts has no ${step} candidates`);
  return Object.entries(candidates)
    .filter(([id]) => !only || only.includes(id))
    .map(([id, ref]) => {
      const look = storyboardLook(sb, { step, id });
      const sample = step === 'fonts' ? look.fonts.sample : undefined;
      return {
        id,
        step,
        label: `${id} · ${typeof ref === 'string' ? ref : ref === null ? (step === 'looks' ? 'as it is' : 'no wave') : 'new'}`,
        note: typeof ref === 'string' ? `catalog: ${ref}` : 'designed for this song',
        look,
        manifest: sample ? withSample(m, sample) : m,
        at: at ?? (step === 'waves' || step === 'looks' ? [r2(loud + 0.5)] : step === 'fonts' ? [r2(line.end - 0.12)] : lineMoments(m, line)),
      };
    });
};

// ---------- rendering ----------

const ffmpeg = (argv: string[]) => {
  const res = spawnSync('ffmpeg', ['-loglevel', 'error', '-y', ...argv], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`ffmpeg: ${res.stderr}`);
};

/** Tiles images (scaled to 480×270) four to a row, black where the last row runs short. */
const contactSheet = (files: string[], out: string) => {
  if (!files.length) return;
  const cols = Math.min(4, files.length);
  const layout = files.map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join('|');
  const scaled = files.map((_, i) => `[${i}:v]scale=480:270[s${i}]`).join(';');
  const inputs = files.map((_, i) => `[s${i}]`).join('');
  const stack = files.length === 1 ? `[s0]copy` : `${inputs}xstack=inputs=${files.length}:layout=${layout}:fill=black`;
  ffmpeg([...files.flatMap(f => ['-i', f]), '-filter_complex', `${scaled};${stack}`, '-q:v', '4', out]);
};

const writeIndex = (dir: string, o: { job: string; title: string; groups: { id: string; name: string; items: { id: string; file: string; note: string }[] }[] }) => {
  const file = path.join(dir, 'index.json');
  const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const groups = o.groups.map(g => {
    const before = (old.groups ?? []).find((x: { id: string }) => x.id === g.id)?.items ?? [];
    const items = new Map<string, { id: string; file: string; note: string }>(before.map((i: { id: string; file: string; note: string }) => [i.id, i]));
    for (const i of g.items) items.set(i.id, i);
    return { ...g, items: [...items.values()].filter(i => fs.existsSync(path.join(dir, i.file))) };
  });
  const index = {
    ...old,
    schema: 'mediamake.image-set/v1',
    job: o.job,
    kind: 'images',
    title: o.title,
    workflow: 'make-waveform-lyric-video',
    location: path.relative(REPO, dir),
    // absolute, so /image-revision can show the folder in Finder (dev server) or copy the path
    path: dir,
    pick: { max: 1, label: 'pick' },
    groups: [...(old.groups ?? []).filter((g: { id: string }) => !groups.some(n => n.id === g.id)), ...groups],
  };
  fs.writeFileSync(file, JSON.stringify(index, null, 2) + '\n');
};

/** out/waveform-catalog/README.md: every entry with its shot, one page to browse the catalog. */
const writeGallery = (dir: string) => {
  const cell = (s: string) => s.replace(/\|/g, '\\|');
  const section = <T>(step: Step, title: string, intro: string, table: Record<string, CatalogEntry<T>>) => [
    `## ${title}`,
    '',
    intro,
    '',
    '| Shot | Entry |',
    '| --- | --- |',
    ...Object.entries(table).map(([id, e]) => {
      const shot = fs.existsSync(path.join(dir, step, `${id}.jpg`)) ? `<img src="${step}/${id}.jpg" width="360">` : '(not shot yet)';
      return `| ${shot} | **\`${id}\`** ${cell(e.name)}<br>${cell(e.about)}<br>*${cell(e.tags.join(', '))}*<br><sub>${cell(e.source)}</sub> |`;
    }),
    '',
  ];
  const lines = [
    '# Waveform lyric video catalog',
    '',
    '<!-- Generated by `npm run wave-lab -w lyrics_videos -- catalog`: edit catalog/*.ts, then re-run. -->',
    '',
    'Every wave, font set and caption setup the make-waveform-lyric-video skill starts from, shot on the',
    'demo song and picture (`catalog/demo/`). Each step of a storyboard begins here; designs made for a',
    'song and picked by the user are added back. Contact sheets: `waves/sheet.jpg`, `fonts/sheet.jpg`,',
    '`captions/sheet.jpg`.',
    '',
    ...section('waves', 'Step 1 · Waves', 'One still at the loudest second of the demo, no lyrics.', WAVES as Record<string, CatalogEntry<WaveDesign>>),
    ...section('fonts', 'Step 2 · Font sets', `Shown with the \`${DEFAULT_CAPTIONS}\` caption setup as the line finishes.`, FONTS as Record<string, CatalogEntry<FontSet>>),
    ...section('captions', 'Step 3 · Caption setups', `Four moments of one line (entering, a third in, fully sung, handing over), in \`${DEFAULT_FONTS}\` unless the entry says otherwise.`, CAPTIONS),
  ];
  fs.writeFileSync(path.join(dir, 'README.md'), lines.join('\n'));
};

const main = async () => {
  const isCatalog = target === 'catalog';
  if (isCatalog && args.includes('--gallery')) {
    // only rewrite out/waveform-catalog/README.md (after editing an entry's text)
    writeGallery(CATALOG_SHOTS);
    return;
  }
  if (isCatalog && flag('sheet')) {
    // a menu: some of a step's existing shots in one contact sheet, nothing rendered
    if (!STEPS.includes(stepArg as Step)) throw new Error('Name the step: catalog <waves|fonts|captions> --sheet=id,id');
    const files = flag('sheet')!.split(',').map(id => path.join(CATALOG_SHOTS, stepArg, `${id}.jpg`));
    const missing = files.filter(f => !fs.existsSync(f));
    if (missing.length) {
      throw new Error(`No shot for: ${missing.map(f => path.basename(f, '.jpg')).join(', ')}. Shoot them: npm run wave-lab -w lyrics_videos -- catalog ${stepArg}`);
    }
    const out = path.resolve(process.env.INIT_CWD ?? process.cwd(), flag('out') ?? path.join(ROOT, 'out', 'catalog-menus', `${stepArg}.jpg`));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    contactSheet(files, out);
    console.log(`✔ ${path.relative(process.cwd(), out)}`);
    return;
  }
  if (!isCatalog && !['looks', 'waves', 'fonts', 'captions', 'final'].includes(stepArg ?? '')) {
    throw new Error('Name the step: looks, waves, fonts, captions or final');
  }
  const steps = isCatalog ? (stepArg ? [stepArg as Step] : STEPS) : [];
  const shots = isCatalog ? await catalogShots(steps) : await storyboardShots(target, stepArg as Step | 'final');
  const outRoot = isCatalog
    ? CATALOG_SHOTS
    : path.join(ROOT, 'out', target, `${target}-storyboard`);

  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, 'src/index.ts'),
    publicDir: path.join(ROOT, 'projects'),
    webpackOverride: enableTailwind,
  });
  const chromiumOptions = { gl: 'angle' as const };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wave-lab-'));
  const done: Shot[] = [];
  try {
    for (const shot of shots) {
      const dir = path.join(outRoot, shot.step);
      fs.mkdirSync(dir, { recursive: true });
      const inputProps = { manifest: shot.manifest, look: shot.look, label: shot.label };
      const composition = await selectComposition({ serveUrl, id: 'wave-lab', inputProps, chromiumOptions });
      const frames: string[] = [];
      for (const [i, t] of shot.at.entries()) {
        const grid = shot.at.length > 1;
        const output = grid ? path.join(tmp, `${shot.id}-${i}.jpg`) : path.join(dir, `${shot.id}.jpg`);
        const label = grid ? `${shot.label}  ${i + 1}/${shot.at.length}` : shot.label;
        await renderStill({
          serveUrl,
          composition,
          frame: Math.max(0, Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps))),
          output,
          inputProps: { ...inputProps, label },
          imageFormat: 'jpeg',
          jpegQuality: 82,
          scale: SCALE,
          chromiumOptions,
          timeoutInMilliseconds: 120000,
        });
        frames.push(output);
      }
      if (frames.length > 1) {
        const cells = frames.slice(0, 4);
        while (cells.length < 4) cells.push(cells[cells.length - 1]);
        ffmpeg([...cells.flatMap(f => ['-i', f]), '-filter_complex', 'xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0,scale=1280:-2', '-q:v', '4', path.join(dir, `${shot.id}.jpg`)]);
      }
      if (clipSeconds > 0) {
        const f0 = Math.max(0, Math.round((shot.at[0] - 2) * composition.fps));
        const f1 = Math.min(composition.durationInFrames - 1, f0 + Math.round(clipSeconds * composition.fps) - 1);
        await renderMedia({
          serveUrl,
          composition,
          codec: 'h264',
          outputLocation: path.join(dir, `${shot.id}.mp4`),
          inputProps,
          frameRange: [f0, f1],
          scale: SCALE,
          crf: 20,
          chromiumOptions,
          timeoutInMilliseconds: 120000,
        });
        console.log(`✔ ${path.relative(ROOT, path.join(dir, `${shot.id}.mp4`))}  (${clipSeconds} s from ${r2(f0 / composition.fps)} s)`);
      }
      done.push(shot);
      console.log(`✔ ${path.relative(ROOT, path.join(dir, `${shot.id}.jpg`))}  (${shot.at.join(', ')} s)`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    // the bundle copies the whole public dir (GBs of media): don't leave it in the temp folder
    fs.rmSync(serveUrl, { recursive: true, force: true });
  }

  const shotSteps = [...new Set(done.map(s => s.step))];
  for (const step of shotSteps) {
    const dir = path.join(outRoot, step);
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg') && f !== 'sheet.jpg').sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    contactSheet(files.map(f => path.join(dir, f)), path.join(dir, 'sheet.jpg'));
    console.log(`✔ ${path.relative(ROOT, path.join(dir, 'sheet.jpg'))}  (${files.length})`);
    if (clipSeconds > 0) {
      // this run's clips back to back in one reel (same encoder settings, so a stream copy)
      const clips = done.filter(s => s.step === step).map(s => path.join(dir, `${s.id}.mp4`));
      const list = path.join(tmpdirFor(dir), 'reel.txt');
      fs.writeFileSync(list, clips.map(c => `file '${c.replace(/'/g, "'\\''")}'`).join('\n'));
      const reel = path.join(dir, `reel-${done.filter(s => s.step === step).map(s => s.id).join('-')}.mp4`);
      ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', reel]);
      console.log(`✔ ${path.relative(ROOT, reel)}`);
    }
  }
  writeIndex(outRoot, {
    job: path.basename(outRoot),
    title: isCatalog ? 'Waveform lyric video catalog' : `${target}: storyboard`,
    groups: shotSteps.map(step => ({
      id: step,
      name: step,
      items: done.filter(s => s.step === step).map(s => ({ id: `${step}/${s.id}`, file: `${step}/${s.id}.jpg`, note: s.note })),
    })),
  });
  console.log(`✔ ${path.relative(ROOT, path.join(outRoot, 'index.json'))}`);
  if (isCatalog) {
    writeGallery(outRoot);
    console.log(`✔ ${path.relative(ROOT, path.join(outRoot, 'README.md'))}`);
  }
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
