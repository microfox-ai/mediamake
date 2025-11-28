/**
 * Depth of Field Effect Preset
 *
 * INTERNAL EFFECT PRESET - RETURNS ARRAY OF EFFECTS
 *
 * This internal effect preset simulates cinematic depth-of-field transitions using combined
 * opacity and blur animations. It creates rack focus effects where elements fade in/out while
 * simultaneously adjusting blur levels to mimic cinematography techniques.
 *
 * Features:
 * - Focus-in and focus-out directions (sharp→blur or blur→sharp)
 * - Configurable blur intensity (0-20px range)
 * - Multiple opacity curve types (linear, ease-in-out)
 * - Hold parameter to maintain focus state before reversing
 * - Staggered timing offsets for layered depth perception
 * - Supports multiple target elements simultaneously
 *
 * Technical details:
 * - Effect type: generic (AnimationRange[])
 * - Properties: opacity (0-1), filter blur (0-20px)
 * - Mode: provider with targetIds for direct component targeting
 * - Returns array of effects for synchronized opacity and blur transitions
 *
 * Use cases:
 * - Cinematic focus transitions between elements
 * - Layered depth perception with staggered timing
 * - Rack focus effects for visual hierarchy
 * - Dynamic focus shifts in narrative sequences
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to target with the effect'),
  effectStart: z.number().describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().default(1).describe('Duration of the focus transition in seconds'),
  blurIntensity: z.number().min(0).max(20).default(10).describe('Maximum blur intensity in pixels (0-20px range)'),
  direction: z.enum(['in', 'out']).default('in').describe('Focus direction: "in" (blur→sharp) or "out" (sharp→blur)'),
  opacityCurve: z.enum(['linear', 'ease-in-out']).default('ease-in-out').describe('Opacity animation curve type'),
  hold: z.number().optional().describe('Optional duration in seconds to maintain focus state before reversing'),
  stagger: z.number().default(0.1).describe('Time offset in seconds between each target element for layered depth'),
  effectIdPrefix: z.string().optional().describe('Optional prefix for effect IDs'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    effectStart,
    effectDuration,
    blurIntensity,
    direction,
    opacityCurve,
    hold,
    stagger,
    effectIdPrefix,
  } = params;

  // Helper function to generate blur value strings
  const generateBlurValue = (intensity: number): string => {
    return `blur(${intensity}px)`;
  };

  // Generate effects for each target with staggered timing
  const effects = targetIds.map((targetId, index) => {
    const staggerOffset = index * stagger;
    const effectId = effectIdPrefix
      ? `${effectIdPrefix}-${targetId}-${index}`
      : `depth-of-field-${targetId}-${index}`;

    // Determine opacity and blur progressions based on direction
    let opacityValues: number[];
    let blurValues: string[];
    let progressValues: number[];

    if (direction === 'in') {
      // Focus-in: blur→sharp, fade-in
      opacityValues = [0, 0.3, 0.7, 1];
      blurValues = [
        generateBlurValue(blurIntensity),
        generateBlurValue(blurIntensity * 0.5),
        generateBlurValue(blurIntensity * 0.15),
        generateBlurValue(0),
      ];
      progressValues = [0, 0.3, 0.7, 1];
    } else {
      // Focus-out: sharp→blur, fade-out
      opacityValues = [1, 0.7, 0.3, 0];
      blurValues = [
        generateBlurValue(0),
        generateBlurValue(blurIntensity * 0.15),
        generateBlurValue(blurIntensity * 0.5),
        generateBlurValue(blurIntensity),
      ];
      progressValues = [0, 0.3, 0.7, 1];
    }

    // If hold parameter is provided, create sequence with hold state
    if (hold && hold > 0) {
      const totalDuration = effectDuration + hold + effectDuration;
      const focusInEnd = effectDuration / totalDuration;
      const holdEnd = (effectDuration + hold) / totalDuration;

      if (direction === 'in') {
        // Focus-in → hold → focus-out
        opacityValues = [0, 0.3, 0.7, 1, 1, 0.7, 0.3, 0];
        blurValues = [
          generateBlurValue(blurIntensity),
          generateBlurValue(blurIntensity * 0.5),
          generateBlurValue(blurIntensity * 0.15),
          generateBlurValue(0),
          generateBlurValue(0),
          generateBlurValue(blurIntensity * 0.15),
          generateBlurValue(blurIntensity * 0.5),
          generateBlurValue(blurIntensity),
        ];
        progressValues = [
          0,
          focusInEnd * 0.3,
          focusInEnd * 0.7,
          focusInEnd,
          holdEnd,
          holdEnd + (1 - holdEnd) * 0.3,
          holdEnd + (1 - holdEnd) * 0.7,
          1,
        ];
      } else {
        // Focus-out → hold → focus-in
        opacityValues = [1, 0.7, 0.3, 0, 0, 0.3, 0.7, 1];
        blurValues = [
          generateBlurValue(0),
          generateBlurValue(blurIntensity * 0.15),
          generateBlurValue(blurIntensity * 0.5),
          generateBlurValue(blurIntensity),
          generateBlurValue(blurIntensity),
          generateBlurValue(blurIntensity * 0.5),
          generateBlurValue(blurIntensity * 0.15),
          generateBlurValue(0),
        ];
        progressValues = [
          0,
          focusInEnd * 0.3,
          focusInEnd * 0.7,
          focusInEnd,
          holdEnd,
          holdEnd + (1 - holdEnd) * 0.3,
          holdEnd + (1 - holdEnd) * 0.7,
          1,
        ];
      }
    }

    // Build animation ranges
    const ranges = [
      ...opacityValues.map((val, idx) => ({
        key: 'opacity',
        val,
        prog: progressValues[idx],
      })),
      ...blurValues.map((val, idx) => ({
        key: 'filter',
        val,
        prog: progressValues[idx],
      })),
    ];

    const effectData: GenericEffectData = {
      type: opacityCurve === 'linear' ? 'linear' : 'ease-in-out',
      start: effectStart + staggerOffset,
      duration: hold && hold > 0 ? effectDuration + hold + effectDuration : effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: effectData,
    };
  });

  return {
    output: {
      childrenData: [
        {
          id: 'depth-of-field-effect-container',
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
              duration: 10,
            },
          },
          effects,
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
  id: 'depth-of-field-effect',
  title: 'DepthOfField',
  description:
    'Internal effect preset that simulates camera focus changes using combined opacity and blur animations. Creates cinematic depth-of-field transitions with rack focus techniques, supporting focus-in/out directions, hold durations, and staggered timing for multiple target elements.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'depth-of-field', 'blur', 'opacity', 'cinematic', 'rack-focus'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['component-1'],
    effectStart: 0,
    effectDuration: 1,
    blurIntensity: 10,
    direction: 'in',
    opacityCurve: 'ease-in-out',
    stagger: 0.1,
  },
};

export const depthOfFieldEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
