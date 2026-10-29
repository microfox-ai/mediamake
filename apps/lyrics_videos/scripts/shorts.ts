/**
 * shorts: pick the coolest stretches of a remix project's song for vertical shorts, scaffold them and
 * remember them (make-video-music-remix-shorts skill).
 *
 *   pick   scores every bar-aligned stretch of 30 s–2 min, starting and ending on section edges, every
 *          4 bars into a section and where the drums come in or drop away (energy of drums + bass against the song,
 *          the hit of its opening bars, its peak, lyric lines that repeat (hooks), section labels,
 *          clean starts and ends) and picks the best few that don't overlap, unlike each other.
 *          Stretches the user called bad are never picked again; ones already made can come back as
 *          a re-cut, ranked lower. Writes shorts/picks.json and, in out/<slug>/shorts/picks-<run>/,
 *          an mp3 of each pick and picks.png (the song's waveform, its sections, the picks marked).
 *   make   scaffolds the picks the user approved as shorts/<id>/ (short.json, edl.ts, index.tsx) in
 *          the formats the user chose, and logs them in shorts/history.json. --mode=rotate makes a
 *          "rotate your phone" short instead (no edl.ts), planned back from its hit: the range's start is
 *          the hit (a drop, the drums coming in). The centre countdown (default): the short starts 15 beats
 *          before it on a black frame over the edit's sound alone, ROTATE YOUR PHONE / IN 5 SECS whose 5
 *          becomes the counter, 4, 3 (the start lights appear, a clunk each), 2 (the count floats up),
 *          1 (the video fades in, in a band), every 2 beats (the 5 gets 3, to read the words); lights out
 *          4 beats before the hit and the band turns slowly into the finished 16:9 render, landing on the
 *          hit (linked into derived/final-16x9.mp4 from out/<slug>/<slug>.mp4). --hook=band: the previous
 *          style (the edit in the band from the start, 3 · 2 · 1 above it). The range may run past the
 *          song's end into the render's end screen.
 *   mark   records the user's verdict on a stretch — a short (s02), a pick it was shown (B) or any
 *          range (95.2-151.0): bad (never picked again) or liked.
 *   list   the history.
 *
 * Usage:
 *   npm run shorts -w lyrics_videos -- <slug> pick [--n=3] [--min=30] [--max=120] [--alts=3] [--extra=104.7-150.6,…]
 *          (--extra: stretches you name, on the nearest beats, scored and listed after the alternates)
 *   npm run shorts -w lyrics_videos -- <slug> make A,B,C --formats=9x16,3x4 [--mode=rotate]
 *   npm run shorts -w lyrics_videos -- <slug> make 95.2-151.0 --formats=9x16   (any stretch, seconds; on the nearest beats)
 *   npm run shorts -w lyrics_videos -- <slug> mark s02 bad --note="the verse drags"   (or mark B bad / mark 95.2-151.0 bad)
 *   npm run shorts -w lyrics_videos -- <slug> list
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const [slug, cmd, what] = args.filter(a => !a.startsWith('--'));
const opt = (n: string) => args.find(a => a.startsWith(`--${n}=`))?.slice(n.length + 3);
if (!slug || !cmd) {
  console.error('usage: npm run shorts -w lyrics_videos -- <slug> pick | make <A,B,C> --formats=9x16,3x4 | mark <id> bad|liked | list');
  process.exit(1);
}

const dir = path.join(ROOT, 'projects', slug);
const shortsDir = path.join(dir, 'shorts');
const manifestFile = path.join(dir, 'manifest.json');
if (!fs.existsSync(manifestFile)) throw new Error(`No manifest. Run: npm run prepare-project -w lyrics_videos -- ${slug}`);
const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as {
  title: string;
  audio: { src: string; duration: number };
  sections: { label: string; from: number; to: number }[];
  beats: { list: { t: number }[]; downbeats?: number[]; beatsPerBar?: number };
  energy: { rate: number; values: number[] };
  envelopes?: { fps: number; series: Record<string, number[]> };
  lyrics: { text: string; start: number; end: number }[];
};

type Status = 'made' | 'bad' | 'liked';
type HistoryEntry = { id: string; from: number; to: number; fromBeat: number; toBeat: number; sections: string[]; run: number; date: string; status: Status; note?: string; formats?: string[]; mode?: string };
type History = { shorts: HistoryEntry[] };
type Pick = { letter: string; from: number; to: number; fromBeat: number; toBeat: number; sections: string[]; score: number; why: string[]; recut?: string };
const historyFile = path.join(shortsDir, 'history.json');
/** the finished render's length (a rotate short may run into its end screen, past the song) */
const finalSeconds = () => {
  const f = path.join(ROOT, 'out', slug, `${slug}.mp4`);
  return fs.existsSync(f) ? Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim()) : m.audio.duration;
};
const picksFile = path.join(shortsDir, 'picks.json');
const readHistory = (): History => (fs.existsSync(historyFile) ? JSON.parse(fs.readFileSync(historyFile, 'utf8')) : { shorts: [] });
const writeHistory = (h: History) => {
  fs.mkdirSync(shortsDir, { recursive: true });
  fs.writeFileSync(historyFile, `${JSON.stringify(h, null, 1)}\n`);
};
const today = () => new Date().toLocaleDateString('sv'); // YYYY-MM-DD, local
const mmss = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)) / Math.min(a1 - a0, b1 - b0);

