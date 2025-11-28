/**
 * Ink Wash Reveal Transition Preset
 *
 * This preset creates a meditative ink wash reveal transition that mimics traditional Chinese
 * ink painting techniques. The incoming video is revealed through flowing diagonal ink strokes
 * with varying opacity, width, and rotation, creating a layered artistic effect.
 *
 * Features:
 * - **Diagonal Brush Strokes**: 6-8 flowing strokes with varying opacity and width
 * - **Staggered Animation**: Sequential reveals with 0.1s intervals for organic flow
 * - **Ink Splatter Elements**: Small circular splatters at stroke edges with spring easing
 * - **Subtle Desaturation**: Both videos desaturate during transition for ink aesthetic
 * - **Smooth Movements**: Meditative pacing with deliberate brush-like animations
 *
 * Technical Implementation:
 * - 2-second overlap period for smooth transition
 * - Diagonal stroke masks using HTMLBlockAtom with CSS transforms
 * - Staggered delays (0.1s intervals) for sequential reveal
 * - Varying opacity (0.3-0.8) and rotation (±15deg) per stroke
 * - Filter effects for desaturation during transition
 * - Small circular ink splatters with scale animations
 *
 * Use cases:
 * - Artistic video transitions with traditional aesthetics
 * - Cultural content requiring elegant, meditative transitions
 * - Creating contemplative mood between video segments
 * - Adding organic, hand-painted feel to digital videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of outgoing media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Outgoing media configuration'),
  media2: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Incoming media configuration'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2.0)
    .describe('Duration of transition overlap in seconds'),
  strokeCount: z
    .number()
    .min(4)
    .max(12)
    .default(7)
    .describe('Number of diagonal ink strokes'),
  splatterCount: z
    .number()
    .min(5)
    .max(20)
    .default(8)
    .describe('Number of ink splatter elements'),
  desaturationAmount: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Amount of desaturation during transition (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    transitionDuration,
    strokeCount,
    splatterCount,
    desaturationAmount,
  } = params;

  // Calculate BaseLayout duration (with overlap)
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Helper function to generate stroke configurations
  const generateStrokeConfig = (index: number, total: number) => {
    const progress = index / (total - 1);
    return {
      width: 12 + Math.random() * 8, // 12-20% width variation
      opacity: 0.3 + Math.random() * 0.5, // 0.3-0.8 opacity
      rotation: -48 + Math.random() * 6, // -48 to -42 degrees base rotation
      rotateStart: -15 + Math.random() * 30, // ±15 deg rotation variation
      rotateEnd: -15 + Math.random() * 30,
      top: 10 + progress * 75, // Vertical position spread
      delay: index * 0.1, // Staggered by 0.1s
    };
  };

  // Helper function to generate splatter positions
  const generateSplatterConfig = (index: number, total: number) => {
    const progress = index / (total - 1);
    return {
      size: 5 + Math.random() * 5, // 5-10px size
      opacity: 0.55 + Math.random() * 0.25, // 0.55-0.8 opacity
      top: 15 + progress * 70, // Vertical spread
      left: 20 + progress * 65, // Diagonal spread
      delay: 0.2 + index * 0.1, // Staggered appearance
      duration: 0.4 + Math.random() * 0.1, // Spring duration variation
    };
  };

  // Generate strokes
  const strokes: RenderableComponentData[] = [];
  for (let i = 0; i < strokeCount; i++) {
    const config = generateStrokeConfig(i, strokeCount);
    const strokeId = `ink-stroke-${i}`;

    strokes.push({
      id: strokeId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width: 200%; height: ${config.width}%; background: rgba(${35 + Math.floor(Math.random() * 15)}, ${35 + Math.floor(Math.random() * 15)}, ${35 + Math.floor(Math.random() * 15)}, ${config.opacity}); transform: rotate(${config.rotation}deg);'></div>`,
        className: 'absolute',
        style: {
          top: `${config.top}%`,
          left: '-50%',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: config.delay,
          duration: transitionDuration - config.delay,
        },
      },
      effects: [
        {
          id: `stroke-${i}-slide`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration - config.delay,
            mode: 'provider',
            targetIds: [strokeId],
            ranges: [
              { key: 'translateX', val: -150, prog: 0 },
              { key: 'translateY', val: -150, prog: 0 },
              { key: 'translateX', val: 150, prog: 1 },
              { key: 'translateY', val: 150, prog: 1 },
              { key: 'rotate', val: config.rotateStart, prog: 0 },
              { key: 'rotate', val: config.rotateEnd, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Generate ink splatters
  const splatters: RenderableComponentData[] = [];
  for (let i = 0; i < splatterCount; i++) {
    const config = generateSplatterConfig(i, splatterCount);
    const splatterId = `ink-splatter-${i}`;

    splatters.push({
      id: splatterId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width: ${config.size}px; height: ${config.size}px; background: rgba(${30 + Math.floor(Math.random() * 20)}, ${30 + Math.floor(Math.random() * 20)}, ${30 + Math.floor(Math.random() * 20)}, ${config.opacity}); border-radius: 50%;'></div>`,
        className: 'absolute',
        style: {
          top: `${config.top}%`,
          left: `${config.left}%`,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: config.delay,
          duration: transitionDuration - config.delay,
        },
      },
      effects: [
        {
          id: `splatter-${i}-scale`,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: 0,
            duration: config.duration,
            mode: 'provider',
            targetIds: [splatterId],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Build childrenData
  const childrenData: RenderableComponentData[] = [
    // Outgoing media (bottom layer)
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-desaturate',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'saturate', val: 1, prog: 0 },
              { key: 'saturate', val: desaturationAmount, prog: 0.5 },
              { key: 'saturate', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming media (middle layer) - starts during overlap
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: media2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-desaturate',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'saturate', val: desaturationAmount, prog: 0 },
              { key: 'saturate', val: desaturationAmount, prog: 0.5 },
              { key: 'saturate', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'incoming-opacity-reveal',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Ink strokes container (top layer)
    {
      id: 'ink-stroke-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'multiply',
          },
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      childrenData: strokes,
    } as RenderableComponentData,

    // Ink splatters container (overlay)
    {
      id: 'ink-splatter-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      childrenData: splatters,
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'ink-wash-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#fafafa',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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
  id: 'ink-wash-reveal-transition',
  title: 'Ink Wash Reveal Transition',
  description:
    'Meditative transition mimicking traditional Chinese ink painting techniques with flowing diagonal brush strokes, varying opacity, and ink splatter elements',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'ink-wash',
    'artistic',
    'chinese-painting',
    'brush-strokes',
    'meditative',
    'diagonal',
    'reveal',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 2.0,
    strokeCount: 7,
    splatterCount: 8,
    desaturationAmount: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const inkWashRevealTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
