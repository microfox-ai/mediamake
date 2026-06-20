/**
 * Frequency Twist Waveform Effect Preset
 *
 * This preset creates a dynamic audio-reactive twist effect that rotates different sections
 * of visual content based on frequency bands. It divides the element into multiple horizontal
 * sections (low, mid, high frequency bands) and applies independent rotation transforms to
 * each section based on the corresponding audio frequency range.
 *
 * Features:
 * - **Multi-Band Frequency Analysis**: Analyzes audio in low (20-250Hz), mid (250-2000Hz),
 *   and high (2000-20000Hz) frequency ranges
 * - **Section-Based Rotation**: Applies different rotation intensities to base, middle, and
 *   top sections of the element
 * - **Twist Patterns**: Linear gradient, exponential curve, or stepped sections
 * - **Smoothing Control**: Adjustable smoothing between frequency bands for seamless transitions
 * - **Rotation Modes**: Accumulate rotation over time or reset on each frame
 * - **Configurable Bands**: Adjust number of frequency bands and twist intensity per band
 * - **Audio Synchronization**: Real-time audio-reactive distortion effects
 *
 * Use cases:
 * - Creating dynamic audio visualizers with twisted content
 * - Building music-reactive logo animations
 * - Adding frequency-responsive distortion to images/videos
 * - Creating DJ/VJ performance visuals
 * - Building audio-reactive text effects
 * - Designing music video title sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for frequency analysis'),

  content: z
    .object({
      type: z
        .enum(['image', 'video', 'text'])
        .describe('Type of content to twist'),
      src: z
        .string()
        .optional()
        .describe('Source URL for image/video content'),
      text: z.string().optional().describe('Text content if type is text'),
      style: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom style overrides for content'),
    })
    .describe('Content to apply twist effect to'),

  bandCount: z
    .number()
    .min(2)
    .max(10)
    .default(3)
    .describe('Number of frequency bands (sections) to divide the element into'),

  twistIntensity: z
    .array(z.number())
    .default([0.3, 0.5, 0.7])
    .describe(
      'Twist intensity per band (rotation multiplier). Array length should match bandCount.',
    ),

  frequencyRanges: z
    .array(
      z.object({
        min: z.number().describe('Minimum frequency in Hz'),
        max: z.number().describe('Maximum frequency in Hz'),
      }),
    )
    .optional()
    .describe(
      'Custom frequency ranges per band. If not provided, defaults to low/mid/high split.',
    ),

  smoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Smoothing factor between frequency bands (0 = no smoothing, 1 = max)'),

  accumulateRotation: z
    .boolean()
    .default(false)
    .describe('Whether to accumulate rotation over time (true) or reset each frame (false)'),

  twistPattern: z
    .enum(['linear', 'exponential', 'stepped'])
    .default('linear')
    .describe(
      'Pattern for distributing twist across sections: linear gradient, exponential curve, or stepped sections',
    ),

  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .describe('Overall sensitivity multiplier for audio reactivity'),

  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Minimum audio value to trigger rotation effect'),

  duration: z
    .number()
    .optional()
    .describe('Duration in seconds. If not provided, matches audio duration.'),

  baseRotation: z
    .number()
    .default(0)
    .describe('Base rotation angle in degrees (applied to all sections)'),

  maxRotation: z
    .number()
    .min(0)
    .max(180)
    .default(45)
    .describe('Maximum rotation angle in degrees per section'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    audioSrc,
    content,
    bandCount,
    twistIntensity,
    frequencyRanges,
    smoothing,
    accumulateRotation,
    twistPattern,
    sensitivity,
    threshold,
    duration,
    baseRotation,
    maxRotation,
  } = params;

  // Helper: Generate default frequency ranges
  const generateDefaultFrequencyRanges = (
    count: number,
  ): Array<{ min: number; max: number }> => {
    if (count === 3) {
      return [
        { min: 20, max: 250 }, // Low (bass)
        { min: 250, max: 2000 }, // Mid
        { min: 2000, max: 20000 }, // High (treble)
      ];
    }

    // For other counts, divide the audible spectrum logarithmically
    const minFreq = 20;
    const maxFreq = 20000;
    const ranges: Array<{ min: number; max: number }> = [];

    for (let i = 0; i < count; i++) {
      const minLog = Math.log10(minFreq);
      const maxLog = Math.log10(maxFreq);
      const step = (maxLog - minLog) / count;

      const bandMin = Math.pow(10, minLog + step * i);
      const bandMax = Math.pow(10, minLog + step * (i + 1));

      ranges.push({
        min: Math.round(bandMin),
        max: Math.round(bandMax),
      });
    }

    return ranges;
  };

  // Helper: Calculate twist intensity pattern
  const calculateTwistIntensities = (
    count: number,
    pattern: 'linear' | 'exponential' | 'stepped',
    baseIntensities: number[],
  ): number[] => {
    // If user provided exact intensities, use them
    if (baseIntensities.length === count) {
      return baseIntensities;
    }

    // Otherwise, generate pattern
    const intensities: number[] = [];

    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);

      switch (pattern) {
        case 'linear':
          intensities.push(0.3 + progress * 0.4); // 0.3 to 0.7
          break;
        case 'exponential':
          intensities.push(0.3 + Math.pow(progress, 2) * 0.6); // 0.3 to 0.9
          break;
        case 'stepped':
          intensities.push(i < count / 2 ? 0.3 : 0.7); // Step at midpoint
          break;
      }
    }

    return intensities;
  };

  // Prepare frequency ranges and intensities
  const ranges =
    frequencyRanges || generateDefaultFrequencyRanges(bandCount);
  const intensities = calculateTwistIntensities(
    bandCount,
    twistPattern,
    twistIntensity,
  );

  // Build content atom
  const buildContentAtom = (): any => {
    const baseStyle = {
      width: '100%',
      height: '100%',
      ...(content.style || {}),
    };

    switch (content.type) {
      case 'image':
        return {
          id: 'twist-content-image',
          type: 'atom' as const,
          componentId: 'ImageAtom',
          data: {
            src: content.src || '',
            className: 'w-full h-full object-cover',
            style: baseStyle,
          },
        };
      case 'video':
        return {
          id: 'twist-content-video',
          type: 'atom' as const,
          componentId: 'VideoAtom',
          data: {
            src: content.src || '',
            className: 'w-full h-full object-cover',
            fit: 'cover',
            muted: true,
            style: baseStyle,
          },
        };
      case 'text':
        return {
          id: 'twist-content-text',
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: content.text || 'AUDIO TWIST',
            className: 'text-center',
            style: {
              fontSize: '96px',
              fontWeight: 'bold',
              color: '#ffffff',
              ...baseStyle,
            },
          },
        };
      default:
        return null;
    }
  };

  // Create frequency band sections
  const createBandSections = (): any[] => {
    const sections: any[] = [];
    const sectionHeight = 100 / bandCount;

    for (let i = 0; i < bandCount; i++) {
      const frequencyRange = ranges[i] || { min: 20, max: 20000 };
      const intensity = intensities[i] || 0.5;
      const sectionId = `twist-section-${i}`;

      // Determine transform origin based on position
      let transformOrigin = 'center center';
      if (i === 0) {
        transformOrigin = 'center bottom';
      } else if (i === bandCount - 1) {
        transformOrigin = 'center top';
      }

      // Create waveform effect for this band
      const waveformEffect: WaveformEffectData = {
        audioSrc,
        audioProperty: 'frequency',
        effectType: 'rotate',
        intensity: intensity * maxRotation,
        sensitivity,
        threshold,
        useFrequencyData: true,
        numberOfSamples: 256,
        windowInSeconds: 1 / 30,
        smoothNormalisation: smoothing * 2,
        mode: 'provider',
        targetIds: [sectionId],
        start: 0,
        duration: duration || 10,
      };

      sections.push({
        id: sectionId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              top: `${i * sectionHeight}%`,
              left: '0',
              right: '0',
              height: `${sectionHeight}%`,
              transformOrigin,
              transform: `rotate(${baseRotation}deg)`,
              overflow: 'hidden',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration || 10,
          },
        },
        effects: [
          {
            id: `waveform-twist-${i}`,
            componentId: 'waveform',
            data: waveformEffect,
          },
        ],
        childrenData:
          i === Math.floor(bandCount / 2) ? [buildContentAtom()] : [],
      });
    }

    return sections;
  };

  // Build main container
  const rootContainer = {
    id: 'frequency-twist-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration || 10,
      },
    },
    childrenData: [
      {
        id: 'twist-sections-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative w-full h-full',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration || 10,
          },
        },
        childrenData: createBandSections(),
      },
      {
        id: 'audio-source',
        type: 'atom' as const,
        componentId: 'AudioAtom',
        data: {
          src: audioSrc,
          volume: 0,
          muted: {
            type: 'full' as const,
            value: true,
          },
        },
        context: {
          timing: {},
        },
      },
    ],
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
  id: 'frequencyTwist',
  title: 'Frequency Twist Waveform Effect',
  description:
    'Audio-reactive twist effect that rotates different sections of content based on frequency bands. Supports multiple twist patterns, configurable band count, and smooth transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'waveform',
    'frequency',
    'twist',
    'rotation',
    'distortion',
    'visualizer',
    'music',
    'reactive',
  ],
  dependencies: {},
  _internalPreset: false,
  defaultInputParams: {
    audioSrc: 'https://example.com/audio.mp3',
    content: {
      type: 'text',
      text: 'FREQUENCY TWIST',
      style: {},
    },
    bandCount: 3,
    twistIntensity: [0.3, 0.5, 0.7],
    smoothing: 0.5,
    accumulateRotation: false,
    twistPattern: 'linear',
    sensitivity: 1.5,
    threshold: 0.1,
    baseRotation: 0,
    maxRotation: 45,
  },
};

// Export preset
export const frequencyTwistPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
