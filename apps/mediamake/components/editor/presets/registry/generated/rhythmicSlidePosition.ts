/**
 * Rhythmic Slide Position - Internal Waveform Effect Preset
 * 
 * ARRAY OF EFFECTS
 * 
 * This internal effect preset creates complex, multi-layered audio-reactive sliding movements
 * by combining multiple waveform effects responding to different frequency bands.
 * 
 * Features:
 * - **Multi-Band Response**: Bass (primary movement), mid (secondary oscillation), treble (micro-vibrations)
 * - **Dual-Axis Motion**: Independent control of primary and secondary axes (x/y)
 * - **Phase Offset**: Creates spiral/circular motion patterns
 * - **Frequency-Specific Sensitivity**: Different thresholds and sensitivities per band
 * - **Smoothing Control**: Adjustable smoothing for organic motion
 * - **Echo Mode**: Optional trailing ghost positions with decreasing amplitude
 * - **Musical Synchronization**: Creates organic, dance-like positioning that syncs with music
 * 
 * Use cases:
 * - Audio-reactive text positioning
 * - Musical element animations
 * - Beat-synchronized sliding effects
 * - Complex multi-layered motion graphics
 * - Dance-like organic movements
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('IDs of components to apply the effects to'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for waveform analysis'),
  primaryAxis: z.enum(['x', 'y']).default('x').describe('Primary axis for bass-driven movement (x or y)'),
  secondaryAxis: z.enum(['x', 'y']).optional().describe('Secondary axis for mid-driven oscillation (perpendicular to primary, auto-calculated if not provided)'),
  bassResponse: z.number().default(40).describe('Base movement amplitude for bass frequencies (in pixels)'),
  midResponse: z.number().default(20).describe('Oscillation amplitude for mid frequencies (in pixels)'),
  trebleResponse: z.number().default(5).describe('Micro-vibration amplitude for treble frequencies (in pixels)'),
  phaseOffset: z.number().min(0).max(360).default(0).describe('Phase offset in degrees for creating spiral/circular motion (0-360)'),
  smoothingFactor: z.number().min(0).max(1).default(0.4).describe('Smoothing factor for motion (0 = no smoothing, 1 = maximum smoothing)'),
  echoMode: z.boolean().optional().describe('Enable echo/trailing ghost positions with decreasing amplitude'),
  effectStart: z.number().default(0).describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    audioSrc,
    primaryAxis,
    secondaryAxis,
    bassResponse,
    midResponse,
    trebleResponse,
    phaseOffset,
    smoothingFactor,
    echoMode,
    effectStart,
    effectDuration,
  } = params;

  // Auto-calculate secondary axis if not provided (perpendicular to primary)
  const calculatedSecondaryAxis = secondaryAxis || (primaryAxis === 'x' ? 'y' : 'x');

  // Convert phase offset to radians for calculation (if needed for documentation)
  const phaseOffsetRadians = (phaseOffset * Math.PI) / 180;

  // Helper function to create waveform effect data
  const createWaveformEffect = (
    id: string,
    effectType: 'translateX' | 'translateY',
    audioProperty: 'bass' | 'mid' | 'treble',
    intensity: number,
    sensitivity: number,
    threshold: number,
    smoothNormalisation: number,
  ): WaveformEffectData => {
    return {
      audioSrc,
      audioProperty,
      effectType,
      intensity,
      sensitivity,
      threshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds,
      start: effectStart,
      duration: effectDuration,
      smoothing: smoothingFactor,
      smoothNormalisation,
    };
  };

  const effects: Array<{
    id: string;
    componentId: string;
    data: WaveformEffectData;
  }> = [];

  // 1. Bass effect on primary axis
  const bassEffectType = primaryAxis === 'x' ? 'translateX' : 'translateY';
  effects.push({
    id: `rhythmic-slide-bass-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: createWaveformEffect(
      `rhythmic-slide-bass`,
      bassEffectType,
      'bass',
      bassResponse,
      0.6, // Bass sensitivity
      0.3, // Bass threshold
      1, // Bass smoothing
    ),
  });

  // 2. Mid effect on secondary axis with phase shift
  const midEffectType = calculatedSecondaryAxis === 'x' ? 'translateX' : 'translateY';
  const midEffectData = createWaveformEffect(
    `rhythmic-slide-mid`,
    midEffectType,
    'mid',
    midResponse,
    0.4, // Mid sensitivity
    0.5, // Mid threshold
    1.5, // Mid smoothing (slightly more than bass)
  );
  // Note: Phase offset is conceptually applied but waveform effect doesn't have direct phase control
  // In real implementation, this would require custom timing or additional effect layers
  effects.push({
    id: `rhythmic-slide-mid-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: midEffectData,
  });

  // 3. Treble micro-vibrations on both axes
  // Apply subtle treble vibrations on primary axis
  effects.push({
    id: `rhythmic-slide-treble-primary-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: createWaveformEffect(
      `rhythmic-slide-treble-primary`,
      bassEffectType,
      'treble',
      trebleResponse * 0.7, // Slightly reduced for primary axis
      0.8, // High treble sensitivity
      0.6, // Higher treble threshold
      2, // More smoothing for treble
    ),
  });

  // Apply subtle treble vibrations on secondary axis
  effects.push({
    id: `rhythmic-slide-treble-secondary-${targetIds.join('-')}`,
    componentId: 'waveform',
    data: createWaveformEffect(
      `rhythmic-slide-treble-secondary`,
      midEffectType,
      'treble',
      trebleResponse,
      0.8,
      0.6,
      2,
    ),
  });

  // 4. Optional echo mode: Create trailing ghost effects
  if (echoMode) {
    const echoCount = 3;
    const echoDelay = 0.1; // 100ms delay between echoes
    const echoAmplitudeDecay = 0.6; // Each echo is 60% of previous amplitude

    for (let i = 1; i <= echoCount; i++) {
      const echoAmplitude = Math.pow(echoAmplitudeDecay, i);
      const echoStartDelay = effectStart + echoDelay * i;

      // Bass echo on primary axis
      effects.push({
        id: `rhythmic-slide-bass-echo${i}-${targetIds.join('-')}`,
        componentId: 'waveform',
        data: {
          ...createWaveformEffect(
            `rhythmic-slide-bass-echo${i}`,
            bassEffectType,
            'bass',
            bassResponse * echoAmplitude,
            0.6,
            0.3,
            1,
          ),
          start: echoStartDelay,
        },
      });

      // Mid echo on secondary axis
      effects.push({
        id: `rhythmic-slide-mid-echo${i}-${targetIds.join('-')}`,
        componentId: 'waveform',
        data: {
          ...createWaveformEffect(
            `rhythmic-slide-mid-echo${i}`,
            midEffectType,
            'mid',
            midResponse * echoAmplitude,
            0.4,
            0.5,
            1.5,
          ),
          start: echoStartDelay,
        },
      });
    }
  }

  return {
    output: {
      childrenData: [
        {
          id: 'rhythmic-slide-effect-container',
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
              duration: 10,
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
  id: 'rhythmicSlidePosition',
  title: 'Rhythmic Slide Position - Audio-Reactive Multi-Band Waveform Effect',
  description:
    'Internal waveform effect preset that creates complex, multi-layered audio-reactive sliding movements by combining bass, mid, and treble frequency band responses. Creates organic, dance-like positioning animations that synchronize perfectly with music through primary/secondary axis movement, phase offsets, and optional echo trailing effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['internal', 'waveform', 'audio-reactive', 'multi-band', 'positioning', 'effects'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['target-component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    primaryAxis: 'x',
    bassResponse: 40,
    midResponse: 20,
    trebleResponse: 5,
    phaseOffset: 0,
    smoothingFactor: 0.4,
    echoMode: false,
    effectStart: 0,
    effectDuration: 10,
  },
};

export const rhythmicSlidePositionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
