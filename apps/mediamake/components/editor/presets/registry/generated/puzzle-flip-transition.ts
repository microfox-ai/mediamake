/**
 * Puzzle Flip Transition Preset
 *
 * Creates a 3D puzzle flip transition where video segments flip like puzzle pieces on a game board.
 * Each piece rotates 180 degrees on its Y-axis, revealing the incoming video on the reverse side.
 * Features a wave pattern where pieces flip in sequence from left to right with smooth 3D rotation,
 * perspective effects, shine sweep, and dynamic scale variation during flip.
 *
 * Features:
 * - **20 Vertical Strips**: Divides the frame into 20 vertical puzzle pieces (5% width each)
 * - **3D Card Flip**: Each strip rotates 180deg on Y-axis with preserve-3d transform style
 * - **Wave Animation**: Pieces flip sequentially from left to right with 40ms stagger
 * - **Dual-Face Structure**: Outgoing video on front face, incoming video on back face (pre-rotated 180deg)
 * - **Shine Effect**: Brightness filter sweep (100% → 130% → 100%) synchronized with rotation
 * - **Scale Variation**: Dynamic scale (1 → 0.95 → 1) during flip for added dynamism
 * - **Perspective**: Container with perspective: 1000px for enhanced 3D depth
 * - **1.6s Overlap**: Smooth transition with 1.6 second overlap between videos
 *
 * Use cases:
 * - Creating puzzle-like transitions between video clips
 * - Building dynamic 3D flip effects for presentations
 * - Adding game-board style transitions to video content
 * - Creating cinematic reveal effects with sequential animations
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
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(1.6)
    .describe('Duration of the transition overlap in seconds (default: 1.6s)'),
  staggerDelay: z
    .number()
    .default(0.04)
    .describe('Delay between each strip flip in seconds (default: 0.04s / 40ms)'),
  flipDuration: z
    .number()
    .default(0.8)
    .describe('Duration of each individual strip flip animation in seconds'),
  stripCount: z
    .number()
    .default(20)
    .describe('Number of vertical strips to create (default: 20)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    overlapDuration,
    staggerDelay,
    flipDuration,
    stripCount,
  } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate strip width percentage
  const stripWidthPercent = 100 / stripCount;

  // Helper function to create a single strip with front and back faces
  const createStrip = (index: number): RenderableComponentData => {
    const stripId = `strip-${index}`;
    const frontId = `strip-${index}-front`;
    const backId = `strip-${index}-back`;
    const video1Id = `video1-strip-${index}`;
    const video2Id = `video2-strip-${index}`;

    // Calculate stagger timing for wave effect (left to right)
    const flipStartTime = index * staggerDelay;

    // Calculate left position for video cropping
    const leftPosition = `-${index * stripWidthPercent}%`;

    // Create the strip container with 3D transform style
    const strip: RenderableComponentData = {
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            width: `${stripWidthPercent}%`,
            height: '100%',
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        // Rotation effect (0deg to 180deg)
        {
          id: `flip-rotate-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: flipStartTime,
            duration: flipDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: 180, prog: 1 },
            ],
          },
        },
        // Scale effect (1 → 0.95 → 1) for dynamism
        {
          id: `flip-scale-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: flipStartTime,
            duration: flipDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.95, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Brightness/shine effect (100% → 130% → 100%)
        {
          id: `flip-shine-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: flipStartTime,
            duration: flipDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'brightness', val: 1, prog: 0 },
              { key: 'brightness', val: 1.3, prog: 0.5 },
              { key: 'brightness', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Front face (outgoing video - video1)
        {
          id: frontId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                backfaceVisibility: 'hidden',
                overflow: 'hidden',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
          childrenData: [
            {
              id: video1Id,
              type: 'atom',
              componentId: 'VideoAtom',
              data: {
                src: video1.src,
                style: {
                  width: `${stripCount * 100}%`, // 2000% for 20 strips
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  left: leftPosition,
                  top: '0',
                },
                fit: 'cover',
                startFrom: 0,
                playbackRate: 1,
              },
              context: {
                timing: {
                  start: 0,
                  duration: video1.duration,
                },
              },
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,
        // Back face (incoming video - video2, pre-rotated 180deg and mirrored)
        {
          id: backId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                overflow: 'hidden',
              },
            },
          },
          context: {
            timing: {
              start: video1.duration - overlapDuration,
              duration: video2.duration + overlapDuration,
            },
          },
          childrenData: [
            {
              id: video2Id,
              type: 'atom',
              componentId: 'VideoAtom',
              data: {
                src: video2.src,
                style: {
                  width: `${stripCount * 100}%`, // 2000% for 20 strips
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  left: leftPosition,
                  top: '0',
                  transform: 'scaleX(-1)', // Mirror horizontally to correct flip
                },
                fit: 'cover',
                startFrom: 0,
                playbackRate: 1,
              },
              context: {
                timing: {
                  start: 0,
                  duration: video2.duration,
                },
              },
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,
      ],
    };

    return strip;
  };

  // Generate all strips
  const strips: RenderableComponentData[] = [];
  for (let i = 0; i < stripCount; i++) {
    strips.push(createStrip(i));
  }

  // Create puzzle container with all strips
  const puzzleContainer: RenderableComponentData = {
    id: 'puzzle-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-row',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: strips,
  };

  // Create root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'puzzle-flip-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [puzzleContainer],
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
  id: 'puzzle-flip-transition',
  title: 'Puzzle Flip Transition',
  description:
    '3D puzzle piece flip transition where video segments rotate like puzzle pieces revealing incoming video on reverse. Features wave pattern left-to-right sequencing, perspective effects, and dynamic shine/scale animations during flip.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'puzzle', 'flip', '3d', 'wave', 'perspective'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 1.6,
    staggerDelay: 0.04,
    flipDuration: 0.8,
    stripCount: 20,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const puzzleFlipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
