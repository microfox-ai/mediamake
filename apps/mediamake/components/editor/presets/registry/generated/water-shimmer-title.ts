/**
 * Water Shimmer Title Animation Preset
 *
 * A sophisticated title animation featuring a continuous, subtle shimmer effect that resembles
 * light reflecting off water. The text surface appears to have a liquid-like quality with gentle,
 * undulating highlights. Uses a multi-layer approach with two gradient overlays (radial and linear
 * at 45deg) animated via translateX/Y, opacity pulsing, and subtle scale breathing.
 *
 * Prime-number duration cycles (3s, 4s, 5s, 6s, 7s) prevent repetitive patterns, creating organic
 * movement. Best suited for longer display durations where subtle motion keeps viewer attention
 * without being overwhelming.
 *
 * Features:
 * - Multi-layer shimmer effect with radial and linear gradients
 * - Organic, non-repetitive animation patterns using prime-number durations
 * - Subtle opacity pulsing and scale breathing
 * - Configurable text, colors, fonts, and timing
 * - Liquid-like, water-reflection aesthetic
 *
 * Use cases:
 * - Premium title cards for longer-form content
 * - Elegant section headers
 * - Sophisticated branding moments
 * - Calm, meditative visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .default('Water Shimmer')
    .describe('Text content to display with shimmer effect'),

  duration: z
    .number()
    .min(4)
    .max(60)
    .default(10)
    .describe('Duration of the animation in seconds (recommended 4-6s for full shimmer cycle)'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (e.g., "#FFFFFF", "rgba(255,255,255,1)")'),

  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:300", "Roboto:700:italic")'),

  fontSize: z
    .number()
    .min(24)
    .max(500)
    .default(96)
    .describe('Font size in pixels'),

  fontWeight: z
    .number()
    .min(100)
    .max(900)
    .default(300)
    .describe('Font weight (100-900)'),

  shimmerIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Intensity of the shimmer effect (0.1 = subtle, 1 = strong)'),

  shimmerColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the shimmer highlights (default: white)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    textColor,
    font,
    fontSize,
    fontWeight,
    shimmerIntensity,
    shimmerColor,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
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
  } else {
    fontStyle.fontWeight = fontWeight;
  }

  // Calculate shimmer opacity based on intensity
  const baseShimmerOpacity = shimmerIntensity * 0.3;
  const maxShimmerOpacity = shimmerIntensity * 0.4;

  // Convert shimmer color to rgba for gradient
  const shimmerRgba = shimmerColor.startsWith('#')
    ? hexToRgba(shimmerColor, 0.4)
    : shimmerColor;

  // Helper function to convert hex to rgba
  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // Component IDs
  const containerId = 'water-shimmer-container';
  const textId = 'water-shimmer-text';
  const radialOverlayId = 'shimmer-overlay-radial';
  const linearOverlayId = 'shimmer-overlay-linear';

  // ============================================================================
  // BASE TEXT COMPONENT
  // ============================================================================

  const baseTextComponent: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight: fontStyle.fontWeight,
        fontStyle: fontStyle.fontStyle,
        position: 'relative',
        zIndex: 0,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['300'],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // ============================================================================
  // RADIAL GRADIENT SHIMMER OVERLAY
  // ============================================================================

  const radialOverlayEffects = [
    // Horizontal movement (5s cycle)
    {
      id: 'shimmer-radial-x',
      componentId: 'generic',
      data: {
        type: 'spring',
        start: 0,
        duration: 5,
        mode: 'provider',
        targetIds: [radialOverlayId],
        ranges: [
          { key: 'translateX', val: -50, prog: 0 },
          { key: 'translateX', val: 50, prog: 0.5 },
          { key: 'translateX', val: -50, prog: 1 },
        ],
      } as GenericEffectData,
    },
    // Vertical movement (7s cycle)
    {
      id: 'shimmer-radial-y',
      componentId: 'generic',
      data: {
        type: 'spring',
        start: 0,
        duration: 7,
        mode: 'provider',
        targetIds: [radialOverlayId],
        ranges: [
          { key: 'translateY', val: -30, prog: 0 },
          { key: 'translateY', val: 30, prog: 0.5 },
          { key: 'translateY', val: -30, prog: 1 },
        ],
      } as GenericEffectData,
    },
    // Opacity pulsing (3s cycle)
    {
      id: 'shimmer-radial-opacity',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: 3,
        mode: 'provider',
        targetIds: [radialOverlayId],
        ranges: [
          { key: 'opacity', val: baseShimmerOpacity * 0.7, prog: 0 },
          { key: 'opacity', val: maxShimmerOpacity, prog: 0.5 },
          { key: 'opacity', val: baseShimmerOpacity * 0.7, prog: 1 },
        ],
      } as GenericEffectData,
    },
  ];

  const radialOverlayComponent: RenderableComponentData = {
    id: radialOverlayId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 mix-blend-screen pointer-events-none',
        style: {
          zIndex: 10,
          background: `radial-gradient(circle, rgba(255,255,255,0) 0%, ${shimmerRgba} 50%, rgba(255,255,255,0) 100%)`,
          backgroundSize: '200% 200%',
          opacity: baseShimmerOpacity,
        },
      },
    },
    effects: radialOverlayEffects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // ============================================================================
  // LINEAR GRADIENT SHIMMER OVERLAY
  // ============================================================================

  const linearOverlayEffects = [
    // Horizontal movement (4s cycle)
    {
      id: 'shimmer-linear-x',
      componentId: 'generic',
      data: {
        type: 'spring',
        start: 0,
        duration: 4,
        mode: 'provider',
        targetIds: [linearOverlayId],
        ranges: [
          { key: 'translateX', val: 60, prog: 0 },
          { key: 'translateX', val: -60, prog: 0.5 },
          { key: 'translateX', val: 60, prog: 1 },
        ],
      } as GenericEffectData,
    },
    // Vertical movement (6s cycle)
    {
      id: 'shimmer-linear-y',
      componentId: 'generic',
      data: {
        type: 'spring',
        start: 0,
        duration: 6,
        mode: 'provider',
        targetIds: [linearOverlayId],
        ranges: [
          { key: 'translateY', val: 20, prog: 0 },
          { key: 'translateY', val: -20, prog: 0.5 },
          { key: 'translateY', val: 20, prog: 1 },
        ],
      } as GenericEffectData,
    },
    // Scale breathing (5s cycle)
    {
      id: 'shimmer-linear-scale',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: 5,
        mode: 'provider',
        targetIds: [linearOverlayId],
        ranges: [
          { key: 'scale', val: 0.98, prog: 0 },
          { key: 'scale', val: 1.02, prog: 0.5 },
          { key: 'scale', val: 0.98, prog: 1 },
        ],
      } as GenericEffectData,
    },
  ];

  const linearOverlayComponent: RenderableComponentData = {
    id: linearOverlayId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 mix-blend-screen pointer-events-none',
        style: {
          zIndex: 20,
          background: `linear-gradient(45deg, rgba(255,255,255,0) 0%, ${shimmerRgba} 50%, rgba(255,255,255,0) 100%)`,
          backgroundSize: '200% 200%',
          opacity: baseShimmerOpacity,
        },
      },
    },
    effects: linearOverlayEffects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
      },
    },
    childrenData: [
      baseTextComponent,
      radialOverlayComponent,
      linearOverlayComponent,
    ] as RenderableComponentData[],
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // ============================================================================
  // OUTPUT
  // ============================================================================

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
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'waterShimmerTitle',
  title: 'Water Shimmer Title Animation',
  description:
    'A sophisticated title animation featuring a continuous, subtle shimmer effect that resembles light reflecting off water. The text surface appears to have a liquid-like quality with gentle, undulating highlights. Uses multi-layer gradient overlays with organic, non-repetitive animation patterns.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'title',
    'text',
    'shimmer',
    'water',
    'liquid',
    'gradient',
    'organic',
    'subtle',
    'elegant',
    'premium',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Water Shimmer',
    duration: 10,
    textColor: '#FFFFFF',
    font: 'Inter:300',
    fontSize: 96,
    fontWeight: 300,
    shimmerIntensity: 0.3,
    shimmerColor: '#FFFFFF',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const waterShimmerTitlePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
