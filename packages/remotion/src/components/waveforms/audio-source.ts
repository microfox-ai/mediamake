import type { WaveformConfig } from './Waveform';

export interface WaveformAudioSource {
  /** Audio URL, static file path, or `ref:<id>` pointing at an AudioAtom (or a layout containing one). */
  src: string;
  /** Seconds into the audio the visual starts reading from. */
  start?: number;
}

export type WaveformAnalysisOptions = Pick<
  WaveformConfig,
  'width' | 'height' | 'numberOfSamples' | 'windowInSeconds' | 'useFrequencyData' | 'smoothNormalisation'
>;

export const toWaveformConfig = (
  audio: WaveformAudioSource | undefined,
  options: WaveformAnalysisOptions = {}
): WaveformConfig => ({
  ...options,
  audioSrc: audio?.src ?? '',
  dataOffsetInSeconds: audio?.start ?? 0,
});

/**
 * Spectrum components run their own FFT, so the base Waveform only needs the source;
 * its time-domain pass is kept as cheap as possible.
 */
export const toSpectrumWaveformConfig = (
  audio: WaveformAudioSource | undefined,
  width?: number,
  height?: number
): WaveformConfig =>
  toWaveformConfig(audio, {
    width,
    height,
    numberOfSamples: 32,
    smoothNormalisation: 0,
    useFrequencyData: false,
  });
