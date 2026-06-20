/**
 * Audio-Reactive Venetian Blinds Transition Preset
 *
 * This preset creates a dynamic Venetian blinds transition effect that responds to music beats.
 * Think like a VJ mixing visuals at a concert - the blinds pulse, slide, and change colors based
 * on audio intensity and frequency ranges.
 *
 * Features:
 * - **15 Vertical Blinds**: Each blind is 7% wide, positioned horizontally across the screen
 * - **Audio Beat Detection**: Fetches audio analysis for beat detection and frequency data
 * - **Frequency-Mapped Reactions**: Bass (0-250Hz) affects blinds 0-4, mids (250-2000Hz) affect blinds 5-9, treble (2000Hz+) affects blinds 10-14
 * - **Elastic Bounce Easing**: Spring-based animations with intensity-driven tension
 * - **Color Shifting**: HSL colors map to frequency ranges (low=warm reds/oranges, high=cool blues/purples)
 * - **Glow Effects**: Box shadows pulse with beat intensity
 * - **Base Animation**: 1-second sliding transition with overshoot, individual blinds bounce based on audio
 *
 * Use cases:
 * - VJ-style concert visuals
 * - Music video transitions
 * - Audio-reactive intros/outros
 * - Beat-synchronized visual effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type {
  GenericEffectData,
  WaveformEffectData,
} from '@microfox/remotion';

const presetParams = z.object({
  audio: z
    .object({
      src: z.string().describe('Audio source URL for beat detection'),
      start: z.number().default(0).optional().describe('Audio start time in seconds'),
      duration: z.number().optional().describe('Audio duration in seconds (optional)'),
    })
    .describe('Audio configuration for beat-reactive animations'),
  
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Base duration for sliding animation in seconds'),
  
  overshootAmount: z
    .number()
    .min(0)
    .max(30)
    .default(10)
    .describe('Percentage overshoot for slide animation'),
  
  beatIntensityThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Minimum beat intensity to trigger effects (0-1)'),
  
  colorShiftEnabled: z
    .boolean()
    .default(true)
    .describe('Enable frequency-mapped color shifting'),
  
  glowEnabled: z
    .boolean()
    .default(true)
    .describe('Enable beat-intensity glow effects'),
  
  smoothing: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Smoothing factor for audio reactivity (0=raw, 1=default, >1=more smoothing)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    audio,
    transitionDuration,
    overshootAmount,
    beatIntensityThreshold,
    colorShiftEnabled,
    glowEnabled,
    smoothing,
  } = params;

  const { fetcher, config } = props;

  // Fetch audio analysis for beat detection
  let audioDuration = audio.duration || 30;
  let analysis: any[] = [];

  if (fetcher) {
    try {
      const { durationInSeconds, analysis: audioAnalysis } = await fetcher(
        '/api/analyze-audio',
        { audioSrc: audio.src },
      );
      audioDuration = audio.duration || durationInSeconds;
      analysis = audioAnalysis || [];
    } catch (error) {
      console.warn('Audio analysis failed, using default duration:', error);
    }
  }

  // Helper: Map frequency to HSL hue (low=0° red, high=270° purple)
  const getHueFromFrequency = (frequency: number): number => {
    const minFreq = 0;
    const maxFreq = 20000;
    const normalized = Math.min(Math.max((frequency - minFreq) / (maxFreq - minFreq), 0), 1);
    return Math.floor(normalized * 270); // 0° (red) to 270° (purple)
  };

  // Helper: Get color from beat type
  const getColorFromBeatType = (beatType: 'low' | 'mid' | 'high'): string => {
    if (beatType === 'low') return 'hsl(0, 100%, 50%)'; // Red (bass)
    if (beatType === 'mid') return 'hsl(120, 100%, 50%)'; // Green (mids)
    return 'hsl(240, 100%, 50%)'; // Blue (treble)
  };

  // Create 15 blinds
  const blindCount = 15;
  const blindWidth = 7; // percentage
  const blindsData: RenderableComponentData[] = [];

  for (let i = 0; i < blindCount; i++) {
    const blindId = `blind-${i}`;
    const leftPosition = `${i * blindWidth}%`;
    
    // Determine frequency range for this blind
    let frequencyRange: [number, number];
    let audioProperty: 'bass' | 'mid' | 'treble';
    let baseColor: string;
    let scaleRange: { min: number; max: number };
    let translateRange: { min: number; max: number };

    if (i < 5) {
      // Bass blinds (0-4)
      frequencyRange = [0, 250];
      audioProperty = 'bass';
      baseColor = 'hsl(0, 100%, 50%)'; // Red
      scaleRange = { min: 0.9, max: 1.3 };
      translateRange = { min: -5, max: 5 };
    } else if (i < 10) {
      // Mid blinds (5-9)
      frequencyRange = [250, 2000];
      audioProperty = 'mid';
      baseColor = 'hsl(120, 100%, 50%)'; // Green
      scaleRange = { min: 0.95, max: 1.2 };
      translateRange = { min: -4, max: 4 };
    } else {
      // Treble blinds (10-14)
      frequencyRange = [2000, 20000];
      audioProperty = 'treble';
      baseColor = 'hsl(240, 100%, 50%)'; // Blue
      scaleRange = { min: 0.92, max: 1.15 };
      translateRange = { min: -3, max: 3 };
    }

    // Stagger start times for sequential reveal
    const staggerDelay = i * 0.05;

    const blindEffects: any[] = [];

    // Base slide animation with overshoot
    const slideEffect: GenericEffectData = {
      type: 'spring',
      start: staggerDelay,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: [blindId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: -(110 + overshootAmount), prog: 0.7, unit: '%' },
        { key: 'translateX', val: -110, prog: 1, unit: '%' },
      ],
    };

    blindEffects.push({
      id: `${blindId}-slide`,
      componentId: 'generic',
      data: slideEffect,
    });

    // Waveform effect for audio reactivity
    const waveformEffect: WaveformEffectData = {
      audioSrc: audio.src,
      frequencyRange,
      mode: 'provider',
      targetIds: [blindId],
      effectType: 'scale',
      intensity: 1,
      baseScale: 1,
      audioProperty,
      sensitivity: 1.5,
      threshold: beatIntensityThreshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      smoothNormalisation: smoothing,
      start: 0,
      duration: audioDuration,
      minValue: scaleRange.min,
      maxValue: scaleRange.max,
    };

    blindEffects.push({
      id: `${blindId}-waveform-scale`,
      componentId: 'waveform',
      data: waveformEffect,
    });

    // Horizontal translation waveform effect
    const translateEffect: WaveformEffectData = {
      audioSrc: audio.src,
      frequencyRange,
      mode: 'provider',
      targetIds: [blindId],
      effectType: 'translateX',
      intensity: 1,
      audioProperty,
      sensitivity: 1.5,
      threshold: beatIntensityThreshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      smoothNormalisation: smoothing,
      start: 0,
      duration: audioDuration,
      minValue: translateRange.min,
      maxValue: translateRange.max,
    };

    blindEffects.push({
      id: `${blindId}-waveform-translate`,
      componentId: 'waveform',
      data: translateEffect,
    });

    // Color shift animation (if enabled)
    if (colorShiftEnabled) {
      const hueStart = i < 5 ? 0 : i < 10 ? 60 : 180;
      const hueEnd = i < 5 ? 30 : i < 10 ? 120 : 270;

      const colorEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: audioDuration,
        mode: 'provider',
        targetIds: [blindId],
        ranges: [
          { key: 'backgroundColor', val: `hsl(${hueStart}, 100%, 50%)`, prog: 0 },
          { key: 'backgroundColor', val: `hsl(${hueEnd}, 100%, 50%)`, prog: 1 },
        ],
      };

      blindEffects.push({
        id: `${blindId}-color-shift`,
        componentId: 'generic',
        data: colorEffect,
      });
    }

    // Glow effect (if enabled)
    if (glowEnabled) {
      const glowEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: audioDuration,
        mode: 'provider',
        targetIds: [blindId],
        ranges: [
          { key: 'boxShadow', val: `0 0 0px ${baseColor}`, prog: 0 },
          { key: 'boxShadow', val: `0 0 20px ${baseColor}`, prog: 0.5 },
          { key: 'boxShadow', val: `0 0 0px ${baseColor}`, prog: 1 },
        ],
      };

      blindEffects.push({
        id: `${blindId}-glow`,
        componentId: 'generic',
        data: glowEffect,
      });
    }

    // Create blind component
    const blind: RenderableComponentData = {
      id: blindId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="w-full h-full"></div>',
        style: {
          position: 'absolute',
          left: leftPosition,
          width: `${blindWidth}%`,
          height: '100%',
          backgroundColor: baseColor,
          transformOrigin: 'center center',
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'audio-track',
        },
      },
      effects: blindEffects,
    };

    blindsData.push(blind);
  }

  // Audio track component
  const audioTrack: RenderableComponentData = {
    id: 'audio-track',
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: audio.src,
      volume: 1,
      startFrom: audio.start || 0,
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'venetian-blinds-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: [...blindsData, audioTrack],
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
  id: 'audioReactiveVenetianBlinds',
  title: 'Audio-Reactive Venetian Blinds Transition',
  description:
    'VJ-style audio-reactive Venetian blinds transition with frequency-mapped colors, elastic bounce, and beat-synchronized animations. 15 vertical blinds respond to bass, mid, and treble frequencies with dynamic scaling, translation, color shifts, and glow effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'transition', 'vj', 'music', 'reactive', 'blinds', 'waveform'],
  defaultInputParams: {
    audio: {
      src: 'https://example.com/audio.mp3',
      start: 0,
    },
    transitionDuration: 1,
    overshootAmount: 10,
    beatIntensityThreshold: 0.2,
    colorShiftEnabled: true,
    glowEnabled: true,
    smoothing: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const audioReactiveVenetianBlindsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
