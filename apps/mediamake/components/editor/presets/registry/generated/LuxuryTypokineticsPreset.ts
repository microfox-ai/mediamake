/**
 * Luxury Typokinetics - Liquid Motion Text Preset
 *
 * Sophisticated typokinetics preset inspired by high-end fashion brand videos.
 * Features liquid-smooth bezier animations with horizontal glide and subtle wave motion.
 * Each word animates based on its length (shorter words faster, longer words more deliberate),
 * with a subtle brightness pulse as it settles. The overall feeling is luxurious and fluid,
 * with timing that breathes rather than rushes.
 *
 * Features:
 * - Liquid-smooth bezier curve animations (cubic-bezier(0.4, 0, 0.2, 1))
 * - Horizontal slide with compound wave motion (sine wave calculation)
 * - Character-based timing: base 0.8s + (0.05s * character count)
 * - Subtle brightness pulse (1 → 1.3 → 1) during final 30% of animation
 * - Antialiased text rendering for premium feel
 * - Per-word timing calculated in execution
 *
 * Use cases:
 * - High-end fashion brand videos
 * - Luxury product presentations
 * - Premium title sequences
 * - Elegant subtitle animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

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
          })
        ),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .describe('Array of caption objects with word-level timing'),

  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Montserrat:400", "PlayfairDisplay:700:italic")'
    ),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels for the text'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (hex or rgba)'),

  animationBaseDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .optional()
    .describe('Base animation duration in seconds before character-based adjustment'),

  characterDurationMultiplier: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .optional()
    .describe('Duration added per character in seconds'),

  waveAmplitude: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .optional()
    .describe('Amplitude of the wave motion in pixels'),

  brightnessIntensity: z
    .number()
    .min(1)
    .max(2)
    .default(1.3)
    .optional()
    .describe('Peak brightness multiplier for the pulse effect'),

  wordGap: z
    .number()
    .min(0)
    .max(100)
    .default(16)
    .optional()
    .describe('Gap between words in pixels'),

  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(32)
    .optional()
    .describe('Horizontal padding of the container in pixels'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  const {
    captions,
    font = 'Montserrat:400',
    fontSize = 48,
    textColor = '#FFFFFF',
    animationBaseDuration = 0.8,
    characterDurationMultiplier = 0.05,
    waveAmplitude = 10,
    brightnessIntensity = 1.3,
    wordGap = 16,
    containerPadding = 32,
  } = params;

  // ============================================================================
  // HELPER FUNCTIONS (DEFINED INSIDE EXECUTION)
  // ============================================================================

  /**
   * Parse font string format: "FontName:weight:style" or "FontName:weight" or "FontName"
   */
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

  /**
   * Calculate animation duration based on word length
   */
  const calculateWordDuration = (wordText: string): number => {
    return animationBaseDuration + characterDurationMultiplier * wordText.length;
  };

  /**
   * Create slide-in effect with horizontal translation and cubic-bezier easing
   */
  const createSlideEffect = (
    wordId: string,
    wordStart: number,
    wordText: string
  ): any => {
    const duration = calculateWordDuration(wordText);

    return {
      id: `slide-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.4, 0, 0.2, 1)' as any,
        start: wordStart,
        duration: duration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateX', val: '150%', prog: 0 },
          { key: 'translateX', val: '0%', prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  /**
   * Create wave motion effect using sine wave calculation for Y translation
   */
  const createWaveEffect = (
    wordId: string,
    wordStart: number,
    wordText: string
  ): any => {
    const duration = calculateWordDuration(wordText);

    // Calculate sine wave values for smooth vertical motion
    const startY = Math.sin(0) * waveAmplitude;
    const midY = Math.sin(Math.PI / 2) * waveAmplitude;
    const endY = Math.sin(Math.PI) * waveAmplitude;

    return {
      id: `wave-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.4, 0, 0.2, 1)' as any,
        start: wordStart,
        duration: duration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateY', val: `${startY}px`, prog: 0 },
          { key: 'translateY', val: `${midY}px`, prog: 0.5 },
          { key: 'translateY', val: `${endY}px`, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  /**
   * Create brightness pulse effect that triggers in the last 30% of animation
   */
  const createBrightnessEffect = (
    wordId: string,
    wordStart: number,
    wordText: string
  ): any => {
    const totalDuration = calculateWordDuration(wordText);
    const pulseStart = wordStart + totalDuration * 0.7;
    const pulseDuration = totalDuration * 0.3;

    return {
      id: `brightness-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: pulseStart,
        duration: pulseDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'filter', val: 'brightness(1)', prog: 0 },
          { key: 'filter', val: `brightness(${brightnessIntensity})`, prog: 0.5 },
          { key: 'filter', val: 'brightness(1)', prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // ============================================================================
  // BUILD COMPONENT TREE
  // ============================================================================

  const { fontFamily, fontStyle } = parseFontString(font);

  const captionContainers = captions.map((caption: TranscriptionSentence) => {
    const captionId = `caption-${caption.id}`;

    // Build word components with effects
    const wordComponents = caption.words.map((word, index) => {
      const wordId = word.id || `word-${caption.id}-${index}`;

      // Create effects for this word
      const slideEffect = createSlideEffect(wordId, word.start, word.text);
      const waveEffect = createWaveEffect(wordId, word.start, word.text);
      const brightnessEffect = createBrightnessEffect(
        wordId,
        word.start,
        word.text
      );

      return {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
          className: 'antialiased subpixel-antialiased',
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [slideEffect, waveEffect, brightnessEffect],
      } as RenderableComponentData;
    });

    // Caption container with flex layout
    return {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row items-center antialiased subpixel-antialiased',
          style: {
            gap: `${wordGap}px`,
            paddingLeft: `${containerPadding}px`,
            paddingRight: `${containerPadding}px`,
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer = {
    id: 'luxury-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: captionContainers,
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'LuxuryTypokineticsPreset',
  title: 'Luxury Typokinetics - Liquid Motion Text',
  description:
    'Sophisticated typokinetics preset with liquid-smooth bezier animations, horizontal glide with wave motion, character-based timing, and subtle brightness pulses. Inspired by high-end fashion brand videos with luxurious fluid motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'typokinetics',
    'luxury',
    'fashion',
    'liquid',
    'bezier',
    'wave',
    'brightness',
    'elegant',
    'premium',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Montserrat:400',
    fontSize: 48,
    textColor: '#FFFFFF',
    animationBaseDuration: 0.8,
    characterDurationMultiplier: 0.05,
    waveAmplitude: 10,
    brightnessIntensity: 1.3,
    wordGap: 16,
    containerPadding: 32,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const LuxuryTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};