/**
 * Dimensional Fold Transition Preset
 *
 * This preset creates an origami-style fold transition where four video panels
 * fold into each other in 3D space, revealing a selected video on their reverse side.
 * Each quadrant rotates along its connecting edge with realistic paper-folding physics.
 *
 * Features:
 * - **3D Origami Fold**: Four quadrants fold with preserve-3d transformations
 * - **Closing Book Effect**: Top panels fold down, bottom panels fold up
 * - **Reverse Side Reveal**: Selected video appears as panels fold away
 * - **Realistic Shadows**: Dynamic shadow overlays simulate fold depth
 * - **Staggered Animation**: Sequential fold starts for fluid motion
 * - **Completion Bounce**: Subtle scale bounce on final reveal
 *
 * Use cases:
 * - Dramatic video transitions with 3D depth
 * - Video selection reveals with origami aesthetics
 * - Multi-panel video compositions with fold effects
 * - Creative transitions for video compilations
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
  selectedVideoSrc: z
    .string()
    .describe('Source URL of the video to reveal after folding'),
  topLeftVideoSrc: z
    .string()
    .describe('Source URL for top-left quadrant video'),
  topRightVideoSrc: z
    .string()
    .describe('Source URL for top-right quadrant video'),
  bottomLeftVideoSrc: z
    .string()
    .describe('Source URL for bottom-left quadrant video'),
  bottomRightVideoSrc: z
    .string()
    .describe('Source URL for bottom-right quadrant video'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Total duration of the fold transition in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.2)
    .describe(
      'Delay between each panel fold start in seconds (0 = simultaneous, 0.2 = staggered)',
    ),
  bounceDuration: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Duration of the final scale bounce effect in seconds'),
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe(
      'Maximum opacity of shadow overlays during fold (0 = no shadow, 1 = full black)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    selectedVideoSrc,
    topLeftVideoSrc,
    topRightVideoSrc,
    bottomLeftVideoSrc,
    bottomRightVideoSrc,
    transitionDuration,
    staggerDelay,
    bounceDuration,
    shadowIntensity,
  } = params;

  // Calculate fold panel delays
  const topLeftDelay = 0;
  const topRightDelay = staggerDelay;
  const bottomLeftDelay = staggerDelay * 2;
  const bottomRightDelay = staggerDelay * 3;

  // Calculate when bounce should start (after all panels have folded)
  const bounceStart = transitionDuration - bounceDuration;

  // Selected video (revealed as panels fold away)
  const selectedVideo: RenderableComponentData = {
    id: 'selected-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: selectedVideoSrc,
      fit: 'cover',
      className: 'w-full h-full',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Scale bounce at completion
      {
        id: 'selected-video-bounce',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: bounceStart,
          duration: bounceDuration,
          mode: 'provider',
          targetIds: ['selected-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.02, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Container for selected video (bottom layer, z-index 0)
  const selectedVideoContainer: RenderableComponentData = {
    id: 'selected-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [selectedVideo],
  };

  // Top-left fold panel
  const topLeftPanel: RenderableComponentData = {
    id: 'fold-panel-top-left',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '50%',
          height: '50%',
          top: 0,
          left: 0,
          transformOrigin: 'bottom center',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          zIndex: 10,
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
        id: 'fold-top-left-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: topLeftDelay,
          duration: transitionDuration - topLeftDelay,
          mode: 'provider',
          targetIds: ['fold-panel-top-left'],
          ranges: [
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: -180, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'video-quadrant-top-left',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: topLeftVideoSrc,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      },
      {
        id: 'shadow-overlay-top-left',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,${shadowIntensity}) 100%)`,
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
            id: 'shadow-fade-top-left',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: topLeftDelay,
              duration: transitionDuration - topLeftDelay,
              mode: 'provider',
              targetIds: ['shadow-overlay-top-left'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      },
    ],
  };

  // Top-right fold panel
  const topRightPanel: RenderableComponentData = {
    id: 'fold-panel-top-right',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '50%',
          height: '50%',
          top: 0,
          right: 0,
          transformOrigin: 'bottom center',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          zIndex: 10,
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
        id: 'fold-top-right-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: topRightDelay,
          duration: transitionDuration - topRightDelay,
          mode: 'provider',
          targetIds: ['fold-panel-top-right'],
          ranges: [
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: -180, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'video-quadrant-top-right',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: topRightVideoSrc,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      },
      {
        id: 'shadow-overlay-top-right',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,${shadowIntensity}) 100%)`,
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
            id: 'shadow-fade-top-right',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: topRightDelay,
              duration: transitionDuration - topRightDelay,
              mode: 'provider',
              targetIds: ['shadow-overlay-top-right'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      },
    ],
  };

  // Bottom-left fold panel
  const bottomLeftPanel: RenderableComponentData = {
    id: 'fold-panel-bottom-left',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '50%',
          height: '50%',
          bottom: 0,
          left: 0,
          transformOrigin: 'top center',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          zIndex: 10,
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
        id: 'fold-bottom-left-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: bottomLeftDelay,
          duration: transitionDuration - bottomLeftDelay,
          mode: 'provider',
          targetIds: ['fold-panel-bottom-left'],
          ranges: [
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: 180, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'video-quadrant-bottom-left',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: bottomLeftVideoSrc,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      },
      {
        id: 'shadow-overlay-bottom-left',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,${shadowIntensity}) 100%)`,
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
            id: 'shadow-fade-bottom-left',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: bottomLeftDelay,
              duration: transitionDuration - bottomLeftDelay,
              mode: 'provider',
              targetIds: ['shadow-overlay-bottom-left'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      },
    ],
  };

  // Bottom-right fold panel
  const bottomRightPanel: RenderableComponentData = {
    id: 'fold-panel-bottom-right',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '50%',
          height: '50%',
          bottom: 0,
          right: 0,
          transformOrigin: 'top center',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          zIndex: 10,
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
        id: 'fold-bottom-right-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: bottomRightDelay,
          duration: transitionDuration - bottomRightDelay,
          mode: 'provider',
          targetIds: ['fold-panel-bottom-right'],
          ranges: [
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: 180, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'video-quadrant-bottom-right',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: bottomRightVideoSrc,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      },
      {
        id: 'shadow-overlay-bottom-right',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,${shadowIntensity}) 100%)`,
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
            id: 'shadow-fade-bottom-right',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: bottomRightDelay,
              duration: transitionDuration - bottomRightDelay,
              mode: 'provider',
              targetIds: ['shadow-overlay-bottom-right'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      },
    ],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'dimensional-fold-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '2000px',
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
      selectedVideoContainer,
      topLeftPanel,
      topRightPanel,
      bottomLeftPanel,
      bottomRightPanel,
    ],
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
  id: 'dimensional-fold-transition',
  title: 'Dimensional Fold Transition',
  description:
    'Four video panels fold into each other like origami paper in 3D space, revealing a selected video on their reverse side. Features realistic shadow effects, sequential fold animations, and a final scale bounce for completion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    '3d',
    'origami',
    'fold',
    'paper',
    'reveal',
    'multi-panel',
  ],
  defaultInputParams: {
    selectedVideoSrc: 'https://example.com/selected-video.mp4',
    topLeftVideoSrc: 'https://example.com/top-left-video.mp4',
    topRightVideoSrc: 'https://example.com/top-right-video.mp4',
    bottomLeftVideoSrc: 'https://example.com/bottom-left-video.mp4',
    bottomRightVideoSrc: 'https://example.com/bottom-right-video.mp4',
    transitionDuration: 2,
    staggerDelay: 0.2,
    bounceDuration: 0.2,
    shadowIntensity: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const dimensionalFoldTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
