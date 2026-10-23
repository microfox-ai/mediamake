import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { selectCues } from './beatmap/cues';
import { normalizeBeatmap } from './beatmap/normalize';
import type { Beatmap } from './beatmap/types';
import { mediaForShot, montageFrame, planShots, rotationFor, shotCamera } from './beat-montage-math';
import { cameraAt, eccentricZoomAt, originForBeat } from './image-beat-math';

const map: Beatmap = {
  version: 1,
  duration: 10,
  bpm: 120,
  beatsPerBar: 4,
  beats: [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6],
  beatStrength: [1, 0.5, 0.8, 0.5, 1, 0.5, 0.8, 0.5, 1, 0.5, 0.8, 0.5],
  downbeats: [0.5, 2.5, 4.5],
  onsets: {
    accent: [
      [0.5, 0.9],
      [0.62, 0.95],
      [1.5, 0.2],
      [2.5, 1],
      [5.5, 0.8],
    ],
    kick: [[0.5, 1]],
  },
};

describe('selectCues', () => {
  it('keeps the stronger of two close hits and drops weak ones', () => {
    const cues = selectCues(map, { on: 'accent', threshold: 0.3, minGapSec: 0.25 });
    assert.deepEqual(cues.map((c) => c.t), [0.62, 2.5, 5.5]);
    assert.equal(cues[1].downbeat, true);
  });

  it('applies the lead and every-n-th', () => {
    const cues = selectCues(map, { on: 'beats', threshold: 0, minGapSec: 0, every: 4, leadSec: 0.1 });
    assert.deepEqual(cues.map((c) => +c.t.toFixed(2)), [0.4, 2.4, 4.4]);
  });

  it('fills long gaps from the grid', () => {
    const cues = selectCues(map, { on: 'accent', threshold: 0.3, minGapSec: 0.25, maxGapSec: 1.2 });
    const times = cues.map((c) => c.t);
    for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] <= 1.2 + 1e-9, `gap before ${times[i]}`);
    assert.ok(times.includes(3.5) && times.includes(4.5));
  });
});

describe('normalizeBeatmap', () => {
  it('reads a lyric-video audio.json', () => {
    const m = normalizeBeatmap({
      duration: 4,
      bpm: 120,
      beats_per_bar: 4,
      beats: [0.5, 1],
      beat_strength: [1, 0.5],
      downbeats: [0.5],
      onsets: { kick: [[0.49, 0.8]], snare: [[1, 0.6]], vocal: [[0.7, 0.3]] },
      envelopes: { rms: [0, 0.5, 1] },
      fps: 100,
    });
    assert.equal(m?.source, 'pipeline');
    assert.deepEqual(m?.beatStrength, [1, 0.5]);
    assert.deepEqual(m?.onsets.accent, [[0.49, 0.8], [1, 0.6]]);
    assert.equal(m?.energy?.fps, 100);
  });

  it('rejects junk', () => {
    assert.equal(normalizeBeatmap('nope'), null);
    assert.equal(normalizeBeatmap({ beats: [] }), null);
  });
});

describe('planShots', () => {
  const cues = selectCues(map, { on: 'accent', threshold: 0.3, minGapSec: 0.25 });

  it('opens a shot on every cue, in atom time', () => {
    const shots = planShots(cues, { offsetSec: 0.5, durationSec: 6, mediaCount: 3 });
    assert.deepEqual(
      shots.map((s) => [+s.start.toFixed(2), +s.end.toFixed(2), s.media]),
      [
        [0, 0.12, 0],
        [0.12, 2, 1],
        [2, 5, 2],
        [5, 6, 0],
      ],
    );
  });

  it('holds black until the first cue when asked', () => {
    const shots = planShots(cues, { offsetSec: 0, durationSec: 6, mediaCount: 2, startOnFirstCue: true });
    assert.equal(shots[0].media, -1);
    assert.equal(shots[1].media, 0);
  });

  it('shuffles without repeating an item back to back', () => {
    let prev = -1;
    for (let k = 0; k < 60; k++) {
      const m = mediaForShot(k, 4, 'shuffle', 3);
      assert.notEqual(m, prev);
      prev = m;
    }
  });
});

