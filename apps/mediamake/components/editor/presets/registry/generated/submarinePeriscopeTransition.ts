/**
 * Submarine Periscope Lens Transition Preset
 *
 * Creates a cinematic submarine periscope transition effect with underwater distortion,
 * caustic light patterns, rising bubbles, and condensation on lens edges. Features a
 * rotating periscope scan pattern that surveys the area during the transition.
 *
 * Features:
 * - Rotating periscope scan line (0-360deg) with linear timing
 * - Underwater caustic light patterns using animated SVG filters
 * - Pressure distortion effects (scale oscillation)
 * - Murky depth fade with decreasing brightness/contrast
 * - Rising bubble particles with varied sizes and speeds
 * - Condensation effect on lens edges with animated blur
 * - Circular viewport with periscope frame mask
 * - 4.5s overlap for immersive underwater atmosphere
 *
 * Use cases:
 * - Creating dramatic scene transitions with underwater theme
 * - Submarine or ocean documentary transitions
 * - Naval/maritime content transitions
 * - Stylized video storytelling with pressure/depth effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of outgoing media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Outgoing media configuration'),
  media2: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Incoming media configuration'),
  transitionDuration: z
    .number()
    .default(4.5)
    .describe('Duration of transition overlap in seconds (recommended: 4.5s)'),
  periscopeRotationSpeed: z
    .number()
    .default(1)
    .describe('Speed multiplier for periscope rotation (1 = full 360deg rotation)'),
  bubbleCount: z
    .number()
    .default(8)
    .describe('Number of rising bubble particles'),
  pressureIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of pressure distortion effect (0-1)'),
  murkyFadeIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of murky depth fade effect (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    transitionDuration,
    periscopeRotationSpeed,
    bubbleCount,
    pressureIntensity,
    murkyFadeIntensity,
  } = params;

  // Calculate BaseLayout duration (subtract overlap)
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Helper: Create bubble particles
  const createBubbleParticles = (count: number): RenderableComponentData[] => {
    const bubbles: RenderableComponentData[] = [];
    for (let i = 0; i < count; i++) {
      const size = 6 + Math.random() * 6; // 6-12px
      const leftPosition = 10 + Math.random() * 80; // 10-90%
      const riseDistance = -800 - Math.random() * 200; // -800 to -1000px
      const riseDuration = 3 + Math.random() * 1; // 3-4s
      const startDelay = i < count / 2 ? 0 : 0.5; // Stagger start times
      const opacity = 0.6 + Math.random() * 0.2; // 0.6-0.8

      bubbles.push({
        id: `bubble-particle-${i + 1}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(100,200,255,0.4)); border-radius: 50%; position: absolute; bottom: 0; left: ${leftPosition}%;"></div>`,
          className: 'absolute',
          style: {
            zIndex: 4,
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: startDelay,
            duration: riseDuration,
          },
        },
        effects: [
          {
            id: `bubble-rise-${i + 1}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: riseDuration,
              mode: 'provider',
              targetIds: [`bubble-particle-${i + 1}`],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: riseDistance, prog: 1 },
                { key: 'opacity', val: opacity, prog: 0 },
                { key: 'opacity', val: 0, prog: 0.9 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    return bubbles;
  };

  // Create all child components
  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
      id: 'outgoing-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 1,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-media',
          type: 'atom',
          componentId: media1ComponentId,
          data: {
            src: media1.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: media1.duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Murky fade out with brightness/contrast decrease
        {
          id: 'murky-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-container'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              {
                key: 'filter',
                val: 'brightness(1) contrast(1)',
                prog: 0,
              },
              {
                key: 'filter',
                val: `brightness(${1 - murkyFadeIntensity * 0.5}) contrast(${1 - murkyFadeIntensity * 0.3})`,
                prog: 1,
              },
            ],
          },
        },
        // Pressure distortion - scale oscillation
        {
          id: 'pressure-distortion-out',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-container'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1 - pressureIntensity * 0.05, prog: 0.33 },
              { key: 'scale', val: 1 + pressureIntensity * 0.05, prog: 0.66 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Circular viewport clip
        {
          id: 'circular-clip-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: media1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-container'],
            ranges: [
              { key: 'clipPath', val: 'circle(100% at center)', prog: 0 },
              { key: 'clipPath', val: 'circle(0% at center)', prog: 1 },
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
          className: 'absolute inset-0',
          style: {
            zIndex: 2,
          },
        },
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: media2.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-media',
          type: 'atom',
          componentId: media2ComponentId,
          data: {
            src: media2.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: media2.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Fade in with caustic light effect
        {
          id: 'caustic-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Pressure distortion - scale oscillation
        {
          id: 'pressure-distortion-in',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: [
              { key: 'scale', val: 1 - pressureIntensity * 0.05, prog: 0 },
              { key: 'scale', val: 1 + pressureIntensity * 0.05, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Circular viewport clip reveal
        {
          id: 'circular-clip-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: [
              { key: 'clipPath', val: 'circle(0% at center)', prog: 0 },
              { key: 'clipPath', val: 'circle(100% at center)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Caustic light overlay (SVG with animated turbulence)
    {
      id: 'caustic-light-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<svg width="100%" height="100%" style="position: absolute; top: 0; left: 0; z-index: 3; pointer-events: none; mix-blend-mode: overlay; opacity: 0.4;">
          <defs>
            <filter id="caustic-filter">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="1">
                <animate attributeName="baseFrequency" values="0.02;0.03;0.02" dur="4s" repeatCount="indefinite"/>
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" scale="20"/>
            </filter>
            <linearGradient id="caustic-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#00ffff;stop-opacity:0.3"/>
              <stop offset="50%" style="stop-color:#0088ff;stop-opacity:0.5"/>
              <stop offset="100%" style="stop-color:#004488;stop-opacity:0.2"/>
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#caustic-gradient)" filter="url(#caustic-filter)"/>
        </svg>`,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
    } as RenderableComponentData,

    // Periscope scan line (rotating)
    {
      id: 'periscope-scan-line',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 2px; height: 60%; background: linear-gradient(to bottom, transparent, rgba(0,255,255,0.8), transparent); position: absolute; left: 50%; top: 20%; transform-origin: 50% 80%; margin-left: -1px;"></div>`,
        className: 'absolute inset-0',
        style: {
          zIndex: 5,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
      effects: [
        {
          id: 'periscope-rotation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: baseLayoutDuration / periscopeRotationSpeed,
            mode: 'provider',
            targetIds: ['periscope-scan-line'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 360, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Bubble particles
    ...createBubbleParticles(bubbleCount),

    // Condensation layer
    {
      id: 'condensation-layer',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="position: absolute; inset: 0; border-radius: 50%; box-shadow: inset 0 0 60px rgba(255,255,255,0.2); pointer-events: none;"></div>`,
        className: 'absolute inset-0',
        style: {
          zIndex: 6,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
      effects: [
        {
          id: 'condensation-blur',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 2,
            mode: 'provider',
            targetIds: ['condensation-layer'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(4px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Periscope frame mask (vignette)
    {
      id: 'periscope-frame-mask',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 45%, rgba(0,0,0,0.95) 50%); pointer-events: none;"></div>`,
        className: 'absolute inset-0',
        style: {
          zIndex: 7,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'submarine-periscope-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-blue-900/20 overflow-hidden',
        style: {
          perspective: '1000px',
        },
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
  id: 'submarinePeriscopeTransition',
  title: 'Submarine Periscope Lens Transition',
  description:
    'Cinematic submarine periscope transition with rotating scan pattern, underwater distortion effects, caustic light patterns, rising bubbles, and condensation on lens edges. Features murky depth pressure effects and circular periscope viewport with 4.5s overlap for immersive underwater atmosphere.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'periscope',
    'submarine',
    'underwater',
    'distortion',
    'caustic',
    'bubbles',
    'condensation',
    'cinematic',
    'pressure',
    'murky',
    'naval',
    'ocean',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 4.5,
    periscopeRotationSpeed: 1,
    bubbleCount: 8,
    pressureIntensity: 0.5,
    murkyFadeIntensity: 0.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const submarinePeriscopeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
