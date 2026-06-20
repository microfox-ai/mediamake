/**
 * Page Burn Transition Preset
 *
 * Creates a dramatic page burn transition where the outgoing video appears to burn away from the edges inward,
 * revealing the incoming video through the burnt areas. Features realistic fire effects at the burning border,
 * irregular burn progression, orange glow before turning to ash, falling ash particles with gravity,
 * heat distortion at the edges, smoke particles rising from burning edges, and a subtle heat shimmer effect
 * across the entire frame during the burn.
 *
 * Features:
 * - **Irregular Burn Progression**: Non-linear burn pattern using animated SVG turbulence filter and custom gradient mask
 * - **Realistic Fire Effects**: Orange glow and ember effects at burn edges with contrast/brightness/hue-rotate filters
 * - **Falling Ash Particles**: Animated ash particles with gravity and opacity fade
 * - **Heat Distortion**: Blur transition on incoming video for heat shimmer effect
 * - **Rising Smoke**: Smoke particles rising from burning edges
 * - **Heat Shimmer Overlay**: Subtle shimmer effect across the entire frame
 * - **2-Second Overlap**: Organic burn progression with configurable overlap duration
 *
 * Use cases:
 * - Creating dramatic transitions between video clips
 * - Adding fire/burn effects to video montages
 * - Building cinematic scene transitions
 * - Adding visual interest to video sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL or path of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL or path of the incoming video'),
  outgoingDuration: z.number().describe('Duration of the outgoing video in seconds'),
  incomingDuration: z.number().describe('Duration of the incoming video in seconds'),
  overlapDuration: z.number().default(2).describe('Duration of the burn transition overlap in seconds'),
  burnEdgeTextureSrc: z.string().optional().describe('Optional burn edge texture image source (ember/fire pattern)'),
  ashParticleCount: z.number().default(20).describe('Number of ash particles to generate'),
  smokeParticleCount: z.number().default(10).describe('Number of smoke particles to generate'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingDuration,
    incomingDuration,
    overlapDuration,
    burnEdgeTextureSrc,
    ashParticleCount,
    smokeParticleCount,
  } = params;

  // Helper function to generate random position
  const randomPosition = () => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
  });

  // Helper function to generate ash particles
  const generateAshParticles = (count: number): RenderableComponentData[] => {
    return Array.from({ length: count }, (_, i) => {
      const position = randomPosition();
      const size = 4 + Math.random() * 6; // 4-10px
      const fallDistance = 200 + Math.random() * 300; // 200-500px
      const duration = 0.8 + Math.random() * 1.2; // 0.8-2s
      const delay = Math.random() * overlapDuration * 0.7; // Start within first 70% of transition
      const rotation = Math.random() * 360;
      const shade = 40 + Math.random() * 30; // Gray shades

      return {
        id: `ash-particle-${i}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; background: rgb(${shade}, ${shade}, ${shade}); border-radius: 2px; transform: rotate(${rotation}deg);"></div>`,
          className: 'absolute pointer-events-none',
          style: {
            left: position.left,
            top: position.top,
          },
        },
        context: {
          timing: {
            start: delay,
            duration: duration,
          },
        },
        effects: [
          {
            id: `ash-fall-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [`ash-particle-${i}`],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: fallDistance, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'rotate', val: rotation, prog: 0 },
                { key: 'rotate', val: rotation + 180, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    });
  };

  // Helper function to generate smoke particles
  const generateSmokeParticles = (count: number): RenderableComponentData[] => {
    return Array.from({ length: count }, (_, i) => {
      const position = randomPosition();
      const size = 30 + Math.random() * 40; // 30-70px
      const riseDistance = 150 + Math.random() * 200; // 150-350px
      const duration = 1.2 + Math.random() * 1.5; // 1.2-2.7s
      const delay = Math.random() * overlapDuration * 0.6; // Start within first 60% of transition
      const opacity = 0.2 + Math.random() * 0.3; // 0.2-0.5 initial opacity
      const blur = 8 + Math.random() * 8; // 8-16px blur

      return {
        id: `smoke-particle-${i}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; background: radial-gradient(circle, rgba(100, 100, 100, ${opacity}) 0%, transparent 70%); border-radius: 50%; filter: blur(${blur}px);"></div>`,
          className: 'absolute pointer-events-none',
          style: {
            left: position.left,
            top: position.top,
          },
        },
        context: {
          timing: {
            start: delay,
            duration: duration,
          },
        },
        effects: [
          {
            id: `smoke-rise-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [`smoke-particle-${i}`],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -riseDistance, prog: 1 },
                { key: 'opacity', val: opacity, prog: 0 },
                { key: 'opacity', val: opacity * 0.8, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1.5, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    });
  };

  // Calculate base layout duration (sum minus overlap)
  const baseLayoutDuration = outgoingDuration + incomingDuration - overlapDuration;

  // SVG filter for turbulence (irregular burn edges)
  const svgFilterId = 'burn-turbulence-filter';
  const svgFilterDef = `
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <defs>
        <filter id="${svgFilterId}" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="turbulence">
            <animate attributeName="baseFrequency" 
                     values="0.015;0.025;0.015" 
                     dur="${overlapDuration}s" 
                     repeatCount="1"/>
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="50" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
    </svg>
  `;

  // Build the composition
  const childrenData: RenderableComponentData[] = [
    // SVG filter definition
    {
      id: 'svg-filter-def',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: svgFilterDef,
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
    } as RenderableComponentData,

    // Incoming video (behind, starts before outgoing ends)
    {
      id: 'incoming-video',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: outgoingDuration - overlapDuration,
          duration: incomingDuration + overlapDuration,
        },
      },
      effects: [
        {
          id: 'incoming-heat-distortion',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'filter', val: 'blur(4px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Outgoing video (with burn effects)
    {
      id: 'outgoing-video',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingDuration,
        },
      },
      effects: [
        // Irregular mask-based burn away effect
        {
          id: 'burn-mask-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingDuration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { 
                key: 'maskImage', 
                val: 'radial-gradient(circle at 50% 50%, black 100%, transparent 100%)', 
                prog: 0 
              },
              { 
                key: 'maskImage', 
                val: 'radial-gradient(circle at 50% 50%, black 50%, transparent 70%)', 
                prog: 0.5 
              },
              { 
                key: 'maskImage', 
                val: 'radial-gradient(circle at 50% 50%, transparent 0%, transparent 100%)', 
                prog: 1 
              },
            ],
          },
        },
        // Orange glow at burn edges
        {
          id: 'burn-edge-glow',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingDuration - overlapDuration,
            duration: overlapDuration * 0.7,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { 
                key: 'filter', 
                val: 'contrast(1) brightness(1) hue-rotate(0deg) drop-shadow(0 0 0px rgba(255,100,0,0))', 
                prog: 0 
              },
              { 
                key: 'filter', 
                val: 'contrast(1.5) brightness(1.2) hue-rotate(-20deg) drop-shadow(0 0 20px rgba(255,100,0,0.9))', 
                prog: 0.5 
              },
              { 
                key: 'filter', 
                val: 'contrast(1.8) brightness(1.5) hue-rotate(-30deg) drop-shadow(0 0 30px rgba(255,60,0,1))', 
                prog: 1 
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Burn edge texture overlay (if provided)
    ...(burnEdgeTextureSrc ? [{
      id: 'burn-edge-texture',
      type: 'atom' as const,
      componentId: 'ImageAtom',
      data: {
        src: burnEdgeTextureSrc,
        className: 'absolute inset-0 w-full h-full pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'texture-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['burn-edge-texture'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData] : []),

    // Ash particles container
    {
      id: 'ash-particles-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-visible',
        },
      },
      context: {
        timing: {
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
        },
      },
      childrenData: generateAshParticles(ashParticleCount),
    } as RenderableComponentData,

    // Smoke particles container
    {
      id: 'smoke-particles-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-visible',
        },
      },
      context: {
        timing: {
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
        },
      },
      childrenData: generateSmokeParticles(smokeParticleCount),
    } as RenderableComponentData,

    // Heat shimmer overlay
    {
      id: 'heat-shimmer-overlay',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background: linear-gradient(90deg, transparent 0%, rgba(255,120,50,0.05) 50%, transparent 100%);"></div>',
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'overlay',
        },
      },
      context: {
        timing: {
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'shimmer-wave',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['heat-shimmer-overlay'],
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '100%', prog: 1 },
              { key: 'opacity', val: 0.3, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'page-burn-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-visible',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData,
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
  id: 'page-burn-transition',
  title: 'Page Burn Transition',
  description:
    'A dramatic page burn transition where the outgoing video appears to burn away from the edges inward with realistic fire effects at the burning border. Features irregular burn progression, orange glow before turning to ash, falling ash particles with gravity, heat distortion on the incoming video, smoke particles rising from burning edges, and a subtle heat shimmer effect across the entire frame during the burn.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'burn', 'fire', 'ash', 'smoke', 'heat', 'cinematic', 'dramatic'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    outgoingDuration: 10,
    incomingDuration: 10,
    overlapDuration: 2,
    burnEdgeTextureSrc: undefined,
    ashParticleCount: 20,
    smokeParticleCount: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const pageBurnTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
