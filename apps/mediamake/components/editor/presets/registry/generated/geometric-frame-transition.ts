/**
 * Geometric Frame Transition Preset
 *
 * This preset creates a dynamic geometric frame transition where multiple diamond-shaped
 * windows slide in from different corners to reveal the incoming video while the outgoing
 * video fragments into matching geometric pieces that slide out.
 *
 * Features:
 * - **5 Diamond Frames**: Diamond-shaped masked viewports revealing portions of incoming video
 * - **Sequential Staggered Entry**: Frames slide in with 0.1s stagger between each
 * - **Inverse Masking**: Outgoing video is masked by inverse shapes sliding out in opposite directions
 * - **1.5s Overlap Period**: Both videos visible simultaneously through geometric masks
 * - **Subtle Scale Animation**: Frames scale from 0.9 to 1.0 on entry for dynamic feel
 * - **Glowing Borders**: Thin white borders with subtle glow effect on diamond frames
 * - **Corner Positioning**: Frames positioned at corners and center for balanced composition
 *
 * Use cases:
 * - Creating dynamic transitions between video clips
 * - Building geometric reveal effects
 * - Adding modern, stylized video transitions
 * - Creating fragmented video transitions with masking
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
  video1: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      duration: z.number().describe('Duration of the outgoing video in seconds'),
    })
    .describe('Outgoing video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      duration: z.number().describe('Duration of the incoming video in seconds'),
    })
    .describe('Incoming video configuration'),
  overlapDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate total duration
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Timing configuration
  const transitionStartTime = video1.duration - overlapDuration;
  const staggerDelay = 0.1; // 0.1s stagger between frames

  // Diamond frame configuration (5 frames)
  const diamondFrames = [
    {
      id: 'diamond-frame-1',
      position: { top: '-20vw', right: '-20vw' }, // Top-right
      translateFrom: { x: '200%', y: '-200%' },
      delay: 0,
    },
    {
      id: 'diamond-frame-2',
      position: { top: '-20vw', left: '-20vw' }, // Top-left
      translateFrom: { x: '-200%', y: '-200%' },
      delay: staggerDelay,
    },
    {
      id: 'diamond-frame-3',
      position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }, // Center
      translateFrom: { x: '0%', y: '-200%' },
      delay: staggerDelay * 2,
    },
    {
      id: 'diamond-frame-4',
      position: { bottom: '-20vw', right: '-20vw' }, // Bottom-right
      translateFrom: { x: '200%', y: '200%' },
      delay: staggerDelay * 3,
    },
    {
      id: 'diamond-frame-5',
      position: { bottom: '-20vw', left: '-20vw' }, // Bottom-left
      translateFrom: { x: '-200%', y: '200%' },
      delay: staggerDelay * 4,
    },
  ];

  // Create diamond frame components
  const diamondFrameComponents: RenderableComponentData[] = diamondFrames.map(
    (frame) => {
      return {
        id: frame.id,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'absolute rotate-45 border-2 border-white/80 shadow-[0_0_20px_rgba(255,255,255,0.3)]',
            style: {
              width: '40vw',
              height: '40vw',
              ...frame.position,
              zIndex: 30,
              overflow: 'hidden',
            },
          },
        },
        context: {
          timing: {
            start: transitionStartTime,
            duration: overlapDuration + video2.duration,
          },
        },
        effects: [
          // Slide in effect
          {
            id: `${frame.id}-slide-in`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: frame.delay,
              duration: 0.8,
              mode: 'provider',
              targetIds: [frame.id],
              ranges: [
                {
                  key: 'translateX',
                  val: frame.translateFrom.x,
                  prog: 0,
                },
                { key: 'translateX', val: '0%', prog: 1 },
                {
                  key: 'translateY',
                  val: frame.translateFrom.y,
                  prog: 0,
                },
                { key: 'translateY', val: '0%', prog: 1 },
              ],
            },
          },
          // Scale animation (0.9 to 1.0)
          {
            id: `${frame.id}-scale`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: frame.delay,
              duration: 0.8,
              mode: 'provider',
              targetIds: [frame.id],
              ranges: [
                { key: 'scale', val: 0.9, prog: 0 },
                { key: 'scale', val: 1.0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          // Nested video inside diamond frame (counter-rotated)
          {
            id: `${frame.id}-video`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video2.src,
              fit: 'cover',
              className: 'absolute -rotate-45 scale-150',
              style: {
                width: '100vw',
                height: '100vh',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-45deg) scale(1.5)',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: video2.duration,
              },
            },
          },
        ] as RenderableComponentData[],
      } as RenderableComponentData;
    },
  );

  // Outgoing video layer
  const outgoingVideoLayer: RenderableComponentData = {
    id: 'outgoing-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      containerClassName: 'absolute inset-0',
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
    effects: [
      // Fade out during overlap
      {
        id: 'outgoing-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStartTime,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Scale down during overlap
      {
        id: 'outgoing-scale-down',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStartTime,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.9, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'geometric-frame-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideoLayer, ...diamondFrameComponents],
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
  id: 'geometric-frame-transition',
  title: 'Geometric Frame Transition',
  description:
    'Multiple diamond-shaped windows slide in from different corners to reveal the incoming video while the outgoing video fragments into matching geometric pieces that slide out. Features 5 diamond-shaped frames that act as masked viewports, each showing a portion of the new video. Frames slide in sequentially with a 0.1s stagger as the outgoing video is masked by inverse geometric shapes sliding out in opposite directions. Uses a 1.5-second overlap period where both videos are visible through the geometric masks. Includes subtle scale animations (0.9 to 1.0) on frame entry for dynamic feel, with thin white borders and slight glow effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'geometric', 'diamond', 'frames', 'video'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const geometricFrameTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
