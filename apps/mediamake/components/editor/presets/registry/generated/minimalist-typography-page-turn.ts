/**
 * Minimalist Typography Page Turn Preset
 *
 * This preset creates a sophisticated minimalist typography animation where text rotates
 * subtly on the Y-axis, mimicking pages turning in a book. The effect features:
 * 
 * - Gentle Y-axis rotation (15-20 degrees) creating a parallax effect
 * - Fade-in leading the rotation (visible at 30% opacity before rotation begins)
 * - Soft blur that clears as text settles (rack focus cinematography effect)
 * - Staggered animation between text lines for dimensional layering
 * - Perspective-based depth for subtle 3D appearance
 * 
 * Perfect for:
 * - Elegant title sequences
 * - Designer-focused text reveals
 * - Sophisticated brand presentations
 * - Minimalist content introductions
 * - High-end editorial-style videos
 * 
 * Technical Implementation:
 * - Uses BaseLayout with perspective style for 3D depth
 * - Each text line has three synchronized effects:
 *   1) Opacity: 0 → 0.3 (200ms) → 1 (full 800ms)
 *   2) RotateY: -20/-18/-16 degrees → 0 (600ms, delayed 200ms)
 *   3) Blur: 4px → 0px (synchronized with rotation)
 * - 150ms stagger between lines creates cascading reveal
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfex/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema definition
const presetParams = z.object({
  lines: z
    .array(z.string())
    .min(1)
    .max(5)
    .default(['First text line', 'Second text line', 'Third text line'])
    .describe('Array of text lines to display (1-5 lines)'),
  
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Font size in pixels for all text lines'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto", "Montserrat")'),
  
  fontWeight: z
    .enum(['100', '200', '300', '400', '500', '600', '700', '800', '900'])
    .default('300')
    .describe('Font weight (100-900, default: 300 for minimalist look)'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color in hex format'),
  
  gap: z
    .number()
    .min(0)
    .max(100)
    .default(16)
    .describe('Gap between text lines in pixels'),
  
  rotationIntensity: z
    .number()
    .min(10)
    .max(30)
    .default(20)
    .describe('Maximum rotation angle in degrees (10-30, default: 20)'),
  
  staggerDelay: z
    .number()
    .min(50)
    .max(500)
    .default(150)
    .describe('Delay between each line animation in milliseconds'),
  
  opacityDuration: z
    .number()
    .min(400)
    .max(2000)
    .default(800)
    .describe('Duration of opacity fade-in effect in milliseconds'),
  
  rotationDuration: z
    .number()
    .min(300)
    .max(1500)
    .default(600)
    .describe('Duration of rotation effect in milliseconds'),
  
  rotationDelay: z
    .number()
    .min(0)
    .max(500)
    .default(200)
    .describe('Delay before rotation starts (after opacity) in milliseconds'),
  
  blurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .describe('Initial blur amount in pixels'),
  
  perspective: z
    .number()
    .min(300)
    .max(1500)
    .default(600)
    .describe('CSS perspective value for 3D depth effect'),
  
  duration: z
    .number()
    .min(2)
    .max(30)
    .default(5)
    .describe('Total duration of the preset in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    lines,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    gap,
    rotationIntensity,
    staggerDelay,
    opacityDuration,
    rotationDuration,
    rotationDelay,
    blurAmount,
    perspective,
    duration,
  } = params;

  // Convert milliseconds to seconds for effect timing
  const opacityDurationSec = opacityDuration / 1000;
  const rotationDurationSec = rotationDuration / 1000;
  const rotationDelaySec = rotationDelay / 1000;
  const staggerDelaySec = staggerDelay / 1000;

  // Create text line components with effects
  const textLineComponents: RenderableComponentData[] = lines.map((line, index) => {
    const lineId = `text-line-${index + 1}`;
    const lineStagger = index * staggerDelaySec;
    
    // Calculate rotation angle with slight variation per line
    const rotationAngle = -(rotationIntensity - index * 2);

    // Opacity effect: 0 → 0.3 (at 25% progress) → 1 (at 100%)
    const opacityEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: lineStagger,
      duration: opacityDurationSec,
      mode: 'provider',
      targetIds: [lineId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.3, prog: 0.25 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    // RotateY effect: starts 200ms after opacity, rotates from angle to 0
    const rotateYEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: lineStagger + rotationDelaySec,
      duration: rotationDurationSec,
      mode: 'provider',
      targetIds: [lineId],
      ranges: [
        { key: 'rotateY', val: rotationAngle, prog: 0 },
        { key: 'rotateY', val: 0, prog: 1 },
      ],
    };

    // Blur effect: synchronized with rotation, clears from blur to sharp
    const blurEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: lineStagger + rotationDelaySec,
      duration: rotationDurationSec,
      mode: 'provider',
      targetIds: [lineId],
      ranges: [
        { key: 'filter:blur', val: blurAmount, prog: 0 },
        { key: 'filter:blur', val: 0, prog: 1 },
      ],
    };

    return {
      id: lineId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: line,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
          textAlign: 'center' as const,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
          subsets: ['latin'],
          display: 'swap' as const,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `opacity-effect-${index + 1}`,
          componentId: 'generic',
          data: opacityEffect,
        },
        {
          id: `rotateY-effect-${index + 1}`,
          componentId: 'generic',
          data: rotateYEffect,
        },
        {
          id: `blur-effect-${index + 1}`,
          componentId: 'generic',
          data: blurEffect,
        },
      ],
    };
  });

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'minimalist-page-turn-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full flex flex-col justify-center px-8`,
        style: {
          perspective: `${perspective}px`,
          gap: `${gap}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: textLineComponents as RenderableComponentData[],
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
  id: 'minimalist-typography-page-turn',
  title: 'Minimalist Typography Page Turn',
  description:
    'A sophisticated minimalist typography preset featuring subtle Y-axis rotation that mimics pages turning in a book. Text rotates gently 15-20 degrees with a parallax effect, accompanied by fade-in (leading at 30% opacity) and rack-focus blur clearing. Each text element has a slight rotational offset creating a layered, dimensional look with understated elegance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'minimalist',
    'page-turn',
    'rotation',
    'parallax',
    'blur',
    'fade',
    'elegant',
    'dimensional',
    '3d',
    'text-reveal',
    'designer',
    'sophisticated',
  ],
  dependencies: {},
  defaultInputParams: {
    lines: ['First text line', 'Second text line', 'Third text line'],
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: '300',
    textColor: '#ffffff',
    gap: 16,
    rotationIntensity: 20,
    staggerDelay: 150,
    opacityDuration: 800,
    rotationDuration: 600,
    rotationDelay: 200,
    blurAmount: 4,
    perspective: 600,
    duration: 5,
  },
};

// Export preset
export const minimalistTypographyPageTurnPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
