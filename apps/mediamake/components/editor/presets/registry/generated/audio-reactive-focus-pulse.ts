/**
 * Audio-Reactive Focus Pulse Preset
 *
 * This preset creates a music-video style text effect where typography sharpness responds
 * dynamically to audio intensity. The text continuously shifts between blurred and sharp states
 * synchronized with beats and waveform data. It includes complementary scale and brightness variations
 * that create an organic, breathing effect connected to the soundtrack rhythm. Features baseline blur
 * animation ensuring constant motion even during quiet audio moments.
 *
 * Features:
 * - **Audio-Reactive Blur**: Text sharpness responds to audio intensity (louder = sharper)
 * - **Waveform Analysis**: Uses real-time audio analysis to drive blur amount (0-8px range)
 * - **Scale Variation**: Secondary scale effect (0.98-1.05) synchronized with audio
 * - **Brightness Pulse**: Optional brightness waveform reacting to treble frequencies
 * - **Baseline Animation**: Subtle blur oscillation (0-2px) ensures constant motion
 * - **Music-Video Aesthetic**: Living, breathing text that becomes part of the rhythm
 *
 * Use cases:
 * - Creating dynamic music video typography
 * - Building audio-reactive title sequences
 * - Adding rhythmic text effects for promotional videos
 * - Creating immersive audio-visual experiences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type {
  WaveformEffectData,
  GenericEffectData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  audioSrc: z.string().describe('Audio source URL or ref:componentId for waveform analysis'),
  
  // Text styling
  fontSize: z.number().default(120).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family name'),
  textColor: z.string().default('#FFFFFF').describe('Text color (CSS color value)'),
  
  // Audio-reactive blur configuration
  blurSensitivity: z.number().min(0.1).max(2).default(0.8).describe('Blur effect sensitivity to audio (0.1-2)'),
  blurThreshold: z.number().min(0).max(1).default(0.3).describe('Minimum audio intensity to trigger blur reduction (0-1)'),
  minBlur: z.number().min(0).max(10).default(0).describe('Minimum blur amount in pixels (sharp state)'),
  maxBlur: z.number().min(0).max(20).default(8).describe('Maximum blur amount in pixels (blurred state)'),
  
  // Audio-reactive scale configuration
  scaleEnabled: z.boolean().default(true).describe('Enable audio-reactive scale effect'),
  scaleSensitivity: z.number().min(0.1).max(2).default(1.0).describe('Scale effect sensitivity to audio'),
  minScale: z.number().min(0.5).max(1.5).default(0.98).describe('Minimum scale value'),
  maxScale: z.number().min(0.5).max(1.5).default(1.05).describe('Maximum scale value'),
  
  // Brightness pulse configuration
  brightnessEnabled: z.boolean().default(true).describe('Enable brightness pulse effect'),
  brightnessSensitivity: z.number().min(0.1).max(2).default(0.6).describe('Brightness effect sensitivity'),
  minBrightness: z.number().min(0.5).max(1.5).default(1.0).describe('Minimum brightness value'),
  maxBrightness: z.number().min(0.5).max(2).default(1.3).describe('Maximum brightness value'),
  
  // Baseline animation
  baselineBlurEnabled: z.boolean().default(true).describe('Enable baseline blur oscillation'),
  baselineBlurAmount: z.number().min(0).max(5).default(2).describe('Baseline blur oscillation amount in pixels'),
  baselineBlurDuration: z.number().min(0.5).max(5).default(2).describe('Duration of baseline blur cycle in seconds'),
  
  // Timing
  duration: z.number().optional().describe('Duration in seconds (auto-calculated from audio if not provided)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;
  
  // Fetch audio analysis data
  let audioDuration = params.duration;
  
  if (!audioDuration && fetcher) {
    try {
      const audioAnalysis = await fetcher('/api/analyze-audio', {
        audioSrc: params.audioSrc,
      });
      
      if (audioAnalysis && audioAnalysis.durationInSeconds) {
        audioDuration = audioAnalysis.durationInSeconds;
      }
    } catch (error) {
      console.warn('Failed to fetch audio duration, using default 30s', error);
      audioDuration = 30;
    }
  }
  
  if (!audioDuration) {
    audioDuration = 30; // Default fallback
  }
  
  const textId = 'focus-pulse-text';
  const audioId = 'focus-pulse-audio';
  
  // Build effects array
  const effects: any[] = [];
  
  // 1. Audio-reactive blur waveform effect (inverse: louder = less blur)
  const blurEffect: WaveformEffectData = {
    audioSrc: params.audioSrc,
    audioProperty: 'waveform', // Use overall waveform intensity
    effectType: 'blur',
    sensitivity: params.blurSensitivity,
    threshold: params.blurThreshold,
    minValue: params.minBlur,
    maxValue: params.maxBlur,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30, // 30fps analysis
    mode: 'provider',
    targetIds: [textId],
    start: 0,
    duration: audioDuration,
    smoothNormalisation: 1, // Default smoothing
  };
  
  effects.push({
    id: 'blur-waveform-effect',
    componentId: 'waveform',
    data: blurEffect,
  });
  
  // 2. Audio-reactive scale waveform effect
  if (params.scaleEnabled) {
    const scaleEffect: WaveformEffectData = {
      audioSrc: params.audioSrc,
      audioProperty: 'bass', // Scale responds to bass frequencies
      effectType: 'scale',
      sensitivity: params.scaleSensitivity,
      threshold: 0.2,
      minValue: params.minScale,
      maxValue: params.maxScale,
      baseScale: 1,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [textId],
      start: 0,
      duration: audioDuration,
      smoothNormalisation: 1,
    };
    
    effects.push({
      id: 'scale-waveform-effect',
      componentId: 'waveform',
      data: scaleEffect,
    });
  }
  
  // 3. Brightness pulse waveform effect (treble frequencies)
  if (params.brightnessEnabled) {
    const brightnessEffect: WaveformEffectData = {
      audioSrc: params.audioSrc,
      audioProperty: 'treble', // Brightness responds to treble
      effectType: 'exposure',
      sensitivity: params.brightnessSensitivity,
      threshold: 0.25,
      intensity: 1.0,
      baseBrightness: params.minBrightness,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [textId],
      start: 0,
      duration: audioDuration,
      smoothNormalisation: 1,
    };
    
    // Map brightness to filter brightness
    const brightnessData = {
      ...brightnessEffect,
      minValue: params.minBrightness,
      maxValue: params.maxBrightness,
    };
    
    effects.push({
      id: 'brightness-waveform-effect',
      componentId: 'waveform',
      data: brightnessData,
    });
  }
  
  // 4. Baseline blur oscillation (generic effect for constant motion)
  if (params.baselineBlurEnabled) {
    const baselineBlurEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        // Oscillate between 0 and baselineBlurAmount
        { key: 'blur', val: `0px`, prog: 0 },
        { key: 'blur', val: `${params.baselineBlurAmount}px`, prog: 0.25 },
        { key: 'blur', val: `0px`, prog: 0.5 },
        { key: 'blur', val: `${params.baselineBlurAmount}px`, prog: 0.75 },
        { key: 'blur', val: `0px`, prog: 1 },
      ],
    };
    
    effects.push({
      id: 'baseline-blur-effect',
      componentId: 'generic',
      data: baselineBlurEffect,
    });
  }
  
  // Create text atom
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        color: params.textColor,
        fontWeight: 'bold',
        textAlign: 'center',
      },
      font: {
        family: params.fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  };
  
  // Create audio atom
  const audioAtom: RenderableComponentData = {
    id: audioId,
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: params.audioSrc,
      volume: 1,
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  };
  
  // Root container with effects applied
  const rootContainer: RenderableComponentData = {
    id: 'audio-reactive-focus-pulse-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    effects,
    childrenData: [audioAtom, textAtom],
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
  id: 'audio-reactive-focus-pulse',
  title: 'Audio-Reactive Focus Pulse',
  description:
    'A music-video style text effect where typography sharpness responds dynamically to audio intensity. The text continuously shifts between blurred and sharp states synchronized with beats and waveform data. Includes complementary scale and brightness variations that create an organic, breathing effect connected to the soundtrack rhythm. Features baseline blur animation ensuring constant motion even during quiet audio moments.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'waveform', 'text', 'effects', 'music-video', 'reactive'],
  defaultInputParams: {
    text: 'FEEL THE BEAT',
    audioSrc: 'https://example.com/audio.mp3',
    fontSize: 120,
    fontFamily: 'Inter',
    textColor: '#FFFFFF',
    blurSensitivity: 0.8,
    blurThreshold: 0.3,
    minBlur: 0,
    maxBlur: 8,
    scaleEnabled: true,
    scaleSensitivity: 1.0,
    minScale: 0.98,
    maxScale: 1.05,
    brightnessEnabled: true,
    brightnessSensitivity: 0.6,
    minBrightness: 1.0,
    maxBrightness: 1.3,
    baselineBlurEnabled: true,
    baselineBlurAmount: 2,
    baselineBlurDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const audioReactiveFocusPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};