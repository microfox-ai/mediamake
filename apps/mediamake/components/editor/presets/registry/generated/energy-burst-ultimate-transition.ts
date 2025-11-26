/**
 * Energy Burst Ultimate Transition Preset
 *
 * An explosive fighting-game style transition featuring:
 * - Scene compression into a singularity with vignette effect
 * - Bright flash with overexposed whites and electric blue/purple highlights
 * - Expanding neon shockwave rings with concentric animations
 * - Crackling energy tendrils using animated SVG paths with neon stroke effects
 * - Screen shake at the moment of explosion for maximum impact
 *
 * Perfect for:
 * - Gaming highlights and action sequences
 * - Dramatic scene changes
 * - Ultimate ability activation effects
 * - High-energy transitions
 * - Fighting game style visual effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ===========================
// PRESET PARAMS SCHEMA
// ===========================

const presetParams = z.object({
  outgoingSceneSrc: z.string().describe('Source URL or path for the outgoing scene (video/image)'),
  incomingSceneSrc: z.string().describe('Source URL or path for the incoming scene (video/image)'),
  duration: z.number().default(1.6).describe('Total transition duration in seconds'),
  compressionDuration: z.number().default(0.6).describe('Duration of the compression phase in seconds'),
  explosionDuration: z.number().default(0.2).describe('Duration of the flash explosion in seconds'),
  expansionDuration: z.number().default(0.8).describe('Duration of the expansion phase in seconds'),
  shockwaveCount: z.number().default(4).describe('Number of shockwave rings to generate'),
  tendrilCount: z.number().default(3).describe('Number of energy tendrils to generate'),
  shakeIntensity: z.number().default(15).describe('Screen shake amplitude in pixels'),
  primaryColor: z.string().default('cyan').describe('Primary color for energy effects (cyan, blue, purple, etc.)'),
  secondaryColor: z.string().default('violet').describe('Secondary color for energy effects'),
});

// ===========================
// PRESET EXECUTION FUNCTION
// ===========================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingSceneSrc,
    incomingSceneSrc,
    duration,
    compressionDuration,
    explosionDuration,
    expansionDuration,
    shockwaveCount,
    tendrilCount,
    shakeIntensity,
    primaryColor,
    secondaryColor,
  } = params;

  const { config } = props;
  const videoWidth = config?.width || 1920;
  const videoHeight = config?.height || 1080;

  // Helper function: Generate random SVG path for energy tendrils
  const generateEnergyPath = (index: number): string => {
    const centerX = videoWidth / 2;
    const centerY = videoHeight / 2;
    
    // Different paths for each tendril
    const paths = [
      `M${centerX},${centerY} Q${centerX - 400},${centerY - 300} ${centerX - 800},${centerY - 400} Q${centerX - 1000},${centerY - 350} ${50},${centerY - 100}`,
      `M${centerX},${centerY} Q${centerX + 300},${centerY - 400} ${centerX + 700},${centerY - 500} Q${centerX + 900},${centerY - 450} ${videoWidth - 50},${centerY - 200}`,
      `M${centerX},${centerY} Q${centerX - 200},${centerY + 300} ${centerX - 500},${centerY + 500} Q${centerX - 700},${centerY + 550} ${100},${videoHeight - 150}`,
      `M${centerX},${centerY} Q${centerX + 400},${centerY + 200} ${centerX + 700},${centerY + 400} Q${centerX + 900},${centerY + 450} ${videoWidth - 100},${videoHeight - 250}`,
      `M${centerX},${centerY} Q${centerX - 100},${centerY - 450} ${centerX - 300},${centerY - 600} Q${centerX - 500},${centerY - 700} ${200},${50}`,
    ];
    
    return paths[index % paths.length];
  };

  // Helper function: Generate shockwave rings
  const generateShockwaveRings = (): RenderableComponentData[] => {
    const rings: RenderableComponentData[] = [];
    const colors = [primaryColor, secondaryColor, 'white', primaryColor];
    const baseDelay = compressionDuration;

    for (let i = 0; i < shockwaveCount; i++) {
      const ringDelay = baseDelay + (i * 0.05);
      const ringDuration = 0.6 - (i * 0.05);
      const color = colors[i % colors.length];
      const borderWidth = i === 2 ? 2 : 4;
      const maxScale = 4 - (i * 0.5);

      rings.push({
        id: `shockwave-ring-${i + 1}`,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          containerProps: {
            className: `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-${borderWidth} border-${color}-${i === 2 ? '400' : i % 2 === 0 ? '400' : '500'} pointer-events-none z-40`,
            style: {
              width: '100px',
              height: '100px',
              boxShadow: `0 0 ${20 + i * 5}px ${color}${i === 0 ? `, 0 0 ${40 + i * 10}px ${i % 2 === 0 ? 'cyan' : 'blue'}` : ''}`,
            },
          },
        },
        context: {
          timing: {
            type: 'relative',
            start: ringDelay,
            duration: ringDuration,
          },
        },
        effects: [
          {
            id: `ring${i + 1}-expand-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: ringDuration,
              mode: 'provider',
              targetIds: [`shockwave-ring-${i + 1}`],
              ranges: [
                {
                  key: 'scale',
                  val: [0, maxScale],
                  prog: [0, 1],
                },
                {
                  key: 'opacity',
                  val: [1, 0],
                  prog: [0.3, 1],
                },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return rings;
  };

  // Helper function: Generate energy tendrils
  const generateEnergyTendrils = (): RenderableComponentData[] => {
    const tendrils: RenderableComponentData[] = [];
    const colors = [primaryColor, secondaryColor, '#00ffff'];
    const baseDelay = compressionDuration;

    for (let i = 0; i < tendrilCount; i++) {
      const tendrilDelay = baseDelay + (i * 0.05);
      const tendrilDuration = 0.8 - (i * 0.05);
      const color = colors[i % colors.length];
      const strokeWidth = 3 - (i * 0.5);
      const path = generateEnergyPath(i);

      tendrils.push({
        id: `energy-tendril-${i + 1}`,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none z-45',
          },
          svgContent: `<svg viewBox='0 0 ${videoWidth} ${videoHeight}' class='w-full h-full'><path d='${path}' stroke='${color}' stroke-width='${strokeWidth}' fill='none' filter='url(#glow${i + 1})' stroke-linecap='round'/><defs><filter id='glow${i + 1}'><feGaussianBlur stdDeviation='${4 - i}' result='blur'/><feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge></filter></defs></svg>`,
        },
        context: {
          timing: {
            type: 'relative',
            start: tendrilDelay,
            duration: tendrilDuration,
          },
        },
        effects: [
          {
            id: `tendril${i + 1}-draw-effect`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.4,
              mode: 'provider',
              targetIds: [`energy-tendril-${i + 1}`],
              ranges: [
                {
                  key: 'opacity',
                  val: [0, 1],
                  prog: [0, 0.2],
                },
                {
                  key: 'opacity',
                  val: [1, 0],
                  prog: [0.5, 1],
                },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return tendrils;
  };

  // Helper function: Generate screen shake effect
  const generateScreenShakeEffect = () => {
    return {
      id: 'screen-shake-effect',
      componentId: 'shake',
      data: {
        type: 'ease-out',
        start: compressionDuration,
        duration: 0.3,
        mode: 'provider',
        targetIds: ['energy-burst-container'],
        amplitude: shakeIntensity,
        frequency: 30,
        decay: 0.8,
        axis: 'both',
      },
    };
  };

  // Build children data array
  const childrenData: RenderableComponentData[] = [
    // Outgoing scene container
    {
      id: 'outgoing-scene-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          type: 'relative',
          start: 0,
          duration: compressionDuration + explosionDuration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-scene',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingSceneSrc,
            containerProps: {
              className: 'w-full h-full object-cover',
            },
          },
          context: {
            timing: {
              type: 'relative',
              start: 0,
              duration: compressionDuration + explosionDuration,
            },
          },
          effects: [
            {
              id: 'compression-scale-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: compressionDuration,
                mode: 'provider',
                targetIds: ['outgoing-scene'],
                ranges: [
                  {
                    key: 'scale',
                    val: [1, 0.3],
                    prog: [0, 1],
                  },
                ],
              },
            },
            {
              id: 'compression-brightness-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: compressionDuration,
                mode: 'provider',
                targetIds: ['outgoing-scene'],
                ranges: [
                  {
                    key: 'filter.brightness',
                    val: [1, 2.5],
                    prog: [0, 1],
                  },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming scene container
    {
      id: 'incoming-scene-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          type: 'relative',
          start: compressionDuration,
          duration: explosionDuration + expansionDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-scene',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingSceneSrc,
            containerProps: {
              className: 'w-full h-full object-cover',
            },
          },
          context: {
            timing: {
              type: 'relative',
              start: 0,
              duration: explosionDuration + expansionDuration,
            },
          },
          effects: [
            {
              id: 'reveal-opacity-effect',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: explosionDuration,
                mode: 'provider',
                targetIds: ['incoming-scene'],
                ranges: [
                  {
                    key: 'opacity',
                    val: [0, 1],
                    prog: [0, 1],
                  },
                ],
              },
            },
            {
              id: 'expansion-scale-effect',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: expansionDuration,
                mode: 'provider',
                targetIds: ['incoming-scene'],
                ranges: [
                  {
                    key: 'scale',
                    val: [0.5, 1],
                    prog: [0, 1],
                  },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Vignette overlay
    {
      id: 'vignette-overlay',
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none z-10',
          style: {
            background: 'radial-gradient(circle at center, transparent 0%, transparent 20%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.9) 100%)',
          },
        },
      },
      context: {
        timing: {
          type: 'relative',
          start: 0,
          duration: compressionDuration,
        },
      },
      effects: [
        {
          id: 'vignette-intensify-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: compressionDuration,
            mode: 'provider',
            targetIds: ['vignette-overlay'],
            ranges: [
              {
                key: 'opacity',
                val: [0.3, 1],
                prog: [0, 1],
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Flash effect
    {
      id: 'flash-effect',
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        containerProps: {
          className: 'absolute inset-0 bg-white z-50 pointer-events-none',
        },
      },
      context: {
        timing: {
          type: 'relative',
          start: compressionDuration,
          duration: explosionDuration,
        },
      },
      effects: [
        {
          id: 'flash-pulse-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: explosionDuration,
            mode: 'provider',
            targetIds: ['flash-effect'],
            ranges: [
              {
                key: 'opacity',
                val: [1, 0],
                prog: [0, 1],
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Shockwave rings
    ...generateShockwaveRings(),

    // Energy tendrils
    ...generateEnergyTendrils(),
  ];

  // Root container with screen shake effect
  const rootContainer: RenderableComponentData = {
    id: 'energy-burst-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        type: 'relative',
        start: 0,
        duration: duration,
      },
    },
    effects: [generateScreenShakeEffect()],
    childrenData: childrenData as RenderableComponentData[],
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

// ===========================
// PRESET METADATA
// ===========================

const presetMetadata: PresetMetadata = {
  id: 'energy-burst-ultimate-transition',
  title: 'Energy Burst Ultimate Transition',
  description: 'An explosive fighting-game style transition featuring scene compression into a singularity, bright flash with overexposed whites, expanding neon shockwave rings, crackling energy tendrils, and screen shake. Perfect for gaming highlights, action sequences, and dramatic scene changes that demand maximum visual impact.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'energy',
    'burst',
    'explosion',
    'fighting-game',
    'ultimate',
    'shockwave',
    'neon',
    'lightning',
    'screen-shake',
    'compression',
    'dramatic',
    'gaming',
    'action',
  ],
  defaultInputParams: {
    outgoingSceneSrc: 'https://example.com/outgoing-scene.mp4',
    incomingSceneSrc: 'https://example.com/incoming-scene.mp4',
    duration: 1.6,
    compressionDuration: 0.6,
    explosionDuration: 0.2,
    expansionDuration: 0.8,
    shockwaveCount: 4,
    tendrilCount: 3,
    shakeIntensity: 15,
    primaryColor: 'cyan',
    secondaryColor: 'violet',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ===========================
// EXPORT PRESET
// ===========================

export const energyBurstUltimateTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
