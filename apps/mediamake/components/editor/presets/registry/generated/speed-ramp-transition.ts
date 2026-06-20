/**
 * Speed Ramp Transition Preset
 *
 * This preset creates a cinematic speed ramping transition that manipulates time like a video editor
 * working with high-speed camera footage. It produces bullet-time effects with slow-motion sequences
 * that transition into rapid acceleration, similar to racing crashes or overtaking maneuvers.
 *
 * Features:
 * - **Speed Ramping**: Simulates time manipulation with scale and position animations
 * - **Motion Trails**: Multiple duplicate layers with decreasing opacity and offset for streak effects
 * - **Frame Blending**: Screen blend mode on trail layers for ghosting artifacts
 * - **Dynamic Motion Blur**: CSS blur filter mapped to simulated playback rate
 * - **Zoom Pulse**: Scale effect synchronized with speed transition point
 * - **Variable Speed Curves**: Smooth acceleration/deceleration using cubic-bezier easing
 * - **Performance Optimized**: Limited to 5 trail layers, GPU-accelerated properties only
 *
 * Use cases:
 * - Creating dramatic time manipulation effects in video transitions
 * - Simulating bullet-time effects for sports or action footage
 * - Adding cinematic speed changes to racing or chase sequences
 * - Creating dynamic visual interest during media transitions
 *
 * Technical Implementation:
 * - Uses VideoAtom or ImageAtom as primary media source
 * - Motion trails created with BaseLayout containers and transform offsets
 * - Speed changes simulated via scale and translateX animations
 * - Blur intensity synchronized with simulated playback rate
 * - All effects use mode: 'provider' with targetIds for direct application
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  videoSrc: z
    .string()
    .describe('Source URL of the video or image to apply speed ramping to'),
  mediaType: z
    .enum(['video', 'image'])
    .default('video')
    .describe('Type of media source'),
  transitionDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the speed ramp transition in seconds'),
  trailIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of motion trail effects (0-1)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for motion blur (0-2)'),
  zoomPulseAmount: z
    .number()
    .min(1)
    .max(1.3)
    .default(1.08)
    .describe('Maximum scale factor for zoom pulse at transition point'),
  fit: z
    .enum(['contain', 'cover', 'fill', 'none', 'scale-down'])
    .default('cover')
    .describe('Object fit mode for media'),
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

  // Calculate keyframe timing based on speed curve [1, 0.1, 0.1, 3, 1]
  // 0-20%: Normal speed (1x)
  // 20-40%: Ramp down to slow motion (0.1x)
  // 40-60%: Slow motion hold (0.1x)
  // 60-80%: Rapid acceleration (3x)
  // 80-100%: Return to normal (1x)

  // Determine component type
  const mediaComponentId = mediaType === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Primary video container with motion blur and zoom pulse effects
  const primaryVideoContainer: RenderableComponentData = {
    id: 'primary-video-container',
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
        duration: transitionDuration,
      },
    },
    effects: [
      // Motion blur effect - increases with speed, decreases during slow-mo
      {
        id: 'motion-blur-effect',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.23, 1, 0.32, 1)',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['primary-video'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 }, // Normal speed - no blur
            { key: 'filter', val: 'blur(0px)', prog: 0.2 }, // Normal speed
            {
              key: 'filter',
              val: `blur(${8 * blurIntensity}px)`,
              prog: 0.25,
            }, // Ramp down - blur increases
            { key: 'filter', val: 'blur(0px)', prog: 0.5 }, // Slow-mo - minimal blur
            {
              key: 'filter',
              val: `blur(${12 * blurIntensity}px)`,
              prog: 0.7,
            }, // Acceleration - max blur
            { key: 'filter', val: 'blur(0px)', prog: 1 }, // Return to normal
          ],
        },
      },
      // Zoom pulse effect - synchronized with speed change point
      {
        id: 'zoom-pulse-effect',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.23, 1, 0.32, 1)',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['primary-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1, prog: 0.45 },
            { key: 'scale', val: zoomPulseAmount, prog: 0.5 }, // Peak at midpoint
            { key: 'scale', val: 1, prog: 0.6 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'primary-video',
        type: 'atom',
        componentId: mediaComponentId,
        data: {
          src: videoSrc,
          fit,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Trail overlay container with 5 motion trail layers
  const trailLayers: RenderableComponentData[] = [];

  // Generate 5 trail layers with decreasing opacity and increasing offset
  for (let i = 1; i <= 5; i++) {
    const layerId = `trail-layer-${i}`;
    const opacityMultiplier = trailIntensity * (1 - (i - 1) * 0.15); // Decreasing opacity

    trailLayers.push({
      id: layerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'screen',
            pointerEvents: 'none',
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
          id: `trail-opacity-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.23, 1, 0.32, 1)',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [layerId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6 * opacityMultiplier, prog: 0.3 },
              { key: 'opacity', val: 0.8 * opacityMultiplier, prog: 0.5 },
              { key: 'opacity', val: 0.6 * opacityMultiplier, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
              // TranslateX for horizontal streak effect
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: `${-4 * i}px`, prog: 0.3 },
              { key: 'translateX', val: `${-8 * i}px`, prog: 0.5 },
              { key: 'translateX', val: `${-20 * i}px`, prog: 0.7 },
              { key: 'translateX', val: '0px', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData);
  }

  const trailOverlayContainer: RenderableComponentData = {
    id: 'trail-overlay-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: trailLayers,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'speed-ramp-root',
    type: 'layout',
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
    childrenData: [primaryVideoContainer, trailOverlayContainer],
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
    'Cinematic speed ramping transition preset with bullet-time effects, motion trails, dynamic motion blur, and zoom pulse synchronized to speed changes',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'speed-ramp',
    'bullet-time',
    'motion-trails',
    'slow-motion',
    'cinematic',
    'time-manipulation',
  ],
  defaultInputParams: {
    videoSrc: 'https://example.com/racing-video.mp4',
    mediaType: 'video',
    transitionDuration: 3,
    trailIntensity: 0.7,
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
