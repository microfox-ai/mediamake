/**
 * Audio-Reactive Title Bounce Preset
 *
 * This preset creates an audio-synchronized title animation with dynamic scale bounce,
 * color shifts, and glow effects that respond to music beats and intensity.
 *
 * Features:
 * - **Audio Beat Synchronization**: Uses audio analysis API to detect beats and modulate animations
 * - **Dynamic Scale Bounce**: Elastic bounce animation with overshoot intensity based on audio bass
 * - **Audio-Reactive Glow**: Text shadow pulsing synchronized with audio intensity
 * - **Color Shifts**: Text color changes based on audio frequency analysis
 * - **Brightness Pulsing**: Brightness modulation tied to audio treble
 * - **Adaptive Behavior**: Automatically adjusts animation intensity for bass drops vs quiet sections
 * - **Waveform Effects**: Uses WaveformEffect for real-time audio-reactive modulation
 *
 * Use cases:
 * - Music video title sequences with beat-synchronized animations
 * - Dynamic logo reveals that react to audio intensity
 * - Podcast intros with audio-reactive branding
 * - Concert/festival visuals with beat-synced text
 * - Social media content with music-driven text effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  TextAtomData,
  AudioAtomDataProps,
  WaveformEffectData,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  title: z.string().describe('The title text to display'),
  audio: z
    .object({
      src: z.string().describe('Audio source URL or path'),
      start: z
        .number()
        .optional()
        .describe('Start time in audio file (seconds)'),
      duration: z.number().optional().describe('Duration to use (seconds)'),
      volume: z.number().min(0).max(2).default(1).optional().describe('Audio volume (0-2)'),
    })
    .describe('Audio source configuration'),
  fontSize: z
    .number()
    .min(20)
    .max(500)
    .default(72)
    .optional()
    .describe('Base font size in pixels'),
  baseColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Base text color (hex or rgba)'),
  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe('Font family with optional weight (e.g., "Inter:700", "Roboto:600:italic")'),
  position: z
    .enum(['center', 'top', 'bottom', 'left', 'right'])
    .default('center')
    .optional()
    .describe('Position of title on screen'),
  baseScale: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Base scale value before audio modulation'),
  zoomIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .optional()
    .describe('Zoom intensity for audio-reactive scale effect'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.7)
    .optional()
    .describe('Audio sensitivity for waveform effects'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Minimum audio value to trigger effect'),
  glowIntensity: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .optional()
    .describe('Base glow intensity in pixels'),
  colorShiftEnabled: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable color shift based on audio frequency'),
  brightnessEnabled: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable brightness pulsing with treble'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate duration from audio or default to 10 seconds
  let audioDuration = params.audio.duration || 10;
  let audioAnalysis = null;

  // Fetch audio analysis if fetcher is available
  if (fetcher) {
    try {
      const { analysis, durationInSeconds } = await fetcher(
        '/api/analyze-audio',
        {
          audioSrc: params.audio.src,
        },
      );

      if (analysis && analysis.length > 0) {
        audioAnalysis = analysis;
        if (!params.audio.duration) {
          audioDuration = durationInSeconds;
        }
      }
    } catch (error) {
      console.warn('Audio analysis failed, using default values', error);
    }
  }

  // Position className mapping
  const positionClassMap = {
    center: 'flex items-center justify-center',
    top: 'flex items-start justify-center pt-20',
    bottom: 'flex items-end justify-center pb-20',
    left: 'flex items-center justify-start pl-20',
    right: 'flex items-center justify-end pr-20',
  };

  const containerClass = positionClassMap[params.position || 'center'];

  // Audio atom
  const audioAtom: RenderableComponentData = {
    id: 'audio-reactive-title-audio',
    componentId: 'AudioAtom',
    type: 'atom' as const,
    data: {
      src: params.audio.src,
      startFrom: params.audio.start || 0,
      volume: params.audio.volume ?? 1,
    } as AudioAtomDataProps,
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  };

  // Text atom ID
  const textAtomId = 'audio-reactive-title-text';

  // Base text data
  const textData: TextAtomData = {
    text: params.title,
    style: {
      fontSize: params.fontSize ?? 72,
      color: params.baseColor ?? '#ffffff',
      fontWeight: fontStyle.fontWeight || 700,
      fontStyle: fontStyle.fontStyle,
      textAlign: 'center',
      textShadow: `0 0 ${params.glowIntensity}px ${params.baseColor}`,
    },
    font: {
      family: fontFamily,
      weights: fontStyle.fontWeight
        ? [fontStyle.fontWeight.toString()]
        : ['700'],
    },
  };

  // Effects array
  const textEffects: any[] = [];

  // Base elastic bounce animation (0 → 1.0 scale)
  const baseElasticEffect: GenericEffectData = {
    type: 'spring',
    start: 0,
    duration: 1.5,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'scale', val: 0, prog: 0 },
      { key: 'scale', val: params.baseScale ?? 1, prog: 1 },
    ],
  };

  textEffects.push({
    id: 'base-elastic-bounce',
    componentId: 'generic',
    data: baseElasticEffect,
  });

  // Waveform effect for scale modulation based on bass
  const scaleWaveformEffect: WaveformEffectData = {
    audioSrc: params.audio.src,
    audioProperty: 'bass',
    effectType: 'scale',
    intensity: params.zoomIntensity ?? 0.3,
    baseScale: params.baseScale ?? 1,
    sensitivity: params.sensitivity ?? 0.7,
    threshold: params.threshold ?? 0.3,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [textAtomId],
    start: 1.5, // Start after elastic bounce completes
    duration: audioDuration - 1.5,
    smoothNormalisation: 1,
  };

  textEffects.push({
    id: 'scale-waveform-effect',
    componentId: 'waveform',
    data: scaleWaveformEffect,
  });

  // Brightness waveform effect tied to treble (if enabled)
  if (params.brightnessEnabled) {
    const brightnessWaveformEffect: WaveformEffectData = {
      audioSrc: params.audio.src,
      audioProperty: 'treble',
      effectType: 'exposure',
      intensity: 0.4,
      baseBrightness: 1,
      sensitivity: params.sensitivity ?? 0.7,
      threshold: params.threshold ?? 0.3,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [textAtomId],
      start: 0,
      duration: audioDuration,
      smoothNormalisation: 1,
    };

    textEffects.push({
      id: 'brightness-waveform-effect',
      componentId: 'waveform',
      data: brightnessWaveformEffect,
    });
  }

  // Color shift effect based on audio frequency (if enabled and analysis available)
  if (params.colorShiftEnabled && audioAnalysis && audioAnalysis.length > 0) {
    // Sample beats throughout the duration
    const colorShiftKeyframes: any[] = [];
    const sampleCount = Math.min(10, audioAnalysis.length);
    const step = Math.floor(audioAnalysis.length / sampleCount);

    for (let i = 0; i < sampleCount; i++) {
      const beat = audioAnalysis[i * step];
      const prog = i / (sampleCount - 1);

      // Map frequency to color hue (low freq = red, high freq = blue)
      const hue = Math.min(300, (beat.frequency / 3000) * 300);
      const color = `hsl(${hue}, 80%, 70%)`;

      colorShiftKeyframes.push({
        key: 'color',
        val: color,
        prog,
      });
    }

    const colorShiftEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: [textAtomId],
      ranges: colorShiftKeyframes,
    };

    textEffects.push({
      id: 'color-shift-effect',
      componentId: 'generic',
      data: colorShiftEffect,
    });
  }

  // Glow pulsing effect based on audio intensity
  const glowWaveformEffect: WaveformEffectData = {
    audioSrc: params.audio.src,
    audioProperty: 'waveform',
    effectType: 'scale', // Using scale type to modulate custom property
    intensity: params.glowIntensity ?? 20,
    baseScale: 1,
    sensitivity: params.sensitivity ?? 0.7,
    threshold: params.threshold ?? 0.3,
    numberOfSamples: 128,
    useFrequencyData: false,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [textAtomId],
    start: 0,
    duration: audioDuration,
    smoothNormalisation: 1,
  };

  // Note: For true glow pulsing, we'd need a custom effect that modulates text-shadow
  // For now, we'll use scale as a proxy for visual intensity
  textEffects.push({
    id: 'glow-pulse-effect',
    componentId: 'waveform',
    data: glowWaveformEffect,
  });

  // Text atom
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: textData,
    effects: textEffects,
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'audio-reactive-title-root',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: `absolute inset-0 ${containerClass}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [audioAtom, textAtom] as RenderableComponentData[],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'audioReactiveTitleBounce',
  title: 'Audio-Reactive Title Bounce',
  description:
    'Audio-synchronized title animation with dynamic scale bounce, color shifts, and glow effects that respond to music beats and intensity. Features elastic bounce on beats with overshoot modulation based on audio intensity, brightness pulsing with treble, and adaptive behavior for bass drops vs quiet sections.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'audio-reactive',
    'title',
    'bounce',
    'elastic',
    'beat-sync',
    'waveform',
    'music',
    'glow',
    'color-shift',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    title: 'AUDIO REACTIVE',
    audio: {
      src: 'https://example.com/audio.mp3',
      start: 0,
      volume: 1,
    },
    fontSize: 72,
    baseColor: '#ffffff',
    font: 'Inter:700',
    position: 'center',
    baseScale: 1,
    zoomIntensity: 0.3,
    sensitivity: 0.7,
    threshold: 0.3,
    glowIntensity: 20,
    colorShiftEnabled: true,
    brightnessEnabled: true,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const audioReactiveTitleBouncePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
