/**
 * Second Counter Preset
 *
 * Displays a counter (1, 2, 3...) for each second within specified time ranges.
 * Supports imageloop-style rangeString with optional milliseconds (MM:SS.sss).
 * Track timing locks the counter to another track, aligns the ranges, or sequences them.
 */

import { TextAtomData } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { paramMetaTypes } from '../../dataTypes';
import {
  applyLegacyTrackTiming,
  joinRangeList,
} from './track-timing-legacy';

const presetParams = z.object({
  trackName: z
    .string()
    .meta({ [paramMetaTypes.trackName]: true })
    .describe('Name of the track (used for the ID)'),
  trackType: z
    .enum(['lockedTo', 'sequence', 'aligned'])
    .default('aligned')
    .describe(
      'Lock copies another track. Sequence plays ranges in order. Aligned keeps each range on its start.',
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
      'Duration in seconds. Used when the track is aligned. A lock takes its length from the target.',
    ),
  lock: z
    .string()
    .optional()
    .meta({ [paramMetaTypes.lockTarget]: true })
    .describe('Lock start and duration to a sibling or parent track'),
  rangeString: z
    .string()
    .meta({ [paramMetaTypes.rangeField]: true })
    .describe(
      'Time ranges in MM:SS-MM:SS or MM:SS.sss-MM:SS.sss (comma-separated, e.g. 00:00.00-00:09.50,10:00-15:00)',
    ),

  isReverse: z
    .boolean()
    .default(false)
    .optional()
    .describe('If true, counts in reverse from duration to 1'),

  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),

  position: z
    .object({
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
        .describe('Alignment preset'),
    })
    .optional()
    .describe('Positioning configuration'),

  style: z
    .object({
      fontSize: z.number().optional().describe('Font size in pixels'),
      color: z
        .string()
        .optional()
        .describe('Text color (hex, rgb, or named color)'),
      opacity: z.number().min(0).max(1).optional().describe('Opacity (0-1)'),
      textShadow: z
        .string()
        .optional()
        .describe('Text shadow (e.g., "0 2px 4px rgba(0,0,0,0.5)")'),
      backgroundColor: z.string().optional().describe('Background color'),
      padding: z
        .union([z.number(), z.string()])
        .optional()
        .describe('Padding (px)'),
      borderRadius: z.string().optional().describe('Border radius in pixels'),
      border: z
        .string()
        .optional()
        .describe('Border style (e.g., "1px solid #000")'),
      boxShadow: z
        .string()
        .optional()
        .describe('Box shadow (e.g., "0 2px 10px rgba(0,0,0,0.3)")'),
    })
    .optional()
    .describe('Styling configuration'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: {
    helpers?: Record<string, Function>;
  },
): PresetOutput => {
  const { isReverse = false, font, position, style } = params;
  const { helpers } = props;

  const normalizeRangeString = (helpers?.normalizeRangeString ??
    ((v: unknown) => (typeof v === 'string' ? v : ''))) as (
    v: unknown,
  ) => string;
  const parseTimeRange = (helpers?.parseTimeRange ?? (() => null)) as (
    range: string,
  ) => { start: number; end: number } | null;
  const parseTimeRanges = (helpers?.parseTimeRanges ??
    ((s: string) =>
      s
        .split(',')
        .map(x => x.trim())
        .filter(Boolean)
        .map(seg => parseTimeRange(seg))
        .filter((r): r is { start: number; end: number } => r !== null))) as (
    range: string,
  ) => { start: number; end: number }[];

  // Imageloop-style rangeString; accept legacy ranges[] array/string
  const rangeString = normalizeRangeString(
    (params as any).rangeString ?? (params as any).ranges,
  );
  const timeRanges = parseTimeRanges(rangeString);

  const legacy = params as z.infer<typeof presetParams> & {
    trackType?: string;
    start?: number;
    startOffset?: number;
    duration?: number;
    lock?: string;
    trackFitDurationTo?: string;
    trackStartOffset?: number;
    trackDuration?: number;
  };
  const lockTarget =
    (typeof legacy.lock === 'string' && legacy.lock) ||
    (typeof legacy.trackFitDurationTo === 'string' &&
      legacy.trackFitDurationTo) ||
    '';
  const trackType = legacy.trackType;
  const locked =
    trackType === 'lockedTo' ||
    (lockTarget.trim().length > 0 &&
      trackType !== 'sequence' &&
      trackType !== 'aligned');
  const sequence = !locked && trackType === 'sequence';
  const trackStart =
    (typeof legacy.start === 'number' && Number.isFinite(legacy.start)
      ? legacy.start
      : undefined) ??
    (typeof legacy.trackStartOffset === 'number' &&
    Number.isFinite(legacy.trackStartOffset)
      ? legacy.trackStartOffset
      : 0);
  const authoredDuration =
    (typeof legacy.duration === 'number' && legacy.duration > 0
      ? legacy.duration
      : undefined) ??
    (typeof legacy.trackDuration === 'number' && legacy.trackDuration > 0
      ? legacy.trackDuration
      : undefined);

  if (!rangeString.trim() || timeRanges.length === 0) {
    throw new Error(
      `Invalid time range format: ${rangeString || '(empty)'}. Expected MM:SS-MM:SS or MM:SS.sss-MM:SS.sss (comma-separated OK)`,
    );
  }

  const parsedRanges = timeRanges.map((tr, index) => {
    const duration = tr.end - tr.start;
    if (duration <= 0) {
      throw new Error(
        `Invalid time range at index ${index}: end must be after start`,
      );
    }
    return {
      start: tr.start,
      duration,
      originalRange: rangeString.split(',')[index]?.trim() ?? '',
      index,
    };
  });

  for (const parsedRange of parsedRanges) {
    const durationInSeconds = Math.floor(parsedRange.duration);

    if (durationInSeconds <= 0) {
      throw new Error(
        `Range duration must be greater than 0 seconds for range: ${parsedRange.originalRange}`,
      );
    }

    if (durationInSeconds > 3600) {
      throw new Error(
        `Range duration (${durationInSeconds}s) is too long for a counter in range: ${parsedRange.originalRange}. Maximum is 3600 seconds (1 hour).`,
      );
    }
  }

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

  const fontString = font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyleProps: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyleProps.fontStyle = fontParts[2] as any;
      fontStyleProps.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyleProps.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const textStyle: React.CSSProperties = {
    fontSize: style?.fontSize ?? 48,
    color: style?.color ?? '#FFFFFF',
    opacity: style?.opacity ?? 1,
    textShadow: style?.textShadow,
    backgroundColor: style?.backgroundColor,
    padding:
      typeof style?.padding === 'number'
        ? `${style?.padding}px`
        : style?.padding,
    borderRadius: style?.borderRadius,
    border: style?.border,
    boxShadow: style?.boxShadow,
    ...fontStyleProps,
  };

  const fontConfig: any = {
    family: fontFamily,
  };

  if (fontStyleProps.fontWeight) {
    fontConfig.weights = [fontStyleProps.fontWeight.toString()];
  }

  const alignmentStyles = mapAlignmentToFlex(position?.alignment);
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top:
      typeof position?.top === 'number'
        ? `${position?.top}px`
        : (position?.top ?? undefined),
    right:
      typeof position?.right === 'number'
        ? `${position?.right}px`
        : (position?.right ?? undefined),
    bottom:
      typeof position?.bottom === 'number'
        ? `${position?.bottom}px`
        : (position?.bottom ?? undefined),
    left:
      typeof position?.left === 'number'
        ? `${position?.left}px`
        : (position?.left ?? undefined),
    display: 'flex',
    ...alignmentStyles,
  };

  const rangeContainers: any[] = [];
  let packed = 0;

  for (const parsedRange of parsedRanges) {
    const {
      start: rangeStart,
      duration: rangeDuration,
      index: rangeIndex,
    } = parsedRange;

    const durationInSeconds = Math.floor(rangeDuration);
    const totalSeconds = Math.max(1, durationInSeconds);

    const counterComponents: any[] = [];

    for (let i = 0; i < totalSeconds; i++) {
      let counterValue: number;
      if (isReverse) {
        counterValue = totalSeconds - i;
      } else {
        counterValue = i + 1;
      }

      const secondStart = i;
      const secondDuration = 1;

      const textAtomData: TextAtomData = {
        text: counterValue.toString(),
        style: textStyle,
        font: fontConfig,
      };

      counterComponents.push({
        id: `counter-text-${rangeIndex}-${i}`,
        componentId: 'TextAtom',
        type: 'atom' as const,
        data: textAtomData,
        context: {
          timing: {
            start: secondStart,
            duration: secondDuration,
          },
        },
        effects: [],
      });
    }

    rangeContainers.push({
      id: `counter-container-${rangeIndex}`,
      componentId: 'BaseLayout',
      type: 'layout' as const,
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: containerStyle,
        },
      },
      context: {
        timing: sequence
          ? { duration: totalSeconds }
          : {
              start: rangeStart,
              duration: totalSeconds,
            },
      },
      childrenData: counterComponents,
      effects: [],
    });
    packed += totalSeconds;
  }

  const maxEnd = parsedRanges.reduce(
    (max, range) => Math.max(max, range.start + range.duration),
    0,
  );
  const derivedDuration = sequence ? packed : maxEnd;
  const trackTiming: {
    start: number;
    duration?: number;
    startOffset?: number;
  } = { start: trackStart };
  if (!locked) {
    const length =
      authoredDuration ?? (derivedDuration > 0 ? derivedDuration : undefined);
    if (typeof length === 'number' && length > 0) trackTiming.duration = length;
  }
  if (typeof legacy.startOffset === 'number' && legacy.startOffset < 0) {
    trackTiming.startOffset = legacy.startOffset;
  }
  const trackName =
    typeof params.trackName === 'string' && params.trackName.trim()
      ? params.trackName.trim()
      : 'second-counter';

  return {
    output: {
      childrenData: [
        {
          id: trackName,
          componentId: 'BaseLayout',
          type: sequence ? ('scene' as const) : ('layout' as const),
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          context: {
            timing: trackTiming,
          },
          childrenData: rangeContainers,
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'second-counter',
  title: 'Second Counter',
  description:
    'Displays a counter (1, 2, 3...) for each second within specified time ranges. Supports multiple ranges, reverse counting, and customizable positioning, fonts, and styling.',
  type: 'predefined',
  presetType: 'children',
  role: 'track',
  tags: ['counter', 'timer', 'overlay', 'text'],
  defaultInputParams: {
    trackName: 'second-counter',
    trackType: 'aligned',
    start: 0,
    rangeString: '00:00-09:00',
    isReverse: false,
    font: 'Inter:600',
    position: {
      alignment: 'center-center',
    },
    style: {
      fontSize: 48,
      color: '#FFFFFF',
      opacity: 1,
      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
    },
  },
};

/** Bring saved second-counter input onto lock / sequence / aligned timing. */
export function migrateSecondCounterInputData<T>(data: T): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const next: Record<string, unknown> = {
    ...(data as Record<string, unknown>),
  };
  let changed = applyLegacyTrackTiming(next, 'aligned');
  const joined = joinRangeList(next.ranges);
  const current =
    typeof next.rangeString === 'string' ? next.rangeString.trim() : '';
  if (!current && joined) {
    next.rangeString = joined;
    changed = true;
  }
  if ('ranges' in next) {
    delete next.ranges;
    changed = true;
  }
  if (typeof next.trackName !== 'string' || !next.trackName.trim()) {
    next.trackName = 'second-counter';
    changed = true;
  }
  return changed ? (next as T) : data;
}

const presetFunction = presetExecution.toString();
const presetParamsSchema = z.toJSONSchema(presetParams);

const secondCounterPreset = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

export { secondCounterPreset };
