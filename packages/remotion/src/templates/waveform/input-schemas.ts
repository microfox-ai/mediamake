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

const shared = {
  config: jsonObject('Waveform config'),
  className: z.string().optional().describe('CSS class'),
  style: jsonObject('CSS style'),
};

export const WaveformLineInput = z.object({
  ...shared,
  strokeColor: color('Stroke color'),
  strokeWidth: slider(1, 40, 'Stroke width'),
  strokeLinecap: z.enum(['butt', 'round', 'square']).optional(),
  strokeLinejoin: z.enum(['miter', 'round', 'bevel']).optional(),
  fill: color('Fill color'),
  opacity: slider(0, 1, 'Opacity'),
  centerLine: z.boolean().optional().describe('Show center line'),
  centerLineColor: color('Center line color'),
  centerLineWidth: slider(0, 20, 'Center line width'),
  beatSync: z.boolean().optional(),
  bpm: slider(40, 240, 'Beats per minute'),
  beatThreshold: slider(0, 1, 'Beat detection threshold'),
  beatAmplitudeMultiplier: slider(0, 4, 'Beat amplitude multiplier'),
  beatAnimationDuration: slider(1, 60, 'Beat animation length in frames'),
  smoothAnimation: z.boolean().optional(),
  waveSpacing: slider(0, 1, 'Spacing between wave segments'),
  waveSegments: slider(1, 64, 'Wave segments'),
  waveOffset: slider(0, 1, 'Wave offset'),
  waveDirection: z.enum(['horizontal', 'vertical']).optional(),
  amplitudeCurve: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'])
    .optional(),
  animationSpeed: slider(0, 4, 'Animation speed'),
  pulseOnBeat: z.boolean().optional(),
  pulseColor: color('Pulse color'),
  pulseScale: slider(0, 4, 'Pulse scale'),
});

const histogramFields = {
  ...shared,
  barColor: color('Bar color'),
  barWidth: slider(1, 40, 'Bar width'),
  barSpacing: slider(0, 40, 'Bar spacing'),
  barBorderRadius: slider(0, 40, 'Bar corner radius'),
  opacity: slider(0, 1, 'Opacity'),
  horizontalSymmetry: z.boolean().optional().describe('Mirror left-right'),
  verticalMirror: z.boolean().optional().describe('Mirror up-down'),
  waveDirection: z.enum(['right-to-left', 'left-to-right']).optional(),
  histogramStyle: z.enum(['centered', 'full-width']).optional(),
  amplitude: slider(0, 4, 'Amplitude'),
  barSlant: slider(-90, 90, 'Bar slant in degrees'),
  gradientStartColor: color('Gradient start'),
  gradientEndColor: color('Gradient end'),
  gradientDirection: z.enum(['vertical', 'horizontal']).optional(),
  gradientStyle: z.enum(['mirrored', 'normal']).optional(),
};

export const WaveformHistogramInput = z.object({
  ...histogramFields,
  multiplier: slider(0, 4, 'Amplitude multiplier'),
});

export const WaveformHistogramRangedInput = z.object({
  ...histogramFields,
  showFrequencyRanges: z.boolean().optional().describe('Show bass, mid, and treble'),
  rangeDividerColor: color('Range divider color'),
  rangeLabels: z.boolean().optional().describe('Show frequency range labels'),
  bassBarColor: color('Bass bar color'),
  midBarColor: color('Mid bar color'),
  trebleBarColor: color('Treble bar color'),
});

export const WaveformCircleInput = z.object({
  ...shared,
  strokeColor: color('Stroke color'),
  strokeWidth: slider(1, 40, 'Stroke width'),
  fill: color('Fill color'),
  opacity: slider(0, 1, 'Opacity'),
  radius: slider(0, 100, 'Radius as a percentage of the container'),
  centerX: slider(0, 100, 'Center X as a percentage'),
  centerY: slider(0, 100, 'Center Y as a percentage'),
  startAngle: slider(0, 360, 'Start angle in degrees'),
  endAngle: slider(0, 360, 'End angle in degrees'),
  amplitude: slider(0, 4, 'Amplitude'),
  rotationSpeed: slider(-10, 10, 'Degrees per frame'),
  gradientStartColor: color('Gradient start'),
  gradientEndColor: color('Gradient end'),
});
