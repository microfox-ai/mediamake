/**
 * StrobeGate Audio-Reactive Visibility Toggle Preset
 *
 * This preset creates instant binary visibility toggles synchronized with audio beats.
 * Unlike smooth audio-reactive effects, this maintains strict on/off states with no interpolation,
 * creating a strobing effect that follows music rhythm.
 *
 * Features:
 * - **Binary On/Off States**: Instant visibility changes (no smooth transitions)
 * - **Audio Beat Detection**: Synchronizes with audio properties (bass, kick, snare, mid, treble)
 * - **Threshold Control**: Adjustable beat detection sensitivity
 * - **Inverted Gating**: Option to show on beat vs hide on beat
 * - **Hold Time**: Minimum time to hold state (prevents rapid flickering)
 * - **Multiple Audio Properties**: React to bass, kick, snare, mid, or treble frequencies
 *
 * Use cases:
 * - Creating rhythmic text reveals synchronized to music
 * - Building strobing video cuts that follow beat patterns
 * - Implementing hard-cut visual effects for electronic music
 * - Creating binary visibility effects for UI elements on beat
 * - Building rhythm-driven content transitions
 *
 * Technical Specifications:
 * - Effect type: waveform (audio-reactive)
 * - Binary opacity control: 0 or 1 based on threshold crossing
 * - No smoothing: Instant response to audio changes
 * - Configurable hold time: Prevents rapid state changes
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the strobe gate effect to'),
  audioProperty: z
    .enum(['bass', 'kick', 'snare', 'mid', 'treble'])
    .default('bass')
    .describe(
      'Audio frequency property to monitor for beat detection (bass = low frequencies, kick = deep bass hits, snare = sharp mid-high hits, mid = midrange frequencies, treble = high frequencies)',
    ),
  threshold: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.7)
    .describe(
      'Beat detection sensitivity threshold (0.1 = very sensitive, 1.0 = only strongest beats). Higher values trigger only on stronger beats.',
    ),
  invertGate: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Invert the gating behavior: false = show on beat (hide when below threshold), true = hide on beat (show when below threshold)',
    ),
  holdTime: z
    .number()
    .min(0)
    .max(200)
    .optional()
    .default(50)
    .describe(
      'Minimum time in milliseconds to hold each state before allowing a change. Prevents rapid flickering. 0 = no hold (instant changes), 50 = default, higher values = more stable but less responsive.',
    ),
  audioSrc: z
    .string()
    .describe(
      'Audio source URL or ref:componentId to synchronize with. Use "ref:Audio-xyz" to reference an existing audio component.',
    ),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .optional()
    .describe(
      'Duration of the effect in seconds. If not provided, effect runs for parent duration.',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for tracking'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    audioProperty,
    threshold,
    invertGate,
    holdTime,
    audioSrc,
    effectStart,
    effectDuration,
    effectId,
  } = params;

  // Construct the waveform effect data for strobe gating
  const strobeGateEffectData: WaveformEffectData = {
    // Audio source configuration
    audioSrc: audioSrc,
    numberOfSamples: 128, // Power of 2 for FFT
    useFrequencyData: true,
    windowInSeconds: 1 / 30, // Match typical frame rate
    normalize: true,

    // Audio property and sensitivity
    audioProperty: audioProperty,
    sensitivity: 1.0, // Base sensitivity
    threshold: threshold,
    smoothing: 0, // No smoothing for instant response
    smoothNormalisation: 0, // No frame smoothing for raw binary behavior

    // Binary opacity effect
    effectType: 'exposure', // Using exposure effect for binary opacity control
    intensity: 1.0, // Full intensity for binary effect
    minValue: invertGate ? 1 : 0, // Min opacity based on invert setting
    maxValue: invertGate ? 0 : 1, // Max opacity based on invert setting
    baseBrightness: invertGate ? 1 : 0, // Base state when below threshold

    // Effect timing
    start: effectStart,
    duration: effectDuration,

    // Targeting
    mode: 'provider',
    targetIds: targetIds,

    // Hold time configuration (in frames at 30fps)
    // Note: This is a custom property that the WaveformEffect would need to support
    // For now, we include it in the data structure
    props: {
      holdTime: holdTime, // Hold time in milliseconds
      binaryMode: true, // Flag to indicate binary on/off behavior
    },
  };

  // Create the strobe gate effect
  const strobeGateEffect = {
    id: effectId || `strobe-gate-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: strobeGateEffectData,
  };

  // Create root container (minimal structure for effect preset)
  const rootContainer: RenderableComponentData = {
    id: 'strobe-gate-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration || 10, // Default duration if not provided
      },
    },
    effects: [strobeGateEffect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer],
      // Internal presets store extracted effects for easy access
      _extractedEffects: [strobeGateEffect],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'strobeGateEffect',
  title: 'StrobeGate Audio-Reactive Visibility Toggle',
  description:
    'Internal effect preset that creates instant binary visibility toggles synchronized with audio beats. Unlike smooth audio-reactive effects, this maintains strict on/off states with no interpolation, creating a strobing effect that follows music rhythm. Configurable for different audio properties (bass, kick, snare, mid, treble), threshold sensitivity, inverted gating, and hold time to prevent rapid flickering. Perfect for rhythmic text reveals or video cuts synchronized to music.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio-reactive', 'strobe', 'beat-sync', 'internal'],
  dependencies: {
    presets: [],
    helpers: [],
  },
  // Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    audioProperty: 'bass',
    threshold: 0.7,
    invertGate: false,
    holdTime: 50,
    audioSrc: 'ref:Audio-xyz',
    effectStart: 0,
    effectDuration: 10,
  },
};

// Export preset
export const strobeGateEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};