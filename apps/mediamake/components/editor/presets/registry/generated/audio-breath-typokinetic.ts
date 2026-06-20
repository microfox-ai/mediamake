/**
 * Audio-Breathing Typokinetic Subtitles Preset
 *
 * This preset creates minimalist typokinetic subtitles where text opacity breathes with
 * the audio's amplitude envelope, creating a meditative, ambient visualization suitable
 * for documentary-style lower thirds or centered titles.
 *
 * Features:
 * - **Audio-Synchronized Opacity**: Text opacity follows audio intensity with long, slow transitions (2-4s)
 * - **Multi-Hierarchy Text**: Primary text (0.8-1.0 opacity) and secondary text (0.4-0.8 opacity)
 * - **Smooth Breathing Effect**: Uses moving average smoothing to create gentle, meditative transitions
 * - **Professional Layout**: Lower-thirds or centered positioning with clean sans-serif typography
 * - **Ambient Aesthetic**: Subtle, non-distracting effects that enhance content without overwhelming it
 *
 * Use cases:
 * - Documentary-style lower thirds that fade with background music
 * - Ambient video content with meditative text overlays
 * - Professional presentations with subtle audio-reactive text
 * - Music videos with contemplative, breathing typography
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(z.any()).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .describe('Array of caption objects with timing and text data'),

  audio: z
    .object({
      src: z.string().describe('Audio source URL for intensity analysis'),
    })
    .describe('Audio source configuration for amplitude envelope analysis'),

  // Text hierarchy configuration
  primaryText: z
    .object({
      field: z
        .string()
        .default('text')
        .describe('Caption field to use for primary text (e.g., "text")'),
      minOpacity: z
        .number()
        .min(0)
        .max(1)
        .default(0.8)
        .describe('Minimum opacity for primary text'),
      maxOpacity: z
        .number()
        .min(0)
        .max(1)
        .default(1.0)
        .describe('Maximum opacity for primary text'),
      fontSize: z
        .number()
        .default(32)
        .describe('Font size in pixels for primary text'),
      fontWeight: z.string().default('400').describe('Font weight for primary text'),
    })
    .optional()
    .describe('Primary text configuration (higher base opacity)'),

  secondaryText: z
    .object({
      field: z
        .string()
        .optional()
        .describe(
          'Caption metadata field to use for secondary text (e.g., "metadata.subtitle")',
        ),
      minOpacity: z
        .number()
        .min(0)
        .max(1)
        .default(0.4)
        .describe('Minimum opacity for secondary text'),
      maxOpacity: z
        .number()
        .min(0)
        .max(1)
        .default(0.8)
        .describe('Maximum opacity for secondary text'),
      fontSize: z
        .number()
        .default(20)
        .describe('Font size in pixels for secondary text'),
      fontWeight: z.string().default('300').describe('Font weight for secondary text'),
    })
    .optional()
    .describe('Secondary text configuration (lower opacity range)'),

  // Layout configuration
  layout: z
    .enum(['lowerThirds', 'centered'])
    .default('lowerThirds')
    .describe('Text positioning: lower thirds or centered'),

  // Effect configuration
  transitionDuration: z
    .number()
    .min(1)
    .max(6)
    .default(3)
    .describe('Duration of opacity transitions in seconds (2-4s recommended)'),

  smoothingWindow: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Moving average window size for smoothing audio intensity'),

  // Typography configuration
  font: z
    .string()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:400", "Roboto:300")',
    ),

  textColor: z
    .string()
    .default('#F3F4F6')
    .describe('Text color (CSS color value, default: gray-100)'),

  // Advanced configuration
  sampleRate: z
    .number()
    .min(0.5)
    .max(5)
    .default(1)
    .describe('How often to sample audio intensity per second'),

  baselineIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Baseline audio intensity for minimum opacity mapping'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { captions, audio } = params;
  const { fetcher } = props;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    let fontStyle: Record<string, any> = {};
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

  const { fontFamily, fontStyle } = parseFontString(params.font);

  // Helper: Calculate moving average for smoothing
  const movingAverage = (
    data: number[],
    windowSize: number,
  ): number[] => {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
      const window = data.slice(start, end);
      const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
      result.push(avg);
    }
    return result;
  };

  // Helper: Map intensity to opacity range
  const mapIntensityToOpacity = (
    intensity: number,
    minOpacity: number,
    maxOpacity: number,
    baselineIntensity: number,
  ): number => {
    const normalizedIntensity = Math.max(
      0,
      Math.min(1, (intensity - baselineIntensity) / (1 - baselineIntensity)),
    );
    return minOpacity + normalizedIntensity * (maxOpacity - minOpacity);
  };

  // Fetch audio analysis data
  let audioIntensityData: Array<{ timestamp: number; intensity: number }> = [];

  if (fetcher && audio?.src) {
    try {
      const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
        audioSrc: audio.src,
      });

      if (analysis && analysis.length > 0) {
        audioIntensityData = analysis.map((sample: any) => ({
          timestamp: sample.timestamp,
          intensity: sample.intensity,
        }));
      }
    } catch (error) {
      console.warn('Audio analysis failed, using fallback intensity data');
    }
  }

  // If no audio data, create fallback data with gentle variation
  if (audioIntensityData.length === 0) {
    const totalDuration = Math.max(
      ...captions.map(c => c.absoluteEnd),
      30,
    );
    const sampleCount = Math.floor(totalDuration * params.sampleRate);
    audioIntensityData = Array.from({ length: sampleCount }, (_, i) => ({
      timestamp: (i / sampleCount) * totalDuration,
      intensity: 0.5 + Math.sin(i * 0.1) * 0.2, // Gentle sine wave fallback
    }));
  }

  // Apply moving average smoothing to intensity data
  const intensityValues = audioIntensityData.map(d => d.intensity);
  const smoothedIntensities = movingAverage(
    intensityValues,
    params.smoothingWindow,
  );

  // Update intensity data with smoothed values
  const smoothedAudioData = audioIntensityData.map((sample, idx) => ({
    timestamp: sample.timestamp,
    intensity: smoothedIntensities[idx],
  }));

  // Helper: Generate opacity keyframes for a caption
  const generateOpacityKeyframes = (
    caption: TranscriptionSentence,
    minOpacity: number,
    maxOpacity: number,
  ) => {
    const captionStart = caption.absoluteStart;
    const captionEnd = caption.absoluteEnd;
    const transitionDuration = params.transitionDuration;

    // Find audio samples within caption timeframe
    const relevantSamples = smoothedAudioData.filter(
      sample =>
        sample.timestamp >= captionStart - transitionDuration &&
        sample.timestamp <= captionEnd + transitionDuration,
    );

    if (relevantSamples.length === 0) {
      // Fallback: simple fade in/out
      return [
        { key: 'opacity', val: minOpacity, prog: 0 },
        { key: 'opacity', val: maxOpacity, prog: 0.2 },
        { key: 'opacity', val: maxOpacity, prog: 0.8 },
        { key: 'opacity', val: minOpacity, prog: 1 },
      ];
    }

    // Sample audio intensity at key points during caption
    const samplePoints = Math.min(6, relevantSamples.length);
    const keyframes = [];

    for (let i = 0; i < samplePoints; i++) {
      const prog = i / (samplePoints - 1);
      const sampleIdx = Math.floor(
        (i / (samplePoints - 1)) * (relevantSamples.length - 1),
      );
      const sample = relevantSamples[sampleIdx];

      const opacity = mapIntensityToOpacity(
        sample.intensity,
        minOpacity,
        maxOpacity,
        params.baselineIntensity,
      );

      keyframes.push({ key: 'opacity', val: opacity, prog });
    }

    return keyframes;
  };

  // Create caption components with audio-breathing effects
  const captionComponents: RenderableComponentData[] = [];

  captions.forEach((caption, index) => {
    const primaryConfig = params.primaryText || {
      field: 'text',
      minOpacity: 0.8,
      maxOpacity: 1.0,
      fontSize: 32,
      fontWeight: '400',
    };

    const secondaryConfig = params.secondaryText || {
      field: undefined,
      minOpacity: 0.4,
      maxOpacity: 0.8,
      fontSize: 20,
      fontWeight: '300',
    };

    // Get text content
    const primaryTextContent =
      primaryConfig.field === 'text'
        ? caption.text
        : (caption as any)[primaryConfig.field] || caption.text;

    const secondaryTextContent = secondaryConfig.field
      ? ((caption as any).metadata?.[secondaryConfig.field.replace('metadata.', '')] as string | undefined)
      : undefined;

    // Container positioning based on layout
    const containerClassName =
      params.layout === 'lowerThirds'
        ? 'absolute bottom-0 left-0 p-8'
        : 'absolute inset-0 flex items-center justify-center';

    const primaryTextId = `primary-text-${index}`;
    const secondaryTextId = `secondary-text-${index}`;

    // Primary text atom
    const primaryTextAtom: RenderableComponentData = {
      id: primaryTextId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: primaryTextContent,
        className: 'font-sans text-gray-100 antialiased',
        style: {
          fontSize: `${primaryConfig.fontSize}px`,
          fontWeight: primaryConfig.fontWeight,
          color: params.textColor,
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
    };

    // Generate primary text opacity effect
    const primaryOpacityKeyframes = generateOpacityKeyframes(
      caption as TranscriptionSentence,
      primaryConfig.minOpacity,
      primaryConfig.maxOpacity,
    );

    const primaryOpacityEffect = {
      id: `primary-opacity-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: caption.duration,
        mode: 'provider',
        targetIds: [primaryTextId],
        ranges: primaryOpacityKeyframes,
      },
    };

    // Create primary text container with effect
    const primaryContainer: RenderableComponentData = {
      id: `primary-container-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: containerClassName,
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [primaryTextAtom],
      effects: [primaryOpacityEffect],
    };

    captionComponents.push(primaryContainer);

    // Secondary text (if provided)
    if (secondaryTextContent) {
      const secondaryTextAtom: RenderableComponentData = {
        id: secondaryTextId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: secondaryTextContent,
          className: 'font-sans text-gray-100 antialiased',
          style: {
            fontSize: `${secondaryConfig.fontSize}px`,
            fontWeight: secondaryConfig.fontWeight,
            color: params.textColor,
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['300'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
      };

      const secondaryOpacityKeyframes = generateOpacityKeyframes(
        caption as TranscriptionSentence,
        secondaryConfig.minOpacity,
        secondaryConfig.maxOpacity,
      );

      const secondaryOpacityEffect = {
        id: `secondary-opacity-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: caption.duration,
          mode: 'provider',
          targetIds: [secondaryTextId],
          ranges: secondaryOpacityKeyframes,
        },
      };

      const secondaryContainerClassName =
        params.layout === 'lowerThirds'
          ? 'absolute bottom-0 left-0'
          : 'absolute inset-0 flex items-center justify-center';

      const secondaryContainer: RenderableComponentData = {
        id: `secondary-container-${index}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: secondaryContainerClassName,
            style:
              params.layout === 'lowerThirds'
                ? {
                    paddingLeft: '32px',
                    paddingRight: '32px',
                    paddingBottom: '32px',
                    paddingTop: '64px',
                  }
                : {},
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [secondaryTextAtom],
        effects: [secondaryOpacityEffect],
      };

      captionComponents.push(secondaryContainer);
    }
  });

  // Root container
  const totalDuration = Math.max(...captions.map(c => c.absoluteEnd), 10);

  const rootContainer: RenderableComponentData = {
    id: 'audio-breath-typokinetic-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: captionComponents as RenderableComponentData[],
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
  id: 'audio-breath-typokinetic',
  title: 'Audio-Breathing Typokinetic Subtitles',
  description:
    'Minimalist typokinetic preset where text opacity breathes with audio amplitude envelope. Features long, slow opacity transitions (2-4s) following audio dynamics rather than beats. Supports multiple text hierarchies with primary text (0.8-1.0 opacity) and secondary text (0.4-0.8 opacity). Professional lower-thirds positioning with subtle, meditative aesthetic. Uses audio intensity analysis via fetcher to calculate smooth keyframe transitions with moving average smoothing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'typokinetic',
    'audio-reactive',
    'ambient',
    'meditative',
    'breathing',
    'documentary',
    'lower-thirds',
    'opacity',
    'smooth',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Welcome to the journey',
        start: 0,
        absoluteStart: 0,
        end: 3.5,
        absoluteEnd: 3.5,
        duration: 3.5,
        words: [],
        metadata: {
          subtitle: 'A meditative experience',
        },
      },
      {
        id: 'caption-2',
        text: 'Breathing with the rhythm',
        start: 0,
        absoluteStart: 4,
        end: 7.5,
        absoluteEnd: 7.5,
        duration: 3.5,
        words: [],
        metadata: {
          subtitle: 'Finding peace in sound',
        },
      },
    ],
    audio: {
      src: 'https://example.com/ambient-music.mp3',
    },
    primaryText: {
      field: 'text',
      minOpacity: 0.8,
      maxOpacity: 1.0,
      fontSize: 32,
      fontWeight: '400',
    },
    secondaryText: {
      field: 'metadata.subtitle',
      minOpacity: 0.4,
      maxOpacity: 0.8,
      fontSize: 20,
      fontWeight: '300',
    },
    layout: 'lowerThirds',
    transitionDuration: 3,
    smoothingWindow: 3,
    font: 'Inter:400',
    textColor: '#F3F4F6',
    sampleRate: 1,
    baselineIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const audioBreathTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
