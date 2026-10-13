/**
 * Shared PCM audio analysis (RMS intensity + FFT features).
 * Used by the analyze-audio Lambda worker (and kept identical to the former API route logic).
 */

export interface AudioAnalysisResult {
  timestamp: number;
  intensity: number;
  frequency: number;
  beatType: 'low' | 'mid' | 'high';
  /** Raw window RMS, before min–max normalization. */
  rms: number;
  /** Share of spectral power below ~180Hz. */
  bassRatio: number;
  /** Half-wave spectral flux. Higher means a busier attack. */
  spectralFlux: number;
  spectralCentroid: number;
  spectralRolloff: number;
  zeroCrossingRate: number;
  mfcc: number[];
}

export interface AudioAnalysisSummary {
  totalBeats: number;
  averageIntensity: number;
  lowBeats: number;
  midBeats: number;
  highBeats: number;
}

const fft = (
  real: number[],
  imag: number[] = [],
): { real: number[]; imag: number[] } => {
  const N = real.length;
  if (N <= 1) return { real, imag };

  const evenReal = real.filter((_, i) => i % 2 === 0);
  const oddReal = real.filter((_, i) => i % 2 === 1);
  const evenImag = imag.filter((_, i) => i % 2 === 0);
  const oddImag = imag.filter((_, i) => i % 2 === 1);

  const even = fft(evenReal, evenImag);
  const odd = fft(oddReal, oddImag);

  const resultReal = new Array(N);
  const resultImag = new Array(N);

  for (let i = 0; i < N / 2; i++) {
    const angle = (-2 * Math.PI * i) / N;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const tempReal = cos * odd.real[i] - sin * odd.imag[i];
    const tempImag = cos * odd.imag[i] + sin * odd.real[i];

    resultReal[i] = even.real[i] + tempReal;
    resultImag[i] = even.imag[i] + tempImag;
    resultReal[i + N / 2] = even.real[i] - tempReal;
    resultImag[i + N / 2] = even.imag[i] - tempImag;
  }

  return { real: resultReal, imag: resultImag };
};

const calculateSpectralRolloff = (
  magnitude: number[],
  threshold = 0.85,
): number => {
  const totalEnergy = magnitude.reduce((sum, val) => sum + val, 0);
  const targetEnergy = totalEnergy * threshold;
  let cumulativeEnergy = 0;
  for (let i = 0; i < magnitude.length; i++) {
    cumulativeEnergy += magnitude[i];
    if (cumulativeEnergy >= targetEnergy) {
      return i / magnitude.length;
    }
  }
  return 1;
};

const calculateZeroCrossingRate = (signal: number[]): number => {
  let crossings = 0;
  for (let i = 1; i < signal.length; i++) {
    if (signal[i] >= 0 !== signal[i - 1] >= 0) crossings++;
  }
  return signal.length > 1 ? crossings / (signal.length - 1) : 0;
};

const calculateMFCC = (magnitude: number[], numCoeffs = 13): number[] => {
  const mfcc = new Array(numCoeffs).fill(0);
  const numFilters = 26;
  const melFilters = new Array(numFilters);

  for (let i = 0; i < numFilters; i++) {
    melFilters[i] = new Array(magnitude.length).fill(0);
    const start = Math.floor((i / numFilters) * magnitude.length);
    const end = Math.floor(((i + 2) / numFilters) * magnitude.length);
    for (let j = start; j < end && j < magnitude.length; j++) {
      melFilters[i][j] = 1;
    }
  }

  for (let i = 0; i < numCoeffs; i++) {
    let sum = 0;
    for (let j = 0; j < numFilters; j++) {
      let filterSum = 0;
      for (let k = 0; k < magnitude.length; k++) {
        filterSum += magnitude[k] * melFilters[j][k];
      }
      sum +=
        Math.log(Math.max(filterSum, 1e-10)) *
        Math.cos((Math.PI * i * (j + 0.5)) / numFilters);
    }
    mfcc[i] = sum;
  }

  return mfcc;
};

