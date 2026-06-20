/**
 * Turbulence Drift Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset returns a combined array of effects that create chaotic but controlled
 * hovering motion. It combines generic keyframe-based drift with waveform-based turbulent disruptions.
 *
 * Base Drift Effect:
 * - Uses generic keyframes with a random-walk pattern (8-10 keyframes)
 * - Provides slow, wandering movement with translateX/Y within wanderRadius
 * - 15-second loop cycle for organic, unpredictable motion
 *
 * Turbulence Effect:
 * - Waveform effect reacting to mid-frequency audio
 * - Type: 'shake' with low intensity for subtle disruptions
 * - Creates small random-feeling position jumps and rotation wobbles
 *
 * Optional Rotation Effect:
 * - Subtle rotation wobbles (-2deg to +2deg) on a 12-second loop
 * - Offset from drift cycle for more organic variation
 *
 * Parameters:
 * - wanderRadius: Maximum distance for random walk drift (default: 30px)
 * - turbulenceIntensity: Intensity of shake effect (0-1, default: 0.3)
 * - sensitivity: Threshold for mid-frequency reaction (0-1, default: 0.4)
 * - includeRotation: Whether to include subtle rotation wobbles (default: true)
 *
 * Usage:
 * Call this preset to get effect configurations that can be merged into parent component effects.
 * The effects use mode: 'provider' with targetIds that must be supplied by the calling preset.
 *
 * Perfect for:
 * - Creating dynamic backgrounds with gentle motion
 * - Adding life to static compositions without explicit beat-syncing
 * - Organic, unpredictable motion that remains subtle enough not to distract
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  GenericEffectData,
  WaveformEffectData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply turbulence drift effects to'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL or ref:componentId for waveform turbulence effect'),
  wanderRadius: z
    .number()
    .default(30)
    .describe('Maximum distance for random walk drift in pixels'),
  turbulenceIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of audio-reactive shake effect (0-1)'),
  sensitivity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Threshold for mid-frequency reaction (0-1)'),
  includeRotation: z
    .boolean()
    .default(true)
    .describe('Whether to include subtle rotation wobbles'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effects (relative to parent)'),
  effectDuration: z
    .number()
    .default(30)
    .describe('Duration of the effects'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Generate random walk keyframes
  const generateRandomWalkKeyframes = (
    radius: number,
    keyframeCount: number,
  ): { translateX: number; translateY: number; prog: number }[] => {
    const keyframes: { translateX: number; translateY: number; prog: number }[] = [];
    const progressValues = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
    const selectedProgress = progressValues.slice(0, keyframeCount);

    for (let i = 0; i < keyframeCount; i++) {
      // Generate random angle and distance within radius
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      const translateX = Math.cos(angle) * distance;
      const translateY = Math.sin(angle) * distance;

      keyframes.push({
        translateX,
        translateY,
        prog: selectedProgress[i],
      });
    }

    return keyframes;
  };

  // Helper function: Generate rotation keyframes
  const generateRotationKeyframes = (
    keyframeCount: number,
  ): { rotate: number; prog: number }[] => {
    const keyframes: { rotate: number; prog: number }[] = [];
    const progressValues = [0, 0.2, 0.4, 0.6, 0.8, 1];
    const selectedProgress = progressValues.slice(0, keyframeCount);

    for (let i = 0; i < keyframeCount; i++) {
      // Random rotation between -2 and +2 degrees
      const rotate = (Math.random() - 0.5) * 4; // -2 to +2
      keyframes.push({
        rotate,
        prog: selectedProgress[i],
      });
    }

    return keyframes;
  };

  const {
    targetId,
    audioSrc,
    wanderRadius,
    turbulenceIntensity,
    sensitivity,
    includeRotation,
    effectStart,
    effectDuration,
    effectIdPrefix,
  } = params;

  const idPrefix = effectIdPrefix || 'turbulence-drift';

  // Generate random walk keyframes for drift (9 keyframes)
  const driftKeyframes = generateRandomWalkKeyframes(wanderRadius, 9);

  // Create base drift effect (generic)
  const driftRanges: { key: string; val: any; prog: number }[] = [];
  driftKeyframes.forEach(kf => {
    driftRanges.push({ key: 'translateX', val: kf.translateX, prog: kf.prog });
    driftRanges.push({ key: 'translateY', val: kf.translateY, prog: kf.prog });
  });

  const driftEffectData: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: 15, // 15-second loop cycle
    mode: 'provider',
    targetIds: [targetId],
    ranges: driftRanges,
  };

  const driftEffect = {
    id: `${idPrefix}-drift-${targetId}`,
    componentId: 'generic',
    data: driftEffectData,
  };

  const effects: any[] = [driftEffect];

  // Add turbulence effect (waveform shake) if audioSrc is provided
  if (audioSrc) {
    const turbulenceEffectData: WaveformEffectData = {
      audioSrc,
      audioProperty: 'mid',
      effectType: 'shake',
      intensity: turbulenceIntensity * 20, // Scale to reasonable shake amplitude
      sensitivity: sensitivity * 2, // Scale sensitivity
      threshold: sensitivity,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [targetId],
      start: effectStart,
      duration: effectDuration,
      smoothNormalisation: 1,
      shakeAxis: 'both',
    };

    const turbulenceEffect = {
      id: `${idPrefix}-turbulence-${targetId}`,
      componentId: 'waveform',
      data: turbulenceEffectData,
    };

    effects.push(turbulenceEffect);
  }

  // Add rotation effect if enabled
  if (includeRotation) {
    const rotationKeyframes = generateRotationKeyframes(6);
    const rotationRanges: { key: string; val: any; prog: number }[] = rotationKeyframes.map(
      kf => ({
        key: 'rotate',
        val: kf.rotate,
        prog: kf.prog,
      }),
    );

    const rotationEffectData: GenericEffectData = {
      type: 'ease-in-out',
      start: effectStart,
      duration: 12, // 12-second loop cycle (offset from drift)
      mode: 'provider',
      targetIds: [targetId],
      ranges: rotationRanges,
    };

    const rotationEffect = {
      id: `${idPrefix}-rotation-${targetId}`,
      componentId: 'generic',
      data: rotationEffectData,
    };

    effects.push(rotationEffect);
  }

  // Return effects in _extractedEffects for easy extraction by calling preset
  return {
    output: {
      _extractedEffects: effects,
      childrenData: [
        {
          id: 'turbulence-drift-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
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
  id: 'turbulence-drift-effect',
  title: 'Turbulence Drift Internal Effect',
  description:
    'Internal effect preset that creates chaotic but controlled hovering motion combining generic keyframe drift with waveform audio-reactive turbulence. Returns effect configurations for merging into parent components. Base drift provides slow wandering movement using random-walk keyframes, while mid-frequency audio triggers subtle shake disruptions. Parameters control wander radius, turbulence intensity, sensitivity threshold, and optional rotation wobbles. Creates organic, unpredictable motion that remains subtle enough for dynamic backgrounds or adding life to static compositions without explicit beat-syncing.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'waveform', 'turbulence', 'drift', 'hover', 'motion', 'audio-reactive', 'shake'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    audioSrc: undefined,
    wanderRadius: 30,
    turbulenceIntensity: 0.3,
    sensitivity: 0.4,
    includeRotation: true,
    effectStart: 0,
    effectDuration: 30,
  },
};

export const turbulenceDriftEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
