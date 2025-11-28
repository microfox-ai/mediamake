/**
 * Liquid Metal Circle Reveal Preset
 * 
 * T-1000 inspired liquid metal circle reveal with chrome-like surface, undulating edges,
 * and organic droplet animations. Features:
 * - Mercury/liquid metal expanding circle with viscous feel
 * - Fluid, undulating edges with waves and ripples
 * - Metallic chrome reflections with distortion at edges
 * - Heavy, viscous expansion with pooling effect
 * - Droplets that break off and rejoin the main mass
 * - Characteristic liquid metal shimmer with moving highlights
 * - SVG filters for organic edge distortion
 * - Layered circles for depth and chrome effect
 * 
 * Uses simplified approach with HTMLBlockAtom for circles, generic effects for animations,
 * and wipe-reveal preset for base radial reveal functionality.
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  duration: z
    .number()
    .default(2.2)
    .describe('Duration of the reveal animation in seconds'),
  metalColor: z
    .string()
    .default('radial-gradient(circle at 30% 30%, #ffffff 0%, #e0e0e0 25%, #a0a0a0 50%, #707070 75%, #404040 100%)')
    .describe('CSS gradient for the liquid metal surface'),
  backgroundColor: z
    .string()
    .default('linear-gradient(135deg, #1a1a1a 0%, #000000 100%)')
    .describe('Background gradient for the container'),
  enableDroplets: z
    .boolean()
    .default(true)
    .describe('Enable droplet animations that break off and rejoin'),
  dropletCount: z
    .number()
    .min(2)
    .max(8)
    .default(4)
    .describe('Number of droplets to animate'),
  enableChromeSweep: z
    .boolean()
    .default(true)
    .describe('Enable moving chrome shine highlight'),
  viscosity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Viscosity factor - higher values make expansion slower and heavier'),
  edgeUndulation: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Amount of edge waviness/undulation'),
  revealContent: z
    .any()
    .optional()
    .describe('Optional content to reveal - will be passed to wipe-reveal preset'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { presets } = props;
  
  // Validate wipe-reveal dependency
  if (!presets || !presets['wipe-reveal']) {
    throw new Error('Preset dependency "wipe-reveal" not found');
  }

  const duration = params.duration;
  const viscosityEasing = params.viscosity > 1.2 ? 'ease-in' : 'ease-in-out';
  
  // Helper: Generate droplet trajectory
  const generateDropletTrajectory = (index: number, total: number) => {
    const angle = (index / total) * 360;
    const distance = 60 + Math.random() * 40; // 60-100px
    const radians = (angle * Math.PI) / 180;
    const tx = Math.cos(radians) * distance;
    const ty = Math.sin(radians) * distance;
    
    return { tx, ty, angle };
  };

  // Helper: Create droplet size
  const getDropletSize = (index: number) => {
    const sizes = [12, 10, 14, 8, 16, 10, 12, 9];
    return sizes[index % sizes.length];
  };

  // ============================================================================
  // SVG FILTER DEFINITIONS
  // ============================================================================
  
  const svgFilters = `
    <svg style="position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;">
      <defs>
        <filter id="liquid-turbulence">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02"
            numOctaves="3"
            seed="1"
            result="turbulence"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale="${params.edgeUndulation}"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  `;

  // ============================================================================
  // WIPE-REVEAL PRESET (Base Reveal)
  // ============================================================================
  
  const wipeRevealParams = {
    duration,
    revealType: 'radial' as const,
    startPosition: { x: 50, y: 50 }, // Center
    edgeBlur: 2,
    content: params.revealContent || undefined,
  };

  const wipeRevealResult = await presets['wipe-reveal'](wipeRevealParams, props);

  // ============================================================================
  // LIQUID METAL CIRCLES
  // ============================================================================

  // Main metal circle
  const metalCircleMain: RenderableComponentData = {
    id: 'metal-circle-main',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="liquid-metal-main"></div>',
      className: 'absolute',
      style: {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '0px',
        height: '0px',
        borderRadius: '50%',
        background: params.metalColor,
        boxShadow: 'inset -5px -5px 15px rgba(0,0,0,0.5), inset 5px 5px 15px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.2)',
        filter: 'url(#liquid-turbulence)',
        mixBlendMode: 'normal',
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
        id: 'expand-main-circle',
        componentId: 'generic',
        data: {
          type: viscosityEasing,
          start: 0,
          duration: duration * 0.8,
          mode: 'provider',
          targetIds: ['metal-circle-main'],
          ranges: [
            { key: 'width', val: '0px', prog: 0 },
            { key: 'width', val: '200vmax', prog: 1 },
            { key: 'height', val: '0px', prog: 0 },
            { key: 'height', val: '200vmax', prog: 1 },
          ],
        },
      },
    ],
  };

  // Glow layer
  const metalCircleGlow: RenderableComponentData = {
    id: 'metal-circle-glow',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="liquid-metal-glow"></div>',
      className: 'absolute',
      style: {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '0px',
        height: '0px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)',
        filter: 'blur(20px)',
        opacity: 0.6,
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
        id: 'expand-glow-circle',
        componentId: 'generic',
        data: {
          type: viscosityEasing,
          start: 0,
          duration: duration * 0.8,
          mode: 'provider',
          targetIds: ['metal-circle-glow'],
          ranges: [
            { key: 'width', val: '0px', prog: 0 },
            { key: 'width', val: '210vmax', prog: 1 },
            { key: 'height', val: '0px', prog: 0 },
            { key: 'height', val: '210vmax', prog: 1 },
          ],
        },
      },
    ],
  };

  // Inner highlight
  const metalCircleInner: RenderableComponentData = {
    id: 'metal-circle-inner',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="liquid-metal-inner"></div>',
      className: 'absolute',
      style: {
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '0px',
        height: '0px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.8) 0%, rgba(200,200,200,0.4) 40%, transparent 70%)',
        filter: 'blur(5px)',
        opacity: 0.8,
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
        id: 'expand-inner-circle',
        componentId: 'generic',
        data: {
          type: viscosityEasing,
          start: 0,
          duration: duration * 0.8,
          mode: 'provider',
          targetIds: ['metal-circle-inner'],
          ranges: [
            { key: 'width', val: '0px', prog: 0 },
            { key: 'width', val: '200vmax', prog: 1 },
            { key: 'height', val: '0px', prog: 0 },
            { key: 'height', val: '200vmax', prog: 1 },
          ],
        },
      },
    ],
  };

  // Chrome shine sweep
  const chromeShineLayers: RenderableComponentData[] = [];
  
  if (params.enableChromeSweep) {
    chromeShineLayers.push({
      id: 'chrome-shine-layer',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div class="chrome-shine"></div>',
        className: 'absolute',
        style: {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '0px',
          height: '0px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.6) 100%)',
          opacity: 0,
          mixBlendMode: 'screen',
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
          id: 'expand-chrome-shine',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration * 0.8,
            mode: 'provider',
            targetIds: ['chrome-shine-layer'],
            ranges: [
              { key: 'width', val: '0px', prog: 0 },
              { key: 'width', val: '200vmax', prog: 1 },
              { key: 'height', val: '0px', prog: 0 },
              { key: 'height', val: '200vmax', prog: 1 },
            ],
          },
        },
        {
          id: 'shine-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: duration * 0.3,
            duration: duration * 0.5,
            mode: 'provider',
            targetIds: ['chrome-shine-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    });
  }

  // ============================================================================
  // DROPLETS
  // ============================================================================

  const dropletLayers: RenderableComponentData[] = [];
  
  if (params.enableDroplets) {
    const dropletCount = Math.min(params.dropletCount, 8);
    
    for (let i = 0; i < dropletCount; i++) {
      const trajectory = generateDropletTrajectory(i, dropletCount);
      const size = getDropletSize(i);
      const breakOffTime = 0.4 + (i * 0.15);
      const rejoinTime = duration * 0.7 + (i * 0.1);
      const travelDuration = rejoinTime - breakOffTime;
      
      dropletLayers.push({
        id: `droplet-${i}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div class="droplet"></div>',
          className: 'absolute',
          style: {
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #ffffff, #a0a0a0)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            opacity: 0,
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [
          // Break off
          {
            id: `droplet-${i}-break`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: breakOffTime,
              duration: travelDuration * 0.3,
              mode: 'provider',
              targetIds: [`droplet-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 1, prog: 1 },
                { key: 'translateX', val: '0px', prog: 0 },
                { key: 'translateX', val: `${trajectory.tx}px`, prog: 1 },
                { key: 'translateY', val: '0px', prog: 0 },
                { key: 'translateY', val: `${trajectory.ty}px`, prog: 1 },
              ],
            },
          },
          // Rejoin
          {
            id: `droplet-${i}-rejoin`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: breakOffTime + travelDuration * 0.3,
              duration: travelDuration * 0.7,
              mode: 'provider',
              targetIds: [`droplet-${i}`],
              ranges: [
                { key: 'translateX', val: `${trajectory.tx}px`, prog: 0 },
                { key: 'translateX', val: '0px', prog: 1 },
                { key: 'translateY', val: `${trajectory.ty}px`, prog: 0 },
                { key: 'translateY', val: '0px', prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      });
    }
  }

  // ============================================================================
  // COMPOSITION STRUCTURE
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'liquid-metal-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          background: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      // SVG Filters
      {
        id: 'svg-filters',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: svgFilters,
          className: 'absolute inset-0',
          style: {
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      } as RenderableComponentData,
      // Wipe-reveal content (if provided)
      ...(wipeRevealResult.output.childrenData || []),
      // Liquid metal layers
      {
        id: 'liquid-metal-layers',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: [
          metalCircleMain,
          metalCircleGlow,
          metalCircleInner,
          ...chromeShineLayers,
        ] as RenderableComponentData[],
      } as RenderableComponentData,
      // Droplets
      {
        id: 'droplet-layer',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: dropletLayers as RenderableComponentData[],
      } as RenderableComponentData,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'liquid-metal-reveal',
  title: 'Liquid Metal Circle Reveal',
  description:
    'T-1000 inspired liquid metal circle reveal with chrome-like surface, undulating edges, and organic droplet animations. Features mercury-like flowing expansion with metallic reflections.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'reveal',
    'transition',
    'liquid',
    'metal',
    'chrome',
    't-1000',
    'mercury',
    'organic',
    'viscous',
    'droplets',
    'shimmer',
  ],
  dependencies: {
    presets: ['wipe-reveal'],
  },
  defaultInputParams: {
    duration: 2.2,
    metalColor:
      'radial-gradient(circle at 30% 30%, #ffffff 0%, #e0e0e0 25%, #a0a0a0 50%, #707070 75%, #404040 100%)',
    backgroundColor: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
    enableDroplets: true,
    dropletCount: 4,
    enableChromeSweep: true,
    viscosity: 1,
    edgeUndulation: 3,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const liquidMetalRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
