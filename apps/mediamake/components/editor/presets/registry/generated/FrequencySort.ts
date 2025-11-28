/**
 * FrequencySort Waveform Effect Preset
 *
 * INTERNAL EFFECT PRESET (ARRAY OF EFFECTS)
 *
 * Creates pixel sorting effects driven by audio frequency analysis across different bands.
 * The effect uses multiple waveform effects targeting different frequency ranges:
 * - Bass (20-250Hz) controls horizontal displacement
 * - Mids (250-4000Hz) control vertical displacement
 * - Treble (4000-20000Hz) controls rotation
 *
 * Each frequency band has different sensitivity levels (bass at 0.7, mids at 0.5, treble at 0.9).
 * The displacement values create a 'sorting' effect where content appears to separate into
 * frequency-responsive layers.
 *
 * A complementary blur effect intensifies (0 to 4px) when overall waveform amplitude exceeds 0.6.
 *
 * Features:
 * - Multi-band audio-reactive effects (bass, mid, treble)
 * - Independent frequency isolation control
 * - Adjustable maximum displacement range
 * - Optional rotation effect (treble-driven)
 * - Amplitude-threshold blur effect
 * - Creates deconstruction effect based on audio frequency content
 *
 * Use cases:
 * - Audio-reactive visual effects for music videos
 * - Frequency-based content deconstruction
 * - Dynamic pixel sorting effects synchronized with music
 * - Creating layered, frequency-responsive visuals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the frequency sort effects to'),
  frequencyIsolation: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe(
      'Adjusts band sensitivity - multiplier for all frequency band sensitivities (0.1-2, default: 1)',
    ),
  maxDisplacement: z
    .number()
    .min(10)
    .max(100)
    .default(40)
    .describe(
      'Caps movement range - maximum displacement in pixels for horizontal/vertical movement (10-100, default: 40)',
    ),
  rotationEnabled: z
    .boolean()
    .default(true)
    .describe(
      'Toggles treble-driven rotation - whether to apply rotation effect based on treble frequencies',
    ),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    frequencyIsolation = 1,
    maxDisplacement = 40,
    rotationEnabled = true,
  } = params;

  // Create waveform effects array
  const effects: any[] = [];

  // 1. Bass frequency - Horizontal displacement (X-axis)
  const bassEffect: WaveformEffectData = {
    audioSrc: '', // Will be set by parent component or provider
    audioProperty: 'bass',
    effectType: 'translateX',
    sensitivity: 0.7 * frequencyIsolation,
    minValue: -maxDisplacement,
    maxValue: maxDisplacement,
    threshold: 0,
    mode: 'provider',
    targetIds: targetIds,
    start: 0,
    duration: 10, // Default duration, will be overridden by parent
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    smoothNormalisation: 1,
  };

  effects.push({
    id: `frequency-sort-bass-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: bassEffect,
  });

  // 2. Mid frequency - Vertical displacement (Y-axis)
  const midEffect: WaveformEffectData = {
    audioSrc: '',
    audioProperty: 'mid',
    effectType: 'translateY',
    sensitivity: 0.5 * frequencyIsolation,
    minValue: -maxDisplacement * 0.7,
    maxValue: maxDisplacement * 0.7,
    threshold: 0,
    mode: 'provider',
    targetIds: targetIds,
    start: 0,
    duration: 10,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    smoothNormalisation: 1,
  };

  effects.push({
    id: `frequency-sort-mid-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: midEffect,
  });

  // 3. Treble frequency - Rotation (optional)
  if (rotationEnabled) {
    const trebleEffect: WaveformEffectData = {
      audioSrc: '',
      audioProperty: 'treble',
      effectType: 'rotate',
      sensitivity: 0.9 * frequencyIsolation,
      minValue: -15,
      maxValue: 15,
      threshold: 0,
      mode: 'provider',
      targetIds: targetIds,
      start: 0,
      duration: 10,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      smoothNormalisation: 1,
    };

    effects.push({
      id: `frequency-sort-treble-${targetIds.join('-')}`,
      componentId: 'waveform',
      data: trebleEffect,
    });
  }

  // 4. Blur effect - Intensifies when overall waveform amplitude exceeds 0.6
  const blurEffect: WaveformEffectData = {
    audioSrc: '',
    audioProperty: 'waveform',
    effectType: 'blur',
    sensitivity: 0.6,
    threshold: 0.6,
    minValue: 0,
    maxValue: 4,
    mode: 'provider',
    targetIds: targetIds,
    start: 0,
    duration: 10,
    numberOfSamples: 128,
    useFrequencyData: false,
    windowInSeconds: 1 / 30,
    smoothNormalisation: 1,
  };

  effects.push({
    id: `frequency-sort-blur-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: blurEffect,
  });

  // Return structure - effects container for extraction
  const rootContainer: RenderableComponentData = {
    id: 'frequency-sort-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
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
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'FrequencySort',
  title: 'FrequencySort Waveform Effect',
  description:
    'Internal waveform effect preset that creates pixel sorting effects driven by multi-band audio frequency analysis. Bass controls horizontal displacement, mids control vertical displacement, treble controls rotation, with complementary blur that intensifies when overall amplitude exceeds threshold.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'internal', 'frequency'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    frequencyIsolation: 1,
    maxDisplacement: 40,
    rotationEnabled: true,
  },
};

// Export preset
export const FrequencySortPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
