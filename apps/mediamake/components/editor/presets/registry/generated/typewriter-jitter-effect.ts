/**
 * TypewriterJitter Text Effect Preset
 *
 * SINGLE EFFECT (or ARRAY OF EFFECTS for multiple characters):
 * This internal effect preset simulates mechanical typewriter shake with vertical bounces,
 * rotations, and scale variations. Features spring-based settling animation with configurable
 * mechanical age, typing force, and character/word/line targeting modes.
 *
 * Effect applies:
 * - Vertical bounce (translateY): Sharp impact followed by spring settle
 * - Rotation (rotate): Slight rotation during impact
 * - Scale: Physical depression of keys (0.95-1.05 range)
 *
 * Parameters:
 * - mechanicalAge: 0-1 (0 = newer/less shake, 1 = older/more erratic)
 * - typingForce: 'light' | 'medium' | 'heavy'
 * - affectMode: 'character' | 'word' | 'line' (for future multi-target use)
 * - springDamping: Spring physics damping factor
 * - duration: Total effect duration
 * - targetIds: Array of component IDs to target
 *
 * Usage:
 * Apply to text components at the moment of their "appearance" to simulate typewriter key impact.
 * The effect uses sharp initial keyframes (0-0.1 progress) for impact, then spring easing (0.1-1.0)
 * for the settle animation.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  mechanicalAge: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Mechanical age: 0 = newer (less shake), 1 = older (more erratic)'),
  typingForce: z
    .enum(['light', 'medium', 'heavy'])
    .default('medium')
    .describe('Typing force intensity: light, medium, or heavy'),
  affectMode: z
    .enum(['character', 'word', 'line'])
    .default('character')
    .describe('Target mode: character, word, or line grouping'),
  springDamping: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Spring damping factor (0 = bouncy, 1 = stiff)'),
  duration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Total effect duration in seconds'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Effect start time relative to parent component'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Calculate translateY amplitude based on typing force and mechanical age
  const calculateTranslateY = (force: string, age: number): number => {
    const baseValues = {
      light: -3,
      medium: -5,
      heavy: -8,
    };
    const base = baseValues[force as keyof typeof baseValues];
    // Mechanical age adds randomness/variance
    const ageVariance = age * 2; // 0-2px additional variance
    return base * (1 + age * 0.3) - ageVariance * (Math.random() - 0.5);
  };

  // Helper: Calculate rotation range based on mechanical age
  const calculateRotation = (age: number): number => {
    const baseRotation = 1.5; // degrees
    const ageVariance = age * 1.5; // Up to +1.5 degrees more erratic
    return (baseRotation + ageVariance) * (Math.random() > 0.5 ? 1 : -1);
  };

  // Helper: Calculate scale during impact
  const calculateScale = (age: number): number => {
    const baseScale = 0.97; // Slight depression
    const ageVariance = age * 0.03; // Older typewriters have more variance
    return baseScale - ageVariance * Math.random();
  };

  // Calculate effect parameters
  const translateY = calculateTranslateY(params.typingForce, params.mechanicalAge);
  const rotation = calculateRotation(params.mechanicalAge);
  const impactScale = calculateScale(params.mechanicalAge);

  // Keyframe progression points
  const impactEnd = 0.1; // Impact phase ends at 10% progress
  const settleMiddle = 0.3; // Mid-settle point
  const settleEnd = 0.7; // Most settling done by 70%

  // Construct effect data with spring easing
  const effectData: GenericEffectData = {
    type: 'spring', // Spring easing for natural settle
    start: params.effectStart,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      // Initial state (at rest, before impact)
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'scale', val: 1, prog: 0 },

      // Impact moment (sharp movement)
      { key: 'translateY', val: translateY, prog: impactEnd },
      { key: 'rotate', val: rotation, prog: impactEnd },
      { key: 'scale', val: impactScale, prog: impactEnd },

      // Spring settle phase (ease back to rest)
      // Mid-settle: slight overshoot for spring effect
      { key: 'translateY', val: translateY * 0.2, prog: settleMiddle },
      { key: 'rotate', val: rotation * 0.15, prog: settleMiddle },
      { key: 'scale', val: 1 + (impactScale - 1) * 0.1, prog: settleMiddle },

      // Nearly settled
      { key: 'translateY', val: translateY * 0.05, prog: settleEnd },
      { key: 'rotate', val: rotation * 0.03, prog: settleEnd },
      { key: 'scale', val: 1 + (impactScale - 1) * 0.02, prog: settleEnd },

      // Final rest position
      { key: 'translateY', val: 0, prog: 1 },
      { key: 'rotate', val: 0, prog: 1 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  // Create effect node
  const effect = {
    id: params.effectId || `typewriter-jitter-${params.targetIds[0]}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'typewriter-jitter-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: params.duration + 1, // Container lasts slightly longer
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typewriterJitterEffect',
  title: 'TypewriterJitter Text Effect',
  description:
    'Internal effect preset that simulates mechanical typewriter shake with vertical bounces, rotations, and scale variations. Features spring-based settling animation with configurable mechanical age, typing force, and character/word/line targeting modes.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'typewriter', 'jitter', 'mechanical', 'text', 'generic', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    mechanicalAge: 0.5,
    typingForce: 'medium',
    affectMode: 'character',
    springDamping: 0.7,
    duration: 0.5,
    targetIds: ['text-component-1'],
    effectStart: 0,
  },
};

// Export preset
export const typewriterJitterEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
