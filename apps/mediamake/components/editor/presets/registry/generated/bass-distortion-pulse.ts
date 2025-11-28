/**
 * Bass Distortion Pulse Effect Preset
 *
 * This internal effect preset creates waveform-based bass-reactive distortion effects
 * that warp and distort elements in sync with bass drops.
 *
 * SINGLE EFFECT (ARRAY OF EFFECTS):
 * Returns multiple effect objects that combine:
 * - Scale distortion (non-uniform X/Y scaling)
 * - Blur pulsing
 * - Contrast pumping
 * - Rotation wobble
 *
 * Features:
 * - **Bass-Reactive**: Responds to low-frequency audio using waveform analysis
 * - **Threshold Detection**: Only activates on significant bass events (>0.7 threshold)
 * - **Speaker Cone Effect**: Elements bulge outward on bass hits with non-uniform scaling
 * - **Rotation Wobble**: Increases with sustained bass intensity
 * - **Configurable Distortion**: Circular, horizontal, or vertical distortion shapes
 * - **Recovery Time**: Adjustable decay between bass hits
 *
 * Use cases:
 * - Creating bass-reactive visual effects for music videos
 * - Adding dynamic distortion to UI elements in sync with audio
 * - Building audio-synchronized animations for EDM/electronic music content
 * - Creating "speaker pump" effects for bass-heavy tracks
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply bass distortion effects to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .describe('Duration of the effect in seconds'),
  bassResponse: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.2)
    .describe(
      'How much distortion per bass level (0.1 = subtle, 3.0 = extreme)',
    ),
  distortionShape: z
    .enum(['circular', 'horizontal', 'vertical'])
    .default('circular')
    .describe(
      'Shape of distortion: circular = uniform bulge, horizontal = widen, vertical = stretch',
    ),
  recoveryTime: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe(
      'Time in seconds for effect to decay back to normal after bass hit',
    ),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe(
      'Minimum bass level (0-1) required to trigger distortion effects',
    ),
  effectIds: z
    .object({
      scale: z.string().optional(),
      blur: z.string().optional(),
      contrast: z.string().optional(),
      rotation: z.string().optional(),
    })
    .optional()
    .describe('Optional custom IDs for individual effects'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    audioSrc,
    effectStart,
    effectDuration,
    bassResponse,
    distortionShape,
    recoveryTime,
    threshold,
    effectIds,
  } = params;

  const effects = [];

  // Calculate scale values based on distortion shape and bass response
  const calculateScaleValues = () => {
    const baseScaleX = 1;
    const baseScaleY = 1;
    const scaleMultiplier = bassResponse;

    switch (distortionShape) {
      case 'horizontal':
        return {
          scaleXPeak: 1 + 0.3 * scaleMultiplier,
          scaleYPeak: 1 + 0.05 * scaleMultiplier,
        };
      case 'vertical':
        return {
          scaleXPeak: 1 + 0.05 * scaleMultiplier,
          scaleYPeak: 1 + 0.3 * scaleMultiplier,
        };
      case 'circular':
      default:
        return {
          scaleXPeak: 1 + 0.25 * scaleMultiplier,
          scaleYPeak: 1 + 0.2 * scaleMultiplier,
        };
    }
  };

  const { scaleXPeak, scaleYPeak } = calculateScaleValues();

  // 1. SCALE DISTORTION EFFECT (Non-uniform X/Y scaling)
  const scaleEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    sensitivity: bassResponse * 1.2,
    threshold,
    intensity: bassResponse * 0.3,
    baseScale: 1,
    numberOfSamples: 256,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    smoothNormalisation: recoveryTime > 0.8 ? 2 : 1,
    mode: 'provider',
    targetIds: [targetId],
    start: effectStart,
    duration: effectDuration,
  };

  effects.push({
    id: effectIds?.scale || `bass-scale-${targetId}`,
    componentId: 'waveform',
    data: scaleEffect,
  });

  // 2. BLUR PULSING EFFECT
  const blurIntensity = Math.min(2 + bassResponse * 1.5, 5);
  const blurEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'blur',
    sensitivity: bassResponse * 0.5,
    threshold: threshold * 0.9,
    intensity: blurIntensity,
    minValue: 0,
    maxValue: blurIntensity,
    numberOfSamples: 256,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    smoothNormalisation: Math.max(1, recoveryTime * 1.5),
    mode: 'provider',
    targetIds: [targetId],
    start: effectStart,
    duration: effectDuration,
  };

  effects.push({
    id: effectIds?.blur || `bass-blur-${targetId}`,
    componentId: 'waveform',
    data: blurEffect,
  });

  // 3. CONTRAST PUMPING EFFECT (using exposure)
  const contrastIntensity = 0.2 + bassResponse * 0.15;
  const contrastEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'exposure',
    sensitivity: bassResponse * 0.8,
    threshold: threshold * 0.95,
    intensity: contrastIntensity,
    baseBrightness: 1,
    minValue: 1,
    maxValue: 1 + contrastIntensity,
    numberOfSamples: 256,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    smoothNormalisation: 1,
    mode: 'provider',
    targetIds: [targetId],
    start: effectStart,
    duration: effectDuration,
  };

  effects.push({
    id: effectIds?.contrast || `bass-contrast-${targetId}`,
    componentId: 'waveform',
    data: contrastEffect,
  });

  // 4. ROTATION WOBBLE EFFECT
  const rotationRange = 5 + bassResponse * 3;
  const rotationEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'waveform',
    effectType: 'rotate',
    sensitivity: bassResponse * 0.3,
    threshold: threshold * 0.8,
    intensity: 1,
    rotationRange,
    numberOfSamples: 256,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    smoothNormalisation: recoveryTime > 0.7 ? 2 : 1,
    mode: 'provider',
    targetIds: [targetId],
    start: effectStart,
    duration: effectDuration,
  };

  effects.push({
    id: effectIds?.rotation || `bass-rotation-${targetId}`,
    componentId: 'waveform',
    data: rotationEffect,
  });

  return {
    output: {
      childrenData: [
        {
          id: 'bass-distortion-effect-container',
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
              duration: effectDuration,
            },
          },
          effects,
          childrenData: [],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'bass-distortion-pulse',
  title: 'Bass Distortion Pulse Effect',
  description:
    'Internal waveform-based effect preset that applies scale distortion, blur pulsing, contrast pumping, and rotation wobble in sync with bass drops. Creates a "speaker cone" effect with threshold-based bass detection.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'bass', 'distortion', 'internal', 'audio-reactive'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    audioSrc: 'audio.mp3',
    effectStart: 0,
    effectDuration: 30,
    bassResponse: 1.2,
    distortionShape: 'circular',
    recoveryTime: 0.5,
    threshold: 0.7,
  },
};

export const bassDistortionPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
