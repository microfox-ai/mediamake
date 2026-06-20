/**
 * Typokinetics Cursive Flow Preset
 *
 * This preset creates elegant serif text animations that mimic handwritten cursive being
 * written letter by letter with continuous flowing motion. Each word flows in from the left
 * with rotation, scale, and blur-to-focus effects creating the illusion of calligraphy
 * being written in real-time.
 *
 * Features:
 * - **Sophisticated Serif Typography**: Uses Playfair Display or Crimson Text fonts with high weight (700+)
 * - **Cursive Writing Animation**: Fluid reveal with translateX, rotate, scale, and blur effects
 * - **Luxurious Feel**: Smooth easing curves mimic natural handwriting flow
 * - **Depth Enhancement**: Subtle text-shadow creates depth and elegance
 * - **GPU-Accelerated**: Uses transform and opacity only for optimal performance
 * - **Word-by-Word Reveal**: Sequential reveal with staggered timing based on caption data
 *
 * Use cases:
 * - Elegant title sequences and opening credits
 * - Premium brand content and luxury product reveals
 * - Sophisticated typography for upscale videos
 * - Wedding videos, invitations, and formal announcements
 * - High-end fashion and lifestyle content
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
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
            keyword: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with words and timing'),

  font: z
    .string()
    .default('Playfair Display:700:italic')
    .describe(
      'Font family with weight and style (e.g., "Playfair Display:700:italic" or "Crimson Text:700:italic")',
    ),

  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(64)
    .describe('Base font size in pixels (default: 64)'),

  textColor: z
    .string()
    .default('#1a1a1a')
    .describe('Text color in hex or CSS color format (default: #1a1a1a)'),

  textShadow: z
    .string()
    .default('2px 2px 8px rgba(0,0,0,0.2)')
    .describe('Text shadow for depth effect (default: 2px 2px 8px rgba(0,0,0,0.2))'),

  effectDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of reveal animation per word in seconds (default: 0.8)'),

  effectImpact: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe(
      'Global effect intensity multiplier - affects animation speed and intensity (default: 1)',
    ),

  wordSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Space between words in pixels (default: 8)'),

  alignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Text alignment (default: center)'),

  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position on screen (default: center)'),

  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(40)
    .describe('Container padding in pixels (default: 40)'),
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
    textShadow,
    effectDuration,
    effectImpact,
    wordSpacing,
    alignment,
    verticalPosition,
    containerPadding,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Playfair Display:700:italic';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate alignment classes
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  const verticalClasses = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  };

  // Process all captions
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      // Get impact multiplier from caption metadata or global param
      const impact = caption.metadata?.impact ?? effectImpact;

      // Calculate effect duration with impact
      const wordEffectDuration = effectDuration * impact;

      // Process words in this caption
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `word-${captionIndex}-${wordIndex}`;

          // Create cursive flow effect
          const effect: GenericEffectData = {
            type: 'ease-out',
            start: word.start, // Relative to caption start
            duration: wordEffectDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              // Opacity: 0 → 1
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              // TranslateX: -30 → 0 (flow in from left)
              { key: 'translateX', val: -30, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              // Rotate: -5 → 0 (slight rotation)
              { key: 'rotate', val: -5, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              // Scale: 0.8 → 1 (scale up)
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              // Blur: 4 → 0 (blur to focus)
              { key: 'blur', val: '4px', prog: 0 },
              { key: 'blur', val: '0px', prog: 1 },
            ],
          };

          const wordEffect = {
            id: `cursive-flow-${wordId}`,
            componentId: 'generic',
            data: effect,
          };

          // Create TextAtom for word
          const wordComponent: RenderableComponentData = {
            id: wordId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                textShadow: textShadow,
                willChange: 'transform, opacity, filter',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['700'],
                display: 'swap',
                preload: true,
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [wordEffect],
          };

          return wordComponent;
        },
      );

      // Create word wrapper container for this caption
      const wordWrapperContainer: RenderableComponentData = {
        id: `word-wrapper-${captionIndex}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `flex flex-wrap ${alignmentClasses[alignment]} gap-2`,
            style: {
              gap: `${wordSpacing}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: wordComponents,
      };

      // Create caption container
      const captionContainer: RenderableComponentData = {
        id: `caption-container-${captionIndex}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `relative flex ${verticalClasses[verticalPosition]} ${alignmentClasses[alignment]}`,
            style: {
              padding: `${containerPadding}px`,
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [wordWrapperContainer],
      };

      return captionContainer;
    },
  );

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-cursive-flow-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd : 10,
      },
    },
    childrenData: captionContainers,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokinetics-cursive-flow',
  title: 'Typokinetics Cursive Flow',
  description:
    'Elegant serif typography preset that animates text with continuous flowing motion, mimicking handwritten cursive being written letter by letter. Features sophisticated serif fonts (Playfair Display/Crimson Text) with fluid reveal animations including rotation, scale, translateX, and blur-to-focus effects. Each letter flows in sequentially with premium easing curves that create the illusion of real-time calligraphy. Includes depth-enhancing text shadows and GPU-accelerated transforms for smooth performance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'captions',
    'cursive',
    'elegant',
    'serif',
    'flowing',
    'handwritten',
    'calligraphy',
    'luxury',
    'premium',
    'sophisticated',
    'kinetic',
    'animated',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Elegant Typography',
        start: 0,
        end: 2.5,
        duration: 2.5,
        absoluteStart: 0,
        absoluteEnd: 2.5,
        words: [
          {
            id: 'word-1',
            text: 'Elegant',
            start: 0,
            end: 1.2,
            duration: 1.2,
            absoluteStart: 0,
            absoluteEnd: 1.2,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'Typography',
            start: 1.2,
            end: 2.5,
            duration: 1.3,
            absoluteStart: 1.2,
            absoluteEnd: 2.5,
            confidence: 1,
          },
        ],
      },
    ],
    font: 'Playfair Display:700:italic',
    fontSize: 64,
    textColor: '#1a1a1a',
    textShadow: '2px 2px 8px rgba(0,0,0,0.2)',
    effectDuration: 0.8,
    effectImpact: 1,
    wordSpacing: 8,
    alignment: 'center',
    verticalPosition: 'center',
    containerPadding: 40,
  },
};

// Export preset
export const typokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
