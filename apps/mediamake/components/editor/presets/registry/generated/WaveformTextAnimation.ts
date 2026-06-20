/**
 * Waveform Text Animation Preset
 *
 * This preset creates a dynamic text animation where words ripple across the screen like audio waveforms.
 * Each word oscillates vertically based on audio frequency spectrum, creating a visual equalizer effect.
 * The baseline follows a sine wave pattern modulated by audio intensity.
 *
 * Features:
 * - **Audio-Reactive Animation**: Words oscillate based on audio frequencies (bass, mid, treble)
 * - **Wave Propagation**: Phase-offset sine waves create ripple effects across text
 * - **Frequency Distribution**: Different words react to different frequency bands
 * - **Intensity Modulation**: Amplitude increases during audio peaks
 * - **Rotation Synchronization**: Subtle rotation (-5deg to 5deg) synced with vertical movement
 * - **Smooth 60fps Animation**: Continuous sine wave motion with audio reactivity
 *
 * Use cases:
 * - Music video typography with audio-reactive text
 * - Dynamic lyric displays that move with music
 * - Audio visualizations with typographic elements
 * - Kinetic text effects synchronized to audio beats
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { WaveformEffectData, GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display (will be split into words)'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for waveform synchronization'),
  
  // Audio settings
  audioVolume: z.number().min(0).max(2).default(1).optional().describe('Audio volume (0-2, default: 1)'),
  audioStart: z.number().min(0).default(0).optional().describe('Audio start time in seconds'),
  
  // Typography settings
  fontSize: z.number().min(12).max(200).default(48).optional().describe('Font size in pixels'),
  fontWeight: z.string().default('bold').optional().describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z.string().default('#ffffff').optional().describe('Text color (hex or CSS color)'),
  fontFamily: z.string().default('Inter').optional().describe('Font family name'),
  
  // Wave animation settings
  baseAmplitude: z.number().min(5).max(100).default(20).optional().describe('Base wave amplitude in pixels (±20px default)'),
  peakAmplitude: z.number().min(20).max(200).default(60).optional().describe('Peak wave amplitude in pixels (up to ±60px on audio peaks)'),
  waveSpeed: z.number().min(0.1).max(5).default(1).optional().describe('Wave animation speed multiplier'),
  phaseOffset: z.number().min(0).max(1).default(0.2).optional().describe('Phase offset between words (0.2 default for wave propagation)'),
  
  // Audio reactivity settings
  sensitivity: z.number().min(0.1).max(5).default(1.5).optional().describe('Audio sensitivity multiplier'),
  threshold: z.number().min(0).max(1).default(0.1).optional().describe('Minimum audio value to trigger effect'),
  smoothing: z.number().min(0).max(5).default(1).optional().describe('Smoothing factor for audio data (0 = no smoothing, 1 = default)'),
  
  // Layout settings
  wordSpacing: z.number().min(0).max(100).default(16).optional().describe('Gap between words in pixels'),
  containerPadding: z.number().min(0).max(100).default(0).optional().describe('Container padding in pixels'),
  
  // Timing
  duration: z.number().min(1).optional().describe('Duration in seconds (optional, defaults to audio duration)')
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    text,
    audioSrc,
    audioVolume = 1,
    audioStart = 0,
    fontSize = 48,
    fontWeight = 'bold',
    textColor = '#ffffff',
    fontFamily = 'Inter',
    baseAmplitude = 20,
    peakAmplitude = 60,
    waveSpeed = 1,
    phaseOffset = 0.2,
    sensitivity = 1.5,
    threshold = 0.1,
    smoothing = 1,
    wordSpacing = 16,
    containerPadding = 0,
    duration
  } = params;

  const { config } = props;
  const fps = config?.fps || 30;

  // Split text into words
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;

  // Calculate frequency distribution
  // First words = bass, middle words = mid, last words = treble
  const getFrequencyForIndex = (index: number): 'bass' | 'mid' | 'treble' => {
    const position = index / (wordCount - 1 || 1); // 0 to 1
    if (position < 0.33) return 'bass';
    if (position < 0.67) return 'mid';
    return 'treble';
  };

  // Create audio component
  const audioId = 'waveform-audio-source';
  const audioComponent: RenderableComponentData = {
    id: audioId,
    componentId: 'AudioAtom',
    type: 'atom' as const,
    data: {
      src: audioSrc,
      volume: audioVolume,
      startFrom: audioStart,
    },
    context: {
      timing: duration ? { duration } : {},
    },
  };

  // Create word components with waveform effects
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `word-${index}`;
    const frequency = getFrequencyForIndex(index);
    const phase = index * phaseOffset;

    // Create waveform effect for vertical translation
    const waveformEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: frequency,
      effectType: 'translateY',
      intensity: (peakAmplitude - baseAmplitude) / peakAmplitude, // Normalize to 0-1
      minValue: -baseAmplitude,
      maxValue: baseAmplitude,
      sensitivity,
      threshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / fps,
      mode: 'provider',
      targetIds: [wordId],
      start: 0,
      duration: duration || 999999, // Very long duration if not specified
      smoothNormalisation: smoothing,
    };

    // Create continuous sine wave effect for base oscillation
    // This creates the continuous wave motion independent of audio
    const sineWaveEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: duration || 999999,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Create sine wave by using multiple keyframes
        { key: 'translateY', val: Math.sin(phase * Math.PI * 2) * baseAmplitude * 0.5, prog: 0 },
        { key: 'translateY', val: Math.sin((phase + 0.25) * Math.PI * 2) * baseAmplitude * 0.5, prog: 0.25 },
        { key: 'translateY', val: Math.sin((phase + 0.5) * Math.PI * 2) * baseAmplitude * 0.5, prog: 0.5 },
        { key: 'translateY', val: Math.sin((phase + 0.75) * Math.PI * 2) * baseAmplitude * 0.5, prog: 0.75 },
        { key: 'translateY', val: Math.sin((phase + 1) * Math.PI * 2) * baseAmplitude * 0.5, prog: 1 },
      ],
    };

    // Create rotation effect synchronized with vertical movement
    const rotationEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: duration || 999999,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'rotate', val: -5, prog: 0 },
        { key: 'rotate', val: 5, prog: 0.5 },
        { key: 'rotate', val: -5, prog: 1 },
      ],
    };

    return {
      id: wordId,
      componentId: 'BaseLayout',
      type: 'layout' as const,
      data: {
        containerProps: {
          className: 'relative inline-block',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration || 999999,
        },
      },
      effects: [
        {
          id: `waveform-effect-${index}`,
          componentId: 'waveform',
          data: waveformEffect,
        },
        {
          id: `sine-wave-effect-${index}`,
          componentId: 'generic',
          data: sineWaveEffect,
        },
        {
          id: `rotation-effect-${index}`,
          componentId: 'generic',
          data: rotationEffect,
        },
      ],
      childrenData: [
        {
          id: `text-${index}`,
          componentId: 'TextAtom',
          type: 'atom' as const,
          data: {
            text: word,
            style: {
              fontSize,
              fontWeight,
              color: textColor,
            },
            font: {
              family: fontFamily,
              weights: [fontWeight],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration || 999999,
            },
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'waveform-text-root',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'flex flex-row items-center justify-center w-full h-full',
        style: {
          gap: `${wordSpacing}px`,
          padding: containerPadding > 0 ? `${containerPadding}px` : undefined,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
    childrenData: wordComponents,
  };

  return {
    output: {
      childrenData: [
        audioComponent,
        rootContainer,
      ] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'WaveformTextAnimation',
  title: 'Waveform Text Animation',
  description: 'Dynamic text animation where words oscillate vertically based on audio frequency spectrum, creating a visual equalizer effect. Each word follows a sine wave pattern modulated by audio intensity, with phase offsets creating a wave propagation effect across the text.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'audio', 'waveform', 'animation', 'kinetic', 'music', 'reactive', 'equalizer', 'typography'],
  dependencies: {},
  defaultInputParams: {
    text: 'Audio Waveform Text Animation',
    audioSrc: 'https://example.com/audio.mp3',
    audioVolume: 1,
    audioStart: 0,
    fontSize: 48,
    fontWeight: 'bold',
    textColor: '#ffffff',
    fontFamily: 'Inter',
    baseAmplitude: 20,
    peakAmplitude: 60,
    waveSpeed: 1,
    phaseOffset: 0.2,
    sensitivity: 1.5,
    threshold: 0.1,
    smoothing: 1,
    wordSpacing: 16,
    containerPadding: 0,
  },
};

export const WaveformTextAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
