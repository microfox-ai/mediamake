import { registerComponent } from '../../core/registry';
import { WaveformHistogramInput } from '../../templates/waveform/input-schemas';
import { WaveformHistogram } from './WaveformHistogram';
import { WaveformSpectrumLine } from './WaveformSpectrumLine';
import { WaveformSpectrumLineInput } from './input-schemas';

export { WaveformHistogram } from './WaveformHistogram';
export type {
  WaveformHistogramProps,
  WaveformHistogramDataProps,
} from './WaveformHistogram';

export { WaveformSpectrumLine } from './WaveformSpectrumLine';
export type {
  WaveformSpectrumLineProps,
  WaveformSpectrumLineDataProps,
} from './WaveformSpectrumLine';
export { WaveformSpectrumLineInput } from './input-schemas';

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
});

registerComponent('WaveformSpectrumLine', WaveformSpectrumLine, 'atom', {
  displayName: 'WaveformSpectrumLine',
  type: 'atom',
  inputSchema: WaveformSpectrumLineInput,
});
