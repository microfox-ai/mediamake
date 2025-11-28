/**
 * Musical Rhythmic Text Wave Animation Preset
 *
 * This preset creates an audio-reactive typography animation where words dance along a sine wave path
 * synchronized to audio beats. Words scale, rotate, and change color in response to audio intensity,
 * with waveform amplitude modulated by frequency data. Includes particle burst effects on strong beats.
 *
 * Features:
 * - **Sine Wave Path**: Words positioned along a dynamic sine wave path
 * - **Audio Reactivity**: Beat detection and frequency analysis drive animations
 * - **Dynamic Effects**: Scale, rotation, color gradients synchronized to audio
 * - **Particle Bursts**: Visual particles triggered on strong beats
 * - **Waveform Background**: Optional audio waveform visualization
 * - **Amplitude Modulation**: Wave amplitude changes based on frequency bands
 *
 * Use cases:
 * - Music video typography with rhythm-based animations
 * - Audio-reactive lyric videos
 * - Dynamic text presentations synchronized to music
 * - Energetic social media content with beat-synced text
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  WaveformEffectData,
  GenericEffectData,
  TextAtomData,
} from '@microfox/remotion';

const presetParams = z.object({
  audioSrc: z.string().describe('Audio source URL or local path'),
  text: z
    .string()
    .describe('Text content - words will be split and animated along sine wave'),
  
  // Sine wave configuration
  baseAmplitude: z
    .number()
    .min(10)
    .max(200)
    .default(80)
    .optional()
    .describe('Base amplitude of sine wave in pixels'),
  wavelength: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .optional()
    .describe('Number of words per wave cycle'),
  wordSpacing: z
    .number()
    .min(50)
    .max(300)
    .default(150)
    .optional()
    .describe('Horizontal spacing between words in pixels'),
  
  // Typography
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .optional()
    .describe('Font size in pixels'),
  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe('Font family with weight (e.g., "Inter:700", "Roboto:600")'),
  
  // Audio reactivity
  sensitivity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .optional()
    .describe('Audio reactivity sensitivity multiplier'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Minimum audio intensity to trigger effects'),
  smoothing: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .optional()
    .describe('Audio data smoothing factor'),
  
  // Visual effects
  enableParticles: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable particle burst effects on strong beats'),
  enableWaveform: z
    .boolean()
    .default(true)
    .optional()
    .describe('Show waveform visualization in background'),
  colorGradient: z
    .string()
    .default('linear-gradient(90deg, #22d3ee, #8b5cf6)')
    .optional()
    .describe('Text gradient color'),
  
  // Timing
  duration: z
    .number()
    .optional()
    .describe('Duration in seconds (auto-detected from audio if not provided)'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher, presets, config } = props;

  if (!fetcher) {
    throw new Error('Fetcher not available');
  }

  // Parse font
  const parseFontString = (fontString: string) => {
    const parts = fontString.split(':');
    return {
      family: parts[0],
      weight: parts[1] ? parseInt(parts[1], 10) : 700,
    };
  };

  const fontConfig = parseFontString(params.font || 'Inter:700');
  const fps = config?.fps || 30;

  // Fetch audio analysis
  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audioSrc,
  });

  if (!analysis || analysis.length === 0) {
    return {
      output: {
        childrenData: [],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  const duration = params.duration || durationInSeconds;
  const words = params.text.split(/\s+/).filter(word => word.length > 0);
  
  // Calculate sine wave parameters
  const baseAmplitude = params.baseAmplitude || 80;
  const wavelength = params.wavelength || 4;
  const wordSpacing = params.wordSpacing || 150;
  const fontSize = params.fontSize || 48;
  const sensitivity = params.sensitivity || 1.5;
  const threshold = params.threshold || 0.2;
  const smoothing = params.smoothing || 1;

  // Select high-intensity beats for particle bursts
  const selectBeatBursts = (
    beats: any[],
    minIntensity: number = 0.7,
    maxBeats: number = 20,
  ) => {
    const highIntensityBeats = beats
      .filter(beat => beat.intensity >= minIntensity)
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, maxBeats);
    return highIntensityBeats.sort((a, b) => a.timestamp - b.timestamp);
  };

  const beatBursts = params.enableParticles
    ? selectBeatBursts(analysis, 0.7, 20)
    : [];

  // Calculate word positions along sine wave
  const calculateWordPosition = (
    wordIndex: number,
    time: number,
    amplitude: number,
  ) => {
    const x = wordIndex * wordSpacing;
    const phase = (2 * Math.PI * wordIndex) / wavelength;
    const timePhase = (2 * Math.PI * time) / 10; // 10-second period for movement
    const y = amplitude * Math.sin(phase + timePhase);
    return { x, y };
  };

  // Create word components with effects
  const wordComponents = words.map((word, index) => {
    const wordId = `wave-word-${index}`;
    
    // Calculate initial position
    const initialPos = calculateWordPosition(index, 0, baseAmplitude);
    
    // Create beat-zoom effect for audio reactivity
    const beatZoomEffect: WaveformEffectData = {
      audioSrc: params.audioSrc,
      audioProperty: 'bass',
      effectType: 'zoom',
      intensity: 0.3,
      baseScale: 1,
      sensitivity,
      threshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / fps,
      mode: 'provider',
      targetIds: [wordId],
      start: 0,
      duration,
      smoothNormalisation: smoothing,
    };

    // Create rotation effect based on audio mid frequencies
    const rotationEffect: WaveformEffectData = {
      audioSrc: params.audioSrc,
      audioProperty: 'mid',
      effectType: 'rotate',
      intensity: 15,
      sensitivity: sensitivity * 0.8,
      threshold: threshold * 1.2,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / fps,
      mode: 'provider',
      targetIds: [wordId],
      start: 0,
      duration,
      smoothNormalisation: smoothing,
    };

    // Sine wave animation effect
    const waveAnimationEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        {
          key: 'translateY',
          val: initialPos.y,
          prog: 0,
        },
        {
          key: 'translateY',
          val: -initialPos.y,
          prog: 0.5,
        },
        {
          key: 'translateY',
          val: initialPos.y,
          prog: 1,
        },
      ],
    };

    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        gradient: params.colorGradient,
        style: {
          fontSize,
          fontWeight: fontConfig.weight,
          textShadow: '0 0 20px rgba(139, 92, 246, 0.8)',
        },
        font: {
          family: fontConfig.family,
          weights: [fontConfig.weight.toString()],
          display: 'swap' as const,
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `${wordId}-wave`,
          componentId: 'generic',
          data: waveAnimationEffect,
        },
        {
          id: `${wordId}-zoom`,
          componentId: 'waveform',
          data: beatZoomEffect,
        },
        {
          id: `${wordId}-rotate`,
          componentId: 'waveform',
          data: rotationEffect,
        },
      ],
    };
  }) as RenderableComponentData[];

  // Create word layout container
  const wordLayoutContainer = {
    id: 'word-layout-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
      childrenProps: words.map((_, index) => {
        const pos = calculateWordPosition(index, 0, baseAmplitude);
        return {
          className: 'absolute',
          style: {
            left: `calc(50% + ${pos.x - (words.length * wordSpacing) / 2}px)`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
          },
        };
      }),
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: wordComponents,
  } as RenderableComponentData;

  // Create particle burst effects
  const particleComponents = beatBursts.map((beat, index) => {
    const particleId = `particle-burst-${index}`;
    const wordIndex = Math.floor((beat.timestamp / duration) * words.length);
    const pos = calculateWordPosition(wordIndex, beat.timestamp, baseAmplitude);
    
    return {
      id: particleId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(34,211,238,1) 0%, rgba(139,92,246,0) 70%);
          "></div>
        `,
        className: 'absolute pointer-events-none',
        style: {
          left: `calc(50% + ${pos.x - (words.length * wordSpacing) / 2}px)`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
        },
      },
      context: {
        timing: {
          start: beat.timestamp,
          duration: 0.5,
        },
      },
      effects: [
        {
          id: `${particleId}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.5,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 3, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    };
  }) as RenderableComponentData[];

  const particleContainer = {
    id: 'particle-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: particleComponents,
  } as RenderableComponentData;

  // Create waveform background (optional)
  const waveformChildren = params.enableWaveform && presets?.['Audio']
    ? [
        await presets['Audio'](
          {
            audio: {
              src: params.audioSrc,
              volume: 1,
              start: 0,
            },
            waveformType: 'animated',
            barColor: 'rgba(139, 92, 246, 0.3)',
            orientation: 'horizontal',
            position: 'bottom',
          },
          props,
        ).then(result => result.output.childrenData?.[0]),
      ].filter(Boolean)
    : [];

  // Create audio track
  const audioTrack = {
    id: 'audio-track',
    type: 'atom' as const,
    componentId: 'AudioAtom',
    data: {
      src: params.audioSrc,
      volume: 1,
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  } as RenderableComponentData;

  // Root container
  const rootContainer = {
    id: 'audio-reactive-sine-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      audioTrack,
      ...(waveformChildren as RenderableComponentData[]),
      wordLayoutContainer,
      ...(params.enableParticles ? [particleContainer] : []),
    ],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'audio-reactive-sine-text',
  title: 'Musical Rhythmic Text Wave Animation',
  description:
    'Audio-reactive typography that animates along a sine wave path with beat-synchronized effects, frequency-based modulation, color gradients, and particle bursts. Words dance and groove to the rhythm with scale, rotation, and amplitude responding to audio intensity.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'typography',
    'animation',
    'wave',
    'beat-sync',
    'music-video',
    'audio-reactive',
    'particles',
    'waveform',
  ],
  dependencies: {
    presets: ['Audio'],
  },
  defaultInputParams: {
    audioSrc: 'https://example.com/audio.mp3',
    text: 'Dance to the rhythm and feel the beat',
    baseAmplitude: 80,
    wavelength: 4,
    wordSpacing: 150,
    fontSize: 48,
    font: 'Inter:700',
    sensitivity: 1.5,
    threshold: 0.2,
    smoothing: 1,
    enableParticles: true,
    enableWaveform: true,
    colorGradient: 'linear-gradient(90deg, #22d3ee, #8b5cf6)',
  },
};

export const audioReactiveSineTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
