import { atomCategory } from '../../atom-category';
import { registerComponent } from '../../core/registry';
import { WaveformHistogram } from './WaveformHistogram';
import { WaveformHistogramRanged } from './WaveformHistogramRanged';
import { WaveformSpectrumFill } from './WaveformSpectrumFill';
import { WaveformSpectrumLine } from './WaveformSpectrumLine';
import {
  WaveformHistogramInput,
  WaveformHistogramRangedInput,
  WaveformSpectrumFillInput,
  WaveformSpectrumLineInput,
} from './input-schemas';

export { Waveform, useWaveformContext } from './Waveform';
export type {
  WaveformConfig,
  WaveformContextType,
  WaveformProps,
} from './Waveform';
export { useWaveformData } from './hooks/useWaveformData';
export type {
  UseWaveformDataConfig,
  UseWaveformDataReturn,
} from './hooks/useWaveformData';

export { WaveformHistogram } from './WaveformHistogram';
export type {
  WaveformHistogramProps,
  WaveformHistogramDataProps,
} from './WaveformHistogram';
export { WaveformHistogramRanged } from './WaveformHistogramRanged';
export type {
  WaveformHistogramRangedProps,
  WaveformHistogramRangedDataProps,
} from './WaveformHistogramRanged';

export { WaveformSpectrumLine } from './WaveformSpectrumLine';
export type {
  WaveformSpectrumLineProps,
  WaveformSpectrumLineDataProps,
} from './WaveformSpectrumLine';
export { WaveformSpectrumFill } from './WaveformSpectrumFill';
export type {
  WaveformSpectrumFillProps,
  WaveformSpectrumFillDataProps,
} from './WaveformSpectrumFill';
export {
  WaveformAudioSourceInput,
  WaveformHistogramInput,
  WaveformHistogramRangedInput,
  WaveformSpectrumFillInput,
  WaveformSpectrumLineInput,
} from './input-schemas';
export type { WaveformAudioSource, WaveformAnalysisOptions } from './audio-source';

export {
  computeMagnitudeSpectrum,
  computeSmoothedSpectrum,
  computeSpectrumLineHeights,
} from './spectrum-line-math';
export type {
  SmoothedSpectrumInput,
  SpectrumLineOptions,
} from './spectrum-line-math';

registerComponent('WaveformHistogram', WaveformHistogram, 'atom', {
  displayName: 'WaveformHistogram',
  type: 'atom',
  inputSchema: WaveformHistogramInput,
  category: atomCategory('waveforms'),
});

registerComponent('WaveformHistogramRanged', WaveformHistogramRanged, 'atom', {
  displayName: 'WaveformHistogramRanged',
  type: 'atom',
  inputSchema: WaveformHistogramRangedInput,
  category: atomCategory('waveforms'),
});

registerComponent('WaveformSpectrumLine', WaveformSpectrumLine, 'atom', {
  displayName: 'WaveformSpectrumLine',
  type: 'atom',
  inputSchema: WaveformSpectrumLineInput,
  category: atomCategory('waveforms'),
});

registerComponent('WaveformSpectrumFill', WaveformSpectrumFill, 'atom', {
  displayName: 'WaveformSpectrumFill',
  type: 'atom',
  inputSchema: WaveformSpectrumFillInput,
  category: atomCategory('waveforms'),
});
