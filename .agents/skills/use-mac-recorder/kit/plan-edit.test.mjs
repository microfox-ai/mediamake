/** node --test kit/  (no video or ffmpeg needed: these use made-up events) */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activity, clampCentre, cursorPath, focusPoints, gaps, intersect, moves, outLength, planEdit, segments, subtract, toOut, toSource, zoomKeys } from './plan-edit.mjs';

const size = { width: 2000, height: 1200 };
const ev = (over = {}) => ({
  schema: 'mac-recorder.events/v1', video: 'v.mov', size, fps: 30, duration: 20, cursorShown: true,
  cursor: [[0, 1000, 600]], clicks: [], scrolls: [], markers: [], ...over,
});

test('gaps and intersect', () => {
  assert.deepEqual(gaps([[2, 3], [3.5, 4]], 10, 1), [[0, 2], [4, 10]]);
  assert.deepEqual(gaps([], 5, 1), [[0, 5]]);
  assert.deepEqual(intersect([[0, 5]], [[1, 2], [4, 9]]), [[1, 2], [4, 5]]);
});

test('activity counts cursor moves past the tolerance only', () => {
  const spans = activity(ev({ cursor: [[0, 0, 0], [1, 2, 2], [2, 100, 0]] }));
  assert.deepEqual(spans, [[1, 2]]);
});

test('the centre stays inside the frame', () => {
  assert.deepEqual(clampCentre(0, 0, 2, 2000, 1200), { x: 500, y: 300 });
  assert.deepEqual(clampCentre(1000, 600, 1, 2000, 1200), { x: 1000, y: 600 });
});

test('one click: zoom in before it, hold, zoom out', () => {
  const e = ev({ clicks: [{ t: 5, x: 400, y: 300 }] });
  const keys = zoomKeys(focusPoints(e), size, 20);
  assert.deepEqual(keys[0], { t: 0, scale: 1, x: 1000, y: 600 });
  const peak = keys.find(k => k.scale > 1);
  assert.equal(peak.scale, 1.8);
  assert.ok(peak.t <= 5 && peak.t >= 4.8, 'in just before the click');
  assert.ok(keys.some(k => k.scale === 1 && k.t > 6.5 && k.t < 8), 'out after the hold');
  assert.equal(keys.at(-1).t, 20);
  for (let i = 1; i < keys.length; i++) assert.ok(keys[i].t >= keys[i - 1].t, 'keys in order');
  // the view's centre is clamped: at 1.8× the view is 1111×667, so x ≥ 555.6
  assert.ok(peak.x >= 2000 / 1.8 / 2 - 0.1);
});

test('close clicks share a zoom and pan; far ones zoom out between', () => {
  const near = ev({ clicks: [{ t: 4, x: 300, y: 300 }, { t: 5.5, x: 1700, y: 900 }] });
  const k1 = zoomKeys(focusPoints(near), size, 20);
  const between = k1.filter(k => k.t > 4 && k.t < 5.5);
  assert.ok(between.every(k => k.scale > 1), 'stays in between close clicks');
  assert.ok(k1.some(k => k.t > 4 && k.x > 1200), 'pans to the second click');
  const far = ev({ clicks: [{ t: 3, x: 300, y: 300 }, { t: 14, x: 1700, y: 900 }] });
  const k2 = zoomKeys(focusPoints(far), size, 20);
  assert.ok(k2.some(k => k.scale === 1 && k.t > 5 && k.t < 12), 'out between far clicks');
});

test('a click inside the view needs no pan', () => {
  const e = ev({ clicks: [{ t: 4, x: 1000, y: 600 }, { t: 5, x: 1050, y: 620 }] });
  const keys = zoomKeys(focusPoints(e), size, 20);
  const xs = new Set(keys.filter(k => k.scale > 1).map(k => k.x));
  assert.equal(xs.size, 1);
});

