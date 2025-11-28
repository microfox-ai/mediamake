/**
 * Hinge Rotate Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Simulates a door hinge or book page turn animation using 2D transforms. The effect rotates
 * elements from specific anchor points (edges or corners) with realistic physics-based easing.
 * Includes parameters for hinge position (left, right, top, bottom, or specific corner),
 * rotation arc, gravity influence (affecting acceleration), and bounce-back elasticity.
 *
 * Features:
 * - **Hinge Position**: Rotate from left, right, top, bottom, or corners (top-left, top-right, bottom-left, bottom-right)
 * - **Physics-Based Motion**: Spring easing with gravity factor for realistic acceleration
 * - **Elasticity & Bounce**: Configurable bounce-back with decay
 * - **Swing Mode**: Element oscillates like a hanging sign
 * - **Fall Mode**: Element drops and bounces with gravity
 * - **Transform Origin**: Automatically sets anchor point based on hinge position
 *
 * Use cases:
 * - Door opening/closing animations
 * - Book page turning effects
 * - Card flipping from edges
 * - Hanging sign oscillation
 * - Gravity-based drop and bounce
 * - More realistic rotation animations compared to center-point rotation
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the hinge rotation effect'),
  effectStart: z
    .number()
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  hingePosition: z
    .enum([
      'left',
      'right',
      'top',
      'bottom',
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
    ])
    .describe(
      'Position of the hinge anchor point (edge or corner where rotation occurs)',
    ),
  maxRotation: z
    .number()
    .min(-360)
    .max(360)
    .default(90)
    .describe('Maximum rotation angle in degrees (positive or negative)'),
  gravityFactor: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe(
      'Gravity influence factor affecting acceleration (0 = no gravity, higher = more gravity)',
    ),
  elasticity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe(
      'Bounce-back elasticity (0 = no bounce, 1 = maximum bounce with decay)',
    ),
  oscillations: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .describe(
      'Number of oscillations for swing mode (0 = no swing, higher = more swings)',
    ),
  mode: z
    .enum(['fall', 'swing'])
    .default('fall')
    .optional()
    .describe(
      'Animation mode: fall (drops and bounces) or swing (oscillates like hanging sign)',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID for the effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to calculate transform origin based on hinge position
  const getTransformOrigin = (
    position: typeof params.hingePosition,
  ): string => {
    const origins: Record<typeof params.hingePosition, string> = {
      left: '0% 50%',
      right: '100% 50%',
      top: '50% 0%',
      bottom: '50% 100%',
      'top-left': '0% 0%',
      'top-right': '100% 0%',
      'bottom-left': '0% 100%',
      'bottom-right': '100% 100%',
    };
    return origins[position];
  };

  // Helper function to determine rotation axis based on hinge position
  const getRotationAxis = (
    position: typeof params.hingePosition,
  ): 'rotateX' | 'rotateY' | 'rotateZ' => {
    if (position === 'left' || position === 'right') {
      return 'rotateY';
    } else if (position === 'top' || position === 'bottom') {
      return 'rotateX';
    }
    // For corners, use Z-axis (2D rotation)
    return 'rotateZ';
  };

  // Helper function to build animation ranges based on mode
  const buildAnimationRanges = (): any[] => {
    const rotationAxis = getRotationAxis(params.hingePosition);
    const maxRotation = params.maxRotation;
    const elasticity = params.elasticity;
    const oscillations = params.oscillations;
    const mode = params.mode || 'fall';

    const ranges: any[] = [];

    if (mode === 'swing' && oscillations > 0) {
      // Swing mode: oscillating motion with decay
      const segments = oscillations * 2 + 1; // Forward and back for each oscillation
      for (let i = 0; i <= segments; i++) {
        const progress = i / segments;
        const decay = Math.pow(1 - progress, 1.5); // Exponential decay
        const direction = i % 2 === 0 ? 1 : -1;
        const angle = maxRotation * decay * direction;

        ranges.push({
          key: rotationAxis,
          val: angle,
          prog: progress,
        });
      }
    } else {
      // Fall mode: drop and bounce with gravity
      const gravityFactor = params.gravityFactor;
      const bounceCount = Math.ceil(elasticity * 3); // More elasticity = more bounces

      // Initial rotation (influenced by gravity)
      ranges.push({
        key: rotationAxis,
        val: 0,
        prog: 0,
      });

      // Peak rotation with gravity acceleration
      const gravityInfluence = 0.3 + gravityFactor * 0.2;
      ranges.push({
        key: rotationAxis,
        val: maxRotation,
        prog: gravityInfluence,
      });

      // Bounce back with decay
      if (elasticity > 0 && bounceCount > 0) {
        const bounceSegmentDuration = (1 - gravityInfluence) / (bounceCount + 1);

        for (let i = 1; i <= bounceCount; i++) {
          const bounceProgress = gravityInfluence + i * bounceSegmentDuration;
          const bounceMagnitude =
            maxRotation * elasticity * Math.pow(0.5, i - 1);
          const direction = i % 2 === 0 ? 1 : -1;

          ranges.push({
            key: rotationAxis,
            val: bounceMagnitude * direction,
            prog: Math.min(bounceProgress, 1),
          });
        }
      }

      // Final settle at original position
      ranges.push({
        key: rotationAxis,
        val: 0,
        prog: 1,
      });
    }

    return ranges;
  };

  // Build effect data
  const effectData: GenericEffectData = {
    type: 'spring', // Spring easing for physics-based motion
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: buildAnimationRanges(),
  };

  // Build transform origin animation
  const transformOriginValue = getTransformOrigin(params.hingePosition);
  const transformOriginData: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      {
        key: 'transformOrigin',
        val: transformOriginValue,
        prog: 0,
      },
      {
        key: 'transformOrigin',
        val: transformOriginValue,
        prog: 1,
      },
    ],
  };

  // Create effects array
  const rotationEffect = {
    id:
      params.effectId ||
      `hinge-rotate-${params.hingePosition}-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  const transformOriginEffect = {
    id: `hinge-origin-${params.targetId}`,
    componentId: 'generic',
    data: transformOriginData,
  };

  // Return output with effects extracted for caller
  const rootContainer: RenderableComponentData = {
    id: 'hinge-rotate-effect-root',
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
        duration: params.effectDuration,
      },
    },
    effects: [rotationEffect, transformOriginEffect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      // Extract effects for easy access by caller
      _extractedEffects: [rotationEffect, transformOriginEffect],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'hingeRotate',
  title: 'Hinge Rotate Effect',
  description:
    'Internal effect preset that simulates door hinge or book page turn animations using 2D transforms. Rotates elements from edge/corner anchor points with physics-based spring easing. Supports swing mode (oscillating like a hanging sign) and fall mode (drops and bounces). Parameters include hinge position (left/right/top/bottom/corners), max rotation angle, gravity factor for acceleration, elasticity for bounce-back, and number of oscillations.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'internal',
    'generic',
    'rotation',
    'hinge',
    'physics',
    'spring',
    'door',
    'book',
    'page-turn',
    'swing',
    'bounce',
    'gravity',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 2,
    hingePosition: 'left',
    maxRotation: 90,
    gravityFactor: 1,
    elasticity: 0.3,
    oscillations: 0,
    mode: 'fall',
  },
};

// Export preset
export const hingeRotatePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
