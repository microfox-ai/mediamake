/**
 * Image Loop Preset
 *
 * This preset applies dynamic effects (pan, zoom, shake, generic animations) to single or multiple
 * images. It creates engaging visual sequences with smooth motion and transitions.
 *
 * Features:
 * - **Multiple Effects**: Pan, zoom, shake, and custom generic animations
 * - **Image Filters**: Blur, brightness, contrast, saturation, grayscale, sepia, and more
 * - **Blend Modes**: Various blend modes for creative compositing
 * - **Time Range Control**: Apply effects to specific time ranges (MM:SS-MM:SS or MM:SS.sss-MM:SS.sss)
 * - **Effect Looping**: Repeat effects multiple times within their duration
 * - **Flexible Duration**: Set per-image duration or use automatic fitting
 *
 * Use cases:
 * - Creating dynamic image slideshows with motion
 * - Adding cinematic pan and zoom effects to photos
 * - Building engaging image sequences with transitions
 * - Creating visual effects for presentations
 */

import {
  InputCompositionProps,
  PanEffectData,
  ZoomEffectData,
  GenericEffectData,
} from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { paramMetaTypes, paramInputTypes } from '../../dataTypes';

// Define the schema for image sources
const imageSourceSchema = z.object({
  src: z.string().describe('Image source URL'),
  rangeString: z
    .string()
    .optional()
    .meta({
      [paramMetaTypes.rangeField]: true,
      [paramMetaTypes.groupEditable]: false,
    })
    .describe('Range in MM:SS-MM:SS format like 01:00-02:00'),
  fit: z
    .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: true })
    .describe('How the image should fit (default: cover)'),
  filter: z
    .enum([
      'none',
      'blur',
      'brightness',
      'contrast',
      'saturate',
      'grayscale',
      'sepia',
      'hue-rotate',
      'invert',
      'distorted',
      'vintage',
      'dramatic',
      'soft',
      'sharp',
    ])
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: true })
    .describe('Image filter effect (default: none)'),
  blendMode: z
    .enum([
      'normal',
      'multiply',
      'screen',
      'overlay',
      'darken',
      'lighten',
      'color-dodge',
      'color-burn',
      'hard-light',
      'soft-light',
      'difference',
      'exclusion',
      'hue',
      'saturation',
      'color',
      'luminosity',
    ])
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: true })
    .describe('Blend mode for the image (default: normal)'),
  opacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: true })
    .describe('Image opacity (0-1, default: 1)'),
  colorTint: z
    .string()
    .optional()
    .meta({
      [paramMetaTypes.inputType]: paramInputTypes.color,
      [paramMetaTypes.groupEditable]: true,
    })
    .describe('Optional color tint overlay'),
});

