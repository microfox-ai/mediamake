/**
 * Typokinetic Typewriter Animation Preset
 *
 * This preset simulates words being typed on an old typewriter with character-by-character
 * staccato timing, complete with subtle vertical bounce on each keystroke. Once fully typed,
 * each word slides smoothly to the left while the next word begins typing in its place,
 * creating a continuous feed printer effect.
 *
 * Features:
 * - **Character-by-Character Typing**: Words appear incrementally with typewriter timing (0.05-0.08s per character)
 * - **Keystroke Bounce**: Subtle vertical bounce (-2px) on each character reveal with spring easing
 * - **Imperfect Key Strikes**: Slight rotation variations (±0.5deg) to simulate mechanical imperfection
 * - **Ink Consistency**: Random opacity variations (0.85-1) for authentic typewriter look
 * - **Stuck Keys**: Occasional slower typing for certain words based on length
 * - **Horizontal Slide**: Words slide off smoothly (translateX: -150%) after typing completes
 * - **Continuous Feed**: Next word begins typing while previous word slides away
 * - **Carriage Return Rhythm**: 0.2s pause between words for mechanical authenticity
 *
 * Use cases:
 * - Creating vintage typewriter text animations
 * - Building retro title sequences
 * - Animated credits with typewriter aesthetic
 * - Nostalgic text reveals for storytelling
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- PARAMETERS ---

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
        metadata: z.any().optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing data'),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(48)
    .describe('Font size for typewriter text in pixels'),

  font: z
    .string()
    .optional()
    .default('Courier New')
    .describe(
      'Monospace font family for typewriter effect (e.g., "CourierPrime:400", "IBMPlexMono:500")',
    ),

  textColor: z
    .string()
    .default('#1a1a1a')
    .describe('Text color for typed characters'),

  backgroundColor: z
    .string()
    .default('#f5e6d3')
    .describe('Paper background color (amber/cream tone)'),

  baseTypingSpeed: z
    .number()
    .min(0.03)
    .max(0.15)
    .default(0.065)
    .describe('Base typing speed per character in seconds (0.05-0.08 range)'),

  typingSpeedVariation: z
    .number()
    .min(0)
    .max(0.05)
    .default(0.015)
    .describe('Random variation in typing speed (±value)'),

  slideDuration: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Duration for word slide-off animation in seconds'),

  pauseBetweenWords: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Pause duration between words (carriage return timing)'),

  bounceHeight: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Vertical bounce height on keystroke in pixels'),

  rotationRange: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .describe('Maximum rotation variation in degrees (±value)'),

  opacityMin: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.85)
    .describe('Minimum opacity for ink consistency variation'),

  opacityMax: z
    .number()
    .min(0.5)
    .max(1)
    .default(1)
    .describe('Maximum opacity for ink consistency variation'),

  stuckKeyProbability: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Probability (0-1) of a word having stuck key effect (slower typing)'),

  stuckKeySlowdown: z
    .number()
    .min(1)
    .max(3)
    .default(1.5)
    .describe('Multiplier for stuck key typing speed (1.5 = 50% slower)'),
});

// --- EXECUTION ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];

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

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Courier New');

  // Helper: Calculate typing duration with stuck key simulation
  const calculateTypingDuration = (text: string, baseSpeed: number, variation: number, isStuck: boolean) => {
    const charCount = text.length;
    const speedMultiplier = isStuck ? params.stuckKeySlowdown : 1;
    const avgSpeed = baseSpeed + (Math.random() * variation * 2 - variation);
    return charCount * avgSpeed * speedMultiplier;
  };

  // Helper: Generate bounce keyframes for typing phase
  const generateBounceKeyframes = (duration: number, bounceHeight: number) => {
    const ranges = [];
    const charCount = Math.max(1, Math.round(duration / params.baseTypingSpeed));
    const step = 1 / (charCount * 2); // Two keyframes per character (down, up)

    for (let i = 0; i < charCount; i++) {
      const downProg = i * 2 * step;
      const upProg = (i * 2 + 1) * step;
      ranges.push(
        { key: 'translateY', val: -bounceHeight, prog: downProg },
        { key: 'translateY', val: 0, prog: upProg },
      );
    }
    ranges.push({ key: 'translateY', val: 0, prog: 1 }); // End at rest
    return ranges;
  };

  // Helper: Generate rotation variation keyframes
  const generateRotationKeyframes = (rotationRange: number) => {
    const randomRotation = () => (Math.random() * rotationRange * 2 - rotationRange);
    return [
      { key: 'rotate', val: randomRotation(), prog: 0 },
      { key: 'rotate', val: randomRotation(), prog: 0.33 },
      { key: 'rotate', val: randomRotation(), prog: 0.66 },
      { key: 'rotate', val: randomRotation(), prog: 1 },
    ];
  };

  // Helper: Generate opacity variation keyframes
  const generateOpacityKeyframes = (min: number, max: number) => {
    const randomOpacity = () => min + Math.random() * (max - min);
    return [
      { key: 'opacity', val: randomOpacity(), prog: 0 },
      { key: 'opacity', val: randomOpacity(), prog: 0.5 },
      { key: 'opacity', val: randomOpacity(), prog: 1 },
    ];
  };

  // Build word components with typewriter effects
  const wordContainers: RenderableComponentData[] = [];
  let cumulativeTime = 0;

  captions.forEach((caption) => {
    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${caption.id}-${wordIndex}`;
      const textId = `text-${wordId}`;

      // Determine if this word has stuck keys
      const isStuckKey = Math.random() < params.stuckKeyProbability;

      // Calculate typing duration for this word
      const typingDuration = calculateTypingDuration(
        word.text,
        params.baseTypingSpeed,
        params.typingSpeedVariation,
        isStuckKey,
      );

      // Total duration for this word: typing + pause + slide
      const totalWordDuration = typingDuration + params.pauseBetweenWords + params.slideDuration;

      // Create typing reveal effect (clipPath animation)
      const typingRevealEffect = {
        id: `typing-reveal-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: typingDuration,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
            { key: 'clipPath', val: 'inset(0 0% 0 0)', prog: 1 },
          ],
        },
      };

      // Create typing bounce effect (spring-based vertical bounce)
      const typingBounceEffect = {
        id: `typing-bounce-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: typingDuration,
          mode: 'provider',
          targetIds: [textId],
          ranges: generateBounceKeyframes(typingDuration, params.bounceHeight),
        },
      };

      // Create rotation variation effect
      const rotationEffect = {
        id: `rotation-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: typingDuration,
          mode: 'provider',
          targetIds: [textId],
          ranges: generateRotationKeyframes(params.rotationRange),
        },
      };

      // Create opacity variation effect (ink consistency)
      const opacityEffect = {
        id: `opacity-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: typingDuration,
          mode: 'provider',
          targetIds: [textId],
          ranges: generateOpacityKeyframes(params.opacityMin, params.opacityMax),
        },
      };

      // Create slide-off effect (after typing + pause)
      const slideOffEffect = {
        id: `slide-off-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: typingDuration + params.pauseBetweenWords,
          duration: params.slideDuration,
          mode: 'provider',
          targetIds: [wordId], // Target the container, not the text
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -150, prog: 1, unit: '%' },
          ],
        },
      };

      // Create text atom
      const textAtom = {
        id: textId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'font-mono',
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            willChange: 'transform, opacity',
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
            duration: totalWordDuration,
          },
        },
        effects: [typingRevealEffect, typingBounceEffect, rotationEffect, opacityEffect],
      };

      // Create word container
      const wordContainer = {
        id: wordId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute left-0 top-0',
          },
        },
        context: {
          timing: {
            start: cumulativeTime,
            duration: totalWordDuration,
          },
        },
        effects: [slideOffEffect],
        childrenData: [textAtom],
      };

      wordContainers.push(wordContainer as RenderableComponentData);

      // Update cumulative time (words overlap during slide phase)
      // Next word starts when current word finishes typing + pause (before slide completes)
      cumulativeTime += typingDuration + params.pauseBetweenWords;
    });
  });

  // Calculate total duration (last word's start + its total duration)
  const lastWord = wordContainers[wordContainers.length - 1];
  const totalDuration = lastWord
    ? lastWord.context.timing.start + lastWord.context.timing.duration
    : 10;

  // Create typing zone container (centered)
  const typingZone = {
    id: 'typing-zone',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
        style: {
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordContainers,
  } as RenderableComponentData;

  // Create root container (paper background)
  const rootContainer = {
    id: 'typokinetic-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [typingZone],
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

// --- METADATA ---

const presetMetadata: PresetMetadata = {
  id: 'typokineticTypewriter',
  title: 'Typokinetic Typewriter Animation',
  description:
    'Simulates words being typed on an old typewriter with character-by-character staccato timing, vertical bounce on keystroke, and horizontal slide-off effect. Features authentic typewriter details including rotation variations for imperfect key strikes, random opacity for ink consistency, stuck keys that type slower, and mechanical carriage return rhythm.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'typewriter',
    'kinetic',
    'animation',
    'vintage',
    'retro',
    'mechanical',
    'text',
    'reveal',
    'continuous-feed',
    'keystroke',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello world from the typewriter',
        start: 0,
        absoluteStart: 0,
        end: 5,
        absoluteEnd: 5,
        duration: 5,
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            absoluteStart: 0,
            end: 1,
            absoluteEnd: 1,
            duration: 1,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'world',
            start: 1,
            absoluteStart: 1,
            end: 2,
            absoluteEnd: 2,
            duration: 1,
            confidence: 1,
          },
          {
            id: 'word-3',
            text: 'from',
            start: 2,
            absoluteStart: 2,
            end: 3,
            absoluteEnd: 3,
            duration: 1,
            confidence: 1,
          },
          {
            id: 'word-4',
            text: 'the',
            start: 3,
            absoluteStart: 3,
            end: 4,
            absoluteEnd: 4,
            duration: 1,
            confidence: 1,
          },
          {
            id: 'word-5',
            text: 'typewriter',
            start: 4,
            absoluteStart: 4,
            end: 5,
            absoluteEnd: 5,
            duration: 1,
            confidence: 1,
          },
        ],
      },
    ],
    fontSize: 48,
    font: 'CourierPrime:400',
    textColor: '#1a1a1a',
    backgroundColor: '#f5e6d3',
    baseTypingSpeed: 0.065,
    typingSpeedVariation: 0.015,
    slideDuration: 1,
    pauseBetweenWords: 0.2,
    bounceHeight: 2,
    rotationRange: 0.5,
    opacityMin: 0.85,
    opacityMax: 1,
    stuckKeyProbability: 0.15,
    stuckKeySlowdown: 1.5,
  },
};

// --- EXPORT ---

export const typokineticTypewriterPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
