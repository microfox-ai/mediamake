/**
 * GlitchSortReactive - Internal Waveform Effect Preset
 *
 * This internal preset combines audio-reactive displacement with glitch-style pixel sorting aesthetics.
 * It returns an array of waveform effects that create a corrupted data visual responding to music.
 *
 * Features:
 * - Bass-triggered shake effect (20-250Hz) with high threshold (0.7) for strong beats
 * - Random X/Y displacement between -30 and 30 pixels on beat triggers
 * - Treble-triggered exposure flashes (4000-16000Hz) with configurable intensity
 * - Overall amplitude-driven motion blur (0-3px) during intense sections
 * - Global sensitivity multiplier for all audio reactivity
 * - Randomization factor for displacement chaos
 * - Flash intensity control for exposure range
 *
 * Use cases:
 * - Audio-reactive glitch effects for music videos
 * - Beat-synchronized displacement animations
 * - Corrupted data aesthetic synchronized to music
 * - Dynamic visual disruption tied to audio frequencies
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply glitch effects to'),
  glitchSensitivity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Global multiplier for all audio sensitivities (0.1-2)'),
  displacementChaos: z
    .number()
    .min(10)
    .max(50)
    .default(30)
    .describe('Randomization factor for shake displacement intensity (10-50px)'),
  flashIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe(
      'Controls exposure range for flash effects (0-1, scales 0.8-1.5 exposure)',
    ),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    glitchSensitivity = 1,
    displacementChaos = 30,
    flashIntensity = 0.7,
  } = params;

  // Bass-triggered shake effect (20-250Hz)
  const bassShakeEffect: WaveformEffectData = {
    audioSrc: '', // Will be provided by the parent preset/composition
    audioProperty: 'bass',
    effectType: 'shake',
    sensitivity: 0.8 * glitchSensitivity,
    threshold: 0.7,
    shakeAxis: 'both',
    intensity: displacementChaos,
    mode: 'provider',
    targetIds: targetIds,
    start: 0,
    duration: 10, // Default duration, will be overridden by parent
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
  };

  // Treble-triggered exposure effect (4000-16000Hz)
  const trebleExposureEffect: WaveformEffectData = {
    audioSrc: '', // Will be provided by the parent preset/composition
    audioProperty: 'treble',
    effectType: 'exposure',
    sensitivity: 0.6 * glitchSensitivity,
    threshold: 0.5,
    minValue: 0.8,
    maxValue: 0.8 + 0.7 * flashIntensity,
    baseBrightness: 0.8,
    mode: 'provider',
    targetIds: targetIds,
    start: 0,
    duration: 10, // Default duration, will be overridden by parent
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
  };

  // Overall amplitude-driven blur effect (20-20000Hz)
  const amplitudeBlurEffect: WaveformEffectData = {
    audioSrc: '', // Will be provided by the parent preset/composition
    audioProperty: 'waveform',
    effectType: 'blur',
    sensitivity: 0.5 * glitchSensitivity,
    threshold: 0.4,
    minValue: 0,
    maxValue: 3,
    mode: 'provider',
    targetIds: targetIds,
    start: 0,
    duration: 10, // Default duration, will be overridden by parent
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
  };

  // Create effect nodes
  const effects = [
    {
      id: `glitch-sort-bass-shake-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: bassShakeEffect,
    },
    {
      id: `glitch-sort-treble-exposure-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: trebleExposureEffect,
    },
    {
      id: `glitch-sort-amplitude-blur-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: amplitudeBlurEffect,
    },
  ];

  // Return structure: effects attached to a container
  // The _extractedEffects pattern allows parent presets to extract these effects
  const rootContainer: RenderableComponentData = {
    id: 'glitch-sort-reactive-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'hidden', // Hidden container, only effects matter
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10, // Default duration
      },
    },
    effects: effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects, // Expose effects for extraction by parent presets
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'glitch-sort-reactive',
  title: 'GlitchSortReactive - Audio-Reactive Glitch Effect',
  description:
    'Internal waveform effect preset that combines audio-reactive displacement with glitch-style pixel sorting aesthetics. Uses bass frequencies to trigger shake/displacement events, treble for exposure flashes, and overall amplitude for motion blur. Returns array of waveform effect configurations for corrupted data aesthetic synchronized to music beats.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'glitch', 'internal'],
  dependencies: {},
  // Internal preset markers
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    glitchSensitivity: 1,
    displacementChaos: 30,
    flashIntensity: 0.7,
  },
};

// Export preset
export const glitchSortReactivePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
