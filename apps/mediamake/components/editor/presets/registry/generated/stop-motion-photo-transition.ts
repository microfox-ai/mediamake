/**
 * Stop Motion Photo Transition Preset
 *
 * This preset creates a stop motion style photo transition effect that simulates physical photos
 * being slightly repositioned on a table between shots. The outgoing video appears to "freeze" into
 * a photo that shifts position (translateX: -20px, translateY: 10px, rotate: -2deg) while fading out,
 * as the incoming video fades in from a complementary shifted position (translateX: 20px, 
 * translateY: -10px, rotate: 2deg).
 *
 * Features:
 * - Subtle position shifts (2-3% movement) with micro-rotations
 * - 0.8s overlap period for smooth transition
 * - Intensifying drop shadow during transition to emphasize photo-like quality
 * - Manual photo adjustment aesthetic
 *
 * Use cases:
 * - Creating vintage photo slideshow effects
 * - Simulating analog photo manipulation
 * - Adding tactile, handcrafted feel to video transitions
 * - Building stop-motion style video sequences
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
    src: z.string().describe('Source URL of the first video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration'),
  overlapDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate total duration with overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Define IDs for targeting
  const outgoingVideoId = 'stop-motion-outgoing-video';
  const incomingVideoId = 'stop-motion-incoming-video';

  // Outgoing video: starts at 0, full duration
  const outgoingVideo: RenderableComponentData = {
    id: outgoingVideoId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // Opacity fade effect during overlap
      {
        id: 'outgoing-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1.duration - overlapDuration, // Relative to outgoing video
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [outgoingVideoId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 1 },
          ],
        },
      },
      // Transform effect: shift left, down, rotate counterclockwise
      {
        id: 'outgoing-transform-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [outgoingVideoId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -20, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 10, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: -2, prog: 1 },
          ],
        },
      },
      // Drop shadow effect intensifying
      {
        id: 'outgoing-shadow-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [outgoingVideoId],
          ranges: [
            {
              key: 'filter',
              val: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))',
              prog: 0,
            },
            {
              key: 'filter',
              val: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Incoming video: starts at overlap point (video1.duration - overlapDuration)
  const incomingVideo: RenderableComponentData = {
    id: incomingVideoId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 object-cover',
    },
    context: {
      timing: {
        start: video1.duration - overlapDuration, // Overlap starts before video1 ends
        duration: video2.duration,
      },
    },
    effects: [
      // Opacity fade in effect
      {
        id: 'incoming-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0, // Relative to incoming video start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [incomingVideoId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Transform effect: start shifted right, up, rotated clockwise, return to neutral
      {
        id: 'incoming-transform-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [incomingVideoId],
          ranges: [
            { key: 'translateX', val: 20, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: -10, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'rotate', val: 2, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
      // Drop shadow effect starting intense, fading to subtle
      {
        id: 'incoming-shadow-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [incomingVideoId],
          ranges: [
            {
              key: 'filter',
              val: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))',
              prog: 0,
            },
            {
              key: 'filter',
              val: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  const rootContainer: RenderableComponentData = {
    id: 'stop-motion-transition-root',
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
    childrenData: [outgoingVideo, incomingVideo],
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
  id: 'stop-motion-photo-transition',
  title: 'Stop Motion Photo Transition',
  description:
    'A stop motion style photo transition preset that simulates physical photos being repositioned on a table. Features subtle position shifts (translateX/Y) and micro-rotations during a 0.8s overlap period where the outgoing video "freezes" into a photo that shifts while fading out, as the incoming video fades in from a complementary shifted position. Includes intensifying drop shadows to emphasize the photo-like quality.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'stop-motion', 'photo', 'vintage', 'analog'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const stopMotionPhotoTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
