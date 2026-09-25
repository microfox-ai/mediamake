/**
 * Media Track Preset
 *
 * This preset creates a flexible media track system that can sequence, align, or randomly place
 * multiple media items (videos, images, or audio) in a composition. It supports:
 *
 * - **Sequence Mode**: Plays media items one after another in order
 * - **Aligned Mode**: Aligns all media items to a specific duration or reference
 * - **Random Mode**: Randomly places media items within a specified duration
 *
 * Features:
 * - Time range selection: Specify exact time ranges (e.g., "0:10-2:30") for each media item
 * - Rich transitions: Fade in/out, slide, scale, shake, and blur effects
 * - Media controls: Volume, playback rate, looping, muting, opacity, blend modes
 * - Flexible fitting: Cover, contain, fill, none, or scale-down options
 * - Multiple media types: Supports video, image, and audio atoms
 *
 * Use cases:
 * - Creating video montages with multiple clips
 * - Building dynamic media sequences with transitions
 * - Creating B-roll tracks that sync with other content
 * - Layering multiple media sources with different timings
 */

import {
  AudioAtomDataProps,
  InputCompositionProps,
  VideoAtomDataProps,
} from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { paramMetaTypes } from '../../dataTypes';

// Extended effect data type for shake effects
interface ShakeEffectData extends GenericEffectData {
  amplitude?: number;
  frequency?: number;
  decay?: boolean;
  axis?: 'x' | 'y' | 'both';
}

const mediaTrackItemSchema = z.object({
  src: z.string().describe('Media source URL'),
  type: z.enum(['video', 'image', 'audio']).optional(),
  fit: z
    .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: true })
    .describe('How the media should fit (default: cover)'),
  startCropVideo: z
    .number()
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: false })
    .describe('Trim start offset in seconds'),
  rangeString: z
    .string()
    .optional()
    .meta({
      [paramMetaTypes.rangeField]: true,
      [paramMetaTypes.groupEditable]: false,
    })
    .describe(
      'Appearance range(s) MM:SS-MM:SS (comma-separated for multiple, e.g. 0:10-2:30,6:00-8:30)',
    ),
  duration: z.number().optional().describe('Fixed duration in seconds'),
  loop: z
    .boolean()
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: true })
    .describe('Loop media'),
  blendMode: z
    .enum([
      'screen',
      'multiply',
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
    .describe('Blend mode'),
  mute: z
    .boolean()
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: true })
    .describe('Mute audio'),
  playbackRate: z
    .number()
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: true })
    .describe('Playback rate'),
  volume: z
    .number()
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: true })
    .describe('Volume 0–1'),
  fitDurationTo: z.string().optional().describe('Fit duration to another track id'),
  opacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: true })
    .describe('Opacity 0–1'),
  fadeInTransition: z
    .enum([
      'none',
      'opacity',
      'slide-in-right',
      'slide-in-left',
      'slide-in-top',
      'slide-in-bottom',
      'scale-in',
      'scale-out',
      'shake-in',
      'blur-in',
    ])
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: true })
    .describe('Fade-in transition'),
  fadeInDuration: z
    .number()
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: true })
    .describe('Fade-in duration in seconds'),
  fadeOutTransition: z
    .enum([
      'none',
      'opacity',
      'slide-out-right',
      'slide-out-left',
      'slide-out-top',
      'slide-out-bottom',
      'scale-out',
      'shake-out',
      'blur-out',
    ])
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: true })
    .describe('Fade-out transition'),
  fadeOutDuration: z
    .number()
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: true })
    .describe('Fade-out duration in seconds'),
});

type MediaTrackItem = z.infer<typeof mediaTrackItemSchema>;

