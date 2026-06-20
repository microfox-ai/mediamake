/**
 * Stop Motion Claymation Text Animation Preset
 * 
 * Creates a choppy, film-strip style stop motion text animation that mimics classic claymation titles.
 * Each letter "pops" into existence with an abrupt, mechanical feel - like someone is physically placing
 * letter tiles one by one on a table. Features subtle shake/jitter after appearance to simulate the
 * imperfect, handmade quality of stop motion photography.
 * 
 * Features:
 * - Frame-by-frame aesthetic with steps() easing for choppy animation
 * - Irregular timing between letters (not perfectly uniform)
 * - Scale overshoot effect (camera zoom simulation)
 * - Random rotation for mechanical placement feel
 * - Continuous subtle shake/jitter after letter appears
 * - Horizontal text flow with baseline alignment
 * 
 * Use cases:
 * - Vintage claymation-style title sequences
 * - Stop-motion aesthetic intros
 * - Handmade, craft-style video titles
 * - Retro animation effects
 */

import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to animate with stop motion effect'),
  duration: z
    .number()
    .min(1)
    .default(5)
    .describe('Total duration of the animation in seconds'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .union([z.string(), z.number()])
    .default('bold')
    .describe('Font weight (e.g., "bold", 700)'),
  textColor: z
    .string()
    .default('#2c1810')
    .describe('Text color (CSS color value)'),
  letterDelay: z
    .number()
    .min(0.01)
    .max(0.5)
    .default(0.08)
    .describe('Base delay between letter appearances in seconds'),
  popDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.35)
    .describe('Duration of each letter pop-in animation in seconds'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Intensity of continuous shake effect in pixels'),
  randomVariation: z
    .number()
    .min(0)
    .max(0.05)
    .default(0.02)
    .describe('Random timing variation to add irregularity (±seconds)'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Generate random value within range
  const randomRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Split text into individual letters (including spaces)
  const letters = params.text.split('');
  
  // Calculate letter timing with irregular spacing
  const letterTimings = letters.map((_, index) => {
    const baseOffset = index * params.letterDelay;
    const randomOffset = randomRange(-params.randomVariation, params.randomVariation);
    return Math.max(0, baseOffset + randomOffset);
  });

  // Create letter components with effects
  const letterComponents: RenderableComponentData[] = letters.map((letter, index) => {
    const letterId = `letter-${index}`;
    const letterStart = letterTimings[index];
    
    // Random initial rotation for mechanical placement feel
    const initialRotation = randomRange(-5, 5);
    
    // Random jitter offsets for continuous shake
    const jitterX = randomRange(-params.shakeIntensity, params.shakeIntensity);
    const jitterY = randomRange(-params.shakeIntensity * 0.5, params.shakeIntensity * 0.5);

    // Pop-in effect with overshoot and settle
    const popEffect: GenericEffectData = {
      type: 'linear', // Linear for steps() easing
      start: letterStart,
      duration: params.popDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Initial state: invisible, scaled down, rotated
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'scale', val: 0.8, prog: 0 },
        { key: 'rotate', val: initialRotation, prog: 0 },
        
        // Overshoot at 40%: fully visible, scaled up
        { key: 'opacity', val: 1, prog: 0.4 },
        { key: 'scale', val: 1.15, prog: 0.4 },
        { key: 'rotate', val: initialRotation * 0.5, prog: 0.4 },
        
        // Settle at 100%: normal scale, slight jitter position
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'scale', val: 1, prog: 1 },
        { key: 'rotate', val: 0, prog: 1 },
        { key: 'translateY', val: randomRange(-1, 1), prog: 1 },
      ],
      // CRITICAL: Use CSS steps() for choppy, frame-skipping effect
      props: {
        transitionTimingFunction: 'steps(3)',
      },
    };

    // Continuous shake effect after pop-in completes
    const shakeStart = letterStart + params.popDuration;
    const shakeDuration = params.duration - shakeStart;
    
    const shakeEffect: GenericEffectData = {
      type: 'linear',
      start: shakeStart,
      duration: shakeDuration > 0 ? shakeDuration : 0.1,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Oscillating jitter pattern
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateX', val: jitterX, prog: 0.25 },
        { key: 'translateY', val: jitterY, prog: 0.25 },
        { key: 'translateX', val: -jitterX * 0.8, prog: 0.5 },
        { key: 'translateY', val: -jitterY * 0.8, prog: 0.5 },
        { key: 'translateX', val: jitterX * 0.6, prog: 0.75 },
        { key: 'translateY', val: jitterY * 0.6, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
      props: {
        transitionTimingFunction: 'steps(2)',
      },
    };

    // Letter wrapper (for individual positioning)
    const letterWrapper: RenderableComponentData = {
      id: `letter-wrapper-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative inline-block',
          style: {
            display: 'inline-block',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [
        {
          id: letterId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: letter,
            style: {
              fontSize: params.fontSize,
              fontWeight: params.fontWeight,
              color: params.textColor,
              textShadow: '2px 2px 0px rgba(0,0,0,0.1)',
            },
            font: {
              family: params.fontFamily,
              weights: typeof params.fontWeight === 'number' 
                ? [params.fontWeight.toString()] 
                : params.fontWeight === 'bold' 
                ? ['700'] 
                : ['400'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
          effects: shakeDuration > 0 
            ? [
                {
                  id: `pop-effect-${index}`,
                  componentId: 'generic',
                  data: popEffect,
                },
                {
                  id: `shake-effect-${index}`,
                  componentId: 'generic',
                  data: shakeEffect,
                },
              ]
            : [
                {
                  id: `pop-effect-${index}`,
                  componentId: 'generic',
                  data: popEffect,
                },
              ],
        } as RenderableComponentData,
      ],
    };

    return letterWrapper;
  });

  // Root container with flex layout for horizontal text flow
  const rootContainer: RenderableComponentData = {
    id: 'stop-motion-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-wrap items-baseline gap-1 justify-center',
        style: {
          width: '100%',
          height: '100%',
          alignItems: 'center',
          padding: '20px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: letterComponents,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'stop-motion-claymation-text',
  title: 'Stop Motion Claymation Text Animation',
  description:
    'Choppy, film-strip style stop motion text animation mimicking classic claymation titles. Each letter pops into existence with an abrupt, mechanical feel using irregular timing and frame-skipping effects. Features scale overshoot, settling animation, and continuous subtle shake/jitter to simulate handmade, frame-by-frame aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'stop-motion',
    'claymation',
    'vintage',
    'retro',
    'handmade',
    'choppy',
    'frame-by-frame',
    'mechanical',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'STOP MOTION',
    duration: 5,
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    textColor: '#2c1810',
    letterDelay: 0.08,
    popDuration: 0.35,
    shakeIntensity: 2,
    randomVariation: 0.02,
  },
};

// Export preset
export const stopMotionClaymationTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
