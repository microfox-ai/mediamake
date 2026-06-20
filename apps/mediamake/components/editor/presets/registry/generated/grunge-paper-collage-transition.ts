/**
 * Grunge Paper Collage Transition Preset
 *
 * Creates a chaotic paper collage transition effect where multiple torn paper scraps
 * slide and rotate to reveal the next video. Features 6 irregular paper shapes with
 * grunge textures, staggered animations, coffee stain overlays, and paper fiber effects.
 * Both videos have subtle shake effects during the transition for a rough, handmade aesthetic.
 *
 * Technical Implementation:
 * - BaseLayout duration = video1.duration + video2.duration - 2s (overlap period)
 * - 6 HTMLBlockAtom elements with custom clip-path polygons for irregular paper shapes
 * - Each scrap has unique transform animation (translate + rotate) with 0.3s stagger
 * - Outgoing video with shake effect during last 2 seconds
 * - Incoming video with shake effect during first 2 seconds
 * - Grunge texture overlays with mix-blend-mode and opacity
 * - Paper fiber and coffee stain overlays for depth and grunge aesthetic
 *
 * Use Cases:
 * - Music video transitions
 * - Artistic video edits
 * - Grunge/alternative aesthetic videos
 * - Creative social media content
 * - DIY/handmade style videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of first video (outgoing)'),
    duration: z.number().describe('Duration of first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of second video (incoming)'),
    duration: z.number().describe('Duration of second video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of transition overlap in seconds'),
  grungeTextures: z
    .array(z.string())
    .length(6)
    .describe('Array of 6 grunge texture image URLs for paper scraps'),
  paperFiberTexture: z
    .string()
    .optional()
    .describe('Paper fiber texture overlay URL (optional)'),
  coffeeStainOverlay: z
    .string()
    .optional()
    .describe('Coffee stain overlay image URL (optional)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, grungeTextures, paperFiberTexture, coffeeStainOverlay } = params;

  // Calculate total duration with overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Timing for transition start
  const transitionStart = video1.duration - transitionDuration;

  // Define 6 paper scrap shapes with irregular clip-path polygons
  const paperScraps = [
    {
      id: 'scrap-1',
      clipPath: 'polygon(15% 10%, 45% 5%, 50% 35%, 20% 40%)',
      textureUrl: grungeTextures[0],
      zIndex: 20,
      animation: {
        translateX: [0, -100], // Slide left
        rotate: [0, -15], // Rotate counter-clockwise
        delay: 0,
      },
    },
    {
      id: 'scrap-2',
      clipPath: 'polygon(55% 0%, 85% 8%, 80% 38%, 50% 42%)',
      textureUrl: grungeTextures[1],
      zIndex: 21,
      animation: {
        translateX: [0, 150], // Slide right
        rotate: [0, 25], // Rotate clockwise
        delay: 0.3,
      },
    },
    {
      id: 'scrap-3',
      clipPath: 'polygon(10% 45%, 48% 43%, 45% 75%, 12% 80%)',
      textureUrl: grungeTextures[2],
      zIndex: 22,
      animation: {
        translateY: [0, -120], // Slide up
        rotate: [0, -20], // Rotate counter-clockwise
        delay: 0.6,
      },
    },
    {
      id: 'scrap-4',
      clipPath: 'polygon(52% 48%, 88% 42%, 85% 78%, 50% 82%)',
      textureUrl: grungeTextures[3],
      zIndex: 23,
      animation: {
        translateY: [0, 150], // Slide down
        rotate: [0, 30], // Rotate clockwise
        delay: 0.9,
      },
    },
    {
      id: 'scrap-5',
      clipPath: 'polygon(8% 85%, 42% 82%, 40% 98%, 10% 100%)',
      textureUrl: grungeTextures[4],
      zIndex: 24,
      animation: {
        translateX: [0, -130], // Slide left
        translateY: [0, 100], // Also down
        rotate: [0, -25], // Rotate counter-clockwise
        delay: 1.2,
      },
    },
    {
      id: 'scrap-6',
      clipPath: 'polygon(55% 85%, 90% 80%, 92% 100%, 52% 98%)',
      textureUrl: grungeTextures[5],
      zIndex: 25,
      animation: {
        translateX: [0, 180], // Slide right
        translateY: [0, 80], // Also down
        rotate: [0, 20], // Rotate clockwise
        delay: 1.5,
      },
    },
  ];

  // Create paper scrap elements with effects
  const scrapElements: RenderableComponentData[] = paperScraps.map((scrap) => {
    const scrapEffect = {
      id: `${scrap.id}-animation`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: scrap.animation.delay,
        duration: transitionDuration - scrap.animation.delay,
        mode: 'provider' as const,
        targetIds: [scrap.id],
        ranges: [
          // Translate X
          ...(scrap.animation.translateX
            ? [
                {
                  key: 'translateX',
                  val: `${scrap.animation.translateX[0]}%`,
                  prog: 0,
                },
                {
                  key: 'translateX',
                  val: `${scrap.animation.translateX[1]}%`,
                  prog: 1,
                },
              ]
            : []),
          // Translate Y
          ...(scrap.animation.translateY
            ? [
                {
                  key: 'translateY',
                  val: `${scrap.animation.translateY[0]}%`,
                  prog: 0,
                },
                {
                  key: 'translateY',
                  val: `${scrap.animation.translateY[1]}%`,
                  prog: 1,
                },
              ]
            : []),
          // Rotate
          {
            key: 'rotate',
            val: scrap.animation.rotate[0],
            prog: 0,
          },
          {
            key: 'rotate',
            val: scrap.animation.rotate[1],
            prog: 1,
          },
        ],
      },
    };

    return {
      id: scrap.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background-image: url(${scrap.textureUrl}); background-size: cover; clip-path: ${scrap.clipPath}; backdrop-filter: blur(4px);"></div>`,
        className: 'absolute inset-0',
        style: {
          zIndex: scrap.zIndex,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [scrapEffect],
    } as RenderableComponentData;
  });

  // Shake effect for outgoing video (during last 2 seconds)
  const video1ShakeEffect = {
    id: 'video1-shake',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: transitionStart,
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['video1-container'],
      ranges: [
        { key: 'translateX', val: -5, prog: 0 },
        { key: 'translateX', val: 5, prog: 0.1 },
        { key: 'translateX', val: -3, prog: 0.2 },
        { key: 'translateX', val: 4, prog: 0.3 },
        { key: 'translateX', val: -4, prog: 0.4 },
        { key: 'translateX', val: 3, prog: 0.5 },
        { key: 'translateX', val: -2, prog: 0.6 },
        { key: 'translateX', val: 2, prog: 0.7 },
        { key: 'translateX', val: -1, prog: 0.8 },
        { key: 'translateX', val: 1, prog: 0.9 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: -3, prog: 0 },
        { key: 'translateY', val: 4, prog: 0.1 },
        { key: 'translateY', val: -5, prog: 0.2 },
        { key: 'translateY', val: 3, prog: 0.3 },
        { key: 'translateY', val: -2, prog: 0.4 },
        { key: 'translateY', val: 4, prog: 0.5 },
        { key: 'translateY', val: -3, prog: 0.6 },
        { key: 'translateY', val: 2, prog: 0.7 },
        { key: 'translateY', val: -1, prog: 0.8 },
        { key: 'translateY', val: 1, prog: 0.9 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  };

  // Shake effect for incoming video (during first 2 seconds)
  const video2ShakeEffect = {
    id: 'video2-shake',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['video2-container'],
      ranges: [
        { key: 'translateX', val: 4, prog: 0 },
        { key: 'translateX', val: -5, prog: 0.1 },
        { key: 'translateX', val: 3, prog: 0.2 },
        { key: 'translateX', val: -4, prog: 0.3 },
        { key: 'translateX', val: 5, prog: 0.4 },
        { key: 'translateX', val: -3, prog: 0.5 },
        { key: 'translateX', val: 2, prog: 0.6 },
        { key: 'translateX', val: -2, prog: 0.7 },
        { key: 'translateX', val: 1, prog: 0.8 },
        { key: 'translateX', val: -1, prog: 0.9 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 5, prog: 0 },
        { key: 'translateY', val: -4, prog: 0.1 },
        { key: 'translateY', val: 3, prog: 0.2 },
        { key: 'translateY', val: -5, prog: 0.3 },
        { key: 'translateY', val: 4, prog: 0.4 },
        { key: 'translateY', val: -2, prog: 0.5 },
        { key: 'translateY', val: 3, prog: 0.6 },
        { key: 'translateY', val: -2, prog: 0.7 },
        { key: 'translateY', val: 1, prog: 0.8 },
        { key: 'translateY', val: -1, prog: 0.9 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  };

  // Outgoing video (video1) container
  const video1Container: RenderableComponentData = {
    id: 'video1-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [video1ShakeEffect],
    childrenData: [
      {
        id: 'video1',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          className: 'w-full h-full object-cover',
          fit: 'cover' as const,
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Incoming video (video2) container
  const video2Container: RenderableComponentData = {
    id: 'video2-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [video2ShakeEffect],
    childrenData: [
      {
        id: 'video2',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          className: 'w-full h-full object-cover',
          fit: 'cover' as const,
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Paper scraps container
  const paperScrapsContainer: RenderableComponentData = {
    id: 'paper-scraps-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    childrenData: scrapElements,
  };

  // Optional overlays
  const overlays: RenderableComponentData[] = [];

  if (paperFiberTexture) {
    overlays.push({
      id: 'paper-fiber-overlay',
      type: 'atom' as const,
      componentId: 'ImageAtom',
      data: {
        src: paperFiberTexture,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'overlay',
          opacity: 0.3,
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData);
  }

  if (coffeeStainOverlay) {
    overlays.push({
      id: 'coffee-stain-overlay',
      type: 'atom' as const,
      componentId: 'ImageAtom',
      data: {
        src: coffeeStainOverlay,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'multiply',
          opacity: 0.2,
          zIndex: 11,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'grunge-paper-collage-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      video1Container,
      video2Container,
      paperScrapsContainer,
      ...overlays,
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
  id: 'grunge-paper-collage-transition',
  title: 'Grunge Paper Collage Transition',
  description:
    'A chaotic paper collage transition effect with 6 torn paper scraps that slide, rotate, and peel away from the outgoing video to reveal the next video. Features grunge textures, coffee stain overlays, paper fiber effects, and subtle shake animations for a rough, handmade aesthetic. Each scrap has unique timing and movement patterns with staggered animations over 2 seconds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'grunge',
    'paper',
    'collage',
    'artistic',
    'handmade',
    'texture',
    'chaotic',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    transitionDuration: 2,
    grungeTextures: [
      'https://example.com/grunge1.jpg',
      'https://example.com/grunge2.jpg',
      'https://example.com/grunge3.jpg',
      'https://example.com/grunge4.jpg',
      'https://example.com/grunge5.jpg',
      'https://example.com/grunge6.jpg',
    ],
    paperFiberTexture: 'https://example.com/paper-fiber.png',
    coffeeStainOverlay: 'https://example.com/coffee-stain.png',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const grungePaperCollageTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