test('clicks outside the frame are not zoomed on; a focus rect fits', () => {
  const e = ev({ clicks: [{ t: 2, x: -50, y: 10 }], markers: [{ t: 6, name: 'Look', kind: 'focus', rect: { x: 100, y: 100, width: 500, height: 300 } }] });
  const pts = focusPoints(e);
  assert.equal(pts.length, 1);
  assert.equal(pts[0].from, 'focus');
  assert.ok(pts[0].scale > 1.8, 'a small rect zooms further than a click');
});

test('a marker with a point counts as a click, and a duplicate of a real click is dropped', () => {
  const e = ev({ clicks: [{ t: 3, x: 500, y: 500 }], markers: [{ t: 3.1, name: 'x', kind: 'click', x: 505, y: 498 }, { t: 8, name: 'y', kind: 'click', x: 900, y: 200 }] });
  const pts = focusPoints(e);
  assert.deepEqual(pts.map(p => p.t), [3, 8]);
});

test('idle stretches are sped up, the head and tail trimmed', () => {
  const e = ev({ duration: 30, clicks: [{ t: 5, up: 5.1, x: 500, y: 500 }, { t: 20, up: 20.1, x: 600, y: 500 }] });
  const segs = segments(e, { idleMode: 'input' });
  assert.equal(segs[0].from, 4.4, 'head trimmed to 0.6 s before the first click');
  assert.equal(segs.at(-1).to, 21.6, 'tail 1.5 s after the last');
  const idle = segs.find(s => s.speed === 4);
  assert.ok(idle && idle.from > 5 && idle.to < 20, 'the gap between clicks is sped up');
  assert.ok(outLength(segs) < 21.6 - 4.4);
});

test('with a still map, a stretch where the screen moves keeps its speed', () => {
  const e = ev({ duration: 30, clicks: [{ t: 5, x: 500, y: 500 }, { t: 20, x: 600, y: 500 }] });
  const still = [[6, 10], [14, 19]]; // 10–14: something moved (a page loading)
  const segs = segments(e, {}, still);
  const fast = segs.filter(s => s.speed > 1);
  assert.equal(fast.length, 2);
  assert.ok(fast.every(s => s.to <= 10 || s.from >= 14));
  assert.ok(segs.some(s => s.speed === 1 && s.from <= 10 && s.to >= 14));
});

test('idle cut and cut markers drop time', () => {
  const e = ev({ duration: 30, clicks: [{ t: 5, x: 500, y: 500 }, { t: 20, x: 600, y: 500 }] });
  const cut = segments(e, { idleMode: 'input', idleSpeed: 'cut' });
  assert.ok(cut.every(s => s.speed === 1));
  assert.ok(outLength(cut) < 6);
  const m = ev({ duration: 12, clicks: [{ t: 1, x: 5, y: 5 }, { t: 11, x: 5, y: 5 }], markers: [{ t: 3, name: 'a' }, { t: 7, name: 'retake', kind: 'cut' }] });
  const segs = segments(m, { idleSpeed: 1 });
  assert.equal(toOut(segs, 5), null, 'between the previous marker and the cut is gone');
  assert.ok(toOut(segs, 8) !== null);
});

test('edit time and recording time map both ways', () => {
  const segs = [{ from: 1, to: 3, speed: 1 }, { from: 3, to: 7, speed: 4 }, { from: 7, to: 9, speed: 1 }];
  assert.equal(outLength(segs), 5);
  assert.equal(toOut(segs, 1), 0);
  assert.equal(toOut(segs, 5), 2.5);
  assert.equal(toOut(segs, 8), 4);
  assert.equal(toOut(segs, 0.5), null);
  assert.equal(toSource(segs, 2.5), 5);
  assert.equal(toSource(segs, 4), 8);
  for (const t of [0.3, 1.7, 2.2, 3.9]) assert.ok(Math.abs(toOut(segs, toSource(segs, t)) - t) < 1e-9);
});

