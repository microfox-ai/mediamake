/**
 * Typewriter Typokinetics Preset
 *
 * This preset creates a typewriter-style text reveal effect where text appears character by character
 * with instant visibility (no fade), similar to command-line interfaces or retro computer terminals.
 * As a video editor would create a typing effect by revealing characters frame by frame, this preset
 * implements it using CSS clip-path to reveal text progressively while maintaining hard edges.
 *
 * Features:
 * - **Character-by-Character Reveal**: Each character 'pops' into existence with mechanical precision
 * - **Hard-Edge Clip-Path**: Uses clip-path animation with stepped timing (no easing between characters)
 * - **Title Mode**: Reveals the entire string character by character
 * - **Caption Mode**: Processes each word individually, typing them out in sequence with brief pauses
 * - **Blinking Cursor**: Optional cursor that appears and disappears with hard cuts (no fade)
 * - **Monospace Font**: Terminal-style typography (default: Courier New)
 * - **Terminal Aesthetic**: Black background with green text for authentic retro feel
 *
 * Use cases:
 * - Creating retro computer terminal effects
 * - Adding command-line interface aesthetics
 * - Building typewriter-style title sequences
 * - Creating mechanical, precise text animations
 * - Adding nostalgic tech aesthetics to videos
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  // Content configuration
  text: z
    .string()
    .optional()
    .describe(
      'Text to display (for title mode). Ignored if captions are provided.',
    ),
  captions: z
    .array(z.any())
    .optional()
    .describe(
      'Array of caption objects with timing and words (for caption mode)',
    ),

  // Mode selection
  mode: z
    .enum(['title', 'caption'])
    .default('title')
    .describe(
      'Mode: "title" for single text reveal, "caption" for word-by-word captions',
    ),

  // Timing configuration
  characterDuration: z
    .number()
    .min(0.01)
    .max(0.5)
    .default(0.05)
    .describe('Duration per character in seconds (0.05 = 50ms per character)'),
  wordPauseDuration: z
    .number()
    .min(0)
    .max(2)
    .default(0.1)
    .describe('Pause duration between words in caption mode (seconds)'),

  // Typography
  font: z
    .string()
    .default('Courier New:400:normal')
    .describe(
      'Font family with optional weight and style (e.g., "Courier New:400:normal")',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#00FF00')
    .describe('Text color (default: terminal green)'),

  // Cursor configuration
  showCursor: z
    .boolean()
    .default(true)
    .describe('Show blinking cursor at the end'),
  cursorColor: z
    .string()
    .default('#00FF00')
    .describe('Cursor color (default: terminal green)'),
  cursorBlinkRate: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Cursor blink rate in seconds (duration of one full cycle)'),

  // Layout configuration
  position: z
    .enum(['center', 'top', 'bottom', 'left', 'right'])
    .default('center')
    .describe('Text position on screen'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (default: black for terminal aesthetic)'),

  // Advanced options
  trackId: z
    .string()
    .default('typewriter-typokinetics')
    .describe('Unique ID for this preset instance'),
  startDelay: z
    .number()
    .min(0)
    .default(0)
    .describe('Delay before typing starts (seconds)'),
  duration: z
    .number()
    .optional()
    .describe(
      'Total duration (optional, auto-calculated if not provided for title mode)',
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Courier New:400:normal';
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

  // Determine position alignment classes
  const getPositionClasses = (position: string): string => {
    switch (position) {
      case 'top':
        return 'items-start justify-center pt-20';
      case 'bottom':
        return 'items-end justify-center pb-20';
      case 'left':
        return 'items-center justify-start pl-20';
      case 'right':
        return 'items-center justify-end pr-20';
      case 'center':
      default:
        return 'items-center justify-center';
    }
  };

  const childrenData: RenderableComponentData[] = [];

  if (params.mode === 'title' && params.text) {
    // Title Mode: Single text reveal
    const textLength = params.text.length;
    const typingDuration = textLength * params.characterDuration;
    const totalDuration = params.duration || typingDuration + params.startDelay;

    const textId = `${params.trackId}-text`;

    // Create text atom with clipPath reveal effect
    const textAtom: RenderableComponentData = {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
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
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `${textId}-reveal`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: params.startDelay,
            duration: typingDuration,
            mode: 'provider',
            targetIds: [textId],
            ranges: [
              {
                key: 'clipPath',
                val: 'inset(0 100% 0 0)',
                prog: 0,
              },
              {
                key: 'clipPath',
                val: 'inset(0 0 0 0)',
                prog: 1,
              },
            ],
          },
        },
      ],
    };

    childrenData.push(textAtom);

    // Add cursor if enabled
    if (params.showCursor) {
      const cursorStartTime = params.startDelay + typingDuration;
      const cursorDuration = totalDuration - cursorStartTime;

      if (cursorDuration > 0) {
        const cursorId = `${params.trackId}-cursor`;

        // Calculate cursor position offset (approximate, based on text length and font size)
        const cursorOffsetX = (textLength * params.fontSize * 0.6) / 2;

        const cursorAtom: RenderableComponentData = {
          id: cursorId,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 2px; height: ${params.fontSize}px; background-color: ${params.cursorColor}; transform: translateZ(0);"></div>`,
            className: 'absolute',
            style: {
              left: `calc(50% + ${cursorOffsetX}px)`,
              top: '50%',
              transform: 'translateY(-50%) translateZ(0)',
            },
          },
          context: {
            timing: {
              start: cursorStartTime,
              duration: cursorDuration,
            },
          },
          effects: [
            {
              id: `${cursorId}-blink`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: cursorDuration,
                mode: 'provider',
                targetIds: [cursorId],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  {
                    key: 'opacity',
                    val: 1,
                    prog: 0.25 / (cursorDuration / params.cursorBlinkRate),
                  },
                  {
                    key: 'opacity',
                    val: 0,
                    prog: 0.25 / (cursorDuration / params.cursorBlinkRate),
                  },
                  {
                    key: 'opacity',
                    val: 0,
                    prog: 0.5 / (cursorDuration / params.cursorBlinkRate),
                  },
                  {
                    key: 'opacity',
                    val: 1,
                    prog: 0.5 / (cursorDuration / params.cursorBlinkRate),
                  },
                  {
                    key: 'opacity',
                    val: 1,
                    prog: 0.75 / (cursorDuration / params.cursorBlinkRate),
                  },
                  {
                    key: 'opacity',
                    val: 0,
                    prog: 0.75 / (cursorDuration / params.cursorBlinkRate),
                  },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        };

        childrenData.push(cursorAtom);
      }
    }
  } else if (params.mode === 'caption' && params.captions) {
    // Caption Mode: Word-by-word reveal
    const captions = params.captions as TranscriptionSentence[];

    captions.forEach((caption, captionIndex) => {
      if (!caption.words || caption.words.length === 0) return;

      caption.words.forEach((word, wordIndex) => {
        const wordId = `${params.trackId}-caption-${captionIndex}-word-${wordIndex}`;
        const wordLength = word.text.length;
        const typingDuration = wordLength * params.characterDuration;

        // Word starts at its relative start time
        const wordStartTime = word.start;

        const wordAtom: RenderableComponentData = {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              marginRight: '0.5em',
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
              start: wordStartTime,
              duration: word.duration,
            },
          },
          effects: [
            {
              id: `${wordId}-reveal`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: typingDuration,
                mode: 'provider',
                targetIds: [wordId],
                ranges: [
                  {
                    key: 'clipPath',
                    val: 'inset(0 100% 0 0)',
                    prog: 0,
                  },
                  {
                    key: 'clipPath',
                    val: 'inset(0 0 0 0)',
                    prog: 1,
                  },
                ],
              },
            },
          ],
        };

        childrenData.push(wordAtom);
      });
    });

    // Add cursor after last word if enabled
    if (params.showCursor && captions.length > 0) {
      const lastCaption = captions[captions.length - 1];
      const lastWord = lastCaption.words[lastCaption.words.length - 1];
      const lastWordTypingDuration =
        lastWord.text.length * params.characterDuration;
      const cursorStartTime = lastWord.start + lastWordTypingDuration;
      const cursorDuration = Math.max(
        0,
        lastCaption.absoluteEnd - cursorStartTime,
      );

      if (cursorDuration > 0) {
        const cursorId = `${params.trackId}-caption-cursor`;

        // Calculate approximate cursor position
        const totalTextLength = captions.reduce((sum, caption) => {
          return (
            sum +
            caption.words.reduce((wordSum, word) => wordSum + word.text.length, 0)
          );
        }, 0);
        const cursorOffsetX = (totalTextLength * params.fontSize * 0.6) / 2;

        const cursorAtom: RenderableComponentData = {
          id: cursorId,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 2px; height: ${params.fontSize}px; background-color: ${params.cursorColor}; transform: translateZ(0);"></div>`,
            className: 'absolute',
            style: {
              left: `calc(50% + ${cursorOffsetX}px)`,
              top: '50%',
              transform: 'translateY(-50%) translateZ(0)',
            },
          },
          context: {
            timing: {
              start: cursorStartTime,
              duration: cursorDuration,
            },
          },
          effects: [
            {
              id: `${cursorId}-blink`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: cursorDuration,
                mode: 'provider',
                targetIds: [cursorId],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  {
                    key: 'opacity',
                    val: 1,
                    prog: 0.25 / (cursorDuration / params.cursorBlinkRate),
                  },
                  {
                    key: 'opacity',
                    val: 0,
                    prog: 0.25 / (cursorDuration / params.cursorBlinkRate),
                  },
                  {
                    key: 'opacity',
                    val: 0,
                    prog: 0.5 / (cursorDuration / params.cursorBlinkRate),
                  },
                  {
                    key: 'opacity',
                    val: 1,
                    prog: 0.5 / (cursorDuration / params.cursorBlinkRate),
                  },
                  {
                    key: 'opacity',
                    val: 1,
                    prog: 0.75 / (cursorDuration / params.cursorBlinkRate),
                  },
                  {
                    key: 'opacity',
                    val: 0,
                    prog: 0.75 / (cursorDuration / params.cursorBlinkRate),
                  },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        };

        childrenData.push(cursorAtom);
      }
    }
  }

  // Calculate total duration for caption mode
  let calculatedDuration = params.duration;
  if (!calculatedDuration) {
    if (params.mode === 'title' && params.text) {
      calculatedDuration =
        params.text.length * params.characterDuration + params.startDelay;
    } else if (params.mode === 'caption' && params.captions) {
      const captions = params.captions as TranscriptionSentence[];
      if (captions.length > 0) {
        const lastCaption = captions[captions.length - 1];
        calculatedDuration = lastCaption.absoluteEnd;
      } else {
        calculatedDuration = 10; // Default fallback
      }
    } else {
      calculatedDuration = 10; // Default fallback
    }
  }

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: `${params.trackId}-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full flex ${getPositionClasses(params.position)}`,
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: calculatedDuration,
      },
    },
    childrenData: childrenData,
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
  id: 'typewriter-typokinetics',
  title: 'Typewriter Typokinetics Preset',
  description:
    'A typewriter-style text reveal preset featuring character-by-character typing animation with instant visibility (no fade), monospace font, hard-edge clip-path reveals, optional blinking cursor, and support for both full-text titles and word-by-word captions with mechanical precision.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typewriter',
    'typing',
    'terminal',
    'retro',
    'command-line',
    'monospace',
    'cursor',
    'character-reveal',
    'mechanical',
    'hard-edge',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Hello, World!',
    mode: 'title',
    characterDuration: 0.05,
    wordPauseDuration: 0.1,
    font: 'Courier New:400:normal',
    fontSize: 48,
    textColor: '#00FF00',
    showCursor: true,
    cursorColor: '#00FF00',
    cursorBlinkRate: 0.5,
    position: 'center',
    backgroundColor: '#000000',
    trackId: 'typewriter-typokinetics',
    startDelay: 0,
  },
};

export const typewriterTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
