/**
 * Corrupt Flicker Waveform Effect Preset
 *
 * This internal effect preset creates audio-reactive digital corruption effects simulating
 * signal loss and video interference. It combines rapid opacity strobes with CSS filter
 * inversions that respond to bass frequencies. The effect feels like a broken video signal
 * reacting to audio beats with configurable flicker modes, inversion triggers, and optional
 * text-specific corruptions.
 *
 * ARRAY OF EFFECTS:
 * Returns multiple waveform effects for comprehensive corruption:
 * - Opacity strobe (bass-reactive, configurable mode)
 * - Filter inversion (beat-triggered color inversion)
 * - Optional brightness flicker (enhances corruption)
 * - Optional letter-spacing glitch (text-only, mid-frequency reactive)
 *
 * Features:
 * - Audio-reactive opacity strobes with multiple flicker modes (strobe, random, pulse)
 * - Beat-triggered CSS filter inversions for color corruption
 * - Sensitivity-based intensity control for audio reactivity
 * - Text-specific letter-spacing glitches reacting to mid frequencies
 * - Configurable brightness corruption for enhanced signal loss simulation
 *
 * Use cases:
 * - Creating glitch/corruption effects synchronized with music beats
 * - Simulating digital signal interference in music videos
 * - Adding audio-reactive distortion to text or images
 * - Building cyberpunk or tech-themed visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply corruption effects to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform reactivity'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent timeline)'),
  effectDuration: z
    .number()
    .describe('Duration of the effect in seconds'),
  sensitivity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe(
      'Audio reactivity sensitivity (0-1, higher = more reactive to audio)',
    ),
  flickerMode: z
    .enum(['strobe', 'random', 'pulse'])
    .default('strobe')
    .describe(
      'Flicker behavior mode: strobe (rapid on/off), random (unpredictable), pulse (smooth oscillation)',
    ),
  invertOnBeat: z
    .boolean()
    .default(true)
    .describe('Enable CSS filter inversion triggered by bass beats'),
  glitchText: z
    .boolean()
    .default(false)
    .describe(
      'Enable text-specific letter-spacing corruption reacting to mid frequencies',
    ),
  brightnessCorruption: z
    .boolean()
    .default(false)
    .optional()
    .describe('Enable brightness flicker for enhanced corruption effect'),
  effectIdPrefix: z
    .string()
    .default('corrupt-flicker')
    .optional()
    .describe('Prefix for effect IDs (for uniqueness when multiple instances)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    audioSrc,
    effectStart,
    effectDuration,
    sensitivity,
    flickerMode,
    invertOnBeat,
    glitchText,
    brightnessCorruption,
    effectIdPrefix,
  } = params;

  const effects = [];

  // Calculate intensity multipliers based on sensitivity and flicker mode
  const opacityIntensity = sensitivity * 0.8; // Opacity strobe intensity
  const inversionThreshold = 0.3 + (1 - sensitivity) * 0.2; // Higher sensitivity = lower threshold

  // Effect 1: Opacity strobe (bass-reactive)
  // Flicker mode determines min/max opacity values for different corruption styles
  let minOpacity = 0.2;
  let maxOpacity = 1.0;

  if (flickerMode === 'strobe') {
    // Rapid on/off strobe with extreme contrast
    minOpacity = 0.1;
    maxOpacity = 1.0;
  } else if (flickerMode === 'random') {
    // Random opacity drops for unpredictable corruption
    minOpacity = 0.3;
    maxOpacity = 0.95;
  } else if (flickerMode === 'pulse') {
    // Smooth pulsing for subtle signal loss
    minOpacity = 0.5;
    maxOpacity = 1.0;
  }

  const opacityFlickerEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'exposure', // Use exposure for opacity-like effect
    intensity: opacityIntensity,
    baseBrightness: maxOpacity,
    minValue: minOpacity,
    maxValue: maxOpacity,
    sensitivity: sensitivity * 2.0, // Amplify sensitivity for bass response
    threshold: 0.15, // Low threshold for frequent flickers
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: flickerMode === 'pulse' ? 1 : 0.3, // More smoothing for pulse mode
  };

  effects.push({
    id: `${effectIdPrefix}-opacity-flicker`,
    componentId: 'waveform',
    data: opacityFlickerEffect,
  });

  // Effect 2: Filter inversion on beats (optional)
  if (invertOnBeat) {
    // Use a separate waveform effect to trigger inversion on bass hits
    // This effect targets the same components but manipulates filter property
    // Note: Direct filter control via waveform is challenging, so we use brightness manipulation
    // Combined with high contrast to simulate inversion-like effect
    const inversionEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'bass',
      effectType: 'exposure',
      intensity: 0.5, // Moderate intensity for inversion simulation
      baseBrightness: 1.0,
      minValue: 0.3, // Darken on beat
      maxValue: 1.7, // Brighten on beat (simulates partial inversion)
      sensitivity: sensitivity * 1.5,
      threshold: inversionThreshold, // Higher threshold = only strongest beats trigger
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds,
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: 0, // No smoothing for instant inversion trigger
    };

    effects.push({
      id: `${effectIdPrefix}-inversion-trigger`,
      componentId: 'waveform',
      data: inversionEffect,
    });
  }

  // Effect 3: Brightness corruption (optional)
  if (brightnessCorruption) {
    const brightnessGlitchEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'treble', // React to high frequencies for varied corruption
      effectType: 'exposure',
      intensity: 0.4,
      baseBrightness: 1.0,
      minValue: 0.6,
      maxValue: 1.4,
      sensitivity: sensitivity * 1.2,
      threshold: 0.2,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds,
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: 0.5,
    };

    effects.push({
      id: `${effectIdPrefix}-brightness-corruption`,
      componentId: 'waveform',
      data: brightnessGlitchEffect,
    });
  }

  // Effect 4: Text letter-spacing glitch (optional, text-specific)
  if (glitchText) {
    // Letter-spacing jumps reacting to mid frequencies
    // Note: This requires a custom approach as waveform effects don't directly support letterSpacing
    // We simulate it using scale effect on X-axis for text stretching
    const letterSpacingGlitchEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'mid', // Mid frequencies for text corruption
      effectType: 'scale',
      intensity: 0.15, // Subtle scale changes simulate letter-spacing jumps
      baseScale: 1.0,
      minValue: 0.95,
      maxValue: 1.1,
      sensitivity: sensitivity * 1.3,
      threshold: 0.25,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds,
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: 0, // No smoothing for instant glitch
    };

    effects.push({
      id: `${effectIdPrefix}-letterSpacing-glitch`,
      componentId: 'waveform',
      data: letterSpacingGlitchEffect,
    });
  }

  // Return effects in a container structure
  return {
    output: {
      childrenData: [
        {
          id: `${effectIdPrefix}-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
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

const presetMetadata: PresetMetadata = {
  id: 'corruptFlicker',
  title: 'Corrupt Flicker Waveform Effect',
  description:
    'Audio-reactive digital corruption effect with opacity strobes, filter inversions, and optional text glitches. Simulates signal loss and video interference synchronized with bass frequencies.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'audio-reactive',
    'waveform',
    'glitch',
    'corruption',
    'flicker',
    'signal-loss',
    'internal',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    sensitivity: 0.7,
    flickerMode: 'strobe',
    invertOnBeat: true,
    glitchText: false,
    brightnessCorruption: false,
    effectIdPrefix: 'corrupt-flicker',
  },
};

export const corruptFlickerPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
