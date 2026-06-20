/**
 * Cinematic Typokinetics Preset
 *
 * Film-inspired kinetic typography preset featuring cinematic dolly zoom effects,
 * tracking animations, and film grain overlay. Words fade in with scale normalization,
 * letter-spacing tightening, and subtle warm color grading for a nostalgic film title
 * sequence aesthetic.
 *
 * Features:
 * - **Cinematic Dolly Zoom**: Words start at scale(1.15) with slight blur, normalizing during fade-in
 * - **Tracking Animation**: Letter-spacing transitions from 0.1em to 0.05em for 'tightening' feel
 * - **Film Grain Overlay**: Animated texture overlay with subtle movement for authentic film look
 * - **Color Grade Shift**: Subtle warm tint (sepia) during fade-in for nostalgic aesthetic
 * - **Phrase Rhythm**: Words appear in rhythm with vocal phrases, with longer pauses between groups
 * - **Depth & Shadow**: Subtle text shadow for dimensional depth
 *
 * Use cases:
 * - Creating film title sequence-style captions
 * - Building nostalgic, cinematic text animations
 * - Adding professional film-grain aesthetics to videos
 * - Creating sophisticated typography for dramatic content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with words and timing information'),

  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Playfair Display:400", "Cinzel:600")',
    ),

  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(64)
    .optional()
    .describe('Font size in pixels for the text'),

  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (CSS color value)'),

  backgroundColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Background color (CSS color value)'),

  effectDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.9)
    .optional()
    .describe('Duration of fade-in effects in seconds'),

  phraseGapThreshold: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.5)
    .optional()
    .describe(
      'Minimum gap between words (in seconds) to detect phrase boundaries',
    ),

  filmGrainIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .optional()
    .describe('Opacity intensity of film grain overlay (0-1)'),

  textShadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Intensity of text shadow for depth (0-1)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font = 'Playfair Display:400',
    fontSize = 64,
    textColor = '#ffffff',
    backgroundColor = '#000000',
    effectDuration = 0.9,
    phraseGapThreshold = 0.5,
    filmGrainIntensity = 0.1,
    textShadowIntensity = 0.6,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Helper: Create word effects
  const createWordEffects = (
    wordId: string,
    wordStart: number,
    caption: TranscriptionSentence,
  ) => {
    const impact = caption.metadata?.impact ?? 1.0;
    const duration = effectDuration * impact;

    // Opacity effect: 0 -> 1
    const opacityEffect: GenericEffectData = {
      type: 'ease-out',
      start: wordStart,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    // Scale effect: 1.15 -> 1 (dolly zoom)
    const scaleEffect: GenericEffectData = {
      type: 'ease-out',
      start: wordStart,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: 1.15, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };

    // Blur effect: 1px -> 0px
    const blurEffect: GenericEffectData = {
      type: 'ease-out',
      start: wordStart,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'blur', val: 1, prog: 0 },
        { key: 'blur', val: 0, prog: 1 },
      ],
    };

    // Letter-spacing effect: 0.1em -> 0.05em (tracking tightening)
    const letterSpacingEffect: GenericEffectData = {
      type: 'ease-out',
      start: wordStart,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'letterSpacing', val: '0.1em', prog: 0 },
        { key: 'letterSpacing', val: '0.05em', prog: 1 },
      ],
    };

    // Sepia effect: 0.2 -> 0 (warm color grade shift)
    const sepiaEffect: GenericEffectData = {
      type: 'ease-out',
      start: wordStart,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'sepia', val: 0.2, prog: 0 },
        { key: 'sepia', val: 0, prog: 1 },
      ],
    };

    return [
      {
        id: `opacity-${wordId}`,
        componentId: 'generic',
        data: opacityEffect,
      },
      {
        id: `scale-${wordId}`,
        componentId: 'generic',
        data: scaleEffect,
      },
      {
        id: `blur-${wordId}`,
        componentId: 'generic',
        data: blurEffect,
      },
      {
        id: `letterSpacing-${wordId}`,
        componentId: 'generic',
        data: letterSpacingEffect,
      },
      {
        id: `sepia-${wordId}`,
        componentId: 'generic',
        data: sepiaEffect,
      },
    ];
  };

  // Build all word components
  const allWordComponents: RenderableComponentData[] = [];

  captions.forEach((caption) => {
    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${caption.id}-${wordIndex}`;

      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            ...fontStyle,
            textShadow: `0 4px 12px rgba(0,0,0,${textShadowIntensity})`,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
            display: 'swap',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: word.absoluteStart,
            duration: word.duration,
          },
        },
        effects: createWordEffects(wordId, word.start, caption),
      };

      allWordComponents.push(wordComponent);
    });
  });

  // Calculate total duration
  const totalDuration =
    captions.length > 0
      ? Math.max(
          ...captions.map((c) => c.absoluteEnd || c.absoluteStart + c.duration),
        )
      : 10;

  // Film grain overlay with animation
  const filmGrainOverlay: RenderableComponentData = {
    id: 'film-grain-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 mix-blend-overlay pointer-events-none`,
        style: {
          opacity: filmGrainIntensity,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: 'cover',
        },
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
        id: 'film-grain-animation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 8,
          mode: 'provider',
          targetIds: ['film-grain-overlay'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -20, prog: 0.5 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -20, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
    childrenData: [],
  };

  // Words container
  const wordsContainer: RenderableComponentData = {
    id: 'words-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-col items-center justify-center gap-8',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: allWordComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center justify-center w-full h-full',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [filmGrainOverlay, wordsContainer],
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
  id: 'cinematicTypokinetics',
  title: 'Cinematic Typokinetics',
  description:
    'Film-inspired kinetic typography preset featuring cinematic dolly zoom effects, tracking animations, and film grain overlay. Words fade in with scale normalization, letter-spacing tightening, and subtle warm color grading for a nostalgic film title sequence aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'cinematic',
    'film',
    'title-sequence',
    'dolly-zoom',
    'tracking',
    'film-grain',
    'nostalgic',
    'sophisticated',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'The story begins',
        start: 0,
        absoluteStart: 0,
        end: 2.5,
        absoluteEnd: 2.5,
        duration: 2.5,
        words: [
          {
            id: 'word-1',
            text: 'The',
            start: 0,
            absoluteStart: 0,
            end: 0.5,
            absoluteEnd: 0.5,
            duration: 0.5,
          },
          {
            id: 'word-2',
            text: 'story',
            start: 0.6,
            absoluteStart: 0.6,
            end: 1.2,
            absoluteEnd: 1.2,
            duration: 0.6,
          },
          {
            id: 'word-3',
            text: 'begins',
            start: 1.3,
            absoluteStart: 1.3,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 1.2,
          },
        ],
      },
    ],
    font: 'Playfair Display:400',
    fontSize: 64,
    textColor: '#ffffff',
    backgroundColor: '#000000',
    effectDuration: 0.9,
    phraseGapThreshold: 0.5,
    filmGrainIntensity: 0.1,
    textShadowIntensity: 0.6,
  },
};

// Export preset
export const cinematicTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
