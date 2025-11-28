/**
 * Liquid Morphing Venetian Blinds Transition
 *
 * A fluid venetian blinds transition with liquid mercury-like morphing effects.
 * Each blind uses SVG clip-path animations that morph from rectangles to wave shapes
 * while sliding away, with metallic shimmer gradients and animated blur for depth of field.
 * Features staggered timing for organic sequential reveal.
 *
 * Technical Features:
 * - 10 vertical fluid blinds with clip-path morphing
 * - Wave shape animation using 8-point polygon coordinates
 * - Metallic gradient background with shimmer effect
 * - Animated blur filter for depth of field
 * - Subtle rotation for natural movement
 * - Staggered timing for organic feel
 *
 * Use Cases:
 * - Modern commercial transitions
 * - High-end brand reveal effects
 * - Premium video transitions
 * - Cinematic scene changes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.9)
    .describe('Duration of the entire transition in seconds'),
  blindCount: z
    .number()
    .min(5)
    .max(15)
    .default(10)
    .describe('Number of vertical blinds'),
  staggerDelay: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Delay between each blind animation in seconds'),
  baseAnimationDuration: z
    .number()
    .min(0.8)
    .max(2)
    .default(1.5)
    .describe('Base duration for each blind animation in seconds'),
  durationVariance: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.05)
    .describe('Duration variance per blind for organic feel'),
  blurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .describe('Maximum blur intensity in pixels'),
  rotationRange: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Maximum rotation range in degrees'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    transitionDuration,
    blindCount,
    staggerDelay,
    baseAnimationDuration,
    durationVariance,
    blurIntensity,
    rotationRange,
  } = params;

  // Helper: Generate wave clip-path coordinates
  const generateWaveClipPath = (
    waveAmplitude: number,
    phase: number,
  ): string => {
    // 8-point polygon for wave shape
    // Top points (4 points with wave)
    const topPoints = [
      `0 ${waveAmplitude * Math.sin(phase)}%`,
      `33% ${waveAmplitude * Math.sin(phase + Math.PI / 2)}%`,
      `66% ${waveAmplitude * Math.sin(phase + Math.PI)}%`,
      `100% ${waveAmplitude * Math.sin(phase + (3 * Math.PI) / 2)}%`,
    ];

    // Bottom points (4 points with wave, inverted)
    const bottomPoints = [
      `100% ${100 - waveAmplitude * Math.sin(phase + (3 * Math.PI) / 2)}%`,
      `66% ${100 - waveAmplitude * Math.sin(phase + Math.PI)}%`,
      `33% ${100 - waveAmplitude * Math.sin(phase + Math.PI / 2)}%`,
      `0 ${100 - waveAmplitude * Math.sin(phase)}%`,
    ];

    return `polygon(${topPoints.join(', ')}, ${bottomPoints.join(', ')})`;
  };

  // Create blinds
  const blinds: RenderableComponentData[] = [];
  const blindWidth = 100 / blindCount;

  for (let i = 0; i < blindCount; i++) {
    const startTime = i * staggerDelay;
    const duration = baseAnimationDuration + i * durationVariance;
    const blindId = `liquid-blind-${i}`;
    const leftPosition = i * blindWidth;

    // Varied rotation for organic feel
    const rotation = ((i % 2 === 0 ? 1 : -1) * rotationRange * (i + 1)) / blindCount;

    // Wave amplitude varies per blind
    const waveAmplitude = 5 + (i % 3) * 2;

    const blind: RenderableComponentData = {
      id: blindId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'absolute h-full overflow-hidden bg-gradient-to-br from-gray-300 via-gray-100 to-gray-300',
          style: {
            left: `${leftPosition}%`,
            width: `${blindWidth}%`,
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
            backgroundSize: '200% 200%',
            backgroundPosition: '0% 50%',
          },
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: duration,
        },
      },
      effects: [
        // Slide effect
        {
          id: `${blindId}-slide`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [blindId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -120, prog: 1 },
            ],
          },
        },
        // Clip-path morph effect
        {
          id: `${blindId}-clippath`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [blindId],
            ranges: [
              {
                key: 'clipPath',
                val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                prog: 0,
              },
              {
                key: 'clipPath',
                val: generateWaveClipPath(waveAmplitude, 0),
                prog: 0.5,
              },
              {
                key: 'clipPath',
                val: generateWaveClipPath(waveAmplitude * 2, Math.PI / 4),
                prog: 1,
              },
            ],
          },
        },
        // Shimmer effect (background-position animation)
        {
          id: `${blindId}-shimmer`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [blindId],
            ranges: [
              { key: 'backgroundPosition', val: '0% 50%', prog: 0 },
              { key: 'backgroundPosition', val: '100% 50%', prog: 1 },
            ],
          },
        },
        // Blur effect
        {
          id: `${blindId}-blur`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [blindId],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 1 },
            ],
          },
        },
        // Rotation effect
        {
          id: `${blindId}-rotation`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [blindId],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotation, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    };

    blinds.push(blind);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-venetian-blinds-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: blinds,
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
  id: 'liquid-venetian-blinds-transition',
  title: 'Liquid Morphing Venetian Blinds Transition',
  description:
    'A fluid venetian blinds transition with liquid mercury-like morphing effects. Each blind uses SVG clip-path animations that morph from rectangles to wave shapes while sliding away, with metallic shimmer gradients and animated blur for depth of field. Features staggered timing for organic sequential reveal.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'venetian-blinds',
    'liquid',
    'morphing',
    'clip-path',
    'wave',
    'metallic',
    'shimmer',
    'blur',
    'depth-of-field',
    'cinematic',
    'premium',
  ],
  defaultInputParams: {
    transitionDuration: 1.9,
    blindCount: 10,
    staggerDelay: 0.05,
    baseAnimationDuration: 1.5,
    durationVariance: 0.05,
    blurIntensity: 4,
    rotationRange: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidVenetianBlindsTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
