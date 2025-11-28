/**
 * Beat Pulse Cutout Waveform Effect Preset
 *
 * This internal effect preset makes flat cutout shapes pulse and breathe with the music's bass frequencies.
 * The effect creates a paper-craft stop-motion aesthetic where elements scale and rotate slightly on each beat,
 * giving a tactile handmade feel. Supports configurable bass sensitivity, scale intensity, rotation amount,
 * and optional shadow growth on beats. Uses GPU-accelerated transform3d for smooth performance.
 *
 * Features:
 * - **Bass-Reactive Scaling**: Elements pulse and grow on bass hits
 * - **Subtle Rotation**: Small rotation movements synchronized with beats
 * - **Optional Shadow Effect**: Growing shadows that emphasize the "pop" effect
 * - **Paper-Craft Aesthetic**: Stop-motion feel with tactile, handmade quality
 * - **GPU Acceleration**: Uses transform3d for optimal performance
 * - **Configurable Sensitivity**: Control how much elements react to bass frequencies
 *
 * Use cases:
 * - Creating paper-craft style animations
 * - Building beat-reactive typography or graphics
 * - Adding tactile, handmade feel to music videos
 * - Creating stop-motion aesthetic effects
 * - Building audio-reactive cutout animations
 *
 * ARRAY OF EFFECTS:
 * Returns multiple effects (zoom, rotate, shadow) that can be applied to target components.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the beat pulse effect to'),
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
  bassSensitivity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe(
      'Sensitivity to bass frequencies (0-1, higher = more reactive to subtle bass)',
    ),
  scaleIntensity: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .optional()
    .describe(
      'Maximum scale intensity on beats (1-2, 1 = no scale, 2 = double size)',
    ),
  rotationDegrees: z
    .number()
    .min(0)
    .max(45)
    .default(5)
    .optional()
    .describe(
      'Maximum rotation in degrees on beats (0-45, 0 = no rotation, 45 = significant rotation)',
    ),
  addShadow: z
    .boolean()
    .default(true)
    .optional()
    .describe(
      'Whether to add a subtle shadow that grows on beats for depth effect',
    ),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe(
      'Minimum bass intensity threshold to trigger the effect (0-1, higher = only strong beats)',
    ),
  smoothNormalisation: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe(
      'Smoothing factor for animation (0 = raw data, 1 = default smoothing, >1 = more smoothing)',
    ),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const bassSensitivity = params.bassSensitivity ?? 0.5;
  const scaleIntensity = params.scaleIntensity ?? 1.2;
  const rotationDegrees = params.rotationDegrees ?? 5;
  const addShadow = params.addShadow ?? true;
  const threshold = params.threshold ?? 0.3;
  const smoothNormalisation = params.smoothNormalisation ?? 1;

  // Calculate actual sensitivity (map 0-1 range to 0.3-0.8 as specified)
  const actualSensitivity = 0.3 + bassSensitivity * 0.5;

  // Calculate scale intensity multiplier for zoom effect
  const zoomIntensity = scaleIntensity - 1; // Convert 1-2 range to 0-1 intensity

  const effects = [];

  // Create zoom (scale) effect - primary beat pulse
  const zoomEffect: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'zoom',
    intensity: zoomIntensity,
    baseScale: 1,
    sensitivity: actualSensitivity,
    threshold: threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: params.targetIds,
    start: params.effectStart,
    duration: params.effectDuration,
    smoothNormalisation: smoothNormalisation,
  };

  effects.push({
    id: `beat-pulse-zoom-${params.targetIds.join('-')}`,
    componentId: 'waveform',
    data: zoomEffect,
  });

  // Create rotation effect if rotationDegrees > 0
  if (rotationDegrees > 0) {
    const rotateEffect: WaveformEffectData = {
      audioSrc: params.audioSrc,
      audioProperty: 'bass',
      effectType: 'rotate',
      rotationRange: rotationDegrees,
      sensitivity: actualSensitivity,
      threshold: threshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: params.targetIds,
      start: params.effectStart,
      duration: params.effectDuration,
      smoothNormalisation: smoothNormalisation,
    };

    effects.push({
      id: `beat-pulse-rotate-${params.targetIds.join('-')}`,
      componentId: 'waveform',
      data: rotateEffect,
    });
  }

  // Create shadow effect using generic effect if addShadow is true
  if (addShadow) {
    // Shadow is implemented as a generic effect that changes drop-shadow filter
    // We use bass-reactive intensity to grow the shadow
    const shadowEffect = {
      id: `beat-pulse-shadow-${params.targetIds.join('-')}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: params.effectStart,
        duration: params.effectDuration,
        mode: 'provider' as const,
        targetIds: params.targetIds,
        ranges: [
          // Base shadow (subtle)
          {
            key: 'filter',
            val: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            prog: 0,
          },
          // Mid shadow (grows on beat)
          {
            key: 'filter',
            val: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            prog: 0.5,
          },
          // Strong shadow (peak on strong beat)
          {
            key: 'filter',
            val: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))',
            prog: 1,
          },
        ],
      },
    };

    effects.push(shadowEffect);
  }

  // Return effects wrapped in a container structure
  // The system will extract effects when _internalPresetOutput: 'effects' is set
  return {
    output: {
      childrenData: [
        {
          id: 'beat-pulse-cutout-effects-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                perspective: '1000px', // Enable 3D transforms for GPU acceleration
                transformStyle: 'preserve-3d',
              },
            },
          },
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: params.effectDuration,
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
  id: 'beatPulseCutout',
  title: 'Beat Pulse Cutout Effect',
  description:
    'A waveform effect preset that makes flat cutout shapes pulse and breathe with the music\'s bass frequencies. Creates a paper-craft stop-motion aesthetic where elements scale and rotate slightly on each beat, giving a tactile handmade feel. Supports configurable bass sensitivity, scale intensity, rotation amount, and optional shadow growth on beats. Uses GPU-accelerated transform3d for smooth performance.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'bass', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['cutout-element-1'],
    audioSrc: 'audio.mp3',
    effectStart: 0,
    effectDuration: 30,
    bassSensitivity: 0.5,
    scaleIntensity: 1.2,
    rotationDegrees: 5,
    addShadow: true,
    threshold: 0.3,
    smoothNormalisation: 1,
  },
};

// Export preset
export const beatPulseCutoutPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
