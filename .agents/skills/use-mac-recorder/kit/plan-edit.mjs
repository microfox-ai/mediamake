#!/usr/bin/env node
/**
 * plan-edit: a mac-recorder events log (and its video) → an edit plan for ScreenZoom.tsx.
 *
 *   node plan-edit.mjs <name>.events.json [--out <plan.json>] [--zoom 1.8] [--idle 1.5] [--idle-speed 4|cut]
 *        [--idle-mode both|input|still] [--cursor auto|recorded|synthetic|none] [--no-trim] [--no-still] [--captions]
 *
 * The plan, all in the recording's own seconds and pixels:
 *   segments  what plays and how fast: the head and tail trimmed to the action, idle stretches (no input and,
 *             with ffmpeg, nothing moving on screen) sped up or cut, and stretches before a `cut` marker dropped
 *   zoom      keyframes { t, scale, x, y } (x, y: the centre of the view): in before each group of clicks, a pan
 *             between the clicks of a group, out after it; a `focus` marker's rect zooms to fit
 *   clicks    every click to show (a real one, or a marker with a point when the screen was driven by code)
 *   cursor    a path to draw [[t, x, y]…] when the video has no cursor: the recorded one smoothed, or one made
 *             from the click points
 *   markers   the step markers, for captions and chapters
 * duration is the edit's length in seconds. Nothing here needs a network or a key.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULTS = {
  zoom: 1.8, // the zoom on a click
  lead: 0.15, // the zoom is in this long before the click lands
  zoomIn: 0.8, // seconds to zoom in
  zoomOut: 0.9, // seconds to zoom out
  hold: 1.6, // stay in after the last click of a group
  groupGap: 2.6, // clicks closer than this share one zoom
  pan: 0.6, // the longest pan between clicks
  idle: 1.5, // the shortest stretch that counts as idle
  idleSpeed: 4, // a number, or 'cut'
  idleMode: 'both', // both: no input AND nothing moving; input: no input; still: nothing moving
  moveTolerance: 6, // pixels the cursor may drift and still be idle
  keep: 0.35, // the start and end of an idle stretch keep this much at normal speed
  trim: true, // trim the head and the tail to the action
  head: 0.6, // seconds kept before the first action
  tail: 1.5, // seconds kept after the last one
  captions: false,
  cursor: 'auto', // the drawn cursor: auto, recorded, synthetic or none
  fps: 30,
};

const round = (v, n = 3) => Math.round(v * 10 ** n) / 10 ** n;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** The moments something happened: clicks, scrolls, markers and cursor moves, as [from, to] spans. */
export function activity(events, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const spans = [];
  for (const c of events.clicks ?? []) spans.push([c.t, c.up ?? c.t]);
  for (const s of events.scrolls ?? []) spans.push([s.t, s.end ?? s.t]);
  for (const m of events.markers ?? []) spans.push([m.t, m.t]);
  const cur = events.cursor ?? [];
  for (let i = 1; i < cur.length; i++) {
    const [t0, x0, y0] = cur[i - 1];
    const [t1, x1, y1] = cur[i];
    if (Math.hypot(x1 - x0, y1 - y0) > o.moveTolerance) spans.push([t0, t1]);
  }
  return spans.sort((a, b) => a[0] - b[0]);
}

/** The complement of `spans` inside [0, duration] that last at least `min` seconds. */
export function gaps(spans, duration, min) {
  const out = [];
  let at = 0;
  for (const [a, b] of [...spans].sort((x, y) => x[0] - y[0])) {
    if (a - at >= min) out.push([at, a]);
    at = Math.max(at, b);
  }
  if (duration - at >= min) out.push([at, duration]);
  return out;
}

/** Overlap of two lists of spans. */
export function intersect(a, b) {
  const out = [];
  for (const [a0, a1] of a) for (const [b0, b1] of b) {
    const lo = Math.max(a0, b0);
    const hi = Math.min(a1, b1);
    if (hi > lo) out.push([lo, hi]);
  }
  return out.sort((x, y) => x[0] - y[0]);
}

