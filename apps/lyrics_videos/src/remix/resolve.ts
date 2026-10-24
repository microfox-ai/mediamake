/**
 * edl.ts + manifest + footage table -> absolute cuts, text and sound effect timings.
 * Pure (no Remotion), so scripts/remix.ts and the scenes resolve the same edit.
 */
import type { Block, Cut, Fx, Sfx, TextCue, TextStyle, Transition } from './edl.ts';

type Beat = { t: number };
type Word = { text: string; start: number; end: number };
type Line = { text: string; start: number; end: number; words: Word[] };
export type ManifestLike = {
  audio: { duration: number };
  beats: { list: Beat[] };
  lyrics: Line[];
};
/** a footage file: its frame rate, the rate its mattes/anchors were made at, its plate under derived/ */
export type FootageSource = { fps: number; matteFps: number; duration: number; plate: string };
/** every source's shots by id: [start, end, source id] in source seconds; `slow`: 60 fps
 *  motion-interpolated clips (from the shot's start) of the shots slow() cuts play */
export type Footage = { sources: Record<string, FootageSource>; shots: Record<string, [number, number, string]>; slow?: Record<string, string> };

/** a split-screen panel; it holds its last frame if its shot ends before the split does */
export type ResolvedPanel = { src: string; source: string; srcIn: number; srcOut: number; matte?: { key: string; in: number } };
export type ResolvedCut = {
  id: string; // block id + 1-based index: 'v1.3'
  i: number; // position in the whole edit
  from: number; // song seconds
  to: number;
  src: string; // footage shot id, '@graphic' or '@split'
  gfx: boolean;
  source: string; // footage source id ('' for graphics)
  srcIn: number; // source seconds at `from`
  rate: number; // ≥ 1, below 1 only with slow()
  tin: Transition;
  tout: Transition; // = the next cut's tin
  fx: Fx[];
  /** the subject cutout of the whole source shot: derived/shotmattes/<shot>.webm from source `in` */
  matte?: { key: string; in: number };
  panels?: ResolvedPanel[];
  /** '@split': seconds into the cut each panel arrives */
  panelAt?: number[];
  warn?: string;
};

/**
 * Seconds of source played `t` seconds into the cut: speed, impact-frame hold and speed ramp. An
 * impact frame holds two frames into the take, not its first: source edits often hide a one-frame
 * flash of another shot at a cut, and a held flash frame shows the wrong picture.
 */
export const sourceTime = (cut: Pick<ResolvedCut, 'from' | 'to' | 'srcIn' | 'rate' | 'fx'>, t: number, fps = 30): number => {
  const rv = cut.fx.find(x => x.k === 'rev') as Extract<Fx, { k: 'rev' }> | undefined;
  if (rv) return cut.srcIn - (rv.r ?? 2) * t;
  const fr = cut.fx.find(x => x.k === 'freeze') as Extract<Fx, { k: 'freeze' }> | undefined;
  const rp = cut.fx.find(x => x.k === 'ramp') as Extract<Fx, { k: 'ramp' }> | undefined;
  const hold = fr ? (fr.n ?? 3) / fps : 0;
  const skip = fr ? 2 / fps : 0;
  const u = Math.max(0, t - hold);
  const L = Math.max(1e-3, cut.to - cut.from - hold);
  const s = rp ? u + ((rp.peak ?? 2.2) - 1) * u ** 3 / (3 * L * L) : u;
  return cut.srcIn + skip + cut.rate * s;
};

export type ResolvedWord = { text: string; at: number };
export type ResolvedText = {
  i: number;
  style: TextStyle;
  from: number;
  to: number;
  words: ResolvedWord[]; // one entry per displayed word, with its own start
  cue: TextCue;
  /** index among the cues of its style, for alternating placement */
  n: number;
};
export type ResolvedSfx = { file: string; at: number; gain: number };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, '').replace(/\s+/g, ' ').trim();
export const findLine = (m: ManifestLike, query: string, nth = 0): Line => {
  const q = norm(query);
  const hits = m.lyrics.filter(l => norm(l.text).includes(q));
  if (!hits[nth]) throw new Error(`No lyric line #${nth} containing "${query}" (${hits.length} found)`);
  return hits[nth];
};

/** Song time of a fractional beat index (linear between beats, extrapolated at the ends). */
export const beatTime = (m: ManifestLike, b: number): number => {
  const bt = m.beats.list;
  const i = Math.max(0, Math.min(bt.length - 2, Math.floor(b)));
  return bt[i].t + (b - i) * (bt[i + 1].t - bt[i].t);
};

