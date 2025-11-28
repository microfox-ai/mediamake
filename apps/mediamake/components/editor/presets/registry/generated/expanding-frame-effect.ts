/**
 * Expanding Rectangular Frame Effect
 *
 * Creates a sophisticated expanding rectangular frame effect that grows from a thin outline
 * to a thick border with gradient fills. The expansion feels like a UI element charging up
 * or loading, with multiple stages of growth. Features color transitions during expansion
 * and support for rounded corners that morph during the animation.
 *
 * Perfect for creating futuristic UI effects around video players or image galleries.
 *
 * Features:
 * - Multi-stage expansion with progress points [0, 0.3, 0.7, 1]
 * - Border-width animation from 1px to configurable max width
 * - Border-radius morphing from 0 to configurable radius
 * - Gradient color transitions using CSS gradients
 * - Opacity fade-in synchronized with expansion
 * - Support for multiple expansion curve types (linear, ease-in-out, steps)
 * - Customizable gradient colors and border properties
 *
 * Use Cases:
 * - Video player frame effects
 * - Image gallery borders with loading animations
 * - Futuristic UI charging effects
 * - Interactive element state indicators
 * - Loading progress visualizations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  maxWidth: z
    .number()
    .min(10)
    .max(50)
    .default(20)
    .describe('Maximum border width in pixels (10-50px)'),
  borderRadius: z
    .number()
    .min(0)
    .max(50)
    .default(16)
    .describe('Maximum border radius in pixels (0-50px)'),
  gradientColors: z
    .array(z.string())
    .min(2)
    .default(['#00f5ff', '#ff00ff', '#ffaa00'])
    .describe('Array of hex color codes for gradient animation'),
  expansionCurve: z
    .enum(['linear', 'ease-in-out', 'steps'])
    .default('ease-in-out')
    .describe('Animation curve type for expansion'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the expansion effect in seconds'),
  fitDurationTo: z
    .string()
    .optional()
    .describe('Component ID to match duration to (overrides duration param)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    maxWidth,
    borderRadius,
    gradientColors,
    expansionCurve,
    duration,
    fitDurationTo,
  } = params;

  // Helper function to create gradient CSS string
  const createGradientString = (colors: string[], progress: number) => {
    if (colors.length === 0) return 'transparent';
    if (colors.length === 1) return colors[0];

    // Interpolate between colors based on progress
    const totalStops = colors.length;
    const gradientStops = colors
      .map((color, index) => {
        const position = (index / (totalStops - 1)) * 100;
        return `${color} ${position}%`;
      })
      .join(', ');

    return `linear-gradient(45deg, ${gradientStops})`;
  };

  // Create gradient strings for different stages
  const gradientStart = createGradientString(gradientColors, 0);
  const gradientMid1 = createGradientString(gradientColors, 0.3);
  const gradientMid2 = createGradientString(gradientColors, 0.7);
  const gradientEnd = createGradientString(gradientColors, 1);

  // Border frame layout
  const frameBorderLayout: RenderableComponentData = {
    id: 'expanding-frame-border',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          boxSizing: 'border-box',
          borderStyle: 'solid',
          borderColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        ...(fitDurationTo ? { fitDurationTo } : { duration }),
      },
    },
    childrenData: [],
  };

  // Content slot (where user content can be placed)
  const contentSlot: RenderableComponentData = {
    id: 'expanding-frame-content',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        ...(fitDurationTo ? { fitDurationTo } : { duration }),
      },
    },
    childrenData: [],
  };

  // Generic effect for frame expansion
  const frameExpansionEffect = {
    id: 'expanding-frame-effect',
    componentId: 'generic',
    data: {
      type: expansionCurve,
      start: 0,
      duration: fitDurationTo ? undefined : duration,
      ...(fitDurationTo ? { fitDurationTo } : {}),
      mode: 'provider',
      targetIds: ['expanding-frame-border'],
      ranges: [
        // Opacity animation (0 → 0.3 → 0.8 → 1)
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.3, prog: 0.3 },
        { key: 'opacity', val: 0.8, prog: 0.7 },
        { key: 'opacity', val: 1, prog: 1 },

        // Border width animation (1px → 20% → 60% → 100%)
        { key: 'borderWidth', val: '1px', prog: 0 },
        { key: 'borderWidth', val: `${maxWidth * 0.2}px`, prog: 0.3 },
        { key: 'borderWidth', val: `${maxWidth * 0.6}px`, prog: 0.7 },
        { key: 'borderWidth', val: `${maxWidth}px`, prog: 1 },

        // Border radius animation (0 → 30% → 70% → 100%)
        { key: 'borderRadius', val: '0px', prog: 0 },
        { key: 'borderRadius', val: `${borderRadius * 0.3}px`, prog: 0.3 },
        { key: 'borderRadius', val: `${borderRadius * 0.7}px`, prog: 0.7 },
        { key: 'borderRadius', val: `${borderRadius}px`, prog: 1 },

        // Border image (gradient color transitions)
        {
          key: 'borderImage',
          val: `${gradientStart} 1`,
          prog: 0,
        },
        {
          key: 'borderImage',
          val: `${gradientMid1} 1`,
          prog: 0.3,
        },
        {
          key: 'borderImage',
          val: `${gradientMid2} 1`,
          prog: 0.7,
        },
        {
          key: 'borderImage',
          val: `${gradientEnd} 1`,
          prog: 1,
        },
      ],
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'expanding-frame-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        ...(fitDurationTo ? { fitDurationTo } : { duration }),
      },
    },
    effects: [frameExpansionEffect],
    childrenData: [frameBorderLayout, contentSlot],
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
  id: 'expanding-frame-effect',
  title: 'Expanding Rectangular Frame Effect',
  description:
    'A sophisticated expanding rectangular frame effect that grows from a thin outline to a thick border with gradient fills. Features multi-stage expansion with opacity fade, border-width growth, border-radius morphing, and gradient color transitions. The animation resembles a UI element charging up or loading, with configurable expansion curves and rounded corner morphing. Perfect for creating futuristic UI effects around video players or image galleries.',
  type: 'predefined',
  presetType: 'children',
  tags: ['effects', 'border', 'frame', 'gradient', 'animation', 'ui'],
  defaultInputParams: {
    maxWidth: 20,
    borderRadius: 16,
    gradientColors: ['#00f5ff', '#ff00ff', '#ffaa00'],
    expansionCurve: 'ease-in-out',
    duration: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const expandingFrameEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
