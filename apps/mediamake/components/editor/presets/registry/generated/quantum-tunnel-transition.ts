/**
 * Quantum Tunnel Transition Preset
 * 
 * Creates a sci-fi interdimensional doorway transition between two videos.
 * The outgoing video spirals and distorts into a central vortex while the incoming
 * video emerges from the same point in reverse. During the transition peak, both videos
 * exist in a quantum superposition state with interference patterns. Includes particle
 * effects and electric arc animations around the doorway for enhanced sci-fi aesthetics.
 * 
 * Features:
 * - Spiral vortex distortion with complex transform animations
 * - Quantum superposition blending during transition peak
 * - Particle effects with random trajectories
 * - Electric arc animations using SVG paths
 * - Hue-rotate color shifting
 * - Sci-fi doorway frame with glowing effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z.number()
    .default(1.5)
    .describe('Duration of the spiral transition in seconds'),
  
  superpositionDuration: z.number()
    .default(0.3)
    .describe('Duration of quantum superposition state in seconds'),
  
  particleCount: z.number()
    .default(6)
    .describe('Number of particle effects around the doorway'),
  
  doorwayGlow: z.boolean()
    .default(true)
    .describe('Enable glowing doorway frame effect'),
  
  hueShift: z.boolean()
    .default(true)
    .describe('Enable hue-rotate color shifting animation'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, superpositionDuration, particleCount, doorwayGlow, hueShift } = params;
  
  // Calculate timing
  const overlapDuration = 0.8;
  const totalDuration = video1.duration + video2.duration - overlapDuration;
  const superpositionStart = video1.duration - overlapDuration / 2;
  
  // Helper function: Create particle effects
  const createParticles = (count: number): RenderableComponentData[] => {
    const particles: RenderableComponentData[] = [];
    const colors = ['cyan', 'magenta', 'white'];
    const positions = [
      { top: '20%', left: '30%' },
      { top: '70%', left: '60%' },
      { top: '40%', left: '80%' },
      { top: '15%', left: '70%' },
      { top: '85%', left: '25%' },
      { top: '55%', left: '15%' },
    ];
    
    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      const size = Math.floor(Math.random() * 3) + 4; // 4-6px
      const pos = positions[i % positions.length];
      
      particles.push({
        id: `particle-${i}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              backgroundColor: color,
              boxShadow: `0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color}`,
              top: pos.top,
              left: pos.left,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: `particle-${i}-trajectory`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: i * 0.05,
              duration: 1.5 + (i % 3) * 0.15,
              mode: 'provider',
              targetIds: [`particle-${i}`],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: (Math.random() - 0.5) * 400, prog: 0.5 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: (Math.random() - 0.5) * 300, prog: 0.5 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 1, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    
    return particles;
  };
  
  // Helper function: Create electric arcs
  const createElectricArcs = (): RenderableComponentData[] => {
    const arcs: RenderableComponentData[] = [];
    
    for (let i = 0; i < 4; i++) {
      const arcPaths = [
        'M 0,50 Q 25,25 50,50 T 100,50',
        'M 0,50 Q 25,75 50,50 T 100,50',
        'M 50,0 Q 25,25 50,50 T 50,100',
        'M 50,0 Q 75,25 50,50 T 50,100',
      ];
      
      arcs.push({
        id: `electric-arc-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `
            <svg viewBox="0 0 100 100" class="absolute inset-0 w-full h-full" style="pointer-events: none;">
              <path
                d="${arcPaths[i]}"
                stroke="cyan"
                stroke-width="2"
                fill="none"
                stroke-dasharray="5 5"
                style="filter: drop-shadow(0 0 5px cyan);"
              />
            </svg>
          `,
          className: 'absolute inset-0 pointer-events-none',
        },
        context: {
          timing: {
            start: superpositionStart,
            duration: superpositionDuration,
          },
        },
        effects: [
          {
            id: `arc-${i}-animation`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: superpositionDuration,
              mode: 'provider',
              targetIds: [`electric-arc-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    
    return arcs;
  };
  
  // Build child components
  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
      id: 'outgoing-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transformOrigin: 'center center',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: 'outgoing-spiral',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: video1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-container'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 720, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Incoming video container
    {
      id: 'incoming-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transformOrigin: 'center center',
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - overlapDuration,
          duration: video2.duration + overlapDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + overlapDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: 'incoming-spiral',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: [
              { key: 'rotate', val: -720, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Superposition layer
    {
      id: 'superposition-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'screen',
            background: 'radial-gradient(circle, rgba(0,255,255,0.3) 0%, transparent 70%)',
          },
        },
      },
      context: {
        timing: {
          start: superpositionStart,
          duration: superpositionDuration,
        },
      },
      effects: [
        {
          id: 'superposition-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: superpositionDuration,
            mode: 'provider',
            targetIds: ['superposition-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 0.8, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Doorway frame (if enabled)
    ...(doorwayGlow ? [{
      id: 'doorway-frame',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [
        {
          id: 'doorway-border',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute',
              style: {
                width: '60%',
                height: '80%',
                border: '4px solid cyan',
                borderRadius: '20px',
                boxShadow: '0 0 30px cyan, 0 0 60px cyan, inset 0 0 30px rgba(0,255,255,0.3)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
          effects: [
            {
              id: 'doorway-glow',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: superpositionStart - 0.5,
                duration: superpositionDuration + 1,
                mode: 'provider',
                targetIds: ['doorway-border'],
                ranges: [
                  { key: 'opacity', val: 0.5, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.5 },
                  { key: 'opacity', val: 0.5, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData] : []),
    
    // Particles container
    {
      id: 'particles-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: createParticles(particleCount),
    } as RenderableComponentData,
    
    // Electric arcs
    ...createElectricArcs(),
  ];
  
  // Root container with optional hue-rotate effect
  const rootContainer: RenderableComponentData = {
    id: 'quantum-tunnel-root',
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
    childrenData,
    effects: hueShift ? [
      {
        id: 'hue-rotate-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['quantum-tunnel-root'],
          ranges: [
            { key: 'hueRotate', val: 0, prog: 0 },
            { key: 'hueRotate', val: 90, prog: 0.5 },
            { key: 'hueRotate', val: 0, prog: 1 },
          ],
        },
      },
    ] : [],
  };
  
  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'quantum-tunnel-transition',
  title: 'Quantum Tunnel Transition',
  description: 'A sci-fi interdimensional doorway transition that warps space-time with spiral vortex animations, quantum superposition effects, glowing doorway frame, floating particles, and hue-shifting color effects as the viewer passes between two video clips.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'sci-fi', 'quantum', 'spiral', 'vortex', 'doorway', 'particles', 'effects'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.5,
    superpositionDuration: 0.3,
    particleCount: 6,
    doorwayGlow: true,
    hueShift: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const quantumTunnelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
