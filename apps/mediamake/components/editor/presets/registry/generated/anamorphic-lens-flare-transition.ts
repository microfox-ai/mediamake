/**
 * Cinematic Anamorphic Lens Flare Transition Preset
 *
 * A J.J. Abrams-inspired cinematic transition featuring horizontal anamorphic lens flare streaks,
 * hexagonal bokeh shapes, chromatic aberration at peak flash, and subtle film gate shake.
 * Creates an epic reveal effect as the incoming video emerges through dissipating lens flare elements.
 *
 * Features:
 * - Horizontal lens flare streaks that sweep across the frame
 * - Blue-tinted light artifacts and hexagonal bokeh shapes
 * - Chromatic aberration effects at flash peak (RGB channel split for prismatic effect)
 * - Brief whiteout at transition peak
 * - Incoming video reveals through dissipating lens flare
 * - Subtle film gate shake for authentic camera feel
 *
 * Technical Implementation:
 * - BaseLayout with 1.2s overlap duration
 * - Multiple HTMLBlockAtom layers for flare elements (gradients, shapes)
 * - Chromatic aberration via separate RGB HTMLBlockAtom layers with offset transforms and screen blend mode
 * - Outgoing video fades to 0.3 opacity during flash
 * - Incoming video starts at 0.3 opacity, rises to 1
 * - Film gate shake: BaseLayout transform with translateY ±2px
 * - backdrop-filter: blur on flare elements for glow effect
 *
 * Use cases:
 * - Creating epic cinematic transitions between video clips
 * - Adding J.J. Abrams-style lens flare transitions
 * - Building high-impact reveal moments
 * - Crafting professional sci-fi or action video transitions
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
    .default(1.2)
    .describe('Duration of the transition overlap in seconds'),
  flareIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for lens flare effects'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Intensity of film gate shake in pixels'),
  chromaticAberrationStrength: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Strength of chromatic aberration RGB split in pixels'),
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
    flareIntensity,
    shakeIntensity,
    chromaticAberrationStrength,
  } = params;

  // Calculate total duration
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Timing breakdown:
  // - Outgoing video: 0 to outgoingVideo.duration
  // - Incoming video: outgoingVideo.duration - transitionDuration to end
  // - Transition effects: centered around outgoingVideo.duration - transitionDuration/2

  const transitionStart = outgoingVideo.duration - transitionDuration;
  const flashPeakStart = transitionDuration * 0.4; // 40% into transition
  const flashPeakDuration = transitionDuration * 0.3; // 30% of transition

  // Outgoing video with fade out
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video with fade in
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: transitionStart,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.4 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Main flash burst (radial gradient)
  const mainFlashBurst: RenderableComponentData = {
    id: 'main-flash-burst',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at center, 
            rgba(255, 255, 255, ${0.9 * flareIntensity}) 0%, 
            rgba(180, 220, 255, ${0.6 * flareIntensity}) 20%, 
            rgba(100, 180, 255, ${0.3 * flareIntensity}) 40%, 
            transparent 70%
          );
          backdrop-filter: blur(8px);
          pointer-events: none;
        "></div>
      `,
      className: 'absolute inset-0',
      style: {
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'flash-burst-animation',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['main-flash-burst'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.4 },
            { key: 'opacity', val: 0.8, prog: 0.6 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1.5, prog: 0.5 },
            { key: 'scale', val: 2, prog: 1 },
          ],
        },
      },
    ],
  };

  // Horizontal flare streak
  const horizontalFlareStreak: RenderableComponentData = {
    id: 'horizontal-flare-streak',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <div style="
          position: absolute;
          top: 50%;
          left: -50%;
          transform: translateY(-50%);
          width: 200%;
          height: 4%;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(100, 180, 255, ${0.8 * flareIntensity}) 20%, 
            rgba(255, 255, 255, ${1 * flareIntensity}) 50%, 
            rgba(100, 180, 255, ${0.8 * flareIntensity}) 80%, 
            transparent 100%
          );
          backdrop-filter: blur(4px);
          box-shadow: 0 0 40px rgba(180, 220, 255, ${0.6 * flareIntensity});
          pointer-events: none;
        "></div>
      `,
      className: 'absolute inset-0',
      style: {
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'streak-sweep',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration * 0.8,
          mode: 'provider',
          targetIds: ['horizontal-flare-streak'],
          ranges: [
            { key: 'translateX', val: '-50%', prog: 0 },
            { key: 'translateX', val: '150%', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 0.8, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Hexagonal bokeh shapes
  const createHexagonPath = () =>
    'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

  const bokehShapes: RenderableComponentData[] = [
    {
      id: 'bokeh-hex-1',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `
          <div style="
            position: absolute;
            top: 30%;
            left: 20%;
            width: 80px;
            height: 80px;
            background: radial-gradient(circle, 
              rgba(180, 220, 255, ${0.6 * flareIntensity}), 
              transparent
            );
            clip-path: ${createHexagonPath()};
            filter: blur(2px);
            pointer-events: none;
          "></div>
        `,
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: transitionStart + transitionDuration * 0.2,
          duration: transitionDuration * 0.6,
        },
      },
      effects: [
        {
          id: 'bokeh-1-animation',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration * 0.6,
            mode: 'provider',
            targetIds: ['bokeh-hex-1'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 1.5, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'bokeh-hex-2',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `
          <div style="
            position: absolute;
            top: 50%;
            right: 15%;
            width: 60px;
            height: 60px;
            background: radial-gradient(circle, 
              rgba(180, 220, 255, ${0.5 * flareIntensity}), 
              transparent
            );
            clip-path: ${createHexagonPath()};
            filter: blur(3px);
            pointer-events: none;
          "></div>
        `,
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: transitionStart + transitionDuration * 0.25,
          duration: transitionDuration * 0.55,
        },
      },
      effects: [
        {
          id: 'bokeh-2-animation',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration * 0.55,
            mode: 'provider',
            targetIds: ['bokeh-hex-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 0.6, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.5 },
              { key: 'scale', val: 1.4, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'bokeh-hex-3',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `
          <div style="
            position: absolute;
            bottom: 25%;
            left: 40%;
            width: 50px;
            height: 50px;
            background: radial-gradient(circle, 
              rgba(180, 220, 255, ${0.4 * flareIntensity}), 
              transparent
            );
            clip-path: ${createHexagonPath()};
            filter: blur(4px);
            pointer-events: none;
          "></div>
        `,
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: transitionStart + transitionDuration * 0.3,
          duration: transitionDuration * 0.5,
        },
      },
      effects: [
        {
          id: 'bokeh-3-animation',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration * 0.5,
            mode: 'provider',
            targetIds: ['bokeh-hex-3'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 0.7, prog: 0 },
              { key: 'scale', val: 1, prog: 0.5 },
              { key: 'scale', val: 1.3, prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  // Chromatic aberration layers (RGB split)
  const chromaticRed: RenderableComponentData = {
    id: 'chromatic-red',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <div style="
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, 
            rgba(255, 0, 0, ${0.3 * flareIntensity}) 0%, 
            transparent 60%
          );
          pointer-events: none;
        "></div>
      `,
      className: 'absolute inset-0',
      style: {
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: transitionStart + flashPeakStart,
        duration: flashPeakDuration,
      },
    },
    effects: [
      {
        id: 'chromatic-red-shift',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: flashPeakDuration,
          mode: 'provider',
          targetIds: ['chromatic-red'],
          ranges: [
            {
              key: 'translateX',
              val: `${-chromaticAberrationStrength}px`,
              prog: 0,
            },
            { key: 'translateX', val: '0px', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const chromaticBlue: RenderableComponentData = {
    id: 'chromatic-blue',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <div style="
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, 
            rgba(0, 100, 255, ${0.3 * flareIntensity}) 0%, 
            transparent 60%
          );
          pointer-events: none;
        "></div>
      `,
      className: 'absolute inset-0',
      style: {
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: transitionStart + flashPeakStart,
        duration: flashPeakDuration,
      },
    },
    effects: [
      {
        id: 'chromatic-blue-shift',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: flashPeakDuration,
          mode: 'provider',
          targetIds: ['chromatic-blue'],
          ranges: [
            {
              key: 'translateX',
              val: `${chromaticAberrationStrength}px`,
              prog: 0,
            },
            { key: 'translateX', val: '0px', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Film gate shake container
  const flareEffectsLayer: RenderableComponentData = {
    id: 'flare-effects-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'film-gate-shake',
        componentId: 'shake',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['flare-effects-layer'],
          amplitude: shakeIntensity,
          frequency: 0.05,
          decay: false,
          axis: 'y',
        },
      },
    ],
    childrenData: [
      mainFlashBurst,
      horizontalFlareStreak,
      ...bokehShapes,
      chromaticRed,
      chromaticBlue,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'anamorphic-lens-flare-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideoNode, incomingVideoNode, flareEffectsLayer],
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
  id: 'anamorphic-lens-flare-transition',
  title: 'Cinematic Anamorphic Lens Flare Transition',
  description:
    "A J.J. Abrams-inspired cinematic transition featuring horizontal anamorphic lens flare streaks, hexagonal bokeh shapes, chromatic aberration at peak flash, and subtle film gate shake. Creates an epic reveal effect as the incoming video emerges through dissipating lens flare elements.",
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'lens-flare',
    'cinematic',
    'anamorphic',
    'chromatic-aberration',
    'bokeh',
    'epic',
    'jj-abrams',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 1.2,
    flareIntensity: 1,
    shakeIntensity: 2,
    chromaticAberrationStrength: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const anamorphicLensFlareTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
