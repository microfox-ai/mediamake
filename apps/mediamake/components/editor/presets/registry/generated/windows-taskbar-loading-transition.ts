/**
 * Windows Taskbar Loading Transition Preset
 *
 * This preset creates a Windows-style taskbar loading transition where the outgoing video
 * minimizes to a taskbar button position with 3D perspective transform, a segmented loading
 * bar fills sequentially (like Windows update), and the incoming video slides up from the
 * taskbar like an application opening.
 *
 * Features:
 * - **3D Perspective Transform**: Outgoing video rotates and scales down with perspective(1000px) rotateX(45deg)
 * - **Bottom-Left Positioning**: Video minimizes to bottom-left corner simulating taskbar button
 * - **Segmented Loading Bar**: 5 blue segments that fill sequentially with staggered opacity animations
 * - **Reflection Effect**: Subtle reflection under loading bar with gradient mask for polish
 * - **Slide-Up Entrance**: Incoming video slides up from bottom with fade-in, starting at 50% through overlap
 * - **Smooth Timing**: 0.9s overlap duration with precisely timed segment animations (0.18s intervals)
 *
 * Use cases:
 * - Creating Windows-themed video transitions
 * - Simulating OS-level application loading effects
 * - Adding professional system-style transitions to videos
 * - Building tech/software-themed content with authentic UI transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video that minimizes to taskbar'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video that slides up from taskbar'),
  outgoingVideoDuration: z
    .number()
    .default(5)
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .default(5)
    .describe('Duration of the incoming video in seconds'),
  overlapDuration: z
    .number()
    .default(0.9)
    .describe('Duration of the transition overlap period in seconds'),
  loadingBarColor: z
    .string()
    .default('rgb(59, 130, 246)')
    .describe('Color of the loading bar segments (default: blue-500)'),
  backgroundColor: z
    .string()
    .default('rgb(17, 24, 39)')
    .describe('Background color during transition (default: gray-900)'),
  segmentCount: z
    .number()
    .default(5)
    .describe('Number of loading bar segments (default: 5)'),
  segmentAnimationInterval: z
    .number()
    .default(0.18)
    .describe('Time interval between each segment animation in seconds'),
  perspectiveValue: z
    .number()
    .default(1000)
    .describe('Perspective value for 3D transform (default: 1000px)'),
  rotateXDegrees: z
    .number()
    .default(45)
    .describe('RotateX angle for outgoing video tilt effect (default: 45deg)'),
  minimizedScale: z
    .number()
    .default(0.2)
    .describe('Final scale of minimized video (default: 0.2)'),
  bottomLeftOffsetX: z
    .number()
    .default(-40)
    .describe('Horizontal offset percentage for bottom-left positioning (default: -40)'),
  bottomLeftOffsetY: z
    .number()
    .default(40)
    .describe('Vertical offset percentage for bottom-left positioning (default: 40)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingVideoDuration,
    incomingVideoDuration,
    overlapDuration,
    loadingBarColor,
    backgroundColor,
    segmentCount,
    segmentAnimationInterval,
    perspectiveValue,
    rotateXDegrees,
    minimizedScale,
    bottomLeftOffsetX,
    bottomLeftOffsetY,
  } = params;

  // Calculate container duration
  const containerDuration =
    outgoingVideoDuration + incomingVideoDuration - overlapDuration;

  // Calculate timing for incoming video (starts at 50% through overlap)
  const incomingVideoStart = outgoingVideoDuration - overlapDuration / 2;
  const incomingVideoAnimationDuration = overlapDuration / 2;

  // Calculate loading bar container timing (starts slightly after transition begins)
  const loadingBarStart = 0.2;
  const loadingBarDuration = overlapDuration;

  // Helper function to create loading bar segments
  const createSegments = (isReflection: boolean = false): any[] => {
    const segments: any[] = [];
    for (let i = 0; i < segmentCount; i++) {
      const segmentId = isReflection
        ? `reflection-segment-${i + 1}`
        : `segment-${i + 1}`;
      const effectStart = i * segmentAnimationInterval;

      segments.push({
        id: segmentId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class='w-16 h-2 rounded-sm' style='background-color: ${loadingBarColor};'></div>`,
          className: 'flex-shrink-0',
        },
        context: {
          timing: {
            start: 0,
            duration: loadingBarDuration,
          },
        },
        effects: [
          {
            id: `${segmentId}-fade`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: effectStart,
              duration: segmentAnimationInterval,
              mode: 'provider',
              targetIds: [segmentId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    return segments;
  };

  // Create child components
  const childrenData: RenderableComponentData[] = [
    // Outgoing video with 3D perspective transform
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      effects: [
        {
          id: 'outgoing-perspective-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingVideoDuration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'perspective', val: perspectiveValue, prog: 0 },
              { key: 'perspective', val: perspectiveValue, prog: 1 },
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: rotateXDegrees, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: minimizedScale, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: bottomLeftOffsetX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: bottomLeftOffsetY, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Loading bar container
    {
      id: 'loading-bar-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute flex flex-row gap-2',
          style: {
            bottom: '45%',
            left: '50%',
            transform: 'translateX(-50%)',
          },
        },
      },
      context: {
        timing: {
          start: loadingBarStart,
          duration: loadingBarDuration,
        },
      },
      childrenData: createSegments(false),
    } as RenderableComponentData,

    // Reflection container
    {
      id: 'reflection-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute flex flex-row gap-2',
          style: {
            bottom: '43%',
            left: '50%',
            transform: 'translateX(-50%) scaleY(-1)',
            opacity: 0.3,
            maskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)',
          },
        },
      },
      context: {
        timing: {
          start: loadingBarStart,
          duration: loadingBarDuration,
        },
      },
      childrenData: createSegments(true),
    } as RenderableComponentData,

    // Incoming video with slide-up and fade-in
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: incomingVideoStart,
          duration: incomingVideoDuration - incomingVideoStart,
        },
      },
      effects: [
        {
          id: 'incoming-slide-fade-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: incomingVideoAnimationDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'translateY', val: 100, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'windows-taskbar-loading-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: containerDuration,
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
  id: 'windows-taskbar-loading-transition',
  title: 'Windows Taskbar Loading Transition',
  description:
    'A Windows-style taskbar loading transition where the outgoing video minimizes to a taskbar button position with 3D perspective, a segmented loading bar fills sequentially, and the incoming video slides up from the taskbar like an application opening. Features perspective transform, staggered loading segments, subtle reflection effects, and smooth fade/slide animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'windows',
    'taskbar',
    'loading',
    '3d',
    'perspective',
    'segmented',
    'reflection',
    'slide-up',
    'minimized',
    'system-ui',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    overlapDuration: 0.9,
    loadingBarColor: 'rgb(59, 130, 246)',
    backgroundColor: 'rgb(17, 24, 39)',
    segmentCount: 5,
    segmentAnimationInterval: 0.18,
    perspectiveValue: 1000,
    rotateXDegrees: 45,
    minimizedScale: 0.2,
    bottomLeftOffsetX: -40,
    bottomLeftOffsetY: 40,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const windowsTaskbarLoadingTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
