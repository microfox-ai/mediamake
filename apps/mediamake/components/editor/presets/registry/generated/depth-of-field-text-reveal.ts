/**
 * Depth of Field Text Reveal Preset
 *
 * This preset creates a multi-layer text composition with a parallax-like focus effect.
 * Three text layers (background, midground, foreground) start at different blur intensities
 * and animate into focus sequentially with staggered timing. Each layer uses translateY shifts
 * and opacity changes to enhance depth perception, creating a cinematic depth-of-field reveal effect.
 *
 * Features:
 * - **Multi-layer Depth**: Three text layers at different z-index levels
 * - **Staggered Focus Animation**: Background, midground, and foreground come into focus sequentially
 * - **Blur-to-Sharp Effect**: Each layer starts blurred and animates to sharp focus
 * - **Depth Enhancement**: Opacity changes (0.6/0.7/0.85 → 1.0) and translateY shifts create floating-into-focus effect
 * - **Performance Optimized**: Uses transform3d for GPU acceleration and staggered timing to avoid simultaneous repaints
 *
 * Use cases:
 * - Creating cinematic title sequences with depth
 * - Building layered text compositions
 * - Adding professional depth-of-field effects to text
 * - Creating multi-layer parallax text reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  BaseLayoutData,
  TextAtomData,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  backgroundText: z
    .string()
    .default('DEPTH')
    .describe('Text to display in the background layer (most blurred)'),
  midgroundText: z
    .string()
    .default('OF')
    .describe('Text to display in the midground layer'),
  foregroundText: z
    .string()
    .default('FIELD')
    .describe('Text to display in the foreground layer (least blurred)'),
  fontSize: z
    .string()
    .default('120px')
    .describe('Font size for all text layers'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color for all layers'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color for the composition'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total duration of the effect in seconds'),
  focusDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Duration for each layer to come into focus'),
  staggerDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.3)
    .describe('Delay between each layer starting its focus animation'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: {
      fontWeight?: number;
      fontStyle?: 'normal' | 'italic';
    } = {};

    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as 'normal' | 'italic';
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.fontFamily);

  // Create effect data for each layer
  const createLayerEffect = (
    layerId: string,
    initialBlur: number,
    initialOpacity: number,
    initialTranslateY: number,
    startDelay: number,
  ): GenericEffectData => {
    return {
      type: 'ease-in-out',
      start: startDelay,
      duration: params.focusDuration,
      mode: 'provider',
      targetIds: [layerId],
      ranges: [
        // Blur animation: initial blur → 0
        { key: 'filter', val: `blur(${initialBlur}px)`, prog: 0 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
        // Opacity animation: initial opacity → 1.0
        { key: 'opacity', val: initialOpacity, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        // TranslateY animation: initial position → 0
        { key: 'translateY', val: initialTranslateY, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };
  };

  // Layer IDs
  const backLayerId = 'depth-back-layer';
  const midLayerId = 'depth-mid-layer';
  const frontLayerId = 'depth-front-layer';

  // Create effects for each layer
  const backLayerEffect = createLayerEffect(
    backLayerId,
    12, // Initial blur: 12px
    0.6, // Initial opacity: 0.6
    10, // Initial translateY: 10px
    0, // Start delay: 0s
  );

  const midLayerEffect = createLayerEffect(
    midLayerId,
    8, // Initial blur: 8px
    0.7, // Initial opacity: 0.7
    5, // Initial translateY: 5px
    params.staggerDelay, // Start delay: 0.3s (default)
  );

  const frontLayerEffect = createLayerEffect(
    frontLayerId,
    4, // Initial blur: 4px
    0.85, // Initial opacity: 0.85
    2, // Initial translateY: 2px
    params.staggerDelay * 2, // Start delay: 0.6s (default)
  );

  // Create layer components
  const createTextLayer = (
    id: string,
    text: string,
    zIndex: number,
    effect: GenericEffectData,
  ): RenderableComponentData => {
    const textAtomData: TextAtomData = {
      text,
      style: {
        fontSize: params.fontSize,
        color: params.textColor,
        fontWeight: 'bold',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : { weights: ['700'] }),
      },
    };

    const layoutData: BaseLayoutData = {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex,
        },
      },
    };

    return {
      id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: layoutData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: `${id}-effect`,
          componentId: 'generic',
          data: effect,
        },
      ],
      childrenData: [
        {
          id: `${id}-text`,
          type: 'atom',
          componentId: 'TextAtom',
          data: textAtomData,
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Create all three layers
  const backLayer = createTextLayer(
    backLayerId,
    params.backgroundText,
    1,
    backLayerEffect,
  );

  const midLayer = createTextLayer(
    midLayerId,
    params.midgroundText,
    2,
    midLayerEffect,
  );

  const frontLayer = createTextLayer(
    frontLayerId,
    params.foregroundText,
    3,
    frontLayerEffect,
  );

  // Root container
  const rootContainerData: BaseLayoutData = {
    containerProps: {
      className: 'relative w-full h-full',
      style: {
        backgroundColor: params.backgroundColor,
      },
    },
  };

  const rootContainer: RenderableComponentData = {
    id: 'depth-of-field-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: rootContainerData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [backLayer, midLayer, frontLayer] as RenderableComponentData[],
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
  id: 'depth-of-field-text-reveal',
  title: 'Depth of Field Text Reveal',
  description:
    'A multi-layer text composition creating a parallax-like focus effect. Three text layers (background, midground, foreground) start at different blur intensities and animate into focus sequentially with staggered timing. Each layer uses translateY shifts and opacity changes to enhance depth perception, creating a cinematic depth-of-field reveal effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'depth',
    'blur',
    'focus',
    'parallax',
    'cinematic',
    'multi-layer',
    'staggered',
  ],
  dependencies: {},
  defaultInputParams: {
    backgroundText: 'DEPTH',
    midgroundText: 'OF',
    foregroundText: 'FIELD',
    fontSize: '120px',
    textColor: '#FFFFFF',
    fontFamily: 'Inter:700',
    backgroundColor: '#000000',
    duration: 5,
    focusDuration: 1.5,
    staggerDelay: 0.3,
  },
};

// Export preset
export const depthOfFieldTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
