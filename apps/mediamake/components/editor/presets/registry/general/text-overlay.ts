/**
 * Text Overlay Preset
 *
 * This preset creates a customizable text overlay with advanced positioning, styling, and animation
 * capabilities. It provides fine-grained control over text appearance and behavior in video compositions.
 *
 * Features:
 * - **Flexible Positioning**: Absolute positioning with top/right/bottom/left values or alignment presets
 * - **Rich Typography**: Custom fonts with weight and style support, letter spacing, text transformations
 * - **Advanced Styling**: Colors, shadows, borders, backgrounds, filters, and backdrop effects
 * - **Smooth Animations**: Multiple transition types including fade, slide, scale, shake, and blur effects
 * - **Track timing**: Lock to another track, or place the overlay on a start and duration
 *
 * Use cases:
 * - Adding titles and captions to videos
 * - Creating animated text overlays with transitions
 * - Building dynamic typography effects
 * - Displaying information cards or callouts
 * - Creating text-based visual effects
 */

import {
  GenericEffectData,
  TextAtomData,
} from '@microfox/remotion';
import z from 'zod';
import { paramInputTypes, paramMetaTypes } from '../../dataTypes';
import {
  definePreset,
  type TrackShellParams,
} from '../../define-preset';
import {
  applyLegacyTrackTiming,
  clockRange,
} from './track-timing-legacy';

interface ShakeEffectData extends GenericEffectData {
  amplitude?: number;
  frequency?: number;
  decay?: boolean;
  axis?: 'x' | 'y' | 'both';
}

const presetParams = z.object({
  text: z
    .string()
    .meta({ [paramMetaTypes.inputType]: paramInputTypes.textarea })
    .describe('Text content to display'),

  // Positioning
  position: z.object({
    top: z
      .union([z.number(), z.string()])
      .optional()
      .describe('Top position (px or %)'),
    right: z
      .union([z.number(), z.string()])
      .optional()
      .describe('Right position (px or %)'),
    bottom: z
      .union([z.number(), z.string()])
      .optional()
      .describe('Bottom position (px or %)'),
    left: z
      .union([z.number(), z.string()])
      .optional()
      .describe('Left position (px or %)'),
    alignment: z
      .enum([
        'top-left',
        'top-center',
        'top-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
        'center-left',
        'center-center',
        'center-right',
      ])
      .optional()
      .describe('Alignment'),
  }),
  style: z
    .object({
      opacity: z.number().min(0).max(1).optional().describe('Opacity (0-1)'),
      padding: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Padding (px)'),
    })
    .loose()
    .optional()
    .meta({
      [paramMetaTypes.textStyle]: true,
      [paramMetaTypes.blockStyle]: true,
    })
    .describe('Style'),

  // In and out animation. When the overlay appears is the track start and duration.
  transitions: z.object({
    // Animation effects
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
      .optional(),
    fadeInDuration: z.number().optional(),
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
      .optional(),
    fadeOutDuration: z.number().optional(),
  }),
});

