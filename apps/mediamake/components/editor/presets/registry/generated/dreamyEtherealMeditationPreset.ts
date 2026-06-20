/**
 * Dreamy Ethereal Meditation Preset
 *
 * This preset creates a hypnotic, soothing visual experience perfect for meditation
 * and wellness videos. It features:
 *
 * - Soft-focus background image with gaussian blur and breathing scale animation
 * - Gradually shifting color overlay (blue → purple → pink) with soft-light blend
 * - Floating text layers with wave-like motion (horizontal scroll + sine-wave vertical movement)
 * - Multiple ghost text layers at varying opacity for ethereal ghosting effect
 * - Smooth, organic animations with no harsh movements
 *
 * Use cases:
 * - Meditation and mindfulness videos
 * - Wellness and relaxation content
 * - Spa and therapeutic visuals
 * - Calming social media content
 * - Background visuals for guided meditations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, ImageAtomData } from '@microfox/remotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  backgroundImage: z
    .string()
    .describe('Background image source URL for the dreamy background'),
  text: z
    .string()
    .describe('Text content that floats across the screen like clouds'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the preset in seconds'),
  font: z
    .string()
    .optional()
    .default('Inter:300')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:300", "Roboto:400")',
    ),
  breathingCycleDuration: z
    .number()
    .min(4)
    .max(20)
    .default(8)
    .optional()
    .describe(
      'Duration of one complete breathing cycle (scale animation) in seconds',
    ),
  waveAmplitude: z
    .number()
    .min(10)
    .max(100)
    .default(30)
    .optional()
    .describe('Vertical amplitude of the wave motion in pixels'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration || 10;
  const breathingDuration = params.breathingCycleDuration || 8;
  const waveAmplitude = params.waveAmplitude || 30;

  // Parse font string
  const fontString = params.font || 'Inter:300';
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

  // Helper: Calculate sine wave vertical position based on progress
  const calculateSineWaveRanges = (
    amplitude: number,
    cycles: number,
  ): Array<{ key: string; val: string; prog: number }> => {
    const ranges: Array<{ key: string; val: string; prog: number }> = [];
    const steps = 20; // Number of keyframes for smooth sine wave

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const angle = prog * cycles * 2 * Math.PI;
      const yOffset = Math.sin(angle) * amplitude;
      ranges.push({
        key: 'translateY',
        val: `${yOffset}px`,
        prog: prog,
      });
    }

    return ranges;
  };

  // ============================================================================
  // BACKGROUND IMAGE WITH BREATHING EFFECT
  // ============================================================================

  const backgroundImageEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: breathingDuration,
    mode: 'provider',
    targetIds: ['bg-image'],
    ranges: [
      { key: 'scale', val: 1.25, prog: 0 },
      { key: 'scale', val: 1.35, prog: 0.5 },
      { key: 'scale', val: 1.25, prog: 1 },
    ],
  };

  const backgroundImage: RenderableComponentData = {
    id: 'bg-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: params.backgroundImage,
      className: 'absolute inset-0 object-cover filter blur-xl',
      style: {
        willChange: 'transform',
        transform: 'scale(1.25)',
      },
    } as ImageAtomData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'breathing-effect',
        componentId: 'generic',
        data: {
          ...backgroundImageEffect,
          // Loop the breathing effect
          type: 'ease-in-out',
        },
      },
    ],
  };

  // ============================================================================
  // COLOR OVERLAY WITH GRADIENT SHIFT
  // ============================================================================

  const colorOverlayEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: ['color-overlay'],
    ranges: [
      { key: 'backgroundColor', val: '#3b82f6', prog: 0 }, // Blue
      { key: 'backgroundColor', val: '#9333ea', prog: 0.5 }, // Purple
      { key: 'backgroundColor', val: '#ec4899', prog: 1 }, // Pink
    ],
  };

  const colorOverlay: RenderableComponentData = {
    id: 'color-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'soft-light',
          willChange: 'background-color',
          backgroundColor: '#3b82f6',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'color-shift-effect',
        componentId: 'generic',
        data: colorOverlayEffect,
      },
    ],
    childrenData: [],
  };

  // ============================================================================
  // TEXT LAYERS WITH WAVE MOTION
  // ============================================================================

  const createTextLayer = (
    id: string,
    opacity: number,
    delay: number,
  ): RenderableComponentData => {
    // Wave motion: horizontal scroll + sine wave vertical
    const waveMotionEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [id],
      ranges: [
        // Horizontal movement (right to left)
        { key: 'translateX', val: '100%', prog: 0 },
        { key: 'translateX', val: '-100%', prog: 1 },
        // Sine wave vertical movement (2 complete cycles)
        ...calculateSineWaveRanges(waveAmplitude, 2),
      ],
    };

    return {
      id: id,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: params.text,
        className: 'absolute top-1/2 text-6xl font-light',
        style: {
          color: opacity === 0.8 ? '#ffffff' : 'rgba(255, 255, 255, 1)',
          opacity: opacity,
          willChange: 'transform',
          transform: 'translateX(100%) translateY(-50%)',
          whiteSpace: 'nowrap',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['300'],
        },
      },
      context: {
        timing: {
          start: delay,
          duration: duration - delay,
        },
      },
      effects: [
        {
          id: `wave-motion-${id}`,
          componentId: 'generic',
          data: waveMotionEffect,
        },
      ],
    };
  };

  const textMain = createTextLayer('text-main', 0.8, 0);
  const textGhost1 = createTextLayer('text-ghost1', 0.3, 0.2);
  const textGhost2 = createTextLayer('text-ghost2', 0.15, 0.4);

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'dreamy-ethereal-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      backgroundImage,
      colorOverlay,
      textMain,
      textGhost1,
      textGhost2,
    ] as RenderableComponentData[],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'dreamyEtherealMeditationPreset',
  title: 'Dreamy Ethereal Meditation Preset',
  description:
    'A hypnotic, soothing preset featuring a soft-focus background with breathing scale animation, floating text with wave motion and ghosting effects, and a gradually shifting color overlay through calming hues (blue → purple → pink). Perfect for meditation and wellness videos with organic, flowing movements and no harsh transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'meditation',
    'wellness',
    'dreamy',
    'ethereal',
    'calming',
    'breathing',
    'wave-motion',
    'ghosting',
    'color-flow',
    'organic',
    'floating-text',
    'soft-focus',
    'hypnotic',
  ],
  defaultInputParams: {
    backgroundImage: 'https://example.com/peaceful-nature.jpg',
    text: 'Breathe In... Breathe Out...',
    duration: 10,
    font: 'Inter:300',
    breathingCycleDuration: 8,
    waveAmplitude: 30,
  },
  dependencies: {},
};

// ============================================================================
// EXPORT
// ============================================================================

export const dreamyEtherealMeditationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