// Define the schema for effects
const effectSchema = z.object({
  type: z
    .enum([
      'pan',
      'zoom',
      'generic',
      'shake',
      'beat-zoom',
      'beat-shake',
      'beat-exposure',
    ])
    .describe('Type of effect to apply'),
  id: z.string().optional().describe('Custom effect ID'),
  range: z
    .string()
    .optional()
    .meta({ [paramMetaTypes.rangeField]: true })
    .describe('Range of the effect in MM:SS-MM:SS format like 01:00-02:00'),
  // Pan effect options
  pan: z
    .object({
      direction: z
        .enum(['up', 'down', 'left', 'right'])
        .optional()
        .describe('Pan direction (default: up)'),
      distance: z
        .number()
        .optional()
        .describe('Pan distance in pixels (default: 200)'),
      loopTimes: z
        .number()
        .optional()
        .describe('Number of times to loop the effect (default: 1)'),
    })
    .optional()
    .describe('Pan effect options'),
  // Zoom effect options
  zoom: z
    .object({
      direction: z
        .enum(['in', 'out'])
        .optional()
        .describe('Zoom direction (default: in)'),
      depth: z
        .number()
        .optional()
        .describe('Zoom depth multiplier (default: 1.2)'),
      loopTimes: z
        .number()
        .optional()
        .describe('Number of times to loop the effect (default: 1)'),
    })
    .optional()
    .describe('Zoom effect options'),
  // Generic effect options
  generic: z
    .object({
      animationType: z
        .enum(['ease-in-out', 'ease-out', 'ease-in', 'linear', 'spring'])
        .optional()
        .describe('Animation type (default: ease-in-out)'),
      animationRanges: z
        .array(
          z.object({
            key: z.string().describe('CSS property name'),
            val: z.union([z.string(), z.number()]).describe('Property value'),
            prog: z.number().min(0).max(1).describe('Animation progress (0-1)'),
          }),
        )
        .optional()
        .describe('Animation ranges for generic effect'),
    })
    .optional()
    .describe('Generic effect options'),
  // Shake effect options
  shake: z
    .object({
      amplitude: z
        .number()
        .optional()
        .describe('Shake intensity in pixels (default: 10)'),
      frequency: z
        .number()
        .optional()
        .describe('Shake frequency (default: 0.1)'),
      decay: z
        .boolean()
        .optional()
        .describe('Whether shake should decay over time (default: true)'),
      axis: z
        .enum(['x', 'y', 'both'])
        .optional()
        .describe('Which axis to shake (default: both)'),
    })
    .optional()
    .describe('Shake effect options'),
  // Beat zoom effect options
  beatZoom: z
    .object({
      audioSrc: z.string().describe('Audio source URL or ref:componentId'),
      zoomIntensity: z
        .number()
        .min(0.1)
        .max(2)
        .default(0.3)
        .optional()
        .describe('Zoom intensity multiplier (0.1-2)'),
      baseScale: z
        .number()
        .min(0.5)
        .max(1.5)
        .default(1)
        .optional()
        .describe('Base scale value (0.5-1.5)'),
      sensitivity: z
        .number()
        .min(0.1)
        .max(5)
        .default(1.5)
        .optional()
        .describe('Beat detection sensitivity (0.1-5)'),
      threshold: z
        .number()
        .min(0)
        .max(1)
        .default(0.2)
        .optional()
        .describe('Minimum audio value to trigger zoom (0-1)'),
      audioProperty: z
        .enum(['bass', 'mid', 'treble', 'waveform'])
        .default('bass')
        .optional()
        .describe('Which audio property to react to'),
      smoothNormalisation: z
        .number()
        .min(0)
        .max(5)
        .default(1)
        .optional()
        .describe(
          'Frame-based smoothing control (0 = no smoothing, 1 = default, >1 = more smoothing)',
        ),
    })
    .optional()
    .describe('Beat zoom effect options'),
  // Beat shake effect options
  beatShake: z
    .object({
      audioSrc: z.string().describe('Audio source URL or ref:componentId'),
      shakeIntensity: z
        .number()
        .min(5)
        .max(100)
        .default(20)
        .optional()
        .describe('Shake intensity in pixels (5-100)'),
      shakeAxis: z
        .enum(['x', 'y', 'both'])
        .default('both')
        .optional()
        .describe('Which axis to shake'),
      sensitivity: z
        .number()
        .min(0.1)
        .max(5)
        .default(2)
        .optional()
        .describe('Beat detection sensitivity (0.1-5)'),
      threshold: z
        .number()
        .min(0)
        .max(1)
        .default(0.15)
        .optional()
        .describe('Minimum audio value to trigger shake (0-1)'),
      audioProperty: z
        .enum(['bass', 'mid', 'treble', 'waveform'])
        .default('mid')
        .optional()
        .describe('Which audio property to react to'),
      smoothNormalisation: z
        .number()
        .min(0)
        .max(5)
        .default(1)
        .optional()
        .describe(
          'Frame-based smoothing control (0 = no smoothing, 1 = default, >1 = more smoothing)',
        ),
    })
    .optional()
    .describe('Beat shake effect options'),
  // Beat exposure effect options
  beatExposure: z
    .object({
      audioSrc: z.string().describe('Audio source URL or ref:componentId'),
      brightnessIntensity: z
        .number()
        .min(0.1)
        .max(2)
        .default(0.5)
        .optional()
        .describe('Brightness intensity multiplier (0.1-2)'),
      baseBrightness: z
        .number()
        .min(0.5)
        .max(1.5)
        .default(1)
        .optional()
        .describe('Base brightness value (0.5-1.5)'),
      sensitivity: z
        .number()
        .min(0.1)
        .max(5)
        .default(1.8)
        .optional()
        .describe('Beat detection sensitivity (0.1-5)'),
      threshold: z
        .number()
        .min(0)
        .max(1)
        .default(0.18)
        .optional()
        .describe('Minimum audio value to trigger exposure change (0-1)'),
      audioProperty: z
        .enum(['bass', 'mid', 'treble', 'waveform'])
        .default('treble')
        .optional()
        .describe('Which audio property to react to'),
      smoothNormalisation: z
        .number()
        .min(0)
        .max(5)
        .default(1)
        .optional()
        .describe(
          'Frame-based smoothing control (0 = no smoothing, 1 = default, >1 = more smoothing)',
        ),
    })
    .optional()
    .describe('Beat exposure effect options'),
});

