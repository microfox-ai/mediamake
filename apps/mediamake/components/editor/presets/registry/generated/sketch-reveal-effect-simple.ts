/**
 * SketchReveal Effect Preset (Simplified)
 *
 * This is an INTERNAL EFFECT PRESET that simulates a hand-drawn sketch reveal effect.
 * Since true SVG stroke-dasharray animations are not supported in this system, we use
 * a creative combination of opacity, scale, and blur with irregular timing to mimic the
 * feel of a sketch being drawn.
 *
 * SINGLE EFFECT:
 * Applies a multi-stage reveal animation with:
 * - Irregular timing keyframes to simulate human drawing speed variations
 * - Opacity fade-in with custom easing
 * - Optional scale/transform for added depth
 * - Blur transitions for "drawing" feel
 *
 * This effect is designed to be applied to any visual element (text, image, video)
 * to create the illusion of a sketch reveal.
 *
 * Parameters:
 * - targetId: Component ID to apply the effect to
 * - effectStart: Start time of the effect (relative to parent)
 * - effectDuration: Duration of the effect (default 2s)
 * - strokeStyle: Visual style ('pencil', 'pen', 'marker') affects intensity
 * - direction: Reveal direction ('ltr', 'rtl', 'outward', 'inward')
 * - strokeWidth: Visual intensity multiplier (default 2)
 *
 * Usage:
 * Call this preset from another preset via dependencies to create sketch reveal effects.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the sketch reveal effect to'),
  effectStart: z.number().default(0).describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z.number().default(2).describe('Duration of the sketch reveal effect in seconds'),
  strokeStyle: z.enum(['pencil', 'pen', 'marker']).default('pencil').describe('Visual style of the sketch effect - pencil (soft), pen (sharp), marker (bold)'),
  direction: z.enum(['ltr', 'rtl', 'outward', 'inward']).default('ltr').describe('Reveal direction - ltr (left-to-right), rtl (right-to-left), outward (center-to-edges), inward (edges-to-center)'),
  strokeWidth: z.number().min(1).max(5).default(2).describe('Visual intensity multiplier for the effect (1 = subtle, 5 = intense)'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    effectStart,
    effectDuration,
    strokeStyle,
    direction,
    strokeWidth,
    effectId,
  } = params;

  // Calculate style-specific parameters
  const getStyleParams = (style: string) => {
    switch (style) {
      case 'pen':
        return { blurMax: 1, scaleStart: 0.98, contrastMax: 1.2 };
      case 'marker':
        return { blurMax: 3, scaleStart: 0.95, contrastMax: 1.1 };
      case 'pencil':
      default:
        return { blurMax: 2, scaleStart: 0.97, contrastMax: 1.15 };
    }
  };

  const styleParams = getStyleParams(strokeStyle);
  const intensityMultiplier = strokeWidth / 2; // Normalize strokeWidth to intensity

  // Calculate direction-specific transform values
  const getDirectionTransform = (dir: string, prog: number) => {
    const baseTranslate = 20 * intensityMultiplier;
    switch (dir) {
      case 'rtl':
        return { translateX: baseTranslate * (1 - prog), translateY: 0 };
      case 'outward':
        return { 
          translateX: 0, 
          translateY: 0,
          scale: styleParams.scaleStart + (1 - styleParams.scaleStart) * prog 
        };
      case 'inward':
        return { 
          translateX: 0, 
          translateY: 0,
          scale: 1.05 - 0.05 * prog 
        };
      case 'ltr':
      default:
        return { translateX: -baseTranslate * (1 - prog), translateY: 0 };
    }
  };

  // Irregular timing keyframes to simulate human drawing variations
  // [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1] - non-linear progression
  const keyframes = [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1];

  // Build animation ranges with irregular timing
  const ranges: any[] = [];

  // Opacity reveal with micro-pauses
  ranges.push(
    { key: 'opacity', val: 0, prog: keyframes[0] },
    { key: 'opacity', val: 0.2, prog: keyframes[1] }, // Quick start
    { key: 'opacity', val: 0.35, prog: keyframes[2] }, // Slow down (micro-pause)
    { key: 'opacity', val: 0.65, prog: keyframes[3] }, // Faster
    { key: 'opacity', val: 0.8, prog: keyframes[4] }, // Steady
    { key: 'opacity', val: 0.95, prog: keyframes[5] }, // Almost done
    { key: 'opacity', val: 1, prog: keyframes[6] },
  );

  // Blur transitions for "drawing" feel
  const blurMax = styleParams.blurMax * intensityMultiplier;
  ranges.push(
    { key: 'blur', val: `${blurMax}px`, prog: keyframes[0] },
    { key: 'blur', val: `${blurMax * 0.7}px`, prog: keyframes[1] },
    { key: 'blur', val: `${blurMax * 0.5}px`, prog: keyframes[2] },
    { key: 'blur', val: `${blurMax * 0.3}px`, prog: keyframes[3] },
    { key: 'blur', val: `${blurMax * 0.15}px`, prog: keyframes[4] },
    { key: 'blur', val: `${blurMax * 0.05}px`, prog: keyframes[5] },
    { key: 'blur', val: '0px', prog: keyframes[6] },
  );

  // Direction-based transforms with irregular timing
  keyframes.forEach((prog) => {
    const transform = getDirectionTransform(direction, prog);
    if (transform.translateX !== undefined) {
      ranges.push({ key: 'translateX', val: transform.translateX, prog });
    }
    if (transform.translateY !== undefined) {
      ranges.push({ key: 'translateY', val: transform.translateY, prog });
    }
    if (transform.scale !== undefined) {
      ranges.push({ key: 'scale', val: transform.scale, prog });
    }
  });

  // Subtle contrast/brightness for texture
  const contrastMax = styleParams.contrastMax;
  ranges.push(
    { key: 'brightness', val: 0.9, prog: keyframes[0] },
    { key: 'brightness', val: 0.95, prog: keyframes[2] },
    { key: 'brightness', val: 1, prog: keyframes[4] },
    { key: 'brightness', val: 1, prog: keyframes[6] },
  );
  ranges.push(
    { key: 'contrast', val: contrastMax, prog: keyframes[0] },
    { key: 'contrast', val: (contrastMax + 1) / 2, prog: keyframes[3] },
    { key: 'contrast', val: 1, prog: keyframes[6] },
  );

  // Custom cubic-bezier for hand-drawn feel (ease-in-out with variation)
  const easingType = 'ease-in-out';

  const effectData: GenericEffectData = {
    type: easingType,
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges,
  };

  const effect = {
    id: effectId || `sketch-reveal-${targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'sketch-reveal-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
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
  id: 'sketchRevealEffect',
  title: 'SketchReveal Effect (Simplified)',
  description: 'Simulates a hand-drawn sketch being drawn in real-time using opacity, scale, and blur with irregular timing',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'sketch', 'reveal', 'animated', 'generic', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 2,
    strokeStyle: 'pencil',
    direction: 'ltr',
    strokeWidth: 2,
  },
};

export const sketchRevealEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
