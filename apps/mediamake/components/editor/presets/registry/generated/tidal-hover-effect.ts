/**
 * Tidal Hover Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates a gentle oceanic floating motion that simulates the ebb and flow of tides.
 * Elements drift horizontally while rising and falling, with compound sine wave functions
 * creating primary tide cycles (12s period) and secondary wave modulations (4s period).
 * Optional rolling rotation can be added to simulate elements rolling with the waves.
 *
 * This effect creates peaceful, rhythmic motion perfect for meditative content or maritime themes.
 * The movement uses multiple overlapping wave cycles to create natural, fluid motion.
 *
 * Technical Details:
 * - Primary tide cycle: 12 seconds, large amplitude movements
 * - Secondary wave cycle: 4 seconds, smaller amplitude modulations
 * - Movement formula: x = A1*sin(t/P1) + A2*sin(t/P2), y = A1*cos(t/P1) * 0.5
 * - 16 keyframes for smooth interpolation
 * - Optional rotation: ±5deg synced with horizontal movement
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the tidal hover effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .default(12)
    .describe('Duration of the effect in seconds (should be 12 for full tide cycle)'),
  tideStrength: z
    .number()
    .min(20)
    .max(100)
    .default(50)
    .describe('Strength of the tide movement in pixels (20-100)'),
  waveFrequency: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Frequency multiplier for wave cycles (0.5-2, affects secondary waves)'),
  includeRoll: z
    .boolean()
    .default(false)
    .describe('Whether to include subtle rolling rotation synchronized with horizontal movement'),
  phaseOffset: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .describe('Phase offset for wave cycles (0-1, allows staggering multiple elements)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the tidal hover effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    effectStart,
    effectDuration,
    tideStrength,
    waveFrequency,
    includeRoll,
    phaseOffset,
    effectId,
  } = params;

  // Helper function to calculate compound wave motion
  const calculateTidalPosition = (
    progress: number,
    strength: number,
    frequency: number,
    offset: number,
  ): { x: number; y: number; rotation: number } => {
    // Adjust progress with phase offset
    const adjustedProg = (progress + offset) % 1;
    const t = adjustedProg * Math.PI * 2; // Convert to radians

    // Primary tide cycle (12s period)
    const primaryPeriod = 1; // Normalized to 0-1 progress
    const primaryX = Math.sin(t / primaryPeriod);
    const primaryY = Math.cos(t / primaryPeriod);

    // Secondary wave cycle (4s period = 1/3 of primary)
    const secondaryPeriod = 1 / (3 * frequency);
    const secondaryX = Math.sin(t / secondaryPeriod) * 0.3;
    const secondaryY = Math.cos(t / secondaryPeriod) * 0.3;

    // Combine waves
    const x = strength * (primaryX + secondaryX);
    const y = strength * (primaryY * 0.5 + secondaryY * 0.5);

    // Rotation synced with horizontal movement (if enabled)
    const rotation = includeRoll ? 5 * Math.sin(t / primaryPeriod) : 0;

    return { x, y, rotation };
  };

  // Generate 16 keyframes for smooth wave motion
  const keyframeCount = 16;
  const translateXRanges = [];
  const translateYRanges = [];
  const rotateRanges = [];

  for (let i = 0; i < keyframeCount; i++) {
    const progress = i / keyframeCount;
    const position = calculateTidalPosition(
      progress,
      tideStrength,
      waveFrequency,
      phaseOffset,
    );

    translateXRanges.push({
      key: 'translateX',
      val: Math.round(position.x * 100) / 100,
      prog: progress,
    });

    translateYRanges.push({
      key: 'translateY',
      val: Math.round(position.y * 100) / 100,
      prog: progress,
    });

    if (includeRoll) {
      rotateRanges.push({
        key: 'rotate',
        val: Math.round(position.rotation * 100) / 100,
        prog: progress,
      });
    }
  }

  // Combine all ranges
  const allRanges = [...translateXRanges, ...translateYRanges];
  if (includeRoll) {
    allRanges.push(...rotateRanges);
  }

  // Create the tidal hover effect
  const tidalEffectData: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: allRanges,
  };

  const tidalEffect = {
    id: effectId || `tidal-hover-${targetId}`,
    componentId: 'generic',
    data: tidalEffectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'tidal-hover-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
            },
          },
          effects: [tidalEffect],
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
  id: 'tidal-hover-effect',
  title: 'Tidal Hover Effect',
  description:
    'Internal effect preset that simulates gentle ocean tide motion with push-pull horizontal drift and vertical rise-fall patterns. Creates peaceful, rhythmic floating motion using compound sine wave calculations with primary tide cycle (12s period) and secondary wave modulations. Supports optional rolling rotation synced with horizontal movement. Ideal for meditative content, maritime themes, or any design needing organic floating animation.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'tidal', 'hover', 'float', 'ocean', 'waves', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 12,
    tideStrength: 50,
    waveFrequency: 1,
    includeRoll: false,
    phaseOffset: 0,
  },
};

export const tidalHoverEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
