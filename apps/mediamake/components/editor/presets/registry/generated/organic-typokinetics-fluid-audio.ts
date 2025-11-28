/**
 * Organic Typokinetics - Fluid Audio-Reactive Text Preset
 *
 * This preset creates fluid, dreamlike text animations where opacity flows like water
 * responding to audio waves. Text elements oscillate at different frequencies with
 * sinusoidal opacity variations that overlap and interfere, creating complex patterns.
 *
 * Features:
 * - Sinusoidal opacity modulation synced to audio intensity
 * - Multiple frequency layers (titles: 0.5Hz, body: 1Hz, captions: 2Hz)
 * - Wave interference patterns via phase offsets
 * - Smooth transitions with moving average filter
 * - Liquid, organic aesthetic with soft edges and ethereal blending
 *
 * Technical Implementation:
 * - Fetches audio analysis data via API
 * - Pre-calculates sinusoidal opacity keyframes based on audio intensity
 * - Applies 5-frame moving average for smooth transitions
 * - Uses generic effects with provider mode for opacity animation
 *
 * Use cases:
 * - Underwater-style title sequences
 * - Dreamlike, fluid text animations
 * - Audio-reactive typography with organic feel
 * - Meditative or melodic content presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  titleText: z
    .string()
    .default('Flowing Title')
    .describe('Text for title layer (oscillates at 0.5Hz)'),
  bodyText: z
    .string()
    .default('Liquid Body')
    .describe('Text for body layer (oscillates at 1Hz)'),
  captionText: z
    .string()
    .default('Ethereal Caption')
    .describe('Text for caption layer (oscillates at 2Hz)'),
  audioSrc: z
    .string()
    .describe('Audio source URL for wave modulation (required)'),
  baseOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Base opacity for text (0-1, default: 0.7)'),
  amplitudeMultiplier: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.3)
    .optional()
    .describe('Amplitude multiplier for oscillations (0.1-3, default: 0.3)'),
  font: z
    .string()
    .default('Inter')
    .optional()
    .describe(
      'Font family for text (e.g., "Inter", "Roboto:600", "Playfair Display:400:italic")',
    ),
  textColor: z
    .string()
    .default('#93C5FD')
    .optional()
    .describe('Text color (default: light blue #93C5FD)'),
  duration: z
    .number()
    .positive()
    .default(10)
    .optional()
    .describe('Duration in seconds (default: 10, or matches audio if provided)'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Helper: Parse font string
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
    params.font || 'Inter',
  );

  // Fetch audio analysis if audioSrc provided
  let audioAnalysis: any[] = [];
  let audioDuration = params.duration || 10;

  if (params.audioSrc && fetcher) {
    try {
      const { analysis, durationInSeconds } = await fetcher(
        '/api/analyze-audio',
        {
          audioSrc: params.audioSrc,
        },
      );
      if (analysis && analysis.length > 0) {
        audioAnalysis = analysis;
        audioDuration = durationInSeconds || audioDuration;
      }
    } catch (error) {
      console.warn('Audio analysis failed, using default duration:', error);
    }
  }

  // Calculate opacity keyframes for each layer
  const fps = 30;
  const totalFrames = Math.ceil(audioDuration * fps);
  const sampleInterval = 0.1; // Sample audio intensity every 100ms
  const smoothingWindow = 5; // 5-frame moving average

  // Helper: Get audio intensity at timestamp
  const getAudioIntensity = (timestamp: number): number => {
    if (audioAnalysis.length === 0) return 0.5; // Default if no analysis
    // Find closest analysis point
    const closest = audioAnalysis.reduce((prev, curr) =>
      Math.abs(curr.timestamp - timestamp) <
      Math.abs(prev.timestamp - timestamp)
        ? curr
        : prev,
    );
    return closest.intensity || 0.5;
  };

  // Helper: Calculate sinusoidal opacity with audio modulation
  const calculateOpacity = (
    time: number,
    frequency: number,
    phaseOffset: number,
    baseOpacity: number,
    amplitude: number,
    audioIntensity: number,
  ): number => {
    const sinValue = Math.sin(
      time * frequency * 2 * Math.PI + phaseOffset,
    );
    const modulation = sinValue * amplitude * audioIntensity;
    return Math.max(0, Math.min(1, baseOpacity + modulation));
  };

  // Helper: Apply moving average smoothing
  const smoothOpacities = (
    opacities: number[],
    windowSize: number,
  ): number[] => {
    const smoothed: number[] = [];
    for (let i = 0; i < opacities.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(opacities.length, i + Math.ceil(windowSize / 2));
      const window = opacities.slice(start, end);
      const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
      smoothed.push(avg);
    }
    return smoothed;
  };

  // Pre-calculate opacity keyframes for each layer
  const createOpacityRanges = (
    frequency: number,
    phaseOffset: number,
  ): any[] => {
    const baseOpacity = params.baseOpacity || 0.7;
    const amplitude = params.amplitudeMultiplier || 0.3;

    // Sample opacity at regular intervals
    const samples: number[] = [];
    for (let i = 0; i < totalFrames; i++) {
      const time = i / fps;
      const audioIntensity = getAudioIntensity(time);
      const opacity = calculateOpacity(
        time,
        frequency,
        phaseOffset,
        baseOpacity,
        amplitude,
        audioIntensity,
      );
      samples.push(opacity);
    }

    // Apply smoothing
    const smoothed = smoothOpacities(samples, smoothingWindow);

    // Convert to keyframe ranges (sample every sampleInterval seconds)
    const ranges: any[] = [];
    const sampleFrameInterval = Math.ceil(sampleInterval * fps);
    for (let i = 0; i < smoothed.length; i += sampleFrameInterval) {
      const prog = i / (totalFrames - 1);
      ranges.push({
        key: 'opacity',
        val: smoothed[i],
        prog: Math.min(1, prog),
      });
    }
    // Ensure final keyframe
    if (ranges[ranges.length - 1].prog < 1) {
      ranges.push({
        key: 'opacity',
        val: smoothed[smoothed.length - 1],
        prog: 1,
      });
    }
    return ranges;
  };

  // Create effects for each text layer
  const titleOpacityRanges = createOpacityRanges(0.5, 0); // 0.5Hz, phase 0
  const bodyOpacityRanges = createOpacityRanges(1, Math.PI / 3); // 1Hz, phase π/3
  const captionOpacityRanges = createOpacityRanges(2, (2 * Math.PI) / 3); // 2Hz, phase 2π/3

  // Build component tree
  const titleLayerId = 'title-layer';
  const bodyLayerId = 'body-layer';
  const captionLayerId = 'caption-layer';

  const titleTextId = 'title-text';
  const bodyTextId = 'body-text';
  const captionTextId = 'caption-text';

  // Title effect
  const titleEffect = {
    id: 'title-opacity-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: audioDuration,
      mode: 'provider' as const,
      targetIds: [titleTextId],
      ranges: titleOpacityRanges,
    },
  };

  // Body effect
  const bodyEffect = {
    id: 'body-opacity-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: audioDuration,
      mode: 'provider' as const,
      targetIds: [bodyTextId],
      ranges: bodyOpacityRanges,
    },
  };

  // Caption effect
  const captionEffect = {
    id: 'caption-opacity-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: audioDuration,
      mode: 'provider' as const,
      targetIds: [captionTextId],
      ranges: captionOpacityRanges,
    },
  };

  // Build text atoms
  const titleText = {
    id: titleTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.titleText,
      className: 'text-blue-100 blur-[0.5px]',
      style: {
        fontSize: 72,
        fontWeight: 700,
        color: params.textColor || '#93C5FD',
        mixBlendMode: 'soft-light',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  };

  const bodyText = {
    id: bodyTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.bodyText,
      className: 'text-blue-100 blur-[0.5px]',
      style: {
        fontSize: 48,
        fontWeight: 500,
        color: params.textColor || '#93C5FD',
        mixBlendMode: 'soft-light',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['500'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  };

  const captionText = {
    id: captionTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.captionText,
      className: 'text-blue-100 blur-[0.5px]',
      style: {
        fontSize: 32,
        fontWeight: 400,
        color: params.textColor || '#93C5FD',
        mixBlendMode: 'soft-light',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  };

  // Build layers
  const titleLayer = {
    id: titleLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          top: '20%',
          left: '15%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    effects: [titleEffect],
    childrenData: [titleText],
  };

  const bodyLayer = {
    id: bodyLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          top: '45%',
          left: '25%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    effects: [bodyEffect],
    childrenData: [bodyText],
  };

  const captionLayer = {
    id: captionLayerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          top: '70%',
          left: '35%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    effects: [captionEffect],
    childrenData: [captionText],
  };

  // Root container
  const rootContainer = {
    id: 'organic-typokinetics-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [titleLayer, bodyLayer, captionLayer],
  } as RenderableComponentData;

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
  id: 'organic-typokinetics-fluid-audio',
  title: 'Organic Typokinetics - Fluid Audio-Reactive Text',
  description:
    'Audio-reactive text preset with sinusoidal opacity variations creating fluid, dreamlike movements. Text elements oscillate at different frequencies (titles: 0.5Hz, body: 1Hz, captions: 2Hz) with audio intensity modulating amplitude. Features wave interference patterns, phase offsets, and smooth transitions for an underwater, liquid aesthetic. Audio is analyzed via fetcher API, and sinusoidal opacity keyframes are pre-calculated in presetExecution based on audio intensity data.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'audio-reactive',
    'fluid',
    'organic',
    'typokinetics',
    'sinusoidal',
    'waves',
    'underwater',
    'dreamlike',
    'liquid',
  ],
  dependencies: {},
  defaultInputParams: {
    titleText: 'Flowing Title',
    bodyText: 'Liquid Body',
    captionText: 'Ethereal Caption',
    audioSrc: 'https://example.com/audio.mp3',
    baseOpacity: 0.7,
    amplitudeMultiplier: 0.3,
    font: 'Inter',
    textColor: '#93C5FD',
    duration: 10,
  },
};

// Export preset
export const organicTypokineticsFluidAudioPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