// ------------------------------------------------------------------ the song in bars

const beats = m.beats.list.map(b => b.t);
const perBar = m.beats.beatsPerBar ?? 4;
const downbeats = m.beats.downbeats?.length ? m.beats.downbeats : beats.filter((_, k) => k % perBar === 0);
// bar k runs downbeats[k] → downbeats[k + 1]; the song's end closes the last one
const edges = [...downbeats, m.audio.duration].filter((t, k, a) => k === 0 || t > a[k - 1] + 0.2);
const bars = edges.slice(0, -1).map((t, k) => ({ from: t, to: edges[k + 1] }));
/** song time of a fractional beat index */
const beatT = (b: number) => {
  const i = Math.max(0, Math.min(beats.length - 2, Math.floor(b)));
  return beats[i] + (b - i) * (beats[i + 1] - beats[i]);
};
const beatIndex = (t: number) => beats.reduce((best, b, k) => (Math.abs(b - t) < Math.abs(beats[best] - t) ? k : best), 0);
const barAt = (t: number) => bars.reduce((best, b, k) => (Math.abs(b.from - t) < Math.abs(bars[best].from - t) ? k : best), 0);
const sectionsIn = (a: number, b: number) => m.sections.filter(s => s.to > a + 0.5 && s.from < b - 0.5).map(s => s.label);

const env = (name: string): ((a: number, b: number) => number) => {
  const series = m.envelopes?.series[name];
  const fps = series ? m.envelopes!.fps : m.energy.rate;
  const v = series ?? m.energy.values;
  return (a, b) => {
    const i0 = Math.max(0, Math.floor(a * fps));
    const i1 = Math.min(v.length, Math.max(i0 + 1, Math.ceil(b * fps)));
    let s = 0;
    for (let i = i0; i < i1; i++) s += v[i];
    return s / Math.max(1, i1 - i0);
  };
};
const zs = (xs: number[]) => {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length) || 1;
  return xs.map(x => (x - mean) / sd);
};
const drums = env('drums');
const bass = env('bass');
const rms = env('rms');
const vocal = env('vocal');
const hasStems = !!m.envelopes?.series.drums;
// a bar's drive: the drums and bass (the loudness when there are no stems)
const drive = zs(bars.map(b => (hasStems ? drums(b.from, b.to) + bass(b.from, b.to) : rms(b.from, b.to))));
const sung = zs(bars.map(b => vocal(b.from, b.to)));

