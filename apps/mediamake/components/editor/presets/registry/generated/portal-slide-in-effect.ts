/**
 * Portal Slide-In Effect (Internal Effect Preset)
 *
 * ARRAY OF EFFECTS:
 * Creates a futuristic dimensional portal entrance effect where elements appear to slide through
 * space-time with warping, distortion, compression/expansion, and optional particle streams.
 *
 * Features:
 * - 3D perspective transforms (perspective, rotateX, rotateY) for spatial warping
 * - Scale transforms for stretch/compress (scaleX, scaleY) during dimensional travel
 * - Filter effects for portal glow (brightness, hue-rotate animations)
 * - Animated clip-path for portal masking (circular, rectangular, irregular shapes)
 * - Optional particle stream effect using box-shadow for trailing light particles
 * - Configurable portal shape, warp intensity, color, entry/exit points, and travel duration
 *
 * Use cases:
 * - Futuristic element entrances with dimensional portal effects
 * - Space-time travel animations for sci-fi content
 * - 3D warping transitions between scenes
 * - Portal-based reveal effects with particle trails
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema for portal slide-in effect
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply the portal effect to'),
  portalShape: z
    .enum(['circular', 'rectangular', 'irregular'])
    .default('circular')
    .describe('Shape of the portal masking effect'),
  warpIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of 3D warping distortion (0 = none, 1 = maximum)'),
  portalColor: z
    .string()
    .default('#00ffff')
    .describe('Glow color for portal energy effect'),
  entryPoint: z
    .object({
      x: z.number().describe('Entry X coordinate in pixels'),
      y: z.number().describe('Entry Y coordinate in pixels'),
    })
    .describe('Starting screen coordinates for portal entry'),
  exitPoint: z
    .object({
      x: z.number().describe('Exit X coordinate in pixels'),
      y: z.number().describe('Exit Y coordinate in pixels'),
    })
    .describe('Final position coordinates after portal travel'),
  travelDuration: z
    .number()
    .default(1000)
    .describe('Duration of portal travel animation in milliseconds'),
  particleStream: z
    .boolean()
    .optional()
    .describe('Enable trailing light particles during travel'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of effect relative to component (seconds)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the portal effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to convert hex color to RGB for hue-rotate calculation
  const hexToHueRotate = (hex: string): number => {
    // Simple mapping of common colors to hue-rotate values
    const colorMap: Record<string, number> = {
      '#ff0000': 0, // red
      '#ff8800': 30, // orange
      '#ffff00': 60, // yellow
      '#00ff00': 120, // green
      '#00ffff': 180, // cyan
      '#0088ff': 210, // light blue
      '#0000ff': 240, // blue
      '#8800ff': 270, // purple
      '#ff00ff': 300, // magenta
    };

    const normalized = hex.toLowerCase();
    if (colorMap[normalized] !== undefined) {
      return colorMap[normalized];
    }

    // Default to cyan hue for unknown colors
    return 180;
  };

  // Calculate parameters
  const travelDurationSec = params.travelDuration / 1000;
  const warpIntensity = params.warpIntensity ?? 0.7;
  const portalHue = hexToHueRotate(params.portalColor);

  // Calculate horizontal and vertical travel distances
  const translateXValues = [
    params.entryPoint.x,
    params.entryPoint.x + (params.exitPoint.x - params.entryPoint.x) * 0.2,
    params.entryPoint.x + (params.exitPoint.x - params.entryPoint.x) * 0.5,
    params.entryPoint.x + (params.exitPoint.x - params.entryPoint.x) * 0.8,
    params.exitPoint.x,
  ];

  const translateYValues = [
    params.entryPoint.y,
    params.entryPoint.y + (params.exitPoint.y - params.entryPoint.y) * 0.2,
    params.entryPoint.y + (params.exitPoint.y - params.entryPoint.y) * 0.5,
    params.entryPoint.y + (params.exitPoint.y - params.entryPoint.y) * 0.8,
    params.exitPoint.y,
  ];

  // Calculate rotation values based on warp intensity
  const rotateXValues = [
    0,
    warpIntensity * 45,
    warpIntensity * 90,
    warpIntensity * 45,
    0,
  ];

  const rotateYValues = [
    0,
    warpIntensity * 180,
    warpIntensity * 360,
    warpIntensity * 180,
    0,
  ];

  // Calculate filter effects with portal color glow
  const filterValues = [
    'brightness(1)',
    `brightness(1.5) hue-rotate(${portalHue}deg)`,
    `brightness(2) hue-rotate(${portalHue}deg)`,
    `brightness(1.2) hue-rotate(${portalHue * 0.5}deg)`,
    'brightness(1)',
  ];

  // Calculate clip-path values based on portal shape
  const getClipPathValues = (): string[] => {
    switch (params.portalShape) {
      case 'circular':
        return [
          'circle(0% at 50% 50%)',
          'circle(60% at 50% 50%)',
          'circle(100% at 50% 50%)',
          'circle(150% at 50% 50%)',
        ];
      case 'rectangular':
        return [
          'inset(50% 50% 50% 50%)',
          'inset(30% 30% 30% 30%)',
          'inset(0% 0% 0% 0%)',
          'inset(0% 0% 0% 0%)',
        ];
      case 'irregular':
        return [
          'polygon(50% 50%, 50% 50%, 50% 50%)',
          'polygon(30% 20%, 70% 30%, 80% 80%, 20% 70%)',
          'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
          'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
        ];
      default:
        return [
          'circle(0% at 50% 50%)',
          'circle(60% at 50% 50%)',
          'circle(100% at 50% 50%)',
          'circle(150% at 50% 50%)',
        ];
    }
  };

  const clipPathValues = getClipPathValues();

  // Construct main portal effect
  const portalEffect: GenericEffectData = {
    type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' as any,
    start: params.effectStart,
    duration: travelDurationSec,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      // Horizontal travel
      { key: 'translateX', val: translateXValues[0], prog: 0 },
      { key: 'translateX', val: translateXValues[1], prog: 0.2 },
      { key: 'translateX', val: translateXValues[2], prog: 0.5 },
      { key: 'translateX', val: translateXValues[3], prog: 0.8 },
      { key: 'translateX', val: translateXValues[4], prog: 1 },
      // Vertical travel
      { key: 'translateY', val: translateYValues[0], prog: 0 },
      { key: 'translateY', val: translateYValues[1], prog: 0.2 },
      { key: 'translateY', val: translateYValues[2], prog: 0.5 },
      { key: 'translateY', val: translateYValues[3], prog: 0.8 },
      { key: 'translateY', val: translateYValues[4], prog: 1 },
      // 3D perspective warping
      { key: 'perspective', val: 2000, prog: 0 },
      { key: 'perspective', val: 500, prog: 0.2 },
      { key: 'perspective', val: 300, prog: 0.5 },
      { key: 'perspective', val: 500, prog: 0.8 },
      { key: 'perspective', val: 1000, prog: 1 },
      // X-axis rotation (depth)
      { key: 'rotateX', val: rotateXValues[0], prog: 0 },
      { key: 'rotateX', val: rotateXValues[1], prog: 0.2 },
      { key: 'rotateX', val: rotateXValues[2], prog: 0.5 },
      { key: 'rotateX', val: rotateXValues[3], prog: 0.8 },
      { key: 'rotateX', val: rotateXValues[4], prog: 1 },
      // Y-axis rotation (spin)
      { key: 'rotateY', val: rotateYValues[0], prog: 0 },
      { key: 'rotateY', val: rotateYValues[1], prog: 0.2 },
      { key: 'rotateY', val: rotateYValues[2], prog: 0.5 },
      { key: 'rotateY', val: rotateYValues[3], prog: 0.8 },
      { key: 'rotateY', val: rotateYValues[4], prog: 1 },
      // Horizontal stretch/compression
      { key: 'scaleX', val: 1, prog: 0 },
      { key: 'scaleX', val: 1.5, prog: 0.2 },
      { key: 'scaleX', val: 0.7, prog: 0.5 },
      { key: 'scaleX', val: 1.2, prog: 0.8 },
      { key: 'scaleX', val: 1, prog: 1 },
      // Vertical compression/expansion (inverse)
      { key: 'scaleY', val: 1, prog: 0 },
      { key: 'scaleY', val: 0.7, prog: 0.2 },
      { key: 'scaleY', val: 1.5, prog: 0.5 },
      { key: 'scaleY', val: 0.9, prog: 0.8 },
      { key: 'scaleY', val: 1, prog: 1 },
      // Portal glow filter
      { key: 'filter', val: filterValues[0], prog: 0 },
      { key: 'filter', val: filterValues[1], prog: 0.2 },
      { key: 'filter', val: filterValues[2], prog: 0.5 },
      { key: 'filter', val: filterValues[3], prog: 0.8 },
      { key: 'filter', val: filterValues[4], prog: 1 },
      // Clip-path masking
      { key: 'clipPath', val: clipPathValues[0], prog: 0 },
      { key: 'clipPath', val: clipPathValues[1], prog: 0.3 },
      { key: 'clipPath', val: clipPathValues[2], prog: 0.7 },
      { key: 'clipPath', val: clipPathValues[3], prog: 1 },
    ],
  };

  // Construct base effect node
  const baseEffect = {
    id: params.effectId || `portal-slide-in-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: portalEffect,
  };

  // Add particle stream effect if enabled
  const effects = [baseEffect];

  if (params.particleStream) {
    // Create trailing particle effect using box-shadow
    const particleEffect: GenericEffectData = {
      type: 'linear',
      start: params.effectStart,
      duration: travelDurationSec,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: [
        // Particle trail using multiple box-shadows
        {
          key: 'boxShadow',
          val: `0 0 20px ${params.portalColor}, 0 0 40px ${params.portalColor}`,
          prog: 0,
        },
        {
          key: 'boxShadow',
          val: `0 0 30px ${params.portalColor}, 0 0 60px ${params.portalColor}, 0 0 80px ${params.portalColor}`,
          prog: 0.5,
        },
        {
          key: 'boxShadow',
          val: `0 0 10px ${params.portalColor}, 0 0 20px ${params.portalColor}`,
          prog: 1,
        },
      ],
    };

    effects.push({
      id: `${params.effectId || 'portal-slide-in'}-particles-${params.targetIds.join('-')}`,
      componentId: 'generic',
      data: particleEffect,
    });
  }

  // Return effect output with container
  const effectContainer: RenderableComponentData = {
    id: 'portal-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: travelDurationSec + 1,
      },
    },
    effects: effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [effectContainer] as RenderableComponentData[],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'portal-slide-in-effect',
  title: 'Portal Slide-In Effect',
  description:
    'Internal effect preset that creates a futuristic dimensional portal entrance with 3D warping, distortion, compression/expansion, and optional particle streams. Elements appear to slide through space-time with perspective transforms, scale morphing, filter glow effects, and animated clip-path masking.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'portal',
    'slide-in',
    '3d',
    'warp',
    'distortion',
    'futuristic',
    'dimensional',
    'space-time',
    'particles',
    'glow',
    'internal',
    'generic',
  ],
  defaultInputParams: {
    targetIds: ['component-1'],
    portalShape: 'circular',
    warpIntensity: 0.7,
    portalColor: '#00ffff',
    entryPoint: { x: -200, y: 0 },
    exitPoint: { x: 0, y: 0 },
    travelDuration: 1000,
    particleStream: false,
    effectStart: 0,
  },
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const portalSlideInEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
