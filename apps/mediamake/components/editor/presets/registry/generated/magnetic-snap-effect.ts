/**
 * Magnetic Snap Effect (Internal)
 *
 * SINGLE EFFECT:
 * Creates a magnetic attraction effect where elements appear to be pulled then snap into place.
 * Starts with slow acceleration (scale 0.94), builds momentum, then snaps quickly to slight
 * overshoot (1.04) before settling. Includes magnetic 'strength' parameter affecting acceleration
 * curve. Optional slight rotation wobble for more dynamic motion.
 *
 * This internal effect preset generates a single generic effect with configurable magnetic
 * strength, overshoot, and optional rotation wobble. Creates satisfying physical interactions
 * that feel responsive and natural.
 *
 * Features:
 * - **Magnetic Acceleration Curve**: Slow pull → momentum build → quick snap → settle
 * - **Configurable Strength**: Adjust intensity of the magnetic acceleration curve (0.1-2.0)
 * - **Overshoot Control**: Control how much the element overshoots before settling (default 0.04)
 * - **Optional Rotation Wobble**: Add physical realism with dynamic rotation during snap
 * - **Easing Control**: Smooth ease-in-out timing for natural motion
 *
 * Use cases:
 * - UI element entrance animations
 * - Button/card interaction feedback
 * - Modal/dialog entrance effects
 * - Attention-grabbing snap-in transitions
 * - Physical-feeling UI animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply magnetic snap effect to'),
  effectStart: z.number().default(0).describe('Start time of the effect in seconds (relative to parent)'),
  duration: z.number().default(0.5).describe('Duration of the magnetic snap animation in seconds'),
  magnetStrength: z.number().min(0.1).max(2.0).default(1.0).describe('Magnetic strength affecting acceleration curve intensity (0.1-2.0, default 1.0)'),
  overshoot: z.number().default(0.04).describe('Amount of overshoot before settling (default 0.04 = 4% larger)'),
  wobble: z.boolean().default(false).describe('Enable rotation wobble for more dynamic motion'),
  wobbleAmount: z.number().default(2).describe('Amount of rotation wobble in degrees (default 2)'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    targetId,
    effectStart,
    duration,
    magnetStrength,
    overshoot,
    wobble,
    wobbleAmount,
    effectId,
  } = params;

  // Calculate animation ranges
  // Magnetic phases:
  // 1. Initial pull (0-0.2 * magnetStrength): scale 0.94 → 0.93
  // 2. Momentum build (0.2 * magnetStrength - 0.5): scale 0.93 → 0.95
  // 3. Acceleration (0.5-0.75): scale 0.95 → 1 + overshoot
  // 4. Settle (0.75-1.0): scale 1 + overshoot → 1.0
  
  const momentumPoint = Math.min(0.2 * magnetStrength, 0.5); // Cap at 0.5

  // Build scale animation ranges
  const scaleRanges = [
    { key: 'scale', val: 0.94, prog: 0 },
    { key: 'scale', val: 0.93, prog: momentumPoint },
    { key: 'scale', val: 0.95, prog: 0.5 },
    { key: 'scale', val: 1 + overshoot, prog: 0.75 },
    { key: 'scale', val: 1, prog: 1 },
  ];

  // Build rotation wobble ranges (if enabled)
  const wobbleRanges = wobble ? [
    { key: 'rotate', val: -wobbleAmount, prog: 0.7 },
    { key: 'rotate', val: wobbleAmount * 0.5, prog: 0.85 },
    { key: 'rotate', val: 0, prog: 1 },
  ] : [];

  // Combine all animation ranges
  const ranges = [...scaleRanges, ...wobbleRanges];

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: ranges,
  };

  // Create effect object
  const effect = {
    id: effectId || `magnetic-snap-${targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in standard internal preset structure
  return {
    output: {
      childrenData: [
        {
          id: 'magnetic-snap-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: duration + effectStart,
            },
          },
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
  id: 'magnetic-snap-effect',
  title: 'Magnetic Snap Effect (Internal)',
  description: 'Internal effect preset that generates magnetic snap animation data with configurable strength, overshoot, and optional rotation wobble. Creates a satisfying physical interaction feel with slow acceleration, momentum build-up, quick snap to overshoot, then settle.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'magnetic', 'snap', 'ui', 'interaction', 'physics', 'animation'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    duration: 0.5,
    magnetStrength: 1.0,
    overshoot: 0.04,
    wobble: false,
    wobbleAmount: 2,
  },
};

// Export preset
export const magneticSnapEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