// hooks: lyric lines that come back elsewhere in the song, as a share of each bar's time
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();
const counts = new Map<string, number>();
for (const l of m.lyrics) counts.set(norm(l.text), (counts.get(norm(l.text)) ?? 0) + 1);
const hook = bars.map(b => {
  const len = m.lyrics.filter(l => (counts.get(norm(l.text)) ?? 0) > 1).reduce((a, l) => a + Math.max(0, Math.min(b.to, l.end) - Math.max(b.from, l.start)), 0);
  return Math.min(1, len / (b.to - b.from));
});
// what a section's name says about it (labels are the project's own; a soft hint)
const labelOf = (t: number) => m.sections.find(s => t >= s.from - 1e-3 && t < s.to)?.label ?? '';
const kindOf = (label: string) =>
  /drop|chorus|hook/.test(label) ? 'hook' : /chant|build|pre/.test(label) ? 'build' : /bridge|break/.test(label) ? 'bridge' : /verse|rap/.test(label) ? 'verse' : /intro|outro/.test(label) ? 'edge' : 'other';
const KIND_BONUS: Record<string, number> = { hook: 1, build: 0.5, verse: 0.2, bridge: 0, other: 0, edge: -0.6 };
const kinds = bars.map(b => kindOf(labelOf((b.from + b.to) / 2)));
const sectionStarts = new Set(m.sections.map(s => barAt(s.from)));
const sectionEnds = new Set(m.sections.map(s => barAt(s.to)));
sectionEnds.add(bars.length);

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

/** a lyric line running across `t` (more than 0.3 s either side) */
const lineAcross = (t: number) => m.lyrics.find(l => l.start < t - 0.3 && l.end > t + 0.3);
/** where a stretch meant to end on the bar edge `t` ends, so it doesn't cut a lyric line: just before a
 *  line that has barely started there, or after one that is mostly sung (if it ends within 2.5 s) */
const phraseEnd = (t: number): { to: number; note?: string; cut?: string } => {
  if (t >= m.audio.duration - 0.05) return { to: m.audio.duration };
  const l = lineAcross(t);
  if (!l) return { to: t };
  if (t - l.start < 1.5) return { to: l.start + 0.05, note: `ends before "${l.text.replace(/[.,!?]+$/, '')}"` };
  if (l.end - t < 2.5) return { to: Math.min(m.audio.duration, l.end + 0.15), note: `ends after "${l.text.replace(/[.,!?]+$/, '')}"` };
  return { to: t, cut: l.text };
};

/** a stretch of bars [a, b): its score and what earned it. A stretch named by hand may start and end
 *  on any beat (`fromT`, `toT`); its bars are the ones it touches */
