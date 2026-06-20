/**
 * Breathing Zoom Text Preset
 *
 * This preset creates an organic breathing effect on text that pulsates gently
 * like a living organism. It combines a sine wave scale pattern (99%-101%) with
 * an overall growth from 100% to 102% over the full duration.
 *
 * Features:
 * - **Sine Wave Breathing**: Text scales between 99% and 101% in a continuous loop
 * - **Breath Cycle Duration**: Each breath cycle lasts 3-4 seconds (configurable)
 * - **Overall Growth**: Subtle zoom from 100% to 102% over full duration
 * - **Organic Motion**: Combines breathing with slow dolly zoom effect
 * - **Meditative Quality**: Subtle, natural motion that feels like watching someone breathe
 *
 * Use cases:
 * - Creating meditative text animations
 * - Adding organic, living quality to static text
 * - Building calm, breathing title sequences
 * - Creating natural camera shake effects using scale instead of position
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the animation in seconds'),
  breathingSpeed: z
    .number()
    .min(2)
    .max(5)
    .default(3.5)
    .describe('Duration of each breath cycle in seconds (2-5 seconds)'),
  breathingMin: z
    .number()
    .min(0.9)
    .max(0.99)
    .default(0.99)
    .describe('Minimum scale during breathing (0.9-0.99)'),
  breathingMax: z
    .number()
    .min(1.01)
    .max(1.1)
    .default(1.01)
    .describe('Maximum scale during breathing (1.01-1.1)'),
  overallGrowthEnd: z
    .number()
    .min(1)
    .max(1.2)
    .default(1.02)
    .describe('Final scale at end of animation (1.0-1.2)'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(60)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#1f2937')
    .describe('Text color (CSS color value)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('400')
    .describe('Font weight (e.g., "400", "700")'),
  samplesPerCycle: z
    .number()
    .min(4)
    .max(20)
    .default(10)
    .describe('Number of keyframes per breath cycle (higher = smoother)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate sine wave breathing keyframes
  const generateBreathingKeyframes = () => {
    const {
      duration,
      breathingSpeed,
      breathingMin,
      breathingMax,
      overallGrowthEnd,
      samplesPerCycle,
    } = params;

    // Calculate number of breath cycles
    const numCycles = Math.ceil(duration / breathingSpeed);

    // Calculate total number of keyframes
    const totalKeyframes = numCycles * samplesPerCycle;

    // Generate keyframes
    const keyframes: { key: string; val: number; prog: number }[] = [];

    for (let i = 0; i <= totalKeyframes; i++) {
      // Progress through the animation (0-1)
      const prog = Math.min(i / totalKeyframes, 1);

      // Progress through the current breath cycle (0-1)
      const cycleProgress = (i % samplesPerCycle) / samplesPerCycle;

      // Calculate sine wave value for breathing
      // Map from 0-1 to 0-2π for full sine cycle
      const sineValue = Math.sin(cycleProgress * Math.PI * 2);

      // Map sine wave (-1 to 1) to breathing range (breathingMin to breathingMax)
      const breathingScale =
        breathingMin + ((sineValue + 1) / 2) * (breathingMax - breathingMin);

      // Calculate overall growth (linear from 1.0 to overallGrowthEnd)
      const overallGrowth = 1.0 + (overallGrowthEnd - 1.0) * prog;

      // Combine breathing and overall growth
      const finalScale = breathingScale * overallGrowth;

      keyframes.push({
        key: 'scale',
        val: finalScale,
        prog: prog,
      });
    }

    return keyframes;
  };

  // Generate breathing keyframes
  const breathingKeyframes = generateBreathingKeyframes();

  // Create text component
  const textId = 'breathing-text';
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'transform-gpu will-change-transform',
      style: {
        fontSize: `${params.fontSize}px`,
        color: params.textColor,
        fontWeight: params.fontWeight,
        textAlign: 'center' as const,
      },
      font: {
        family: params.fontFamily,
        weights: [params.fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'breathing-effect',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: params.duration,
          mode: 'provider' as const,
          targetIds: [textId],
          ranges: breathingKeyframes,
        } as GenericEffectData,
      },
    ],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'breathing-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textComponent] as RenderableComponentData[],
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
  id: 'BreathingZoomText',
  title: 'Breathing Zoom Text Preset',
  description:
    'Creates an organic breathing zoom effect on text with sine wave pulsation (99%-101%) overlaid with subtle overall growth (100%-102%). Simulates natural camera motion and gentle zoom combined with breathing rhythm. Each breath cycle lasts 3-4 seconds, creating a meditative, living quality.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'breathing',
    'zoom',
    'organic',
    'animation',
    'meditative',
    'sine-wave',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Breathe',
    duration: 10,
    breathingSpeed: 3.5,
    breathingMin: 0.99,
    breathingMax: 1.01,
    overallGrowthEnd: 1.02,
    fontSize: 60,
    textColor: '#1f2937',
    fontFamily: 'Inter',
    fontWeight: '400',
    samplesPerCycle: 10,
  },
};

// Export preset
export const BreathingZoomTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
