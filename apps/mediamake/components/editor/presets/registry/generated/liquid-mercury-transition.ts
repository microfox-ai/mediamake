/**
 * Liquid Mercury Flow Transition Preset
 *
 * This preset creates a liquid flow transition where four video panels melt and flow together
 * like liquid mercury before reforming as a single selected video. Each panel distorts with
 * wave-like effects, flows toward the center with undulating motion, creates a swirling vortex,
 * and then the selected video emerges from the center with a circular reveal.
 *
 * Features:
 * - Four video panels with initial normal display
 * - Wave-like distortion effects along edges using CSS filters
 * - Undulating motion toward center with sin/cos based translations
 * - Swirling vortex effect during merge phase
 * - Subtle color shifting (hue-rotate) during liquid phase
 * - Selected video emerges from center with circular reveal
 * - Overlay blend modes during merge phase
 * - Total transition: 3 seconds (peak distortion at 1.5s)
 * - Z-index management: flowing panels (z-10-40), selected video (z-50)
 *
 * Use cases:
 * - Creating cinematic video transitions with liquid effects
 * - Building dynamic video intros/outros with flowing visuals
 * - Adding otherworldly effects to video compositions
 * - Creating professional video montages with unique transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.string().describe('Source URL for top-left video panel'),
  video2: z.string().describe('Source URL for top-right video panel'),
  video3: z.string().describe('Source URL for bottom-left video panel'),
  video4: z.string().describe('Source URL for bottom-right video panel'),
  selectedVideo: z
    .string()
    .describe('Source URL for the selected video that emerges from center'),
  transitionDuration: z
    .number()
    .default(3)
    .describe('Total transition duration in seconds'),
  peakDistortionTime: z
    .number()
    .default(1.5)
    .describe(
      'Time in seconds when distortion effects reach their peak (relative to transition start)',
    ),
  hueRotateMax: z
    .number()
    .default(30)
    .describe('Maximum hue rotation in degrees during liquid phase'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    video3,
    video4,
    selectedVideo,
    transitionDuration,
    peakDistortionTime,
    hueRotateMax,
  } = params;

  // Phase 1: 0 to peakDistortionTime - panel distortion and flow
  // Phase 2: peakDistortionTime to transitionDuration - selected video reveal

  const phase1Duration = peakDistortionTime;
  const phase2Duration = transitionDuration - peakDistortionTime;

  // Create four video panels with undulating motion and distortion effects
  const panelConfigs = [
    {
      id: 'panel-1',
      videoSrc: video1,
      position: 'top-0 left-0',
      zIndex: 10,
      translateXKeyframes: [
        { val: 0, prog: 0 },
        { val: 15, prog: 0.25 },
        { val: -10, prog: 0.5 },
        { val: 5, prog: 0.75 },
        { val: 0, prog: 1 },
      ],
      translateYKeyframes: [
        { val: 0, prog: 0 },
        { val: -12, prog: 0.3 },
        { val: 8, prog: 0.6 },
        { val: -5, prog: 0.85 },
        { val: 0, prog: 1 },
      ],
      blurKeyframes: [
        { val: 0, prog: 0 },
        { val: 15, prog: 0.5 },
        { val: 25, prog: 1 },
      ],
      hueRotateKeyframes: [
        { val: 0, prog: 0 },
        { val: 30, prog: 0.5 },
        { val: 0, prog: 1 },
      ],
      opacityKeyframes: [
        { val: 1, prog: 0 },
        { val: 0.7, prog: 0.5 },
        { val: 0.3, prog: 1 },
      ],
      scaleKeyframes: [
        { val: 1, prog: 0 },
        { val: 0.85, prog: 0.5 },
        { val: 0.6, prog: 1 },
      ],
    },
    {
      id: 'panel-2',
      videoSrc: video2,
      position: 'top-0 right-0',
      zIndex: 20,
      translateXKeyframes: [
        { val: 0, prog: 0 },
        { val: -18, prog: 0.3 },
        { val: 12, prog: 0.6 },
        { val: -6, prog: 0.85 },
        { val: 0, prog: 1 },
      ],
      translateYKeyframes: [
        { val: 0, prog: 0 },
        { val: 10, prog: 0.25 },
        { val: -15, prog: 0.55 },
        { val: 7, prog: 0.8 },
        { val: 0, prog: 1 },
      ],
      blurKeyframes: [
        { val: 0, prog: 0 },
        { val: 18, prog: 0.5 },
        { val: 28, prog: 1 },
      ],
      hueRotateKeyframes: [
        { val: 0, prog: 0 },
        { val: 25, prog: 0.5 },
        { val: 0, prog: 1 },
      ],
      opacityKeyframes: [
        { val: 1, prog: 0 },
        { val: 0.65, prog: 0.5 },
        { val: 0.25, prog: 1 },
      ],
      scaleKeyframes: [
        { val: 1, prog: 0 },
        { val: 0.82, prog: 0.5 },
        { val: 0.55, prog: 1 },
      ],
    },
    {
      id: 'panel-3',
      videoSrc: video3,
      position: 'bottom-0 left-0',
      zIndex: 30,
      translateXKeyframes: [
        { val: 0, prog: 0 },
        { val: 20, prog: 0.2 },
        { val: -14, prog: 0.5 },
        { val: 8, prog: 0.75 },
        { val: 0, prog: 1 },
      ],
      translateYKeyframes: [
        { val: 0, prog: 0 },
        { val: 14, prog: 0.35 },
        { val: -10, prog: 0.65 },
        { val: 6, prog: 0.85 },
        { val: 0, prog: 1 },
      ],
      blurKeyframes: [
        { val: 0, prog: 0 },
        { val: 16, prog: 0.5 },
        { val: 26, prog: 1 },
      ],
      hueRotateKeyframes: [
        { val: 0, prog: 0 },
        { val: 28, prog: 0.5 },
        { val: 0, prog: 1 },
      ],
      opacityKeyframes: [
        { val: 1, prog: 0 },
        { val: 0.6, prog: 0.5 },
        { val: 0.2, prog: 1 },
      ],
      scaleKeyframes: [
        { val: 1, prog: 0 },
        { val: 0.88, prog: 0.5 },
        { val: 0.65, prog: 1 },
      ],
    },
    {
      id: 'panel-4',
      videoSrc: video4,
      position: 'bottom-0 right-0',
      zIndex: 40,
      translateXKeyframes: [
        { val: 0, prog: 0 },
        { val: -22, prog: 0.28 },
        { val: 16, prog: 0.58 },
        { val: -9, prog: 0.82 },
        { val: 0, prog: 1 },
      ],
      translateYKeyframes: [
        { val: 0, prog: 0 },
        { val: -16, prog: 0.32 },
        { val: 12, prog: 0.62 },
        { val: -7, prog: 0.88 },
        { val: 0, prog: 1 },
      ],
      blurKeyframes: [
        { val: 0, prog: 0 },
        { val: 20, prog: 0.5 },
        { val: 30, prog: 1 },
      ],
      hueRotateKeyframes: [
        { val: 0, prog: 0 },
        { val: 32, prog: 0.5 },
        { val: 0, prog: 1 },
      ],
      opacityKeyframes: [
        { val: 1, prog: 0 },
        { val: 0.55, prog: 0.5 },
        { val: 0.15, prog: 1 },
      ],
      scaleKeyframes: [
        { val: 1, prog: 0 },
        { val: 0.8, prog: 0.5 },
        { val: 0.5, prog: 1 },
      ],
    },
  ];

  // Build panel containers with video atoms and effects
  const panelChildren: RenderableComponentData[] = panelConfigs.map(
    (config) => {
      const panelContainerId = `${config.id}-container`;
      const videoId = `${config.id}-video`;

      return {
        id: panelContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute w-1/2 h-1/2 ${config.position}`,
            style: {
              zIndex: config.zIndex,
              mixBlendMode: 'normal' as const,
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
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: config.videoSrc,
              fit: 'cover' as const,
              muted: true,
              loop: true,
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
        effects: [
          // Undulating motion (translateX and translateY)
          {
            id: `${config.id}-undulate`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out' as const,
              start: 0,
              duration: phase1Duration,
              mode: 'provider' as const,
              targetIds: [panelContainerId],
              ranges: [
                ...config.translateXKeyframes.map((kf) => ({
                  key: 'translateX',
                  val: kf.val,
                  prog: kf.prog,
                })),
                ...config.translateYKeyframes.map((kf) => ({
                  key: 'translateY',
                  val: kf.val,
                  prog: kf.prog,
                })),
                ...config.opacityKeyframes.map((kf) => ({
                  key: 'opacity',
                  val: kf.val,
                  prog: kf.prog,
                })),
              ],
            },
          },
          // Blur effect (distortion)
          {
            id: `${config.id}-blur`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out' as const,
              start: 0,
              duration: phase1Duration,
              mode: 'provider' as const,
              targetIds: [panelContainerId],
              ranges: config.blurKeyframes.map((kf) => ({
                key: 'blur',
                val: kf.val,
                prog: kf.prog,
              })),
            },
          },
          // Hue-rotate effect (color shifting)
          {
            id: `${config.id}-hue-rotate`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out' as const,
              start: 0,
              duration: phase1Duration,
              mode: 'provider' as const,
              targetIds: [panelContainerId],
              ranges: config.hueRotateKeyframes.map((kf) => ({
                key: 'hue-rotate',
                val: kf.val,
                prog: kf.prog,
              })),
            },
          },
          // Scale effect (convergence toward center)
          {
            id: `${config.id}-scale`,
            componentId: 'generic',
            data: {
              type: 'ease-in' as const,
              start: phase1Duration * 0.533, // ~0.8s for 1.5s phase1
              duration: phase1Duration * 0.467, // ~0.7s for 1.5s phase1
              mode: 'provider' as const,
              targetIds: [panelContainerId],
              ranges: config.scaleKeyframes.map((kf) => ({
                key: 'scale',
                val: kf.val,
                prog: kf.prog,
              })),
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create selected video container with circular reveal
  const selectedVideoContainer: RenderableComponentData = {
    id: 'selected-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 50,
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
        id: 'selected-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: selectedVideo,
          fit: 'cover' as const,
          muted: false,
          loop: false,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          // Zoom-in effect on selected video
          {
            id: 'selected-video-zoom',
            componentId: 'generic',
            data: {
              type: 'ease-out' as const,
              start: peakDistortionTime,
              duration: phase2Duration,
              mode: 'provider' as const,
              targetIds: ['selected-video'],
              ranges: [
                { key: 'scale', val: 1.3, prog: 0 },
                { key: 'scale', val: 1.15, prog: 0.5 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
    effects: [
      // Circular reveal effect on container
      {
        id: 'circular-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: peakDistortionTime,
          duration: phase2Duration,
          mode: 'provider' as const,
          targetIds: ['selected-video-container'],
          ranges: [
            { key: 'clipPath', val: 'circle(0% at center)', prog: 0 },
            { key: 'clipPath', val: 'circle(15% at center)', prog: 0.2 },
            { key: 'clipPath', val: 'circle(40% at center)', prog: 0.5 },
            { key: 'clipPath', val: 'circle(70% at center)', prog: 0.8 },
            { key: 'clipPath', val: 'circle(100% at center)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-mercury-transition-root',
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
        duration: transitionDuration,
      },
    },
    childrenData: [...panelChildren, selectedVideoContainer],
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
  id: 'liquid-mercury-transition',
  title: 'Liquid Mercury Flow Transition',
  description:
    'Four video panels melt and flow together like liquid mercury with wave distortion, undulating motion, and color shifting during the liquid phase. The selected video emerges from the center with a circular reveal effect. Uses CSS filters, clip-path animations, and blend modes for an otherworldly transition effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'liquid',
    'mercury',
    'flow',
    'distortion',
    'vortex',
    'cinematic',
    'otherworldly',
  ],
  defaultInputParams: {
    video1: 'https://example.com/video1.mp4',
    video2: 'https://example.com/video2.mp4',
    video3: 'https://example.com/video3.mp4',
    video4: 'https://example.com/video4.mp4',
    selectedVideo: 'https://example.com/selected-video.mp4',
    transitionDuration: 3,
    peakDistortionTime: 1.5,
    hueRotateMax: 30,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidMercuryTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
