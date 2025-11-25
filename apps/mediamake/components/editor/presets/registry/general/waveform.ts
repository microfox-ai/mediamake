/**
 * Waveform Audio Visualization Preset
 *
 * This preset creates animated or static waveform visualizations synchronized with audio tracks.
 * It provides extensive customization options for visual appearance and positioning.
 *
 * Features:
 * - **Two Waveform Types**: Static (frequency-based) or animated waves
 * - **Visual Customization**: Bar colors, spacing, width, border radius, gradients
 * - **Positioning Options**: Horizontal or vertical orientation with flexible positioning
 * - **Audio Synchronization**: Automatically syncs with audio source timing
 * - **Container Styling**: Background colors, positioning, z-index control
 * - **Gradient Support**: Custom gradient colors and directions
 *
 * Use cases:
 * - Creating audio visualizers for music videos
 * - Adding waveform overlays to audio content
 * - Building dynamic audio-reactive visuals
 * - Creating podcast or music player interfaces
 */

import {
  InputCompositionProps,
  AudioAtomDataProps,
  WaveformConfig,
  WaveformHistogramRangedDataProps,
} from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';

// Define the schema for audio sources
const audioSourceSchema = z.object({
  src: z.string().describe('Audio source URL'),
  volume: z
    .number()
    .min(0)
    .max(2)
    .optional()
    .describe('Audio volume (0-2, default: 1)'),
  start: z.number().optional().describe('Start time in seconds (default: 0)'),
  duration: z.number().optional().describe('Duration in seconds (optional)'),
});

// Define the schema for waveform configuration
const waveformConfigSchema = z.object({
  type: z
    .enum(['static', 'waves'])
    .describe('Waveform type: static or animated waves'),
  isHidden: z
    .boolean()
    .optional()
    .describe('Hide the waveform (default: false)'),
  // Static waveform parameters
  numberOfSamples: z
    .number()
    .min(1)
    .max(128)
    .optional()
    .describe('Number of samples (default: 64)'),
  windowInSeconds: z
    .number()
    .min(0.01)
    .max(5)
    .optional()
    .describe('Window in seconds (default: 1/30)'),
  amplitude: z
    .number()
    .min(0.1)
    .max(10)
    .optional()
    .describe('Wave amplitude (default: 1)'),
  useFrequencyData: z
    .boolean()
    .optional()
    .describe('Use frequency data (default: true for static)'),
  // Wave animation parameters
  waveAmplitude: z
    .number()
    .min(0.1)
    .max(10)
    .optional()
    .describe('Wave animation amplitude (default: 2)'),
  waveWindowInSeconds: z
    .number()
    .min(0.1)
    .max(5)
    .optional()
    .describe('Wave window in seconds (default: 1)'),
  waveNumberOfSamples: z
    .number()
    .min(1)
    .max(64)
    .optional()
    .describe('Wave samples (default: 32)'),
  // Visual styling
  barColor: z.string().optional().describe('Bar color (default: #A41117)'),
  barSpacing: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .describe('Bar spacing (default: 10)'),
  barBorderRadius: z
    .number()
    .min(0)
    .max(20)
    .optional()
    .describe('Bar border radius (default: 8)'),
  barWidth: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .describe('Bar width (default: 4)'),
  horizontalSymmetry: z
    .boolean()
    .optional()
    .describe('Horizontal symmetry (default: false)'),
  verticalMirror: z
    .boolean()
    .optional()
    .describe('Vertical mirror (default: true)'),
  histogramStyle: z
    .enum(['full-width', 'centered'])
    .optional()
    .describe('Histogram style (default: full-width)'),
  waveDirection: z
    .enum(['left-to-right', 'right-to-left'])
    .optional()
    .describe('Wave direction (default: right-to-left)'),
  // Gradient colors
  gradientStartColor: z.string().optional().describe('Gradient start color'),
  gradientEndColor: z.string().optional().describe('Gradient end color'),
  gradientDirection: z
    .enum(['vertical', 'horizontal'])
    .optional()
    .describe('Gradient direction (default: vertical)'),
  gradientStyle: z
    .enum(['mirrored', 'normal'])
    .optional()
    .describe('Gradient style (default: mirrored)'),
  smoothNormalisation: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe(
      'Frame-based smoothing control (0 = no smoothing, 1 = default, >1 = more smoothing)',
    ),
});

