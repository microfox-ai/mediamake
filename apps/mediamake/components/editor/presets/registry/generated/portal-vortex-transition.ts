/**
 * Portal Vortex Transition Preset
 *
 * Creates a swirling wormhole effect between video grids. Videos in a 4x2 grid spiral 
 * inward toward a central vortex point with increasing rotational speed and stretching 
 * distortion, then new videos emerge from the same vortex spiraling outward.
 *
 * Features:
 * - Spiral motion using parametric equations
 * - Gravitational lensing effects with warping and stretching
 * - Light streak particles following spiral paths
 * - Radial blur and hue rotation for otherworldly effects
 * - Smooth transitions between grid layouts
 *
 * Use cases:
 * - Creating dramatic scene transitions between video grids
 * - Building sci-fi portal effects for content transitions
 * - Adding cinematic wormhole animations to video sequences
 * - Creating dynamic multi-video presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideos: z
    .array(
      z.object({
        src: z.string().describe('Video source URL'),
        duration: z.number().describe('Video duration in seconds'),
      }),
    )
    .length(8)
    .describe('Array of 8 outgoing videos for 4x2 grid'),
  incomingVideos: z
    .array(
      z.object({
        src: z.string().describe('Video source URL'),
        duration: z.number().describe('Video duration in seconds'),
      }),
    )
    .length(8)
    .describe('Array of 8 incoming videos for 4x2 grid'),
  transitionDuration: z
    .number()
    .default(4)
    .describe('Total duration of vortex transition in seconds'),
  vortexIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for vortex effects'),
  particleCount: z
    .number()
    .min(4)
    .max(16)
    .default(8)
    .describe('Number of light streak particles'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideos,
    incomingVideos,
    transitionDuration,
    vortexIntensity,
    particleCount,
  } = params;

  const halfDuration = transitionDuration / 2;
  const centerX = 50; // Percentage
  const centerY = 50; // Percentage

  // Grid positions for 4x2 layout (percentage-based)
  const gridPositions = [
    { left: 0, top: 0, width: 25, height: 50 }, // Top-left
    { left: 25, top: 0, width: 25, height: 50 }, // Top-center-left
    { left: 50, top: 0, width: 25, height: 50 }, // Top-center-right
    { left: 75, top: 0, width: 25, height: 50 }, // Top-right
    { left: 0, top: 50, width: 25, height: 50 }, // Bottom-left
    { left: 25, top: 50, width: 25, height: 50 }, // Bottom-center-left
    { left: 50, top: 50, width: 25, height: 50 }, // Bottom-center-right
    { left: 75, top: 50, width: 25, height: 50 }, // Bottom-right
  ];

  // Helper: Calculate center of grid position
  const getCenterOffset = (pos: typeof gridPositions[0]) => {
    const centerPosX = pos.left + pos.width / 2;
    const centerPosY = pos.top + pos.height / 2;
    return {
      translateX: centerX - centerPosX,
      translateY: centerY - centerPosY,
    };
  };

  // Helper: Create outgoing video with spiral inward effect
  const createOutgoingVideo = (
    video: { src: string; duration: number },
    index: number,
  ): RenderableComponentData => {
    const pos = gridPositions[index];
    const offset = getCenterOffset(pos);
    const videoId = `outgoing-video-${index}`;

    return {
      id: videoId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          position: 'absolute',
          left: `${pos.left}%`,
          top: `${pos.top}%`,
          width: `${pos.width}%`,
          height: `${pos.height}%`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: halfDuration,
        },
      },
      effects: [
        {
          id: `spiral-inward-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: halfDuration,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: `${offset.translateX}%`, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: `${offset.translateY}%`, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 720 * vortexIntensity, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0, prog: 1 },
              { key: 'blur', val: 0, prog: 0 },
              { key: 'blur', val: 5, prog: 1 },
            ],
          },
        },
        {
          id: `hue-rotate-outgoing-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: halfDuration,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'hue-rotate', val: 0, prog: 0 },
              { key: 'hue-rotate', val: 180, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Helper: Create incoming video with spiral outward effect
  const createIncomingVideo = (
    video: { src: string; duration: number },
    index: number,
  ): RenderableComponentData => {
    const pos = gridPositions[index];
    const offset = getCenterOffset(pos);
    const videoId = `incoming-video-${index}`;

    return {
      id: videoId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          position: 'absolute',
          left: `${pos.left}%`,
          top: `${pos.top}%`,
          width: `${pos.width}%`,
          height: `${pos.height}%`,
        },
      },
      context: {
        timing: {
          start: halfDuration,
          duration: halfDuration,
        },
      },
      effects: [
        {
          id: `spiral-outward-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: halfDuration,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'translateX', val: `${offset.translateX}%`, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: `${offset.translateY}%`, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'rotate', val: 720 * vortexIntensity, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'blur', val: 5, prog: 0 },
              { key: 'blur', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: `hue-rotate-incoming-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: halfDuration,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'hue-rotate', val: 180, prog: 0 },
              { key: 'hue-rotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Helper: Create light streak particle
  const createLightStreak = (index: number): RenderableComponentData => {
    const streakId = `light-streak-${index}`;
    const startDelay = (index / particleCount) * transitionDuration * 0.4;
    const duration = transitionDuration - startDelay;
    const angle = (index / particleCount) * 360;
    const radius = 300; // Pixels

    return {
      id: streakId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute',
        style: {
          width: '4px',
          height: '100px',
          background:
            'linear-gradient(to bottom, transparent, rgba(255,255,255,0.8), transparent)',
          left: '50%',
          top: '50%',
          transformOrigin: 'center center',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: startDelay,
          duration: duration,
        },
      },
      effects: [
        {
          id: `streak-spiral-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [streakId],
            ranges: [
              { key: 'rotate', val: angle, prog: 0 },
              { key: 'rotate', val: angle + 1080 * vortexIntensity, prog: 1 },
              {
                key: 'translateX',
                val: 0,
                prog: 0,
              },
              {
                key: 'translateX',
                val: `${radius * Math.cos((angle * Math.PI) / 180)}px`,
                prog: 0.5,
              },
              {
                key: 'translateX',
                val: 0,
                prog: 1,
              },
              {
                key: 'translateY',
                val: 0,
                prog: 0,
              },
              {
                key: 'translateY',
                val: `${radius * Math.sin((angle * Math.PI) / 180)}px`,
                prog: 0.5,
              },
              {
                key: 'translateY',
                val: 0,
                prog: 1,
              },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.2 },
              { key: 'opacity', val: 0.8, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Build outgoing videos
  const outgoingVideoNodes: RenderableComponentData[] = outgoingVideos.map(
    (video, index) => createOutgoingVideo(video, index),
  );

  // Build incoming videos
  const incomingVideoNodes: RenderableComponentData[] = incomingVideos.map(
    (video, index) => createIncomingVideo(video, index),
  );

  // Build light streaks
  const lightStreakNodes: RenderableComponentData[] = Array.from(
    { length: particleCount },
    (_, index) => createLightStreak(index),
  );

  // Vortex mask overlay
  const vortexMask: RenderableComponentData = {
    id: 'vortex-mask',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        background:
          'radial-gradient(circle at center, transparent 0%, transparent 30%, rgba(0,0,0,0.8) 70%, rgba(0,0,0,1) 100%)',
        mixBlendMode: 'multiply',
        zIndex: 100,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'portal-vortex-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
          overflow: 'hidden',
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
      ...outgoingVideoNodes,
      ...incomingVideoNodes,
      ...lightStreakNodes,
      vortexMask,
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
  id: 'portal-vortex-transition',
  title: 'Portal Vortex Transition',
  description:
    'Creates a swirling wormhole effect between video grids with spiral motion, gravitational lensing, and light streak particles. Videos spiral inward toward a central vortex point, then new videos emerge spiraling outward.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vortex',
    'portal',
    'wormhole',
    'spiral',
    'grid',
    'particles',
    'sci-fi',
  ],
  defaultInputParams: {
    outgoingVideos: Array(8).fill({
      src: 'https://example.com/video1.mp4',
      duration: 10,
    }),
    incomingVideos: Array(8).fill({
      src: 'https://example.com/video2.mp4',
      duration: 10,
    }),
    transitionDuration: 4,
    vortexIntensity: 1,
    particleCount: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const portalVortexTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};