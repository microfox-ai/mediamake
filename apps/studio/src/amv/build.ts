/**
 * Helpers for writing a project's video/cut.ts: shots laid out in beats from a start time, sources
 * named by their sheet numbers ('ftw:39' = shot sh0039 of the ftw pack), times found by lyric word.
 *
 *   const c = amv({ slug, footage, timing });
 *   c.seq(c.w('blindfold'), 'verse1', [
 *     { s: 's1i:52', beats: 4, push: 0.08, grade: 'teal' },
 *     ...
 *   ]);
 *   export const cut = c.cut();
 *
 * footage.json and timing.json come from scripts/amv-index.py.
 */
import { fillFactor, holdFor, offsetAt, slowed } from './speed.ts';
import type { Cut, Overlay, Piece, Sfx, Shot, Words, World } from './types';

export type FootageIndex = Record<string, { fps: number; duration: number; proxy: string; shots: Record<string, [number, number]> }>;
export type TimingIndex = {
  bpm: number;
  beats: number[];
  downbeats: number[];
  duration: number;
  lines: [string, number, number][];
  words: [string, number, number, number][];
  /** drum onsets (scripts/amv-drums.py via amv-index.py) */
  hits?: number[];
};
/** scripts/amv-match.py: per shot keyframe descriptors, footage that appears twice, matched pairs */
type KeyDesc = { frame: number; area: number; cx: number; cy: number; eyes: number[] | null; luma?: number };
export type MatchIndex = {
  shots: Record<string, Partial<Record<'first' | 'mid' | 'last', KeyDesc>>>;
  dups: { a: string; b: string; ncc: number }[];
};

/** a plate behind a held subject, by sheet number */
export type WorldSpec = Omit<World, 'src' | 'in'> & { s: string; off?: number };

/** One shot in a sequence: `s` names the source shot ('ftw:39'), `off` seconds into it. */
export type SeqShot = Omit<Shot, 'id' | 'from' | 'to' | 'src' | 'in' | 'section' | 'worlds'> & {
  s: string;
  off?: number;
  /** length in beats (fractional allowed) */
  beats: number;
  id?: string;
  /**
   * frame this shot so its subject lines up with the end of the shot before it (match cuts, from
   * video/match.json): 'eyes' lays the eye lines on each other, 'shape' the silhouettes
   */
  align?: 'eyes' | 'shape';
  worlds?: WorldSpec[];
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '');

/** video/space.json (scripts/amv-space.py): the subject's cover and the brightness under every caption */
export type SpaceIndex = { cols: number; rows: number; captions: Record<string, { sub: string; luma: string }> };

