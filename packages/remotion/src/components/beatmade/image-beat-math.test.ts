import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  detectBeats,
  easeIn,
  easeInOut,
  easeOut,
  eccentricZoomAt,
  findLastBeatIndex,
  originForBeat,
} from './image-beat-math';

const SAMPLE_RATE = 44100;

const clicks = (times: number[], durationSec: number) => {
  const n = Math.floor(SAMPLE_RATE * durationSec);
  const out = new Float32Array(n);
  for (const t of times) {
    const start = Math.floor(t * SAMPLE_RATE);
    for (let k = 0; k < 240 && start + k < n; k++) {
      out[start + k] = Math.exp(-k / 36);
    }
  }
  return out;
};

describe('detectBeats', () => {
  it('returns no beats for silence', () => {
    const silent = new Float32Array(SAMPLE_RATE);
    assert.deepEqual(detectBeats([silent], SAMPLE_RATE), []);
  });

  it('finds regularly spaced clicks', () => {
    const times = [0.5, 1.0, 1.5, 2.0];
    const beats = detectBeats([clicks(times, 2.6)], SAMPLE_RATE, {
      threshold: 0.1,
      sensitivity: 1,
      minGapSec: 0.15,
      audioProperty: 'waveform',
    });
    assert.ok(beats.length >= 3, `got ${beats.length} beats: ${beats.join(',')}`);
    for (const expected of times) {
      const nearest = beats.reduce((best, t) =>
        Math.abs(t - expected) < Math.abs(best - expected) ? t : best,
      );
      assert.ok(
        Math.abs(nearest - expected) < 0.05,
        `expected a beat near ${expected}, nearest was ${nearest}`,
      );
    }
  });

  it('respects minGapSec', () => {
    const beats = detectBeats([clicks([0.4, 0.48, 0.9], 1.4)], SAMPLE_RATE, {
      threshold: 0.05,
      sensitivity: 1,
      minGapSec: 0.3,
      audioProperty: 'waveform',
    });
    for (let i = 1; i < beats.length; i++) {
      assert.ok(beats[i] - beats[i - 1] >= 0.29);
    }
  });
});

describe('eccentricZoomAt', () => {
  const beats = [0.5, 1.2, 1.9];

  it('stays at baseScale before the first beat', () => {
    const zoom = eccentricZoomAt(0.1, beats, { baseScale: 1.1, zoomIntensity: 0.4 });
    assert.equal(zoom.scale, 1.1);
    assert.equal(zoom.beatIndex, -1);
  });

  it('punches toward peak scale on a beat', () => {
    const opts = {
      baseScale: 1.1,
      zoomIntensity: 0.4,
      punchSec: 0.2,
      settleSec: 0.4,
    };
    const atPeak = eccentricZoomAt(0.7, beats, opts);
    const later = eccentricZoomAt(1.15, beats, opts);
    assert.ok(atPeak.scale > 1.45, `punch scale ${atPeak.scale}`);
    assert.ok(later.scale < atPeak.scale, `settle ${later.scale} should drop`);
    assert.equal(atPeak.beatIndex, 0);
  });

  it('pans and zooms together without snapping at a new beat', () => {
    const opts = { originSpread: 0.8, punchSec: 0.2, settleSec: 0.4, zoomIntensity: 0.4 };
    const before = eccentricZoomAt(1.2 - 1 / 60, beats, opts);
    const atHit = eccentricZoomAt(1.2, beats, opts);
    const mid = eccentricZoomAt(1.3, beats, opts);
    assert.ok(Math.abs(atHit.tx - before.tx) < 0.05, `tx jumped ${before.tx} -> ${atHit.tx}`);
    assert.ok(Math.abs(atHit.ty - before.ty) < 0.05, `ty jumped ${before.ty} -> ${atHit.ty}`);
    assert.ok(Math.abs(atHit.scale - before.scale) < 0.01, `scale jumped ${before.scale} -> ${atHit.scale}`);
    assert.ok(
      Math.abs(mid.tx - atHit.tx) > 0.2 || Math.abs(mid.scale - atHit.scale) > 0.02,
      'pan and zoom should travel together after the hit',
    );
    assert.equal(findLastBeatIndex(beats, 1.2), 1);
  });

  it('moves the crop between consecutive beats', () => {
    const opts = { originSpread: 0.8, punchSec: 0.2, settleSec: 0.05 };
    const a = eccentricZoomAt(0.7, beats, opts);
    const b = eccentricZoomAt(1.4, beats, opts);
    assert.ok(
      Math.abs(a.tx - b.tx) > 1 || Math.abs(a.ty - b.ty) > 1,
      `cameras stayed put (${a.tx},${a.ty}) vs (${b.tx},${b.ty})`,
    );
  });
});

describe('bezier easing', () => {
  it('ease-in starts slower than linear and ease-out starts faster', () => {
    assert.ok(easeIn(0.25) < 0.25);
    assert.ok(easeOut(0.25) > 0.25);
    assert.ok(Math.abs(easeInOut(0.5) - 0.5) < 0.02);
    assert.equal(easeIn(0), 0);
    assert.equal(easeOut(1), 1);
  });
});

describe('originForBeat', () => {
  it('stays inside the frame', () => {
    for (let i = 0; i < 24; i++) {
      const o = originForBeat(i, 1);
      assert.ok(o.x >= 0 && o.x <= 100);
      assert.ok(o.y >= 0 && o.y <= 100);
    }
  });
});
