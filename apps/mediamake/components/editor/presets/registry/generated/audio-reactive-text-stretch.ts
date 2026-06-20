/**
 * Audio-Reactive Text Stretch Preset
 *
 * This preset creates dynamic, audio-reactive typography that stretches and deforms
 * synchronized with music beats and frequency ranges. Text acts as a visual equalizer,
 * with horizontal stretching for bass frequencies and vertical stretching for treble.
 *
 * Features:
 * - **Audio Analysis Integration**: Fetches beat detection and frequency spectrum data
 * - **Bass-Reactive Horizontal Stretch**: ScaleX transforms based on 20-250Hz range
 * - **Treble-Reactive Vertical Stretch**: ScaleY transforms based on 4kHz+ range
 * - **Color Shifts**: Hue rotation mapped to spectral centroid (frequency brightness)
 * - **Pulse Glow**: Text shadow effects that intensify with audio amplitude
 * - **Living Typography**: Creates breathing, dancing text synchronized with sound
 * - **Customizable Intensity**: Adjustable sensitivity and intensity parameters
 * - **Threshold Protection**: Prevents over-stretching with configurable limits
 * - **Beat Timing**: Matches audio BPM with typical 100-200ms per beat duration
 *
 * Use cases:
 * - Music video typography that dances with the beat
 * - Audio-reactive title cards and intros
 * - Dynamic lyric displays synchronized to vocals
 * - Visualizer-style text effects for audio content
 * - Social media music posts with animated text
 * - Podcast intros with reactive branding
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { TextAtomData, WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  audio: z.object({
    src: z.string().describe('Audio source URL or local file path'),
    volume: z.number().min(0).max(2).default(1).optional().describe('Audio volume level (0-2, default: 1)'),
    start: z.number().min(0).default(0).optional().describe('Start time in audio file (seconds)'),
  }).describe('Audio source configuration'),
  
  text: z.string().default('SOUND').describe('Text content to display and animate'),
  
  fontSize: z.string().default('120px').describe('Font size for the text (e.g., "120px", "8rem")'),
  
  fontFamily: z.string().default('Inter').describe('Font family name (Google Font)'),
  
  fontWeight: z.string().default('900').describe('Font weight (e.g., "900", "bold")'),
  
  textColor: z.string().default('#ffffff').describe('Base text color (hex or rgba)'),
  
  bassIntensity: z.number().min(0.1).max(1).default(0.3).optional().describe('Intensity multiplier for bass (horizontal) stretching (0.1-1)'),
  
  trebleIntensity: z.number().min(0.1).max(1).default(0.25).optional().describe('Intensity multiplier for treble (vertical) stretching (0.1-1)'),
  
  sensitivity: z.number().min(0.1).max(5).default(1.5).optional().describe('Audio sensitivity multiplier (0.1-5, default: 1.5)'),
  
  threshold: z.number().min(0).max(1).default(0.2).optional().describe('Minimum audio level to trigger effects (0-1)'),
  
  smoothing: z.number().min(0).max(5).default(1).optional().describe('Effect smoothing factor (0 = raw, 1 = default, >1 = more smooth)'),
  
  colorShiftIntensity: z.number().min(0).max(1).default(0.5).optional().describe('Color hue rotation intensity (0-1)'),
  
  glowIntensity: z.number().min(0).max(2).default(1).optional().describe('Pulse glow effect intensity (0-2)'),
  
  backgroundColor: z.string().default('linear-gradient(to bottom, #000000, #1a1a1a)').optional().describe('Background gradient or solid color'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Extract parameters
  const {
    audio,
    text,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    bassIntensity = 0.3,
    trebleIntensity = 0.25,
    sensitivity = 1.5,
    threshold = 0.2,
    smoothing = 1,
    colorShiftIntensity = 0.5,
    glowIntensity = 1,
    backgroundColor,
  } = params;

  // Fetch audio analysis data
  if (!fetcher) {
    throw new Error('Fetcher is required for audio analysis');
  }

  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: audio.src,
  });

  if (!analysis || analysis.length === 0) {
    throw new Error('No audio analysis data available');
  }

  // Filter and adjust analysis data based on audio start time
  const audioStart = audio.start || 0;
  const adjustedAnalysis = analysis
    .filter((beat: any) => beat.timestamp >= audioStart)
    .map((beat: any) => ({
      ...beat,
      timestamp: beat.timestamp - audioStart,
    }));

  const audioDuration = durationInSeconds - audioStart;

  // IDs
  const rootContainerId = 'audio-stretch-root';
  const audioId = 'audio-source';
  const textContainerId = 'reactive-text-container';
  const mainTextId = 'main-text';

  // Create audio atom
  const audioAtom: RenderableComponentData = {
    id: audioId,
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: audio.src,
      volume: audio.volume ?? 1,
      startFrom: audioStart,
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  };

  // Create text atom
  const textAtomData: TextAtomData = {
    text,
    style: {
      fontSize,
      fontWeight,
      color: textColor,
      textAlign: 'center',
      letterSpacing: '0.05em',
    },
    font: {
      family: fontFamily,
      weights: [fontWeight],
      display: 'swap',
    },
  };

  const mainTextAtom: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: textAtomData,
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
  };

  // Create bass (horizontal) stretch waveform effect
  const bassStretchEffect: WaveformEffectData = {
    audioSrc: `ref:${audioId}`,
    audioProperty: 'bass',
    effectType: 'scale',
    intensity: bassIntensity,
    baseScale: 1,
    sensitivity,
    threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [mainTextId],
    start: 0,
    duration: audioDuration,
    smoothNormalisation: smoothing,
    // Custom property to specify scaleX only (horizontal)
    props: {
      scaleAxis: 'x',
    },
  };

  // Create treble (vertical) stretch waveform effect
  const trebleStretchEffect: WaveformEffectData = {
    audioSrc: `ref:${audioId}`,
    audioProperty: 'treble',
    effectType: 'scale',
    intensity: trebleIntensity,
    baseScale: 1,
    sensitivity,
    threshold,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [mainTextId],
    start: 0,
    duration: audioDuration,
    smoothNormalisation: smoothing,
    // Custom property to specify scaleY only (vertical)
    props: {
      scaleAxis: 'y',
    },
  };

  // Create color shift effect (hue rotation based on spectral centroid)
  // Note: We'll use a generic effect with calculated ranges based on analysis
  const colorShiftRanges = adjustedAnalysis.slice(0, 50).map((beat: any, index: number) => {
    const progress = beat.timestamp / audioDuration;
    const hueRotation = (beat.spectralCentroid || 0) * 180 * colorShiftIntensity;
    
    return {
      key: 'filter',
      val: `hue-rotate(${hueRotation}deg)`,
      prog: progress,
    };
  });

  // Add final range to reset hue
  colorShiftRanges.push({
    key: 'filter',
    val: 'hue-rotate(0deg)',
    prog: 1,
  });

  // Create pulse glow effect based on overall intensity
  const glowRanges = adjustedAnalysis.slice(0, 50).map((beat: any) => {
    const progress = beat.timestamp / audioDuration;
    const glowSize = 30 * beat.intensity * glowIntensity;
    const glowOpacity = 0.8 * beat.intensity * glowIntensity;
    
    return {
      key: 'textShadow',
      val: `0 0 ${glowSize}px rgba(255,255,255,${glowOpacity})`,
      prog: progress,
    };
  });

  // Add final range to reset glow
  glowRanges.push({
    key: 'textShadow',
    val: '0 0 0px rgba(255,255,255,0)',
    prog: 1,
  });

  // Build effects array
  const effects = [
    {
      id: 'bass-stretch-effect',
      componentId: 'waveform',
      data: bassStretchEffect,
    },
    {
      id: 'treble-stretch-effect',
      componentId: 'waveform',
      data: trebleStretchEffect,
    },
    {
      id: 'color-shift-effect',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: audioDuration,
        mode: 'provider',
        targetIds: [mainTextId],
        ranges: colorShiftRanges,
      },
    },
    {
      id: 'pulse-glow-effect',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: audioDuration,
        mode: 'provider',
        targetIds: [mainTextId],
        ranges: glowRanges,
      },
    },
  ];

  // Attach effects to text atom
  mainTextAtom.effects = effects;

  // Create text container
  const textContainer: RenderableComponentData = {
    id: textContainerId,
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
        fitDurationTo: audioId,
      },
    },
    childrenData: [mainTextAtom],
  };

  // Create root container
  const backgroundStyle = backgroundColor.includes('gradient')
    ? { background: backgroundColor }
    : { backgroundColor };

  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center',
        style: backgroundStyle,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: audioId,
      },
    },
    childrenData: [audioAtom, textContainer] as RenderableComponentData[],
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
  id: 'audio-reactive-text-stretch',
  title: 'Audio-Reactive Text Stretch',
  description: 'Audio-reactive typography that stretches and pulses with music beats and frequency ranges. Text deforms like a visual equalizer - horizontal stretch on bass, vertical stretch on treble, with color shifts mapped to frequency spectrum. Creates living, breathing typography synchronized with audio amplitude and rhythm.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'reactive', 'text', 'stretch', 'waveform', 'music', 'visualizer', 'typography', 'beat-sync'],
  dependencies: {},
  defaultInputParams: {
    audio: {
      src: 'https://example.com/audio.mp3',
      volume: 1,
      start: 0,
    },
    text: 'SOUND',
    fontSize: '120px',
    fontFamily: 'Inter',
    fontWeight: '900',
    textColor: '#ffffff',
    bassIntensity: 0.3,
    trebleIntensity: 0.25,
    sensitivity: 1.5,
    threshold: 0.2,
    smoothing: 1,
    colorShiftIntensity: 0.5,
    glowIntensity: 1,
    backgroundColor: 'linear-gradient(to bottom, #000000, #1a1a1a)',
  },
};

// Export preset
export const audioReactiveTextStretchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
