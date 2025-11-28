/**
 * Typewriter Progressive Fill Preset
 *
 * Creates a character-by-character progressive fill animation where each letter
 * transitions from hollow/outline to filled. Combines typewriter reveal with
 * flood-fill transition effects.
 *
 * Features:
 * - **Character-by-Character Reveal**: Letters fill sequentially from left to right
 * - **Hollow-to-Filled Transition**: Each letter starts as outline and rapidly fills
 * - **Moving Cursor**: Visual cursor follows the fill progression with pulse animation
 * - **Scale & Brightness Effects**: Subtle pop effect when each character fills
 * - **Precise Timing**: Uses caption word timing for synchronized animation
 * - **Customizable Speed**: Control fill duration per character
 *
 * Use cases:
 * - Creating dynamic text reveal animations
 * - Typewriter-style title sequences
 * - Progressive text fill effects for social media
 * - Engaging caption animations with visual interest
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

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
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
          }),
        ),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),
  fillDuration: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.2)
    .describe('Duration of fill animation per character (seconds)'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z.string().default('#FFFFFF').describe('Text fill color'),
  outlineWidth: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Outline stroke width in pixels'),
  outlineColor: z
    .string()
    .default('currentColor')
    .describe('Outline stroke color'),
  cursorColor: z
    .string()
    .default('currentColor')
    .describe('Color of the moving cursor'),
  scaleEffect: z
    .boolean()
    .default(true)
    .describe('Enable scale effect during fill'),
  brightnessEffect: z
    .boolean()
    .default(true)
    .describe('Enable brightness flash during fill'),
  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text'),
  containerPadding: z
    .number()
    .default(40)
    .describe('Container padding in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fillDuration,
    fontSize,
    font,
    textColor,
    outlineWidth,
    outlineColor,
    cursorColor,
    scaleEffect,
    brightnessEffect,
    position,
    containerPadding,
  } = params;

  // Parse font string
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

  const { fontFamily, fontStyle } = font
    ? parseFontString(font)
    : { fontFamily: 'Inter', fontStyle: {} };

  // Vertical alignment
  const alignmentClass =
    position === 'top'
      ? 'justify-start'
      : position === 'bottom'
        ? 'justify-end'
        : 'justify-center';

  // Generate character components for all captions
  const allCharacterContainers: RenderableComponentData[] = [];
  let totalCharacters = 0;

  captions.forEach((caption) => {
    caption.words.forEach((word) => {
      const chars = word.text.split('');
      const charDuration = word.duration / chars.length;

      chars.forEach((char, charIndex) => {
        const charId = `char-${caption.id}-${word.absoluteStart}-${charIndex}`;
        const charStart = word.absoluteStart + charIndex * charDuration;
        const charRelativeStart = charIndex * charDuration;

        // Create character container with fill effect
        const characterContainer: RenderableComponentData = {
          id: `${charId}-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative inline-block',
            },
          },
          context: {
            timing: {
              start: charStart,
              duration: fillDuration,
            },
          },
          childrenData: [
            {
              id: charId,
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: char === ' ' ? '\u00A0' : char, // Non-breaking space for spaces
                style: {
                  fontSize: `${fontSize}px`,
                  fontWeight: fontStyle.fontWeight || 700,
                  fontStyle: fontStyle.fontStyle || 'normal',
                  WebkitTextStroke: `${outlineWidth}px ${outlineColor}`,
                  color: 'transparent',
                  display: 'inline-block',
                },
                font: {
                  family: fontFamily,
                  weights: fontStyle.fontWeight
                    ? [fontStyle.fontWeight.toString()]
                    : ['700'],
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: fillDuration,
                },
              },
              effects: [
                {
                  id: `${charId}-fill-effect`,
                  componentId: 'generic',
                  data: {
                    type: 'ease-in-out',
                    start: 0,
                    duration: fillDuration,
                    mode: 'provider',
                    targetIds: [charId],
                    ranges: [
                      // Color fill: transparent to filled
                      { key: 'color', val: 'transparent', prog: 0 },
                      { key: 'color', val: textColor, prog: 1 },
                      // Scale effect
                      ...(scaleEffect
                        ? [
                            { key: 'scale', val: 0.8, prog: 0 },
                            { key: 'scale', val: 1.05, prog: 0.5 },
                            { key: 'scale', val: 1, prog: 1 },
                          ]
                        : [
                            { key: 'scale', val: 1, prog: 0 },
                            { key: 'scale', val: 1, prog: 1 },
                          ]),
                      // Brightness flash
                      ...(brightnessEffect
                        ? [
                            { key: 'brightness', val: 1, prog: 0 },
                            { key: 'brightness', val: 1.5, prog: 0.5 },
                            { key: 'brightness', val: 1, prog: 1 },
                          ]
                        : [
                            { key: 'brightness', val: 1, prog: 0 },
                            { key: 'brightness', val: 1, prog: 1 },
                          ]),
                    ],
                  },
                },
              ],
            } as RenderableComponentData,
          ],
        };

        allCharacterContainers.push(characterContainer);
        totalCharacters++;
      });

      // Add space between words
      if (word !== caption.words[caption.words.length - 1]) {
        const spaceId = `space-${caption.id}-${word.absoluteStart}`;
        const spaceContainer: RenderableComponentData = {
          id: `${spaceId}-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative inline-block',
            },
          },
          context: {
            timing: {
              start: word.absoluteEnd,
              duration: 0.1,
            },
          },
          childrenData: [
            {
              id: spaceId,
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: '\u00A0', // Non-breaking space
                style: {
                  fontSize: `${fontSize}px`,
                  display: 'inline-block',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: 0.1,
                },
              },
            } as RenderableComponentData,
          ],
        };
        allCharacterContainers.push(spaceContainer);
      }
    });
  });

  // Calculate total duration
  const totalDuration = captions.length > 0
    ? Math.max(...captions.map((c) => c.absoluteEnd))
    : totalCharacters * fillDuration;

  // Calculate approximate text width for cursor movement
  const approximateCharWidth = fontSize * 0.6; // Rough estimate
  const totalTextWidth = totalCharacters * approximateCharWidth;

  // Create cursor element
  const cursorElement: RenderableComponentData = {
    id: 'typewriter-cursor',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute w-0.5 animate-pulse',
        style: {
          height: `${fontSize * 1.2}px`,
          backgroundColor: cursorColor,
          left: '0px',
          top: '50%',
          transform: 'translateY(-50%)',
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
        id: 'cursor-move-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['typewriter-cursor'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: totalTextWidth, prog: 1 },
          ],
        },
      },
    ],
  };

  // Text wrapper container
  const textWrapperContainer: RenderableComponentData = {
    id: 'typewriter-text-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-wrap items-baseline relative',
        style: {
          gap: '0',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: allCharacterContainers,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-progressive-fill-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex items-center ${alignmentClass}`,
        style: {
          padding: `${containerPadding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textWrapperContainer, cursorElement],
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
  id: 'typewriter-progressive-fill',
  title: 'Typewriter Progressive Fill',
  description:
    'A character-by-character progressive fill animation where each letter transitions from hollow outline to filled with a rapid flood effect. Features a moving cursor/highlight that follows the fill progression. Each character gets a staggered fill animation with scale and brightness effects for visual impact.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'typewriter',
    'progressive-fill',
    'character-animation',
    'outline-to-fill',
    'cursor',
    'dynamic',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello World',
        start: 0,
        absoluteStart: 0,
        end: 2.2,
        absoluteEnd: 2.2,
        duration: 2.2,
        words: [
          {
            text: 'Hello',
            start: 0,
            absoluteStart: 0,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 1.0,
          },
          {
            text: 'World',
            start: 1.0,
            absoluteStart: 1.0,
            end: 2.2,
            absoluteEnd: 2.2,
            duration: 1.2,
          },
        ],
      },
    ],
    fillDuration: 0.2,
    fontSize: 48,
    font: 'Inter:700',
    textColor: '#FFFFFF',
    outlineWidth: 2,
    outlineColor: 'currentColor',
    cursorColor: 'currentColor',
    scaleEffect: true,
    brightnessEffect: true,
    position: 'center',
    containerPadding: 40,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const typewriterProgressiveFillPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
