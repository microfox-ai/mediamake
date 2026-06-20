/**
 * Prismatic Refraction Transition Preset
 *
 * This preset creates a stunning prismatic refraction transition effect where a quad-split video
 * appears to pass through a prism, separating into rainbow color spectrums (red, green, blue, luminance)
 * before recombining into the focused video at a convergence point.
 *
 * Features:
 * - **Color Separation**: Each panel transforms into different color channels using CSS filters
 * - **Refraction Physics**: Panels stretch and skew to simulate light bending through glass
 * - **Prismatic Trajectories**: Calculated bezier curves simulate light refraction paths
 * - **Chromatic Aberration**: Edge effects using box-shadow with red/blue color offsets
 * - **Lens Flare**: Radial gradient flare at convergence point with dynamic opacity
 * - **Screen Blend**: Mix-blend-mode transitions during convergence phase
 *
 * Technical Approach:
 * - Four VideoAtom panels in quad-split layout
 * - Each panel has unique color filter (sepia + hue-rotate or grayscale)
 * - Transform animations via generic effects: translateX/Y, skewX/Y, scale
 * - Three phases: Dispersion (0-0.8s), Prism Path (0.8-1.5s), Convergence (1.5-2.2s)
 * - Lens flare using HTMLBlockAtom with radial gradient
 * - Chromatic aberration via box-shadow effects
 *
 * Use cases:
 * - Creative video transitions with optical effects
 * - Music video visual effects
 * - Science/tech content transitions
 * - Artistic video presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  videoSrc: z.string().describe('Source URL of the video to display'),
  transitionDuration: z
    .number()
    .default(2.2)
    .describe('Total duration of the transition in seconds'),
  convergenceTime: z
    .number()
    .default(1.5)
    .describe('Time at which panels converge (within transition duration)'),
  refractionIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for refraction effects (skew, translation)'),
  lensFlareIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Peak opacity of the lens flare effect'),
  chromaticAberrationAmount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Amount of chromatic aberration offset in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videoSrc,
    transitionDuration,
    convergenceTime,
    refractionIntensity,
    lensFlareIntensity,
    chromaticAberrationAmount,
  } = params;

  // Calculate phase durations
  const dispersionDuration = 0.8;
  const prismPathDuration = convergenceTime - dispersionDuration;
  const convergenceDuration = transitionDuration - convergenceTime;

  // Helper function to create skew/refraction effects for a panel
  const createRefractionEffect = (
    panelId: string,
    maxSkew: number,
    translatePath: { x: number[]; y: number[] },
    scaleValues: number[],
  ) => {
    const effect = {
      id: `refraction-${panelId}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: transitionDuration,
        mode: 'provider' as const,
        targetIds: [panelId],
        ranges: [
          // Skew X (refraction bending)
          { key: 'skewX', val: 0, prog: 0 },
          { key: 'skewX', val: maxSkew * refractionIntensity, prog: 0.36 }, // Peak at 0.8s
          { key: 'skewX', val: 0, prog: 0.68 }, // Return to 0 at 1.5s
          { key: 'skewX', val: 0, prog: 1 },

          // Skew Y (vertical refraction)
          { key: 'skewY', val: 0, prog: 0 },
          {
            key: 'skewY',
            val: (maxSkew / 2) * refractionIntensity,
            prog: 0.36,
          },
          { key: 'skewY', val: 0, prog: 0.68 },
          { key: 'skewY', val: 0, prog: 1 },

          // Translation X (prismatic path)
          { key: 'translateX', val: 0, prog: 0 },
          {
            key: 'translateX',
            val: `${translatePath.x[0] * refractionIntensity}px`,
            prog: 0.36,
          },
          {
            key: 'translateX',
            val: `${translatePath.x[1] * refractionIntensity}px`,
            prog: 0.68,
          },
          { key: 'translateX', val: '0px', prog: 1 },

          // Translation Y (prismatic path)
          { key: 'translateY', val: 0, prog: 0 },
          {
            key: 'translateY',
            val: `${translatePath.y[0] * refractionIntensity}px`,
            prog: 0.36,
          },
          {
            key: 'translateY',
            val: `${translatePath.y[1] * refractionIntensity}px`,
            prog: 0.68,
          },
          { key: 'translateY', val: '0px', prog: 1 },

          // Scale (perspective changes)
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: scaleValues[0], prog: 0.36 },
          { key: 'scale', val: scaleValues[1], prog: 0.68 },
          { key: 'scale', val: 1, prog: 1 },

          // Opacity
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.68 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };
    return effect;
  };

  // Helper function to create blend mode transition effect
  const createBlendModeEffect = (panelId: string) => {
    const effect = {
      id: `blend-${panelId}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: convergenceTime - 0.2,
        duration: convergenceDuration + 0.2,
        mode: 'provider' as const,
        targetIds: [panelId],
        ranges: [
          { key: 'mixBlendMode', val: 'normal', prog: 0 },
          { key: 'mixBlendMode', val: 'screen', prog: 0.3 },
          { key: 'mixBlendMode', val: 'screen', prog: 0.7 },
          { key: 'mixBlendMode', val: 'normal', prog: 1 },
        ],
      },
    };
    return effect;
  };

  // Helper function to create chromatic aberration effect
  const createChromaticAberrationEffect = (panelId: string) => {
    const offset = chromaticAberrationAmount;
    const effect = {
      id: `chromatic-${panelId}`,
      componentId: 'generic' as const,
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: convergenceTime,
        mode: 'provider' as const,
        targetIds: [panelId],
        ranges: [
          { key: 'filter', val: 'drop-shadow(0px 0px 0px transparent)', prog: 0 },
          {
            key: 'filter',
            val: `drop-shadow(${offset}px 0px 0px rgba(255,0,0,0.5)) drop-shadow(-${offset}px 0px 0px rgba(0,0,255,0.5))`,
            prog: 0.5,
          },
          { key: 'filter', val: 'drop-shadow(0px 0px 0px transparent)', prog: 1 },
        ],
      },
    };
    return effect;
  };

  // Create four video panels
  const panel1: RenderableComponentData = {
    id: 'video-panel-1',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: videoSrc,
      className: 'absolute w-1/2 h-1/2 object-cover',
      style: {
        filter: 'sepia(1) hue-rotate(0deg)',
        top: 0,
        left: 0,
      },
      fit: 'cover' as const,
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      createRefractionEffect(
        'video-panel-1',
        15,
        { x: [-80, -40], y: [-60, -30] },
        [0.95, 0.98],
      ),
      createBlendModeEffect('video-panel-1'),
      createChromaticAberrationEffect('video-panel-1'),
    ],
  };

  const panel2: RenderableComponentData = {
    id: 'video-panel-2',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: videoSrc,
      className: 'absolute w-1/2 h-1/2 object-cover',
      style: {
        filter: 'sepia(1) hue-rotate(120deg)',
        top: 0,
        right: 0,
      },
      fit: 'cover' as const,
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      createRefractionEffect(
        'video-panel-2',
        -15,
        { x: [80, 40], y: [-60, -30] },
        [0.95, 0.98],
      ),
      createBlendModeEffect('video-panel-2'),
      createChromaticAberrationEffect('video-panel-2'),
    ],
  };

  const panel3: RenderableComponentData = {
    id: 'video-panel-3',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: videoSrc,
      className: 'absolute w-1/2 h-1/2 object-cover',
      style: {
        filter: 'sepia(1) hue-rotate(240deg)',
        bottom: 0,
        left: 0,
      },
      fit: 'cover' as const,
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      createRefractionEffect(
        'video-panel-3',
        15,
        { x: [-80, -40], y: [60, 30] },
        [0.95, 0.98],
      ),
      createBlendModeEffect('video-panel-3'),
      createChromaticAberrationEffect('video-panel-3'),
    ],
  };

  const panel4: RenderableComponentData = {
    id: 'video-panel-4',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: videoSrc,
      className: 'absolute w-1/2 h-1/2 object-cover',
      style: {
        filter: 'grayscale(1)',
        bottom: 0,
        right: 0,
      },
      fit: 'cover' as const,
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      createRefractionEffect(
        'video-panel-4',
        -15,
        { x: [80, 40], y: [60, 30] },
        [0.95, 0.98],
      ),
      createBlendModeEffect('video-panel-4'),
      createChromaticAberrationEffect('video-panel-4'),
    ],
  };

  // Lens flare effect
  const lensFlare: RenderableComponentData = {
    id: 'lens-flare',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,${lensFlareIntensity}) 0%, rgba(255,200,150,${lensFlareIntensity * 0.5}) 30%, transparent 70%);"></div>`,
      className: 'absolute',
      style: {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
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
        id: 'lens-flare-opacity',
        componentId: 'generic' as const,
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: ['lens-flare'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.5 }, // 1.1s
            { key: 'opacity', val: 1, prog: 0.68 }, // 1.5s (convergence)
            { key: 'opacity', val: 0.3, prog: 0.85 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const rootContainer: RenderableComponentData = {
    id: 'prismatic-refraction-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gray-900',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [panel1, panel2, panel3, panel4, lensFlare],
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
  id: 'prismatic-refraction-transition',
  title: 'Prismatic Refraction Transition',
  description:
    'A quad-split video transition that simulates light passing through a prism, separating into rainbow spectrums (red, green, blue, luminance) before recombining at a focal point with chromatic aberration and lens flare effects',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'prismatic',
    'refraction',
    'quad-split',
    'color-separation',
    'lens-flare',
    'chromatic-aberration',
    'optical-effects',
  ],
  defaultInputParams: {
    videoSrc: 'https://example.com/video.mp4',
    transitionDuration: 2.2,
    convergenceTime: 1.5,
    refractionIntensity: 1,
    lensFlareIntensity: 0.8,
    chromaticAberrationAmount: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const prismaticRefractionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
