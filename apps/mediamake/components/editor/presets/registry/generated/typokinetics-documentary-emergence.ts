/**
 * Sophisticated Typokinetics - Documentary Style
 *
 * A professional kinetic typography preset mimicking documentary title sequences.
 * Letters track outward while simultaneously fading in with film grain texture overlay.
 * Each letter emerges from darkness while expanding, with subtle vertical drift.
 *
 * Features:
 * - Multi-property letter animations (translateX, translateY, opacity, letterSpacing)
 * - Film grain texture overlay for cinematic aesthetic
 * - Logarithmic fade-in curves (faster at start, slower at end)
 * - Subtle vertical drift during expansion
 * - Compression-based letter tracking (letters start compressed, expand outward)
 * - Editorial and refined aesthetic suitable for serious content
 *
 * Use cases:
 * - Documentary title sequences
 * - Artistic presentation titles
 * - Professional video intros
 * - Editorial content openings
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with kinetic effect'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Total animation duration in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (Google Font)'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),
  compressionFactor: z
    .number()
    .min(0.3)
    .max(0.8)
    .default(0.6)
    .describe(
      'How compressed letters start (0.3 = very compressed, 0.8 = slightly compressed)',
    ),
  verticalDrift: z
    .number()
    .min(0)
    .max(30)
    .default(10)
    .describe('Vertical upward drift in pixels during expansion'),
  filmGrainOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Film grain overlay opacity (0 = none, 1 = full)'),
  staggerDelay: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Delay between each letter animation in seconds'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (hex or rgba)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontWeight,
    fontFamily,
    textColor,
    compressionFactor,
    verticalDrift,
    filmGrainOpacity,
    staggerDelay,
    backgroundColor,
  } = params;

  // Parse text into words
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  // Calculate letter spacing animation values
  const initialLetterSpacing = -0.05; // em units (compressed)
  const finalLetterSpacing = 0.1; // em units (expanded)

  // Helper: Create letter animation effect
  const createLetterEffect = (
    letterId: string,
    letterIndex: number,
    totalLetters: number,
  ): GenericEffectData => {
    const effectStart = letterIndex * staggerDelay;
    const effectDuration = duration - effectStart;

    // Calculate compression-based horizontal translation
    // Letters start compressed toward center, expand outward
    const letterPosition = letterIndex / (totalLetters - 1 || 1); // 0 to 1
    const centerOffset = letterPosition - 0.5; // -0.5 to 0.5
    const initialTranslateX = centerOffset * fontSize * compressionFactor * -1;

    return {
      type: 'ease-out', // Logarithmic-like easing (fast start, slow end)
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Opacity: 0 to 1 (logarithmic curve via ease-out)
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.7, prog: 0.3 }, // Fast initial fade
        { key: 'opacity', val: 0.9, prog: 0.6 },
        { key: 'opacity', val: 1, prog: 1 }, // Slow final fade

        // TranslateX: compressed to final position
        { key: 'translateX', val: initialTranslateX, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },

        // TranslateY: subtle vertical drift upward
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -verticalDrift, prog: 1 },

        // Letter spacing animation (via transform for performance)
        // Note: letterSpacing in ranges affects the letter itself through style interpolation
        {
          key: 'letterSpacing',
          val: `${initialLetterSpacing}em`,
          prog: 0,
        },
        { key: 'letterSpacing', val: `${finalLetterSpacing}em`, prog: 1 },
      ],
    } as GenericEffectData;
  };

  // Build letter components
  const letterComponents: RenderableComponentData[] = [];
  let globalLetterIndex = 0;

  words.forEach((word, wordIndex) => {
    const letters = word.split('');

    // Create word container
    const wordId = `word-${wordIndex}`;
    const wordLetters: RenderableComponentData[] = [];

    letters.forEach((letter, letterIndex) => {
      const letterId = `letter-${globalLetterIndex}`;
      const letterEffect = createLetterEffect(
        letterId,
        globalLetterIndex,
        text.replace(/\s+/g, '').length,
      );

      wordLetters.push({
        id: letterId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: letter,
          className: 'inline-block opacity-0',
          style: {
            fontSize: `${fontSize}px`,
            fontWeight,
            color: textColor,
            letterSpacing: `${initialLetterSpacing}em`,
            transform: 'translateZ(0)', // GPU acceleration
          },
          font: {
            family: fontFamily,
            weights: [fontWeight],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [
          {
            id: `effect-${letterId}`,
            componentId: 'generic',
            data: letterEffect,
          },
        ],
      } as RenderableComponentData);

      globalLetterIndex++;
    });

    // Word container
    letterComponents.push({
      id: wordId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative inline-block px-4',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: wordLetters,
    } as RenderableComponentData);
  });

  // Film grain overlay using SVG data URI
  const filmGrainOverlay: RenderableComponentData = {
    id: 'film-grain-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none mix-blend-overlay z-20',
        style: {
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E\")",
          backgroundSize: 'cover',
          opacity: filmGrainOpacity,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
  } as RenderableComponentData;

  // Words wrapper
  const wordsWrapper: RenderableComponentData = {
    id: 'words-wrapper',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-wrap items-center justify-center gap-4',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: letterComponents,
  } as RenderableComponentData;

  // Text container
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative z-10 flex items-center justify-center h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [wordsWrapper],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-documentary-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [filmGrainOverlay, textContainer],
  } as RenderableComponentData;

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
  id: 'typokinetics-documentary-emergence',
  title: 'Sophisticated Typokinetics - Documentary Style',
  description:
    'Professional kinetic typography preset mimicking documentary titles with letters tracking outward, fading in via logarithmic curves, film grain overlay, and subtle vertical drift. Features compressed letter spacing expanding while emerging from darkness, creating an editorial and refined aesthetic suitable for serious content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'documentary',
    'editorial',
    'film-grain',
    'professional',
    'artistic',
    'expansion',
    'fade-in',
    'compression',
    'drift',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'EMERGE',
    duration: 2,
    fontSize: 72,
    fontWeight: '700',
    fontFamily: 'Inter',
    textColor: '#ffffff',
    compressionFactor: 0.6,
    verticalDrift: 10,
    filmGrainOpacity: 0.4,
    staggerDelay: 0.05,
    backgroundColor: '#000000',
  },
};

export const typokineticsDocumentaryEmergencePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
