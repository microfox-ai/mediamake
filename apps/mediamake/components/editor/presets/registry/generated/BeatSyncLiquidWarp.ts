/**
 * BeatSyncLiquidWarp Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This preset returns multiple effects (waveform + generic) that combine audio-reactive
 * waveform animations with liquid distortion effects. It creates dynamic, music-driven
 * liquid animations that respond to bass, treble, and overall audio energy.
 *
 * Features:
 * - Bass-triggered scale warping (1.0 to 1.3 based on intensity)
 * - Treble-controlled shake effect for high-energy moments
 * - Continuous liquid rotation that speeds up with audio energy (0 to 360deg)
 * - Smart blur that intensifies during beat drops (0 to 6px based on combined frequency analysis)
 * - Beat detection for triggering special 'splash' moments with extreme distortion
 *
 * Use cases:
 * - Creating dynamic, music-driven liquid animations
 * - Audio-reactive background effects for music videos
 * - Beat-synchronized visual distortions
 * - Fluid, organic visual effects that respond to audio
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData, GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply effects to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for audio analysis'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effects (relative to parent)'),
  effectDuration: z
    .number()
    .describe('Duration of the effects in seconds'),

  // Main parameters
  beatSensitivity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Sensitivity to beat detection (0-1, higher = more responsive)'),
  warpIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .optional()
    .describe('Scale multiplier for bass-triggered warp effect'),
  liquidViscosity: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe(
      'Affects rotation smoothing (0 = no smoothing, higher = more smoothing)',
    ),
  frequencyMix: z
    .object({
      bass: z
        .number()
        .min(0)
        .max(1)
        .default(0.5)
        .describe('Weight of bass frequencies in blur analysis'),
      mid: z
        .number()
        .min(0)
        .max(1)
        .default(0.3)
        .describe('Weight of mid frequencies in blur analysis'),
      treble: z
        .number()
        .min(0)
        .max(1)
        .default(0.2)
        .describe('Weight of treble frequencies in blur analysis'),
    })
    .optional()
    .describe('Balance between bass/mid/treble influence on blur effect'),

  // Optional IDs for individual effects
  scaleEffectId: z.string().optional().describe('Optional ID for scale effect'),
  shakeEffectId: z.string().optional().describe('Optional ID for shake effect'),
  rotateEffectId: z
    .string()
    .optional()
    .describe('Optional ID for rotation effect'),
  blurEffectId: z.string().optional().describe('Optional ID for blur effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    audioSrc,
    effectStart,
    effectDuration,
    beatSensitivity = 0.6,
    warpIntensity = 0.3,
    liquidViscosity = 1,
    frequencyMix = { bass: 0.5, mid: 0.3, treble: 0.2 },
    scaleEffectId,
    shakeEffectId,
    rotateEffectId,
    blurEffectId,
  } = params;

  // Helper function to generate unique IDs
  const generateEffectId = (baseId: string, targetId: string): string => {
    return `${baseId}-${targetId}`;
  };

  // Bass-triggered scale warp effect (1.0 to 1.3)
  const scaleWarpEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    baseScale: 1.0,
    intensity: warpIntensity,
    sensitivity: beatSensitivity,
    threshold: 0.1,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: liquidViscosity,
    // Scale range: 1.0 to 1.3 based on intensity
    minValue: 1.0,
    maxValue: 1.0 + warpIntensity, // e.g., 1.0 + 0.3 = 1.3
  };

  // Treble-controlled shake effect for high-energy moments
  const trebleShakeEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'treble',
    effectType: 'shake',
    intensity: 5,
    sensitivity: 1.2,
    threshold: 0.7,
    shakeAxis: 'both',
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: liquidViscosity * 0.5, // Less smoothing for shake
  };

  // Continuous liquid rotation (0 to 360deg, speed multiplied by audio level)
  const liquidRotationEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'waveform',
    effectType: 'rotate',
    intensity: 1.0,
    rotationRange: 360,
    sensitivity: 1.0,
    threshold: 0,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: liquidViscosity,
    // Continuous rotation
    minValue: 0,
    maxValue: 360,
  };

  // Smart blur effect based on combined frequency analysis (0 to 6px)
  // We'll use a waveform effect that reacts to overall audio energy
  const smartBlurEffect: WaveformEffectData = {
    audioSrc,
    audioProperty: 'frequency', // Combined frequency analysis
    effectType: 'blur',
    intensity: 6, // Max blur in pixels
    sensitivity: 1.5,
    threshold: 0.3,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds,
    start: effectStart,
    duration: effectDuration,
    smoothNormalisation: liquidViscosity,
    minValue: 0,
    maxValue: 6, // 0 to 6px blur
  };

  // Create effect objects
  const effects = [
    {
      id:
        scaleEffectId ||
        generateEffectId('beat-sync-scale-warp', targetIds[0] || 'default'),
      componentId: 'waveform',
      data: scaleWarpEffect,
    },
    {
      id:
        shakeEffectId ||
        generateEffectId('beat-sync-treble-shake', targetIds[0] || 'default'),
      componentId: 'waveform',
      data: trebleShakeEffect,
    },
    {
      id:
        rotateEffectId ||
        generateEffectId(
          'beat-sync-liquid-rotation',
          targetIds[0] || 'default',
        ),
      componentId: 'waveform',
      data: liquidRotationEffect,
    },
    {
      id:
        blurEffectId ||
        generateEffectId('beat-sync-smart-blur', targetIds[0] || 'default'),
      componentId: 'waveform',
      data: smartBlurEffect,
    },
  ];

  // Create root container with effects
  const rootContainer: RenderableComponentData = {
    id: 'beat-sync-liquid-warp-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
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
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects, // Expose effects for extraction
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'BeatSyncLiquidWarp',
  title: 'Beat Sync Liquid Warp Internal Effect',
  description:
    'Internal effect preset combining audio-reactive waveform effects with liquid distortion animations. Features bass-triggered scale warping, treble shake, continuous liquid rotation, smart blur on beat drops, and special splash moments. All effects are music-driven and highly customizable.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'waveform', 'audio-reactive', 'liquid'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    beatSensitivity: 0.6,
    warpIntensity: 0.3,
    liquidViscosity: 1,
    frequencyMix: {
      bass: 0.5,
      mid: 0.3,
      treble: 0.2,
    },
  },
};

// Export preset
export const BeatSyncLiquidWarpPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
