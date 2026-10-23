import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { analyzeBeatmap } from './analyze';
import { RealFFT, medianFilter, percentile, resample } from './dsp';

const SR = 44100;

/** Drum-machine loop: kick on 1 and 3, snare on 2 and 4, closed hats on 8ths, a bass note on every beat. */
const drumLoop = (bpm: number, seconds: number, startSec = 0.3) => {
  const n = Math.floor(SR * seconds);
  const out = new Float32Array(n);
  const period = 60 / bpm;
  let seed = 1;
  const noise = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647 - 0.5;
  };
  const add = (t: number, len: number, f: (k: number) => number) => {
    const s = Math.round(t * SR);
    for (let k = 0; k < len && s + k < n; k++) out[s + k] += f(k);
  };
  const kicks: number[] = [];
  const snares: number[] = [];
  for (let i = 0, t = startSec; t < seconds - 0.3; i++, t += period) {
    if (i % 2 === 0) {
      kicks.push(t);
      add(t, 6000, (k) => 0.9 * Math.exp(-k / 2500) * Math.sin(2 * Math.PI * (55 + 80 * Math.exp(-k / 400)) * (k / SR)) + 0.3 * noise() * Math.exp(-k / 60));
    } else {
      snares.push(t);
      add(t, 5000, (k) => 0.45 * noise() * Math.exp(-k / 1500) + 0.2 * Math.sin(2 * Math.PI * 190 * (k / SR)) * Math.exp(-k / 800));
    }
    for (const h of [0, 0.5]) add(t + h * period, 1500, (k) => 0.12 * noise() * Math.exp(-k / 200));
    add(t, Math.round(period * SR * 0.9), (k) => 0.15 * Math.sin(2 * Math.PI * 82.4 * (k / SR)));
  }
  return { samples: out, kicks, snares, period };
};

const nearest = (list: number[], t: number) =>
  list.reduce((best, x) => (Math.abs(x - t) < Math.abs(best - t) ? x : best), Infinity);

describe('RealFFT', () => {
  it('matches a direct DFT', () => {
    const size = 64;
    const x = Array.from({ length: size }, (_, i) => Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1) + (i % 5) * 0.1);
    const out = new Float32Array(size / 2 + 1);
    new RealFFT(size).power(x, out);
    for (let k = 0; k <= size / 2; k++) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < size; n++) {
        re += x[n] * Math.cos((2 * Math.PI * k * n) / size);
        im -= x[n] * Math.sin((2 * Math.PI * k * n) / size);
      }
      assert.ok(Math.abs(out[k] - (re * re + im * im)) < 1e-3 * Math.max(1, re * re + im * im), `bin ${k}`);
    }
  });
});

describe('medianFilter', () => {
  it('takes the running median along rows and along columns', () => {
    const data = Float32Array.from([1, 9, 2, 8, 3, 7, 4, 6, 5]);
    // 3 rows x 3 cols, filter each column over rows with size 3 (edges repeat).
    assert.deepEqual(Array.from(medianFilter(data, 3, 3, 3, true)), [1, 9, 2, 4, 6, 5, 4, 6, 5]);
    assert.deepEqual(Array.from(medianFilter(data, 3, 3, 3, false)), [1, 2, 2, 8, 7, 7, 4, 5, 5]);
  });

  it('percentile interpolates', () => {
    assert.equal(percentile([0, 10], 50), 5);
  });
});

describe('analyzeBeatmap', () => {
  it('returns an empty map for silence', () => {
    const map = analyzeBeatmap([new Float32Array(SR * 3)], SR);
    assert.equal(map.beats.length, 0);
    assert.equal(map.onsets.kick?.length, 0);
  });

  it('finds tempo, beats on the attacks, downbeats and drum hits', () => {
    const loop = drumLoop(120, 20);
    const map = analyzeBeatmap([loop.samples, loop.samples], SR, { source: 'browser' });
    assert.ok(Math.abs(map.bpm - 120) < 0.5, `bpm ${map.bpm}`);
    const attacks = [...loop.kicks, ...loop.snares].sort((a, b) => a - b);
    const inner = map.beats.filter((t) => t > 1 && t < 19);
    assert.ok(inner.length >= 34, `beats ${inner.length}`);
    for (const t of inner) {
      assert.ok(Math.abs(nearest(attacks, t) - t) <= 0.012, `beat ${t} vs attack ${nearest(attacks, t)}`);
    }
    // Kicks fall on 1 and 3; with the snare on 2 and 4, beat 1 is a kick.
    for (const t of map.downbeats.filter((x) => x > 1 && x < 19)) {
      assert.ok(Math.abs(nearest(loop.kicks, t) - t) <= 0.012, `downbeat ${t} is not on a kick`);
    }
    const kicks = (map.onsets.kick ?? []).filter(([, s]) => s > 0.3).map(([t]) => t);
    for (const k of loop.kicks.filter((x) => x > 1 && x < 19)) {
      assert.ok(Math.abs(nearest(kicks, k) - k) <= 0.012, `kick ${k} missing (nearest ${nearest(kicks, k)})`);
    }
    const snares = (map.onsets.snare ?? []).filter(([, s]) => s > 0.3).map(([t]) => t);
    for (const s of loop.snares.filter((x) => x > 1 && x < 19)) {
      assert.ok(Math.abs(nearest(snares, s) - s) <= 0.012, `snare ${s} missing`);
    }
    assert.ok((map.energy?.values.length ?? 0) > 380);
  });

  it('gives the same beatmap for 44.1 and 48 kHz decodes', () => {
    const loop = drumLoop(110, 12);
    const at44 = analyzeBeatmap([loop.samples], SR);
    const at48 = analyzeBeatmap([resample(loop.samples, SR, 48000).samples], 48000);
    assert.equal(at48.beats.length, at44.beats.length);
    at44.beats.forEach((t, i) => assert.ok(Math.abs(at48.beats[i] - t) <= 0.003, `beat ${i}: ${t} vs ${at48.beats[i]}`));
    assert.deepEqual(at48.downbeats.length, at44.downbeats.length);
  });

  it('keeps one phase through a tempo drift', () => {
    // 100 -> 104 bpm over 40 s.
    const n = SR * 40;
    const out = new Float32Array(n);
    const times: number[] = [];
    let t = 0.5;
    while (t < 39.5) {
      times.push(t);
      const s = Math.round(t * SR);
      for (let k = 0; k < 4000 && s + k < n; k++) {
        out[s + k] += 0.8 * Math.exp(-k / 1800) * Math.sin(2 * Math.PI * 60 * (k / SR)) + (k < 200 ? 0.3 * Math.sin(k * 1.3) : 0);
      }
      t += 60 / (100 + (4 * t) / 40);
    }
    const map = analyzeBeatmap([out], SR);
    const inner = map.beats.filter((x) => x > 2 && x < 38);
    let hits = 0;
    for (const b of inner) if (Math.abs(nearest(times, b) - b) <= 0.03) hits++;
    assert.ok(hits / inner.length > 0.95, `${hits}/${inner.length} beats on the clicks`);
  });
});
