/**
 * Jello Typography Elastic Physics Preset
 *
 * This preset creates a playful, organic typography effect where text words bounce
 * and oscillate like jello when they appear. Each word experiences elastic physics
 * with vertical and horizontal scale oscillations that maintain volume consistency,
 * plus subtle rotation for added personality.
 *
 * Features:
 * - **Elastic Jello Physics**: Words stretch vertically and compress horizontally
 *   in a coordinated oscillation that simulates dropped jello bouncing
 * - **Volume-Consistent Scaling**: scaleY and scaleX inversely compensate to
 *   maintain apparent volume throughout the animation
 * - **Overshoot Animation**: Multiple oscillation phases with decreasing amplitude
 *   (1.3 → 0.9 → 1.05 → 1.0) create natural settling behavior
 * - **Synchronized Rotation**: Subtle rotation oscillation (-2deg to 2deg) adds
 *   personality and mimics real-world physics
 * - **Staggered Entry**: Words appear with slight delay for cascading bounce effect
 * - **Spring Easing**: Natural physics-based easing for organic motion
 * - **GPU Acceleration**: Uses will-change: transform for optimal performance
 *
 * Use cases:
 * - Playful title cards and headlines
 * - Fun product announcements
 * - Children's content and educational videos
 * - Social media posts with personality
 * - Brand videos with lighthearted tone
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display with jello effect (will be split into words)'),
  duration: z
    .number()
    .default(2)
    .describe('Total duration of the effect in seconds'),
  fontSize: z
    .number()
    .default(64)
    .describe('Font size in pixels for the text'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color as hex or CSS color'),
  gap: z
    .number()
    .default(20)
    .describe('Gap between words in pixels'),
  jelloDuration: z
    .number()
    .min(0.8)
    .max(2.0)
    .default(1.0)
    .describe('Duration of the jello oscillation effect per word (0.8-2.0s)'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Delay between each word animation start (0-0.5s)'),
  fadeInDuration: z
    .number()
    .min(0.1)
    .max(1.0)
    .default(0.3)
    .describe('Fade-in duration for each word (0.1-1.0s)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Split text into words
  const words = params.text.trim().split(/\s+/);

  // Calculate total duration needed
  const totalDuration =
    params.duration ||
    params.jelloDuration + params.staggerDelay * (words.length - 1) + 0.5;

  // Create word components with jello effects
  const wordComponents = words.map((word, index) => {
    const wordId = `jello-word-${index}`;
    const staggerStart = index * params.staggerDelay;

    // Jello physics effect with spring easing
    const jelloEffect = {
      id: `jello-effect-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: staggerStart,
        duration: params.jelloDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Phase 1: Initial stretch (0-15%)
          { key: 'scaleY', val: 0.7, prog: 0 },
          { key: 'scaleX', val: 1.3, prog: 0 },
          { key: 'rotate', val: 0, prog: 0 },
          // Phase 2: Overshoot stretch (15%)
          { key: 'scaleY', val: 1.3, prog: 0.15 },
          { key: 'scaleX', val: 0.8, prog: 0.15 },
          { key: 'rotate', val: -2, prog: 0.25 },
          // Phase 3: Compress (30%)
          { key: 'scaleY', val: 0.9, prog: 0.3 },
          { key: 'scaleX', val: 1.1, prog: 0.3 },
          // Phase 4: Small overshoot (45%)
          { key: 'scaleY', val: 1.05, prog: 0.45 },
          { key: 'scaleX', val: 0.95, prog: 0.45 },
          { key: 'rotate', val: 2, prog: 0.5 },
          // Phase 5: Settle to rest (60-100%)
          { key: 'scaleY', val: 1, prog: 0.6 },
          { key: 'scaleX', val: 1, prog: 0.6 },
          { key: 'rotate', val: -1, prog: 0.75 },
          { key: 'rotate', val: 0, prog: 1 },
        ],
      },
    };

    // Fade-in effect
    const fadeEffect = {
      id: `fade-effect-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: staggerStart,
        duration: params.fadeInDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };

    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: params.fontSize,
          fontWeight: params.fontWeight,
          color: params.textColor,
          transformOrigin: 'center bottom',
          willChange: 'transform',
        },
        font: {
          family: params.fontFamily,
          weights: [params.fontWeight],
          display: 'swap',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [jelloEffect, fadeEffect],
    };
  });

  // Root container with flex layout
  const rootContainer = {
    id: 'jello-typography-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          gap: `${params.gap}px`,
          transformOrigin: 'center bottom',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordComponents as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'jello-typography-physics',
  title: 'Jello Typography Elastic Physics',
  description:
    'Typography preset with elastic jello-like physics simulation. Text stretches, compresses, and oscillates with decreasing amplitude when appearing, mimicking dropped jello with organic bounce. Features synchronized scale and rotation oscillations with spring physics for playful, personality-rich text animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'jello',
    'elastic',
    'physics',
    'bounce',
    'playful',
    'organic',
    'spring',
    'oscillation',
    'wiggle',
  ],
  defaultInputParams: {
    text: 'Jello Text Effect',
    duration: 2,
    fontSize: 64,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#ffffff',
    gap: 20,
    jelloDuration: 1.0,
    staggerDelay: 0.1,
    fadeInDuration: 0.3,
  },
  dependencies: {},
};

export const jelloTypographyPhysicsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
