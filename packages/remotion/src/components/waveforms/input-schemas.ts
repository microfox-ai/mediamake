import { z } from 'zod';
import { paramInputTypes, paramMetaTypes } from '../../core/param-meta';

const color = (description: string) =>
  z
    .string()
    .optional()
    .meta({ [paramMetaTypes.inputType]: paramInputTypes.color })
    .describe(description);

const jsonObject = (description: string) =>
  z.record(z.string(), z.any()).optional().describe(description);

const slider = (min: number, max: number, description: string) =>
  z.number().min(min).max(max).optional().describe(description);

export const WaveformSpectrumLineInput = z.object({
  config: jsonObject('Waveform config'),
  className: z.string().optional().describe('CSS class'),
  style: jsonObject('CSS style'),
  strokeColor: color('Line color'),
  strokeWidth: slider(1, 20, 'Line width'),
  opacity: slider(0, 1, 'Opacity'),
  glowColor: color('Glow color'),
  glowBlur: slider(0, 40, 'Glow blur radius'),
  baselineOffset: slider(0, 400, 'Baseline distance from the bottom edge (px)'),
  peakHeight: slider(0, 1, 'How much of the height the tallest peak uses'),
  direction: z.enum(['low-to-high', 'high-to-low']).optional().describe('Bass on the left or on the right'),
  pointCount: slider(16, 512, 'Points along the line'),
  fftSize: z
    .union([z.literal(1024), z.literal(2048), z.literal(4096), z.literal(8192), z.literal(16384)])
    .optional()
    .describe('FFT size; larger values give narrower peaks'),
  minFrequency: slider(10, 2000, 'Lowest frequency shown (Hz)'),
  maxFrequency: slider(200, 20000, 'Highest frequency shown (Hz)'),
  frequencyScale: z.enum(['log', 'linear']).optional(),
  tilt: slider(-1, 2, 'Treble boost'),
  gain: slider(0, 60, 'Peak gain'),
  noiseFloor: slider(0, 0.5, 'Flatten values below this onto the baseline'),
  sharpness: slider(0.5, 4, 'Peak sharpness'),
  spread: slider(0, 6, 'Peak rounding passes'),
  temporalSmoothing: slider(0, 0.95, 'How long peaks linger'),
  smoothingFrames: slider(0, 12, 'Frames of history used for smoothing'),
});
