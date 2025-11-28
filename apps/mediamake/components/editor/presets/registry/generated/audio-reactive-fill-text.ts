/**
 * Audio-Reactive Fill Text Animation Preset
 *
 * This preset creates text that fills dynamically based on audio intensity and beat detection,
 * resembling a VU meter embedded within typography. The fill effect responds to music with
 * different frequency ranges affecting different parts of the text, creating a visual representation
 * of audio energy across low, mid, and high frequencies.
 *
 * Features:
 * - **Audio Analysis & Beat Detection**: Fetches comprehensive audio analysis data including
 *   beat detection, frequency analysis, and intensity measurements
 * - **Multi-Frequency Fill Effect**: Low frequencies fill from bottom (red), mid frequencies fill
 *   middle (green), high frequencies fill from top (blue) with screen blend mode
 * - **Dynamic Glow Effects**: Text glow intensity pulses with beat impacts for dramatic emphasis
 * - **Layered Text Structure**: Multiple TextAtom layers (base outline, frequency-specific fills)
 *   create depth and visual richness
 * - **Waveform Audio Sync**: Uses waveform effects linked to audio properties for real-time reactivity
 * - **Fallback Progressive Fill**: If no audio or analysis fails, falls back to simple fill animation
 * - **Customizable Sensitivity**: Adjustable thresholds and sensitivity for fine-tuned audio response
 *
 * Use cases:
 * - Music video typography with audio-reactive fill
 * - Audio visualizations with embedded text
 * - Dynamic lyric displays synchronized to music
 * - Beat-synced title sequences
 * - Audio-driven branding elements
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData, GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfx/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text content to display and fill'),
  audioSrc: z
    .string()
    .describe('Audio source URL for beat detection and frequency analysis'),
  fontSize: z
    .number()
    .default(120)
    .describe('Font size in pixels for the text'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text (e.g., "Inter", "Roboto:700")'),
  outlineColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the base text outline'),
  outlineWidth: z
    .string()
    .default('2px')
    .describe('Width of the text outline stroke'),
  lowFreqColor: z
    .string()
    .default('#FF0000')
    .describe('Fill color for low frequency range (bass) - fills from bottom'),
  midFreqColor: z
    .string()
    .default('#00FF00')
    .describe('Fill color for mid frequency range - fills middle section'),
  highFreqColor: z
    .string()
    .default('#0000FF')
    .describe('Fill color for high frequency range (treble) - fills from top'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .describe('Sensitivity multiplier for audio reactivity (higher = more reactive)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Minimum audio intensity threshold to trigger fill effect'),
  glowIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Maximum glow intensity for beat impacts (in shadow spread radius)'),
  smoothing: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Smoothing factor for audio reactivity (0 = no smoothing, higher = smoother)'),
  fallbackAnimation: z
    .boolean()
    .default(true)
    .describe('Enable fallback progressive fill animation if audio analysis fails'),
  duration: z
    .number()
    .optional()
    .describe('Duration in seconds (auto-detected from audio if not specified)'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher, config } = props;
  const fps = config?.fps || 30;

  // Parse font family string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(
    params.fontFamily || 'Inter',
  );

  // Fetch audio analysis data
  let audioDuration = params.duration || 10;
  let hasAudioAnalysis = false;

  try {
    if (fetcher && params.audioSrc) {
      const { analysis, durationInSeconds } = await fetcher(
        '/api/analyze-audio',
        {
          audioSrc: params.audioSrc,
        },
      );

      if (analysis && analysis.length > 0) {
        audioDuration = durationInSeconds || audioDuration;
        hasAudioAnalysis = true;
      }
    }
  } catch (error) {
    console.warn('Audio analysis failed, using fallback animation:', error);
    hasAudioAnalysis = false;
  }

  // Base IDs for components
  const rootContainerId = 'audio-reactive-fill-root';
  const audioId = 'audio-source-reactive';
  const textStackId = 'text-stack-container';
  const baseOutlineId = 'base-outline-text';
  const lowFreqFillId = 'low-freq-fill-text';
  const midFreqFillId = 'mid-freq-fill-text';
  const highFreqFillId = 'high-freq-fill-text';

  // Audio source node
  const audioNode: RenderableComponentData = {
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

  // Base outline text (non-reactive, always visible)
  const baseOutlineText: RenderableComponentData = {
    id: baseOutlineId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['900'],
      },
      style: {
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight || 900,
        color: 'transparent',
        WebkitTextStroke: `${params.outlineWidth} ${params.outlineColor}`,
        textStroke: `${params.outlineWidth} ${params.outlineColor}`,
        zIndex: 1,
        position: 'absolute',
        ...fontStyle,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  };

  // Create fill text layers with audio-reactive effects or fallback animations
  const createFillLayer = (
    id: string,
    color: string,
    clipPath: string,
    audioProperty: 'bass' | 'mid' | 'treble',
    zIndex: number,
  ): RenderableComponentData => {
    const textLayer: RenderableComponentData = {
      id,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: params.text,
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['900'],
        },
        style: {
          fontSize: params.fontSize,
          fontWeight: fontStyle.fontWeight || 900,
          color: color,
          mixBlendMode: 'screen',
          clipPath: clipPath,
          zIndex: zIndex,
          position: 'absolute',
          textShadow: '0 0 0px rgba(0,0,0,0)',
          ...fontStyle,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
      effects: [],
    };

    if (hasAudioAnalysis) {
      // Audio-reactive clip path effect
      const clipPathEffect: WaveformEffectData = {
        audioSrc: params.audioSrc,
        audioProperty: audioProperty,
        effectType: 'scale',
        intensity: 1,
        baseScale: 1,
        sensitivity: params.sensitivity,
        threshold: params.threshold,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / fps,
        mode: 'provider',
        targetIds: [id],
        start: 0,
        duration: audioDuration,
        smoothNormalisation: params.smoothing,
      };

      // Glow effect based on audio intensity
      const glowEffect: WaveformEffectData = {
        audioSrc: params.audioSrc,
        audioProperty: audioProperty,
        effectType: 'exposure',
        intensity: params.glowIntensity,
        baseBrightness: 1,
        sensitivity: params.sensitivity * 1.2,
        threshold: params.threshold + 0.1,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / fps,
        mode: 'provider',
        targetIds: [id],
        start: 0,
        duration: audioDuration,
        smoothNormalisation: params.smoothing,
      };

      textLayer.effects = [
        {
          id: `clip-path-effect-${id}`,
          componentId: 'waveform',
          data: clipPathEffect,
        },
        {
          id: `glow-effect-${id}`,
          componentId: 'waveform',
          data: glowEffect,
        },
      ];
    } else if (params.fallbackAnimation) {
      // Fallback progressive fill animation
      const fillDelay = zIndex === 2 ? 0 : zIndex === 3 ? 0.3 : 0.6;
      const fillDuration = Math.min(2, audioDuration * 0.5);

      const fallbackEffect: GenericEffectData = {
        type: 'ease-out',
        start: fillDelay,
        duration: fillDuration,
        mode: 'provider',
        targetIds: [id],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 0.95, prog: 0 },
          { key: 'scale', val: 1, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      };

      textLayer.effects = [
        {
          id: `fallback-fill-${id}`,
          componentId: 'generic',
          data: fallbackEffect,
        },
      ];
    }

    return textLayer;
  };

  // Low frequency fill (bass) - fills from bottom
  const lowFreqFill = createFillLayer(
    lowFreqFillId,
    params.lowFreqColor,
    'inset(66% 0 0 0)',
    'bass',
    2,
  );

  // Mid frequency fill - fills middle section
  const midFreqFill = createFillLayer(
    midFreqFillId,
    params.midFreqColor,
    'inset(33% 0 33% 0)',
    'mid',
    3,
  );

  // High frequency fill (treble) - fills from top
  const highFreqFill = createFillLayer(
    highFreqFillId,
    params.highFreqColor,
    'inset(0 0 66% 0)',
    'treble',
    4,
  );

  // Text stack container holding all text layers
  const textStackContainer: RenderableComponentData = {
    id: textStackId,
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
    childrenData: [
      baseOutlineText,
      lowFreqFill,
      midFreqFill,
      highFreqFill,
    ] as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [audioNode, textStackContainer] as RenderableComponentData[],
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
  id: 'audio-reactive-fill-text',
  title: 'Audio-Reactive Fill Text Animation',
  description:
    'Audio-reactive text fill animation that responds to beat detection and frequency analysis. Text fills like a VU meter with different frequency ranges affecting different parts. Low frequencies fill from bottom (red), mid frequencies fill middle (green), high frequencies fill from top (blue) with screen blend mode. Includes glow effects that pulse with beat impacts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'text',
    'reactive',
    'fill',
    'frequency',
    'beat',
    'music',
    'visualization',
    'waveform',
    'glow',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'AUDIO REACTIVE',
    audioSrc: 'https://example.com/audio.mp3',
    fontSize: 120,
    fontFamily: 'Inter',
    outlineColor: '#FFFFFF',
    outlineWidth: '2px',
    lowFreqColor: '#FF0000',
    midFreqColor: '#00FF00',
    highFreqColor: '#0000FF',
    sensitivity: 1.5,
    threshold: 0.2,
    glowIntensity: 3,
    smoothing: 1,
    fallbackAnimation: true,
  },
};

export const audioReactiveFillTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
