/**
 * Spiral Vortex Displacement Transition
 *
 * A dynamic transition effect where videos appear to be sucked into and expelled from a central whirlpool.
 * The outgoing video rotates clockwise while scaling down with increasing blur (simulating being pulled into a vortex),
 * and the incoming video emerges from the center, rotating counter-clockwise while scaling up from 0 to full size.
 * Includes radial gradient overlays to enhance the vortex effect.
 *
 * Features:
 * - **Outgoing Video**: Rotates clockwise (0deg to 720deg) with ease-in-cubic, scales down (1 to 0), 
 *   applies blur (0px to 20px), and fades out (opacity 1 to 0) over the final 0.5s
 * - **Incoming Video**: Emerges from center with counter-clockwise rotation (-720deg to 0deg) using ease-out-cubic,
 *   scales up (0 to 1), and fades in (opacity 0 to 1) over the first 0.5s
 * - **Radial Gradient Overlay**: Enhances the vortex visualization with a dark gradient from center to edges
 * - **Configurable Duration**: 1.8-second transition overlap
 *
 * Use cases:
 * - Creating dramatic whirlpool-style video transitions
 * - Building spiral/vortex motion graphics
 * - Adding cinematic swirl effects between clips
 * - Creating hypnotic rotation-based transitions
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
  }).describe('First (outgoing) video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second (incoming) video configuration'),
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total composition duration (sum of videos minus overlap)
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Outgoing video starts at 0, lasts for its full duration
  const outgoingStart = 0;
  const outgoingDuration = video1.duration;

  // Incoming video starts before outgoing ends (overlap)
  const incomingStart = video1.duration - transitionDuration;
  const incomingDuration = video2.duration;

  // Transition effect timing (relative to each video's timeline)
  const outgoingTransitionStart = video1.duration - transitionDuration; // Last 1.8s of video1
  const incomingTransitionStart = 0; // First 1.8s of video2 (relative to incoming start)

  // Fade timing
  const fadeOutStart = video1.duration - 0.5; // Last 0.5s of video1
  const fadeInDuration = 0.5; // First 0.5s of video2

  const childrenData: RenderableComponentData[] = [
    // Outgoing video (rotates clockwise, scales down, blurs, fades out)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 object-cover',
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
        // Transform: rotate + scale (ease-in-cubic)
        {
          id: 'outgoing-transform',
          componentId: 'generic',
          data: {
            type: 'ease-in-cubic',
            start: outgoingTransitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              // Rotate clockwise 0deg to 720deg
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 720, prog: 1 },
              // Scale down 1 to 0
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0, prog: 1 },
            ],
          },
        },
        // Blur effect (0px to 20px)
        {
          id: 'outgoing-blur',
          componentId: 'generic',
          data: {
            type: 'ease-in-cubic',
            start: outgoingTransitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(20px)', prog: 1 },
            ],
          },
        },
        // Fade out (opacity 1 to 0) over final 0.5s
        {
          id: 'outgoing-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-cubic',
            start: fadeOutStart,
            duration: fadeInDuration,
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

    // Incoming video (rotates counter-clockwise, scales up, fades in)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 object-cover',
        style: {
          transformOrigin: 'center center',
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingDuration,
        },
      },
      effects: [
        // Transform: rotate + scale (ease-out-cubic)
        {
          id: 'incoming-transform',
          componentId: 'generic',
          data: {
            type: 'ease-out-cubic',
            start: incomingTransitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              // Rotate counter-clockwise -720deg to 0deg
              { key: 'rotate', val: -720, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              // Scale up 0 to 1
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Fade in (opacity 0 to 1) over first 0.5s
        {
          id: 'incoming-fade',
          componentId: 'generic',
          data: {
            type: 'ease-out-cubic',
            start: incomingTransitionStart,
            duration: fadeInDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Vortex overlay (radial gradient for vortex visualization)
    {
      id: 'vortex-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%;"></div>',
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'radial-gradient(circle at center, transparent 0%, transparent 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.7) 100%)',
          mixBlendMode: 'multiply',
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'spiral-vortex-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
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
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'spiral-vortex-transition',
  title: 'Spiral Vortex Displacement Transition',
  description:
    'A dynamic transition effect where videos appear to be sucked into and expelled from a central whirlpool. The outgoing video rotates clockwise while scaling down with increasing blur, and the incoming video emerges from the center rotating counter-clockwise while scaling up. Includes radial gradient overlays for enhanced vortex visualization.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vortex', 'spiral', 'rotation', 'whirlpool', 'displacement'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const spiralVortexTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
