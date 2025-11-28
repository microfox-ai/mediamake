/**
 * Multi-Window Focus Pull Spiral Transition
 *
 * A dynamic transition preset featuring rectangular frames of varying aspect ratios 
 * that zoom in from the center while rotating, creating a spiraling tunnel effect. 
 * The outgoing video recedes through the center frame while peripheral frames spin 
 * in carrying previews of the incoming video. Includes motion blur and a pulsing 
 * vignette effect during the transition peak.
 *
 * Features:
 * - Multiple frames with different aspect ratios (16:9, 4:3, 1:1, 9:16)
 * - Spiraling zoom and rotation effects
 * - 2-second overlap transition period
 * - Motion blur on rotating frames
 * - Pulsing vignette during transition peak
 * - Radial gradient background
 *
 * Use cases:
 * - Creating dynamic video transitions with multiple preview windows
 * - Building cinematic focus pull effects
 * - Adding visual interest to video montages
 * - Implementing modern, multi-frame video transitions
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
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  overlapDuration: z
    .number()
    .default(2)
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

  // Transition timing
  const transitionStart = video1.duration - overlapDuration;
  const transitionDuration = overlapDuration;

  // Create vignette overlay
  const vignetteOverlay: RenderableComponentData = {
    id: 'multi-window-vignette-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'radial-gradient(circle, transparent 0%, transparent 40%, rgba(0, 0, 0, 0.5) 100%)',
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
      {
        id: 'vignette-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['multi-window-vignette-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create outgoing video
  const outgoingVideo: RenderableComponentData = {
    id: 'multi-window-outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-fade-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['multi-window-outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.8, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create center frame (16:9 aspect ratio)
  const centerFrame: RenderableComponentData = {
    id: 'multi-window-frame-center',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute overflow-hidden',
        style: {
          top: '50%',
          left: '50%',
          width: '50%',
          aspectRatio: '16/9',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
          transformOrigin: 'center',
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + overlapDuration,
      },
    },
    effects: [
      {
        id: 'center-frame-zoom-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['multi-window-frame-center'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'scale', val: 0.1, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'rotate', val: 720, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'translateX', val: '-50%', prog: 0 },
            { key: 'translateX', val: '-50%', prog: 1 },
            { key: 'translateY', val: '-50%', prog: 0 },
            { key: 'translateY', val: '-50%', prog: 1 },
            { key: 'filter', val: 'blur(20px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'multi-window-incoming-video-center',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Create top-left frame (4:3 aspect ratio)
  const topLeftFrame: RenderableComponentData = {
    id: 'multi-window-frame-top-left',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute overflow-hidden',
        style: {
          top: '10%',
          left: '10%',
          width: '25%',
          aspectRatio: '4/3',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
          transformOrigin: 'center',
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + overlapDuration,
      },
    },
    effects: [
      {
        id: 'top-left-frame-zoom-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0.2,
          duration: 1.6,
          mode: 'provider',
          targetIds: ['multi-window-frame-top-left'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'scale', val: 0.1, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'rotate', val: -360, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'filter', val: 'blur(20px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'multi-window-incoming-video-top-left',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Create top-right frame (1:1 aspect ratio)
  const topRightFrame: RenderableComponentData = {
    id: 'multi-window-frame-top-right',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute overflow-hidden',
        style: {
          top: '15%',
          right: '8%',
          width: '28%',
          aspectRatio: '1/1',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
          transformOrigin: 'center',
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + overlapDuration,
      },
    },
    effects: [
      {
        id: 'top-right-frame-zoom-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0.3,
          duration: 1.7,
          mode: 'provider',
          targetIds: ['multi-window-frame-top-right'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'scale', val: 0.1, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'rotate', val: -360, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'filter', val: 'blur(20px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'multi-window-incoming-video-top-right',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Create bottom-right frame (9:16 aspect ratio)
  const bottomRightFrame: RenderableComponentData = {
    id: 'multi-window-frame-bottom-right',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute overflow-hidden',
        style: {
          bottom: '12%',
          right: '12%',
          width: '20%',
          aspectRatio: '9/16',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
          transformOrigin: 'center',
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + overlapDuration,
      },
    },
    effects: [
      {
        id: 'bottom-right-frame-zoom-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0.4,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['multi-window-frame-bottom-right'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'scale', val: 0.1, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'rotate', val: -360, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'filter', val: 'blur(20px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'multi-window-incoming-video-bottom-right',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Assemble all children
  const childrenData: RenderableComponentData[] = [
    vignetteOverlay,
    outgoingVideo,
    centerFrame,
    topLeftFrame,
    topRightFrame,
    bottomRightFrame,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'multi-window-spiral-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          background:
            'radial-gradient(circle, rgb(31, 41, 55) 0%, rgb(0, 0, 0) 100%)',
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
  id: 'multi-window-spiral-transition',
  title: 'Multi-Window Focus Pull Spiral Transition',
  description:
    'A dynamic transition preset featuring rectangular frames of varying aspect ratios that zoom in from the center while rotating, creating a spiraling tunnel effect. The outgoing video recedes through the center frame while peripheral frames spin in carrying previews of the incoming video. Includes motion blur and a pulsing vignette effect during the transition peak.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'multi-window',
    'spiral',
    'focus-pull',
    'rotation',
    'zoom',
    'vignette',
    'blur',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const multiWindowSpiralTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
