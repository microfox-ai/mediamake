/**
 * Second Counter Preset
 *
 * This preset creates a counter that displays numbers (1, 2, 3, 4...) for each second
 * within a specified time range. The counter can count forward or in reverse based on
 * the range duration.
 *
 * Features:
 * - **Multiple Time Ranges**: Accepts an array of time ranges in MM:SS-MM:SS format (e.g., ["00:00-09:00", "10:00-15:00"])
 * - **Second-by-Second Display**: Shows a counter number for each second in each range
 * - **Reverse Counting**: Optional reverse mode that counts down from duration to 1
 * - **Flexible Positioning**: Custom positioning with top/right/bottom/left or alignment presets
 * - **Font Control**: Custom font family, weight, and style support
 * - **Styling Options**: Colors, shadows, borders, backgrounds, and more
 *
 * Use cases:
 * - Countdown timers
 * - Progress indicators
 * - Time-based overlays
 * - Video editing markers
 */

import { TextAtomData } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';

const presetParams = z.object({
  // Time ranges input (e.g., ["00:00-09:00", "10:00-15:00"])
  ranges: z
    .array(z.string())
    .min(1)
    .describe(
      'Array of time ranges in MM:SS-MM:SS format (e.g., ["00:00-09:00", "10:00-15:00"])',
    ),

  // Reverse counting option
  isReverse: z
    .boolean()
    .default(false)
    .optional()
    .describe('If true, counts in reverse from duration to 1'),

  // Font configuration (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  // Examples: "Roboto:600:italic", "Inter:700", "BebasNeue"
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),

  // Positioning
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

  // Styling
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
  props: any,
): PresetOutput => {
  const { ranges, isReverse = false, font, position, style } = params;

  // Helper function to parse time range (MM:SS-MM:SS format)
  const parseTimeRange = (
    range: string,
  ): { start: number; duration: number } | null => {
    if (!range) return null;

    const match = range.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const startMinutes = parseInt(match[1], 10);
    const startSeconds = parseInt(match[2], 10);
    const endMinutes = parseInt(match[3], 10);
    const endSeconds = parseInt(match[4], 10);

    const start = startMinutes * 60 + startSeconds;
    const end = endMinutes * 60 + endSeconds;
    const duration = end - start;

    if (duration <= 0) return null; // Invalid range if end <= start

    return { start, duration };
  };

  // Parse all time ranges
  const parsedRanges = ranges.map((range, index) => {
    const parsed = parseTimeRange(range);
    if (!parsed) {
      throw new Error(
        `Invalid time range format at index ${index}: ${range}. Expected format: MM:SS-MM:SS`,
      );
    }
    return { ...parsed, originalRange: range, index };
  });

  // Validate all ranges
  for (const parsedRange of parsedRanges) {
    const durationInSeconds = Math.floor(parsedRange.duration);

    if (durationInSeconds <= 0) {
      throw new Error(
        `Range duration must be greater than 0 seconds for range: ${parsedRange.originalRange}`,
      );
    }

    // Validate that duration is reasonable (not more than 1 hour for a counter)
    if (durationInSeconds > 3600) {
      throw new Error(
        `Range duration (${durationInSeconds}s) is too long for a counter in range: ${parsedRange.originalRange}. Maximum is 3600 seconds (1 hour).`,
      );
    }
  }

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

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
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

  // Build text style (shared across all ranges)
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
    ...fontStyleProps, // Apply font weight and style to text style
  };

  // Build font configuration for TextAtom
  const fontConfig: any = {
    family: fontFamily,
  };

  if (fontStyleProps.fontWeight) {
    fontConfig.weights = [fontStyleProps.fontWeight.toString()];
  }

  // Build container style for positioning (shared across all ranges)
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

  // Generate containers for each range
  const rangeContainers: any[] = [];

  for (const parsedRange of parsedRanges) {
    const {
      start: rangeStart,
      duration: rangeDuration,
      index: rangeIndex,
    } = parsedRange;

    // Calculate duration in whole seconds
    const durationInSeconds = Math.floor(rangeDuration);
    const totalSeconds = Math.max(1, durationInSeconds);

    // Generate counter text components for each second in this range
    const counterComponents: any[] = [];

    for (let i = 0; i < totalSeconds; i++) {
      // Calculate counter value (counting seconds within the range)
      // Forward: 1, 2, 3, 4, ..., totalSeconds (first second of range = 1, second = 2, etc.)
      // Reverse: totalSeconds, totalSeconds-1, ..., 2, 1 (first second of range = totalSeconds, last = 1)
      let counterValue: number;
      if (isReverse) {
        // Count down from totalSeconds to 1
        counterValue = totalSeconds - i;
      } else {
        // Count up from 1 to totalSeconds
        counterValue = i + 1;
      }

      // Calculate timing for this second (relative to container start, which is at rangeStart)
      // Each counter displays for exactly 1 second
      const secondStart = i; // Relative to container start (which is at rangeStart)
      const secondDuration = 1; // Each counter displays for 1 second

      // Text atom data
      const textAtomData: TextAtomData = {
        text: counterValue.toString(),
        style: textStyle,
        font: fontConfig,
      };

      // Create text atom component
      const textAtomComponent = {
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
      };

      counterComponents.push(textAtomComponent);
    }

    // Create container for this range
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
        timing: {
          start: rangeStart,
          duration: totalSeconds, // Use exact number of seconds to match counter components
        },
      },
      childrenData: counterComponents,
      effects: [],
    });
  }

  return {
    output: {
      childrenData: rangeContainers,
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
  tags: ['counter', 'timer', 'overlay', 'text', 'private'],
  defaultInputParams: {
    ranges: ['00:00-09:00'],
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

const presetFunction = presetExecution.toString();
const presetParamsSchema = z.toJSONSchema(presetParams);

const presetData = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

export { presetData };
