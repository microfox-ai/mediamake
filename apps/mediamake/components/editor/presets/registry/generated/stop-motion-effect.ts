/**
 * StopMotion Internal Effect Preset
 *
 * ARRAY OF EFFECTS
 * Creates a choppy, frame-by-frame animation style like stop-motion or claymation.
 * The effect reduces framerate, adds subtle position jitter, and includes slight 
 * scale variations to mimic the imperfections of physical animation.
 *
 * Features:
 * - Stepped keyframe animations based on fps parameter (4-12 for authentic feel)
 * - Position jitter (random translateX/translateY offsets at each frame)
 * - Scale variations (micro-scale changes to simulate physical imperfections)
 * - Style presets (claymation, paper-cutout, lego) with unique characteristics
 * - Optional motion blur between frames for smoother transitions
 * - Uses steps() timing function for discrete frame-by-frame feel
 *
 * Technical implementation:
 * - Calculates discrete keyframe positions based on fps (e.g., fps=6 → 7 keyframes over 1s)
 * - At each prog value, applies random jitter within ±jitterAmount pixels
 * - Adds subtle scale variations (1 ± scaleVariation) at each keyframe
 * - Uses linear easing with discrete prog-based keyframes for stepped animation
 * - Returns array of effects: position jitter, scale variation, optional blur
 *
 * Use cases:
 * - Creating stop-motion style animations from regular content
 * - Mimicking claymation or LEGO animation aesthetics
 * - Adding handmade, imperfect animation feel to videos
 * - Building retro or nostalgic video effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply stop-motion effect to'),
  duration: z
    .number()
    .min(0.1)
    .describe('Duration of the effect in seconds'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  fps: z
    .number()
    .min(4)
    .max(12)
    .default(8)
    .describe('Frames per second for stop-motion feel (4-12 for authentic look)'),
  jitterAmount: z
    .number()
    .min(0)
    .max(20)
    .default(3)
    .describe('Pixel amount for position jitter to simulate camera shake'),
  scaleVariation: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.01)
    .describe('Scale variation amount (0-1) to simulate physical imperfections'),
  style: z
    .enum(['claymation', 'paper-cutout', 'lego'])
    .default('claymation')
    .describe('Visual style preset affecting jitter and scale characteristics'),
  motionBlur: z
    .boolean()
    .default(false)
    .describe('Whether to include subtle motion blur between frames'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for generated effect IDs'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate random jitter
  const randomJitter = (amount: number): number => {
    return (Math.random() - 0.5) * 2 * amount;
  };

  // Helper function to generate random scale variation
  const randomScale = (baseScale: number, variation: number): number => {
    return baseScale + (Math.random() - 0.5) * 2 * variation;
  };

  // Adjust parameters based on style preset
  const getStyleParams = (style: string) => {
    switch (style) {
      case 'claymation':
        return {
          jitterMultiplier: 1.2,
          scaleMultiplier: 1.5,
          rotationRange: 2,
        };
      case 'paper-cutout':
        return {
          jitterMultiplier: 0.8,
          scaleMultiplier: 0.7,
          rotationRange: 3,
        };
      case 'lego':
        return {
          jitterMultiplier: 1.5,
          scaleMultiplier: 1.0,
          rotationRange: 1.5,
        };
      default:
        return {
          jitterMultiplier: 1.0,
          scaleMultiplier: 1.0,
          rotationRange: 2,
        };
    }
  };

  const styleParams = getStyleParams(params.style);
  const adjustedJitter = params.jitterAmount * styleParams.jitterMultiplier;
  const adjustedScale = params.scaleVariation * styleParams.scaleMultiplier;

  // Calculate number of frames based on fps and duration
  const numFrames = Math.floor(params.fps * params.duration);
  const totalKeyframes = numFrames + 1; // Include start and end

  // Generate discrete keyframes for position jitter
  const jitterRanges: Array<{ key: string; val: number; prog: number }> = [];
  
  for (let i = 0; i < totalKeyframes; i++) {
    const prog = i / numFrames;
    const jitterX = randomJitter(adjustedJitter);
    const jitterY = randomJitter(adjustedJitter);
    
    jitterRanges.push(
      { key: 'translateX', val: jitterX, prog },
      { key: 'translateY', val: jitterY, prog }
    );
  }

  // Generate discrete keyframes for scale variation
  const scaleRanges: Array<{ key: string; val: number; prog: number }> = [];
  
  for (let i = 0; i < totalKeyframes; i++) {
    const prog = i / numFrames;
    const scale = randomScale(1, adjustedScale);
    
    scaleRanges.push({ key: 'scale', val: scale, prog });
  }

  // Generate discrete keyframes for subtle rotation (adds to stop-motion feel)
  const rotationRanges: Array<{ key: string; val: number; prog: number }> = [];
  
  for (let i = 0; i < totalKeyframes; i++) {
    const prog = i / numFrames;
    const rotation = (Math.random() - 0.5) * styleParams.rotationRange;
    
    rotationRanges.push({ key: 'rotate', val: rotation, prog });
  }

  // Create the main stop-motion effect
  const stopMotionEffect: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [...jitterRanges, ...scaleRanges, ...rotationRanges],
  };

  const effects = [
    {
      id: params.effectIdPrefix
        ? `${params.effectIdPrefix}-stop-motion`
        : `stop-motion-${params.targetIds[0]}`,
      componentId: 'generic',
      data: stopMotionEffect,
    },
  ];

  // Add optional motion blur effect between frames
  if (params.motionBlur) {
    const blurRanges: Array<{ key: string; val: string; prog: number }> = [];
    const blurAmount = 2; // Subtle blur in pixels

    for (let i = 0; i < totalKeyframes; i++) {
      const prog = i / numFrames;
      
      // Blur between frames (on) and sharp at frame positions (off)
      if (i < numFrames) {
        const midProg = prog + 0.5 / numFrames;
        blurRanges.push(
          { key: 'filter', val: `blur(0px)`, prog },
          { key: 'filter', val: `blur(${blurAmount}px)`, prog: midProg }
        );
      } else {
        blurRanges.push({ key: 'filter', val: `blur(0px)`, prog });
      }
    }

    const motionBlurEffect: GenericEffectData = {
      type: 'linear',
      start: params.effectStart,
      duration: params.duration,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: blurRanges,
    };

    effects.push({
      id: params.effectIdPrefix
        ? `${params.effectIdPrefix}-motion-blur`
        : `motion-blur-${params.targetIds[0]}`,
      componentId: 'generic',
      data: motionBlurEffect,
    });
  }

  return {
    output: {
      childrenData: [
        {
          id: 'stop-motion-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {},
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
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
  id: 'stop-motion-effect',
  title: 'Stop Motion Effect',
  description:
    'Internal effect preset that creates a choppy, frame-by-frame animation style like stop-motion or claymation. Reduces framerate, adds subtle position jitter, and includes slight scale variations to mimic the imperfections of physical animation.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'stop-motion', 'animation', 'claymation', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['component-1'],
    duration: 5,
    effectStart: 0,
    fps: 8,
    jitterAmount: 3,
    scaleVariation: 0.01,
    style: 'claymation',
    motionBlur: false,
  },
};

export const stopMotionEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
