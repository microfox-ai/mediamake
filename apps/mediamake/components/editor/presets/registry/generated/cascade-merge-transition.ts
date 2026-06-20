/**
 * Cascade Merge Transition Preset
 *
 * This preset creates a dynamic transition where multiple video windows cascade from the
 * top-left corner with staggered timing and subtle rotations, creating an energetic effect
 * with shake animation. The windows then merge and converge to the center as they scale up
 * and rotate back to normal, with opacity fades transitioning to the final fullscreen video.
 *
 * Features:
 * - **Cascade Effect**: 2-3 video windows appear from top-left with staggered timing (0.2s apart)
 * - **Visual Energy**: Subtle drop shadows, slight rotations (-2° to 3°), and shake effects
 * - **Merge Animation**: Windows simultaneously scale up, converge to center, and rotate to 0°
 * - **Smooth Transition**: Opacity fades during merge phase, with earlier videos fading out
 * - **Flexible Sources**: Supports 2-3 video sources with automatic duration calculation
 *
 * Use cases:
 * - Creating dynamic video transitions with cascading windows
 * - Building energetic multi-source video compositions
 * - Professional video editing with convergence effects
 * - Multi-angle video reveals with staggered timing
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
    src: z.string().describe('Source URL of the first (primary) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second (final) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }),
  video3: z
    .object({
      src: z.string().describe('Source URL of the third video (optional)'),
      duration: z.number().describe('Duration of the third video in seconds'),
    })
    .optional()
    .describe('Optional third video source for 3-window cascade'),
  overlapDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the cascade/merge overlap period in seconds'),
  cascadeStagger: z
    .number()
    .default(0.2)
    .describe('Time delay between each cascading window in seconds'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(30)
    .default(10)
    .describe('Intensity of shake effect during cascade (pixels)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, video3, overlapDuration, cascadeStagger, shakeIntensity } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Cascade overlay starts at video1.duration - overlap
  const cascadeStartTime = video1.duration - overlapDuration;

  // Determine number of cascade windows (2 or 3)
  const cascadeCount = video3 ? 3 : 2;

  // Helper function to create cascade window data
  const createCascadeWindow = (
    index: number,
    videoSrc: string,
    staggerStart: number,
    rotation: string,
  ): RenderableComponentData => {
    const windowId = `cascade-window-${index + 1}`;
    const videoId = `cascade-video-${index + 1}`;
    
    // Calculate positioning offset
    const topOffset = 10 + index * 10;
    const leftOffset = 10 + index * 10;

    // Duration: window lasts from its stagger start until end of overlap
    const windowDuration = overlapDuration - staggerStart;

    return {
      id: windowId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-3/4 h-3/4 shadow-2xl rounded-lg overflow-hidden',
          style: {
            top: `${topOffset}%`,
            left: `${leftOffset}%`,
            transform: `rotate(${rotation})`,
          },
        },
      },
      context: {
        timing: {
          start: staggerStart, // Relative to cascade overlay
          duration: windowDuration,
        },
      },
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: videoSrc,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: windowDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Shake effect during cascade phase (first half)
        {
          id: `shake-${windowId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration / 2,
            mode: 'provider',
            targetIds: [windowId],
            ranges: [
              { key: 'translateX', val: -shakeIntensity / 2, prog: 0 },
              { key: 'translateX', val: shakeIntensity / 2, prog: 0.25 },
              { key: 'translateX', val: -shakeIntensity / 3, prog: 0.5 },
              { key: 'translateX', val: shakeIntensity / 3, prog: 0.75 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
        // Merge phase: scale up, converge to center, rotate to 0°, fade out (second half)
        {
          id: `merge-${windowId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: overlapDuration / 2,
            duration: overlapDuration / 2,
            mode: 'provider',
            targetIds: [windowId],
            ranges: [
              // Scale from 0.75 to 1
              { key: 'scale', val: 0.75, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              // Converge to center (move towards 50%, 50%)
              { key: 'translateX', val: `${(50 - leftOffset) / 2}%`, prog: 0 },
              { key: 'translateX', val: `${50 - leftOffset}%`, prog: 1 },
              { key: 'translateY', val: `${(50 - topOffset) / 2}%`, prog: 0 },
              { key: 'translateY', val: `${50 - topOffset}%`, prog: 1 },
              // Rotate back to 0°
              { key: 'rotate', val: parseFloat(rotation), prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              // Fade out (earlier windows fade faster)
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1 - index * 0.2, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Build cascade windows
  const cascadeWindows: RenderableComponentData[] = [];

  // Window 1 (uses video2 or video1)
  cascadeWindows.push(
    createCascadeWindow(0, video2.src, 0, '3deg'),
  );

  // Window 2 (uses video2)
  cascadeWindows.push(
    createCascadeWindow(1, video2.src, cascadeStagger, '-2deg'),
  );

  // Window 3 (optional, uses video3 or video2)
  if (cascadeCount === 3 && video3) {
    cascadeWindows.push(
      createCascadeWindow(2, video3.src, cascadeStagger * 2, '2deg'),
    );
  }

  const childrenData: RenderableComponentData[] = [
    // First video plays from 0 at full size
    {
      id: 'video1-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      childrenData: [
        {
          id: 'video1-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Fade out during overlap
        {
          id: 'video1-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: cascadeStartTime, // Relative to video1-container
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['video1-container'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Cascade overlay (contains all cascading windows)
    {
      id: 'cascade-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: cascadeStartTime, // Relative to root
          duration: overlapDuration,
        },
      },
      childrenData: cascadeWindows,
    } as RenderableComponentData,

    // Final video takes over after merge
    {
      id: 'final-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: video1.duration, // Start after video1 ends
          duration: video2.duration - overlapDuration,
        },
      },
      childrenData: [
        {
          id: 'final-video-atom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'absolute inset-0',
            startFrom: overlapDuration, // Start video2 from overlap point
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration - overlapDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'cascade-merge-container',
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
  id: 'cascade-merge-transition',
  title: 'Cascade Merge Transition',
  description:
    'A dynamic transition preset where multiple video windows cascade from the top-left corner with staggered timing and subtle rotations, creating an energetic effect with shake animation, then merge and converge to center as they scale up and rotate back to normal, with opacity fades transitioning to the final fullscreen video. Supports 2-3 video sources.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'cascade', 'merge', 'video', 'dynamic', 'multi-source'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    video3: {
      src: 'https://example.com/video3.mp4',
      duration: 5,
    },
    overlapDuration: 1.5,
    cascadeStagger: 0.2,
    shakeIntensity: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cascadeMergeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
