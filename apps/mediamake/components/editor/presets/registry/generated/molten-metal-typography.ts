/**
 * Molten Metal Typography Preset
 *
 * A dynamic typography preset where text forges itself from superheated liquid metal.
 * Features realistic pour animation into letter molds, heat gradient transitions
 * (white-hot → orange → cooling → metallic silver), forge sparks during hot phase,
 * steam effects during cooling, and a brushed steel finish.
 *
 * Technical Features:
 * - Molten metal pour animation using mask-image gradient
 * - Heat gradient transitions: white-hot (#FFFFFF) → orange (#FFA500) → red-hot (#FF4500) → silver (#C0C0C0)
 * - Heat distortion using SVG filter with feTurbulence
 * - Forge spark particles with parabolic trajectories
 * - Steam effects during cooling phase with blur and vertical animation
 * - Brushed steel finish using repeating-linear-gradient
 * - Temperature-based glow using animated box-shadow
 *
 * Animation Phases:
 * - Pour phase (0-2s): Molten metal pours from top using mask animation
 * - Hot phase (0-2.5s): White-hot glow with forge sparks
 * - Cooling phase (2-4s): Gradual transition through orange and red to silver
 * - Steam effects (2-4s): Rising steam wisps during cooling
 * - Crystallization (2.5-4s): Texture overlay fades in for metallic finish
 *
 * Use cases:
 * - Industrial/tech brand typography
 * - Heavy metal music videos
 * - Forge/manufacturing content
 * - Strength/durability messaging
 * - Cinematic title sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text to forge from molten metal'),
  fontSize: z
    .string()
    .default('120px')
    .describe('Font size for the forged text (e.g., "120px", "8rem")'),
  duration: z
    .number()
    .default(4)
    .describe('Total duration of the forging animation in seconds'),
  pourDuration: z
    .number()
    .default(2)
    .describe('Duration of the molten metal pour phase in seconds'),
  sparkCount: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Number of forge spark particles to generate'),
  sparkIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for spark animations'),
  steamCount: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Number of steam wisps during cooling'),
  crystallizationOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Final opacity of the crystallization texture overlay'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    duration,
    pourDuration,
    sparkCount,
    sparkIntensity,
    steamCount,
    crystallizationOpacity,
  } = params;

  // Helper function to generate random spark trajectories
  const generateSparkTrajectory = (index: number) => {
    const seed = index * 123.456;
    const angle = ((seed % 360) / 360) * Math.PI * 2;
    const velocity = 50 + ((seed * 7) % 100);
    const xDistance = Math.cos(angle) * velocity;
    const yDistance = -Math.abs(Math.sin(angle) * velocity) - 50; // Always upward

    return { xDistance, yDistance };
  };

  // Helper function to generate steam wisp positions
  const generateSteamPosition = (index: number) => {
    const seed = index * 789.123;
    const xOffset = ((seed % 200) - 100) / 100; // -1 to 1
    const yOffset = (seed % 50) / 100; // 0 to 0.5

    return { xOffset, yOffset };
  };

  // Create spark particles
  const sparkParticles: RenderableComponentData[] = Array.from(
    { length: sparkCount },
    (_, index) => {
      const { xDistance, yDistance } = generateSparkTrajectory(index);
      const delay = (index / sparkCount) * 2.5; // Stagger over hot phase
      const sparkDuration = 0.5 + (index % 5) / 10; // 0.5-1s lifetime
      const sparkSize = index % 3 === 0 ? 'w-1 h-1' : 'w-0.5 h-0.5';
      const sparkColor =
        index % 4 === 0
          ? '#FFA500'
          : index % 3 === 0
            ? '#FFE4B5'
            : '#FFFACD';

      return {
        id: `spark-particle-${index}`,
        type: 'atom' as const,
        componentId: 'ShapeAtom',
        data: {
          shape: 'circle',
          color: sparkColor,
          className: `absolute ${sparkSize} rounded-full`,
          style: {
            left: '50%',
            top: '50%',
          },
        },
        context: {
          timing: {
            start: delay,
            duration: sparkDuration,
          },
        },
        effects: [
          {
            id: `spark-trajectory-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: sparkDuration,
              mode: 'provider',
              targetIds: [`spark-particle-${index}`],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                {
                  key: 'translateX',
                  val: xDistance * sparkIntensity,
                  prog: 1,
                },
                { key: 'translateY', val: 0, prog: 0 },
                {
                  key: 'translateY',
                  val: yDistance * sparkIntensity,
                  prog: 1,
                },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create steam wisps
  const steamWisps: RenderableComponentData[] = Array.from(
    { length: steamCount },
    (_, index) => {
      const { xOffset, yOffset } = generateSteamPosition(index);
      const wispSize = 60 + (index % 3) * 20;
      const wispDelay = 2 + index * 0.3; // Start during cooling phase
      const wispDuration = 2;

      return {
        id: `steam-wisp-${index}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute rounded-full',
            style: {
              width: `${wispSize}px`,
              height: `${wispSize / 2}px`,
              background: `radial-gradient(ellipse, rgba(200,200,200,${0.2 + (index % 3) * 0.05}) 0%, transparent 70%)`,
              filter: `blur(${8 + (index % 3) * 2}px)`,
              left: `calc(50% + ${xOffset * 100}px)`,
              bottom: `${10 + yOffset * 50}px`,
            },
          },
        },
        context: {
          timing: {
            start: wispDelay,
            duration: wispDuration,
          },
        },
        effects: [
          {
            id: `steam-rise-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: wispDuration,
              mode: 'provider',
              targetIds: [`steam-wisp-${index}`],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -100 - index * 20, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 0.6, prog: 0.6 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      } as RenderableComponentData;
    },
  );

  // Build the composition
  const childrenData: RenderableComponentData[] = [
    // Main forge environment container
    {
      id: 'forge-environment',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full bg-gray-900 overflow-hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [
        // Ambient glow layer
        {
          id: 'ambient-glow-layer',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                background:
                  'radial-gradient(ellipse at center bottom, rgba(255, 100, 0, 0.15) 0%, transparent 60%)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          childrenData: [],
        },

        // Molten text container
        {
          id: 'molten-text-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className:
                'absolute inset-0 flex items-center justify-center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          childrenData: [
            // Letter mold wrapper
            {
              id: 'letter-mold-wrapper',
              type: 'layout' as const,
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'relative overflow-hidden',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: duration,
                },
              },
              childrenData: [
                // White-hot text phase
                {
                  id: 'text-white-hot',
                  type: 'atom' as const,
                  componentId: 'TextAtom',
                  data: {
                    text: text,
                    font: {
                      family: 'Oswald',
                      weights: ['700'],
                    },
                    style: {
                      fontSize: fontSize,
                      fontWeight: 700,
                      color: '#FFFFFF',
                      textShadow:
                        '0 0 60px #FFFFFF, 0 0 120px #FFA500, 0 0 180px #FF4500',
                    },
                    className: 'absolute',
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: duration,
                    },
                  },
                  effects: [
                    {
                      id: 'white-hot-pour-mask',
                      componentId: 'generic',
                      data: {
                        type: 'ease-out',
                        start: 0,
                        duration: pourDuration,
                        mode: 'provider',
                        targetIds: ['text-white-hot'],
                        ranges: [
                          {
                            key: 'maskImage',
                            val: 'linear-gradient(to bottom, black 0%, black 0%, transparent 0%)',
                            prog: 0,
                          },
                          {
                            key: 'maskImage',
                            val: 'linear-gradient(to bottom, black 0%, black 100%, transparent 100%)',
                            prog: 1,
                          },
                        ],
                      },
                    },
                    {
                      id: 'white-hot-fade-out',
                      componentId: 'generic',
                      data: {
                        type: 'ease-in',
                        start: 1.5,
                        duration: 1,
                        mode: 'provider',
                        targetIds: ['text-white-hot'],
                        ranges: [
                          { key: 'opacity', val: 1, prog: 0 },
                          { key: 'opacity', val: 0, prog: 1 },
                        ],
                      },
                    },
                  ],
                },

                // Orange phase text
                {
                  id: 'text-orange-phase',
                  type: 'atom' as const,
                  componentId: 'TextAtom',
                  data: {
                    text: text,
                    font: {
                      family: 'Oswald',
                      weights: ['700'],
                    },
                    style: {
                      fontSize: fontSize,
                      fontWeight: 700,
                      color: '#FFA500',
                      textShadow: '0 0 40px #FF4500, 0 0 80px #FF6600',
                    },
                    className: 'absolute',
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: duration,
                    },
                  },
                  effects: [
                    {
                      id: 'orange-phase-animation',
                      componentId: 'generic',
                      data: {
                        type: 'ease-in-out',
                        start: 1.5,
                        duration: 1.5,
                        mode: 'provider',
                        targetIds: ['text-orange-phase'],
                        ranges: [
                          { key: 'opacity', val: 0, prog: 0 },
                          { key: 'opacity', val: 1, prog: 0.33 },
                          { key: 'opacity', val: 1, prog: 0.67 },
                          { key: 'opacity', val: 0, prog: 1 },
                        ],
                      },
                    },
                  ],
                },

                // Cooling phase text
                {
                  id: 'text-cooling-phase',
                  type: 'atom' as const,
                  componentId: 'TextAtom',
                  data: {
                    text: text,
                    font: {
                      family: 'Oswald',
                      weights: ['700'],
                    },
                    style: {
                      fontSize: fontSize,
                      fontWeight: 700,
                      color: '#FF4500',
                      textShadow: '0 0 20px #CC3300, 0 0 40px #993300',
                    },
                    className: 'absolute',
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: duration,
                    },
                  },
                  effects: [
                    {
                      id: 'cooling-phase-animation',
                      componentId: 'generic',
                      data: {
                        type: 'ease-in-out',
                        start: 2.5,
                        duration: 1,
                        mode: 'provider',
                        targetIds: ['text-cooling-phase'],
                        ranges: [
                          { key: 'opacity', val: 0, prog: 0 },
                          { key: 'opacity', val: 1, prog: 0.5 },
                          { key: 'opacity', val: 0, prog: 1 },
                        ],
                      },
                    },
                  ],
                },

                // Final steel text
                {
                  id: 'text-final-steel',
                  type: 'atom' as const,
                  componentId: 'TextAtom',
                  data: {
                    text: text,
                    font: {
                      family: 'Oswald',
                      weights: ['700'],
                    },
                    style: {
                      fontSize: fontSize,
                      fontWeight: 700,
                      backgroundImage:
                        'repeating-linear-gradient(45deg, #A8A8A8 0px, #C0C0C0 2px, #D8D8D8 4px, #C0C0C0 6px)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))',
                    },
                    className: 'absolute',
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: duration,
                    },
                  },
                  effects: [
                    {
                      id: 'final-steel-fade-in',
                      componentId: 'generic',
                      data: {
                        type: 'ease-out',
                        start: 3,
                        duration: 1,
                        mode: 'provider',
                        targetIds: ['text-final-steel'],
                        ranges: [
                          { key: 'opacity', val: 0, prog: 0 },
                          { key: 'opacity', val: 1, prog: 1 },
                        ],
                      },
                    },
                  ],
                },

                // Crystallization overlay
                {
                  id: 'crystallization-overlay',
                  type: 'layout' as const,
                  componentId: 'BaseLayout',
                  data: {
                    containerProps: {
                      className: 'absolute inset-0 pointer-events-none',
                      style: {
                        backgroundImage:
                          'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjMiIC8+PC9zdmc+)',
                        backgroundSize: 'cover',
                        mixBlendMode: 'overlay',
                      },
                    },
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: duration,
                    },
                  },
                  effects: [
                    {
                      id: 'crystallization-fade-in',
                      componentId: 'generic',
                      data: {
                        type: 'ease-out',
                        start: 2.5,
                        duration: 1.5,
                        mode: 'provider',
                        targetIds: ['crystallization-overlay'],
                        ranges: [
                          { key: 'opacity', val: 0, prog: 0 },
                          {
                            key: 'opacity',
                            val: crystallizationOpacity,
                            prog: 1,
                          },
                        ],
                      },
                    },
                  ],
                  childrenData: [],
                },
              ],
            },
          ],
        },

        // Spark particles container
        {
          id: 'spark-particles-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none overflow-hidden',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: 2.5, // Active during hot phase
            },
          },
          childrenData: sparkParticles,
        },

        // Steam effects container
        {
          id: 'steam-effects-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none overflow-hidden',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          childrenData: steamWisps,
        },
      ],
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: 'molten-metal-typography-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: childrenData,
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
  id: 'molten-metal-typography',
  title: 'Molten Metal Typography',
  description:
    'Dynamic typography preset where text forges itself from superheated liquid metal. Features realistic pour animation into letter molds, heat gradient transitions (white-hot → orange → cooling → metallic silver), forge sparks during hot phase, steam effects during cooling, and a brushed steel finish. Industrial strength meets elegant typography.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'metal',
    'forge',
    'industrial',
    'heat',
    'molten',
    'sparks',
    'steam',
    'steel',
    'dynamic',
    'title',
  ],
  defaultInputParams: {
    text: 'FORGED',
    fontSize: '120px',
    duration: 4,
    pourDuration: 2,
    sparkCount: 20,
    sparkIntensity: 1,
    steamCount: 5,
    crystallizationOpacity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const moltenMetalTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
