/**
 * ScaleRotateCascade Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset combines scaling and rotation animations in a cascading sequence.
 * Elements scale up while rotating, creating a dynamic spiral-in effect. Supports oscillation mode
 * where elements scale and rotate back and forth. Includes customizable transform origin and 3D rotation
 * (rotateX/Y/Z) for more complex effects.
 *
 * Features:
 * - **Cascading Animation**: Elements animate with staggered delays (cascadeDelay)
 * - **Scale + Rotation**: Simultaneous scale and rotate animations
 * - **Spiral Direction**: Clockwise or counter-clockwise rotation
 * - **Oscillate Mode**: Scale and rotate back and forth
 * - **Transform Origin**: Customizable center point for rotation/scale
 * - **3D Rotation Support**: Use rotateX/Y/Z for complex 3D effects
 *
 * Use cases:
 * - Creating dynamic spiral-in effects for element sequences
 * - Building cascading animations with scale and rotation
 * - Adding oscillating motion effects
 * - Creating complex 3D rotation animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the cascade effect to'),
  scaleFrom: z
    .number()
    .min(0)
    .default(0.5)
    .describe('Starting scale value (default: 0.5)'),
  scaleTo: z
    .number()
    .min(0)
    .default(1)
    .describe('Ending scale value (default: 1)'),
  rotationDegrees: z
    .number()
    .default(360)
    .describe('Total rotation amount in degrees (default: 360)'),
  cascadeDelay: z
    .number()
    .min(0)
    .default(100)
    .describe('Delay between elements in milliseconds (default: 100ms)'),
  spiralDirection: z
    .enum(['clockwise', 'counter-clockwise'])
    .default('clockwise')
    .describe('Direction of rotation spiral'),
  oscillate: z
    .boolean()
    .default(false)
    .describe('Enable oscillate mode - scale and rotate back and forth'),
  transformOrigin: z
    .string()
    .default('center')
    .describe(
      'Transform origin for rotation and scale (e.g., "center", "top left", "50% 50%")',
    ),
  use3D: z
    .boolean()
    .default(false)
    .describe('Enable 3D rotation mode (uses rotateX/Y/Z)'),
  rotateX: z
    .number()
    .default(0)
    .optional()
    .describe('3D rotation around X axis in degrees (only if use3D is true)'),
  rotateY: z
    .number()
    .default(0)
    .optional()
    .describe('3D rotation around Y axis in degrees (only if use3D is true)'),
  rotateZ: z
    .number()
    .default(0)
    .optional()
    .describe('3D rotation around Z axis in degrees (only if use3D is true)'),
  duration: z
    .number()
    .min(0)
    .default(1000)
    .describe('Duration of each element animation in milliseconds (default: 1000ms)'),
  easing: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'])
    .default('ease-in-out')
    .describe('Easing function for the animation'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    scaleFrom,
    scaleTo,
    rotationDegrees,
    cascadeDelay,
    spiralDirection,
    oscillate,
    transformOrigin,
    use3D,
    rotateX,
    rotateY,
    rotateZ,
    duration,
    easing,
    effectIdPrefix,
  } = params;

  // Convert milliseconds to seconds for effect timing
  const cascadeDelaySeconds = cascadeDelay / 1000;
  const durationSeconds = duration / 1000;

  // Calculate rotation direction multiplier
  const rotationMultiplier = spiralDirection === 'clockwise' ? 1 : -1;

  // Create effects array for all target elements
  const effects = targetIds.map((targetId, index) => {
    // Calculate start time for this element (cascading)
    const startTime = index * cascadeDelaySeconds;

    // Build scale animation ranges
    const scaleRanges = oscillate
      ? [
          { key: 'scale', val: scaleFrom, prog: 0 },
          { key: 'scale', val: scaleTo, prog: 0.5 },
          { key: 'scale', val: scaleFrom, prog: 1 },
        ]
      : [
          { key: 'scale', val: scaleFrom, prog: 0 },
          { key: 'scale', val: scaleTo, prog: 1 },
        ];

    // Build rotation animation ranges
    let rotateRanges: Array<{ key: string; val: number; prog: number }> = [];

    if (use3D) {
      // 3D rotation mode
      const finalRotateX = (rotateX ?? 0) * rotationMultiplier;
      const finalRotateY = (rotateY ?? 0) * rotationMultiplier;
      const finalRotateZ = (rotateZ ?? 0) * rotationMultiplier;

      if (oscillate) {
        // Oscillate mode for 3D
        if (rotateX !== undefined && rotateX !== 0) {
          rotateRanges.push(
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: finalRotateX, prog: 0.5 },
            { key: 'rotateX', val: 0, prog: 1 },
          );
        }
        if (rotateY !== undefined && rotateY !== 0) {
          rotateRanges.push(
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: finalRotateY, prog: 0.5 },
            { key: 'rotateY', val: 0, prog: 1 },
          );
        }
        if (rotateZ !== undefined && rotateZ !== 0) {
          rotateRanges.push(
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: finalRotateZ, prog: 0.5 },
            { key: 'rotateZ', val: 0, prog: 1 },
          );
        }
      } else {
        // Normal mode for 3D
        if (rotateX !== undefined && rotateX !== 0) {
          rotateRanges.push(
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: finalRotateX, prog: 1 },
          );
        }
        if (rotateY !== undefined && rotateY !== 0) {
          rotateRanges.push(
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: finalRotateY, prog: 1 },
          );
        }
        if (rotateZ !== undefined && rotateZ !== 0) {
          rotateRanges.push(
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: finalRotateZ, prog: 1 },
          );
        }
      }
    } else {
      // 2D rotation mode (standard rotate)
      const finalRotation = rotationDegrees * rotationMultiplier;

      if (oscillate) {
        rotateRanges = [
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: finalRotation, prog: 0.5 },
          { key: 'rotate', val: 0, prog: 1 },
        ];
      } else {
        rotateRanges = [
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: finalRotation, prog: 1 },
        ];
      }
    }

    // Combine scale and rotation ranges
    const combinedRanges = [...scaleRanges, ...rotateRanges];

    // Add transform origin to ranges
    combinedRanges.push({
      key: 'transformOrigin',
      val: transformOrigin,
      prog: 0,
    });

    // Build effect data
    const effectData: GenericEffectData = {
      type: easing,
      start: startTime,
      duration: durationSeconds,
      mode: 'provider',
      targetIds: [targetId],
      ranges: combinedRanges,
    };

    // Create effect node
    return {
      id: effectIdPrefix
        ? `${effectIdPrefix}-scale-rotate-${index}-${targetId}`
        : `scale-rotate-cascade-${index}-${targetId}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Return effects in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'scale-rotate-cascade-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
        } as RenderableComponentData,
      ] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'ScaleRotateCascade',
  title: 'Scale Rotate Cascade Effect',
  description:
    'Internal effect preset that combines scaling and rotation animations in a cascading sequence. Elements scale up while rotating, creating a dynamic spiral-in effect. Supports oscillation, custom transform origins, and 3D rotations (rotateX/Y/Z) for complex effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'internal',
    'generic',
    'scale',
    'rotate',
    'cascade',
    'spiral',
    '3d',
    'oscillate',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['element-1', 'element-2', 'element-3'],
    scaleFrom: 0.5,
    scaleTo: 1,
    rotationDegrees: 360,
    cascadeDelay: 100,
    spiralDirection: 'clockwise',
    oscillate: false,
    transformOrigin: 'center',
    use3D: false,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    duration: 1000,
    easing: 'ease-in-out',
  },
};

export const ScaleRotateCascadePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
