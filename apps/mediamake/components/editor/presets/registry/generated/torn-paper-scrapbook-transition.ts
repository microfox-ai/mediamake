/**
 * Torn Paper Scrapbook Transition Preset
 *
 * This preset creates a dynamic torn paper scrapbook transition where the current video
 * appears to be ripped away in jagged pieces to reveal the next video underneath.
 *
 * Features:
 * - **5 Irregular Torn Paper Shapes**: Using clip-path polygons with jagged edges
 * - **Staggered Animation**: Each piece tears away with unique timing offsets (0ms, 200ms, 400ms, 600ms, 800ms)
 * - **Rotation & Scale**: Each piece rotates and scales as it tears away
 * - **Paper Fiber Texture**: CSS filters create depth and texture along torn edges
 * - **2-Second Overlap**: Smooth transition period between videos
 *
 * Use cases:
 * - Creating scrapbook-style video transitions
 * - Building memory/photo album sequences
 * - Adding tactile, physical transitions to digital content
 * - Creating nostalgic or vintage video effects
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
    src: z.string().describe('Source URL of the first video (outgoing)'),
    duration: z.number().describe('Duration of first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second video (incoming)'),
    duration: z.number().describe('Duration of second video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the overlap transition period in seconds'),
  backgroundColor: z
    .string()
    .default('#F5E6D3')
    .optional()
    .describe('Background color for scrapbook effect (warm paper tone)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, backgroundColor } = params;

  // Calculate timing: incoming video starts before outgoing ends (2s overlap)
  const totalDuration = video1.duration + video2.duration - transitionDuration;
  const incomingStart = video1.duration - transitionDuration;

  // Define 5 torn paper clip-path shapes with jagged edges
  const tornPaperShapes = [
    // Torn piece 1: Top section
    'polygon(20% 0%, 40% 0%, 45% 15%, 52% 8%, 60% 0%, 65% 12%, 70% 5%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 10% 8%)',
    // Torn piece 2: Left section
    'polygon(0% 30%, 8% 25%, 15% 35%, 22% 28%, 30% 40%, 25% 45%, 35% 50%, 100% 50%, 100% 100%, 0% 100%)',
    // Torn piece 3: Right section
    'polygon(40% 0%, 45% 8%, 52% 3%, 58% 12%, 65% 6%, 100% 0%, 100% 45%, 92% 50%, 88% 42%, 82% 48%, 75% 40%, 70% 48%, 65% 42%, 40% 42%)',
    // Torn piece 4: Center-top section
    'polygon(0% 0%, 100% 0%, 100% 30%, 95% 35%, 88% 28%, 82% 35%, 75% 30%, 68% 38%, 60% 32%, 52% 38%, 45% 32%, 38% 40%, 30% 35%, 22% 42%, 15% 35%, 8% 40%, 0% 35%)',
    // Torn piece 5: Bottom-center section
    'polygon(50% 50%, 55% 45%, 62% 52%, 68% 48%, 75% 55%, 70% 60%, 78% 65%, 100% 65%, 100% 100%, 0% 100%, 0% 65%, 22% 65%, 30% 60%, 25% 55%, 32% 48%, 38% 52%, 45% 45%)',
  ];

  // Animation delays (staggered: 0ms, 200ms, 400ms, 600ms, 800ms)
  const animationDelays = [0, 0.2, 0.4, 0.6, 0.8];

  // Create torn paper overlay pieces
  const tornPieceComponents: RenderableComponentData[] = tornPaperShapes.map(
    (clipPath, index) => {
      const pieceId = `torn-piece-${index + 1}`;
      const delay = animationDelays[index];

      // Calculate animation timing
      const effectStart = video1.duration - transitionDuration + delay;
      const effectDuration = transitionDuration - delay;

      // Random rotation and scale for variety
      const rotations = [-15, 20, -10, 15, -20];
      const scales = [1.2, 1.3, 1.1, 1.25, 1.15];
      const translateX = [300, -300, 400, -400, 350];
      const translateY = [-200, 200, -300, 300, -250];

      return {
        id: pieceId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div class="torn-overlay"></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            clipPath: clipPath,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            filter:
              'drop-shadow(2px 4px 6px rgba(0,0,0,0.3)) brightness(1.05)',
            mixBlendMode: 'multiply',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
        effects: [
          {
            id: `tear-effect-${index + 1}`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: effectStart,
              duration: effectDuration,
              mode: 'provider',
              targetIds: [pieceId],
              ranges: [
                // Translate out
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: translateX[index], prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: translateY[index], prog: 1 },
                // Rotate
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: rotations[index], prog: 1 },
                // Scale up
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: scales[index], prog: 1 },
                // Fade out
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 0.8 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Outgoing video container with torn pieces
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'torn-paper-outgoing-container',
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
        duration: video1.duration,
      },
    },
    childrenData: [
      // Outgoing video
      {
        id: 'torn-paper-outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          loop: false,
          muted: false,
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
      } as RenderableComponentData,
      // Torn paper pieces
      ...tornPieceComponents,
    ],
  };

  // Incoming video with fade-in
  const incomingVideo: RenderableComponentData = {
    id: 'torn-paper-incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      loop: false,
      muted: false,
    },
    context: {
      timing: {
        start: incomingStart,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration * 0.5,
          mode: 'provider',
          targetIds: ['torn-paper-incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'torn-paper-scrapbook-transition',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backgroundColor: backgroundColor || '#F5E6D3',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [incomingVideo, outgoingVideoContainer],
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
  id: 'torn-paper-scrapbook-transition',
  title: 'Torn Paper Scrapbook Transition',
  description:
    'A scrapbook-style transition where the current video appears to be ripped away in jagged pieces to reveal the next video underneath. Features 5 irregular torn paper shapes using clip-path polygons that animate outward from the center with staggered timing, rotation, and scale effects. Includes paper fiber texture along torn edges using CSS filters for realistic depth.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'scrapbook',
    'torn-paper',
    'vintage',
    'memory',
    'photo-album',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 2,
    backgroundColor: '#F5E6D3',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const tornPaperScrapbookTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