// Define the schema for container styling
const containerStyleSchema = z.object({
  backgroundColor: z
    .string()
    .optional()
    .describe('Container background color (default: transparent)'),
  className: z.string().optional().describe('Additional CSS classes'),
  width: z.number().optional().describe('Container width (default: 1920)'),
  height: z.number().optional().describe('Container height (default: 300)'),
  position: z
    .enum(['absolute', 'relative', 'fixed'])
    .optional()
    .describe('Position type (default: absolute)'),
  bottom: z
    .number()
    .optional()
    .describe('Bottom position in pixels (default: 0)'),
  left: z.number().optional().describe('Left position in pixels (default: 0)'),
  right: z
    .number()
    .optional()
    .describe('Right position in pixels (default: 0)'),
  top: z.number().optional().describe('Top position in pixels (default: 0)'),
  zIndex: z.number().optional().describe('Z-index (default: 1)'),
  // Vertical transform options
  verticalTransform: z
    .boolean()
    .optional()
    .describe(
      'Transform waveform to vertical orientation (90 degree rotation)',
    ),
  leftVerticalPos: z
    .number()
    .optional()
    .describe(
      'Position from left edge as percentage (can be negative to go outside boundary)',
    ),
  rightVerticalPos: z
    .number()
    .optional()
    .describe(
      'Position from right edge as percentage (can be negative to go outside boundary)',
    ),
  verticalWidth: z
    .number()
    .optional()
    .describe('Width of vertical waveform (default: 200)'),
});

