/**
 * Gentle Overshoot Typography Preset
 *
 * This preset creates a single text element that slides in from the right with realistic
 * physics-based momentum. The text overshoots its final position by 10-15%, then settles
 * back with a pendulum-like motion, complete with a subtle secondary bounce.
 *
 * Features:
 * - **Overshoot Animation**: Text slides in from 120% (off-screen right), overshoots to -15%
 *   at the 60% mark, bounces back to 2% at 80%, and settles at 0% by completion
 * - **Scale Effects**: Subtle scale changes enhance the physical feel - starts at 0.95,
 *   peaks at 1.02 during overshoot, dips to 0.99 during bounce, and settles at 1.0
 * - **Custom Easing**: Uses cubic-bezier(0.68, -0.55, 0.265, 1.55) for organic motion
 * - **GPU Acceleration**: willChange: transform applied for smooth performance
 * - **Configurable Typography**: Custom text, font family, size, weight, and color
 * - **Flexible Duration**: Animation duration ranges from 0.8 to 1.2 seconds
 *
 * Use cases:
 * - Impactful title reveals with physical presence
 * - Dynamic text entrances for social media content
 * - Video editor-style ease-out-back animations
 * - Attention-grabbing headings and callouts
 * - Professional typography with organic motion feel
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters with Zod schema
const presetParams = z.object({
  text: z
    .string()
    .default('Your Text Here')
    .describe('The text content to display with overshoot animation'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family to use (e.g., "Inter", "Roboto", "Montserrat")'),
  
  fontSize: z
    .number()
    .min(12)
    .max(300)
    .default(64)
    .describe('Font size in pixels'),
  
  fontWeight: z
    .union([z.number(), z.string()])
    .default('700')
    .describe('Font weight (e.g., "400", "700", or 400, 700)'),
  
  color: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value like "#FFFFFF" or "rgb(255,255,255)")'),
  
  duration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.0)
    .describe('Total animation duration in seconds (0.8-1.2 recommended for optimal effect)'),
  
  containerClassName: z
    .string()
    .optional()
    .describe('Additional CSS classes for the container (e.g., "bg-black/30 px-8 py-4 rounded-xl")'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const textElementId = 'gentle-overshoot-text';
  const containerId = 'gentle-overshoot-container';

  // Parse font weight to ensure it's properly formatted
  const fontWeightValue = typeof params.fontWeight === 'number' 
    ? params.fontWeight.toString() 
    : params.fontWeight;

  // Create the generic keyframe effect for overshoot animation
  const overshootEffectData: GenericEffectData = {
    type: 'cubic-bezier',
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textElementId],
    ranges: [
      // TranslateX animation: off-screen right → overshoot → bounce → settle
      { key: 'translateX', val: 120, prog: 0, unit: '%' },
      { key: 'translateX', val: -15, prog: 0.6, unit: '%' },
      { key: 'translateX', val: 2, prog: 0.8, unit: '%' },
      { key: 'translateX', val: 0, prog: 1, unit: '%' },
      
      // Scale animation: subtle changes to enhance physical feel
      { key: 'scale', val: 0.95, prog: 0 },
      { key: 'scale', val: 1.02, prog: 0.6 },
      { key: 'scale', val: 0.99, prog: 0.8 },
      { key: 'scale', val: 1.0, prog: 1 },
    ],
  };

  // Create the effect node
  const overshootEffect = {
    id: 'gentle-overshoot-effect',
    componentId: 'generic',
    data: overshootEffectData,
  };

  // Create the TextAtom with the text and styling
  const textAtomData: TextAtomData = {
    text: params.text,
    style: {
      fontSize: params.fontSize,
      fontWeight: fontWeightValue,
      color: params.color,
      textAlign: 'center',
      willChange: 'transform', // GPU acceleration
    },
    font: {
      family: params.fontFamily,
      weights: [fontWeightValue],
      subsets: ['latin'],
      display: 'swap',
    },
  };

  const textAtom: RenderableComponentData = {
    id: textElementId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: textAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [overshootEffect],
  };

  // Create the root container with centered layout
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full flex items-center justify-center ${params.containerClassName || ''}`.trim(),
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textAtom] as RenderableComponentData[],
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
  id: 'gentle-overshoot-typography',
  title: 'Gentle Overshoot Typography',
  description:
    'Typography preset featuring physics-based overshoot animation. Text slides in from right with momentum, overshoots target by 10-15%, then settles with pendulum-like motion and subtle secondary bounce. Uses custom keyframe animation with translateX and scale effects, creating an organic "ease-out-back" feel perfect for impactful titles and dynamic text reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'animation',
    'overshoot',
    'bounce',
    'physics',
    'slide',
    'ease-out-back',
    'kinetic',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Welcome',
    fontFamily: 'Inter',
    fontSize: 64,
    fontWeight: '700',
    color: '#FFFFFF',
    duration: 1.0,
  },
};

// Export preset
export const gentleOvershootTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
