/**
 * ElasticReveal Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Applies an elastic reveal animation with multiple simultaneous properties:
 * - Opacity fade-in (0 → 0.8 → 1)
 * - Scale with elastic overshoot (0.7 → 1.1 → 1)
 * - Rotation that settles (configurable start → peak → 0)
 * - Blur-to-focus transition (configurable intensity → 0)
 *
 * Features:
 * - Configurable overshoot amount for elastic effect
 * - Adjustable blur intensity for depth
 * - Reveal origin control (center, top, bottom, left, right) via transform-origin
 * - Stagger delay support for multi-element reveals
 * - Optimized for text and image reveal animations
 *
 * Usage:
 * Call via dependency with targetIds array for multi-element stagger support.
 * The effect creates an elastic, depth-enhanced reveal that feels like content
 * is emerging from elastic resistance.
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('IDs of components to target for reveal'),
  effectStart: z.number().describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  overshoot: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .optional()
    .describe('Scale overshoot amount (0.1 = 10% overshoot to 1.1)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .optional()
    .describe('Initial blur intensity in pixels'),
  origin: z
    .enum(['center', 'top', 'bottom', 'left', 'right'])
    .default('center')
    .optional()
    .describe('Transform origin for reveal animation'),
  staggerDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0)
    .optional()
    .describe('Delay between each element in multi-element reveals (seconds)'),
  effectId: z.string().optional().describe('Optional custom effect ID prefix'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to map origin to transform-origin CSS value
  const getTransformOrigin = (origin: string): string => {
    switch (origin) {
      case 'top':
        return 'center top';
      case 'bottom':
        return 'center bottom';
      case 'left':
        return 'left center';
      case 'right':
        return 'right center';
      case 'center':
      default:
        return 'center center';
    }
  };

  const overshoot = params.overshoot ?? 0.1;
  const blurIntensity = params.blurIntensity ?? 10;
  const origin = params.origin ?? 'center';
  const staggerDelay = params.staggerDelay ?? 0;
  const transformOrigin = getTransformOrigin(origin);

  // Calculate keyframe progress points for elastic curve
  const opacityMidPoint = 0.3;
  const scalePeakPoint = 0.6;
  const rotationPeakPoint = 0.5;
  const blurEndPoint = 0.4;

  // Calculate rotation values (small rotation that settles to 0)
  const rotationStart = -5;
  const rotationPeak = 5;
  const rotationEnd = 0;

  // Calculate scale values with overshoot
  const scaleStart = 0.7;
  const scalePeak = 1.0 + overshoot; // e.g., 1.1 with default overshoot
  const scaleEnd = 1.0;

  // Create effects for each target ID with stagger
  const effects = params.targetIds.map((targetId, index) => {
    const staggerOffset = index * staggerDelay;
    const adjustedStart = params.effectStart + staggerOffset;

    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: adjustedStart,
      duration: params.effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Opacity: 0 → 0.8 → 1
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.8, prog: opacityMidPoint },
        { key: 'opacity', val: 1, prog: 1 },
        
        // Scale: 0.7 → 1.1 (overshoot) → 1 (settle)
        { key: 'scale', val: scaleStart, prog: 0 },
        { key: 'scale', val: scalePeak, prog: scalePeakPoint },
        { key: 'scale', val: scaleEnd, prog: 1 },
        
        // Rotation: -5deg → 5deg → 0deg (settle)
        { key: 'rotate', val: rotationStart, prog: 0 },
        { key: 'rotate', val: rotationPeak, prog: rotationPeakPoint },
        { key: 'rotate', val: rotationEnd, prog: 1 },
        
        // Blur: intensity → 0 (blur-to-focus)
        { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 0 },
        { key: 'filter', val: 'blur(0px)', prog: blurEndPoint },
        
        // Transform origin (maintains consistent origin throughout)
        { key: 'transformOrigin', val: transformOrigin, prog: 0 },
        { key: 'transformOrigin', val: transformOrigin, prog: 1 },
      ],
    };

    return {
      id: params.effectId
        ? `${params.effectId}-${targetId}-${index}`
        : `elastic-reveal-${targetId}-${index}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  return {
    output: {
      childrenData: [
        {
          id: 'elastic-reveal-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
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
  id: 'elastic-reveal',
  title: 'ElasticReveal Effect',
  description:
    'Internal effect preset optimized for text and image reveal animations with elastic overshoot on multiple properties: opacity fade-in, scale with overshoot, rotation settling, and blur-to-focus transition. Supports stagger delays for multi-element reveals with configurable overshoot amount, blur intensity, and reveal origin.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'reveal', 'elastic', 'internal', 'generic', 'multi-property'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['element-1'],
    effectStart: 0,
    effectDuration: 1.5,
    overshoot: 0.1,
    blurIntensity: 10,
    origin: 'center',
    staggerDelay: 0,
  },
};

export const elasticRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
