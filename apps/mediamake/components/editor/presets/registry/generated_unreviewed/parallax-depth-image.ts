/**
 * Parallax Depth Image Effect Preset
 *
 * This preset creates a simulated 3D depth effect by splitting an image into multiple layers
 * and applying different parallax speeds to each layer. The effect creates an illusion of depth
 * as the layers move at different rates, mimicking a 3D parallax scene.
 *
 * Features:
 * - **Three-Layer Depth System**: Background, midground, and foreground layers
 * - **Independent Parallax Control**: Configurable parallax speed for each layer
 * - **Depth Enhancement**: Scale, opacity, and blur adjustments per layer
 * - **Directional Parallax**: Vertical or horizontal parallax direction
 * - **Blend Modes**: Optional blend mode for midground layer
 * - **Perspective View**: CSS perspective for enhanced 3D effect
 *
 * Use Cases:
 * - Hero sections with depth
 * - Interactive product showcases
 * - Immersive storytelling backgrounds
 * - Album covers with motion
 * - Landing page visuals
 *
 * Technical Details:
 * - Uses imageloop preset as dependency for parallax effects
 * - Layers are stacked with z-index (background=1, midground=2, foreground=3)
 * - All layers use the same source image with different treatments
 * - Background: Scaled up, blurred, dimmed
 * - Midground: Moderate scale, slight blur, optional blend mode
 * - Foreground: Original scale, sharp, full opacity
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/remotion';

// ─────────────────────────────────────────────────────────────────────────────
// PARAMS SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const presetParams = z.object({
  imageSrc: z
    .string()
    .describe('Source image URL to split into parallax layers'),

  duration: z
    .number()
    .default(10)
    .describe('Duration of the effect in seconds'),

  parallaxDirection: z
    .enum(['vertical', 'horizontal'])
    .default('vertical')
    .describe('Direction of parallax movement (vertical or horizontal)'),

  // Background layer controls
  backgroundParallaxSpeed: z
    .number()
    .default(0.3)
    .describe('Parallax speed for background layer (slower = more depth)'),

  backgroundScale: z
    .number()
    .default(1.15)
    .describe('Scale factor for background layer (>1 creates zoom effect)'),

  backgroundOpacity: z
    .number()
    .default(0.6)
    .describe('Opacity of background layer (0-1)'),

  backgroundBlur: z
    .number()
    .default(4)
    .describe('Blur amount for background layer in pixels'),

  // Midground layer controls
  midgroundParallaxSpeed: z
    .number()
    .default(0.6)
    .describe('Parallax speed for midground layer (medium depth)'),

  midgroundScale: z
    .number()
    .default(1.08)
    .describe('Scale factor for midground layer'),

  midgroundOpacity: z
    .number()
    .default(0.8)
    .describe('Opacity of midground layer (0-1)'),

  midgroundBlur: z
    .number()
    .default(2)
    .describe('Blur amount for midground layer in pixels'),

  midgroundBlendMode: z
    .enum([
      'normal',
      'multiply',
      'screen',
      'overlay',
      'darken',
      'lighten',
      'color-dodge',
      'color-burn',
      'hard-light',
      'soft-light',
      'difference',
      'exclusion',
    ])
    .default('normal')
    .describe('CSS blend mode for midground layer'),

  // Foreground layer controls
  foregroundParallaxSpeed: z
    .number()
    .default(1.0)
    .describe('Parallax speed for foreground layer (fastest = closest)'),

  foregroundScale: z
    .number()
    .default(1.0)
    .describe('Scale factor for foreground layer (usually 1.0)'),

  foregroundOpacity: z
    .number()
    .default(1.0)
    .describe('Opacity of foreground layer (0-1)'),

  foregroundBlur: z
    .number()
    .default(0)
    .describe('Blur amount for foreground layer in pixels'),

  // Global perspective
  perspective: z
    .number()
    .default(1000)
    .describe('CSS perspective value in pixels (lower = stronger 3D effect)'),
});

// ─────────────────────────────────────────────────────────────────────────────
// EXECUTION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { presets } = props;

  if (!presets || !presets['imageloop']) {
    throw new Error('Required preset dependency "imageloop" not found');
  }

  // Helper function to create layer parameters for imageloop preset
  const createLayerParams = (
    layerType: 'background' | 'midground' | 'foreground',
  ) => {
    const baseParams = {
      images: [{ src: params.imageSrc }],
      duration: params.duration,
      fitDurationTo: 'parent' as const,
    };

    switch (layerType) {
      case 'background':
        return {
          ...baseParams,
          effects: [
            {
              type: 'parallax' as const,
              speed: params.backgroundParallaxSpeed,
              direction: params.parallaxDirection,
            },
          ],
          scale: params.backgroundScale,
          opacity: params.backgroundOpacity,
          blur: params.backgroundBlur,
          filters: {
            brightness: 0.8,
          },
        };

      case 'midground':
        return {
          ...baseParams,
          effects: [
            {
              type: 'parallax' as const,
              speed: params.midgroundParallaxSpeed,
              direction: params.parallaxDirection,
            },
          ],
          scale: params.midgroundScale,
          opacity: params.midgroundOpacity,
          blur: params.midgroundBlur,
          blendMode: params.midgroundBlendMode,
        };

      case 'foreground':
        return {
          ...baseParams,
          effects: [
            {
              type: 'parallax' as const,
              speed: params.foregroundParallaxSpeed,
              direction: params.parallaxDirection,
            },
          ],
          scale: params.foregroundScale,
          opacity: params.foregroundOpacity,
          blur: params.foregroundBlur,
        };

      default:
        return baseParams;
    }
  };

  // Create all three layers using imageloop preset
  const backgroundLayer = await presets['imageloop'](
    createLayerParams('background'),
    props,
  );

  const midgroundLayer = await presets['imageloop'](
    createLayerParams('midground'),
    props,
  );

  const foregroundLayer = await presets['imageloop'](
    createLayerParams('foreground'),
    props,
  );

  // Extract layer children and apply z-index
  const extractLayer = (
    layerOutput: PresetOutput,
    zIndex: number,
    layerId: string,
  ) => {
    const layerChildren = layerOutput.output.childrenData?.[0];
    if (!layerChildren) return null;

    return {
      ...layerChildren,
      id: layerId,
      data: {
        ...layerChildren.data,
        containerProps: {
          ...layerChildren.data?.containerProps,
          className: `${layerChildren.data?.containerProps?.className || ''} absolute inset-0`,
          style: {
            ...layerChildren.data?.containerProps?.style,
            zIndex,
          },
        },
      },
    };
  };

  const backgroundChild = extractLayer(
    backgroundLayer,
    1,
    'parallax-depth-background',
  );
  const midgroundChild = extractLayer(
    midgroundLayer,
    2,
    'parallax-depth-midground',
  );
  const foregroundChild = extractLayer(
    foregroundLayer,
    3,
    'parallax-depth-foreground',
  );

  // Build the root container with all layers
  const rootContainer = {
    id: 'parallax-depth-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
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
    childrenData: [backgroundChild, midgroundChild, foregroundChild].filter(
      Boolean,
    ),
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

// ─────────────────────────────────────────────────────────────────────────────
// METADATA
// ─────────────────────────────────────────────────────────────────────────────

const presetMetadata: PresetMetadata = {
  id: 'parallax-depth-image',
  title: 'Parallax Depth Image Effect',
  description:
    'Simulates depth by splitting an image into layers and applying different parallax speeds to create a 3D-like depth effect',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'parallax', 'depth', '3d', 'layers', 'effects', 'visual'],
  defaultInputParams: {
    imageSrc: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    duration: 10,
    parallaxDirection: 'vertical',
    backgroundParallaxSpeed: 0.3,
    backgroundScale: 1.15,
    backgroundOpacity: 0.6,
    backgroundBlur: 4,
    midgroundParallaxSpeed: 0.6,
    midgroundScale: 1.08,
    midgroundOpacity: 0.8,
    midgroundBlur: 2,
    midgroundBlendMode: 'normal',
    foregroundParallaxSpeed: 1.0,
    foregroundScale: 1.0,
    foregroundOpacity: 1.0,
    foregroundBlur: 0,
    perspective: 1000,
  },
  dependencies: {
    presets: ['imageloop'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const parallaxDepthImagePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
