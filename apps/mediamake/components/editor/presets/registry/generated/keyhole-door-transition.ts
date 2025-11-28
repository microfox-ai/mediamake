/**
 * Keyhole Door Transition Preset
 *
 * A cinematic zoom-through-keyhole transition effect that creates the illusion of passing
 * through a door. The view zooms into a keyhole shape on the outgoing video with clockwise
 * rotation, passes through 0.3 seconds of complete darkness simulating passage through a door,
 * then emerges from another keyhole revealing the incoming video with counter-clockwise rotation.
 *
 * Features:
 * - **Keyhole Effect**: CSS clip-path animation from full rectangle to small circle and back
 * - **Spiraling Motion**: Outgoing video rotates clockwise while zooming, incoming rotates counter-clockwise
 * - **Darkness Period**: 0.3-second period of complete darkness in the middle to simulate passing through the door
 * - **Smooth Transitions**: 2-second total transition with synchronized timing
 *
 * Technical Details:
 * - Outgoing video: clip-path from full rectangle to 5% circle over 0-1s
 * - Outgoing video: scale from 1 to 3 and rotate from 0deg to 15deg over 0-1s
 * - Darkness period: 0.3s at midpoint (0.85s to 1.15s into transition)
 * - Incoming video: clip-path from 5% circle to full rectangle over 1s-2s
 * - Incoming video: scale from 3 to 1 and rotate from -15deg to 0deg over 1s-2s
 *
 * Use cases:
 * - Creating dramatic transitions between scenes
 * - Portal-like effects for storytelling
 * - Mysterious or suspenseful video transitions
 * - Creative video editing with unique visual effects
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
  transitionDuration: z
    .number()
    .default(2)
    .describe('Total duration of the transition in seconds'),
  darknessDuration: z
    .number()
    .default(0.3)
    .describe('Duration of the darkness period in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, darknessDuration } = params;

  // Calculate timing
  // Total duration = video1.duration + video2.duration - overlap
  // Overlap = transitionDuration - darknessDuration
  const overlap = transitionDuration - darknessDuration;
  const totalDuration = video1.duration + video2.duration - overlap;

  // Transition starts at video1.duration - transitionDuration + darknessDuration/2
  const transitionStart = video1.duration - transitionDuration + darknessDuration / 2;
  
  // Outgoing video timing
  const outgoingStart = 0;
  const outgoingDuration = video1.duration;
  
  // Incoming video timing
  const incomingStart = video1.duration - overlap;
  const incomingDuration = video2.duration + overlap;

  // Effect timings (relative to their respective videos)
  const outgoingEffectStart = transitionStart;
  const outgoingEffectDuration = transitionDuration / 2; // First half of transition (0-1s)
  
  const incomingEffectStart = overlap - (transitionDuration / 2); // Relative to incoming start
  const incomingEffectDuration = transitionDuration / 2; // Second half of transition (1s-2s)

  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          transformOrigin: 'center center',
        },
      },
      context: {
        timing: {
          start: outgoingStart,
          duration: outgoingDuration,
        },
      },
      effects: [
        // Clip-path animation: rectangle to circle
        {
          id: 'outgoing-clip-path',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingEffectStart,
            duration: outgoingEffectDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              {
                key: 'clipPath',
                val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
                prog: 0,
              },
              {
                key: 'clipPath',
                val: 'circle(5% at 50% 50%)',
                prog: 1,
              },
            ],
          },
        },
        // Transform: scale and rotate
        {
          id: 'outgoing-transform',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingEffectStart,
            duration: outgoingEffectDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 3, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 15, prog: 1 },
            ],
          },
        },
        // Fade to darkness at the end
        {
          id: 'outgoing-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingEffectStart + outgoingEffectDuration - 0.1,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          transformOrigin: 'center center',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingDuration,
        },
      },
      effects: [
        // Fade from darkness
        {
          id: 'incoming-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: incomingEffectStart,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Clip-path animation: circle to rectangle
        {
          id: 'incoming-clip-path',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: incomingEffectStart,
            duration: incomingEffectDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              {
                key: 'clipPath',
                val: 'circle(5% at 50% 50%)',
                prog: 0,
              },
              {
                key: 'clipPath',
                val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
                prog: 1,
              },
            ],
          },
        },
        // Transform: scale and rotate (counter-clockwise)
        {
          id: 'incoming-transform',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: incomingEffectStart,
            duration: incomingEffectDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'scale', val: 3, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'rotate', val: -15, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'keyhole-door-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
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
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'keyhole-door-transition',
  title: 'Keyhole Door Transition',
  description:
    'A cinematic zoom-through-keyhole transition effect where the view zooms into a keyhole shape on the outgoing video with clockwise rotation, passes through 0.3 seconds of complete darkness simulating passage through a door, then emerges from another keyhole revealing the incoming video with counter-clockwise rotation. Uses CSS clip-path animations transitioning between full rectangle and small circle, combined with scale and rotation transforms to create a spiraling motion through the doorway.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'keyhole', 'zoom', 'rotation', 'door', 'cinematic'],
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
    darknessDuration: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const keyholeDoorTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
