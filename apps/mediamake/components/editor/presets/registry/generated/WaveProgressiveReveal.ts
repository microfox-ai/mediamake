/**
 * Wave-Like Progressive Reveal Preset
 *
 * This preset creates a wave-like progressive reveal where lines fade in with subtle
 * oscillating motion, as if floating on water. Each line animates through a sine-wave
 * pattern with vertical movement and rotation, creating an organic, flowing appearance
 * perfect for calm, meditative content.
 *
 * Features:
 * - **Wave Motion**: Sine-wave pattern with translateY oscillation (15px → -5px → 5px → 0px)
 * - **Subtle Rotation**: Synchronized rotation (-1deg to 1deg) for natural sway
 * - **Progressive Amplitude**: Wave amplitude decreases with each line (15px, 10px, 5px)
 * - **Breathing Effect**: Subtle scale oscillation (0.98 to 1.02) for organic motion
 * - **Staggered Timing**: Lines start at 0s, 0.4s, 0.8s with overlapping animations
 * - **Spring Easing**: Organic motion with spring physics
 *
 * Use cases:
 * - Calm, meditative content introductions
 * - Poetic or contemplative text reveals
 * - Spa, wellness, or relaxation videos
 * - Nature-themed content with flowing aesthetics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
} from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  lines: z
    .array(z.string())
    .min(1)
    .max(5)
    .default([
      'First line floats gently',
      'Second line follows smoothly',
      'Third line settles calmly',
    ])
    .describe('Array of text lines to display (1-5 lines)'),
  fontSize: z
    .number()
    .min(24)
    .max(80)
    .default(48)
    .optional()
    .describe('Font size in pixels (default: 48)'),
  textColor: z
    .string()
    .default('#1e3a8a')
    .optional()
    .describe('Text color (default: #1e3a8a - blue-900)'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family (default: Inter)'),
  fontWeight: z
    .enum(['light', 'normal', 'medium', 'semibold', 'bold'])
    .default('light')
    .optional()
    .describe('Font weight (default: light)'),
  bgGradient: z
    .object({
      from: z.string().default('rgb(239, 246, 255)'),
      to: z.string().default('rgb(219, 234, 254)'),
    })
    .default({
      from: 'rgb(239, 246, 255)',
      to: 'rgb(219, 234, 254)',
    })
    .optional()
    .describe('Background gradient colors (from blue-50 to blue-100)'),
  animationDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .optional()
    .describe('Duration of each line animation in seconds (default: 2.5)'),
  staggerDelay: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.4)
    .optional()
    .describe('Time delay between line animations in seconds (default: 0.4)'),
  waveAmplitudes: z
    .array(z.number())
    .min(1)
    .max(5)
    .default([15, 10, 5])
    .optional()
    .describe(
      'Wave amplitude for each line in pixels (default: [15, 10, 5])',
    ),
  enableBreathing: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable subtle scale oscillation (breathing effect)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    lines,
    fontSize = 48,
    textColor = '#1e3a8a',
    fontFamily = 'Inter',
    fontWeight = 'light',
    bgGradient = { from: 'rgb(239, 246, 255)', to: 'rgb(219, 234, 254)' },
    animationDuration = 2.5,
    staggerDelay = 0.4,
    waveAmplitudes = [15, 10, 5],
    enableBreathing = true,
  } = params;

  // Helper: Convert font weight string to numeric value
  const getFontWeightValue = (
    weight: 'light' | 'normal' | 'medium' | 'semibold' | 'bold',
  ): number => {
    const weights = {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    };
    return weights[weight];
  };

  // Calculate total duration needed (last line start + animation duration)
  const totalDuration =
    lines.length * staggerDelay - staggerDelay + animationDuration;

  // Create line components with wave effects
  const lineComponents: RenderableComponentData[] = lines.map(
    (lineText, index) => {
      const lineId = `wave-line-${index}`;
      const startTime = index * staggerDelay;

      // Get wave amplitude for this line (with fallback)
      const amplitude =
        waveAmplitudes[index] !== undefined
          ? waveAmplitudes[index]
          : waveAmplitudes[waveAmplitudes.length - 1] || 5;

      // Calculate proportional values based on amplitude
      const peakUp = -amplitude / 3; // Moves up to 1/3 of amplitude
      const peakDown = amplitude / 3; // Moves down to 1/3 of amplitude
      const rotationRange = amplitude / 15; // Rotation proportional to amplitude

      // Create wave effect with keyframes
      const waveEffect: GenericEffectData = {
        type: 'spring',
        start: startTime,
        duration: animationDuration,
        mode: 'provider',
        targetIds: [lineId],
        ranges: [
          // Opacity fade-in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.5, prog: 0.25 },
          { key: 'opacity', val: 0.9, prog: 0.75 },
          { key: 'opacity', val: 1, prog: 1 },
          // TranslateY wave motion
          { key: 'translateY', val: amplitude, prog: 0 },
          { key: 'translateY', val: peakUp, prog: 0.25 },
          { key: 'translateY', val: peakDown, prog: 0.75 },
          { key: 'translateY', val: 0, prog: 1 },
          // Rotation sway
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: -rotationRange, prog: 0.25 },
          { key: 'rotate', val: rotationRange, prog: 0.75 },
          { key: 'rotate', val: 0, prog: 1 },
          // Scale breathing effect (if enabled)
          ...(enableBreathing
            ? [
                { key: 'scale', val: 0.98, prog: 0 },
                { key: 'scale', val: 1.01, prog: 0.25 },
                { key: 'scale', val: 1.02, prog: 0.75 },
                { key: 'scale', val: 1, prog: 1 },
              ]
            : [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ]),
        ],
      };

      return {
        id: lineId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: lineText,
          className: 'text-center',
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: getFontWeightValue(fontWeight),
          },
          font: {
            family: fontFamily,
            weights: [getFontWeightValue(fontWeight).toString()],
          },
        },
        context: {
          timing: {
            start: 0, // All lines start at container start
            duration: totalDuration, // All lines last for full duration
          },
        },
        effects: [
          {
            id: `wave-effect-${index}`,
            componentId: 'generic',
            data: waveEffect,
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Root container with gradient background
  const rootContainer: RenderableComponentData = {
    id: 'wave-progressive-reveal-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'min-h-screen flex flex-col items-center justify-center',
        style: {
          background: `linear-gradient(to bottom, ${bgGradient.from}, ${bgGradient.to})`,
          gap: '1rem', // space-y-4 equivalent
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: lineComponents,
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
  id: 'waveProgressiveReveal',
  title: 'Wave-Like Progressive Reveal',
  description:
    'Wave-like progressive reveal where lines fade in with subtle oscillating motion, as if floating on water. Features sine-wave pattern with vertical movement, rotation, and optional scale breathing for organic, flowing appearance perfect for calm, meditative content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'wave',
    'progressive',
    'reveal',
    'floating',
    'organic',
    'meditation',
    'calm',
    'spring',
    'breathing',
  ],
  dependencies: {},
  defaultInputParams: {
    lines: [
      'First line floats gently',
      'Second line follows smoothly',
      'Third line settles calmly',
    ],
    fontSize: 48,
    textColor: '#1e3a8a',
    fontFamily: 'Inter',
    fontWeight: 'light',
    bgGradient: {
      from: 'rgb(239, 246, 255)',
      to: 'rgb(219, 234, 254)',
    },
    animationDuration: 2.5,
    staggerDelay: 0.4,
    waveAmplitudes: [15, 10, 5],
    enableBreathing: true,
  },
};

// Export preset
export const waveProgressiveRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