describe('montageFrame', () => {
  const shots = planShots(selectCues(map, { on: 'beats', threshold: 0, minGapSec: 0 }), {
    offsetSec: 0,
    durationSec: 6,
    mediaCount: 2,
  });

  it('drifts inside the crop', () => {
    const { scale, tx, ty } = shotCamera(shots[2], shots[2].end, { driftScale: 0.06, driftPan: 0.5 });
    assert.ok(Math.abs(scale - 1.1) < 1e-9);
    assert.ok(Math.hypot(tx, ty) <= ((scale - 1) / 2) * 100 * 0.5 + 1e-9);
  });

  it('dissolve hands over at the cut with no jump', () => {
    const cut = shots[3].start;
    const before = montageFrame(shots, cut - 1e-6, { transition: 'dissolve', transitionSec: 0.2 });
    const after = montageFrame(shots, cut, { transition: 'dissolve', transitionSec: 0.2 });
    assert.equal(before.layers.length, 2);
    assert.ok(Math.abs(before.layers[1].opacity - after.layers[1].opacity) < 1e-3);
    assert.equal(before.layers[1].shot.index, after.layers[1].shot.index);
  });

  it('whip slides both shots as one strip across the cut', () => {
    const cut = shots[3].start;
    for (const t of [cut - 0.05, cut + 0.05]) {
      const f = montageFrame(shots, t, { transition: 'whip', transitionSec: 0.2, driftPan: 0 });
      assert.equal(f.layers.length, 2);
      const [a, b] = f.layers;
      assert.ok(Math.abs(Math.hypot(a.tx - b.tx, a.ty - b.ty) - 100) < 1e-9);
    }
  });

  it('flashes on the cut and not before it', () => {
    const cut = shots[3].start;
    assert.equal(montageFrame(shots, cut - 0.01, { transition: 'flash' }).flash, 0);
    assert.ok(montageFrame(shots, cut, { transition: 'flash' }).flash > 0.3);
  });

  it('turns landscape media in a portrait frame', () => {
    assert.equal(rotationFor('auto', 16 / 9, 9 / 16), 90);
    assert.equal(rotationFor('auto', 9 / 16, 9 / 16), 0);
    assert.equal(rotationFor('ccw', 1, 1), -90);
  });
});

describe('eccentricZoomAt with cues', () => {
  it('sizes punches by strength and boosts downbeats', () => {
    const opts = { zoomIntensity: 0.4, baseScale: 1, punchSec: 0.1, settleSec: 0.4, dynamics: 1, downbeatBoost: 0.5 };
    const soft = eccentricZoomAt(1.1, [{ t: 1, strength: 0.25 }], opts);
    const hard = eccentricZoomAt(1.1, [{ t: 1, strength: 1, downbeat: true }], opts);
    assert.ok(Math.abs(soft.scale - 1.1) < 1e-6);
    assert.ok(Math.abs(hard.scale - 1.6) < 1e-6);
    assert.ok(hard.punch > soft.punch);
  });

  it('starts a beat after a settled one from that rest crop', () => {
    const opts = { punchSec: 0.1, settleSec: 0.3, baseScale: 1.1 };
    // Beat 0 settles by 0.9; at 1.5 (beat 1's start) the camera rests on beat 0's origin.
    const z = eccentricZoomAt(1.5, [0.5, 1.5, 1.6], opts);
    const rest = cameraAt(originForBeat(0, 0.7), 1.1);
    assert.ok(Math.abs(z.tx - rest.tx) < 1e-9 && Math.abs(z.ty - rest.ty) < 1e-9);
    assert.equal(z.punch, 1);
  });

  it('tilts alternate punches', () => {
    const a = eccentricZoomAt(0.1, [0], { punchSec: 0.1, tilt: 4, dynamics: 0 });
    const b = eccentricZoomAt(1.1, [0, 1], { punchSec: 0.1, settleSec: 0.3, tilt: 4, dynamics: 0 });
    assert.ok(Math.abs(a.rotate - 4) < 1e-9);
    assert.ok(Math.abs(b.rotate + 4) < 1e-9);
  });
});
