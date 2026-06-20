/**
 * Dolly Zoom (Vertigo Effect) Preset
 *
 * Creates the classic Hitchcock dolly zoom effect that maintains subject size while the background
 * appears to push in or pull away. This effect creates an unsettling perspective shift that conveys
 * psychological tension and emotional moments.
 *
 * Features:
 * - **Coordinated Zoom & Counter-Movement**: Primary zoom effect scales from 1 to 1.5 while a
 *   counter-transform maintains focal point size by translating in the opposite direction
 * - **Dynamic Transform Origin**: Sets CSS transform-origin dynamically based on focal point
 * - **Subtle Desaturation**: Animates saturation from 100% to 70% during the zoom for psychological impact
 * - **Perspective Shift**: Adds subtle perspective change using CSS perspective values
 * - **Smooth 60fps Animation**: Uses transform-gpu class and composite layers for performance
 * - **Configurable Parameters**: Focal point, zoom direction (in/out), intensity, and perspective amount
 *
 * Use cases:
 * - Creating Hitchcock-style vertigo effects for dramatic moments
 * - Conveying character realizations or emotional shifts
 * - Building psychological tension in narrative content
 * - Adding cinematic depth to key scenes
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  imageSrc: z.string().describe('Source URL or path of the image to apply the dolly zoom effect to'),
  
  focalPoint: z.object({
    x: z.number().min(0).max(1).default(0.5).describe('Horizontal focal point (0 = left, 0.5 = center, 1 = right)'),
    y: z.number().min(0).max(1).default(0.5).describe('Vertical focal point (0 = top, 0.5 = center, 1 = bottom)'),
  }).default({ x: 0.5, y: 0.5 }).describe('The focal point that should remain at constant apparent size'),
  
  zoomDirection: z.enum(['in', 'out']).default('in').describe('Direction of zoom: "in" = zoom in while pulling back, "out" = zoom out while pushing forward'),
  
  intensity: z.number().min(1.1).max(2).default(1.5).describe('Intensity of the zoom effect (1.1 = subtle, 2 = dramatic)'),
  
  perspectiveAmount: z.number().min(500).max(2000).default(1000).describe('Perspective value in pixels for depth effect (lower = more dramatic)'),
  
  duration: z.number().min(2).max(20).default(8).describe('Duration of the dolly zoom effect in seconds'),
  
  easingType: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out']).default('ease-in-out').describe('Easing function for the animation'),
  
  desaturationAmount: z.number().min(50).max(100).default(70).describe('Final saturation percentage (100 = no change, 70 = 30% desaturated)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    imageSrc,
    focalPoint,
    zoomDirection,
    intensity,
    perspectiveAmount,
    duration,
    easingType,
    desaturationAmount,
  } = params;

  // Calculate transform origin based on focal point
  const transformOrigin = `${focalPoint.x * 100}% ${focalPoint.y * 100}%`;
  
  // Calculate scales based on zoom direction
  const startScale = zoomDirection === 'in' ? 1 : intensity;
  const endScale = zoomDirection === 'in' ? intensity : 1;
  
  // Calculate counter-movement to maintain focal point size
  // As scale increases, we translate away from the focal point
  // Formula: translateDistance = (scale - 1) * focalDistance * direction
  const focalDistanceX = (focalPoint.x - 0.5) * 100; // Distance from center in percentage
  const focalDistanceY = (focalPoint.y - 0.5) * 100;
  
  // Counter-movement calculation: as we zoom in, translate in opposite direction
  const startTranslateX = zoomDirection === 'in' ? 0 : -focalDistanceX * (intensity - 1);
  const endTranslateX = zoomDirection === 'in' ? -focalDistanceX * (intensity - 1) : 0;
  
  const startTranslateY = zoomDirection === 'in' ? 0 : -focalDistanceY * (intensity - 1);
  const endTranslateY = zoomDirection === 'in' ? -focalDistanceY * (intensity - 1) : 0;
  
  // Perspective values
  const perspectiveStart = zoomDirection === 'in' ? perspectiveAmount : perspectiveAmount * 0.7;
  const perspectiveEnd = zoomDirection === 'in' ? perspectiveAmount * 0.7 : perspectiveAmount;

  // Create the coordinated zoom and counter-movement effect
  const zoomCounterEffect: GenericEffectData = {
    type: easingType,
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: ['inner-dolly-container'],
    ranges: [
      { key: 'scale', val: startScale, prog: 0 },
      { key: 'scale', val: endScale, prog: 1 },
      { key: 'translateX', val: `${startTranslateX}%`, prog: 0 },
      { key: 'translateX', val: `${endTranslateX}%`, prog: 1 },
      { key: 'translateY', val: `${startTranslateY}%`, prog: 0 },
      { key: 'translateY', val: `${endTranslateY}%`, prog: 1 },
    ],
  };

  // Create the desaturation effect
  const desaturationEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: ['dolly-zoom-container'],
    ranges: [
      { key: 'saturate', val: 1, prog: 0 },
      { key: 'saturate', val: desaturationAmount / 100, prog: 1 },
    ],
  };

  // Create the perspective effect
  const perspectiveEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: ['inner-dolly-container'],
    ranges: [
      { key: 'perspective', val: perspectiveStart, prog: 0 },
      { key: 'perspective', val: perspectiveEnd, prog: 1 },
    ],
  };

  const rootContainer: RenderableComponentData = {
    id: 'dolly-zoom-container',
    type: 'layout',
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
    effects: [
      {
        id: 'desaturation-effect',
        componentId: 'generic',
        data: desaturationEffect,
      },
    ],
    childrenData: [
      {
        id: 'inner-dolly-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
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
            id: 'zoom-counter-effect',
            componentId: 'generic',
            data: zoomCounterEffect,
          },
          {
            id: 'perspective-effect',
            componentId: 'generic',
            data: perspectiveEffect,
          },
        ],
        childrenData: [
          {
            id: 'image-element',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: imageSrc,
              className: 'w-full h-full object-cover transform-gpu',
              style: {
                transformOrigin: transformOrigin,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
        ] as RenderableComponentData[],
      },
    ] as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'dolly-zoom-vertigo',
  title: 'Dolly Zoom (Vertigo Effect)',
  description: 'Creates the classic Hitchcock dolly zoom effect that maintains subject size while the background appears to push in or pull away. Features coordinated zoom and counter-movement with subtle desaturation for psychological impact. Perfect for conveying emotional moments, realizations, or tension in cinematic content.',
  type: 'predefined',
  presetType: 'children',
  tags: ['visual', 'cinematic', 'hitchcock', 'vertigo', 'dolly-zoom', 'perspective', 'psychological', 'dramatic', 'image', 'effect'],
  defaultInputParams: {
    imageSrc: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    focalPoint: {
      x: 0.5,
      y: 0.5,
    },
    zoomDirection: 'in',
    intensity: 1.5,
    perspectiveAmount: 1000,
    duration: 8,
    easingType: 'ease-in-out',
    desaturationAmount: 70,
  },
  dependencies: {},
};

export const dollyZoomVertigoPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
