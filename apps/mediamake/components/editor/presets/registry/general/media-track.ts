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
import { paramInputTypes, paramMetaTypes } from '../../dataTypes';

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
      'Appearance range(s) MM:SS-MM:SS or MM:SS.sss-MM:SS.sss (comma-separated for multiple, e.g. 0:10-2:30,6:00.50-8:30)',
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
    .describe('CSS filter preset'),
  colorTint: z
    .string()
    .optional()
    .meta({
      [paramMetaTypes.inputType]: paramInputTypes.color,
      [paramMetaTypes.groupEditable]: true,
    })
    .describe('Optional color tint overlay'),
  position: z
    .object({
      left: z.number().optional().describe('Left inset'),
      top: z.number().optional().describe('Top inset'),
      right: z.number().optional().describe('Right inset'),
      bottom: z.number().optional().describe('Bottom inset'),
      width: z.number().optional().describe('Width'),
      height: z.number().optional().describe('Height'),
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
        .describe('Anchor position within the track container'),
    })
    .optional()
    .meta({
      [paramMetaTypes.containerObject]: true,
      [paramMetaTypes.groupEditable]: true,
    })
    .describe('Position of this media inside the track container'),
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

  const parseCssColor = (
    input: string,
  ): { r: number; g: number; b: number; a: number } | null => {
    const s = input.trim();
    const hex = s.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
      let h = hex[1];
      if (h.length === 3 || h.length === 4) {
        h = h.split('').map(c => c + c).join('');
      }
      if (h.length !== 6 && h.length !== 8) return null;
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
      };
    }
    const rgb = s.match(
      /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
    );
    if (!rgb) return null;
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] !== undefined ? Number(rgb[4]) : 1,
    };
  };

  const colorTintFilter = (colorTint: string | undefined): string | undefined => {
    if (!colorTint || !colorTint.trim()) return undefined;
    const parsed = parseCssColor(colorTint);
    if (!parsed) return undefined;
    const max = Math.max(parsed.r, parsed.g, parsed.b);
    const min = Math.min(parsed.r, parsed.g, parsed.b);
    let hue = 0;
    const d = max - min;
    if (d !== 0) {
      if (max === parsed.r) hue = ((parsed.g - parsed.b) / d) % 6;
      else if (max === parsed.g) hue = (parsed.b - parsed.r) / d + 2;
      else hue = (parsed.r - parsed.g) / d + 4;
      hue *= 60;
      if (hue < 0) hue += 360;
    }
    const amount = Math.min(
      1,
      Math.max(0.2, parsed.a < 1 ? parsed.a : 0.65),
    );
    const rotate = Math.round(hue - 40);
    return `sepia(${amount}) hue-rotate(${rotate}deg) saturate(${(1 + amount).toFixed(2)})`;
  };

  const buildMediaFilter = (
    filter: string | undefined,
    colorTint: string | undefined,
  ): string | undefined => {
    const parts: string[] = [];
    if (filter && filter !== 'none') {
      const css = generateFilterStyle(filter);
      if (css && css !== 'none') parts.push(css);
    }
    const tint = colorTintFilter(colorTint);
    if (tint) parts.push(tint);
    return parts.length > 0 ? parts.join(' ') : undefined;
  };

  const applyPositioning = (
    positioning: string | undefined,
  ): Record<string, string | number> => {
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
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
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

  const positionStyle = (
    position: MediaTrackItem['position'],
  ): Record<string, string | number> => {
    if (!position) return {};
    const style: Record<string, string | number> = {
      ...applyPositioning(position.positioning),
    };
    if (position.left !== undefined) style.left = position.left;
    if (position.top !== undefined) style.top = position.top;
    if (position.right !== undefined) style.right = position.right;
    if (position.bottom !== undefined) style.bottom = position.bottom;
    if (position.width !== undefined) style.width = position.width;
    if (position.height !== undefined) style.height = position.height;
    if (Object.keys(style).length > 0) style.position = 'absolute';
    return style;
  };

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

  const resolveMediaType = (
    mediaItem: MediaTrackItem,
  ): 'video' | 'image' | 'audio' => {
    if (
      mediaItem.type === 'video' ||
      mediaItem.type === 'image' ||
      mediaItem.type === 'audio'
    ) {
      return mediaItem.type;
    }
    const src = String(mediaItem.src || '');
    if (/\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(src)) return 'image';
    if (/\.(mp4|webm|mov|avi|mkv|flv|wmv)(\?|$)/i.test(src)) return 'video';
    return 'audio';
  };

  const visualStyle = (mediaItem: MediaTrackItem): Record<string, unknown> => {
    const filterCss = buildMediaFilter(mediaItem.filter, mediaItem.colorTint);
    return {
      ...positionStyle(mediaItem.position),
      ...(filterCss ? { filter: filterCss } : {}),
      ...(mediaItem.blendMode ? { mixBlendMode: mediaItem.blendMode } : {}),
      ...(mediaItem.opacity !== undefined ? { opacity: mediaItem.opacity } : {}),
    };
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
    const isAudio = resolveMediaType(mediaItem) === 'audio';
    const fadeInEffects = isAudio
      ? []
      : createTransitionEffects(
          mediaItem,
          sceneId,
          true,
          timeRangeOffset,
          timeRangeDuration,
        );
    const fadeOutEffects = isAudio
      ? []
      : createTransitionEffects(
          mediaItem,
          sceneId,
          false,
          timeRangeOffset,
          timeRangeDuration,
        );
    const allEffects = [...fadeInEffects, ...fadeOutEffects];

    const mediaType = resolveMediaType(mediaItem);
    const src = String(mediaItem.src || '');

    if (mediaType === 'video') {
      const thumbnail =
        (mediaItem as any).thumbnail ||
        (mediaItem as any).thumbnailUrl ||
        (mediaItem as any).metadata?.thumbnail ||
        (mediaItem as any).metadata?.thumbnailUrl;
      return {
        id: sceneId,
        componentId: 'VideoAtom',
        type: 'atom' as const,
        data: {
          src,
          ...(thumbnail ? { thumbnail: String(thumbnail) } : {}),
          className:
            mediaItem.fit === 'cover'
              ? 'w-full h-full object-cover'
              : 'w-full h-auto',
          fit: mediaItem.fit ?? ('cover' as const),
          loop: mediaItem.loop ?? false,
          muted: mediaItem.mute ?? false,
          volume: mediaItem.volume ?? 1,
          playbackRate: mediaItem.playbackRate ?? 1,
          style: visualStyle(mediaItem),
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
          style: visualStyle(mediaItem),
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

  const container = params.containerObject ?? {};
  const containerStyle: Record<string, string | number> = {
    ...applyPositioning(container.positioning),
  };
  if (container.left !== undefined) containerStyle.left = container.left;
  if (container.top !== undefined) containerStyle.top = container.top;
  if (container.right !== undefined) containerStyle.right = container.right;
  if (container.bottom !== undefined) containerStyle.bottom = container.bottom;
  if (container.width !== undefined) containerStyle.width = container.width;
  if (container.height !== undefined) containerStyle.height = container.height;
  const hasPositioning = Object.keys(containerStyle).length > 0;
  const containerClassName = hasPositioning ? 'absolute' : 'absolute inset-0';
  const containerProps = {
    className: containerClassName,
    ...(hasPositioning ? { style: containerStyle } : {}),
  };

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
            containerProps,
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
      attachedContainers: [containerProps],
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