test('a drawn cursor: smoothed from the log, or made from the clicks', () => {
  const recorded = cursorPath(ev({ duration: 2, cursor: [[0, 0, 0], [1, 1000, 500], [1.5, 1200, 600]], clicks: [{ t: 1.2, x: 1000, y: 500 }] }), []);
  assert.equal(recorded.kind, 'recorded');
  assert.equal(recorded.path.length, 61);
  assert.ok(recorded.path.at(-1)[1] > 1150, 'it reaches the last position');
  const e = ev({ duration: 6, cursor: [[0, 10, 10]], clicks: [] , markers: [{ t: 2, name: 'a', kind: 'click', x: 400, y: 300 }, { t: 4, name: 'b', kind: 'click', x: 1400, y: 800 }] });
  const syn = cursorPath(e, focusPoints(e));
  assert.equal(syn.kind, 'synthetic');
  const at = t => syn.path.reduce((best, p) => (Math.abs(p[0] - t) < Math.abs(best[0] - t) ? p : best));
  assert.deepEqual(at(2).slice(1), [400, 300], 'on the first click when it lands');
  assert.deepEqual(at(4).slice(1), [1400, 800], 'on the second');
  assert.ok(at(3.5)[1] > 400 && at(3.5)[1] < 1400, 'travelling between');
});

test('planEdit puts it together', () => {
  const e = ev({ duration: 15, cursorShown: false, clicks: [{ t: 3, up: 3.1, x: 700, y: 400 }], markers: [{ t: 2.8, name: 'Open it' }], cursor: [[0, 600, 400], [2.9, 700, 400]] });
  const plan = planEdit(e, { captions: true }, [[4, 15]]);
  assert.equal(plan.schema, 'mac-recorder.edit/v1');
  assert.equal(plan.drawCursor, true);
  assert.equal(plan.cursorKind, 'recorded');
  assert.equal(plan.markers[0].name, 'Open it');
  assert.equal(plan.markers[0].out, toOut(plan.segments, 2.8));
  assert.equal(plan.clicks.length, 1);
  assert.ok(plan.duration < 15);
  assert.throws(() => planEdit({ schema: 'other' }), /mac-recorder events/);
});

test('auto cursor: code-driven marks win over a real mouse moving elsewhere', () => {
  const e = ev({ duration: 6, cursorShown: false, cursor: [[0, 10, 10], [1, 300, 300], [2, 900, 500], [3, 1500, 700]], markers: [{ t: 2, name: 'a', kind: 'click', x: 400, y: 300 }] });
  assert.equal(cursorPath(e, focusPoints(e)).kind, 'synthetic');
  assert.equal(cursorPath(e, focusPoints(e), { cursor: 'recorded' }).kind, 'recorded');
  assert.equal(cursorPath(e, focusPoints(e), { cursor: 'none' }).kind, 'none');
  const real = ev({ duration: 6, cursorShown: false, cursor: [[0, 10, 10], [1, 300, 300]], clicks: [{ t: 1, x: 300, y: 300, inside: true }] });
  assert.equal(cursorPath(real, focusPoints(real)).kind, 'recorded');
});

test('zoom moves play at normal speed, even inside an idle stretch', () => {
  assert.deepEqual(subtract([[0, 10]], [[2, 3], [5, 6]]), [[0, 2], [3, 5], [6, 10]]);
  const e = ev({ duration: 30, clicks: [{ t: 5, x: 500, y: 500 }, { t: 20, x: 600, y: 500 }] });
  const keys = zoomKeys(focusPoints(e), size, 30);
  const segs = segments(e, { idleMode: 'input' }, null, moves(keys));
  for (const [a, b] of moves(keys)) {
    const mid = (a + b) / 2;
    const seg = segs.find(s => mid >= s.from && mid <= s.to);
    if (seg) assert.equal(seg.speed, 1, `the move ${a}–${b} is at normal speed`);
  }
});

test('a click near the end: hold, then out by the end', () => {
  const e = ev({ duration: 10, clicks: [{ t: 8.5, x: 400, y: 300 }] });
  const keys = zoomKeys(focusPoints(e), size, 10);
  const inAt = keys.find(k => k.scale > 1).t;
  const outStart = keys.filter(k => k.scale > 1).at(-1).t;
  assert.ok(outStart > inAt, 'it holds before going out');
  assert.equal(keys.at(-1).t, 10);
  assert.equal(keys.at(-1).scale, 1);
});
