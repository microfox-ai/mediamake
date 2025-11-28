/**
 * Spiral Settle Text Entrance Preset
 *
 * This preset creates a dynamic 3D spiral text entrance with helical trajectory,
 * overshoot-and-settle motion in all axes (rotateY, rotateZ, translateX/Z, scale),
 * opacity fade, and playful corkscrew physics. Perfect for creative projects and
 * motion-heavy presentations.
 *
 * Features:
 * - **3D Spiral Motion**: Text spirals in with corkscrew helical trajectory
 * - **Overshoot & Settle**: Rotation, translation, and scale all overshoot before settling
 * - **Z-Axis Depth**: True 3D effect with translateZ creating depth perception
 * - **Sine Wave Path**: translateX follows sine function for authentic spiral motion
 * - **Smooth Transitions**: Ease-out primary with ease-in-out settle phase
 * - **Opacity Fade**: Quick fade-in during first 30% of animation
 * - **Performance Optimized**: backface-visibility and will-change for smooth rendering
 *
 * Use cases:
 * - Dynamic title reveals for creative projects
 * - Energetic section transitions in presentations
 * - Eye-catching text intros for motion graphics
 * - Playful brand animations
 * - Social media content with high visual impact
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('SPIRAL SETTLE')
    .describe('Text content to display with spiral animation'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (e.g., "bold", "700", "normal")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex, rgb, or CSS color name)'),
  fontFamily: z
    .string()
    .optional()
    .describe('Optional font family (Google Font name)'),
  duration: z
    .number()
    .min(0.3)
    .max(5)
    .default(1.2)
    .describe('Total animation duration in seconds'),
  overshootTiming: z
    .number()
    .min(0.5)
    .max(0.9)
    .default(0.75)
    .describe(
      'Progress point (0-1) where overshoot peaks before settling (default: 0.75)',
    ),
  rotationIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Multiplier for rotation intensity (affects both Y and Z rotation)'),
  translationIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Multiplier for translation intensity (affects X and Z movement)'),
  scaleIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Multiplier for scale animation intensity'),
  perspective: z
    .number()
    .min(400)
    .max(2000)
    .default(800)
    .describe('CSS perspective value for 3D depth (in pixels)'),
  fadeInDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe(
      'Duration of opacity fade-in as fraction of total duration (0-1)',
    ),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontWeight,
    textColor,
    fontFamily,
    duration,
    overshootTiming,
    rotationIntensity,
    translationIntensity,
    scaleIntensity,
    perspective,
    fadeInDuration,
  } = params;

  // Calculate timing values
  const fadeInSeconds = duration * fadeInDuration;

  // IDs
  const rootContainerId = 'spiral-settle-root-container';
  const textWrapperId = 'spiral-settle-text-wrapper';
  const textAtomId = 'spiral-settle-text-atom';

  // Create sine wave translateX keyframes for spiral motion
  // The spiral path uses multiple keyframes to create smooth helical motion
  const spiralXKeyframes = [
    { key: 'translateX', val: -100 * translationIntensity, prog: 0 },
    { key: 'translateX', val: 50 * translationIntensity, prog: 0.25 },
    { key: 'translateX', val: -30 * translationIntensity, prog: 0.5 },
    { key: 'translateX', val: 15 * translationIntensity, prog: overshootTiming },
    { key: 'translateX', val: 0, prog: 1 },
  ];

  // Create 3D rotation and translation effect
  const spiral3DEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textWrapperId],
    ranges: [
      // RotateY: 720deg → -30deg overshoot → 0
      { key: 'rotateY', val: 720 * rotationIntensity, prog: 0 },
      { key: 'rotateY', val: -30 * rotationIntensity, prog: overshootTiming },
      { key: 'rotateY', val: 0, prog: 1 },
      // RotateZ: 180deg → -10deg overshoot → 0
      { key: 'rotateZ', val: 180 * rotationIntensity, prog: 0 },
      { key: 'rotateZ', val: -10 * rotationIntensity, prog: overshootTiming },
      { key: 'rotateZ', val: 0, prog: 1 },
      // TranslateZ: -200px → 20px overshoot → 0 (depth)
      { key: 'translateZ', val: -200 * translationIntensity, prog: 0 },
      { key: 'translateZ', val: 20 * translationIntensity, prog: overshootTiming },
      { key: 'translateZ', val: 0, prog: 1 },
      // Scale: 0.5 → 1.1 overshoot → 1
      { key: 'scale', val: 0.5 * scaleIntensity, prog: 0 },
      { key: 'scale', val: 1.1 * scaleIntensity, prog: overshootTiming },
      { key: 'scale', val: 1, prog: 1 },
      // Spiral translateX (sine wave pattern)
      ...spiralXKeyframes,
    ],
  };

  const spiral3DEffectNode = {
    id: 'spiral-3d-transform-effect',
    componentId: 'generic',
    data: spiral3DEffect,
  };

  // Create opacity fade effect
  const opacityFadeEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: fadeInSeconds,
    mode: 'provider',
    targetIds: [textWrapperId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  const opacityFadeEffectNode = {
    id: 'spiral-opacity-fade-effect',
    componentId: 'generic',
    data: opacityFadeEffect,
  };

  // Create text atom
  const textAtom = {
    id: textAtomId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: textColor,
        textAlign: 'center' as const,
      },
      ...(fontFamily
        ? {
            font: {
              family: fontFamily,
              weights: [fontWeight === 'bold' ? '700' : '400'],
              display: 'swap' as const,
            },
          }
        : {}),
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData;

  // Create text wrapper with 3D transform properties
  const textWrapper = {
    id: textWrapperId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        style: {
          transformOrigin: 'center',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden' as const,
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [spiral3DEffectNode, opacityFadeEffectNode],
    childrenData: [textAtom],
  } as RenderableComponentData;

  // Create root container with perspective
  const rootContainer = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: `${perspective}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textWrapper],
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
  id: 'spiral-settle-text',
  title: 'Spiral Settle Text Entrance',
  description:
    'Dynamic 3D spiral text entrance with helical trajectory, overshoot-and-settle motion in all axes (rotateY, rotateZ, translateX/Z, scale), opacity fade, and playful corkscrew physics. Perfect for creative projects and motion-heavy presentations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    '3d',
    'spiral',
    'entrance',
    'dynamic',
    'creative',
    'overshoot',
    'helical',
    'corkscrew',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SPIRAL SETTLE',
    fontSize: 72,
    fontWeight: 'bold',
    textColor: '#ffffff',
    duration: 1.2,
    overshootTiming: 0.75,
    rotationIntensity: 1,
    translationIntensity: 1,
    scaleIntensity: 1,
    perspective: 800,
    fadeInDuration: 0.3,
  },
};

// Export preset
export const spiralSettleTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
