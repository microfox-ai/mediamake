/**
 * 3D Perspective Shift Typography Preset
 *
 * This preset creates a cinematic 3D typography effect where text appears to rotate on an
 * invisible Y-axis, simulating a camera dolly around 3D text. The text starts facing slightly
 * left, rotates through center (full frontal), and continues to a slight right angle, creating
 * a smooth arc of perspective change.
 *
 * Features:
 * - **3D Y-axis Rotation**: Smooth rotation from -25deg to +25deg creating turntable effect
 * - **Perspective Depth**: Uses CSS perspective for realistic 3D appearance
 * - **Scale Distortion**: Subtle scaleX animation (0.95 to 1.05 to 0.95) simulates perspective distortion
 * - **Letter Spacing Effect**: Synchronized letterSpacing animation (-0.02em to 0.02em) enhances depth illusion
 * - **Dynamic Text Shadow**: Horizontally shifting shadow that follows rotation to enhance 3D effect
 * - **GPU Accelerated**: Uses transform-style: preserve-3d and will-change for smooth performance
 * - **Cinematic Easing**: Ease-in-out easing for professional, smooth motion
 *
 * Use cases:
 * - Professional title sequences
 * - Cinematic text reveals
 * - Brand name presentations
 * - Product title animations
 * - High-end video intros
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().describe('The text content to display with 3D rotation effect'),
  
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Duration of the 3D rotation animation in seconds'),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  
  color: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex, rgb, or named color)'),
  
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  perspectiveDistance: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('CSS perspective distance in pixels (affects 3D depth perception)'),
  
  rotationRange: z
    .number()
    .min(10)
    .max(90)
    .default(25)
    .describe('Maximum rotation angle in degrees (text rotates from -range to +range)'),
  
  scaleVariation: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.05)
    .describe('Scale variation for perspective distortion (0 = no scaling, 0.3 = max)'),
  
  letterSpacingVariation: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.02)
    .describe('Letter spacing variation in em units (enhances depth illusion)'),
  
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Text shadow intensity (0 = no shadow, 1 = full intensity)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontWeight,
    color,
    font,
    perspectiveDistance,
    rotationRange,
    scaleVariation,
    letterSpacingVariation,
    shadowIntensity,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = fontWeight;
  }

  // IDs
  const containerId = '3d-perspective-container';
  const textId = '3d-perspective-text';

  // Calculate scale range
  const minScale = 1 - scaleVariation;
  const maxScale = 1 + scaleVariation;

  // Calculate shadow shift based on rotation
  const shadowShift = 5 * shadowIntensity;
  const shadowBlur = 10;
  const shadowOpacity = 0.5 * shadowIntensity;

  // Create text atom
  const textAtom = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontStyle.fontWeight || fontWeight,
        fontStyle: fontStyle.fontStyle,
        color: color,
        textAlign: 'center' as const,
        willChange: 'transform',
        transformStyle: 'preserve-3d',
      },
      font: {
        family: fontFamily,
        weights: [String(fontStyle.fontWeight || fontWeight)],
        subsets: ['latin'],
        display: 'swap' as const,
        preload: true,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // 1. RotateY Effect: -25deg → 0deg → 25deg
      {
        id: `${textId}-rotateY`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'rotateY', val: -rotationRange, prog: 0 },
            { key: 'rotateY', val: 0, prog: 0.5 },
            { key: 'rotateY', val: rotationRange, prog: 1 },
          ],
        },
      },
      // 2. ScaleX Effect: 0.95 → 1.05 → 0.95 (perspective distortion)
      {
        id: `${textId}-scaleX`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'scaleX', val: minScale, prog: 0 },
            { key: 'scaleX', val: maxScale, prog: 0.5 },
            { key: 'scaleX', val: minScale, prog: 1 },
          ],
        },
      },
      // 3. Letter Spacing Effect: -0.02em → 0em → 0.02em
      {
        id: `${textId}-letterSpacing`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'letterSpacing', val: `-${letterSpacingVariation}em`, prog: 0 },
            { key: 'letterSpacing', val: '0em', prog: 0.5 },
            { key: 'letterSpacing', val: `${letterSpacingVariation}em`, prog: 1 },
          ],
        },
      },
      // 4. Text Shadow Effect: Shifts horizontally to enhance 3D illusion
      {
        id: `${textId}-textShadow`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            {
              key: 'textShadow',
              val: `${shadowShift}px ${shadowShift}px ${shadowBlur}px rgba(0, 0, 0, ${shadowOpacity})`,
              prog: 0,
            },
            {
              key: 'textShadow',
              val: `0px 0px ${shadowBlur}px rgba(0, 0, 0, ${shadowOpacity * 0.6})`,
              prog: 0.5,
            },
            {
              key: 'textShadow',
              val: `-${shadowShift}px ${shadowShift}px ${shadowBlur}px rgba(0, 0, 0, ${shadowOpacity})`,
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Create container with perspective
  const rootContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: `${perspectiveDistance}px`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textAtom],
  } as RenderableComponentData;

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
  id: '3d-perspective-shift-typography',
  title: '3D Perspective Shift Typography',
  description:
    'Cinematic 3D typography preset featuring smooth Y-axis rotation from left to right perspective, simulating a professional turntable camera dolly shot. Text rotates through -25deg to +25deg with synchronized letter-spacing and scale distortion to enhance depth illusion. Uses CSS transform perspective with GPU-accelerated effects for smooth, cinematic motion perfect for professional title sequences.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    '3d',
    'perspective',
    'rotation',
    'cinematic',
    'turntable',
    'dolly',
    'title',
    'text',
    'motion',
    'professional',
    'gpu-accelerated',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'CINEMATIC',
    duration: 5,
    fontSize: 64,
    fontWeight: '700',
    color: '#ffffff',
    font: 'Inter:700',
    perspectiveDistance: 1000,
    rotationRange: 25,
    scaleVariation: 0.05,
    letterSpacingVariation: 0.02,
    shadowIntensity: 0.5,
  },
};

export const threeDPerspectiveShiftTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
