/**
 * thumbs: YouTube thumbnails (thumbnails/jobs/<job>/thumbs.json) and music posters / album artwork
 * (thumbnails/jobs/<job>/poster.json), see thumbnails/README.md.
 *
 * Usage: mm thumbs init <job> [--poster] [--brand=<folder>] [--title="…"] [--mood=bright|balanced|dark|as-is]
 *        mm thumbs cutout <job> input/photo.jpg [--model=birefnet-portrait] [--point=0.5,0.4] [--all]
 *        mm thumbs look <job> [--write]         (which treatments suit the picture)
 *        mm thumbs render <job> [A1,B2] [--png] [--guides] [--no-sheet]
 *        mm thumbs pick <job> A2            (one final)
 *        mm thumbs pick <job> A2,B1,C3      (three for YouTube's A/B test)
 *        mm thumbs keep <job> B2            (lock thumbnails the user likes as they are)
 *        mm thumbs pick <poster-job> A3 [--to=<release folder>]   (the cover; --to also copies it there as cover.jpg)
 *        mm thumbs canvas <poster-job>      (the Spotify Canvas loop → out/posters/<job>/canvas/remotion.mp4)
 *        mm thumbs figcraft <job> B2 [--open] [--fresh] [--no-fonts]   (rebuild it in Figcraft for the user to edit)
 *        mm thumbs figcraft <job> B2 --export [--file=…]                (bring the edit back as B2-edit.jpg)
 *        mm thumbs inspire <set> @channel… [--search="<query>"] [--winners=8] [--losers=3] [--title="…"]
 *        mm thumbs shot <job> <url> [--name=…] [--crop=x,y,w,h] [--width=1440 --height=900 --scale=2]
 *        mm thumbs logo <job> "<name> logo" [--pick=2] [--name=…]
 *        mm thumbs globe <job> <lat> <lon> --name=<name> [--size=2000] [--texture=…]
 *        mm thumbs pic <job> "<what>" [--pick=2] [--name=…] [--width=3000] [--subject=<library subject>]
 *        mm thumbs swap <job> <generated.png> <real picture> --name=<name> [--model=birefnet-general]
 *
 *   init     makes the job folder; with --brand copies the brand's logos, fonts, host (a mascot) and thumbnail
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
 *   figcraft rebuilds one variant as an editable Figcraft file (out/thumbnails/<job>/figcraft/<ID>.figcraft:
 *            pictures, devices and textures as images, headline lines as live text in the job's fonts),
 *            checks it against a fresh render (compare.jpg), installs fonts FigCraft lacks, --open opens
 *            it; --export brings the saved edit back as <ID>-edit.jpg (pick it like any ID). Needs
 *            figcraft-cli (scripts/figcraft.ts, the use-figcraft skill)
 *   inspire  references for a kind of channel or one video (thumbnails/tools/inspire.py): lists each
 *            channel's recent videos (yt-dlp, no key), scores them by views ÷ the channel's own
 *            median, and keeps its hits and misses' thumbnails: filed in the media library
 *            (references/youtube-thumbnails-<set>) and laid out as a labelled sheet and a review set
 *            in out/thumbnail-inspiration/inspire-<set>/ (/file-revision?job=inspire-<set>)
 *   shot     a real web page (a tool's screen, the result where it lives) captured at 2× in headless
 *            Chrome with a throwaway profile → input/shots/<name>.png + its source
 *   logo     an official logo from Wikimedia Commons → assets/logos/<name>.png + its page and licence
 *            (thumbnails/tools/kit.py)
 *   pic      a real photo from Wikimedia Commons (NASA, museums, free press pictures), filed in the
 *            media library (images/<subject>) with its licence and credit, cloned into
 *            input/pictures/<name>.<ext> + <name>.source.json
 *   globe    the Earth turned to a place (NASA's Blue Marble, public domain, fetched with `pic` as
 *            input/pictures/earth-texture.jpg) → cutouts/<name>.png, the place at the disc's centre
 *   swap     a generated host (a mascot, a hand) holding a chroma-green card gets the real picture on
 *            the card, warped and lit like it → input/held/<name>.png, then its cutout with the
 *            picture kept solid → cutouts/<name>.png
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { removeBundle, tempBundle } from './bundle.ts';
import { getCompositions, openBrowser, renderMedia, renderStill } from '@remotion/renderer';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { type Box, type FontSpec, type JobSpec, KINDS, type ResolvedVariant, TIMESTAMP_ZONE, fontFile, jobKind, jobScale, jobSize, resolveJob, styleVariants } from '../thumbnails/spec.ts';
import { PRESETS } from '../thumbnails/presets/index.ts';
import { TREATMENTS } from '../thumbnails/treatments.ts';
import { features, pickTreatments, scoreTreatments } from '../thumbnails/look.ts';
import { type ExposureFile, MOODS, type Mood, type Stats, fixFor, levelsFor, curve, summarize } from '../thumbnails/exposure.ts';
import { type Baked, INSTALL_HINT, type Probe, buildScript, figcraftCli, planLayers, runResults } from './figcraft.ts';
import { DIRS, repoPath, shown } from './paths.ts';
import { hasConfig, loadConfig } from './library/config.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JOBS = DIRS.thumbnailJobs;
const MAX_BYTES = 2 * 1024 * 1024; // YouTube's thumbnail limit

const rel = shown;
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
const outDir = (j: string) => path.join(DIRS.out, KINDS[jobKind(readSpec(j))].out, j);

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
    const kit = path.join(DIRS.brands, brand);
    const profileFile = path.join(kit, 'graphics', 'brand', 'thumbnail.json');
    if (!fs.existsSync(profileFile)) throw new Error(`No ${rel(profileFile)}: make the brand's thumbnail profile first (create-thumbnail skill, "Brands")`);
    const profile = JSON.parse(fs.readFileSync(profileFile, 'utf8')) as {
      logos: { file: string; as: string; width?: number; note?: string }[];
      fonts: (FontSpec & { file: string; role?: string })[];
      palette?: Record<string, string>;
      params?: Record<string, unknown>;
      rules?: string[];
      host?: { name: string; dir: string; copy?: string[]; note?: string };
    };
    for (const l of profile.logos) fs.copyFileSync(path.join(kit, l.file), path.join(dir, 'assets', l.as)), done(path.join(dir, 'assets', l.as));
    // a faceless brand's host (a mascot): its poses come into input/host/ (cloned, not duplicated on APFS)
    if (profile.host && !poster) {
      const to = path.join(dir, 'input', 'host');
      for (const sub of profile.host.copy ?? ['']) {
        const from = path.join(kit, profile.host.dir, sub);
        for (const f of fs.existsSync(from) ? fs.readdirSync(from).filter(f => /\.(png|jpe?g|webp)$/i.test(f)) : []) {
          fs.mkdirSync(path.join(to, sub), { recursive: true });
          fs.copyFileSync(path.join(from, f), path.join(to, sub, f), fs.constants.COPYFILE_FICLONE);
        }
      }
      if (fs.existsSync(to)) done(to);
      rules = [`The host: ${profile.host.name} (input/host/). ${profile.host.note ?? ''}`.trim()];
    }
    for (const f of profile.fonts) {
      const to = path.join(dir, 'fonts', fontFile({ ...f, file: undefined }));
      fs.copyFileSync(path.join(kit, f.file), to);
      done(to);
      spec.fonts!.push({ family: f.family, weight: f.weight, italic: f.italic });
    }
    // posters carry no logo unless the user asks for one (the files are in assets/ if they do)
    const logos = poster ? [] : profile.logos.slice(0, 1).map(l => ({ src: `assets/${l.as}`, width: l.width }));
    spec.defaults!.params = { palette: profile.palette, ...profile.params, logos };
    rules = [...(profile.rules ?? []), ...rules];
  }
  // the art alone comes first: a text version is only ever an addition to it
  // plain: variety comes from crops, placement and ideas (create-music-poster, reworked 2026-10-31);
  // finishing looks are added by hand later, `look <job>` ranks them ("treatments": "auto" still works)
  if (poster) spec.styles = [{ id: 'A', name: 'Art only', idea: 'the picture alone, no text: the base every text version builds on', preset: 'cover', treatments: ['plain'] }];
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
    if (serveUrl) removeBundle(serveUrl);
    serveUrl = await tempBundle({ entryPoint: path.join(ROOT, 'thumbnails/index.ts'), publicDir: JOBS });
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
  removeBundle(serveUrl);
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

/** The image-set contract /file-revision reads (see scripts/image-index.ts): the renders by ID, who made them and from what. */
const writeIndex = (spec: JobSpec, variants: ResolvedVariant[], ext: string) => {
  const old = fs.existsSync(indexFile()) ? (JSON.parse(fs.readFileSync(indexFile(), 'utf8')) as Index) : undefined;
  const index: Index = {
    schema: 'mediamake.image-set/v1',
    job,
    kind: jobKind(spec),
    workflow: jobKind(spec) === 'poster' ? 'create-music-poster' : 'create-thumbnail',
    source: repoPath(specFile(job)),
    location: repoPath(outDir(job)),
    // absolute, so /file-revision can show the folder in Finder (dev server) or copy the path
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
  const serveUrl = await tempBundle({ entryPoint: path.join(ROOT, 'thumbnails/index.ts'), publicDir: JOBS });
  const composition = (await getCompositions(serveUrl)).find(c => c.id === `${job}-canvas`);
  if (!composition) throw new Error(`No composition ${job}-canvas`);
  const out = path.join(outDir(job), 'canvas', 'remotion.mp4');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const raw = out.replace(/\.mp4$/, '.raw.mp4');
  await renderMedia({ serveUrl, composition, codec: 'h264', crf: 18, imageFormat: 'jpeg', jpegQuality: 95, outputLocation: raw, muted: true });
  removeBundle(serveUrl);
  // JPEG frames come out full-range (yuvj420p); players and Spotify expect standard yuv420p
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', '-an', out]);
  fs.rmSync(raw);
  done(out);
};

/**
 * References for a kind of channel (or one video's nearest channels): every channel's hits and
 * misses by views ÷ its own median, filed in the media library when there is one
 * (references/youtube-thumbnails-<set>) and laid out as a sheet and a /file-revision set.
 */
const inspire = () => {
  const handles = args.filter(a => !a.startsWith('--')).slice(2);
  if (!handles.length && !flag('search')) throw new Error('Usage: thumbs inspire <set> @channel… [--search="<query>"] [--winners=8] [--losers=3] [--title="…"]');
  if (spawnSync('yt-dlp', ['--version']).status !== 0) throw new Error('thumbs inspire lists videos with yt-dlp: install it first (brew install yt-dlp, or pipx install yt-dlp)');
  const set = job.replace(/^inspire-/, '');
  const dir = path.join(DIRS.out, 'thumbnail-inspiration', `inspire-${set}`);
  const lib = hasConfig() ? loadConfig() : null;
  const subject = `youtube-thumbnails-${set}`;
  const filed = lib ? path.join(lib.root, 'references', subject) : path.join(dir, 'downloads');
  const dest = lib ? path.join(lib.inbox, 'youtube-thumbnails', set) : filed;
  const py = (...a: string[]) => {
    const r = spawnSync('uv', ['run', '--quiet', '--with', 'pillow', 'python', 'thumbnails/tools/inspire.py', ...a], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status ?? 1);
  };
  py('grab', `--dir=${dir}`, `--dest=${dest}`, `--have=${filed}`, ...flags.filter(f => /^--(winners|losers|search|limit)=/.test(f)), ...handles);
  if (lib && fs.existsSync(dest) && fs.readdirSync(dest).some(f => f.endsWith('.jpg'))) {
    // the library's rule: downloads land in the inbox, ingest files them
    const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', 'scripts/media.ts', 'ingest', dest, '--kind=references', `--subject=${subject}`, `--tags=youtube-thumbnail,${set}`], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0) {
      console.error(`${r.stdout}\n${r.stderr}`.trim());
      process.exit(r.status ?? 1);
    }
    console.log(`✔ filed in the media library: references/${subject}`);
  }
  py('board', `--dir=${dir}`, `--from=${filed}`, `--location=${rel(dir)}`, ...flags.filter(f => f.startsWith('--title=')));
  done(path.join(dir, 'sheet.jpg'));
  console.log(`Review: https://mediamake.microfox.app/file-revision?job=inspire-${set}`);
};

