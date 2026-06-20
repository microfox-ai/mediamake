/**
 * NOS Nitrous Boost Transition Preset
 *
 * High-octane Fast & Furious-inspired transition effect with radial blur zoom,
 * particle burst, electric sparks, scan line sweeps, and overexposure flash.
 * Creates the feeling of hitting the NOS button with explosive energy bursts,
 * hyperspace acceleration effect, and dramatic snap cuts between scenes.
 *
 * Features:
 * - **Radial Blur Zoom**: Accelerating blur effect combined with scale animation
 * - **Scan Line Sweeps**: Tachometer-style vertical lines sweeping across the screen
 * - **Particle Burst**: 24 particles exploding from center with varying trajectories
 * - **Electric Sparks**: 6 sparks radiating from center with gradient effects
 * - **Overexposure Flash**: Brief white flash for impact
 * - **Color Grading Overlay**: Aggressive color shifts during transition
 * - **Tension Build Phase**: 0-0.2s subtle build-up
 * - **Explosion Phase**: 0.2s-0.4s full energy burst
 * - **Snap Phase**: 0.4s-0.5s rapid collapse and cut
 *
 * Use cases:
 * - Action video transitions
 * - Racing content cuts
 * - High-energy montage sequences
 * - Dramatic scene changes in music videos
 * - Sports highlight transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  videoSrc: z
    .string()
    .describe('Source URL of the video content to apply transition to'),
  transitionDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.5)
    .describe('Total duration of the transition effect in seconds'),
  tensionBuildDuration: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Duration of the tension build phase in seconds'),
  explosionDuration: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Duration of the explosion phase in seconds'),
  maxBlur: z
    .number()
    .min(10)
    .max(40)
    .default(20)
    .describe('Maximum blur intensity in pixels'),
  maxScale: z
    .number()
    .min(1.2)
    .max(2)
    .default(1.5)
    .describe('Maximum scale factor during zoom'),
  particleCount: z
    .number()
    .min(12)
    .max(48)
    .default(24)
    .describe('Number of particle elements to burst from center'),
  scanLineCount: z
    .number()
    .min(4)
    .max(12)
    .default(8)
    .describe('Number of scan lines sweeping across screen'),
  sparkCount: z
    .number()
    .min(3)
    .max(8)
    .default(6)
    .describe('Number of electric spark elements'),
  flashPeakOpacity: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.9)
    .describe('Peak opacity of the overexposure flash (0-1)'),
  flashDuration: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.15)
    .describe('Duration of the overexposure flash in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videoSrc,
    transitionDuration,
    tensionBuildDuration,
    explosionDuration,
    maxBlur,
    maxScale,
    particleCount,
    scanLineCount,
    sparkCount,
    flashPeakOpacity,
    flashDuration,
  } = params;

  // Calculate phase timings (relative to transition start)
  const tensionEnd = tensionBuildDuration;
  const explosionEnd = tensionEnd + explosionDuration;
  const snapDuration = transitionDuration - explosionEnd;

  // Helper function to generate particle data
  const generateParticles = (count: number): RenderableComponentData[] => {
    const particles: RenderableComponentData[] = [];
    const angleStep = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const angle = angleStep * i;
      const distance = 150 + Math.random() * 200; // Random distance 150-350px
      const translateX = Math.cos(angle) * distance;
      const translateY = Math.sin(angle) * distance;
      const size = 3 + Math.random() * 4; // Random size 3-7px
      const delay = 0.15 + Math.random() * 0.1; // Stagger 0.15-0.25s

      // Particle colors: white, cyan, blue variants
      const colors = ['bg-white', 'bg-cyan-400', 'bg-blue-400', 'bg-cyan-300', 'bg-blue-300', 'bg-cyan-500', 'bg-blue-500'];
      const color = colors[i % colors.length];

      particles.push({
        id: `particle-${i + 1}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `rounded-full ${color} absolute`,
            style: {
              width: `${size}px`,
              height: `${size}px`,
              opacity: 0,
              transform: 'translate3d(0,0,0)',
              willChange: 'transform, opacity',
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
            id: `particle-burst-${i + 1}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: delay,
              duration: explosionDuration,
              mode: 'provider',
              targetIds: [`particle-${i + 1}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: translateX, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: translateY, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      } as RenderableComponentData);
    }

    return particles;
  };

  // Helper function to generate scan lines
  const generateScanLines = (count: number): RenderableComponentData[] => {
    const scanLines: RenderableComponentData[] = [];
    const delayStep = 0.02; // Stagger each line by 20ms

    for (let i = 0; i < count; i++) {
      const delay = i * delayStep;
      const width = i % 3 === 0 ? 'w-2' : 'w-1'; // Vary line width
      const intensity = 0.6 + (Math.random() * 0.4); // 0.6-1.0 opacity

      const gradients = [
        'linear-gradient(to bottom, transparent, rgba(0,255,255,0.8), rgba(255,255,255,0.9), rgba(0,255,255,0.8), transparent)',
        'linear-gradient(to bottom, transparent, rgba(0,200,255,0.7), rgba(255,255,255,0.8), rgba(0,200,255,0.7), transparent)',
        'linear-gradient(to bottom, transparent, rgba(100,255,255,0.6), rgba(255,255,255,0.7), rgba(100,255,255,0.6), transparent)',
      ];
      const gradient = gradients[i % gradients.length];

      scanLines.push({
        id: `scan-line-${i + 1}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `h-full ${width} absolute`,
            style: {
              background: gradient,
              transform: 'translateX(-100vw)',
              willChange: 'transform, opacity',
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
            id: `scan-sweep-${i + 1}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: tensionBuildDuration + delay,
              duration: explosionDuration * 0.8,
              mode: 'provider',
              targetIds: [`scan-line-${i + 1}`],
              ranges: [
                { key: 'translateX', val: '-100vw', prog: 0 },
                { key: 'translateX', val: '100vw', prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: intensity, prog: 0.3 },
                { key: 'opacity', val: intensity, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      } as RenderableComponentData);
    }

    return scanLines;
  };

  // Helper function to generate electric sparks
  const generateSparks = (count: number): RenderableComponentData[] => {
    const sparks: RenderableComponentData[] = [];
    const angleStep = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const angle = (angleStep * i * 180) / Math.PI; // Convert to degrees
      const length = 90 + Math.random() * 50; // 90-140px
      const thickness = i % 2 === 0 ? 3 : 2;

      const gradients = [
        'linear-gradient(to right, rgba(0,255,255,1), rgba(59,130,246,0.8), transparent)',
        'linear-gradient(to right, rgba(255,255,255,1), rgba(0,255,255,0.8), transparent)',
        'linear-gradient(to right, rgba(0,200,255,1), rgba(59,130,246,0.7), transparent)',
      ];
      const gradient = gradients[i % gradients.length];

      sparks.push({
        id: `spark-${i + 1}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              width: `${length}px`,
              height: `${thickness}px`,
              background: gradient,
              opacity: 0,
              transform: `rotate(${angle}deg) translate3d(0,0,0)`,
              willChange: 'transform, opacity',
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
            id: `spark-flash-${i + 1}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: tensionBuildDuration,
              duration: explosionDuration * 0.6,
              mode: 'provider',
              targetIds: [`spark-${i + 1}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.9, prog: 0.4 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'scale', val: 0.5, prog: 0 },
                { key: 'scale', val: 1.2, prog: 0.5 },
                { key: 'scale', val: 0.8, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      } as RenderableComponentData);
    }

    return sparks;
  };

  // Build the video content layer
  const videoContentLayer: RenderableComponentData = {
    id: 'video-content-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 1,
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
      // Radial blur and scale effect
      {
        id: 'video-blur-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: tensionEnd + explosionDuration,
          mode: 'provider',
          targetIds: ['video-atom'],
          ranges: [
            // Tension build (0-0.2s): subtle blur and scale
            { key: 'blur', val: '0px', prog: 0 },
            { key: 'blur', val: '3px', prog: tensionBuildDuration / (tensionEnd + explosionDuration) },
            // Explosion (0.2-0.4s): max blur and scale
            { key: 'blur', val: `${maxBlur}px`, prog: (tensionEnd + explosionDuration * 0.7) / (tensionEnd + explosionDuration) },
            { key: 'blur', val: `${maxBlur}px`, prog: 1 },
            // Scale progression
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.05, prog: tensionBuildDuration / (tensionEnd + explosionDuration) },
            { key: 'scale', val: maxScale, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'video-atom',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: videoSrc,
          fit: 'cover',
          className: 'w-full h-full',
          style: {
            transform: 'scale(1)',
            filter: 'blur(0px)',
            willChange: 'transform, filter',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: [],
      } as RenderableComponentData,
    ],
  };

  // Scan lines container
  const scanLinesContainer: RenderableComponentData = {
    id: 'scan-lines-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-row overflow-hidden pointer-events-none',
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
    childrenData: generateScanLines(scanLineCount),
  };

  // Particle burst container
  const particleBurstContainer: RenderableComponentData = {
    id: 'particle-burst-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        style: {
          zIndex: 30,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: generateParticles(particleCount),
  };

  // Electric sparks container
  const electricSparksContainer: RenderableComponentData = {
    id: 'electric-sparks-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        style: {
          zIndex: 25,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: generateSparks(sparkCount),
  };

  // Overexposure flash layer
  const overexposureFlashLayer: RenderableComponentData = {
    id: 'overexposure-flash-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-white pointer-events-none',
        style: {
          zIndex: 50,
          opacity: 0,
          willChange: 'opacity',
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
        id: 'flash-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: tensionBuildDuration + explosionDuration * 0.3,
          duration: flashDuration,
          mode: 'provider',
          targetIds: ['overexposure-flash-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: flashPeakOpacity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Color grade overlay
  const colorGradeOverlay: RenderableComponentData = {
    id: 'color-grade-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 5,
          background:
            'linear-gradient(135deg, rgba(0,100,255,0.1) 0%, rgba(255,100,0,0.15) 50%, rgba(0,255,255,0.1) 100%)',
          mixBlendMode: 'overlay',
          opacity: 0,
          willChange: 'opacity',
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
        id: 'color-shift-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: tensionBuildDuration,
          duration: explosionDuration,
          mode: 'provider',
          targetIds: ['color-grade-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'nos-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center absolute inset-0 overflow-hidden',
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
      videoContentLayer,
      colorGradeOverlay,
      scanLinesContainer,
      electricSparksContainer,
      particleBurstContainer,
      overexposureFlashLayer,
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
  id: 'nos-nitrous-boost-transition',
  title: 'NOS Nitrous Boost Transition',
  description:
    'High-octane Fast & Furious-inspired transition effect with radial blur zoom, particle burst, electric sparks, scan line sweeps, and overexposure flash. Creates the feeling of hitting the NOS button with explosive energy bursts, hyperspace acceleration effect, and dramatic snap cuts between scenes.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'fast-and-furious',
    'nos',
    'nitrous',
    'radial-blur',
    'particle-burst',
    'electric-sparks',
    'scan-lines',
    'overexposure',
    'high-energy',
    'action',
    'racing',
    'explosive',
    'hyperspace',
  ],
  defaultInputParams: {
    videoSrc: 'https://example.com/video.mp4',
    transitionDuration: 0.5,
    tensionBuildDuration: 0.2,
    explosionDuration: 0.2,
    maxBlur: 20,
    maxScale: 1.5,
    particleCount: 24,
    scanLineCount: 8,
    sparkCount: 6,
    flashPeakOpacity: 0.9,
    flashDuration: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const nosNitrousBoostTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};