const presetParams = z.object({
  mediaItems: z
    .object({
      mediaRef: z
        .string()
        .optional()
        .describe(
          'Linked medias reference key — srcs are read/written from this ref',
        ),
      items: z
        .array(mediaTrackItemSchema)
        .describe('Per-media local props (fit, range, transitions, etc.)'),
    })
    .meta({
      [paramMetaTypes.nestedRangeField]: 'items[].rangeString',
      [paramMetaTypes.imagesGroup]: true,
      [paramMetaTypes.referrableDataType]: 'medias',
    })
    .describe('Media sources with optional linked medias ref for srcs'),
  trackName: z.string().describe('Name of the track ( used for the ID )'),
  trackType: z.enum(['sequence', 'aligned', 'random']).default('sequence'),
  trackDuration: z
    .number()
    .describe('Duration of the track in seconds ( only for random tracks )')
    .default(20)
    .optional(),
  trackStartOffset: z
    .number()
    .describe('Start offset of the track in seconds')
    .optional(),
  trackFitDurationTo: z
    .string()
    .describe('Fit duration to the track ( only for aligned/random tracks )')
    .optional(),
});

/** Normalize legacy array or { mediaRef?, items } into a flat items list. */
function resolveMediaItems(raw: unknown): MediaTrackItem[] {
  if (Array.isArray(raw)) return raw as MediaTrackItem[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as any).items)) {
    return (raw as any).items as MediaTrackItem[];
  }
  return [];
}

