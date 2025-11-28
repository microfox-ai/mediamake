/**
 * Circular Mask Reveal Transition Preset
 *
 * This preset creates a minimalist geometric transition effect where multiple circles
 * simultaneously expand from random positions across the frame to reveal the incoming video.
 * 
 * Features:
 * - **Multiple Circular Masks**: 5-7 strategically positioned circles expand simultaneously
 * - **Clean Modern Aesthetic**: Minimalist geometric design with smooth animations
 * - **Smooth Cubic-Bezier Easing**: Professional easing for natural expansion
 * - **0.8 Second Overlap**: Precise timing for seamless transitions
 * - **CSS Clip-Path Masking**: Efficient masking using CSS clip-path circles
 * - **Automatic Duration Calculation**: video1.duration + video2.duration - 0.8s overlap
 *
 * Use cases:
 * - Creating modern video transitions with geometric reveals
 * - Building sleek video montages with circular mask effects
 * - Adding professional transitions to marketing videos
 * - Creating dynamic scene changes with multiple reveal points
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video (outgoing)'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video (incoming)'),
  transitionDuration: z.number().default(0.8).describe('Duration of the transition overlap in seconds'),
  numberOfCircles: z.number().min(5).max(7).default(6).describe('Number of circular masks (5-7)'),
  circlePositions: z.array(
    z.object({
      x: z.string().describe('Horizontal position (e.g., "20%", "50%")'),
      y: z.string().describe('Vertical position (e.g., "25%", "60%")'),
    })
  ).optional().describe('Optional custom positions for circles (if not provided, uses default strategic positions)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, numberOfCircles, circlePositions } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate when incoming video starts (video1.duration - overlap)
  const incomingVideoStart = video1.duration - transitionDuration;

  // Define default strategic circle positions for balanced coverage
  const getDefaultCirclePositions = (count: number) => {
    const defaultPositions = [
      { x: '20%', y: '25%' },
      { x: '70%', y: '60%' },
      { x: '50%', y: '80%' },
      { x: '85%', y: '30%' },
      { x: '15%', y: '70%' },
      { x: '45%', y: '40%' },
      { x: '75%', y: '85%' },
    ];
    return defaultPositions.slice(0, count);
  };

  const positions = circlePositions || getDefaultCirclePositions(numberOfCircles);

  // Build circle mask containers with incoming videos
  const circleMaskContainers: RenderableComponentData[] = positions.map((position, index) => {
    const maskId = `circle-mask-${index + 1}`;
    const videoId = `incoming-video-${index + 1}`;

    return {
      id: maskId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 20 + index,
            '--cx': position.x,
            '--cy': position.y,
          } as React.CSSProperties,
        },
      },
      context: {
        timing: {
          start: incomingVideoStart,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            startFrom: 0,
            className: 'absolute inset-0 object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: `circle-expand-${index + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [maskId],
            ranges: [
              { 
                key: 'clipPath', 
                val: 'circle(0% at var(--cx) var(--cy))', 
                prog: 0 
              },
              { 
                key: 'clipPath', 
                val: 'circle(150% at var(--cx) var(--cy))', 
                prog: 1 
              },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Outgoing video (stays static during transition)
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      startFrom: 0,
      className: 'absolute inset-0 object-cover',
      fit: 'cover',
      style: {
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
  };

  // Incoming video that continues after transition (full duration)
  // This ensures video2 plays completely after the masks reveal it
  const fullIncomingVideo: RenderableComponentData = {
    id: 'incoming-video-full',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      startFrom: 0,
      className: 'absolute inset-0 object-cover',
      fit: 'cover',
      style: {
        zIndex: 5, // Below circle masks but above outgoing video during reveal
      },
    },
    context: {
      timing: {
        start: incomingVideoStart,
        duration: video2.duration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'circular-mask-reveal-transition-container',
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
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideo,
      fullIncomingVideo,
      ...circleMaskContainers,
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
  id: 'circular-mask-reveal-transition',
  title: 'Circular Mask Reveal Transition',
  description: 'A minimalist geometric transition preset featuring multiple expanding circles that reveal the incoming video through synchronized circular masks. Uses 5-7 strategically positioned circles with smooth cubic-bezier easing.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'geometric', 'mask', 'circle', 'reveal', 'modern', 'minimalist'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 0.8,
    numberOfCircles: 6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const circularMaskRevealTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
