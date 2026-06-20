/**
 * Heartbeat Effect Preset
 *
 * SINGLE EFFECT:
 * This is an internal effect preset that creates a heartbeat rhythm animation with two quick
 * scale pulses followed by a pause. It mimics the recognizable double-beat pattern seen in
 * medical monitors and fitness apps.
 *
 * Features:
 * - **Double-pulse pattern**: First pulse to 1.05, quick dip to 0.98, second stronger pulse to 1.08
 * - **BPM synchronization**: Configurable heart rate (60-180 BPM) for realistic timing
 * - **Intensity control**: Multiplier to adjust pulse strength
 * - **Optional opacity pulse**: Mirror the scale pattern with opacity changes
 * - **Looping support**: Can repeat the heartbeat pattern continuously
 *
 * Use cases:
 * - Medical/health app animations
 * - Fitness tracker visualizations
 * - Life/energy indicators
 * - Attention-grabbing pulse effects
 * - Health monitoring interfaces
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  bpm: z
    .number()
    .min(60)
    .max(180)
    .default(72)
    .describe('Beats per minute - heart rate to sync with (60-180 BPM)'),
  intensity: z
    .number()
    .default(1.0)
    .describe('Intensity multiplier for pulse strength (1.0 = normal)'),
  withOpacityPulse: z
    .boolean()
    .default(false)
    .describe('Enable opacity pulse that mirrors the scale animation'),
  loop: z
    .boolean()
    .default(true)
    .describe('Whether to loop the heartbeat pattern continuously'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the heartbeat effect to'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    bpm,
    intensity,
    withOpacityPulse,
    loop,
    targetIds,
    effectId,
  } = params;

  // Calculate beat duration from BPM
  // 60 seconds / BPM = seconds per beat
  const beatDuration = 60 / bpm;

  // Build scale animation ranges
  // Pattern: rest (0%) → first pulse to 1.05*intensity (10%) → 
  //          dip to 0.98 (15%) → second pulse to 1.08*intensity (25%) → 
  //          rest at 1.0 (40-100%)
  const scaleRanges = [
    { key: 'scale', val: 1, prog: 0 },
    { key: 'scale', val: 1.05 * intensity, prog: 0.1 },
    { key: 'scale', val: 0.98, prog: 0.15 },
    { key: 'scale', val: 1.08 * intensity, prog: 0.25 },
    { key: 'scale', val: 1, prog: 0.4 },
    { key: 'scale', val: 1, prog: 1 },
  ];

  // Build opacity animation ranges (mirrors scale pattern)
  const opacityRanges = withOpacityPulse
    ? [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.85, prog: 0.1 },
        { key: 'opacity', val: 0.95, prog: 0.15 },
        { key: 'opacity', val: 0.8, prog: 0.25 },
        { key: 'opacity', val: 1, prog: 0.4 },
        { key: 'opacity', val: 1, prog: 1 },
      ]
    : [];

  // Combine all animation ranges
  const ranges = [...scaleRanges, ...opacityRanges];

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: beatDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: ranges,
    loop: loop,
  };

  // Create effect object
  const effect = {
    id: effectId || `heartbeat-effect-${targetIds[0] || 'target'}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'heartbeat-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {},
            },
          },
          context: {
            timing: {
              start: 0,
              duration: beatDuration,
            },
          },
          effects: [effect],
          childrenData: [],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'heartbeat-effect',
  title: 'Heartbeat Effect',
  description:
    'Internal effect preset that creates a heartbeat rhythm animation with two quick scale pulses followed by a pause. Mimics medical monitor heartbeat patterns with configurable BPM (60-180), intensity multiplier, and optional opacity pulse. Returns effect configuration for use by calling presets.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'heartbeat', 'pulse', 'animation', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    bpm: 72,
    intensity: 1.0,
    withOpacityPulse: false,
    loop: true,
    targetIds: ['component-1'],
  },
};

export const heartbeatEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
