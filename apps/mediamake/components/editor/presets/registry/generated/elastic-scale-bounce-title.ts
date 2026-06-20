/**
 * Elastic Scale Bounce Title Animation Preset
 *
 * This preset creates a punchy title animation with a dramatic elastic bounce effect.
 * Features include:
 * - Scale animation from 0 to 120% with elastic bounce back to 100%
 * - Subtle rotation effect (0 to 5 degrees) during scale-up, returning to 0 during bounce
 * - Motion blur effect during the fastest movement (0-20% of animation)
 * - Spring-like motion that mimics professional motion graphics
 * - Energetic and attention-grabbing, perfect for YouTube intros and title sequences
 *
 * Use cases:
 * - YouTube intro animations
 * - Social media title cards
 * - Podcast episode intros
 * - Product announcement videos
 * - Any content requiring punchy, energetic title animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import type {
  TextAtomData,
  GenericEffectData,
  BaseEffect,
} from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().describe('Text to display in the title animation'),
  duration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Total animation duration in seconds (0.8-1.2s recommended)'),
  fontSize: z
    .union([z.string(), z.number()])
    .optional()
    .describe('Font size (e.g., "64px" or 64)'),
  fontWeight: z
    .union([z.string(), z.number()])
    .optional()
    .describe('Font weight (e.g., "bold", "700", or 700)'),
  color: z.string().optional().describe('Text color (e.g., "#ffffff")'),
  fontFamily: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textShadow: z
    .string()
    .optional()
    .describe('Text shadow CSS (e.g., "0 4px 12px rgba(0,0,0,0.3)")'),
  position: z
    .object({
      top: z.string().optional().describe('Top position (e.g., "50%")'),
      left: z.string().optional().describe('Left position (e.g., "50%")'),
      bottom: z.string().optional().describe('Bottom position'),
      right: z.string().optional().describe('Right position'),
    })
    .optional()
    .describe('Position configuration for absolute positioning'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Generate unique IDs
  const containerId = 'elastic-bounce-container';
  const textId = 'elastic-bounce-text';

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter';
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
  }

  // Prepare position style
  const positionStyle: React.CSSProperties = {};
  if (params.position) {
    if (params.position.top) positionStyle.top = params.position.top;
    if (params.position.left) positionStyle.left = params.position.left;
    if (params.position.bottom) positionStyle.bottom = params.position.bottom;
    if (params.position.right) positionStyle.right = params.position.right;
  }

  // Create elastic bounce effect with rotation
  const elasticBounceEffect: BaseEffect = {
    id: 'elastic-bounce-effect',
    componentId: 'generic',
    data: {
      type: 'spring',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        // Scale animation keyframes
        { key: 'scale', val: 0, prog: 0 }, // Start invisible at scale 0
        { key: 'scale', val: 1.2, prog: 0.2 }, // Overshoot to 120% scale
        { key: 'scale', val: 0.9, prog: 0.4 }, // Bounce back to 90%
        { key: 'scale', val: 1.05, prog: 0.6 }, // Slight overshoot to 105%
        { key: 'scale', val: 0.98, prog: 0.8 }, // Near-final settle at 98%
        { key: 'scale', val: 1, prog: 1 }, // Final settle at 100% scale

        // Rotation animation keyframes
        { key: 'rotate', val: 0, prog: 0 }, // Start with no rotation
        { key: 'rotate', val: 5, prog: 0.2 }, // Rotate 5deg during scale-up
        { key: 'rotate', val: -2, prog: 0.4 }, // Counter-rotate to -2deg
        { key: 'rotate', val: 1, prog: 0.6 }, // Small rotation at 1deg
        { key: 'rotate', val: 0, prog: 0.8 }, // Rotation returns to 0
        { key: 'rotate', val: 0, prog: 1 }, // Final rotation at 0deg
      ],
    } as GenericEffectData,
  };

  // Create motion blur effect (0-20% of animation)
  const motionBlurEffect: BaseEffect = {
    id: 'motion-blur-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: params.duration * 0.2,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'filter', val: 'blur(2px)', prog: 0 }, // Start with 2px blur
        { key: 'filter', val: 'blur(0px)', prog: 1 }, // Fade blur out by 20%
      ],
    } as GenericEffectData,
  };

  // Create text atom with styling
  const textAtom = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize || '64px',
        fontWeight: params.fontWeight || 'bold',
        color: params.color || '#ffffff',
        textAlign: 'center' as const,
        transformOrigin: 'center',
        willChange: 'transform',
        textShadow: params.textShadow || '0 4px 12px rgba(0,0,0,0.3)',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [elasticBounceEffect, motionBlurEffect],
  } as RenderableComponentData;

  // Create root container
  const rootContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: positionStyle,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textAtom] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'elastic-scale-bounce-title',
  title: 'Elastic Scale Bounce Title Animation',
  description:
    'A punchy title animation with elastic bounce effect featuring dramatic scale-up from 0 to 120%, spring-like bounce back to 100%, subtle rotation for dynamism, and motion blur during fast movement. Perfect for YouTube intros and attention-grabbing title sequences with professional motion graphics feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'title',
    'animation',
    'elastic',
    'bounce',
    'scale',
    'spring',
    'punchy',
    'youtube',
    'intro',
    'motion-graphics',
    'rotation',
    'motion-blur',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'YOUR TITLE',
    duration: 1,
    fontSize: '64px',
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: 'Inter:700',
    textShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
};

// Export preset
export const elasticScaleBounceTitlePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
