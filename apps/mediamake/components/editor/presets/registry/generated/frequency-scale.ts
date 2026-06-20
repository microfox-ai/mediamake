/**
 * Frequency Scale Effect Preset
 *
 * SINGLE EFFECT:
 * Creates audio-reactive scale transformations based on specific frequency ranges
 * (bass, mid, treble, full spectrum). Designed for music visualizers and audio-synced
 * presentations with smooth or stepped scaling modes.
 *
 * Features:
 * - **Frequency Targeting**: Target bass, mid, treble, or full spectrum frequencies
 * - **Scale Response**: Configurable min/max scale ranges for audio reactivity
 * - **Sensitivity Control**: Adjust how responsive the effect is to audio changes
 * - **Threshold Filtering**: Set minimum audio level required to trigger scaling
 * - **Smoothing Control**: Configure smoothness of scale transitions (0-1)
 * - **Frequency Isolation**: Option to isolate and react only to specific instruments/vocals
 * - **Flexible Targeting**: Apply to any component by ID
 *
 * Use cases:
 * - Music visualizers reacting to different frequency bands
 * - Audio-synced presentations with dynamic scaling
 * - Instrument-specific visual reactions
 * - Beat-synchronized animations
 * - Multi-layer frequency-based effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  frequencyBand: z
    .enum(['bass', 'mid', 'treble', 'full'])
    .default('bass')
    .describe(
      'Frequency range to target: bass (low), mid (midrange), treble (high), or full spectrum',
    ),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.6)
    .describe(
      'Sensitivity multiplier - higher values create more pronounced reactions (0.1-5)',
    ),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.25)
    .describe(
      'Minimum audio level required to trigger scaling (0-1, 0 = react to all audio)',
    ),
  minScale: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.95)
    .describe('Minimum scale value when audio is below threshold (e.g., 0.95)'),
  maxScale: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.05)
    .describe('Maximum scale value at peak audio intensity (e.g., 1.05)'),
  smoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe(
      'Smoothing factor for scale transitions - 0 = raw/stepped, 1 = very smooth',
    ),
  isolate: z
    .boolean()
    .default(false)
    .describe(
      'Enable frequency isolation to react only to specific instruments or vocals',
    ),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the scale effect to'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    frequencyBand,
    sensitivity,
    threshold,
    minScale,
    maxScale,
    smoothing,
    isolate,
    targetIds,
  } = params;

  // Map frequency band to audio property
  const getAudioProperty = (
    band: 'bass' | 'mid' | 'treble' | 'full',
  ): 'bass' | 'mid' | 'treble' | 'waveform' => {
    if (band === 'full') return 'waveform';
    return band;
  };

  // Create waveform effect data for scale
  const effectData: WaveformEffectData = {
    // Audio source will be determined by parent component
    audioSrc: '', // Empty - will be populated by waveform system
    audioProperty: getAudioProperty(frequencyBand),
    effectType: 'scale',
    baseScale: minScale,
    intensity: maxScale - minScale, // Scale range
    sensitivity: sensitivity,
    threshold: threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30, // 30 fps default
    mode: 'provider',
    targetIds: targetIds,
    start: 0,
    duration: 'parent' as any, // Duration matches parent component
    smoothNormalisation: smoothing,
    // Additional properties for frequency isolation
    ...(isolate && {
      // Enable frequency isolation features
      normalize: true,
      dataOffsetInSeconds: 0,
    }),
  };

  // Create the effect node
  const effect = {
    id: `frequency-scale-${frequencyBand}-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: effectData,
  };

  // Return effect in container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'frequency-scale-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'hidden',
        style: {
          display: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 'parent' as any,
      },
    },
    effects: [effect],
    childrenData: [] as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      // Internal preset output marker for extraction
      _extractedEffects: [effect],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'frequency-scale',
  title: 'Frequency Scale Effect',
  description:
    'Internal effect preset that creates audio-reactive scale transformations based on specific frequency ranges (bass, mid, treble, full spectrum). Designed for music visualizers and audio-synced presentations with smooth or stepped scaling modes.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio', 'waveform', 'scale', 'frequency', 'internal'],
  dependencies: {},
  // Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    frequencyBand: 'bass',
    sensitivity: 0.6,
    threshold: 0.25,
    minScale: 0.95,
    maxScale: 1.05,
    smoothing: 0.5,
    isolate: false,
    targetIds: ['target-component-id'],
  },
};

// Export preset
export const frequencyScalePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
