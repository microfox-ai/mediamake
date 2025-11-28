/**
 * Breathing Kinetic Typography Preset
 *
 * This preset creates a meditative kinetic typography effect where text "breathes" - 
 * letter-spacing expands from extremely tight (-0.2em) to natural (0em) like lungs 
 * filling with air. Each word animates with its own breathing rhythm, creating a 
 * ripple effect across the text with staggered delays.
 *
 * Features:
 * - Extreme tight kerning (-0.2em) expanding to natural spacing (0em)
 * - Word-by-word staggered animation (100-200ms delay between words)
 * - Custom cubic-bezier easing for organic inhale feeling
 * - Synchronized opacity fade (0.7 to 1) with expansion
 * - GPU-accelerated rendering with translateZ(0)
 * - Vertical text stacking layout
 *
 * Use cases:
 * - Meditative reveal animations
 * - Slow, organic text introductions
 * - Artistic typography effects
 * - Tension-to-release storytelling
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

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
            impact: z
              .number()
              .min(0.1)
              .max(3.0)
              .optional()
              .describe('Per-caption intensity multiplier'),
          })
          .optional(),
      }),
    )
    .describe('Array of caption data with word timing'),
  
  font: z
    .string()
    .optional()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:500", "Roboto:600:italic")',
    ),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .optional()
    .default(48)
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),
  
  breathingDuration: z
    .number()
    .min(1)
    .max(5)
    .optional()
    .default(2.5)
    .describe('Duration of breathing animation per word (seconds)'),
  
  wordStagger: z
    .number()
    .min(0)
    .max(0.5)
    .optional()
    .default(0.15)
    .describe('Delay between word animations (seconds)'),
  
  startLetterSpacing: z
    .string()
    .optional()
    .default('-0.2em')
    .describe('Initial tight letter spacing'),
  
  endLetterSpacing: z
    .string()
    .optional()
    .default('0em')
    .describe('Final natural letter spacing'),
  
  startOpacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.7)
    .describe('Initial opacity'),
  
  endOpacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(1)
    .describe('Final opacity'),
  
  globalImpact: z
    .number()
    .min(0.1)
    .max(3.0)
    .optional()
    .default(1.0)
    .describe('Global intensity multiplier for all animations'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    breathingDuration,
    wordStagger,
    startLetterSpacing,
    endLetterSpacing,
    startOpacity,
    endOpacity,
    globalImpact,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: { fontWeight?: number; fontStyle?: string } = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2]; // 'normal' | 'italic'
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font || 'Inter');

  // Process each caption
  const captionComponents = captions.map((caption, captionIndex) => {
    const captionId = `breathing-caption-${captionIndex}`;
    const words = caption.words;

    // Get impact multiplier (per-caption or global)
    const impactMultiplier =
      caption.metadata?.impact ?? globalImpact ?? 1.0;

    // Create word components with breathing effects
    const wordComponents = words.map((word, wordIndex) => {
      const wordId = `${captionId}-word-${wordIndex}`;

      // Calculate stagger delay for this word
      const staggerDelay = wordIndex * (wordStagger ?? 0.15);

      // Calculate effect duration with impact
      const effectDuration = (breathingDuration ?? 2.5) * impactMultiplier;

      // Breathing effect (letter-spacing expansion)
      const breathingEffect: GenericEffectData = {
        type: 'cubic-bezier(0.4, 0.0, 0.2, 1)' as any,
        start: word.start + staggerDelay,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          {
            key: 'letterSpacing',
            val: startLetterSpacing ?? '-0.2em',
            prog: 0,
          },
          {
            key: 'letterSpacing',
            val: endLetterSpacing ?? '0em',
            prog: 1,
          },
        ],
      };

      // Opacity fade effect (synchronized with breathing)
      const opacityEffect: GenericEffectData = {
        type: 'ease-out',
        start: word.start + staggerDelay,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          {
            key: 'opacity',
            val: startOpacity ?? 0.7,
            prog: 0,
          },
          {
            key: 'opacity',
            val: endOpacity ?? 1,
            prog: 1,
          },
        ],
      };

      // Word TextAtom
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontStyle.fontWeight || 500,
            fontStyle: fontStyle.fontStyle || 'normal',
            color: textColor ?? '#ffffff',
            letterSpacing: startLetterSpacing ?? '-0.2em',
            marginRight: '0.3em',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['500'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `${wordId}-breathing`,
            componentId: 'generic',
            data: breathingEffect,
          },
          {
            id: `${wordId}-opacity`,
            componentId: 'generic',
            data: opacityEffect,
          },
        ],
      };

      return wordComponent;
    });

    // Caption container (word wrapper)
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-wrap items-center justify-center gap-2',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents as RenderableComponentData[],
    };

    return captionContainer;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'breathing-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center justify-center gap-2',
        style: {
          transform: 'translateZ(0)', // GPU acceleration
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: captionComponents as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'breathingKineticTypography',
  title: 'Breathing Kinetic Typography',
  description:
    'A meditative kinetic typography preset featuring text that breathes - letter-spacing expands from extremely tight (-0.2em) to natural (0em) like lungs filling with air. Words animate with staggered timing to create a ripple effect across the text, using organic cubic-bezier easing for a natural inhale feeling. The text starts nearly illegible due to tight kerning, creating tension before the graceful release.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'breathing',
    'meditation',
    'organic',
    'letter-spacing',
    'stagger',
    'reveal',
    'artistic',
    'tension-release',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Breathe in the moment',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Breathe',
            start: 0,
            absoluteStart: 0,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.8,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'in',
            start: 0.8,
            absoluteStart: 0.8,
            end: 1.2,
            absoluteEnd: 1.2,
            duration: 0.4,
            confidence: 1,
          },
          {
            id: 'word-3',
            text: 'the',
            start: 1.2,
            absoluteStart: 1.2,
            end: 1.6,
            absoluteEnd: 1.6,
            duration: 0.4,
            confidence: 1,
          },
          {
            id: 'word-4',
            text: 'moment',
            start: 1.6,
            absoluteStart: 1.6,
            end: 3,
            absoluteEnd: 3,
            duration: 1.4,
            confidence: 1,
          },
        ],
      },
    ],
    font: 'Inter:500',
    fontSize: 48,
    textColor: '#ffffff',
    breathingDuration: 2.5,
    wordStagger: 0.15,
    startLetterSpacing: '-0.2em',
    endLetterSpacing: '0em',
    startOpacity: 0.7,
    endOpacity: 1,
    globalImpact: 1.0,
  },
};

// Export preset
export const breathingKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
