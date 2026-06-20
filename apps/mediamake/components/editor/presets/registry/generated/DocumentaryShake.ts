/**
 * DocumentaryShake Internal Effect Preset
 *
 * SINGLE EFFECT (or ARRAY OF EFFECTS based on parameters):
 * This internal effect preset mimics the specific handheld camera style used in documentary filmmaking.
 * It applies three simultaneous transformations to create authentic handheld camera movement:
 * 1. Horizontal drift: slow panning motion using sine wave (±10px base over 3-4 seconds)
 * 2. Vertical bob: subtle up-down from walking rhythm (±5px base over 0.5-1 second)
 * 3. Micro-rotations: natural hand movement with constant subtle adjustments (±0.5deg)
 *
 * The effect includes a 'followAction' mode that amplifies all movements by 1.5x to simulate
 * intensification during important moments (triggered by audio peaks or timed markers).
 *
 * Focal length affects shake characteristics:
 * - Wide: 0.6x amplitude (more stable)
 * - Normal: 1.0x amplitude
 * - Telephoto: 1.5x amplitude (more shake)
 *
 * Smoothness parameter influences the wave-like quality of movements.
 *
 * Use cases:
 * - Adding authentic documentary feel to static footage
 * - Creating handheld camera realism for interviews or observational content
 * - Intensifying shake during dramatic or important moments
 * - Simulating different focal length characteristics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the documentary shake effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  duration: z
    .number()
    .describe('Duration of the effect in seconds'),
  driftAmount: z
    .number()
    .default(1)
    .describe('Multiplier for horizontal drift amplitude (base is ±10px)'),
  bobAmount: z
    .number()
    .default(1)
    .describe('Multiplier for vertical bob amplitude (base is ±5px)'),
  followAction: z
    .boolean()
    .default(false)
    .describe(
      'When true, amplifies all movements by 1.5x to simulate intensification during important moments',
    ),
  focalLength: z
    .enum(['wide', 'normal', 'telephoto'])
    .default('normal')
    .describe(
      'Focal length simulation: wide = 0.6x shake (more stable), normal = 1.0x, telephoto = 1.5x (more shake)',
    ),
  smoothness: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe(
      'Smoothness of movements (0 = more abrupt transitions, 1 = smoother wave-like motion)',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Calculate focal length multiplier
  const getFocalLengthMultiplier = (focal: 'wide' | 'normal' | 'telephoto'): number => {
    switch (focal) {
      case 'wide':
        return 0.6;
      case 'telephoto':
        return 1.5;
      case 'normal':
      default:
        return 1.0;
    }
  };

  const focalMultiplier = getFocalLengthMultiplier(params.focalLength);

  // Apply followAction amplification (1.5x if enabled)
  const actionMultiplier = params.followAction ? 1.5 : 1.0;

  // Calculate final amplitudes
  const horizontalAmplitude = 10 * params.driftAmount * focalMultiplier * actionMultiplier;
  const verticalAmplitude = 5 * params.bobAmount * focalMultiplier * actionMultiplier;
  const rotationAmplitude = 0.5 * focalMultiplier * actionMultiplier;

  // Generate keyframes for horizontal drift (slow sine wave, 3-4 second period)
  const driftPeriod = 3.5; // seconds
  const driftKeyframeCount = 15;
  const horizontalRanges = [];
  for (let i = 0; i <= driftKeyframeCount; i++) {
    const prog = i / driftKeyframeCount;
    const time = prog * params.duration;
    const phase = (time / driftPeriod) * 2 * Math.PI;
    const value = Math.sin(phase) * horizontalAmplitude;
    horizontalRanges.push({
      key: 'translateX',
      val: value,
      prog,
    });
  }

  // Generate keyframes for vertical bob (faster rhythm, 0.5-1 second period)
  const bobPeriod = 0.75; // seconds
  const bobKeyframeCount = 20;
  const verticalRanges = [];
  for (let i = 0; i <= bobKeyframeCount; i++) {
    const prog = i / bobKeyframeCount;
    const time = prog * params.duration;
    const phase = (time / bobPeriod) * 2 * Math.PI;
    const value = Math.sin(phase) * verticalAmplitude;
    verticalRanges.push({
      key: 'translateY',
      val: value,
      prog,
    });
  }

  // Generate keyframes for micro-rotations (subtle constant adjustment)
  const rotationPeriod = 2.0; // seconds
  const rotationKeyframeCount = 18;
  const rotationRanges = [];
  for (let i = 0; i <= rotationKeyframeCount; i++) {
    const prog = i / rotationKeyframeCount;
    const time = prog * params.duration;
    const phase = (time / rotationPeriod) * 2 * Math.PI;
    // Use both sine and cosine for more natural micro-adjustments
    const value =
      Math.sin(phase) * rotationAmplitude * 0.6 +
      Math.cos(phase * 1.7) * rotationAmplitude * 0.4;
    rotationRanges.push({
      key: 'rotate',
      val: value,
      prog,
    });
  }

  // Combine all ranges into one effect
  const allRanges = [...horizontalRanges, ...verticalRanges, ...rotationRanges];

  // Determine easing type based on smoothness
  const easingType = params.smoothness > 0.5 ? 'ease-in-out' : 'linear';

  const effectData: GenericEffectData = {
    type: easingType,
    start: params.effectStart,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: allRanges,
  };

  const effectIdPrefix = params.effectId || 'documentary-shake';
  const effect = {
    id: `${effectIdPrefix}-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'documentary-shake-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
            },
          },
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: params.duration,
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
  id: 'DocumentaryShake',
  title: 'DocumentaryShake Internal Effect',
  description:
    'An internal effect preset that mimics documentary-style handheld camera movement with horizontal drift, vertical bob, and micro-rotations. Includes followAction mode for intensity amplification during audio peaks or important moments, and focal-length-aware shake characteristics.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'camera', 'shake', 'documentary', 'handheld'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    effectStart: 0,
    duration: 10,
    driftAmount: 1,
    bobAmount: 1,
    followAction: false,
    focalLength: 'normal',
    smoothness: 0.5,
  },
};

export const DocumentaryShakePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
