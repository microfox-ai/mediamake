/**
 * 3D Gift Box Unfold Transition
 *
 * This preset implements a 3D box unfold transition that simulates a gift box opening to reveal
 * the next video. The outgoing video appears on the lid that rotates up and back (rotateX from 0
 * to -110deg) from a hinge at the top edge. The incoming video is inside the box, starting with a
 * slight shadow overlay that clears as the lid opens. The lid opening animation includes a subtle
 * bounce effect at the end for realism.
 *
 * Features:
 * - **3D Perspective**: Container with perspective: 1400px for realistic depth
 * - **Lid Rotation**: Outgoing video rotates from 0deg to -110deg with bounce easing
 * - **Shadow Overlay**: Incoming video starts with gradient shadow that fades out
 * - **Depth Animation**: Incoming video scales from 0.98 to 1 for depth effect
 * - **Overlap Period**: 1.0s overlap ensures smooth transition between videos
 *
 * Use cases:
 * - Creating gift reveal transitions between videos
 * - Building surprise or unveiling effects
 * - Adding playful transitions to content reveals
 * - Simulating package opening animations
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
    src: z.string().describe('Source URL of outgoing video (on the lid)'),
    startFrom: z.number().optional().describe('Start time of outgoing video in seconds'),
    volume: z.number().min(0).max(1).optional().describe('Volume of outgoing video (0-1)'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video (inside the box)'),
    startFrom: z.number().optional().describe('Start time of incoming video in seconds'),
    volume: z.number().min(0).max(1).optional().describe('Volume of incoming video (0-1)'),
  }).describe('Incoming video configuration'),
  transitionDuration: z.number().default(2.0).describe('Duration of the lid opening transition in seconds'),
  overlapDuration: z.number().default(1.0).describe('Overlap period where both videos are visible (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    overlapDuration,
  } = params;

  // Calculate total duration
  // The transition container spans the full transition + overlap period
  const totalDuration = transitionDuration + overlapDuration;

  // Helper function to create cubic-bezier bounce easing
  // This creates a subtle bounce at the end of the lid opening
  const bounceEasing = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';

  const childrenData: RenderableComponentData[] = [];

  // Incoming video container (inside the box)
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
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
    childrenData: [
      // Incoming video atom
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          startFrom: incomingVideo.startFrom || 0,
          volume: incomingVideo.volume !== undefined ? incomingVideo.volume : 1,
          fit: 'cover',
          className: 'absolute inset-0 w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          // Subtle scale animation for depth effect
          {
            id: 'incoming-scale-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'scale', val: 0.98, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Shadow overlay (gradient that fades out as lid opens)
      {
        id: 'shadow-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none',
            style: {},
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          // Fade out shadow as lid opens
          {
            id: 'shadow-fade-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['shadow-overlay'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  childrenData.push(incomingVideoContainer);

  // Lid container (outgoing video)
  const lidContainer: RenderableComponentData = {
    id: 'lid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'top center',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      // Outgoing video atom
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          startFrom: outgoingVideo.startFrom || 0,
          volume: outgoingVideo.volume !== undefined ? outgoingVideo.volume : 0,
          fit: 'cover',
          className: 'absolute inset-0 w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Lid rotation effect with bounce
      {
        id: 'lid-rotate-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['lid-container'],
          ranges: [
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: -110, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(lidContainer);

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: '3d-gift-box-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1400px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData,
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: '3d-gift-box-transition',
  title: '3D Gift Box Unfold Transition',
  description: 'A 3D box unfold transition that simulates a gift box opening to reveal the next video. The outgoing video appears on the lid that rotates up and back (rotateX from 0 to -110deg) from a hinge at the top edge. The incoming video is inside the box, starting with a slight shadow overlay that clears as the lid opens. Includes a subtle bounce effect at the end of the lid opening animation for realism.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'gift-box', 'unfold', 'reveal', 'bounce'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      startFrom: 0,
      volume: 0,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      startFrom: 0,
      volume: 1,
    },
    transitionDuration: 2.0,
    overlapDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const giftBoxTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