/** The real pieces of a thumbnail: a page's screenshot (`shot`) or an official logo (`logo`). */
const kitTool = (sub: 'shot' | 'logo') => {
  if (!third) throw new Error(sub === 'shot' ? 'Usage: thumbs shot <job> <url> [--name=…] [--crop=x,y,w,h]' : 'Usage: thumbs logo <job> "<name> logo" [--pick=N] [--name=…]');
  if (!fs.existsSync(jobDir(job))) throw new Error(`No job ${rel(jobDir(job))}: run init first`);
  const main = sub === 'shot' ? `--url=${third}` : `--query=${third}`;
  const r = spawnSync('uv', ['run', '--quiet', '--with', 'pillow', 'python', 'thumbnails/tools/kit.py', sub, `--dir=${jobDir(job)}`, main, ...flags], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

/** A real photo from Wikimedia Commons, through the library's inbox (the library's rule), cloned into the job. */
const picTool = () => {
  if (!third) throw new Error('Usage: thumbs pic <job> "<what>" [--pick=N] [--name=…] [--width=3000] [--subject=<library subject>]');
  const dir = jobDir(job);
  if (!fs.existsSync(dir)) throw new Error(`No job ${rel(dir)}: run init first`);
  const lib = hasConfig() ? loadConfig() : null;
  const subject = flag('subject') ?? `thumbnail-kit/${job}`;
  const to = path.join(dir, 'input', 'pictures');
  const dest = lib ? path.join(lib.inbox, 'commons') : to;
  const have = lib ? path.join(lib.root, 'images', ...subject.split('/')) : to;
  const r = spawnSync('uv', ['run', '--quiet', '--with', 'pillow', 'python', 'thumbnails/tools/kit.py', 'pic', `--query=${third}`, `--dest=${dest}`, `--have=${have}`, ...flags.filter(f => /^--(pick|name|width)=/.test(f))], { cwd: ROOT, encoding: 'utf8' });
  process.stdout.write(r.stdout.replace(/^FILE .*\n?/m, ''));
  if (r.status !== 0) {
    console.error(r.stderr.trim());
    process.exit(r.status ?? 1);
  }
  const name = /^FILE (.+)$/m.exec(r.stdout)?.[1];
  if (!lib || !name) return;
  const file = fs.existsSync(dest) ? fs.readdirSync(dest).find(f => f.startsWith(`${name}.`) && !f.endsWith('.json')) : undefined;
  const sidecar = file ? fs.readFileSync(path.join(dest, `${file}.source.json`), 'utf8') : undefined;
  let filed: string | undefined;
  if (file) {
    const ing = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings=ExperimentalWarning', 'scripts/media.ts', 'ingest', path.join(dest, file), `--kind=images`, `--subject=${subject}`, '--tags=commons,thumbnail-kit'], { cwd: ROOT, encoding: 'utf8' });
    if (ing.status !== 0) {
      console.error(`${ing.stdout}\n${ing.stderr}`.trim());
      process.exit(ing.status ?? 1);
    }
    const at = /(?:filed →|already have it:|known:) (.+)$/m.exec(ing.stdout)?.[1]?.trim();
    filed = at ? path.join(lib.root, at) : undefined;
  } else {
    const f = fs.readdirSync(have).find(f => f.startsWith(`${name}.`) && !f.endsWith('.json'));
    filed = f ? path.join(have, f) : undefined;
  }
  if (!filed || !fs.existsSync(filed)) throw new Error(`${name} went into the library, but its place there was not found: media find ${name}`);
  fs.mkdirSync(to, { recursive: true });
  const into = path.join(to, `${name}${path.extname(filed)}`);
  fs.copyFileSync(filed, into, fs.constants.COPYFILE_FICLONE);
  if (sidecar) fs.writeFileSync(path.join(to, `${name}.source.json`), sidecar);
  console.log(`✔ filed in the media library: ${path.relative(lib.root, filed)}`);
  done(into);
};

/** The Earth turned to a place, for a map-led thumbnail. */
const globeTool = () => {
  const [lat, lon] = args.filter(a => !/^--/.test(a)).slice(2, 4);
  const name = flag('name');
  if (!lat || !lon || !name) throw new Error('Usage: thumbs globe <job> <lat> <lon> --name=<name> [--size=2000] [--texture=…] [--gamma=0.62]');
  const r = spawnSync('uv', ['run', '--quiet', '--with', 'numpy', '--with', 'pillow', 'python', 'thumbnails/tools/kit.py', 'globe', `--dir=${jobDir(job)}`, `--lat=${lat}`, `--lon=${lon}`, ...flags], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

/** The real product in a generated host's hands: swap it onto the green card, cut the pair out, keep the product solid. */
const swapTool = () => {
  const pic = args.filter(a => !a.startsWith('--'))[3];
  const name = flag('name');
  if (!third || !pic || !name) throw new Error('Usage: thumbs swap <job> <generated.png> <real picture> --name=<name> [--model=birefnet-general]');
  const py = (deps: string[], ...a: string[]) => {
    const r = spawnSync('uv', ['run', '--quiet', ...deps.flatMap(d => ['--with', d]), 'python', ...a], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status ?? 1);
  };
  const abs = (f: string) => (path.isAbsolute(f) ? f : path.resolve(process.cwd(), f));
  py(['numpy', 'scipy', 'pillow'], 'thumbnails/tools/kit.py', 'swap', `--dir=${jobDir(job)}`, `--gen=${abs(third)}`, `--pic=${abs(pic)}`, `--name=${name}`);
  py(['rembg[cpu]', 'scipy', 'pillow'], 'thumbnails/tools/cutout.py', job, `input/held/${name}.png`, `--model=${flag('model') ?? 'birefnet-general'}`);
  py(['numpy', 'scipy', 'pillow'], 'thumbnails/tools/kit.py', 'solid', `--dir=${jobDir(job)}`, `--name=${name}`);
};

// ── figcraft: the final edit, in an editor ──────────────────────────────────────────────────────

/** The port FigCraft is started with (`--control`), so `figcraft-cli mcp --attach <port>` can drive the open window. */
const FIGCRAFT_PORT = Number(process.env.FIGCRAFT_CONTROL_PORT ?? 7979);

/** Runs a figcraft-cli script (saved beside the rebuild, so it can be read or run again); throws on a failed step. */
const figcraftRun = (cli: string, steps: unknown[], file: string, extra: string[] = []) => {
  fs.writeFileSync(file, JSON.stringify(steps, null, 2) + '\n');
  const r = spawnSync(cli, ['run', file, ...extra], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`figcraft-cli run ${rel(file)} failed: ${`${r.stderr}\n${r.stdout}`.trim().split('\n').slice(-3).join(' · ')}`);
  return runResults(r.stdout);
};

/** The box of a transparent PNG's opaque pixels (ffmpeg's bbox on its alpha), or null when it drew nothing. */
const alphaBox = (file: string): Box | null => {
  // a layer that covers every pixel comes out as a PNG with no alpha channel: all of it
  const fmt = spawnSync(ffprobeInstaller.path, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=pix_fmt', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim();
  const dims = imageSize(file);
  if (dims && !/a/.test(fmt.replace(/^gbr/, ''))) return [0, 0, dims[0], dims[1]];
  const r = spawnSync(ffmpegInstaller.path, ['-hide_banner', '-i', file, '-vf', 'alphaextract,bbox=min_val=3', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = [...(r.stderr ?? '').matchAll(/x1:(\d+) x2:(\d+) y1:(\d+) y2:(\d+)/g)].pop();
  if (!m) return null;
  const [x1, x2, y1, y2] = m.slice(1).map(Number);
  return x2 >= x1 && y2 >= y1 ? [x1, y1, x2 - x1 + 1, y2 - y1 + 1] : null;
};

/** The job's font files (render fetches missing Google fonts first). */
const jobFontFiles = (spec: JobSpec) => [...new Set((spec.fonts ?? []).map(f => path.join(jobDir(job), 'fonts', fontFile(f))).filter(f => fs.existsSync(f)))];

/** The rebuilds of one ID, newest last: <ID>.figcraft, <ID>-2.figcraft … */
const figcraftDocs = (dir: string, id: string) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter(f => new RegExp(`^${id}(-\\d+)?\\.figcraft$`).test(f))
        .map(f => path.join(dir, f))
        .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs)
    : [];

/** How close two pictures are, 0–100 (100 − mean difference per channel, at 320 px wide). */
const likeness = (a: string, b: string) => {
  const pa = pixels(a, 320).data;
  const pb = pixels(b, 320).data;
  if (pa.length !== pb.length) return 0;
  let sum = 0;
  for (let i = 0; i < pa.length; i++) sum += Math.abs(pa[i] - pb[i]);
  return Math.round((1 - sum / pa.length / 255) * 1000) / 10;
};

/** FigCraft with the file; started with its control port when it isn't running yet. */
const openInFigcraft = (doc: string) => {
  if (process.platform !== 'darwin') return console.log(`Open ${doc} in FigCraft.`);
  const running = spawnSync('pgrep', ['-x', 'FigCraft']).status === 0;
  const r = spawnSync('open', running ? ['-a', 'FigCraft', doc] : ['-a', 'FigCraft', '--args', '--control', String(FIGCRAFT_PORT), doc]);
  if (r.status !== 0) warn(`FigCraft isn't in /Applications: install the .dmg from https://github.com/storytold/figcraft/releases/latest, then open ${rel(doc)}`);
  else console.log(`↗ opened in FigCraft${running ? ' (it was already open, so without its control port)' : ` (control port ${FIGCRAFT_PORT}: figcraft-cli mcp --attach ${FIGCRAFT_PORT} drives the window)`}`);
};

/** Installs the job's fonts that FigCraft doesn't have on this computer, so the file opens in them. */
const installFigcraftFonts = (cli: string, doc: string, spec: JobSpec) => {
  const info = spawnSync(cli, ['info', doc, '--json'], { encoding: 'utf8' });
  const missing = info.status === 0 ? ((JSON.parse(info.stdout).missingFonts ?? []) as { family: string }[]).map(f => f.family) : [];
  if (!missing.length) return;
  const fontsDir = process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Fonts') : path.join(os.homedir(), '.local', 'share', 'fonts');
  fs.mkdirSync(fontsDir, { recursive: true });
  for (const family of missing) {
    const files = (spec.fonts ?? []).filter(f => f.family === family).map(f => path.join(jobDir(job), 'fonts', fontFile(f)));
    if (!files.some(f => fs.existsSync(f))) warn(`${family} is not on this computer or in the job's fonts/: FigCraft shows its text in a fallback font`);
    for (const file of files.filter(f => fs.existsSync(f))) {
      const to = path.join(fontsDir, path.basename(file));
      if (fs.existsSync(to)) continue;
      fs.copyFileSync(file, to);
      console.log(`✔ installed ${family} (${path.basename(file)}) in ${fontsDir.replace(os.homedir(), '~')}, so FigCraft shows it`);
    }
  }
};

/** A PNG as YouTube's JPEG (under 2 MB) or a poster's 3000 px cover. */
const toJpeg = (from: string, to: string, poster: boolean) => {
  for (const q of poster ? [2] : [2, 3, 5, 8]) {
    spawnSync(ffmpegInstaller.path, ['-y', '-loglevel', 'error', '-i', from, '-q:v', String(q), to]);
    if (poster || fs.statSync(to).size <= MAX_BYTES) break;
  }
};

/**
 * Rebuilds a finished variant in Figcraft as layers the user can edit: every picture, device and
 * texture rendered alone (transparent, trimmed, pictures at 2×) and placed where it was, every
 * headline line as live text in the job's fonts (plates as rectangles, strokes, shadows and glows as
 * effects), plain fills as rectangles. Checks the file by exporting it and comparing with a fresh
 * render, installs fonts FigCraft lacks, and opens it with --open. --export brings the edit back.
 */
const figcraft = async () => {
  const id = third;
  if (!id) throw new Error('Usage: thumbs figcraft <job> <ID> [--open] [--fresh] [--no-fonts]   ·   thumbs figcraft <job> <ID> --export [--file=<path>.figcraft]');
  const cli = figcraftCli();
  if (!cli) throw new Error(INSTALL_HINT);
  const spec = readSpec(job);
  const dir = path.join(outDir(job), 'figcraft');
  if (flags.includes('--export')) return figcraftExport(cli, spec, id, dir);
  const exposure = fs.existsSync(exposureFile()) ? (JSON.parse(fs.readFileSync(exposureFile(), 'utf8')) as ExposureFile) : undefined;
  const variant = resolveJob(spec, exposure).find(v => v.id === id);
  if (!variant) throw new Error(`No ${id} in ${rel(specFile(job))}`);
  const docs = figcraftDocs(dir, id);
  if (docs.length && !flags.includes('--fresh')) {
    const latest = docs[docs.length - 1];
    console.log(`${rel(latest)} is there already and may hold the user's edits: kept as it is (--fresh rebuilds ${id} from its spec as a new file).`);
    if (flags.includes('--open')) openInFigcraft(latest);
    return;
  }
  const doc = path.join(dir, docs.length ? `${id}-${docs.length + 1}.figcraft` : `${id}.figcraft`);
  const work = path.join(dir, path.basename(doc, '.figcraft'));
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(path.join(work, 'layers'), { recursive: true });
  const scale = jobScale(spec);
  const size = jobSize(spec);
  const plans = planLayers(variant, scale);
  for (const f of spec.fonts ?? []) await fetchFont(job, f);
  const fonts = jobFontFiles(spec);

  const serveUrl = await tempBundle({ entryPoint: path.join(ROOT, 'thumbnails/index.ts'), publicDir: JOBS });
  const composition = (await getCompositions(serveUrl)).find(c => c.id === `${job}-${id}`);
  if (!composition) throw new Error(`No composition ${job}-${id}`);
  const browser = await openBrowser('chrome', { logLevel: 'error' });
  const probes = new Map<number, Probe>();
  const baked = new Map<string, Baked>();
  const render = path.join(work, 'render.png');
  try {
    const still = (props: Record<string, unknown>, output: string, s: number, onLog?: (text: string) => void) =>
      renderStill({ serveUrl, composition: { ...composition, props: { ...composition.defaultProps, ...props } }, output, imageFormat: 'png', scale: s, puppeteerInstance: browser, logLevel: 'error', onBrowserLog: onLog && (log => onLog(log.text)) });
    // the whole variant, logging where its text lines sit (Remotion echoes the line too)
    await still({ probe: true }, render, scale, text => {
      if (!text.startsWith('[figcraft-text] ')) return;
      for (const p of JSON.parse(text.slice('[figcraft-text] '.length)) as Probe[]) probes.set(p.index, p);
    });
    for (const [n, plan] of plans.entries()) {
      if (plan.how === 'rect' || (plan.how === 'text' && !plan.bake)) continue;
      const file = path.join(work, 'layers', `${String(n).padStart(2, '0')}-${plan.name.replace(/\.(png|jpe?g|webp|svg)$/i, '').replace(/[^\w.-]+/g, '-').slice(0, 40)}.png`);
      await still({ solo: plan.key }, file, plan.scale);
      const box = alphaBox(file);
      if (!box) {
        fs.rmSync(file);
        continue;
      }
      const dims = imageSize(file);
      if (dims && (box[2] < dims[0] || box[3] < dims[1])) {
        const cropped = file.replace(/\.png$/, '.crop.png');
        spawnSync(ffmpegInstaller.path, ['-y', '-loglevel', 'error', '-i', file, '-vf', `crop=${box[2]}:${box[3]}:${box[0]}:${box[1]}`, cropped]);
        fs.renameSync(cropped, file);
      }
      baked.set(plan.key, { file, box: box.map(v => v / plan.scale) as Box });
    }
  } finally {
    await browser.close({ silent: true }).catch(() => undefined);
    removeBundle(serveUrl);
  }

  // each family's faces as Figcraft names them, so a weight finds its face
  const families = [...new Set([...(spec.fonts ?? []).map(f => f.family), ...[...probes.values()].flatMap(p => p.items.map(i => i.font))])];
  const faces = figcraftRun(cli, [...fonts.map(f => ({ command: 'text.loadFont', params: { path: f } })), ...families.map(family => ({ command: 'text.fonts', params: { family } }))], path.join(work, 'fonts.json'));
  const styles = Object.fromEntries(families.map((f, i) => [f, (faces[fonts.length + i]?.result as unknown as string[] | undefined) ?? []]));
  const name = `${job} · ${id}`;
  const { steps, notes } = buildScript({ name, size, fonts, styles, plans, probes, baked });
  const results = figcraftRun(cli, steps, path.join(work, 'script.json'), ['--out', doc]);
  const frame = results[0]?.result?.id;
  fs.writeFileSync(path.join(work, 'manifest.json'), JSON.stringify({ job, id, doc, frame, name, size, scale, fonts }, null, 2) + '\n');
  done(doc);

  // check: the file exported as it stands, beside a fresh render of the variant
  const check = path.join(work, 'check.png');
  figcraftRun(cli, [...fonts.map(f => ({ command: 'text.loadFont', params: { path: f } })), { command: 'file.export', params: { ids: [frame], format: 'png', path: check, scale } }], path.join(work, 'check.json'), ['--in', doc]);
  const compare = path.join(work, 'compare.jpg');
  spawnSync(ffmpegInstaller.path, ['-y', '-loglevel', 'error', '-i', render, '-i', check, '-filter_complex', `[0]scale=${size[0]}:-2[a];[1]scale=${size[0]}:-2[b];[a][b]hstack`, '-q:v', '3', compare]);
  const texts = plans.filter(p => p.how === 'text').length;
  console.log(`${plans.length} layers: ${baked.size} as images, ${texts} headline${texts === 1 ? '' : 's'} as live text, ${plans.filter(p => p.how === 'rect').length} as rectangles`);
  for (const note of notes) console.log(`  · ${note}`);
  console.log(`Figcraft's export matches the render ${likeness(render, check)}% (100 = the same picture): render | Figcraft in ${rel(compare)}`);
  if (variant.post) warn(`${id} has a treatment: its grade is in the image layers, but the live text keeps its own colours (compare the two)`);
  if (!flags.includes('--no-fonts')) installFigcraftFonts(cli, doc, spec);
  if (flags.includes('--open')) openInFigcraft(doc);
  console.log(`When the user has saved their edit (⌘S): mm thumbs figcraft ${job} ${id} --export`);
};

/** The user's edit back from Figcraft: exported at the job's size, kept as <ID>-edit-v<N>.jpg, and as <ID>-edit.jpg beside the renders for pick. */
const figcraftExport = (cli: string, spec: JobSpec, id: string, dir: string) => {
  const docs = figcraftDocs(dir, id);
  const doc = flag('file') ? path.resolve(flag('file')!) : docs[docs.length - 1];
  if (!doc || !fs.existsSync(doc)) throw new Error(`No ${id}.figcraft in ${rel(dir)}: run thumbs figcraft ${job} ${id} first`);
  const work = path.join(dir, path.basename(doc, '.figcraft'));
  fs.mkdirSync(work, { recursive: true });
  const manifestFile = path.join(work, 'manifest.json');
  const manifest = fs.existsSync(manifestFile) ? (JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as { name?: string; fonts?: string[] }) : {};
  const size = jobSize(spec);
  const scale = jobScale(spec);
  const info = spawnSync(cli, ['info', doc, '--json'], { encoding: 'utf8' });
  if (info.status !== 0) throw new Error(`figcraft-cli info ${rel(doc)} failed: ${info.stderr.trim()}`);
  const frames = (JSON.parse(info.stdout).pages as { frames: { id: number; name: string; width: number; height: number }[] }[]).flatMap(p => p.frames);
  const frame = frames.find(f => f.name === manifest.name) ?? frames.find(f => Math.round(f.width) === size[0] && Math.round(f.height) === size[1]) ?? frames[0];
  if (!frame) throw new Error(`${rel(doc)} has no frame to export`);
  if (Math.round(frame.width) !== size[0] || Math.round(frame.height) !== size[1]) warn(`the frame "${frame.name}" is ${frame.width}×${frame.height}, not ${size.join('×')}: exported as it is`);
  const fonts = (manifest.fonts ?? jobFontFiles(spec)).filter(f => fs.existsSync(f));
  const png = path.join(work, 'edit.png');
  figcraftRun(cli, [...fonts.map(f => ({ command: 'text.loadFont', params: { path: f } })), { command: 'file.export', params: { ids: [frame.id], format: 'png', path: png, scale } }], path.join(work, 'export.json'), ['--in', doc]);
  const poster = jobKind(spec) === 'poster';
  const n = fs.readdirSync(dir).filter(f => new RegExp(`^${id}-edit-v\\d+\\.jpg$`).test(f)).length + 1;
  const versioned = path.join(dir, `${id}-edit-v${n}.jpg`);
  toJpeg(png, versioned, poster);
  const latest = path.join(outDir(job), `${id}-edit.jpg`);
  fs.copyFileSync(versioned, latest);
  done(versioned);
  done(latest);
  if (!poster && fs.statSync(latest).size > MAX_BYTES) warn(`${rel(latest)} is over YouTube's 2 MB`);
  console.log(`Show it to the user; the final is then: mm thumbs pick ${job} ${id}-edit`);
};

const main = async () => {
  if (!cmd || !job) {
    console.error('Usage: mm thumbs init|cutout|look|render|pick|keep|canvas|figcraft|shot|logo|pic|globe|swap <job> … | mm thumbs inspire <set> @channel…');
    process.exit(1);
  }
  if (cmd === 'init') init();
  else if (cmd === 'cutout') cutout();
  else if (cmd === 'look') look(flags.includes('--write'));
  else if (cmd === 'render') await render();
  else if (cmd === 'pick') pick();
  else if (cmd === 'keep') keep();
  else if (cmd === 'canvas') await canvas();
  else if (cmd === 'figcraft') await figcraft();
  else if (cmd === 'inspire') inspire();
  else if (cmd === 'shot' || cmd === 'logo') kitTool(cmd);
  else if (cmd === 'pic') picTool();
  else if (cmd === 'globe') globeTool();
  else if (cmd === 'swap') swapTool();
  else throw new Error(`Unknown command ${cmd}`);
};

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
