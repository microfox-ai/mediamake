/**
 * Handwriting Simulation Preset
 *
 * Creates an animated text reveal effect that simulates realistic handwriting.
 * Each character appears as if being drawn by an invisible pen, with natural
 * stroke-like drawing motions, pressure variations (opacity/thickness changes),
 * and subtle hand shake for authenticity.
 *
 * Features:
 * - Character-by-character sequential reveal with natural stroke order
 * - Variable timing based on character complexity (simple: 150ms, complex: 250ms)
 * - Pen-down drawing motion simulation (vertical slide + opacity reveal)
 * - Pressure variations via scaleX (0.95 to 1.05 for stroke width simulation)
 * - Subtle hand shake (1-2px random movement) for authenticity
 * - Natural rotation variation (-1 to 1 deg) during drawing
 * - Uses handwriting-style fonts (Caveat, Dancing Script, etc.)
 *
 * Use cases:
 * - Handwritten title animations
 * - Signature-style text reveals
 * - Personal, authentic text presentations
 * - Educational content with handwritten feel
 * - Social media content with human touch
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z.string().describe('Text content to display with handwriting effect'),
  
  font: z
    .object({
      family: z
        .string()
        .default('Caveat')
        .describe('Handwriting font family (e.g., Caveat, Dancing Script, Indie Flower)'),
      weights: z
        .array(z.string())
        .default(['400', '700'])
        .optional()
        .describe('Font weights to load'),
      display: z
        .enum(['auto', 'block', 'swap', 'fallback', 'optional'])
        .default('swap')
        .optional()
        .describe('Font display strategy'),
    })
    .default({ family: 'Caveat', weights: ['400', '700'], display: 'swap' })
    .optional()
    .describe('Font configuration for handwriting style'),
  
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
    .describe('Text color (hex, rgb, or CSS color)'),
  
  startDelay: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Delay before handwriting starts (in seconds)'),
  
  bufferTime: z
    .number()
    .min(0)
    .max(2)
    .default(0.2)
    .optional()
    .describe('Buffer time after all characters finish (in seconds)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Character complexity map (in milliseconds)
  const getCharacterDuration = (char: string): number => {
    const simple = [
      'i',
      'l',
      'I',
      '.',
      ',',
      "'",
      '"',
      '!',
      '|',
      '1',
      ' ',
    ];
    const complex = [
      'w',
      'W',
      'm',
      'M',
      'g',
      'G',
      'q',
      'Q',
      '@',
      '#',
      '&',
      '%',
    ];
    
    if (simple.includes(char)) return 150; // Fast
    if (complex.includes(char)) return 250; // Slow
    return 180; // Medium (default)
  };

  // Helper: Generate random value within range
  const random = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Extract parameters
  const text = params.text;
  const fontSize = params.fontSize ?? 48;
  const textColor = params.textColor ?? '#000000';
  const startDelay = params.startDelay ?? 0;
  const bufferTime = params.bufferTime ?? 0.2;
  const font = params.font ?? {
    family: 'Caveat',
    weights: ['400', '700'],
    display: 'swap',
  };

  // Split text into individual characters
  const characters = text.split('');

  // Calculate timing for each character
  let cumulativeTime = 0;
  const charTimings = characters.map((char) => {
    const duration = getCharacterDuration(char) / 1000; // Convert ms to seconds
    const startTime = cumulativeTime;
    cumulativeTime += duration;
    return { char, startTime, duration };
  });

  // Total duration = sum of all character durations + buffer
  const totalDuration = cumulativeTime + bufferTime;

  // Build character components with effects
  const characterComponents: RenderableComponentData[] = charTimings.map(
    (timing, index) => {
      const charId = `char-${index}`;
      const char = timing.char;

      // Pre-calculate random values for shake effect
      const shakeX1 = random(-1, 1);
      const shakeX2 = random(-1, 1);
      const shakeX3 = random(-1, 1);
      const shakeY1 = random(-1, 1);
      const shakeY2 = random(-1, 1);
      const shakeY3 = random(-1, 1);
      const rotate1 = random(-1, 1);
      const rotate2 = random(-1, 1);

      // Reveal effect: opacity + vertical slide + scale variation
      const revealEffect = {
        id: `reveal-${charId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: timing.duration,
          mode: 'provider',
          targetIds: [charId],
          ranges: [
            // Opacity fade-in (pen pressure simulation)
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 1, prog: 1 },
            // Vertical slide (pen-down motion)
            { key: 'translateY', val: 3, prog: 0 },
            { key: 'translateY', val: 0, prog: 0.6 },
            // Stroke width variation (pressure simulation via scaleX)
            { key: 'scaleX', val: 0.95, prog: 0 },
            { key: 'scaleX', val: 1.05, prog: 0.4 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      };

      // Shake effect: random micro-movements for authenticity
      const shakeEffect = {
        id: `shake-${charId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: timing.duration,
          mode: 'provider',
          targetIds: [charId],
          ranges: [
            // X-axis shake (hand movement)
            { key: 'translateX', val: shakeX1, prog: 0 },
            { key: 'translateX', val: shakeX2, prog: 0.33 },
            { key: 'translateX', val: shakeX3, prog: 0.66 },
            { key: 'translateX', val: 0, prog: 1 },
            // Y-axis shake (additional movement)
            { key: 'translateY', val: shakeY1, prog: 0 },
            { key: 'translateY', val: shakeY2, prog: 0.33 },
            { key: 'translateY', val: shakeY3, prog: 0.66 },
            { key: 'translateY', val: 0, prog: 1 },
            // Rotation variation (natural hand tilt)
            { key: 'rotate', val: rotate1, prog: 0 },
            { key: 'rotate', val: rotate2, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      };

      // Character container layout
      return {
        id: `char-container-${index}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-block',
            style: {
              // Preserve whitespace for spaces
              whiteSpace: char === ' ' ? 'pre' : 'normal',
            },
          },
        },
        context: {
          timing: {
            start: timing.startTime,
            duration: timing.duration,
          },
        },
        childrenData: [
          {
            id: charId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: char,
              font: {
                family: font.family,
                weights: font.weights,
                display: font.display,
              },
              style: {
                fontSize: fontSize,
                color: textColor,
                lineHeight: '1',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: timing.duration,
              },
            },
            effects: [revealEffect, shakeEffect],
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'handwriting-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          padding: '40px',
        },
      },
    },
    context: {
      timing: {
        start: startDelay,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'handwriting-text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-flex items-baseline',
            style: {
              gap: '2px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: characterComponents,
      } as RenderableComponentData,
    ],
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
  id: 'handwriting-typewriter-reveal',
  title: 'Handwriting-Style Typewriter Reveal',
  description:
    'A sequential typewriter text reveal effect with natural handwriting timing variations, subtle character movement (hand shake), and pressure variations. Characters appear with natural drawing motion simulation using opacity and position animations. Includes variable timing based on character complexity (simple letters appear faster, complex letters slower) and micro-movements for authenticity. Uses handwriting-style fonts for enhanced visual effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'handwriting',
    'typewriter',
    'reveal',
    'animation',
    'kinetic',
    'authentic',
    'natural',
    'sequential',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Hello World',
    font: {
      family: 'Caveat',
      weights: ['400', '700'],
      display: 'swap',
    },
    fontSize: 48,
    textColor: '#000000',
    startDelay: 0,
    bufferTime: 0.2,
  },
};

// --- Export ---

export const handwritingTypewriterRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
