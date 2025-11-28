/**
 * CSI Forensic Magnifying Glass Transition Preset
 *
 * Creates a CSI-style forensic magnifying glass transition effect between two video clips.
 * The magnifying glass scans horizontally across the frame, revealing the incoming video
 * with enhanced detail (increased clarity, sharpness, brightness) while the surrounding
 * area is slightly desaturated. The lens creates a ripple distortion effect and includes
 * a subtle vignette around the perimeter.
 *
 * Features:
 * - Horizontal scanning motion from left to right with variable speed
 * - Pause effects at key moments (25% and 75%) with freeze-frame effect
 * - Enhanced detail within lens area (increased brightness, contrast, sharpness)
 * - Desaturation outside lens area
 * - Ripple distortion effect within lens
 * - Subtle vignette around lens perimeter
 * - Variable speed sweep: slow (0-30%), fast (30-70%), slow (70-100%)
 * - 3-second overlap between outgoing and incoming videos
 *
 * Use cases:
 * - Crime scene investigation style transitions
 * - Forensic analysis video presentations
 * - Detail-focused transitions between scenes
 * - Documentary or investigative journalism content
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
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(3)
    .describe('Duration of the magnifying glass sweep transition in seconds'),
  lensSize: z
    .number()
    .default(180)
    .describe('Radius of the magnifying glass lens in pixels'),
  lensBrightness: z
    .number()
    .default(120)
    .describe('Brightness percentage inside lens (100-150)'),
  lensContrast: z
    .number()
    .default(115)
    .describe('Contrast percentage inside lens (100-150)'),
  outsideSaturation: z
    .number()
    .default(80)
    .describe('Saturation percentage outside lens (50-100)'),
  pauseDuration: z
    .number()
    .default(0.3)
    .describe('Duration of pause at key moments in seconds'),
  vignetteIntensity: z
    .number()
    .default(0.4)
    .describe('Vignette intensity around lens perimeter (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    lensSize,
    lensBrightness,
    lensContrast,
    outsideSaturation,
    pauseDuration,
    vignetteIntensity,
  } = params;

  // Calculate container duration
  const containerDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Transition starts 3 seconds before outgoing video ends
  const transitionStart = outgoingVideo.duration - transitionDuration;

  // Helper function to create keyframe ranges for variable speed sweep
  // 0-30% slow, 30-70% fast, 70-100% slow with pauses at 25% and 75%
  const createSweepRanges = () => {
    const ranges = [
      // Slow start (0-25%)
      { key: 'translateX', val: '0%', prog: 0 },
      { key: 'translateX', val: '25%', prog: 0.25 },
      // Pause at 25% (freeze for pauseDuration)
      {
        key: 'translateX',
        val: '25%',
        prog: 0.25 + pauseDuration / transitionDuration,
      },
      // Fast middle section (25-70%)
      { key: 'translateX', val: '70%', prog: 0.7 },
      // Pause at 75% (freeze for pauseDuration)
      {
        key: 'translateX',
        val: '75%',
        prog: 0.75 + pauseDuration / transitionDuration,
      },
      // Slow end (75-100%)
      { key: 'translateX', val: '100%', prog: 1 },
    ];
    return ranges;
  };

  const outgoingVideoId = 'csi-outgoing-video';
  const incomingVideoId = 'csi-incoming-video';
  const incomingContainerId = 'csi-incoming-container';

  const childrenData: RenderableComponentData[] = [
    // Outgoing video container (bottom layer)
    {
      id: 'csi-outgoing-container',
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
          duration: outgoingVideo.duration,
        },
      },
      childrenData: [
        {
          id: outgoingVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            muted: false,
            volume: 1,
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideo.duration,
            },
          },
          effects: [
            // Desaturation effect during transition
            {
              id: 'outgoing-desaturate',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: transitionStart,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: [outgoingVideoId],
                ranges: [
                  {
                    key: 'filter',
                    val: 'saturate(100%)',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: `saturate(${outsideSaturation}%)`,
                    prog: 1,
                  },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming video container (revealed through lens)
    {
      id: incomingContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 20,
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: incomingVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            muted: false,
            volume: 0,
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideo.duration + transitionDuration,
            },
          },
          effects: [
            // Enhanced detail inside lens
            {
              id: 'incoming-enhance',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: [incomingVideoId],
                ranges: [
                  {
                    key: 'filter',
                    val: `brightness(${lensBrightness}%) contrast(${lensContrast}%) saturate(100%)`,
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: `brightness(${lensBrightness}%) contrast(${lensContrast}%) saturate(100%)`,
                    prog: 1,
                  },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
      effects: [
        // Animated clip-path to reveal incoming video through lens
        {
          id: 'lens-reveal',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [incomingContainerId],
            ranges: [
              {
                key: 'clipPath',
                val: `circle(${lensSize}px at 0% 50%)`,
                prog: 0,
              },
              {
                key: 'clipPath',
                val: `circle(${lensSize}px at 25% 50%)`,
                prog: 0.25,
              },
              // Pause at 25%
              {
                key: 'clipPath',
                val: `circle(${lensSize}px at 25% 50%)`,
                prog: 0.25 + pauseDuration / transitionDuration,
              },
              {
                key: 'clipPath',
                val: `circle(${lensSize}px at 70% 50%)`,
                prog: 0.7,
              },
              // Pause at 75%
              {
                key: 'clipPath',
                val: `circle(${lensSize}px at 75% 50%)`,
                prog: 0.75,
              },
              {
                key: 'clipPath',
                val: `circle(${lensSize}px at 75% 50%)`,
                prog: 0.75 + pauseDuration / transitionDuration,
              },
              {
                key: 'clipPath',
                val: `circle(${lensSize}px at 100% 50%)`,
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Lens vignette overlay
    {
      id: 'csi-vignette-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 25,
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'vignette-circle',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; inset: 0; background: radial-gradient(circle ${lensSize}px at 0% 50%, transparent 0%, transparent ${
              lensSize - 20
            }px, rgba(0,0,0,${vignetteIntensity}) ${lensSize}px, transparent ${
              lensSize + 20
            }px);"></div>`,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            // Animate vignette position to follow lens
            {
              id: 'vignette-sweep',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['vignette-circle'],
                ranges: createSweepRanges(),
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'csi-forensic-magnifying-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: containerDuration,
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
  id: 'csi-forensic-magnifying-glass-transition',
  title: 'CSI Forensic Magnifying Glass Transition',
  description:
    'A CSI-style forensic magnifying glass transition that scans horizontally across the frame, revealing the incoming video with enhanced detail while desaturating the surrounding areas. Features variable speed sweep with pause effects at key moments.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'csi',
    'forensic',
    'magnifying-glass',
    'lens',
    'detail',
    'video',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/crime-scene-1.mp4',
      duration: 8,
    },
    incomingVideo: {
      src: 'https://example.com/crime-scene-2.mp4',
      duration: 8,
    },
    transitionDuration: 3,
    lensSize: 180,
    lensBrightness: 120,
    lensContrast: 115,
    outsideSaturation: 80,
    pauseDuration: 0.3,
    vignetteIntensity: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const csiForensicMagnifyingGlassTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
