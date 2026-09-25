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
      'Time ranges in MM:SS-MM:SS format (comma-separated for multiple, e.g. 0:00-2:00,5:00-7:00)',
    ),
  /** @deprecated Prefer rangeString — kept for legacy saved presets */
  ranges: z.array(z.string()).optional(),
  trackName: z
    .string()
    .describe('Name of the track used as prefix for each atom'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: {
    config: InputCompositionProps['config'];
    fetcher: (url: string, data: any) => Promise<any>;
  },
): Promise<Partial<PresetOutput>> => {
  const { className, style, trackName } = params;

  const { config } = props;

  // Prefer rangeString (comma-separated); fall back to legacy ranges[]
  const ranges: string[] =
    typeof params.rangeString === 'string' && params.rangeString.trim()
      ? params.rangeString
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : Array.isArray(params.ranges)
        ? params.ranges.filter(r => typeof r === 'string' && r.trim())
        : [];

  // Helper function to parse time string (e.g., "0:30" to 30 seconds)
  const parseTimeString = (timeStr: string): number => {
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return minutes * 60 + seconds;
  };

  // Helper function to parse range string (e.g., "0:30-1:15" to { start: 30, end: 75 })
  const parseRangeString = (
    rangeStr: string,
  ): { start: number; end: number } => {
    const [startStr, endStr] = rangeStr.split('-');
    return {
      start: parseTimeString(startStr.trim()),
      end: parseTimeString(endStr.trim()),
    };
  };

  // Create div components for each range
  const divComponents: any[] = [];

  ranges.forEach((rangeStr, index) => {
    const { start, end } = parseRangeString(rangeStr);
    const duration = end - start;

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
              duration:
                ranges.length > 0
                  ? Math.max(
                      ...ranges.map(range => parseRangeString(range).end),
                    )
                  : 0,
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
