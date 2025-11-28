/**
 * Selective Saturation Mask Effect Preset
 *
 * This internal effect preset applies intelligent desaturation based on element hierarchy or type.
 * It desaturates background elements while keeping foreground content vibrant, or vice versa
 * using inverse modes. The effect uses CSS filter combinations (grayscale + contrast + blur)
 * to maintain visual depth while creating focus effects where color guides viewer attention.
 *
 * Features:
 * - **Hierarchy-Based Desaturation**: Apply different saturation levels to background, midground, and foreground
 * - **Inverse Mode**: Flip the effect to desaturate foreground and keep background vibrant
 * - **Partial Desaturation**: Fine-grained control over grayscale percentages per layer
 * - **Smooth Transitions**: Optional fade-in/fade-out for seamless saturation changes
 * - **Contrast Adjustments**: Maintain visual depth with automatic contrast compensation
 *
 * Use cases:
 * - Creating focus effects where color directs attention to key elements
 * - Depth-of-field style effects using saturation instead of blur
 * - Highlighting specific UI elements or content areas
 * - Building visual hierarchy through selective color removal
 *
 * Technical Details:
 * - Effect type: Generic with conditional logic
 * - Properties: filter (grayscale + contrast + optional blur)
 * - Mode: provider (targets specific components by ID)
 * - Helper function: getFilterForLayer determines filter values based on layer configuration
 *
 * ARRAY OF EFFECTS:
 * Returns an array of generic effects, one for each targetId, with customized filter values
 * based on the layer configuration and z-index/element type mapping.
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the saturation mask to'),
  layerConfig: z
    .object({
      background: z
        .number()
        .min(0)
        .max(100)
        .describe('Grayscale percentage for background elements (0-100)'),
      midground: z
        .number()
        .min(0)
        .max(100)
        .describe('Grayscale percentage for midground elements (0-100)'),
      foreground: z
        .number()
        .min(0)
        .max(100)
        .describe('Grayscale percentage for foreground elements (0-100)'),
    })
    .describe('Layer configuration defining desaturation levels per hierarchy'),
  invertMode: z
    .boolean()
    .default(false)
    .describe('Invert the effect: desaturate foreground, keep background vibrant'),
  smoothTransition: z
    .boolean()
    .default(true)
    .describe('Enable smooth fade-in/fade-out transitions for the saturation effect'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(5)
    .describe('Duration of the effect in seconds'),
  layerMapping: z
    .record(z.string(), z.enum(['background', 'midground', 'foreground']))
    .optional()
    .describe(
      'Optional mapping of targetIds to layer types (background/midground/foreground). If not provided, defaults to background for all.'
    ),
  contrastBoost: z
    .number()
    .min(100)
    .max(200)
    .default(110)
    .describe('Contrast adjustment percentage to maintain visual depth (100-200)'),
  addBlur: z
    .boolean()
    .default(false)
    .describe('Add slight blur to desaturated elements for enhanced depth effect'),
  blurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Blur amount in pixels (only applied if addBlur is true)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps
): PresetOutput => {
  const {
    targetIds,
    layerConfig,
    invertMode,
    smoothTransition,
    effectStart,
    effectDuration,
    layerMapping,
    contrastBoost,
    addBlur,
    blurAmount,
  } = params;

  /**
   * Helper function: Determines the filter string for a given target ID
   * based on its layer type and the layer configuration.
   */
  const getFilterForLayer = (
    targetId: string,
    config: typeof layerConfig,
    invert: boolean,
    contrast: number,
    blur: boolean,
    blurPx: number
  ): string => {
    // Determine layer type from mapping or default to background
    const layerType = layerMapping?.[targetId] || 'background';

    // Get grayscale percentage based on layer type
    let grayscalePercent = config.background;
    if (layerType === 'midground') {
      grayscalePercent = config.midground;
    } else if (layerType === 'foreground') {
      grayscalePercent = config.foreground;
    }

    // Apply invert mode: flip the grayscale percentage
    // In invert mode, background becomes vibrant (0% grayscale) and foreground becomes desaturated
    if (invert) {
      grayscalePercent = 100 - grayscalePercent;
    }

    // Construct filter string
    let filterStr = `grayscale(${grayscalePercent}%)`;

    // Add contrast adjustment to maintain visual depth
    if (contrast !== 100) {
      filterStr += ` contrast(${contrast}%)`;
    }

    // Add optional blur for enhanced depth effect
    if (blur && blurPx > 0 && grayscalePercent > 0) {
      filterStr += ` blur(${blurPx}px)`;
    }

    return filterStr;
  };

  // Generate effects array: one generic effect per targetId
  const effects = targetIds.map((targetId, index) => {
    const filterValue = getFilterForLayer(
      targetId,
      layerConfig,
      invertMode,
      contrastBoost,
      addBlur,
      blurAmount
    );

    // Define progression array based on smoothTransition setting
    const prog = smoothTransition
      ? [0, 0.2, 0.8, 1] // Smooth fade-in (0-0.2) and fade-out (0.8-1)
      : [0, 1]; // Instant application

    const effectData: GenericEffectData = {
      type: smoothTransition ? 'ease-in-out' : 'linear',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'filter', val: 'none', prog: prog[0] },
        { key: 'filter', val: filterValue, prog: prog[1] },
        ...(smoothTransition
          ? [
              { key: 'filter', val: filterValue, prog: prog[2] },
              { key: 'filter', val: 'none', prog: prog[3] },
            ]
          : []),
      ],
    };

    return {
      id: `selective-saturation-mask-${targetId}-${index}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  return {
    output: {
      childrenData: [
        {
          id: 'selective-saturation-mask-root',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
            },
          },
          context: {
            timing: {
              start: 0,
              fitDurationTo: 'BaseScene',
            },
          },
          effects,
          childrenData: [],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'selective-saturation-mask',
  title: 'Selective Saturation Mask Effect',
  description:
    'Intelligent saturation effect that applies desaturation based on element hierarchy or type. Desaturates background elements while keeping foreground content vibrant (or inverse mode). Uses CSS filter combinations with contrast adjustments to maintain visual depth. Supports partial desaturation levels and smooth transitions between saturation zones for creating focus effects where color guides attention.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'saturation', 'filter', 'hierarchy', 'focus', 'internal'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1', 'component-2'],
    layerConfig: {
      background: 80,
      midground: 40,
      foreground: 0,
    },
    invertMode: false,
    smoothTransition: true,
    effectStart: 0,
    effectDuration: 5,
    layerMapping: {
      'component-1': 'background',
      'component-2': 'foreground',
    },
    contrastBoost: 110,
    addBlur: false,
    blurAmount: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const selectiveSaturationMaskPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
