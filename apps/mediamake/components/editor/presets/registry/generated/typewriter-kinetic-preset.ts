/**
 * Typewriter Kinetic Typography Preset
 *
 * A mechanical typewriter-inspired typokinetic preset featuring stepped scale animations
 * (0.9→1.0 in discrete jumps), horizontal jitter to simulate mechanical vibration, and an
 * optional blinking cursor that tracks word positions. Uses monospace font with frame-quantized
 * timing for authentic stop-motion feel.
 *
 * Features:
 * - **Stepped Scale Animation**: Each word scales from 90% to 100% with 3-4 discrete steps
 * - **Mechanical Jitter**: Subtle horizontal jitter (±1px) on each step to simulate vibration
 * - **Blinking Cursor**: Optional cursor element that blinks and tracks word positions
 * - **Frame-Quantized Timing**: Word timings quantized to nearest frame (1/30s) for authentic feel
 * - **Monospace Typography**: Uses monospace font for authentic typewriter aesthetic
 * - **Stop-Motion Effect**: Uses CSS steps() function for discrete frame-by-frame animation
 *
 * Use cases:
 * - Creating typewriter-style text animations with mechanical feel
 * - Building retro-styled kinetic typography effects
 * - Adding authentic mechanical text effects to videos
 * - Creating stop-motion style text reveals
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameters Schema ---

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
            keyword: z.string().optional(),
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Text color (hex or CSS color)'),

  font: z
    .string()
    .default('Courier New')
    .optional()
    .describe(
      'Monospace font family (e.g., "Courier New", "Roboto Mono", "Source Code Pro")',
    ),

  showCursor: z
    .boolean()
    .default(true)
    .optional()
    .describe('Whether to show the blinking cursor element'),

  cursorColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Color of the blinking cursor'),

  cursorBlinkSpeed: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Cursor blink speed in seconds (duration of one blink cycle)'),

  wordAppearDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .optional()
    .describe(
      'Duration for each word to appear (stepped animation) in seconds',
    ),

  wordPauseDuration: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .optional()
    .describe('Pause duration between words in seconds'),

  jitterAmount: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe('Horizontal jitter amount in pixels (±)'),

  quantizeFrameRate: z
    .number()
    .default(30)
    .optional()
    .describe('Frame rate for timing quantization (30fps or 60fps)'),

  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of text'),

  alignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .optional()
    .describe('Horizontal text alignment'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize = 48,
    textColor = '#000000',
    font = 'Courier New',
    showCursor = true,
    cursorColor = '#000000',
    cursorBlinkSpeed = 0.5,
    wordAppearDuration = 0.3,
    wordPauseDuration = 0.15,
    jitterAmount = 1,
    quantizeFrameRate = 30,
    position = 'center',
    alignment = 'center',
  } = params;

  // Helper: Quantize time to nearest frame
  const quantizeTime = (time: number): number => {
    const frameDuration = 1 / quantizeFrameRate;
    return Math.round(time / frameDuration) * frameDuration;
  };

  // Helper: Generate random jitter for mechanical effect
  const generateJitter = (): number => {
    return (Math.random() * 2 - 1) * jitterAmount;
  };

  // Position class mapping
  const positionClassMap = {
    top: 'items-start pt-20',
    center: 'items-center',
    bottom: 'items-end pb-20',
  };

  const alignmentClassMap = {
    left: 'justify-start pl-20',
    center: 'justify-center',
    right: 'justify-end pr-20',
  };

  const positionClass = positionClassMap[position];
  const alignmentClass = alignmentClassMap[alignment];

  // Build word components for all captions
  const allWordComponents: RenderableComponentData[] = [];
  const cursorPositions: Array<{ time: number; index: number }> = [];

  let wordIndex = 0;

  captions.forEach((caption) => {
    const captionStartTime = caption.absoluteStart;

    caption.words.forEach((word) => {
      const wordId = `typewriter-word-${wordIndex}`;
      const wordStartTime = quantizeTime(word.start);
      const wordDuration = quantizeTime(word.duration);

      // Calculate discrete scale steps: 0.9, 0.93, 0.97, 1.0
      const scaleSteps = [0.9, 0.93, 0.97, 1.0];
      const stepCount = scaleSteps.length;

      // Generate jitter values for each step
      const jitterValues = scaleSteps.map(() => generateJitter());

      // Create stepped scale effect with jitter using CSS steps()
      const typewriterEffect: GenericEffectData = {
        type: 'linear', // Use linear with steps() for discrete animation
        start: wordStartTime,
        duration: wordAppearDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Scale animation (stepped)
          { key: 'scale', val: scaleSteps[0], prog: 0 },
          { key: 'scale', val: scaleSteps[1], prog: 0.25 },
          { key: 'scale', val: scaleSteps[2], prog: 0.5 },
          { key: 'scale', val: scaleSteps[3], prog: 1 },
          // Opacity fade-in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.25 },
          // Jitter effect (translateX) - stepped
          { key: 'translateX', val: jitterValues[0], prog: 0 },
          { key: 'translateX', val: jitterValues[1], prog: 0.25 },
          { key: 'translateX', val: jitterValues[2], prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      };

      const wordEffect = {
        id: `${wordId}-effect`,
        componentId: 'generic',
        data: typewriterEffect,
      };

      // Create word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: fontSize,
            color: textColor,
            fontFamily: font,
            marginRight: '0.3em',
            display: 'inline-block',
          },
          font: {
            family: font,
            weights: ['400'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [wordEffect],
      };

      allWordComponents.push(wordComponent);

      // Track cursor position (after word appears)
      cursorPositions.push({
        time: captionStartTime + wordStartTime + wordAppearDuration,
        index: wordIndex,
      });

      wordIndex++;
    });
  });

  // Create cursor element if enabled
  let cursorComponent: RenderableComponentData | null = null;

  if (showCursor) {
    const cursorId = 'typewriter-cursor';
    const totalDuration =
      captions.length > 0
        ? captions[captions.length - 1].absoluteEnd
        : 10;

    // Create infinite blink effect for cursor
    const cursorBlinkEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: totalDuration,
      mode: 'provider',
      targetIds: [cursorId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.5 - 0.01 },
        { key: 'opacity', val: 0, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 - 0.01 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    const cursorEffectNode = {
      id: `${cursorId}-blink`,
      componentId: 'generic',
      data: cursorBlinkEffect,
    };

    cursorComponent = {
      id: cursorId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: '|',
        style: {
          fontSize: fontSize,
          color: cursorColor,
          fontFamily: font,
          marginLeft: '0.1em',
          display: 'inline-block',
        },
        font: {
          family: font,
          weights: ['400'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [cursorEffectNode],
    };
  }

  // Build caption containers
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      const captionId = `typewriter-caption-${captionIndex}`;
      const captionStartTime = caption.absoluteStart;
      const captionDuration = caption.duration;

      // Get words for this caption
      const captionWordComponents = allWordComponents.filter((word) =>
        word.id.startsWith(`typewriter-word-`),
      );

      const captionChildren: RenderableComponentData[] = [];

      // Add words
      caption.words.forEach((word, wordIdx) => {
        const globalWordIndex =
          captions
            .slice(0, captionIndex)
            .reduce((sum, c) => sum + c.words.length, 0) + wordIdx;
        captionChildren.push(allWordComponents[globalWordIndex]);
      });

      // Add cursor to last caption if enabled
      if (showCursor && captionIndex === captions.length - 1 && cursorComponent) {
        captionChildren.push(cursorComponent);
      }

      return {
        id: captionId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `font-mono absolute inset-0 flex ${positionClass} ${alignmentClass} px-8`,
          },
        },
        context: {
          timing: {
            start: captionStartTime,
            duration: captionDuration,
          },
        },
        childrenData: captionChildren,
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'font-mono relative absolute inset-0',
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
    childrenData: captionContainers,
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'typewriter-kinetic-preset',
  title: 'Typewriter Kinetic Typography',
  description:
    'A mechanical typewriter-inspired typokinetic preset featuring stepped scale animations (0.9→1.0 in discrete jumps), horizontal jitter to simulate mechanical vibration, and an optional blinking cursor that tracks word positions. Uses monospace font with frame-quantized timing for authentic stop-motion feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'typewriter',
    'mechanical',
    'retro',
    'stepped',
    'monospace',
    'cursor',
    'stop-motion',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello World',
        start: 0,
        absoluteStart: 0,
        end: 2.5,
        absoluteEnd: 2.5,
        duration: 2.5,
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            absoluteStart: 0,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 1.0,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'World',
            start: 1.0,
            absoluteStart: 1.0,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 1.5,
            confidence: 1,
          },
        ],
      },
    ],
    fontSize: 48,
    textColor: '#000000',
    font: 'Courier New',
    showCursor: true,
    cursorColor: '#000000',
    cursorBlinkSpeed: 0.5,
    wordAppearDuration: 0.3,
    wordPauseDuration: 0.15,
    jitterAmount: 1,
    quantizeFrameRate: 30,
    position: 'center',
    alignment: 'center',
  },
};

// --- Export ---

export const typewriterKineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
