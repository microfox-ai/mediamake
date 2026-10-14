/**
 * HTML Block Atom Preset
 *
 * This preset creates HTML block elements that appear at specific time ranges in the composition.
 * It allows you to add custom HTML content with styling that appears and disappears at defined times.
 *
 * Features:
 * - **Time Range Control**: Define when HTML blocks appear using time ranges (MM:SS-MM:SS). No range fills the parent layout.
 * - **Track timing**: Lock to another track, align the blocks on a start and duration, or sequence them
 * - **Custom Styling**: CSS classes and inline styles for HTML blocks
 * - **Flexible Content**: Add any HTML content at specified times
 * - **Multiple Blocks**: Create multiple HTML blocks with different timing
 *
 * Use cases:
 * - Adding custom HTML overlays at specific times
 * - Creating interactive elements in videos
 * - Adding styled HTML content to compositions
 * - Building custom UI elements with precise timing
 */

import { InputCompositionProps } from '@microfox/remotion';
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
    .describe('Name of the track used as prefix for each atom'),
  trackType: z
    .enum(['lockedTo', 'sequence', 'aligned'])
    .default('aligned')
    .describe(
      'Lock copies another track. Sequence plays blocks in order. Aligned keeps each range on its start.',
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
  className: z
    .string()
    .optional()
    .describe('CSS class name for the div blocks'),
  style: z
    .object({
      borderRadius: z.string().optional(),
      padding: z.string().optional(),
      margin: z.string().optional(),
      backgroundColor: z.string().optional(),
      background: z.string().optional(),
    })
    .optional()
    .describe('Inline styles for the div blocks'),
  rangeString: z
    .string()
    .optional()
    .meta({ [paramMetaTypes.rangeField]: true })
    .describe(
      'Time ranges in MM:SS-MM:SS or MM:SS.sss-MM:SS.sss (comma-separated for multiple, e.g. 0:00-2:00,5:00.50-7:00). Leave empty to fill the parent layout.',
    ),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: {
    config: InputCompositionProps['config'];
    fetcher: (url: string, data: any) => Promise<any>;
    helpers?: Record<string, Function>;
  },
): Promise<Partial<PresetOutput>> => {
  const { className, style, trackName } = params;
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

  // Prefer rangeString; fall back to legacy ranges[]
  const rangeString = normalizeRangeString(
    (params as any).rangeString ?? (params as any).ranges,
  );
  const parsedRanges = parseTimeRanges(rangeString).filter(
    (timeRange) => timeRange.end > timeRange.start,
  );

  // Lock copies another track. Sequence packs ranges back to back, so a
  // range contributes its length only. Aligned keeps each range start.
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

  // Create div components for each range. No range means one block that
  // fills the parent layout: omit timing so duration is inherited.
  const divComponents: any[] = [];
  let packed = 0;

  const htmlBlock = (
    index: number,
    timing?: { start?: number; duration: number },
  ) => ({
    id: `${trackName}-html-block-${index}`,
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: `${className ? className : 'w-full h-full flex items-center justify-center'}`,
        style: style || {},
      },
    },
    ...(timing ? { context: { timing } } : {}),
    childrenData: [],
    effects: [],
  });

  if (parsedRanges.length === 0) {
    divComponents.push(htmlBlock(0));
  } else {
    parsedRanges.forEach((timeRange, index) => {
      const start = timeRange.start;
      const duration = timeRange.end - timeRange.start;
      divComponents.push(
        htmlBlock(
          index,
          sequence ? { duration } : { start, duration },
        ),
      );
      packed += duration;
    });
  }

  const maxEnd =
    parsedRanges.length > 0
      ? Math.max(...parsedRanges.map(tr => tr.end))
      : 0;
  const derivedDuration = sequence ? packed : maxEnd;
  const trackTiming: {
    start: number;
    duration?: number;
    startOffset?: number;
  } = { start: trackStart };
  if (!locked) {
    const length = authoredDuration ?? (derivedDuration > 0 ? derivedDuration : undefined);
    if (typeof length === 'number' && length > 0) trackTiming.duration = length;
  }
  if (typeof legacy.startOffset === 'number' && legacy.startOffset < 0) {
    trackTiming.startOffset = legacy.startOffset;
  }
  const trackLayout = sequence ? ('scene' as const) : ('layout' as const);

  return {
    output: {
      childrenData: [
        {
          id: `${trackName}-html-blocks-container`,
          componentId: 'BaseLayout',
          type: trackLayout,
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          context: {
            timing: trackTiming,
          },
          childrenData: divComponents,
          effects: [],
        },
      ],
    },
    options: {
      attachedToId: `BaseScene`,
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'htmlBlockAtom',
  title: 'HTML Block Atom',
  description:
    'Creates div blocks at specific time ranges. With no range, the block fills the parent layout.',
  type: 'predefined',
  presetType: 'children',
  role: 'track',
  tags: ['html', 'div', 'blocks', 'timing', 'layout'],
  defaultInputParams: {
    trackName: 'html-blocks',
    trackType: 'aligned',
    start: 0,
    className:
      'w-full h-full flex items-center justify-center bg-blue-500 text-white text-2xl font-bold',
    style: {
      borderRadius: '8px',
      padding: '20px',
    },
    rangeString: '0:00-2:00,5:00-7:00,10:00-12:00',
  },
};

/** Bring saved HTML block input onto lock / sequence / aligned timing. */
export function migrateHtmlBlockInputData<T>(data: T): T {
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
  return changed ? (next as T) : data;
}

const presetFunction = presetExecution.toString();
const presetParamsSchema = z.toJSONSchema(presetParams);

const htmlBlockAtomPreset = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

export { htmlBlockAtomPreset };
