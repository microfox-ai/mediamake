/**
 * lyric-shorts: vertical lyric shorts with stacked, width-fit words that the footage plays inside
 * (make-lyric-shorts skill; engine in src/lyricshorts/).
 *
 *   pick   scores every stretch of 15–45 s that starts on a sung line and ends after one: how much of it
 *          is sung, how much of that comes back elsewhere in the song (the hook), the vocal and the
 *          drive, a clean start (no line cut in half, little dead air) and a clean end (bonus when an
 *          instrumental hit follows: the short can dive into the footage on it). Stretches the user
 *          called bad (shorts/history.json, shared with make-video-music-remix-shorts) never come back.
 *          Writes shorts/lyric-picks.json and out/<slug>/shorts/lyric-picks-<run>/ (an mp3 per pick,
 *          picks.png: the waveform with the sections and the picks).
 *   new    scaffolds shorts/<id>/ (short.json, edl.ts with the stretch's words listed, index.tsx) for a
 *          pick letter or a from-to in seconds (snapped to downbeats), and logs it in shorts/history.json.
 *   clips  resolves shorts/<id>/edl.ts against the song, cuts every footage clip it needs (9:16, cropped
 *          at the cut's x, at the short's fps) into derived/lyricshorts/, writes shorts/<id>/shots.json
 *          for the Revisions map, prints the timeline and the warnings, and draws
 *          out/<slug>/shorts/<id>/cuts.jpg (each cut's middle frame as it will be framed).
 *
 * Usage:
 *   npm run lyric-shorts -w lyrics_videos -- <slug> pick [--n=3] [--min=15] [--max=45]
 *   npm run lyric-shorts -w lyrics_videos -- <slug> new B [--formats=9x16] [--lead=1] [--loop]   (lead: bars before the first line)
 *   npm run lyric-shorts -w lyrics_videos -- <slug> new 211.3-244.5
 *   npm run lyric-shorts -w lyrics_videos -- <slug> clips s01
 *
 * Footage sources: projects/<slug>/shorts/footage.json { sources: [{ id, prefix, source, segregation }] }
 * (source relative to the project; segregation = the analyze-video output folder). Without it, the
 * first video in input/footage/ with its segregation in footage/ (prefix sh).
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import opentype from 'opentype.js';
import { solveStack, type TypeStyle } from '../src/lyricshorts/layout.ts';
import { beatAt, beatTime, clipTime, norm, resolveShort, type LyricShortEdl, type SongLike } from '../src/lyricshorts/spec.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const [slug, cmd, what] = args.filter(a => !a.startsWith('--'));
const opt = (n: string) => args.find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3);
if (!slug || !cmd) {
  console.error('usage: npm run lyric-shorts -w lyrics_videos -- <slug> pick | new <letter | from-to> | clips <id>');
  process.exit(1);
}
const dir = path.join(ROOT, 'projects', slug);
const shortsDir = path.join(dir, 'shorts');
const manifestFile = path.join(dir, 'manifest.json');
if (!fs.existsSync(manifestFile)) throw new Error(`No manifest. Run: npm run prepare-project -w lyrics_videos -- ${slug}`);
type Manifest = SongLike & {
  title: string;
  audio: { src: string; duration: number };
  sections: { label: string; from: number; to: number }[];
  beats: { list: { t: number }[]; downbeats?: number[]; beatsPerBar?: number };
  envelopes?: { fps: number; series: Record<string, number[]> };
  energy: { rate: number; values: number[] };
  lyrics: { text: string; start: number; end: number; words: { text: string; start: number; end: number }[] }[];
};
const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as Manifest;
const mmss = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const today = () => new Date().toLocaleDateString('sv');

type HistoryEntry = { id: string; from: number; to: number; fromBeat: number; toBeat: number; sections: string[]; run: number; date: string; status: 'made' | 'bad' | 'liked'; note?: string; formats?: string[]; skill?: string };
const historyFile = path.join(shortsDir, 'history.json');
const readHistory = (): { shorts: HistoryEntry[] } => (fs.existsSync(historyFile) ? JSON.parse(fs.readFileSync(historyFile, 'utf8')) : { shorts: [] });
const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)) / Math.min(a1 - a0, b1 - b0);
const sectionsIn = (a: number, b: number) => m.sections.filter(s => s.to > a + 0.5 && s.from < b - 0.5).map(s => s.label);

// ------------------------------------------------------------------ the song as words and bars

const words = m.lyrics.flatMap(l => l.words).sort((a, b) => a.start - b.start);
const keys = words.map(w => norm(w.text));
const downbeats = m.beats.downbeats?.length ? m.beats.downbeats : m.beats.list.filter((_, k) => k % (m.beats.beatsPerBar ?? 4) === 0).map(b => b.t);
const bars = [...downbeats, m.audio.duration].filter((t, k, a) => k === 0 || t > a[k - 1] + 0.2);
const barAt = (t: number) => bars.reduce((best, b, k) => (Math.abs(b - t) < Math.abs(bars[best] - t) ? k : best), 0);
const barBefore = (t: number) => {
  let k = 0;
  while (k + 1 < bars.length && bars[k + 1] <= t + 1e-3) k++;
  return k;
};
// a word is part of the hook when the 3 words from it come back elsewhere in the song
const gram = (k: number) => keys.slice(k, k + 3).join(' ');
const gramCount = new Map<string, number>();
for (let k = 0; k + 3 <= keys.length; k++) gramCount.set(gram(k), (gramCount.get(gram(k)) ?? 0) + 1);
const hookWord = keys.map((_, k) => [k, k - 1, k - 2].some(j => j >= 0 && j + 3 <= keys.length && (gramCount.get(gram(j)) ?? 0) > 1));
const env = (name: string) => {
  const s = m.envelopes?.series[name];
  const fps = s ? m.envelopes!.fps : m.energy.rate;
  const v = s ?? m.energy.values;
  return (a: number, b: number) => {
    let sum = 0;
    let n = 0;
    for (let i = Math.max(0, Math.floor(a * fps)); i < Math.min(v.length, Math.ceil(b * fps)); i++) {
      sum += v[i];
      n++;
    }
    return n ? sum / n : 0;
  };
};
const vocal = env('vocal');
const drums = env(m.envelopes?.series.drums ? 'drums' : 'rms');
const bass = env(m.envelopes?.series.bass ? 'bass' : 'rms');

// ------------------------------------------------------------------ pick

if (cmd === 'pick') {
  const n = Number(opt('n') ?? 3);
  const min = Number(opt('min') ?? 15);
  const max = Number(opt('max') ?? 45);
  const history = readHistory();
  // per-bar z-scores of drive and vocal over the whole song
  const barStats = bars.slice(0, -1).map((t, k) => ({ drive: drums(t, bars[k + 1]) + bass(t, bars[k + 1]), vox: vocal(t, bars[k + 1]) }));
  const z = (xs: number[]) => {
    const mu = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mu) ** 2, 0) / xs.length) || 1;
    return xs.map(x => (x - mu) / sd);
  };
  const driveZ = z(barStats.map(b => b.drive));
  const voxZ = z(barStats.map(b => b.vox));
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  // phrases, not the transcription's lines (often cut by length): a sentence or clause ends at
  // punctuation or a breath; starts are the downbeat at or before a phrase's first word
  const endsPhrase = words.map((w, k) => /[.!?]$/.test(w.text) || (k + 1 < words.length && words[k + 1].start - w.end > 0.8));
  const startsPhrase = words.map((_, k) => k === 0 || endsPhrase[k - 1] || /[,;]$/.test(words[k - 1].text));
  const starts = [...new Set(words.filter((_, k) => startsPhrase[k]).map(w => barBefore(w.start)))];
  const ends = [...new Set(words.filter((_, k) => endsPhrase[k]).map(w => barBefore(w.end) + 1))].filter(b => b < bars.length);
  type Cand = { a: number; b: number; from: number; to: number; s: number; why: string[]; first: string; last: string };
  const cands: Cand[] = [];
  for (const a0 of starts)
    for (const b0 of ends) {
      for (const tail of [0, 1, 2, 3, 4]) {
        const a = a0;
        const b = Math.min(bars.length - 1, b0 + tail);
        const from = bars[a];
        const to = bars[b];
        const dur = to - from;
        if (b <= a || dur < min || dur > max) continue;
        const inside = words.map((w, k) => ({ w, k })).filter(({ w }) => w.start >= from - 0.05 && w.start < to);
        if (inside.length < 6) continue;
        const why: string[] = [];
        let s = 0;
        // sung coverage: words per second, capped
        const sungTime = inside.reduce((acc, { w }) => acc + Math.min(1.2, w.end - w.start), 0);
        s += 1.2 * Math.min(1, sungTime / dur / 0.55);
        const hook = mean(inside.map(({ k }) => (hookWord[k] ? 1 : 0)));
        s += 1.6 * hook;
        if (hook > 0.4) why.push(`${Math.round(hook * 100)} % hook words`);
        s += 0.5 * mean(voxZ.slice(a, b)) + 0.4 * mean(driveZ.slice(a, b));
        // a clean start: no word in the second before (a line cut in half) and the first word soon
        const before = words.filter(w => w.end > from - 0.6 && w.start < from - 0.05);
        if (before.length) {
          s -= 1.5;
          why.push(`cuts into "${before.map(w => w.text).join(' ')}"`);
        }
        const k0 = inside[0].k;
        if (!startsPhrase[k0]) {
          s -= 1;
          why.push('starts mid-sentence');
        }
        const kz = inside[inside.length - 1].k;
        if (!endsPhrase[kz]) {
          s -= 1;
          why.push('ends mid-sentence');
        }
        const dead = inside[0].w.start - from;
        if (dead > 2.2) s -= 0.4 * (dead - 2.2);
        // a clean end: no word running over the end, a bonus when an instrumental hit follows
        const over = words.filter(w => w.start < to && w.end > to + 0.25);
        if (over.length) {
          s -= 0.8;
          why.push(`ends inside "${over.map(w => w.text).join(' ')}"`);
        }
        const nextHit = b < driveZ.length ? driveZ[b] - mean(driveZ.slice(Math.max(a, b - 2), b)) : 0;
        const nextSung = words.some(w => w.start >= to && w.start < bars[Math.min(bars.length - 1, b + 1)]);
        if (tail > 0 && !nextSung) {
          const tailHit = mean(driveZ.slice(b - tail, b));
          if (tailHit > 0.5) {
            s += 0.5;
            why.push('ends on an instrumental hit (dive into the footage there)');
          } else s -= 0.15 * tail;
        }
        if (tail === 0 && nextHit > 0.8) s += 0.2;
        // the end on a 4-bar unit of its section (the user, on s01: "it stops mid rhythm")
        const sec = m.sections.find(x => x.from <= bars[b - 1] + 1e-3 && bars[b - 1] < x.to);
        if (sec && (b - barAt(sec.from)) % 4 !== 0) s -= 0.6;
        const secs = sectionsIn(from, to);
        if (secs.some(x => /chorus|hook/.test(x))) s += 0.4;
        // 20–40 s is the sweet spot
        s -= 0.03 * Math.max(0, Math.abs(dur - 30) - 10);
        if (history.shorts.some(h => h.status === 'bad' && overlap(from, to, h.from, h.to) > 0.3)) continue;
        const made = history.shorts.find(h => h.status !== 'bad' && overlap(from, to, h.from, h.to) > 0.5);
        if (made) {
          s -= 0.8;
          why.push(`re-cut of ${made.id}`);
        }
        cands.push({ a, b, from, to, s, why, first: inside.slice(0, 5).map(x => x.w.text).join(' '), last: inside.slice(-4).map(x => x.w.text).join(' ') });
      }
    }
  cands.sort((x, y) => y.s - x.s);
  const chosen: Cand[] = [];
  for (const c of cands) {
    if (chosen.length >= n + 3) break;
    if (chosen.some(o => overlap(c.from, c.to, o.from, o.to) > (chosen.length < n ? 0.35 : 0.6))) continue;
    chosen.push(c);
  }
  const prev = path.join(shortsDir, 'lyric-picks.json');
  const run = (fs.existsSync(prev) ? JSON.parse(fs.readFileSync(prev, 'utf8')).run : 0) + 1;
  const picks = chosen.map((c, k) => ({
    letter: 'ABCDEFGH'[k],
    from: +c.from.toFixed(3),
    to: +c.to.toFixed(3),
    fromBeat: Math.round(beatAt(m, c.from)),
    toBeat: Math.round(beatAt(m, c.to)),
    sections: sectionsIn(c.from, c.to),
    score: +c.s.toFixed(2),
    why: c.why,
    first: c.first,
    last: c.last,
  }));
  fs.mkdirSync(shortsDir, { recursive: true });
  fs.writeFileSync(prev, `${JSON.stringify({ run, date: today(), n, picks }, null, 1)}\n`);
  const out = path.join(ROOT, 'out', slug, 'shorts', `lyric-picks-${run}`);
  fs.mkdirSync(out, { recursive: true });
  const audio = path.join(ROOT, 'projects', m.audio.src);
  for (const p of picks) {
    const d = p.to - p.from;
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', `${p.from}`, '-t', `${d}`, '-i', audio, '-af', `afade=t=out:st=${(d - 0.4).toFixed(2)}:d=0.4`, '-b:a', '192k', path.join(out, `${p.letter}.mp3`)]);
  }
  const W = 1800;
  const H = 300;
  const x = (t: number) => Math.round((t / m.audio.duration) * W);
  const COLORS = ['0xFF3B8B', '0x34C759', '0x0A84FF', '0xFFD60A', '0xBF5AF2', '0xFF9F0A'];
  const marks = [
    ...m.sections.map(s => `drawbox=x=${x(s.from)}:y=0:w=2:h=${H}:color=white@0.35:t=fill,drawtext=text='${s.label.replace(/'/g, '')}':x=${x(s.from) + 4}:y=${H - 18}:fontsize=13:fontcolor=white@0.8`),
    ...picks.map((p, k) => {
      const main = k < n;
      const y = main ? k * 40 : n * 40 + (k - n) * 26;
      return `drawbox=x=${x(p.from)}:y=${y}:w=${x(p.to) - x(p.from)}:h=${main ? 36 : 22}:color=${main ? COLORS[k % COLORS.length] : '0x888888'}@${main ? 0.85 : 0.6}:t=fill,drawtext=text='${p.letter}  ${p.from.toFixed(1)}–${p.to.toFixed(1)} s':x=${x(p.from) + 6}:y=${y + (main ? 9 : 4)}:fontsize=${main ? 18 : 13}:fontcolor=white`;
    }),
  ].join(',');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', audio, '-filter_complex', `[0:a]aformat=channel_layouts=mono,showwavespic=s=${W}x${H}:colors=0x4a4f55:scale=sqrt[w];color=c=0x111111:s=${W}x${H}[bg];[bg][w]overlay=format=auto,${marks}`, '-frames:v', '1', '-update', '1', path.join(out, 'picks.png')]);
  console.log(`${m.title} · lyric picks run ${run} · ${cands.length} stretches scored\n`);
  picks.forEach((p, k) => {
    if (k === n) console.log('\nalternates:');
    console.log(`${p.letter}  ${mmss(p.from)}–${mmss(p.to)}  ${(p.to - p.from).toFixed(1).padStart(5)} s  beats ${p.fromBeat}–${p.toBeat}  score ${p.score.toFixed(2)}  ${p.sections.join(' · ')}`);
    console.log(`   "${p.first} …" → "… ${p.last}"${p.why.length ? `  (${p.why.join('; ')})` : ''}`);
  });
  console.log(`\n✔ shorts/lyric-picks.json · out/${slug}/shorts/lyric-picks-${run}/ (A.mp3 …, picks.png)`);
  process.exit(0);
}

// ------------------------------------------------------------------ new

if (cmd === 'new') {
  if (!what) throw new Error('new which stretch? a letter from shorts/lyric-picks.json, or from-to in seconds');
  const formats = (opt('formats') ?? '9x16').split(',');
  const picksFile = path.join(shortsDir, 'lyric-picks.json');
  const picks = fs.existsSync(picksFile) ? JSON.parse(fs.readFileSync(picksFile, 'utf8')) : { run: 0, picks: [] };
  let from: number;
  let to: number;
  const p = picks.picks.find((x: { letter: string }) => x.letter === what.toUpperCase());
  if (p) [from, to] = [p.from, p.to];
  else if (/^[\d.]+-[\d.]+$/.test(what)) [from, to] = what.split('-').map(Number).map(t => bars[barAt(t)]);
  else throw new Error(`no pick "${what}" (run pick first) and not a from-to`);
  from = bars[Math.max(0, barAt(from) - Number(opt('lead') ?? 0))];
  const history = readHistory();
  const used = new Set(history.shorts.map(h => h.id));
  let k = 1;
  const idOf = (i: number) => `s${String(i).padStart(2, '0')}`;
  while (used.has(idOf(k)) || fs.existsSync(path.join(shortsDir, idOf(k)))) k++;
  const id = opt('id') ?? idOf(k);
  const sd = path.join(shortsDir, id);
  fs.mkdirSync(sd, { recursive: true });
  // --loop: made to loop (no fade in, a click-free 20 ms out, the engine keeps the seam clean)
  const loop = args.includes('--loop');
  fs.writeFileSync(path.join(sd, 'short.json'), `${JSON.stringify({ id, from: +from.toFixed(3), to: +to.toFixed(3), formats, fps: 30, ...(loop ? { fadeIn: 0, fadeOut: 0.02, loop: true } : {}) }, null, 1)}\n`);
  // the stretch's words with their beats, to cast rows from
  const inside = words.filter(w => w.start >= from - 0.05 && w.start < to);
  const lines: string[] = [];
  let cur: string[] = [];
  let lastEnd = -1;
  for (const w of inside) {
    if (cur.length && w.start - lastEnd > 0.6) {
      lines.push(cur.join(' '));
      cur = [];
    }
    cur.push(`${w.text}@${beatAt(m, w.start).toFixed(1)}`);
    lastEnd = w.end;
  }
  if (cur.length) lines.push(cur.join(' '));
  const header = `/**\n * ${m.title} — lyric short ${id}: ${mmss(from)}–${mmss(to)} of the song (beats ${beatAt(m, from).toFixed(0)}–${beatAt(m, to).toFixed(0)}; ${sectionsIn(from, to).join(' · ')}).\n * make-lyric-shorts. Beats are indices of manifest.beats.list.\n *\n * Sung words (word@beat):\n${lines.map(l => ` *   ${l}`).join('\n')}\n */\n`;
  fs.writeFileSync(
    path.join(sd, 'edl.ts'),
    `${header}import { cut, full, stack, type LyricShortEdl } from '../../../../src/lyricshorts/spec.ts';\n\nexport const edl: LyricShortEdl = {\n  // the footage under everything: a cut per beat range (shot, seconds into it, crop centre x)\n  cuts: [\n    // cut(${beatAt(m, from).toFixed(0)}, 'sh0002', { in: 0, x: 0.5 }),\n  ],\n  // what is on screen: a phrase a screen, filling the frame (the layout picks the rows), full-frame footage\n  screens: [\n    // stack('first words of the phrase', { exit: 'through' }),\n    // full(${beatAt(m, to).toFixed(0)}),\n  ],\n};\n`,
  );
  fs.writeFileSync(
    path.join(sd, 'index.tsx'),
    `${header}import { defineLyricShort, type LyricShortSpec } from '../../../../src/lyricshorts/define';\nimport { THEME } from '../theme';\nimport { edl } from './edl.ts';\nimport short from './short.json';\n\nexport default defineLyricShort({ slug: '${slug}', short: short as LyricShortSpec, edl, theme: THEME });\n`,
  );
  if (!fs.existsSync(path.join(shortsDir, 'theme.ts'))) console.log('  · write shorts/theme.ts (the project\'s LyricShortTheme) before opening Studio');
  history.shorts.push({ id, from, to, fromBeat: Math.round(beatAt(m, from)), toBeat: Math.round(beatAt(m, to)), sections: sectionsIn(from, to), run: picks.run, date: today(), status: 'made', formats, skill: 'make-lyric-shorts' });
  fs.writeFileSync(historyFile, `${JSON.stringify(history, null, 1)}\n`);
  console.log(`✔ shorts/${id}/  ${mmss(from)}–${mmss(to)}  ${formats.map(f => `${slug}-${id}-${f}`).join(', ')}`);
  process.exit(0);
}

