/**
 * Tornado Twist-Off Transition
 *
 * This preset creates a dramatic tornado-style transition where the outgoing video is torn away
 * in a spiraling motion while the incoming video assembles from scattered pieces.
 *
 * Features:
 * - **Quadrant Fragmentation**: Each video is split into 4 quadrants (top-left, top-right, bottom-left, bottom-right)
 * - **Differential Rotation**: Each quadrant rotates at different speeds (270°, 360°, 450°, 540°)
 * - **Spiral Trajectories**: Outgoing quadrants spiral outward, incoming quadrants spiral inward
 * - **Turbulence Effects**: Random translate wobbles add natural tornado-like motion
 * - **Dust Particles**: 15 semi-transparent particles swirl around the tornado path
 * - **1.3-second Overlap**: Both videos visible during transition for dramatic effect
 *
 * Use cases:
 * - Action-packed video transitions
 * - High-energy montages
 * - Dynamic scene changes
 * - Chaotic/intense visual storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  videoSource1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type of source 1'),
  }).describe('Outgoing video/image source'),
  
  videoSource2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type of source 2'),
  }).describe('Incoming video/image source'),
  
  transitionDuration: z
    .number()
    .default(1.3)
    .describe('Duration of the tornado transition overlap in seconds'),
    
  rotationSpeeds: z.object({
    outgoing: z.object({
      topLeft: z.number().default(270).describe('Rotation degrees for outgoing top-left quadrant'),
      topRight: z.number().default(360).describe('Rotation degrees for outgoing top-right quadrant'),
      bottomLeft: z.number().default(450).describe('Rotation degrees for outgoing bottom-left quadrant'),
      bottomRight: z.number().default(540).describe('Rotation degrees for outgoing bottom-right quadrant'),
    }).describe('Rotation speeds for outgoing quadrants'),
    incoming: z.object({
      topLeft: z.number().default(540).describe('Rotation degrees for incoming top-left quadrant'),
      topRight: z.number().default(450).describe('Rotation degrees for incoming top-right quadrant'),
      bottomLeft: z.number().default(360).describe('Rotation degrees for incoming bottom-left quadrant'),
      bottomRight: z.number().default(270).describe('Rotation degrees for incoming bottom-right quadrant'),
    }).describe('Rotation speeds for incoming quadrants'),
  }).optional().describe('Custom rotation speeds for each quadrant'),
  
  wobbleIntensity: z.number().default(5).describe('Intensity of random wobble in pixels'),
  
  particleCount: z.number().default(15).describe('Number of dust particles'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videoSource1,
    videoSource2,
    transitionDuration,
    rotationSpeeds,
    wobbleIntensity,
    particleCount,
  } = params;

  // Helper: Determine component type
  const getComponentId = (type: 'video' | 'image'): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  // Helper: Generate random wobble keyframes
  const generateWobble = (intensity: number) => {
    const wobbleFrames = [];
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const wobbleX = (Math.random() - 0.5) * 2 * intensity;
      const wobbleY = (Math.random() - 0.5) * 2 * intensity;
      wobbleFrames.push(
        { key: 'translateX', val: wobbleX, prog },
        { key: 'translateY', val: wobbleY, prog }
      );
    }
    return wobbleFrames;
  };

  // Rotation speeds
  const rotOut = rotationSpeeds?.outgoing || {
    topLeft: 270,
    topRight: 360,
    bottomLeft: 450,
    bottomRight: 540,
  };
  const rotIn = rotationSpeeds?.incoming || {
    topLeft: 540,
    topRight: 450,
    bottomLeft: 360,
    bottomRight: 270,
  };

  // Outgoing quadrants
  const outgoingQuadrants: RenderableComponentData[] = [
    // Top-left
    {
      id: 'outgoing-quad-top-left',
      type: 'atom',
      componentId: getComponentId(videoSource1.type),
      data: {
        src: videoSource1.src,
        className: 'absolute',
        style: {
          top: 0,
          left: 0,
          width: '200%',
          height: '200%',
          objectFit: 'cover',
          clipPath: 'polygon(0 0, 50% 0, 50% 50%, 0 50%)',
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
          id: 'effect-outgoing-tl',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-quad-top-left'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotOut.topLeft, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -300, prog: 0.5 },
              { key: 'translateX', val: -600, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -150, prog: 0.5 },
              { key: 'translateY', val: -400, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
              ...generateWobble(wobbleIntensity),
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Top-right
    {
      id: 'outgoing-quad-top-right',
      type: 'atom',
      componentId: getComponentId(videoSource1.type),
      data: {
        src: videoSource1.src,
        className: 'absolute',
        style: {
          top: 0,
          left: '-100%',
          width: '200%',
          height: '200%',
          objectFit: 'cover',
          clipPath: 'polygon(50% 0, 100% 0, 100% 50%, 50% 50%)',
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
          id: 'effect-outgoing-tr',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-quad-top-right'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotOut.topRight, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 350, prog: 0.5 },
              { key: 'translateX', val: 700, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -200, prog: 0.5 },
              { key: 'translateY', val: -500, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
              ...generateWobble(wobbleIntensity),
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Bottom-left
    {
      id: 'outgoing-quad-bottom-left',
      type: 'atom',
      componentId: getComponentId(videoSource1.type),
      data: {
        src: videoSource1.src,
        className: 'absolute',
        style: {
          top: '-100%',
          left: 0,
          width: '200%',
          height: '200%',
          objectFit: 'cover',
          clipPath: 'polygon(0 50%, 50% 50%, 50% 100%, 0 100%)',
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
          id: 'effect-outgoing-bl',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-quad-bottom-left'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotOut.bottomLeft, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -400, prog: 0.5 },
              { key: 'translateX', val: -800, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 250, prog: 0.5 },
              { key: 'translateY', val: 600, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
              ...generateWobble(wobbleIntensity),
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Bottom-right
    {
      id: 'outgoing-quad-bottom-right',
      type: 'atom',
      componentId: getComponentId(videoSource1.type),
      data: {
        src: videoSource1.src,
        className: 'absolute',
        style: {
          top: '-100%',
          left: '-100%',
          width: '200%',
          height: '200%',
          objectFit: 'cover',
          clipPath: 'polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)',
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
          id: 'effect-outgoing-br',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-quad-bottom-right'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotOut.bottomRight, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 450, prog: 0.5 },
              { key: 'translateX', val: 900, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 300, prog: 0.5 },
              { key: 'translateY', val: 700, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
              ...generateWobble(wobbleIntensity),
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Incoming quadrants
  const incomingQuadrants: RenderableComponentData[] = [
    // Top-left
    {
      id: 'incoming-quad-top-left',
      type: 'atom',
      componentId: getComponentId(videoSource2.type),
      data: {
        src: videoSource2.src,
        className: 'absolute',
        style: {
          top: 0,
          left: 0,
          width: '200%',
          height: '200%',
          objectFit: 'cover',
          clipPath: 'polygon(0 0, 50% 0, 50% 50%, 0 50%)',
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
          id: 'effect-incoming-tl',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-quad-top-left'],
            ranges: [
              { key: 'rotate', val: rotIn.topLeft, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'translateX', val: -600, prog: 0 },
              { key: 'translateX', val: -300, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: -500, prog: 0 },
              { key: 'translateY', val: -200, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.4, prog: 0.4 },
              { key: 'opacity', val: 1, prog: 1 },
              ...generateWobble(wobbleIntensity),
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Top-right
    {
      id: 'incoming-quad-top-right',
      type: 'atom',
      componentId: getComponentId(videoSource2.type),
      data: {
        src: videoSource2.src,
        className: 'absolute',
        style: {
          top: 0,
          left: '-100%',
          width: '200%',
          height: '200%',
          objectFit: 'cover',
          clipPath: 'polygon(50% 0, 100% 0, 100% 50%, 50% 50%)',
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
          id: 'effect-incoming-tr',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-quad-top-right'],
            ranges: [
              { key: 'rotate', val: rotIn.topRight, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'translateX', val: 700, prog: 0 },
              { key: 'translateX', val: 350, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: -600, prog: 0 },
              { key: 'translateY', val: -250, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.4, prog: 0.4 },
              { key: 'opacity', val: 1, prog: 1 },
              ...generateWobble(wobbleIntensity),
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Bottom-left
    {
      id: 'incoming-quad-bottom-left',
      type: 'atom',
      componentId: getComponentId(videoSource2.type),
      data: {
        src: videoSource2.src,
        className: 'absolute',
        style: {
          top: '-100%',
          left: 0,
          width: '200%',
          height: '200%',
          objectFit: 'cover',
          clipPath: 'polygon(0 50%, 50% 50%, 50% 100%, 0 100%)',
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
          id: 'effect-incoming-bl',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-quad-bottom-left'],
            ranges: [
              { key: 'rotate', val: rotIn.bottomLeft, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'translateX', val: -700, prog: 0 },
              { key: 'translateX', val: -350, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 650, prog: 0 },
              { key: 'translateY', val: 300, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.4, prog: 0.4 },
              { key: 'opacity', val: 1, prog: 1 },
              ...generateWobble(wobbleIntensity),
            ],
          },
        },
      ],
    } as RenderableComponentData,
    
    // Bottom-right
    {
      id: 'incoming-quad-bottom-right',
      type: 'atom',
      componentId: getComponentId(videoSource2.type),
      data: {
        src: videoSource2.src,
        className: 'absolute',
        style: {
          top: '-100%',
          left: '-100%',
          width: '200%',
          height: '200%',
          objectFit: 'cover',
          clipPath: 'polygon(50% 50%, 100% 50%, 100% 100%, 50% 100%)',
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
          id: 'effect-incoming-br',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-quad-bottom-right'],
            ranges: [
              { key: 'rotate', val: rotIn.bottomRight, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'translateX', val: 800, prog: 0 },
              { key: 'translateX', val: 400, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 700, prog: 0 },
              { key: 'translateY', val: 350, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.4, prog: 0.4 },
              { key: 'opacity', val: 1, prog: 1 },
              ...generateWobble(wobbleIntensity),
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Dust particles
  const dustParticles: RenderableComponentData[] = [];
  const particlePositions = [
    { top: '20%', left: '30%' },
    { top: '40%', left: '50%' },
    { top: '60%', left: '70%' },
    { top: '15%', left: '80%' },
    { top: '35%', left: '15%' },
    { top: '55%', left: '40%' },
    { top: '75%', left: '60%' },
    { top: '25%', left: '55%' },
    { top: '45%', left: '25%' },
    { top: '65%', left: '45%' },
    { top: '10%', left: '65%' },
    { top: '30%', left: '85%' },
    { top: '50%', left: '10%' },
    { top: '70%', left: '35%' },
    { top: '80%', left: '75%' },
  ];

  for (let i = 0; i < Math.min(particleCount, particlePositions.length); i++) {
    const size = 5 + Math.random() * 6;
    const opacity = 0.08 + Math.random() * 0.22;
    const rotation = Math.random() * 720 + 360;
    
    const paths = [
      // Spiral outward paths (varied)
      [
        { x: -100, y: 0 },
        { x: 50, y: -80 },
        { x: 150, y: 100 },
        { x: 300, y: 200 },
      ],
      [
        { x: 80, y: -50 },
        { x: -40, y: 60 },
        { x: -180, y: -120 },
        { x: -280, y: -250 },
      ],
      [
        { x: -120, y: 100 },
        { x: 30, y: -50 },
        { x: 200, y: 150 },
        { x: 350, y: 300 },
      ],
    ];
    
    const path = paths[i % paths.length];
    
    dustParticles.push({
      id: `dust-particle-${i + 1}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background-color: rgba(255, 255, 255, ${opacity});"></div>`,
        className: 'absolute',
        style: {
          top: particlePositions[i].top,
          left: particlePositions[i].left,
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
          id: `effect-dust-${i + 1}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`dust-particle-${i + 1}`],
            ranges: [
              { key: 'translateX', val: path[0].x, prog: 0 },
              { key: 'translateX', val: path[1].x, prog: 0.33 },
              { key: 'translateX', val: path[2].x, prog: 0.66 },
              { key: 'translateX', val: path[3].x, prog: 1 },
              { key: 'translateY', val: path[0].y, prog: 0 },
              { key: 'translateY', val: path[1].y, prog: 0.33 },
              { key: 'translateY', val: path[2].y, prog: 0.66 },
              { key: 'translateY', val: path[3].y, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotation, prog: 1 },
              { key: 'opacity', val: opacity * 0.5, prog: 0 },
              { key: 'opacity', val: opacity, prog: 0.5 },
              { key: 'opacity', val: opacity * 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'tornado-transition-root',
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
    childrenData: [
      // Outgoing container
      {
        id: 'outgoing-video-container',
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
        childrenData: outgoingQuadrants,
      } as RenderableComponentData,
      
      // Incoming container
      {
        id: 'incoming-video-container',
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
        childrenData: incomingQuadrants,
      } as RenderableComponentData,
      
      // Dust particles container
      {
        id: 'dust-particles-container',
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
        childrenData: dustParticles,
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
  id: 'tornado-twist-transition',
  title: 'Tornado Twist-Off Transition',
  description:
    'A dramatic tornado-style transition where the outgoing video is torn away in a spiraling motion while the incoming video assembles from scattered pieces. Features differential rotation, spiral trajectories, turbulence wobbles, and swirling dust particles.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'tornado', 'spiral', 'dramatic', 'particles', 'quadrants', 'twist'],
  defaultInputParams: {
    videoSource1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
    },
    videoSource2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
    },
    transitionDuration: 1.3,
    wobbleIntensity: 5,
    particleCount: 15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const tornadoTwistTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
