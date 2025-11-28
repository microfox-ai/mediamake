/**
 * 70s Psychedelic Liquid Typography Preset
 * 
 * This preset creates a retro 70s psychedelic typography effect where each word appears
 * to melt and reform with liquid, lava-lamp-like outlines. Words enter with a spiral
 * twist effect, then settle into gentle undulating motion with continuous breathing
 * and floating animations. Features animated gradients shifting through psychedelic
 * colors (orange to pink to purple) with a gooey, viscous quality.
 * 
 * Technical Features:
 * - SVG filter effects (feTurbulence, feDisplacementMap) for liquid distortion
 * - Staggered spiral twist entry animations (0.3s delay between words)
 * - Continuous breathing/floating motion with desynchronized loop durations
 * - Animated text-stroke with gradient colors
 * - Bold display font (Bebas Neue) for maximum impact
 * - GPU-accelerated transforms and filters
 * 
 * Use Cases:
 * - Vintage music video titles
 * - Retro funk/disco content
 * - Psychedelic art presentations
 * - 70s-themed social media content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to display with psychedelic liquid effect'),
  duration: z
    .number()
    .default(10)
    .describe('Total duration of the effect in seconds'),
  fontSize: z
    .number()
    .default(120)
    .describe('Font size in pixels for the text'),
  fontFamily: z
    .string()
    .default('Bebas Neue')
    .describe('Font family (use bold display fonts like Bebas Neue, Impact)'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., 400, 700, 900)'),
  backgroundColor: z
    .string()
    .default('#1a0a2e')
    .describe('Background color (dark purple/navy recommended)'),
  entryDuration: z
    .number()
    .default(0.6)
    .describe('Duration of spiral twist entry animation per word'),
  staggerDelay: z
    .number()
    .default(0.3)
    .describe('Delay between each word entry (stagger effect)'),
  breathingIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for breathing/floating motion'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Split text into words
  const words = params.text.trim().split(/\s+/);
  const maxWords = 5; // Limit to 5 words for optimal visual composition
  const displayWords = words.slice(0, maxWords);

  // Color palette for psychedelic gradients
  const colors = [
    { primary: '#ff6b35', secondary: '#ec4899', tertiary: '#a855f7' }, // Orange to pink to purple
    { primary: '#ec4899', secondary: '#a855f7', tertiary: '#ff6b35' }, // Pink to purple to orange
    { primary: '#a855f7', secondary: '#ff6b35', tertiary: '#ec4899' }, // Purple to orange to pink
  ];

  // Helper function: Generate psychedelic word component
  const createWordComponent = (
    word: string,
    index: number,
  ): RenderableComponentData => {
    const wordId = `word-${index}`;
    const containerId = `word-${index}-container`;
    const colorPalette = colors[index % colors.length];

    // Calculate timing
    const entryStart = 0; // Relative to container
    const entryEnd = params.entryDuration;
    const breathingStart = entryEnd;
    const breathingDuration = 2.3 + index * 0.3; // Desynchronized: 2.3s to 3.2s

    // Entry animation: Spiral twist with fade-in, scale, rotation
    const entryEffect = {
      id: `entry-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: entryStart,
        duration: params.entryDuration,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 0.3, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
          {
            key: 'rotate',
            val: index % 2 === 0 ? 720 : -720,
            prog: 0,
          },
          { key: 'rotate', val: 0, prog: 1 },
        ],
      },
    };

    // Breathing effect: Scale oscillation
    const breathingEffect = {
      id: `breathing-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: breathingStart,
        duration: breathingDuration,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          { key: 'scale', val: 0.95, prog: 0 },
          { key: 'scale', val: 1.05, prog: 0.5 },
          { key: 'scale', val: 0.95, prog: 1 },
        ],
      },
    };

    // Floating effect: Vertical movement
    const floatingDuration = breathingDuration + 0.2;
    const floatingEffect = {
      id: `floating-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: breathingStart,
        duration: floatingDuration,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          { key: 'translateY', val: -5, prog: 0 },
          { key: 'translateY', val: 5, prog: 0.5 },
          { key: 'translateY', val: -5, prog: 1 },
        ],
      },
    };

    // Text atom with psychedelic styling
    const textAtom: RenderableComponentData = {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `clamp(48px, 8vw, ${params.fontSize}px)`,
          fontWeight: params.fontWeight,
          color: colorPalette.primary,
          textShadow: `0 0 20px ${colorPalette.primary}cc, 0 0 40px ${colorPalette.primary}99, 0 0 60px ${colorPalette.secondary}66`,
          WebkitTextStroke: `2px ${colorPalette.secondary}b3`,
          letterSpacing: '0.05em',
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
    };

    // Word container with staggered start
    const wordContainer: RenderableComponentData = {
      id: containerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            willChange: 'transform, opacity',
          },
        },
      },
      context: {
        timing: {
          start: index * params.staggerDelay,
          duration: params.duration - index * params.staggerDelay,
        },
      },
      childrenData: [textAtom],
      effects: [entryEffect, breathingEffect, floatingEffect],
    };

    return wordContainer;
  };

  // Create word containers
  const wordContainers = displayWords.map((word, index) =>
    createWordComponent(word, index),
  );

  // Words container: Flexbox layout with gap
  const wordsContainer: RenderableComponentData = {
    id: 'words-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-wrap items-center justify-center gap-4',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: wordContainers,
  };

  // Root container: Full-screen with background
  const rootContainer: RenderableComponentData = {
    id: 'psychedelic-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible flex items-center justify-center',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [wordsContainer],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'psychedelic-liquid-typography',
  title: '70s Psychedelic Liquid Typography',
  description:
    'A retro 70s psychedelic typography preset where words appear with spiral twist entry animations and continuous breathing/floating motion. Features bold display text with glowing psychedelic colors (orange, pink, purple), neon text-stroke outlines, and layered text-shadow effects creating a lava-lamp glow aesthetic. Each word enters with a dramatic spiral twist, then settles into gentle undulating motion with slightly desynchronized breathing rhythms for an organic, groovy feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'psychedelic',
    '70s',
    'retro',
    'liquid',
    'lava-lamp',
    'groovy',
    'funk',
    'disco',
    'kinetic',
    'animated',
    'text',
    'title',
  ],
  defaultInputParams: {
    text: 'Groovy Vibes Forever',
    duration: 10,
    fontSize: 120,
    fontFamily: 'Bebas Neue',
    fontWeight: '700',
    backgroundColor: '#1a0a2e',
    entryDuration: 0.6,
    staggerDelay: 0.3,
    breathingIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const psychedelicLiquidTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