/** Analyze mono PCM samples (-1..1) into timed intensity/frequency frames. */
export function analyzeAudioPcm(
  channelWaveform: Float32Array | number[],
  sampleRate: number,
  windowSize = 2048,
  hopSize = 512,
): AudioAnalysisResult[] {
  const results: AudioAnalysisResult[] = [];
  const length = channelWaveform.length;
  const numWindows = Math.floor((length - windowSize) / hopSize);
  if (numWindows <= 0) return results;

  const allRMS: number[] = [];
  for (let i = 0; i < numWindows; i++) {
    const start = i * hopSize;
    let sumSq = 0;
    for (let idx = 0; idx < windowSize; idx++) {
      const sample = channelWaveform[start + idx] ?? 0;
      const w = sample * (0.5 - 0.5 * Math.cos((2 * Math.PI * idx) / (windowSize - 1)));
      sumSq += w * w;
    }
    allRMS.push(Math.sqrt(sumSq / windowSize));
  }

  const minRMS = Math.min(...allRMS);
  const maxRMS = Math.max(...allRMS);
  const rmsRange = maxRMS - minRMS;
  // bin Hz = bin * sampleRate / windowSize. This is the last bass bin (~180Hz).
  const bassCut = Math.max(2, Math.round((180 * windowSize) / sampleRate));
  let prevMagnitude: number[] | null = null;

  for (let i = 0; i < numWindows; i++) {
    const start = i * hopSize;
    const timestamp = start / sampleRate;
    const windowed = new Array(windowSize);
    for (let idx = 0; idx < windowSize; idx++) {
      const sample = channelWaveform[start + idx] ?? 0;
      windowed[idx] =
        sample * (0.5 - 0.5 * Math.cos((2 * Math.PI * idx) / (windowSize - 1)));
    }

    const rms = allRMS[i];
    const intensity = rmsRange > 0 ? (rms - minRMS) / rmsRange : 0;

    const fftResult = fft(windowed);
    const magnitude = fftResult.real.map((real, idx) =>
      Math.sqrt(real * real + fftResult.imag[idx] * fftResult.imag[idx]),
    );

    const half = Math.floor(magnitude.length / 2);
    let maxMagnitude = 0;
    let dominantBin = 0;
    let lowPower = 0;
    let highPower = 0;
    let flux = 0;
    let weighted = 0;
    let magSum = 0;
    for (let j = 1; j < half; j++) {
      const m = magnitude[j];
      magSum += m;
      weighted += j * m;
      if (j <= bassCut) lowPower += m * m;
      else highPower += m * m;
      if (prevMagnitude) {
        const delta = m - (prevMagnitude[j] ?? 0);
        if (delta > 0) flux += delta;
      }
      if (m > maxMagnitude) {
        maxMagnitude = m;
        dominantBin = j;
      }
    }
    prevMagnitude = magnitude;

    // Keep the fade. Only true silence is dropped; the segmenter treats those gaps as a rest.
    if (intensity < 0.02) continue;

    const dominantFreq = (dominantBin * sampleRate) / windowSize;
    let beatType: 'low' | 'mid' | 'high';
    if (dominantFreq < 250) beatType = 'low';
    else if (dominantFreq < 2000) beatType = 'mid';
    else beatType = 'high';

    results.push({
      timestamp,
      intensity,
      frequency: dominantFreq,
      beatType,
      rms,
      bassRatio: lowPower / (lowPower + highPower + 1e-12),
      spectralFlux: flux,
      spectralCentroid: magSum > 0 ? weighted / magSum : 0,
      spectralRolloff: calculateSpectralRolloff(magnitude),
      zeroCrossingRate: calculateZeroCrossingRate(
        Array.from(channelWaveform.slice(start, start + windowSize)),
      ),
      mfcc: calculateMFCC(magnitude),
    });
  }

  return results;
}

export function buildAnalysisSummary(
  analysis: AudioAnalysisResult[],
): AudioAnalysisSummary {
  if (!analysis.length) {
    return {
      totalBeats: 0,
      averageIntensity: 0,
      lowBeats: 0,
      midBeats: 0,
      highBeats: 0,
    };
  }
  return {
    totalBeats: analysis.length,
    averageIntensity:
      analysis.reduce((sum, r) => sum + r.intensity, 0) / analysis.length,
    lowBeats: analysis.filter((r) => r.beatType === 'low').length,
    midBeats: analysis.filter((r) => r.beatType === 'mid').length,
    highBeats: analysis.filter((r) => r.beatType === 'high').length,
  };
}

/** Convert s16le mono buffer to normalized float samples. */
export function s16leToFloat32(buffer: Buffer): Float32Array {
  const samples = new Float32Array(buffer.length / 2);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = buffer.readInt16LE(i * 2) / 32768;
  }
  return samples;
}
