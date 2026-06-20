/**
 * Minimalist Subliminal Zoom Typography Preset
 *
 * This preset creates a hypnotic, meditative title card with an almost imperceptible
 * continuous zoom effect. The text appears static at first glance, but over 5-10 seconds,
 * it scales from 100% to 103% with perfectly linear easing.
 *
 * Features:
 * - **Subliminal Zoom Effect**: Barely perceptible scale transformation (1.0 → 1.03)
 * - **Linear Easing**: Perfectly linear motion for consistent, meditative quality
 * - **Center-Origin Transform**: Zoom originates from exact center for hypnotic effect
 * - **Clean Typography**: Sans-serif font with wide tracking for modern aesthetic
 * - **GPU Acceleration**: Uses will-change-transform for optimal performance
 * - **Responsive Sizing**: Scales from 4xl to 6xl based on screen size
 *
 * Use cases:
 * - Title cards that hold attention through subtle motion
 * - Meditative opening sequences
 * - Ken Burns-style photo effects on text
 * - Subtle brand introductions
 * - Hypnotic typography animations
 */

import { z } from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  caption: z.object({
    text: z.string().describe('Text to display with subliminal zoom effect'),
    duration: z
      .number()
      .min(5)
      .max(20)
      .default(8)
      .describe('Duration in seconds (5-20s recommended for subliminal effect)'),
  }),
  font: z
    .string()
    .optional()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:300", "Roboto:400")',
    ),
  textColor: z
    .string()
    .optional()
    .default('#1F2937')
    .describe('Text color (default: gray-900 #1F2937)'),
  scaleEnd: z
    .number()
    .min(1.01)
    .max(1.05)
    .default(1.03)
    .describe('End scale value (1.01-1.05, default: 1.03 for subtle effect)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10) || 300;
    }
  } else {
    fontStyle.fontWeight = 300; // Default light weight
  }

  // Component IDs
  const rootContainerId = 'minimalist-subliminal-zoom-container';
  const textAtomId = 'minimalist-subliminal-zoom-text';
  const zoomEffectId = 'minimalist-subliminal-zoom-effect';

  // Create zoom effect data
  const zoomEffectData: GenericEffectData = {
    type: 'linear', // Perfectly linear easing for subliminal effect
    start: 0,
    duration: params.caption.duration,
    mode: 'provider',
    targetIds: [rootContainerId],
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: params.scaleEnd, prog: 1 },
    ],
  };

  // Create zoom effect node
  const zoomEffect = {
    id: zoomEffectId,
    componentId: 'generic',
    data: zoomEffectData,
  };

  // Create text atom
  const textAtom = {
    id: textAtomId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.caption.text,
      className: 'font-sans text-4xl md:text-6xl font-light tracking-wide',
      style: {
        textAlign: 'center' as const,
        color: params.textColor,
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['300'],
        subsets: ['latin'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.caption.duration,
      },
    },
  };

  // Create root container with zoom effect
  const rootContainer = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center w-full h-full',
        style: {
          transformOrigin: 'center',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.caption.duration,
      },
    },
    effects: [zoomEffect],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'minimalist-subliminal-zoom',
  title: 'Minimalist Subliminal Zoom Typography',
  description:
    'A minimalist typographic preset featuring an almost imperceptible continuous zoom effect. Text scales from 100% to 103% over 5-10 seconds with perfectly linear easing, creating a hypnotic, meditative quality similar to a Ken Burns photo effect. The zoom originates from center, holding attention through subtle motion rather than dramatic animation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'minimalist',
    'subliminal',
    'zoom',
    'ken-burns',
    'meditative',
    'hypnotic',
    'title-card',
    'linear',
    'subtle',
  ],
  dependencies: {},
  defaultInputParams: {
    caption: {
      text: 'MINIMALIST DESIGN',
      duration: 8,
    },
    font: 'Inter:300',
    textColor: '#1F2937',
    scaleEnd: 1.03,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const minimalistSubliminalZoomPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
