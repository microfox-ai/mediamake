/**
 * Heartbeat Pulse Effect Preset
 *
 * A punchy, attention-grabbing pulse animation that mimics a heartbeat monitor effect with
 * a characteristic "lub-dub" rhythm. This preset creates quick double-pulses followed by
 * a brief pause, perfect for notifications, alerts, or important UI elements that need
 * immediate attention.
 *
 * Features:
 * - **Heartbeat Rhythm**: Quick double-pulse pattern (lub-dub... lub-dub) with pauses
 * - **Snappy Timing**: Sharp, quick scale changes with spring/bounce easing
 * - **Scale Animation**: Snaps from 100% to 120% (first pulse), 105% (second pulse), 115% (rebound), then back to 100%
 * - **Depth Effect**: Subtle opacity sync ranging from 1 to 0.95 for visual depth
 * - **Performance Optimized**: Uses transform3d and will-change-transform for better compositing
 * - **Looped Animation**: 1.8 second cycle with automatic looping
 *
 * Use cases:
 * - Notification badges and alert icons
 * - Important call-to-action buttons
 * - Live indicator badges (recording, streaming)
 * - Urgent message indicators
 * - Attention-grabbing UI elements
 * - Health/fitness app indicators
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetId: z
    .string()
    .describe(
      'ID of the component to apply the heartbeat pulse effect to (must exist in the composition)',
    ),
  effectStart: z
    .number()
    .default(0)
    .describe(
      'Start time of the effect in seconds (relative to parent component)',
    ),
  effectDuration: z
    .number()
    .default(10)
    .describe(
      'Total duration of the effect in seconds (animation will loop within this duration)',
    ),
  cycleDuration: z
    .number()
    .default(1.8)
    .describe(
      'Duration of one heartbeat cycle in seconds (lub-dub + pause = 1.8s)',
    ),
  scaleIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe(
      'Intensity multiplier for scale values (1 = default: 120% first pulse, 1.5 = 130% first pulse)',
    ),
  enableOpacitySync: z
    .boolean()
    .default(true)
    .describe(
      'Whether to sync subtle opacity changes with the scale pulses for depth effect',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID for the effect (auto-generated if not provided)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Calculate scale values based on intensity
  const baseScale = 1;
  const firstPulseScale = 1 + 0.2 * params.scaleIntensity; // Default: 1.2
  const secondPulseScale = 1 + 0.05 * params.scaleIntensity; // Default: 1.05
  const reboundScale = 1 + 0.15 * params.scaleIntensity; // Default: 1.15

  // Keyframe timestamps as progress (0-1) within one cycle
  // 0% = rest, 15% = first pulse peak (lub), 25% = dip, 40% = second pulse peak (dub), 100% = rest
  const scaleRanges = [
    { key: 'scale', val: baseScale, prog: 0 }, // Rest
    { key: 'scale', val: firstPulseScale, prog: 0.15 }, // First pulse (lub)
    { key: 'scale', val: secondPulseScale, prog: 0.25 }, // Dip
    { key: 'scale', val: reboundScale, prog: 0.4 }, // Second pulse (dub)
    { key: 'scale', val: baseScale, prog: 1 }, // Return to rest
  ];

  // Opacity ranges (subtle sync with scale for depth)
  const opacityRanges = params.enableOpacitySync
    ? [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.95, prog: 0.15 },
        { key: 'opacity', val: 1, prog: 0.25 },
        { key: 'opacity', val: 0.95, prog: 0.4 },
        { key: 'opacity', val: 1, prog: 1 },
      ]
    : [];

  // Combine ranges
  const allRanges = [...scaleRanges, ...opacityRanges];

  // Create the heartbeat pulse effect
  const heartbeatEffect: GenericEffectData = {
    type: 'spring', // Spring easing for snappy, bouncy feel
    start: params.effectStart,
    duration: params.cycleDuration, // Single cycle duration
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: allRanges,
  };

  // Calculate number of cycles needed to fill effectDuration
  const cycleCount = Math.ceil(params.effectDuration / params.cycleDuration);

  // Create multiple effect instances to cover the full duration (looping)
  const effects = [];
  for (let i = 0; i < cycleCount; i++) {
    effects.push({
      id:
        params.effectId || `heartbeat-pulse-${params.targetId}-cycle-${i}`,
      componentId: 'generic',
      data: {
        ...heartbeatEffect,
        start: params.effectStart + i * params.cycleDuration,
      },
    });
  }

  // Create container structure
  const rootContainer: RenderableComponentData = {
    id: 'heartbeat-pulse-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'flex items-center justify-center will-change-transform',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.effectDuration,
      },
    },
    effects: effects,
    childrenData: [] as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects, // Expose effects for internal preset usage
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'heartbeat-pulse',
  title: 'Heartbeat Pulse Effect',
  description:
    'A punchy, attention-grabbing pulse animation that mimics a heartbeat monitor effect (lub-dub rhythm). Creates dramatic emphasis with quick double-pulses followed by a brief pause, perfect for notifications, alerts, or important UI elements requiring immediate attention. Features sharp, snappy timing with spring/bounce easing and subtle opacity sync for depth.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'animation', 'pulse', 'heartbeat', 'notification', 'alert', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 10,
    cycleDuration: 1.8,
    scaleIntensity: 1,
    enableOpacitySync: true,
  },
};

// Export preset
export const heartbeatPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
