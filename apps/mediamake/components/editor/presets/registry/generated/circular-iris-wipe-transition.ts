/**
 * Circular Iris Wipe Transition Preset
 *
 * A classic film-style iris wipe transition that uses an expanding circular mask to reveal
 * the incoming video. The mask starts as a small circle in the center and expands outward
 * to fill the entire frame. This preset enhances the basic iris effect with:
 *
 * - Multiple concentric circles that expand at different rates (ripple effect)
 * - Subtle zoom effects on both videos (outgoing zooms in 1→1.05, incoming zooms out 1.1→1)
 * - Counter-rotation on both videos for dynamic parallax movement
 * - Smooth ease-out easing for organic expansion
 *
 * Use cases:
 * - Creating vintage film-style transitions
 * - Building cinematic scene transitions with dramatic reveals
 * - Adding visual interest to video montages
 * - Creating dynamic parallax effects between video clips
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the iris wipe transition in seconds'),
  outgoingZoomScale: z
    .number()
    .default(1.05)
    .describe('Final scale of outgoing video (zoom in effect)'),
  incomingZoomScale: z
    .number()
    .default(1.1)
    .describe('Initial scale of incoming video (zoom out effect)'),
  outgoingRotation: z
    .number()
    .default(-2)
    .describe('Rotation angle of outgoing video in degrees (negative = counter-clockwise)'),
  incomingRotation: z
    .number()
    .default(2)
    .describe('Rotation angle of incoming video in degrees (positive = clockwise)'),
  rippleCircles: z
    .number()
    .default(3)
    .describe('Number of concentric ripple circles'),
  rippleDelayMs: z
    .number()
    .default(100)
    .describe('Delay between each ripple circle in milliseconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    outgoingZoomScale,
    incomingZoomScale,
    outgoingRotation,
    incomingRotation,
    rippleCircles,
    rippleDelayMs,
  } = params;

  // Calculate total duration (videos overlap during transition)
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Build ripple circle components
  const rippleCircleComponents: RenderableComponentData[] = [];
  for (let i = 0; i < rippleCircles; i++) {
    const delay = (i * rippleDelayMs) / 1000; // Convert to seconds
    const rippleStart = delay;
    const rippleDuration = transitionDuration - delay;
    const maxSize = 100 + i * 20; // 100vw, 120vw, 140vw, etc.

    rippleCircleComponents.push({
      id: `ripple-circle-${i + 1}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute pointer-events-none',
          style: {
            zIndex: 3,
            top: '50%',
            left: '50%',
            width: '0',
            height: '0',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            transform: 'translate(-50%, -50%)',
          },
        },
      },
      context: {
        timing: {
          start: rippleStart,
          duration: rippleDuration,
        },
      },
      effects: [
        {
          id: `ripple-${i + 1}-expand`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: rippleDuration,
            mode: 'provider',
            targetIds: [`ripple-circle-${i + 1}`],
            ranges: [
              { key: 'width', val: '0vw', prog: 0 },
              { key: 'width', val: `${maxSize}vw`, prog: 1 },
              { key: 'height', val: '0vw', prog: 0 },
              { key: 'height', val: `${maxSize}vw`, prog: 1 },
              { key: 'opacity', val: 0.2, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData);
  }

  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-zoom-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: outgoingZoomScale, prog: 1 },
            ],
          },
        },
        {
          id: 'outgoing-rotate-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: outgoingRotation, prog: 1 },
            ],
          },
        },
        {
          id: 'outgoing-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
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
        src: incomingVideo.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-zoom-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'scale', val: incomingZoomScale, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'incoming-rotate-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'rotate', val: incomingRotation, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Mask overlay (circular iris wipe)
    {
      id: 'mask-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 2,
            backgroundColor: 'black',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'mask-expansion-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['mask-overlay'],
            ranges: [
              { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
              { key: 'clipPath', val: 'circle(150% at 50% 50%)', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Ripple circles
    ...rippleCircleComponents,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'circular-iris-wipe-container',
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
  id: 'circular-iris-wipe-transition',
  title: 'Circular Iris Wipe Transition',
  description:
    'Classic circular iris wipe transition with expanding concentric ripple circles and parallax zoom effects. The mask starts as a small circle in the center and expands outward to reveal the incoming video. Features multiple concentric circles expanding at different rates (ripple effect), counter-zoom parallax on both videos (outgoing scales 1→1.05, incoming scales 1.1→1), and subtle counter-rotation for dynamic movement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'iris',
    'wipe',
    'circular',
    'mask',
    'ripple',
    'parallax',
    'zoom',
    'rotation',
    'cinematic',
    'vintage',
    'film',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      duration: 5,
    },
    transitionDuration: 1.2,
    outgoingZoomScale: 1.05,
    incomingZoomScale: 1.1,
    outgoingRotation: -2,
    incomingRotation: 2,
    rippleCircles: 3,
    rippleDelayMs: 100,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const circularIrisWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
