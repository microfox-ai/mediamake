/**
 * Typewriter Character Reveal Preset
 *
 * A mechanical typewriter-inspired character reveal preset featuring instant character appearance
 * with rhythmic typing delays, clip-path reveal animation from left to right, shake impact effect
 * on each character, color desaturation-to-saturation shift, and a blinking cursor that follows
 * typing position. Timing varies randomly (80-120ms per character) for human-like typing rhythm.
 *
 * Features:
 * - **Typewriter Rhythm**: Characters appear with random delays (80-120ms) for human-like typing
 * - **Clip-Path Reveal**: Each character is revealed from left to right using clip-path animation
 * - **Impact Shake**: Subtle shake effect on character appearance (like typewriter key impact)
 * - **Color Shift**: Characters transition from slightly desaturated (0.7 brightness) to full color
 * - **Blinking Cursor**: Animated cursor that follows the typing position with classic blink effect
 * - **Monospace Font**: Uses monospace font family for authentic typewriter aesthetic
 *
 * Use cases:
 * - Retro/vintage typing effects
 * - Mechanical text reveals
 * - Tech-themed title sequences
 * - Terminal-style text animations
 * - Nostalgic typewriter aesthetics
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  RenderableComponentData,
  TextAtomData,
  GenericEffectData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to reveal with typewriter effect'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (hex or CSS color)'),
  font: z
    .string()
    .default('Courier New')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Courier New", "Roboto Mono:600")',
    ),
  backgroundColor: z
    .string()
    .optional()
    .describe('Optional background color for text container'),
  cursorColor: z
    .string()
    .optional()
    .describe('Cursor color (defaults to textColor if not provided)'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Intensity of typewriter shake effect (0-10 pixels)'),
  startDelay: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Delay before typing starts (in seconds)'),
  duration: z
    .number()
    .min(0)
    .optional()
    .describe(
      'Total duration in seconds (auto-calculated if not provided: charCount * 0.1 + 0.5)',
    ),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Courier New';
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

  const text = params.text || 'Hello World';
  const characters = text.split('');
  const fontSize = params.fontSize ?? 48;
  const textColor = params.textColor ?? '#FFFFFF';
  const cursorColor = params.cursorColor ?? textColor;
  const shakeIntensity = params.shakeIntensity ?? 2;
  const startDelay = params.startDelay ?? 0;

  // Calculate random delays for each character (80-120ms)
  const generateRandomDelay = () => Math.random() * 0.04 + 0.08;
  const characterDelays = characters.map(() => generateRandomDelay());

  // Calculate cumulative start times
  const characterStartTimes = characterDelays.reduce(
    (acc, delay) => {
      const lastStart = acc[acc.length - 1] || 0;
      acc.push(lastStart + delay);
      return acc;
    },
    [0] as number[],
  );

  // Calculate total duration
  const typingDuration =
    characterStartTimes[characterStartTimes.length - 1] +
    characterDelays[characterDelays.length - 1];
  const totalDuration =
    params.duration ?? typingDuration + 0.5 + startDelay;

  // Create character components with effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `typewriter-char-${index}`;
      const wrapperId = `typewriter-wrapper-${index}`;
      const charStartTime = characterStartTimes[index] + startDelay;
      const charRevealDuration = 0.1;

      // Clip-path reveal effect
      const clipRevealEffect = {
        id: `clip-reveal-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: charStartTime,
          duration: charRevealDuration,
          mode: 'provider',
          targetIds: [wrapperId],
          ranges: [
            { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
            { key: 'clipPath', val: 'inset(0 0 0 0)', prog: 1 },
          ],
        } as GenericEffectData,
      };

      // Shake effect (typewriter impact)
      const shakeEffect = {
        id: `shake-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: charStartTime,
          duration: 0.1,
          mode: 'provider',
          targetIds: [charId],
          ranges: [
            { key: 'translateX', val: -shakeIntensity, prog: 0 },
            { key: 'translateX', val: shakeIntensity, prog: 0.25 },
            { key: 'translateX', val: -shakeIntensity / 2, prog: 0.5 },
            { key: 'translateX', val: shakeIntensity / 2, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      };

      // Color shift effect (brightness 0.7 to 1)
      const colorShiftEffect = {
        id: `color-shift-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: charStartTime,
          duration: 0.15,
          mode: 'provider',
          targetIds: [charId],
          ranges: [
            { key: 'brightness', val: 0.7, prog: 0 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      };

      // Character wrapper with overflow hidden
      const characterWrapper: RenderableComponentData = {
        id: wrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative overflow-hidden inline-block',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [clipRevealEffect],
        childrenData: [
          {
            id: charId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: char,
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
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
            effects: [shakeEffect, colorShiftEffect],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;

      return characterWrapper;
    },
  );

  // Cursor element (blinking cursor that follows typing)
  const cursorId = 'typewriter-cursor';
  const cursorElement: RenderableComponentData = {
    id: cursorId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 2px; height: ${fontSize * 0.8}px; background-color: ${cursorColor};"></div>`,
      className: 'inline-block',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Cursor blink effect (530ms period)
      {
        id: 'cursor-blink',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: [cursorId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            {
              key: 'opacity',
              val: 1,
              prog: 0.47 * (0.53 / totalDuration),
            },
            {
              key: 'opacity',
              val: 0,
              prog: 0.5 * (0.53 / totalDuration),
            },
            {
              key: 'opacity',
              val: 0,
              prog: 0.97 * (0.53 / totalDuration),
            },
            {
              key: 'opacity',
              val: 1,
              prog: Math.min(1, 1.0 * (0.53 / totalDuration)),
            },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 0.501 },
            { key: 'opacity', val: 0, prog: 0.999 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Cursor position effect (moves with typing)
      {
        id: 'cursor-position',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: [cursorId],
          ranges: characterStartTimes.map((startTime, index) => {
            const progress = (startTime + startDelay) / totalDuration;
            const translateX = index * fontSize * 0.6; // Approximate character width
            return { key: 'translateX', val: translateX, prog: progress };
          }),
        } as GenericEffectData,
      },
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-wrap font-mono items-center justify-center',
        style: {
          gap: '0px',
          ...(params.backgroundColor
            ? { backgroundColor: params.backgroundColor }
            : {}),
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [...characterComponents, cursorElement],
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
  id: 'typewriter-character-reveal',
  title: 'Typewriter Character Reveal',
  description:
    'A mechanical typewriter-inspired character reveal preset featuring instant character appearance with rhythmic typing delays, clip-path reveal animation from left to right, shake impact effect on each character, color desaturation-to-saturation shift, and a blinking cursor that follows typing position. Timing varies randomly (80-120ms per character) for human-like typing rhythm.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typewriter',
    'text',
    'reveal',
    'typing',
    'character',
    'mechanical',
    'vintage',
    'retro',
    'cursor',
    'monospace',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Hello World',
    fontSize: 48,
    textColor: '#FFFFFF',
    font: 'Courier New',
    shakeIntensity: 2,
    startDelay: 0,
  },
};

// Export preset
export const typewriterCharacterRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
