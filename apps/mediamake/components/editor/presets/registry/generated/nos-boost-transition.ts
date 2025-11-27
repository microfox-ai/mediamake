/**
 * NOS Boost Transition Preset
 *
 * High-octane Fast & Furious-inspired transition effect featuring nitrous boost visual elements.
 * Combines radial blur zoom, electric spark effects, aggressive color grading shifts, animated
 * tachometer-style scan lines, particle burst explosions, and overexposure flash. Creates the
 * sensation of hitting the NOS button with explosive energy that builds tension then explodes
 * outward, making content appear to accelerate into hyperspace before snapping to the next scene.
 *
 * Features:
 * - **Tension Build Phase (0-0.2s)**: Scan lines sweep, particles gather, radial blur starts, color grading intensifies
 * - **Explosion Phase (0.2-0.4s)**: Particles burst outward, electric sparks flash, overexposure peaks, scale expands, blur increases
 * - **Snap Phase (0.4-0.5s)**: Outgoing video fades out, incoming video fades in, all effects reset
 * - **Radial Blur Zoom**: CSS filter blur() animated from 0 to 20px combined with scale from 1 to 1.5
 * - **Scan Lines**: Repeating linear-gradient backgrounds animated across screen using translateX
 * - **Particle Burst**: 24 small divs with rounded-full bg-white positioned at center, animated outward with opacity fading
 * - **Electric Sparks**: Elongated divs with gradient backgrounds rotated in multiple directions
 * - **Overexposure Flash**: White overlay div animating opacity [0,0.9,0] over 0.15s
 * - **Color Grading**: Gradient overlay with mixBlendMode for aggressive color shifts
 *
 * Use cases:
 * - Creating explosive transitions between racing shots
 * - Building high-energy cuts for action content
 * - Adding nitrous boost visual effects to video transitions
 * - Creating hyperspace acceleration effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video or image'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video or image'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(0.5)
    .describe('Total duration of the NOS boost transition effect in seconds'),
  outgoingVideoType: z
    .enum(['video', 'image'])
    .default('video')
    .describe('Type of outgoing media'),
  incomingVideoType: z
    .enum(['video', 'image'])
    .default('video')
    .describe('Type of incoming media'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingVideoDuration,
    incomingVideoDuration,
    transitionDuration,
    outgoingVideoType,
    incomingVideoType,
  } = params;

  // Calculate total duration (overlapping transition)
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Timing phases (relative to transition start)
  const tensionBuildDuration = 0.2; // 0-0.2s
  const explosionDuration = 0.2; // 0.2-0.4s
  const snapDuration = 0.1; // 0.4-0.5s

  // Transition starts when outgoing video is about to end
  const transitionStartTime = outgoingVideoDuration - transitionDuration;

  // Generate 24 particles with varying angles and distances
  const generateParticles = (): RenderableComponentData[] => {
    const particles: RenderableComponentData[] = [];
    const particleCount = 24;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * 360;
      const distance = 150 + Math.random() * 200; // 150-350px
      const size = 3 + Math.random() * 5; // 3-8px
      const speed = 0.15 + Math.random() * 0.15; // 0.15-0.3s

      const radians = (angle * Math.PI) / 180;
      const translateX = Math.cos(radians) * distance;
      const translateY = Math.sin(radians) * distance;

      // Particle colors (white, orange, red spectrum)
      const colorVariants = [
        '#ffffff',
        '#ffcc00',
        '#ff6600',
        '#ff4400',
        '#ff8800',
      ];
      const color = colorVariants[i % colorVariants.length];

      particles.push({
        id: `particle-${i}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute rounded-full',
            style: {
              width: `${size}px`,
              height: `${size}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: color,
              boxShadow: `0 0 ${size * 2}px ${color}`,
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
            id: `particle-burst-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: tensionBuildDuration,
              duration: explosionDuration,
              mode: 'provider',
              targetIds: [`particle-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: translateX, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: translateY, prog: 1 },
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0.5, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      });
    }

    return particles;
  };

  // Generate scan lines (8 vertical lines sweeping across)
  const generateScanLines = (): RenderableComponentData[] => {
    const scanLines: RenderableComponentData[] = [];
    const scanLineCount = 8;

    for (let i = 0; i < scanLineCount; i++) {
      const delay = i * 0.025; // Stagger start times
      const leftPosition = (i / scanLineCount) * 100;

      scanLines.push({
        id: `scan-line-${i}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute h-full',
            style: {
              width: '4px',
              left: `${leftPosition}%`,
              top: '0',
              background:
                'linear-gradient(to bottom, transparent, rgba(255,100,0,0.8), rgba(255,200,0,0.6), transparent)',
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
            id: `scan-line-sweep-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: delay,
              duration: tensionBuildDuration - delay,
              mode: 'provider',
              targetIds: [`scan-line-${i}`],
              ranges: [
                { key: 'translateX', val: '-100vw', prog: 0 },
                { key: 'translateX', val: '100vw', prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      });
    }

    return scanLines;
  };

  // Generate electric sparks (6 rotated lines)
  const generateElectricSparks = (): RenderableComponentData[] => {
    const sparks: RenderableComponentData[] = [];
    const sparkCount = 6;

    for (let i = 0; i < sparkCount; i++) {
      const rotation = (i / sparkCount) * 360;
      const length = 100 + Math.random() * 40; // 100-140px
      const thickness = 3 + Math.random() * 2; // 3-5px

      sparks.push({
        id: `spark-${i}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              width: `${length}px`,
              height: `${thickness}px`,
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
              background:
                'linear-gradient(to right, rgba(0,255,255,1), rgba(0,150,255,0.8), transparent)',
              borderRadius: '2px',
              boxShadow: '0 0 20px rgba(0,255,255,0.8)',
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
            id: `spark-flash-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: tensionBuildDuration,
              duration: 0.1,
              mode: 'provider',
              targetIds: [`spark-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'scaleX', val: 0.5, prog: 0 },
                { key: 'scaleX', val: 1.5, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      });
    }

    return sparks;
  };

  const childrenData: RenderableComponentData[] = [
    // Outgoing video/image
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: outgoingVideoType === 'video' ? 'VideoAtom' : 'ImageAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      effects: [
        // Fade out during snap phase
        {
          id: 'outgoing-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start:
              transitionStartTime +
              tensionBuildDuration +
              explosionDuration,
            duration: snapDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    },

    // Incoming video/image
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: incomingVideoType === 'video' ? 'VideoAtom' : 'ImageAtom',
      data: {
        src: incomingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: incomingVideoDuration + transitionDuration,
        },
      },
      effects: [
        // Fade in during snap phase
        {
          id: 'incoming-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: tensionBuildDuration + explosionDuration,
            duration: snapDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    },

    // Radial blur layer
    {
      id: 'radial-blur-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 10,
            transform: 'translate3d(0,0,0)',
          },
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'radial-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: tensionBuildDuration,
            duration: explosionDuration,
            mode: 'provider',
            targetIds: ['radial-blur-layer'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(20px)', prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.5, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    },

    // Scan lines container
    {
      id: 'scan-lines-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-hidden',
          style: {
            zIndex: 15,
          },
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      childrenData: generateScanLines(),
      effects: [],
    },

    // Particle burst container
    {
      id: 'particle-burst-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 20,
          },
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      childrenData: generateParticles(),
      effects: [],
    },

    // Electric sparks container
    {
      id: 'electric-sparks-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 25,
          },
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      childrenData: generateElectricSparks(),
      effects: [],
    },

    // Overexposure flash layer
    {
      id: 'overexposure-flash-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 30,
            backgroundColor: '#ffffff',
          },
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'overexposure-flash-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: tensionBuildDuration,
            duration: 0.15,
            mode: 'provider',
            targetIds: ['overexposure-flash-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.9, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    },

    // Color grade overlay
    {
      id: 'color-grade-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 5,
            background:
              'linear-gradient(135deg, rgba(255,100,0,0.15), rgba(0,150,255,0.1), transparent)',
            mixBlendMode: 'overlay',
          },
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'color-grade-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: tensionBuildDuration + explosionDuration,
            mode: 'provider',
            targetIds: ['color-grade-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: 'nos-boost-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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
  id: 'nos-boost-transition',
  title: 'NOS Boost Transition',
  description:
    'High-octane Fast & Furious-inspired transition effect featuring nitrous boost visual elements. Combines radial blur zoom, electric spark effects, aggressive color grading shifts, animated tachometer-style scan lines, particle burst explosions, and overexposure flash. Creates the sensation of hitting the NOS button with explosive energy that builds tension then explodes outward, making content appear to accelerate into hyperspace before snapping to the next scene.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'fast-furious',
    'nos-boost',
    'nitrous',
    'radial-blur',
    'electric-sparks',
    'scan-lines',
    'particle-burst',
    'overexposure',
    'color-grading',
    'high-octane',
    'explosive',
    'hyperspace',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    transitionDuration: 0.5,
    outgoingVideoType: 'video',
    incomingVideoType: 'video',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const nosBoostTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};