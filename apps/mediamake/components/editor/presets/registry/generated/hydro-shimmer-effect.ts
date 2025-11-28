/**
 * HydroShimmer Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates shimmering, water-like reflections on text and images using:
 * - Rapid opacity flicker (0.7 to 1.0)
 * - Moving gradient mask reflection
 * - Micro-movements simulating water surface tension (±2px translateX/Y)
 * - Subtle hue shift cycling through cool water tones (cyan to blue to teal)
 * - Letter-spacing ripple for text elements (0 to 2px pulse)
 *
 * Returns multiple generic effects that can be applied to target components.
 * Perfect for underwater text effects or aquatic overlays.
 *
 * Parameters:
 * - shimmerSpeed: Duration of one shimmer cycle (default: 200ms)
 * - reflectionAngle: Gradient direction in degrees (default: 45)
 * - shimmerIntensity: Opacity range multiplier (default: 1.0)
 * - colorTint: Base water color (default: 'cyan')
 * - targetIds: Array of component IDs to apply effect to
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the HydroShimmer effect to'),
  shimmerSpeed: z
    .number()
    .min(50)
    .max(2000)
    .default(200)
    .optional()
    .describe('Duration of one shimmer cycle in milliseconds'),
  reflectionAngle: z
    .number()
    .min(0)
    .max(360)
    .default(45)
    .optional()
    .describe('Gradient direction angle in degrees'),
  shimmerIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1.0)
    .optional()
    .describe('Opacity range multiplier (1.0 = normal, higher = more intense)'),
  colorTint: z
    .string()
    .default('cyan')
    .optional()
    .describe('Base water color (cyan, blue, teal, or any CSS color)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate random micro-movement value
  const generateMicroMovement = (max: number): number => {
    return (Math.random() - 0.5) * 2 * max;
  };

  // Helper function to convert color tint to hue-rotate degrees
  const getHueRotateRange = (colorTint: string): [number, number, number] => {
    const tintMap: Record<string, [number, number, number]> = {
      cyan: [0, 15, 30],
      blue: [15, 22, 30],
      teal: [5, 15, 25],
      default: [0, 15, 30],
    };
    return tintMap[colorTint.toLowerCase()] || tintMap.default;
  };

  const shimmerSpeed = (params.shimmerSpeed ?? 200) / 1000; // Convert to seconds
  const reflectionAngle = params.reflectionAngle ?? 45;
  const shimmerIntensity = params.shimmerIntensity ?? 1.0;
  const colorTint = params.colorTint ?? 'cyan';
  const [hueMin, hueMid, hueMax] = getHueRotateRange(colorTint);

  // Base opacity range
  const baseOpacityMin = 0.7;
  const baseOpacityMax = 1.0;
  const opacityMin = Math.max(
    0,
    baseOpacityMin - (1 - shimmerIntensity) * 0.2,
  );
  const opacityMax = Math.min(1, baseOpacityMax * shimmerIntensity);

  const effects: Array<{
    id: string;
    componentId: string;
    data: GenericEffectData;
  }> = [];

  params.targetIds.forEach((targetId, index) => {
    const effectIdPrefix = params.effectId || `hydro-shimmer-${targetId}`;

    // Effect 1: Rapid opacity flicker (shimmer)
    const opacityEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: shimmerSpeed,
      mode: 'provider',
      targetIds: [targetId],
      loop: true,
      ranges: [
        { key: 'opacity', val: opacityMin, prog: 0 },
        { key: 'opacity', val: opacityMax, prog: 0.1 },
        { key: 'opacity', val: opacityMin + (opacityMax - opacityMin) * 0.5, prog: 0.2 },
        { key: 'opacity', val: opacityMax, prog: 0.3 },
        { key: 'opacity', val: opacityMin, prog: 0.4 },
        { key: 'opacity', val: opacityMax, prog: 0.5 },
        { key: 'opacity', val: opacityMin + (opacityMax - opacityMin) * 0.7, prog: 0.6 },
        { key: 'opacity', val: opacityMax, prog: 0.7 },
        { key: 'opacity', val: opacityMin + (opacityMax - opacityMin) * 0.3, prog: 0.8 },
        { key: 'opacity', val: opacityMax, prog: 0.9 },
        { key: 'opacity', val: opacityMin, prog: 1 },
      ],
    };

    effects.push({
      id: `${effectIdPrefix}-opacity`,
      componentId: 'generic',
      data: opacityEffect,
    });

    // Effect 2: Moving gradient mask reflection
    const gradientStartPos = -100;
    const gradientEndPos = 200;
    
    const gradientEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: shimmerSpeed * 3, // Slower than opacity flicker
      mode: 'provider',
      targetIds: [targetId],
      loop: true,
      ranges: [
        {
          key: 'filter',
          val: `brightness(1) drop-shadow(0 0 0px transparent)`,
          prog: 0,
        },
        {
          key: 'filter',
          val: `brightness(1.1) drop-shadow(0 0 5px rgba(0, 255, 255, 0.3))`,
          prog: 0.25,
        },
        {
          key: 'filter',
          val: `brightness(1.2) drop-shadow(0 0 10px rgba(0, 200, 255, 0.5))`,
          prog: 0.5,
        },
        {
          key: 'filter',
          val: `brightness(1.1) drop-shadow(0 0 5px rgba(0, 255, 200, 0.3))`,
          prog: 0.75,
        },
        {
          key: 'filter',
          val: `brightness(1) drop-shadow(0 0 0px transparent)`,
          prog: 1,
        },
      ],
    };

    effects.push({
      id: `${effectIdPrefix}-gradient`,
      componentId: 'generic',
      data: gradientEffect,
    });

    // Effect 3: Micro-movements (±2px translateX and translateY)
    const microMovementDuration = shimmerSpeed * 1.5;
    const maxMovement = 2;

    const microMovementEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: microMovementDuration,
      mode: 'provider',
      targetIds: [targetId],
      loop: true,
      ranges: [
        {
          key: 'translateX',
          val: generateMicroMovement(maxMovement),
          prog: 0,
        },
        {
          key: 'translateY',
          val: generateMicroMovement(maxMovement),
          prog: 0,
        },
        {
          key: 'translateX',
          val: generateMicroMovement(maxMovement),
          prog: 0.25,
        },
        {
          key: 'translateY',
          val: generateMicroMovement(maxMovement),
          prog: 0.25,
        },
        {
          key: 'translateX',
          val: generateMicroMovement(maxMovement),
          prog: 0.5,
        },
        {
          key: 'translateY',
          val: generateMicroMovement(maxMovement),
          prog: 0.5,
        },
        {
          key: 'translateX',
          val: generateMicroMovement(maxMovement),
          prog: 0.75,
        },
        {
          key: 'translateY',
          val: generateMicroMovement(maxMovement),
          prog: 0.75,
        },
        {
          key: 'translateX',
          val: 0,
          prog: 1,
        },
        {
          key: 'translateY',
          val: 0,
          prog: 1,
        },
      ],
    };

    effects.push({
      id: `${effectIdPrefix}-micro-movement`,
      componentId: 'generic',
      data: microMovementEffect,
    });

    // Effect 4: Hue shift (cool water tones)
    const hueShiftDuration = shimmerSpeed * 4;

    const hueShiftEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: hueShiftDuration,
      mode: 'provider',
      targetIds: [targetId],
      loop: true,
      ranges: [
        { key: 'hue-rotate', val: hueMin, prog: 0 },
        { key: 'hue-rotate', val: hueMid, prog: 0.33 },
        { key: 'hue-rotate', val: hueMax, prog: 0.66 },
        { key: 'hue-rotate', val: hueMin, prog: 1 },
      ],
    };

    effects.push({
      id: `${effectIdPrefix}-hue-shift`,
      componentId: 'generic',
      data: hueShiftEffect,
    });

    // Effect 5: Letter-spacing ripple (for text elements)
    const letterSpacingDuration = shimmerSpeed * 2;

    const letterSpacingEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: letterSpacingDuration,
      mode: 'provider',
      targetIds: [targetId],
      loop: true,
      ranges: [
        { key: 'letterSpacing', val: '0px', prog: 0 },
        { key: 'letterSpacing', val: '1px', prog: 0.25 },
        { key: 'letterSpacing', val: '2px', prog: 0.5 },
        { key: 'letterSpacing', val: '1px', prog: 0.75 },
        { key: 'letterSpacing', val: '0px', prog: 1 },
      ],
    };

    effects.push({
      id: `${effectIdPrefix}-letter-spacing`,
      componentId: 'generic',
      data: letterSpacingEffect,
    });
  });

  return {
    output: {
      childrenData: [
        {
          id: 'hydro-shimmer-effect-container',
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
  id: 'hydroShimmerEffect',
  title: 'HydroShimmer Internal Effect',
  description:
    'Creates shimmering, water-like reflections with opacity flickering, micro-movements, hue shifts, and letter-spacing ripples. Perfect for underwater text effects or aquatic overlays.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'shimmer',
    'water',
    'reflection',
    'aquatic',
    'underwater',
    'internal',
    'generic',
    'opacity',
    'hue-rotate',
    'letter-spacing',
    'micro-movement',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['text-1'],
    shimmerSpeed: 200,
    reflectionAngle: 45,
    shimmerIntensity: 1.0,
    colorTint: 'cyan',
  },
};

export const hydroShimmerEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
