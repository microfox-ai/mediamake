/**
 * Elastic Breathe Animation Preset
 *
 * A morphing breathing animation with elastic squash-and-stretch scaling inspired by liquid motion graphics
 * and shape-layer animations in After Effects. The element doesn't just scale uniformly - it stretches and
 * squashes like elastic material. During expansion, it stretches horizontally (scaleX: 115%) while compressing
 * vertically (scaleY: 95%), then reverses during contraction. Border-radius animations create organic shape
 * morphing, transforming from sharp corners to rounded edges during the breath cycle.
 *
 * Features:
 * - **Elastic Squash & Stretch**: Separate scaleX and scaleY animations with offset timing for elastic feel
 * - **Organic Shape Morphing**: Border-radius transitions from sharp to rounded corners
 * - **Subtle Rotation**: Oscillating rotation for organic movement
 * - **Spring Easing**: Natural elastic feel with spring physics
 * - **GPU-Accelerated**: Transform-only animations for smooth performance
 * - **Creative Branding**: Perfect for animated logos, interactive UI elements, and playful brand expressions
 *
 * Technical Implementation:
 * - Separate AnimationRanges for scaleX [1, 1.15, 0.92, 1] and scaleY [1, 0.85, 1.08, 1]
 * - Border-radius morphing from 0.5rem to 2rem and back
 * - Rotation oscillation from -2deg to 2deg to -1deg to 0deg
 * - 3-second duration with spring easing for elastic feel
 * - Provider mode effects with GPU acceleration (transform-gpu)
 *
 * Use cases:
 * - Animated brand logos with playful personality
 * - Interactive UI elements and buttons with organic feedback
 * - Creative loading indicators and attention-grabbers
 * - Playful decorative elements for dynamic brands
 * - Breathing avatars or profile pictures
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe('Duration of one breath cycle in seconds'),
  
  maxScaleX: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.15)
    .optional()
    .describe('Maximum horizontal scale during expansion (e.g., 1.15 = 115%)'),
  
  minScaleX: z
    .number()
    .min(0.7)
    .max(1)
    .default(0.92)
    .optional()
    .describe('Minimum horizontal scale during contraction (e.g., 0.92 = 92%)'),
  
  maxScaleY: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.08)
    .optional()
    .describe('Maximum vertical scale during contraction (e.g., 1.08 = 108%)'),
  
  minScaleY: z
    .number()
    .min(0.7)
    .max(1)
    .default(0.85)
    .optional()
    .describe('Minimum vertical scale during expansion (e.g., 0.85 = 85%)'),
  
  startBorderRadius: z
    .string()
    .default('0.5rem')
    .optional()
    .describe('Starting border-radius (sharp corners)'),
  
  maxBorderRadius: z
    .string()
    .default('2rem')
    .optional()
    .describe('Maximum border-radius (rounded corners)'),
  
  maxRotation: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Maximum rotation in degrees for organic movement'),
  
  backgroundColor: z
    .string()
    .default('rgba(59, 130, 246, 0.8)')
    .optional()
    .describe('Background color of the breathing element (CSS color value)'),
  
  width: z
    .string()
    .default('200px')
    .optional()
    .describe('Width of the breathing element'),
  
  height: z
    .string()
    .default('200px')
    .optional()
    .describe('Height of the breathing element'),
  
  loop: z
    .boolean()
    .default(true)
    .optional()
    .describe('Whether to loop the breathing animation'),
  
  easingType: z
    .enum(['spring', 'ease-in-out', 'ease-out', 'ease-in'])
    .default('spring')
    .optional()
    .describe('Easing function for the animation (spring recommended for elastic feel)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const duration = params.duration ?? 3;
  const maxScaleX = params.maxScaleX ?? 1.15;
  const minScaleX = params.minScaleX ?? 0.92;
  const maxScaleY = params.maxScaleY ?? 1.08;
  const minScaleY = params.minScaleY ?? 0.85;
  const startBorderRadius = params.startBorderRadius ?? '0.5rem';
  const maxBorderRadius = params.maxBorderRadius ?? '2rem';
  const maxRotation = params.maxRotation ?? 2;
  const backgroundColor = params.backgroundColor ?? 'rgba(59, 130, 246, 0.8)';
  const width = params.width ?? '200px';
  const height = params.height ?? '200px';
  const loop = params.loop ?? true;
  const easingType = params.easingType ?? 'spring';

  // Calculate total duration (single cycle or looped)
  const totalDuration = loop ? 30 : duration; // 30 seconds if looping, else single cycle

  // Component IDs
  const containerId = 'elastic-breathe-container';
  const shapeId = 'elastic-breathe-shape';

  // Create the breathing shape with elastic squash-and-stretch animation
  const breathingShape = {
    id: shapeId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'transform-gpu',
        style: {
          width,
          height,
          backgroundColor,
          borderRadius: startBorderRadius,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData;

  // Create elastic breathing effects
  const breathingEffects = [];

  // ScaleX effect: [1, 1.15, 0.92, 1] (horizontal stretch/squash)
  breathingEffects.push({
    id: 'elastic-scaleX-effect',
    componentId: 'generic',
    data: {
      type: easingType,
      start: 0,
      duration: loop ? totalDuration : duration,
      mode: 'provider',
      targetIds: [shapeId],
      ranges: [
        { key: 'scaleX', val: 1, prog: 0 }, // Start neutral
        { key: 'scaleX', val: maxScaleX, prog: 0.33 }, // Expand horizontally
        { key: 'scaleX', val: minScaleX, prog: 0.66 }, // Contract horizontally
        { key: 'scaleX', val: 1, prog: 1 }, // Return to neutral
      ],
    },
  });

  // ScaleY effect: [1, 0.85, 1.08, 1] (vertical squash/stretch - opposite timing)
  breathingEffects.push({
    id: 'elastic-scaleY-effect',
    componentId: 'generic',
    data: {
      type: easingType,
      start: 0,
      duration: loop ? totalDuration : duration,
      mode: 'provider',
      targetIds: [shapeId],
      ranges: [
        { key: 'scaleY', val: 1, prog: 0 }, // Start neutral
        { key: 'scaleY', val: minScaleY, prog: 0.33 }, // Compress vertically (when scaleX expands)
        { key: 'scaleY', val: maxScaleY, prog: 0.66 }, // Stretch vertically (when scaleX contracts)
        { key: 'scaleY', val: 1, prog: 1 }, // Return to neutral
      ],
    },
  });

  // Border-radius morphing effect: sharp to rounded and back
  breathingEffects.push({
    id: 'elastic-borderRadius-effect',
    componentId: 'generic',
    data: {
      type: easingType,
      start: 0,
      duration: loop ? totalDuration : duration,
      mode: 'provider',
      targetIds: [shapeId],
      ranges: [
        { key: 'borderRadius', val: startBorderRadius, prog: 0 }, // Sharp corners
        { key: 'borderRadius', val: maxBorderRadius, prog: 0.5 }, // Rounded corners (mid-breath)
        { key: 'borderRadius', val: startBorderRadius, prog: 1 }, // Back to sharp
      ],
    },
  });

  // Rotation effect: [-2, 2, -1, 0] for organic movement
  breathingEffects.push({
    id: 'elastic-rotation-effect',
    componentId: 'generic',
    data: {
      type: easingType,
      start: 0,
      duration: loop ? totalDuration : duration,
      mode: 'provider',
      targetIds: [shapeId],
      ranges: [
        { key: 'rotate', val: -maxRotation, prog: 0 }, // Rotate left
        { key: 'rotate', val: maxRotation, prog: 0.33 }, // Rotate right
        { key: 'rotate', val: -maxRotation / 2, prog: 0.66 }, // Slight left
        { key: 'rotate', val: 0, prog: 1 }, // Return to neutral
      ],
    },
  });

  // Root container
  const rootContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden rounded-lg flex items-center justify-center',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [breathingShape],
    effects: breathingEffects,
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
  id: 'elastic-breathe',
  title: 'Elastic Breathe Animation',
  description:
    'A morphing breathing animation with elastic squash-and-stretch scaling, organic border-radius morphing, and subtle rotation. Creates a playful, liquid-motion inspired effect perfect for creative brands, animated logos, or interactive UI elements. Features separate scaleX/scaleY animations with offset timing for elastic feel, border-radius transitions from sharp to rounded corners, and spring easing for organic movement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'animation',
    'elastic',
    'breathe',
    'morph',
    'squash-and-stretch',
    'organic',
    'spring',
    'liquid-motion',
    'creative',
    'branding',
    'logo',
    'playful',
    'interactive',
    'ui',
  ],
  defaultInputParams: {
    duration: 3,
    maxScaleX: 1.15,
    minScaleX: 0.92,
    maxScaleY: 1.08,
    minScaleY: 0.85,
    startBorderRadius: '0.5rem',
    maxBorderRadius: '2rem',
    maxRotation: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.8)',
    width: '200px',
    height: '200px',
    loop: true,
    easingType: 'spring',
  },
  dependencies: {},
};

// Export preset
export const elasticBreathePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