const score = (a: number, b: number, fromT?: number, toT?: number) => {
  const from = fromT ?? bars[a].from;
  const end = phraseEnd(toT ?? (b < bars.length ? bars[b].from : m.audio.duration));
  const to = end.to;
  const dur = to - from;
  const d = drive.slice(a, b);
  const why: string[] = [];
  let s = 0;
  const energy = mean(d);
  s += 1.0 * energy;
  // the opening has to hit: the first two bars (or the two after a one-bar pickup into a section)
  const pickup = sectionStarts.has(a + 1) && !sectionStarts.has(a);
  const open = Math.max(mean(drive.slice(a, a + 2)), pickup ? mean(drive.slice(a + 1, a + 3)) - 0.15 : -9);
  s += 0.8 * open;
  if (open > 0.6) why.push(pickup ? `a one-bar launch into ${labelOf(bars[a + 1].from)}` : `opens on the ${labelOf(from)} hit`);
  let peak = -9;
  for (let k = a; k < b - 1; k++) peak = Math.max(peak, (drive[k] + drive[k + 1]) / 2);
  s += 0.6 * peak;
  const hooks = mean(hook.slice(a, b));
  s += 0.9 * hooks;
  if (hooks > 0.35) why.push(`${Math.round(hooks * 100)} % repeated hook lines`);
  s += 0.4 * mean(kinds.slice(a, b).map(k => KIND_BONUS[k]));
  s += 0.2 * mean(sung.slice(a, b));
  // dynamics: a build into a drop beats a flat stretch
  const lift = Math.max(...d) - Math.min(...d.slice(0, Math.max(1, Math.floor(d.length / 2))));
  s += 0.15 * Math.min(2, lift);
  if (sectionStarts.has(a) || pickup) s += 0.3;
  if (sectionEnds.has(b)) s += 0.3;
  else s -= 0.2;
  if (b < bars.length && drive[b] < drive[b - 1] - 0.8) {
    s += 0.15;
    why.push('ends as the music drops away');
  }
  // a short starts and ends between lyric lines, never on the tail of a word ("…down", "…cer")
  const cutIn = lineAcross(from);
  if (cutIn) {
    s -= 0.6;
    why.push(`starts inside "${cutIn.text}"`);
  } else {
    const first = m.lyrics.find(l => l.start >= from - 0.3 && l.start < from + 2.5);
    if (first) why.push(`first line "${first.text.replace(/[.,!?]+$/, '')}"`);
  }
  if (end.cut) {
    s -= 0.3;
    why.push(`ends inside "${end.cut}"`);
  } else if (end.note) why.push(end.note);
  // a short holds its energy: a quiet passage in the middle (a bridge, a breakdown) loses viewers
  const inner = d.slice(2, Math.max(2, d.length - 2));
  const sag = inner.length ? mean(inner.map(x => (x < -0.8 ? 1 : 0))) : 0;
  if (sag > 0.12) {
    s -= 2 * sag;
    why.push(`${Math.round(sag * 100)} % quiet in the middle`);
  }
  // 30 s–2 min, best around 45–75 s
  s -= 0.25 * Math.max(0, Math.abs(dur - 60) - 15) / 45;
  const peakAt = d.indexOf(Math.max(...d)) + a;
  if (peak > 1) why.push(`peaks in ${labelOf(bars[peakAt].from)}`);
  if (energy > 0.5) why.push('high drive throughout');
  return { from, to, dur, s, why };
};

// ------------------------------------------------------------------ commands

const history = readHistory();

