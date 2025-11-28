/**
 * Film Burn Projector Transition Preset
 *
 * Simulates the effect of a film slide getting stuck in a hot projector and burning away
 * to reveal the next image. Creates a realistic film burn transition with heat distortion,
 * color shifts, and organic burn-away patterns.
 *
 * Features:
 * - **Heat Distortion Phase**: Progressive hue rotation, brightness, and contrast increase
 * - **Color Shifts**: Transitions to orange/white tones simulating burning film
 * - **Organic Burn Pattern**: Radial gradient mask animation creates natural burn-away effect
 * - **Scale Warping**: Subtle scale pulsing during peak burn intensity
 * - **Optional Smoke/Heat Shimmer**: Overlaid smoke texture with fade in/out
 * - **Layered Composition**: Incoming video revealed underneath as outgoing burns away
 *
 * Technical Implementation:
 * - Phase 1 (0-0.3s): Heat distortion builds with filter effects
 * - Phase 2 (0.3s-0.7s): Burn-away mask animation with radial gradient
 * - Scale warp effect pulses during transition (0.3s-0.5s)
 * - All timings are relative to transition container start
 *
 * Use cases:
 * - Creating vintage film projector effects
 * - Dramatic scene transitions with analog aesthetic
 * - Simulating film damage or overheating
 * - Adding retro/nostalgic visual style to videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video that will burn away'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video revealed underneath'),
  transitionDuration: z
    .number()
    .default(0.7)
    .describe('Total duration of the burn transition in seconds'),
  heatDistortionDuration: z
    .number()
    .default(0.3)
    .describe('Duration of initial heat distortion phase in seconds'),
  heatIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for heat distortion effects (hue, brightness, contrast)'),
  burnPattern: z
    .enum(['radial-center', 'radial-corner', 'radial-bottom'])
    .default('radial-center')
    .describe('Pattern for the burn-away mask animation'),
  scaleWarpIntensity: z
    .number()
    .min(1)
    .max(1.2)
    .default(1.05)
    .describe('Scale intensity during peak burn (1 = no warp, 1.05 = 5% warp)'),
  enableSmoke: z
    .boolean()
    .default(false)
    .describe('Enable optional smoke/heat shimmer overlay effect'),
  videoFit: z
    .enum(['cover', 'contain', 'fill'])
    .default('cover')
    .describe('How videos should fit within the container'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    heatDistortionDuration,
    heatIntensity,
    burnPattern,
    scaleWarpIntensity,
    enableSmoke,
    videoFit,
  } = params;

  // Helper: Generate clip-path values based on burn pattern
  const getClipPathKeyframes = (): Array<{ val: string; prog: number }> => {
    if (burnPattern === 'radial-center') {
      return [
        { val: 'circle(100% at 50% 50%)', prog: 0 },
        { val: 'circle(70% at 50% 50%)', prog: 0.3 },
        { val: 'circle(40% at 50% 50%)', prog: 0.6 },
        { val: 'circle(0% at 50% 50%)', prog: 1 },
      ];
    } else if (burnPattern === 'radial-corner') {
      return [
        { val: 'circle(100% at 80% 20%)', prog: 0 },
        { val: 'circle(70% at 80% 20%)', prog: 0.3 },
        { val: 'circle(40% at 80% 20%)', prog: 0.6 },
        { val: 'circle(0% at 80% 20%)', prog: 1 },
      ];
    } else {
      // radial-bottom
      return [
        { val: 'circle(100% at 50% 100%)', prog: 0 },
        { val: 'circle(70% at 50% 100%)', prog: 0.3 },
        { val: 'circle(40% at 50% 100%)', prog: 0.6 },
        { val: 'circle(0% at 50% 100%)', prog: 1 },
      ];
    }
  };

  // Calculate burn-away phase timing
  const burnAwayStart = heatDistortionDuration;
  const burnAwayDuration = transitionDuration - heatDistortionDuration;

  // Scale warp timing (during burn-away phase)
  const scaleWarpStart = burnAwayStart;
  const scaleWarpDuration = Math.min(0.2, burnAwayDuration * 0.5);

  // Incoming video layer (z-0, static, revealed as outgoing burns)
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 0,
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
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: videoFit,
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

  // Outgoing video layer (z-1, with burn effects)
  const outgoingVideoLayer: RenderableComponentData = {
    id: 'outgoing-video-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
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
      // Phase 1: Heat distortion (hue-rotate, brightness, contrast)
      {
        id: 'heat-distortion-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: heatDistortionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            {
              key: 'filter',
              val: 'hue-rotate(0deg) brightness(1) contrast(1)',
              prog: 0,
            },
            {
              key: 'filter',
              val: `hue-rotate(${30 * heatIntensity}deg) brightness(${1 + heatIntensity}) contrast(${1 + 0.5 * heatIntensity})`,
              prog: 1,
            },
          ],
        },
      },
      // Phase 2: Burn-away mask (clip-path animation)
      {
        id: 'burn-away-mask-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: burnAwayStart,
          duration: burnAwayDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: getClipPathKeyframes().map((kf) => ({
            key: 'clipPath',
            val: kf.val,
            prog: kf.prog,
          })),
        },
      },
      // Scale warp effect (pulse during burn)
      {
        id: 'scale-warp-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: scaleWarpStart,
          duration: scaleWarpDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: scaleWarpIntensity, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: videoFit,
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

  // Optional smoke overlay (z-2)
  const smokeOverlay: RenderableComponentData | null = enableSmoke
    ? {
        id: 'smoke-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              zIndex: 2,
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
        effects: [
          // Fade in smoke
          {
            id: 'smoke-fade-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0.2,
              duration: 0.3,
              mode: 'provider',
              targetIds: ['smoke-overlay'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 1 },
              ],
            },
          },
          // Fade out smoke
          {
            id: 'smoke-fade-out',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0.5,
              duration: 0.2,
              mode: 'provider',
              targetIds: ['smoke-overlay'],
              ranges: [
                { key: 'opacity', val: 0.8, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: 'smoke-effect-element',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: '<div style="width: 100%; height: 100%; background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,140,0,0.2) 40%, transparent 70%);"></div>',
              className: 'w-full h-full',
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          } as RenderableComponentData,
        ],
      }
    : null;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'film-burn-transition-root',
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
      incomingVideoLayer,
      outgoingVideoLayer,
      ...(smokeOverlay ? [smokeOverlay] : []),
    ] as RenderableComponentData[],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'film-burn-projector-transition',
  title: 'Film Burn Projector Transition',
  description:
    'Simulates a film slide getting stuck in a hot projector and burning away. Features heat distortion with color shifts (hue-rotate, brightness, contrast), organic burn-away mask animation using radial clip-path gradients, and optional smoke/shimmer effects. The outgoing video burns away to reveal the incoming video underneath.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'film',
    'burn',
    'projector',
    'vintage',
    'heat',
    'distortion',
    'mask',
    'organic',
    'analog',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    transitionDuration: 0.7,
    heatDistortionDuration: 0.3,
    heatIntensity: 1,
    burnPattern: 'radial-center',
    scaleWarpIntensity: 1.05,
    enableSmoke: false,
    videoFit: 'cover',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const filmBurnProjectorTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
