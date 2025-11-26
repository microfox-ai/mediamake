/**
 * Energy Burst Transition Preset
 *
 * A fighting game-inspired explosive transition featuring compression into a black hole effect,
 * followed by an explosive reveal with neon energy rings, lightning tendrils, and shockwave distortions.
 *
 * Features:
 * - **Compression Phase**: Outgoing scene compresses to a central point with vignette effect
 * - **Explosion Flash**: Bright white flash at peak compression with electric blue/purple highlights
 * - **Shockwave Rings**: Concentric neon rings (cyan/purple) that expand outward with distortion
 * - **Energy Tendrils**: Animated SVG lightning arcs with neon glow effects
 * - **Screen Shake**: Impactful shake effect at explosion moment
 * - **Seamless Reveal**: Incoming scene revealed through expanding shockwaves
 *
 * Use cases:
 * - Fighting game special move transitions
 * - Ultimate ability activation sequences
 * - High-energy scene transitions
 * - Action-packed video edits
 * - Gaming content transitions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Params Schema ---
const presetParams = z.object({
  outgoingSceneSrc: z.string().describe('Source URL for the outgoing scene (video or image)'),
  incomingSceneSrc: z.string().describe('Source URL for the incoming scene (video or image)'),
  compressionDuration: z.number().default(0.6).describe('Duration of compression phase in seconds'),
  explosionDuration: z.number().default(0.2).describe('Duration of flash explosion in seconds'),
  expansionDuration: z.number().default(0.8).describe('Duration of shockwave expansion in seconds'),
  shockwaveCount: z.number().default(4).describe('Number of shockwave rings (3-5 recommended)'),
  energyTendrilCount: z.number().default(3).describe('Number of energy tendril paths'),
  shakeIntensity: z.number().default(10).describe('Screen shake intensity in pixels'),
  primaryColor: z.string().default('#00ffff').describe('Primary neon color (cyan)'),
  secondaryColor: z.string().default('#a855f7').describe('Secondary neon color (purple)'),
});

// --- Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingSceneSrc,
    incomingSceneSrc,
    compressionDuration,
    explosionDuration,
    expansionDuration,
    shockwaveCount,
    energyTendrilCount,
    shakeIntensity,
    primaryColor,
    secondaryColor,
  } = params;

  const totalDuration = compressionDuration + explosionDuration + expansionDuration;
  const explosionStart = compressionDuration;
  const expansionStart = explosionStart + explosionDuration;

  // Helper: Generate random shake offset
  const generateShakeEffect = (targetId: string, start: number, duration: number) => {
    return {
      id: `shake-${targetId}`,
      componentId: targetId,
      data: {
        type: 'shake',
        start,
        duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: -shakeIntensity, prog: 0 },
          { key: 'translateX', val: shakeIntensity, prog: 0.25 },
          { key: 'translateX', val: -shakeIntensity, prog: 0.5 },
          { key: 'translateX', val: shakeIntensity, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: shakeIntensity, prog: 0 },
          { key: 'translateY', val: -shakeIntensity, prog: 0.25 },
          { key: 'translateY', val: shakeIntensity, prog: 0.5 },
          { key: 'translateY', val: -shakeIntensity, prog: 0.75 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Outgoing scene compression effect
  const outgoingCompressionEffect = {
    id: 'outgoing-compression-effect',
    componentId: 'outgoing-scene-container',
    data: {
      type: 'ease-in',
      start: 0,
      duration: compressionDuration,
      mode: 'provider' as const,
      targetIds: ['outgoing-scene-container'],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 0.3, prog: 1 },
        { key: 'brightness', val: 1, prog: 0 },
        { key: 'brightness', val: 1.5, prog: 1 },
      ],
    },
  };

  // Vignette intensity effect
  const vignetteEffect = {
    id: 'vignette-effect',
    componentId: 'vignette-overlay',
    data: {
      type: 'ease-in',
      start: 0,
      duration: compressionDuration,
      mode: 'provider' as const,
      targetIds: ['vignette-overlay'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.9, prog: 1 },
      ],
    },
  };

  // Flash effect
  const flashEffect = {
    id: 'flash-effect-anim',
    componentId: 'flash-effect',
    data: {
      type: 'ease-out',
      start: explosionStart,
      duration: explosionDuration,
      mode: 'provider' as const,
      targetIds: ['flash-effect'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Generate shockwave rings
  const shockwaveRings: RenderableComponentData[] = [];
  const shockwaveEffects = [];

  for (let i = 0; i < shockwaveCount; i++) {
    const ringId = `shockwave-ring-${i + 1}`;
    const delay = i * 0.1;
    const color = i % 2 === 0 ? primaryColor : secondaryColor;
    const borderWidth = i < 2 ? 4 : 2;

    shockwaveRings.push({
      id: ringId,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        shapeType: 'div',
        containerProps: {
          className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none',
          style: {
            width: '100px',
            height: '100px',
            border: `${borderWidth}px solid ${color}`,
            boxShadow: `0 0 20px ${color}, inset 0 0 20px ${color}`,
          },
        },
      },
      context: {
        timing: {
          start: explosionStart + delay,
          duration: expansionDuration - delay,
        },
      },
    } as RenderableComponentData);

    shockwaveEffects.push({
      id: `shockwave-effect-${i + 1}`,
      componentId: ringId,
      data: {
        type: 'ease-out',
        start: explosionStart + delay,
        duration: expansionDuration - delay,
        mode: 'provider' as const,
        targetIds: [ringId],
        ranges: [
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 4, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    });
  }

  // Generate energy tendrils
  const energyTendrils: RenderableComponentData[] = [];
  const tendrilEffects = [];

  const tendrilPaths = [
    'M 0 50 Q 100 20, 200 80 T 400 50',
    'M 50 150 Q 150 100, 250 170 T 450 130',
    'M 100 200 Q 200 150, 300 220 T 500 180',
    'M 0 100 Q 100 50, 200 120 T 400 80',
    'M 50 250 Q 150 200, 250 270 T 450 230',
  ];

  for (let i = 0; i < Math.min(energyTendrilCount, tendrilPaths.length); i++) {
    const tendrilId = `energy-tendril-${i + 1}`;
    const color = i % 2 === 0 ? primaryColor : secondaryColor;
    const strokeWidth = i === 0 ? 3 : 2;
    const delay = i * 0.1;

    energyTendrils.push({
      id: tendrilId,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        shapeType: 'svg',
        svgPath: tendrilPaths[i],
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            stroke: color,
            strokeWidth: `${strokeWidth}`,
            fill: 'none',
            filter: `drop-shadow(0 0 10px ${color}) drop-shadow(0 0 20px ${color})`,
            strokeDasharray: '1000',
            strokeDashoffset: '1000',
          },
        },
      },
      context: {
        timing: {
          start: explosionStart + delay,
          duration: expansionDuration - delay,
        },
      },
    } as RenderableComponentData);

    tendrilEffects.push({
      id: `tendril-effect-${i + 1}`,
      componentId: tendrilId,
      data: {
        type: 'ease-out',
        start: explosionStart + delay,
        duration: expansionDuration - delay,
        mode: 'provider' as const,
        targetIds: [tendrilId],
        ranges: [
          { key: 'strokeDashoffset', val: 1000, prog: 0 },
          { key: 'strokeDashoffset', val: 0, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.2 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    });
  }

  // Incoming scene reveal effect
  const incomingRevealEffect = {
    id: 'incoming-reveal-effect',
    componentId: 'incoming-scene-container',
    data: {
      type: 'ease-out',
      start: explosionStart,
      duration: expansionDuration,
      mode: 'provider' as const,
      targetIds: ['incoming-scene-container'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'scale', val: 1.2, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    },
  };

  // Screen shake on root container
  const screenShakeEffect = generateShakeEffect('energy-burst-container', explosionStart, explosionDuration);

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Outgoing scene container
    {
      id: 'outgoing-scene-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 z-10',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: compressionDuration,
        },
      },
      effects: [outgoingCompressionEffect],
      childrenData: [
        {
          id: 'outgoing-scene',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingSceneSrc,
            containerProps: {
              className: 'absolute inset-0 w-full h-full object-cover',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: compressionDuration,
            },
          },
        },
        {
          id: 'vignette-overlay',
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shapeType: 'div',
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                background: 'radial-gradient(circle, transparent 0%, black 100%)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: compressionDuration,
            },
          },
          effects: [vignetteEffect],
        },
      ] as RenderableComponentData[],
    } as RenderableComponentData,
    // Incoming scene container
    {
      id: 'incoming-scene-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 z-5',
        },
      },
      context: {
        timing: {
          start: explosionStart,
          duration: expansionDuration,
        },
      },
      effects: [incomingRevealEffect],
      childrenData: [
        {
          id: 'incoming-scene',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingSceneSrc,
            containerProps: {
              className: 'absolute inset-0 w-full h-full object-cover',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: expansionDuration,
            },
          },
        },
      ] as RenderableComponentData[],
    } as RenderableComponentData,
    // Flash effect
    {
      id: 'flash-effect',
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        shapeType: 'div',
        containerProps: {
          className: 'absolute inset-0 z-50 bg-white',
        },
      },
      context: {
        timing: {
          start: explosionStart,
          duration: explosionDuration,
        },
      },
      effects: [flashEffect],
    } as RenderableComponentData,
    // Shockwave rings
    ...shockwaveRings,
    // Energy tendrils container
    {
      id: 'energy-tendril-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 z-40 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: explosionStart,
          duration: expansionDuration,
        },
      },
      childrenData: energyTendrils as RenderableComponentData[],
    } as RenderableComponentData,
  ];

  // Root container
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
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [screenShakeEffect, ...shockwaveEffects, ...tendrilEffects],
    childrenData: childrenData as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'energy-burst-transition',
  title: 'Energy Burst Transition',
  description:
    'A fighting game-inspired explosive transition featuring compression into a black hole effect, followed by an explosive reveal with neon energy rings, lightning tendrils, and shockwave distortions. Includes vignette compression, white flash at peak, concentric shockwave rings with cyan/purple neon glow, animated SVG energy arcs, and screen shake for maximum impact.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'energy',
    'burst',
    'explosion',
    'fighting-game',
    'shockwave',
    'neon',
    'lightning',
    'compression',
    'screen-shake',
    'action',
    'gaming',
  ],
  defaultInputParams: {
    outgoingSceneSrc: 'https://example.com/outgoing-scene.mp4',
    incomingSceneSrc: 'https://example.com/incoming-scene.mp4',
    compressionDuration: 0.6,
    explosionDuration: 0.2,
    expansionDuration: 0.8,
    shockwaveCount: 4,
    energyTendrilCount: 3,
    shakeIntensity: 10,
    primaryColor: '#00ffff',
    secondaryColor: '#a855f7',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---
export const energyBurstTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};