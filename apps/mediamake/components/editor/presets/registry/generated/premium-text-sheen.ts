/**
 * Premium Text Sheen Effect Preset
 *
 * A sophisticated typokinetic preset that creates a premium light sheen effect sweeping across text.
 * The effect simulates a soft spotlight or light bar passing over metallic text, creating a gleaming
 * highlight that moves smoothly from left to right.
 *
 * Features:
 * - Smooth sheen sweep animation using gradient background-position
 * - Configurable sheen intensity and sweep duration
 * - Text styling with shadows for depth
 * - GPU-accelerated animation with will-change
 * - Continuous looping or single-pass animation
 * - Premium commercial-quality appearance
 *
 * Use cases:
 * - Title sequences in high-end commercials
 * - Premium product showcases
 * - Elegant brand reveals
 * - Sophisticated video intros
 * - Luxury content branding
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().default('Premium Text').describe('Text content to display'),
  
  // Text styling
  fontSize: z
    .number()
    .min(16)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (hex or CSS color)'),
  
  // Sheen effect
  sheenColor: z
    .string()
    .default('rgba(255, 255, 255, 0.3)')
    .describe('Color of the sheen highlight (use rgba for transparency)'),
  sheenWidth: z
    .number()
    .min(50)
    .max(300)
    .default(150)
    .describe('Width of the sheen gradient in pixels'),
  sweepDuration: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .describe('Duration of one complete sheen sweep in seconds'),
  
  // Shadow and depth
  textShadow: z
    .string()
    .default('0 2px 8px rgba(0,0,0,0.3)')
    .describe('Text shadow for depth (CSS text-shadow syntax)'),
  
  // Timing
  duration: z
    .number()
    .min(1)
    .default(5)
    .describe('Total duration of the text display in seconds'),
  loopSheen: z
    .boolean()
    .default(true)
    .describe('Whether to loop the sheen animation continuously'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const containerId = 'premium-sheen-container';
  const textId = 'premium-sheen-text';
  
  // Calculate gradient positions
  const sheenWidthPercent = (params.sheenWidth / 1000) * 100; // Normalize to percentage
  const gradientStart = Math.max(0, 50 - sheenWidthPercent / 2);
  const gradientEnd = Math.min(100, 50 + sheenWidthPercent / 2);
  
  // Create gradient string
  const sheenGradient = `linear-gradient(90deg, transparent 0%, transparent ${gradientStart}%, ${params.sheenColor} 50%, transparent ${gradientEnd}%, transparent 100%)`;
  
  // Calculate number of loops if continuous
  const loopCount = params.loopSheen 
    ? Math.ceil(params.duration / params.sweepDuration)
    : 1;
  
  // Create sheen effect using translateX on a pseudo-element approach
  // We'll use a gradient mask on the text itself
  const sheenEffect = {
    id: 'sheen-sweep-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: params.loopSheen ? params.duration : params.sweepDuration,
      mode: 'provider' as const,
      targetIds: [textId],
      ranges: params.loopSheen
        ? // Create looping animation with multiple cycles
          Array.from({ length: loopCount + 1 }, (_, i) => {
            const progress = i / loopCount;
            // Move from -200% to 200% to ensure complete sweep
            const position = -200 + progress * 400;
            return {
              key: 'backgroundPositionX',
              val: `${position}%`,
              prog: progress,
            };
          })
        : // Single sweep animation
          [
            { key: 'backgroundPositionX', val: '-200%', prog: 0 },
            { key: 'backgroundPositionX', val: '200%', prog: 1 },
          ],
    },
  };
  
  // Create text component with sheen gradient
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: params.fontWeight,
        color: params.textColor,
        textShadow: params.textShadow,
        position: 'relative' as const,
        // Apply gradient as background with mask
        background: `
          ${sheenGradient},
          ${params.textColor}
        `,
        backgroundSize: '200% 100%, 100% 100%',
        backgroundPosition: '-200% 0, 0 0',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        // Use text-fill-color to maintain text color with gradient overlay
        WebkitTextFillColor: params.textColor,
        // Blend the gradient
        backgroundBlendMode: 'screen',
        // GPU acceleration
        willChange: 'background-position',
      },
      font: {
        family: params.fontFamily,
        weights: [params.fontWeight],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [sheenEffect],
  };
  
  // Create container layout
  const container: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden flex items-center justify-center',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textComponent],
  };
  
  return {
    output: {
      childrenData: [container as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'premium-text-sheen',
  title: 'Premium Text Sheen Effect',
  description:
    'A sophisticated typokinetic preset that creates a premium light sheen effect sweeping across text. The effect simulates a soft spotlight or light bar passing over metallic text, using animated gradient background-position on the text itself to create a true text-clipped sheen. Features smooth ease-in-out timing for a high-end commercial feel, with configurable text styling including shadows for depth. Perfect for title sequences, product showcases, and elegant brand reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'sheen',
    'shimmer',
    'premium',
    'commercial',
    'gradient',
    'animation',
    'highlight',
    'sweep',
    'metallic',
    'elegant',
    'sophisticated',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Premium Text',
    fontSize: 64,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#FFFFFF',
    sheenColor: 'rgba(255, 255, 255, 0.3)',
    sheenWidth: 150,
    sweepDuration: 2.5,
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
    duration: 5,
    loopSheen: true,
  },
};

// Export preset
export const premiumTextSheenPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
