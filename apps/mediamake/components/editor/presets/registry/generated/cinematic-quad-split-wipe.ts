/**
 * Cinematic Quad Split Wipe Transition Preset
 *
 * This preset creates a cinematic quad-split wipe transition where four video quadrants
 * sequentially wipe away diagonally to reveal the focused video underneath.
 *
 * Features:
 * - **Quad Split Layout**: Four video quadrants displaying different content
 * - **Diagonal Wipe Pattern**: Sequential diagonal wipes (top-left → bottom-right, top-right → bottom-left, etc.)
 * - **Staggered Animation**: 300ms wipe duration with 100ms delays between panels (total 600ms transition)
 * - **Background Video**: Selected video plays continuously at full size underneath masked quadrants
 * - **Sci-Fi Glow Effect**: Subtle glow edge effect along wipe lines using drop-shadow filters
 * - **Clip-Path Based**: Pure clip-path animations with no opacity changes
 *
 * Use cases:
 * - Creating cinematic scene transitions with multi-video reveals
 * - Building dynamic video reveals with staggered wipe effects
 * - Adding sci-fi aesthetic transitions between scenes
 * - Creating professional video transitions with glow effects
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
  selectedVideo: z.object({
    src: z.string().describe('Source URL of the selected background video playing underneath'),
    startFrom: z.number().optional().describe('Start time of background video in seconds'),
    endAt: z.number().optional().describe('End time of background video in seconds'),
    playbackRate: z.number().optional().describe('Playback speed multiplier for background video (default: 1)'),
    muted: z.boolean().optional().describe('Whether background video is muted (default: false)'),
  }).describe('The selected video that plays continuously underneath at full size'),
  
  quadrants: z.object({
    topLeft: z.object({
      src: z.string().describe('Source URL of top-left quadrant video'),
      startFrom: z.number().optional().describe('Start time of top-left video in seconds'),
    }).describe('Top-left quadrant video configuration'),
    topRight: z.object({
      src: z.string().describe('Source URL of top-right quadrant video'),
      startFrom: z.number().optional().describe('Start time of top-right video in seconds'),
    }).describe('Top-right quadrant video configuration'),
    bottomLeft: z.object({
      src: z.string().describe('Source URL of bottom-left quadrant video'),
      startFrom: z.number().optional().describe('Start time of bottom-left video in seconds'),
    }).describe('Bottom-left quadrant video configuration'),
    bottomRight: z.object({
      src: z.string().describe('Source URL of bottom-right quadrant video'),
      startFrom: z.number().optional().describe('Start time of bottom-right video in seconds'),
    }).describe('Bottom-right quadrant video configuration'),
  }).describe('Configuration for the four quadrant videos'),
  
  transitionDuration: z.number().default(0.6).describe('Total transition duration in seconds (default: 0.6s)'),
  wipeDuration: z.number().default(0.3).describe('Duration of each individual wipe in seconds (default: 0.3s)'),
  staggerDelays: z.array(z.number()).default([0, 0.1, 0.2, 0.3]).describe('Start delays for each quadrant wipe in seconds (default: [0, 0.1, 0.2, 0.3])'),
  
  glowColor: z.string().default('rgba(0, 200, 255, 0.6)').describe('Color of the glow edge effect (default: cyan glow)'),
  glowIntensity: z.number().default(8).describe('Blur radius of the glow effect in pixels (default: 8px)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    selectedVideo,
    quadrants,
    transitionDuration,
    wipeDuration,
    staggerDelays,
    glowColor,
    glowIntensity,
  } = params;

  // Background video (selected video playing underneath)
  const backgroundVideo: RenderableComponentData = {
    id: 'selected-video-background',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: selectedVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 0,
      },
      startFrom: selectedVideo.startFrom || 0,
      endAt: selectedVideo.endAt,
      playbackRate: selectedVideo.playbackRate || 1,
      muted: selectedVideo.muted || false,
      loop: false,
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Top-left mask (wipes to bottom-right)
  const maskTopLeft: RenderableComponentData = {
    id: 'mask-top-left',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: quadrants.topLeft.src,
      className: 'absolute w-1/2 h-1/2 object-cover',
      style: {
        zIndex: 10,
        top: 0,
        left: 0,
        filter: `drop-shadow(2px 2px ${glowIntensity}px ${glowColor})`,
      },
      startFrom: quadrants.topLeft.startFrom || 0,
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'wipe-top-left',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: staggerDelays[0],
          duration: wipeDuration,
          mode: 'provider',
          targetIds: ['mask-top-left'],
          ranges: [
            {
              key: 'clipPath',
              val: 'polygon(0 0, 100% 0, 0 100%, 0 0)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Top-right mask (wipes to bottom-left)
  const maskTopRight: RenderableComponentData = {
    id: 'mask-top-right',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: quadrants.topRight.src,
      className: 'absolute w-1/2 h-1/2 object-cover',
      style: {
        zIndex: 20,
        top: 0,
        right: 0,
        filter: `drop-shadow(-2px 2px ${glowIntensity}px ${glowColor})`,
      },
      startFrom: quadrants.topRight.startFrom || 0,
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'wipe-top-right',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: staggerDelays[1],
          duration: wipeDuration,
          mode: 'provider',
          targetIds: ['mask-top-right'],
          ranges: [
            {
              key: 'clipPath',
              val: 'polygon(100% 0, 100% 0, 100% 100%, 0 100%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Bottom-left mask (wipes to top-right)
  const maskBottomLeft: RenderableComponentData = {
    id: 'mask-bottom-left',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: quadrants.bottomLeft.src,
      className: 'absolute w-1/2 h-1/2 object-cover',
      style: {
        zIndex: 30,
        bottom: 0,
        left: 0,
        filter: `drop-shadow(2px -2px ${glowIntensity}px ${glowColor})`,
      },
      startFrom: quadrants.bottomLeft.startFrom || 0,
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'wipe-bottom-left',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: staggerDelays[2],
          duration: wipeDuration,
          mode: 'provider',
          targetIds: ['mask-bottom-left'],
          ranges: [
            {
              key: 'clipPath',
              val: 'polygon(0 100%, 100% 0, 100% 100%, 0 100%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(100% 0, 100% 0, 100% 0, 100% 0)',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Bottom-right mask (wipes to top-left)
  const maskBottomRight: RenderableComponentData = {
    id: 'mask-bottom-right',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: quadrants.bottomRight.src,
      className: 'absolute w-1/2 h-1/2 object-cover',
      style: {
        zIndex: 40,
        bottom: 0,
        right: 0,
        filter: `drop-shadow(-2px -2px ${glowIntensity}px ${glowColor})`,
      },
      startFrom: quadrants.bottomRight.startFrom || 0,
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'wipe-bottom-right',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: staggerDelays[3],
          duration: wipeDuration,
          mode: 'provider',
          targetIds: ['mask-bottom-right'],
          ranges: [
            {
              key: 'clipPath',
              val: 'polygon(100% 100%, 0 100%, 100% 0, 100% 100%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(0 100%, 0 100%, 0 0, 0 0)',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'quad-split-wipe-container',
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
        duration: transitionDuration,
      },
    },
    childrenData: [
      backgroundVideo,
      maskTopLeft,
      maskTopRight,
      maskBottomLeft,
      maskBottomRight,
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

const presetMetadata: PresetMetadata = {
  id: 'cinematic-quad-split-wipe',
  title: 'Cinematic Quad Split Wipe Transition',
  description: 'A cinematic quad-split wipe transition where four video quadrants sequentially wipe away diagonally to reveal the focused video underneath. Features staggered diagonal wipe patterns with sci-fi glow edge effects along wipe lines.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'wipe', 'quad-split', 'cinematic', 'diagonal', 'reveal', 'glow', 'sci-fi'],
  defaultInputParams: {
    selectedVideo: {
      src: 'https://example.com/background-video.mp4',
      startFrom: 0,
      playbackRate: 1,
      muted: false,
    },
    quadrants: {
      topLeft: {
        src: 'https://example.com/video-tl.mp4',
        startFrom: 0,
      },
      topRight: {
        src: 'https://example.com/video-tr.mp4',
        startFrom: 0,
      },
      bottomLeft: {
        src: 'https://example.com/video-bl.mp4',
        startFrom: 0,
      },
      bottomRight: {
        src: 'https://example.com/video-br.mp4',
        startFrom: 0,
      },
    },
    transitionDuration: 0.6,
    wipeDuration: 0.3,
    staggerDelays: [0, 0.1, 0.2, 0.3],
    glowColor: 'rgba(0, 200, 255, 0.6)',
    glowIntensity: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicQuadSplitWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
