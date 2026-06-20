/**
 * Cinematic Text Reveal Preset
 *
 * This preset implements dramatic cinematic text reveals inspired by film title sequences.
 * Features include volumetric light leaks, foggy atmosphere, word-by-word reveals with
 * scale and drift animations, and continuous glow pulses on keywords.
 *
 * Visual Elements:
 * - **Fog Atmosphere**: Radial gradient overlay creating depth
 * - **Light Leaks**: Animated gradient overlays with screen/overlay blend modes
 * - **Text Reveal**: Staggered word-by-word fade-in with scale (0.85→1.0) and vertical drift (20px→0)
 * - **Glow Pulse**: Continuous text shadow animation for emphasis
 *
 * Technical Features:
 * - Responsive font scaling: clamp(3rem, 8vw, 8rem)
 * - Performance optimized: transform and opacity only
 * - Epic trailer pacing: 2s fade per word, 0.3s stagger
 * - Total duration: 6-8 seconds
 *
 * Use Cases:
 * - Movie title sequences
 * - Epic trailer intros
 * - Dramatic product reveals
 * - Cinematic storytelling openings
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Input Parameters Schema ---
const presetParams = z.object({
  words: z
    .array(z.string())
    .min(1)
    .max(10)
    .default(['EPIC', 'CINEMATIC', 'REVEAL'])
    .describe('Array of words to reveal (1-10 words, default: 5 placeholder words)'),
  
  duration: z
    .number()
    .min(4)
    .max(15)
    .default(8)
    .describe('Total preset duration in seconds (4-15s)'),
  
  wordStagger: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Time between each word reveal start (0.1-1s)'),
  
  fadeDuration: z
    .number()
    .min(0.5)
    .max(4)
    .default(2)
    .describe('Duration of each word fade-in animation (0.5-4s)'),
  
  fontFamily: z
    .string()
    .default('Bebas Neue:700')
    .describe('Font family with optional weight (e.g., "Bebas Neue:700", "Impact:900")'),
  
  keywordIndex: z
    .number()
    .int()
    .min(-1)
    .optional()
    .describe('Index of keyword to emphasize with glow pulse (-1 for middle word, undefined for no keyword)'),
  
  lightLeakIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of light leak effects (0-1, default: 0.3)'),
  
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of text glow effect (0-1, default: 0.5)'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    words,
    duration,
    wordStagger,
    fadeDuration,
    fontFamily,
    keywordIndex,
    lightLeakIntensity,
    glowIntensity,
  } = params;

  // Parse font family and weight
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily: parsedFontFamily, fontStyle } = parseFontString(fontFamily);

  // Determine keyword index (default to middle word if -1)
  const actualKeywordIndex =
    keywordIndex !== undefined
      ? keywordIndex === -1
        ? Math.floor(words.length / 2)
        : keywordIndex
      : undefined;

  // Create word components with staggered animations
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `word-${index}`;
    const isKeyword = actualKeywordIndex !== undefined && index === actualKeywordIndex;
    const wordStart = index * wordStagger;

    // Base text shadow for all words
    const baseTextShadow = `0 0 ${40 * glowIntensity}px rgba(255,255,255,${0.5 * glowIntensity})`;
    // Enhanced text shadow for keyword
    const keywordTextShadow = `0 0 ${60 * glowIntensity}px rgba(255,255,255,${0.7 * glowIntensity})`;

    // Word reveal effect: fade in + scale + translate Y
    const wordRevealEffect: GenericEffectData = {
      type: 'ease-out',
      start: wordStart,
      duration: fadeDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        // Scale from 0.85 to 1.0
        { key: 'scale', val: 0.85, prog: 0 },
        { key: 'scale', val: 1.0, prog: 1 },
        // Vertical drift from 20px to 0
        { key: 'translateY', val: 20, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    // Keyword glow pulse effect (continuous)
    const keywordGlowEffect: GenericEffectData | null = isKeyword
      ? {
          type: 'ease-in-out',
          start: wordStart + fadeDuration * 0.5, // Start halfway through reveal
          duration: duration - (wordStart + fadeDuration * 0.5), // Continue until end
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Pulse text shadow opacity
            { key: 'textShadow', val: keywordTextShadow, prog: 0 },
            { key: 'textShadow', val: `0 0 ${80 * glowIntensity}px rgba(255,255,255,${0.9 * glowIntensity})`, prog: 0.5 },
            { key: 'textShadow', val: keywordTextShadow, prog: 1 },
          ],
        }
      : null;

    const effects = [
      {
        id: `${wordId}-reveal`,
        componentId: 'generic',
        data: wordRevealEffect,
      },
    ];

    if (keywordGlowEffect) {
      effects.push({
        id: `${wordId}-glow`,
        componentId: 'generic',
        data: keywordGlowEffect,
      });
    }

    return {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        font: {
          family: parsedFontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        },
        style: {
          fontSize: 'clamp(3rem, 8vw, 8rem)',
          color: '#ffffff',
          textShadow: isKeyword ? keywordTextShadow : baseTextShadow,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          willChange: 'transform, opacity',
          ...fontStyle,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects,
    } as RenderableComponentData;
  });

  // Light leak 1 animation (slow pan across text)
  const lightLeak1Effect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: 10,
    mode: 'provider',
    targetIds: ['light-leak-1'],
    ranges: [
      { key: 'translateX', val: -50, prog: 0 },
      { key: 'translateX', val: 50, prog: 1 },
      { key: 'opacity', val: 0.3 * lightLeakIntensity, prog: 0 },
      { key: 'opacity', val: 0.4 * lightLeakIntensity, prog: 0.5 },
      { key: 'opacity', val: 0.3 * lightLeakIntensity, prog: 1 },
    ],
  };

  // Light leak 2 animation (slower, opposite direction)
  const lightLeak2Effect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: 12,
    mode: 'provider',
    targetIds: ['light-leak-2'],
    ranges: [
      { key: 'translateX', val: 50, prog: 0 },
      { key: 'translateX', val: -50, prog: 1 },
      { key: 'opacity', val: 0.25 * lightLeakIntensity, prog: 0 },
      { key: 'opacity', val: 0.35 * lightLeakIntensity, prog: 0.5 },
      { key: 'opacity', val: 0.25 * lightLeakIntensity, prog: 1 },
    ],
  };

  // Root container structure
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-text-reveal-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      // Fog atmosphere layer
      {
        id: 'fog-atmosphere-layer',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background:
                'radial-gradient(ellipse at center, rgba(30,30,40,0.3) 0%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,1) 100%)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [],
      } as RenderableComponentData,

      // Light leak layer 1
      {
        id: 'light-leak-1',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background:
              'linear-gradient(135deg, transparent 0%, rgba(255,200,150,0.15) 30%, rgba(255,255,200,0.1) 50%, transparent 70%)',
            mixBlendMode: 'screen',
            opacity: 0.3 * lightLeakIntensity,
            willChange: 'transform, opacity',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: 'light-leak-1-effect',
            componentId: 'generic',
            data: lightLeak1Effect,
          },
        ],
      } as RenderableComponentData,

      // Light leak layer 2
      {
        id: 'light-leak-2',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background:
              'linear-gradient(225deg, transparent 0%, rgba(200,220,255,0.12) 40%, rgba(255,255,255,0.08) 60%, transparent 80%)',
            mixBlendMode: 'overlay',
            opacity: 0.25 * lightLeakIntensity,
            willChange: 'transform, opacity',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: 'light-leak-2-effect',
            componentId: 'generic',
            data: lightLeak2Effect,
          },
        ],
      } as RenderableComponentData,

      // Text words container
      {
        id: 'text-words-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-8',
            style: {
              zIndex: 10,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData,

      // Glow overlay layer
      {
        id: 'glow-overlay-layer',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 50%)',
              zIndex: 5,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [],
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'cinematic-text-reveal',
  title: 'Cinematic Text Reveal',
  description:
    'Dramatic cinematic text reveals inspired by film title sequences. Features word-by-word emergence from darkness with volumetric light leaks, subtle scale and drift animations, and atmospheric fog effects. Perfect for epic movie trailer-style intros with slow, deliberate pacing where each word has weight and presence.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'cinematic',
    'reveal',
    'title-sequence',
    'movie',
    'trailer',
    'dramatic',
    'light-leaks',
    'fog',
    'glow',
    'typography',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['EPIC', 'CINEMATIC', 'REVEAL'],
    duration: 8,
    wordStagger: 0.3,
    fadeDuration: 2,
    fontFamily: 'Bebas Neue:700',
    keywordIndex: 1, // Middle word gets glow emphasis
    lightLeakIntensity: 0.3,
    glowIntensity: 0.5,
  },
};

// --- Export Preset ---
export const cinematicTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
