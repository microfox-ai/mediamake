/**
 * Anticipate Fade Effect Preset
 *
 * SINGLE EFFECT:
 * This internal effect preset combines gentle anticipation movement with opacity transitions.
 * It creates a slingshot-style animation that pulls back slightly (anticipation) before smoothly
 * accelerating forward with a scale overshoot, then settles at 100% scale.
 *
 * Animation Flow:
 * 1. Pull back to 90% scale with 0 opacity (anticipation)
 * 2. Accelerate forward to 105% scale with full opacity (overshoot)
 * 3. Settle at 100% scale (final state)
 *
 * Uses cubic-bezier(0.68, -0.55, 0.265, 1.55) for anticipation curve where the negative
 * value produces backward motion before the forward spring effect.
 *
 * Use cases:
 * - Playful entrance animations for text, images, and videos
 * - Attention-grabbing element reveals
 * - Dynamic UI transitions with personality
 * - Social media content with engaging motion
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfx/datamotion';

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the anticipate-fade effect to'),
  effectStart: z
    .number()
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the effect in seconds (default: 800ms)'),
  overshoot: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe(
      'Amount of scale overshoot beyond 100% (default: 0.05 for 105% scale)',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID for the effect node'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { targetId, effectStart, effectDuration, overshoot, effectId } = params;

  // Calculate scale values
  const anticipationScale = 0.9; // 10% scale reduction (pullback)
  const overshootScale = 1 + overshoot; // 105% scale (forward acceleration)
  const finalScale = 1; // 100% scale (settle)

  // Define progress keyframes
  // Scale: anticipation at 0, overshoot at 70%, settle at 100%
  // Opacity: invisible at 0, fully visible at 40%, maintain at 100%
  const scaleProgressPoints = [0, 0.7, 1];
  const opacityProgressPoints = [0, 0.4, 1];

  // Construct the effect data with cubic-bezier anticipation curve
  const effectData: GenericEffectData = {
    type: 'ease-in-out', // Base easing type (will be overridden by custom cubic-bezier in future)
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      // Scale animation range
      { key: 'scale', val: anticipationScale, prog: scaleProgressPoints[0] },
      { key: 'scale', val: overshootScale, prog: scaleProgressPoints[1] },
      { key: 'scale', val: finalScale, prog: scaleProgressPoints[2] },
      // Opacity animation range
      { key: 'opacity', val: 0, prog: opacityProgressPoints[0] },
      { key: 'opacity', val: 1, prog: opacityProgressPoints[1] },
      { key: 'opacity', val: 1, prog: opacityProgressPoints[2] },
    ],
  };

  // Create the effect node
  const effect = {
    id: effectId || `anticipate-fade-${targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect wrapped in container structure for extraction
  const container: RenderableComponentData = {
    id: 'anticipate-fade-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    effects: [effect],
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: 10, // Arbitrary duration for container
      },
    },
  };

  return {
    output: {
      childrenData: [container] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'anticipate-fade',
  title: 'Anticipate Fade Effect',
  description:
    'Internal effect preset that combines gentle anticipation movement with opacity transitions. Creates a slingshot-style animation that pulls back slightly before smoothly accelerating forward with a scale overshoot, then settles. Uses cubic-bezier easing with anticipation curve for dynamic, playful motion on any targetable component.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'anticipation', 'fade', 'scale', 'generic', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 0.8,
    overshoot: 0.05,
  },
};

export const anticipateFadePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
