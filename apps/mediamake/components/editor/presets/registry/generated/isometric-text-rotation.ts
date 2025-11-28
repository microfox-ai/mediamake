/**
 * Isometric Text Rotation Preset
 *
 * This preset creates typography that exists in an isometric 3D grid, rotating through
 * different viewing angles like architectural visualization software. The text snaps
 * between different isometric positions (front, left-iso, right-iso, back) with smooth
 * transitions and scale bounce effects at each rotation stop.
 *
 * Features:
 * - Isometric 3D grid background with repeating-linear-gradient
 * - Text rotation through 4 distinct isometric viewing angles
 * - Smooth transitions between positions with stepped keyframes
 * - Scale bounce effect at each rotation stop using spring easing
 * - Technical blueprint aesthetic with text stroke
 * - CSS custom properties for rotation angle consistency
 * - Fade-in effect on initial appearance
 *
 * Use cases:
 * - Tech and engineering content with architectural visualization style
 * - Product showcases with technical blueprint aesthetic
 * - Brand videos requiring geometric precision
 * - Educational content demonstrating 3D concepts
 * - Modern tech presentations with isometric design language
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
    .default('ISOMETRIC')
    .describe('Text content to display in isometric view'),
  duration: z
    .number()
    .default(8)
    .describe('Total duration of the animation in seconds'),
  fontSize: z
    .string()
    .default('120px')
    .describe('Font size of the text (e.g., "120px", "8rem")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text fill color (CSS color value)'),
  strokeColor: z
    .string()
    .default('#0078FF')
    .describe('Text stroke color for technical drawing aesthetic'),
  strokeWidth: z
    .string()
    .default('2px')
    .describe('Text stroke width (e.g., "2px", "0.1em")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (Google Font)'),
  gridColor: z
    .string()
    .default('rgba(0,120,255,0.03)')
    .describe('Color of the isometric grid lines'),
  gridSize: z
    .string()
    .default('40px')
    .describe('Size of grid cells (e.g., "40px")'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color of the scene'),
  bounceScale: z
    .number()
    .default(1.08)
    .min(1)
    .max(1.5)
    .describe('Scale multiplier for bounce effect at rotation stops'),
  bounceDuration: z
    .number()
    .default(0.4)
    .describe('Duration of each bounce effect in seconds'),
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
    textColor,
    strokeColor,
    strokeWidth,
    fontFamily,
    gridColor,
    gridSize,
    backgroundColor,
    bounceScale,
    bounceDuration,
  } = params;

  // Parse font family (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = fontFamily || 'Inter';
  const parsedFontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold for isometric style
  }

  const rootContainerId = 'isometric-root-container';
  const textWrapperId = 'isometric-text-wrapper';
  const textAtomId = 'isometric-text-atom';

  // Create text atom with isometric styling
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      font: {
        family: parsedFontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
        display: 'swap',
      },
      style: {
        fontSize,
        fontWeight: fontStyle.fontWeight || 700,
        color: textColor,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        textShadow: '2px 2px 0px rgba(0,0,0,0.2)',
        WebkitTextStroke: `${strokeWidth} ${strokeColor}`,
        paintOrder: 'stroke fill',
        ...(fontStyle.fontStyle && { fontStyle: fontStyle.fontStyle }),
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Main rotation effect - stepped keyframes for isometric angles
      {
        id: 'isometric-rotation-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            // Maintain consistent rotateX(30deg) throughout
            { key: 'rotateX', val: 30, prog: 0 },
            // Front view: rotateY(45deg)
            { key: 'rotateY', val: 45, prog: 0 },
            { key: 'rotateY', val: 45, prog: 0.24 },
            // Snap to left-iso: rotateY(-45deg)
            { key: 'rotateY', val: -45, prog: 0.25 },
            { key: 'rotateY', val: -45, prog: 0.49 },
            // Snap to right-iso: rotateY(-135deg)
            { key: 'rotateY', val: -135, prog: 0.5 },
            { key: 'rotateY', val: -135, prog: 0.74 },
            // Snap to back: rotateY(225deg) = rotateY(-135deg + 360deg)
            { key: 'rotateY', val: 225, prog: 0.75 },
            { key: 'rotateY', val: 225, prog: 0.99 },
            // Complete rotation: rotateY(405deg) = rotateY(45deg + 360deg)
            { key: 'rotateY', val: 405, prog: 1 },
            { key: 'rotateX', val: 30, prog: 1 },
          ],
        },
      },
      // Scale bounce at first rotation stop (24%)
      {
        id: 'scale-bounce-1',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: duration * 0.24,
          duration: bounceDuration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: bounceScale, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Scale bounce at second rotation stop (49%)
      {
        id: 'scale-bounce-2',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: duration * 0.49,
          duration: bounceDuration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: bounceScale, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Scale bounce at third rotation stop (74%)
      {
        id: 'scale-bounce-3',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: duration * 0.74,
          duration: bounceDuration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: bounceScale, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Fade-in effect at start
      {
        id: 'fade-in-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.5,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Text wrapper with 3D transform preservation
  const textWrapper: RenderableComponentData = {
    id: textWrapperId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textAtom],
  };

  // Root container with isometric grid background and perspective
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          background: `linear-gradient(0deg, ${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
          backgroundSize: `${gridSize} ${gridSize}`,
          backgroundColor,
          perspective: '1200px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textWrapper],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'isometric-text-rotation',
  title: 'Isometric Text Rotation',
  description:
    'Typography in an isometric 3D grid that rotates through different viewing angles (front, left-iso, right-iso, back) with snap transitions and scale bounce effects. Features a technical blueprint aesthetic with isometric grid background, perfect for tech and engineering content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'isometric',
    '3d',
    'rotation',
    'grid',
    'technical',
    'blueprint',
    'architecture',
    'engineering',
    'tech',
  ],
  defaultInputParams: {
    text: 'ISOMETRIC',
    duration: 8,
    fontSize: '120px',
    textColor: '#FFFFFF',
    strokeColor: '#0078FF',
    strokeWidth: '2px',
    fontFamily: 'Inter',
    gridColor: 'rgba(0,120,255,0.03)',
    gridSize: '40px',
    backgroundColor: '#000000',
    bounceScale: 1.08,
    bounceDuration: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const isometricTextRotationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
