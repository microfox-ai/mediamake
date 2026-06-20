/**
 * Elastic Glitch Effect (Internal Effect Preset)
 *
 * ARRAY OF EFFECTS:
 * Returns two effects for an elastic motion with glitch-style interruptions.
 * - Transform glitches: sudden position/scale jumps at specific progress points
 * - Filter glitches: blur spikes, brightness flashes during glitch moments
 *
 * The effect performs smooth elastic animations but randomly introduces brief 'glitch'
 * moments where the motion stutters, jumps, or distorts before continuing the elastic curve.
 * Glitches occur at specific progress values (0.25, 0.5, 0.75) for intentional, rhythmic feel.
 *
 * Parameters:
 * - glitchFrequency: Number of glitch points (1-3 corresponding to prog 0.25, 0.5, 0.75)
 * - glitchIntensity: Intensity multiplier for glitch effects (0-1)
 * - includeColorShift: Whether to include color shifts during glitches
 * - duration: Duration of the effect
 * - targetIds: Array of component IDs to apply the effect to
 *
 * Use case: Modern, edgy UI animations for tech content, music videos, social media
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  glitchFrequency: z
    .number()
    .min(1)
    .max(3)
    .default(3)
    .describe('Number of glitch points (1-3 at progress 0.25, 0.5, 0.75)'),
  glitchIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity multiplier for glitch effects'),
  includeColorShift: z
    .boolean()
    .default(false)
    .describe('Whether to include color shifts during glitches'),
  duration: z.number().default(1).describe('Duration of the effect in seconds'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    glitchFrequency,
    glitchIntensity,
    includeColorShift,
    duration,
    targetIds,
    effectStart,
    effectId,
  } = params;

  // Helper function to create glitch keyframes at specific progress points
  const createGlitchKeyframes = (
    baseKey: string,
    baseValue: number,
    glitchValue: number,
    glitchPoints: number[],
  ) => {
    const keyframes: Array<{ key: string; val: any; prog: number }> = [];
    const glitchDuration = 0.05; // Short glitch duration as fraction of total

    // Start at base value
    keyframes.push({ key: baseKey, val: baseValue, prog: 0 });

    // Add glitch keyframes at specified points
    glitchPoints.forEach((point) => {
      // Before glitch - elastic ease in
      keyframes.push({
        key: baseKey,
        val: baseValue,
        prog: Math.max(0, point - glitchDuration),
      });
      // Glitch peak
      keyframes.push({ key: baseKey, val: glitchValue, prog: point });
      // After glitch - snap back
      keyframes.push({
        key: baseKey,
        val: baseValue,
        prog: Math.min(1, point + glitchDuration),
      });
    });

    // End at base value
    keyframes.push({ key: baseKey, val: baseValue, prog: 1 });

    return keyframes;
  };

  // Determine glitch points based on frequency
  const glitchPoints: number[] = [];
  if (glitchFrequency >= 1) glitchPoints.push(0.25);
  if (glitchFrequency >= 2) glitchPoints.push(0.5);
  if (glitchFrequency >= 3) glitchPoints.push(0.75);

  // Calculate glitch intensities
  const translateGlitch = 50 * glitchIntensity;
  const scaleGlitch = 0.2 * glitchIntensity;
  const blurGlitch = 10 * glitchIntensity;
  const brightnessGlitch = 0.5 * glitchIntensity;

  // Transform effect ranges (position and scale glitches)
  const transformRanges: Array<{ key: string; val: any; prog: number }> = [];

  // Base elastic animation (translateX)
  const translateXKeyframes = [
    { key: 'translateX', val: 0, prog: 0 },
    { key: 'translateX', val: 20, prog: 0.15 },
    { key: 'translateX', val: 0, prog: 0.35 },
    { key: 'translateX', val: -10, prog: 0.55 },
    { key: 'translateX', val: 0, prog: 0.7 },
    { key: 'translateX', val: 5, prog: 0.85 },
    { key: 'translateX', val: 0, prog: 1 },
  ];

  // Add glitch jumps to translateX
  glitchPoints.forEach((point) => {
    const glitchDuration = 0.02;
    transformRanges.push({
      key: 'translateX',
      val: translateGlitch,
      prog: point,
    });
    transformRanges.push({
      key: 'translateX',
      val: -translateGlitch * 0.5,
      prog: point + glitchDuration,
    });
  });

  // Merge base animation with glitches
  transformRanges.push(...translateXKeyframes);

  // Scale glitches
  const scaleKeyframes = [
    { key: 'scale', val: 1, prog: 0 },
    { key: 'scale', val: 1.05, prog: 0.15 },
    { key: 'scale', val: 1, prog: 0.35 },
    { key: 'scale', val: 0.98, prog: 0.55 },
    { key: 'scale', val: 1, prog: 1 },
  ];

  glitchPoints.forEach((point) => {
    const glitchDuration = 0.02;
    transformRanges.push({
      key: 'scale',
      val: 1 + scaleGlitch,
      prog: point,
    });
    transformRanges.push({
      key: 'scaleX',
      val: 1 - scaleGlitch * 0.5,
      prog: point + glitchDuration * 0.5,
    });
    transformRanges.push({
      key: 'scale',
      val: 1,
      prog: point + glitchDuration,
    });
  });

  transformRanges.push(...scaleKeyframes);

  // Optional: Add rotation glitches
  glitchPoints.forEach((point) => {
    const rotationGlitch = 5 * glitchIntensity;
    transformRanges.push({
      key: 'rotate',
      val: rotationGlitch,
      prog: point,
    });
    transformRanges.push({
      key: 'rotate',
      val: 0,
      prog: point + 0.02,
    });
  });

  // Filter effect ranges (blur spikes, brightness flashes)
  const filterRanges: Array<{ key: string; val: any; prog: number }> = [];

  // Base filter state (no effect)
  filterRanges.push({
    key: 'filter',
    val: 'blur(0px) brightness(1)',
    prog: 0,
  });

  // Add glitch filter spikes
  glitchPoints.forEach((point) => {
    const glitchDuration = 0.03;

    // Before glitch
    filterRanges.push({
      key: 'filter',
      val: 'blur(0px) brightness(1)',
      prog: Math.max(0, point - 0.01),
    });

    // Glitch peak
    const blurValue = `blur(${blurGlitch}px)`;
    const brightnessValue = `brightness(${1 + brightnessGlitch})`;
    const contrastValue = includeColorShift ? ' contrast(1.5)' : '';
    const hueRotateValue = includeColorShift
      ? ` hue-rotate(${180 * glitchIntensity}deg)`
      : '';

    filterRanges.push({
      key: 'filter',
      val: `${blurValue} ${brightnessValue}${contrastValue}${hueRotateValue}`,
      prog: point,
    });

    // After glitch - snap back
    filterRanges.push({
      key: 'filter',
      val: 'blur(0px) brightness(1)',
      prog: Math.min(1, point + glitchDuration),
    });
  });

  // End state
  filterRanges.push({
    key: 'filter',
    val: 'blur(0px) brightness(1)',
    prog: 1,
  });

  // Optional: Add opacity flickers during glitches
  if (glitchIntensity > 0.3) {
    glitchPoints.forEach((point) => {
      filterRanges.push({
        key: 'opacity',
        val: 0.7,
        prog: point,
      });
      filterRanges.push({
        key: 'opacity',
        val: 1,
        prog: point + 0.01,
      });
    });
  }

  // Create transform effect
  const transformEffect: GenericEffectData = {
    type: 'ease-out', // Base elastic easing
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: transformRanges.sort((a, b) => a.prog - b.prog),
  };

  // Create filter effect
  const filterEffect: GenericEffectData = {
    type: 'linear', // Sharp transitions for glitch feel
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: filterRanges.sort((a, b) => a.prog - b.prog),
  };

  // Create effect objects
  const effects = [
    {
      id: `${effectId || 'elastic-glitch'}-transform`,
      componentId: 'generic',
      data: transformEffect,
    },
    {
      id: `${effectId || 'elastic-glitch'}-filter`,
      componentId: 'generic',
      data: filterEffect,
    },
  ];

  // Return in container structure (system extracts effects)
  const rootContainer: RenderableComponentData = {
    id: 'elastic-glitch-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 0.01,
      },
    },
    effects: effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'elastic-glitch-effect',
  title: 'Elastic Glitch Effect (Internal)',
  description:
    'Internal effect preset that combines elastic motion with glitch-style interruptions. Performs smooth elastic animations with intentional glitch moments at specific progress points (0.25, 0.5, 0.75) featuring transform jumps, blur spikes, and brightness flashes. Configurable glitch frequency, intensity, and color shift effects. Returns complete effect configuration objects for consumption by other presets.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'glitch', 'elastic', 'distortion'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    glitchFrequency: 3,
    glitchIntensity: 0.5,
    includeColorShift: false,
    duration: 1,
    targetIds: ['target-component'],
    effectStart: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const elasticGlitchEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
