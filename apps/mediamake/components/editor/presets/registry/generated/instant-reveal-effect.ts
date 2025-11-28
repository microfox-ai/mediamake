/**
 * InstantReveal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Provides instant visibility toggle with subtle scale snap animation.
 * Returns two effects:
 * 1. Opacity effect: Instant toggle (0→1 or 1→0) using prog: [0, 0.01] for immediate change
 * 2. Scale effect: Spring animation (scaleIntensity→1.0 or 1.0→scaleIntensity) over 150ms for snappy 'pop' feel
 *
 * Direction parameter controls:
 * - 'in': opacity 0→1, scale up from scaleIntensity to 1.0 (reveal)
 * - 'out': opacity 1→0, scale down from 1.0 to scaleIntensity (hide)
 *
 * Advanced Usage:
 * Apply to text, video, or image atoms via targetIds array.
 * Adjust scaleIntensity (0.9-1.0 range) for different intensity levels.
 * Use delay parameter to trigger at specific times relative to parent timeline.
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

// Parameter schema with descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the instant reveal effect to (text, video, or image atoms)'),
  delay: z
    .number()
    .optional()
    .default(0)
    .describe('Delay in seconds before triggering the effect (relative to parent timeline)'),
  scaleIntensity: z
    .number()
    .min(0.9)
    .max(1)
    .optional()
    .default(0.95)
    .describe('Scale intensity value (0.9-1.0 range) - the starting/ending scale for the snap animation'),
  direction: z
    .enum(['in', 'out'])
    .describe("Direction of the effect: 'in' for reveal (0→1 opacity, scale up), 'out' for hide (1→0 opacity, scale down)"),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { targetIds, delay = 0, scaleIntensity = 0.95, direction } = params;

  const isReveal = direction === 'in';

  // Effect 1: Opacity instant toggle
  // Use prog: [0, 0.01] for instant change (effectively 0 duration visually)
  const opacityEffect: GenericEffectData = {
    type: 'linear', // Linear for instant transition
    start: delay,
    duration: 0.15, // Match scale duration for sync
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'opacity', val: isReveal ? 0 : 1, prog: 0 },
      { key: 'opacity', val: isReveal ? 1 : 0, prog: 0.01 }, // Instant change at 1% progress
      { key: 'opacity', val: isReveal ? 1 : 0, prog: 1 }, // Hold for remainder
    ],
  };

  // Effect 2: Scale spring animation
  // Spring easing for snappy, responsive feel over 150ms
  const scaleEffect: GenericEffectData = {
    type: 'spring', // Spring easing for snappy feel
    start: delay,
    duration: 0.15, // 150ms duration
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'scale', val: isReveal ? scaleIntensity : 1, prog: 0 },
      { key: 'scale', val: isReveal ? 1 : scaleIntensity, prog: 1 },
    ],
  };

  // Create effect nodes with unique IDs
  const opacityEffectNode = {
    id: `instant-reveal-opacity-${targetIds.join('-')}`,
    componentId: 'generic',
    data: opacityEffect,
  };

  const scaleEffectNode = {
    id: `instant-reveal-scale-${targetIds.join('-')}`,
    componentId: 'generic',
    data: scaleEffect,
  };

  // Return both effects in a container structure
  return {
    output: {
      childrenData: [
        {
          id: 'instant-reveal-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: 10, // Default duration for container
            },
          },
          effects: [opacityEffectNode, scaleEffectNode],
          childrenData: [],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'instant-reveal-effect',
  title: 'InstantReveal Effect',
  description:
    'Internal effect preset providing instant visibility toggle with subtle scale snap animation. Instantly shows/hides elements (no fade) while adding a micro-scale spring animation (0.95→1.0) for a snappy \'pop\' feel. Accepts targetIds to apply to text, video, or image atoms. Parameters: delay (trigger timing), scaleIntensity (0.9-1.0 range), direction (\'in\' or \'out\'). Returns two effects: opacity instant toggle and scale spring animation over 150ms.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'instant', 'reveal', 'scale', 'snap', 'spring', 'internal', 'generic'],
  dependencies: {},
  defaultInputParams: {
    targetIds: ['component-1'],
    delay: 0,
    scaleIntensity: 0.95,
    direction: 'in',
  },
  // REQUIRED: Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects', // Extract effects from output
};

// Export preset
export const instantRevealEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
