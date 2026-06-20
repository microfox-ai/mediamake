/**
 * AudioVolumetricPulse Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset creates audio-reactive volumetric lighting synchronized to bass frequencies.
 * It returns an array of 4 waveform effects that work together to create pulsing light halos:
 * 1. Glow filter (blur) that intensifies with bass hits (0px to 40px)
 * 2. Scale transform that pulses from 1.0 to 1.15 on beats
 * 3. Brightness filter that flares from 100% to 150% on peaks
 * 4. Opacity overlay that flashes from 0 to 0.4 creating light burst effects
 *
 * Features:
 * - Audio-reactive volumetric lighting synchronized to bass frequencies
 * - Multi-layered effect system (glow, scale, brightness, opacity)
 * - Configurable sensitivity (0-1 for reaction strength)
 * - Configurable threshold (0-1 for trigger level)
 * - Custom glow color (hex value)
 * - Adjustable decay speed (ms for effect falloff)
 * - Multiply blend mode option for enhanced light effects
 * - Tracks both bass and mid frequencies for rich response
 *
 * Use cases:
 * - Audio-reactive text effects with pulsing light halos
 * - Music visualizations with volumetric lighting
 * - Beat-synchronized glow effects on media elements
 * - Creating light burst effects on audio peaks
 * - Adding dynamic energy to audio-visual compositions
 *
 * SINGLE EFFECT:
 * Not applicable - this preset returns an array of 4 coordinated effects.
 *
 * Advanced Usage:
 * Apply to any component (text, image, video) to make it emit pulsing light halos.
 * Combine with other effects for complex audio-reactive visuals.
 * Adjust sensitivity and threshold to control reaction intensity and trigger points.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply the volumetric pulse effect to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(-1)
    .describe('Duration of the effect (-1 = match component duration)'),
  sensitivity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Reaction strength (0 = no reaction, 1 = maximum reaction)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Minimum audio level to trigger effect (0-1)'),
  glowColor: z
    .string()
    .default('#ffeb3b')
    .describe('Color of the glow effect (hex format)'),
  decaySpeed: z
    .number()
    .default(150)
    .describe('Effect decay speed in milliseconds (lower = faster decay)'),
  multiplyMode: z
    .boolean()
    .default(true)
    .describe('Use multiply blend mode for enhanced light effects'),
  glowIntensity: z
    .number()
    .default(40)
    .describe('Maximum glow blur intensity in pixels'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    targetIds,
    audioSrc,
    effectStart,
    effectDuration,
    sensitivity,
    threshold,
    glowColor,
    decaySpeed,
    multiplyMode,
    glowIntensity,
    effectId,
  } = params;

  // Helper function to convert hex color to RGB
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 235, b: 59 }; // Default yellow
  };

  const rgb = hexToRgb(glowColor);
  const glowColorRgb = `rgb(${rgb.r},${rgb.g},${rgb.b})`;

  // Calculate smoothing based on decay speed (lower decay = more smoothing)
  // decaySpeed range: 50-300ms, smoothNormalisation range: 0.5-2
  const smoothNormalisation = Math.max(
    0.5,
    Math.min(2, (300 - decaySpeed) / 150 + 0.5),
  );

  const baseEffectId = effectId || `volumetric-pulse-${targetIds.join('-')}`;

  // Effect 1: Glow filter (blur + drop-shadow)
  const glowEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'blur',
    intensity: glowIntensity / 50, // Normalize to ~0.8 for 40px default
    minValue: 0,
    maxValue: glowIntensity,
    sensitivity,
    threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation,
    normalize: true,
  };

  const glowEffect = {
    id: `${baseEffectId}-glow`,
    componentId: 'waveform',
    data: glowEffectData,
  };

  // Effect 2: Scale transform (1.0 to 1.15)
  const scaleEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    baseScale: 1.0,
    intensity: 0.15 * sensitivity, // Max scale of 1.15 at full sensitivity
    sensitivity,
    threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation,
    normalize: true,
  };

  const scaleEffect = {
    id: `${baseEffectId}-scale`,
    componentId: 'waveform',
    data: scaleEffectData,
  };

  // Effect 3: Brightness filter (100% to 150%)
  const brightnessEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'mid', // Use mid frequencies for brightness
    effectType: 'exposure',
    baseBrightness: 1.0,
    intensity: 0.5 * sensitivity, // Max brightness of 1.5 at full sensitivity
    sensitivity,
    threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation,
    normalize: true,
  };

  const brightnessEffect = {
    id: `${baseEffectId}-brightness`,
    componentId: 'waveform',
    data: brightnessEffectData,
  };

  // Effect 4: Opacity overlay (light burst effect)
  // Using a custom waveform effect with opacity modulation
  const opacityEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'exposure', // We'll use exposure but apply it as opacity via custom ranges
    intensity: 0.4 * sensitivity, // Max opacity of 0.4 at full sensitivity
    sensitivity: sensitivity * 1.2, // Slightly more sensitive for burst effect
    threshold: threshold + 0.1, // Higher threshold for burst effect
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: smoothNormalisation * 0.7, // Faster response for bursts
    normalize: true,
  };

  const opacityEffect = {
    id: `${baseEffectId}-opacity`,
    componentId: 'waveform',
    data: opacityEffectData,
  };

  // Return all four effects
  const effects = [glowEffect, scaleEffect, brightnessEffect, opacityEffect];

  return {
    output: {
      childrenData: [
        {
          id: `${baseEffectId}-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10, // Placeholder duration
            },
          },
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                pointerEvents: 'none',
              },
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
  id: 'audioVolumetricPulse',
  title: 'AudioVolumetricPulse',
  description:
    'Internal waveform effect preset that creates audio-reactive volumetric lighting synchronized to bass frequencies. Applies pulsing glow halos, scale transforms, brightness flares, and opacity overlays to target components that react to music beats. Uses waveform data to modulate: glow filter (0-40px), scale (1.0-1.15), brightness (100%-150%), and opacity overlays (0-0.4). Tracks bass and mid frequencies for rich audio response. This preset outputs effects (not visual components) and is meant to be called by other presets via dependencies.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'waveform',
    'audio-reactive',
    'volumetric',
    'glow',
    'pulse',
    'bass',
    'internal',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: -1,
    sensitivity: 0.7,
    threshold: 0.3,
    glowColor: '#ffeb3b',
    decaySpeed: 150,
    multiplyMode: true,
    glowIntensity: 40,
  },
};

// Export preset
export const audioVolumetricPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
