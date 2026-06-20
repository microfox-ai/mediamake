/**
 * CartoonBounce - Internal Waveform Effect Preset
 *
 * This internal preset creates audio-reactive cartoon-style bounce and squash/stretch effects
 * that sync with audio beats. It mimics classic cartoon animation principles by combining
 * bass-driven main bounces with mid-frequency wobbles for secondary motion.
 *
 * ARRAY OF EFFECTS:
 * Returns multiple waveform effects that target the same component:
 * - Primary bounce effect (bass-driven scaleY + translateY)
 * - Squash/stretch effect (inverse scaleX/scaleY relationship)
 * - Rotation wobble effect (mid-frequency driven, optional)
 *
 * Features:
 * - **Audio-Reactive Bouncing**: Bass frequencies drive vertical bounce and squash
 * - **Squash/Stretch Mechanics**: Inverse relationship between scaleX and scaleY for cartoon physics
 * - **Rotation Wobble**: Optional mid-frequency driven rotation for dynamic movement
 * - **Style Variants**: 'rubberhose', 'squash-stretch', 'jelly' for different animation feels
 * - **Configurable Parameters**: Intensity, squash factor, and wobble controls
 *
 * Use cases:
 * - Creating cartoon-style audio visualizations
 * - Adding playful bounce effects to text or images
 * - Building music video elements with exaggerated physics
 * - Creating audio-reactive logo animations
 *
 * Technical Details:
 * - Effect type: Waveform (audio-reactive)
 * - Properties: scaleX, scaleY, translateY, rotate
 * - Audio properties: bass (primary), mid (secondary wobble)
 * - Sensitivity: 0.8 for bass, 0.4 for mid
 * - Threshold: 0.3
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply cartoon bounce effect to'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for audio analysis'),
  effectStart: z.number().describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  
  // Bounce parameters
  intensity: z.number().min(0.1).max(2.0).default(1.0).optional().describe('Bounce intensity multiplier (0.1 to 2.0)'),
  squashFactor: z.number().min(0.5).max(1.5).default(1.0).optional().describe('How much to compress on impact (0.5 = more squash, 1.5 = less squash)'),
  style: z.enum(['rubberhose', 'squash-stretch', 'jelly']).default('squash-stretch').optional().describe('Cartoon animation style variant'),
  enableWobble: z.boolean().default(true).optional().describe('Enable secondary rotation wobble on mid frequencies'),
  
  // Effect IDs (optional)
  bounceEffectId: z.string().optional().describe('Custom ID for bounce effect'),
  squashEffectId: z.string().optional().describe('Custom ID for squash effect'),
  wobbleEffectId: z.string().optional().describe('Custom ID for wobble effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const intensity = params.intensity ?? 1.0;
  const squashFactor = params.squashFactor ?? 1.0;
  const style = params.style ?? 'squash-stretch';
  const enableWobble = params.enableWobble ?? true;

  // Calculate style-specific parameters
  const getStyleParams = () => {
    switch (style) {
      case 'rubberhose':
        // Classic rubberhose: minimal squash, more elastic bounce
        return {
          bounceIntensity: intensity * 0.4,
          squashIntensity: intensity * 0.15,
          rotationRange: 8,
          baseScale: 1.0,
          bounceTranslate: 30 * intensity,
        };
      case 'squash-stretch':
        // Traditional squash/stretch: strong inverse relationship
        return {
          bounceIntensity: intensity * 0.5,
          squashIntensity: intensity * 0.3,
          rotationRange: 12,
          baseScale: 1.0,
          bounceTranslate: 25 * intensity,
        };
      case 'jelly':
        // Jelly: exaggerated squash, wobbly movement
        return {
          bounceIntensity: intensity * 0.6,
          squashIntensity: intensity * 0.4,
          rotationRange: 15,
          baseScale: 1.0,
          bounceTranslate: 35 * intensity,
        };
      default:
        return {
          bounceIntensity: intensity * 0.5,
          squashIntensity: intensity * 0.3,
          rotationRange: 12,
          baseScale: 1.0,
          bounceTranslate: 25 * intensity,
        };
    }
  };

  const styleParams = getStyleParams();

  // Effect 1: Vertical bounce with scaleY (bass-driven)
  const bounceEffectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    sensitivity: 0.8,
    threshold: 0.3,
    intensity: styleParams.bounceIntensity,
    baseScale: styleParams.baseScale,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [params.targetId],
    start: params.effectStart,
    duration: params.effectDuration,
    smoothNormalisation: 1,
  };

  const bounceEffect = {
    id: params.bounceEffectId || `cartoon-bounce-${params.targetId}`,
    componentId: 'waveform',
    data: bounceEffectData,
  };

  // Effect 2: Squash effect with inverse scaleX/scaleY (bass-driven)
  // When scaleY increases (bounce up), scaleX decreases (squash horizontally)
  const squashEffectData: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'bass',
    effectType: 'scale',
    sensitivity: 0.8,
    threshold: 0.3,
    intensity: styleParams.squashIntensity / squashFactor,
    baseScale: styleParams.baseScale,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [params.targetId],
    start: params.effectStart,
    duration: params.effectDuration,
    smoothNormalisation: 1,
  };

  const squashEffect = {
    id: params.squashEffectId || `cartoon-squash-${params.targetId}`,
    componentId: 'waveform',
    data: squashEffectData,
  };

  // Effect 3: Rotation wobble (mid-frequency driven, optional)
  const wobbleEffect = enableWobble
    ? {
        id: params.wobbleEffectId || `cartoon-wobble-${params.targetId}`,
        componentId: 'waveform',
        data: {
          audioSrc: params.audioSrc,
          audioProperty: 'mid',
          effectType: 'rotate',
          sensitivity: 0.4,
          threshold: 0.3,
          rotationRange: styleParams.rotationRange,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / 30,
          mode: 'provider',
          targetIds: [params.targetId],
          start: params.effectStart,
          duration: params.effectDuration,
          smoothNormalisation: 1,
        } as WaveformEffectData,
      }
    : null;

  // Collect all effects
  const effects = [bounceEffect, squashEffect];
  if (wobbleEffect) {
    effects.push(wobbleEffect);
  }

  // Return effects in container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'cartoon-bounce-container',
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
        duration: 10,
      },
    },
    effects: effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'CartoonBounce',
  title: 'CartoonBounce Waveform Effect',
  description: 'Internal waveform effect preset that makes elements bounce and squash/stretch in sync with audio beats, mimicking classic cartoon animation principles with bass-driven bounces and mid-frequency wobbles',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'waveform', 'audio-reactive', 'internal', 'cartoon', 'bounce', 'squash', 'stretch'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    intensity: 1.0,
    squashFactor: 1.0,
    style: 'squash-stretch',
    enableWobble: true,
  },
};

// Export preset
export const CartoonBouncePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