/** Stretches where nothing on screen moved, from ffmpeg's freezedetect; null without ffmpeg. */
export function stillSpans(video, min = 1, ffmpeg = findFfmpeg()) {
  if (!ffmpeg || !video || !fs.existsSync(video)) return null;
  const res = spawnSync(ffmpeg, ['-hide_banner', '-nostats', '-i', video, '-vf', `scale=640:-2,freezedetect=n=0.0015:d=${Math.max(0.3, min / 2)}`, '-an', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const text = `${res.stderr ?? ''}`;
  const spans = [];
  let start = null;
  for (const line of text.split('\n')) {
    const s = line.match(/freeze_start: ([\d.]+)/);
    const e = line.match(/freeze_end: ([\d.]+)/);
    if (s) start = Number(s[1]);
    if (e && start !== null) {
      spans.push([start, Number(e[1])]);
      start = null;
    }
  }
  if (start !== null) spans.push([start, Infinity]);
  return spans;
}

export function findFfmpeg() {
  for (const p of [process.env.FFMPEG, '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg']) if (p && fs.existsSync(p)) return p;
  const which = spawnSync('which', ['ffmpeg'], { encoding: 'utf8' });
  return which.status === 0 ? which.stdout.trim() : null;
}

/** Points the edit zooms on: real clicks inside the frame, markers with a point, and focus rects. */
export function focusPoints(events, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const { width: W, height: H } = events.size;
  const pts = [];
  for (const c of events.clicks ?? []) if (c.x >= 0 && c.y >= 0 && c.x <= W && c.y <= H) pts.push({ t: c.t, x: c.x, y: c.y, scale: o.zoom, from: 'click' });
  for (const m of events.markers ?? []) {
    if (m.rect) {
      const fit = Math.min(W / m.rect.width, H / m.rect.height) * 0.85;
      pts.push({ t: m.t, x: m.rect.x + m.rect.width / 2, y: m.rect.y + m.rect.height / 2, scale: clamp(fit, 1, o.zoom * 1.4), from: 'focus' });
    } else if (Number.isFinite(m.x) && Number.isFinite(m.y)) pts.push({ t: m.t, x: m.x, y: m.y, scale: o.zoom, from: m.kind === 'click' ? 'click' : 'point' });
  }
  // one click logged twice (a real click and a marker for it): keep the first
  return pts.sort((a, b) => a.t - b.t).filter((p, i, all) => i === 0 || !(p.t - all[i - 1].t < 0.25 && Math.hypot(p.x - all[i - 1].x, p.y - all[i - 1].y) < 40));
}

/** The view's centre kept inside the frame at this scale. */
export function clampCentre(x, y, scale, W, H) {
  const vw = W / scale;
  const vh = H / scale;
  return { x: clamp(x, vw / 2, W - vw / 2), y: clamp(y, vh / 2, H - vh / 2) };
}

/** Zoom keyframes { t, scale, x, y } from focus points (Screen Studio's moves: in, pan, hold, out). */
export function zoomKeys(points, size, duration, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const { width: W, height: H } = size;
  const home = { scale: 1, x: W / 2, y: H / 2 };
  const keys = [{ t: 0, ...home }];
  const groups = [];
  for (const p of points) {
    const g = groups.at(-1);
    if (g && p.t - g.at(-1).t <= o.groupGap) g.push(p);
    else groups.push([p]);
  }
  const push = k => {
    const last = keys.at(-1);
    const t = round(Math.max(k.t, last.t));
    const c = clampCentre(k.x, k.y, k.scale, W, H);
    const key = { t, scale: round(k.scale), x: round(c.x, 1), y: round(c.y, 1) };
    if (t === last.t) keys[keys.length - 1] = key;
    else keys.push(key);
  };
  const inside = (view, p) => {
    const vw = W / view.scale;
    const vh = H / view.scale;
    return Math.abs(p.x - view.x) < vw * 0.35 && Math.abs(p.y - view.y) < vh * 0.35;
  };
  groups.forEach((g, gi) => {
    const first = g[0];
    const scale = Math.max(...g.map(p => p.scale));
    const arrive = Math.max(0, first.t - o.lead);
    const last = keys.at(-1);
    const zoomedIn = last.scale > 1.001;
    // in: from wherever the view is (home, or the previous group's view when it stayed in)
    push({ t: Math.max(last.t, arrive - (zoomedIn ? Math.min(o.pan * 1.3, arrive - last.t) : o.zoomIn)), scale: last.scale, x: last.x, y: last.y });
    let view = { scale, ...clampCentre(first.x, first.y, scale, W, H) };
    push({ t: arrive, ...view });
    for (const p of g.slice(1)) {
      if (inside(view, p)) continue;
      const at = Math.max(keys.at(-1).t, p.t - o.lead);
      const panTime = Math.min(o.pan, Math.max(0.15, (at - keys.at(-1).t) * 0.8));
      push({ t: at - panTime, ...view });
      view = { scale, ...clampCentre(p.x, p.y, scale, W, H) };
      push({ t: at, ...view });
    }
    const holdUntil = g.at(-1).t + o.hold;
    const next = groups[gi + 1];
    // stay in and pan to the next group when it comes soon after; otherwise zoom out
    if (next && next[0].t - o.lead - o.zoomIn - holdUntil < o.zoomOut + 0.4) return;
    // out after the hold; near the end, out in time to finish with the video
    const outAt = Math.max(keys.at(-1).t, Math.min(holdUntil, duration - o.zoomOut));
    push({ t: outAt, ...view });
    push({ t: Math.min(duration, outAt + o.zoomOut), ...home });
  });
  if (keys.at(-1).t < duration) push({ ...keys.at(-1), t: duration });
  return keys;
}

/** The stretches where the view moves (zoom or pan): they play at normal speed, never sped up. */
export function moves(keys) {
  const out = [];
  for (let i = 1; i < keys.length; i++) {
    const [a, b] = [keys[i - 1], keys[i]];
    if (a.scale !== b.scale || a.x !== b.x || a.y !== b.y) out.push([a.t, b.t]);
  }
  return out;
}

/** Spans minus other spans. */
export function subtract(spans, minus) {
  let out = spans.map(s => [...s]);
  for (const [m0, m1] of minus) {
    out = out.flatMap(([a, b]) => (m1 <= a || m0 >= b ? [[a, b]] : [[a, Math.max(a, m0)], [Math.min(b, m1), b]].filter(([x, y]) => y - x > 0)));
  }
  return out;
}

/**
 * What plays: [{ from, to, speed }] after the trims, the idle speed-ups and the cut markers. `steady`:
 * stretches that keep normal speed (the zoom moves).
 */
export function segments(events, opts = {}, still = null, steady = []) {
  const o = { ...DEFAULTS, ...opts };
  const D = events.duration;
  const act = activity(events, o);
  let lo = 0;
  let hi = D;
  if (o.trim) {
    const visual = still ? gaps(still.map(([a, b]) => [a, Math.min(b, D)]), D, 0.05) : [];
    const all = [...act, ...visual].sort((a, b) => a[0] - b[0]);
    if (all.length) {
      lo = Math.max(0, all[0][0] - o.head);
      hi = Math.min(D, Math.max(...all.map(s => s[1])) + o.tail);
      if (hi - lo < 1) [lo, hi] = [0, D];
    }
  }
  // cut markers: drop from the previous marker (or the start) to the cut
  const drops = [];
  const markers = [...(events.markers ?? [])].sort((a, b) => a.t - b.t);
  markers.forEach((m, i) => {
    if (m.kind === 'cut') drops.push([i ? markers[i - 1].t : lo, m.t]);
  });
  let idle = [];
  if (o.idleSpeed && o.idleSpeed !== 1) {
    const inputIdle = gaps(act, D, o.idle);
    const stillIdle = still ? still.map(([a, b]) => [a, Math.min(b, D)]).filter(([a, b]) => b - a >= o.idle) : null;
    if (o.idleMode === 'input' || !stillIdle) idle = inputIdle;
    else if (o.idleMode === 'still') idle = stillIdle;
    else idle = intersect(inputIdle, stillIdle).filter(([a, b]) => b - a >= o.idle);
    // the head and tail kept around the action play at normal speed
    idle = subtract(idle.map(([a, b]) => [Math.max(a + o.keep, lo), Math.min(b - o.keep, hi)]), steady).filter(([a, b]) => b - a >= 0.3);
  }
  // walk the timeline: normal speed, idle speed, or dropped
  const cutsAt = new Set();
  for (const [a, b] of [...idle, ...drops]) cutsAt.add(round(a)).add(round(b));
  const marks = [lo, hi, ...cutsAt].filter(t => t >= lo && t <= hi).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < marks.length - 1; i++) {
    const [a, b] = [marks[i], marks[i + 1]];
    if (b - a < 0.01) continue;
    const mid = (a + b) / 2;
    if (drops.some(([x, y]) => mid > x && mid < y)) continue;
    const isIdle = idle.some(([x, y]) => mid > x && mid < y);
    const speed = isIdle ? (o.idleSpeed === 'cut' ? 0 : Number(o.idleSpeed)) : 1;
    if (speed === 0) continue;
    const prev = out.at(-1);
    if (prev && prev.speed === speed && Math.abs(prev.to - a) < 0.01) prev.to = round(b);
    else out.push({ from: round(a), to: round(b), speed, ...(isIdle && { why: 'idle' }) });
  }
  return out;
}

export const outLength = segs => round(segs.reduce((n, s) => n + (s.to - s.from) / s.speed, 0));

/** The edit's time (seconds) of a moment of the recording, or null when it was cut. */
export function toOut(segs, t) {
  let at = 0;
  for (const s of segs) {
    if (t >= s.from && t <= s.to) return round(at + (t - s.from) / s.speed);
    at += (s.to - s.from) / s.speed;
  }
  return null;
}

/** The recording's moment shown at the edit's time t. */
export function toSource(segs, t) {
  let at = 0;
  for (const s of segs) {
    const len = (s.to - s.from) / s.speed;
    if (t <= at + len) return s.from + (t - at) * s.speed;
    at += len;
  }
  return segs.at(-1)?.to ?? 0;
}

const ease = p => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);

