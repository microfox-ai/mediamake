/**
 * Handwritten Typography Reveal Preset
 *
 * This preset creates an organic, fluid typography animation that mimics hand-lettered
 * titles in documentaries. Each character reveals through a clip-path animation following
 * a natural left-to-right writing path, with variable speed through segments. The effect
 * is layered with a trailing opacity fade and continuous micro-movements for a living,
 * breathing quality.
 *
 * Features:
 * - **Clip-path Reveal**: Left-to-right progressive reveal with smooth easing
 * - **Trailing Opacity**: Subtle fade (0.3 to 1) that lags behind the clip-path
 * - **Micro Float**: Continuous 1-2px vertical oscillation for organic feel
 * - **Word-level Stagger**: Natural timing between word reveals
 * - **GPU Acceleration**: Optimized with transform-gpu and will-change
 *
 * Use cases:
 * - Documentary-style titles
 * - Hand-lettered animated headings
 * - Organic text reveals
 * - Cinematic typography effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display (will be split into words for staggered reveal)'),
  fontSize: z
    .number()
    .default(64)
    .describe('Font size in pixels (default: 64)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (default: Inter)'),
  fontWeight: z
    .string()
    .default('400')
    .describe('Font weight (e.g., "400", "700")'),
  textColor: z
    .string()
    .default('#000000')
    .describe('Text color (default: #000000)'),
  wordStagger: z
    .number()
    .min(0)
    .max(2)
    .default(0.4)
    .describe('Delay between word reveals in seconds (default: 0.4)'),
  revealDuration: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.6)
    .describe('Duration of clip-path reveal per word in seconds (default: 0.6)'),
  opacityLag: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Delay before opacity fade starts, relative to clip-path (default: 0.1s)'),
  opacityDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Duration of opacity fade in seconds (default: 0.5)'),
  floatAmplitude: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Vertical float amplitude in pixels (default: 2)'),
  floatDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration of one float cycle in seconds (default: 3)'),
  totalDuration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the preset in seconds (default: 10)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    wordStagger,
    revealDuration,
    opacityLag,
    opacityDuration,
    floatAmplitude,
    floatDuration,
    totalDuration,
  } = params;

  // Split text into words
  const words = text.trim().split(/\s+/);

  // Create word components with staggered reveals
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `handwritten-word-${index}`;
    const wordStart = index * wordStagger;

    // Clip-path reveal effect
    const clipRevealEffect = {
      id: `${wordId}-clip-reveal`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        start: 0, // Relative to word start
        duration: revealDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          {
            key: 'clipPath',
            val: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
            prog: 0,
          },
          {
            key: 'clipPath',
            val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
            prog: 1,
          },
        ],
      },
    };

    // Opacity trail effect (lags behind clip-path)
    const opacityTrailEffect = {
      id: `${wordId}-opacity-trail`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        start: opacityLag, // Relative to word start
        duration: opacityDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };

    // Continuous float effect (starts after reveal completes)
    const floatEffect = {
      id: `${wordId}-float`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: revealDuration, // Start after reveal
        duration: floatDuration,
        mode: 'provider',
        targetIds: [wordId],
        loop: true,
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -floatAmplitude, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    };

    return {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
          willChange: 'clip-path, opacity, transform',
          transform: 'translateZ(0)',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
          subsets: ['latin'],
        },
      },
      context: {
        timing: {
          start: wordStart,
          duration: totalDuration - wordStart,
        },
      },
      effects: [clipRevealEffect, opacityTrailEffect, floatEffect],
    } as RenderableComponentData;
  });

  // Create word container with flexbox layout
  const wordContainer: RenderableComponentData = {
    id: 'handwritten-word-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row gap-4 items-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'handwritten-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [wordContainer],
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
  id: 'handwritten-typography-reveal',
  title: 'Handwritten Typography Reveal',
  description:
    'Organic, fluid typography preset that recreates hand-lettered documentary titles with clip-path reveal animations, variable speed ink flow, opacity fade trailing, and micro-movements for a living, breathing quality',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'animation',
    'reveal',
    'handwritten',
    'organic',
    'documentary',
    'clip-path',
    'kinetic',
    'float',
  ],
  defaultInputParams: {
    text: 'Handwritten Reveal',
    fontSize: 64,
    fontFamily: 'Inter',
    fontWeight: '400',
    textColor: '#000000',
    wordStagger: 0.4,
    revealDuration: 0.6,
    opacityLag: 0.1,
    opacityDuration: 0.5,
    floatAmplitude: 2,
    floatDuration: 3,
    totalDuration: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const handwrittenTypographyRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
