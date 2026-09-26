import {
  InputCompositionProps,
  PanEffectData,
  ZoomEffectData,
  GenericEffectData,
  AudioAtomDataProps,
} from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { paramMetaTypes } from '../../dataTypes';

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
    .describe('Range in MM:SS-MM:SS or MM:SS.sss-MM:SS.sss format like 01:00-02:00'),
  duration: z
    .number()
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: false })
    .describe(
      'Duration in seconds (optional - if not provided, will use effect durations)',
    ),
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
});

// Define the schema for effects
const effectSchema = z.object({
  type: z
    .enum(['pan', 'zoom', 'generic', 'shake', 'fastcut', 'stack'])
    .describe('Type of effect to apply'),
  id: z.string().optional().describe('Custom effect ID'),
  range: z
    .string()
    .optional()
    .meta({ [paramMetaTypes.rangeField]: true })
    .describe('Range of the effect in MM:SS-MM:SS or MM:SS.sss-MM:SS.sss format like 01:00-02:00'),
  start: z.number().optional().describe('Effect start offset time in seconds'),
  duration: z.number().optional().describe('Effect duration in seconds'),
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
  // Fast cut effect options
  fastcut: z
    .object({
      cutDuration: z
        .number()
        .min(0.05)
        .max(0.5)
        .optional()
        .describe('Duration of each fast cut image in seconds (default: 0.08)'),
      numberOfCuts: z
        .number()
        .min(2)
        .max(20)
        .optional()
        .describe('Number of fast cuts to show (default: 5)'),
      imageSelection: z
        .enum(['all', 'random', 'sequential'])
        .optional()
        .describe(
          'How to select images: all (use all images), random (pick randomly), sequential (in order) (default: random)',
        ),
      applyAt: z
        .enum(['start', 'end', 'both'])
        .optional()
        .describe(
          'When to apply fast cuts: start (before image), end (after image), both (before and after) (default: end)',
        ),
      fadeEffect: z
        .boolean()
        .optional()
        .describe('Add quick fade between cuts (default: false)'),
    })
    .optional()
    .describe('Fast cut transition effect options'),
  // Stack effect options
  stack: z
    .object({
      direction: z
        .enum(['bottom', 'top', 'left', 'right', 'auto'])
        .optional()
        .describe(
          'Direction from which new images slide in: bottom, top, left, right, auto (adapts to arrangement) (default: auto)',
        ),
      slideInDuration: z
        .number()
        .min(0.1)
        .max(2)
        .optional()
        .describe('Duration of slide-in animation in seconds (default: 0.5)'),
      arrangement: z
        .enum(['horizontal', 'vertical', 'grid', 'auto', 'dynamic'])
        .optional()
        .describe(
          'How to arrange images: horizontal (side by side), vertical (stacked), grid (auto grid layout), auto (adapts to video orientation), dynamic (progressively rearranges as images are added) (default: dynamic)',
        ),
      gap: z
        .number()
        .min(0)
        .max(50)
        .optional()
        .describe('Gap between images in pixels (default: 0)'),
      maintainAspectRatio: z
        .boolean()
        .optional()
        .describe('Maintain original image aspect ratios (default: false)'),
    })
    .optional()
    .describe(
      'Stack effect options - images accumulate on screen instead of replacing each other',
    ),
});

// Define the schema for sound configuration
const soundConfigSchema = z.object({
  enabled: z
    .boolean()
    .default(true)
    .describe('Enable transition sound effects'),
  sounds: z
    .array(z.string())
    .min(1)
    .describe(
      'Array of sound file URLs or paths. Will cycle through for each transition',
    ),
  volume: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Volume level for transition sounds (0-1, default: 0.8)'),
  timing: z
    .enum(['start', 'end', 'overlap'])
    .default('end')
    .describe(
      'When to play sound: start (at transition start), end (before transition ends), overlap (spans transition)',
    ),
  offset: z
    .number()
    .default(-0.2)
    .describe(
      'Time offset in seconds. Negative plays before transition, positive plays after (default: -0.2)',
    ),
  duration: z
    .number()
    .default(0.5)
    .describe('Duration of sound playback in seconds (default: 0.5)'),
  selectionMode: z
    .enum(['sequential', 'random', 'single'])
    .default('sequential')
    .describe(
      'How to select sounds: sequential (cycle through), random (pick randomly), single (use first sound for all)',
    ),
});

