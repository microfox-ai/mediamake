/**
 * Graffiti Spray Paint Transition Preset
 *
 * This preset creates a dynamic graffiti spray paint transition effect that reveals
 * the incoming clip as if being spray-painted onto a wall. It features realistic
 * spray paint dynamics including:
 * - Multiple burst-based reveal patterns (0.2s bursts with 0.1s pauses)
 * - Overspray blur effects around spray areas
 * - Paint drip animations at random positions
 * - Floating mist particles with opacity fade
 * - Camera shake effect synchronized with spray bursts
 *
 * The transition captures the raw, urban energy of live street art creation.
 *
 * Technical Implementation:
 * - Root container: BaseLayout with dark gray wall background
 * - Spray reveal: Multiple expanding circles simulating burst patterns
 * - Overspray: Blurred circular elements around spray areas
 * - Paint drips: Vertical rectangles with translateY animation
 * - Mist particles: Small circles with floating translateX/Y and opacity fade
 * - Camera shake: Container-level translateX/Y effects during bursts
 *
 * Duration: 1.5 seconds total with spray bursts at 0s, 0.3s, 0.6s, 0.9s, 1.2s
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingClip: z.object({
    src: z.string().describe('Source URL of the outgoing clip'),
    type: z.enum(['image', 'video']).describe('Type of outgoing clip'),
  }).describe('The outgoing clip that will be painted over'),
  
  incomingClip: z.object({
    src: z.string().describe('Source URL of the incoming clip'),
    type: z.enum(['image', 'video']).describe('Type of incoming clip'),
  }).describe('The incoming clip that will be revealed through spray paint'),
  
  transitionDuration: z.number().default(1.5).describe('Total duration of the transition in seconds'),
  
  burstCount: z.number().default(5).describe('Number of spray burst circles (typically 5 for 0s, 0.3s, 0.6s, 0.9s, 1.2s)'),
  
  oversprayCount: z.number().default(10).describe('Number of overspray blur circles around spray areas'),
  
  dripCount: z.number().default(6).describe('Number of paint drip elements'),
  
  mistParticleCount: z.number().default(18).describe('Number of floating mist particles'),
  
  cameraShakeIntensity: z.number().default(5).describe('Maximum camera shake displacement in pixels'),
});

type PresetParams = z.infer&lt;typeof presetParams&gt;;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingClip,
    incomingClip,
    transitionDuration,
    burstCount,
    oversprayCount,
    dripCount,
    mistParticleCount,
    cameraShakeIntensity,
  } = params;

  // Helper: Random number in range
  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  // Helper: Random integer in range
  const randomInt = (min: number, max: number) => Math.floor(random(min, max));

  // Spray burst timing: 0s, 0.3s, 0.6s, 0.9s, 1.2s
  const burstTimes = Array.from({ length: burstCount }, (_, i) => i * 0.3);

  // Create spray burst reveal circles
  const sprayBurstCircles: RenderableComponentData[] = burstTimes.map((burstTime, index) => {
    const burstDuration = 0.2; // Each burst lasts 0.2s
    const xPos = random(20, 80); // Random X position (percentage)
    const yPos = random(20, 80); // Random Y position (percentage)
    const finalSize = random(40, 60); // Final size percentage

    return {
      id: `spray-burst-${index}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `&lt;div style="width: 100%; height: 100%; background: white; border-radius: 50%; filter: blur(2px);"&gt;&lt;/div&gt;`,
        className: 'absolute',
        style: {
          left: `${xPos}%`,
          top: `${yPos}%`,
          width: '0%',
          height: '0%',
          transform: 'translate(-50%, -50%)',
        },
      },
      context: {
        timing: {
          start: burstTime,
          duration: burstDuration,
        },
      },
      effects: [
        {
          id: `spray-burst-scale-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: burstDuration,
            mode: 'provider',
            targetIds: [`spray-burst-${index}`],
            ranges: [
              { key: 'width', val: '0%', prog: 0 },
              { key: 'width', val: `${finalSize}%`, prog: 1 },
              { key: 'height', val: '0%', prog: 0 },
              { key: 'height', val: `${finalSize}%`, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Create overspray blur circles
  const oversprayCircles: RenderableComponentData[] = Array.from(
    { length: oversprayCount },
    (_, index) => {
      const burstIndex = randomInt(0, burstCount);
      const burstTime = burstTimes[burstIndex];
      const xPos = random(10, 90);
      const yPos = random(10, 90);
      const size = random(5, 15);

      return {
        id: `overspray-${index}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `&lt;div style="width: 100%; height: 100%; background: rgba(255, 255, 255, 0.1); border-radius: 50%; filter: blur(8px);"&gt;&lt;/div&gt;`,
          className: 'absolute',
          style: {
            left: `${xPos}%`,
            top: `${yPos}%`,
            width: `${size}%`,
            height: `${size}%`,
            transform: 'translate(-50%, -50%)',
          },
        },
        context: {
          timing: {
            start: burstTime,
            duration: 0.3,
          },
        },
        effects: [
          {
            id: `overspray-fade-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.3,
              mode: 'provider',
              targetIds: [`overspray-${index}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1.5, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    }
  );

  // Create paint drips
  const paintDrips: RenderableComponentData[] = Array.from(
    { length: dripCount },
    (_, index) => {
      const startTime = random(0.3, 0.8);
      const dripDuration = random(0.5, 1.0);
      const xPos = random(10, 90);
      const dripDistance = randomInt(100, 200);

      return {
        id: `drip-${index}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `&lt;div style="width: 100%; height: 100%; background: rgba(255, 255, 255, 0.8);"&gt;&lt;/div&gt;`,
          className: 'absolute',
          style: {
            left: `${xPos}%`,
            top: '0px',
            width: '2px',
            height: `${randomInt(30, 60)}px`,
            transform: 'translateX(-50%)',
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: dripDuration,
          },
        },
        effects: [
          {
            id: `drip-fall-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: dripDuration,
              mode: 'provider',
              targetIds: [`drip-${index}`],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: dripDistance, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    }
  );

  // Create mist particles
  const mistParticles: RenderableComponentData[] = Array.from(
    { length: mistParticleCount },
    (_, index) => {
      const startTime = random(0, 1.0);
      const particleDuration = random(0.8, 1.2);
      const xPos = random(0, 100);
      const yPos = random(0, 100);
      const xDrift = random(-50, 50);
      const yDrift = random(-30, 30);

      return {
        id: `mist-${index}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `&lt;div style="width: 100%; height: 100%; background: rgba(255, 255, 255, 0.3); border-radius: 50%; filter: blur(2px);"&gt;&lt;/div&gt;`,
          className: 'absolute',
          style: {
            left: `${xPos}%`,
            top: `${yPos}%`,
            width: '4px',
            height: '4px',
            transform: 'translate(-50%, -50%)',
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: particleDuration,
          },
        },
        effects: [
          {
            id: `mist-float-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: particleDuration,
              mode: 'provider',
              targetIds: [`mist-${index}`],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: xDrift, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: yDrift, prog: 1 },
                { key: 'opacity', val: 0.3, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    }
  );

  // Camera shake effects at burst times
  const cameraShakeEffects = burstTimes.map((burstTime, index) => ({
    id: `camera-shake-${index}`,
    componentId: 'generic',
    data: {
      type: 'linear',
      start: burstTime,
      duration: 0.2,
      mode: 'provider',
      targetIds: ['camera-shake-container'],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: random(-cameraShakeIntensity, cameraShakeIntensity), prog: 0.25 },
        { key: 'translateX', val: random(-cameraShakeIntensity, cameraShakeIntensity), prog: 0.5 },
        { key: 'translateX', val: random(-cameraShakeIntensity, cameraShakeIntensity), prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: random(-cameraShakeIntensity, cameraShakeIntensity), prog: 0.25 },
        { key: 'translateY', val: random(-cameraShakeIntensity, cameraShakeIntensity), prog: 0.5 },
        { key: 'translateY', val: random(-cameraShakeIntensity, cameraShakeIntensity), prog: 0.75 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  }));

  // Determine component IDs for outgoing and incoming clips
  const outgoingComponentId = outgoingClip.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingClip.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Build the composition
  const rootContainer: RenderableComponentData = {
    id: 'graffiti-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 overflow-hidden',
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
        id: 'camera-shake-container',
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
        effects: cameraShakeEffects,
        childrenData: [
          // Outgoing clip
          {
            id: 'outgoing-clip-container',
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
            childrenData: [
              {
                id: 'outgoing-clip',
                type: 'atom',
                componentId: outgoingComponentId,
                data: {
                  src: outgoingClip.src,
                  fit: 'cover',
                  className: 'absolute inset-0 w-full h-full object-cover',
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              } as RenderableComponentData,
            ],
          } as RenderableComponentData,
          // Incoming clip with spray mask
          {
            id: 'incoming-clip-container',
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
            childrenData: [
              {
                id: 'incoming-clip',
                type: 'atom',
                componentId: incomingComponentId,
                data: {
                  src: incomingClip.src,
                  fit: 'cover',
                  className: 'absolute inset-0 w-full h-full object-cover',
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              } as RenderableComponentData,
              // Spray mask layer
              {
                id: 'spray-mask-layer',
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
                childrenData: sprayBurstCircles,
              } as RenderableComponentData,
            ],
          } as RenderableComponentData,
          // Overspray layer
          {
            id: 'overspray-layer',
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
            childrenData: oversprayCircles,
          } as RenderableComponentData,
          // Drip layer
          {
            id: 'drip-layer',
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
            childrenData: paintDrips,
          } as RenderableComponentData,
          // Mist particle layer
          {
            id: 'particle-layer',
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
            childrenData: mistParticles,
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

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
  id: 'graffiti-spray-transition',
  title: 'Graffiti Spray Paint Transition',
  description:
    'A dynamic transition effect that reveals the next clip as if being spray-painted onto a wall. Features realistic spray paint dynamics with expanding burst circles, overspray blur effects, floating mist particles, paint drips, and synchronized camera shake. The transition mimics authentic street art technique with quick energetic bursts capturing raw urban graffiti energy.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'graffiti', 'spray-paint', 'urban', 'street-art', 'burst', 'overspray', 'drips', 'mist', 'camera-shake'],
  defaultInputParams: {
    outgoingClip: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
    },
    incomingClip: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
    },
    transitionDuration: 1.5,
    burstCount: 5,
    oversprayCount: 10,
    dripCount: 6,
    mistParticleCount: 18,
    cameraShakeIntensity: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const graffitiSprayTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};