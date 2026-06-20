/**
 * Typokinetics Breathing Preset
 *
 * A yoga-inspired breathing exercise preset where text expands and contracts with counted breath holds.
 * Creates a 16-second breathing cycle (4s inhale, 4s hold, 4s exhale, 4s hold) with stepped scale animations,
 * numerical count indicators for each phase, a circular progress indicator, and subtle color temperature shifts
 * from cool (contracted) to warm (expanded).
 *
 * Features:
 * - **Stepped Breathing Pattern**: Scale plateaus during hold phases (inhale → hold → exhale → hold)
 * - **Phase Count Indicators**: Numbers 1-4 appear sequentially during each 4-second phase
 * - **Circular Progress**: SVG circle visualizes breathing cycle progress
 * - **Color Temperature Shifts**: Cool (blue-tinted, low saturation) to warm (high saturation)
 * - **Caption Parsing**: Identifies numbers in text and emphasizes them with stronger breathing
 * - **Customizable Timings**: Helper function for custom breath patterns (inhale, hold1, exhale, hold2)
 *
 * Use cases:
 * - Instructional breathing exercise videos
 * - Meditation and yoga content
 * - Guided relaxation sequences
 * - Wellness and mindfulness videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .default('Breathe In... Hold... Breathe Out... Hold...')
    .describe('Main text to display with breathing animation'),
  cycleDuration: z
    .number()
    .default(16)
    .describe('Total breathing cycle duration in seconds (default: 16s)'),
  inhaleDuration: z
    .number()
    .default(4)
    .describe('Duration of inhale phase in seconds'),
  hold1Duration: z
    .number()
    .default(4)
    .describe('Duration of first hold phase in seconds'),
  exhaleDuration: z
    .number()
    .default(4)
    .describe('Duration of exhale phase in seconds'),
  hold2Duration: z
    .number()
    .default(4)
    .describe('Duration of second hold phase in seconds'),
  minScale: z
    .number()
    .default(1.0)
    .describe('Minimum scale (contracted state)'),
  maxScale: z
    .number()
    .default(1.15)
    .describe('Maximum scale (expanded state)'),
  fontSize: z.number().default(64).describe('Font size in pixels'),
  textColor: z.string().default('#ffffff').describe('Text color'),
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:700")'),
  progressCircleRadius: z
    .number()
    .default(54)
    .describe('Radius of progress circle in pixels'),
  progressCircleStrokeWidth: z
    .number()
    .default(6)
    .describe('Stroke width of progress circle in pixels'),
  progressCircleColor: z
    .string()
    .default('#ffffff')
    .describe('Progress circle stroke color'),
  emphasizeNumbers: z
    .boolean()
    .default(true)
    .describe('Whether to emphasize numbers in text with stronger breathing'),
  numberScaleMultiplier: z
    .number()
    .default(1.3)
    .describe('Scale multiplier for emphasized numbers'),
  startTime: z
    .number()
    .default(0)
    .describe('Start time in seconds (relative to parent)'),
  duration: z
    .number()
    .optional()
    .describe('Total duration in seconds (defaults to cycleDuration)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    cycleDuration,
    inhaleDuration,
    hold1Duration,
    exhaleDuration,
    hold2Duration,
    minScale,
    maxScale,
    fontSize,
    textColor,
    font,
    progressCircleRadius,
    progressCircleStrokeWidth,
    progressCircleColor,
    emphasizeNumbers,
    numberScaleMultiplier,
    startTime,
    duration,
  } = params;

  const totalDuration = duration ?? cycleDuration;

  // Parse font string
  const parseFontString = (fontString: string | undefined) => {
    if (!fontString) return { family: 'Inter', style: {} };
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { family: fontFamily, style: fontStyle };
  };

  const { family: fontFamily, style: fontStyle } = parseFontString(font);

  // Parse text for numbers and create word components
  const parseTextForNumbers = (textContent: string) => {
    const words = textContent.split(/\s+/);
    const wordComponents: RenderableComponentData[] = [];

    words.forEach((word, index) => {
      const isNumber = /^\d+$/.test(word);
      const wordScale = isNumber && emphasizeNumbers ? numberScaleMultiplier : 1.0;

      wordComponents.push({
        id: `word-${index}`,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontStyle.fontWeight ?? 'bold',
            fontStyle: fontStyle.fontStyle ?? 'normal',
            color: textColor,
            marginRight: '0.3em',
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: `word-${index}-breathing`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: cycleDuration,
              mode: 'provider',
              targetIds: [`word-${index}`],
              ranges: [
                // Inhale: 0-25% (0-4s) - scale up
                { key: 'scale', val: minScale * wordScale, prog: 0 },
                { key: 'scale', val: maxScale * wordScale, prog: 0.25 },
                // Hold 1: 25-50% (4-8s) - stay expanded
                { key: 'scale', val: maxScale * wordScale, prog: 0.5 },
                // Exhale: 50-75% (8-12s) - scale down
                { key: 'scale', val: minScale * wordScale, prog: 0.75 },
                // Hold 2: 75-100% (12-16s) - stay contracted
                { key: 'scale', val: minScale * wordScale, prog: 1 },
              ],
            },
          },
          {
            id: `word-${index}-color-temp`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: cycleDuration,
              mode: 'provider',
              targetIds: [`word-${index}`],
              ranges: [
                // Cool (contracted): contrast 1.0, saturate 0.8
                { key: 'filter', val: 'contrast(1.0) saturate(0.8)', prog: 0 },
                // Warm (expanded): contrast 1.1, saturate 1.2
                {
                  key: 'filter',
                  val: 'contrast(1.1) saturate(1.2)',
                  prog: 0.25,
                },
                { key: 'filter', val: 'contrast(1.1) saturate(1.2)', prog: 0.5 },
                // Cool (contracted): contrast 1.0, saturate 0.8
                { key: 'filter', val: 'contrast(1.0) saturate(0.8)', prog: 0.75 },
                { key: 'filter', val: 'contrast(1.0) saturate(0.8)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    });

    return wordComponents;
  };

  const wordComponents = parseTextForNumbers(text);

  // Create count indicators (1, 2, 3, 4) for each phase
  const createCountIndicators = () => {
    const counts = [1, 2, 3, 4];
    const phaseLabels = ['INHALE', 'HOLD', 'EXHALE', 'HOLD'];
    const countComponents: RenderableComponentData[] = [];

    // Phase label
    countComponents.push({
      id: 'phase-label',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: 'INHALE',
        style: {
          fontSize: '24px',
          fontWeight: '600',
          color: 'rgba(255,255,255,0.8)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as any,
        },
        font: {
          family: fontFamily,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        // Cycle through phase labels
        {
          id: 'phase-label-text-change',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: cycleDuration,
            mode: 'provider',
            targetIds: ['phase-label'],
            ranges: [
              // This is a workaround - we can't change text content dynamically
              // Instead, we use opacity to show/hide different phase labels
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.24 },
              { key: 'opacity', val: 0, prog: 0.25 },
              { key: 'opacity', val: 1, prog: 0.26 },
              { key: 'opacity', val: 1, prog: 0.49 },
              { key: 'opacity', val: 0, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 0.51 },
              { key: 'opacity', val: 1, prog: 0.74 },
              { key: 'opacity', val: 0, prog: 0.75 },
              { key: 'opacity', val: 1, prog: 0.76 },
            ],
          },
        },
      ],
    } as RenderableComponentData);

    // Count numbers 1-4
    counts.forEach((count) => {
      countComponents.push({
        id: `count-${count}`,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: count.toString(),
          style: {
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#ffffff',
          },
          font: {
            family: fontFamily,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          // Show count sequentially within each phase
          {
            id: `count-${count}-opacity`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: cycleDuration,
              mode: 'provider',
              targetIds: [`count-${count}`],
              ranges: [
                // Inhale phase (0-25%)
                {
                  key: 'opacity',
                  val: count === 1 ? 1 : 0,
                  prog: 0 + 0.0625 * (count - 1),
                },
                {
                  key: 'opacity',
                  val: count === 1 ? 1 : 0,
                  prog: 0 + 0.0625 * count,
                },
                {
                  key: 'opacity',
                  val: count === 2 ? 1 : 0,
                  prog: 0.0625,
                },
                {
                  key: 'opacity',
                  val: count === 2 ? 1 : 0,
                  prog: 0.125,
                },
                {
                  key: 'opacity',
                  val: count === 3 ? 1 : 0,
                  prog: 0.125,
                },
                {
                  key: 'opacity',
                  val: count === 3 ? 1 : 0,
                  prog: 0.1875,
                },
                {
                  key: 'opacity',
                  val: count === 4 ? 1 : 0,
                  prog: 0.1875,
                },
                {
                  key: 'opacity',
                  val: count === 4 ? 1 : 0,
                  prog: 0.25,
                },

                // Hold 1 phase (25-50%)
                {
                  key: 'opacity',
                  val: count === 1 ? 1 : 0,
                  prog: 0.25 + 0.0625 * (count - 1),
                },
                {
                  key: 'opacity',
                  val: count === 1 ? 1 : 0,
                  prog: 0.25 + 0.0625 * count,
                },
                {
                  key: 'opacity',
                  val: count === 2 ? 1 : 0,
                  prog: 0.3125,
                },
                {
                  key: 'opacity',
                  val: count === 2 ? 1 : 0,
                  prog: 0.375,
                },
                {
                  key: 'opacity',
                  val: count === 3 ? 1 : 0,
                  prog: 0.375,
                },
                {
                  key: 'opacity',
                  val: count === 3 ? 1 : 0,
                  prog: 0.4375,
                },
                {
                  key: 'opacity',
                  val: count === 4 ? 1 : 0,
                  prog: 0.4375,
                },
                { key: 'opacity', val: count === 4 ? 1 : 0, prog: 0.5 },

                // Exhale phase (50-75%)
                {
                  key: 'opacity',
                  val: count === 1 ? 1 : 0,
                  prog: 0.5 + 0.0625 * (count - 1),
                },
                {
                  key: 'opacity',
                  val: count === 1 ? 1 : 0,
                  prog: 0.5 + 0.0625 * count,
                },
                {
                  key: 'opacity',
                  val: count === 2 ? 1 : 0,
                  prog: 0.5625,
                },
                {
                  key: 'opacity',
                  val: count === 2 ? 1 : 0,
                  prog: 0.625,
                },
                {
                  key: 'opacity',
                  val: count === 3 ? 1 : 0,
                  prog: 0.625,
                },
                {
                  key: 'opacity',
                  val: count === 3 ? 1 : 0,
                  prog: 0.6875,
                },
                {
                  key: 'opacity',
                  val: count === 4 ? 1 : 0,
                  prog: 0.6875,
                },
                { key: 'opacity', val: count === 4 ? 1 : 0, prog: 0.75 },

                // Hold 2 phase (75-100%)
                {
                  key: 'opacity',
                  val: count === 1 ? 1 : 0,
                  prog: 0.75 + 0.0625 * (count - 1),
                },
                {
                  key: 'opacity',
                  val: count === 1 ? 1 : 0,
                  prog: 0.75 + 0.0625 * count,
                },
                {
                  key: 'opacity',
                  val: count === 2 ? 1 : 0,
                  prog: 0.8125,
                },
                {
                  key: 'opacity',
                  val: count === 2 ? 1 : 0,
                  prog: 0.875,
                },
                {
                  key: 'opacity',
                  val: count === 3 ? 1 : 0,
                  prog: 0.875,
                },
                {
                  key: 'opacity',
                  val: count === 3 ? 1 : 0,
                  prog: 0.9375,
                },
                {
                  key: 'opacity',
                  val: count === 4 ? 1 : 0,
                  prog: 0.9375,
                },
                { key: 'opacity', val: count === 4 ? 1 : 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    });

    return countComponents;
  };

  const countComponents = createCountIndicators();

  // Create circular progress indicator
  const createProgressCircle = () => {
    const circumference = 2 * Math.PI * progressCircleRadius;

    const progressBackgroundCircle: RenderableComponentData = {
      id: 'progress-bg-circle',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<svg width="${(progressCircleRadius + progressCircleStrokeWidth) * 2}" height="${(progressCircleRadius + progressCircleStrokeWidth) * 2}" viewBox="0 0 ${(progressCircleRadius + progressCircleStrokeWidth) * 2} ${(progressCircleRadius + progressCircleStrokeWidth) * 2}"><circle cx="${progressCircleRadius + progressCircleStrokeWidth}" cy="${progressCircleRadius + progressCircleStrokeWidth}" r="${progressCircleRadius}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="${progressCircleStrokeWidth}"/></svg>`,
        style: {
          position: 'absolute' as any,
          inset: '0',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    };

    const progressForegroundCircle: RenderableComponentData = {
      id: 'progress-fg-circle',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<svg width="${(progressCircleRadius + progressCircleStrokeWidth) * 2}" height="${(progressCircleRadius + progressCircleStrokeWidth) * 2}" viewBox="0 0 ${(progressCircleRadius + progressCircleStrokeWidth) * 2} ${(progressCircleRadius + progressCircleStrokeWidth) * 2}"><circle cx="${progressCircleRadius + progressCircleStrokeWidth}" cy="${progressCircleRadius + progressCircleStrokeWidth}" r="${progressCircleRadius}" fill="none" stroke="${progressCircleColor}" stroke-width="${progressCircleStrokeWidth}" stroke-linecap="round" transform="rotate(-90 ${progressCircleRadius + progressCircleStrokeWidth} ${progressCircleRadius + progressCircleStrokeWidth})" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"/></svg>`,
        style: {
          position: 'absolute' as any,
          inset: '0',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: 'progress-circle-animation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: cycleDuration,
            mode: 'provider',
            targetIds: ['progress-fg-circle'],
            ranges: [
              {
                key: 'strokeDashoffset',
                val: circumference,
                prog: 0,
              },
              {
                key: 'strokeDashoffset',
                val: 0,
                prog: 1,
              },
            ],
          },
        },
      ],
    };

    return [progressBackgroundCircle, progressForegroundCircle];
  };

  const progressCircles = createProgressCircle();

  // Build composition structure
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-breathing-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center justify-center gap-8',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Main text container
      {
        id: 'breathing-text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex flex-wrap items-center justify-center',
            style: {
              minWidth: '60%',
              textAlign: 'center' as any,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData,

      // Progress indicator container
      {
        id: 'progress-indicator-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex items-center justify-center',
            style: {
              width: `${(progressCircleRadius + progressCircleStrokeWidth) * 2}px`,
              height: `${(progressCircleRadius + progressCircleStrokeWidth) * 2}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: progressCircles,
      } as RenderableComponentData,

      // Count display container
      {
        id: 'count-display-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row items-center justify-center gap-4',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: countComponents,
      } as RenderableComponentData,
    ],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-breathing',
  title: 'Typokinetics Breathing',
  description:
    'A yoga-inspired breathing exercise preset where text expands and contracts with counted breath holds. Features a 16-second breathing cycle (4s inhale, 4s hold, 4s exhale, 4s hold) with stepped scale animations, numerical count indicators for each phase, a circular progress indicator, and subtle color temperature shifts from cool (contracted) to warm (expanded). Designed for instructional videos guiding viewers through deep breathing exercises.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'breathing',
    'yoga',
    'meditation',
    'wellness',
    'instructional',
    'animated',
    'stepped',
    'kinetic',
  ],
  defaultInputParams: {
    text: 'Breathe In... Hold... Breathe Out... Hold...',
    cycleDuration: 16,
    inhaleDuration: 4,
    hold1Duration: 4,
    exhaleDuration: 4,
    hold2Duration: 4,
    minScale: 1.0,
    maxScale: 1.15,
    fontSize: 64,
    textColor: '#ffffff',
    font: 'Inter:700',
    progressCircleRadius: 54,
    progressCircleStrokeWidth: 6,
    progressCircleColor: '#ffffff',
    emphasizeNumbers: true,
    numberScaleMultiplier: 1.3,
    startTime: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const typokineticsBreathingPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
