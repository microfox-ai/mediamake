/**
 * Liquid Page Melt Transition Preset
 *
 * This preset creates a dramatic liquid page melt transition where the outgoing video appears to
 * liquefy and drip away from top to bottom, revealing the incoming video underneath. The effect
 * features varying viscosity drips, glossy reflections, surface tension effects, pooling at the
 * bottom, wet reveal with evaporating droplets, and splash effects on impact.
 *
 * Features:
 * - **Variable Viscosity Drips**: Different drip lanes fall at varying speeds for realistic flow
 * - **Liquification Effect**: Progressive blur and mask animation creates melting appearance
 * - **Glossy Reflections**: Gradient overlays on drips simulate light reflections on liquid surfaces
 * - **Surface Tension**: Thin strands that try to hold together before breaking apart
 * - **Bottom Pooling**: Liquid accumulates at the bottom with a glossy surface
 * - **Wet Reveal**: Incoming video appears wet with brightness and blur effects that fade
 * - **Water Droplets**: Randomly placed droplets that scale down and evaporate
 * - **Splash Effects**: Particles that bounce when large drips hit the pool
 * - **Configurable Overlap**: Adjustable transition duration with default 2.3 seconds
 *
 * Use cases:
 * - Dramatic scene transitions in cinematic videos
 * - Creative page transitions for web video content
 * - Liquid-themed motion graphics and title sequences
 * - Abstract artistic video transitions
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
    .default(2.3)
    .describe('Duration of the liquid melt transition overlap in seconds'),
  dripCount: z
    .number()
    .min(3)
    .max(12)
    .default(8)
    .describe('Number of drip lanes across the screen'),
  dropletCount: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Number of water droplets on the incoming video'),
  splashCount: z
    .number()
    .min(3)
    .max(10)
    .default(5)
    .describe('Number of splash particles per drip impact'),
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
    dripCount,
    dropletCount,
    splashCount,
  } = params;

  // Calculate total duration
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Helper: Generate random value in range
  const randomRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate drip lanes with varying viscosity
  const generateDripLanes = (): RenderableComponentData[] => {
    const lanes: RenderableComponentData[] = [];

    for (let i = 0; i < dripCount; i++) {
      const laneId = `drip-lane-${i}`;
      const leftPosition = (i / (dripCount - 1)) * 100; // Evenly distribute
      const viscosity = randomRange(0.6, 1.4); // Varying speeds
      const dripDuration = transitionDuration * viscosity;
      const dripStartDelay = randomRange(0, 0.3); // Staggered start
      const dripWidth = randomRange(3, 8); // Width in percentage

      lanes.push({
        id: laneId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              left: `${leftPosition}%`,
              top: '0%',
              width: `${dripWidth}%`,
              height: '10%',
              background: `linear-gradient(180deg, 
                rgba(100, 150, 200, 0.8) 0%, 
                rgba(120, 170, 220, 0.6) 50%, 
                rgba(140, 190, 240, 0.4) 100%)`,
              borderRadius: '0 0 50% 50%',
              filter: 'blur(2px)',
              zIndex: 25,
            },
          },
        },
        context: {
          timing: {
            start: outgoingVideo.duration - transitionDuration + dripStartDelay,
            duration: dripDuration,
          },
        },
        effects: [
          {
            id: `${laneId}-drip-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: dripDuration,
              mode: 'provider',
              targetIds: [laneId],
              ranges: [
                { key: 'translateY', val: '0vh', prog: 0 },
                { key: 'translateY', val: '100vh', prog: 1 },
                { key: 'scaleY', val: 1, prog: 0 },
                { key: 'scaleY', val: randomRange(2, 4), prog: 0.5 },
                { key: 'scaleY', val: randomRange(1.5, 2.5), prog: 1 },
                { key: 'opacity', val: 0.8, prog: 0 },
                { key: 'opacity', val: 0.6, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      } as RenderableComponentData);
    }

    return lanes;
  };

  // Helper: Generate surface tension strands
  const generateSurfaceTensionStrands = (): RenderableComponentData[] => {
    const strands: RenderableComponentData[] = [];
    const strandCount = Math.floor(dripCount * 0.6); // 60% of drip count

    for (let i = 0; i < strandCount; i++) {
      const strandId = `tension-strand-${i}`;
      const leftPosition = randomRange(10, 90);
      const topPosition = randomRange(20, 60);
      const breakTime = randomRange(0.4, 0.8) * transitionDuration;

      strands.push({
        id: strandId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              left: `${leftPosition}%`,
              top: `${topPosition}%`,
              width: '2px',
              height: '40px',
              background: 'rgba(150, 190, 230, 0.5)',
              transformOrigin: 'top center',
              zIndex: 26,
            },
          },
        },
        context: {
          timing: {
            start:
              outgoingVideo.duration - transitionDuration + breakTime * 0.5,
            duration: breakTime,
          },
        },
        effects: [
          {
            id: `${strandId}-break-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: breakTime,
              mode: 'provider',
              targetIds: [strandId],
              ranges: [
                { key: 'scaleY', val: 1, prog: 0 },
                { key: 'scaleY', val: 0.3, prog: 0.6 },
                { key: 'scaleY', val: 0, prog: 1 },
                { key: 'opacity', val: 0.5, prog: 0 },
                { key: 'opacity', val: 0.7, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      } as RenderableComponentData);
    }

    return strands;
  };

  // Helper: Generate water droplets on incoming video
  const generateWaterDroplets = (): RenderableComponentData[] => {
    const droplets: RenderableComponentData[] = [];
    const evaporationStart = transitionDuration * 0.6; // Start evaporating at 60%
    const evaporationDuration = transitionDuration * 0.4;

    for (let i = 0; i < dropletCount; i++) {
      const dropletId = `droplet-${i}`;
      const leftPosition = randomRange(5, 95);
      const topPosition = randomRange(10, 90);
      const dropletSize = randomRange(8, 20);

      droplets.push({
        id: dropletId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              left: `${leftPosition}%`,
              top: `${topPosition}%`,
              width: `${dropletSize}px`,
              height: `${dropletSize}px`,
              background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(200,230,255,0.3) 70%, transparent 100%)',
              borderRadius: '50%',
              filter: 'blur(1px)',
              zIndex: 15,
            },
          },
        },
        context: {
          timing: {
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `${dropletId}-evaporate-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: evaporationStart,
              duration: evaporationDuration,
              mode: 'provider',
              targetIds: [dropletId],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0, prog: 1 },
                { key: 'opacity', val: 0.6, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      } as RenderableComponentData);
    }

    return droplets;
  };

  // Helper: Generate splash particles
  const generateSplashParticles = (): RenderableComponentData[] => {
    const splashes: RenderableComponentData[] = [];
    const splashTriggerTime = transitionDuration * 0.7; // Splashes trigger at 70%

    for (let i = 0; i < splashCount; i++) {
      const splashId = `splash-${i}`;
      const leftPosition = randomRange(15, 85);
      const particleSize = randomRange(4, 8);
      const bounceHeight = randomRange(30, 60);
      const bounceDuration = randomRange(0.3, 0.5);

      splashes.push({
        id: splashId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              left: `${leftPosition}%`,
              bottom: '15%',
              width: `${particleSize}px`,
              height: `${particleSize}px`,
              background: 'radial-gradient(circle, rgba(150,200,255,0.8) 0%, rgba(100,150,200,0.4) 100%)',
              borderRadius: '50%',
              zIndex: 31,
            },
          },
        },
        context: {
          timing: {
            start: outgoingVideo.duration - transitionDuration + splashTriggerTime,
            duration: bounceDuration,
          },
        },
        effects: [
          {
            id: `${splashId}-bounce-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: bounceDuration,
              mode: 'provider',
              targetIds: [splashId],
              ranges: [
                { key: 'translateY', val: '0px', prog: 0 },
                { key: 'translateY', val: `-${bounceHeight}px`, prog: 0.5 },
                { key: 'translateY', val: '0px', prog: 1 },
                { key: 'opacity', val: 0.8, prog: 0 },
                { key: 'opacity', val: 0.6, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      } as RenderableComponentData);
    }

    return splashes;
  };

  // Build drip lanes, tension strands, droplets, and splashes
  const dripLanes = generateDripLanes();
  const tensionStrands = generateSurfaceTensionStrands();
  const waterDroplets = generateWaterDroplets();
  const splashParticles = generateSplashParticles();

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-melt-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Incoming video layer (bottom, revealed as outgoing melts)
      {
        id: 'incoming-video-layer',
        type: 'layout',
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
            start: outgoingVideo.duration - transitionDuration,
            duration: incomingVideo.duration + transitionDuration,
          },
        },
        childrenData: [
          // Incoming video
          {
            id: 'incoming-video',
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: incomingVideo.src,
              className: 'w-full h-full object-cover',
              fit: 'cover',
            },
            context: {
              timing: {
                start: 0,
                duration: incomingVideo.duration + transitionDuration,
              },
            },
            effects: [
              {
                id: 'incoming-wet-effect',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: transitionDuration * 0.6,
                  mode: 'provider',
                  targetIds: ['incoming-video'],
                  ranges: [
                    { key: 'brightness', val: 1.3, prog: 0 },
                    { key: 'brightness', val: 1, prog: 1 },
                    { key: 'blur', val: '2px', prog: 0 },
                    { key: 'blur', val: '0px', prog: 1 },
                  ],
                },
              },
            ],
            childrenData: [],
          } as RenderableComponentData,
          // Water droplets container
          {
            id: 'droplets-container',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0',
                style: {
                  pointerEvents: 'none',
                  zIndex: 15,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
            childrenData: waterDroplets,
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,

      // Outgoing video layer (top, melts away)
      {
        id: 'outgoing-video-layer',
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
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
        childrenData: [
          // Outgoing video
          {
            id: 'outgoing-video',
            type: 'atom',
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
              // Liquify effect: progressive blur and mask reveal
              {
                id: 'liquify-mask-effect',
                componentId: 'generic',
                data: {
                  type: 'ease-in',
                  start: outgoingVideo.duration - transitionDuration,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: ['outgoing-video'],
                  ranges: [
                    { key: 'blur', val: '0px', prog: 0 },
                    { key: 'blur', val: '3px', prog: 1 },
                    {
                      key: 'clipPath',
                      val: 'inset(0% 0% 0% 0%)',
                      prog: 0,
                    },
                    {
                      key: 'clipPath',
                      val: 'inset(0% 0% 100% 0%)',
                      prog: 1,
                    },
                  ],
                },
              },
            ],
            childrenData: [],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,

      // Drip effects layer
      {
        id: 'drip-effects-layer',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 25,
              pointerEvents: 'none',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [...dripLanes, ...tensionStrands],
      } as RenderableComponentData,

      // Pool layer (bottom)
      {
        id: 'pool-layer',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute bottom-0 left-0 right-0',
            style: {
              zIndex: 30,
              height: '15%',
            },
          },
        },
        context: {
          timing: {
            start: outgoingVideo.duration - transitionDuration + transitionDuration * 0.3,
            duration: transitionDuration * 0.7,
          },
        },
        childrenData: [
          // Pool surface
          {
            id: 'pool-surface',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0',
                style: {
                  background: 'linear-gradient(to top, rgba(100,150,200,0.6), transparent)',
                  borderRadius: '50% 50% 0 0 / 20% 20% 0 0',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration * 0.7,
              },
            },
            effects: [
              {
                id: 'pool-accumulate-effect',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: transitionDuration * 0.4,
                  mode: 'provider',
                  targetIds: ['pool-surface'],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 0.8, prog: 0.5 },
                    { key: 'opacity', val: 0.6, prog: 1 },
                  ],
                },
              },
              {
                id: 'pool-disappear-effect',
                componentId: 'generic',
                data: {
                  type: 'ease-in',
                  start: transitionDuration * 0.4,
                  duration: transitionDuration * 0.3,
                  mode: 'provider',
                  targetIds: ['pool-surface'],
                  ranges: [
                    { key: 'opacity', val: 0.6, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
            childrenData: [],
          } as RenderableComponentData,

          // Splash container
          {
            id: 'splash-container',
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
                duration: transitionDuration * 0.7,
              },
            },
            childrenData: splashParticles,
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
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
  id: 'liquid-page-melt-transition',
  title: 'Liquid Page Melt Transition',
  description:
    'A dramatic liquid page melt transition where the video appears to liquefy and drip away from top to bottom, revealing the next video underneath with varying viscosity, glossy reflections, surface tension effects, pooling, wet reveal, and splash effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'liquid',
    'melt',
    'drip',
    'viscous',
    'glossy',
    'surface-tension',
    'pool',
    'splash',
    'wet-reveal',
    'cinematic',
    'creative',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      duration: 8,
    },
    transitionDuration: 2.3,
    dripCount: 8,
    dropletCount: 15,
    splashCount: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidPageMeltTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
