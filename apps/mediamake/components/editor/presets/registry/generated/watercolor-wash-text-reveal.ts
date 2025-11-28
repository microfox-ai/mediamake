/**
 * Watercolor Wash Text Reveal Preset
 *
 * This preset creates an artistic watercolor painting effect where text appears
 * as if being painted with wet watercolor brushes. The effect captures the unpredictability
 * of watercolor through color pooling, edge bleeding, and transparency variations.
 *
 * Features:
 * - Multiple overlapping wash layers per word with varying opacity (0.3-0.8)
 * - Irregular SVG shapes using bezier curves with random control points
 * - Organic scaling animations (0.8 → 1.1 → 1) with varied timing
 * - Paper texture interaction using mix-blend-mode
 * - Color bleeding using blur, contrast, and saturation filters
 * - Wet paint effect (blur 4px → 1px, brightness 1.2 → 1)
 * - Transform-origin variations for natural paint spread
 * - Slow, organic timing (1.5-2s per word) with ease-in-out curves
 *
 * Use cases:
 * - Artistic text reveals
 * - Hand-painted aesthetic titles
 * - Watercolor-themed content
 * - Creative typography presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('The text to reveal with watercolor wash effect'),
  duration: z.number().default(10).describe('Total duration of the reveal animation in seconds'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  fontFamily: z.string().default('Playfair Display').describe('Font family for the text'),
  fontWeight: z.string().default('600').describe('Font weight (e.g., "400", "600", "700")'),
  textColor: z.string().default('#2c3e50').describe('Final text color after reveal'),
  washColors: z.array(z.string()).default([
    'rgba(74, 144, 226, 0.5)',
    'rgba(106, 90, 205, 0.4)',
    'rgba(147, 112, 219, 0.6)',
  ]).describe('Array of watercolor wash colors (rgba format recommended)'),
  paperTextureOpacity: z.number().min(0).max(1).default(0.15).describe('Opacity of paper texture overlay'),
  staggerDelay: z.number().default(1.8).describe('Time delay between each word reveal in seconds'),
  washLayerCount: z.number().min(1).max(5).default(3).describe('Number of wash layers per word'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    washColors,
    paperTextureOpacity,
    staggerDelay,
    washLayerCount,
  } = params;

  // Split text into words
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  // Helper function to generate irregular bezier path for watercolor wash
  const generateWashPath = (width: number, height: number, seed: number): string => {
    const random = (min: number, max: number, offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return min + ((x - Math.floor(x)) * (max - min));
    };

    const padding = 0.2; // 20% padding around text
    const startX = width * -padding;
    const startY = height * -padding;
    const endX = width * (1 + padding);
    const endY = height * (1 + padding);

    // Create organic blob shape with bezier curves
    const cx1 = random(startX, endX, 1);
    const cy1 = random(startY, endY, 2);
    const cx2 = random(startX, endX, 3);
    const cy2 = random(startY, endY, 4);
    const cx3 = random(startX, endX, 5);
    const cy3 = random(startY, endY, 6);
    const cx4 = random(startX, endX, 7);
    const cy4 = random(startY, endY, 8);

    return `
      M ${startX + width * 0.3} ${startY + height * 0.5}
      Q ${cx1} ${cy1}, ${endX * 0.5} ${startY + height * 0.2}
      Q ${cx2} ${cy2}, ${endX - width * 0.2} ${startY + height * 0.4}
      Q ${cx3} ${cy3}, ${endX - width * 0.3} ${endY - height * 0.3}
      Q ${cx4} ${cy4}, ${startX + width * 0.4} ${endY - height * 0.2}
      Z
    `;
  };

  // Helper function to generate SVG wash shape
  const generateWashSVG = (colorIndex: number, layerIndex: number, wordIndex: number): string => {
    const color = washColors[colorIndex % washColors.length];
    const seed = wordIndex * 100 + layerIndex * 10 + colorIndex;
    const width = 100;
    const height = 100;
    const path = generateWashPath(width, height, seed);

    return `
      <svg viewBox="-20 -20 140 140" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
        <path d="${path}" fill="${color}" />
      </svg>
    `;
  };

  // Paper texture as base64 SVG
  const paperTextureSVG = `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="400" height="400" filter="url(#noise)" opacity="0.3" />
    </svg>
  `)}`;

  // Build word components with wash layers
  const wordComponents: RenderableComponentData[] = words.map((word, wordIndex) => {
    const wordStart = wordIndex * staggerDelay;
    const wordId = `word-${wordIndex}`;

    // Create wash layers
    const washLayers: RenderableComponentData[] = [];
    for (let layerIndex = 0; layerIndex < washLayerCount; layerIndex++) {
      const layerId = `wash-layer-${wordIndex}-${layerIndex}`;
      const colorIndex = layerIndex;
      
      // Varying parameters per layer
      const baseOpacity = 0.3 + (layerIndex * 0.2);
      const finalOpacity = Math.min(baseOpacity + 0.2, 0.8);
      const startDelay = layerIndex * 0.2;
      const scaleDuration = 1.8 - (layerIndex * 0.2);
      const opacityDuration = 1.5 - (layerIndex * 0.15);
      const blurDuration = 1.8 - (layerIndex * 0.2);
      const initialBlur = 4 - layerIndex;
      const finalBlur = 1 - (layerIndex * 0.3);
      
      // Transform origins (varied for organic feel)
      const origins = ['center center', '30% 70%', '70% 30%', '50% 80%', '80% 50%'];
      const transformOrigin = origins[layerIndex % origins.length];

      // Generate wash SVG
      const washSVG = generateWashSVG(colorIndex, layerIndex, wordIndex);

      const washLayer: RenderableComponentData = {
        id: layerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              opacity: 0,
              mixBlendMode: 'multiply',
              transformOrigin: transformOrigin,
              filter: `blur(${initialBlur}px) contrast(0.9) saturate(1.2)`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: staggerDelay + 2, // Extend beyond word duration
          },
        },
        childrenData: [
          {
            id: `wash-svg-${wordIndex}-${layerIndex}`,
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: washSVG,
              style: {
                width: '100%',
                height: '100%',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: staggerDelay + 2,
              },
            },
          } as RenderableComponentData,
        ],
        effects: [
          // Scale effect
          {
            id: `${layerId}-scale`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: startDelay,
              duration: scaleDuration,
              mode: 'provider',
              targetIds: [layerId],
              ranges: [
                { key: 'scale', val: 0.8, prog: 0 },
                { key: 'scale', val: 1.1, prog: 0.6 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
          // Opacity effect
          {
            id: `${layerId}-opacity`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: startDelay,
              duration: opacityDuration,
              mode: 'provider',
              targetIds: [layerId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: finalOpacity * 1.2, prog: 0.5 },
                { key: 'opacity', val: finalOpacity, prog: 1 },
              ],
            },
          },
          // Blur effect (wet to dry)
          {
            id: `${layerId}-blur`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: startDelay,
              duration: blurDuration,
              mode: 'provider',
              targetIds: [layerId],
              ranges: [
                { key: 'filter', val: `blur(${initialBlur}px) contrast(0.9) saturate(1.2)`, prog: 0 },
                { key: 'filter', val: `blur(${finalBlur}px) contrast(0.95) saturate(1.1)`, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;

      washLayers.push(washLayer);
    }

    // Text component
    const textComponent: RenderableComponentData = {
      id: `${wordId}-text`,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
          mixBlendMode: 'color-burn',
          opacity: 0,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: staggerDelay + 2,
        },
      },
      effects: [
        // Text opacity
        {
          id: `${wordId}-text-opacity`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0.6,
            duration: 1.2,
            mode: 'provider',
            targetIds: [`${wordId}-text`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Text brightness (wet paint effect)
        {
          id: `${wordId}-text-brightness`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0.6,
            duration: 1,
            mode: 'provider',
            targetIds: [`${wordId}-text`],
            ranges: [
              { key: 'filter', val: 'brightness(1.2)', prog: 0 },
              { key: 'filter', val: 'brightness(1)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;

    // Word group container
    const wordGroup: RenderableComponentData = {
      id: wordId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative inline-block',
          style: {
            margin: '0 0.2em',
          },
        },
      },
      context: {
        timing: {
          start: wordStart,
          duration: staggerDelay + 2,
        },
      },
      childrenData: [
        ...washLayers,
        textComponent,
      ],
    } as RenderableComponentData;

    return wordGroup;
  });

  // Paper texture layer
  const paperTextureLayer: RenderableComponentData = {
    id: 'paper-texture-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundImage: `url('${paperTextureSVG}')`,
          backgroundSize: '400px 400px',
          backgroundRepeat: 'repeat',
          opacity: paperTextureOpacity,
          mixBlendMode: 'multiply',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  } as RenderableComponentData;

  // Words container
  const wordsContainer: RenderableComponentData = {
    id: 'words-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-wrap items-center justify-center gap-4 p-8',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: wordComponents,
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'watercolor-reveal-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          background: 'linear-gradient(180deg, #faf8f5 0%, #f5f0e8 50%, #ebe4d8 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      paperTextureLayer,
      wordsContainer,
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'watercolor-wash-text-reveal',
  title: 'Watercolor Wash Text Reveal',
  description: 'An artistic text reveal effect that simulates wet watercolor painting. Each word appears through multiple overlapping wash layers that blend and bleed organically, with color pooling effects, transparency variations, and paper texture interaction. The effect captures the unpredictability of watercolor with staggered layer animations, varying opacities (0.3-0.8), blur transitions (wet to dry), and color-burn blend modes for authentic watercolor depth.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'watercolor', 'artistic', 'reveal', 'paint', 'organic', 'creative', 'typography'],
  dependencies: {},
  defaultInputParams: {
    text: 'Watercolor Dreams',
    duration: 10,
    fontSize: 72,
    fontFamily: 'Playfair Display',
    fontWeight: '600',
    textColor: '#2c3e50',
    washColors: [
      'rgba(74, 144, 226, 0.5)',
      'rgba(106, 90, 205, 0.4)',
      'rgba(147, 112, 219, 0.6)',
    ],
    paperTextureOpacity: 0.15,
    staggerDelay: 1.8,
    washLayerCount: 3,
  },
};

export const watercolorWashTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