export const resolveCuts = (m: ManifestLike, f: Footage, blocks: Block[], matted: Set<string>): ResolvedCut[] => {
  const out: ResolvedCut[] = [];
  const shotOf = (id: string, where: string) => {
    const shot = f.shots[id];
    if (!shot) throw new Error(`${where}: unknown footage shot ${id}`);
    return shot;
  };
  blocks.forEach((blk, bi) => {
    let beat = blk.at;
    const next = blocks[bi + 1]?.at;
    blk.cuts.forEach((c: Cut, ci) => {
      const from = beatTime(m, beat);
      const to = c.b === 'end' ? m.audio.duration : beatTime(m, beat + c.b);
      if (c.b !== 'end') beat += c.b;
      const id = `${blk.id}.${ci + 1}`;
      const gfx = c.src.startsWith('@');
      const cut: ResolvedCut = { id, i: out.length, from, to, src: c.src, gfx, source: '', srcIn: 0, rate: 1, tin: c.t, tout: 'cut', fx: c.fx };
      const slow = c.fx.find(x => x.k === 'slow') as Extract<Fx, { k: 'slow' }> | undefined;
      if (c.rate !== undefined && c.rate < 1) cut.warn = `rate ${c.rate} ignored: footage is never slowed (slow() is the exception)`;
      if (c.src === '@split') {
        cut.panels = (c.panels ?? []).map(p => {
          const [s0, s1, source] = shotOf(p, id);
          return { src: p, source, srcIn: s0, srcOut: s1 - 1 / 30, matte: matted.has(p) ? { key: p, in: s0 } : undefined };
        });
        if (c.panelAt) cut.panelAt = c.panelAt.map(b => beatTime(m, b) - from);
      } else if (!gfx) {
        const [s0, s1, source] = shotOf(c.src, id);
        cut.source = source;
        cut.srcIn = s0 + (c.off ?? 0);
        cut.rate = slow ? Math.max(0.4, Math.min(1, slow.r)) : Math.max(1, c.rate ?? 1);
        const over = sourceTime(cut, to - from) - s1;
        const under = s0 - sourceTime(cut, to - from);
        if (over > 1 / 24) cut.warn = `runs ${over.toFixed(2)}s past the end of ${c.src} (into the footage's next shot)`;
        if (under > 1 / 24) cut.warn = `rewinds ${under.toFixed(2)}s past the start of ${c.src} (into the footage's previous shot)`;
        if (matted.has(c.src) && !c.fx.some(x => x.k === 'flat')) cut.matte = { key: c.src, in: s0 };
      }
      out.push(cut);
    });
    if (next !== undefined && Math.abs(beat - next) > 1e-6)
      throw new Error(`block ${blk.id} ends on beat ${beat}, but the next block starts on ${next}`);
  });
  out.forEach((c, k) => (c.tout = out[k + 1]?.tin ?? 'cut'));
  return out;
};

const LAYER: Record<TextStyle, string> = { big: 'big', front: 'big', line: 'line', label: 'label', sub: 'sub', timer: 'timer', map: 'map', flank: 'flank' };
const HOLD: Record<TextStyle, number> = { big: 1, front: 1.5, line: 1.5, label: 3, sub: 4, timer: 0, map: 4, flank: 4 };

/**
 * Seconds a sung word shows before its aligned start. Aligned starts trail the consonant onsets by
 * 0.1–0.25 s, and text has to lead the sound by a few frames to feel on it (rev-002: "letters are
 * appearing in delay").
 */
export const TEXT_LEAD = 0.15;

export const resolveText = (m: ManifestLike, cues: TextCue[], lead = TEXT_LEAD): ResolvedText[] => {
  const beatLen = (t: number) => {
    const bt = m.beats.list;
    const i = Math.max(0, bt.findIndex(b => b.t > t) - 1);
    return (bt[Math.min(i + 1, bt.length - 1)].t - bt[i].t) || 0.6;
  };
  const count: Record<string, number> = {};
  const raw = cues.map((cue, i) => {
    let words: ResolvedWord[];
    let lastEnd: number;
    if (cue.line) {
      const line = findLine(m, cue.line[0], cue.line[1] ?? 0);
      const w0 = cue.w ?? 0;
      const sung = line.words;
      const text = cue.text === '*' ? line.text.toUpperCase().replace(/[.,!?]+$/, '') : cue.text;
      const parts = text.split(' ');
      if (cue.perWord || cue.text === '*') {
        words = parts.map((t, k) => ({ text: t, at: Math.max(0, (sung[w0 + k] ?? sung[sung.length - 1]).start - lead) }));
        lastEnd = (sung[w0 + parts.length - 1] ?? sung[sung.length - 1]).end;
      } else {
        const at = Math.max(0, (sung[w0] ?? sung[0]).start - lead);
        words = parts.map(t => ({ text: t, at }));
        lastEnd = (sung[w0 + parts.length - 1] ?? sung[sung.length - 1]).end;
      }
    } else {
      const at = beatTime(m, cue.beat ?? 0);
      words = cue.text.split(' ').map(t => ({ text: t, at }));
      lastEnd = at;
    }
    if (cue.start !== undefined) {
      const s = beatTime(m, cue.start);
      words = words.map(x => ({ ...x, at: Math.max(x.at, s) }));
    }
    const from = words[0].at;
    let to = cue.until
      ? findLine(m, cue.until[0], cue.until[1] ?? 0).words[0].start - lead - 0.02
      : Math.min(m.audio.duration, lastEnd + (cue.hold ?? HOLD[cue.style]) * beatLen(lastEnd));
    if (cue.end !== undefined) to = Math.min(to, beatTime(m, cue.end) - 0.02);
    const n = (count[cue.style] = (count[cue.style] ?? -1) + 1);
    return { i, style: cue.style, from, to, words, cue, n };
  });
  // one cue per layer at a time: the next one cuts the previous off
  for (const t of raw) {
    const nxt = raw.filter(o => o !== t && LAYER[o.style] === LAYER[t.style] && o.from > t.from + 0.01).sort((a, b) => a.from - b.from)[0];
    if (nxt) t.to = Math.min(t.to, nxt.from - 0.02);
  }
  return raw;
};

export const resolveSfx = (m: ManifestLike, sfx: Sfx[]): ResolvedSfx[] =>
  sfx.map(s => {
    const at = s.line ? findLine(m, s.line[0], s.line[1] ?? 0).words[s.w ?? 0].start : beatTime(m, s.beat ?? 0);
    return { file: s.file, at: Math.max(0, at - (s.lead ?? 0)), gain: s.gain ?? 0.7 };
  });

export const resolveAll = (m: ManifestLike, f: Footage, blocks: Block[], cues: TextCue[], sfx: Sfx[] = [], matted = new Set(Object.keys(f.shots))) => ({
  cuts: resolveCuts(m, f, blocks, matted),
  text: resolveText(m, cues),
  sfx: resolveSfx(m, sfx),
});
