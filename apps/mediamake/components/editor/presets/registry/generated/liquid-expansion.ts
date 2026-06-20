/**
 * Liquid Expansion Preset
 *
 * Creates an organic liquid expansion effect where HTML divs morph and flow from the center
 * like a fluid splash or ink drop spreading across paper. Features smooth organic curves,
 * varying speeds (fast initial burst then slower spread), surface tension effects, and
 * color mixing through blend modes.
 *
 * Technical approach:
 * - Multiple layers with different blend modes for color mixing
 * - Transform-based animations for performance
 * - Two-phase timing: fast burst (0-1s), slow settle (1-3s)
 * - Staggered layer offsets (100ms between each)
 * - Subtle rotation and organic scaling variations
 *
 * Features:
 * - Organic liquid-like expansion from center point
 * - Multiple colored layers with blend mode compositing
 * - Surface tension simulation through easing curves
 * - Turbulent edge effects via blur and scale variations
 * - GPU-accelerated transforms for smooth performance
 *
 * Use cases:
 * - Intro animations with organic feel
 * - Scene transitions mimicking liquid flow
 * - Brand reveals with fluid dynamics
 * - Creative backgrounds with color mixing
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  trackName: z
    .string()
    .default('liquid-expansion-track')
    .describe('Unique identifier for this liquid expansion instance'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the liquid expansion effect in seconds'),
  layerCount: z
    .number()
    .min(2)
    .max(6)
    .default(4)
    .describe('Number of liquid layers to create (2-6)'),
  burstDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(1)
    .describe('Duration of the initial fast burst phase in seconds'),
  layerOffset: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Time offset between each layer start in seconds'),
  colors: z
    .array(
      z.object({
        primary: z.string().describe('Primary color (RGB/RGBA format)'),
        secondary: z.string().describe('Secondary color for gradient falloff'),
      }),
    )
    .min(2)
    .max(6)
    .default([
      {
        primary: 'rgba(0,150,255,0.8)',
        secondary: 'rgba(0,100,200,0.4)',
      },
      {
        primary: 'rgba(255,100,150,0.7)',
        secondary: 'rgba(200,50,100,0.3)',
      },
      {
        primary: 'rgba(150,255,100,0.6)',
        secondary: 'rgba(100,200,50,0.3)',
      },
      {
        primary: 'rgba(255,200,50,0.7)',
        secondary: 'rgba(200,150,30,0.4)',
      },
    ])
    .describe('Array of color pairs for each liquid layer'),
  blendModes: z
    .array(z.enum(['screen', 'multiply', 'overlay', 'normal']))
    .min(2)
    .max(6)
    .default(['screen', 'multiply', 'overlay', 'screen'])
    .describe('Blend modes for each layer'),
  initialScales: z
    .array(z.number().min(0.8).max(1.2))
    .min(2)
    .max(6)
    .default([1.0, 1.1, 0.9, 1.15])
    .describe('Initial scale multiplier for each layer (creates variation)'),
  finalScales: z
    .array(z.number().min(1).max(2))
    .min(2)
    .max(6)
    .default([1.3, 1.4, 1.2, 1.5])
    .describe('Final scale multiplier for each layer after settling'),
  rotations: z
    .array(z.number().min(-5).max(5))
    .min(2)
    .max(6)
    .default([-2, 1.5, -1, 2])
    .describe('Rotation angles in degrees for each layer (creates organic feel)'),
  blobSizes: z
    .array(z.number().min(100).max(300))
    .min(2)
    .max(6)
    .default([200, 180, 220, 160])
    .describe('Initial blob size for each layer in pixels'),
  blurAmount: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Blur amount in pixels for the softest layer (adds turbulence feel)'),
  enableTurbulence: z
    .boolean()
    .default(true)
    .describe('Enable subtle turbulence effects at edges'),
});

// Main preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackName,
    duration,
    layerCount,
    burstDuration,
    layerOffset,
    colors,
    blendModes,
    initialScales,
    finalScales,
    rotations,
    blobSizes,
    blurAmount,
    enableTurbulence,
  } = params;

  // Calculate settle duration
  const settleDuration = duration - burstDuration;

  // Helper function to create liquid blob HTML
  const createBlobHTML = (
    size: number,
    primaryColor: string,
    secondaryColor: string,
    blur: number = 0,
  ): string => {
    const blurStyle = blur > 0 ? `filter: blur(${blur}px);` : '';
    return `<div class='liquid-blob' style='width: ${size}px; height: ${size}px; background: radial-gradient(circle, ${primaryColor} 0%, ${secondaryColor} 70%, transparent 100%); border-radius: 50%; ${blurStyle}'></div>`;
  };

  // Create liquid layers
  const liquidLayers: RenderableComponentData[] = [];

  for (let i = 0; i < layerCount; i++) {
    const layerId = `${trackName}-layer-${i + 1}`;
    const blobId = `${trackName}-blob-${i + 1}`;

    // Get parameters for this layer (with fallbacks)
    const color = colors[i] || colors[0];
    const blendMode = blendModes[i] || blendModes[0];
    const initialScale = initialScales[i] || 1.0;
    const finalScale = finalScales[i] || 1.3;
    const rotation = rotations[i] || 0;
    const blobSize = blobSizes[i] || 200;
    const layerStart = i * layerOffset;
    const layerDuration = duration - layerStart;
    const applyBlur = enableTurbulence && i === layerCount - 1;

    // Create expansion effect (fast burst)
    const expansionEffect = {
      id: `${blobId}-expansion`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: burstDuration,
        mode: 'provider',
        targetIds: [blobId],
        ranges: [
          // Scale from tiny to initial
          { key: 'scale', val: 0.1, prog: 0 },
          { key: 'scale', val: initialScale, prog: 1 },
          // Fade in quickly
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 + i * 0.03 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };

    // Create settle effect (slow spread)
    const settleEffect = {
      id: `${blobId}-settle`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: burstDuration,
        duration: settleDuration,
        mode: 'provider',
        targetIds: [blobId],
        ranges: [
          // Continue scaling to final size
          { key: 'scale', val: initialScale, prog: 0 },
          { key: 'scale', val: finalScale, prog: 1 },
          // Add subtle rotation
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: rotation, prog: 1 },
          // Optional fade out at end for last layer
          ...(applyBlur
            ? [
                { key: 'opacity', val: 0.8, prog: 0 },
                { key: 'opacity', val: 0.5, prog: 1 },
              ]
            : []),
        ],
      },
    };

    // Create blob atom
    const blobAtom: RenderableComponentData = {
      id: blobId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createBlobHTML(
          blobSize,
          color.primary,
          color.secondary,
          applyBlur ? blurAmount : 0,
        ),
        className: 'w-full h-full flex items-center justify-center',
        style: {},
      },
      context: {
        timing: {
          start: 0,
          duration: layerDuration,
        },
      },
      effects: [expansionEffect, settleEffect],
    };

    // Create layer container
    const layerContainer: RenderableComponentData = {
      id: layerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            mixBlendMode: blendMode,
          },
        },
      },
      context: {
        timing: {
          start: layerStart,
          duration: layerDuration,
        },
      },
      childrenData: [blobAtom],
    };

    liquidLayers.push(layerContainer);
  }

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: liquidLayers as RenderableComponentData[],
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
  id: 'liquid-expansion',
  title: 'Liquid Expansion Effect',
  description:
    'Organic liquid splash effect with HTML divs morphing and flowing from center with fluid dynamics, variable speeds, surface tension, turbulence, and color mixing through blend modes',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'liquid',
    'organic',
    'fluid',
    'expansion',
    'splash',
    'ink-drop',
    'morphing',
    'blend-modes',
    'color-mixing',
    'animation',
  ],
  dependencies: {},
  defaultInputParams: {
    trackName: 'liquid-expansion-track',
    duration: 3,
    layerCount: 4,
    burstDuration: 1,
    layerOffset: 0.1,
    colors: [
      {
        primary: 'rgba(0,150,255,0.8)',
        secondary: 'rgba(0,100,200,0.4)',
      },
      {
        primary: 'rgba(255,100,150,0.7)',
        secondary: 'rgba(200,50,100,0.3)',
      },
      {
        primary: 'rgba(150,255,100,0.6)',
        secondary: 'rgba(100,200,50,0.3)',
      },
      {
        primary: 'rgba(255,200,50,0.7)',
        secondary: 'rgba(200,150,30,0.4)',
      },
    ],
    blendModes: ['screen', 'multiply', 'overlay', 'screen'],
    initialScales: [1.0, 1.1, 0.9, 1.15],
    finalScales: [1.3, 1.4, 1.2, 1.5],
    rotations: [-2, 1.5, -1, 2],
    blobSizes: [200, 180, 220, 160],
    blurAmount: 8,
    enableTurbulence: true,
  },
};

// Export preset
export const liquidExpansionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
