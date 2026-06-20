/**
 * Subtle Pop Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Applies a gentle scale animation that creates a subtle "pop" effect to draw attention
 * without being jarring. The effect scales from 0.95 to 1.02 and back to 1.0, using
 * spring easing for organic, responsive motion.
 *
 * Features:
 * - Gentle scale animation (0.95 → 1.02 → 1.0)
 * - Spring easing for organic motion
 * - Configurable duration, intensity, and delay
 * - Provider mode targeting components by ID
 * - Ideal for micro-interactions and attention-drawing effects
 *
 * Use cases:
 * - Drawing attention to UI elements without disruption
 * - Creating responsive micro-interactions
 * - Adding subtle emphasis to text, buttons, or media
 * - Building engaging but non-overwhelming animations
 *
 * Technical Details:
 * - Effect type: generic (UniversalEffect with AnimationRange keyframes)
 * - Properties: scale with spring easing
 * - Keyframes: prog 0 (scale 0.95), prog 0.4 (scale 1.02), prog 1.0 (scale 1.0)
 * - Mode: provider (targets components by ID, no wrapper divs)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the subtle pop effect to'),
  duration: z.number().default(0.4).describe('Duration of the pop animation in seconds (default: 0.4s)'),
  intensity: z.number().default(1.0).describe('Scale intensity multiplier - affects the peak scale value (default: 1.0)'),
  delay: z.number().default(0).describe('Delay before the effect starts, relative to parent timeline (default: 0)'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    duration = 0.4,
    intensity = 1.0,
    delay = 0,
    effectId,
  } = params;

  // Calculate scale values based on intensity
  const scaleStart = 0.95 * intensity;
  const scalePeak = 1.02 * intensity;
  const scaleEnd = 1.0;

  // Construct the generic effect data with spring easing
  const effectData: GenericEffectData = {
    type: 'spring',
    start: delay,
    duration: duration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'scale', val: scaleStart, prog: 0 },
      { key: 'scale', val: scalePeak, prog: 0.4 },
      { key: 'scale', val: scaleEnd, prog: 1.0 },
    ],
  };

  // Create the effect node
  const effect = {
    id: effectId || `subtle-pop-${targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return the effect wrapped in a container structure
  const rootContainer: RenderableComponentData = {
    id: 'subtle-pop-effect-container',
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
        fitDurationTo: 'this',
      },
    },
    effects: [effect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'subtlePop',
  title: 'Subtle Pop Effect',
  description: 'A gentle scale animation that creates a subtle "pop" to draw attention without being jarring. Uses spring easing for organic, responsive micro-interactions.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'scale', 'pop', 'spring', 'subtle', 'micro-interaction', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    duration: 0.4,
    intensity: 1.0,
    delay: 0,
  },
};

// Export preset
export const subtlePopPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