// Main preset parameters schema
const presetParams = z.object({
  trackName: z.string().describe('Name of the track (used for the ID)'),
  trackFitDurationTo: z
    .string()
    .optional()
    .describe('Fit duration to the track (only for aligned/random tracks)'),
  trackStartOffset: z
    .number()
    .optional()
    .describe('Track start offset time in seconds (default: 0)'),
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
  transitionSounds: soundConfigSchema
    .optional()
    .describe('Configuration for transition sound effects'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: {
    config: InputCompositionProps['config'];
    helpers?: Record<string, Function>;
  },
): Partial<PresetOutput> => {
  const rawImages = (params as any).images;
  const images: any[] = Array.isArray(rawImages)
    ? rawImages
    : Array.isArray(rawImages?.items)
      ? rawImages.items
      : [];
  const { effects, transitionSounds } = params;
  const { config, helpers } = props;

  const parseTimeRange = (helpers?.parseTimeRange ?? (() => null)) as (
    range: string,
  ) => { start: number; end: number } | null;

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

  const isVertical =
    config?.width && config?.height && config?.width < config?.height;

  // Check if stack effect is present
  const stackEffect = effects.find(effect => effect.type === 'stack');
  const hasStackEffect = !!stackEffect;

  // Helper function to calculate dynamic layout for N images
  const calculateDynamicLayout = (
    totalVisibleImages: number,
    imageIndex: number,
    gap: number,
  ): { top: string; left: string; width: string; height: string } => {
    switch (totalVisibleImages) {
      case 1:
        // Full screen
        return {
          top: '0%',
          left: '0%',
          width: '100%',
          height: '100%',
        };

      case 2:
        // Side by side (horizontal split)
        return {
          top: '0%',
          left: `${imageIndex * 50}%`,
          width: `calc(50% - ${gap / 2}px)`,
          height: '100%',
        };

      case 3:
        // 2 on top, 1 on bottom
        if (imageIndex < 2) {
          // Top row (2 images)
          return {
            top: '0%',
            left: `${imageIndex * 50}%`,
            width: `calc(50% - ${gap / 2}px)`,
            height: `calc(50% - ${gap / 2}px)`,
          };
        } else {
          // Bottom row (1 image, centered or full width)
          return {
            top: '50%',
            left: '0%',
            width: '100%',
            height: `calc(50% - ${gap / 2}px)`,
          };
        }

      case 4: // 2x2 grid
      {
        const row = Math.floor(imageIndex / 2);
        const col = imageIndex % 2;
        return {
          top: `${row * 50}%`,
          left: `${col * 50}%`,
          width: `calc(50% - ${gap / 2}px)`,
          height: `calc(50% - ${gap / 2}px)`,
        };
      }

      case 5:
        // 2 on top, 3 on bottom
        if (imageIndex < 2) {
          // Top row (2 images)
          return {
            top: '0%',
            left: `${imageIndex * 50}%`,
            width: `calc(50% - ${gap / 2}px)`,
            height: `calc(50% - ${gap / 2}px)`,
          };
        } else {
          // Bottom row (3 images)
          const bottomIndex = imageIndex - 2;
          return {
            top: '50%',
            left: `${bottomIndex * 33.333}%`,
            width: `calc(33.333% - ${gap / 2}px)`,
            height: `calc(50% - ${gap / 2}px)`,
          };
        }

      case 6: // 3x2 grid (2 rows, 3 columns)
      {
        const row = Math.floor(imageIndex / 3);
        const col = imageIndex % 3;
        return {
          top: `${row * 50}%`,
          left: `${col * 33.333}%`,
          width: `calc(33.333% - ${gap / 2}px)`,
          height: `calc(50% - ${gap / 2}px)`,
        };
      }

      default: // For 7+ images, use auto grid
      {
        const cols = Math.ceil(Math.sqrt(totalVisibleImages));
        const rows = Math.ceil(totalVisibleImages / cols);
        const row = Math.floor(imageIndex / cols);
        const col = imageIndex % cols;
        const widthPercent = 100 / cols;
        const heightPercent = 100 / rows;

        return {
          top: `${row * heightPercent}%`,
          left: `${col * widthPercent}%`,
          width: `calc(${widthPercent}% - ${gap / 2}px)`,
          height: `calc(${heightPercent}% - ${gap / 2}px)`,
        };
      }
    }
  };

  // Helper function to calculate effective image duration based on effects
  const calculateImageDuration = (image: any, imageIndex?: number): number => {
    // Prefer imageloop-style rangeString
    const imageRange = parseTimeRange(image.rangeString || '');
    if (imageRange && imageRange.end > imageRange.start) {
      return imageRange.end - imageRange.start;
    }

    // If image has explicit duration, use it
    if (image.duration && image.duration > 0) {
      return image.duration;
    }

    // For stack effect, calculate total time needed
    if (hasStackEffect && imageIndex !== undefined) {
      const slideInDuration = stackEffect?.stack?.slideInDuration ?? 0.5;

      // Each image needs to stay visible from when it appears until the last image finishes sliding in
      // Last image starts at: (images.length - 1) * slideInDuration
      // Last image slides for: slideInDuration
      // Total time: images.length * slideInDuration
      const totalTime = images.length * slideInDuration;

      // This image starts at: imageIndex * slideInDuration
      const imageStartTime = imageIndex * slideInDuration;

      // Duration = totalTime - imageStartTime
      return totalTime - imageStartTime;
    }

    // Otherwise, calculate from effects
    let maxEffectDuration = 0;

    effects.forEach(effect => {
      // Skip fastcut and stack effects as they don't determine image duration
      if (effect.type === 'fastcut' || effect.type === 'stack') return;

      const timeRange = parseTimeRange(effect.range || '');
      const effectStart = timeRange
        ? timeRange.start
        : effect.start || 0;
      const effectDuration = timeRange
        ? timeRange.end - timeRange.start
        : effect.duration || 0;

      // For effects with explicit duration
      if (effectDuration > 0) {
        const effectEnd = effectStart + effectDuration;
        maxEffectDuration = Math.max(maxEffectDuration, effectEnd);
      } else {
        // Default effect durations based on type
        switch (effect.type) {
          case 'pan':
          case 'zoom':
            maxEffectDuration = Math.max(maxEffectDuration, effectStart + 3);
            break;
          case 'shake':
            maxEffectDuration = Math.max(maxEffectDuration, effectStart + 2);
            break;
          case 'generic':
            maxEffectDuration = Math.max(maxEffectDuration, effectStart + 2);
            break;
        }
      }
    });

    // If no effects or effects have no duration, use default of 3 seconds
    return maxEffectDuration > 0 ? maxEffectDuration : 3;
  };

  // Calculate transition timings
  const transitionTimings: { start: number; end: number; duration: number }[] =
    [];
  let cumulativeTime = 0;

  if (hasStackEffect) {
    // For stack effect, images start at intervals (not cumulative)
    const slideInDuration = stackEffect?.stack?.slideInDuration ?? 0.5;
    images.forEach((image, index) => {
      const startTime = index * slideInDuration;
      const imageDuration = calculateImageDuration(image, index);
      transitionTimings.push({
        start: startTime,
        end: startTime + imageDuration,
        duration: imageDuration,
      });
      // Track cumulative time for total duration
      cumulativeTime = Math.max(cumulativeTime, startTime + imageDuration);
    });
  } else {
    // For normal effects, use cumulative timing
    images.forEach((image, index) => {
      const imageDuration = calculateImageDuration(image, index);
      transitionTimings.push({
        start: cumulativeTime,
        end: cumulativeTime + imageDuration,
        duration: imageDuration,
      });
      cumulativeTime += imageDuration;
    });
  }

  // Create image components with effects
  const imageComponents = images.map((image, imageIndex) => {
    // For stack effect, handle layout differently
    if (hasStackEffect) {
      const directionSetting = stackEffect?.stack?.direction ?? 'auto';
      const slideInDuration = stackEffect?.stack?.slideInDuration ?? 0.5;
      const arrangementSetting = stackEffect?.stack?.arrangement ?? 'dynamic';
      const gap = stackEffect?.stack?.gap ?? 0;
      const maintainAspectRatio =
        stackEffect?.stack?.maintainAspectRatio ?? false;

      // Determine arrangement based on video orientation if 'auto'
      let arrangement = arrangementSetting;
      if (arrangementSetting === 'auto') {
        // For portrait videos (vertical), stack horizontally
        // For landscape videos (horizontal), stack vertically
        arrangement = isVertical ? 'horizontal' : 'vertical';
      }

      // Determine slide direction based on arrangement if 'auto'
      let direction = directionSetting;
      if (directionSetting === 'auto') {
        // For dynamic/vertical stacking, slide from bottom
        // For horizontal stacking, slide from right
        if (arrangement === 'horizontal') {
          direction = 'right';
        } else {
          direction = 'bottom';
        }
      }

      // Calculate position and size based on arrangement and number of visible images
      const totalImages = images.length;
      let positionStyles: any = {};
      let sizeStyles: any = {};

      // For dynamic arrangement, calculate smart layout
      // We need to create animations for each layout change as images are added
      let dynamicEffects: any[] = [];
      let useDynamicResize = false;

      if (arrangement === 'dynamic') {
        useDynamicResize = true;

        // For the first image, start full screen
        // For subsequent images, they'll slide in to their position
        let initialLayout;
        if (imageIndex === 0) {
          // First image always starts full screen
          initialLayout = {
            top: '0%',
            left: '0%',
            width: '100%',
            height: '100%',
          };
        } else {
          // For non-first images, start at their target position
          // They will be invisible (opacity 0) and slide-in will handle the animation
          const numImagesAtArrival = imageIndex + 1;
          initialLayout = calculateDynamicLayout(
            numImagesAtArrival,
            imageIndex,
            gap,
          );
        }

        positionStyles = {
          top: initialLayout.top,
          left: initialLayout.left,
        };
        sizeStyles = {
          width: initialLayout.width,
          height: initialLayout.height,
        };

        // Create resize animations for when new images are added after this one
        for (
          let futureImageIndex = imageIndex + 1;
          futureImageIndex < totalImages;
          futureImageIndex++
        ) {
          const numVisibleImages = futureImageIndex + 1;
          const prevNumVisibleImages = futureImageIndex;

          // Calculate current and new layouts
          const currentLayout = calculateDynamicLayout(
            prevNumVisibleImages,
            imageIndex,
            gap,
          );
          const newLayout = calculateDynamicLayout(
            numVisibleImages,
            imageIndex,
            gap,
          );

          const transitionTime =
            transitionTimings[futureImageIndex]?.start || 0;
          const relativeStart =
            transitionTime - (transitionTimings[imageIndex]?.start || 0);

          // Add resize/reposition animation with proper from->to values
          dynamicEffects.push({
            id: `dynamic-resize-${imageIndex}-to-${numVisibleImages}`,
            componentId: 'generic',
            data: {
              mode: 'provider',
              targetIds: [
                `${params.trackName ?? 'imageloop-sound'}-image-${imageIndex}`,
              ],
              type: 'ease-out',
              ranges: [
                { key: 'top', val: currentLayout.top, prog: 0 },
                { key: 'top', val: newLayout.top, prog: 1 },
                { key: 'left', val: currentLayout.left, prog: 0 },
                { key: 'left', val: newLayout.left, prog: 1 },
                { key: 'width', val: currentLayout.width, prog: 0 },
                { key: 'width', val: newLayout.width, prog: 1 },
                { key: 'height', val: currentLayout.height, prog: 0 },
                { key: 'height', val: newLayout.height, prog: 1 },
              ],
              duration: slideInDuration * 0.8, // Slightly shorter than slide-in
              start: relativeStart,
            } as GenericEffectData,
          });
        }
      }
      // Calculate which position this image should be in based on arrangement
      else if (arrangement === 'vertical') {
        const heightPerImage = 100 / totalImages;
        const topPosition = imageIndex * heightPerImage;
        positionStyles = {
          top: `${topPosition}%`,
          left: '0%',
        };
        sizeStyles = {
          height: `calc(${heightPerImage}% - ${gap}px)`,
          width: '100%',
        };
      } else if (arrangement === 'horizontal') {
        const widthPerImage = 100 / totalImages;
        const leftPosition = imageIndex * widthPerImage;
        positionStyles = {
          left: `${leftPosition}%`,
          top: '0%',
        };
        sizeStyles = {
          width: `calc(${widthPerImage}% - ${gap}px)`,
          height: '100%',
        };
      } else if (arrangement === 'grid') {
        // Auto grid layout
        const cols = Math.ceil(Math.sqrt(totalImages));
        const rows = Math.ceil(totalImages / cols);
        const col = imageIndex % cols;
        const row = Math.floor(imageIndex / cols);
        const widthPerImage = 100 / cols;
        const heightPerImage = 100 / rows;

        positionStyles = {
          left: `${col * widthPerImage}%`,
          top: `${row * heightPerImage}%`,
        };
        sizeStyles = {
          width: `calc(${widthPerImage}% - ${gap}px)`,
          height: `calc(${heightPerImage}% - ${gap}px)`,
        };
      }

      // Calculate slide-in animation based on direction
      // For dynamic arrangement, we need to animate the actual position properties
      const slideInEffect: GenericEffectData = {
        mode: 'provider',
        targetIds: [
          `${params.trackName ?? 'imageloop-sound'}-image-${imageIndex}`,
        ],
        type: 'ease-out',
        ranges: [],
        duration: slideInDuration,
        start: 0,
      };

      // Set initial position for slide-in animation
      // Use a large enough transform to ensure image starts off-screen
      // Transform is relative to element size, so 150% should work for most layouts
      const transformDistance = '150%';

      // Use transform for slide, so position stays correct
      switch (direction) {
        case 'bottom':
          slideInEffect.ranges = [
            {
              key: 'transform',
              val: `translateY(${transformDistance})`,
              prog: 0,
            },
            { key: 'transform', val: 'translateY(0%)', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.4 },
          ];
          break;
        case 'top':
          slideInEffect.ranges = [
            {
              key: 'transform',
              val: `translateY(-${transformDistance})`,
              prog: 0,
            },
            { key: 'transform', val: 'translateY(0%)', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.4 },
          ];
          break;
        case 'left':
          slideInEffect.ranges = [
            {
              key: 'transform',
              val: `translateX(-${transformDistance})`,
              prog: 0,
            },
            { key: 'transform', val: 'translateX(0%)', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.4 },
          ];
          break;
        case 'right':
          slideInEffect.ranges = [
            {
              key: 'transform',
              val: `translateX(${transformDistance})`,
              prog: 0,
            },
            { key: 'transform', val: 'translateX(0%)', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.4 },
          ];
          break;
      }

      // Get the calculated duration for this image
      const effectiveImageDuration =
        transitionTimings[imageIndex]?.duration || 0.5;
      const startTime = transitionTimings[imageIndex]?.start || 0;

      // For stack effect, calculate total video duration
      const totalDuration =
        hasStackEffect && images.length > 0
          ? images.length * slideInDuration + 2 // Add 2 seconds to see final result
          : cumulativeTime;

      return {
        id: `${params.trackName ?? 'imageloop-sound'}-image-${imageIndex}`,
        componentId: 'ImageAtom',
        type: 'atom' as const,
        data: {
          src: image.src,
          className: 'absolute',
          fit: maintainAspectRatio ? 'contain' : image.fit || 'cover',
          style: {
            ...positionStyles,
            ...sizeStyles,
            zIndex: imageIndex + 1, // Layer images in order
            ...(image.filter && image.filter !== 'none'
              ? { filter: generateFilterStyle(image.filter) }
              : {}),
            ...(image.blendMode && image.blendMode !== 'normal'
              ? { mixBlendMode: image.blendMode }
              : {}),
            ...(image.opacity !== undefined ? { opacity: image.opacity } : {}),
            // Set initial transform for images that will slide in
            ...(useDynamicResize && imageIndex > 0
              ? {
                  transform:
                    direction === 'bottom'
                      ? 'translateY(150%)'
                      : direction === 'top'
                        ? 'translateY(-150%)'
                        : direction === 'left'
                          ? 'translateX(-150%)'
                          : 'translateX(150%)',
                  opacity: 0,
                }
              : {}),
          },
        },
        context: {
          timing: {
            start: startTime,
            // Stack images stay visible until the end
            duration: totalDuration - startTime,
          },
        },
        effects: [
          // Slide-in effect for non-first images
          ...(imageIndex > 0
            ? [
                {
                  id: `stack-slide-${imageIndex}`,
                  componentId: 'generic',
                  data: slideInEffect,
                },
              ]
            : []),
          // Dynamic resize effects when future images arrive
          ...dynamicEffects,
        ],
      };
    }

    // Convert effects to the format expected by the system
    // Filter out fastcut and stack effects as they'll be handled separately
    const imageEffects = effects
      .filter(effect => effect.type !== 'fastcut' && effect.type !== 'stack')
      .map((effect, effectIndex) => {
        const effectId =
          effect.id ||
          `${params.trackName ?? 'imageloop-sound'}-${effect.type}-${imageIndex}-${effectIndex}`;

        switch (effect.type) {
          case 'pan':
            return {
              id: effectId,
              componentId: 'pan',
              data: {
                panDirection: effect.pan?.direction || 'up',
                panDistance: effect.pan?.distance || 200,
                loopTimes: effect.pan?.loopTimes || 1,
              } as PanEffectData,
            };

          case 'zoom':
            return {
              id: effectId,
              componentId: 'zoom',
              data: {
                zoomDirection: effect.zoom?.direction || 'in',
                zoomDepth: effect.zoom?.depth || 1.2,
                loopTimes: effect.zoom?.loopTimes || 1,
              } as ZoomEffectData,
            };

          case 'generic':
            return {
              id: effectId,
              componentId: 'generic',
              data: {
                mode: 'provider',
                targetIds: [`image-${imageIndex}`],
                type: effect.generic?.animationType || 'ease-in-out',
                ranges:
                  effect.generic?.animationRanges?.map(range => ({
                    key: range.key,
                    val: isNaN(Number(range.val))
                      ? range.val
                      : Number(range.val),
                    prog: range.prog,
                  })) || [],
                duration: effect.duration || 2,
                start: effect.start || 0,
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
                duration: effect.duration || 2,
                start: effect.start || 0,
              },
            };

          default:
            return {
              id: effectId,
              componentId: 'pan',
              data: {
                panDirection: 'up',
                panDistance: 200,
                loopTimes: 1,
              } as PanEffectData,
            };
        }
      });

    const isPanEffect = imageEffects.some(
      effect => effect.componentId === 'pan',
    );
    const _panEffectData = imageEffects.find(
      effect => effect.componentId === 'pan',
    )?.data as PanEffectData;

    // Get the calculated duration for this image
    const effectiveImageDuration = transitionTimings[imageIndex]?.duration || 3;

    return {
      id: `${params.trackName ?? 'imageloop-sound'}-image-${imageIndex}`,
      componentId: 'ImageAtom',
      type: 'atom' as const,
      data: {
        src: image.src,
        className: isPanEffect
          ? isVertical
            ? 'w-full h-auto object-cover'
            : `w-full  object-cover`
          : 'w-full h-full object-cover',
        fit: image.fit || 'cover',
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
        },
      },
      context: {
        timing: (() => {
          const imageRange = parseTimeRange(image.rangeString || '');
          return imageRange
            ? { start: imageRange.start, duration: effectiveImageDuration }
            : { duration: effectiveImageDuration };
        })(),
      },
      effects: imageEffects,
    };
  });

  // Create fast cut transition components from effects
  const fastCutComponents: any[] = [];

  // Find all fastcut effects
  const fastcutEffects = effects.filter(effect => effect.type === 'fastcut');

  if (fastcutEffects.length > 0 && images.length > 1) {
    fastcutEffects.forEach((fastcutEffect, effectIdx) => {
      const numberOfCuts = fastcutEffect.fastcut?.numberOfCuts ?? 5;
      const cutDuration = fastcutEffect.fastcut?.cutDuration ?? 0.08;
      const imageSelection = fastcutEffect.fastcut?.imageSelection ?? 'random';
      const applyAt = fastcutEffect.fastcut?.applyAt ?? 'end';
      const fadeEffect = fastcutEffect.fastcut?.fadeEffect ?? false;

      // Determine which transitions to apply fast cuts to
      const numTransitions = images.length - 1;

      for (let i = 0; i < numTransitions; i++) {
        const transitionTiming = transitionTimings[i];

        // Calculate timings based on applyAt setting
        const timingsToProcess: Array<{ time: number; position: string }> = [];

        if (applyAt === 'start' || applyAt === 'both') {
          // Fast cut at the start of the next image
          timingsToProcess.push({
            time: transitionTiming.end,
            position: `start-${i}`,
          });
        }

        if (applyAt === 'end' || applyAt === 'both') {
          // Fast cut at the end of the current image
          timingsToProcess.push({
            time: transitionTiming.end - numberOfCuts * cutDuration,
            position: `end-${i}`,
          });
        }

        timingsToProcess.forEach(({ time, position }) => {
          // Select images for fast cuts based on selection mode
          let cutImageIndices: number[] = [];

          switch (imageSelection) {
            case 'all':
              // Use all images in sequence, repeat if needed
              cutImageIndices = Array.from(
                { length: numberOfCuts },
                (_, idx) => idx % images.length,
              );
              break;

            case 'sequential':
              // Start from current image, go through sequentially
              cutImageIndices = Array.from(
                { length: numberOfCuts },
                (_, idx) => (i + idx) % images.length,
              );
              break;

            case 'random':
            default:
              // Pick random images
              cutImageIndices = Array.from({ length: numberOfCuts }, () =>
                Math.floor(Math.random() * images.length),
              );
              break;
          }

          // Create fast cut image components
          cutImageIndices.forEach((imageIdx, cutIdx) => {
            const cutStartTime = time + cutIdx * cutDuration;
            const image = images[imageIdx];

            fastCutComponents.push({
              id: `${params.trackName ?? 'imageloop-sound'}-fastcut-${effectIdx}-${position}-${cutIdx}`,
              componentId: 'ImageAtom',
              type: 'atom' as const,
              data: {
                src: image.src,
                className: 'w-full h-full object-cover',
                fit: image.fit || 'cover',
                style: {
                  ...(image.filter && image.filter !== 'none'
                    ? { filter: generateFilterStyle(image.filter) }
                    : {}),
                  ...(image.blendMode && image.blendMode !== 'normal'
                    ? { mixBlendMode: image.blendMode }
                    : {}),
                  ...(image.opacity !== undefined
                    ? { opacity: image.opacity }
                    : {}),
                  zIndex: 100, // Ensure fast cuts appear on top
                },
              },
              context: {
                timing: {
                  start: Math.max(0, cutStartTime),
                  duration: cutDuration,
                },
              },
              effects: fadeEffect
                ? [
                    {
                      id: `fastcut-fade-${effectIdx}-${position}-${cutIdx}`,
                      componentId: 'generic',
                      data: {
                        mode: 'provider',
                        targetIds: [
                          `${params.trackName ?? 'imageloop-sound'}-fastcut-${effectIdx}-${position}-${cutIdx}`,
                        ],
                        type: 'linear',
                        ranges: [
                          { key: 'opacity', val: 0, prog: 0 },
                          { key: 'opacity', val: 1, prog: 0.3 },
                          { key: 'opacity', val: 1, prog: 0.7 },
                          { key: 'opacity', val: 0, prog: 1 },
                        ],
                        duration: cutDuration,
                        start: 0,
                      } as GenericEffectData,
                    },
                  ]
                : [],
            });
          });
        });
      }
    });
  }

  // Create sound effect components for transitions (if enabled)
  const soundEffectComponents: any[] = [];

  if (transitionSounds?.enabled && transitionSounds.sounds.length > 0) {
    // We create sound for each transition (between images)
    // Number of transitions = number of images - 1 (between each pair)
    const numTransitions = images.length - 1;

    for (let i = 0; i < numTransitions; i++) {
      const transitionTiming = transitionTimings[i];
      let soundSrc = '';

      // Select sound based on selection mode
      switch (transitionSounds.selectionMode) {
        case 'sequential':
          soundSrc =
            transitionSounds.sounds[i % transitionSounds.sounds.length];
          break;
        case 'random':
          soundSrc =
            transitionSounds.sounds[
              Math.floor(Math.random() * transitionSounds.sounds.length)
            ];
          break;
        case 'single':
        default:
          soundSrc = transitionSounds.sounds[0];
          break;
      }

      // Calculate when to play the sound based on timing setting
      let soundStartTime = 0;
      const offset = transitionSounds.offset ?? -0.2;

      switch (transitionSounds.timing) {
        case 'start':
          // Play at the start of the next image
          soundStartTime = transitionTiming.end + offset;
          break;
        case 'end':
          // Play before the current image ends (default)
          soundStartTime = transitionTiming.end + offset;
          break;
        case 'overlap':
          // Play centered on the transition
          soundStartTime =
            transitionTiming.end - (transitionSounds.duration ?? 0.5) / 2;
          break;
        default:
          soundStartTime = transitionTiming.end + offset;
      }

      soundEffectComponents.push({
        id: `${params.trackName ?? 'imageloop-sound'}-transition-sound-${i}`,
        componentId: 'AudioAtom',
        type: 'atom' as const,
        data: {
          src: soundSrc,
          volume: transitionSounds.volume ?? 0.8,
          startFrom: 0,
        } as AudioAtomDataProps,
        context: {
          timing: {
            start: Math.max(0, soundStartTime), // Ensure non-negative
            duration: transitionSounds.duration ?? 0.5,
          },
        },
      });
    }
  }

  // Combine image components with fast cuts and sound effects
  const allComponents = [
    ...imageComponents,
    ...fastCutComponents,
    ...soundEffectComponents,
  ];

  return {
    output: {
      childrenData: [
        {
          id: `${params.trackName}`,
          componentId: 'BaseLayout',
          type: params.trackFitDurationTo ? 'layout' : ('scene' as const),
          data: {
            containerProps: {
              className: hasStackEffect
                ? 'absolute inset-0 overflow-hidden'
                : 'absolute inset-0',
            },
          },
          context: {
            timing: params.trackFitDurationTo
              ? {
                  start: params.trackStartOffset ?? 0,
                  fitDurationTo: params.trackFitDurationTo ?? 'this',
                }
              : params.trackStartOffset
                ? {
                    start: params.trackStartOffset,
                  }
                : {},
          },
          childrenData: allComponents,
        },
      ],
    },
    options: {
      attachedToId: `BaseScene`,
      attachedContainers: [
        {
          className: 'absolute inset-0',
        },
      ],
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'imageloop-sound',
  title: 'Image Loop with Sound, Fast Cut & Stack Effects',
  description:
    'Apply pan, zoom, generic effects to images with transition sound effects, fast cut transitions, and stack effects where images accumulate on screen',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'image',
    'effects',
    'visual',
    'animation',
    'sound',
    'audio',
    'transition',
    'fast-cut',
    'stack',
    'slideshow',
  ],
  defaultInputParams: {
    trackName: 'imageloop-sound-track',
    trackStartOffset: 0,
    images: {
      items: [
        {
          src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
          fit: 'cover',
          filter: 'none',
          blendMode: 'normal',
          opacity: 1,
        },
        {
          src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600&fit=crop',
          fit: 'cover',
          filter: 'none',
          blendMode: 'normal',
          opacity: 1,
        },
        {
          src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop',
          fit: 'cover',
          filter: 'none',
          blendMode: 'normal',
          opacity: 1,
        },
      ],
    },
    effects: [
      {
        type: 'zoom',
        duration: 3,
        zoom: {
          direction: 'in',
          depth: 1.3,
          loopTimes: 1,
        },
      },
      {
        type: 'fastcut',
        fastcut: {
          cutDuration: 0.08,
          numberOfCuts: 5,
          imageSelection: 'random',
          applyAt: 'end',
          fadeEffect: false,
        },
      },
    ],
    transitionSounds: {
      enabled: true,
      sounds: [
        'https://cdn.pixabay.com/download/audio/2022/03/10/audio_d1718ab41b.mp3?filename=whoosh-6316.mp3',
      ],
      volume: 0.7,
      timing: 'end',
      offset: -0.2,
      duration: 0.5,
      selectionMode: 'single',
    },
  },
};

const presetFunction = presetExecution.toString();
const presetParamsSchema = z.toJSONSchema(presetParams);

const imageLoopSoundPreset = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

export { imageLoopSoundPreset };
