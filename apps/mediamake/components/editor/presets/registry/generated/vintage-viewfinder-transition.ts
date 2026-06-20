/**
 * Vintage Viewfinder Transition Preset
 *
 * Simulates looking through an old camera viewfinder with position adjustments between shots.
 * The outgoing video is masked in a circular viewfinder shape that shifts position and shrinks,
 * while the incoming video appears in a second viewfinder circle that starts offset and moves to center.
 * Static viewfinder markings (crosshairs, focus brackets) overlay the entire composition.
 *
 * Features:
 * - Circular viewfinder mask using clip-path
 * - Position shifting (translateX/Y) and scale animations
 * - Dual viewfinder circles for outgoing/incoming videos
 * - Static overlay markings (crosshairs, focus brackets)
 * - Configurable overlap duration and animation timing
 * - Border styling for viewfinder frame
 *
 * Use cases:
 * - Creating vintage camera effects
 * - Simulating multi-camera documentary style
 * - Adding nostalgic film transitions
 * - Building retro video montages
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
    .default(0.9)
    .describe('Duration of the transition overlap in seconds'),
  viewfinderOverlaySrc: z
    .string()
    .optional()
    .describe('Optional source URL for viewfinder overlay image/SVG with crosshairs and focus brackets'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration, viewfinderOverlaySrc } = params;

  // Calculate base layout duration (total duration minus overlap)
  const baseLayoutDuration = video1.duration + video2.duration - overlapDuration;

  // Timing calculations
  const video1Start = 0;
  const video1End = video1.duration;
  const video2Start = video1.duration - overlapDuration;
  const transitionStart = video2Start;

  // Create SVG viewfinder overlay
  const createViewfinderSVG = (): string => {
    return `
      <svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
        <!-- Crosshairs -->
        <line x1="960" y1="490" x2="960" y2="590" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
        <line x1="910" y1="540" x2="1010" y2="540" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
        <circle cx="960" cy="540" r="5" fill="rgba(255,255,255,0.6)"/>
        
        <!-- Focus brackets - top left -->
        <line x1="480" y1="190" x2="480" y2="240" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
        <line x1="480" y1="190" x2="530" y2="190" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
        
        <!-- Focus brackets - top right -->
        <line x1="1440" y1="190" x2="1440" y2="240" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
        <line x1="1440" y1="190" x2="1390" y2="190" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
        
        <!-- Focus brackets - bottom left -->
        <line x1="480" y1="890" x2="480" y2="840" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
        <line x1="480" y1="890" x2="530" y2="890" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
        
        <!-- Focus brackets - bottom right -->
        <line x1="1440" y1="890" x2="1440" y2="840" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
        <line x1="1440" y1="890" x2="1390" y2="890" stroke="rgba(255,255,255,0.5)" stroke-width="3"/>
      </svg>
    `;
  };

  const childrenData: RenderableComponentData[] = [
    // Outgoing video with circular mask
    {
      id: 'outgoing-viewfinder-mask',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 overflow-hidden',
          style: {
            clipPath: 'circle(45% at center)',
          },
        },
      },
      context: {
        timing: {
          start: video1Start,
          duration: video1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-transform-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-viewfinder-mask'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.8, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -30, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -20, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
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

    // Incoming video with circular mask
    {
      id: 'incoming-viewfinder-mask',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 overflow-hidden',
          style: {
            clipPath: 'circle(45% at center)',
          },
        },
      },
      context: {
        timing: {
          start: video2Start,
          duration: video2.duration + overlapDuration,
        },
      },
      effects: [
        {
          id: 'incoming-transform-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-viewfinder-mask'],
            ranges: [
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'translateX', val: 30, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 20, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + overlapDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Static viewfinder overlay
    viewfinderOverlaySrc
      ? ({
          id: 'viewfinder-overlay',
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: viewfinderOverlaySrc,
            className: 'absolute inset-0 pointer-events-none',
            style: {
              objectFit: 'contain',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: baseLayoutDuration,
            },
          },
        } as RenderableComponentData)
      : ({
          id: 'viewfinder-overlay-svg',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: createViewfinderSVG(),
            className: 'absolute inset-0 pointer-events-none',
            style: {
              zIndex: 10,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: baseLayoutDuration,
            },
          },
        } as RenderableComponentData),
  ];

  const rootContainer: RenderableComponentData = {
    id: 'vintage-viewfinder-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-neutral-900',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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
  id: 'vintage-viewfinder-transition',
  title: 'Vintage Viewfinder Transition',
  description:
    'A cinematic transition simulating looking through an old camera viewfinder. The outgoing video is masked in a circular viewfinder shape that shifts position and shrinks while fading out. The incoming video appears in a second viewfinder circle starting offset and scaled down, animating to center position. Static viewfinder markings (crosshairs, focus brackets) overlay the entire composition, remaining fixed while video content shifts behind them.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vintage', 'viewfinder', 'camera', 'circular', 'mask'],
  defaultInputParams: {
    video1: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      duration: 5,
    },
    overlapDuration: 0.9,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vintageViewfinderTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