// ------------------------------------------------------------------ font

if (cmd === 'font') {
  // the stack is drawn from the font's outlines, so the theme needs the font file itself: Google Fonts
  // hands a TTF to clients that don't ask for woff2
  const family = what;
  const weight = opt('weight') ?? '900';
  if (!family) throw new Error('font <Family> [--weight=900]');
  const css = execFileSync('curl', ['-s', `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@${weight}`], { encoding: 'utf8' });
  const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
  if (!url) throw new Error(`Google Fonts has no ${family} ${weight} (${css.slice(0, 200)})`);
  const rel = `shorts/fonts/${family.replace(/\s+/g, '')}-${weight}.ttf`;
  fs.mkdirSync(path.join(dir, 'shorts/fonts'), { recursive: true });
  execFileSync('curl', ['-s', '-o', path.join(dir, rel), url]);
  console.log(`✔ ${rel} — in shorts/theme.ts: type.font = '${slug}/${rel}'`);
  process.exit(0);
}

// ------------------------------------------------------------------ clips

if (cmd === 'clips') {
  const id = what;
  if (!id) throw new Error('clips <id>');
  const sd = path.join(shortsDir, id);
  const short = JSON.parse(fs.readFileSync(path.join(sd, 'short.json'), 'utf8')) as { from: number; to: number; fps?: number };
  const { edl } = (await import(pathToFileURL(path.join(sd, 'edl.ts')).href)) as { edl: LyricShortEdl };
  const fps = short.fps ?? 30;
  const { screens, cuts, whole, warnings } = resolveShort(m, short, edl);

  // footage sources and their shots
  const cfgFile = path.join(shortsDir, 'footage.json');
  type Source = { id: string; prefix: string; source: string; segregation: string };
  let sources: Source[];
  if (fs.existsSync(cfgFile)) sources = JSON.parse(fs.readFileSync(cfgFile, 'utf8')).sources;
  else {
    const vids = fs.existsSync(path.join(dir, 'input/footage')) ? fs.readdirSync(path.join(dir, 'input/footage')).filter(f => /\.(mp4|mov|mkv|webm)$/i.test(f)) : [];
    if (!vids.length) throw new Error('no footage: put a video in input/footage/ or write shorts/footage.json');
    sources = [{ id: 'main', prefix: 'sh', source: `input/footage/${vids[0]}`, segregation: 'footage' }];
  }
  type Shot = { id: string; start: number; end: number; duration: number; kind: string };
  const shots = new Map<string, { shot: Shot; src: Source; w: number; h: number }>();
  const srcFps = new Map<string, number>();
  for (const src of sources) {
    const seg = JSON.parse(fs.readFileSync(path.join(dir, src.segregation, 'segregation.json'), 'utf8')) as { shots: Shot[]; video: { width: number; height: number; fps: number } };
    srcFps.set(src.id, seg.video.fps);
    for (const s of seg.shots) shots.set(src.prefix === 'sh' ? s.id : s.id.replace(/^sh/, src.prefix), { shot: s, src, w: seg.video.width, h: seg.video.height });
  }

  // timeline, with each stack laid out as the render will (rows, vertical word, how far the letters stretch)
  const { THEME } = (await import(pathToFileURL(path.join(shortsDir, 'theme.ts')).href)) as { THEME: { type: TypeStyle } };
  const fontBuf = fs.readFileSync(path.join(ROOT, 'projects', THEME.type.font));
  const font = opentype.parse(fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength));
  const b = (t: number) => beatAt(m, t).toFixed(1).padStart(6);
  console.log(`${m.title} · ${id} · ${mmss(short.from)}–${mmss(short.to)} (${(short.to - short.from).toFixed(1)} s)\n`);
  console.log('screens');
  for (const s of screens) {
    if (s.kind === 'full') console.log(`  ${b(s.start)}–${b(s.end)}  full frame`);
    else {
      const lay = solveStack(s, font, THEME.type, 1080, 1920);
      // how the stack meets the frame: letters stretched (only if the theme allows it), then black above
      // and below (the stack is centred) or, too tall, shrunk evenly
      const [s0, s1] = THEME.type.stretch;
      const sy = Math.min(s1, Math.max(s0, lay.stretch));
      const rest = lay.stretch / sy;
      const fit = `${sy !== 1 ? `letters ×${sy.toFixed(2)} tall, ` : ''}${rest >= 1 ? `fills ${Math.round(100 / rest)} % of the height` : `shrunk to ${Math.round(100 * rest)} %`}`;
      const off = rest > 1.45 || rest < 0.8;
      // a row stays black until its word is sung: a screen whose words take long to arrive reads as a
      // black screen (the user on v7's 6–10-word screens: "seeing black screen for a lot of time")
      const wait = Math.max(...s.words.map(w => w.show)) - s.start;
      const slow = wait > 2.2;
      console.log(`  ${b(s.start)}–${b(s.end)}  ${lay.label}   (${fit}; all words in by +${wait.toFixed(1)} s)${s.enter === 'into' ? '  ← into' : ''}${s.exit === 'through' ? `  → dives into "${s.words[s.throughWord].text}" from ${b(s.diveFrom).trim()}` : s.exit === 'fade' ? '  → fades' : ''}${off || slow ? '  ⚠' : ''}`);
      if (off) warnings.push(`screen ${s.index} (${lay.label}) ${rest > 1 ? 'leaves very wide black bands above and below' : 'is too tall and shrinks a lot'}: regroup its words`);
      if (slow) warnings.push(`screen ${s.index} (${lay.label}) waits ${wait.toFixed(1)} s for its last word: its lower rows sit black that long — split it`);
      console.log(`      ${s.words.map(w => `${w.text}@${beatAt(m, w.start).toFixed(1)}`).join(' ')}`);
    }
  }
  console.log('\ncuts');
  const outDir = path.join(dir, 'derived', 'lyricshorts');
  fs.mkdirSync(outDir, { recursive: true });
  const jobs: { file: string; argv: string[] }[] = [];
  const usage = new Map<string, [number, number, number][]>();
  for (const [i, c] of cuts.entries()) {
    const found = shots.get(c.shot);
    if (!found) throw new Error(`cut ${i + 1}: no shot ${c.shot} in ${sources.map(s => s.segregation).join(', ')}`);
    const { shot, src, w, h } = found;
    // the shot this cut shows, speed ramps included (clipTime); the clip holds that plus the tail
    const needs = clipTime(c, c.end - c.start);
    if (shot.kind !== 'picture') warnings.push(`cut ${i + 1} (${c.shot}) is a ${shot.kind} shot`);
    if (c.in + needs > shot.duration + 0.02) warnings.push(`cut ${i + 1} (${c.shot}) runs ${(c.in + needs - shot.duration).toFixed(2)} s past the shot's end: a shorter cut, an earlier 'in' or a faster rate`);
    const range: [number, number, number] = [c.in, c.in + needs, i + 1];
    for (const [a, z, j] of usage.get(c.shot) ?? []) if (Math.min(z, range[1]) - Math.max(a, range[0]) > 0.1) warnings.push(`cut ${i + 1} shows the same frames of ${c.shot} as cut ${j}`);
    usage.set(c.shot, [...(usage.get(c.shot) ?? []), range]);
    const ch = Math.round(h / c.zoom / 2) * 2;
    const cw = Math.round((ch * 9) / 16 / 2) * 2;
    const cx = Math.round(Math.min(w - cw, Math.max(0, c.x * w - cw / 2)));
    const cy = Math.round(Math.min(h - ch, Math.max(0, c.y * h - ch / 2)));
    const file = path.join(outDir, c.file);
    // at the source's own speed and frame rate (up to 60): speed ramps and slow motion pick frames in the render
    const vf = [`crop=${cw}:${ch}:${cx}:${cy}`, 'scale=1080:1920:flags=lanczos', `fps=${Math.min(60, srcFps.get(src.id) ?? 30)}`, c.mono ? 'hue=s=0' : '', 'format=yuv420p'].filter(Boolean).join(',');
    if (!fs.existsSync(file)) jobs.push({ file, argv: ['-v', 'error', '-y', '-ss', (shot.start + c.in).toFixed(3), '-i', path.join(dir, src.source), '-t', c.span.toFixed(3), '-vf', vf, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', `${file}.part.mp4`] });
    const trs = [c.tr.kind !== 'cut' ? c.tr.kind + (c.tr.dir ? ` ${c.tr.dir}` : '') : '', c.flash ? 'flash' : '', c.shake ? `shake ${c.shake}` : ''].filter(Boolean).join(' + ') + (whole.includes(i) ? '  (whole frame: the screen changes here)' : '');
    console.log(`  ${String(i + 1).padStart(2)}  ${b(c.start)}–${b(c.end)}  ${(c.end - c.start).toFixed(2)} s  ${c.shot} +${c.in.toFixed(2)}  x ${c.x}${c.zoom !== 1 ? ` zoom ${c.zoom}` : ''}${c.rate !== 1 ? ` ×${c.rate}` : ''}${c.mono ? ' mono' : ''}${trs ? `  ← ${trs}` : ''}${fs.existsSync(file) ? '' : '  (cutting)'}`);
  }
  // decoding 4K AV1 is heavy: a few at a time
  const parallel = Math.max(1, Math.min(4, Math.floor(os.cpus().length / 3)));
  let next = 0;
  const run = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      await new Promise<void>((res, rej) => {
        const p = spawn('ffmpeg', job.argv, { stdio: ['ignore', 'ignore', 'inherit'] });
        p.on('exit', code => (code === 0 ? res() : rej(new Error(`ffmpeg failed on ${path.basename(job.file)}`))));
      });
      fs.renameSync(`${job.file}.part.mp4`, job.file);
    }
  };
  if (jobs.length) {
    const t0 = Date.now();
    await Promise.all(Array.from({ length: parallel }, run));
    console.log(`\n  cut ${jobs.length} clips in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }

  // the Revisions map: one shot per cut, named by the words on screen over it
  const onScreen = (a: number, z: number) =>
    screens
      .filter(s => s.kind === 'stack' && s.end > a && s.start < z)
      .flatMap(s => (s.kind === 'stack' ? s.words.filter(w => w.show < z && w.show >= Math.min(a, s.start)).map(w => w.text) : []))
      .join(' ');
  const shotList = cuts.map((c, i) => ({ id: `${id}.${i + 1}`, from: +c.start.toFixed(3), to: +c.end.toFixed(3), label: c.shot, lyric: onScreen(c.start, c.end) || undefined }));
  fs.writeFileSync(path.join(sd, 'shots.json'), `${JSON.stringify(shotList, null, 1)}\n`);

  // cuts.jpg: every cut's middle frame as framed, numbered
  const sheetDir = path.join(ROOT, 'out', slug, 'shorts', id);
  fs.mkdirSync(sheetDir, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lyricshorts-'));
  cuts.forEach((c, i) => {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', ((c.end - c.start) / 2).toFixed(3), '-i', path.join(outDir, c.file), '-frames:v', '1', '-vf', `scale=216:384,drawtext=text='${i + 1} ${c.shot}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6`, path.join(tmp, `${String(i).padStart(3, '0')}.png`)]);
  });
  const cols = Math.min(8, cuts.length);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', path.join(tmp, '*.png'), '-vf', `tile=${cols}x${Math.ceil(cuts.length / cols)}:padding=4:color=0x111111`, '-frames:v', '1', '-update', '1', path.join(sheetDir, 'cuts.jpg')]);
  fs.rmSync(tmp, { recursive: true, force: true });

  if (warnings.length) {
    console.log('\nwarnings');
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
  console.log(`\n✔ derived/lyricshorts/ (${cuts.length} clips) · shorts/${id}/shots.json · out/${slug}/shorts/${id}/cuts.jpg`);
  process.exit(0);
}

console.error(`unknown command ${cmd}`);
process.exit(1);
