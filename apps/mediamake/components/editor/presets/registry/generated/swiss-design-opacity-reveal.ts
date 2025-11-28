/**
 * Swiss Design Opacity Reveal Preset
 *
 * A minimalist text reveal preset inspired by Swiss design principles.
 * Features pure opacity transitions with sophisticated cubic-bezier timing,
 * emphasizing restraint and letting typography breathe.
 *
 * Design Philosophy:
 * - No movement, no transforms - only opacity changes
 * - Elegant measured pace with custom cubic-bezier(0.25, 0.46, 0.45, 0.94)
 * - Sequential reveals with 0.6s intervals between lines
 * - High-end motion graphics approach where less is more
 * - Text as part of negative space with composition respect
 *
 * Features:
 * - Pure opacity transitions (0 to 1) over 1.2 seconds
 * - Custom cubic-bezier easing for refined timing
 * - Sequential line reveals with breathing room
 * - Performance-optimized with layout containment
 * - No transform properties to prevent repaints
 * - Pointer-events disabled during animation
 *
 * Use Cases:
 * - High-end brand videos requiring sophistication
 * - Editorial content with refined aesthetics
 * - Minimalist title sequences
 * - Typography-focused reveals
 * - Swiss-inspired motion design
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  lines: z
    .array(z.string())
    .min(1)
    .max(10)
    .describe(
      'Array of text lines to reveal sequentially (1-10 lines supported)',
    ),
  lineStagger: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.6)
    .describe('Time interval between line reveals in seconds (default: 0.6s)'),
  fadeDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(1.2)
    .describe('Duration of each opacity transition in seconds (default: 1.2s)'),
  font: z
    .string()
    .optional()
    .default('Inter:300')
    .describe(
      'Font family with optional weight (e.g., "Inter:300", "Helvetica:400")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .optional()
    .default(48)
    .describe('Base font size in pixels (responsive via Tailwind)'),
  textColor: z
    .string()
    .optional()
    .default('#111827')
    .describe('Text color (default: dark gray for Swiss aesthetic)'),
  containerPadding: z
    .object({
      mobile: z.number().optional().default(48),
      tablet: z.number().optional().default(96),
      desktop: z.number().optional().default(192),
    })
    .optional()
    .default({ mobile: 48, tablet: 96, desktop: 192 })
    .describe('Horizontal padding in pixels for mobile/tablet/desktop'),
  verticalAlignment: z
    .enum(['top', 'center', 'bottom'])
    .optional()
    .default('center')
    .describe('Vertical alignment of text block'),
  lineHeight: z
    .number()
    .min(1)
    .max(2.5)
    .optional()
    .default(1.5)
    .describe('Line height multiplier for text spacing'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    lines,
    lineStagger,
    fadeDuration,
    font,
    fontSize,
    textColor,
    containerPadding,
    verticalAlignment,
    lineHeight,
  } = params;

  // Parse font string
  const parseFontString = (
    fontStr: string,
  ): { family: string; weight?: number } => {
    if (fontStr.includes(':')) {
      const [family, weightStr] = fontStr.split(':');
      const weight = parseInt(weightStr, 10);
      return { family, weight: isNaN(weight) ? undefined : weight };
    }
    return { family: fontStr };
  };

  const parsedFont = parseFontString(font || 'Inter:300');
  const fontFamily = parsedFont.family;
  const fontWeight = parsedFont.weight || 300;

  // Calculate total duration: last line start + fade duration
  const totalDuration =
    lines.length > 0
      ? (lines.length - 1) * lineStagger + fadeDuration
      : fadeDuration;

  // Build vertical alignment class
  const getVerticalAlignmentClass = (): string => {
    switch (verticalAlignment) {
      case 'top':
        return 'justify-start';
      case 'bottom':
        return 'justify-end';
      case 'center':
      default:
        return 'justify-center';
    }
  };

  // Create line components with opacity effects
  const lineComponents: RenderableComponentData[] = lines.map(
    (lineText, index) => {
      const lineId = `swiss-line-${index}`;
      const lineWrapperId = `swiss-line-wrapper-${index}`;
      const lineStart = index * lineStagger;

      // Line wrapper (minimal BaseLayout)
      const lineWrapper: RenderableComponentData = {
        id: lineWrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'w-full',
            style: {
              pointerEvents: 'none' as const,
            },
          },
        },
        context: {
          timing: {
            start: lineStart,
            duration: fadeDuration + 0.6, // Extend slightly beyond fade
          },
        },
        childrenData: [
          {
            id: lineId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: lineText,
              className: 'text-3xl md:text-4xl font-light leading-relaxed',
              style: {
                fontSize,
                color: textColor,
                fontWeight,
                lineHeight,
              },
              font: {
                family: fontFamily,
                weights: [fontWeight.toString()],
                display: 'swap' as const,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: fadeDuration + 0.6,
              },
            },
            effects: [
              {
                id: `fade-${lineId}`,
                componentId: 'generic',
                data: {
                  mode: 'provider' as const,
                  targetIds: [lineId],
                  type: 'cubic-bezier' as const,
                  cubicBezier: [0.25, 0.46, 0.45, 0.94],
                  start: 0,
                  duration: fadeDuration,
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      };

      return lineWrapper;
    },
  );

  // Root container with layout containment
  const rootContainer: RenderableComponentData = {
    id: 'swiss-design-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `min-h-screen flex flex-col ${getVerticalAlignmentClass()} items-start px-12 md:px-24 lg:px-48`,
        style: {
          contain: 'layout' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this' as const,
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
  id: 'swiss-design-opacity-reveal',
  title: 'Swiss Design Opacity Reveal',
  description:
    'Minimalist text reveal with pure opacity transitions and sophisticated timing inspired by Swiss design principles. Features elegant cubic-bezier easing, restraint in motion, and negative space consideration. No transforms, no movement—only opacity and timing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'opacity',
    'swiss',
    'minimal',
    'typography',
    'elegant',
    'cubic-bezier',
  ],
  defaultInputParams: {
    lines: ['Swiss Design', 'Inspired by', 'Minimalism'],
    lineStagger: 0.6,
    fadeDuration: 1.2,
    font: 'Inter:300',
    fontSize: 48,
    textColor: '#111827',
    containerPadding: {
      mobile: 48,
      tablet: 96,
      desktop: 192,
    },
    verticalAlignment: 'center',
    lineHeight: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const swissDesignOpacityRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
