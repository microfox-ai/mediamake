/**
 * Split-Screen Zoom Reveal Preset
 *
 * This preset creates a split-screen zoom reveal effect where text is divided into vertical slices
 * that zoom in from different depths, creating a shattered glass or prismatic effect. Each slice has
 * a different initial scale and blur value, and they all converge to form the complete text.
 *
 * Features:
 * - **Vertical Slices**: Text divided into 10 vertical slices (configurable)
 * - **Varied Depths**: Each slice zooms from random scale (1.5-3) creating depth illusion
 * - **Blur Convergence**: Slices start blurred (5-15px) and converge to sharp
 * - **Rotation**: Subtle rotation (-5 to 5 degrees) during zoom for dynamic movement
 * - **Color Refraction**: Alternating hue rotation (±10deg) for prismatic light effect
 * - **Staggered Animation**: Sequential reveal with 50ms delays between slices
 * - **Smooth Easing**: ease-out timing for natural motion
 *
 * Use cases:
 * - Creating dramatic title reveals with depth
 * - Building shattered glass effects for text
 * - Adding prismatic light refraction to typography
 * - Creating multi-camera angle illusions
 * - Dynamic brand intros with depth and motion
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('SPLIT SCREEN')
    .describe('Text to display with split-screen zoom effect'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  fontSize: z
    .number()
    .min(20)
    .max(500)
    .default(120)
    .describe('Font size in pixels'),
  numberOfSlices: z
    .number()
    .min(5)
    .max(20)
    .default(10)
    .describe('Number of vertical slices to divide text into'),
  zoomDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of zoom animation in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Delay between slice animations in seconds'),
  minScale: z
    .number()
    .min(1)
    .max(2)
    .default(1.5)
    .describe('Minimum initial scale for slices'),
  maxScale: z
    .number()
    .min(2)
    .max(4)
    .default(3)
    .describe('Maximum initial scale for slices'),
  minBlur: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe('Minimum initial blur in pixels'),
  maxBlur: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Maximum initial blur in pixels'),
  rotationRange: z
    .number()
    .min(0)
    .max(15)
    .default(5)
    .describe('Maximum rotation angle in degrees (±)'),
  hueRotation: z
    .number()
    .min(0)
    .max(30)
    .default(10)
    .describe('Hue rotation amount in degrees for color refraction'),
  startTime: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the effect in seconds'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Total duration to display the text in seconds'),
});

// Preset execution function
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
    fontStyle.fontWeight = 'bold';
  }

  // Helper function to generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Create slice components
  const slices: RenderableComponentData[] = [];
  const sliceWidth = 100 / params.numberOfSlices;

  for (let i = 0; i < params.numberOfSlices; i++) {
    const sliceId = `slice-${i}`;
    const textSliceId = `text-slice-${i}`;

    // Random values for this slice
    const initialScale = randomInRange(params.minScale, params.maxScale);
    const initialBlur = randomInRange(params.minBlur, params.maxBlur);
    const rotation = randomInRange(
      -params.rotationRange,
      params.rotationRange,
    );
    const hueRotate = i % 2 === 0 ? -params.hueRotation : params.hueRotation;

    // Calculate clip path for this slice
    const clipLeft = i * sliceWidth;
    const clipRight = (i + 1) * sliceWidth;

    // Create effect for this slice
    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: i * params.staggerDelay,
      duration: params.zoomDuration,
      mode: 'provider',
      targetIds: [sliceId],
      ranges: [
        // Scale animation
        { key: 'scale', val: initialScale, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        // Blur animation
        { key: 'blur', val: initialBlur, prog: 0 },
        { key: 'blur', val: 0, prog: 1 },
        // Rotation animation
        { key: 'rotateZ', val: rotation, prog: 0 },
        { key: 'rotateZ', val: 0, prog: 1 },
        // Hue rotation for color refraction
        { key: 'hueRotate', val: hueRotate, prog: 0 },
        { key: 'hueRotate', val: 0, prog: 1 },
      ],
    };

    // Text atom for this slice
    const textSlice: RenderableComponentData = {
      id: textSliceId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: params.text,
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: fontStyle.fontWeight,
          fontStyle: fontStyle.fontStyle,
          color: params.textColor,
          clipPath: `polygon(${clipLeft}% 0%, ${clipRight}% 0%, ${clipRight}% 100%, ${clipLeft}% 100%)`,
          whiteSpace: 'nowrap',
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    };

    // Slice container
    const slice: RenderableComponentData = {
      id: sliceId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative h-full flex-1 overflow-hidden',
          style: {
            transformOrigin: 'center',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: `zoom-effect-${i}`,
          componentId: 'generic',
          data: effectData,
        },
      ],
      childrenData: [textSlice],
    };

    slices.push(slice);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'split-screen-zoom-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex flex-row overflow-hidden',
      },
    },
    context: {
      timing: {
        start: params.startTime,
        duration: params.duration,
      },
    },
    childrenData: slices,
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
  id: 'split-screen-zoom-reveal',
  title: 'Split-Screen Zoom Reveal',
  description:
    'Text divided into vertical slices that zoom in from different depths, creating a shattered glass or prismatic effect with color refraction',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'zoom',
    'split-screen',
    'prismatic',
    'shattered',
    'reveal',
    'depth',
    'refraction',
    'multi-camera',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SPLIT SCREEN',
    font: 'Inter:700',
    textColor: '#ffffff',
    fontSize: 120,
    numberOfSlices: 10,
    zoomDuration: 0.8,
    staggerDelay: 0.05,
    minScale: 1.5,
    maxScale: 3,
    minBlur: 5,
    maxBlur: 15,
    rotationRange: 5,
    hueRotation: 10,
    startTime: 0,
    duration: 2,
  },
};

// Export preset
export const splitScreenZoomRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
