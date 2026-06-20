/**
 * Breath Hover Effect (Internal Effect Preset)
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset simulates natural breathing rhythm through gentle position
 * oscillation and scale changes. It creates an organic, meditative quality perfect for
 * calm, contemplative content or wellness-related visuals.
 *
 * The effect follows a natural breathing pattern:
 * - 4 seconds inhale (rising and expanding)
 * - 1 second hold at peak
 * - 4 seconds exhale (falling and contracting)
 * - 1 second hold at rest
 *
 * Features:
 * - TranslateY for vertical movement (simulates rising/falling)
 * - Scale for breathing expansion/contraction
 * - Optional rotation sway for added organic movement
 * - Configurable breath depth (5-50px)
 * - Configurable breath rate multiplier (0.5-2x)
 * - Loops continuously with ease-in-out easing
 *
 * Use cases:
 * - Wellness and meditation content
 * - Calm, contemplative backgrounds
 * - Organic hover effects for UI elements
 * - Subtle life-giving animation for static content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the breath effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the breath effect (relative to parent timeline)'),
  effectDuration: z
    .number()
    .default(10)
    .describe('Duration of the breath effect in seconds'),
  breathDepth: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe(
      'Depth of breathing movement in pixels (how far elements move vertically)',
    ),
  breathRate: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe(
      'Breath rate multiplier (0.5 = slower, 1 = normal, 2 = faster breathing)',
    ),
  includeSway: z
    .boolean()
    .default(true)
    .describe('Whether to include subtle rotation sway during the breath cycle'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (defaults to breath-hover-{targetId})'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Calculate breath cycle duration based on rate
  // Base cycle: 10 seconds (4s in, 1s hold, 4s out, 1s hold)
  const baseCycleDuration = 10000; // milliseconds
  const cycleDuration = baseCycleDuration / (params.breathRate || 1);

  // Convert to seconds for effect duration
  const breathCycleDurationSeconds = cycleDuration / 1000;

  // Breath depth and scale calculation
  const breathDepth = params.breathDepth || 20;
  const scaleExpansion = breathDepth * 0.02; // 20px depth = 0.4 scale increase

  // Keyframe progress points for natural breathing pattern
  // 0.0 = rest position (0s)
  // 0.4 = peak inhale (4s mark)
  // 0.5 = hold at peak (5s mark)
  // 0.9 = exhale complete (9s mark)
  // 1.0 = return to rest (10s mark)

  // Build animation ranges
  const ranges: Array<{ key: string; val: any; prog: number }> = [
    // TranslateY: 0 → -depth → -depth → 0 → 0
    { key: 'translateY', val: 0, prog: 0 }, // Rest position
    { key: 'translateY', val: -breathDepth, prog: 0.4 }, // Peak inhale (rise)
    { key: 'translateY', val: -breathDepth, prog: 0.5 }, // Hold at peak
    { key: 'translateY', val: 0, prog: 0.9 }, // Exhale complete (fall)
    { key: 'translateY', val: 0, prog: 1.0 }, // Return to rest

    // Scale: 1 → 1 + expansion → hold → 1 → 1
    { key: 'scale', val: 1, prog: 0 }, // Rest scale
    { key: 'scale', val: 1 + scaleExpansion, prog: 0.4 }, // Peak inhale (expand)
    { key: 'scale', val: 1 + scaleExpansion, prog: 0.5 }, // Hold at peak
    { key: 'scale', val: 1, prog: 0.9 }, // Exhale complete (contract)
    { key: 'scale', val: 1, prog: 1.0 }, // Return to rest
  ];

  // Optional rotation sway: subtle -2deg to +2deg oscillation
  if (params.includeSway) {
    ranges.push(
      { key: 'rotate', val: 0, prog: 0 }, // Rest position
      { key: 'rotate', val: 2, prog: 0.2 }, // Slight right sway
      { key: 'rotate', val: 1, prog: 0.4 }, // Peak inhale (slight right)
      { key: 'rotate', val: 0, prog: 0.5 }, // Hold at center
      { key: 'rotate', val: -2, prog: 0.7 }, // Slight left sway
      { key: 'rotate', val: -1, prog: 0.9 }, // Exhale complete (slight left)
      { key: 'rotate', val: 0, prog: 1.0 }, // Return to rest
    );
  }

  // Create the generic effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out', // Smooth, natural easing
    start: params.effectStart,
    duration: params.effectDuration, // Total duration to apply effect
    mode: 'provider',
    targetIds: [params.targetId],
    ranges,
    loop: true, // Continuous breathing loop
  };

  // Create the effect object
  const breathEffect = {
    id:
      params.effectId || `breath-hover-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in a container structure for extraction
  const effectContainer: RenderableComponentData = {
    id: 'breath-hover-effect-provider',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.effectDuration,
      },
    },
    effects: [breathEffect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [effectContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'breath-hover-effect',
  title: 'Breath Hover Effect',
  description:
    'Internal effect preset that simulates natural breathing rhythm through gentle position oscillation with translateY for vertical movement and scale for breathing expansion. Creates an organic, meditative quality with a 4-second inhale, 1-second hold, 4-second exhale, 1-second hold cycle. Accepts breathDepth (5-50px), breathRate (0.5-2 multiplier), and includeSway (boolean for rotation) parameters. Returns effect configuration to be attached to target components via their effects array property.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'breath', 'hover', 'organic', 'meditation', 'wellness', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'target-component',
    effectStart: 0,
    effectDuration: 10,
    breathDepth: 20,
    breathRate: 1,
    includeSway: true,
  },
};

// --- Export ---

export const breathHoverEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
