/**
 * Parallax Zoom Text Reveal Preset
 *
 * This preset creates a cinematic multiplane camera-style text reveal with three depth layers:
 * - Background layer (blurred, scaled 0.7): Slow zoom, heavy blur, low opacity
 * - Mid-ground layer (slightly blurred, scaled 0.85): Moderate zoom, light blur, medium opacity
 * - Foreground layer (sharp, scaled 1.0): Fast zoom, no blur, full opacity
 *
 * Each layer zooms at different rates creating a parallax depth effect, simulating movement through space.
 * Uses hardware-accelerated transforms and backdrop-filter for realistic depth-of-field blur.
 *
 * Features:
 * - Three-layer depth system with independent zoom rates
 * - Realistic depth-of-field blur using backdrop-filter
 * - Hardware-accelerated transforms (transform-gpu)
 * - Different easing curves per layer (ease-out, ease-in-out, spring)
 * - Configurable text, font, colors, and timing
 * - Cinematic reveal that feels like moving through 3D space
 *
 * Use cases:
 * - Creating cinematic title reveals
 * - Building depth-based text animations
 * - Adding dramatic opening sequences
 * - Creating professional video intros
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().describe('Text to display across all three layers'),
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Total duration of the parallax reveal effect in seconds'),
  fontSize: z
    .string()
    .default('120px')
    .describe('Font size for the text (e.g., "120px", "8rem")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family to use (Google Font name)'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color for all layers (CSS color value)'),
  backgroundLayerOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Final opacity for background layer (0-1)'),
  midGroundLayerOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Final opacity for mid-ground layer (0-1)'),
  foregroundLayerOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Final opacity for foreground layer (0-1)'),
  backgroundZoomDuration: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.2)
    .describe('Duration of background layer zoom animation in seconds'),
  midGroundZoomDuration: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.0)
    .describe('Duration of mid-ground layer zoom animation in seconds'),
  foregroundZoomDuration: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .describe('Duration of foreground layer zoom animation in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string if it contains weight/style
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

  // Use provided fontWeight if no weight in fontString
  const finalFontWeight = fontStyle.fontWeight || params.fontWeight;

  // Layer 1: Background (far back)
  const layer1TextId = 'parallax-layer-1-text';
  const layer1Effect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: params.backgroundZoomDuration,
    mode: 'provider',
    targetIds: [layer1TextId],
    ranges: [
      // Scale animation (slow zoom)
      { key: 'scale', val: 0.5, prog: 0 },
      { key: 'scale', val: 0.7, prog: 1 },
      // Blur animation (heavy blur reduces)
      { key: 'filter', val: 'blur(15px)', prog: 0 },
      { key: 'filter', val: 'blur(8px)', prog: 1 },
      // Opacity animation
      { key: 'opacity', val: 0.3, prog: 0 },
      { key: 'opacity', val: params.backgroundLayerOpacity, prog: 1 },
    ],
  };

  const layer1Container: RenderableComponentData = {
    id: 'parallax-layer-1-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center transform-gpu',
        style: {
          zIndex: 1,
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
        id: 'layer-1-effect',
        componentId: 'generic',
        data: layer1Effect,
      },
    ],
    childrenData: [
      {
        id: layer1TextId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.text,
          className: 'transform-gpu',
          style: {
            fontSize: params.fontSize,
            fontWeight: finalFontWeight,
            color: params.textColor,
            textAlign: 'center',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: [finalFontWeight.toString()],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      },
    ],
  };

  // Layer 2: Mid-ground (middle depth)
  const layer2TextId = 'parallax-layer-2-text';
  const layer2Effect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.midGroundZoomDuration,
    mode: 'provider',
    targetIds: [layer2TextId],
    ranges: [
      // Scale animation (moderate zoom)
      { key: 'scale', val: 0.6, prog: 0 },
      { key: 'scale', val: 0.85, prog: 1 },
      // Blur animation (light blur reduces)
      { key: 'filter', val: 'blur(5px)', prog: 0 },
      { key: 'filter', val: 'blur(2px)', prog: 1 },
      // Opacity animation
      { key: 'opacity', val: 0.6, prog: 0 },
      { key: 'opacity', val: params.midGroundLayerOpacity, prog: 1 },
    ],
  };

  const layer2Container: RenderableComponentData = {
    id: 'parallax-layer-2-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center transform-gpu',
        style: {
          zIndex: 2,
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
        id: 'layer-2-effect',
        componentId: 'generic',
        data: layer2Effect,
      },
    ],
    childrenData: [
      {
        id: layer2TextId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.text,
          className: 'transform-gpu',
          style: {
            fontSize: params.fontSize,
            fontWeight: finalFontWeight,
            color: params.textColor,
            textAlign: 'center',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: [finalFontWeight.toString()],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      },
    ],
  };

  // Layer 3: Foreground (closest, sharpest)
  const layer3TextId = 'parallax-layer-3-text';
  const layer3Effect: GenericEffectData = {
    type: 'spring',
    start: 0,
    duration: params.foregroundZoomDuration,
    mode: 'provider',
    targetIds: [layer3TextId],
    ranges: [
      // Scale animation (fast zoom)
      { key: 'scale', val: 0.7, prog: 0 },
      { key: 'scale', val: 1.0, prog: 1 },
      // No blur (sharp)
      { key: 'filter', val: 'blur(0px)', prog: 0 },
      { key: 'filter', val: 'blur(0px)', prog: 1 },
      // Opacity animation
      { key: 'opacity', val: 0.7, prog: 0 },
      { key: 'opacity', val: params.foregroundLayerOpacity, prog: 1 },
    ],
  };

  const layer3Container: RenderableComponentData = {
    id: 'parallax-layer-3-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center transform-gpu',
        style: {
          zIndex: 3,
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
        id: 'layer-3-effect',
        componentId: 'generic',
        data: layer3Effect,
      },
    ],
    childrenData: [
      {
        id: layer3TextId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.text,
          className: 'transform-gpu',
          style: {
            fontSize: params.fontSize,
            fontWeight: finalFontWeight,
            color: params.textColor,
            textAlign: 'center',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: [finalFontWeight.toString()],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      },
    ],
  };

  // Root container holding all three layers
  const rootContainer: RenderableComponentData = {
    id: 'parallax-zoom-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      layer1Container,
      layer2Container,
      layer3Container,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'parallax-zoom-text-reveal',
  title: 'Parallax Zoom Text Reveal',
  description:
    'A cinematic multiplane camera-style text reveal with three depth layers (background, mid-ground, foreground) zooming at different rates with depth-of-field blur. Creates a dimensional reveal that feels like moving through space, using hardware-accelerated transforms and backdrop-filter blur for realistic parallax effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'parallax',
    'zoom',
    'reveal',
    'cinematic',
    'depth',
    'multiplane',
    '3d',
    'blur',
    'layers',
  ],
  defaultInputParams: {
    text: 'PARALLAX',
    duration: 2,
    fontSize: '120px',
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#FFFFFF',
    backgroundLayerOpacity: 0.5,
    midGroundLayerOpacity: 0.8,
    foregroundLayerOpacity: 1,
    backgroundZoomDuration: 1.2,
    midGroundZoomDuration: 1.0,
    foregroundZoomDuration: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const parallaxZoomTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
