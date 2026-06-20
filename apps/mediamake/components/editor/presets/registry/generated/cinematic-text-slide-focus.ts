/**
 * Cinematic Text Slide Focus Reveal Preset
 *
 * This preset creates a sophisticated text reveal effect combining horizontal slide animation
 * with simultaneous gaussian blur reduction, mimicking a cinematic rack-focus effect.
 *
 * Features:
 * - **Dual Animation**: Horizontal slide (150% to 0%) + blur reduction (8px to 0px)
 * - **Rack Focus Effect**: Blur clears by 60% while slide continues to 100%
 * - **Independent Timing**: Separate timing functions for translation (ease-out) and blur (ease-in-out)
 * - **GPU Acceleration**: Optimized with transform-gpu and will-change properties
 * - **Depth & Sophistication**: Additional opacity animation (0.7 to 1) for enhanced depth
 * - **Professional Polish**: Perfect for documentary titles and elegant brand presentations
 *
 * Use cases:
 * - Documentary opening titles with cinematic feel
 * - Elegant brand presentations requiring sophistication
 * - Professional video introductions with depth
 * - High-end product reveals with focus-pull effect
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total animation duration in seconds'),
  fontSize: z
    .string()
    .optional()
    .default('64px')
    .describe('Font size (e.g., "64px", "48px")'),
  fontFamily: z
    .string()
    .optional()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .optional()
    .default('700')
    .describe('Font weight (e.g., "700", "bold", "400")'),
  color: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  textShadow: z
    .string()
    .optional()
    .default('0 4px 12px rgba(0,0,0,0.3)')
    .describe('Text shadow for depth (CSS text-shadow value)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration;
  const blurDuration = duration * 0.6; // Blur clears at 60% of total duration

  // Parse font string if it includes weight/style
  const fontString = params.fontFamily || 'Inter';
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
  }

  const textWrapperId = 'cinematic-text-wrapper';
  const textAtomId = 'cinematic-text-atom';

  // Effect 1: Horizontal slide (ease-out, full duration)
  const slideEffect = {
    id: 'slide-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [textWrapperId],
      ranges: [
        { key: 'translateX', val: '150%', prog: 0 },
        { key: 'translateX', val: '0%', prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Effect 2: Blur reduction (ease-in-out, 60% duration)
  const blurEffect = {
    id: 'blur-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: blurDuration,
      mode: 'provider',
      targetIds: [textWrapperId],
      ranges: [
        { key: 'filter', val: 'blur(8px)', prog: 0 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Effect 3: Opacity fade-in (ease-in-out, 60% duration)
  const opacityEffect = {
    id: 'opacity-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: blurDuration,
      mode: 'provider',
      targetIds: [textWrapperId],
      ranges: [
        { key: 'opacity', val: 0.7, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Text atom component
  const textAtom = {
    id: textAtomId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: params.fontWeight,
        color: params.color,
        textAlign: 'center',
        textShadow: params.textShadow,
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: [params.fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData;

  // Text wrapper with GPU acceleration
  const textWrapper = {
    id: textWrapperId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'backdrop-blur-none transform-gpu will-change-transform will-change-filter',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [slideEffect, blurEffect, opacityEffect],
    childrenData: [textAtom],
  } as RenderableComponentData;

  // Root container
  const rootContainer = {
    id: 'cinematic-slide-focus-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textWrapper],
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
  id: 'cinematic-text-slide-focus',
  title: 'Cinematic Text Slide Focus Reveal',
  description:
    'A sophisticated text reveal effect combining horizontal slide animation (150% to 0%) with simultaneous gaussian blur reduction (8px to 0px), creating a cinematic rack-focus effect. The blur clears by 60% of animation duration while translation continues to 100%, mimicking a camera operator adjusting focus while text slides along an invisible track. Perfect for documentary titles and elegant brand presentations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'cinematic',
    'slide',
    'blur',
    'focus',
    'rack-focus',
    'reveal',
    'horizontal',
    'sophisticated',
    'documentary',
    'brand',
    'elegant',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Cinematic Reveal',
    duration: 3,
    fontSize: '64px',
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#ffffff',
    textShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
};

// Export preset
export const cinematicTextSlideFocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
