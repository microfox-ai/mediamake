/**
 * HTML Block Atom Preset
 *
 * This preset creates HTML block elements that appear at specific time ranges in the composition.
 * It allows you to add custom HTML content with styling that appears and disappears at defined times.
 *
 * Features:
 * - **Time Range Control**: Define when HTML blocks appear using time ranges (MM:SS-MM:SS)
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

const presetParams = z.object({
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
    .meta({ [paramMetaTypes.rangeField]: true })
    .describe(
      'Time ranges in MM:SS-MM:SS or MM:SS.sss-MM:SS.sss (comma-separated for multiple, e.g. 0:00-2:00,5:00.50-7:00)',
    ),
  trackName: z
    .string()
    .describe('Name of the track used as prefix for each atom'),
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
  const parsedRanges = parseTimeRanges(rangeString);

  // Create div components for each range
  const divComponents: any[] = [];

  parsedRanges.forEach((timeRange, index) => {
    if (timeRange.end <= timeRange.start) return;
    const start = timeRange.start;
    const duration = timeRange.end - timeRange.start;

    const divComponent = {
      id: `${trackName}-html-block-${index}`,
      componentId: 'BaseLayout', // Using BaseLayout as specified
      type: 'layout' as const,
      data: {
        containerProps: {
          className: `${className ? className : 'w-full h-full flex items-center justify-center'}`,
          style: style || {},
        },
      },
      context: {
        timing: {
          start: start,
          duration: duration,
        },
      },
      childrenData: [],
      effects: [],
    };

    divComponents.push(divComponent);
  });

  const maxEnd =
    parsedRanges.length > 0
      ? Math.max(...parsedRanges.map(tr => tr.end))
      : 0;

  return {
    output: {
      childrenData: [
        {
          id: `${trackName}-html-blocks-container`,
          componentId: 'BaseLayout',
          type: 'layout' as const,
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: maxEnd,
            },
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
    'Creates div blocks at specific time ranges with customizable styling',
  type: 'predefined',
  presetType: 'children',
  tags: ['html', 'div', 'blocks', 'timing', 'layout'],
  defaultInputParams: {
    className:
      'w-full h-full flex items-center justify-center bg-blue-500 text-white text-2xl font-bold',
    style: {
      borderRadius: '8px',
      padding: '20px',
    },
    rangeString: '0:00-2:00,5:00-7:00,10:00-12:00',
    trackName: 'html-blocks',
  },
};

const presetFunction = presetExecution.toString();
const presetParamsSchema = z.toJSONSchema(presetParams);

const htmlBlockAtomPreset = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

export { htmlBlockAtomPreset };