const presetExecution = (
  params: z.infer<typeof presetParams> & TrackShellParams,
  props?: {
    helpers?: Record<string, Function>;
  },
) => {
  const {
    text,
    position,
    style,
    transitions,
  } = params;
  const legacyParams = params as {
    fontFamily?: string;
    fontSize?: number;
    letterSpacing?: number;
    color?: string;
    opacity?: number;
  };
  const legacyTransitions = (
    params as { transitions?: { range?: string | null; startOffset?: number; duration?: number } }
  ).transitions;

  const parseTimeRange = (props?.helpers?.parseTimeRange ?? (() => null)) as (
    range: string,
  ) => { start: number; end: number } | null;

  const generateId = () => {
    return `${Math.random().toString(36).substring(2, 15)}`;
  };

  // Parse range string (imageloop-style MM:SS-MM:SS) to startOffset and duration
  const parseRange = (
    range: string | null | undefined,
  ): { startOffset?: number; duration?: number } | null => {
    if (!range || range.trim() === '') {
      return null;
    }
    const timeRange = parseTimeRange(range);
    if (!timeRange || timeRange.end <= timeRange.start) {
      return null;
    }
    return {
      startOffset: timeRange.start,
      duration: timeRange.end - timeRange.start,
    };
  };
  const textAtomId = `text-atom-${generateId()}`;

  // Map alignment keywords to flexbox alignments
  const mapAlignmentToFlex = (
    alignment?:
      | 'top-left'
      | 'top-center'
      | 'top-right'
      | 'bottom-left'
      | 'bottom-center'
      | 'bottom-right'
      | 'center-left'
      | 'center-center'
      | 'center-right',
  ) => {
    switch (alignment) {
      case 'top-left':
        return {
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        } as const;
      case 'top-center':
        return { alignItems: 'flex-start', justifyContent: 'center' } as const;
      case 'top-right':
        return {
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
        } as const;
      case 'center-left':
        return { alignItems: 'center', justifyContent: 'flex-start' } as const;
      case 'center-center':
        return { alignItems: 'center', justifyContent: 'center' } as const;
      case 'center-right':
        return { alignItems: 'center', justifyContent: 'flex-end' } as const;
      case 'bottom-left':
        return {
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
        } as const;
      case 'bottom-center':
        return { alignItems: 'flex-end', justifyContent: 'center' } as const;
      case 'bottom-right':
        return { alignItems: 'flex-end', justifyContent: 'flex-end' } as const;
      default:
        return { alignItems: 'center', justifyContent: 'center' } as const;
    }
  };

  // Typography and block controls write CSS onto `style`. Older overlays
  // stored the same values as fontFamily / fontSize / letterSpacing / textColor.
  const styleRecord: Record<string, any> =
    style && typeof style === 'object' ? { ...style } : {};
  const otherProps =
    styleRecord.otherProps && typeof styleRecord.otherProps === 'object'
      ? (styleRecord.otherProps as Record<string, any>)
      : undefined;
  const containerFilter =
    typeof styleRecord.filter === 'string' ? styleRecord.filter : undefined;
  const legacyTextColor = styleRecord.textColor;
  delete styleRecord.otherProps;
  delete styleRecord.filter;
  delete styleRecord.textColor;

  let parsedFontFamily =
    typeof styleRecord.fontFamily === 'string' && styleRecord.fontFamily.trim()
      ? styleRecord.fontFamily
      : 'Inter';
  let parsedWeight = styleRecord.fontWeight;
  let parsedFontStyle = styleRecord.fontStyle;
  const legacyFont =
    styleRecord.fontFamily == null || styleRecord.fontFamily === ''
      ? legacyParams.fontFamily
      : undefined;
  if (typeof legacyFont === 'string' && legacyFont.trim()) {
    if (legacyFont.includes(':')) {
      const fontParts = legacyFont.split(':');
      parsedFontFamily = fontParts[0] || 'Inter';
      if (parsedWeight == null && fontParts.length > 1) {
        const weight = parseInt(fontParts[1], 10);
        if (!Number.isNaN(weight)) parsedWeight = weight;
      }
      if (!parsedFontStyle && fontParts.length > 2 && fontParts[2]) {
        parsedFontStyle =
          fontParts[2].toLowerCase() === 'italic' ? 'italic' : fontParts[2];
      }
    } else {
      parsedFontFamily = legacyFont;
    }
  }

  const letterSpacing =
    styleRecord.letterSpacing != null
      ? styleRecord.letterSpacing
      : typeof legacyParams.letterSpacing === 'number'
        ? `${legacyParams.letterSpacing}px`
        : undefined;
  const padding = styleRecord.padding;
  const borderRadius = styleRecord.borderRadius;

  const textStyle: React.CSSProperties = {
    ...(otherProps ?? {}),
    ...styleRecord,
    fontFamily: parsedFontFamily,
    fontSize:
      styleRecord.fontSize ??
      (typeof legacyParams.fontSize === 'number' ? legacyParams.fontSize : 24),
    color:
      legacyTextColor ??
      styleRecord.color ??
      (typeof legacyParams.color === 'string' ? legacyParams.color : '#FFFFFF'),
    ...(letterSpacing != null ? { letterSpacing } : {}),
    ...(parsedWeight != null ? { fontWeight: parsedWeight } : {}),
    ...(parsedFontStyle ? { fontStyle: parsedFontStyle } : {}),
    opacity:
      styleRecord.opacity ??
      (typeof legacyParams.opacity === 'number'
        ? legacyParams.opacity
        : undefined),
    padding: typeof padding === 'number' ? `${padding}px` : padding,
    borderRadius:
      typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
  };
  const restingOpacity =
    typeof textStyle.opacity === 'number' ? textStyle.opacity : 1;

  // Build transition effects similar to video-overlay-effects
  const createTransitionEffects = (
    isFadeIn: boolean = true,
  ): (GenericEffectData | ShakeEffectData)[] => {
    const effects: (GenericEffectData | ShakeEffectData)[] = [];
    const transition = isFadeIn
      ? transitions?.fadeInTransition
      : transitions?.fadeOutTransition;
    const effectDuration = isFadeIn
      ? transitions?.fadeInDuration
      : transitions?.fadeOutDuration;

    if (!transition || transition === 'none') return effects;

    const transitionDuration = effectDuration || (isFadeIn ? 1.0 : 1.0);
    const parsedRange = parseRange(legacyTransitions?.range);
    const legacy = params as {
      duration?: number;
      trackDuration?: number;
    };
    const totalDuration =
      (typeof legacy.duration === 'number' && legacy.duration > 0
        ? legacy.duration
        : undefined) ??
      (typeof legacy.trackDuration === 'number' && legacy.trackDuration > 0
        ? legacy.trackDuration
        : undefined) ??
      parsedRange?.duration ??
      (typeof legacyTransitions?.duration === 'number' &&
      legacyTransitions.duration > 0
        ? legacyTransitions.duration
        : 20);

    // Effects start times are relative ot the starts of the targeting atom.
    const startTime = isFadeIn
      ? 0
      : Math.max(0, totalDuration - transitionDuration);

    // Only add opacity effect for pure opacity transitions or as base for other effects
    if (
      transition === 'opacity' ||
      transition.includes('slide') ||
      transition.includes('scale') ||
      transition.includes('blur')
    ) {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'ease-in-out',
        ranges: [
          {
            key: 'opacity',
            val: isFadeIn ? 0 : (restingOpacity),
            prog: 0,
          },
          {
            key: 'opacity',
            val: isFadeIn ? (restingOpacity) : 0,
            prog: 1,
          },
        ],
      });
    }

    if (transition.includes('slide-in') || transition.includes('slide-out')) {
      const direction = transition.split('-')[2];
      const isSlideIn = transition.includes('slide-in');

      if (direction === 'right' || direction === 'left') {
        effects.push({
          start: startTime,
          duration: transitionDuration * 0.8,
          mode: 'provider',
          targetIds: [textAtomId],
          type: isSlideIn ? 'ease-out' : 'ease-in',
          ranges: [
            {
              key: 'translateX',
              val: isSlideIn
                ? direction === 'right'
                  ? '100px'
                  : '-100px'
                : direction === 'right'
                  ? '-100px'
                  : '100px',
              prog: 0,
            },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        });
      }

      if (direction === 'top' || direction === 'bottom') {
        effects.push({
          start: startTime,
          duration: transitionDuration * 0.8,
          mode: 'provider',
          targetIds: [textAtomId],
          type: isSlideIn ? 'ease-out' : 'ease-in',
          ranges: [
            {
              key: 'translateY',
              val: isSlideIn
                ? direction === 'top'
                  ? '-100px'
                  : '100px'
                : direction === 'top'
                  ? '100px'
                  : '-100px',
              prog: 0,
            },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        });
      }
    }

    if (transition === 'scale-in') {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'ease-out',
        ranges: [
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      });
    }

    if (transition === 'scale-out') {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'ease-in',
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.1, prog: 1 },
        ],
      });
    }

    if (transition === 'blur-in') {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'ease-out',
        ranges: [
          { key: 'blur', val: '10px', prog: 0 },
          { key: 'blur', val: '0px', prog: 1 },
        ],
      });
    }

    if (transition === 'blur-out') {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'ease-in',
        ranges: [
          { key: 'blur', val: '0px', prog: 0 },
          { key: 'blur', val: '10px', prog: 1 },
        ],
      });
    }

    // Shake effects - use shake component instead of generic
    if (transition === 'shake-in') {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'linear',
        amplitude: 3,
        frequency: 1,
        decay: true,
        axis: 'both',
      } as ShakeEffectData);
      effects.push({
        start: startTime,
        duration: 0.5,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'ease-in-out',
        ranges: [
          {
            key: 'opacity',
            val: isFadeIn ? 0 : (restingOpacity),
            prog: 0,
          },
          {
            key: 'opacity',
            val: isFadeIn ? (restingOpacity) : 0,
            prog: 1,
          },
        ],
      });
    }

    if (transition === 'shake-out') {
      effects.push({
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        type: 'linear',
        amplitude: 10,
        frequency: 1,
        decay: false,
        axis: 'both',
      } as ShakeEffectData);
    }

    return effects;
  };

  const transitionEffects = [
    ...createTransitionEffects(true),
    ...createTransitionEffects(false),
  ];
  const effects = transitionEffects.map((effect, index) => {
    const isShakeEffect = 'amplitude' in effect;
    return {
      id: `text-overlay-effect-${generateId()}`,
      componentId: isShakeEffect ? 'shake' : 'generic',
      data: effect,
    };
  });

  // Text atom data
  const textAtomData: TextAtomData = {
    text,
    style: textStyle,
    font: {
      family:
        String(parsedFontFamily).split(',')[0]?.replace(/["']/g, '').trim() ||
        'Inter',
      ...(parsedWeight != null ? { weights: [String(parsedWeight)] } : {}),
    },
  };

  // Minimal container; styling handled by textStyle positioning
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top:
      typeof position?.top === 'number'
        ? `${position?.top}px`
        : (position?.top ?? '0px'),
    right:
      typeof position?.right === 'number'
        ? `${position?.right}px`
        : (position?.right ?? '0px'),
    bottom:
      typeof position?.bottom === 'number'
        ? `${position?.bottom}px`
        : (position?.bottom ?? '0px'),
    left:
      typeof position?.left === 'number'
        ? `${position?.left}px`
        : (position?.left ?? '0px'),
    filter: containerFilter,
    display: 'flex',
    flexDirection: 'row',
    ...mapAlignmentToFlex(position?.alignment),
    ...(otherProps ?? {}),
  };

  const legacyRange = parseRange(legacyTransitions?.range);
  const fallbackDuration =
    legacyRange?.duration ??
    (typeof legacyTransitions?.duration === 'number' &&
    legacyTransitions.duration > 0
      ? legacyTransitions.duration
      : undefined);

  return {
    children: [
      {
        id: textAtomId,
        componentId: 'TextAtom',
        type: 'atom' as const,
        effects,
        data: textAtomData,
      },
    ],
    containerProps: {
      className: 'absolute inset-0',
      style: containerStyle,
    },
    start: legacyRange?.startOffset ?? legacyTransitions?.startOffset,
    duration: fallbackDuration,
  };
};