// Main preset parameters schema
const presetParams = z.object({
  trackName: z
    .string()
    .meta({ [paramMetaTypes.trackName]: true })
    .describe('Name of the track ( used for the ID )'),
  trackFitDurationTo: z
    .string()
    .optional()
    .meta({ [paramMetaTypes.linkTrackName]: true })
    .describe('Fit duration to the track ( only for aligned/random tracks )'),
  trackRange: z
    .string()
    .optional()
    .meta({ [paramMetaTypes.rangeField]: true })
    .describe(
      'Track time range (MM:SS-MM:SS or MM:SS.sss-MM:SS.sss). Empty = no offset.',
    ),
  containerObject: z
    .object({
      left: z
        .number()
        .optional()
        .describe('Container left position in pixels or percentage'),
      top: z
        .number()
        .optional()
        .describe('Container top position in pixels or percentage'),
      right: z
        .number()
        .optional()
        .describe('Container right position in pixels or percentage'),
      bottom: z
        .number()
        .optional()
        .describe('Container bottom position in pixels or percentage'),
      width: z
        .number()
        .optional()
        .describe('Container width in pixels'),
      height: z
        .number()
        .optional()
        .describe('Container height in pixels'),
      positioning: z
        .enum([
          'top-left',
          'top-center',
          'top-right',
          'center-left',
          'center',
          'center-right',
          'bottom-left',
          'bottom-center',
          'bottom-right',
        ])
        .optional()
        .describe('Anchor position within the parent'),
    })
    .optional()
    .meta({ [paramMetaTypes.containerObject]: true })
    .describe(
      'Container layout (insets, size, positioning). Omit a field to leave unset.',
    ),
  images: z
    .object({
      mediaRef: z
        .string()
        .optional()
        .describe(
          'Linked medias reference key — srcs are read/written from this ref',
        ),
      items: z
        .array(imageSourceSchema)
        .describe('Per-image local props (fit, filter, range, etc.)'),
    })
    .meta({
      [paramMetaTypes.nestedRangeField]: 'items[].rangeString',
      [paramMetaTypes.imagesGroup]: true,
      [paramMetaTypes.referrableDataType]: 'medias',
    })
    .describe('Image sources with optional linked medias ref for srcs'),
  effects: z
    .array(effectSchema)
    .min(1)
    .meta({ [paramMetaTypes.nestedRangeField]: '[].range' })
    .describe('Array of effects to apply'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: {
    config: InputCompositionProps['config'];
    presets?: any;
    helpers?: Record<string, Function>;
  },
): Promise<Partial<PresetOutput>> => {
  // After processDataReferences, images may already be a merged array.
  // Before processing (or if unprocessed), it is { mediaRef?, items }.
  const rawImages = (params as any).images;
  const images: any[] = Array.isArray(rawImages)
    ? rawImages
    : Array.isArray(rawImages?.items)
      ? rawImages.items
      : [];
  const { effects } = params;
  const { config, presets, helpers } = props;

  const parseTimeRange = helpers!.parseTimeRange as (
    range: string,
  ) => { start: number; end: number } | null;

  // Helper function to parse range string and return start and duration
  const parseRangeString = (
    rangeString: string | undefined,
  ): { start: number; duration: number } | null => {
    if (!rangeString) return null;
    const timeRange = parseTimeRange(rangeString);
    if (!timeRange) return null;
    const duration = timeRange.end - timeRange.start;
    if (duration <= 0) return null;
    return { start: timeRange.start, duration };
  };

  // Helper function to generate CSS filter styles
  const generateFilterStyle = (filter: string): string => {
    switch (filter) {
      case 'blur':
        return 'blur(2px)';
      case 'brightness':
        return 'brightness(1.2)';
      case 'contrast':
        return 'contrast(1.3)';
      case 'saturate':
        return 'saturate(1.5)';
      case 'grayscale':
        return 'grayscale(100%)';
      case 'sepia':
        return 'sepia(100%)';
      case 'hue-rotate':
        return 'hue-rotate(180deg)';
      case 'invert':
        return 'invert(100%)';
      case 'distorted':
        return 'contrast(1.5) saturate(1.3) hue-rotate(15deg)';
      case 'vintage':
        return 'sepia(50%) contrast(1.2) brightness(0.9) saturate(1.1)';
      case 'dramatic':
        return 'contrast(1.4) saturate(1.3) brightness(0.8)';
      case 'soft':
        return 'blur(0.5px) brightness(1.1) contrast(0.9)';
      case 'sharp':
        return 'contrast(1.2) saturate(1.1) brightness(1.05)';
      case 'none':
      default:
        return 'none';
    }
  };

  // Helper function to map fit prop to object-* class
  const getObjectFitClass = (fit: string | undefined): string => {
    switch (fit) {
      case 'cover':
        return 'object-cover';
      case 'contain':
        return 'object-contain';
      case 'fill':
        return 'object-fill';
      case 'none':
        return 'object-none';
      case 'scale-down':
        return 'object-scale-down';
      default:
        return 'object-cover'; // Default fallback
    }
  };

  const isVertical =
    config?.width && config?.height && config?.width < config?.height;

  // Create image components with effects
  const imageComponents = await Promise.all(
    images.map(async (image, imageIndex) => {
      // Convert effects to the format expected by the system
      const imageEffectsRaw = await Promise.all(
        effects.map(async (effect, effectIndex) => {
          const effectId =
            effect.id ||
            `${params.trackName ?? 'imageloop'}-${effect.type}-${imageIndex}-${effectIndex}`;

          // Parse the range if provided
          const timeRange = parseTimeRange(effect.range || '');

          // Calculate duration based on range
          const effectDuration = timeRange
            ? timeRange.end - timeRange.start
            : 2; // Default duration if no range

          switch (effect.type) {
            case 'pan':
              return {
                id: effectId,
                componentId: 'pan',
                data: {
                  mode: 'provider',
                  targetIds: [
                    `${params.trackName ?? 'imageloop'}-image-${imageIndex}`,
                  ],
                  panDirection: effect.pan?.direction || 'up',
                  panDistance: effect.pan?.distance || 200,
                  loopTimes: effect.pan?.loopTimes || 1,
                  duration: effectDuration,
                  start: timeRange?.start || 0,
                  end: timeRange?.end || undefined,
                } as PanEffectData,
              };

            case 'zoom':
              return {
                id: effectId,
                componentId: 'zoom',
                data: {
                  mode: 'provider',
                  targetIds: [
                    `${params.trackName ?? 'imageloop'}-image-${imageIndex}`,
                  ],
                  zoomDirection: effect.zoom?.direction || 'in',
                  zoomDepth: effect.zoom?.depth || 1.2,
                  loopTimes: effect.zoom?.loopTimes || 1,
                  duration: effectDuration,
                  start: timeRange?.start || 0,
                  end: timeRange?.end || undefined,
                } as ZoomEffectData,
              };

            case 'generic':
              return {
                id: effectId,
                componentId: 'generic',
                data: {
                  mode: 'provider',
                  targetIds: [
                    `${params.trackName ?? 'imageloop'}-image-${imageIndex}`,
                  ],
                  type: effect.generic?.animationType || 'ease-in-out',
                  ranges:
                    effect.generic?.animationRanges?.map(range => ({
                      key: range.key,
                      val: isNaN(Number(range.val))
                        ? range.val
                        : Number(range.val),
                      prog: range.prog,
                    })) || [],
                  duration: effectDuration,
                  start: timeRange?.start || 0,
                  end: timeRange?.end || undefined,
                } as GenericEffectData,
              };

            case 'shake':
              return {
                id: effectId,
                componentId: 'shake',
                data: {
                  amplitude: effect.shake?.amplitude || 10,
                  frequency: effect.shake?.frequency || 0.1,
                  decay: effect.shake?.decay ?? true,
                  axis: effect.shake?.axis || 'both',
                  duration: effectDuration,
                  start: timeRange?.start || 0,
                  end: timeRange?.end || undefined,
                  mode: 'provider',
                  targetIds: [
                    `${params.trackName ?? 'imageloop'}-image-${imageIndex}`,
                  ],
                },
              };

            case 'beat-zoom':
              if (!presets || !presets.beatZoomEffect) {
                throw new Error(
                  'Preset dependency "beatZoomEffect" not found. Check metadata.dependencies.',
                );
              }
              if (!effect.beatZoom?.audioSrc) {
                throw new Error(
                  'beatZoom.audioSrc is required for beat-zoom effect',
                );
              }
              const beatZoomResult = await presets.beatZoomEffect(
                {
                  targetId: `${params.trackName ?? 'imageloop'}-image-${imageIndex}`,
                  audioSrc: effect.beatZoom.audioSrc,
                  effectStart: timeRange?.start || 0,
                  effectDuration,
                  zoomIntensity: effect.beatZoom.zoomIntensity,
                  baseScale: effect.beatZoom.baseScale,
                  sensitivity: effect.beatZoom.sensitivity,
                  threshold: effect.beatZoom.threshold,
                  audioProperty: effect.beatZoom.audioProperty,
                  smoothNormalisation: effect.beatZoom.smoothNormalisation,
                  effectId: effectId,
                },
                props,
              );
              return (
                beatZoomResult?.output?._extractedEffects?.[0] ||
                beatZoomResult?.output?.childrenData?.[0]?.effects?.[0] ||
                null
              );

            case 'beat-shake':
              if (!presets || !presets.beatShakeEffect) {
                throw new Error(
                  'Preset dependency "beatShakeEffect" not found. Check metadata.dependencies.',
                );
              }
              if (!effect.beatShake?.audioSrc) {
                throw new Error(
                  'beatShake.audioSrc is required for beat-shake effect',
                );
              }
              const beatShakeResult = await presets.beatShakeEffect(
                {
                  targetId: `${params.trackName ?? 'imageloop'}-image-${imageIndex}`,
                  audioSrc: effect.beatShake.audioSrc,
                  effectStart: timeRange?.start || 0,
                  effectDuration,
                  shakeIntensity: effect.beatShake.shakeIntensity,
                  shakeAxis: effect.beatShake.shakeAxis,
                  sensitivity: effect.beatShake.sensitivity,
                  threshold: effect.beatShake.threshold,
                  audioProperty: effect.beatShake.audioProperty,
                  smoothNormalisation: effect.beatShake.smoothNormalisation,
                  effectId: effectId,
                },
                props,
              );
              return (
                beatShakeResult?.output?._extractedEffects?.[0] ||
                beatShakeResult?.output?.childrenData?.[0]?.effects?.[0] ||
                null
              );

            case 'beat-exposure':
              if (!presets || !presets.beatExposureEffect) {
                throw new Error(
                  'Preset dependency "beatExposureEffect" not found. Check metadata.dependencies.',
                );
              }
              if (!effect.beatExposure?.audioSrc) {
                throw new Error(
                  'beatExposure.audioSrc is required for beat-exposure effect',
                );
              }
              const beatExposureResult = await presets.beatExposureEffect(
                {
                  targetId: `${params.trackName ?? 'imageloop'}-image-${imageIndex}`,
                  audioSrc: effect.beatExposure.audioSrc,
                  effectStart: timeRange?.start || 0,
                  effectDuration,
                  brightnessIntensity: effect.beatExposure.brightnessIntensity,
                  baseBrightness: effect.beatExposure.baseBrightness,
                  sensitivity: effect.beatExposure.sensitivity,
                  threshold: effect.beatExposure.threshold,
                  audioProperty: effect.beatExposure.audioProperty,
                  smoothNormalisation: effect.beatExposure.smoothNormalisation,
                  effectId: effectId,
                },
                props,
              );
              return (
                beatExposureResult?.output?._extractedEffects?.[0] ||
                beatExposureResult?.output?.childrenData?.[0]?.effects?.[0] ||
                null
              );

            default:
              return {
                id: effectId,
                componentId: 'pan',
                data: {
                  panDirection: 'up',
                  panDistance: 200,
                  loopTimes: 1,
                  duration: effectDuration,
                  start: timeRange?.start || 0,
                  end: timeRange?.end || undefined,
                } as PanEffectData,
              };
          }
        }),
      );

      // Filter out null effects (from async beat effects that failed)
      const imageEffects = imageEffectsRaw.filter(
        (e): e is NonNullable<typeof e> => e !== null,
      );

      const isPanEffect = imageEffects.some(
        effect => effect.componentId === 'pan',
      );
      const _panEffectData = imageEffects.find(
        effect => effect.componentId === 'pan',
      )?.data as PanEffectData;

      // Parse rangeString if provided; otherwise duration defaults to 0
      const imageRange = parseRangeString(image.rangeString);

      let imageStart: number | undefined;
      let imageDuration: number;

      if (imageRange) {
        imageStart = imageRange.start;
        imageDuration = imageRange.duration;
      } else {
        imageStart = undefined;
        imageDuration = 0;
      }

      const imageFit = image.fit || 'cover';
      const objectFitClass = getObjectFitClass(imageFit);

      return {
        id: `${params.trackName ?? 'imageloop'}-image-${imageIndex}`,
        componentId: 'ImageAtom',
        type: 'atom' as const,
        data: {
          src: image.src,
          className: isPanEffect
            ? isVertical
              ? `w-full h-auto ${objectFitClass}`
              : `w-full ${objectFitClass}`
            : `w-full h-full ${objectFitClass}`,
          fit: imageFit,
          style: {
            ...(isPanEffect
              ? {
                  height:
                    (props.config?.height ?? 1080) +
                    ((_panEffectData?.panDistance as number) ?? 0),
                }
              : {}),
            ...(image.filter && image.filter !== 'none'
              ? { filter: generateFilterStyle(image.filter) }
              : {}),
            ...(image.blendMode && image.blendMode !== 'normal'
              ? { mixBlendMode: image.blendMode }
              : {}),
            ...(image.opacity !== undefined ? { opacity: image.opacity } : {}),
            ...(image.colorTint
              ? {
                  boxShadow: `inset 0 0 0 9999px ${image.colorTint}40`,
                }
              : {}),
          },
        },
        context: {
          timing: {
            ...(imageStart !== undefined ? { start: imageStart } : {}),
            duration: imageDuration,
          },
        },
        effects: imageEffects,
      };
    }),
  );

  // Build container style based on positioning props
  const container = params.containerObject ?? {};
  const containerStyle: React.CSSProperties = {};

  const applyPositioning = (
    positioning: string | undefined,
  ): React.CSSProperties => {
    switch (positioning) {
      case 'top-left':
        return { top: 0, left: 0 };
      case 'top-center':
        return { top: 0, left: '50%', transform: 'translateX(-50%)' };
      case 'top-right':
        return { top: 0, right: 0 };
      case 'center-left':
        return { top: '50%', left: 0, transform: 'translateY(-50%)' };
      case 'center':
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
      case 'center-right':
        return { top: '50%', right: 0, transform: 'translateY(-50%)' };
      case 'bottom-left':
        return { bottom: 0, left: 0 };
      case 'bottom-center':
        return { bottom: 0, left: '50%', transform: 'translateX(-50%)' };
      case 'bottom-right':
        return { bottom: 0, right: 0 };
      default:
        return {};
    }
  };

  Object.assign(containerStyle, applyPositioning(container.positioning));

  // Explicit insets override positioning anchors for the same edge
  if (container.left !== undefined) {
    containerStyle.left = container.left;
  }
  if (container.top !== undefined) {
    containerStyle.top = container.top;
  }
  if (container.right !== undefined) {
    containerStyle.right = container.right;
  }
  if (container.bottom !== undefined) {
    containerStyle.bottom = container.bottom;
  }
  if (container.width !== undefined) {
    containerStyle.width = container.width;
  }
  if (container.height !== undefined) {
    containerStyle.height = container.height;
  }

  const hasPositioning =
    container.positioning !== undefined ||
    container.left !== undefined ||
    container.top !== undefined ||
    container.right !== undefined ||
    container.bottom !== undefined ||
    container.width !== undefined ||
    container.height !== undefined;
  const containerClassName = hasPositioning ? 'absolute' : 'absolute inset-0';

  const trackTimeRange = parseTimeRange(params.trackRange || '');
  const trackTiming: {
    start?: number;
    duration?: number;
    fitDurationTo?: string;
  } = {};
  if (trackTimeRange) {
    trackTiming.start = trackTimeRange.start;
    if (!params.trackFitDurationTo) {
      const duration = trackTimeRange.end - trackTimeRange.start;
      if (duration > 0) {
        trackTiming.duration = duration;
      }
    }
  }
  if (params.trackFitDurationTo) {
    trackTiming.fitDurationTo = params.trackFitDurationTo;
  }

  return {
    output: {
      childrenData: [
        {
          id: `${params.trackName}`,
          componentId: 'BaseLayout',
          type: params.trackFitDurationTo ? 'layout' : ('scene' as const),
          data: {
            containerProps: {
              className: containerClassName,
              ...(Object.keys(containerStyle).length > 0
                ? { style: containerStyle }
                : {}),
            },
          },
          context: {
            timing: trackTiming,
          },
          childrenData: imageComponents ?? [],
        },
      ],
    },
    options: {
      attachedToId: `BaseScene`,
      attachedContainers: [
        {
          className: containerClassName,
          ...(Object.keys(containerStyle).length > 0
            ? { style: containerStyle }
            : {}),
        },
      ],
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'imageloop',
  title: 'imageloop',
  description:
    'Apply pan, zoom, generic, shake, and beat-synchronized effects to single or multiple images',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'effects', 'visual', 'animation', 'beat', 'audio'],
  dependencies: {
    presets: ['beatZoomEffect', 'beatShakeEffect', 'beatExposureEffect'],
  },
  defaultInputParams: {
    trackName: 'imageloop-track',
    trackRange: '',
    images: {
      items: [
        {
          src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
          fit: 'cover',
          filter: 'none',
          blendMode: 'normal',
          opacity: 1,
        },
      ],
    },
    effects: [
      {
        type: 'pan',
        pan: {
          direction: 'up',
          distance: 200,
          loopTimes: 1,
        },
      },
    ],
  },
};

const presetFunction = presetExecution.toString();
const presetParamsSchema = z.toJSONSchema(presetParams);

const imageLoopPreset = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

export { imageLoopPreset };
