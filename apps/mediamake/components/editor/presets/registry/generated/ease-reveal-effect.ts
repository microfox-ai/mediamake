/**
 * Ease Reveal Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Unveils content with sophisticated masking-like behavior using scale and opacity.
 * Starts with scaleY at 0 (collapsed) and opacity 0, then expands vertically with
 * custom spring easing while opacity fades in with different timing.
 * Adds a subtle brightness boost during reveal that settles back to 1.
 *
 * Features:
 * - Scale-based reveal (vertical or horizontal collapse/expand)
 * - Separate timing for opacity fade-in
 * - Brightness boost during reveal
 * - Spring-based easing with configurable tension/friction
 * - Perfect for text blocks or media elements
 *
 * Parameters:
 * - targetId: ID of component to apply effect to
 * - effectStart: Start time (relative to parent)
 * - effectDuration: Duration of the reveal effect
 * - revealDirection: 'vertical' (scaleY) or 'horizontal' (scaleX)
 * - springTension: Spring tension (default: 180)
 * - springFriction: Spring friction (default: 12)
 * - brightnessPeak: Peak brightness during reveal (default: 1.2)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply reveal effect to'),
  effectStart: z
    .number()
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .describe('Duration of the reveal effect in seconds'),
  revealDirection: z
    .enum(['vertical', 'horizontal'])
    .optional()
    .describe(
      'Direction of reveal: vertical (scaleY) or horizontal (scaleX)',
    ),
  springTension: z
    .number()
    .optional()
    .describe('Spring tension for reveal animation (default: 180)'),
  springFriction: z
    .number()
    .optional()
    .describe('Spring friction for reveal animation (default: 12)'),
  brightnessPeak: z
    .number()
    .optional()
    .describe('Peak brightness during reveal (default: 1.2)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const revealDirection = params.revealDirection ?? 'vertical';
  const springTension = params.springTension ?? 180;
  const springFriction = params.springFriction ?? 12;
  const brightnessPeak = params.brightnessPeak ?? 1.2;

  // Determine which scale property to use
  const scaleKey = revealDirection === 'horizontal' ? 'scaleX' : 'scaleY';

  // Construct effect data with spring easing
  const effectData: GenericEffectData = {
    type: 'spring',
    springConfig: {
      tension: springTension,
      friction: springFriction,
    },
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      // Scale reveal: 0 → 1 (full progress)
      { key: scaleKey, val: 0, prog: 0 },
      { key: scaleKey, val: 1, prog: 1 },
      // Opacity fade-in: 0 → 1 (60% through animation)
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.6 },
      // Brightness boost: 1 → peak → 1
      { key: 'brightness', val: 1, prog: 0 },
      { key: 'brightness', val: brightnessPeak, prog: 0.5 },
      { key: 'brightness', val: 1, prog: 1 },
    ],
  };

  // Create effect node
  const effect = {
    id: params.effectId || `ease-reveal-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'ease-reveal-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: params.effectDuration + params.effectStart,
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

const presetMetadata: PresetMetadata = {
  id: 'ease-reveal-effect',
  title: 'Ease Reveal Effect',
  description:
    'Internal effect preset that unveils content with sophisticated masking-like behavior using scale and opacity. Features spring-based vertical/horizontal expansion from collapsed state, opacity fade-in with different timing, and subtle brightness boost during reveal. Perfect for refined text blocks or media element reveals.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'reveal', 'scale', 'opacity', 'spring', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 1,
    revealDirection: 'vertical',
    springTension: 180,
    springFriction: 12,
    brightnessPeak: 1.2,
  },
};

export const easeRevealEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
