/**
 * Parallax Typography Depth Preset
 *
 * This preset creates a sophisticated parallax effect with three text layers rotating at different speeds
 * on the Y-axis, creating a multi-plane camera depth effect similar to classic animation techniques.
 *
 * Features:
 * - **Three-Layer Depth System**: Background, midground, and foreground layers with independent animations
 * - **Y-Axis Rotation**: Each layer rotates from different angles (-90deg, -60deg, -30deg) to 0deg
 * - **Staggered Timing**: Layers animate with progressive delays (200ms, 100ms, 0ms) for cascade effect
 * - **Opacity Curves**: Different opacity targets (0.7, 0.85, 1.0) enhance depth perception
 * - **Size Differentiation**: Scaled text layers (0.8, 0.9, 1.0) reinforce depth hierarchy
 * - **Blur Enhancement**: Background layer has subtle blur to increase depth illusion
 * - **Perspective Variation**: Different perspective values (1200px, 900px, 600px) per layer
 * - **Ease-Out Easing**: Smooth deceleration creates natural, professional motion
 *
 * Perfect for:
 * - Hero sections and landing pages
 * - Title sequences and intros
 * - Dramatic text reveals
 * - High-impact typography compositions
 * - Cinematic text presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  TextAtomData,
  GenericEffectData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  // Text content for each layer
  foregroundText: z
    .string()
    .default('FOREGROUND')
    .describe('Text content for the front layer (most prominent)'),
  midgroundText: z
    .string()
    .default('MIDGROUND')
    .describe('Text content for the middle layer'),
  backgroundText: z
    .string()
    .default('BACKGROUND')
    .describe('Text content for the back layer (most subtle)'),

  // Timing configuration
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(3)
    .describe('Total duration of the parallax animation in seconds'),

  // Font configuration
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  // Color configuration
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color for all text layers (CSS color value)'),

  // Size configuration
  foregroundSize: z
    .number()
    .min(20)
    .max(500)
    .default(100)
    .describe('Font size for foreground text in pixels'),
  midgroundSize: z
    .number()
    .min(20)
    .max(500)
    .default(90)
    .describe('Font size for midground text in pixels'),
  backgroundSize: z
    .number()
    .min(20)
    .max(500)
    .default(80)
    .describe('Font size for background text in pixels'),

  // Effect intensity
  impact: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe(
      'Effect intensity multiplier - affects rotation angles and animation speed',
    ),

  // Layer delays (in seconds)
  backgroundDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.2)
    .describe('Delay before background layer starts animating (seconds)'),
  midgroundDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.1)
    .describe('Delay before midground layer starts animating (seconds)'),
  foregroundDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0)
    .describe('Delay before foreground layer starts animating (seconds)'),

  // Animation durations (in seconds)
  backgroundDuration: z
    .number()
    .min(0.3)
    .max(5)
    .default(1.2)
    .describe('Duration of background layer rotation animation (seconds)'),
  midgroundDuration: z
    .number()
    .min(0.3)
    .max(5)
    .default(0.9)
    .describe('Duration of midground layer rotation animation (seconds)'),
  foregroundDuration: z
    .number()
    .min(0.3)
    .max(5)
    .default(0.6)
    .describe('Duration of foreground layer rotation animation (seconds)'),

  // Rotation angles (in degrees)
  backgroundRotation: z
    .number()
    .min(-180)
    .max(0)
    .default(-90)
    .describe('Starting Y-axis rotation angle for background layer (degrees)'),
  midgroundRotation: z
    .number()
    .min(-180)
    .max(0)
    .default(-60)
    .describe('Starting Y-axis rotation angle for midground layer (degrees)'),
  foregroundRotation: z
    .number()
    .min(-180)
    .max(0)
    .default(-30)
    .describe('Starting Y-axis rotation angle for foreground layer (degrees)'),

  // Opacity targets
  backgroundOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Final opacity for background layer (0-1)'),
  midgroundOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.85)
    .describe('Final opacity for midground layer (0-1)'),
  foregroundOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Final opacity for foreground layer (0-1)'),

  // Scale factors
  backgroundScale: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.8)
    .describe('Scale factor for background text (relative size)'),
  midgroundScale: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.9)
    .describe('Scale factor for midground text (relative size)'),
  foregroundScale: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Scale factor for foreground text (relative size)'),

  // Blur configuration
  backgroundBlur: z
    .number()
    .min(0)
    .max(10)
    .default(1)
    .describe('Blur amount for background layer in pixels'),

  // Perspective values
  backgroundPerspective: z
    .number()
    .min(100)
    .max(3000)
    .default(1200)
    .describe('CSS perspective value for background layer (px)'),
  midgroundPerspective: z
    .number()
    .min(100)
    .max(3000)
    .default(900)
    .describe('CSS perspective value for midground layer (px)'),
  foregroundPerspective: z
    .number()
    .min(100)
    .max(3000)
    .default(600)
    .describe('CSS perspective value for foreground layer (px)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
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

  // Helper function to create text layer
  const createTextLayer = (
    layerId: string,
    text: string,
    fontSize: number,
    scale: number,
    blur: number,
    zIndex: number,
    perspective: number,
  ): RenderableComponentData => {
    const textAtomData: TextAtomData = {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontStyle.fontWeight || 'bold',
        color: params.textColor,
        textAlign: 'center',
        transform: `scale(${scale})`,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
      },
    };

    return {
      id: `${layerId}-layer`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            zIndex: zIndex,
            perspective: `${perspective}px`,
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
        {
          id: `${layerId}-text`,
          type: 'atom',
          componentId: 'TextAtom',
          data: textAtomData,
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  };

  // Helper function to create rotation effect
  const createRotationEffect = (
    effectId: string,
    targetId: string,
    startRotation: number,
    delay: number,
    duration: number,
    targetOpacity: number,
  ) => {
    const adjustedRotation = startRotation * params.impact;
    const adjustedDuration = duration / params.impact;

    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: delay,
      duration: adjustedDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Rotation animation
        { key: 'rotateY', val: adjustedRotation, prog: 0 },
        { key: 'rotateY', val: 0, prog: 1 },
        // Opacity animation
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: targetOpacity, prog: 1 },
      ],
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Create three text layers
  const backgroundLayer = createTextLayer(
    'background',
    params.backgroundText,
    params.backgroundSize,
    params.backgroundScale,
    params.backgroundBlur,
    1,
    params.backgroundPerspective,
  );

  const midgroundLayer = createTextLayer(
    'midground',
    params.midgroundText,
    params.midgroundSize,
    params.midgroundScale,
    0,
    2,
    params.midgroundPerspective,
  );

  const foregroundLayer = createTextLayer(
    'foreground',
    params.foregroundText,
    params.foregroundSize,
    params.foregroundScale,
    0,
    3,
    params.foregroundPerspective,
  );

  // Create rotation effects for each layer
  const backgroundEffect = createRotationEffect(
    'background-rotation-effect',
    'background-text',
    params.backgroundRotation,
    params.backgroundDelay,
    params.backgroundDuration,
    params.backgroundOpacity,
  );

  const midgroundEffect = createRotationEffect(
    'midground-rotation-effect',
    'midground-text',
    params.midgroundRotation,
    params.midgroundDelay,
    params.midgroundDuration,
    params.midgroundOpacity,
  );

  const foregroundEffect = createRotationEffect(
    'foreground-rotation-effect',
    'foreground-text',
    params.foregroundRotation,
    params.foregroundDelay,
    params.foregroundDuration,
    params.foregroundOpacity,
  );

  // Attach effects to respective text atoms
  if (backgroundLayer.childrenData && backgroundLayer.childrenData[0]) {
    backgroundLayer.childrenData[0].effects = [backgroundEffect];
  }

  if (midgroundLayer.childrenData && midgroundLayer.childrenData[0]) {
    midgroundLayer.childrenData[0].effects = [midgroundEffect];
  }

  if (foregroundLayer.childrenData && foregroundLayer.childrenData[0]) {
    foregroundLayer.childrenData[0].effects = [foregroundEffect];
  }

  // Root container with all three layers
  const rootContainer: RenderableComponentData = {
    id: 'parallax-depth-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backgroundColor: 'transparent',
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
      midgroundLayer,
      foregroundLayer,
    ] as RenderableComponentData[],
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
  id: 'parallax-typography-depth',
  title: 'Parallax Typography Depth',
  description:
    'Sophisticated parallax preset with three text layers rotating at different speeds on the Y-axis, creating a multi-plane camera depth effect. Foreground rotates quickly (-30deg to 0deg, 600ms), midground moderately (-60deg to 0deg, 900ms), and background slowly (-90deg to 0deg, 1200ms). Each layer features different opacity curves, size differences, and blur levels to enhance the depth illusion. Perfect for hero sections and title sequences.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'parallax',
    'depth',
    'rotation',
    'multi-layer',
    'hero',
    'title-sequence',
    '3d',
    'cinematic',
  ],
  dependencies: {},
  defaultInputParams: {
    foregroundText: 'FOREGROUND',
    midgroundText: 'MIDGROUND',
    backgroundText: 'BACKGROUND',
    duration: 3,
    font: 'Inter:700',
    textColor: '#ffffff',
    foregroundSize: 100,
    midgroundSize: 90,
    backgroundSize: 80,
    impact: 1,
    backgroundDelay: 0.2,
    midgroundDelay: 0.1,
    foregroundDelay: 0,
    backgroundDuration: 1.2,
    midgroundDuration: 0.9,
    foregroundDuration: 0.6,
    backgroundRotation: -90,
    midgroundRotation: -60,
    foregroundRotation: -30,
    backgroundOpacity: 0.7,
    midgroundOpacity: 0.85,
    foregroundOpacity: 1,
    backgroundScale: 0.8,
    midgroundScale: 0.9,
    foregroundScale: 1,
    backgroundBlur: 1,
    backgroundPerspective: 1200,
    midgroundPerspective: 900,
    foregroundPerspective: 600,
  },
};

// Export preset
export const parallaxTypographyDepthPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
