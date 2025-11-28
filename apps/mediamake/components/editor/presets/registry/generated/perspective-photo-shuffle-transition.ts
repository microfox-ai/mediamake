/**
 * Perspective Photo Shuffle Transition Preset
 *
 * This preset creates a dynamic transition where videos appear as photos being shuffled in a stack.
 * The outgoing video scales up dramatically (1 to 2.5) while rotating slightly and fading out,
 * simulating a photo being pulled toward the viewer and discarded. The incoming video starts
 * small in the background (scale 0.6) and scales to normal size while rotating, creating a
 * deck-shuffle effect.
 *
 * Features:
 * - **3D Perspective Transform**: Uses CSS perspective for depth
 * - **Dramatic Scale Effect**: Outgoing scales from 1 to 2.5, incoming from 0.6 to 1
 * - **Rotation Animation**: Outgoing rotates -5deg, incoming rotates from 8deg to 0deg
 * - **Vertical Translation**: Outgoing moves up (-20%) as it's discarded
 * - **Layered Depth**: Incoming starts at z-index -1, behind the outgoing photo
 * - **Aggressive Easing**: Ease-in for outgoing (acceleration), ease-out for incoming (deceleration)
 * - **0.7-second Overlap**: Fast, dynamic transition timing
 *
 * Use cases:
 * - Creating photo album shuffle effects
 * - Building card-deck style transitions
 * - Adding dynamic motion to video sequences
 * - Creating perspective-based visual storytelling
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
  videos: z
    .array(
      z.object({
        src: z.string().describe('Video source URL'),
        duration: z.number().describe('Video duration in seconds'),
      }),
    )
    .min(2)
    .describe('Array of video objects to transition between (minimum 2)'),
  transitionDuration: z
    .number()
    .default(0.7)
    .describe('Duration of transition overlap in seconds'),
  perspective: z
    .number()
    .default(600)
    .describe('CSS perspective value in pixels (controls 3D depth)'),
  outgoingScale: z
    .number()
    .default(2.5)
    .describe('Maximum scale of outgoing video (default: 2.5)'),
  incomingScale: z
    .number()
    .default(0.6)
    .describe('Starting scale of incoming video (default: 0.6)'),
  outgoingRotation: z
    .number()
    .default(-5)
    .describe('Rotation of outgoing video in degrees (default: -5)'),
  incomingRotation: z
    .number()
    .default(8)
    .describe('Starting rotation of incoming video in degrees (default: 8)'),
  outgoingTranslateY: z
    .number()
    .default(-20)
    .describe('Vertical translation of outgoing video as percentage (default: -20)'),
  fadeOutStart: z
    .number()
    .default(0.6)
    .describe('Progress point when outgoing video starts fading out (0-1, default: 0.6)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videos,
    transitionDuration,
    perspective,
    outgoingScale,
    incomingScale,
    outgoingRotation,
    incomingRotation,
    outgoingTranslateY,
    fadeOutStart,
  } = params;

  // Calculate total duration: sum of all video durations minus overlaps
  const totalDuration =
    videos.reduce((sum, video) => sum + video.duration, 0) -
    (videos.length - 1) * transitionDuration;

  const videoNodes: RenderableComponentData[] = [];
  let currentTime = 0;

  videos.forEach((video, index) => {
    const isFirst = index === 0;
    const isLast = index === videos.length - 1;

    // Calculate timing
    let startTime: number;
    let duration: number;

    if (isFirst) {
      startTime = 0;
      duration = video.duration;
    } else {
      // Overlap with previous video
      startTime = currentTime - transitionDuration;
      duration = video.duration + transitionDuration;
    }

    const videoId = `video-${index}`;

    // Build effects array
    const effects: any[] = [];

    // Outgoing transition effect (not for last video)
    if (!isLast) {
      effects.push({
        id: `outgoing-transition-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: video.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [videoId],
          ranges: [
            // Scale up dramatically
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: outgoingScale, prog: 1 },
            // Rotate slightly
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: outgoingRotation, prog: 1 },
            // Translate upward
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: `${outgoingTranslateY}%`, prog: 1 },
            // Fade out in last 40% of transition
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1, prog: fadeOutStart },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    }

    // Incoming transition effect (not for first video)
    if (!isFirst) {
      effects.push({
        id: `incoming-transition-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [videoId],
          ranges: [
            // Scale up from small to normal
            { key: 'scale', val: incomingScale, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Rotate from tilted to straight
            { key: 'rotateZ', val: incomingRotation, prog: 0 },
            { key: 'rotateZ', val: 0, prog: 1 },
            // Z-index to appear behind initially
            { key: 'zIndex', val: -1, prog: 0 },
            { key: 'zIndex', val: 0, prog: 1 },
          ],
        },
      });
    }

    // Create video node
    videoNodes.push({
      id: videoId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: startTime,
          duration: duration,
        },
      },
      effects,
    } as RenderableComponentData);

    currentTime += video.duration;
  });

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'perspective-photo-shuffle-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: `${perspective}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: videoNodes,
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
  id: 'perspective-photo-shuffle-transition',
  title: 'Perspective Photo Shuffle Transition',
  description:
    'A dynamic transition preset where videos appear as photos being shuffled in a stack. Outgoing videos scale up dramatically (1 to 2.5) while rotating and fading out, simulating a photo being pulled toward the viewer and discarded. Incoming videos start small in the background (scale 0.6) and scale to normal size while rotating, creating a deck-shuffle effect. Uses 0.7-second overlap with aggressive easing for dynamic motion and 3D perspective transforms.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'perspective', 'photo', 'shuffle', '3d', 'scale', 'rotation'],
  defaultInputParams: {
    videos: [
      {
        src: 'https://example.com/video1.mp4',
        duration: 5,
      },
      {
        src: 'https://example.com/video2.mp4',
        duration: 5,
      },
      {
        src: 'https://example.com/video3.mp4',
        duration: 5,
      },
    ],
    transitionDuration: 0.7,
    perspective: 600,
    outgoingScale: 2.5,
    incomingScale: 0.6,
    outgoingRotation: -5,
    incomingRotation: 8,
    outgoingTranslateY: -20,
    fadeOutStart: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const perspectivePhotoShuffleTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
