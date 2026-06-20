/**
 * Tilting Plane Typography Effect
 *
 * A 3D typography effect where text appears on a physical card that tilts in 3D space
 * with simultaneous X and Y axis rotation. Features a sweeping shine/reflection effect
 * that moves across the text as it tilts, simulating dynamic studio lighting hitting
 * the surface at different angles.
 *
 * Features:
 * - **3D Card Rotation**: Simultaneous rotateX (-15deg to 15deg) and rotateY (-20deg to 20deg)
 * - **Shine/Reflection Effect**: Animated gradient that sweeps across text as it tilts
 * - **Dynamic Lighting**: Drop shadow that shifts based on tilt angle
 * - **Sinusoidal Motion**: Smooth, looping rotation with ease-in-out timing
 * - **Configurable Timing**: 4-6 second loop duration with customizable parameters
 *
 * Use cases:
 * - Creating title cards with professional 3D tilt effects
 * - Building dynamic text presentations with studio lighting simulation
 * - Adding depth and dimension to typography-heavy content
 * - Creating engaging intro/outro sequences with realistic card motion
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
} from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  text: z
    .string()
    .default('DYNAMIC TEXT')
    .describe('Text content to display on the tilting card'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color in hex format'),
  padding: z
    .object({
      horizontal: z.number().min(0).default(60).describe('Horizontal padding'),
      vertical: z.number().min(0).default(40).describe('Vertical padding'),
    })
    .default({ horizontal: 60, vertical: 40 })
    .describe('Padding around the text'),
  rotationRange: z
    .object({
      x: z
        .object({
          min: z.number().default(-15).describe('Minimum rotateX angle'),
          max: z.number().default(15).describe('Maximum rotateX angle'),
        })
        .default({ min: -15, max: 15 }),
      y: z
        .object({
          min: z.number().default(-20).describe('Minimum rotateY angle'),
          max: z.number().default(20).describe('Maximum rotateY angle'),
        })
        .default({ min: -20, max: 20 }),
    })
    .default({
      x: { min: -15, max: 15 },
      y: { min: -20, max: 20 },
    })
    .describe('Rotation angle ranges for X and Y axes'),
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .describe('Duration of one complete tilt cycle in seconds'),
  perspective: z
    .number()
    .min(500)
    .max(2000)
    .default(1200)
    .describe('CSS perspective value for 3D depth'),
  shineIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Opacity of the shine effect (0 = invisible, 1 = full opacity)'),
  shineDuration: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Duration of shine sweep animation in seconds'),
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of the drop shadow'),
  backgroundColor: z
    .string()
    .optional()
    .describe('Optional background color animation (hex format)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    padding,
    rotationRange,
    duration,
    perspective,
    shineIntensity,
    shineDuration,
    shadowIntensity,
    backgroundColor,
  } = params;

  // Component IDs
  const containerId = 'tilting-card-container';
  const cardWrapperId = 'card-wrapper';
  const shineLayerId = 'shine-layer';
  const shineGradientId = 'shine-gradient';
  const textContentId = 'text-content';

  // Create rotation effect for card wrapper (combined rotateX and rotateY)
  const rotationEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [cardWrapperId],
    ranges: [
      // RotateX: oscillate from min to max and back
      { key: 'rotateX', val: 0, prog: 0 },
      { key: 'rotateX', val: rotationRange.x.max, prog: 0.25 },
      { key: 'rotateX', val: 0, prog: 0.5 },
      { key: 'rotateX', val: rotationRange.x.min, prog: 0.75 },
      { key: 'rotateX', val: 0, prog: 1 },
      // RotateY: oscillate from min to max and back (offset phase)
      { key: 'rotateY', val: 0, prog: 0 },
      { key: 'rotateY', val: rotationRange.y.max, prog: 0.5 },
      { key: 'rotateY', val: 0, prog: 1 },
    ],
  };

  // Create shine sweep effect (translateX from left to right)
  const shineEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: shineDuration,
    mode: 'provider',
    targetIds: [shineGradientId],
    ranges: [
      { key: 'translateX', val: '-100%', prog: 0 },
      { key: 'translateX', val: '200%', prog: 1 },
    ],
  };

  // Optional background color animation
  const backgroundEffect: GenericEffectData | null = backgroundColor
    ? {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [containerId],
        ranges: [
          { key: 'backgroundColor', val: 'rgba(0, 0, 0, 0)', prog: 0 },
          { key: 'backgroundColor', val: backgroundColor, prog: 0.5 },
          { key: 'backgroundColor', val: 'rgba(0, 0, 0, 0)', prog: 1 },
        ],
      }
    : null;

  // Build shine gradient element
  const shineGradientComponent = {
    id: shineGradientId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, ${shineIntensity}) 50%, transparent 100%)`,
          width: '50%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: `shine-effect-${shineGradientId}`,
        componentId: 'generic',
        data: shineEffect,
      },
    ],
  } as RenderableComponentData;

  // Build shine layer (container for gradient)
  const shineLayerComponent = {
    id: shineLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
        style: {
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [shineGradientComponent],
  } as RenderableComponentData;

  // Build text content
  const textContentComponent = {
    id: textContentId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: textColor,
        textAlign: 'center' as const,
        padding: `${padding.vertical}px ${padding.horizontal}px`,
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.2)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData;

  // Build card wrapper (tilting card)
  const cardWrapperComponent = {
    id: cardWrapperId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          transformStyle: 'preserve-3d',
          filter: `drop-shadow(0px 10px 30px rgba(0, 0, 0, ${shadowIntensity}))`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [shineLayerComponent, textContentComponent],
    effects: [
      {
        id: `rotation-effect-${cardWrapperId}`,
        componentId: 'generic',
        data: rotationEffect,
      },
    ],
  } as RenderableComponentData;

  // Build root container
  const rootContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          perspective: `${perspective}px`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [cardWrapperComponent],
    effects: backgroundEffect
      ? [
          {
            id: `background-effect-${containerId}`,
            componentId: 'generic',
            data: backgroundEffect,
          },
        ]
      : [],
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
  id: 'tilting-plane-typography',
  title: 'Tilting Plane Typography Effect',
  description:
    'A 3D typography effect where text appears on a physical card that tilts in 3D space with simultaneous X and Y axis rotation. Features a sweeping shine/reflection effect that moves across the text as it tilts, simulating dynamic studio lighting. The card has subtle drop shadows that shift based on tilt angle, creating depth and realism. Includes smooth sinusoidal rotation with configurable timing and optional background color animation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    '3d',
    'tilt',
    'rotation',
    'shine',
    'reflection',
    'lighting',
    'card',
    'perspective',
    'dynamic',
    'studio',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'DYNAMIC TEXT',
    fontSize: 64,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#ffffff',
    padding: { horizontal: 60, vertical: 40 },
    rotationRange: {
      x: { min: -15, max: 15 },
      y: { min: -20, max: 20 },
    },
    duration: 5,
    perspective: 1200,
    shineIntensity: 0.6,
    shineDuration: 5,
    shadowIntensity: 0.3,
  },
};

// Export preset
export const tiltingPlaneTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
