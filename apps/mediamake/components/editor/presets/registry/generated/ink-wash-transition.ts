/**
 * Chinese Ink Wash Transition Preset
 * 
 * A meditative transition effect inspired by traditional Chinese sumi-e painting.
 * Features flowing ink wash effects with characteristic gray tones, soft bleeding edges,
 * and subtle paper fiber details. The transition simulates traditional ink painting on
 * rice paper with organic spreading movements.
 * 
 * Key Features:
 * - Primary wash stroke that flows across the screen
 * - Multiple layered wash tones with varying opacities
 * - Ink bleeding effects with radial gradients
 * - Subtle paper fiber effects following ink paths
 * - Soft edges and organic spread patterns
 * - Meditative, flowing animation perfect for contemplative content
 * 
 * Use Cases:
 * - Artistic video transitions
 * - Contemplative or zen content
 * - Documentary transitions
 * - Cultural or traditional content
 * - Elegant scene changes
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2.5)
    .describe('Total duration of the ink wash transition in seconds'),
  primaryStrokeDuration: z
    .number()
    .min(1)
    .max(4)
    .default(2)
    .describe('Duration of the primary wash stroke animation'),
  inkOpacity: z
    .number()
    .min(0.3)
    .max(0.9)
    .default(0.6)
    .describe('Base opacity of the ink wash (0.3-0.9)'),
  bleedIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Intensity of ink bleeding effect (scale multiplier)'),
  fiberVisibility: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Visibility of paper fiber effects (0-1)'),
  washLayers: z
    .number()
    .int()
    .min(2)
    .max(5)
    .default(3)
    .describe('Number of layered wash tones (2-5)'),
  softEdgeBlur: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Blur amount for soft edges in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    transitionDuration,
    primaryStrokeDuration,
    inkOpacity,
    bleedIntensity,
    fiberVisibility,
    washLayers,
    softEdgeBlur,
  } = params;

  // Helper function to generate wash layer children
  const generateWashLayers = (): RenderableComponentData[] => {
    const layers: RenderableComponentData[] = [];
    const layerCount = Math.min(washLayers, 5);

    for (let i = 0; i < layerCount; i++) {
      const layerOpacity = inkOpacity * (0.3 + (i * 0.2));
      const layerHeight = 32 + (i * 16); // Increasing height for each layer
      const layerBlur = softEdgeBlur + (i * 2);
      const layerStart = i * 0.15; // Staggered start times
      const layerDuration = primaryStrokeDuration + (i * 0.2);
      const verticalOffset = 10 + (i * 5);

      layers.push({
        id: `wash-layer-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class="wash-layer"></div>`,
          className: 'absolute w-full',
          style: {
            height: `${layerHeight}px`,
            background: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,${layerOpacity}) 50%, transparent 100%)`,
            filter: `blur(${layerBlur}px)`,
            top: `${verticalOffset}%`,
          },
        },
        context: {
          timing: {
            start: layerStart,
            duration: layerDuration,
          },
        },
        effects: [
          {
            id: `wash-layer-${i}-movement`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: layerDuration,
              mode: 'provider',
              targetIds: [`wash-layer-${i}`],
              ranges: [
                { key: 'translateY', val: -100, prog: 0, unit: '%' },
                { key: 'translateY', val: 100, prog: 1, unit: '%' },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.8 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return layers;
  };

  // Helper function to generate ink bleed effects
  const generateInkBleeds = (): RenderableComponentData[] => {
    const bleeds: RenderableComponentData[] = [];
    const bleedConfigs = [
      { size: 200, left: '25%', top: '35%', start: 0.5, scale: 2.5 * bleedIntensity, opacity: 0.4 },
      { size: 180, left: '60%', top: '45%', start: 0.7, scale: 2.2 * bleedIntensity, opacity: 0.35 },
      { size: 220, left: '40%', top: '55%', start: 0.9, scale: 2.8 * bleedIntensity, opacity: 0.38 },
      { size: 160, left: '70%', top: '30%', start: 1.1, scale: 2.0 * bleedIntensity, opacity: 0.3 },
    ];

    bleedConfigs.forEach((config, index) => {
      const bleedDuration = 1.3 + (index * 0.1);
      
      bleeds.push({
        id: `ink-bleed-${index}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class="ink-bleed"></div>`,
          className: 'absolute rounded-full',
          style: {
            width: `${config.size}px`,
            height: `${config.size}px`,
            left: config.left,
            top: config.top,
            background: `radial-gradient(circle, rgba(0,0,0,${config.opacity}) 0%, rgba(0,0,0,${config.opacity * 0.3}) 50%, transparent 70%)`,
            filter: `blur(${softEdgeBlur + 2}px)`,
          },
        },
        context: {
          timing: {
            start: config.start,
            duration: bleedDuration,
          },
        },
        effects: [
          {
            id: `ink-bleed-${index}-spread`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: bleedDuration,
              mode: 'provider',
              targetIds: [`ink-bleed-${index}`],
              ranges: [
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: config.scale, prog: 1 },
                { key: 'opacity', val: config.opacity * 2, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    });

    return bleeds;
  };

  // Helper function to generate paper fiber effects
  const generateFibers = (): RenderableComponentData[] => {
    if (fiberVisibility === 0) return [];

    const fibers: RenderableComponentData[] = [];
    const fiberConfigs = [
      { width: 1, height: 60, left: '30%', top: '40%', rotation: 15, start: 0.8 },
      { width: 1, height: 50, left: '55%', top: '50%', rotation: -10, start: 1.0 },
      { width: 1, height: 45, left: '65%', top: '35%', rotation: 25, start: 1.1 },
      { width: 1, height: 55, left: '42%', top: '58%', rotation: -15, start: 0.9 },
    ];

    fiberConfigs.forEach((config, index) => {
      const fiberDuration = 1.0 + (index * 0.1);
      
      fibers.push({
        id: `fiber-${index}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class="fiber"></div>`,
          className: 'absolute',
          style: {
            width: `${config.width}px`,
            height: `${config.height}px`,
            left: config.left,
            top: config.top,
            background: `linear-gradient(to bottom, transparent, rgba(0,0,0,${0.15 * fiberVisibility}), transparent)`,
            transform: `rotate(${config.rotation}deg)`,
          },
        },
        context: {
          timing: {
            start: config.start,
            duration: fiberDuration,
          },
        },
        effects: [
          {
            id: `fiber-${index}-fade`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: fiberDuration,
              mode: 'provider',
              targetIds: [`fiber-${index}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: fiberVisibility, prog: 0.3 },
                { key: 'opacity', val: fiberVisibility, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'translateY', val: -10, prog: 0 },
                { key: 'translateY', val: 10, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    });

    return fibers;
  };

  // Build the complete composition
  const childrenData: RenderableComponentData[] = [
    // Primary wash stroke
    {
      id: 'primary-wash-stroke',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="primary-wash"></div>`,
        className: 'absolute w-full',
        style: {
          height: '128px',
          background: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,${inkOpacity}) 50%, transparent 100%)`,
          filter: `blur(${softEdgeBlur / 2}px)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: primaryStrokeDuration,
        },
      },
      effects: [
        {
          id: 'primary-stroke-movement',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: primaryStrokeDuration,
            mode: 'provider',
            targetIds: ['primary-wash-stroke'],
            ranges: [
              { key: 'translateY', val: -100, prog: 0, unit: '%' },
              { key: 'translateY', val: 100, prog: 1, unit: '%' },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Secondary wash layers
    ...generateWashLayers(),
    
    // Soft radial overlay
    {
      id: 'radial-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class="radial-overlay"></div>`,
        className: 'absolute inset-0',
        style: {
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.15) 70%, transparent 100%)',
        },
      },
      context: {
        timing: {
          start: 0.3,
          duration: 2,
        },
      },
      effects: [
        {
          id: 'radial-overlay-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 2,
            mode: 'provider',
            targetIds: ['radial-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.4 },
              { key: 'opacity', val: 0.6, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Ink bleed effects
    ...generateInkBleeds(),
    
    // Paper fiber effects
    ...generateFibers(),
  ];

  const rootContainer: RenderableComponentData = {
    id: 'ink-wash-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData,
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
  id: 'ink-wash-transition',
  title: 'Chinese Ink Wash Transition',
  description:
    'A meditative sumi-e inspired transition featuring flowing ink wash effects with characteristic gray tones, soft bleeding edges, and subtle paper fiber details. The transition simulates traditional ink painting on rice paper with organic spreading movements, layered wash tones, and zen-like flowing animation perfect for contemplative or artistic video content.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'ink', 'wash', 'sumi-e', 'chinese', 'artistic', 'zen', 'contemplative', 'organic', 'elegant'],
  defaultInputParams: {
    transitionDuration: 2.5,
    primaryStrokeDuration: 2,
    inkOpacity: 0.6,
    bleedIntensity: 1.5,
    fiberVisibility: 0.5,
    washLayers: 3,
    softEdgeBlur: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const inkWashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
