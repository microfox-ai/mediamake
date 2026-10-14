/**
 * Image Loop Preset
 *
 * This preset applies dynamic effects (pan, zoom, shake, generic animations) to single or multiple
 * images. It creates engaging visual sequences with smooth motion and transitions.
 *
 * Features:
 * - **Loop Effects**: Pan, zoom, and custom generic animations (`loopEffects`)
 * - **Transitions**: Per-image in/out transitions (fade, blur, slide, scale)
 * - **Image Filters**: Blur, brightness, contrast, saturation, grayscale, sepia, and more
 * - **Blend Modes**: Various blend modes for creative compositing
 * - **Time Range Control**: Apply effects to specific time ranges (MM:SS-MM:SS or MM:SS.sss-MM:SS.sss)
 * - **Effect Looping**: Repeat effects multiple times within their duration
 * - **Track timing**: Lock to another track, align on a start and duration, or sequence images
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

const transitionEffectSchema = z.object({
  id: z.string().optional().describe('Custom transition id'),
  timing: z
    .enum(['in', 'out', 'in&out'])
    .default('in&out')
    .describe('Which edge of the image plays this transition'),
  animation: z
    .enum([
      'blur',
      'fade',
      'slide-left',
      'slide-right',
      'slide-up',
      'slide-down',
      'scale-in',
    ])
    .default('fade')
    .describe('Transition animation'),
  impact: z
    .number()
    .default(1)
    .describe('Strength of the transition (default 1)'),
  animationType: z
    .enum(['linear', 'spring', 'bezier'])
    .default('linear')
    .describe('linear, spring + clamp, or bezier + clamp'),
  inRange: z
    .number()
    .min(0)
    .default(0.5)
    .describe('Transition in length in seconds (default 0.5)'),
  outRange: z
    .number()
    .min(0)
    .default(0.5)
    .describe('Transition out length in seconds (default 0.5)'),
});

// Define the schema for image sources
const imageSourceSchema = z.object({
  src: z.string().describe('Image source URL'),
  type: z
    .enum(['image', 'video', 'audio'])
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: false })
    .describe('Media kind. Shared with media-track; image loop items are images.'),
  name: z
    .string()
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: false })
    .describe('Display name from the linked media reference'),
  thumbnail: z
    .string()
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: false })
    .describe('Thumbnail URL from the linked media reference'),
  rangeString: z
    .string()
    .optional()
    .meta({
      [paramMetaTypes.rangeField]: true,
      [paramMetaTypes.groupEditable]: false,
    })
    .describe('Range in MM:SS-MM:SS or MM:SS.sss-MM:SS.sss format like 01:00-02:00'),
  lockTo: z
    .string()
    .optional()
    .meta({
      [paramMetaTypes.lockTarget]: true,
      [paramMetaTypes.groupEditable]: false,
    })
    .describe(
      'Lock this image to a sibling or parent track. When set, the range is not edited.',
    ),
  start: z
    .number()
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: false })
    .describe('Start inside an aligned track, in seconds'),
  duration: z
    .number()
    .optional()
    .meta({ [paramMetaTypes.groupEditable]: false })
    .describe('Fixed duration in seconds'),
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
  transitionEffects: z
    .array(transitionEffectSchema)
    .optional()
    .default([])
    .meta({
      [paramMetaTypes.transitionEffectsGroup]: true,
      [paramMetaTypes.groupEditable]: false,
    })
    .describe('In and out transitions for this image'),
});

// Visual motion effects only (pan / zoom / generic)
const effectSchema = z.object({
  type: z
    .enum(['pan', 'zoom', 'generic'])
    .describe('Type of effect to apply'),
  id: z.string().optional().describe('Custom effect ID'),
  range: z
    .string()
    .optional()
    .meta({
      [paramMetaTypes.rangeField]: true,
      [paramMetaTypes.rangeLayout]: 'array',
    })
    .describe('Range of the effect in MM:SS-MM:SS or MM:SS.sss-MM:SS.sss format like 01:00-02:00'),
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
});

/** Plain shake entries (often generated by actions like shakeEffectRange). */
const shakeEffectSchema = z.object({
  id: z.string().optional().describe('Custom effect ID'),
  shake: z
    .object({
      amplitude: z
        .number()
        .optional()
        .describe('Shake intensity (typical 0.5–4)'),
      frequency: z
        .number()
        .optional()
        .describe('Shake speed. 0.1 is a slow sway, 3 is a fast vibrate'),
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
  range: z
    .string()
    .optional()
    .meta({
      [paramMetaTypes.rangeField]: true,
      [paramMetaTypes.rangeLayout]: 'array',
    })
    .describe('Range of the effect in MM:SS-MM:SS or MM:SS.sss-MM:SS.sss format like 01:00-02:00'),
});

/** Audio-reactive beat effects (including beat-shake). */
const beatEffectSchema = z.object({
  type: z
    .enum(['beat-zoom', 'beat-shake', 'beat-exposure'])
    .describe('Beat-reactive effect type'),
  id: z.string().optional().describe('Custom effect ID'),
  range: z
    .string()
    .optional()
    .meta({
      [paramMetaTypes.rangeField]: true,
      [paramMetaTypes.rangeLayout]: 'array',
    })
    .describe('Range of the effect in MM:SS-MM:SS or MM:SS.sss-MM:SS.sss format like 01:00-02:00'),
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
  trackType: z
    .enum(['lockedTo', 'sequence', 'aligned'])
    .default('lockedTo')
    .describe(
      'Lock copies another track. Sequence plays images in order. Aligned uses start and duration.',
    ),
  start: z
    .number()
    .default(0)
    .describe('Start of this track in its parent scene, in seconds'),
  startOffset: z
    .number()
    .optional()
    .describe(
      'Negative trim from the head, in seconds. The end stays put.',
    ),
  duration: z
    .number()
    .optional()
    .describe(
      'Duration in seconds. Required for aligned tracks. For a sequence, provide this or perImageDuration.',
    ),
  perImageDuration: z
    .number()
    .optional()
    .describe(
      'Length of each image in a sequence, in seconds. Required for sequence when duration is empty.',
    ),
  lock: z
    .string()
    .optional()
    .meta({ [paramMetaTypes.lockTarget]: true })
    .describe('Lock start and duration to a sibling or parent track'),
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
          'Linked medias reference key — src, type, name, and thumbnail are read from this ref',
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
  loopEffects: z
    .array(effectSchema)
    .min(1)
    .meta({
      [paramMetaTypes.nestedRangeField]: '[].range',
      [paramMetaTypes.effectsGroup]: true,
    })
    .describe('Loop motion effects: pan, zoom, generic'),
  shakeEffects: z
    .array(shakeEffectSchema)
    .optional()
    .default([])
    .meta({
      [paramMetaTypes.nestedRangeField]: '[].range',
      [paramMetaTypes.shakeEffectsGroup]: true,
    })
    .describe(
      'Plain shake effects (often generated by actions like shakeEffectRange)',
    ),
  beatEffects: z
    .array(beatEffectSchema)
    .optional()
    .default([])
    .meta({ [paramMetaTypes.nestedRangeField]: '[].range' })
    .describe(
      'Beat-reactive effects: beat-zoom, beat-shake, beat-exposure',
    ),
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
  // loopEffects is the current field; effects is the previous name
  const rawEffects =
    (params as any).loopEffects ?? (params as any).effects;
  // Migrate legacy entries that still live on effects[] / shakeEffects
  const legacyShake: z.infer<typeof shakeEffectSchema>[] = [];
  const legacyBeat: z.infer<typeof beatEffectSchema>[] = [];
  const effects = (Array.isArray(rawEffects) ? rawEffects : []).filter(
    (effect: any) => {
      if (effect?.type === 'shake') {
        legacyShake.push(effect as z.infer<typeof shakeEffectSchema>);
        return false;
      }
      if (
        effect?.type === 'beat-zoom' ||
        effect?.type === 'beat-shake' ||
        effect?.type === 'beat-exposure'
      ) {
        legacyBeat.push(effect as z.infer<typeof beatEffectSchema>);
        return false;
      }
      return true;
    },
  ) as z.infer<typeof effectSchema>[];

  const rawShakeEffects = Array.isArray((params as any).shakeEffects)
    ? ((params as any).shakeEffects as any[])
    : [];
  // beat-shake may still sit on shakeEffects from the previous schema
  const shakeFromParam: z.infer<typeof shakeEffectSchema>[] = [];
  for (const effect of rawShakeEffects) {
    if (effect?.type === 'beat-shake') {
      legacyBeat.push(effect as z.infer<typeof beatEffectSchema>);
    } else if (effect?.type === 'shake' || !effect?.type) {
      shakeFromParam.push({ ...effect, type: 'shake' });
    }
  }

  const shakeEffects = [...shakeFromParam, ...legacyShake];
  const beatEffects = [
    ...(Array.isArray((params as any).beatEffects)
      ? ((params as any).beatEffects as z.infer<typeof beatEffectSchema>[])
      : []),
    ...legacyBeat,
  ];
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

  // Lock copies another track. Sequence plays images back to back.
  // Aligned places each image on its own start, the same way a media track does.
  const legacy = params as unknown as {
    trackType?: string;
    start?: number;
    startOffset?: number;
    duration?: number;
    perImageDuration?: number;
    lock?: string;
    trackFitDurationTo?: string;
    trackRange?: string;
    trackStartOffset?: number;
    trackDuration?: number;
  };
  const trackType = legacy.trackType;
  const lockTarget =
    (typeof legacy.lock === 'string' && legacy.lock) ||
    (typeof legacy.trackFitDurationTo === 'string' && legacy.trackFitDurationTo) ||
    '';
  const locked =
    trackType === 'lockedTo' ||
    (lockTarget.trim().length > 0 &&
      trackType !== 'sequence' &&
      trackType !== 'aligned');
  const sequence = !locked && trackType === 'sequence';
  const perImageDuration =
    typeof legacy.perImageDuration === 'number' && legacy.perImageDuration > 0
      ? legacy.perImageDuration
      : undefined;
  const authoredDuration =
    (typeof legacy.duration === 'number' && legacy.duration > 0
      ? legacy.duration
      : undefined) ??
    (typeof legacy.trackDuration === 'number' && legacy.trackDuration > 0
      ? legacy.trackDuration
      : undefined);
  const imagesMissingLength = sequence
    ? images.filter((image) => {
        if (parseRangeString(image?.rangeString)) return false;
        return !(typeof image?.duration === 'number' && image.duration > 0);
      }).length
    : 0;
  // A sequence with no per-image length splits the track duration evenly.
  const evenShare =
    sequence &&
    perImageDuration === undefined &&
    authoredDuration &&
    images.length > 0 &&
    imagesMissingLength === images.length
      ? authoredDuration / images.length
      : undefined;

  /**
   * Shake ranges are composition time. The image atom is mounted in a
   * Sequence that starts at the image range, so effect time is local.
   * Shift the shake onto that clock and skip it when it misses this image.
   * A shake with no range stays at the start of the image.
   */
  const placeShakeOnImage = (
    timeRange: { start: number; end: number } | null,
    fallbackDuration: number,
    imageRange: { start: number; duration: number } | null,
  ): { start: number; duration: number; end: number } | null => {
    if (!timeRange || !(timeRange.end > timeRange.start)) {
      if (!(fallbackDuration > 0)) return null;
      return {
        start: 0,
        duration: fallbackDuration,
        end: fallbackDuration,
      };
    }

    const duration = timeRange.end - timeRange.start;
    if (!imageRange) {
      return { start: timeRange.start, duration, end: timeRange.end };
    }

    const imageEnd = imageRange.start + imageRange.duration;
    const overlapStart = Math.max(timeRange.start, imageRange.start);
    const overlapEnd = Math.min(timeRange.end, imageEnd);
    if (!(overlapEnd > overlapStart)) return null;

    // Keep the full envelope so a shake that began before this image
    // is already partway through when the image appears.
    return {
      start: timeRange.start - imageRange.start,
      duration,
      end: timeRange.end - imageRange.start,
    };
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

  /** Join every CSS filter function into one `filter` value. */
  const buildMediaFilter = (
    filter: string | undefined,
    colorTint: string | undefined,
  ): string | undefined => {
    const parts: string[] = [];
    if (filter && filter !== 'none') {
      const css = generateFilterStyle(filter);
      if (css && css !== 'none') parts.push(css);
    }
    const tintFilter = colorTintFilter(colorTint);
    if (tintFilter) parts.push(tintFilter);
    return parts.length > 0 ? parts.join(' ') : undefined;
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
    // sepia() lands near hue 40°. hue-rotate shifts that toward the picked color.
    // Amount follows the color alpha when one is set, otherwise a visible wash.
    const amount = Math.min(
      1,
      Math.max(0.2, parsed.a < 1 ? parsed.a : 0.65),
    );
    const rotate = Math.round(hue - 40);
    return `sepia(${amount}) hue-rotate(${rotate}deg) saturate(${(1 + amount).toFixed(2)})`;
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

  const buildImageTransitions = (
    image: any,
    imageIndex: number,
    imageRange: { start: number; duration: number } | null,
  ) => {
    const list = Array.isArray(image?.transitionEffects)
      ? image.transitionEffects
      : [];
    const targetId = `${params.trackName ?? 'imageloop'}-image-${imageIndex}`;
    // The image atom is mounted in a Sequence, so effect time starts at 0
    // when the image appears — not at the composition clock.
    const imageDuration = imageRange?.duration ?? 0;
    const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
    const animType = (value: unknown) =>
      value === 'spring' || value === 'bezier' ? value : 'linear';

    const rangesFor = (
      animation: string,
      impact: number,
      direction: 'in' | 'out',
    ) => {
      const amount = Number.isFinite(impact) ? impact : 1;
      const fade = clamp01(amount);
      const slide = `${amount * 100}%`;
      const slideNeg = `-${amount * 100}%`;
      const blurPx = Math.max(0, amount * 20);
      const scaleFrom = Math.max(0, 1 - amount);
      const isIn = direction === 'in';
      switch (animation) {
        case 'blur':
          return [
            { key: 'blur', val: isIn ? blurPx : 0, prog: 0 },
            { key: 'blur', val: isIn ? 0 : blurPx, prog: 1 },
          ];
        case 'slide-left':
          return [
            { key: 'translateX', val: isIn ? slide : '0%', prog: 0 },
            { key: 'translateX', val: isIn ? '0%' : slideNeg, prog: 1 },
          ];
        case 'slide-right':
          return [
            { key: 'translateX', val: isIn ? slideNeg : '0%', prog: 0 },
            { key: 'translateX', val: isIn ? '0%' : slide, prog: 1 },
          ];
        case 'slide-up':
          return [
            { key: 'translateY', val: isIn ? slide : '0%', prog: 0 },
            { key: 'translateY', val: isIn ? '0%' : slideNeg, prog: 1 },
          ];
        case 'slide-down':
          return [
            { key: 'translateY', val: isIn ? slideNeg : '0%', prog: 0 },
            { key: 'translateY', val: isIn ? '0%' : slide, prog: 1 },
          ];
        case 'scale-in':
          return [
            { key: 'scale', val: isIn ? scaleFrom : 1, prog: 0 },
            { key: 'scale', val: isIn ? 1 : scaleFrom, prog: 1 },
          ];
        case 'fade':
        default:
          return [
            { key: 'opacity', val: isIn ? 1 - fade : 1, prog: 0 },
            { key: 'opacity', val: isIn ? 1 : 1 - fade, prog: 1 },
          ];
      }
    };

    const built: any[] = [];
    list.forEach((tr: any, effectIndex: number) => {
      const timing = tr?.timing || 'in&out';
      const animation = tr?.animation || 'fade';
      const impact = typeof tr?.impact === 'number' ? tr.impact : 1;
      const inDur = typeof tr?.inRange === 'number' ? tr.inRange : 0.5;
      const outDur = typeof tr?.outRange === 'number' ? tr.outRange : 0.5;
      const wantsIn = timing === 'in' || timing === 'in&out';
      const wantsOut = timing === 'out' || timing === 'in&out';
      const idBase =
        tr?.id ||
        `${params.trackName ?? 'imageloop'}-transition-${imageIndex}-${effectIndex}`;

      const push = (
        direction: 'in' | 'out',
        startSec: number,
        durSec: number,
      ) => {
        if (!(durSec > 0)) return;
        built.push({
          id: `${idBase}-${direction}`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [targetId],
            type: animType(tr?.animationType),
            ranges: rangesFor(animation, impact, direction),
            duration: durSec,
            start: startSec,
            // In releases back to the resting image. Out holds the end state
            // so the image stays hidden after the exit.
            inactiveBehavior: direction === 'out' ? 'hold-end' : 'none',
          } as GenericEffectData,
        });
      };

      if (wantsIn) {
        const cappedIn =
          imageDuration > 0 ? Math.min(inDur, imageDuration) : inDur;
        push('in', 0, cappedIn);
      }
      if (wantsOut && imageDuration > 0) {
        const capped = Math.min(outDur, imageDuration);
        push('out', Math.max(0, imageDuration - capped), capped);
      }
    });
    return built;
  };

  // Create image components with effects
  const imageComponents = await Promise.all(
    images.map(async (image, imageIndex) => {
      const imageRange = parseRangeString(image.rangeString);
      const ownDuration =
        typeof image.duration === 'number' && image.duration > 0
          ? image.duration
          : undefined;
      const ownStart =
        typeof image.start === 'number' && Number.isFinite(image.start)
          ? image.start
          : 0;

      let imageStart: number | undefined;
      let imageDuration: number;

      if (sequence) {
        // A sequence scene treats start as a gap, so only the length is kept.
        imageStart = undefined;
        imageDuration = imageRange
          ? imageRange.duration
          : (ownDuration ?? perImageDuration ?? evenShare ?? 0);
      } else if (imageRange) {
        imageStart = imageRange.start;
        imageDuration = imageRange.duration;
      } else {
        imageStart = ownStart;
        imageDuration = ownDuration ?? 0;
      }
      // Sequence images sit back to back, so effects use the image clock.
      const effectWindow = sequence
        ? imageDuration > 0
          ? { start: 0, duration: imageDuration }
          : null
        : imageRange;

      const mapOneEffect = async (
        effect:
          | z.infer<typeof effectSchema>
          | z.infer<typeof shakeEffectSchema>
          | z.infer<typeof beatEffectSchema>,
        effectIndex: number,
        idPrefix: string,
      ) => {
          const effectType =
            (effect as any).type ||
            (idPrefix === 'shake' ? 'shake' : undefined);
          const effectId =
            effect.id ||
            `${params.trackName ?? 'imageloop'}-${idPrefix}-${effectType || 'fx'}-${imageIndex}-${effectIndex}`;

          // Parse the range if provided
          const timeRange = parseTimeRange(effect.range || '');

          // Calculate duration based on range
          const effectDuration = timeRange
            ? timeRange.end - timeRange.start
            : 2; // Default duration if no range

          switch (effectType) {
            case 'pan':
              return {
                id: effectId,
                componentId: 'pan',
                data: {
                  mode: 'provider',
                  targetIds: [
                    `${params.trackName ?? 'imageloop'}-image-${imageIndex}`,
                  ],
                  panDirection: (effect as any).pan?.direction || 'up',
                  panDistance: (effect as any).pan?.distance || 200,
                  loopTimes: (effect as any).pan?.loopTimes || 1,
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
                  zoomDirection: (effect as any).zoom?.direction || 'in',
                  zoomDepth: (effect as any).zoom?.depth || 1.2,
                  loopTimes: (effect as any).zoom?.loopTimes || 1,
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
                  type: (effect as any).generic?.animationType || 'ease-in-out',
                  ranges:
                    (effect as any).generic?.animationRanges?.map((range: any) => ({
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

            case 'shake': {
              const placed = placeShakeOnImage(
                timeRange,
                effectDuration,
                effectWindow,
              );
              if (!placed) return null;
              return {
                id: effect.id
                  ? `${effect.id}-image-${imageIndex}`
                  : effectId,
                componentId: 'shake',
                data: {
                  amplitude: (effect as any).shake?.amplitude ?? 0.5,
                  frequency: (effect as any).shake?.frequency ?? 0.5,
                  decay: (effect as any).shake?.decay ?? true,
                  axis: (effect as any).shake?.axis || 'both',
                  duration: placed.duration,
                  start: placed.start,
                  end: placed.end,
                  mode: 'provider',
                  targetIds: [
                    `${params.trackName ?? 'imageloop'}-image-${imageIndex}`,
                  ],
                },
              };
            }

            case 'beat-zoom': {
              if (!presets || !presets.beatZoomEffect) {
                throw new Error(
                  'Preset dependency "beatZoomEffect" not found. Check metadata.dependencies.',
                );
              }
              const beatZoom = (effect as any).beatZoom;
              if (!beatZoom?.audioSrc) {
                throw new Error(
                  'beatZoom.audioSrc is required for beat-zoom effect',
                );
              }
              const beatZoomResult = await presets.beatZoomEffect(
                {
                  targetId: `${params.trackName ?? 'imageloop'}-image-${imageIndex}`,
                  audioSrc: beatZoom.audioSrc,
                  effectStart: timeRange?.start || 0,
                  effectDuration,
                  zoomIntensity: beatZoom.zoomIntensity,
                  baseScale: beatZoom.baseScale,
                  sensitivity: beatZoom.sensitivity,
                  threshold: beatZoom.threshold,
                  audioProperty: beatZoom.audioProperty,
                  smoothNormalisation: beatZoom.smoothNormalisation,
                  effectId: effectId,
                },
                props,
              );
              return (
                beatZoomResult?.output?._extractedEffects?.[0] ||
                beatZoomResult?.output?.childrenData?.[0]?.effects?.[0] ||
                null
              );
            }

            case 'beat-shake': {
              if (!presets || !presets.beatShakeEffect) {
                throw new Error(
                  'Preset dependency "beatShakeEffect" not found. Check metadata.dependencies.',
                );
              }
              const beatShake = (effect as any).beatShake;
              if (!beatShake?.audioSrc) {
                throw new Error(
                  'beatShake.audioSrc is required for beat-shake effect',
                );
              }
              const beatShakeResult = await presets.beatShakeEffect(
                {
                  targetId: `${params.trackName ?? 'imageloop'}-image-${imageIndex}`,
                  audioSrc: beatShake.audioSrc,
                  effectStart: timeRange?.start || 0,
                  effectDuration,
                  shakeIntensity: beatShake.shakeIntensity,
                  shakeAxis: beatShake.shakeAxis,
                  sensitivity: beatShake.sensitivity,
                  threshold: beatShake.threshold,
                  audioProperty: beatShake.audioProperty,
                  smoothNormalisation: beatShake.smoothNormalisation,
                  effectId: effectId,
                },
                props,
              );
              return (
                beatShakeResult?.output?._extractedEffects?.[0] ||
                beatShakeResult?.output?.childrenData?.[0]?.effects?.[0] ||
                null
              );
            }

            case 'beat-exposure': {
              if (!presets || !presets.beatExposureEffect) {
                throw new Error(
                  'Preset dependency "beatExposureEffect" not found. Check metadata.dependencies.',
                );
              }
              const beatExposure = (effect as any).beatExposure;
              if (!beatExposure?.audioSrc) {
                throw new Error(
                  'beatExposure.audioSrc is required for beat-exposure effect',
                );
              }
              const beatExposureResult = await presets.beatExposureEffect(
                {
                  targetId: `${params.trackName ?? 'imageloop'}-image-${imageIndex}`,
                  audioSrc: beatExposure.audioSrc,
                  effectStart: timeRange?.start || 0,
                  effectDuration,
                  brightnessIntensity: beatExposure.brightnessIntensity,
                  baseBrightness: beatExposure.baseBrightness,
                  sensitivity: beatExposure.sensitivity,
                  threshold: beatExposure.threshold,
                  audioProperty: beatExposure.audioProperty,
                  smoothNormalisation: beatExposure.smoothNormalisation,
                  effectId: effectId,
                },
                props,
              );
              return (
                beatExposureResult?.output?._extractedEffects?.[0] ||
                beatExposureResult?.output?.childrenData?.[0]?.effects?.[0] ||
                null
              );
            }

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
      };

      // Convert effects + shakeEffects + beatEffects
      const imageEffectsRaw = await Promise.all([
        ...effects.map((effect, effectIndex) =>
          mapOneEffect(effect, effectIndex, 'fx'),
        ),
        ...shakeEffects.map((effect, effectIndex) =>
          mapOneEffect(effect, effectIndex, 'shake'),
        ),
        ...beatEffects.map((effect, effectIndex) =>
          mapOneEffect(effect, effectIndex, 'beat'),
        ),
      ]);

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

      const imageFit = image.fit || 'cover';
      const objectFitClass = getObjectFitClass(imageFit);
      const filterCss = buildMediaFilter(image.filter, image.colorTint);

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
            ...(filterCss ? { filter: filterCss } : {}),
            ...(image.blendMode && image.blendMode !== 'normal'
              ? { mixBlendMode: image.blendMode }
              : {}),
            ...(image.opacity !== undefined ? { opacity: image.opacity } : {}),
          },
        },
        context: {
          timing: {
            ...(imageStart !== undefined ? { start: imageStart } : {}),
            duration: imageDuration,
          },
        },
        effects: [
          ...imageEffects,
          ...buildImageTransitions(image, imageIndex, effectWindow),
        ],
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

  const hasSlideTransition = images.some(
    (image) =>
      Array.isArray(image?.transitionEffects) &&
      image.transitionEffects.some(
        (tr: any) =>
          typeof tr?.animation === 'string' && tr.animation.startsWith('slide'),
      ),
  );
  if (hasSlideTransition) {
    containerStyle.overflow = 'hidden';
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

  const trackTimeRange = parseTimeRange(legacy.trackRange || '');
  const start =
    legacy.start ??
    legacy.trackStartOffset ??
    trackTimeRange?.start ??
    0;
  const durationFromRange =
    trackTimeRange && trackTimeRange.end > trackTimeRange.start
      ? trackTimeRange.end - trackTimeRange.start
      : undefined;
  const duration = authoredDuration ?? durationFromRange;
  const trackTiming: {
    start: number;
    duration?: number;
    startOffset?: number;
  } = { start };
  // A lock takes its length from the target. Sequence and aligned keep an
  // authored duration when one was written.
  if (!locked && typeof duration === 'number' && duration > 0) {
    trackTiming.duration = duration;
  }
  if (typeof legacy.startOffset === 'number' && legacy.startOffset < 0) {
    trackTiming.startOffset = legacy.startOffset;
  }

  // Sequence stacks images in order. Aligned and lock place each image on
  // its own start, so a range is not a gap after the previous image.
  const trackLayout = sequence ? ('scene' as const) : ('layout' as const);

  return {
    output: {
      childrenData: [
        {
          id: `${params.trackName}`,
          componentId: 'BaseLayout',
          type: trackLayout,
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
    'Apply loop motion, per-image transitions, shake, and beat-synchronized effects to images',
  type: 'predefined',
  presetType: 'children',
  role: 'track',
  tags: ['image', 'effects', 'visual', 'animation', 'beat', 'audio'],
  dependencies: {
    presets: ['beatZoomEffect', 'beatShakeEffect', 'beatExposureEffect'],
  },
  defaultInputParams: {
    trackName: 'imageloop-track',
    trackType: 'lockedTo',
    start: 0,
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
    loopEffects: [
      {
        type: 'pan',
        pan: {
          direction: 'up',
          distance: 200,
          loopTimes: 1,
        },
      },
    ],
    shakeEffects: [],
    beatEffects: [],
  },
};

function clockToSeconds(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  if (text.includes(':')) {
    const parts = text.split(':');
    if (parts.length !== 2 && parts.length !== 3) return null;
    const nums = parts.map((part) => Number(part));
    if (nums.some((num) => Number.isNaN(num))) return null;
    if (nums.length === 2) return nums[0]! * 60 + nums[1]!;
    return nums[0]! * 3600 + nums[1]! * 60 + nums[2]!;
  }
  const plain = Number(text);
  return Number.isNaN(plain) ? null : plain;
}

function clockRange(range: string): { start: number; duration: number } | null {
  const dash = range.indexOf('-', 1);
  if (dash <= 0) return null;
  const start = clockToSeconds(range.slice(0, dash));
  const end = clockToSeconds(range.slice(dash + 1));
  if (start === null || end === null || !(end > start)) return null;
  return { start, duration: end - start };
}

function imagesHaveRanges(images: unknown): boolean {
  const list = Array.isArray(images)
    ? images
    : images && typeof images === 'object' && Array.isArray((images as { items?: unknown }).items)
      ? (images as { items: unknown[] }).items
      : [];
  return list.some(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as { rangeString?: unknown }).rangeString === 'string' &&
      (item as { rangeString: string }).rangeString.trim().length > 0,
  );
}

/** Bring saved imageloop input onto lock / sequence / aligned timing. */
export function migrateImageLoopInputData<T>(data: T): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const next: Record<string, unknown> = { ...(data as Record<string, unknown>) };
  let changed = false;

  if (next.loopEffects == null && Array.isArray(next.effects)) {
    next.loopEffects = next.effects;
    delete next.effects;
    changed = true;
  }

  const fit = next.trackFitDurationTo;
  if (typeof fit === 'string' && fit.trim() && typeof next.lock !== 'string') {
    next.lock = fit;
    changed = true;
  }
  if ('trackFitDurationTo' in next) {
    delete next.trackFitDurationTo;
    changed = true;
  }

  if (typeof next.trackRange === 'string' && next.trackRange.trim()) {
    const parsed = clockRange(next.trackRange);
    if (parsed) {
      if (typeof next.start !== 'number') next.start = parsed.start;
      if (typeof next.duration !== 'number') next.duration = parsed.duration;
    }
    delete next.trackRange;
    changed = true;
  } else if ('trackRange' in next) {
    delete next.trackRange;
    changed = true;
  }

  if (typeof next.start !== 'number' && typeof next.trackStartOffset === 'number') {
    next.start = next.trackStartOffset;
    changed = true;
  }

  if (typeof next.trackType !== 'string') {
    const lock = typeof next.lock === 'string' ? next.lock.trim() : '';
    next.trackType =
      lock || !imagesHaveRanges(next.images) ? 'lockedTo' : 'aligned';
    changed = true;
  }

  return changed ? (next as T) : data;
}

const presetFunction = presetExecution.toString();
const presetParamsSchema = z.toJSONSchema(presetParams);

const imageLoopPreset = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

export { imageLoopPreset };
