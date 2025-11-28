/**
 * Audio-Reactive Gradient Pulse Preset
 *
 * This preset creates high-energy, beat-driven gradient pulse effects where the background
 * gradient responds dynamically to audio intensity. It combines music visualizer aesthetics
 * with typography design, creating a rhythmic visual heartbeat synchronized with bass frequencies.
 *
 * Features:
 * - **Audio-Reactive Background**: Radial gradient that pulses and breathes with bass frequencies (20-250Hz)
 * - **Dynamic Scaling**: Gradient expands and contracts based on audio intensity via waveform effects
 * - **Brightness Modulation**: Gradient brightens during beats for enhanced visual impact
 * - **Glowing Text**: Static text with subtle glow that intensifies during audio peaks
 * - **Customizable Colors**: Dark base gradient (black to dark blue) with configurable color stops
 * - **Flexible Text Styling**: Fully customizable text appearance with font selection
 * - **Audio Synchronization**: Precise timing with audio track for seamless beat matching
 *
 * Use cases:
 * - Creating music visualizer backgrounds for lyric videos
 * - Adding dynamic, audio-reactive backdrops to music content
 * - Building energetic social media content synchronized to music
 * - Creating podcast or DJ set visual accompaniments
 * - Designing beat-driven title sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  WaveformEffectData,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  audio: z.object({
    src: z.string().describe('Audio source URL or local file path'),
    volume: z
      .number()
      .min(0)
      .max(2)
      .default(1)
      .optional()
      .describe('Audio volume level (0-2, default: 1)'),
  }).describe('Audio track configuration'),
  
  text: z
    .string()
    .default('PULSE')
    .describe('Text content to display with gradient pulse effect'),
  
  gradient: z.object({
    center: z
      .string()
      .default('#1e3a8a')
      .describe('Center color of radial gradient (dark blue)'),
    middle: z
      .string()
      .default('#0f172a')
      .describe('Middle color of radial gradient (darker blue)'),
    outer: z
      .string()
      .default('#000000')
      .describe('Outer color of radial gradient (black)'),
  }).optional().describe('Gradient color configuration'),
  
  waveform: z.object({
    sensitivity: z
      .number()
      .min(0.1)
      .max(5)
      .default(0.8)
      .optional()
      .describe('Audio sensitivity multiplier (0.1-5, default: 0.8)'),
    threshold: z
      .number()
      .min(0)
      .max(1)
      .default(0.3)
      .optional()
      .describe('Minimum audio level to trigger effect (0-1, default: 0.3)'),
    scaleRange: z
      .tuple([z.number(), z.number()])
      .default([1, 1.15])
      .optional()
      .describe('Scale range for gradient expansion [min, max] (default: [1, 1.15])'),
    brightnessRange: z
      .tuple([z.number(), z.number()])
      .default([1, 1.4])
      .optional()
      .describe('Brightness range for gradient pulse [min, max] (default: [1, 1.4])'),
  }).optional().describe('Waveform effect configuration'),
  
  textStyle: z.object({
    fontSize: z
      .string()
      .default('7xl')
      .optional()
      .describe('Text size using Tailwind scale (e.g., "7xl", "8xl", "9xl")'),
    fontWeight: z
      .string()
      .default('black')
      .optional()
      .describe('Font weight (e.g., "black", "bold", "extrabold")'),
    color: z
      .string()
      .default('#ffffff')
      .optional()
      .describe('Text color (default: white)'),
    glowColor: z
      .string()
      .default('rgba(255, 255, 255, 0.5)')
      .optional()
      .describe('Glow color for text shadow (default: white with 50% opacity)'),
    glowBlur: z
      .number()
      .min(0)
      .max(100)
      .default(20)
      .optional()
      .describe('Base glow blur radius in pixels (default: 20)'),
    font: z
      .string()
      .optional()
      .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  }).optional().describe('Text styling configuration'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { presets } = props;
  
  // Extract parameters with defaults
  const audioSrc = params.audio.src;
  const audioVolume = params.audio.volume ?? 1;
  const text = params.text;
  
  const gradientCenter = params.gradient?.center ?? '#1e3a8a';
  const gradientMiddle = params.gradient?.middle ?? '#0f172a';
  const gradientOuter = params.gradient?.outer ?? '#000000';
  
  const sensitivity = params.waveform?.sensitivity ?? 0.8;
  const threshold = params.waveform?.threshold ?? 0.3;
  const scaleRange = params.waveform?.scaleRange ?? [1, 1.15];
  const brightnessRange = params.waveform?.brightnessRange ?? [1, 1.4];
  
  const textFontSize = params.textStyle?.fontSize ?? '7xl';
  const textFontWeight = params.textStyle?.fontWeight ?? 'black';
  const textColor = params.textStyle?.color ?? '#ffffff';
  const glowColor = params.textStyle?.glowColor ?? 'rgba(255, 255, 255, 0.5)';
  const glowBlur = params.textStyle?.glowBlur ?? 20;
  const fontString = params.textStyle?.font;
  
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  let fontFamily = 'Inter';
  let fontStyle: React.CSSProperties = {};
  
  if (fontString) {
    fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
  }
  
  // Validate dependencies
  if (!presets || !presets['glow-pulse-effect-container']) {
    throw new Error('Preset dependency "glow-pulse-effect-container" not found');
  }
  
  // Generate unique IDs
  const containerId = 'audio-gradient-pulse-root';
  const audioId = 'audio-gradient-pulse-audio';
  const backgroundLayerId = 'audio-gradient-pulse-background';
  const gradientContainerId = 'audio-gradient-pulse-gradient';
  const textLayerId = 'audio-gradient-pulse-text-layer';
  const textId = 'audio-gradient-pulse-text';
  
  // Call internal preset for text glow effect
  const glowEffectParams = {
    targetId: textId,
    audioSourceId: audioId,
    frequencyRange: [20, 250],
    sensitivity: sensitivity,
    glowIntensityRange: [0.5, 1.5],
    opacityRange: [0.9, 1],
  };
  
  const glowEffectResult = await presets['glow-pulse-effect-container'](
    glowEffectParams,
    props,
  );
  
  // Extract glow effect
  const textGlowEffect =
    glowEffectResult?.output?._extractedEffects?.[0] ||
    glowEffectResult?.output?.childrenData?.[0]?.effects?.[0];
  
  // Waveform scale effect data
  const scaleEffectData: WaveformEffectData = {
    audioSrc: `ref:${audioId}`,
    analysisType: 'frequency',
    frequencyRange: [20, 250],
    sensitivity: sensitivity,
    threshold: threshold,
    effectType: 'scale',
    baseScale: scaleRange[0],
    intensity: scaleRange[1] - scaleRange[0],
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [gradientContainerId],
    start: 0,
    smoothNormalisation: 1,
  };
  
  // Waveform brightness effect data
  const brightnessEffectData: WaveformEffectData = {
    audioSrc: `ref:${audioId}`,
    analysisType: 'frequency',
    frequencyRange: [20, 250],
    sensitivity: sensitivity,
    threshold: threshold,
    effectType: 'exposure',
    baseBrightness: brightnessRange[0],
    intensity: brightnessRange[1] - brightnessRange[0],
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [gradientContainerId],
    start: 0,
    smoothNormalisation: 1,
  };
  
  // Build radial gradient style
  const gradientStyle = `radial-gradient(circle at center, ${gradientCenter} 0%, ${gradientMiddle} 50%, ${gradientOuter} 100%)`;
  
  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Audio track
    {
      id: audioId,
      type: 'atom' as const,
      componentId: 'AudioAtom',
      data: {
        src: audioSrc,
        volume: audioVolume,
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: containerId,
        },
      },
    } as RenderableComponentData,
    
    // Background layer with gradient
    {
      id: backgroundLayerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 overflow-hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: audioId,
        },
      },
      childrenData: [
        // Gradient container with waveform effects
        {
          id: gradientContainerId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 flex items-center justify-center',
              style: {
                background: gradientStyle,
                transformOrigin: 'center center',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              fitDurationTo: audioId,
            },
          },
          effects: [
            // Scale effect
            {
              id: `${gradientContainerId}-scale`,
              componentId: 'waveform',
              data: scaleEffectData,
            },
            // Brightness effect
            {
              id: `${gradientContainerId}-brightness`,
              componentId: 'waveform',
              data: brightnessEffectData,
            },
          ],
          childrenData: [],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
    
    // Text layer
    {
      id: textLayerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative z-20',
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: audioId,
        },
      },
      childrenData: [
        // Main text with glow
        {
          id: textId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: text,
            className: `text-white text-${textFontSize} font-${textFontWeight} text-center`,
            style: {
              color: textColor,
              textShadow: `0 0 ${glowBlur}px ${glowColor}, 0 0 ${glowBlur * 2}px ${glowColor.replace('0.5', '0.3')}`,
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight
                ? { weights: [fontStyle.fontWeight.toString()] }
                : {}),
            },
          },
          context: {
            timing: {
              start: 0,
              fitDurationTo: audioId,
            },
          },
          effects: textGlowEffect ? [textGlowEffect] : [],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center min-h-screen',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: childrenData,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'audio-gradient-pulse',
  title: 'Audio-Reactive Gradient Pulse',
  description: 'High-energy beat-driven gradient pulse effect where background gradients respond to audio intensity via bass frequency analysis. Features radial gradients that scale and brighten on beats, with glowing text that pulses during audio peaks.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'gradient', 'pulse', 'waveform', 'beat-sync', 'music', 'visualizer', 'text', 'glow'],
  dependencies: {
    presets: ['glow-pulse-effect-container'],
  },
  defaultInputParams: {
    audio: {
      src: 'https://example.com/audio.mp3',
      volume: 1,
    },
    text: 'PULSE',
    gradient: {
      center: '#1e3a8a',
      middle: '#0f172a',
      outer: '#000000',
    },
    waveform: {
      sensitivity: 0.8,
      threshold: 0.3,
      scaleRange: [1, 1.15],
      brightnessRange: [1, 1.4],
    },
    textStyle: {
      fontSize: '7xl',
      fontWeight: 'black',
      color: '#ffffff',
      glowColor: 'rgba(255, 255, 255, 0.5)',
      glowBlur: 20,
      font: 'Inter:700',
    },
  },
};

// Export preset
export const audioGradientPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
