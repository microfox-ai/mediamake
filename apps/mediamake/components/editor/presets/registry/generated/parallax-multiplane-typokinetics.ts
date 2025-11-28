/**
 * Parallax Multiplane Typokinetics Preset
 *
 * A parallax-inspired typokinetics preset featuring multiple text layers drifting at different 
 * horizontal speeds to create depth through motion parallax. Inspired by traditional multiplane 
 * camera animation techniques from classic Disney films, where foreground, midground, and 
 * background layers move at different rates to simulate three-dimensional space.
 *
 * Features:
 * - **Three parallax layers**: Background (slowest), middle (moderate), foreground (fastest)
 * - **Depth through motion**: Different translation speeds create illusion of 3D space
 * - **Depth through blur**: Variable blur filters enhance depth perception
 * - **Depth through opacity**: Layered opacity values create atmospheric perspective
 * - **Perspective transform**: CSS perspective adds subtle 3D feel
 * - **Customizable speeds**: Adjustable translation ranges per layer
 * - **Font customization**: Support for custom font families and weights
 * - **Color controls**: Configurable text colors per layer
 *
 * Use cases:
 * - Creating cinematic title sequences with depth
 * - Building immersive text animations for storytelling
 * - Adding professional motion graphics to videos
 * - Creating "train window" effect where near objects move faster than distant ones
 * - Simulating camera movement through text layers
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

const presetParams = z.object({
  caption: z.string().describe('Text to display across all layers'),
  duration: z.number().default(10).describe('Duration of the parallax effect in seconds'),
  
  // Font configuration
  font: z
    .string()
    .default('Futura:200')
    .describe('Font family with optional weight (e.g., "Futura:200", "Inter:300")'),
  
  // Layer-specific text colors
  backgroundTextColor: z
    .string()
    .default('#ffffff')
    .describe('Text color for background layer'),
  middleTextColor: z
    .string()
    .default('#ffffff')
    .describe('Text color for middle layer (main caption)'),
  foregroundTextColor: z
    .string()
    .default('#ffffff')
    .describe('Text color for foreground layer'),
  
  // Translation ranges (horizontal movement)
  backgroundTranslateRange: z
    .number()
    .default(20)
    .describe('Translation range for background layer (slowest)'),
  middleTranslateRange: z
    .number()
    .default(40)
    .describe('Translation range for middle layer (moderate speed)'),
  foregroundTranslateRange: z
    .number()
    .default(80)
    .describe('Translation range for foreground layer (fastest)'),
  
  // Opacity values
  backgroundOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Opacity for background layer (0-1)'),
  middleOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Opacity for middle layer (0-1)'),
  foregroundOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity for foreground layer (0-1)'),
  
  // Blur values
  backgroundBlur: z
    .number()
    .default(3)
    .describe('Blur amount for background layer in pixels'),
  middleBlur: z
    .number()
    .default(0)
    .describe('Blur amount for middle layer in pixels'),
  foregroundBlur: z
    .number()
    .default(1)
    .describe('Blur amount for foreground layer in pixels'),
  
  // Font sizes for each layer
  backgroundFontSize: z
    .string()
    .default('clamp(24px, 5vw, 64px)')
    .describe('Font size for background layer (CSS value)'),
  middleFontSize: z
    .string()
    .default('clamp(32px, 8vw, 96px)')
    .describe('Font size for middle layer (CSS value)'),
  foregroundFontSize: z
    .string()
    .default('clamp(48px, 12vw, 128px)')
    .describe('Font size for foreground layer (CSS value)'),
  
  // Perspective
  perspective: z
    .number()
    .default(800)
    .describe('CSS perspective value in pixels for 3D transform'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Futura:200';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  
  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 200; // Default weight
  }

  // Helper function to create a parallax layer
  const createParallelLayer = (
    layerId: string,
    zIndex: number,
    opacity: number,
    blur: number,
    translateRange: number,
    fontSize: string,
    textColor: string,
  ) => {
    const textId = `${layerId}-text`;
    
    // Create parallax effect for the layer
    const parallaxEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [layerId],
      ranges: [
        { key: 'translateX', val: translateRange, prog: 0 },
        { key: 'translateX', val: -translateRange, prog: 1 },
      ],
    };

    // Create text atom
    const textAtom: RenderableComponentData = {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: params.caption,
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : {}),
        },
        style: {
          ...fontStyle,
          fontSize,
          textAlign: 'center',
          color: textColor,
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    };

    // Create layer container
    const layer: RenderableComponentData = {
      id: layerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            opacity,
            filter: blur > 0 ? `blur(${blur}px)` : undefined,
            zIndex,
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
          id: `${layerId}-parallax`,
          componentId: 'generic',
          data: parallaxEffect,
        },
      ],
      childrenData: [textAtom],
    };

    return layer;
  };

  // Create three parallax layers
  const backgroundLayer = createParallelLayer(
    'parallax-background-layer',
    0,
    params.backgroundOpacity,
    params.backgroundBlur,
    params.backgroundTranslateRange,
    params.backgroundFontSize,
    params.backgroundTextColor,
  );

  const middleLayer = createParallelLayer(
    'parallax-middle-layer',
    10,
    params.middleOpacity,
    params.middleBlur,
    params.middleTranslateRange,
    params.middleFontSize,
    params.middleTextColor,
  );

  const foregroundLayer = createParallelLayer(
    'parallax-foreground-layer',
    20,
    params.foregroundOpacity,
    params.foregroundBlur,
    params.foregroundTranslateRange,
    params.foregroundFontSize,
    params.foregroundTextColor,
  );

  // Create root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'parallax-multiplane-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: `${params.perspective}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      backgroundLayer,
      middleLayer,
      foregroundLayer,
    ] as RenderableComponentData[],
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
  id: 'parallax-multiplane-typokinetics',
  title: 'Parallax Multiplane Typokinetics',
  description:
    'A parallax-inspired typokinetics preset featuring multiple text layers drifting at different horizontal speeds to create depth through motion parallax. Inspired by traditional multiplane camera animation techniques, the preset includes background, midground, and foreground text layers with varying opacity, blur, and translation speeds. The main caption appears in the focused middle layer while decorative faded/blurred versions create the illusion of three-dimensional space.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'parallax',
    'multiplane',
    'depth',
    'motion',
    'kinetic',
    '3d',
    'layers',
    'cinematic',
  ],
  dependencies: {},
  defaultInputParams: {
    caption: 'PARALLAX TEXT',
    duration: 10,
    font: 'Futura:200',
    backgroundTextColor: '#ffffff',
    middleTextColor: '#ffffff',
    foregroundTextColor: '#ffffff',
    backgroundTranslateRange: 20,
    middleTranslateRange: 40,
    foregroundTranslateRange: 80,
    backgroundOpacity: 0.2,
    middleOpacity: 1,
    foregroundOpacity: 0.3,
    backgroundBlur: 3,
    middleBlur: 0,
    foregroundBlur: 1,
    backgroundFontSize: 'clamp(24px, 5vw, 64px)',
    middleFontSize: 'clamp(32px, 8vw, 96px)',
    foregroundFontSize: 'clamp(48px, 12vw, 128px)',
    perspective: 800,
  },
};

export const parallaxMultiplaneTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
