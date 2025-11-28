/**
 * Minimalist Line-by-Line Text Reveal Preset
 *
 * This preset creates a refined, classic line-by-line text reveal effect with smooth fade-in
 * animations. Each line appears sequentially with a subtle opacity transition from 0% to 100%
 * over 0.5 seconds using an ease-out curve, creating a gentle and elegant appearance.
 *
 * Features:
 * - **Sequential Line Reveal**: Lines appear one after another with configurable delay (0.3s default)
 * - **Smooth Fade-In**: Each line transitions from 0% to 100% opacity over 0.5 seconds
 * - **Clean Typography**: Centered layout with generous whitespace and sans-serif font
 * - **GPU Accelerated**: Uses will-change: opacity for optimal performance
 * - **Customizable Timing**: Adjustable fade duration and delay between lines
 * - **Flexible Content**: Supports any number of text lines
 *
 * Technical Details:
 * - Uses BaseLayout with flex-col for vertical centering
 * - Each line wrapped in its own BaseLayout for independent timing
 * - Generic effects with provider mode for opacity animation
 * - Relative timing ensures proper staggered appearance
 * - fitDurationTo: 'children' ensures parent matches content duration
 *
 * Use Cases:
 * - Closing credits with refined timing
 * - Quote displays with elegant reveal
 * - Chapter titles or section breaks
 * - Poetic text presentations
 * - Tutorial step-by-step instructions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  lines: z
    .array(z.string())
    .min(1)
    .describe('Array of text lines to display sequentially'),

  fadeDuration: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.5)
    .optional()
    .describe('Duration of fade-in effect per line in seconds (default: 0.5)'),

  delayBetweenLines: z
    .number()
    .min(0)
    .max(5)
    .default(0.3)
    .optional()
    .describe(
      'Delay between the start of each line fade-in in seconds (default: 0.3)',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels (default: 48)'),

  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family name (default: Inter)'),

  fontWeight: z
    .enum(['100', '200', '300', '400', '500', '600', '700', '800', '900'])
    .default('300')
    .optional()
    .describe('Font weight (default: 300 - light)'),

  textColor: z
    .string()
    .default('#1f2937')
    .optional()
    .describe('Text color in hex or rgba format (default: #1f2937 - gray-800)'),

  letterSpacing: z
    .number()
    .min(-10)
    .max(50)
    .default(2)
    .optional()
    .describe('Letter spacing in pixels (default: 2)'),

  lineHeight: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .optional()
    .describe('Line height multiplier (default: 1.5)'),

  containerPadding: z
    .number()
    .min(0)
    .max(200)
    .default(32)
    .optional()
    .describe('Padding around the container in pixels (default: 32)'),

  lineSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .optional()
    .describe('Vertical spacing between lines in pixels (default: 20)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    lines,
    fadeDuration = 0.5,
    delayBetweenLines = 0.3,
    fontSize = 48,
    fontFamily = 'Inter',
    fontWeight = '300',
    textColor = '#1f2937',
    letterSpacing = 2,
    lineHeight = 1.5,
    containerPadding = 32,
    lineSpacing = 20,
  } = params;

  // Calculate total duration for parent container
  const lastLineStartTime = (lines.length - 1) * delayBetweenLines;
  const totalDuration = lastLineStartTime + fadeDuration + 1; // +1 second buffer to keep last line visible

  // Create line components with staggered timing and fade-in effects
  const lineComponents: RenderableComponentData[] = lines.map(
    (lineText, index) => {
      const lineId = `line-${index}`;
      const lineWrapperId = `line-wrapper-${index}`;
      const effectId = `fade-line-${index}`;

      // Calculate start time for this line (relative to parent)
      const lineStartTime = index * delayBetweenLines;

      // Calculate duration for this line wrapper (should persist until end)
      const lineDuration = totalDuration - lineStartTime;

      // Create text atom
      const textAtom: RenderableComponentData = {
        id: lineId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: lineText,
          className: 'text-center',
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: fontWeight,
            letterSpacing: `${letterSpacing}px`,
            lineHeight: lineHeight,
          },
          font: {
            family: fontFamily,
            weights: [fontWeight],
            display: 'swap',
            preload: true,
          },
        },
        context: {
          timing: {
            start: 0, // Relative to wrapper
            duration: lineDuration,
          },
        },
      };

      // Create wrapper layout for each line with fade-in effect
      const lineWrapper: RenderableComponentData = {
        id: lineWrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'w-full',
            style: {
              willChange: 'opacity',
              marginBottom: index < lines.length - 1 ? `${lineSpacing}px` : 0,
            },
          },
        },
        context: {
          timing: {
            start: lineStartTime, // Relative to parent container
            duration: lineDuration,
          },
        },
        effects: [
          {
            id: effectId,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0, // Effect starts immediately when wrapper appears
              duration: fadeDuration,
              mode: 'provider',
              targetIds: [lineWrapperId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [textAtom],
      };

      return lineWrapper;
    },
  );

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'minimalist-line-reveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'flex flex-col items-center justify-center min-h-screen w-full',
        style: {
          padding: `${containerPadding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: lineComponents,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'minimalist-line-reveal',
  title: 'Minimalist Line-by-Line Text Reveal',
  description:
    'A refined text reveal preset where each line fades in sequentially with smooth opacity transitions. Lines appear one after another with configurable delays, creating an elegant credits-style effect with generous whitespace and clean typography. Each line persists after revealing, building up the full text composition over time.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'sequential',
    'fade-in',
    'minimalist',
    'credits',
    'typography',
    'elegant',
  ],
  defaultInputParams: {
    lines: ['First line of text', 'Second line of text', 'Third line of text'],
    fadeDuration: 0.5,
    delayBetweenLines: 0.3,
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: '300',
    textColor: '#1f2937',
    letterSpacing: 2,
    lineHeight: 1.5,
    containerPadding: 32,
    lineSpacing: 20,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const minimalistLineRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
