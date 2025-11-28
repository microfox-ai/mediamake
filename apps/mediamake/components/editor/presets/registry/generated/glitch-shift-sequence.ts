/**
 * Glitch Shift Sequence - Internal Effect Preset
 * 
 * Creates a cinematic RGB channel shift effect with random glitch intervals.
 * Simulates digital corruption by randomly offsetting color channels at specific intervals,
 * creating a stuttering, glitchy aesthetic. Uses a combination of CSS filters (hue-rotate,
 * saturate, contrast) and transform properties. The effect has distinct 'glitch moments'
 * with smooth transitions between them. Includes subtle noise/grain overlay during glitch
 * moments using CSS filters.
 * 
 * SINGLE EFFECT: Returns a single generic effect with multiple keyframes for glitch sequence.
 * 
 * Features:
 * - RGB channel shift simulation via transform and filter properties
 * - Random glitch intervals with stuttering aesthetic
 * - Configurable glitch frequency and intensity
 * - Color shift via hue-rotate filter
 * - Subtle noise/grain overlay during glitches
 * - Smooth transitions between glitch and normal states
 * 
 * Use cases:
 * - Digital corruption effects for tech/cyber content
 * - Glitch transitions and title sequences
 * - VHS/retro distortion effects
 * - Music video visual effects
 * - Dynamic text and image treatments
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the glitch effect to'),
  glitchFrequency: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('Number of glitch moments during the sequence (higher = more frequent glitches)'),
  glitchIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Severity of channel shifts and distortion (0 = subtle, 1 = extreme)'),
  colorShift: z
    .number()
    .min(0)
    .max(360)
    .default(180)
    .describe('Maximum hue rotation amount in degrees during glitches'),
  sequenceDuration: z
    .number()
    .min(1)
    .max(30)
    .default(3)
    .describe('Total duration of the glitch sequence in seconds'),
  loop: z
    .boolean()
    .default(false)
    .optional()
    .describe('Whether to loop the glitch sequence infinitely'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    glitchFrequency,
    glitchIntensity,
    colorShift,
    sequenceDuration,
    loop,
    effectId,
  } = params;

  // Helper function to generate glitch keyframes
  const generateGlitchKeyframes = (): any[] => {
    // Base keyframe positions for stuttering effect
    const baseProgValues = [0, 0.1, 0.15, 0.3, 0.35, 0.5, 0.6, 0.65, 0.8, 0.85, 1];
    
    // Determine which positions are glitch moments based on frequency
    const glitchIndices: number[] = [];
    const step = Math.floor(baseProgValues.length / (glitchFrequency + 1));
    for (let i = 1; i <= glitchFrequency; i++) {
      const index = Math.min(i * step, baseProgValues.length - 2);
      glitchIndices.push(index);
    }

    const keyframes: any[] = [];

    baseProgValues.forEach((prog, index) => {
      const isGlitch = glitchIndices.includes(index);
      const isGlitchEnd = index > 0 && glitchIndices.includes(index - 1);

      if (isGlitch) {
        // Glitch moment - extreme distortion
        const intensityFactor = glitchIntensity;
        const translateX = (Math.random() - 0.5) * 20 * intensityFactor;
        const skewX = (Math.random() - 0.5) * 10 * intensityFactor;
        const hueRotate = Math.random() * colorShift;
        const saturate = 0.5 + Math.random() * 1.5 * intensityFactor;
        const contrast = 0.8 + Math.random() * 0.7 * intensityFactor;
        const blur = Math.random() * 2 * intensityFactor;

        // RGB channel shift simulation via filters and transforms
        keyframes.push(
          {
            key: 'translateX',
            val: `${translateX}px`,
            prog,
          },
          {
            key: 'skewX',
            val: `${skewX}deg`,
            prog,
          },
          {
            key: 'filter',
            val: `hue-rotate(${hueRotate}deg) saturate(${saturate}) contrast(${contrast}) blur(${blur}px)`,
            prog,
          }
        );
      } else if (isGlitchEnd) {
        // Transition back to normal after glitch
        keyframes.push(
          {
            key: 'translateX',
            val: '0px',
            prog,
          },
          {
            key: 'skewX',
            val: '0deg',
            prog,
          },
          {
            key: 'filter',
            val: 'hue-rotate(0deg) saturate(1) contrast(1) blur(0px)',
            prog,
          }
        );
      } else {
        // Normal state - no distortion
        keyframes.push(
          {
            key: 'translateX',
            val: '0px',
            prog,
          },
          {
            key: 'skewX',
            val: '0deg',
            prog,
          },
          {
            key: 'filter',
            val: 'hue-rotate(0deg) saturate(1) contrast(1) blur(0px)',
            prog,
          }
        );
      }
    });

    return keyframes;
  };

  // Generate glitch keyframes
  const glitchKeyframes = generateGlitchKeyframes();

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear for precise keyframe control
    start: 0,
    duration: sequenceDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: glitchKeyframes,
    iterations: loop ? 'infinite' : 1,
  };

  // Create effect node
  const effect = {
    id: effectId || `glitch-shift-${targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'glitch-shift-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: sequenceDuration,
      },
    },
    effects: [effect],
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
  id: 'glitch-shift-sequence',
  title: 'Glitch Shift Sequence Effect',
  description:
    'Internal effect preset that creates a cinematic RGB channel shift effect with random glitch intervals. Simulates digital corruption by randomly offsetting color channels at specific intervals, creating a stuttering, glitchy aesthetic. Combines CSS filters (hue-rotate, saturate, contrast) with transform properties (translateX, skewX). Features distinct "glitch moments" with smooth transitions and subtle noise/grain overlay during glitches.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'glitch', 'rgb-shift', 'corruption', 'distortion', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    glitchFrequency: 5,
    glitchIntensity: 0.6,
    colorShift: 180,
    sequenceDuration: 3,
    loop: false,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchShiftSequencePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
