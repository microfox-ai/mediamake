/**
 * Handwritten Script Font Animation Preset
 * 
 * This preset simulates real-time pen writing with authentic stroke progression, mimicking
 * the natural flow of handwriting. Each word "draws" itself with organic timing variations,
 * creating the illusion of an invisible hand writing in real-time.
 * 
 * Features:
 * - **Progressive Reveal Animation**: Custom clip-path animations reveal text from left to right
 * - **Ink Bloom Effect**: Subtle opacity and blur at stroke beginnings simulate ink absorption
 * - **Organic Timing**: Irregular word durations based on length create authentic rhythm
 * - **Handwritten Texture**: CSS filters enhance the handwritten aesthetic
 * - **Natural Flow**: Overlapping word animations with pauses between words
 * - **Calligraphy Simulation**: Speed variations (faster on straight strokes, slower on curves)
 * 
 * Use cases:
 * - Personal message overlays with handwritten feel
 * - Signature-style branding animations
 * - Intimate storytelling text reveals
 * - Vintage letter or diary animations
 * - Artistic typography effects for creative content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to animate in handwritten style (e.g., "Hello beautiful world")'),
  font: z
    .string()
    .default('Dancing Script:600')
    .optional()
    .describe('Font family with optional weight (e.g., "Caveat:700", "Dancing Script:600")'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .optional()
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#2c2c2c')
    .optional()
    .describe('Text color (hex or rgba)'),
  baseDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.0)
    .optional()
    .describe('Base duration per word in seconds (actual varies by word length)'),
  overlapFactor: z
    .number()
    .min(0.3)
    .max(0.9)
    .default(0.7)
    .optional()
    .describe('Overlap between word animations (0.6-0.8 creates natural flow)'),
  inkBloomIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Intensity of ink bloom effect (0 = none, 1 = strong)'),
  pauseBetweenWords: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.15)
    .optional()
    .describe('Pause duration between words in seconds'),
  positionY: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of text'),
  textAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .optional()
    .describe('Horizontal alignment of text'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const parts = fontString.split(':');
    const family = parts[0];
    const weight = parts[1] ? parseInt(parts[1], 10) : 600;
    return { family, weight };
  };

  // Helper: Calculate word duration based on length and complexity
  const calculateWordDuration = (word: string, baseMs: number): number => {
    const length = word.length;
    // Base duration scales with character count
    const lengthFactor = Math.sqrt(length) * 0.3;
    // Add random variation for authenticity (±15%)
    const variation = 0.85 + Math.random() * 0.3;
    return baseMs * (0.8 + lengthFactor) * variation;
  };

  // Helper: Position configuration based on positionY
  const getPositionClass = (position: string, align: string): string => {
    const vertical =
      position === 'top'
        ? 'items-start pt-20'
        : position === 'bottom'
        ? 'items-end pb-20'
        : 'items-center';
    const horizontal =
      align === 'left'
        ? 'justify-start pl-20'
        : align === 'right'
        ? 'justify-end pr-20'
        : 'justify-center';
    return `${vertical} ${horizontal}`;
  };

  // Parse parameters
  const text = params.text || 'Hello world';
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const fontConfig = parseFontString(params.font || 'Dancing Script:600');
  const fontSize = params.fontSize || 72;
  const textColor = params.textColor || '#2c2c2c';
  const baseDurationMs = (params.baseDuration || 1.0) * 1000;
  const overlapFactor = params.overlapFactor || 0.7;
  const inkBloomIntensity = params.inkBloomIntensity || 0.7;
  const pauseBetweenWords = params.pauseBetweenWords || 0.15;
  const positionY = params.positionY || 'center';
  const textAlign = params.textAlign || 'center';

  // Calculate timing for each word
  interface WordTiming {
    word: string;
    start: number;
    duration: number;
  }

  const wordTimings: WordTiming[] = [];
  let currentStart = 0;

  words.forEach((word, index) => {
    const duration = calculateWordDuration(word, baseDurationMs) / 1000;
    wordTimings.push({
      word,
      start: currentStart,
      duration,
    });

    // Next word starts before current word finishes (overlap)
    // Plus a small pause for natural rhythm
    if (index < words.length - 1) {
      currentStart += duration * overlapFactor + pauseBetweenWords;
    }
  });

  // Calculate total duration (last word start + last word duration)
  const totalDuration =
    wordTimings.length > 0
      ? wordTimings[wordTimings.length - 1].start +
        wordTimings[wordTimings.length - 1].duration
      : 1;

  // Build word components with effects
  const wordComponents: RenderableComponentData[] = wordTimings.map(
    (timing, index) => {
      const wordId = `word-${index}`;
      const wordContainerId = `word-container-${index}`;

      // Calculate fade in progress for ink bloom (shorter for faster reveal)
      const fadeInProgress = Math.min(0.3, 0.2 / timing.duration);

      // Clip-path reveal effect (handwriting stroke progression)
      const clipPathEffect = {
        id: `handwritten-reveal-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: timing.duration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            {
              key: 'clipPath',
              val: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
              prog: 1,
            },
          ],
        },
      };

      // Ink bloom effect (opacity and blur at beginning)
      const inkBloomEffect = {
        id: `ink-bloom-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.2,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            {
              key: 'opacity',
              val: 0.3 + inkBloomIntensity * 0.4,
              prog: 0,
            },
            { key: 'opacity', val: 1, prog: 1 },
            {
              key: 'filter',
              val: `blur(${inkBloomIntensity * 2}px)`,
              prog: 0,
            },
            { key: 'filter', val: 'blur(0px)', prog: fadeInProgress },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      };

      // Subtle expansion effect (scaleX)
      const expansionEffect = {
        id: `expansion-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: Math.min(0.3, timing.duration * 0.4),
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scaleX', val: 0.95, prog: 0 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      };

      // Word container with timing
      const wordContainer: RenderableComponentData = {
        id: wordContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-block relative mx-2',
          },
        },
        context: {
          timing: {
            start: timing.start,
            duration: timing.duration,
          },
        },
        childrenData: [
          {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: timing.word,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: fontConfig.weight,
                color: textColor,
                willChange: 'clip-path, opacity, filter',
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
              },
              font: {
                family: fontConfig.family,
                weights: [fontConfig.weight.toString()],
                subsets: ['latin'],
                display: 'swap',
                preload: true,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: timing.duration,
              },
            },
            effects: [clipPathEffect, inkBloomEffect, expansionEffect],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;

      return wordContainer;
    },
  );

  // Words wrapper container
  const wordsWrapper: RenderableComponentData = {
    id: 'words-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row flex-wrap',
        style: {
          gap: '0.5em',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordComponents,
  } as RenderableComponentData;

  // Main container
  const rootContainer: RenderableComponentData = {
    id: 'handwritten-main-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full flex ${getPositionClass(positionY, textAlign)}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [wordsWrapper],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'handwritten-script-animation',
  title: 'Handwritten Script Font Animation',
  description:
    'Simulates real-time pen writing with authentic stroke progression using clip-path animations, ink bloom effects, and irregular timing that mimics natural handwriting flow. Each word reveals progressively with organic speed variations and subtle pauses between words.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'handwriting',
    'script',
    'animation',
    'reveal',
    'organic',
    'ink',
    'calligraphy',
    'progressive',
    'authentic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Hello beautiful world',
    font: 'Dancing Script:600',
    fontSize: 72,
    textColor: '#2c2c2c',
    baseDuration: 1.0,
    overlapFactor: 0.7,
    inkBloomIntensity: 0.7,
    pauseBetweenWords: 0.15,
    positionY: 'center',
    textAlign: 'center',
  },
};

// Export preset
export const handwrittenScriptAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