/** Prefer rangeString (comma-separated); fall back to legacy ranges[]. */
function resolveItemRangeStrings(
  mediaItem: MediaTrackItem & { ranges?: string[] },
  normalizeRangeString: (v: unknown) => string,
): string[] {
  const joined = normalizeRangeString(
    mediaItem.rangeString ?? (mediaItem as any).ranges,
  );
  if (!joined) return [];
  return joined
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: {
    config: InputCompositionProps['config'];
    clip?: { start?: number; duration?: number };
    helpers?: Record<string, Function>;
  },
): PresetOutput => {
  // Get the base scene start offset from the clip information
  const baseSceneStartOffset = props.clip?.start ?? 0;
  // After processDataReferences, mediaItems may already be a merged array.
  // Before processing (or if unprocessed), it is { mediaRef?, items }.
  const mediaItems = resolveMediaItems((params as any).mediaItems);

  const parseTimeRange = (props.helpers?.parseTimeRange ?? (() => null)) as (
    range: string,
  ) => { start: number; end: number } | null;
  const normalizeRangeString = (props.helpers?.normalizeRangeString ??
    ((v: unknown) => (typeof v === 'string' ? v : ''))) as (
    v: unknown,
  ) => string;

  // Helper function to create transition effects
  const createTransitionEffects = (
    mediaItem: MediaTrackItem,
    sceneId: string,
    isFadeIn: boolean = true,
    timeRangeOffset: number = 0,
    timeRangeDuration?: number,
  ): (GenericEffectData | ShakeEffectData)[] => {
    const effects: (GenericEffectData | ShakeEffectData)[] = [];
    const transition = isFadeIn
      ? mediaItem.fadeInTransition
      : mediaItem.fadeOutTransition;
    const duration = isFadeIn
      ? mediaItem.fadeInDuration
      : mediaItem.fadeOutDuration;

    if (!transition || transition === 'none') return effects;

    const effectDuration = duration || (isFadeIn ? 1.5 : 1); // Default durations
    const mediaDuration = timeRangeDuration || mediaItem.duration || 0;
    const startTime = isFadeIn ? 0 : mediaDuration - effectDuration;

    // Base opacity effect for all transitions (including pure opacity)
    effects.push({
      start: startTime,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [sceneId],
      type: 'ease-in-out',
      ranges: [
        {
          key: 'opacity',
          val: isFadeIn ? 0 : (mediaItem.opacity ?? 1),
          prog: 0,
        },
        {
          key: 'opacity',
          val: isFadeIn ? (mediaItem.opacity ?? 1) : 0,
          prog: 1,
        },
      ],
    });

    // Slide effects
    if (transition.includes('slide-in') || transition.includes('slide-out')) {
      const direction = transition.split('-')[2]; // right, left, top, bottom
      const isSlideIn = transition.includes('slide-in');

      switch (direction) {
        case 'right':
          effects.push({
            start: startTime,
            duration: effectDuration * 0.8, // Faster than opacity
            mode: 'provider',
            targetIds: [sceneId],
            type: 'ease-out',
            ranges: [
              {
                key: 'translateX',
                val: isSlideIn ? '100px' : '-100px',
                prog: 0,
              },
              {
                key: 'translateX',
                val: '0px',
                prog: 1,
              },
            ],
          });
          break;
        case 'left':
          effects.push({
            start: startTime,
            duration: effectDuration * 0.8,
            mode: 'provider',
            targetIds: [sceneId],
            type: 'ease-out',
            ranges: [
              {
                key: 'translateX',
                val: isSlideIn ? '-100px' : '100px',
                prog: 0,
              },
              {
                key: 'translateX',
                val: '0px',
                prog: 1,
              },
            ],
          });
          break;
        case 'top':
          effects.push({
            start: startTime,
            duration: effectDuration * 0.8,
            mode: 'provider',
            targetIds: [sceneId],
            type: 'ease-out',
            ranges: [
              {
                key: 'translateY',
                val: isSlideIn ? '-100px' : '100px',
                prog: 0,
              },
              {
                key: 'translateY',
                val: '0px',
                prog: 1,
              },
            ],
          });
          break;
        case 'bottom':
          effects.push({
            start: startTime,
            duration: effectDuration * 0.8,
            mode: 'provider',
            targetIds: [sceneId],
            type: 'ease-out',
            ranges: [
              {
                key: 'translateY',
                val: isSlideIn ? '100px' : '-100px',
                prog: 0,
              },
              {
                key: 'translateY',
                val: '0px',
                prog: 1,
              },
            ],
          });
          break;
      }
    }

    // Scale effects
    if (transition === 'scale-in') {
      effects.push({
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [sceneId],
        type: 'ease-out',
        ranges: [
          {
            key: 'scale',
            val: 0.8,
            prog: 0,
          },
          {
            key: 'scale',
            val: 1,
            prog: 1,
          },
        ],
      });
    }

    if (transition === 'scale-out') {
      effects.push({
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [sceneId],
        type: 'ease-in',
        ranges: [
          {
            key: 'scale',
            val: 1,
            prog: 0,
          },
          {
            key: 'scale',
            val: 1.1,
            prog: 1,
          },
        ],
      });
    }

    // Blur effects
    if (transition === 'blur-in') {
      effects.push({
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [sceneId],
        type: 'ease-out',
        ranges: [
          {
            key: 'blur',
            val: '10px',
            prog: 0,
          },
          {
            key: 'blur',
            val: '0px',
            prog: 1,
          },
        ],
      });
    }

    if (transition === 'blur-out') {
      effects.push({
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [sceneId],
        type: 'ease-in',
        ranges: [
          {
            key: 'blur',
            val: '0px',
            prog: 0,
          },
          {
            key: 'blur',
            val: '10px',
            prog: 1,
          },
        ],
      });
    }

    // Shake effects - use shake component instead of generic
    if (transition === 'shake-in') {
      effects.push({
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [sceneId],
        type: 'linear',
        amplitude: 15,
        frequency: 0.2,
        decay: true,
        axis: 'both',
      } as ShakeEffectData);
    }

    if (transition === 'shake-out') {
      effects.push({
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [sceneId],
        type: 'linear',
        amplitude: 10,
        frequency: 0.3,
        decay: false,
        axis: 'both',
      } as ShakeEffectData);
    }

    return effects;
  };
  // Helper function to parse time range (imageloop-style via helpers)
  const parseItemTimeRange = (
    range: string,
  ): { start: number; duration: number } | null => {
    const tr = parseTimeRange(range);
    if (!tr || tr.end <= tr.start) return null;
    return { start: tr.start, duration: tr.end - tr.start };
  };

  // Create scenes for each video
  const scenes = mediaItems
    .flatMap((mediaItem, index) => {
      // Prefer rangeString (comma-separated); fall back to legacy ranges[]
      const ranges = resolveItemRangeStrings(mediaItem, normalizeRangeString);

      // If no ranges provided, create a single scene with no time range
      if (ranges.length === 0) {
        return [createMediaScene(mediaItem, index, 0, null)];
      }

      // Create a scene for each range
      return ranges.map((range, rangeIndex) => {
        const timeRange = parseItemTimeRange(range);
        return createMediaScene(mediaItem, index, rangeIndex, timeRange);
      });
    })
    .filter(scene => scene !== undefined);

  // Helper function to create a media scene
  function createMediaScene(
    mediaItem: MediaTrackItem,
    index: number,
    rangeIndex: number,
    timeRange: { start: number; duration: number } | null,
  ) {
    const sceneId = `${params.trackName ?? 'media-track'}-${mediaItem.type}-${index}${rangeIndex > 0 ? `-range-${rangeIndex}` : ''}`;

    // Create transition effects
    const timeRangeOffset = timeRange ? timeRange.start : 0;
    const timeRangeDuration = timeRange ? timeRange.duration : undefined;
    const fadeInEffects = createTransitionEffects(
      mediaItem,
      sceneId,
      true,
      timeRangeOffset,
      timeRangeDuration,
    );
    const fadeOutEffects = createTransitionEffects(
      mediaItem,
      sceneId,
      false,
      timeRangeOffset,
      timeRangeDuration,
    );
    const allEffects = [...fadeInEffects, ...fadeOutEffects];

    let mediaType = mediaItem.type;
    const src = String(mediaItem.src || '');

    if (!mediaType) {
      if (
        src.endsWith('.png') ||
        src.endsWith('.jpg') ||
        src.endsWith('.jpeg') ||
        src.endsWith('.gif') ||
        src.endsWith('.webp') ||
        src.endsWith('.svg') ||
        src.endsWith('.avif')
      ) {
        mediaType = 'image';
      } else if (
        src.endsWith('.mp4') ||
        src.endsWith('.webm') ||
        src.endsWith('.mov') ||
        src.endsWith('.avi') ||
        src.endsWith('.mkv') ||
        src.endsWith('.flv') ||
        src.endsWith('.wmv')
      ) {
        mediaType = 'video';
      } else {
        mediaType = 'audio';
      }
    }

    if (mediaType === 'video') {
      return {
        id: sceneId,
        componentId: 'VideoAtom',
        type: 'atom' as const,
        data: {
          src,
          className:
            mediaItem.fit === 'cover'
              ? 'w-full h-full object-cover'
              : 'w-full h-auto',
          fit: mediaItem.fit ?? ('cover' as const),
          loop: mediaItem.loop ?? false,
          muted: mediaItem.mute ?? false,
          volume: mediaItem.volume ?? 1,
          playbackRate: mediaItem.playbackRate ?? 1,
          style: {
            ...(mediaItem.blendMode
              ? { mixBlendMode: mediaItem.blendMode }
              : {}),
            ...(mediaItem.opacity !== undefined
              ? { opacity: mediaItem.opacity }
              : {}),
          },
          startFrom: mediaItem.startCropVideo ?? 0,
          ...(timeRange &&
            !mediaItem.duration && {
              srcDuration: timeRange.duration,
            }),
        } as VideoAtomDataProps,
        context: {
          timing: {
            ...(mediaItem.duration && !timeRange
              ? { duration: mediaItem.duration }
              : {}),
            ...(mediaItem.fitDurationTo
              ? { fitDurationTo: mediaItem.fitDurationTo }
              : {}),
            ...(timeRange
              ? {
                  start: timeRange.start,
                  duration: timeRange.duration,
                }
              : {}),
          },
        },
        effects: allEffects.map((effect, effectIndex) => {
          // Use shake component for shake effects
          const isShakeEffect =
            'amplitude' in effect && effect.amplitude !== undefined;
          return {
            id: `${sceneId}-effect-${effectIndex}`,
            componentId: isShakeEffect ? 'shake' : 'generic',
            data: effect,
          };
        }),
      };
    } else if (mediaType === 'image') {
      return {
        id: sceneId,
        componentId: 'ImageAtom',
        type: 'atom' as const,
        data: {
          src,
          className: 'w-full h-auto object-cover',
          fit: mediaItem.fit ?? ('cover' as const),
          style: {
            ...(mediaItem.opacity !== undefined
              ? { opacity: mediaItem.opacity }
              : {}),
          },
        },
        context: {
          timing: {
            ...(timeRange
              ? {
                  start: timeRange.start,
                  duration: timeRange.duration,
                }
              : {}),
            ...(mediaItem.startCropVideo && !timeRange
              ? { start: mediaItem.startCropVideo }
              : {}),
            ...(mediaItem.duration && !timeRange
              ? { duration: mediaItem.duration }
              : {}),
            ...(mediaItem.fitDurationTo
              ? { fitDurationTo: mediaItem.fitDurationTo }
              : {}),
          },
        },
        effects: allEffects.map((effect, effectIndex) => {
          // Use shake component for shake effects
          const isShakeEffect =
            'amplitude' in effect && effect.amplitude !== undefined;
          return {
            id: `${sceneId}-effect-${effectIndex}`,
            componentId: isShakeEffect ? 'shake' : 'generic',
            data: effect,
          };
        }),
      };
    } else if (mediaType === 'audio') {
      return {
        id: sceneId,
        componentId: 'AudioAtom',
        type: 'atom' as const,
        data: {
          src,
          className: 'w-full h-auto object-cover',
          fit: mediaItem.fit ?? ('cover' as const),
          volume: mediaItem.volume ?? 1,
          startFrom: mediaItem.startCropVideo ?? 0,
        } as AudioAtomDataProps,
        context: {
          timing: {
            ...(timeRange
              ? {
                  start: timeRange.start,
                  duration: timeRange.duration,
                }
              : {}),
            ...(mediaItem.duration && !timeRange
              ? { duration: mediaItem.duration }
              : {}),
          },
        },
        effects: allEffects.map((effect, effectIndex) => {
          // Use shake component for shake effects
          const isShakeEffect =
            'amplitude' in effect && effect.amplitude !== undefined;
          return {
            id: `${sceneId}-effect-${effectIndex}`,
            componentId: isShakeEffect ? 'shake' : 'generic',
            data: effect,
          };
        }),
      };
    }
  }

  return {
    output: {
      config: {
        duration: 20,
      },
      childrenData: [
        {
          id: `${params.trackName}`,
          componentId: 'BaseLayout',
          type:
            params.trackType === 'aligned' || params.trackType === 'random'
              ? 'layout'
              : ('scene' as const),
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          context: {
            timing:
              params.trackType === 'aligned' || params.trackType === 'random'
                ? {
                    start: params.trackStartOffset ?? 0,
                    duration: params.trackDuration,
                    fitDurationTo: params.trackFitDurationTo ?? 'this',
                  }
                : {
                    start: params.trackStartOffset ?? 0,
                  },
          },
          childrenData: scenes ?? [],
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

const _presetMetadata: PresetMetadata = {
  id: 'media-track',
  title: 'Media Track',
  description:
    'Tracks multiple media items together in sequence with customizable aspect ratio',
  type: 'predefined',
  presetType: 'children',
  tags: ['media', 'track', 'sequence', 'aspect-ratio'],
  defaultInputParams: {
    mediaItems: {
      items: [
        {
          src: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
          type: 'video',
          fit: 'cover',
          opacity: 0.8,
          rangeString: '0:10-2:30',
        },
        {
          src: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
          type: 'video',
          fit: 'cover',
          opacity: 1.0,
          rangeString: '2:30-5:00,6:00-8:30',
        },
      ],
    },
    trackName: 'media-track',
    trackType: 'sequence',
  },
};

const _presetExecution = presetExecution.toString();
const _presetParams = z.toJSONSchema(presetParams);

export const mediaTrackPreset = {
  metadata: _presetMetadata,
  presetFunction: _presetExecution,
  presetParams: _presetParams,
};
