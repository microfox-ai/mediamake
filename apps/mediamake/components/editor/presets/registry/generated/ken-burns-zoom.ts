/**
 * Ken Burns Zoom Transition Preset
 *
 * This preset creates a cinematic Ken Burns-style zoom transition that smoothly zooms
 * into a specific focal point on an image. Perfect for documentary-style presentations
 * where you want to draw attention to a particular detail in a photograph.
 *
 * Features:
 * - **Customizable Focal Point**: Target any area using normalized coordinates (0-1 range)
 * - **Smooth Zoom Animation**: Ease-in-out curve for natural, purposeful movement
 * - **Progressive Vignette**: Subtle darkening at edges that intensifies as zoom progresses
 * - **GPU Accelerated**: Uses transform with will-change for smooth performance
 * - **Configurable Zoom Level**: Control zoom intensity from 1.5x to 5x
 * - **Professional Motion**: Starts wide to establish context, gradually pushes into detail
 *
 * Use cases:
 * - Documentary-style photo reveals
 * - Highlighting faces in crowd photos
 * - Drawing attention to important details
 * - Creating depth and focus in presentations
 * - Professional photo storytelling sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  image: z.object({
    src: z.string().describe('Image source URL or local path'),
  }),
  focalPoint: z
    .object({
      x: z
        .number()
        .min(0)
        .max(1)
        .default(0.5)
        .describe('Horizontal focal point (0 = left, 0.5 = center, 1 = right)'),
      y: z
        .number()
        .min(0)
        .max(1)
        .default(0.5)
        .describe('Vertical focal point (0 = top, 0.5 = center, 1 = bottom)'),
    })
    .default({ x: 0.5, y: 0.5 })
    .describe('Normalized coordinates of the focal point to zoom into'),
  zoomLevel: z
    .number()
    .min(1.5)
    .max(5)
    .default(2.5)
    .describe('Final zoom scale (1.5 = subtle, 2.5 = moderate, 5 = dramatic)'),
  duration: z
    .number()
    .min(2)
    .max(30)
    .default(10)
    .describe('Duration of the zoom transition in seconds'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Maximum vignette opacity at full zoom (0 = none, 1 = full black)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image, focalPoint, zoomLevel, duration, vignetteIntensity } = params;

  // Get viewport dimensions for calculations
  const viewportWidth = props.config?.width ?? 1920;
  const viewportHeight = props.config?.height ?? 1080;

  // Calculate translation values to center on focal point
  // Formula: translateX = (0.5 - focalX) * imageWidth * (zoomLevel - 1)
  // This ensures that as we zoom, the focal point moves to center
  const translateXPercent = (0.5 - focalPoint.x) * 100 * (zoomLevel - 1);
  const translateYPercent = (0.5 - focalPoint.y) * 100 * (zoomLevel - 1);

  // Create the zoom effect on the image
  const zoomEffect = {
    id: 'ken-burns-zoom-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: ['ken-burns-image'],
      ranges: [
        // Scale from 1 to zoomLevel
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: zoomLevel, prog: 1 },
        // Translate to center on focal point
        { key: 'translateX', val: '0%', prog: 0 },
        { key: 'translateX', val: `${translateXPercent}%`, prog: 1 },
        { key: 'translateY', val: '0%', prog: 0 },
        { key: 'translateY', val: `${translateYPercent}%`, prog: 1 },
      ],
    },
  };

  // Create the vignette fade-in effect
  const vignetteEffect = {
    id: 'ken-burns-vignette-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: ['ken-burns-vignette'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: vignetteIntensity, prog: 1 },
      ],
    },
  };

  // Build the component tree
  const childrenData: RenderableComponentData[] = [
    // Image layer
    {
      id: 'ken-burns-image',
      type: 'atom' as const,
      componentId: 'ImageAtom',
      data: {
        src: image.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          willChange: 'transform',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [zoomEffect],
    } as RenderableComponentData,
    // Vignette overlay
    {
      id: 'ken-burns-vignette',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background:
              'radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.7) 100%)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [vignetteEffect],
      childrenData: [],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'ken-burns-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'ken-burns-zoom',
  title: 'Ken Burns Zoom Transition',
  description:
    'Cinematic Ken Burns-style zoom transition that smoothly zooms into a focal point on an image with progressive vignette effect. Features customizable focal point targeting, zoom levels, and professional ease-in-out timing for documentary-style presentations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'zoom',
    'ken-burns',
    'documentary',
    'image',
    'cinematic',
    'vignette',
  ],
  defaultInputParams: {
    image: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    },
    focalPoint: {
      x: 0.5,
      y: 0.5,
    },
    zoomLevel: 2.5,
    duration: 10,
    vignetteIntensity: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const kenBurnsZoomPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
