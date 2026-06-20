/**
 * Brush Wipe Text Reveal Preset
 *
 * An elegant cinematic text reveal preset where each word appears through a smooth left-to-right 
 * wipe animation, simulating an invisible brush painting the text onto canvas. Features a soft-edge 
 * clip-path mask sweep, subtle opacity fade (0.7 to 1), and blur-to-sharp transition (2px to 0) 
 * for added elegance. Words are staggered by 0.1s and the effect uses ease-out easing over 0.8s 
 * per word. Supports GPU acceleration via translateZ(0) for optimal performance.
 *
 * USE CASES:
 * - Cinematic title reveals
 * - Elegant text introductions
 * - Artistic typography animations
 * - Professional video intros
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Zod schema for preset parameters
const presetParams = z.object({
  trackId: z
    .string()
    .default('brush-wipe-text-reveal')
    .describe('Unique ID for this preset track'),
  captions: z
    .array(
      z.object({
        text: z.string().describe('Full sentence text'),
        start: z.number().describe('Relative start time (relative to caption start = 0)'),
        end: z.number().describe('Relative end time'),
        duration: z.number().describe('Relative duration'),
        absoluteStart: z.number().describe('Absolute start in caption timeline (scene-relative)'),
        absoluteEnd: z.number().describe('Absolute end in caption timeline'),
        words: z.array(
          z.object({
            text: z.string().describe('Word text'),
            start: z.number().describe('Relative start time (relative to caption start)'),
            end: z.number().describe('Relative end time'),
            duration: z.number().describe('Word duration'),
            absoluteStart: z.number().describe('Absolute start in caption timeline'),
            absoluteEnd: z.number().describe('Absolute end in caption timeline'),
          })
        ),
      })
    )
    .describe('Array of caption sentences with word-level timing'),
  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe('Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  staggerDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Stagger delay between words in seconds'),
  wipeDuration: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.8)
    .describe('Duration of wipe animation per word in seconds'),
  containerClassName: z
    .string()
    .optional()
    .default('w-full h-full')
    .describe('CSS class names for the root container'),
  position: z
    .enum(['center', 'top', 'bottom', 'left', 'right'])
    .default('center')
    .describe('Position of text on screen'),
  wordSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Space between words in pixels (gap)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackId,
    captions,
    font,
    fontSize,
    textColor,
    staggerDelay,
    wipeDuration,
    containerClassName,
    position,
    wordSpacing,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:600';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
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

  // Get position classes based on position parameter
  const getPositionClasses = (pos: string): string => {
    switch (pos) {
      case 'top':
        return 'items-start justify-center pt-8';
      case 'bottom':
        return 'items-end justify-center pb-8';
      case 'left':
        return 'items-center justify-start pl-8';
      case 'right':
        return 'items-center justify-end pr-8';
      case 'center':
      default:
        return 'items-center justify-center';
    }
  };

  const positionClasses = getPositionClasses(position);

  // Build children data for all captions
  const captionsChildren: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      // Build word components for this caption
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `${trackId}-caption-${captionIndex}-word-${wordIndex}`;

          // Calculate staggered start time (relative to caption start)
          const staggeredStart = wordIndex * staggerDelay;

          // Create wipe effect (clip-path animation)
          const wipeEffect = {
            id: `${wordId}-wipe`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: staggeredStart, // Relative to caption start
              duration: wipeDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
                { key: 'clipPath', val: 'inset(0 0 0 0)', prog: 1 },
              ],
            },
          };

          // Create opacity fade effect
          const opacityEffect = {
            id: `${wordId}-opacity`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: staggeredStart,
              duration: wipeDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'opacity', val: 0.7, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          };

          // Create blur-to-sharp effect
          const blurEffect = {
            id: `${wordId}-blur`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: staggeredStart,
              duration: wipeDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'filter', val: 'blur(2px)', prog: 0 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ],
            },
          };

          // Create word container with overflow hidden
          const wordContainer: RenderableComponentData = {
            id: `${wordId}-container`,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative overflow-hidden',
                style: {
                  transform: 'translateZ(0)', // GPU acceleration
                },
              },
            },
            context: {
              timing: {
                start: 0, // All words start together (sentence-level timing)
                duration: caption.duration,
              },
            },
            childrenData: [
              {
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
                },
                context: {
                  timing: {
                    start: 0,
                    duration: caption.duration,
                  },
                },
                effects: [wipeEffect, opacityEffect, blurEffect],
              } as RenderableComponentData,
            ],
          };

          return wordContainer;
        }
      );

      // Create caption container (flex layout for words)
      const captionContainer: RenderableComponentData = {
        id: `${trackId}-caption-${captionIndex}-container`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `flex flex-wrap ${positionClasses}`,
            style: {
              gap: `${wordSpacing}px`,
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
      };

      return captionContainer;
    }
  );

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: containerClassName,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'children', // Match total duration to children
      },
    },
    childrenData: captionsChildren,
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
  id: 'brush-wipe-text-reveal',
  title: 'Brush Wipe Text Reveal',
  description:
    'An elegant cinematic text reveal preset where each word appears through a smooth left-to-right wipe animation, simulating an invisible brush painting the text onto canvas. Features a soft-edge clip-path mask sweep, subtle opacity fade (0.7 to 1), and blur-to-sharp transition (2px to 0) for added elegance. Words are staggered by 0.1s and the effect uses ease-out easing over 0.8s per word. Supports GPU acceleration via translateZ(0) for optimal performance.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'reveal', 'wipe', 'brush', 'cinematic', 'elegant', 'animated'],
  defaultInputParams: {
    trackId: 'brush-wipe-text-reveal',
    captions: [
      {
        text: 'The invisible brush paints words',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            text: 'The',
            start: 0,
            end: 0.5,
            duration: 0.5,
            absoluteStart: 0,
            absoluteEnd: 0.5,
          },
          {
            text: 'invisible',
            start: 0.5,
            end: 1.2,
            duration: 0.7,
            absoluteStart: 0.5,
            absoluteEnd: 1.2,
          },
          {
            text: 'brush',
            start: 1.2,
            end: 1.8,
            duration: 0.6,
            absoluteStart: 1.2,
            absoluteEnd: 1.8,
          },
          {
            text: 'paints',
            start: 1.8,
            end: 2.4,
            duration: 0.6,
            absoluteStart: 1.8,
            absoluteEnd: 2.4,
          },
          {
            text: 'words',
            start: 2.4,
            end: 3,
            duration: 0.6,
            absoluteStart: 2.4,
            absoluteEnd: 3,
          },
        ],
      },
    ],
    font: 'Inter:600',
    fontSize: 72,
    textColor: '#ffffff',
    staggerDelay: 0.1,
    wipeDuration: 0.8,
    containerClassName: 'w-full h-full',
    position: 'center',
    wordSpacing: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const brushWipeTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
