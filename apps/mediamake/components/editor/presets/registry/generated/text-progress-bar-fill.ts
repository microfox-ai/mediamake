/**
 * Text Progress Bar Fill Animation Preset
 *
 * This preset creates a horizontal text fill animation where text gradually fills with color from left to right,
 * like liquid pouring into transparent glass letters. It uses a two-layer approach with an overlay that slides
 * across to reveal the filled text beneath, creating a clean edge between filled and unfilled portions.
 *
 * Features:
 * - **Two-Layer Text Approach**: Bottom layer (fully colored) + top layer (outline/transparent with sliding mask)
 * - **Clip-Path Animation**: Smooth left-to-right reveal using inset clip-path
 * - **Optional Glow Effect**: Subtle glow at the fill edge using drop-shadow filter
 * - **GPU Acceleration**: Uses transform and will-change for optimal performance
 * - **Customizable Appearance**: Font, colors, sizing, outline width, glow intensity
 * - **Smooth Easing**: Ease-out timing for natural deceleration
 *
 * Use cases:
 * - Loading bar animations applied to typography
 * - Progress indicators for titles or headlines
 * - Kinetic typography reveals
 * - Animated text overlays with liquid-fill effect
 * - Brand reveal animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  text: z
    .string()
    .default('PROGRESS')
    .describe('Text content to display with fill animation'),
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(3)
    .describe('Duration of the fill animation in seconds'),
  fontSize: z
    .number()
    .min(20)
    .max(300)
    .default(80)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto", "BebasNeue")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  fillColor: z
    .string()
    .default('#3B82F6')
    .describe('Fill color (hex, rgb, or CSS color name)'),
  outlineColor: z
    .string()
    .default('#E5E7EB')
    .describe('Outline/stroke color for unfilled text'),
  outlineWidth: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Width of text outline/stroke in pixels'),
  enableGlow: z
    .boolean()
    .default(true)
    .describe('Enable subtle glow effect at fill edge'),
  glowIntensity: z
    .number()
    .min(0)
    .max(30)
    .default(15)
    .describe('Glow blur radius in pixels (only if enableGlow is true)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    fillColor,
    outlineColor,
    outlineWidth,
    enableGlow,
    glowIntensity,
  } = params;

  // Generate unique IDs
  const containerId = 'text-progress-bar-fill-container';
  const filledTextId = 'filled-text-layer';
  const unfilledTextId = 'unfilled-text-layer';
  const fillEffectId = 'fill-clip-path-effect';
  const glowEffectId = 'fill-edge-glow-effect';

  // Filled text layer (bottom layer - fully colored)
  const filledTextLayer: RenderableComponentData = {
    id: filledTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: fillColor,
        // Base glow if enabled (subtle always-on glow)
        ...(enableGlow && {
          filter: `drop-shadow(0 0 ${glowIntensity * 0.5}px ${fillColor})`,
        }),
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Unfilled text layer (top layer - outline/transparent with clip-path mask)
  const unfilledTextLayer: RenderableComponentData = {
    id: unfilledTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'absolute top-0 left-0 w-full h-full flex items-center justify-center',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: 'transparent',
        WebkitTextStroke: `${outlineWidth}px ${outlineColor}`,
        textStroke: `${outlineWidth}px ${outlineColor}`,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Clip-path fill effect on unfilled layer (reveals filled layer beneath)
  const fillEffect = {
    id: fillEffectId,
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: [unfilledTextId],
      ranges: [
        { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 }, // Start: fully clipped from right
        { key: 'clipPath', val: 'inset(0 0 0 0)', prog: 1 },    // End: fully revealed
      ],
    },
  };

  // Optional glow effect on filled layer (enhanced glow during fill progression)
  const glowEffect = enableGlow ? {
    id: glowEffectId,
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: [filledTextId],
      ranges: [
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${glowIntensity * 0.5}px ${fillColor})`,
          prog: 0,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${glowIntensity}px ${fillColor})`,
          prog: 0.5,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${glowIntensity * 0.7}px ${fillColor})`,
          prog: 1,
        },
      ],
    },
  } : null;

  // Apply effects to layers
  unfilledTextLayer.effects = [fillEffect];
  if (glowEffect) {
    filledTextLayer.effects = [glowEffect];
  }

  // Root container with relative positioning and overflow hidden
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative h-20 flex items-center justify-center overflow-hidden',
        style: {
          willChange: 'transform', // GPU acceleration hint
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      filledTextLayer,
      unfilledTextLayer,
    ] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'text-progress-bar-fill',
  title: 'Text Progress Bar Fill Animation',
  description:
    'Horizontal text fill animation where text gradually fills with color from left to right, like liquid pouring into transparent glass letters. Uses a two-layer approach with a sliding clip-path mask to reveal filled text beneath, creating a smooth progress bar effect applied to typography. Features optional edge glow effect for enhanced liquid appearance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'progress',
    'fill',
    'animation',
    'liquid',
    'reveal',
    'mask',
    'clip-path',
    'loading',
    'bar',
    'kinetic',
    'glow',
  ],
  defaultInputParams: {
    text: 'PROGRESS',
    duration: 3,
    fontSize: 80,
    fontFamily: 'Inter',
    fontWeight: '700',
    fillColor: '#3B82F6',
    outlineColor: '#E5E7EB',
    outlineWidth: 2,
    enableGlow: true,
    glowIntensity: 15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const textProgressBarFillPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
