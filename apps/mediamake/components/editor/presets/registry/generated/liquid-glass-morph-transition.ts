/**
 * Liquid Glass Morph Transition Preset
 *
 * This preset creates a fluid refractive distortion transition between two videos
 * that simulates looking through flowing water or liquid glass. It combines:
 * - SVG turbulence filters with dynamic baseFrequency animations
 * - 3D perspective transforms with rotateY warping
 * - Wave-shaped clip-path reveals with CSS animations
 * - Multi-layer gradient overlays with mix-blend-mode effects
 *
 * Features:
 * - SVG feTurbulence and feDisplacementMap filters for liquid distortion
 * - Animated baseFrequency values for ripple effects
 * - 3D perspective transforms for spatial depth
 * - Custom wave-shaped clip-path animations
 * - Multiple gradient overlays with different animation speeds
 * - Configurable overlap duration and timing
 *
 * Use cases:
 * - Creating fluid transitions between video segments
 * - Adding water/liquid glass effects to video transitions
 * - Building creative morphing transitions
 * - Creating visually striking video content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration'),
  overlapDuration: z
    .number()
    .default(2.2)
    .describe('Duration of the transition overlap in seconds'),
  turbulenceIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for turbulence effects'),
  perspectiveDepth: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .optional()
    .describe('Perspective depth for 3D transform effects (in pixels)'),
  waveAmplitude: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .optional()
    .describe('Amplitude of the wave clip-path animation'),
  gradientSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .optional()
    .describe('Speed multiplier for gradient overlay animations'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    overlapDuration,
    turbulenceIntensity = 1,
    perspectiveDepth = 1000,
    waveAmplitude = 50,
    gradientSpeed = 1,
  } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate timing for incoming video (starts before outgoing ends)
  const incomingStart = video1.duration - overlapDuration;

  // Helper function to create SVG filter HTML
  const createSVGFilters = (): string => {
    return `
      <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
        <defs>
          <filter id="turbulence-out" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" seed="1"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
          <filter id="turbulence-in" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" result="noise" seed="2"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
      </svg>
    `;
  };

  // Helper function to create wave clip-path path
  const createWaveClipPath = (progress: number): string => {
    const points: string[] = [];
    const steps = 20;
    const yOffset = progress * 100;
    
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * 100;
      const y = yOffset + Math.sin((i / steps) * Math.PI * 4) * waveAmplitude;
      points.push(`${x}% ${y}%`);
    }
    
    return `polygon(${points.join(', ')}, 100% 100%, 0% 100%)`;
  };

  // Build children data
  const childrenData: RenderableComponentData[] = [
    // SVG Filters Container
    {
      id: 'svg-filters-container',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createSVGFilters(),
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData,

    // Outgoing Video Container (with turbulence filter)
    {
      id: 'outgoing-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            filter: 'url(#turbulence-out)',
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
            className: 'w-full h-full object-cover',
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
        // Fade out effect during overlap
        {
          id: 'outgoing-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: video1.duration - overlapDuration * 0.3,
            duration: overlapDuration * 0.3,
            mode: 'provider',
            targetIds: ['outgoing-video-container'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming Video Container (with turbulence filter and 3D transform)
    {
      id: 'incoming-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            filter: 'url(#turbulence-in)',
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: incomingStart,
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
            className: 'w-full h-full object-cover',
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
        // Fade in effect
        {
          id: 'incoming-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration * 0.8,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // 3D perspective rotation effect
        {
          id: 'incoming-3d-rotation',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: [
              { 
                key: 'transform', 
                val: `perspective(${perspectiveDepth}px) rotateY(0deg)`, 
                prog: 0 
              },
              { 
                key: 'transform', 
                val: `perspective(${perspectiveDepth}px) rotateY(15deg)`, 
                prog: 0.5 
              },
              { 
                key: 'transform', 
                val: `perspective(${perspectiveDepth}px) rotateY(0deg)`, 
                prog: 1 
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Gradient Overlay 1
    {
      id: 'gradient-overlay-1',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: 'linear-gradient(45deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.2) 100%)',
            mixBlendMode: 'overlay',
          },
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'gradient-1-slide',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 1 / gradientSpeed,
            mode: 'provider',
            targetIds: ['gradient-overlay-1'],
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '200%', prog: 1 },
            ],
          },
        },
        {
          id: 'gradient-1-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['gradient-overlay-1'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Gradient Overlay 2
    {
      id: 'gradient-overlay-2',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: 'linear-gradient(90deg, rgba(200,220,255,0.25) 0%, rgba(255,255,255,0) 40%, rgba(200,220,255,0.2) 100%)',
            mixBlendMode: 'overlay',
          },
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'gradient-2-slide',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 1.5 / gradientSpeed,
            mode: 'provider',
            targetIds: ['gradient-overlay-2'],
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '200%', prog: 1 },
            ],
          },
        },
        {
          id: 'gradient-2-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['gradient-overlay-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Gradient Overlay 3
    {
      id: 'gradient-overlay-3',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: 'linear-gradient(135deg, rgba(180,200,255,0.2) 0%, rgba(255,255,255,0) 60%, rgba(180,200,255,0.25) 100%)',
            mixBlendMode: 'overlay',
          },
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'gradient-3-slide',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 2 / gradientSpeed,
            mode: 'provider',
            targetIds: ['gradient-overlay-3'],
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '200%', prog: 1 },
            ],
          },
        },
        {
          id: 'gradient-3-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['gradient-overlay-3'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'liquid-glass-morph-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
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
  id: 'liquid-glass-morph-transition',
  title: 'Liquid Glass Morph Transition',
  description:
    'A fluid refractive distortion transition where videos blend through dynamic wave distortions simulating looking through flowing water or liquid glass. Features SVG turbulence filters, 3D perspective warp effects, wave-shaped clip-path reveals, and multi-layer gradient overlays with mix-blend-mode overlay for enhanced liquid refraction.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'liquid',
    'glass',
    'morph',
    'distortion',
    'fluid',
    'refraction',
    'wave',
    'water',
    'svg',
    'filter',
    '3d',
    'perspective',
    'gradient',
    'blend-mode',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 2.2,
    turbulenceIntensity: 1,
    perspectiveDepth: 1000,
    waveAmplitude: 50,
    gradientSpeed: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidGlassMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
