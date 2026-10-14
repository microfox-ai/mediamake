import { registerComponent } from '../../core';
import { WaveformCircle } from './components/WaveformCircle';
import { WaveformHistogramRanged } from './components/WaveformHistogramRanged';
import { WaveformLine } from './components/WaveformLine';
import {
  WaveformCircleInput,
  WaveformHistogramRangedInput,
  WaveformLineInput,
} from './input-schemas';

// Main Waveform component and types
export { Waveform, useWaveformContext } from './Waveform';
export type {
  WaveformConfig,
  WaveformContextType,
  WaveformProps,
} from './Waveform';

// Hook
export { useWaveformData } from './hooks/useWaveformData';
export type {
  UseWaveformDataConfig,
  UseWaveformDataReturn,
} from './hooks/useWaveformData';

// Waveform style components
export { WaveformLine } from './components/WaveformLine';
export type {
  WaveformLineProps,
  WaveformLineDataProps,
} from './components/WaveformLine';

export { WaveformHistogramRanged } from './components/WaveformHistogramRanged';
export type {
  WaveformHistogramRangedProps,
  WaveformHistogramRangedDataProps,
} from './components/WaveformHistogramRanged';

export { WaveformCircle } from './components/WaveformCircle';
export type {
  WaveformCircleProps,
  WaveformCircleDataProps,
} from './components/WaveformCircle';

// Default export
export { Waveform as default } from './Waveform';

registerComponent('WaveformLine', WaveformLine, 'atom', {
  displayName: 'WaveformLine',
  type: 'atom',
  inputSchema: WaveformLineInput,
});

registerComponent('WaveformHistogramRanged', WaveformHistogramRanged, 'atom', {
  displayName: 'WaveformHistogramRanged',
  type: 'atom',
  inputSchema: WaveformHistogramRangedInput,
});

registerComponent('WaveformCircle', WaveformCircle, 'atom', {
  displayName: 'WaveformCircle',
  type: 'atom',
  inputSchema: WaveformCircleInput,
});

export { WaveformPresets } from './utils';
