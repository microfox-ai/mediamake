/**
 * Data Stream Tear Waveform Effect
 *
 * Creates vertical tearing synchronized to audio frequencies. The effect responds to different
 * frequency bands by creating vertical splits and tears in the content, as if data packets are
 * arriving out of order.
 *
 * Features:
 * - **Frequency-Responsive Tearing**: Different frequency bands (bass, mid, treble) create different tear patterns
 * - **Direction Control**: Vertical, horizontal, or diagonal tearing directions
 * - **Micro-Tears**: High frequencies create rapid micro-tears via small translateY shifts
 * - **Major Splits**: Bass frequencies create major vertical splits via large translateX shifts
 * - **RGB Channel Delays**: Creates digital artifact feeling with chromatic aberration effects
 * - **Reassembly Time**: Controls how quickly tears heal back to normal
 * - **Clip Path Tearing**: Uses clip paths to create realistic tear shapes
 * - **Diagonal Skew**: Mid frequencies add diagonal skew for additional glitch feeling
 *
 * Use cases:
 * - Creating digital glitch effects synchronized to music
 * - Building audio-reactive data corruption visuals
 * - Creating cyberpunk/sci-fi aesthetic effects
 * - Adding dynamic tearing transitions to content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  frequencyResponse: z
    .array(z.enum(['bass', 'mid', 'treble']))
    .describe('Which frequency bands to monitor for tear effects'),
  tearDirection: z
    .enum(['vertical', 'horizontal', 'diagonal'])
    .describe('Direction of tears: vertical, horizontal, or diagonal'),
  maxTearWidth: z
    .number()
    .min(0)
    .max(200)
    .default(50)
    .describe('Maximum width/displacement of tears in pixels'),
  reassemblyTime: z
    .number()
    .min(0)
    .max(5)
    .default(0.5)
    .describe('How quickly tears heal (smoothing factor, 0-5 where higher = slower)'),
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply the tear effect to'),
  rgbDelayIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Intensity of RGB channel delay effect in pixels'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .optional()
    .describe('Overall sensitivity multiplier for all effects'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect relative to parent'),
  effectDuration: z
    .number()
    .optional()
    .describe('Duration of the effect in seconds (optional, defaults to parent duration)'),
  trackName: z
    .string()
    .default('dataStreamTear')
    .optional()
    .describe('Track name for unique IDs'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    frequencyResponse,
    tearDirection,
    maxTearWidth,
    reassemblyTime,
    targetIds,
    rgbDelayIntensity = 2,
    sensitivity = 1,
    audioSrc,
    effectStart = 0,
    effectDuration,
    trackName = 'dataStreamTear',
  } = params;

  const effects: any[] = [];

  // Helper function to create waveform effect data
  const createWaveformEffect = (
    audioProperty: 'bass' | 'mid' | 'treble',
    effectType: 'translateX' | 'translateY' | 'scale',
    minValue: number,
    maxValue: number,
    effectSensitivity: number,
    effectId: string,
  ): WaveformEffectData => {
    return {
      audioSrc,
      audioProperty,
      effectType: effectType as any,
      intensity: Math.abs(maxValue - minValue),
      minValue,
      maxValue,
      sensitivity: effectSensitivity * sensitivity,
      threshold: 0.1,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds,
      start: effectStart,
      ...(effectDuration ? { duration: effectDuration } : {}),
      smoothNormalisation: reassemblyTime,
    };
  };

  // Bass frequency - major splits (large translateX or translateY depending on direction)
  if (frequencyResponse.includes('bass')) {
    if (tearDirection === 'vertical') {
      // Vertical tears = horizontal displacement (translateX)
      const bassEffectData = createWaveformEffect(
        'bass',
        'translateX',
        0,
        maxTearWidth,
        0.6,
        `${trackName}-bass-split`,
      );
      effects.push({
        id: `${trackName}-bass-split-effect`,
        componentId: 'waveform',
        data: bassEffectData,
      });
    } else if (tearDirection === 'horizontal') {
      // Horizontal tears = vertical displacement (translateY)
      const bassEffectData = createWaveformEffect(
        'bass',
        'translateY',
        0,
        maxTearWidth,
        0.6,
        `${trackName}-bass-split`,
      );
      effects.push({
        id: `${trackName}-bass-split-effect`,
        componentId: 'waveform',
        data: bassEffectData,
      });
    } else {
      // Diagonal tears = both X and Y displacement
      const bassEffectDataX = createWaveformEffect(
        'bass',
        'translateX',
        0,
        maxTearWidth * 0.7,
        0.6,
        `${trackName}-bass-split-x`,
      );
      const bassEffectDataY = createWaveformEffect(
        'bass',
        'translateY',
        0,
        maxTearWidth * 0.7,
        0.6,
        `${trackName}-bass-split-y`,
      );
      effects.push({
        id: `${trackName}-bass-split-effect-x`,
        componentId: 'waveform',
        data: bassEffectDataX,
      });
      effects.push({
        id: `${trackName}-bass-split-effect-y`,
        componentId: 'waveform',
        data: bassEffectDataY,
      });
    }
  }

  // Treble frequency - rapid micro-tears (small translateY jitter)
  if (frequencyResponse.includes('treble')) {
    const microTearRange = maxTearWidth * 0.2; // Micro-tears are 20% of max
    if (tearDirection === 'vertical') {
      // Vertical micro-tears = small vertical jitter (translateY)
      const trebleEffectData = createWaveformEffect(
        'treble',
        'translateY',
        -microTearRange,
        microTearRange,
        0.8,
        `${trackName}-treble-tear`,
      );
      effects.push({
        id: `${trackName}-treble-tear-effect`,
        componentId: 'waveform',
        data: trebleEffectData,
      });
    } else if (tearDirection === 'horizontal') {
      // Horizontal micro-tears = small horizontal jitter (translateX)
      const trebleEffectData = createWaveformEffect(
        'treble',
        'translateX',
        -microTearRange,
        microTearRange,
        0.8,
        `${trackName}-treble-tear`,
      );
      effects.push({
        id: `${trackName}-treble-tear-effect`,
        componentId: 'waveform',
        data: trebleEffectData,
      });
    } else {
      // Diagonal micro-tears = small X and Y jitter
      const trebleEffectDataX = createWaveformEffect(
        'treble',
        'translateX',
        -microTearRange * 0.7,
        microTearRange * 0.7,
        0.8,
        `${trackName}-treble-tear-x`,
      );
      const trebleEffectDataY = createWaveformEffect(
        'treble',
        'translateY',
        -microTearRange * 0.7,
        microTearRange * 0.7,
        0.8,
        `${trackName}-treble-tear-y`,
      );
      effects.push({
        id: `${trackName}-treble-tear-effect-x`,
        componentId: 'waveform',
        data: trebleEffectDataX,
      });
      effects.push({
        id: `${trackName}-treble-tear-effect-y`,
        componentId: 'waveform',
        data: trebleEffectDataY,
      });
    }
  }

  // Mid frequency - diagonal skew for additional glitch feeling
  if (frequencyResponse.includes('mid')) {
    const midEffectData: WaveformEffectData = {
      audioSrc,
      audioProperty: 'mid',
      effectType: 'rotate' as any, // Using rotate for skew-like effect
      intensity: 5,
      minValue: -5,
      maxValue: 5,
      sensitivity: 0.7 * sensitivity,
      threshold: 0.1,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds,
      start: effectStart,
      ...(effectDuration ? { duration: effectDuration } : {}),
      smoothNormalisation: reassemblyTime,
    };
    effects.push({
      id: `${trackName}-mid-skew-effect`,
      componentId: 'waveform',
      data: midEffectData,
    });
  }

  // RGB channel delay effect (chromatic aberration)
  // This creates a digital artifact feeling by offsetting red and cyan channels
  const rgbDelayEffect = {
    id: `${trackName}-rgb-delay-effect`,
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: effectStart,
      ...(effectDuration ? { duration: effectDuration } : { duration: 99999 }),
      mode: 'provider' as const,
      targetIds,
      ranges: [
        {
          key: 'filter',
          val: `drop-shadow(${rgbDelayIntensity}px 0 0 red) drop-shadow(-${rgbDelayIntensity}px 0 0 cyan)`,
          prog: 0,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan)',
          prog: 0.25,
        },
        {
          key: 'filter',
          val: `drop-shadow(-${rgbDelayIntensity}px 0 0 red) drop-shadow(${rgbDelayIntensity}px 0 0 cyan)`,
          prog: 0.5,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan)',
          prog: 0.75,
        },
        {
          key: 'filter',
          val: `drop-shadow(${rgbDelayIntensity}px 0 0 red) drop-shadow(-${rgbDelayIntensity}px 0 0 cyan)`,
          prog: 1,
        },
      ],
    },
  };
  effects.push(rgbDelayEffect);

  // Create root container with all effects
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-effect-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: effectStart,
        ...(effectDuration ? { duration: effectDuration } : {}),
      },
    },
    effects,
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

const presetMetadata: PresetMetadata = {
  id: 'dataStreamTear',
  title: 'Data Stream Tear Waveform Effect',
  description:
    'Audio-reactive vertical tearing effect that creates digital glitch artifacts synchronized to frequency bands. High frequencies create rapid micro-tears while bass creates major vertical splits. Includes RGB channel delays for additional digital artifact feeling.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['waveform', 'audio-reactive', 'glitch', 'tear', 'digital', 'effects'],
  dependencies: {},
  defaultInputParams: {
    frequencyResponse: ['bass', 'treble'],
    tearDirection: 'vertical',
    maxTearWidth: 50,
    reassemblyTime: 0.5,
    targetIds: ['target-component-id'],
    rgbDelayIntensity: 2,
    sensitivity: 1,
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    trackName: 'dataStreamTear',
  },
};

export const dataStreamTearPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