// Main preset parameters schema
const presetParams = z.object({
  trackName: z.string().describe('Name of the track (used for the ID)'),
  trackFitDurationTo: z
    .string()
    .optional()
    .describe('Fit duration to the track (only for aligned/random tracks)'),
  audio: audioSourceSchema.describe('Audio source configuration'),
  waveform: waveformConfigSchema.describe('Waveform configuration'),
  container: containerStyleSchema
    .optional()
    .describe('Container styling options'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: {
    config: {
      duration: number;
      width: number;
      height: number;
      fps: number;
      fitDurationTo?: string;
    };
  },
): PresetOutput => {
  const { audio, waveform, container } = params;
  const { config } = props;

  // Create waveform configuration based on type
  const createWaveformConfig = (): WaveformConfig => {
    const baseConfig = {
      smoothNormalisation: waveform.smoothNormalisation ?? 1,
    };

    if (waveform.type === 'static') {
      return {
        audioSrc: audio?.src ?? '',
        numberOfSamples: waveform.numberOfSamples || 64,
        windowInSeconds: waveform.windowInSeconds || 1 / 30,
        amplitude: waveform.amplitude || 1,
        width: container?.width || config.width || 1920,
        height: container?.height || 300,
        dataOffsetInSeconds: audio?.start || 0,
        useFrequencyData: waveform.useFrequencyData ?? true,
        ...baseConfig,
      };
    } else {
      return {
        audioSrc: audio?.src ?? '',
        numberOfSamples: waveform.waveNumberOfSamples || 32,
        windowInSeconds: waveform.waveWindowInSeconds || 1,
        amplitude: waveform.waveAmplitude || 2,
        width: container?.width || config.width || 1920,
        height: container?.height || 200,
        dataOffsetInSeconds: audio?.start || -0.1,
        useFrequencyData: waveform.useFrequencyData ?? false,
        ...baseConfig,
      };
    }
  };

  // Create waveform data props
  const waveformData: WaveformHistogramRangedDataProps = {
    config: createWaveformConfig(),
    barColor: waveform.barColor || '#A41117',
    barSpacing: waveform.barSpacing || (waveform.type === 'static' ? 10 : 8),
    barBorderRadius:
      waveform.barBorderRadius || (waveform.type === 'static' ? 8 : 4),
    barWidth: waveform.barWidth || 4,
    horizontalSymmetry:
      waveform.horizontalSymmetry ?? waveform.type === 'waves',
    verticalMirror: waveform.verticalMirror ?? true,
    histogramStyle: waveform.histogramStyle || 'full-width',
    amplitude:
      waveform.type === 'static'
        ? waveform.amplitude || 0.75
        : waveform.waveAmplitude || 3.5,
    gradientStartColor: waveform.gradientStartColor || '#FFF',
    gradientEndColor: waveform.gradientEndColor || '#FDCE99',
    gradientDirection: waveform.gradientDirection || 'vertical',
    gradientStyle: waveform.gradientStyle || 'mirrored',
    className: waveform.isHidden ? 'opacity-0' : 'rounded-lg',
    waveDirection: waveform.waveDirection || 'right-to-left',
  };

  // Create container styling based on vertical transform
  const isVertical = container?.verticalTransform;

  const containerStyle = isVertical
    ? {
        backgroundColor: container?.backgroundColor || 'transparent',
        position: container?.position || 'absolute',
        top: container?.top ?? 0,
        bottom: container?.bottom ?? 0,
        left: container?.left ?? 0,
        right: container?.right ?? 0,
        zIndex: container?.zIndex ?? 1,
        width: container?.verticalWidth || 200,
        height: config.height || 1080,
        transform: 'rotate(90deg)',
        transformOrigin: 'center',
      }
    : {
        backgroundColor: container?.backgroundColor || 'transparent',
        position: container?.position || 'absolute',
        bottom: container?.bottom ?? 0,
        left: container?.left ?? 0,
        right: container?.right ?? 0,
        zIndex: container?.zIndex ?? 1,
        width: config.width || 1920,
        height: container?.height || (waveform.type === 'static' ? 300 : 200),
      };

  // Calculate vertical positioning
  const getVerticalPositioning = () => {
    if (!isVertical) return {};

    const leftPos = container?.leftVerticalPos;
    const rightPos = container?.rightVerticalPos;

    // If both are provided, left takes precedence
    if (leftPos !== undefined) {
      return {
        left: `${leftPos}%`,
        right: 'auto',
        transform: 'translateX(-50%) rotate(90deg)',
        transformOrigin: 'center',
      };
    }

    // If only right position is provided
    if (rightPos !== undefined) {
      return {
        right: `${rightPos}%`,
        left: 'auto',
        transform: 'translateX(50%) rotate(90deg)',
        transformOrigin: 'center',
      };
    }

    // Default to center if neither is provided
    return {
      left: '50%',
      right: 'auto',
      transform: 'translateX(-50%) rotate(90deg)',
      transformOrigin: 'center',
    };
  };

  const verticalPositioning = getVerticalPositioning();

  const containerClassName = [
    container?.className || '',
    waveform.isHidden ? 'opacity-0' : '',
    isVertical ? 'vertical-waveform' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    output: {
      config: {
        duration: 20,
      },
      childrenData: [
        {
          id: `${params.trackName}`,
          componentId: 'BaseLayout',
          type: params.trackFitDurationTo ? 'layout' : ('scene' as const),
          data: {},
          context: {
            timing: params.trackFitDurationTo
              ? {
                  start: 0,
                  fitDurationTo: params.trackFitDurationTo ?? 'this',
                }
              : {},
          },
          childrenData: [
            // Audio component
            ...(!audio?.src?.startsWith('ref')
              ? [
                  {
                    id: 'Audio',
                    componentId: 'AudioAtom',
                    type: 'atom' as const,
                    data: {
                      src: audio?.src ?? '',
                      volume: audio.volume || 1,
                      startFrom: audio.start || 0,
                    } as AudioAtomDataProps,
                    context: audio.duration
                      ? { timing: { duration: audio.duration } }
                      : {},
                  },
                ]
              : []),
            // Waveform container
            {
              id: 'WaveformContainer',
              componentId: 'BaseLayout',
              type: 'layout',
              data: {
                containerProps: {
                  style: {
                    ...containerStyle,
                    ...verticalPositioning,
                  },
                  className: containerClassName,
                },
                childrenProps: [
                  {
                    className: 'w-full h-full',
                    style: {
                      width: isVertical
                        ? container?.verticalWidth || 200
                        : container?.width && container?.width > 0
                          ? `${container?.width}px`
                          : '100%',
                    },
                  },
                ],
              },
              childrenData: [
                {
                  id: 'Waveform',
                  componentId:
                    waveform.type === 'static'
                      ? 'WaveformHistogramRanged'
                      : 'WaveformHistogram',
                  type: 'atom',
                  data: waveformData,
                },
              ],
            },
          ],
        },
      ],
    },
    options: {
      attachedToId: `BaseScene`,
      attachedContainers: [
        ...(!audio?.src?.startsWith('ref')
          ? [
              {
                className: 'absolute inset-0',
              },
            ]
          : []),
        {
          className: 'absolute inset-0',
        },
      ],
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'waveform-audio',
  title: 'Waveform Audio Visualization',
  description:
    'Create animated or static waveform visualizations with customizable colors, styling, and effects',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'waveform', 'visualization', 'animation', 'music'],
  defaultInputParams: {
    trackName: 'waveform-track',
    audio: {
      src: 'https://cdn1.suno.ai/6aded313-9bd5-4c8b-bb6f-fd5f158642e3.m4a',
      volume: 1,
      start: 0,
    },
    waveform: {
      type: 'waves',
      isHidden: false,
      barColor: '#A41117',
      barSpacing: 8,
      barBorderRadius: 4,
      barWidth: 4,
      horizontalSymmetry: true,
      verticalMirror: true,
      gradientStartColor: '#FFF',
      gradientEndColor: '#FDCE99',
      gradientDirection: 'vertical',
      gradientStyle: 'mirrored',
      waveDirection: 'right-to-left',
      smoothNormalisation: 1,
    },
    container: {
      backgroundColor: 'transparent',
      position: 'absolute',
      bottom: 0,
      height: 200,
      zIndex: 1,
      verticalTransform: false,
      leftVerticalPos: 50, // Center by default
      verticalWidth: 200,
    },
  },
};

const presetFunction = presetExecution.toString();
const presetParamsSchema = z.toJSONSchema(presetParams);

const waveformPreset = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

export { waveformPreset };
