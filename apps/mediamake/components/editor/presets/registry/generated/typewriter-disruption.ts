/**
 * Typewriter Disruption Preset
 *
 * A kinetic text animation preset where words are typed out character-by-character,
 * but midway through the typing, the process reverses and deletes characters while
 * simultaneously typing the new word in the gap. This creates a fluid dissolution
 * and reformation effect, mimicking a video editor's text animation with a unique
 * backspace effect.
 *
 * Features:
 * - **Character-by-Character Typing**: Words reveal letter by letter with staggered timing
 * - **Reverse Deletion Effect**: Characters delete backward while new word types in
 * - **Typewriter Aesthetics**: Monospace font, character jitter, varying opacity for fresh ink
 * - **Animated Cursor**: Blinking cursor element that tracks typing position
 * - **Caption Data Integration**: Uses word-level timing from caption data for precise control
 * - **Smooth Transitions**: Fluid dissolution and reformation between words
 *
 * Use cases:
 * - Creating dynamic title sequences with typewriter effects
 * - Building kinetic typography animations for social media
 * - Adding retro-tech aesthetic to video content
 * - Creating unique text transitions for modern editing styles
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string().describe('Caption ID'),
        text: z.string().describe('Caption text'),
        start: z.number().describe('Start time relative to caption (0)'),
        end: z.number().describe('End time relative to caption'),
        duration: z.number().describe('Duration of caption'),
        absoluteStart: z
          .number()
          .describe('Absolute start time in caption timeline'),
        absoluteEnd: z
          .number()
          .describe('Absolute end time in caption timeline'),
        words: z
          .array(
            z.object({
              id: z.string().optional().describe('Word ID'),
              text: z.string().describe('Word text'),
              start: z.number().describe('Start time relative to caption'),
              end: z.number().describe('End time relative to caption'),
              duration: z.number().describe('Word duration'),
              absoluteStart: z
                .number()
                .describe('Absolute start time in caption timeline'),
              absoluteEnd: z
                .number()
                .describe('Absolute end time in caption timeline'),
              confidence: z.number().optional().describe('Confidence score'),
            }),
          )
          .describe('Array of words in caption'),
        metadata: z
          .record(z.string(), z.any())
          .optional()
          .describe('Optional caption metadata'),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels for text'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),

  font: z
    .string()
    .default('CourierPrime:400')
    .optional()
    .describe(
      'Font family with optional weight (e.g., "CourierPrime:400", "RobotoMono:700")',
    ),

  cursorColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Color of the typewriter cursor'),

  charTypeDuration: z
    .number()
    .min(0.01)
    .max(0.5)
    .default(0.05)
    .optional()
    .describe('Duration for each character to type in (seconds)'),

  charDeleteDuration: z
    .number()
    .min(0.01)
    .max(0.5)
    .default(0.04)
    .optional()
    .describe('Duration for each character to delete (seconds)'),

  transitionOverlap: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe(
      'Overlap ratio between deletion and typing (0=sequential, 1=full overlap)',
    ),

  jitterIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe('Intensity of character position jitter (pixels)'),

  cursorBlinkSpeed: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Cursor blink speed (seconds per blink cycle)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize = 48,
    textColor = '#FFFFFF',
    font = 'CourierPrime:400',
    cursorColor = '#FFFFFF',
    charTypeDuration = 0.05,
    charDeleteDuration = 0.04,
    transitionOverlap = 0.5,
    jitterIntensity = 1,
    cursorBlinkSpeed = 0.5,
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Helper: Split text into characters
  const splitIntoChars = (text: string): string[] => {
    return text.split('');
  };

  // Process captions to create word transitions
  const allWordTransitions: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const words = caption.words;

    words.forEach((word, wordIndex) => {
      const nextWord = words[wordIndex + 1];

      if (nextWord) {
        // Create transition from current word to next word
        const currentChars = splitIntoChars(word.text);
        const nextChars = splitIntoChars(nextWord.text);

        const transitionStartTime = word.absoluteStart;
        const transitionDuration = nextWord.absoluteEnd - word.absoluteStart;

        // Calculate deletion and typing timings
        const deletePhaseStart = 0;
        const deletePhaseEnd = currentChars.length * charDeleteDuration;

        const typePhaseStart = deletePhaseEnd * (1 - transitionOverlap);
        const typePhaseEnd =
          typePhaseStart + nextChars.length * charTypeDuration;

        // Create container for this transition
        const transitionContainerId = `transition-${captionIndex}-${wordIndex}`;

        // Create outgoing (deleting) characters
        const outgoingChars: RenderableComponentData[] = currentChars.map(
          (char, charIndex) => {
            const charId = `outgoing-${captionIndex}-${wordIndex}-${charIndex}`;
            const deleteStartTime = charIndex * charDeleteDuration;

            return {
              id: charId,
              type: 'atom' as const,
              componentId: 'TextAtom',
              data: {
                text: char,
                className: 'font-mono inline-block',
                style: {
                  fontSize: `${fontSize}px`,
                  color: textColor,
                  ...fontStyle,
                },
                font: {
                  family: fontFamily,
                  weights: fontStyle.fontWeight
                    ? [fontStyle.fontWeight.toString()]
                    : ['400'],
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration,
                },
              },
              effects: [
                {
                  id: `delete-effect-${charId}`,
                  componentId: 'generic',
                  data: {
                    type: 'linear',
                    start: deleteStartTime,
                    duration: charDeleteDuration,
                    mode: 'provider',
                    targetIds: [charId],
                    ranges: [
                      { key: 'opacity', val: 1, prog: 0 },
                      { key: 'opacity', val: 0, prog: 1 },
                      { key: 'translateX', val: 0, prog: 0 },
                      { key: 'translateX', val: -5, prog: 1 },
                    ],
                  },
                },
              ],
            } as RenderableComponentData;
          },
        );

        // Create incoming (typing) characters
        const incomingChars: RenderableComponentData[] = nextChars.map(
          (char, charIndex) => {
            const charId = `incoming-${captionIndex}-${wordIndex}-${charIndex}`;
            const typeStartTime = typePhaseStart + charIndex * charTypeDuration;

            return {
              id: charId,
              type: 'atom' as const,
              componentId: 'TextAtom',
              data: {
                text: char,
                className: 'font-mono inline-block',
                style: {
                  fontSize: `${fontSize}px`,
                  color: textColor,
                  ...fontStyle,
                },
                font: {
                  family: fontFamily,
                  weights: fontStyle.fontWeight
                    ? [fontStyle.fontWeight.toString()]
                    : ['400'],
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration,
                },
              },
              effects: [
                {
                  id: `type-effect-${charId}`,
                  componentId: 'generic',
                  data: {
                    type: 'ease-out',
                    start: typeStartTime,
                    duration: charTypeDuration,
                    mode: 'provider',
                    targetIds: [charId],
                    ranges: [
                      { key: 'opacity', val: 0, prog: 0 },
                      { key: 'opacity', val: 0.7, prog: 0.3 },
                      { key: 'opacity', val: 1, prog: 1 },
                      { key: 'translateX', val: 5, prog: 0 },
                      { key: 'translateX', val: 0, prog: 1 },
                    ],
                  },
                },
                {
                  id: `jitter-effect-${charId}`,
                  componentId: 'generic',
                  data: {
                    type: 'linear',
                    start: typeStartTime,
                    duration: charTypeDuration * 0.5,
                    mode: 'provider',
                    targetIds: [charId],
                    ranges: [
                      {
                        key: 'translateY',
                        val: -jitterIntensity * 0.5,
                        prog: 0,
                      },
                      {
                        key: 'translateY',
                        val: jitterIntensity * 0.5,
                        prog: 0.5,
                      },
                      { key: 'translateY', val: 0, prog: 1 },
                    ],
                  },
                },
              ],
            } as RenderableComponentData;
          },
        );

        // Create transition container
        const transitionContainer: RenderableComponentData = {
          id: transitionContainerId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className:
                'absolute inset-0 flex items-center justify-center font-mono tracking-wider',
            },
          },
          context: {
            timing: {
              start: transitionStartTime,
              duration: transitionDuration,
            },
          },
          childrenData: [
            {
              id: `text-container-${transitionContainerId}`,
              type: 'layout' as const,
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'relative flex flex-row items-center',
                },
              },
              childrenData: [
                {
                  id: `outgoing-container-${transitionContainerId}`,
                  type: 'layout' as const,
                  componentId: 'BaseLayout',
                  data: {
                    containerProps: {
                      className: 'flex flex-row',
                    },
                  },
                  childrenData: outgoingChars,
                },
                {
                  id: `incoming-container-${transitionContainerId}`,
                  type: 'layout' as const,
                  componentId: 'BaseLayout',
                  data: {
                    containerProps: {
                      className: 'flex flex-row',
                    },
                  },
                  childrenData: incomingChars,
                },
              ],
            },
          ],
        } as RenderableComponentData;

        allWordTransitions.push(transitionContainer);
      }
    });
  });

  // Create cursor element
  const cursorElement: RenderableComponentData = {
    id: 'typewriter-cursor',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 3px; height: ${fontSize * 1.2}px; background-color: ${cursorColor};"></div>`,
      className: 'absolute right-0 top-1/2 -translate-y-1/2',
    },
    context: {
      timing: {
        start: 0,
        duration:
          captions.length > 0
            ? captions[captions.length - 1].absoluteEnd
            : 10,
      },
    },
    effects: [
      {
        id: 'cursor-blink-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: cursorBlinkSpeed,
          mode: 'provider',
          targetIds: ['typewriter-cursor'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-disruption-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 flex items-center justify-center font-mono tracking-wider',
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          captions.length > 0
            ? captions[captions.length - 1].absoluteEnd
            : 10,
      },
    },
    childrenData: [...allWordTransitions, cursorElement],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'typewriter-disruption',
  title: 'Typewriter Disruption',
  description:
    'A typewriter text animation preset where words are typed character-by-character with a unique disruption effect. Midway through each word transition, typing reverses and deletes characters while simultaneously typing the new word, creating a fluid dissolution and reformation effect. Features authentic typewriter details including character position jitter, varying opacity for fresh ink effect, and an animated cursor that guides the eye. Uses caption data with word-level timing for precise character reveal control.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'typewriter',
    'kinetic',
    'text',
    'captions',
    'animation',
    'disruption',
    'character-by-character',
    'retro',
    'tech',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello World',
        start: 0,
        end: 2.5,
        duration: 2.5,
        absoluteStart: 0,
        absoluteEnd: 2.5,
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            end: 1.0,
            duration: 1.0,
            absoluteStart: 0,
            absoluteEnd: 1.0,
          },
          {
            id: 'word-2',
            text: 'World',
            start: 1.0,
            end: 2.5,
            duration: 1.5,
            absoluteStart: 1.0,
            absoluteEnd: 2.5,
          },
        ],
      },
    ],
    fontSize: 48,
    textColor: '#FFFFFF',
    font: 'CourierPrime:400',
    cursorColor: '#FFFFFF',
    charTypeDuration: 0.05,
    charDeleteDuration: 0.04,
    transitionOverlap: 0.5,
    jitterIntensity: 1,
    cursorBlinkSpeed: 0.5,
  },
};

// --- Export Preset ---

export const typewriterDisruptionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
