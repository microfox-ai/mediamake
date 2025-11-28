/**
 * Cinematic Ripple Reveal Preset
 *
 * Creates an animated cinematic reveal effect where multiple nested circular divs expand from
 * a central point outward in a staggered, ripple-like pattern to reveal content. This effect
 * simulates a multi-layer reveal transition similar to an iris wipe from classic film.
 *
 * Features:
 * - 5 nested circular layers expanding from center with scale transforms
 * - Staggered timing (120ms offsets) creating ripple effect
 * - Smooth ease-out animations with subtle bounce overshoot (scale 1.05 → 1.0)
 * - Combined scale + opacity transitions for softer reveal
 * - GPU-accelerated transforms with will-change optimization
 * - Transform-origin: center center for precise circular expansion
 * - Circular border-radius (50%) for clean iris aperture effect
 *
 * Use cases:
 * - Opening transitions for video segments
 * - Revealing content with dramatic flair
 * - Title card introductions with depth
 * - Scene transitions with organic, fluid motion
 * - Professional video editing effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  trackId: z
    .string()
    .default('cinematic-ripple-reveal')
    .describe('Unique ID for this preset instance'),
  layerCount: z
    .number()
    .min(3)
    .max(8)
    .default(5)
    .describe('Number of reveal layers (3-8)'),
  staggerDelay: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.12)
    .describe('Time offset between layer animations in seconds (0.05-0.3)'),
  layerDuration: z
    .number()
    .min(0.4)
    .max(1.5)
    .default(0.7)
    .describe('Duration of each layer expansion in seconds (0.4-1.5)'),
  totalDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Total duration of the preset in seconds'),
  overshootScale: z
    .number()
    .min(1)
    .max(1.2)
    .default(1.05)
    .describe('Peak scale value for bounce effect (1.0 = no overshoot, 1.05 = subtle)'),
  startOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Starting opacity for fade-in (0-1)'),
  layerColors: z
    .array(z.string())
    .optional()
    .describe(
      'Array of layer background colors (RGBA format). Defaults to grayscale gradient',
    ),
  easingType: z
    .enum(['ease-out', 'ease-in-out', 'linear'])
    .default('ease-out')
    .describe('Easing function for animations'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackId,
    layerCount,
    staggerDelay,
    layerDuration,
    totalDuration,
    overshootScale,
    startOpacity,
    layerColors,
    easingType,
  } = params;

  // Generate default layer colors if not provided (grayscale gradient from dark to light)
  const generateDefaultColors = (count: number): string[] => {
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      const opacity = 0.95 - i * (0.2 / count); // Decreasing opacity
      const grayValue = i * (80 / count); // Increasing brightness
      colors.push(`rgba(${grayValue}, ${grayValue}, ${grayValue}, ${opacity})`);
    }
    return colors;
  };

  const effectiveLayerColors =
    layerColors && layerColors.length >= layerCount
      ? layerColors.slice(0, layerCount)
      : generateDefaultColors(layerCount);

  // Create layer components (reverse order so layer-1 is on top)
  const layerComponents: RenderableComponentData[] = [];

  for (let i = layerCount; i >= 1; i--) {
    const layerId = `${trackId}-layer-${i}`;
    const layerIndex = i - 1; // 0-indexed for array access
    const startTime = layerIndex * staggerDelay;
    const zIndex = 10 - layerIndex; // Higher layers on top

    // HTML content for circular div
    const html = `<div style="width: 100%; height: 100%; background: ${effectiveLayerColors[layerIndex]}; border-radius: 50%;"></div>`;

    layerComponents.push({
      id: layerId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html,
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
          willChange: 'transform',
          zIndex,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        // Scale effect with overshoot
        {
          id: `${layerId}-scale-effect`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [layerId],
            type: easingType,
            start: startTime,
            duration: layerDuration,
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: overshootScale, prog: 0.8 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Opacity effect for softer reveal
        {
          id: `${layerId}-opacity-effect`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [layerId],
            type: easingType,
            start: startTime,
            duration: layerDuration,
            ranges: [
              { key: 'opacity', val: startOpacity, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Content container (revealed underneath layers)
  const contentContainer: RenderableComponentData = {
    id: `${trackId}-content-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [contentContainer, ...layerComponents],
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
  id: 'cinematic-ripple-reveal',
  title: 'Cinematic Ripple Reveal',
  description:
    'Multi-layer cinematic reveal effect where nested containers expand from center outward in a staggered ripple pattern with scale transforms and subtle opacity transitions, creating an organic iris-wipe style reveal with bounce overshoot',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'cinematic',
    'reveal',
    'transition',
    'ripple',
    'iris',
    'scale',
    'animated',
    'opening',
  ],
  dependencies: {},
  defaultInputParams: {
    trackId: 'cinematic-ripple-reveal',
    layerCount: 5,
    staggerDelay: 0.12,
    layerDuration: 0.7,
    totalDuration: 2,
    overshootScale: 1.05,
    startOpacity: 0.8,
    easingType: 'ease-out',
  },
};

export const cinematicRippleRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
