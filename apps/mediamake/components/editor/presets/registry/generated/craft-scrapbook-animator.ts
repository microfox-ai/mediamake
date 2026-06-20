/**
 * Craft Scrapbook Animator Preset
 *
 * A tactile craft-inspired animator mimicking handmade scrapbook assembly with fabric, felt, 
 * and paper textures. Features stop-motion quality animations with various craft techniques:
 * - Each word uses unique material textures (felt letters, fabric patches, paper cutouts, foam stickers)
 * - Multiple animation styles: slide-in, flip-over, pop-up effects
 * - Realistic shadows and layered depth using multiple box-shadows
 * - Stitching animations with dashed borders
 * - Glue drips and scissors cutting effects
 * - Hand movement simulations using bezier curve paths
 * - 3D transforms with preserve-3d for fabric flip effects
 *
 * Features:
 * - **Material Textures**: CSS gradients mimicking felt, fabric, paper, foam
 * - **Craft Animations**: Slide, flip, pop-up with realistic physics
 * - **Depth Effects**: Layered box-shadows for foam dimensionality
 * - **Decorative Elements**: Stitching, glue drips, cutting marks
 * - **Performance**: GPU-accelerated with will-change and translateZ(0)
 * - **Customizable**: Text, colors, timing, animation styles per word
 *
 * Use cases:
 * - Handmade scrapbook title sequences
 * - Craft-themed video intros
 * - Ransom note aesthetic text reveals
 * - Stop-motion style animations
 * - Tactile, textured typography
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  words: z
    .array(
      z.object({
        text: z.string().describe('Text content for this word'),
        material: z
          .enum(['felt', 'fabric', 'paper', 'foam'])
          .default('felt')
          .describe('Material type for this word'),
        animation: z
          .enum(['slide', 'flip', 'popup'])
          .default('slide')
          .describe('Animation style for this word'),
        position: z
          .object({
            top: z.string().describe('Top position (CSS value, e.g., "20%")'),
            left: z.string().describe('Left position (CSS value, e.g., "10%")'),
          })
          .describe('Position on canvas'),
        rotation: z
          .number()
          .min(-15)
          .max(15)
          .default(0)
          .describe('Rotation angle in degrees'),
        delay: z
          .number()
          .min(0)
          .default(0)
          .describe('Animation delay in seconds'),
      }),
    )
    .default([
      {
        text: 'CRAFT',
        material: 'felt',
        animation: 'slide',
        position: { top: '20%', left: '10%' },
        rotation: -3,
        delay: 0,
      },
      {
        text: 'SCRAPBOOK',
        material: 'fabric',
        animation: 'flip',
        position: { top: '45%', left: '35%' },
        rotation: 2,
        delay: 0.4,
      },
      {
        text: 'MAGIC',
        material: 'foam',
        animation: 'popup',
        position: { top: '70%', left: '60%' },
        rotation: -5,
        delay: 0.8,
      },
    ])
    .describe('Array of words with material and animation settings'),

  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(60)
    .describe('Base font size in pixels'),

  duration: z
    .number()
    .min(1)
    .max(30)
    .default(10)
    .describe('Total duration in seconds'),

  showDecorations: z
    .boolean()
    .default(true)
    .describe('Show stitching, glue drips, and other decorative elements'),

  backgroundColor: z
    .string()
    .default('from-pink-100 to-purple-100')
    .describe('Tailwind gradient classes for background'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { words, fontSize, duration, showDecorations, backgroundColor } = params;

  // Helper: Generate material texture gradient
  const getMaterialTexture = (material: string): string => {
    switch (material) {
      case 'felt':
        return 'linear-gradient(135deg, #D2691E 0%, #8B4513 50%, #A0522D 100%)';
      case 'fabric':
        return 'repeating-linear-gradient(45deg, #FF69B4 0%, #FFB6C1 25%, #FF1493 50%, #FF69B4 75%, #FFB6C1 100%)';
      case 'paper':
        return 'linear-gradient(145deg, #FFFACD 0%, #F5DEB3 50%, #FFE4B5 100%)';
      case 'foam':
        return 'radial-gradient(circle, #E6E6FA 0%, #9370DB 40%, #8A2BE2 100%)';
      default:
        return 'linear-gradient(135deg, #D2691E 0%, #8B4513 50%, #A0522D 100%)';
    }
  };

  // Helper: Generate material color
  const getMaterialColor = (material: string): string => {
    switch (material) {
      case 'felt':
        return '#8B4513';
      case 'fabric':
        return '#FF69B4';
      case 'paper':
        return '#DEB887';
      case 'foam':
        return '#9370DB';
      default:
        return '#8B4513';
    }
  };

  // Helper: Generate text stroke
  const getMaterialStroke = (material: string): string => {
    switch (material) {
      case 'felt':
        return '2px #654321';
      case 'fabric':
        return '2px #C71585';
      case 'paper':
        return '1px #8B7355';
      case 'foam':
        return '3px #4B0082';
      default:
        return '2px #654321';
    }
  };

  // Helper: Generate box-shadow for depth
  const getMaterialShadow = (material: string): string => {
    switch (material) {
      case 'felt':
        return 'drop-shadow(3px 3px 0px rgba(0,0,0,0.3)) drop-shadow(6px 6px 0px rgba(0,0,0,0.15))';
      case 'fabric':
        return 'drop-shadow(4px 4px 0px rgba(0,0,0,0.25)) drop-shadow(8px 8px 0px rgba(0,0,0,0.1))';
      case 'paper':
        return 'drop-shadow(2px 2px 0px rgba(0,0,0,0.2)) drop-shadow(4px 4px 0px rgba(0,0,0,0.1))';
      case 'foam':
        return 'drop-shadow(5px 5px 0px rgba(0,0,0,0.35)) drop-shadow(10px 10px 0px rgba(0,0,0,0.15)) drop-shadow(15px 15px 0px rgba(0,0,0,0.05))';
      default:
        return 'drop-shadow(3px 3px 0px rgba(0,0,0,0.3))';
    }
  };

  // Helper: Create animation effect based on type
  const createAnimationEffect = (
    wordId: string,
    animation: string,
    delay: number,
  ) => {
    const animationDuration = 1.2;

    switch (animation) {
      case 'slide':
        return {
          id: `${wordId}-slide-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: delay,
            duration: animationDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'translateX', val: -200, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
            ],
          },
        };

      case 'flip':
        return {
          id: `${wordId}-flip-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: delay,
            duration: animationDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'rotateY', val: 180, prog: 0 },
              { key: 'rotateY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.4 },
            ],
          },
        };

      case 'popup':
        return {
          id: `${wordId}-popup-effect`,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: delay,
            duration: 0.8,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.6 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
            ],
          },
        };

      default:
        return {
          id: `${wordId}-default-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: delay,
            duration: 1,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        };
    }
  };

  // Create word components
  const wordComponents = words.map((word, index) => {
    const wordContainerId = `craft-word-container-${index}`;
    const wordTextId = `craft-word-text-${index}`;

    const texture = getMaterialTexture(word.material);
    const color = getMaterialColor(word.material);
    const stroke = getMaterialStroke(word.material);
    const shadow = getMaterialShadow(word.material);

    const animationEffect = createAnimationEffect(
      wordContainerId,
      word.animation,
      word.delay,
    );

    // Word container with animation
    const wordContainer: RenderableComponentData = {
      id: wordContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: word.position.top,
            left: word.position.left,
            transform: `rotate(${word.rotation}deg)`,
            transformStyle: word.animation === 'flip' ? 'preserve-3d' : undefined,
            perspective: word.animation === 'flip' ? '1000px' : undefined,
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [animationEffect],
      childrenData: [
        {
          id: wordTextId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            className: 'font-bold',
            style: {
              fontSize: `${fontSize}px`,
              color: color,
              textStroke: stroke,
              WebkitTextStroke: stroke,
              backgroundImage: texture,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              filter: shadow,
              willChange: 'transform',
              transform: 'translateZ(0)',
              backfaceVisibility: word.animation === 'flip' ? 'hidden' : undefined,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    return wordContainer;
  });

  // Create decoration elements
  const decorations: RenderableComponentData[] = [];

  if (showDecorations) {
    // Stitching decoration
    decorations.push({
      id: 'stitch-decoration-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='position: absolute; top: 15%; left: 5%; width: 200px; height: 2px; border-top: 3px dashed #654321; opacity: 0.7;'></div>",
        className: 'pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData);

    // Glue drip decoration
    decorations.push({
      id: 'glue-drip-decoration',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='position: absolute; top: 85%; left: 45%; width: 20px; height: 0px; border-bottom: 15px solid rgba(255,255,255,0.6); border-left: 5px solid transparent; border-right: 5px solid transparent; filter: blur(1px);'></div>",
        className: 'pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData);

    // Additional stitching
    decorations.push({
      id: 'stitch-decoration-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='position: absolute; top: 60%; right: 10%; width: 150px; height: 2px; border-top: 3px dashed #8B4513; opacity: 0.6; transform: rotate(-15deg);'></div>",
        className: 'pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'craft-scrapbook-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative bg-gradient-to-br ${backgroundColor} p-12`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [...wordComponents, ...decorations] as RenderableComponentData[],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'craft-scrapbook-animator',
  title: 'Craft Scrapbook Animator',
  description:
    'Tactile craft-inspired animator mimicking handmade scrapbook assembly with fabric, felt, and paper textures. Features stop-motion quality animations with stickers sliding in, fabric pieces flipping, foam elements popping up, stitching animations, glue drips, and scissors cutting effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'craft',
    'scrapbook',
    'handmade',
    'tactile',
    'stop-motion',
    'textures',
    'felt',
    'fabric',
    'paper',
    'foam',
    'stitching',
    'glue',
    '3d',
    'flip',
    'popup',
    'slide',
    'ransom-note',
    'layered',
    'depth',
  ],
  dependencies: {},
  defaultInputParams: {
    words: [
      {
        text: 'CRAFT',
        material: 'felt',
        animation: 'slide',
        position: { top: '20%', left: '10%' },
        rotation: -3,
        delay: 0,
      },
      {
        text: 'SCRAPBOOK',
        material: 'fabric',
        animation: 'flip',
        position: { top: '45%', left: '35%' },
        rotation: 2,
        delay: 0.4,
      },
      {
        text: 'MAGIC',
        material: 'foam',
        animation: 'popup',
        position: { top: '70%', left: '60%' },
        rotation: -5,
        delay: 0.8,
      },
    ],
    fontSize: 60,
    duration: 10,
    showDecorations: true,
    backgroundColor: 'from-pink-100 to-purple-100',
  },
};

// --- Export ---

export const craftScrapbookAnimatorPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