/** A cursor path to draw: the recorded one smoothed, or one that travels between the click points. */
export function cursorPath(events, points, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const D = events.duration;
  const step = 1 / o.fps;
  const cur = (events.cursor ?? []).filter(([, x, y]) => x > -1e4 && y > -1e4);
  const { width: FW, height: FH } = events.size;
  const inFrame = ([, x, y]) => x >= 0 && y >= 0 && x <= FW && y <= FH;
  const realClicks = (events.clicks ?? []).filter(c => c.inside !== false).length;
  const markedClicks = points.filter(p => p.from === 'click' || p.from === 'point').length;
  // auto: the recorded cursor when the real mouse did the work in the frame; the marked points when the
  // screen was driven by code (a browser over CDP moves no real cursor, and the real one may be elsewhere)
  const mode = o.cursor === 'auto' || !o.cursor
    ? (realClicks || (!markedClicks && cur.filter(inFrame).length > 3) ? 'recorded' : 'synthetic')
    : o.cursor;
  if (mode === 'none') return { kind: 'none', path: [] };
  const real = mode === 'recorded' && cur.length > 0;
  const out = [];
  if (real) {
    // the position held between samples, then a light smoothing so the drawn cursor glides
    let j = 0;
    let sx = cur[0][1];
    let sy = cur[0][2];
    for (let t = 0; t <= D + 1e-6; t += step) {
      while (j + 1 < cur.length && cur[j + 1][0] <= t) j++;
      const [, x, y] = cur[j];
      sx += (x - sx) * 0.55;
      sy += (y - sy) * 0.55;
      out.push([round(t), round(sx, 1), round(sy, 1)]);
    }
    return { kind: 'recorded', path: out };
  }
  const clicks = points.filter(p => p.from === 'click' || p.from === 'point');
  if (!clicks.length) return { kind: 'none', path: [] };
  const { width: W, height: H } = events.size;
  const start = { t: 0, x: clamp(clicks[0].x + W * 0.12, 0, W * 0.95), y: clamp(clicks[0].y + H * 0.15, 0, H * 0.95) };
  const stops = [start, ...clicks];
  for (let t = 0; t <= D + 1e-6; t += step) {
    let i = stops.findIndex((s, k) => k > 0 && s.t >= t);
    if (i < 0) i = stops.length; // after the last click: stay
    const to = stops[Math.min(i, stops.length - 1)];
    const from = stops[Math.max(0, i - 1)];
    let x = to.x;
    let y = to.y;
    if (i < stops.length && i > 0) {
      const arrive = to.t - 0.08;
      const travel = Math.min(0.75, Math.max(0.2, (to.t - from.t) * 0.6));
      const p = clamp((t - (arrive - travel)) / travel, 0, 1);
      // a slight arc, as a hand moves
      const e = ease(p);
      const bend = Math.sin(Math.PI * e) * Math.min(60, Math.hypot(to.x - from.x, to.y - from.y) * 0.08);
      x = from.x + (to.x - from.x) * e;
      y = from.y + (to.y - from.y) * e - bend;
    }
    out.push([round(t), round(x, 1), round(y, 1)]);
  }
  return { kind: 'synthetic', path: out };
}

