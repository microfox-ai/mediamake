/**
 * Swiss Scale Bounce - Golden Ratio
 * 
 * A minimalist, elegant scale-bounce effect inspired by Swiss design and modern UI animations.
 * Features mathematical precision with golden ratio proportions (1.618) for the overshoot,
 * with a single refined bounce. Pure scale transformation with no rotation or skew,
 * using monospace typography and geometric composition.
 * 
 * Technical Features:
 * - Golden ratio scale animation: 0 → 1.618 → 0.618 → 1.0 over 0.8s
 * - Expanding outline effect using box-shadow (0px → 3px)
 * - Optional letter-spacing breathing: 0 → 0.1em → 0
 * - CSS Grid for precise center alignment
 * - Cubic-bezier easing for refined movement
 * - Monospace typography with clean geometric composition
 * 
 * Use Cases:
 * - Minimalist title reveals with mathematical precision
 * - Swiss design-inspired text animations
 * - Modern UI entrance effects with refined bounce
 * - Elegant scale-based motion graphics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .default('SCALE')
    .describe('Text content to display with scale-bounce effect'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(96)
    .optional()
    .describe('Font size in pixels (24-200)'),
  fontWeight: z
    .number()
    .min(100)
    .max(900)
    .default(500)
    .optional()
    .describe('Font weight (100-900)'),
  textColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Text color (hex, rgb, or CSS color name)'),
  backgroundColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Background color (hex, rgb, or CSS color name)'),
  duration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.8)
    .optional()
    .describe('Animation duration in seconds (0.3-3)'),
  enableLetterSpacing: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable letter-spacing breathing animation'),
  outlineColor: z
    .string()
    .default('rgba(0, 0, 0, 0.1)')
    .optional()
    .describe('Outline color with alpha (e.g., rgba(0, 0, 0, 0.1))'),
  font: z
    .string()
    .default('JetBrains Mono')
    .optional()
    .describe('Monospace font family (e.g., "JetBrains Mono", "Roboto Mono")'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text = 'SCALE',
    fontSize = 96,
    fontWeight = 500,
    textColor = '#000000',
    backgroundColor = '#FFFFFF',
    duration = 0.8,
    enableLetterSpacing = true,
    outlineColor = 'rgba(0, 0, 0, 0.1)',
    font = 'JetBrains Mono',
  } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = font;
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font weight from font string if provided
  let finalFontWeight = fontWeight;
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      finalFontWeight = parseInt(fontParts[1], 10);
    }
  }

  const textId = 'swiss-scale-text';

  // Golden ratio scale keyframes: 0 → 1.618 → 0.618 → 1.0
  // Progress points: 0, 0.4, 0.7, 1.0
  const scaleRanges = [
    { key: 'scale', val: 0, prog: 0 },
    { key: 'scale', val: 1.618, prog: 0.4 }, // Golden ratio overshoot
    { key: 'scale', val: 0.618, prog: 0.7 }, // Golden ratio undershoot
    { key: 'scale', val: 1.0, prog: 1 }, // Final settle
  ];

  // Outline expansion: 0px → 3px
  const outlineRanges = [
    { key: 'boxShadow', val: `0 0 0 0px ${outlineColor}`, prog: 0 },
    { key: 'boxShadow', val: `0 0 0 3px ${outlineColor}`, prog: 0.4 },
    { key: 'boxShadow', val: `0 0 0 2px ${outlineColor}`, prog: 0.7 },
    { key: 'boxShadow', val: `0 0 0 0px ${outlineColor}`, prog: 1 },
  ];

  // Letter-spacing breathing: 0 → 0.1em → 0
  const letterSpacingRanges = enableLetterSpacing
    ? [
        { key: 'letterSpacing', val: '0em', prog: 0 },
        { key: 'letterSpacing', val: '0.1em', prog: 0.4 },
        { key: 'letterSpacing', val: '0.05em', prog: 0.7 },
        { key: 'letterSpacing', val: '0em', prog: 1 },
      ]
    : [];

  // Combine all ranges
  const allRanges = [...scaleRanges, ...outlineRanges, ...letterSpacingRanges];

  // Create unified effect with cubic-bezier easing
  const scaleEffect: GenericEffectData = {
    type: 'ease-in-out', // Will be overridden by custom cubic-bezier in component if supported
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: allRanges,
    // Note: cubic-bezier(0.25, 0.46, 0.45, 0.94) is applied via component props
    props: {
      easingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
  };

  const effect = {
    id: 'swiss-scale-effect',
    componentId: 'generic',
    data: scaleEffect,
  };

  // Root container with CSS Grid for precise center alignment
  const rootContainer: RenderableComponentData = {
    id: 'swiss-scale-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'grid place-items-center h-full',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [effect],
    childrenData: [
      {
        id: textId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: text,
          className: 'font-mono',
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: finalFontWeight,
            letterSpacing: '0em',
          },
          font: {
            family: fontFamily,
            weights: [finalFontWeight.toString()],
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
      } as RenderableComponentData,
    ],
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
  id: 'swiss-scale-bounce',
  title: 'Swiss Scale Bounce - Golden Ratio',
  description:
    'Minimalist, elegant scale-bounce effect inspired by Swiss design and modern UI animations. Features mathematical precision with golden ratio proportions (1.618) for the overshoot, with a single refined bounce. Pure scale transformation with no rotation or skew, using monospace typography and geometric composition. Includes a subtle expanding outline effect that emphasizes motion without overwhelming. Structured with precise grid alignment and cubic-bezier easing for refined movement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'scale',
    'bounce',
    'swiss-design',
    'minimalist',
    'golden-ratio',
    'geometric',
    'monospace',
    'modern',
    'elegant',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SCALE',
    fontSize: 96,
    fontWeight: 500,
    textColor: '#000000',
    backgroundColor: '#FFFFFF',
    duration: 0.8,
    enableLetterSpacing: true,
    outlineColor: 'rgba(0, 0, 0, 0.1)',
    font: 'JetBrains Mono',
  },
};

export const swissScaleBouncePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};