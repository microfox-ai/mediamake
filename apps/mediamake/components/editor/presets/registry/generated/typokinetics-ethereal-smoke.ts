/**
 * Typokinetics - Ethereal Smoke Typography Preset
 *
 * Transforms serif text into flowing, dissipating smoke or mist with ethereal elegance.
 * Text materializes from wisps of barely visible fragments, solidifies into readable form,
 * then dissolves back into vapor.
 *
 * Features:
 * - Three-phase animation: materialization → solid state → dissolution
 * - Multiple depth layers for atmospheric depth and parallax effect
 * - Particle-like dispersion with varying opacity and blur
 * - Turbulence motion paths with directional drift
 * - Delicate serif typography (Crimson Pro) with light weights
 * - Dreamlike, ephemeral aesthetic with temporary text existence
 *
 * Technical Implementation:
 * - Uses multiple text layers at different opacity and blur levels
 * - GPU-accelerated transforms with translate3d pattern
 * - Overlapping phase timing for smooth transitions
 * - Staggered layer animations for wispy materialization
 * - Relative timing (all effects relative to parent container)
 *
 * Use cases:
 * - Poetic or literary content overlays
 * - Dreamy brand introductions
 * - Ethereal title sequences
 * - Atmospheric text reveals
 * - Delicate, flowing typography effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  TextAtomData,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// --- Params Schema ---
const presetParams = z.object({
  text: z.string().describe('Text content to display as smoke typography'),
  fontSize: z
    .string()
    .optional()
    .default('72px')
    .describe('Font size for the text (e.g., "72px", "96px")'),
  color: z
    .string()
    .optional()
    .default('#e0e0e0')
    .describe(
      'Primary text color (lighter shades work best, e.g., "#e0e0e0", "#ffffff")',
    ),
  font: z
    .string()
    .optional()
    .default('Crimson Pro:300')
    .describe(
      'Font family with optional weight (e.g., "Crimson Pro:300", "Spectral:300")',
    ),
  duration: z
    .number()
    .optional()
    .default(5)
    .describe('Total animation cycle duration in seconds (default: 5)'),
  position: z
    .enum(['center', 'top', 'bottom'])
    .optional()
    .default('center')
    .describe('Vertical position of the text (center, top, or bottom)'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { text, fontSize, color, font, duration, position } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontWeight = fontString.includes(':')
      ? parseInt(fontString.split(':')[1], 10)
      : 300;
    return { fontFamily, fontWeight };
  };

  const { fontFamily, fontWeight } = parseFontString(font);

  // Position class mapping
  const getPositionClass = (pos: string) => {
    switch (pos) {
      case 'top':
        return 'items-start pt-24';
      case 'bottom':
        return 'items-end pb-24';
      case 'center':
      default:
        return 'items-center';
    }
  };

  const positionClass = getPositionClass(position);

  // --- Main Text Layer (Solid State) ---
  const mainTextId = 'main-text-solid';
  const mainTextData: TextAtomData = {
    text: text,
    style: {
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: '#ffffff',
      textAlign: 'center' as const,
      letterSpacing: '0.05em',
    },
    font: {
      family: fontFamily,
      weights: [fontWeight.toString()],
      subsets: ['latin'],
      display: 'swap' as const,
    },
  };

  // Effects for main text
  const mainTextEffects = [
    // Materialization (0.6s - 1.8s)
    {
      id: 'effect-main-text-materialization',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0.6,
        duration: 1.2,
        mode: 'provider',
        targetIds: [mainTextId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'blur', val: 15, prog: 0 },
          { key: 'blur', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    },
    // Float (1.8s - 3.8s)
    {
      id: 'effect-main-text-float',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 1.8,
        duration: 2,
        mode: 'provider',
        targetIds: [mainTextId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -2, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    },
    // Dissolution (3.8s - 5.0s)
    {
      id: 'effect-main-text-dissolution',
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: 3.8,
        duration: 1.2,
        mode: 'provider',
        targetIds: [mainTextId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'blur', val: 0, prog: 0 },
          { key: 'blur', val: 20, prog: 1 },
        ],
      } as GenericEffectData,
    },
  ];

  const mainTextNode: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: mainTextData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: mainTextEffects,
  };

  // --- Depth Layer Back (Furthest, most transparent) ---
  const depthBackId = 'depth-layer-back';
  const depthBackData: TextAtomData = {
    text: text,
    style: {
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      textAlign: 'center' as const,
      letterSpacing: '0.05em',
    },
    font: {
      family: fontFamily,
      weights: [fontWeight.toString()],
      subsets: ['latin'],
      display: 'swap' as const,
    },
  };

  const depthBackEffects = [
    // Materialization (0s - 1.5s)
    {
      id: 'effect-back-layer-materialization',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: 1.5,
        mode: 'provider',
        targetIds: [depthBackId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.15, prog: 1 },
          { key: 'blur', val: 30, prog: 0 },
          { key: 'blur', val: 15, prog: 1 },
          { key: 'translateX', val: -40, prog: 0 },
          { key: 'translateX', val: -15, prog: 1 },
          { key: 'translateY', val: 30, prog: 0 },
          { key: 'translateY', val: 10, prog: 1 },
        ],
      } as GenericEffectData,
    },
    // Float (1.5s - 3.5s)
    {
      id: 'effect-back-layer-float',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 1.5,
        duration: 2,
        mode: 'provider',
        targetIds: [depthBackId],
        ranges: [
          { key: 'translateY', val: 10, prog: 0 },
          { key: 'translateY', val: -5, prog: 0.5 },
          { key: 'translateY', val: 10, prog: 1 },
          { key: 'translateX', val: -15, prog: 0 },
          { key: 'translateX', val: -20, prog: 0.5 },
          { key: 'translateX', val: -15, prog: 1 },
        ],
      } as GenericEffectData,
    },
    // Dissolution (3.5s - 5.0s)
    {
      id: 'effect-back-layer-dissolution',
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: 3.5,
        duration: 1.5,
        mode: 'provider',
        targetIds: [depthBackId],
        ranges: [
          { key: 'opacity', val: 0.15, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'blur', val: 15, prog: 0 },
          { key: 'blur', val: 35, prog: 1 },
          { key: 'translateX', val: -15, prog: 0 },
          { key: 'translateX', val: -60, prog: 1 },
          { key: 'translateY', val: 10, prog: 0 },
          { key: 'translateY', val: -30, prog: 1 },
        ],
      } as GenericEffectData,
    },
  ];

  const depthBackNode: RenderableComponentData = {
    id: depthBackId,
    type: 'atom',
    componentId: 'TextAtom',
    data: depthBackData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: depthBackEffects,
  };

  // --- Depth Layer Mid (Middle transparency) ---
  const depthMidId = 'depth-layer-mid';
  const depthMidData: TextAtomData = {
    text: text,
    style: {
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      textAlign: 'center' as const,
      letterSpacing: '0.05em',
    },
    font: {
      family: fontFamily,
      weights: [fontWeight.toString()],
      subsets: ['latin'],
      display: 'swap' as const,
    },
  };

  const depthMidEffects = [
    // Materialization (0.2s - 1.7s)
    {
      id: 'effect-mid-layer-materialization',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0.2,
        duration: 1.5,
        mode: 'provider',
        targetIds: [depthMidId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.35, prog: 1 },
          { key: 'blur', val: 25, prog: 0 },
          { key: 'blur', val: 8, prog: 1 },
          { key: 'translateX', val: 30, prog: 0 },
          { key: 'translateX', val: 10, prog: 1 },
          { key: 'translateY', val: -25, prog: 0 },
          { key: 'translateY', val: -8, prog: 1 },
        ],
      } as GenericEffectData,
    },
    // Float (1.7s - 3.7s)
    {
      id: 'effect-mid-layer-float',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 1.7,
        duration: 2,
        mode: 'provider',
        targetIds: [depthMidId],
        ranges: [
          { key: 'translateY', val: -8, prog: 0 },
          { key: 'translateY', val: 3, prog: 0.5 },
          { key: 'translateY', val: -8, prog: 1 },
          { key: 'translateX', val: 10, prog: 0 },
          { key: 'translateX', val: 15, prog: 0.5 },
          { key: 'translateX', val: 10, prog: 1 },
        ],
      } as GenericEffectData,
    },
    // Dissolution (3.7s - 5.2s)
    {
      id: 'effect-mid-layer-dissolution',
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: 3.7,
        duration: 1.5,
        mode: 'provider',
        targetIds: [depthMidId],
        ranges: [
          { key: 'opacity', val: 0.35, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'blur', val: 8, prog: 0 },
          { key: 'blur', val: 30, prog: 1 },
          { key: 'translateX', val: 10, prog: 0 },
          { key: 'translateX', val: 50, prog: 1 },
          { key: 'translateY', val: -8, prog: 0 },
          { key: 'translateY', val: 25, prog: 1 },
        ],
      } as GenericEffectData,
    },
  ];

  const depthMidNode: RenderableComponentData = {
    id: depthMidId,
    type: 'atom',
    componentId: 'TextAtom',
    data: depthMidData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: depthMidEffects,
  };

  // --- Depth Layer Front (Closest, semi-transparent) ---
  const depthFrontId = 'depth-layer-front';
  const depthFrontData: TextAtomData = {
    text: text,
    style: {
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      textAlign: 'center' as const,
      letterSpacing: '0.05em',
    },
    font: {
      family: fontFamily,
      weights: [fontWeight.toString()],
      subsets: ['latin'],
      display: 'swap' as const,
    },
  };

  const depthFrontEffects = [
    // Materialization (0.4s - 1.9s)
    {
      id: 'effect-front-layer-materialization',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0.4,
        duration: 1.5,
        mode: 'provider',
        targetIds: [depthFrontId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.5, prog: 1 },
          { key: 'blur', val: 20, prog: 0 },
          { key: 'blur', val: 4, prog: 1 },
          { key: 'translateX', val: -20, prog: 0 },
          { key: 'translateX', val: -5, prog: 1 },
          { key: 'translateY', val: 20, prog: 0 },
          { key: 'translateY', val: 5, prog: 1 },
        ],
      } as GenericEffectData,
    },
    // Float (1.9s - 3.9s)
    {
      id: 'effect-front-layer-float',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 1.9,
        duration: 2,
        mode: 'provider',
        targetIds: [depthFrontId],
        ranges: [
          { key: 'translateY', val: 5, prog: 0 },
          { key: 'translateY', val: -3, prog: 0.5 },
          { key: 'translateY', val: 5, prog: 1 },
          { key: 'translateX', val: -5, prog: 0 },
          { key: 'translateX', val: -8, prog: 0.5 },
          { key: 'translateX', val: -5, prog: 1 },
        ],
      } as GenericEffectData,
    },
    // Dissolution (3.9s - 5.4s)
    {
      id: 'effect-front-layer-dissolution',
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: 3.9,
        duration: 1.5,
        mode: 'provider',
        targetIds: [depthFrontId],
        ranges: [
          { key: 'opacity', val: 0.5, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'blur', val: 4, prog: 0 },
          { key: 'blur', val: 25, prog: 1 },
          { key: 'translateX', val: -5, prog: 0 },
          { key: 'translateX', val: -35, prog: 1 },
          { key: 'translateY', val: 5, prog: 0 },
          { key: 'translateY', val: -20, prog: 1 },
        ],
      } as GenericEffectData,
    },
  ];

  const depthFrontNode: RenderableComponentData = {
    id: depthFrontId,
    type: 'atom',
    componentId: 'TextAtom',
    data: depthFrontData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: depthFrontEffects,
  };

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-smoke-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full flex flex-col justify-center ${positionClass} overflow-hidden`,
        style: {
          backgroundColor: 'transparent',
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
      depthBackNode,
      depthMidNode,
      depthFrontNode,
      mainTextNode,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'typokinetics-ethereal-smoke',
  title: 'Typokinetics - Ethereal Smoke Typography',
  description:
    'A preset that transforms serif text into flowing, dissipating smoke or mist with ethereal elegance. Text materializes from wisps of barely visible fragments, solidifies into readable form, then dissolves back into vapor. Features particle-like dispersion, turbulence motion paths, and varying opacity for dreamlike depth.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'smoke',
    'mist',
    'ethereal',
    'vapor',
    'dissolution',
    'particle',
    'atmospheric',
    'dreamlike',
    'serif',
    'flow',
    'dispersion',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Ethereal Dreams',
    fontSize: '72px',
    color: '#e0e0e0',
    font: 'Crimson Pro:300',
    duration: 5,
    position: 'center',
  },
};

// --- Export ---
export const typokineticsEtherealSmokePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
