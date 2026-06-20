/**
 * Parallax Sliding Text Layers Preset
 *
 * Creates a cinematic parallax-inspired sliding text system where three text layers (main title, subtitle, caption)
 * slide in from the same direction but at different speeds and distances, creating a pseudo-3D depth effect.
 * Each layer moves at different speeds with layer-specific easing curves, scale variations, and opacity gradients
 * to enhance depth perception through atmospheric perspective.
 *
 * Features:
 * - **Three Depth Layers**: Front (main title), middle (subtitle), back (caption)
 * - **Differential Motion**: Layers slide at different speeds and distances
 * - **Scale Variation**: Different scales for each layer (1.0, 0.95, 0.9) to enhance depth
 * - **Opacity Gradients**: Atmospheric perspective (1.0, 0.9, 0.8) for depth cues
 * - **Layer-Specific Easing**: Aggressive ease-out for front, cubic-bezier for middle, ease-in-out for back
 * - **Z-Index Layering**: Proper stacking order (z-10, z-20, z-30)
 * - **Cinematic Effect**: Perfect for title sequences and layered information hierarchy
 *
 * Use cases:
 * - Cinematic title sequences
 * - Video intros with depth
 * - Layered information displays
 * - Dynamic text reveals with parallax motion
 * - Professional video compositing effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter Schema
const presetParams = z.object({
  // Text content for each layer
  frontLayerText: z
    .string()
    .default('Main Title - Fastest Layer')
    .describe('Text for the front layer (main title, fastest motion)'),
  middleLayerText: z
    .string()
    .default('Subtitle - Medium Speed')
    .describe('Text for the middle layer (subtitle, medium motion)'),
  backLayerText: z
    .string()
    .default('Caption Layer - Slowest Movement')
    .describe('Text for the back layer (caption, slowest motion)'),

  // Font configuration (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),

  // Font sizes for each layer
  frontFontSize: z
    .number()
    .min(20)
    .max(200)
    .default(64)
    .describe('Font size for front layer (main title)'),
  middleFontSize: z
    .number()
    .min(16)
    .max(150)
    .default(42)
    .describe('Font size for middle layer (subtitle)'),
  backFontSize: z
    .number()
    .min(12)
    .max(100)
    .default(28)
    .describe('Font size for back layer (caption)'),

  // Text color
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color for all layers'),

  // Duration configuration
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(3)
    .describe('Total duration of the parallax effect in seconds'),

  // Animation durations for each layer (relative speeds)
  frontDuration: z
    .number()
    .min(0.3)
    .max(5)
    .default(0.8)
    .describe('Animation duration for front layer (fastest)'),
  middleDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.0)
    .describe('Animation duration for middle layer (medium speed)'),
  backDuration: z
    .number()
    .min(0.7)
    .max(5)
    .default(1.2)
    .describe('Animation duration for back layer (slowest)'),

  // Slide distance multipliers (relative to screen width)
  frontDistance: z
    .number()
    .min(1)
    .max(3)
    .default(2.0)
    .describe('Slide distance for front layer (2.0 = 200% of screen width)'),
  middleDistance: z
    .number()
    .min(0.75)
    .max(2.5)
    .default(1.5)
    .describe(
      'Slide distance for middle layer (1.5 = 150% of screen width)',
    ),
  backDistance: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.0)
    .describe('Slide distance for back layer (1.0 = 100% of screen width)'),

  // Scale configuration (for depth)
  frontScale: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(1.0)
    .describe('Scale for front layer (1.0 = normal size)'),
  middleScale: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(0.95)
    .describe('Scale for middle layer (0.95 = slightly smaller for depth)'),
  backScale: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(0.9)
    .describe('Scale for back layer (0.9 = smallest for depth)'),

  // Opacity configuration (atmospheric perspective)
  frontOpacity: z
    .number()
    .min(0.1)
    .max(1)
    .default(1.0)
    .describe('Opacity for front layer (1.0 = fully opaque)'),
  middleOpacity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.9)
    .describe('Opacity for middle layer (0.9 = slight transparency)'),
  backOpacity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.8)
    .describe('Opacity for back layer (0.8 = more transparent for depth)'),
});

// Preset Execution Function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const parseFontString = (fontString: string) => {
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

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(
    params.font || 'Inter:700',
  );

  // Calculate translateX values based on screen width (1920px for 1080p)
  const screenWidth = 1920;
  const frontTranslateX = screenWidth * params.frontDistance;
  const middleTranslateX = screenWidth * params.middleDistance;
  const backTranslateX = screenWidth * params.backDistance;

  // Create text atoms for each layer
  const createTextAtom = (
    id: string,
    text: string,
    fontSize: number,
    opacity: number,
  ): RenderableComponentData => ({
    id,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        color: params.textColor,
        textAlign: 'center',
        opacity,
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
  });

  // Create layer containers with effects
  const createLayer = (
    layerId: string,
    textId: string,
    text: string,
    fontSize: number,
    opacity: number,
    zIndex: number,
    translateX: number,
    scale: number,
    animationDuration: number,
    easingType:
      | 'ease-out'
      | 'ease-in-out'
      | 'cubic-bezier'
      | 'ease-in'
      | 'linear',
    easingValues?: number[],
  ): RenderableComponentData => {
    const textAtom = createTextAtom(textId, text, fontSize, opacity);

    // Create slide effect
    const slideEffect = {
      id: `${layerId}-slide-effect`,
      componentId: 'generic',
      data: {
        type: easingType,
        ...(easingValues ? { easingValues } : {}),
        start: 0,
        duration: animationDuration,
        mode: 'provider',
        targetIds: [layerId],
        ranges: [
          { key: 'translateX', val: translateX, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'scale', val: scale, prog: 0 },
          { key: 'scale', val: scale, prog: 1 },
        ],
      } as GenericEffectData,
    };

    return {
      id: layerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
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
      effects: [slideEffect],
      childrenData: [textAtom],
    } as RenderableComponentData;
  };

  // Create three layers with different speeds and distances
  const backLayer = createLayer(
    'parallax-back-layer',
    'parallax-caption-text',
    params.backLayerText,
    params.backFontSize,
    params.backOpacity,
    10, // z-index
    backTranslateX,
    params.backScale,
    params.backDuration,
    'ease-in-out',
  );

  const middleLayer = createLayer(
    'parallax-middle-layer',
    'parallax-subtitle-text',
    params.middleLayerText,
    params.middleFontSize,
    params.middleOpacity,
    20, // z-index
    middleTranslateX,
    params.middleScale,
    params.middleDuration,
    'cubic-bezier',
    [0.25, 0.46, 0.45, 0.94],
  );

  const frontLayer = createLayer(
    'parallax-front-layer',
    'parallax-title-text',
    params.frontLayerText,
    params.frontFontSize,
    params.frontOpacity,
    30, // z-index
    frontTranslateX,
    params.frontScale,
    params.frontDuration,
    'ease-out',
  );

  // Create root container with all layers
  const rootContainer: RenderableComponentData = {
    id: 'parallax-sliding-text-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [backLayer, middleLayer, frontLayer],
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

// Preset Metadata
const presetMetadata: PresetMetadata = {
  id: 'ParallaxSlidingTextLayers',
  title: 'Parallax Sliding Text Layers',
  description:
    'Cinematic parallax-inspired sliding text system with three depth layers (main title, subtitle, caption) that slide in from the same direction at different speeds and distances. Creates pseudo-3D depth through differential motion, scale variations, opacity gradients, and layer-specific easing curves. Perfect for cinematic titles and layered information hierarchy.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'parallax',
    'cinematic',
    'title',
    'layers',
    'depth',
    '3d',
    'animation',
    'slide',
    'easing',
  ],
  dependencies: {},
  defaultInputParams: {
    frontLayerText: 'Main Title - Fastest Layer',
    middleLayerText: 'Subtitle - Medium Speed',
    backLayerText: 'Caption Layer - Slowest Movement',
    font: 'Inter:700',
    frontFontSize: 64,
    middleFontSize: 42,
    backFontSize: 28,
    textColor: '#ffffff',
    duration: 3,
    frontDuration: 0.8,
    middleDuration: 1.0,
    backDuration: 1.2,
    frontDistance: 2.0,
    middleDistance: 1.5,
    backDistance: 1.0,
    frontScale: 1.0,
    middleScale: 0.95,
    backScale: 0.9,
    frontOpacity: 1.0,
    middleOpacity: 0.9,
    backOpacity: 0.8,
  },
};

// Export Preset
export const ParallaxSlidingTextLayersPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
