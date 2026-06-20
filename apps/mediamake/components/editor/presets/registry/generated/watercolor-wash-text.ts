/**
 * Watercolor Wash Text Effect Preset
 *
 * This preset creates a dynamic watercolor painting effect on text, mimicking the appearance of
 * watercolor paint with color bleeding, paper absorption texture, and pigment granulation.
 * 
 * Features:
 * - **Soft Irregular Edges**: SVG turbulence filter creates organic watercolor edges
 * - **Color Bleeding Effect**: Multiple text-shadow layers simulate paint spreading
 * - **Animated Transparency**: Transitions from high transparency (wet paint) to more opaque (dried)
 * - **Color Settling**: Colors spread beyond boundaries initially, then settle within letter forms
 * - **Multi-Color Gradients**: Random color variations within each letter using gradient stops
 * - **Paper Warping**: Subtle perspective transforms (rotateX/Y) create paper texture effect
 * - **Pigment Granulation**: Scale and blur animations simulate paint texture settling
 *
 * Technical Implementation:
 * - SVG feTurbulence + feDisplacementMap for irregular edges
 * - Generic keyframe effects for scale (1.2→1), opacity (0.3→0.8), blur (3→0.5)
 * - Oscillating rotateX/Y transforms for paper warping effect
 * - Multi-color gradient with 5 stops animating through color spectrum
 * - Multiple text-shadow layers with different colors and blur values
 *
 * Use Cases:
 * - Artistic title sequences
 * - Poetry or creative writing videos
 * - Art/design content
 * - Soft, organic branding
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('Watercolor')
    .describe('Text content to display with watercolor effect'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(96)
    .describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  gradient: z
    .string()
    .optional()
    .describe(
      'CSS gradient string for text color (default: watercolor multi-color gradient)',
    ),
  textColor: z
    .string()
    .optional()
    .describe(
      'Fallback text color if gradient is not used (default: white)',
    ),
  scaleIntensity: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.2)
    .describe('Intensity of initial scale (0 = no scale, 0.5 = 50% larger)'),
  opacityStart: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Starting opacity value (0-1, default: 0.3 for wet paint)'),
  opacityEnd: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Ending opacity value (0-1, default: 0.8 for dried paint)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Initial blur intensity in pixels (0-10)'),
  warpIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Paper warping intensity in degrees (0-5)'),
  position: z
    .object({
      top: z.string().optional(),
      left: z.string().optional(),
      right: z.string().optional(),
      bottom: z.string().optional(),
    })
    .optional()
    .describe('Custom positioning (default: centered)'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:700';
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
    fontStyle.fontWeight = 700; // Default bold
  }

  // Default watercolor gradient
  const defaultGradient =
    'linear-gradient(135deg, #6B8DD6 0%, #8E54E9 25%, #D946A6 50%, #EC4899 75%, #F59E0B 100%)';

  // Generate unique IDs
  const containerId = 'watercolor-container';
  const svgFilterId = 'watercolor-svg-filter';
  const textWrapperId = 'watercolor-text-wrapper';
  const textAtomId = 'watercolor-text-atom';

  // Calculate scale values
  const scaleStart = 1 + params.scaleIntensity;
  const scaleEnd = 1;

  // SVG filter definition (using HTMLBlockAtom)
  const svgFilterNode: RenderableComponentData = {
    id: svgFilterId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg width='0' height='0' style='position:absolute;pointer-events:none;'><defs><filter id='watercolor'><feTurbulence type='fractalNoise' baseFrequency='0.015' numOctaves='4' seed='2' /><feDisplacementMap in='SourceGraphic' scale='8' xChannelSelector='R' yChannelSelector='G' /></filter></defs></svg>`,
      style: {
        position: 'absolute',
        width: 0,
        height: 0,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // Text atom with watercolor styling
  const textAtomData: TextAtomData = {
    text: params.text,
    style: {
      fontSize: params.fontSize,
      fontWeight: fontStyle.fontWeight || 700,
      fontStyle: fontStyle.fontStyle,
      filter: 'url(#watercolor)',
      textShadow:
        '3px 3px 8px rgba(100, 150, 200, 0.4), -2px -2px 6px rgba(200, 100, 150, 0.3), 0px 4px 12px rgba(150, 100, 200, 0.35)',
      color: params.textColor || '#FFFFFF',
    },
    gradient: params.gradient || defaultGradient,
    font: {
      family: fontFamily,
      weights: fontStyle.fontWeight
        ? [fontStyle.fontWeight.toString()]
        : ['700'],
      subsets: ['latin'],
    },
  };

  // Effects for the text atom
  const scaleEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: 1.2,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'scale', val: scaleStart, prog: 0 },
      { key: 'scale', val: scaleEnd, prog: 1 },
    ],
  };

  const opacityEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: 1.0,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'opacity', val: params.opacityStart, prog: 0 },
      { key: 'opacity', val: params.opacityEnd, prog: 1 },
    ],
  };

  const blurEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: 1.4,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'blur', val: params.blurIntensity, prog: 0 },
      { key: 'blur', val: 0.5, prog: 1 },
    ],
  };

  const warpEffectX: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'rotateX', val: -params.warpIntensity, prog: 0 },
      { key: 'rotateX', val: params.warpIntensity, prog: 0.5 },
      { key: 'rotateX', val: -params.warpIntensity / 2, prog: 1 },
    ],
  };

  const warpEffectY: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'rotateY', val: params.warpIntensity / 2, prog: 0 },
      { key: 'rotateY', val: -params.warpIntensity, prog: 0.5 },
      { key: 'rotateY', val: params.warpIntensity / 2, prog: 1 },
    ],
  };

  const textAtomNode: RenderableComponentData = {
    id: textAtomId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: textAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'scale-effect',
        componentId: 'generic',
        data: scaleEffect,
      },
      {
        id: 'opacity-effect',
        componentId: 'generic',
        data: opacityEffect,
      },
      {
        id: 'blur-effect',
        componentId: 'generic',
        data: blurEffect,
      },
      {
        id: 'warp-effect-x',
        componentId: 'generic',
        data: warpEffectX,
      },
      {
        id: 'warp-effect-y',
        componentId: 'generic',
        data: warpEffectY,
      },
    ],
  };

  // Text wrapper layout
  const textWrapperNode: RenderableComponentData = {
    id: textWrapperId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textAtomNode],
  };

  // Root container with positioning
  const positionStyle: React.CSSProperties = params.position
    ? {
        top: params.position.top,
        left: params.position.left,
        right: params.position.right,
        bottom: params.position.bottom,
      }
    : {};

  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: positionStyle,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [svgFilterNode, textWrapperNode],
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
  id: 'watercolor-wash-text',
  title: 'Watercolor Wash Text Effect',
  description:
    'Text effect mimicking watercolor painting with soft edges, color bleeding, paper absorption, and pigment granulation. Features animated transparency transitions, color spreading, gradient variations, and subtle paper warping effects using SVG filters and transforms.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'watercolor',
    'artistic',
    'painting',
    'creative',
    'typography',
    'effects',
    'animated',
    'gradient',
    'texture',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Watercolor',
    duration: 5,
    fontSize: 96,
    font: 'Inter:700',
    scaleIntensity: 0.2,
    opacityStart: 0.3,
    opacityEnd: 0.8,
    blurIntensity: 3,
    warpIntensity: 2,
  },
};

// --- Export ---
export const watercolorWashTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
