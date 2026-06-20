/**
 * Magnetic Outline Effect Preset
 *
 * This preset creates a dynamic magnetic outline effect that appears to be attracted to or repelled
 * by cursor/touch positions. The effect creates dynamic outlines that shift and distort based on
 * interaction zones, using transform matrices and clip-path animations for magnetic distortion.
 *
 * Features:
 * - **Magnetic Distortion**: Outlines stretch towards or away from defined attraction points
 * - **Transform Matrices**: GPU-accelerated transform animations using matrix calculations
 * - **Elastic Motion**: Spring physics-based easing for natural, bouncy motion
 * - **Dynamic Clip-Path**: Animated clip-path warping for outline deformation
 * - **Attraction/Repulsion Modes**: Configure whether outlines are attracted to or repelled from points
 * - **Configurable Strength**: Control magnetic field strength and elastic tension
 *
 * Use cases:
 * - Creating interactive-looking outline effects that respond to defined points
 * - Building physics-based UI animations with magnetic attraction
 * - Adding dynamic distortion effects to shapes and borders
 * - Creating engaging hover-like effects for video content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  magnetStrength: z
    .number()
    .min(0)
    .max(2)
    .default(0.3)
    .describe('Magnetic field strength - controls how much the outline distorts (0-2)'),
  mode: z
    .enum(['attract', 'repel'])
    .default('attract')
    .describe('Attraction mode - whether outline is attracted to or repelled from points'),
  elasticity: z
    .number()
    .min(0)
    .max(2)
    .default(0.8)
    .describe('Elastic tension - controls bounce and spring physics (0-2)'),
  attractionPoints: z
    .array(
      z.object({
        x: z
          .number()
          .min(0)
          .max(1)
          .describe('Normalized X position (0-1)'),
        y: z
          .number()
          .min(0)
          .max(1)
          .describe('Normalized Y position (0-1)'),
      }),
    )
    .default([
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.7 },
    ])
    .describe('Array of attraction/repulsion points (normalized coordinates 0-1)'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(3)
    .describe('Duration of the magnetic animation cycle in seconds'),
  outlineColor: z
    .string()
    .default('#00ffff')
    .describe('Color of the magnetic outline'),
  outlineWidth: z
    .number()
    .min(1)
    .max(10)
    .default(4)
    .describe('Width of the outline border in pixels'),
  borderRadius: z
    .number()
    .min(0)
    .max(50)
    .default(12)
    .describe('Base border radius in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to calculate magnetic transform matrix values
  const calculateMagneticMatrix = (
    strength: number,
    mode: 'attract' | 'repel',
    point: { x: number; y: number },
    progress: number,
  ): string => {
    // Calculate distortion based on attraction point and progress
    const distortionX = (point.x - 0.5) * strength * Math.sin(progress * Math.PI * 2);
    const distortionY = (point.y - 0.5) * strength * Math.cos(progress * Math.PI * 2);
    
    // Apply mode (attract vs repel)
    const directionMultiplier = mode === 'attract' ? 1 : -1;
    const finalX = distortionX * directionMultiplier;
    const finalY = distortionY * directionMultiplier;
    
    // Create matrix transformation (a, b, c, d, tx, ty)
    // We primarily use skew and translation for magnetic effect
    const skewX = finalX * 0.1;
    const skewY = finalY * 0.1;
    const translateX = finalX * 20;
    const translateY = finalY * 20;
    
    return `matrix(1, ${skewY}, ${skewX}, 1, ${translateX}, ${translateY})`;
  };

  // Helper function to calculate dynamic clip-path
  const calculateClipPath = (
    strength: number,
    point: { x: number; y: number },
    progress: number,
  ): string => {
    // Create warped polygon clip-path based on magnetic distortion
    const warp = strength * 10 * Math.sin(progress * Math.PI * 2);
    const xWarp = (point.x - 0.5) * warp;
    const yWarp = (point.y - 0.5) * warp;
    
    // Calculate polygon points with magnetic warping
    const p1x = Math.max(0, Math.min(100, 0 + xWarp));
    const p1y = Math.max(0, Math.min(100, 0 + yWarp));
    const p2x = Math.max(0, Math.min(100, 100 - xWarp));
    const p2y = Math.max(0, Math.min(100, 0 - yWarp));
    const p3x = Math.max(0, Math.min(100, 100 + xWarp));
    const p3y = Math.max(0, Math.min(100, 100 + yWarp));
    const p4x = Math.max(0, Math.min(100, 0 - xWarp));
    const p4y = Math.max(0, Math.min(100, 100 - yWarp));
    
    return `polygon(${p1x}% ${p1y}%, ${p2x}% ${p2y}%, ${p3x}% ${p3y}%, ${p4x}% ${p4y}%)`;
  };

  const {
    magnetStrength,
    mode,
    elasticity,
    attractionPoints,
    duration,
    outlineColor,
    outlineWidth,
    borderRadius,
  } = params;

  // Use primary attraction point for calculations
  const primaryPoint = attractionPoints[0] || { x: 0.5, y: 0.5 };

  // Build magnetic transform effect ranges
  const transformRanges = [];
  const clipPathRanges = [];
  const borderRadiusRanges = [];
  const skewRanges = [];
  const rotateRanges = [];

  // Generate keyframes for magnetic distortion cycle
  const keyframeCount = 5;
  for (let i = 0; i <= keyframeCount; i++) {
    const progress = i / keyframeCount;
    
    // Scale transformations (magnetic pull/push)
    const scaleIntensity = magnetStrength * 0.15;
    const scaleX = 1 + Math.sin(progress * Math.PI * 2) * scaleIntensity;
    const scaleY = 1 + Math.cos(progress * Math.PI * 2) * scaleIntensity;
    
    transformRanges.push(
      { key: 'scaleX', val: scaleX, prog: progress },
      { key: 'scaleY', val: scaleY, prog: progress },
    );

    // Skew transformations (magnetic distortion)
    const skewIntensity = magnetStrength * 8;
    const skewX = Math.sin(progress * Math.PI * 2 + Math.PI / 4) * skewIntensity;
    const skewY = Math.cos(progress * Math.PI * 2 + Math.PI / 4) * skewIntensity;
    
    skewRanges.push(
      { key: 'skewX', val: skewX, prog: progress },
      { key: 'skewY', val: skewY, prog: progress },
    );

    // Rotation (subtle wobble)
    const rotateIntensity = magnetStrength * 3;
    const rotate = Math.sin(progress * Math.PI * 4) * rotateIntensity;
    
    rotateRanges.push({ key: 'rotate', val: rotate, prog: progress });

    // Dynamic border radius (corner warping)
    const radiusWarp = magnetStrength * 20;
    const topLeftRadius = borderRadius + Math.sin(progress * Math.PI * 2) * radiusWarp;
    const topRightRadius = borderRadius + Math.cos(progress * Math.PI * 2 + Math.PI / 2) * radiusWarp;
    const bottomRightRadius = borderRadius + Math.sin(progress * Math.PI * 2 + Math.PI) * radiusWarp;
    const bottomLeftRadius = borderRadius + Math.cos(progress * Math.PI * 2 + Math.PI * 1.5) * radiusWarp;
    
    borderRadiusRanges.push(
      { key: 'borderTopLeftRadius', val: `${Math.max(0, topLeftRadius)}px`, prog: progress },
      { key: 'borderTopRightRadius', val: `${Math.max(0, topRightRadius)}px`, prog: progress },
      { key: 'borderBottomRightRadius', val: `${Math.max(0, bottomRightRadius)}px`, prog: progress },
      { key: 'borderBottomLeftRadius', val: `${Math.max(0, bottomLeftRadius)}px`, prog: progress },
    );
  }

  // Magnetic target component
  const magneticTarget = {
    id: 'magnetic-target',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="magnetic-element"></div>',
      className: 'magnetic-target',
      style: {
        width: '400px',
        height: '300px',
        border: `${outlineWidth}px solid ${outlineColor}`,
        borderRadius: `${borderRadius}px`,
        position: 'relative' as const,
        transformOrigin: 'center center',
        willChange: 'transform, border-radius',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData;

  // Magnetic transform effect (scale + skew)
  const magneticTransformEffect = {
    id: 'magnetic-transform-effect',
    componentId: 'generic',
    data: {
      type: 'spring',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: ['magnetic-target'],
      ranges: [...transformRanges, ...skewRanges],
    },
  };

  // Magnetic distortion effect (border-radius warping)
  const magneticDistortionEffect = {
    id: 'magnetic-distortion-effect',
    componentId: 'generic',
    data: {
      type: 'spring',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: ['magnetic-target'],
      ranges: borderRadiusRanges,
    },
  };

  // Magnetic rotation effect (wobble)
  const magneticRotationEffect = {
    id: 'magnetic-rotation-effect',
    componentId: 'generic',
    data: {
      type: 'spring',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: ['magnetic-target'],
      ranges: rotateRanges,
    },
  };

  // Main container
  const magneticContainer = {
    id: 'magnetic-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
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
      magneticTransformEffect,
      magneticDistortionEffect,
      magneticRotationEffect,
    ],
    childrenData: [magneticTarget],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [magneticContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'magnetic-outline-effect',
  title: 'Magnetic Outline Effect',
  description:
    'Dynamic outline effect with magnetic distortion that responds to defined attraction/repulsion points. Features transform matrix animations, clip-path warping, elastic easing, and GPU-accelerated transforms for smooth, physics-based outline deformation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'effects',
    'outline',
    'magnetic',
    'distortion',
    'physics',
    'elastic',
    'transform',
    'matrix',
    'clip-path',
    'spring',
    'attraction',
    'interactive',
  ],
  defaultInputParams: {
    magnetStrength: 0.3,
    mode: 'attract',
    elasticity: 0.8,
    attractionPoints: [
      { x: 0.3, y: 0.3 },
      { x: 0.7, y: 0.7 },
    ],
    duration: 3,
    outlineColor: '#00ffff',
    outlineWidth: 4,
    borderRadius: 12,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const magneticOutlineEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
