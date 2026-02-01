/**
 * Video Stitch Preset
 *
 * This preset stitches multiple video clips together with customizable transitions and effects.
 * It creates seamless video sequences with fade, slide, scale, zoom, spin, blur, and shake transitions.
 *
 * Features:
 * - **Multiple Transition Types**: Fade, slide, scale, zoom, spin, blur, shake effects
 * - **Transition Timing**: Configurable start and end transition durations and intensities
 * - **Video Controls**: Fit modes, start times, durations, and custom styling
 * - **Flexible Sequencing**: Automatic or manual clip ordering
 * - **Rich Effects**: Custom transition intensities and durations
 *
 * Use cases:
 * - Creating video montages with smooth transitions
 * - Building video sequences from multiple clips
 * - Creating professional video compilations
 * - Adding cinematic transitions between clips
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { BaseEffect, RenderableComponentData } from '@microfox/datamotion';
import { InputCompositionProps, GenericEffectData } from '@microfox/remotion';

interface ShakeEffectData extends GenericEffectData {
  amplitude?: number;
  frequency?: number;
  decay?: boolean;
  axis?: 'x' | 'y' | 'both';
}

const videoItemSchema = z.object({
  src: z.string(),
  fit: z.enum(['cover', 'contain', 'fill', 'none', 'scale-down']).optional(),
  start: z.number().optional(),
  duration: z.number().optional(),
  style: z.any().optional(),
  transition: z
    .object({
      start: z
        .object({
          type: z
            .enum([
              'none',
              'opacity',
              'slide-in-right',
              'slide-in-left',
              'slide-in-top',
              'slide-in-bottom',
              'scale-in',
              'zoom-in',
              'spin-in',
              'blur-in',
              'shake-in',
            ])
            .optional(),
          duration: z.number().optional(),
          intensity: z.number().min(0).optional(),
        })
        .optional(),
      end: z
        .object({
          type: z
            .enum([
              'none',
              'opacity',
              'slide-out-right',
              'slide-out-left',
              'slide-out-top',
              'slide-out-bottom',
              'scale-out',
              'zoom-out',
              'spin-out',
              'blur-out',
              'shake-out',
            ])
            .optional(),
          duration: z.number().optional(),
          intensity: z.number().min(0).optional(),
        })
        .optional(),
    })
    .optional(),
});

const presetParams = z.object({
  width: z.number().describe('Width of the video').default(1920),
  aspectRatio: z
    .string()
    .describe("Aspect ratio for the video (e.g., '16:9', '9:16', '1:1')"),
  videoUrls: z
    .array(z.string())
    .optional()
    .describe(
      'Array of video URLs to stitch together in sequence (no transitions)',
    ),
  videoItems: z.array(videoItemSchema).optional(),
  position: z
    .string()
    .describe('top/bottom/left/right/25% 75%/top 0 right 10px'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // Parse aspect ratio
  const [widthRatio, heightRatio] = params.aspectRatio.split(':').map(Number);
  const aspectRatio = widthRatio / heightRatio;

  // Calculate dimensions based on aspect ratio (using 1920 as base width)
  const baseWidth = aspectRatio > 1 ? 1920 : 1080;
  const baseHeight = Math.round(baseWidth / aspectRatio);

  const createTransitionEffects = (
    videoItem: z.infer<typeof videoItemSchema>,
    videoId: string,
    isFadeIn: boolean,
  ): BaseEffect[] => {
    const effects: (GenericEffectData | ShakeEffectData)[] = [];
    const { transition } = videoItem;

    const transitionProps = isFadeIn ? transition?.start : transition?.end;

    if (
      !transitionProps ||
      !transitionProps.type ||
      transitionProps.type === 'none'
    ) {
      return [];
    }

    const {
      type: transitionType,
      duration: effectDuration,
      intensity: itemIntensity,
    } = transitionProps;

    const videoDuration = videoItem.duration;

    if (!isFadeIn && !videoDuration) {
      return [];
    }

    const transitionDuration = effectDuration || 1.0;
    const totalDuration = videoDuration || 5;

    const startTime = isFadeIn
      ? 0
      : Math.max(0, totalDuration - transitionDuration);

    let finalIntensity: number;
    if (isFadeIn) {
      finalIntensity = itemIntensity ?? 1.0;
    } else {
      finalIntensity = itemIntensity ?? 1.0;
    }

    // For opacity, intensity is capped at 1 to calculate the minimum
    const opacityIntensity = Math.min(finalIntensity, 1.0);
    const minOpacity = 1 - opacityIntensity;

    const isSlide = transitionType.includes('slide');
    const isScale = transitionType.includes('scale');
    const isZoom = transitionType.includes('zoom');
    const isSpin = transitionType.includes('spin');
    const isBlur = transitionType.includes('blur');
    const isShake = transitionType.includes('shake');

    // Add opacity fade for 'opacity' and 'slide' transitions
    if (transitionType === 'opacity' || isSlide) {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [videoId],
        type: 'ease-in-out',
        ranges: [
          { key: 'opacity', val: isFadeIn ? minOpacity : 1, prog: 0 },
          { key: 'opacity', val: isFadeIn ? 1 : minOpacity, prog: 1 },
        ],
      });
    }

    // Handle specific transition types
    if (isSlide) {
      const direction = transitionType.split('-')[2];
      const axis = direction === 'top' || direction === 'bottom' ? 'Y' : 'X';
      const key = `translate${axis}`;
      const multiplier = direction === 'left' || direction === 'top' ? -1 : 1;
      const distance = finalIntensity * 100;

      const startVal = isFadeIn ? `${distance * multiplier}px` : '0px';
      const endVal = isFadeIn ? '0px' : `${distance * multiplier}px`;

      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [videoId],
        type: isFadeIn ? 'ease-out' : 'ease-in',
        ranges: [
          { key, val: startVal, prog: 0 },
          { key, val: endVal, prog: 1 },
        ],
      });
    } else if (isScale) {
      const scaleFactor = (1 - finalIntensity) / 2;
      const startScale = isFadeIn ? 1 + scaleFactor : 1;
      const endScale = isFadeIn ? 1 : 1 - scaleFactor;

      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [videoId],
        type: isFadeIn ? 'ease-out' : 'ease-in',
        ranges: [
          { key: 'scale', val: startScale, prog: 0 },
          { key: 'scale', val: endScale, prog: 1 },
        ],
      });
    } else if (isZoom) {
      const scaleFactor = finalIntensity / 2;
      const startScale = isFadeIn ? 1 + scaleFactor : 1;
      const endScale = isFadeIn ? 1 : 1 + scaleFactor;

      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [videoId],
        type: isFadeIn ? 'ease-out' : 'ease-in',
        ranges: [
          { key: 'scale', val: startScale, prog: 0 },
          { key: 'scale', val: endScale, prog: 1 },
        ],
      });
    } else if (isSpin) {
      const rotation = finalIntensity * 90;
      const startRotation = isFadeIn ? `${-rotation}deg` : '0deg';
      const endRotation = isFadeIn ? '0deg' : `${rotation}deg`;
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [videoId],
        type: isFadeIn ? 'ease-out' : 'ease-in',
        ranges: [
          { key: 'rotate', val: startRotation, prog: 0 },
          { key: 'rotate', val: endRotation, prog: 1 },
        ],
      });
    } else if (isBlur) {
      const blurAmount = finalIntensity * 10;
      const startBlur = isFadeIn ? `${blurAmount}px` : '0px';
      const endBlur = isFadeIn ? '0px' : `${blurAmount}px`;
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [videoId],
        type: isFadeIn ? 'ease-out' : 'ease-in',
        ranges: [
          { key: 'blur', val: startBlur, prog: 0 },
          { key: 'blur', val: endBlur, prog: 1 },
        ],
      });
    } else if (isShake) {
      if (isFadeIn) {
        effects.push({
          start: startTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [videoId],
          type: 'linear',
          amplitude: finalIntensity * 3,
          frequency: 1,
          decay: true,
          axis: 'both',
        } as ShakeEffectData);
        effects.push({
          start: startTime,
          duration: 0.5,
          mode: 'provider',
          targetIds: [videoId],
          type: 'ease-in-out',
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        });
      } else {
        effects.push({
          start: startTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [videoId],
          type: 'linear',
          amplitude: finalIntensity * 10,
          frequency: 1,
          decay: false,
          axis: 'both',
        } as ShakeEffectData);
        effects.push({
          start: startTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [videoId],
          type: 'ease-in-out',
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1 - Math.min(finalIntensity, 1), prog: 1 },
          ],
        });
      }
    }

    return effects.map(effect => {
      const isShakeEffect = 'amplitude' in effect;
      return {
        id: `${videoId}-transition-${isFadeIn ? 'in' : 'out'}-${transitionType}`,
        componentId: isShakeEffect ? 'shake' : 'generic',
        data: effect,
      };
    });
  };

  let scenes: RenderableComponentData[] = [];
  let cumulativeDuration = 0;

  if (params.videoItems && params.videoItems.length > 0) {
    scenes = [];
    for (const [index, videoItem] of params.videoItems.entries()) {
      let duration: number;
      if (videoItem.duration !== undefined) {
        duration = videoItem.duration;
      } else {
        const getMediaDuration = props.helpers?.getMediaDuration;
        const computed =
          typeof getMediaDuration === 'function'
            ? await getMediaDuration(videoItem.src)
            : undefined;
        duration = computed ?? 5;
      }

      const videoId = `video-item-${index}`; // Use index for a clean, unique ID
      const videoStart = videoItem.start ?? cumulativeDuration;

      console.log(
        `Processing video: ${videoId}`,
        `start: ${videoStart}`,
        `duration: ${duration}`,
      );

      const itemWithDuration = { ...videoItem, duration };

      const effects: BaseEffect[] = [
        ...createTransitionEffects(itemWithDuration, videoId, true),
        ...createTransitionEffects(itemWithDuration, videoId, false),
      ];

      const videoAtom: RenderableComponentData = {
        id: videoId,
        componentId: 'VideoAtom',
        type: 'atom' as const,
        data: {
          src: videoItem.src,
          className: 'w-full h-full object-cover',
          style: {
            objectPosition: params.position,
            ...videoItem.style,
          },
          fit: videoItem.fit ?? ('cover' as const),
          start: videoStart,
          duration: duration,
        },
        effects,
      };
      scenes.push(videoAtom);
      cumulativeDuration += duration;
    }
  } else if (params.videoUrls && params.videoUrls.length > 0) {
    scenes = [];
    for (const [index, url] of params.videoUrls.entries()) {
      const videoAtom: RenderableComponentData = {
        id: `video-${index}`,
        componentId: 'VideoAtom',
        type: 'atom' as const,
        data: {
          src: url,
          className: 'w-full h-auto object-cover bg-black',
          style: {
            objectPosition: params.position,
          },
          fit: 'cover' as const,
        },
      };

      scenes.push(videoAtom);
    }
  }

  return {
    output: {
      config: {
        width: baseWidth,
        height: baseHeight,
        fps: 30,
        duration: cumulativeDuration || 20,
        fitDurationTo: params?.videoItems ? undefined : 'video-scene', // Let the calculated duration take precedence
      },
      childrenData: [
        {
          id: `video-scene`,
          componentId: 'BaseLayout',
          type: 'scene' as const,
          data: {},
          context: {},
          childrenData: scenes ?? [],
        },
      ],
    },
  };
};

const videoStitchPresetMetadata: PresetMetadata = {
  id: 'video-stitch-sequence',
  title: 'Video Stitch Sequence',
  description:
    'Stitches multiple videos together in sequence with customizable aspect ratio and transitions',
  type: 'predefined',
  presetType: 'full',
  tags: ['video', 'stitch', 'sequence', 'aspect-ratio', 'transition'],
  dependencies: { helpers: ['getMediaDuration'] },
  defaultInputParams: {
    aspectRatio: '16:9',
    videoItems: [
      {
        src: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        transition: {
          start: {
            type: 'slide-in-left',
            duration: 1,
          },
          end: {
            type: 'zoom-out',
            duration: 1.5,
            intensity: 0.7, // A 70% intensity zoom-out
          },
        },
      },
      {
        src: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        duration: 8,
        transition: {
          start: {
            type: 'blur-in',
            duration: 1.5,
            // This will inherit the 0.7 intensity from the previous clip
          },
          end: {
            type: 'spin-out',
            duration: 1,
            // This will use the default intensity of 1.0
          },
        },
      },
    ],
  },
};

const videoStitchPresetFunction = presetExecution.toString();
const videoStitchPresetParams = z.toJSONSchema(presetParams);

export const videoStitchPreset = {
  metadata: videoStitchPresetMetadata,
  presetFunction: videoStitchPresetFunction,
  presetParams: videoStitchPresetParams,
};