export function planEdit(events, opts = {}, still = null) {
  const o = { ...DEFAULTS, ...opts };
  if (events.schema !== 'mac-recorder.events/v1') throw new Error('Not a mac-recorder events log (schema mac-recorder.events/v1).');
  const points = focusPoints(events, o);
  const zoom = zoomKeys(points, events.size, events.duration, o);
  const segs = segments(events, o, still, moves(zoom));
  const showClicks = points.filter(p => p.from !== 'focus').map(p => ({ t: round(p.t), x: p.x, y: p.y }));
  const cursor = events.cursorShown ? { kind: 'in-video', path: [] } : cursorPath(events, points, o);
  return {
    schema: 'mac-recorder.edit/v1',
    video: events.video,
    source: { width: events.size.width, height: events.size.height, duration: events.duration },
    fps: o.fps,
    duration: outLength(segs),
    segments: segs,
    zoom,
    clicks: showClicks,
    cursor: cursor.path,
    cursorKind: cursor.kind,
    drawCursor: cursor.kind === 'recorded' || cursor.kind === 'synthetic',
    captions: o.captions,
    markers: (events.markers ?? []).filter(m => m.kind !== 'cut').map(m => ({ t: m.t, name: m.name, ...(m.note && { note: m.note }), out: toOut(segs, m.t) })),
    options: Object.fromEntries(Object.entries(o).filter(([k]) => k in DEFAULTS)),
  };
}

