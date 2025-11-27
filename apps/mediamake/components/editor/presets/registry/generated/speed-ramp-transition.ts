/**
 * Speed Ramp Transition Preset
 *
 * This preset creates a cinematic speed ramping transition that manipulates time like a video editor
 * working with high-speed camera footage. It simulates bullet-time effects similar to racing crashes
 * or overtaking maneuvers with dynamic motion trails, frame blending, and motion blur.
 *
 * Features:
 * - **Speed Ramping**: Simulates time slowing down (0.1x) then rapidly accelerating (3x) using scale and motion effects
 * - **Motion Trails**: 5 duplicate layers with decreasing opacity and translateX offset for streaking effects
 * - **Frame Blending**: Screen blend mode on trail layers for temporal blending simulation
 * - **Motion Blur**: Dynamic blur intensity mapped to simulated playback speed phases
 * - **Zoom Pulse**: Subtle scale effect synchronized with speed change inflection point
 * - **Performance Optimized**: GPU-accelerated transforms only, limited to 5 trail layers
 *
 * Technical Implementation:
 * Since VideoAtom playbackRate cannot be animated via effects, speed ramping is simulated using:
 * - Scale animations to create zoom in/out illusion
 * - Position animations for motion direction
 * - Motion blur intensity changes synchronized with speed phases
 * - For images: scale and translateX animations simulate the speed effect
 *
 * Speed curve simulates: [1x → 0.1x (slow-mo) → 3x (fast) → 1x (normal)]
 * Motion blur phases: low blur during slow-mo (0-3px), high blur during acceleration (8-15px)
 *
 * Use cases:
 * - Dramatic video transitions with temporal manipulation
 * - Racing or action sequence emphasis
 * - Bullet-time style effects for impact moments
 * - High-energy montage transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  videoSrc: z.string().describe('Source URL of the video or image'),
  mediaType: z
    .enum(['video', 'image'])
    .default('video')
    .describe('Type of media - video or image'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Total duration of the speed ramp transition in seconds'),
  trailIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for motion trail effects (0 = none, 1 = default, 2 = extreme)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for motion blur effects (0 = none, 1 = default, 2 = extreme)'),
  zoomPulseAmount: z
    .number()
    .min(1)
    .max(1.2)
    .default(1.08)
    .describe('Maximum scale factor for zoom pulse at transition inflection point'),
  fit: z
    .enum(['contain', 'cover', 'fill'])
    .default('cover')
    .describe('How the media should fit within the frame'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videoSrc,
    mediaType,
    transitionDuration,
    trailIntensity,
    blurIntensity,
    zoomPulseAmount,
    fit,
  } = params;

  // Helper function to calculate trail translateX offset based on layer index
  const getTrailOffset = (layerIndex: number): number => {
    // Trail layers move progressively more to create streaking effect
    // Layer 1: -10px, Layer 2: -20px, Layer 3: -30px, Layer 4: -40px, Layer 5: -50px
    return -(layerIndex + 1) * 10 * trailIntensity;
  };

  // Helper function to calculate trail opacity based on layer index
  const getTrailOpacity = (layerIndex: number): number => {
    // Decreasing opacity: 0.6, 0.45, 0.3, 0.2, 0.1
    const baseOpacities = [0.6, 0.45, 0.3, 0.2, 0.1];
    return baseOpacities[layerIndex] * Math.min(trailIntensity, 1);
  };

  // Helper function to create motion blur effect based on speed phase
  const createMotionBlurEffect = (targetId: string) => {
    return {
      id: `motion-blur-${targetId}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          // Normal speed (1x): 2px blur
          { key: 'filter', val: `blur(${2 * blurIntensity}px)`, prog: 0 },
          // Entering slow-mo (0.1x): reduce blur to 0px
          {
            key: 'filter',
            val: `blur(${0 * blurIntensity}px)`,
            prog: 0.2,
          },
          // Slow-mo phase: minimal blur
          {
            key: 'filter',
            val: `blur(${1 * blurIntensity}px)`,
            prog: 0.4,
          },
          // Acceleration start: increasing blur
          {
            key: 'filter',
            val: `blur(${8 * blurIntensity}px)`,
            prog: 0.6,
          },
          // Peak acceleration (3x): maximum blur
          {
            key: 'filter',
            val: `blur(${15 * blurIntensity}px)`,
            prog: 0.8,
          },
          // Return to normal: reduce blur
          { key: 'filter', val: `blur(${2 * blurIntensity}px)`, prog: 1 },
        ],
      },
    };
  };

  // Helper function to create speed-simulating scale effect
  const createSpeedScaleEffect = (targetId: string) => {
    return {
      id: `speed-scale-${targetId}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start: 0,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          // Normal speed: scale 1.0
          { key: 'scale', val: 1.0, prog: 0 },
          // Slow down: slight zoom in
          { key: 'scale', val: 1.05, prog: 0.2 },
          // Slow-mo: more zoom
          { key: 'scale', val: 1.1, prog: 0.4 },
          // Acceleration: zoom out rapidly
          { key: 'scale', val: 0.95, prog: 0.6 },
          // Fast speed: more zoom out
          { key: 'scale', val: 0.9, prog: 0.8 },
          // Return to normal
          { key: 'scale', val: 1.0, prog: 1 },
        ],
      },
    };
  };

  // Helper function to create zoom pulse at inflection point
  const createZoomPulseEffect = (targetId: string) => {
    return {
      id: `zoom-pulse-${targetId}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: transitionDuration * 0.35,
        duration: transitionDuration * 0.3,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'scale', val: 1.0, prog: 0 },
          { key: 'scale', val: zoomPulseAmount, prog: 0.5 },
          { key: 'scale', val: 1.0, prog: 1 },
        ],
      },
    };
  };

  // Helper function to create trail motion effect during high-speed phase
  const createTrailMotionEffect = (layerIndex: number) => {
    const targetId = `trail-video-${layerIndex + 1}`;
    const baseOffset = getTrailOffset(layerIndex);

    return {
      id: `trail-motion-${layerIndex + 1}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: transitionDuration * 0.6,
        duration: transitionDuration * 0.3,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: baseOffset, prog: 0.5 },
          { key: 'translateX', val: baseOffset * 1.5, prog: 1 },
        ],
      },
    };
  };

  // Create primary video/image with effects
  const primaryMediaAtom: RenderableComponentData = {
    id: 'primary-video',
    type: 'atom' as const,
    componentId: (mediaType === 'video' ? 'VideoAtom' : 'ImageAtom') as any,
    data: {
      src: videoSrc,
      fit,
      style: {
        width: '100%',
        height: '100%',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      createMotionBlurEffect('primary-video'),
      createSpeedScaleEffect('primary-video'),
      createZoomPulseEffect('primary-video'),
    ],
  };

  // Create 5 trail layers with duplicate video/image atoms
  const trailLayers: RenderableComponentData[] = [];

  for (let i = 0; i < 5; i++) {
    const layerId = `trail-layer-${i + 1}`;
    const videoId = `trail-video-${i + 1}`;
    const opacity = getTrailOpacity(i);

    const trailLayer: RenderableComponentData = {
      id: layerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 5 - i,
            opacity,
            mixBlendMode: 'screen',
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
        {
          id: videoId,
          type: 'atom' as const,
          componentId: (mediaType === 'video'
            ? 'VideoAtom'
            : 'ImageAtom') as any,
          data: {
            src: videoSrc,
            fit,
            style: {
              width: '100%',
              height: '100%',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            createMotionBlurEffect(videoId),
            createTrailMotionEffect(i),
          ],
        } as RenderableComponentData,
      ],
    };

    trailLayers.push(trailLayer);
  }

  // Create primary video container
  const primaryVideoContainer: RenderableComponentData = {
    id: 'primary-video-container',
    type: 'layout' as const,
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
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [primaryMediaAtom],
  };

  // Create zoom pulse overlay (empty, used for potential additional effects)
  const zoomPulseOverlay: RenderableComponentData = {
    id: 'zoom-pulse-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [],
  };

  // Root container with all layers
  const rootContainer: RenderableComponentData = {
    id: 'speed-ramp-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
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
      // Trail layers first (bottom to top: 5 → 1)
      ...trailLayers.reverse(),
      // Primary video on top
      primaryVideoContainer,
      // Overlay for additional effects
      zoomPulseOverlay,
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
  id: 'speed-ramp-transition',
  title: 'Speed Ramp Transition',
  description:
    'Cinematic speed ramping transition with bullet-time effects, motion trails, dynamic motion blur, frame blending simulation, and zoom pulse at speed inflection point. Creates the illusion of time slowing down then rapidly accelerating.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'speed-ramp', 'bullet-time', 'motion-blur', 'cinematic', 'effects', 'visual'],
  defaultInputParams: {
    videoSrc: 'https://example.com/video.mp4',
    mediaType: 'video',
    transitionDuration: 2,
    trailIntensity: 1,
    blurIntensity: 1,
    zoomPulseAmount: 1.08,
    fit: 'cover',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const speedRampTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
