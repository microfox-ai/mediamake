/**
 * Spiral Zoom Transition Preset
 *
 * This preset creates a 3D spiral zoom transition where four video quadrants rotate 360 degrees
 * around a central axis while the selected panel spirals forward to fill the screen.
 *
 * Features:
 * - **3D Rotation**: Full 360-degree rotation of all quadrants around center
 * - **Spiral Motion**: Selected panel spirals forward along Z-axis while others recede
 * - **Motion Trails**: Duplicate panels with reduced opacity and time offset create tunnel effect
 * - **Dynamic Scaling**: Non-selected panels shrink and fade during transition
 * - **Perspective Depth**: 3D perspective transforms create falling-through-tunnel sensation
 *
 * Technical Details:
 * - Root container with perspective: 1000px for 3D depth
 * - Container div with transform-style: preserve-3d for 3D space
 * - Combined transforms: rotateZ (0 to 360deg), translateZ (-500px to 200px), scale adjustments
 * - Motion trails at 0.3 opacity with 50ms time offset
 * - Total duration: 2.5s with ease-in-out easing
 *
 * Use cases:
 * - Creating dramatic video transitions with 3D effects
 * - Building tunnel-like zoom transitions
 * - Adding motion trail effects to video compositions
 * - Creating dynamic multi-panel video presentations
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
    src: z.string().describe('Source URL of video 1 (top-left quadrant)'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of video 2 (top-right quadrant)'),
  }),
  video3: z.object({
    src: z.string().describe('Source URL of video 3 (bottom-left quadrant)'),
  }),
  video4: z.object({
    src: z.string().describe('Source URL of video 4 (bottom-right quadrant)'),
  }),
  selectedPanel: z
    .enum(['1', '2', '3', '4'])
    .default('1')
    .describe('Which panel spirals forward to fill screen (1-4)'),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Total duration of spiral zoom transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, video3, video4, selectedPanel, transitionDuration } =
    params;

  const videos = [
    { id: 'video-1', src: video1.src, position: { top: '0', left: '0' } },
    { id: 'video-2', src: video2.src, position: { top: '0', right: '0' } },
    { id: 'video-3', src: video3.src, position: { bottom: '0', left: '0' } },
    { id: 'video-4', src: video4.src, position: { bottom: '0', right: '0' } },
  ];

  const selectedIndex = parseInt(selectedPanel, 10) - 1;

  // Create motion trail layers (2 trail layers per video)
  const motionTrail1Children: RenderableComponentData[] = videos.map(
    (video, index) => {
      const isSelected = index === selectedIndex;
      const videoId = `motion-trail-1-${video.id}`;

      return {
        id: videoId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          className: 'absolute',
          style: {
            width: '50%',
            height: '50%',
            ...video.position,
            opacity: 0.3,
            transformOrigin: '50vw 50vh',
          },
          fit: 'cover',
          loop: true,
          muted: true,
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `trail-1-transform-${video.id}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0.025, // 25ms delay (50ms * 0.5)
              duration: transitionDuration - 0.025,
              mode: 'provider',
              targetIds: [videoId],
              ranges: isSelected
                ? [
                    // Selected panel: spiral forward with scale
                    { key: 'translateZ', val: 0, prog: 0 },
                    { key: 'translateZ', val: 200, prog: 1 },
                    { key: 'scale', val: 1, prog: 0 },
                    { key: 'scale', val: 2, prog: 1 },
                  ]
                : [
                    // Non-selected: recede and shrink
                    { key: 'translateZ', val: 0, prog: 0 },
                    { key: 'translateZ', val: -500, prog: 1 },
                    { key: 'scale', val: 1, prog: 0 },
                    { key: 'scale', val: 0.3, prog: 1 },
                    { key: 'opacity', val: 0.3, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  const motionTrail2Children: RenderableComponentData[] = videos.map(
    (video, index) => {
      const isSelected = index === selectedIndex;
      const videoId = `motion-trail-2-${video.id}`;

      return {
        id: videoId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          className: 'absolute',
          style: {
            width: '50%',
            height: '50%',
            ...video.position,
            opacity: 0.3,
            transformOrigin: '50vw 50vh',
          },
          fit: 'cover',
          loop: true,
          muted: true,
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `trail-2-transform-${video.id}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0.05, // 50ms delay
              duration: transitionDuration - 0.05,
              mode: 'provider',
              targetIds: [videoId],
              ranges: isSelected
                ? [
                    // Selected panel: spiral forward with scale
                    { key: 'translateZ', val: 0, prog: 0 },
                    { key: 'translateZ', val: 200, prog: 1 },
                    { key: 'scale', val: 1, prog: 0 },
                    { key: 'scale', val: 2, prog: 1 },
                  ]
                : [
                    // Non-selected: recede and shrink
                    { key: 'translateZ', val: 0, prog: 0 },
                    { key: 'translateZ', val: -500, prog: 1 },
                    { key: 'scale', val: 1, prog: 0 },
                    { key: 'scale', val: 0.3, prog: 1 },
                    { key: 'opacity', val: 0.3, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create main video panels
  const mainVideoChildren: RenderableComponentData[] = videos.map(
    (video, index) => {
      const isSelected = index === selectedIndex;
      const videoId = `main-${video.id}`;

      return {
        id: videoId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          className: 'absolute',
          style: {
            width: '50%',
            height: '50%',
            ...video.position,
            transformOrigin: '50vw 50vh',
          },
          fit: 'cover',
          loop: true,
          muted: index !== selectedIndex, // Unmute selected panel
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `main-transform-${video.id}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [videoId],
              ranges: isSelected
                ? [
                    // Selected panel: spiral forward to fill screen
                    { key: 'translateZ', val: 0, prog: 0 },
                    { key: 'translateZ', val: 200, prog: 1 },
                    { key: 'scale', val: 1, prog: 0 },
                    { key: 'scale', val: 2, prog: 1 },
                    { key: 'opacity', val: 1, prog: 0 },
                    { key: 'opacity', val: 1, prog: 1 },
                  ]
                : [
                    // Non-selected: recede, shrink, and fade
                    { key: 'translateZ', val: 0, prog: 0 },
                    { key: 'translateZ', val: -500, prog: 1 },
                    { key: 'scale', val: 1, prog: 0 },
                    { key: 'scale', val: 0.3, prog: 1 },
                    { key: 'opacity', val: 1, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // 3D transform container with 360-degree rotation
  const transformContainerId = 'spiral-3d-transform-container';
  const transformContainer: RenderableComponentData = {
    id: transformContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center',
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
      ...motionTrail1Children,
      ...motionTrail2Children,
      ...mainVideoChildren,
    ],
    effects: [
      {
        id: 'container-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [transformContainerId],
          ranges: [
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: 360, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'spiral-zoom-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [transformContainer],
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
  id: 'spiral-zoom-transition',
  title: 'Spiral Zoom Transition',
  description:
    'A 3D spiral zoom transition where four video quadrants rotate 360 degrees around a central axis while the selected panel spirals forward along a tunnel-like path to fill the screen. Features motion trail effects with duplicated panels at reduced opacity and time-delayed positions, creating a falling-through-a-tunnel sensation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    '3d',
    'spiral',
    'zoom',
    'quadrants',
    'motion-trails',
    'tunnel',
    'rotation',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
    },
    video2: {
      src: 'https://example.com/video2.mp4',
    },
    video3: {
      src: 'https://example.com/video3.mp4',
    },
    video4: {
      src: 'https://example.com/video4.mp4',
    },
    selectedPanel: '1',
    transitionDuration: 2.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const spiralZoomTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
