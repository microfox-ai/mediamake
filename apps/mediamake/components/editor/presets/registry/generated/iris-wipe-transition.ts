/**
 * Iris Wipe Transition Preset
 *
 * Creates a minimalist circular iris wipe transition between multiple video clips.
 * The incoming video is revealed through a growing circle that starts as a small point
 * in the center and expands to fill the entire frame, creating a camera aperture-like effect.
 *
 * Features:
 * - **Circular Reveal Animation**: Smooth iris wipe using CSS clip-path
 * - **Multiple Video Support**: Seamlessly transitions between 3-5 video clips
 * - **Camera Aperture Effect**: Mimics a camera lens opening/closing
 * - **Optional White Border**: Thin border around the expanding circle for visual clarity
 * - **Smooth Easing**: Custom cubic-bezier curve for organic motion
 * - **Configurable Timing**: Adjustable transition duration and overlap
 *
 * Use cases:
 * - Creating cinematic transitions between video clips
 * - Building professional video montages with classic film-style transitions
 * - Adding vintage camera-inspired effects to modern content
 * - Sequencing multiple video clips with consistent visual style
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
  videos: z
    .array(
      z.object({
        src: z.string().describe('Video source URL'),
        startFrom: z.number().optional().describe('Start time in video (seconds)'),
        endAt: z.number().optional().describe('End time in video (seconds)'),
        duration: z.number().describe('Duration of video clip (seconds)'),
        playbackRate: z.number().optional().default(1).describe('Playback speed multiplier'),
        muted: z.boolean().optional().default(false).describe('Mute video audio'),
        volume: z.number().optional().default(1).describe('Video volume (0-1)'),
      })
    )
    .min(2)
    .max(5)
    .describe('Array of 2-5 video clips to transition between'),
  transitionDuration: z
    .number()
    .default(0.7)
    .describe('Duration of iris transition in seconds'),
  showBorder: z
    .boolean()
    .default(true)
    .describe('Show optional white border around expanding circle'),
  borderOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Border opacity (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { videos, transitionDuration, showBorder, borderOpacity } = params;

  // Calculate total duration with overlaps
  const totalDuration = videos.reduce((sum, video, index) => {
    if (index === 0) return video.duration;
    return sum + video.duration - transitionDuration;
  }, 0);

  // Helper: Create iris wipe effect
  const createIrisEffect = (
    targetId: string,
    startTime: number,
  ) => {
    return {
      id: `iris-wipe-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
          { key: 'clipPath', val: 'circle(75% at 50% 50%)', prog: 1 },
        ],
      },
    };
  };

  // Helper: Create border effect (optional)
  const createBorderEffect = (
    targetId: string,
    startTime: number,
  ) => {
    if (!showBorder) return null;

    return {
      id: `iris-border-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
          { key: 'clipPath', val: 'circle(75% at 50% 50%)', prog: 1 },
        ],
      },
    };
  };

  // Build video layers and border layers
  const childrenData: RenderableComponentData[] = [];
  let currentTime = 0;

  videos.forEach((video, index) => {
    const isFirst = index === 0;
    const videoId = `iris-video-${index}`;
    const borderId = `iris-border-${index}`;

    // Calculate timing
    const startTime = isFirst ? 0 : currentTime - transitionDuration;
    const duration = isFirst ? video.duration : video.duration + transitionDuration;
    const zIndex = isFirst ? 0 : 10;

    // Video layer
    const videoLayer: RenderableComponentData = {
      id: videoId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video.src,
        startFrom: video.startFrom,
        endAt: video.endAt,
        playbackRate: video.playbackRate || 1,
        muted: video.muted || false,
        volume: video.volume || 1,
        className: 'absolute inset-0 object-cover',
        fit: 'cover',
        style: {
          zIndex,
        },
      },
      context: {
        timing: {
          start: startTime,
          duration,
        },
      },
      effects: isFirst ? [] : [createIrisEffect(videoId, 0)],
    };

    childrenData.push(videoLayer);

    // Optional border layer
    if (!isFirst && showBorder) {
      const borderLayer: RenderableComponentData = {
        id: borderId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div class="absolute inset-0 pointer-events-none"></div>',
          className: 'absolute inset-0',
          style: {
            zIndex: 20,
            border: `2px solid rgba(255, 255, 255, ${borderOpacity})`,
            borderRadius: '50%',
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: transitionDuration,
          },
        },
        effects: [createBorderEffect(borderId, 0)].filter(Boolean),
      };

      childrenData.push(borderLayer);
    }

    currentTime += video.duration;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'iris-wipe-container',
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'iris-wipe-transition',
  title: 'Iris Wipe Transition',
  description:
    'Minimalist circular iris wipe transition preset for multiple video clips. Creates clean camera aperture-like reveals that expand from center using CSS clip-path animations.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'iris', 'wipe', 'circular', 'video', 'aperture', 'minimalist'],
  defaultInputParams: {
    videos: [
      {
        src: 'https://example.com/video1.mp4',
        duration: 5,
        playbackRate: 1,
        muted: false,
        volume: 1,
      },
      {
        src: 'https://example.com/video2.mp4',
        duration: 5,
        playbackRate: 1,
        muted: false,
        volume: 1,
      },
      {
        src: 'https://example.com/video3.mp4',
        duration: 5,
        playbackRate: 1,
        muted: false,
        volume: 1,
      },
    ],
    transitionDuration: 0.7,
    showBorder: true,
    borderOpacity: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const irisWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
