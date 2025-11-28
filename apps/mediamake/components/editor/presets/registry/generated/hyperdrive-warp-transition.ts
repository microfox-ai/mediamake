/**
 * Hyperdrive Starfield Warp Transition
 *
 * Creates an ultra-fast warp-speed transition where videos stretch into light-speed streaks
 * with extreme horizontal scaling, rapid rotation, motion blur trails, chromatic aberration,
 * and a bright white flash at the midpoint.
 *
 * Features:
 * - Extreme horizontal scaling (scaleX 1→50 for outgoing, 50→1 for incoming)
 * - Rapid rotation (0→1440→0 degrees creating full spins)
 * - Motion blur via 20 duplicate video frames with opacity trails
 * - Chromatic aberration with RGB channel splitting
 * - Bright white flash peaking at transition midpoint
 * - 0.6-second ultra-fast overlap duration
 * - GPU-accelerated transforms
 *
 * Use cases:
 * - High-energy sci-fi transitions
 * - Action montage cuts
 * - Hyperspace jump effects
 * - Speed-ramping between clips
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    startFrom: z.number().optional().describe('Start time in seconds'),
    endAt: z.number().optional().describe('End time in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time in seconds'),
    endAt: z.number().optional().describe('End time in seconds'),
  }).describe('Incoming video configuration'),
  overlapDuration: z.number().default(0.6).describe('Duration of the transition overlap in seconds'),
  maxScale: z.number().default(50).describe('Maximum horizontal scale for the light-speed stretch effect'),
  rotationDegrees: z.number().default(1440).describe('Total rotation in degrees (default: 1440 = 4 full rotations)'),
  motionBlurFrames: z.number().default(20).describe('Number of duplicate frames for motion blur effect'),
  motionBlurOpacity: z.number().default(0.05).describe('Opacity of each motion blur frame'),
  motionBlurOffset: z.number().default(0.01).describe('Time offset between motion blur frames in seconds'),
  chromaticAberration: z.number().default(3).describe('Chromatic aberration intensity (pixel offset)'),
  flashPeakTime: z.number().default(0.3).describe('Time when the white flash reaches peak brightness (relative to overlap)'),
  flashIntensity: z.number().default(1).describe('Peak opacity of the white flash (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    overlapDuration,
    maxScale,
    rotationDegrees,
    motionBlurFrames,
    motionBlurOpacity,
    motionBlurOffset,
    chromaticAberration,
    flashPeakTime,
    flashIntensity,
  } = params;

  // Helper: Create motion blur duplicates for a video
  const createMotionBlurLayers = (
    videoSrc: string,
    videoId: string,
    startFrom: number | undefined,
    endAt: number | undefined,
    filter: string,
    includeMain: boolean = true,
  ): RenderableComponentData[] => {
    const layers: RenderableComponentData[] = [];
    
    // Main video (full opacity)
    if (includeMain) {
      layers.push({
        id: `${videoId}-main`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: videoSrc,
          startFrom,
          endAt,
          className: 'w-full h-full object-cover absolute inset-0',
          style: {
            filter,
            willChange: 'transform',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: overlapDuration,
          },
        },
      } as RenderableComponentData);
    }

    // Motion blur duplicates
    for (let i = 1; i <= Math.min(motionBlurFrames - 1, 19); i++) {
      layers.push({
        id: `${videoId}-blur-${i}`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: videoSrc,
          startFrom,
          endAt,
          className: 'w-full h-full object-cover absolute inset-0',
          style: {
            filter,
            opacity: motionBlurOpacity,
            willChange: 'transform',
          },
        },
        context: {
          timing: {
            start: i * motionBlurOffset,
            duration: Math.max(0.01, overlapDuration - i * motionBlurOffset),
          },
        },
      } as RenderableComponentData);
    }

    return layers;
  };

  // Create RGB channel layers with motion blur
  const outgoingRedLayers = createMotionBlurLayers(
    outgoingVideo.src,
    'outgoing-red',
    outgoingVideo.startFrom,
    outgoingVideo.endAt,
    `hue-rotate(-120deg) saturate(1.5)`,
    true,
  );

  const outgoingGreenLayers = createMotionBlurLayers(
    outgoingVideo.src,
    'outgoing-green',
    outgoingVideo.startFrom,
    outgoingVideo.endAt,
    `hue-rotate(120deg) saturate(1.5)`,
    true,
  );

  const outgoingBlueLayers = createMotionBlurLayers(
    outgoingVideo.src,
    'outgoing-blue',
    outgoingVideo.startFrom,
    outgoingVideo.endAt,
    `saturate(1.5)`,
    true,
  );

  const incomingRedLayers = createMotionBlurLayers(
    incomingVideo.src,
    'incoming-red',
    incomingVideo.startFrom,
    incomingVideo.endAt,
    `hue-rotate(-120deg) saturate(1.5)`,
    true,
  );

  const incomingGreenLayers = createMotionBlurLayers(
    incomingVideo.src,
    'incoming-green',
    incomingVideo.startFrom,
    incomingVideo.endAt,
    `hue-rotate(120deg) saturate(1.5)`,
    true,
  );

  const incomingBlueLayers = createMotionBlurLayers(
    incomingVideo.src,
    'incoming-blue',
    incomingVideo.startFrom,
    incomingVideo.endAt,
    `saturate(1.5)`,
    true,
  );

  // RGB channel containers for outgoing video
  const outgoingRedChannel: RenderableComponentData = {
    id: 'outgoing-red-channel',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: outgoingRedLayers,
    effects: [
      // Extreme scaleX + rotation + fade out + chromatic offset
      {
        id: 'outgoing-red-transform',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-red-channel'],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: maxScale, prog: 0.5 },
            { key: 'scaleX', val: maxScale * 1.2, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: rotationDegrees, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'translateX', val: -chromaticAberration, prog: 0 },
            { key: 'translateX', val: -chromaticAberration * 3, prog: 1 },
          ],
        },
      },
    ],
  };

  const outgoingGreenChannel: RenderableComponentData = {
    id: 'outgoing-green-channel',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: outgoingGreenLayers,
    effects: [
      {
        id: 'outgoing-green-transform',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-green-channel'],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: maxScale, prog: 0.5 },
            { key: 'scaleX', val: maxScale * 1.2, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: rotationDegrees, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const outgoingBlueChannel: RenderableComponentData = {
    id: 'outgoing-blue-channel',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: outgoingBlueLayers,
    effects: [
      {
        id: 'outgoing-blue-transform',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-blue-channel'],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: maxScale, prog: 0.5 },
            { key: 'scaleX', val: maxScale * 1.2, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: rotationDegrees, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'translateX', val: chromaticAberration, prog: 0 },
            { key: 'translateX', val: chromaticAberration * 3, prog: 1 },
          ],
        },
      },
    ],
  };

  // RGB channel containers for incoming video
  const incomingRedChannel: RenderableComponentData = {
    id: 'incoming-red-channel',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: incomingRedLayers,
    effects: [
      {
        id: 'incoming-red-transform',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-red-channel'],
          ranges: [
            { key: 'scaleX', val: maxScale * 1.2, prog: 0 },
            { key: 'scaleX', val: maxScale, prog: 0.5 },
            { key: 'scaleX', val: 1, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: rotationDegrees, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'translateX', val: -chromaticAberration * 3, prog: 0 },
            { key: 'translateX', val: -chromaticAberration, prog: 1 },
          ],
        },
      },
    ],
  };

  const incomingGreenChannel: RenderableComponentData = {
    id: 'incoming-green-channel',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: incomingGreenLayers,
    effects: [
      {
        id: 'incoming-green-transform',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-green-channel'],
          ranges: [
            { key: 'scaleX', val: maxScale * 1.2, prog: 0 },
            { key: 'scaleX', val: maxScale, prog: 0.5 },
            { key: 'scaleX', val: 1, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: rotationDegrees, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const incomingBlueChannel: RenderableComponentData = {
    id: 'incoming-blue-channel',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: incomingBlueLayers,
    effects: [
      {
        id: 'incoming-blue-transform',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-blue-channel'],
          ranges: [
            { key: 'scaleX', val: maxScale * 1.2, prog: 0 },
            { key: 'scaleX', val: maxScale, prog: 0.5 },
            { key: 'scaleX', val: 1, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: rotationDegrees, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'translateX', val: chromaticAberration * 3, prog: 0 },
            { key: 'translateX', val: chromaticAberration, prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing chromatic container
  const outgoingChromaticContainer: RenderableComponentData = {
    id: 'chromatic-container-outgoing',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: [
      outgoingRedChannel,
      outgoingGreenChannel,
      outgoingBlueChannel,
    ],
  };

  // Incoming chromatic container
  const incomingChromaticContainer: RenderableComponentData = {
    id: 'chromatic-container-incoming',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: [
      incomingRedChannel,
      incomingGreenChannel,
      incomingBlueChannel,
    ],
  };

  // White flash overlay
  const flashOverlay: RenderableComponentData = {
    id: 'flash-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: white;"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 100,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: 'flash-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['flash-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: flashIntensity, prog: flashPeakTime / overlapDuration },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'hyperdrive-warp-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          willChange: 'transform',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: [
      outgoingChromaticContainer,
      incomingChromaticContainer,
      flashOverlay,
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
  id: 'hyperdrive-warp-transition',
  title: 'Hyperdrive Starfield Warp Transition',
  description:
    'Ultra-fast warp-speed transition with extreme horizontal scaling (scaleX 1→50), rapid rotation (0→1440→0 degrees), motion blur trails via 20 duplicate frames, chromatic aberration with RGB channel splitting, and a bright white flash peaking at midpoint during 0.6s overlap',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'warp', 'hyperdrive', 'sci-fi', 'starfield', 'chromatic-aberration', 'motion-blur'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
      endAt: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
      endAt: 5,
    },
    overlapDuration: 0.6,
    maxScale: 50,
    rotationDegrees: 1440,
    motionBlurFrames: 20,
    motionBlurOpacity: 0.05,
    motionBlurOffset: 0.01,
    chromaticAberration: 3,
    flashPeakTime: 0.3,
    flashIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const hyperdriveWarpTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
