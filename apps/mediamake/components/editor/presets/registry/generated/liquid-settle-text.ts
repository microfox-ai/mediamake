/**
 * Liquid Settle Text Animation Preset
 *
 * This preset creates a viscous liquid-like text animation where text flows in from above,
 * overshoots with wave-like distortions, and settles into its final position. The effect
 * simulates the fluid quality of pouring honey that pools and spreads before finding its level.
 *
 * Features:
 * - **Fluid Motion**: Text flows in with vertical translation, scale, and skew transforms
 * - **Overshoot Effect**: Simulates liquid bounce with scale and skew variations at peak
 * - **Wave Distortion**: Horizontal scale oscillation creates ripple-like propagation
 * - **Cascading Ripple**: Staggered timing (0.05s offsets) creates wave propagation through words
 * - **Motion Blur**: Subtle blur and contrast effects enhance liquid quality during motion
 * - **Organic Quality**: Complex transform chain creates alive, artistic presentation
 *
 * Use cases:
 * - Creative title cards with organic motion
 * - Artistic text reveals for brand videos
 * - Fluid typography for music videos
 * - Dynamic headline animations for social media
 * - Elegant text transitions for presentations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  text: z
    .string()
    .default('Liquid Settle')
    .describe('Text content to animate (will be split into words)'),
  fontSize: z
    .number()
    .min(16)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  wordSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Gap between words in pixels'),
  duration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Animation duration in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Delay between each word animation in seconds'),
  overshootIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for overshoot effect (0.5 = subtle, 2 = extreme)'),
  start: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the animation (relative to parent)'),
  totalDuration: z
    .number()
    .optional()
    .describe('Total duration for text visibility (defaults to duration + extra settle time)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
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

  // Split text into words
  const words = params.text.trim().split(/\s+/);

  // Calculate timing
  const effectDuration = params.duration;
  const staggerDelay = params.staggerDelay;
  const totalAnimationTime = effectDuration + staggerDelay * (words.length - 1);
  const settlePadding = 0.3; // Extra time for settling
  const totalDuration =
    params.totalDuration || totalAnimationTime + settlePadding;

  // Overshoot intensity
  const overshoot = params.overshootIntensity;

  // Create word components with effects
  const wordComponents: RenderableComponentData[] = words.map(
    (word, index) => {
      const wordId = `liquid-word-${index}`;
      const wordStartDelay = index * staggerDelay;

      // Liquid flow effect with overshoot and wave distortion
      const liquidEffect = {
        id: `liquid-effect-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
          start: wordStartDelay,
          duration: effectDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Initial state: compressed, skewed, above viewport
            { key: 'translateY', val: -50, prog: 0 },
            { key: 'scaleY', val: 0.5, prog: 0 },
            { key: 'skewX', val: 10 * overshoot, prog: 0 },
            { key: 'scaleX', val: 0.95, prog: 0 },
            { key: 'blur', val: 0.5, prog: 0 },
            { key: 'contrast', val: 1.1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0 },

            // Overshoot peak: stretched, reverse skew, wave expansion
            { key: 'translateY', val: 5 * overshoot, prog: 0.6 },
            { key: 'scaleY', val: 1.2 * overshoot, prog: 0.6 },
            { key: 'skewX', val: -5 * overshoot, prog: 0.6 },
            { key: 'scaleX', val: 1.05, prog: 0.6 },
            { key: 'blur', val: 0.3, prog: 0.6 },
            { key: 'contrast', val: 1.05, prog: 0.6 },
            { key: 'opacity', val: 1, prog: 0.3 },

            // Settle to final position: normalized transforms
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'scaleY', val: 1, prog: 1 },
            { key: 'skewX', val: 0, prog: 1 },
            { key: 'scaleX', val: 1, prog: 1 },
            { key: 'blur', val: 0, prog: 1 },
            { key: 'contrast', val: 1, prog: 1 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      };

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word,
          style: {
            fontSize: `${params.fontSize}px`,
            color: params.textColor,
            ...fontStyle,
            willChange: 'transform, filter',
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
            duration: totalDuration,
          },
        },
        effects: [liquidEffect],
      } as RenderableComponentData;
    },
  );

  // Root container with flexbox layout
  const rootContainer = {
    id: 'liquid-settle-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full flex items-center justify-center',
        style: {
          gap: `${params.wordSpacing}px`,
        },
      },
    },
    context: {
      timing: {
        start: params.start,
        duration: totalDuration,
      },
    },
    childrenData: wordComponents,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'liquid-settle-text',
  title: 'Liquid Settle Text Animation',
  description:
    'Text flows in like viscous liquid with overshoot and ripple effects, using skew and scale transforms to simulate liquid deformation. Features wave-like distortions that propagate through text with organic, fluid quality perfect for creative presentations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'liquid',
    'fluid',
    'organic',
    'creative',
    'artistic',
    'overshoot',
    'ripple',
    'wave',
    'kinetic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Liquid Settle',
    fontSize: 64,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    wordSpacing: 8,
    duration: 1,
    staggerDelay: 0.05,
    overshootIntensity: 1,
    start: 0,
  },
};

// Export preset
export const liquidSettleTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