const presetMetadata = {
  id: 'text-overlay',
  title: 'Text Overlay',
  description:
    'A customizable text overlay with positioning, styling, and animation controls',
  type: 'predefined' as const,
  presetType: 'children' as const,
  role: 'track' as const,
  tags: ['text', 'overlay', 'typography', 'positioning', 'animation'],
  defaultInputParams: {
    trackName: 'text-overlay',
    trackType: 'aligned',
    start: 0,
    duration: 20,
    attachedToId: 'BaseScene',
    text: 'Your Text Here',
    position: {
      alignment: 'center-center',
    },
    style: {
      fontFamily: 'Inter',
      fontWeight: 600,
      fontSize: 32,
      color: '#FFFFFF',
      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
      opacity: 1,
    },
    transitions: {
      fadeInTransition: 'opacity',
      fadeInDuration: 1,
      fadeOutTransition: 'none',
      fadeOutDuration: 1,
    },
  },
};

/** Bring saved text overlay input onto lock / sequence / aligned timing. */
export function migrateTextOverlayInputData<T>(data: T): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const next: Record<string, unknown> = {
    ...(data as Record<string, unknown>),
  };
  let changed = applyLegacyTrackTiming(next, 'aligned');

  const rawTransitions = next.transitions;
  if (rawTransitions && typeof rawTransitions === 'object' && !Array.isArray(rawTransitions)) {
    const transitions: Record<string, unknown> = {
      ...(rawTransitions as Record<string, unknown>),
    };
    let transitionsChanged = false;
    if (typeof transitions.range === 'string' && transitions.range.trim()) {
      const parsed = clockRange(transitions.range);
      if (parsed) {
        if (typeof next.start !== 'number') next.start = parsed.start;
        if (typeof next.duration !== 'number') next.duration = parsed.duration;
      }
      delete transitions.range;
      transitionsChanged = true;
    } else if ('range' in transitions) {
      delete transitions.range;
      transitionsChanged = true;
    }
    if (typeof next.start !== 'number' && typeof transitions.startOffset === 'number') {
      next.start = transitions.startOffset;
      transitionsChanged = true;
    }
    if ('startOffset' in transitions) {
      delete transitions.startOffset;
      transitionsChanged = true;
    }
    if (
      typeof next.duration !== 'number' &&
      typeof transitions.duration === 'number' &&
      transitions.duration > 0
    ) {
      next.duration = transitions.duration;
      transitionsChanged = true;
    }
    if ('duration' in transitions) {
      delete transitions.duration;
      transitionsChanged = true;
    }
    if (transitionsChanged) {
      next.transitions = transitions;
      changed = true;
    }
  }

  const rawStyle = next.style;
  const style: Record<string, unknown> =
    rawStyle && typeof rawStyle === 'object' && !Array.isArray(rawStyle)
      ? { ...(rawStyle as Record<string, unknown>) }
      : {};
  let styleChanged = false;

  if (typeof next.fontFamily === 'string' && next.fontFamily.trim()) {
    const parts = next.fontFamily.split(':');
    const family = parts[0]?.trim();
    if (family && style.fontFamily == null) {
      style.fontFamily = family;
      styleChanged = true;
    }
    if (parts.length > 1 && style.fontWeight == null) {
      const weight = parseInt(parts[1] ?? '', 10);
      if (!Number.isNaN(weight)) {
        style.fontWeight = weight;
        styleChanged = true;
      }
    }
    if (parts.length > 2 && style.fontStyle == null && parts[2]?.trim()) {
      const token = parts[2].trim();
      style.fontStyle = token.toLowerCase() === 'italic' ? 'italic' : token;
      styleChanged = true;
    }
  }
  if ('fontFamily' in next) {
    delete next.fontFamily;
    changed = true;
  }

  if (typeof next.fontSize === 'number' && style.fontSize == null) {
    style.fontSize = next.fontSize;
    styleChanged = true;
  }
  if ('fontSize' in next) {
    delete next.fontSize;
    changed = true;
  }

  if (style.letterSpacing == null && next.letterSpacing != null && next.letterSpacing !== '') {
    style.letterSpacing =
      typeof next.letterSpacing === 'number'
        ? `${next.letterSpacing}px`
        : next.letterSpacing;
    styleChanged = true;
  }
  if ('letterSpacing' in next) {
    delete next.letterSpacing;
    changed = true;
  }

  if (typeof style.textColor === 'string' && style.textColor.trim()) {
    style.color = style.textColor;
    delete style.textColor;
    styleChanged = true;
  } else if ('textColor' in style) {
    delete style.textColor;
    styleChanged = true;
  }

  if (typeof next.color === 'string' && next.color.trim() && style.color == null) {
    style.color = next.color;
    styleChanged = true;
  }
  if ('color' in next) {
    delete next.color;
    changed = true;
  }

  if (typeof next.opacity === 'number' && style.opacity == null) {
    style.opacity = next.opacity;
    styleChanged = true;
  }
  if ('opacity' in next) {
    delete next.opacity;
    changed = true;
  }

  const otherProps = style.otherProps;
  if (otherProps && typeof otherProps === 'object' && !Array.isArray(otherProps)) {
    for (const [key, value] of Object.entries(otherProps as Record<string, unknown>)) {
      if (style[key] == null) style[key] = value;
    }
    delete style.otherProps;
    styleChanged = true;
  }

  if (styleChanged) {
    next.style = style;
    changed = true;
  }

  if (typeof next.trackName !== 'string' || !next.trackName.trim()) {
    next.trackName = 'text-overlay';
    changed = true;
  }

  return changed ? (next as T) : data;
}

const textOverlayPreset = definePreset({
  placement: 'container',
  metadata: presetMetadata,
  params: presetParams,
  build: presetExecution,
});

export { textOverlayPreset };
