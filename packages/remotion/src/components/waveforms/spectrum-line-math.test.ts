import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  computeMagnitudeSpectrum,
  computeSmoothedSpectrum,
  computeSpectrumLineHeights,
  SpectrumLineOptions,
} from './spectrum-line-math';

const SAMPLE_RATE = 44100;

const sine = (frequency: number, amplitude: number, seconds = 1) => {
  const out = new Float32Array(SAMPLE_RATE * seconds);
  for (let i = 0; i < out.length; i++) {
    out[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE);
  }
  return out;
};

const lineOptions: SpectrumLineOptions = {
  pointCount: 200,
  minFrequency: 20,
  maxFrequency: 2200,
  frequencyScale: 'log',
  tilt: 0,
  gain: 1,
  noiseFloor: 0,
  sharpness: 1,
  spread: 0,
};

describe('computeMagnitudeSpectrum', () => {
  it('reads ~amplitude at the tone bin', () => {
    const fftSize = 8192;
    const spectrum = computeMagnitudeSpectrum([sine(440, 0.5)], SAMPLE_RATE / 2, fftSize);
    const bin = Math.round(440 / (SAMPLE_RATE / fftSize));
    assert.ok(Math.abs(spectrum[bin] - 0.5) < 0.05, `got ${spectrum[bin]}`);
    assert.ok(spectrum[bin + 10] < 0.01);
  });

  it('mixes channels to mono', () => {
    const tone = sine(440, 0.5);
    const silent = new Float32Array(tone.length);
    const fftSize = 4096;
    const bin = Math.round(440 / (SAMPLE_RATE / fftSize));
    const stereo = computeMagnitudeSpectrum([tone, silent], SAMPLE_RATE / 2, fftSize);
    const mono = computeMagnitudeSpectrum([tone], SAMPLE_RATE / 2, fftSize);
    assert.ok(Math.abs(stereo[bin] - mono[bin] / 2) < 1e-9);
  });
});

describe('computeSpectrumLineHeights', () => {
  it('places a 440 Hz tone at its log-scale position as a single narrow peak', () => {
    const spectrum = computeMagnitudeSpectrum([sine(440, 0.5)], SAMPLE_RATE / 2, 8192);
    const heights = computeSpectrumLineHeights(spectrum, SAMPLE_RATE, lineOptions);
    const peak = heights.indexOf(Math.max(...heights));
    const expected = (Math.log(440 / 20) / Math.log(2200 / 20)) * lineOptions.pointCount;
    assert.ok(Math.abs(peak - expected) <= 2, `peak at ${peak}, expected ~${expected}`);
    const raised = heights.filter((h) => h > heights[peak] * 0.25).length;
    assert.ok(raised < 12, `${raised} points raised`);
  });

  it('soft-clips loud input instead of flat-topping at 1', () => {
    const spectrum = computeMagnitudeSpectrum([sine(440, 0.9)], SAMPLE_RATE / 2, 8192);
    const heights = computeSpectrumLineHeights(spectrum, SAMPLE_RATE, { ...lineOptions, gain: 2 });
    const max = Math.max(...heights);
    assert.ok(max > 0.9 && max < 0.99, `max ${max}`);
  });

  it('returns a flat line for silence', () => {
    const spectrum = computeMagnitudeSpectrum([new Float32Array(SAMPLE_RATE)], 0, 2048);
    const heights = computeSpectrumLineHeights(spectrum, SAMPLE_RATE, lineOptions);
    assert.equal(heights.length, lineOptions.pointCount);
    assert.ok(heights.every((h) => h === 0));
  });
});

describe('computeSmoothedSpectrum', () => {
  it('lets a tone that just stopped decay instead of vanishing', () => {
    const tone = sine(440, 0.5, 2);
    tone.fill(0, SAMPLE_RATE);
    const fftSize = 2048;
    const bin = Math.round(440 / (SAMPLE_RATE / fftSize));
    const input = {
      channels: [tone],
      sampleRate: SAMPLE_RATE,
      cacheKey: 'decay-test',
      frame: 33,
      fps: 30,
      fftSize,
      historyFrames: 4,
    };
    const raw = computeSmoothedSpectrum({ ...input, smoothing: 0 });
    const smoothed = computeSmoothedSpectrum({ ...input, smoothing: 0.5 });
    assert.ok(raw[bin] < 0.01);
    assert.ok(smoothed[bin] > 0.02);
  });
});
