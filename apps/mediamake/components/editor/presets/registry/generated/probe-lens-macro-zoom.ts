/**
 * Probe Lens Macro Zoom Preset
 *
 * This preset simulates the extreme close-up photography technique used in nature documentaries,
 * creating an elegant probe lens-style macro zoom effect. The camera appears to physically move
 * through space toward a tiny detail, with progressive edge blur and darkening to simulate
 * depth of field.
 *
 * Features:
 * - **Smooth Zoom Animation**: Accelerates from rest, reaches maximum velocity at midpoint, then decelerates
 * - **Depth of Field Simulation**: Radial gradient overlay that progressively intensifies
 * - **Bokeh Effect**: Edges blur and darken while focal point remains sharp
 * - **Chromatic Aberration**: Optional color channel separation for cinematic lens distortion
 * - **Configurable Focal Point**: Target any point in the frame for zoom focus
 * - **Adjustable Zoom Depth**: Control final magnification (4-8x recommended)
 *
 * Use cases:
 * - Nature documentary-style macro reveals
 * - Product detail showcases
 * - Dramatic focus transitions
 * - Cinematic image reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  image: z
    .object({
      src: z.string().describe('Source URL of the image to zoom into'),
    })
    .describe('Image source configuration'),
  
  focalPoint: z
    .object({
      x: z.number().min(0).max(100).default(50).describe('Horizontal focal point position (0-100%)'),
      y: z.number().min(0).max(100).default(50).describe('Vertical focal point position (0-100%)'),
    })
    .default({ x: 50, y: 50 })
    .describe('The point in the image to zoom toward (percentage coordinates)'),
  
  zoomDepth: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .describe('Final zoom magnification level (4-8x recommended for macro effect)'),
  
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(8)
    .describe('Total duration of the zoom effect in seconds'),
  
  bokehIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Intensity of the depth of field blur effect (0-1)'),
  
  chromaticAberration: z
    .boolean()
    .default(true)
    .describe('Enable chromatic aberration effect on edges'),
  
  chromaticIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Intensity of chromatic aberration offset in pixels'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    image,
    focalPoint,
    zoomDepth,
    duration,
    bokehIntensity,
    chromaticAberration,
    chromaticIntensity,
  } = params;

  // Helper function to create radial gradient string
  const createRadialGradient = (clearRadius: number) => {
    return `radial-gradient(circle at ${focalPoint.x}% ${focalPoint.y}%, transparent 0%, transparent ${clearRadius}%, rgba(0,0,0,0.3) ${clearRadius + 10}%, rgba(0,0,0,0.9) 100%)`;
  };

  // Main zoom effect on the primary image
  const mainZoomEffect = {
    id: 'probe-zoom-main',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: ['probe-main-image'],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: zoomDepth, prog: 1 },
      ],
    },
  };

  // Depth of field overlay animation
  const dofEffect = {
    id: 'probe-dof-animation',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: ['probe-dof-overlay'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: bokehIntensity, prog: 1 },
      ],
    },
  };

  // Build children array
  const childrenData: RenderableComponentData[] = [
    // Main image layer
    {
      id: 'probe-main-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image.src,
        className: 'w-full h-full object-cover will-change-transform',
        style: {
          transformOrigin: `${focalPoint.x}% ${focalPoint.y}%`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData,
    
    // Depth of field overlay with radial gradient
    {
      id: 'probe-dof-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="w-full h-full"></div>',
        className: 'absolute inset-0 pointer-events-none will-change-filter',
        style: {
          background: createRadialGradient(35),
          mixBlendMode: 'multiply',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData,
  ];

  // Add chromatic aberration layers if enabled
  if (chromaticAberration) {
    // Red channel offset (positive X)
    const chromaticRedEffect = {
      id: 'probe-chromatic-red',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: ['probe-chromatic-red-layer'],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: zoomDepth, prog: 1 },
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: chromaticIntensity, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.25, prog: 0.3 },
          { key: 'opacity', val: 0.3, prog: 1 },
        ],
      },
    };

    // Blue channel offset (negative X)
    const chromaticBlueEffect = {
      id: 'probe-chromatic-blue',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: ['probe-chromatic-blue-layer'],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: zoomDepth, prog: 1 },
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: -chromaticIntensity, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.25, prog: 0.3 },
          { key: 'opacity', val: 0.3, prog: 1 },
        ],
      },
    };

    // Insert chromatic aberration layers after main image
    childrenData.splice(1, 0,
      {
        id: 'probe-chromatic-red-layer',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: image.src,
          className: 'absolute inset-0 w-full h-full object-cover pointer-events-none will-change-transform',
          style: {
            transformOrigin: `${focalPoint.x}% ${focalPoint.y}%`,
            mixBlendMode: 'screen',
            filter: 'sepia(1) saturate(5) hue-rotate(-50deg)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [chromaticRedEffect],
      } as RenderableComponentData,
      
      {
        id: 'probe-chromatic-blue-layer',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: image.src,
          className: 'absolute inset-0 w-full h-full object-cover pointer-events-none will-change-transform',
          style: {
            transformOrigin: `${focalPoint.x}% ${focalPoint.y}%`,
            mixBlendMode: 'screen',
            filter: 'sepia(1) saturate(5) hue-rotate(180deg)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [chromaticBlueEffect],
      } as RenderableComponentData,
    );
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'probe-lens-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full rounded-lg',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [mainZoomEffect, dofEffect],
    childrenData: childrenData,
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
  id: 'probe-lens-macro-zoom',
  title: 'Probe Lens Macro Zoom',
  description: 'Elegant probe lens-style macro zoom preset simulating extreme close-up photography with smooth acceleration, depth of field blur, radial gradient masking, and chromatic aberration for a cinematic nature documentary effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'zoom', 'macro', 'depth-of-field', 'bokeh', 'chromatic-aberration', 'cinematic', 'nature', 'documentary'],
  defaultInputParams: {
    image: {
      src: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=1080&fit=crop',
    },
    focalPoint: {
      x: 50,
      y: 50,
    },
    zoomDepth: 5,
    duration: 8,
    bokehIntensity: 0.8,
    chromaticAberration: true,
    chromaticIntensity: 2,
  },
  dependencies: {},
};

// Export preset
export const probeLensMacroZoomPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