export const amv = ({ slug, footage, timing, match, space }: { slug: string; footage: FootageIndex; timing: TimingIndex; match?: MatchIndex; space?: SpaceIndex }) => {
  const shots: Shot[] = [];
  const words: Words[] = [];
  const overlays: Overlay[] = [];
  const pieces: Piece[] = [];
  const sfx: Sfx[] = [];
  const stills: Record<string, string> = {};
  const stillJobs: { id: string; src: string; t: number }[] = [];
  const aux: Shot[] = [];
  const warnings: string[] = [];
  const { beats } = timing;
  const period = 60 / timing.bpm;

  /** time of beat i (fractional between grid beats, extrapolated past the ends) */
  const b = (i: number): number => {
    if (i <= 0) return beats[0] + i * period;
    if (i >= beats.length - 1) return beats[beats.length - 1] + (i - (beats.length - 1)) * period;
    const k = Math.floor(i);
    return beats[k] + (i - k) * (beats[k + 1] - beats[k]);
  };
  /** continuous beat index at time t */
  const bi = (t: number): number => {
    let lo = 0;
    let hi = beats.length - 1;
    if (t <= beats[0]) return (t - beats[0]) / period;
    if (t >= beats[hi]) return hi + (t - beats[hi]) / period;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (beats[mid] <= t) lo = mid;
      else hi = mid;
    }
    return lo + (t - beats[lo]) / (beats[hi] - beats[lo]);
  };
  /** the beat nearest t */
  const snap = (t: number) => b(Math.round(bi(t)));
  /** start of the n-th sung word matching `text` (case and punctuation ignored), at or after `after` */
  const w = (text: string, n = 1, after = 0): number => {
    const want = norm(text);
    let k = 0;
    for (const [t, s] of timing.words) {
      if (s + 1e-6 < after) continue;
      if (norm(t) === want && ++k === n) return s;
    }
    throw new Error(`No sung word "${text}" #${n} after ${after}s`);
  };
  /** end of that word */
  const we = (text: string, n = 1, after = 0): number => {
    const s = w(text, n, after);
    return timing.words.find(x => x[1] === s)![2];
  };

  const source = (spec: string) => {
    // 'black': no picture, for set pieces and type on black
    if (spec === 'black') return { src: 'black', range: [0, 1e6] as [number, number] };
    const [src, num] = spec.split(':');
    const f = footage[src];
    if (!f) throw new Error(`Unknown source ${src} in ${spec}`);
    const range = f.shots[String(Number(num))];
    if (!range) throw new Error(`No shot ${num} in ${src}`);
    return { src, range };
  };

  const world = (x: WorldSpec): World => {
    const { s, off = 0, ...rest } = x;
    const { src, range } = source(s);
    return { ...rest, src, in: range[0] + off };
  };

  /** the keyframe of a sheet shot nearest a source time (its subject and eyes, from match.json) */
  const keyAt = (spec: string, t: number): KeyDesc | undefined => {
    const m = match?.shots[`${spec.split(':')[0]}:${Number(spec.split(':')[1])}`];
    if (!m) return undefined;
    const fps = footage[spec.split(':')[0]].fps;
    return Object.values(m)
      .filter((d): d is KeyDesc => !!d)
      .sort((p, q) => Math.abs(p.frame / fps - t) - Math.abs(q.frame / fps - t))[0];
  };

  /**
   * Frame `next` (spec + its in-point) so its subject lands where `prev`'s was at its end: zoom so the
   * two are the same size, focus so they sit on the same spot. Returns x/y/z for the new shot, and pushes
   * the old one further in when the new shot would need zooming out.
   */
  const alignTo = (prev: Shot & { spec?: string }, spec: string, tin: number, mode: 'eyes' | 'shape', where: string) => {
    if (!prev.spec) return {};
    const len = prev.to - prev.from;
    const rate = prev.ramp ? prev.ramp[1] : prev.rate ?? 1;
    const tEnd = prev.reverse ? prev.in - len * rate : prev.in + len * rate;
    const da = keyAt(prev.spec, tEnd);
    const db = keyAt(spec, tin);
    if (!da || !db) {
      warnings.push(`${where}: no match data for ${prev.spec} → ${spec} (run scripts/amv-match.py)`);
      return {};
    }
    const feat = (d: KeyDesc) => {
      if (mode === 'eyes' && d.eyes?.length === 4) {
        const [lx, ly, rx, ry] = d.eyes;
        return { u: (lx + rx) / 2, v: (ly + ry) / 2, size: Math.hypot((rx - lx) * 16 / 9, ry - ly) };
      }
      return { u: d.cx, v: d.cy, size: Math.sqrt(Math.max(1e-4, d.area)) };
    };
    const fa = feat(da);
    const fb = feat(db);
    if (mode === 'eyes' && (!da.eyes || da.eyes.length !== 4 || !db.eyes || db.eyes.length !== 4))
      warnings.push(`${where}: no eye pair in ${!da.eyes || da.eyes.length !== 4 ? prev.spec : spec}, matched on the silhouette`);
    const zA = (prev.z ?? 1) + (prev.push ?? 0);
    const ratio = fa.size / fb.size;
    if (ratio < 0.45 || ratio > 2.2) {
      warnings.push(`${where}: ${prev.spec} → ${spec} are too different in size to match (×${ratio.toFixed(2)}): not aligned`);
      return {};
    }
    const lim = (z: number) => (1 - 1 / Math.max(1, z)) / 2;
    const cl = (v: number, l: number) => Math.max(-l, Math.min(l, v));
    const focA = [0.5 + cl((prev.x ?? 0.5) + (prev.drift?.[0] ?? 0) - 0.5, lim(zA)), 0.5 + cl((prev.y ?? 0.5) + (prev.drift?.[1] ?? 0) - 0.5, lim(zA))];
    // where prev's feature sits on screen at its end, and the zoom the new shot needs for the same size
    const place = (zEnd: number) => {
      const P = [0.5 + (fa.u - focA[0]) * zEnd, 0.5 + (fa.v - focA[1]) * zEnd];
      const zB = zEnd * ratio;
      return { P, zB, x: fb.u - (P[0] - 0.5) / zB, y: fb.v - (P[1] - 0.5) / zB };
    };
    let k = 1;
    let p = place(zA);
    // the new shot can't zoom out past the frame, and can only move its focus as far as its zoom allows:
    // push both further in until the match fits (the old shot ends closer, the new one starts closer)
    for (let i = 0; i < 12; i++) {
      const need = Math.max(Math.abs(p.x - 0.5), Math.abs(p.y - 0.5));
      if (p.zB >= 1 && need <= lim(p.zB) + 1e-3) break;
      k *= p.zB < 1 ? 1 / p.zB : 1.06;
      if (zA * k > 1.9) break;
      p = place(zA * k);
    }
    if (k > 1) prev.push = (prev.push ?? 0) + zA * (k - 1);
    const zB = Math.max(1, p.zB);
    const off = Math.max(Math.abs(p.x - 0.5) - lim(zB), Math.abs(p.y - 0.5) - lim(zB));
    if (off > 0.03) warnings.push(`${where}: the match is off by ${(off * 100).toFixed(0)}% of the frame even at ×${(zA * k).toFixed(2)} (pick a closer pair)`);
    return { x: Number(p.x.toFixed(4)), y: Number(p.y.toFixed(4)), z: Number(zB.toFixed(4)) };
  };

  /** one shot of a sequence from `t` to `to` (k = its number in the section) */
  const pushShot = (it: Omit<SeqShot, 'beats'>, t: number, to: number, section: string, k: number) => {
    const { s, off = 0, id, align, worlds, ...rest } = it;
    const { src, range } = source(s);
    const len = to - t;
    const need = offsetAt(rest, rest.hold !== undefined ? len * rest.hold : len, len);
    const have = range[1] - range[0] - off;
    if (need > have + 0.05 && rest.hold === undefined && src !== 'black' && !worlds) {
      // too little footage: the take runs slower to fill the shot, never freezing on its last frame (honoredone
      // rev-003: "the video is freezing and it feels odd, slow mo the video if needed to fill gap"), down to
      // 0.3× (slower steps); only a take too short even for that holds the rest, worth a warning past half the
      // shot (a few frames short of the range's end: a detected shot's last frame can be the next one's first)
      Object.assign(rest, slowed(rest, fillFactor(rest, len, have - 0.12)));
      const hold = holdFor(rest, len, have - 0.12);
      if (hold < 0.5) warnings.push(`${section} #${k + 1} ${s}: needs ${need.toFixed(2)}s of footage, the shot has ${have.toFixed(2)}s (it would freeze for ${((1 - hold) * len).toFixed(1)}s)`);
      if (hold < 1) rest.hold = hold;
    }
    const inPt = rest.reverse ? range[0] + off + Math.min(need, have) : range[0] + off;
    const framing = align && shots.length ? alignTo(shots[shots.length - 1], s, inPt, align, `${section} #${k + 1}`) : {};
    shots.push({
      id: id ?? `${section}.${k + 1}`,
      from: t,
      to,
      src,
      in: inPt,
      section,
      spec: s,
      ...framing,
      ...rest,
      ...(worlds ? { worlds: worlds.map(world) } : {}),
    } as Shot);
  };

  /** lay `items` end to end from `start` (song s), each `beats` long; returns the end time */
  const seq = (start: number, section: string, items: SeqShot[]): number => {
    let i0 = bi(start);
    let t = start;
    // ids run on through a section written in several sequences
    const n0 = shots.filter(x => x.section === section).length;
    items.forEach((it, k0) => {
      const { beats: n, ...rest } = it;
      const to = b(i0 + n);
      pushShot(rest, t, to, section, n0 + k0);
      t = to;
      i0 += n;
    });
    return t;
  };

  /**
   * The drum hits between a and b (exclusive), on the music's grid: each onset snapped to the nearest
   * sixteenth of a beat when it is within 40 ms of it (ghosts off the grid are dropped), then thinned
   * so no two are closer than `gap` s. Fast sections cut on these: every cut on a hit and on the beat.
   */
  const hitsIn = (a: number, z: number, gap = 0.2): number[] => {
    const out: number[] = [];
    for (const h of timing.hits ?? []) {
      if (h <= a + gap * 0.5 || h >= z - gap * 0.5) continue;
      const q = Math.round(bi(h) * 4) / 4;
      const g = b(q);
      if (Math.abs(g - h) > 0.04) continue;
      if (out.length && g - out[out.length - 1] < gap) continue;
      out.push(g);
    }
    return out;
  };

  /** lay `items` at the given cut times: item k runs from times[k] (times[0] = start) to the next; returns `end` */
  const seqAt = (start: number, end: number, section: string, items: Omit<SeqShot, 'beats'>[], cuts: number[]): number => {
    const times = [start, ...cuts.filter(x => x > start + 1e-3 && x < end - 1e-3)];
    if (times.length !== items.length) warnings.push(`${section}: ${items.length} shots for ${times.length} cut slots (${start.toFixed(2)}–${end.toFixed(2)})`);
    const n0 = shots.filter(x => x.section === section).length;
    const n = Math.min(times.length, items.length);
    for (let k = 0; k < n; k++) pushShot(items[k], times[k], k === n - 1 ? end : times[k + 1], section, n0 + k);
    return end;
  };

  /**
   * A caption sung as written: each word of `text` found in the sung words in order from `after` (the
   * line's words, so the stack lights them one by one). Unset `x`: placed on the side away from the
   * subject when the cut is made (match.json); unset `to`: held until just before the next caption.
   */
  let cursor = 0;
  let font: string | undefined;
  const say = (text: string, o: Partial<Words> & { after?: number } = {}) => {
    const { after, ...rest } = o;
    let t = after ?? cursor;
    const beatsW: number[] = [];
    let lastEnd = t;
    if (rest.beats) {
      // sung times given by hand (where the aligner drifted: a choir, a pickup word)
      beatsW.push(...rest.beats);
      lastEnd = rest.beats[rest.beats.length - 1] + 0.4;
      t = lastEnd - 0.39;
    }
    for (const raw of rest.beats ? [] : text.split(/\s+/).filter(Boolean)) {
      const want = norm(raw);
      const hit = timing.words.find(([wt, ws]) => ws >= t - 1e-6 && norm(wt) === want);
      // a phrase's first word may come after an instrumental; its next words follow within a few seconds
      const limit = beatsW.length ? 6 : 60;
      if (!hit || hit[1] - t > limit) throw new Error(`say "${text}": no sung "${raw}" within ${limit} s after ${t.toFixed(2)}`);
      beatsW.push(hit[1]);
      lastEnd = hit[2];
      t = hit[1] + 1e-3;
    }
    cursor = t;
    words.push({ style: 'stack', from: beatsW[0] - 0.08, to: rest.to ?? -lastEnd, text, beats: beatsW, font, ...rest } as Words);
  };

  /**
   * The story edit: one shot per sung phrase. Each entry with `say` starts on the beat at or before
   * the phrase's first word (its caption lights the words as they are sung); an entry without `say`
   * runs `beats` after the one before it starts (or starts at `at`, a song time). Each shot ends where
   * the next starts; the last at `end`. Every cut is on the beat.
   */
  const story = (start: number, end: number, section: string, entries: (Omit<SeqShot, 'beats'> & { say?: string; beats?: number; at?: number; cap?: Partial<Words> })[]) => {
    const starts: number[] = [];
    let prevStart = start;
    let prevBeats: number | undefined;
    let first = true;
    for (const e of entries) {
      let t: number;
      if (first) t = start;
      else if (e.at !== undefined) t = e.at;
      else if (e.say && e.cap?.beats) t = b(Math.floor(bi(e.cap.beats[0]) + 0.08));
      else if (e.say) {
        const want = norm(e.say.split(/\s+/)[0]);
        const hit = timing.words.find(([wt, ws]) => ws >= cursor - 1e-6 && norm(wt) === want);
        if (!hit) throw new Error(`story ${section}: no sung "${e.say}" after ${cursor.toFixed(2)}`);
        t = b(Math.floor(bi(hit[1]) + 0.08));
      } else if (prevBeats !== undefined) t = b(bi(prevStart) + prevBeats);
      else throw new Error(`story ${section}: an entry needs say, at, or the one before it needs beats`);
      if (!first && t < prevStart + 0.2) {
        warnings.push(`${section}: "${e.say ?? e.s}" would start ${(t - prevStart).toFixed(2)} s after the shot before; held a beat`);
        t = b(Math.round(bi(prevStart)) + 1);
      }
      starts.push(t);
      if (e.say) say(e.say, { ...(e.cap ?? {}) });
      prevStart = t;
      prevBeats = e.beats;
      first = false;
    }
    const n0 = shots.filter(x => x.section === section).length;
    entries.forEach((e, k) => {
      const { say: _s, beats: _b, at: _a, cap: _c, ...rest } = e;
      const to = k === entries.length - 1 ? end : starts[k + 1];
      if (to <= starts[k] + 1e-3) warnings.push(`${section} #${n0 + k + 1}: no room (${starts[k].toFixed(2)}–${to.toFixed(2)})`);
      pushShot({ lyric: e.say, ...rest }, starts[k], to, section, n0 + k);
    });
    return end;
  };

  const cut = (): Cut => {
    shots.sort((a, z) => a.from - z.from);
    for (let i = 1; i < shots.length; i++) {
      if (shots[i].from < shots[i - 1].to - 1e-3)
        warnings.push(`overlap: ${shots[i - 1].id} ends ${shots[i - 1].to.toFixed(2)} after ${shots[i].id} starts ${shots[i].from.toFixed(2)}`);
      else if (shots[i].from > shots[i - 1].to + 1e-3)
        warnings.push(`gap: ${shots[i - 1].to.toFixed(2)}–${shots[i].from.toFixed(2)} before ${shots[i].id}`);
    }
    // every take once: no two shots may show the same stretch of a source
    const used = shots
      .filter(s => s.src !== 'black')
      .map(s => {
        const rate = s.ramp ? (s.ramp[0] + s.ramp[1]) / 2 : s.rate ?? 1;
        const span = (s.to - s.from) * rate * (s.hold ?? 1);
        return { id: s.id, src: s.src, a: s.reverse ? s.in - span : s.in, z: s.reverse ? s.in : s.in + span };
      });
    for (let i = 0; i < used.length; i++)
      for (let j = i + 1; j < used.length; j++) {
        const p = used[i];
        const q = used[j];
        if (p.src === q.src && Math.min(p.z, q.z) - Math.max(p.a, q.a) > 0.08)
          warnings.push(`repeat: ${q.id} shows ${q.src} ${Math.max(p.a, q.a).toFixed(2)}–${Math.min(p.z, q.z).toFixed(2)}s, already in ${p.id}`);
      }
    // the same footage in two packs (match.json dups) is a repeat too
    const specs = new Map<string, string>();
    for (const s of shots as (Shot & { spec?: string })[]) if (s.spec && s.spec !== 'black') specs.set(`${s.spec.split(':')[0]}:${Number(s.spec.split(':')[1])}`, s.id);
    for (const d of match?.dups ?? [])
      if (specs.has(d.a) && specs.has(d.b)) warnings.push(`repeat: ${specs.get(d.b)} (${d.b}) is the same footage as ${specs.get(d.a)} (${d.a})`);
    // captions from say(): held to just before the next one (at most 1.2 s past their last word), and
    // set on the side away from the subject of the shot they mostly sit on
    const stacks = words.filter(x => x.style === 'stack').sort((p, q) => p.from - q.from);
    stacks.forEach((x, i) => {
      if (x.to < 0) {
        const lastEnd = -x.to;
        const nx = stacks[i + 1]?.from ?? Infinity;
        // a big outline word stays on longer ("especially if they stay for good time")
        x.to = Math.min(lastEnd + (x.tier === 'l' || x.tier === 'xl' ? 2.4 : 1.2), nx - 0.03);
        // but it leaves with its own shot (rev-002: "remove the text at this point", a word left over the next
        // shots); a mask (window) spans the cuts on purpose, and words over a fast fill keep their time
        const home = shots.find(s => s.from <= lastEnd + 1e-3 && s.to > lastEnd) as (Shot & { lyric?: string }) | undefined;
        if (home?.lyric && x.look !== 'window') x.to = Math.min(x.to, Math.max(lastEnd + 0.25, home.to - 0.02));
      }
      const over = shots
        .map(s => ({ s, len: Math.min(s.to, x.to) - Math.max(s.from, x.from) }))
        .filter(o => o.len > 0)
        .sort((p, q) => q.len - p.len)[0]?.s as (Shot & { spec?: string }) | undefined;
      const d = over?.spec ? keyAt(over.spec, over.in + (over.to - over.from) / 2) : undefined;
      // with the free-space map, motion.tsx places, sizes and shades the caption itself
      const free = space?.captions[x.from.toFixed(2)];
      if (free) {
        x.space = { ...free, cols: space!.cols, rows: space!.rows };
        return;
      }
      // white words over a bright frame get a dark pool under them
      if (x.dim === undefined && (d?.luma ?? 0) > 0.55) x.dim = Math.min(0.6, 0.25 + (d!.luma! - 0.55) * 1.5);
      if (x.x !== undefined) return;
      let side = 0.5;
      if (d && d.area > 0.01) {
        const z = (over!.z ?? 1) + (over!.push ?? 0) / 2;
        side = 0.5 + (d.cx - (over!.x ?? 0.5)) * z;
      }
      x.x = side > 0.5 ? 0.2 : 0.8;
    });
    const sources = Object.fromEntries(Object.entries(footage).map(([k, f]) => [k, { path: f.proxy, fps: f.fps }]));
    return { slug, sources, shots, words, overlays, pieces, sfx, stills, aux, hits: timing.hits ?? [] };
  };

  /** what scripts/amv.ts has to make for this cut: stills to grab and subject mattes to cut */
  const jobs = () => {
    const mattes: { id: string; src: string; from: number; to: number }[] = [];
    for (const s of [...shots, ...aux]) {
      if (!s.matte || mattes.some(m => m.id === s.matte)) continue;
      const len = s.to - s.from + 0.4; // + the transition tail
      const rate = s.ramp ? Math.max(s.ramp[0], s.ramp[1]) : s.rate ?? 1;
      const span = s.hold !== undefined ? (s.to - s.from) * rate * s.hold + 0.1 : len * rate;
      mattes.push({ id: s.matte, src: s.src, from: Math.max(0, s.in - 0.05), to: s.in + span + 0.05 });
    }
    return { stills: stillJobs, mattes };
  };

  return {
    b, bi, snap, w, we, seq, seqAt, story, hitsIn, say, cut, jobs, warnings, timing,
    /** the face every say() caption is set in (fonts.ts STACK_FONTS) */
    font: (f: string) => {
      font = f;
    },
    words: (x: Words) => void words.push(x),
    overlay: (x: Overlay) => void overlays.push(x),
    piece: (x: Piece) => void pieces.push(x),
    sfx: (at: number, src: string, volume = 0.35) => void sfx.push({ at, src, volume }),
    /** a still frame for pieces (void grid tiles, the Six Eyes tile): `spec` = 'ftw:39', `off` s into it */
    still: (id: string, spec: string, off = 0) => {
      const { src, range } = source(spec);
      stills[id] = `derived/stills/${id}.jpg`;
      stillJobs.push({ id, src, t: range[0] + off });
    },
    /** a single shot placed by time (inserts, set-piece plates) */
    shot: (x: Omit<Shot, 'src' | 'in'> & { s: string; off?: number }) => {
      const { s, off = 0, ...rest } = x;
      const { src, range } = source(s);
      shots.push({ ...rest, src, in: range[0] + off, spec: s } as Shot);
    },
    /** footage for a 'knockout' word: `spec` = 'ftw:39', `off` s into it */
    clip: (spec: string, off = 0, rate = 1) => {
      const { src, range } = source(spec);
      return { src, in: range[0] + off, rate };
    },
    /** a shot only a piece shows (split halves), not on the main track */
    aux: (x: Omit<Shot, 'src' | 'in'> & { s: string; off?: number }) => {
      const { s, off = 0, ...rest } = x;
      const { src, range } = source(s);
      aux.push({ ...rest, src, in: range[0] + off });
    },
  };
};
