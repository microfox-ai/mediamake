/**
 * Lens Distortion Zoom Preset
 *
 * Simulates the barrel distortion of a wide-angle lens as it zooms, creating a fisheye-like effect
 * that gradually normalizes. This preset creates the feeling of moving from a wide-angle to telephoto lens
 * through compound effects including scale transforms, chromatic aberration, and dynamic vignetting.
 *
 * Features:
 * - Photographic lens simulation with barrel distortion effect
 * - Chromatic aberration that increases with distortion at edges
 * - Dynamic vignetting that follows the distortion curve
 * - Smooth transition from wide-angle to telephoto feel
 * - GPU-accelerated transforms for smooth performance
 * - Realistic optical effects that feel cinematic
 *
 * Technical Implementation:
 * - Uses layered images with transform and opacity animations
 * - RGB channel separation for chromatic aberration effect
 * - Radial gradient vignette with opacity animation
 * - Compound effects: scale, rotation, and chromatic offset
 * - All effects use provider mode with targetIds
 *
 * Use cases:
 * - Dynamic image reveals with professional lens feel
 * - Cinematic transitions between scenes
 * - Product photography with optical character
 * - Title sequences with photographic aesthetics
 * - Music videos with vintage lens aesthetics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  imageSrc: z.string().describe('Source URL of the image to display'),
  duration: z
    .number()
    .default(3)
    .describe('Duration of the lens distortion zoom animation in seconds'),
  distortionAmount: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe(
      'Amount of barrel distortion (0-1, higher = more distortion at start)',
    ),
  zoomLevel: z
    .number()
    .min(1)
    .max(3)
    .default(2.5)
    .describe('Zoom level from start to end (1 = no zoom, 2.5 = 2.5x zoom)'),
  aberrationIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of chromatic aberration at edges (0-1)'),
  vignetteStrength: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Strength of vignette effect (0-1)'),
  focalPointX: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe('Horizontal focal point percentage (0-100)'),
  focalPointY: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe('Vertical focal point percentage (0-100)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    imageSrc,
    duration,
    distortionAmount,
    zoomLevel,
    aberrationIntensity,
    vignetteStrength,
    focalPointX,
    focalPointY,
  } = params;

  // Calculate effect intensities based on distortion amount
  const initialScale = 1 + distortionAmount * 0.15;
  const finalScale = zoomLevel;
  const maxRotation = distortionAmount * 2;
  const maxAberrationOffset = aberrationIntensity * 8;
  const maxAberrationOpacity = aberrationIntensity * 0.3;

  // Transform origin based on focal point
  const transformOrigin = `${focalPointX}% ${focalPointY}%`;

  const childrenData: RenderableComponentData[] = [
    // Vignette overlay (bottom layer)
    {
      id: 'lens-distortion-vignette-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `radial-gradient(circle at ${focalPointX}% ${focalPointY}%, transparent 40%, rgba(0, 0, 0, ${vignetteStrength}) 100%)`,
            willChange: 'opacity',
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
          id: 'vignette-intensity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['lens-distortion-vignette-overlay'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.4, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Base image layer
    {
      id: 'lens-distortion-base-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: imageSrc,
        className: 'w-full h-full object-cover',
        style: {
          willChange: 'transform',
          transformOrigin: transformOrigin,
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
          id: 'base-image-zoom-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['lens-distortion-base-image'],
            ranges: [
              { key: 'scale', val: initialScale, prog: 0 },
              { key: 'scale', val: finalScale, prog: 1 },
            ],
          },
        },
        {
          id: 'base-image-rotation-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['lens-distortion-base-image'],
            ranges: [
              { key: 'rotate', val: maxRotation, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Chromatic aberration layer - red channel
    {
      id: 'lens-distortion-chromatic-layer-red',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: imageSrc,
        className: 'w-full h-full object-cover absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'lighten',
          filter: 'hue-rotate(340deg) saturate(2)',
          willChange: 'transform, opacity',
          transformOrigin: transformOrigin,
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
          id: 'chromatic-red-offset-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['lens-distortion-chromatic-layer-red'],
            ranges: [
              { key: 'translateX', val: maxAberrationOffset, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              {
                key: 'translateY',
                val: maxAberrationOffset / 2,
                prog: 0,
              },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'scale', val: 1.02, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: maxAberrationOpacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Chromatic aberration layer - blue channel
    {
      id: 'lens-distortion-chromatic-layer-blue',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: imageSrc,
        className: 'w-full h-full object-cover absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'lighten',
          filter: 'hue-rotate(180deg) saturate(2)',
          willChange: 'transform, opacity',
          transformOrigin: transformOrigin,
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
          id: 'chromatic-blue-offset-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['lens-distortion-chromatic-layer-blue'],
            ranges: [
              { key: 'translateX', val: -maxAberrationOffset, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              {
                key: 'translateY',
                val: -maxAberrationOffset / 2,
                prog: 0,
              },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'scale', val: 0.98, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: maxAberrationOpacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'lens-distortion-zoom-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full rounded-lg',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData,
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
  id: 'lens-distortion-zoom',
  title: 'Lens Distortion Zoom Effect',
  description:
    'Simulates the photographic transition from a wide-angle to telephoto lens with pseudo-barrel distortion, chromatic aberration, and dynamic vignetting effects. Creates a cinematic zoom that feels like actual lens optics using transform-based animations and layered compositing.',
  type: 'predefined',
  presetType: 'children',
  tags: ['lens', 'distortion', 'zoom', 'chromatic-aberration', 'cinematic', 'photography'],
  defaultInputParams: {
    imageSrc: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    duration: 3,
    distortionAmount: 0.7,
    zoomLevel: 2.5,
    aberrationIntensity: 0.6,
    vignetteStrength: 0.8,
    focalPointX: 50,
    focalPointY: 50,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const lensDistortionZoomPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
