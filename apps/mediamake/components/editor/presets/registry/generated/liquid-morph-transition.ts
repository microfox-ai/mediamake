/**
 * Liquid Morph Transition Preset
 *
 * Creates a fluid, organic transition between videos using blur and scale effects that simulate
 * videos melting and reforming. Starts with a 2x3 grid of videos that begins to undulate with
 * wave-like distortions, gradually increasing in intensity until the videos appear to melt together,
 * then reform into a new single fullscreen video.
 *
 * Features:
 * - 2x3 grid of videos that transform with liquid-like effects
 * - Peak liquification at midpoint (1.25s) with maximum blur and scale
 * - Grid videos fade out while fullscreen video fades in during middle 1s
 * - Fullscreen video emerges from the liquid state and stabilizes
 * - Scale expansion effect on grid container during peak distortion
 * - Blur effects simulate edge bleeding and merging
 *
 * Use cases:
 * - Creating organic transitions between video segments
 * - Merging multiple video sources into one
 * - Artistic video montages with fluid transformations
 * - Dynamic intro/outro sequences
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  videoSources: z.array(z.string()).length(6).describe('Array of 6 video source URLs for the initial 2x3 grid'),
  finalVideoSource: z.string().describe('Video source URL for the final fullscreen video'),
  transitionDuration: z.number().default(2.5).describe('Total duration of the transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { videoSources, finalVideoSource, transitionDuration } = params;

  const duration = transitionDuration;
  const midpoint = duration / 2; // 1.25s

  // Create 2x3 grid of videos
  const gridVideos: RenderableComponentData[] = videoSources.map((src, index) => ({
    id: `grid-video-${index + 1}`,
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      volume: 0,
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  }));

  // Grid container with all videos
  const gridContainer: RenderableComponentData = {
    id: 'grid-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-cols-2 grid-rows-3',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: gridVideos,
  };

  // Fullscreen video that emerges
  const fullscreenVideo: RenderableComponentData = {
    id: 'fullscreen-video',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: finalVideoSource,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      volume: 1,
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-morph-transition-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      gridContainer,
      fullscreenVideo,
    ],
  };

  // Effects for grid container - scale expansion during peak distortion
  const gridScaleEffect = {
    id: 'grid-scale-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: ['grid-container'],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.15, prog: 0.5 },
        { key: 'scale', val: 1.3, prog: 1 },
      ],
    },
  };

  // Grid blur effect - simulates edge bleeding and melting
  const gridBlurEffect = {
    id: 'grid-blur-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: ['grid-container'],
      ranges: [
        { key: 'blur', val: 0, prog: 0 },
        { key: 'blur', val: 8, prog: 0.5 },
        { key: 'blur', val: 0, prog: 1 },
      ],
    },
  };

  // Grid opacity fade - grid videos fade out during middle 1s
  const gridOpacityEffect = {
    id: 'grid-opacity-fade-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0.75, // 0.75s into transition
      duration: 1, // 1 second duration
      mode: 'provider',
      targetIds: ['grid-container'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Fullscreen video opacity fade - fades in during same middle 1s
  const fullscreenOpacityEffect = {
    id: 'fullscreen-opacity-fade-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0.75, // 0.75s into transition
      duration: 1, // 1 second duration
      mode: 'provider',
      targetIds: ['fullscreen-video'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Fullscreen video scale - emerges from liquid state and stabilizes
  const fullscreenScaleEffect = {
    id: 'fullscreen-scale-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 1.25, // From midpoint to end
      duration: 1.25, // Second half of transition
      mode: 'provider',
      targetIds: ['fullscreen-video'],
      ranges: [
        { key: 'scale', val: 1.2, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Fullscreen video blur - clears as it reforms
  const fullscreenBlurEffect = {
    id: 'fullscreen-blur-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 1.25, // From midpoint to end
      duration: 1.25, // Second half of transition
      mode: 'provider',
      targetIds: ['fullscreen-video'],
      ranges: [
        { key: 'blur', val: 6, prog: 0 },
        { key: 'blur', val: 0, prog: 1 },
      ],
    },
  };

  // Attach all effects to root container
  rootContainer.effects = [
    gridScaleEffect,
    gridBlurEffect,
    gridOpacityEffect,
    fullscreenOpacityEffect,
    fullscreenScaleEffect,
    fullscreenBlurEffect,
  ];

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
  id: 'liquid-morph-transition',
  title: 'Liquid Morph Transition',
  description: 'Creates a fluid, organic transition between videos with scale, blur, and opacity effects that simulate videos melting and reforming. Uses a 2x3 grid that distorts and melts into a single fullscreen video over 2.5 seconds, with peak distortion at the midpoint.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'liquid', 'morph', 'organic', 'fluid', 'grid', 'video', 'effects'],
  defaultInputParams: {
    videoSources: [
      'https://example.com/video1.mp4',
      'https://example.com/video2.mp4',
      'https://example.com/video3.mp4',
      'https://example.com/video4.mp4',
      'https://example.com/video5.mp4',
      'https://example.com/video6.mp4',
    ],
    finalVideoSource: 'https://example.com/final-video.mp4',
    transitionDuration: 2.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
