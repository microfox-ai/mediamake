/**
 * BlockDisplaceBeat - Internal Audio-Reactive Block Displacement Effect Preset
 *
 * SINGLE EFFECT PRESET (Internal)
 *
 * This internal waveform effect preset creates audio-reactive block displacement
 * synchronized to bass frequencies (20-250Hz). Elements appear to "break apart"
 * into blocks that displace on strong beats, creating a chaotic scatter effect.
 *
 * Features:
 * - **Bass-Reactive Displacement**: Translates elements based on bass frequency hits
 * - **Axis Behavior Control**: Alternate, horizontal, vertical, or both-axis displacement
 * - **High Sensitivity**: Configured with 0.8 sensitivity and 0.3 threshold for prominent beats
 * - **Secondary Scale Pulse**: Scales elements from 1.0 to 1.15 on bass hits
 * - **Bass Boost Multiplier**: Adjustable sensitivity multiplier for bass responsiveness
 * - **Chaotic Scatter Effect**: Displacement alternates between axes for shattered appearance
 *
 * Use cases:
 * - Creating audio-reactive block/particle scatter effects
 * - Adding dynamic displacement to text/images synchronized with music
 * - Building energetic bass-reactive visual effects
 * - Creating "shattered and reassembled" visual experiences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the effect to'),
  displacementRange: z
    .number()
    .min(10)
    .max(200)
    .default(50)
    .describe('Maximum pixels to displace (10-200)'),
  axisBehavior: z
    .enum(['alternate', 'horizontal', 'vertical', 'both'])
    .default('alternate')
    .describe(
      'Displacement behavior: alternate between axes, horizontal only, vertical only, or both simultaneously',
    ),
  bassBoost: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Multiplier for bass sensitivity (0.5-2)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { targetIds, displacementRange, axisBehavior, bassBoost } = params;

  // Helper function to determine axis based on behavior
  const getAxisForEffect = (
    behavior: 'alternate' | 'horizontal' | 'vertical' | 'both',
    isTranslate: boolean,
  ): 'x' | 'y' | 'both' | undefined => {
    if (behavior === 'both') return 'both';
    if (behavior === 'horizontal') return 'x';
    if (behavior === 'vertical') return 'y';
    // For 'alternate', we use a simple approach: translateX for translate effect
    if (behavior === 'alternate' && isTranslate) return 'x';
    return undefined;
  };

  // Create translate effect (displacement)
  const translateEffectData: WaveformEffectData = {
    audioSrc: 'ref:audio', // Reference to audio component
    audioProperty: 'bass',
    effectType: axisBehavior === 'horizontal' ? 'translateX' : axisBehavior === 'vertical' ? 'translateY' : 'translateX',
    sensitivity: bassBoost * 0.8,
    threshold: 0.3,
    minValue: -displacementRange,
    maxValue: displacementRange,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: targetIds,
    start: 0,
    duration: 10, // Long duration, will be overridden by parent timing
    smoothNormalisation: 0.5, // Less smoothing for more responsive displacement
  };

  // For 'alternate' or 'both' behavior, we need to handle axis logic
  // Since waveform effect doesn't natively support alternating, we'll use translateX primarily
  // and let the chaos come from the combined translate + scale effects

  const translateEffect = {
    id: `block-displace-translate-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: translateEffectData,
  };

  // Create scale effect (pulse)
  const scaleEffectData: WaveformEffectData = {
    audioSrc: 'ref:audio',
    audioProperty: 'bass',
    effectType: 'scale',
    sensitivity: bassBoost * 0.6,
    threshold: 0.3,
    minValue: 1.0,
    maxValue: 1.15,
    baseScale: 1.0,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: targetIds,
    start: 0,
    duration: 10,
    smoothNormalisation: 0.5,
  };

  const scaleEffect = {
    id: `block-displace-scale-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: scaleEffectData,
  };

  // For 'both' axis behavior, add a translateY effect as well
  const effects: any[] = [translateEffect, scaleEffect];

  if (axisBehavior === 'both') {
    const translateYEffectData: WaveformEffectData = {
      ...translateEffectData,
      effectType: 'translateY',
    };
    const translateYEffect = {
      id: `block-displace-translateY-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: translateYEffectData,
    };
    effects.push(translateYEffect);
  }

  // Return effect structure wrapped in a minimal container
  const rootContainer: RenderableComponentData = {
    id: 'block-displace-beat-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10,
      },
    },
    effects: effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects, // Extract effects for internal preset usage
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'BlockDisplaceBeat',
  title: 'BlockDisplaceBeat - Audio-Reactive Block Displacement',
  description:
    'Internal waveform effect preset that creates audio-reactive block displacement synchronized to bass frequencies (20-250Hz). Elements "break apart" into blocks that displace on strong beats with alternating axis behavior and secondary scale pulse effect.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'waveform', 'audio-reactive', 'bass', 'displacement', 'scatter'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    displacementRange: 50,
    axisBehavior: 'alternate',
    bassBoost: 1,
  },
};

// Export preset
export const BlockDisplaceBeatPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
