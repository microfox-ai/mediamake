/**
 * Vibrant Beat Pulse - Audio-Reactive Waveform Internal Effect Preset
 *
 * This internal effect preset creates audio-synchronized saturation, hue rotation, and scale pulse effects
 * that react to bass and mid-range frequencies in the audio. It's designed to create a dynamic,
 * color-shifting experience that syncs with musical energy levels.
 *
 * ARRAY OF EFFECTS:
 * Returns multiple waveform effects (saturation pulse, hue rotation, scale pulse) that can be extracted
 * and applied to target components.
 *
 * Features:
 * - Bass-reactive saturation pulse (1.0 to 2.5 intensity)
 * - Mid-frequency hue rotation (0 to 360 degrees rainbow effect)
 * - Micro-scale pulse (1.0 to 1.02) for physical impact
 * - Adjustable sensitivity for different music genres
 * - Threshold parameter to filter out weak beats
 * - Smooth audio analysis for natural effect transitions
 *
 * Use cases:
 * - Creating audio-synchronized visual effects for music videos
 * - Adding dynamic color-shifting effects to video content
 * - Building beat-reactive overlays and animations
 * - Enhancing music visualizers with saturation and hue effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the waveform effects to'),
  sensitivity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .optional()
    .describe(
      'Audio sensitivity multiplier (0-1). Higher values for subtle tracks, lower for heavy bass music',
    ),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe(
      'Minimum audio level threshold (0-1) to trigger effects. Filters out weak beats',
    ),
  enableHueRotation: z
    .boolean()
    .default(true)
    .optional()
    .describe(
      'Enable hue rotation effect that creates a color-shifting rainbow effect based on mid-range frequencies',
    ),
  enableScalePulse: z
    .boolean()
    .default(true)
    .optional()
    .describe(
      'Enable subtle scale pulse effect (1.0 to 1.02) for physical impact on beats',
    ),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for audio analysis'),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effects relative to parent timeline (seconds)'),
  effectDuration: z
    .number()
    .describe('Duration of the effects (seconds). Should match target component duration'),
  saturationIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .optional()
    .describe(
      'Intensity multiplier for saturation effect. Default 1.5 pulses from 1.0 to 2.5',
    ),
  hueRotationRange: z
    .number()
    .min(0)
    .max(360)
    .default(360)
    .optional()
    .describe(
      'Maximum hue rotation range in degrees. Default 360 creates full rainbow cycle',
    ),
  scalePulseIntensity: z
    .number()
    .min(0.01)
    .max(0.1)
    .default(0.02)
    .optional()
    .describe(
      'Scale pulse intensity. Default 0.02 creates subtle 1.0 to 1.02 scale effect',
    ),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs to ensure uniqueness'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const targetIds = params.targetIds;
  const sensitivity = params.sensitivity ?? 0.8;
  const threshold = params.threshold ?? 0.3;
  const enableHueRotation = params.enableHueRotation ?? true;
  const enableScalePulse = params.enableScalePulse ?? true;
  const audioSrc = params.audioSrc;
  const effectStart = params.effectStart ?? 0;
  const effectDuration = params.effectDuration;
  const saturationIntensity = params.saturationIntensity ?? 1.5;
  const hueRotationRange = params.hueRotationRange ?? 360;
  const scalePulseIntensity = params.scalePulseIntensity ?? 0.02;
  const effectIdPrefix = params.effectIdPrefix ?? '';

  // Build effects array
  const effects: any[] = [];

  // 1. Saturation Pulse Effect (Bass-reactive)
  const saturationEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'exposure', // Using exposure as brightness/saturation effect
    intensity: saturationIntensity,
    baseBrightness: 1.0,
    sensitivity,
    threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: 1,
  };

  effects.push({
    id: `${effectIdPrefix}saturation-pulse`,
    componentId: 'waveform',
    data: saturationEffect,
  });

  // 2. Hue Rotation Effect (Mid-frequency reactive) - Optional
  if (enableHueRotation) {
    const hueRotationEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'mid',
      effectType: 'rotate', // Using rotate effect for hue rotation
      rotationRange: hueRotationRange,
      sensitivity,
      threshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds,
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: 1,
    };

    effects.push({
      id: `${effectIdPrefix}hue-rotation`,
      componentId: 'waveform',
      data: hueRotationEffect,
    });
  }

  // 3. Scale Pulse Effect (Bass-reactive, subtle) - Optional
  if (enableScalePulse) {
    const scalePulseEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'bass',
      effectType: 'scale',
      intensity: scalePulseIntensity,
      baseScale: 1.0,
      sensitivity: sensitivity * 0.5, // Lower sensitivity for scale (more subtle)
      threshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds,
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: 1,
    };

    effects.push({
      id: `${effectIdPrefix}scale-pulse`,
      componentId: 'waveform',
      data: scalePulseEffect,
    });
  }

  // Return effects in a container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'vibrant-beat-pulse-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects,
    childrenData: [],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'VibrantBeatPulse',
  title: 'Vibrant Beat Pulse Effect',
  description:
    'Audio-reactive internal effect preset that applies bass-synced saturation pulse, mid-frequency hue rotation, and micro-scale pulse effects to target components. Creates a dynamic color-shifting effect that syncs with music energy levels.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'internal', 'beat-sync'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['target-component-1'],
    sensitivity: 0.8,
    threshold: 0.3,
    enableHueRotation: true,
    enableScalePulse: true,
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    saturationIntensity: 1.5,
    hueRotationRange: 360,
    scalePulseIntensity: 0.02,
  },
};

export const VibrantBeatPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
