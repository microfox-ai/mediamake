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
  WaveformHistogramDataProps,
  WaveformCircleDataProps,
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
    .enum(['static', 'waves', 'circle'])
    .describe(
      'Waveform type: static (frequency-based), waves (animated), or circle (circular waveform)',
    ),
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
  barSlant: z
    .number()
    .min(-180)
    .max(180)
    .optional()
    .describe('Bar slant/rotation angle in degrees (default: 0)'),
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
  // Circle-specific parameters
  strokeColor: z
    .string()
    .optional()
    .describe('Circle stroke color (default: #FF6B6B)'),
  strokeWidth: z
    .number()
    .min(1)
    .max(20)
    .optional()
    .describe('Circle stroke width (default: 3)'),
  fill: z.string().optional().describe('Circle fill color (default: none)'),
  radius: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Circle radius as percentage of container (default: 80)'),
  centerX: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Circle center X as percentage (default: 50)'),
  centerY: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe('Circle center Y as percentage (default: 50)'),
  startAngle: z
    .number()
    .min(0)
    .max(360)
    .optional()
    .describe('Circle start angle in degrees (default: 0)'),
  endAngle: z
    .number()
    .min(0)
    .max(360)
    .optional()
    .describe('Circle end angle in degrees (default: 360)'),
  rotationSpeed: z
    .number()
    .optional()
    .describe('Circle rotation speed in degrees per frame (default: 0)'),
  opacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Opacity (0-1, default: 1)'),
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
  // Container rotation
  rotation: z
    .number()
    .optional()
    .describe(
      'Container rotation in degrees (default: 0, can be used instead of verticalTransform)',
    ),
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
    } else if (waveform.type === 'circle') {
      return {
        audioSrc: audio?.src ?? '',
        numberOfSamples: waveform.numberOfSamples || 64,
        windowInSeconds: waveform.windowInSeconds || 1 / 30,
        amplitude: waveform.amplitude || 1,
        width: container?.width || config.width || 1920,
        height: container?.height || config.height || 1080,
        dataOffsetInSeconds: audio?.start || 0,
        useFrequencyData: waveform.useFrequencyData ?? false,
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

  // Create waveform data props based on type
  const createWaveformData = () => {
    const baseConfig = createWaveformConfig();

    if (waveform.type === 'circle') {
      const circleData: WaveformCircleDataProps = {
        config: baseConfig,
        strokeColor: waveform.strokeColor || '#FF6B6B',
        strokeWidth: waveform.strokeWidth || 3,
        fill: waveform.fill || 'none',
        opacity: waveform.opacity ?? 1,
        radius: waveform.radius ?? 80,
        centerX: waveform.centerX ?? 50,
        centerY: waveform.centerY ?? 50,
        startAngle: waveform.startAngle ?? 0,
        endAngle: waveform.endAngle ?? 360,
        amplitude: waveform.amplitude || 1,
        rotationSpeed: waveform.rotationSpeed ?? 0,
        gradientStartColor: waveform.gradientStartColor,
        gradientEndColor: waveform.gradientEndColor,
        className: waveform.isHidden ? 'opacity-0' : 'rounded-lg',
      };
      return { data: circleData, componentId: 'WaveformCircle' };
    } else if (waveform.type === 'static') {
      const rangedData: WaveformHistogramRangedDataProps = {
        config: baseConfig,
        barColor: waveform.barColor || '#A41117',
        barSpacing: waveform.barSpacing || 10,
        barBorderRadius: waveform.barBorderRadius || 8,
        barWidth: waveform.barWidth || 4,
        barSlant: waveform.barSlant ?? 0,
        horizontalSymmetry: waveform.horizontalSymmetry ?? false,
        verticalMirror: waveform.verticalMirror ?? true,
        histogramStyle: waveform.histogramStyle || 'full-width',
        amplitude: waveform.amplitude || 0.75,
        gradientStartColor: waveform.gradientStartColor || '#FFF',
        gradientEndColor: waveform.gradientEndColor || '#FDCE99',
        gradientDirection: waveform.gradientDirection || 'vertical',
        gradientStyle: waveform.gradientStyle || 'mirrored',
        className: waveform.isHidden ? 'opacity-0' : 'rounded-lg',
        waveDirection: waveform.waveDirection || 'right-to-left',
      };
      return { data: rangedData, componentId: 'WaveformHistogramRanged' };
    } else {
      const histogramData: WaveformHistogramDataProps = {
        config: baseConfig,
        barColor: waveform.barColor || '#A41117',
        barSpacing: waveform.barSpacing || 8,
        barBorderRadius: waveform.barBorderRadius || 4,
        barWidth: waveform.barWidth || 4,
        barSlant: waveform.barSlant ?? 0,
        horizontalSymmetry: waveform.horizontalSymmetry ?? true,
        verticalMirror: waveform.verticalMirror ?? true,
        histogramStyle: waveform.histogramStyle || 'full-width',
        amplitude: waveform.waveAmplitude || 3.5,
        gradientStartColor: waveform.gradientStartColor || '#FFF',
        gradientEndColor: waveform.gradientEndColor || '#FDCE99',
        gradientDirection: waveform.gradientDirection || 'vertical',
        gradientStyle: waveform.gradientStyle || 'mirrored',
        className: waveform.isHidden ? 'opacity-0' : 'rounded-lg',
        waveDirection: waveform.waveDirection || 'right-to-left',
      };
      return { data: histogramData, componentId: 'WaveformHistogram' };
    }
  };

  const { data: waveformData, componentId: waveformComponentId } =
    createWaveformData();

  // Create container styling based on vertical transform and rotation
  const isVertical = container?.verticalTransform;
  const containerRotation = container?.rotation ?? 0;

  // Build transform string for non-vertical containers
  const buildTransform = () => {
    if (containerRotation === 0) return undefined;
    return `rotate(${containerRotation}deg)`;
  };

  const baseContainerStyle = {
    backgroundColor: container?.backgroundColor || 'transparent',
    position: container?.position || 'absolute',
    zIndex: container?.zIndex ?? 1,
  };

  const containerStyle = isVertical
    ? {
        ...baseContainerStyle,
        top: container?.top ?? 0,
        bottom: container?.bottom ?? 0,
        left: container?.left ?? 0,
        right: container?.right ?? 0,
        width: container?.verticalWidth || 200,
        height: config.height || 1080,
      }
    : {
        ...baseContainerStyle,
        bottom: container?.bottom ?? 0,
        left: container?.left ?? 0,
        right: container?.right ?? 0,
        top: container?.top,
        width: config.width || 1920,
        height:
          container?.height ||
          (waveform.type === 'static'
            ? 300
            : waveform.type === 'circle'
              ? config.height || 1080
              : 200),
        ...(buildTransform() && {
          transform: buildTransform(),
          transformOrigin: 'center',
        }),
      };

  // Calculate vertical positioning with combined transforms
  const getVerticalPositioning = () => {
    if (!isVertical) return {};

    const leftPos = container?.leftVerticalPos;
    const rightPos = container?.rightVerticalPos;

    // Build combined transform: translateX + vertical rotation + custom rotation
    const buildPositionTransform = (translateX: string) => {
      const transforms: string[] = [translateX, 'rotate(90deg)'];
      if (containerRotation !== 0) {
        transforms.push(`rotate(${containerRotation}deg)`);
      }
      return transforms.join(' ');
    };

    // If both are provided, left takes precedence
    if (leftPos !== undefined) {
      return {
        left: `${leftPos}%`,
        right: 'auto',
        transform: buildPositionTransform('translateX(-50%)'),
        transformOrigin: 'center',
      };
    }

    // If only right position is provided
    if (rightPos !== undefined) {
      return {
        right: `${rightPos}%`,
        left: 'auto',
        transform: buildPositionTransform('translateX(50%)'),
        transformOrigin: 'center',
      };
    }

    // Default to center if neither is provided
    return {
      left: '50%',
      right: 'auto',
      transform: buildPositionTransform('translateX(-50%)'),
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
                  componentId: waveformComponentId,
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
