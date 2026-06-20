/**
 * Crystal Ball Fortune-Teller Lens Transition Preset
 *
 * Creates a mystical magnifying glass transition with swirling distortions, prismatic light
 * refraction, floating ethereal motion, and particle effects. The lens reveals the incoming
 * video while the outgoing video dissolves in smoky wisps.
 *
 * Features:
 * - **Swirling Distortion**: Combined rotate and scale effects in opposing directions
 * - **Prismatic Edges**: Multiple box-shadows with rainbow colors at varying blur radii
 * - **Floating Motion**: Smooth sin/cos-based translateX/Y path with rotation and scale
 * - **Particle System**: Swirling particles with animation-delay stagger, orbiting the lens
 * - **Fog Overlay**: Animated gradient fog with pulsing opacity
 * - **Coordinated Effects**: All effects use provider mode with targetIds for precise control
 *
 * Technical Specifications:
 * - BaseLayout with 3s overlap timing
 * - Swirl distortion using CSS transform (rotate + scale in opposing directions)
 * - Prismatic edges via multiple box-shadows with rainbow colors
 * - Float path with translateX/Y sin/cos smooth curves
 * - Outgoing video: opacity with exponential-out easing, blur 0-6px
 * - Incoming reveal: mask-image with radial-gradient, 30% feather edge
 * - Particle system: absolute divs with staggered animation-delay, circular orbits
 * - Fog effect: radial-gradient overlays with animated opacity
 * - Z-layers: particles z-40, lens z-30, videos z-10/20
 *
 * Use cases:
 * - Mystical or fantasy video transitions
 * - Fortune-teller or magic-themed content
 * - Dreamlike or ethereal scene changes
 * - Creative transitions for storytelling videos
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
    src: z.string().describe('Source URL of outgoing video'),
    type: z.enum(['image', 'video']).describe('Media type'),
  }).describe('Outgoing media that dissolves in smoky wisps'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    type: z.enum(['image', 'video']).describe('Media type'),
  }).describe('Incoming media revealed through the crystal ball lens'),
  transitionDuration: z
    .number()
    .default(3)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Determine component IDs based on media type
  const outgoingComponentId = outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Create particle components (6 particles orbiting the lens)
  const particleCount = 6;
  const particles: RenderableComponentData[] = [];
  
  for (let i = 0; i < particleCount; i++) {
    const staggerDelay = i * 0.2; // Stagger start times
    const particleSize = [8, 6, 10, 7, 9, 5][i];
    const particleColors = [
      'rgba(255,100,255,0.8)', // Magenta
      'rgba(100,255,255,0.8)', // Cyan
      'rgba(255,255,100,0.8)', // Yellow
      'rgba(255,150,200,0.8)', // Pink
      'rgba(150,200,255,0.8)', // Light Blue
      'rgba(200,150,255,0.8)', // Lavender
    ];
    const particleColor = particleColors[i];
    
    // Orbital motion parameters (circular paths with varying radii)
    const orbitRadiusX = [150, 120, 100, 90, 110, 70][i];
    const orbitRadiusY = [100, 80, 60, 70, 90, 50][i];
    const rotationDirection = i % 2 === 0 ? 1 : -1; // Alternate rotation directions
    const rotationSpeed = rotationDirection * (i % 2 === 0 ? 720 : -540);
    
    particles.push({
      id: `particle-${i + 1}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute rounded-full',
        style: {
          width: `${particleSize}px`,
          height: `${particleSize}px`,
          backgroundColor: particleColor,
          top: '50%',
          left: '50%',
          boxShadow: `0 0 ${particleSize + 2}px ${particleColor}`,
        },
      },
      context: {
        timing: {
          start: staggerDelay,
          duration: transitionDuration - staggerDelay,
        },
      },
      effects: [
        {
          id: `particle-${i + 1}-orbit`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [`particle-${i + 1}`],
            ranges: [
              // Circular motion using translateX/Y
              { key: 'translateX', val: orbitRadiusX, prog: 0 },
              { key: 'translateX', val: 0, prog: 0.25 },
              { key: 'translateX', val: -orbitRadiusX, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 0.75 },
              { key: 'translateX', val: orbitRadiusX, prog: 1 },
              { key: 'translateY', val: -orbitRadiusY, prog: 0 },
              { key: 'translateY', val: 0, prog: 0.25 },
              { key: 'translateY', val: orbitRadiusY, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 0.75 },
              { key: 'translateY', val: -orbitRadiusY, prog: 1 },
              // Spinning rotation
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationSpeed, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Build the composition
  const childrenData: RenderableComponentData[] = [
    // Outgoing video container (z-10)
    {
      id: 'outgoing-video-container',
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
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: outgoingComponentId,
          data: {
            src: outgoingVideo.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: 'outgoing-fade-blur',
              componentId: 'generic',
              data: {
                type: 'exponential-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'blur', val: 0, prog: 0 },
                  { key: 'blur', val: 6, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
    
    // Incoming video container (z-20)
    {
      id: 'incoming-video-container',
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
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: incomingComponentId,
          data: {
            src: incomingVideo.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              maskImage: 'radial-gradient(circle at 50% 50%, black 0%, black 0%, transparent 30%)',
              WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 0%, black 0%, transparent 30%)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: 'incoming-mask-reveal',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'maskSize', val: 0, prog: 0 },
                  { key: 'maskSize', val: 100, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
    
    // Fog overlay (z-25)
    {
      id: 'fog-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 25,
            background: 'radial-gradient(ellipse at center, transparent 30%, rgba(255,255,255,0.15) 70%, rgba(255,255,255,0.3) 100%)',
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
        {
          id: 'fog-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['fog-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Lens container with floating motion (z-30)
    {
      id: 'lens-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute pointer-events-none',
          style: {
            zIndex: 30,
            top: '50%',
            left: '50%',
            width: '400px',
            height: '400px',
            marginTop: '-200px',
            marginLeft: '-200px',
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
          id: 'lens-core',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '<div></div>',
            className: 'w-full h-full rounded-full',
            style: {
              border: '8px solid rgba(255,255,255,0.4)',
              boxShadow: '0 0 20px 5px rgba(255,0,255,0.6), 0 0 40px 10px rgba(0,255,255,0.5), 0 0 60px 15px rgba(255,255,0,0.4), 0 0 80px 20px rgba(255,100,200,0.3), 0 0 100px 25px rgba(100,200,255,0.2)',
              backdropFilter: 'blur(2px)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: 'prismatic-pulse',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['lens-core'],
                ranges: [
                  { key: 'opacity', val: 0.7, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.5 },
                  { key: 'opacity', val: 0.8, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: 'lens-float-path',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['lens-container'],
            ranges: [
              // Floating X motion (sin curve)
              { key: 'translateX', val: -50, prog: 0 },
              { key: 'translateX', val: 0, prog: 0.25 },
              { key: 'translateX', val: 30, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 0.75 },
              { key: 'translateX', val: 50, prog: 1 },
              // Floating Y motion (cos curve)
              { key: 'translateY', val: 30, prog: 0 },
              { key: 'translateY', val: -20, prog: 0.33 },
              { key: 'translateY', val: 10, prog: 0.66 },
              { key: 'translateY', val: -30, prog: 1 },
              // Rotation (full 360 with initial offset)
              { key: 'rotate', val: -10, prog: 0 },
              { key: 'rotate', val: 360, prog: 1 },
              // Scale pulsing
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Particles container (z-40)
    {
      id: 'particles-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 40,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: particles,
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'crystal-ball-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
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
  id: 'crystalBallLensTransition',
  title: 'Crystal Ball Fortune-Teller Lens Transition',
  description: 'A mystical magnifying lens transition with swirling distortions, prismatic rainbow edges, floating ethereal motion, particle effects, and fog overlays. The lens reveals the incoming video while the outgoing video dissolves in smoky wisps. Features provider-mode effects with coordinated timing for all animations.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'mystical', 'crystal-ball', 'lens', 'prismatic', 'particles', 'fog', 'ethereal'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
    },
    transitionDuration: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crystalBallLensTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};