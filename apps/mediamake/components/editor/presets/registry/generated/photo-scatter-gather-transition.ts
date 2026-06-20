/**
 * Photo Scatter and Gather Transition Preset
 *
 * This preset creates a dynamic transition where the outgoing video breaks into a 3x3 grid
 * of polaroid-style photos that scatter outward with rotation and scaling animations. Simultaneously,
 * 9 new polaroid frames containing portions of the incoming video fly in from various screen edges
 * and assemble into the complete image.
 *
 * Features:
 * - **3x3 Grid Split**: Both videos split into 9 polaroid-style sections
 * - **Scatter Animation**: Outgoing photos scatter in different directions with rotation
 * - **Gather Animation**: Incoming photos fly in from edges and assemble
 * - **Handwritten Captions**: Random polaroids display handwritten-style text
 * - **Vintage Filter**: Sepia filter applied to all video sections
 * - **Physics-Inspired**: Staggered timing creates realistic motion feel
 * - **3D Depth**: Uses transform-style: preserve-3d for depth perception
 *
 * Use cases:
 * - Creative video transitions between clips
 * - Memory/photo album style transitions
 * - Nostalgic/vintage video effects
 * - Dynamic multi-clip storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the transition overlap in seconds'),
  captions: z
    .array(z.string())
    .default(['memories', 'summer \'23', '<3', 'xoxo'])
    .describe('Array of caption texts to display on random polaroids'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, captions } = params;

  // Calculate root container duration (overlap reduces total time)
  const rootDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Helper: Generate random scatter position
  const getRandomScatterPosition = (index: number) => {
    const positions = [
      { x: -180, y: -150, rotate: -35 },
      { x: 20, y: -200, rotate: 25 },
      { x: 170, y: -160, rotate: 40 },
      { x: -200, y: 30, rotate: -20 },
      { x: 0, y: 0, rotate: 15 },
      { x: 190, y: -20, rotate: 30 },
      { x: -160, y: 180, rotate: -45 },
      { x: 10, y: 200, rotate: -10 },
      { x: 175, y: 165, rotate: 38 },
    ];
    return positions[index] || { x: 0, y: 0, rotate: 0 };
  };

  // Helper: Generate random gather start position
  const getRandomGatherPosition = (index: number) => {
    const positions = [
      { x: -200, y: -150, rotate: -40 },
      { x: 0, y: -220, rotate: 30 },
      { x: 200, y: -180, rotate: 45 },
      { x: -220, y: 0, rotate: -25 },
      { x: 0, y: 0, rotate: -20 },
      { x: 210, y: 10, rotate: 35 },
      { x: -190, y: 200, rotate: -38 },
      { x: 0, y: 220, rotate: 15 },
      { x: 185, y: 195, rotate: 42 },
    ];
    return positions[index] || { x: 0, y: 0, rotate: 0 };
  };

  // Helper: Get caption for polaroid (only some have captions)
  const getCaptionForIndex = (index: number): string | null => {
    const captionIndices = [0, 2, 4, 8]; // Polaroids with captions
    if (captionIndices.includes(index)) {
      return captions[captionIndices.indexOf(index)] || null;
    }
    return null;
  };

  // Helper: Calculate clip-path for 3x3 grid
  const getClipPath = (index: number) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    
    const topPercent = row * 33.33;
    const leftPercent = col * 33.33;
    const rightPercent = 100 - (col + 1) * 33.33;
    const bottomPercent = 100 - (row + 1) * 33.33;

    return `inset(${topPercent.toFixed(2)}% ${rightPercent.toFixed(2)}% ${bottomPercent.toFixed(2)}% ${leftPercent.toFixed(2)}%)`;
  };

  // Helper: Calculate video offset for clip-path
  const getVideoOffset = (index: number) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    return {
      top: `-${row * 100}%`,
      left: `-${col * 100}%`,
    };
  };

  // Create outgoing polaroids (scatter)
  const outgoingPolaroids: RenderableComponentData[] = [];
  for (let i = 0; i < 9; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const scatterPos = getRandomScatterPosition(i);
    const caption = getCaptionForIndex(i);
    const clipPath = getClipPath(i);
    const videoOffset = getVideoOffset(i);

    const polaroidChildren: RenderableComponentData[] = [
      {
        id: `outgoing-video-${i}`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          fit: 'cover',
          className: 'absolute inset-0',
          style: {
            clipPath,
            filter: 'sepia(30%)',
            width: '300%',
            height: '300%',
            top: videoOffset.top,
            left: videoOffset.left,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
      } as RenderableComponentData,
    ];

    // Add caption if exists
    if (caption) {
      polaroidChildren.push({
        id: `outgoing-caption-${i}`,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: caption,
          className: 'font-handwriting text-xs text-gray-700',
          style: {
            position: 'absolute',
            bottom: '8px',
            left: '50%',
            transform: `translateX(-50%) rotate(${Math.random() * 6 - 3}deg)`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
      } as RenderableComponentData);
    }

    outgoingPolaroids.push({
      id: `outgoing-polaroid-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute p-3 pb-10 bg-white shadow-lg',
          style: {
            width: '33.33%',
            height: '33.33%',
            top: `${row * 33.33}%`,
            left: `${col * 33.33}%`,
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      childrenData: polaroidChildren,
      effects: [
        {
          id: `scatter-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingVideo.duration - transitionDuration + i * 0.08,
            duration: 1.2,
            mode: 'provider',
            targetIds: [`outgoing-polaroid-${i}`],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: scatterPos.x, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: scatterPos.y, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: scatterPos.rotate, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.5, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create incoming polaroids (gather)
  const incomingPolaroids: RenderableComponentData[] = [];
  for (let i = 0; i < 9; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const gatherPos = getRandomGatherPosition(i);
    const clipPath = getClipPath(i);
    const videoOffset = getVideoOffset(i);

    incomingPolaroids.push({
      id: `incoming-polaroid-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute p-3 pb-10 bg-white shadow-lg',
          style: {
            width: '33.33%',
            height: '33.33%',
            top: `${row * 33.33}%`,
            left: `${col * 33.33}%`,
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: `incoming-video-${i}`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            fit: 'cover',
            className: 'absolute inset-0',
            style: {
              clipPath,
              filter: 'sepia(30%)',
              width: '300%',
              height: '300%',
              top: videoOffset.top,
              left: videoOffset.left,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideo.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: `gather-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out-back',
            start: i * 0.05,
            duration: 1.5,
            mode: 'provider',
            targetIds: [`incoming-polaroid-${i}`],
            ranges: [
              { key: 'translateX', val: gatherPos.x, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: gatherPos.y, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'rotate', val: gatherPos.rotate, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'scale', val: 0.4, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'photo-scatter-gather-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: rootDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-polaroids-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
        childrenData: outgoingPolaroids,
      } as RenderableComponentData,
      {
        id: 'incoming-polaroids-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: outgoingVideo.duration - transitionDuration,
            duration: incomingVideo.duration + transitionDuration,
          },
        },
        childrenData: incomingPolaroids,
      } as RenderableComponentData,
    ],
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
  id: 'photo-scatter-gather-transition',
  title: 'Photo Scatter and Gather Transition',
  description:
    'A creative video transition that splits the outgoing video into 9 polaroid-style photos that scatter outward with rotation and scaling animations, while new polaroid frames containing the incoming video fly in from screen edges and assemble into the complete image. Features vintage sepia filter, handwritten captions on select polaroids, and physics-inspired staggered timing for realistic motion.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'polaroid', 'scatter', 'gather', 'vintage', 'creative'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 2.5,
    captions: ['memories', 'summer \'23', '<3', 'xoxo'],
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const photoScatterGatherTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
