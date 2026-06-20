/**
 * Typokinetics Impact Slam Preset
 *
 * Creates punchy, attention-grabbing kinetic typography that feels like quick-cut editing in an action movie trailer.
 * Words slam into place with impact, sliding in fast then hitting an abrupt stop with a tiny shake, like a crash zoom effect.
 * Each word is treated as a separate shot that cuts in with kinetic energy.
 *
 * Features:
 * - Rapid slide-in with abrupt stop (translateX from 200% to 0% in 0.25s)
 * - Shake effect at end (2 rapid oscillations between -2px and 2px)
 * - Scale pop on arrival (1.0 to 1.1 to 1.0) for emphasis, like impact frames
 * - Subtle shadow sliding in slightly behind each word for depth
 * - Aggressive timing with short gaps (0.05s stagger) to maintain momentum
 * - Cubic-bezier(0, 0, 0.2, 1) easing for that hard stop feel
 *
 * Use cases:
 * - Action movie trailers and promotional content
 * - High-energy product launches
 * - Sports highlights and recaps
 * - Dynamic social media content
 * - Attention-grabbing title sequences
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display with impact kinetic animation'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration in seconds for the animation'),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (e.g., "bold", "700", "900")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color in hex or CSS color format'),
  shadowColor: z
    .string()
    .default('#000000')
    .describe('Shadow color in hex or CSS color format'),
  shadowOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Shadow opacity (0-1)'),
  staggerDelay: z
    .number()
    .default(0.05)
    .describe('Delay between each word animation in seconds (aggressive timing)'),
  slideDuration: z
    .number()
    .default(0.25)
    .describe('Duration of the slide-in animation in seconds'),
  shakeDuration: z
    .number()
    .default(0.1)
    .describe('Duration of the shake effect in seconds'),
  wordGap: z
    .number()
    .default(16)
    .describe('Gap between words in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Split text into words
  const words = params.text.trim().split(/\s+/);
  const totalAnimationDuration = params.slideDuration + params.shakeDuration;

  // Helper function to create word component with shadow and effects
  const createWordComponent = (
    word: string,
    index: number,
  ): RenderableComponentData => {
    const wordContainerId = `word-container-${index}`;
    const wordShadowId = `word-shadow-${index}`;
    const wordTextId = `word-text-${index}`;
    const effectId = `slide-shake-scale-${index}`;

    // Calculate timing
    const animationStart = index * params.staggerDelay;
    const slideEndProgress = params.slideDuration / totalAnimationDuration;
    const shake1Progress = slideEndProgress + 0.071; // ~0.025s after slide
    const shake2Progress = slideEndProgress + 0.143; // ~0.05s after slide
    const finalProgress = 1.0;

    // Create the slide-shake-scale effect
    const effectData: GenericEffectData = {
      type: 'cubic-bezier(0, 0, 0.2, 1)',
      start: animationStart,
      duration: totalAnimationDuration,
      mode: 'provider',
      targetIds: [wordTextId],
      ranges: [
        // Slide in from right
        { key: 'translateX', val: '200%', prog: 0 },
        { key: 'translateX', val: '0%', prog: slideEndProgress },
        // Shake oscillations
        { key: 'translateX', val: '-2px', prog: shake1Progress },
        { key: 'translateX', val: '2px', prog: shake2Progress },
        { key: 'translateX', val: '0%', prog: finalProgress },
        // Scale pop (1.0 to 1.1 at 90%, back to 1.0)
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.1, prog: 0.9 },
        { key: 'scale', val: 1, prog: finalProgress },
      ],
    };

    const effect = {
      id: effectId,
      componentId: 'generic',
      data: effectData,
    };

    // Shadow component (static, slightly offset)
    const shadowComponent: RenderableComponentData = {
      id: wordShadowId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        className: 'absolute -z-10',
        style: {
          fontSize: params.fontSize,
          fontWeight: params.fontWeight,
          color: params.shadowColor,
          opacity: params.shadowOpacity,
          transform: 'translate(-2px, 2px)',
          willChange: 'transform',
        },
        font: {
          family: params.fontFamily,
          weights: [params.fontWeight === 'bold' ? '700' : params.fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    };

    // Main text component with animation
    const textComponent: RenderableComponentData = {
      id: wordTextId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: params.fontSize,
          fontWeight: params.fontWeight,
          color: params.textColor,
          willChange: 'transform',
          transformOrigin: 'center',
        },
        font: {
          family: params.fontFamily,
          weights: [params.fontWeight === 'bold' ? '700' : params.fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [effect],
    };

    // Word container (relative positioning for shadow layering)
    const wordContainer: RenderableComponentData = {
      id: wordContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [shadowComponent, textComponent] as RenderableComponentData[],
    };

    return wordContainer;
  };

  // Create all word components
  const wordComponents = words.map((word, index) =>
    createWordComponent(word, index),
  );

  // Root container with flex layout
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-impact-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-center justify-center font-bold',
        style: {
          gap: `${params.wordGap}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: wordComponents as RenderableComponentData[],
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
  id: 'typokinetics-impact-slam',
  title: 'Typokinetics Impact Slam',
  description:
    'Punchy, action-movie-trailer-style kinetic typography with rapid slide-in, abrupt stop shake, scale pop on arrival, and sliding shadow depth. Words slam into place with aggressive timing and kinetic energy.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'impact',
    'action',
    'trailer',
    'dynamic',
    'text',
    'animation',
    'slam',
    'crash-zoom',
  ],
  defaultInputParams: {
    text: 'ACTION IMPACT',
    duration: 5,
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    textColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    staggerDelay: 0.05,
    slideDuration: 0.25,
    shakeDuration: 0.1,
    wordGap: 16,
  },
  dependencies: {},
};

export const typokineticImpactSlamPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