if (cmd === 'pick') {
  const n = Number(opt('n') ?? 3);
  const alts = Number(opt('alts') ?? 3);
  const min = Number(opt('min') ?? 30);
  const max = Number(opt('max') ?? 120);
  // starts: section starts, a bar before them (a launch), every 4 bars into a section; ends likewise
  const starts = new Set<number>();
  const ends = new Set<number>([bars.length]);
  for (const sec of m.sections) {
    const a = barAt(sec.from);
    const z = barAt(sec.to);
    starts.add(a);
    if (a > 0) starts.add(a - 1);
    for (let k = a + 4; k < z; k += 4) {
      starts.add(k);
      ends.add(k);
    }
    ends.add(z);
  }
  // and wherever the drums come in (a start that hits) or drop away (an end), section edge or not
  for (let k = 1; k < bars.length; k++) {
    if (drive[k] - drive[k - 1] > 1.2) starts.add(k);
    if (drive[k - 1] - drive[k] > 1.2) ends.add(k);
  }
  const cands: (ReturnType<typeof score> & { a: number; b: number; recut?: string })[] = [];
  for (const a of starts)
    for (const b of ends) {
      if (b <= a) continue;
      const c = score(a, b);
      if (c.dur < min - 0.5 || c.dur > max + 0.5) continue;
      // the user's verdicts: a stretch called bad never comes back; one already made may, as a re-cut
      if (history.shorts.some(h => h.status === 'bad' && overlap(c.from, c.to, h.from, h.to) > 0.3)) continue;
      const made = history.shorts.filter(h => h.status !== 'bad').map(h => ({ h, ov: overlap(c.from, c.to, h.from, h.to) })).sort((x, y) => y.ov - x.ov)[0];
      if (made && made.ov > 0.25) {
        c.s -= 0.8 * made.ov;
        cands.push({ ...c, a, b, recut: made.h.id });
      } else cands.push({ ...c, a, b });
    }
  cands.sort((x, y) => y.s - x.s);
  // the best that are different parts of the song: overlapping a quarter of the shorter at most (up to
  // 40 % when a short song has no room for three)
  const chosen: typeof cands = [];
  for (const limit of [0.25, 0.4]) {
    for (const c of cands) {
      if (chosen.length >= n) break;
      if (!chosen.includes(c) && chosen.every(o => overlap(c.from, c.to, o.from, o.to) <= limit)) chosen.push(c);
    }
  }
  // alternates: the next best that differ from the picks and from each other
  const rest: typeof cands = [];
  for (const c of cands) {
    if (rest.length >= alts) break;
    if (!chosen.includes(c) && [...chosen, ...rest].every(o => overlap(c.from, c.to, o.from, o.to) < 0.6)) rest.push(c);
  }
  // stretches named by hand (a judgement the scores can't make), shown with the rest
  const extras = (opt('extra') ?? '').split(',').filter(Boolean).map(r => {
    const [x, y] = r.split('-').map(Number);
    // on the nearest beat (a spoken bridge starts between bars); the bars it touches score it
    const fromT = beats[beatIndex(x)];
    const toT = y >= m.audio.duration - 0.5 ? m.audio.duration : beats[beatIndex(y)];
    const a = Math.max(0, bars.findIndex(bar => bar.to > fromT + 0.05));
    const b = Math.max(a + 1, toT >= m.audio.duration ? bars.length : bars.findIndex(bar => bar.from >= toT - 0.05));
    const c = score(a, b, fromT, toT);
    const made = history.shorts.filter(h => h.status !== 'bad').map(h => ({ h, ov: overlap(c.from, c.to, h.from, h.to) })).sort((p, q) => q.ov - p.ov)[0];
    return { ...c, a, b, recut: made && made.ov > 0.25 ? made.h.id : undefined, why: ['named', ...c.why] };
  });
  rest.push(...extras);
  const run = (fs.existsSync(picksFile) ? JSON.parse(fs.readFileSync(picksFile, 'utf8')).run : 0) + 1;
  const letters = 'ABCDEFGHIJKLMNOP';
  const picks: Pick[] = [...chosen, ...rest].map((c, k) => ({
    letter: letters[k],
    from: +c.from.toFixed(3),
    to: +c.to.toFixed(3),
    fromBeat: beatIndex(c.from),
    toBeat: beatIndex(c.to),
    sections: sectionsIn(c.from, c.to),
    score: +c.s.toFixed(2),
    why: c.why,
    recut: c.recut,
  }));
  fs.mkdirSync(shortsDir, { recursive: true });
  fs.writeFileSync(picksFile, `${JSON.stringify({ run, date: today(), n: chosen.length, picks }, null, 1)}\n`);

  // listen and look: an mp3 per pick, the song's waveform with its sections and the picks marked
  const out = path.join(ROOT, 'out', slug, 'shorts', `picks-${run}`);
  fs.mkdirSync(out, { recursive: true });
  const audio = path.join(ROOT, 'projects', m.audio.src);
  for (const p of picks) {
    const dur = p.to - p.from;
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', `${p.from}`, '-t', `${dur}`, '-i', audio, '-af', `afade=t=out:st=${(dur - 0.4).toFixed(2)}:d=0.4`, '-b:a', '192k', path.join(out, `${p.letter}.mp3`)]);
  }
  const W = 1800;
  const H = 300;
  const x = (t: number) => Math.round((t / m.audio.duration) * W);
  const COLORS = ['0xFF3B30', '0x34C759', '0x0A84FF', '0xFFD60A', '0xBF5AF2', '0xFF9F0A'];
  const marks = [
    ...m.sections.map(s => `drawbox=x=${x(s.from)}:y=0:w=2:h=${H}:color=white@0.35:t=fill,drawtext=text='${s.label.replace(/'/g, '')}':x=${x(s.from) + 4}:y=${H - 18}:fontsize=13:fontcolor=white@0.8`),
    ...picks.map((p, k) => {
      const c = k < chosen.length ? COLORS[k % COLORS.length] : '0x888888';
      // a row each (picks in colour, then alternates in grey), so overlapping ones stay readable
      const y = k < chosen.length ? k * 40 : chosen.length * 40 + (k - chosen.length) * 26;
      return `drawbox=x=${x(p.from)}:y=${y}:w=${x(p.to) - x(p.from)}:h=${k < chosen.length ? 36 : 22}:color=${c}@${k < chosen.length ? 0.85 : 0.6}:t=fill,drawtext=text='${p.letter}  ${p.from.toFixed(1)}–${p.to.toFixed(1)} s':x=${x(p.from) + 6}:y=${y + (k < chosen.length ? 9 : 4)}:fontsize=${k < chosen.length ? 18 : 13}:fontcolor=white`;
    }),
  ].join(',');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', audio, '-filter_complex', `[0:a]aformat=channel_layouts=mono,showwavespic=s=${W}x${H}:colors=0x4a4f55:scale=sqrt[w];color=c=0x111111:s=${W}x${H}[bg];[bg][w]overlay=format=auto,${marks}`, '-frames:v', '1', '-update', '1', path.join(out, 'picks.png')]);

  console.log(`${m.title} · run ${run} · ${bars.length} bars · ${cands.length} stretches scored\n`);
  for (const [k, p] of picks.entries()) {
    if (k === chosen.length) console.log('\nalternates:');
    console.log(`${p.letter}  ${mmss(p.from)}–${mmss(p.to)}  ${(p.to - p.from).toFixed(1).padStart(5)} s  beats ${p.fromBeat}–${p.toBeat}  score ${p.score.toFixed(2)}  ${p.sections.join(' · ')}${p.recut ? `  (re-cut of ${p.recut})` : ''}`);
    if (p.why.length) console.log(`   ${p.why.join('; ')}`);
  }
  console.log(`\n✔ shorts/picks.json · out/${slug}/shorts/picks-${run}/ (A.mp3 …, picks.png)`);
} else if (cmd === 'make') {
  const formats = (opt('formats') ?? '').split(',').filter(Boolean);
  if (!formats.length || formats.some(f => !['9x16', '3x4', '4x5'].includes(f))) {
    console.error('pass --formats=9x16,3x4 (or 4x5): the formats the user chose');
    process.exit(1);
  }
  if (!what) throw new Error('make which picks? e.g. make A,B,C (letters from shorts/picks.json) or make 95.2-151.0');
  const picks = fs.existsSync(picksFile) ? (JSON.parse(fs.readFileSync(picksFile, 'utf8')) as { run: number; picks: Pick[] }) : { run: 0, picks: [] };
  const parent = fs.existsSync(path.join(dir, 'video/index.tsx'));
  const parentEdl = fs.existsSync(path.join(dir, 'video/edl.ts'));
  const mode = opt('mode') === 'rotate' ? 'rotate' : 'recast';
  if (mode === 'rotate') {
    // the finished 16:9 edit, served from the project folder (a hard link: no second copy on disk)
    const src = path.join(ROOT, 'out', slug, `${slug}.mp4`);
    const dst = path.join(dir, 'derived', 'final-16x9.mp4');
    if (!fs.existsSync(src)) throw new Error(`no finished render at out/${slug}/${slug}.mp4: render the long edit first`);
    const same = fs.existsSync(dst) && fs.statSync(dst).ino === fs.statSync(src).ino;
    if (!same) {
      fs.rmSync(dst, { force: true });
      try {
        fs.linkSync(src, dst);
      } catch {
        fs.copyFileSync(src, dst);
      }
      console.log(`✔ derived/final-16x9.mp4 ← out/${slug}/${slug}.mp4`);
    }
  }
  for (const token of what.split(',')) {
    let p = picks.picks.find(x => x.letter === token.toUpperCase());
    if (!p && /^[\d.]+-[\d.]+$/.test(token)) {
      // a stretch the user named, on the nearest beats, its end on a phrase end
      const [a, b] = token.split('-').map(Number);
      const from = beats[beatIndex(a)];
      const to = mode === 'rotate' && b > m.audio.duration ? Math.min(b, finalSeconds()) : phraseEnd(b >= m.audio.duration - 0.5 ? m.audio.duration : beats[beatIndex(b)]).to;
      p = { letter: token, from, to, fromBeat: beatIndex(from), toBeat: beatIndex(Math.min(to, m.audio.duration)), sections: sectionsIn(from, to), score: 0, why: ['named by the user'] };
    }
    if (!p) throw new Error(`no pick "${token}" in shorts/picks.json (run pick first)`);
    const used = new Set(history.shorts.map(h => h.id));
    let k = 1;
    while (used.has(`s${String(k).padStart(2, '0')}`) || fs.existsSync(path.join(shortsDir, `s${String(k).padStart(2, '0')}`))) k++;
    const id = `s${String(k).padStart(2, '0')}`;
    const sd = path.join(shortsDir, id);
    fs.mkdirSync(sd, { recursive: true });
    const spec: Record<string, unknown> = { id, from: p.from, to: p.to, fromBeat: p.fromBeat, toBeat: p.toBeat, formats, sections: p.sections };
    if (mode === 'rotate') {
      // planned back from the hit H (the range's start): the edit plays in the band from H − 10 with its
      // own build, 3 · 2 · 1 on H − 10, H − 8, H − 6 (a clunk each), lights out and the slow turn from
      // H − 4, landing on H; a whoosh through the turn and an impact on the hit
      const H = p.fromBeat;
      const r3 = (b: number) => +beatT(b).toFixed(3);
      const style = opt('hook') === 'band' ? 'band' : 'center';
      const count = (style === 'center' ? [H - 15, H - 12, H - 10, H - 8, H - 6] : [H - 10, H - 8, H - 6]).map(r3);
      const turn = r3(H - 4);
      const hit = r3(H);
      const has = (f: string) => fs.existsSync(path.join(dir, 'derived', 'sfx', `${f}.wav`));
      const sfx = [
        // a clunk per start light: on every count in the band style, on 3 · 2 · 1 in the centre
        ...(style === 'center' ? count.slice(-3) : count).map(at => ({ file: 'clunk', at, gain: 0.5 })),
        { file: 'whoosh', at: +((turn + hit) / 2 - 0.3).toFixed(3), gain: 0.3 },
        // soft: the edit has its own hit there (hitixf1's drop 2 clipped at 0.28)
        { file: 'impact', at: hit, gain: 0.15 },
      ].filter(x => has(x.file));
      Object.assign(spec, { from: count[0], fromBeat: H - (style === 'center' ? 15 : 10), mode, video: 'derived/final-16x9.mp4', hook: { from: count[0], style, count, turn, hit, sfx } });
    }
    fs.writeFileSync(path.join(sd, 'short.json'), `${JSON.stringify(spec, null, 1)}\n`);
    const header = `/**\n * ${m.title} — short ${id}: ${mmss(spec.from as number)}–${mmss(p.to)} of the song (beats ${p.fromBeat}–${p.toBeat}; ${p.sections.join(' · ')}).\n * make-video-music-remix-shorts. Cuts, words and sound effects are in the song's own beats.\n */\n`;
    if (mode !== 'rotate') fs.writeFileSync(
      path.join(sd, 'edl.ts'),
      parentEdl
        ? `${header}import * as full from '../../video/edl.ts';\n\n// Starts as the full edit's cut list (only beats ${p.fromBeat}–${p.toBeat} play). Recast it for the short:\n// the hook in the first second, punch words for a vertical frame, band()/split where a crop is soft.\nexport const blocks = full.blocks;\nexport const words = full.words;\nexport const sfx = full.sfx;\nexport const gfx = full.gfx;\n`
        : `${header}import type { Block, Gfx, Sfx, TextCue } from '../../../../src/remix/edl.ts';\n// import { c, split, splitAt, band, aim, shake, freeze, mono } from '../../../../src/remix/edl.ts';\n\n// Cast beats ${p.fromBeat}–${p.toBeat} here (blocks run back to back from beat ${p.fromBeat}).\nexport const blocks: Block[] = [];\nexport const words: TextCue[] = [];\nexport const sfx: Sfx[] = [];\nexport const gfx: Gfx = {};\n`,
    );
    const remix = JSON.parse(fs.readFileSync(path.join(dir, 'video/remix.json'), 'utf8'));
    fs.writeFileSync(
      path.join(sd, 'index.tsx'),
      mode === 'rotate' && parent
        ? `${header}import { defineShorts, type ShortSpec } from '../../../../src/remix/shorts';\nimport parent from '../../video/index';\nimport short from './short.json';\n\n// a rotate short: the start-lights hook, then the finished 16:9 render turned 90° (short.json "hook")\nexport default defineShorts(parent, short as ShortSpec);\n`
        : parent
        ? `${header}import { defineShorts, type ShortSpec } from '../../../../src/remix/shorts';\nimport parent from '../../video/index';\nimport * as edl from './edl.ts';\nimport short from './short.json';\n\nexport default defineShorts(parent, short as ShortSpec, edl);\n`
        : `${header}import type { Anchors } from '../../../../src/remix/Remix';\nimport type { Footage } from '../../../../src/remix/resolve.ts';\nimport { defineShorts, type ShortSpec } from '../../../../src/remix/shorts';\nimport anchors from '../../video/anchors.json';\nimport footage from '../../video/footage.json';\nimport { THEME } from '../../video/theme';\nimport * as edl from './edl.ts';\nimport short from './short.json';\n\nexport default defineShorts(\n  { slug: '${slug}', fps: 30, remix: { footage: footage as unknown as Footage, anchors: anchors as unknown as Anchors, window: [${remix.window[0]}, ${remix.window[1]}], theme: THEME } },\n  short as ShortSpec,\n  edl,\n);\n`,
    );
    history.shorts.push({ id, from: spec.from as number, to: p.to, fromBeat: spec.fromBeat as number, toBeat: p.toBeat, sections: p.sections, run: picks.run, date: today(), status: 'made', formats, mode });
    console.log(`✔ shorts/${id}/  ${mode}  ${mmss(spec.from as number)}–${mmss(p.to)}  ${formats.map(f => `${slug}-${id}-${f}`).join(', ')}`);
  }
  writeHistory(history);
} else if (cmd === 'mark') {
  const verdict = args.filter(a => !a.startsWith('--'))[3] as Status | undefined;
  if (!what || !verdict || !['bad', 'liked', 'made'].includes(verdict)) throw new Error('usage: mark <id | pick letter | from-to> bad|liked [--note="…"]');
  let h = history.shorts.find(x => x.id === what);
  if (!h) {
    // a stretch the user judged without a short being made of it: a pick they were shown, or a range
    const picks = fs.existsSync(picksFile) ? (JSON.parse(fs.readFileSync(picksFile, 'utf8')) as { run: number; picks: Pick[] }) : { run: 0, picks: [] };
    const p = picks.picks.find(x => x.letter === what.toUpperCase());
    const [a, b] = p ? [p.from, p.to] : /^[\d.]+-[\d.]+$/.test(what) ? what.split('-').map(Number) : [NaN, NaN];
    if (!Number.isFinite(a)) throw new Error(`no short or pick "${what}"`);
    h = { id: p ? `run${picks.run}-${p.letter}` : what, from: a, to: b, fromBeat: beatIndex(a), toBeat: beatIndex(b), sections: sectionsIn(a, b), run: picks.run, date: today(), status: verdict };
    history.shorts.push(h);
  }
  h.status = verdict;
  if (opt('note')) h.note = opt('note');
  writeHistory(history);
  console.log(`✔ ${h.id} ${mmss(h.from)}–${mmss(h.to)} → ${verdict}${verdict === 'bad' ? ' (never picked again)' : ''}`);
} else if (cmd === 'list') {
  if (!history.shorts.length) console.log('no shorts yet');
  for (const h of history.shorts) console.log(`${h.id}  ${mmss(h.from)}–${mmss(h.to)}  ${(h.to - h.from).toFixed(1)} s  ${h.status.padEnd(5)}  ${(h.mode ?? 'recast').padEnd(6)}  run ${h.run}  ${h.date}  ${h.sections.join(' · ')}${h.note ? `  — ${h.note}` : ''}`);
} else {
  throw new Error(`unknown command ${cmd}`);
}
