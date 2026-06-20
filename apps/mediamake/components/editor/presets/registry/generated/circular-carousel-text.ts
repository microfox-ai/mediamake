/**
 * Circular Carousel Text Preset
 *
 * This preset creates text elements that float in a 3D circular carousel pattern
 * with depth-based fading, scaling, and vertical floating effects. Text orbits
 * around an invisible center point, moving closer and farther from the viewer.
 *
 * Features:
 * - **Circular Motion**: Text orbits in a circular path using Math.cos/sin calculations
 * - **Depth Simulation**: Z-position simulated via Y coordinate (higher Y = farther back)
 * - **Depth-Based Effects**: Opacity (0.3-1.0), scale (0.7-1.2), and z-index vary with depth
 * - **Vertical Floating**: Secondary floating animation (zero-gravity effect)
 * - **Phase Offsets**: Text elements evenly distributed around circle with staggered timing
 * - **Customizable**: Adjustable radius, rotation speed, floating intensity, and text content
 *
 * Use cases:
 * - Creating 3D carousel text effects for intros/outros
 * - Building orbital text animations for branding
 * - Adding dynamic floating text overlays
 * - Creating engaging title sequences with depth
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
  items: z
    .array(
      z.object({
        text: z.string().describe('Text content for this carousel item'),
        fontSize: z
          .number()
          .min(12)
          .max(200)
          .default(32)
          .optional()
          .describe('Font size in pixels'),
        fontWeight: z
          .string()
          .default('600')
          .optional()
          .describe('Font weight (e.g., "400", "600", "700")'),
        color: z
          .string()
          .default('#ffffff')
          .optional()
          .describe('Text color (CSS color value)'),
      }),
    )
    .min(1)
    .max(10)
    .default([
      { text: 'Carousel Item 1' },
      { text: 'Carousel Item 2' },
      { text: 'Carousel Item 3' },
      { text: 'Carousel Item 4' },
      { text: 'Carousel Item 5' },
    ])
    .describe('Array of text items to display in the carousel'),

  radius: z
    .number()
    .min(100)
    .max(500)
    .default(250)
    .describe('Radius of the circular orbit in pixels'),

  rotationDuration: z
    .number()
    .min(10)
    .max(60)
    .default(25)
    .describe('Duration for one full rotation in seconds'),

  floatingDuration: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Duration for vertical floating animation in seconds'),

  floatingAmplitude: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Amplitude of vertical floating in pixels'),

  minOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Minimum opacity when text is at the back'),

  maxOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Maximum opacity when text is at the front'),

  minScale: z
    .number()
    .min(0.1)
    .max(1.5)
    .default(0.7)
    .describe('Minimum scale when text is at the back'),

  maxScale: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.2)
    .describe('Maximum scale when text is at the front'),

  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  duration: z
    .number()
    .min(1)
    .max(300)
    .default(30)
    .describe('Total duration of the carousel in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Parse font string
  const parseFontString = (fontStr: string | undefined) => {
    if (!fontStr) return { family: 'Inter', weight: undefined, style: undefined };
    
    const parts = fontStr.split(':');
    return {
      family: parts[0] || 'Inter',
      weight: parts[1] ? parseInt(parts[1], 10) : undefined,
      style: parts[2] as 'normal' | 'italic' | undefined,
    };
  };

  const fontConfig = parseFontString(params.font);

  // Helper: Calculate circular position and depth
  const getCircularTransform = (
    angle: number,
    radius: number,
  ): { x: number; y: number; depth: number } => {
    // Convert angle to radians
    const rad = (angle * Math.PI) / 180;
    
    // Calculate x, y positions
    const x = Math.cos(rad) * radius;
    const y = Math.sin(rad) * radius;
    
    // Depth is based on y position (higher y = farther back)
    // Normalize depth to 0-1 range (0 = front, 1 = back)
    const depth = (y + radius) / (2 * radius);
    
    return { x, y, depth };
  };

  // Helper: Interpolate value based on depth
  const interpolate = (min: number, max: number, depth: number): number => {
    // depth: 0 (front) -> max, 1 (back) -> min
    return max - (max - min) * depth;
  };

  // Calculate phase offset for even distribution
  const phaseOffset = 360 / params.items.length;

  // Create text items with effects
  const textItems = params.items.map((item, index) => {
    const textId = `carousel-text-${index}`;
    const startAngle = index * phaseOffset;

    // Create circular motion effect
    const circularMotionEffect = {
      id: `circular-motion-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: params.rotationDuration,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: (() => {
          const numKeyframes = 36; // 36 keyframes for smooth rotation
          const ranges = [];

          for (let i = 0; i <= numKeyframes; i++) {
            const progress = i / numKeyframes;
            const angle = startAngle + progress * 360;
            const { x, y, depth } = getCircularTransform(angle, params.radius);
            
            const opacity = interpolate(params.minOpacity, params.maxOpacity, depth);
            const scale = interpolate(params.minScale, params.maxScale, depth);
            const zIndex = Math.round(interpolate(1, 100, depth));

            ranges.push(
              { key: 'translateX', val: x, prog: progress },
              { key: 'translateY', val: y, prog: progress },
              { key: 'opacity', val: opacity, prog: progress },
              { key: 'scale', val: scale, prog: progress },
              { key: 'zIndex', val: zIndex, prog: progress },
            );
          }

          return ranges;
        })(),
      },
    };

    // Create floating effect (overlaid on circular motion)
    const floatingEffect = {
      id: `floating-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: params.floatingDuration,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: [
          { key: 'translateY', val: -params.floatingAmplitude, prog: 0 },
          { key: 'translateY', val: params.floatingAmplitude, prog: 0.5 },
          { key: 'translateY', val: -params.floatingAmplitude, prog: 1 },
        ],
      },
    };

    // Text atom
    return {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: item.text,
        className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        style: {
          transformOrigin: 'center',
          fontSize: item.fontSize ?? 32,
          fontWeight: item.fontWeight ?? '600',
          color: item.color ?? '#ffffff',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
          ...(fontConfig.weight ? { fontWeight: fontConfig.weight } : {}),
          ...(fontConfig.style ? { fontStyle: fontConfig.style } : {}),
        },
        font: {
          family: fontConfig.family,
          ...(fontConfig.weight ? { weights: [fontConfig.weight.toString()] } : {}),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [circularMotionEffect, floatingEffect],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer = {
    id: 'circular-carousel-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      {
        id: 'carousel-center-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              width: '1px',
              height: '1px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: textItems as RenderableComponentData[],
      } as RenderableComponentData,
    ],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'circular-carousel-text',
  title: 'Circular Carousel Text',
  description:
    'Text elements that float in a 3D circular carousel pattern with depth-based fading, scaling, and vertical floating. Uses 2D transforms to simulate 3D motion with angular velocity and phase offsets for even distribution.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'carousel',
    'circular',
    '3d',
    'orbital',
    'depth',
    'floating',
    'animated',
  ],
  dependencies: {},
  defaultInputParams: {
    items: [
      { text: 'Carousel Item 1' },
      { text: 'Carousel Item 2' },
      { text: 'Carousel Item 3' },
      { text: 'Carousel Item 4' },
      { text: 'Carousel Item 5' },
    ],
    radius: 250,
    rotationDuration: 25,
    floatingDuration: 4,
    floatingAmplitude: 20,
    minOpacity: 0.3,
    maxOpacity: 1,
    minScale: 0.7,
    maxScale: 1.2,
    font: 'Inter:600',
    duration: 30,
  },
};

// Export preset
export const circularCarouselTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
