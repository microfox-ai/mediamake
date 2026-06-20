/**
 * Architectural Geometric Reveal Preset
 *
 * A minimalist architectural preset featuring precise geometric masking with slow background image reveal
 * through expanding rectangles from center, staggered typewriter-style text scrolling in monospace font,
 * monochromatic high-contrast color palette, and subtle grid overlay for technical drawing aesthetic.
 *
 * Features:
 * - Geometric image reveal using clip-path animation (inset expanding from center)
 * - Staggered text entry with typewriter effect and horizontal scroll
 * - Monospace typography for technical aesthetic
 * - Grid overlay for architectural drawing feel
 * - High-contrast monochromatic design
 * - Clean, precise animations emphasizing minimalism
 *
 * Use cases:
 * - Architecture portfolio showcases
 * - Tech product reveals
 * - Minimalist brand presentations
 * - Technical documentation intros
 * - Design studio reels
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  backgroundImage: z
    .string()
    .describe('Background image URL or path for geometric reveal'),
  textLine1: z
    .string()
    .default('ARCHITECTURAL')
    .describe('First text line (top-1/3 position)'),
  textLine2: z
    .string()
    .default('PRECISION')
    .describe('Second text line (top-1/2 position)'),
  textLine3: z
    .string()
    .default('DESIGN')
    .describe('Third text line (top-2/3 position)'),
  duration: z
    .number()
    .default(8)
    .describe('Total duration of the preset in seconds'),
  imageRevealDuration: z
    .number()
    .default(2)
    .describe('Duration of geometric image reveal animation in seconds'),
  textFadeInDuration: z
    .number()
    .default(0.5)
    .describe('Duration of each text line fade-in in seconds'),
  textScrollStart: z
    .number()
    .default(2.5)
    .describe('Time when text scrolling begins (after reveal completes)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const presetId = 'architectural-geometric-reveal';
  const rootContainerId = `${presetId}-root-container`;

  // Calculate timing
  const totalDuration = params.duration;
  const imageRevealDuration = params.imageRevealDuration;
  const textFadeInDuration = params.textFadeInDuration;
  const textScrollStart = params.textScrollStart;
  const textScrollDuration = totalDuration - textScrollStart;

  // Text line fade-in start times (staggered)
  const text1FadeStart = 0.5;
  const text2FadeStart = 1.0;
  const text3FadeStart = 1.5;

  // Create image reveal effect using clip-path
  const imageRevealEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: imageRevealDuration,
    mode: 'provider',
    targetIds: ['image-container'],
    ranges: [
      // Clip-path: expand from center (inset 50% → 0%)
      { key: 'clipPath', val: 'inset(50% 50% 50% 50%)', prog: 0 },
      { key: 'clipPath', val: 'inset(0% 0% 0% 0%)', prog: 1 },
    ],
  };

  // Helper function to create text fade-in effect
  const createTextFadeEffect = (
    targetId: string,
    startTime: number,
  ): GenericEffectData => ({
    type: 'ease-out',
    start: startTime,
    duration: textFadeInDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  });

  // Helper function to create text scroll effect
  const createTextScrollEffect = (targetId: string): GenericEffectData => ({
    type: 'linear',
    start: textScrollStart,
    duration: textScrollDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: -100, prog: 1 }, // Scroll left (use vw units via CSS)
    ],
  });

  // Build component tree
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-100',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'image-reveal-effect',
        componentId: 'generic',
        data: imageRevealEffect,
      },
    ],
    childrenData: [
      // Grid overlay
      {
        id: 'grid-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 opacity-10',
            style: {
              backgroundImage:
                'repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #000 0px, #000 1px, transparent 1px, transparent 40px)',
              backgroundSize: '40px 40px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [],
      } as RenderableComponentData,

      // Background image with clip-path reveal
      {
        id: 'image-container',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: params.backgroundImage,
          className: 'absolute inset-0 object-cover grayscale',
          style: {
            filter: 'grayscale(100%) contrast(1.1)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [],
      } as RenderableComponentData,

      // Text line 1
      {
        id: 'text-line-1',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.textLine1,
          className: 'absolute font-mono text-black text-2xl whitespace-nowrap',
          style: {
            top: '33.333%',
            left: '0',
            backdropFilter: 'contrast(1.2)',
            WebkitBackdropFilter: 'contrast(1.2)',
          },
          font: {
            family: 'Roboto Mono',
            weights: ['400'],
            subsets: ['latin'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: 'text-1-fade',
            componentId: 'generic',
            data: createTextFadeEffect('text-line-1', text1FadeStart),
          },
          {
            id: 'text-1-scroll',
            componentId: 'generic',
            data: createTextScrollEffect('text-line-1'),
          },
        ],
        childrenData: [],
      } as RenderableComponentData,

      // Text line 2
      {
        id: 'text-line-2',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.textLine2,
          className: 'absolute font-mono text-black text-2xl whitespace-nowrap',
          style: {
            top: '50%',
            left: '0',
            backdropFilter: 'contrast(1.2)',
            WebkitBackdropFilter: 'contrast(1.2)',
          },
          font: {
            family: 'Roboto Mono',
            weights: ['400'],
            subsets: ['latin'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: 'text-2-fade',
            componentId: 'generic',
            data: createTextFadeEffect('text-line-2', text2FadeStart),
          },
          {
            id: 'text-2-scroll',
            componentId: 'generic',
            data: createTextScrollEffect('text-line-2'),
          },
        ],
        childrenData: [],
      } as RenderableComponentData,

      // Text line 3
      {
        id: 'text-line-3',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.textLine3,
          className: 'absolute font-mono text-black text-2xl whitespace-nowrap',
          style: {
            top: '66.666%',
            left: '0',
            backdropFilter: 'contrast(1.2)',
            WebkitBackdropFilter: 'contrast(1.2)',
          },
          font: {
            family: 'Roboto Mono',
            weights: ['400'],
            subsets: ['latin'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: 'text-3-fade',
            componentId: 'generic',
            data: createTextFadeEffect('text-line-3', text3FadeStart),
          },
          {
            id: 'text-3-scroll',
            componentId: 'generic',
            data: createTextScrollEffect('text-line-3'),
          },
        ],
        childrenData: [],
      } as RenderableComponentData,
    ],
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
  id: 'architectural-geometric-reveal',
  title: 'Architectural Geometric Reveal',
  description:
    'Minimalist architectural preset featuring precise geometric masking with slow background image reveal through expanding rectangles from center, staggered typewriter-style text scrolling in monospace font, monochromatic high-contrast color palette, and subtle grid overlay for technical drawing aesthetic. Perfect for architecture showcases and tech product reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'architecture',
    'minimalist',
    'geometric',
    'reveal',
    'monochrome',
    'technical',
    'grid',
    'typography',
    'monospace',
    'scroll',
  ],
  dependencies: {},
  defaultInputParams: {
    backgroundImage: 'https://picsum.photos/1920/1080',
    textLine1: 'ARCHITECTURAL',
    textLine2: 'PRECISION',
    textLine3: 'DESIGN',
    duration: 8,
    imageRevealDuration: 2,
    textFadeInDuration: 0.5,
    textScrollStart: 2.5,
  },
};

// Export preset
export const architecturalGeometricRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