// ---------------------------------------------------------------- the command line

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const file = args.find(a => !a.startsWith('--'));
  if (!file) {
    console.error('node plan-edit.mjs <name>.events.json [--out plan.json] [--zoom 1.8] [--idle 1.5] [--idle-speed 4|cut] [--idle-mode both|input|still] [--cursor auto|recorded|synthetic|none] [--no-trim] [--no-still] [--captions]');
    process.exit(64);
  }
  const val = k => {
    const i = args.findIndex(a => a === `--${k}` || a.startsWith(`--${k}=`));
    if (i < 0) return undefined;
    return args[i].includes('=') ? args[i].split('=').slice(1).join('=') : args[i + 1];
  };
  const events = JSON.parse(fs.readFileSync(file, 'utf8'));
  const opts = {};
  for (const [k, name] of [['zoom', 'zoom'], ['idle', 'idle'], ['hold', 'hold'], ['groupGap', 'group-gap'], ['fps', 'fps']]) if (val(name) !== undefined) opts[k] = Number(val(name));
  if (val('idle-speed') !== undefined) opts.idleSpeed = val('idle-speed') === 'cut' ? 'cut' : Number(val('idle-speed'));
  if (val('idle-mode')) opts.idleMode = val('idle-mode');
  if (val('cursor')) opts.cursor = val('cursor');
  if (args.includes('--no-trim')) opts.trim = false;
  if (args.includes('--captions')) opts.captions = true;
  const video = path.join(path.dirname(file), events.video);
  const still = args.includes('--no-still') ? null : stillSpans(video, opts.idle ?? DEFAULTS.idle);
  const plan = planEdit(events, opts, still);
  const out = val('out') ?? file.replace(/\.events\.json$/, '.edit.json');
  fs.writeFileSync(out, `${JSON.stringify(plan, null, 2)}\n`);
  const fast = plan.segments.filter(s => s.speed !== 1);
  console.log(`✔ ${out}`);
  console.log(`  ${events.duration.toFixed(1)} s recorded → ${plan.duration.toFixed(1)} s edit · ${plan.segments.length} segments (${fast.length} sped up${still ? '' : ', no ffmpeg: input only'}) · ${plan.zoom.length} zoom keys · ${plan.clicks.length} clicks · cursor ${plan.cursorKind}`);
}
