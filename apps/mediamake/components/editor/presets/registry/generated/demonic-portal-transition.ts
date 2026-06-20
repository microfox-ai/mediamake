/**
 * Demonic Portal Transition Preset
 *
 * Creates a supernatural gateway transition where a portal tears open in the center,
 * revealing a hellish dimension with swirling chaos, fire, and shadows. Features:
 * - Initial rupture expanding from pinpoint to full portal
 * - Reality-warping distortion effects around edges
 * - Swirling internal chaos layers (fire, shadows, energy)
 * - Unstable portal edges with energy crackling
 * - Gravitational particle effects pulled into vortex
 * - Violent pulsing phase before closure/consumption
 * - SVG filters for distortion and turbulence
 *
 * Use cases:
 * - Horror/supernatural transitions
 * - Music video visual effects
 * - Game trailer transitions
 * - Dark fantasy content
 * - Dramatic scene changes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .min(2)
    .max(30)
    .default(10)
    .describe('Total duration of portal transition in seconds'),
  endBehavior: z
    .enum(['closure', 'consumption'])
    .default('closure')
    .describe('Whether portal closes or consumes the screen at the end'),
  portalSize: z
    .number()
    .min(200)
    .max(800)
    .default(400)
    .describe('Maximum size of portal in pixels'),
  distortionIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity of reality-warping distortion effects'),
  particleCount: z
    .number()
    .min(8)
    .max(30)
    .default(20)
    .describe('Number of particles being sucked into vortex'),
  edgeEnergyColor: z
    .string()
    .default('#ff3300')
    .describe('Color of energy crackling along portal edges'),
  chaosColors: z
    .object({
      primary: z.string().default('#ff3300'),
      secondary: z.string().default('#ff6600'),
      tertiary: z.string().default('#ff0000'),
    })
    .default({
      primary: '#ff3300',
      secondary: '#ff6600',
      tertiary: '#ff0000',
    })
    .describe('Colors for internal chaos layers'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    endBehavior,
    portalSize,
    distortionIntensity,
    particleCount,
    edgeEnergyColor,
    chaosColors,
  } = params;

  // Phase timing calculations (relative to total duration)
  const initialRuptureEnd = duration * 0.1; // 0-10%
  const rapidExpansionEnd = duration * 0.4; // 10-40%
  const stablePortalEnd = duration * 0.7; // 40-70%
  const violentPulsingEnd = duration * 0.9; // 70-90%
  // Final phase: 90-100%

  // Helper function to create particle positions
  const createParticlePositions = (count: number) => {
    const particles = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const distance = 40 + Math.random() * 10; // 40-50% from center
      const top = 50 + Math.sin(angle) * distance;
      const left = 50 + Math.cos(angle) * distance;
      const size = 4 + Math.floor(Math.random() * 6); // 4-10px
      const delay = i * 0.05; // Stagger by 50ms

      particles.push({
        id: `particle-${i}`,
        top: `${top}%`,
        left: `${left}%`,
        size: `${size}px`,
        delay,
      });
    }
    return particles;
  };

  const particles = createParticlePositions(particleCount);

  // SVG Filters for distortion
  const svgFilters: RenderableComponentData = {
    id: 'portal-svg-filters',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
          <defs>
            <filter id="portal-distortion">
              <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="turbulence">
                <animate attributeName="baseFrequency" 
                  values="0.01;0.02;0.01" 
                  dur="${duration}s" 
                  repeatCount="indefinite"/>
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="${15 * distortionIntensity}" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
            <filter id="portal-glow">
              <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        </svg>
      `,
      className: 'absolute inset-0',
      style: { pointerEvents: 'none' },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Background container with radial gradient
  const backgroundLayer: RenderableComponentData = {
    id: 'portal-background',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background:
            'radial-gradient(circle at center, #1a0a0a 0%, #0d0505 40%, #000000 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
  };

  // Distortion rings layer
  const distortionRings = [
    {
      id: 'distortion-ring-1',
      width: '120%',
      height: '120%',
      border: `2px solid rgba(${parseInt(edgeEnergyColor.slice(1, 3), 16)}, ${parseInt(edgeEnergyColor.slice(3, 5), 16)}, ${parseInt(edgeEnergyColor.slice(5, 7), 16)}, 0.15)`,
      rotation: 360,
      duration: duration * 0.8,
    },
    {
      id: 'distortion-ring-2',
      width: '140%',
      height: '140%',
      border: `1px solid rgba(${parseInt(edgeEnergyColor.slice(1, 3), 16)}, ${parseInt(edgeEnergyColor.slice(3, 5), 16)}, ${parseInt(edgeEnergyColor.slice(5, 7), 16)}, 0.1)`,
      rotation: -480,
      duration: duration * 1.2,
    },
    {
      id: 'distortion-ring-3',
      width: '160%',
      height: '160%',
      border: `1px solid rgba(${parseInt(edgeEnergyColor.slice(1, 3), 16)}, ${parseInt(edgeEnergyColor.slice(3, 5), 16)}, ${parseInt(edgeEnergyColor.slice(5, 7), 16)}, 0.08)`,
      rotation: 720,
      duration: duration * 1.5,
    },
  ];

  const distortionLayer: RenderableComponentData = {
    id: 'distortion-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          pointerEvents: 'none',
          filter: 'url(#portal-distortion)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: distortionRings.map((ring) => ({
      id: ring.id,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; border-radius: 50%; border: ${ring.border};"></div>`,
        className: 'absolute',
        style: {
          width: ring.width,
          height: ring.height,
          transformOrigin: 'center center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `${ring.id}-rotate`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: ring.duration,
            mode: 'provider',
            targetIds: [ring.id],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: ring.rotation, prog: 1 },
            ],
          },
        },
        {
          id: `${ring.id}-opacity`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: rapidExpansionEnd,
            mode: 'provider',
            targetIds: [ring.id],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    })) as RenderableComponentData[],
  };

  // Portal container with all portal elements
  const portalContainer: RenderableComponentData = {
    id: 'portal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-1/2 left-1/2',
        style: {
          transform: 'translate(-50%, -50%)',
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Initial rupture: 0-10%
      {
        id: 'portal-initial-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: initialRuptureEnd,
          mode: 'provider',
          targetIds: ['portal-container'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 0.3, prog: 1 },
          ],
        },
      },
      // Rapid expansion: 10-40%
      {
        id: 'portal-expand',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: initialRuptureEnd,
          duration: rapidExpansionEnd - initialRuptureEnd,
          mode: 'provider',
          targetIds: ['portal-container'],
          ranges: [
            { key: 'scale', val: 0.3, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Violent pulsing: 70-90%
      {
        id: 'portal-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: stablePortalEnd,
          duration: violentPulsingEnd - stablePortalEnd,
          mode: 'provider',
          targetIds: ['portal-container'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.1, prog: 0.25 },
            { key: 'scale', val: 0.9, prog: 0.5 },
            { key: 'scale', val: 1.1, prog: 0.75 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Final phase: 90-100%
      {
        id: 'portal-final',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: violentPulsingEnd,
          duration: duration - violentPulsingEnd,
          mode: 'provider',
          targetIds: ['portal-container'],
          ranges:
            endBehavior === 'closure'
              ? [
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: 0, prog: 1 },
                ]
              : [
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: 5, prog: 1 },
                ],
        },
      },
    ],
    childrenData: [
      // Portal edge outer
      {
        id: 'portal-edge-outer',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; border-radius: 50%;"></div>`,
          className: 'absolute',
          style: {
            width: `${portalSize}px`,
            height: `${portalSize}px`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, transparent 40%, rgba(${parseInt(chaosColors.secondary.slice(1, 3), 16)}, ${parseInt(chaosColors.secondary.slice(3, 5), 16)}, ${parseInt(chaosColors.secondary.slice(5, 7), 16)}, 0.6) 60%, rgba(${parseInt(chaosColors.tertiary.slice(1, 3), 16)}, ${parseInt(chaosColors.tertiary.slice(3, 5), 16)}, ${parseInt(chaosColors.tertiary.slice(5, 7), 16)}, 0.8) 80%, transparent 100%)`,
            boxShadow: `0 0 60px 20px rgba(${parseInt(edgeEnergyColor.slice(1, 3), 16)}, ${parseInt(edgeEnergyColor.slice(3, 5), 16)}, ${parseInt(edgeEnergyColor.slice(5, 7), 16)}, 0.5), 0 0 120px 40px rgba(${parseInt(chaosColors.tertiary.slice(1, 3), 16)}, ${parseInt(chaosColors.tertiary.slice(3, 5), 16)}, ${parseInt(chaosColors.tertiary.slice(5, 7), 16)}, 0.3), inset 0 0 60px 20px rgba(${parseInt(chaosColors.secondary.slice(1, 3), 16)}, ${parseInt(chaosColors.secondary.slice(3, 5), 16)}, ${parseInt(chaosColors.secondary.slice(5, 7), 16)}, 0.4)`,
            filter: 'url(#portal-glow)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [
          {
            id: 'edge-outer-pulse',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: rapidExpansionEnd,
              duration: stablePortalEnd - rapidExpansionEnd,
              mode: 'provider',
              targetIds: ['portal-edge-outer'],
              ranges: [
                { key: 'opacity', val: 0.8, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0.8, prog: 1 },
              ],
            },
          },
        ],
      },
      // Inner chaos layer 1
      {
        id: 'inner-chaos-layer-1',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; border-radius: 50%; overflow: hidden;"></div>`,
          className: 'absolute',
          style: {
            width: `${portalSize * 0.75}px`,
            height: `${portalSize * 0.75}px`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: `conic-gradient(from 0deg, ${chaosColors.primary} 0%, #000000 20%, ${chaosColors.secondary} 40%, #330000 60%, ${chaosColors.tertiary} 80%, #000000 100%)`,
            transformOrigin: 'center center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [
          {
            id: 'chaos-1-rotate',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: rapidExpansionEnd,
              duration: duration - rapidExpansionEnd,
              mode: 'provider',
              targetIds: ['inner-chaos-layer-1'],
              ranges: [
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: 360, prog: 1 },
              ],
            },
          },
        ],
      },
      // Inner chaos layer 2
      {
        id: 'inner-chaos-layer-2',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; border-radius: 50%; overflow: hidden;"></div>`,
          className: 'absolute',
          style: {
            width: `${portalSize * 0.625}px`,
            height: `${portalSize * 0.625}px`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: `conic-gradient(from 180deg, #000000 0%, ${chaosColors.secondary} 25%, #1a0000 50%, ${chaosColors.primary} 75%, #000000 100%)`,
            transformOrigin: 'center center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [
          {
            id: 'chaos-2-rotate',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: rapidExpansionEnd,
              duration: duration - rapidExpansionEnd,
              mode: 'provider',
              targetIds: ['inner-chaos-layer-2'],
              ranges: [
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: -720, prog: 1 },
              ],
            },
          },
        ],
      },
      // Inner chaos layer 3
      {
        id: 'inner-chaos-layer-3',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; border-radius: 50%; overflow: hidden;"></div>`,
          className: 'absolute',
          style: {
            width: `${portalSize * 0.5}px`,
            height: `${portalSize * 0.5}px`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, #000000 0%, #330000 30%, #000000 50%, ${chaosColors.primary} 70%, #000000 100%)`,
            transformOrigin: 'center center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [
          {
            id: 'chaos-3-rotate',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: rapidExpansionEnd,
              duration: duration - rapidExpansionEnd,
              mode: 'provider',
              targetIds: ['inner-chaos-layer-3'],
              ranges: [
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: 540, prog: 1 },
              ],
            },
          },
        ],
      },
      // Portal core
      {
        id: 'portal-core',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; border-radius: 50%;"></div>`,
          className: 'absolute',
          style: {
            width: `${portalSize * 0.3}px`,
            height: `${portalSize * 0.3}px`,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background:
              'radial-gradient(circle, #000000 0%, #1a0000 50%, #000000 100%)',
            boxShadow: 'inset 0 0 30px 10px rgba(0, 0, 0, 0.9)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      },
    ] as RenderableComponentData[],
  };

  // Particle system
  const particleSystem: RenderableComponentData = {
    id: 'particle-system',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: particles.map((particle) => ({
      id: particle.id,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; border-radius: 50%;"></div>`,
        className: 'absolute',
        style: {
          width: particle.size,
          height: particle.size,
          top: particle.top,
          left: particle.left,
          background: `radial-gradient(circle, rgba(${parseInt(chaosColors.secondary.slice(1, 3), 16)}, ${parseInt(chaosColors.secondary.slice(3, 5), 16)}, ${parseInt(chaosColors.secondary.slice(5, 7), 16)}, 0.9) 0%, rgba(${parseInt(chaosColors.primary.slice(1, 3), 16)}, ${parseInt(chaosColors.primary.slice(3, 5), 16)}, ${parseInt(chaosColors.primary.slice(5, 7), 16)}, 0.6) 50%, transparent 100%)`,
          boxShadow: `0 0 8px 2px rgba(${parseInt(edgeEnergyColor.slice(1, 3), 16)}, ${parseInt(edgeEnergyColor.slice(3, 5), 16)}, ${parseInt(edgeEnergyColor.slice(5, 7), 16)}, 0.6)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `${particle.id}-pull`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: particle.delay + rapidExpansionEnd,
            duration: stablePortalEnd - rapidExpansionEnd - particle.delay,
            mode: 'provider',
            targetIds: [particle.id],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              {
                key: 'translateX',
                val: `${(50 - parseFloat(particle.left)) * 10}px`,
                prog: 1,
              },
              { key: 'translateY', val: '0px', prog: 0 },
              {
                key: 'translateY',
                val: `${(50 - parseFloat(particle.top)) * 10}px`,
                prog: 1,
              },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    })) as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'demonic-portal-root',
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
        duration,
      },
    },
    childrenData: [
      svgFilters,
      backgroundLayer,
      distortionLayer,
      portalContainer,
      particleSystem,
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

const presetMetadata: PresetMetadata = {
  id: 'demonic-portal-transition',
  title: 'Demonic Portal Transition',
  description:
    'A supernatural gateway transition where a hellish portal tears open in the center of the screen with reality-warping distortion, swirling inner chaos, gravitational particle effects, and configurable closure or consumption ending. Features layered chaos effects, pulsing edges, and particles being sucked into the vortex.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'portal',
    'demonic',
    'hellish',
    'supernatural',
    'horror',
    'vortex',
    'chaos',
    'distortion',
    'particles',
  ],
  defaultInputParams: {
    duration: 10,
    endBehavior: 'closure',
    portalSize: 400,
    distortionIntensity: 1,
    particleCount: 20,
    edgeEnergyColor: '#ff3300',
    chaosColors: {
      primary: '#ff3300',
      secondary: '#ff6600',
      tertiary: '#ff0000',
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const demonicPortalTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
