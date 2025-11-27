/**
 * Soft Focus Vignette Transition
 *
 * A dreamy film photography-inspired transition that mimics cinematographic soft-focus lens effects 
 * with natural light bloom. Features an animated radial vignette that darkens edges while spotlighting 
 * the center, floating light leaks in warm pink-to-gold gradients, soft bokeh orbs with overlay blend 
 * modes, and a radial clip-path reveal to transition between scenes. Evokes the romantic quality of 
 * wedding videography using prisms and crystals for magical light refractions.
 *
 * Features:
 * - **Radial Vignette**: Darkens edges while keeping center bright, animated via custom properties
 * - **Light Leaks**: 2-3 gradient orbs (pink to yellow) that float across frame with staggered timing
 * - **Bokeh Effects**: 6 soft glowing orbs with random float animations for dreamy atmosphere
 * - **Radial Reveal**: Circular clip-path transition expanding from center to reveal next scene
 * - **Performance Optimized**: Uses transform compositing and CSS containment for smooth playback
 *
 * Use cases:
 * - Wedding and romantic video transitions
 * - Film photography aesthetic montages
 * - Dreamy cinematic scene changes
 * - Ethereal mood-building sequences
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
    .min(1)
    .max(10)
    .default(3)
    .describe('Total transition duration in seconds'),
  
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of vignette darkening (0-1, where 1 is darkest)'),
  
  vignetteSize: z
    .number()
    .min(10)
    .max(70)
    .default(30)
    .describe('Size of bright center area as percentage (10-70%)'),
  
  lightLeakIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.6)
    .describe('Opacity/intensity of light leak effects (0.1-1)'),
  
  bokehCount: z
    .number()
    .int()
    .min(3)
    .max(12)
    .default(6)
    .describe('Number of bokeh orbs to generate (3-12)'),
  
  bokehIntensity: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.3)
    .describe('Opacity of bokeh orbs (0.1-0.5)'),
  
  revealStart: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('When the radial reveal starts (seconds into transition)'),
  
  revealDuration: z
    .number()
    .min(1)
    .max(3)
    .default(2)
    .describe('Duration of the radial reveal animation in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    vignetteIntensity,
    vignetteSize,
    lightLeakIntensity,
    bokehCount,
    bokehIntensity,
    revealStart,
    revealDuration,
  } = params;

  // Helper function to generate random positions for bokeh orbs
  const generateBokehPosition = (index: number): { top: string; left: string } => {
    // Pseudo-random based on index for consistent generation
    const seed = index * 137.508; // Golden angle for nice distribution
    const angle = (seed % 360) * (Math.PI / 180);
    const radius = 20 + ((index * 17) % 40); // 20-60% from center
    
    const centerX = 50;
    const centerY = 50;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    return {
      top: `${Math.max(5, Math.min(95, y))}%`,
      left: `${Math.max(5, Math.min(95, x))}%`,
    };
  };

  // Helper function to generate bokeh size
  const generateBokehSize = (index: number): number => {
    const sizes = [45, 60, 50, 70, 55, 65, 48, 58, 52, 62, 57, 67];
    return sizes[index % sizes.length];
  };

  // Helper function to generate bokeh colors
  const generateBokehColor = (index: number): string => {
    const colors = [
      'rgba(255,255,255,0.3)',
      'rgba(255,228,196,0.25)',
      'rgba(255,182,193,0.2)',
      'rgba(255,255,224,0.3)',
      'rgba(255,218,185,0.25)',
      'rgba(255,192,203,0.2)',
      'rgba(255,240,220,0.28)',
      'rgba(255,200,180,0.22)',
    ];
    return colors[index % colors.length];
  };

  // Generate bokeh orbs
  const bokehOrbs: RenderableComponentData[] = [];
  for (let i = 0; i < bokehCount; i++) {
    const position = generateBokehPosition(i);
    const size = generateBokehSize(i);
    const color = generateBokehColor(i);
    const floatDuration = 1.5 + ((i * 0.3) % 1); // 1.5-2.5s variations
    const floatDistance = 20 + ((i * 7) % 30); // 20-50px variations
    
    bokehOrbs.push({
      id: `bokeh-orb-${i + 1}`,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        shape: 'circle' as const,
        color: color.replace(/0\.\d+/, String(bokehIntensity)),
        style: {
          position: 'absolute',
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          filter: `blur(${Math.floor(size / 5)}px)`,
          mixBlendMode: 'overlay',
          top: position.top,
          left: position.left,
          transform: 'translate3d(0,0,0)',
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
          id: `bokeh-float-${i + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: floatDuration,
            mode: 'provider',
            targetIds: [`bokeh-orb-${i + 1}`],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -floatDistance, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  const childrenData: RenderableComponentData[] = [
    // Vignette overlay - darkens edges
    {
      id: 'vignette-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `radial-gradient(circle at center, transparent ${vignetteSize}%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
            zIndex: 10,
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
        {
          id: 'vignette-intensify',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: duration * 0.5,
            mode: 'provider',
            targetIds: ['vignette-overlay'],
            ranges: [
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Light leak 1 - Pink to peach
    {
      id: 'light-leak-1',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-96 h-96 rounded-full blur-3xl mix-blend-screen',
          style: {
            background: `linear-gradient(135deg, rgba(255,182,193,${lightLeakIntensity * 1.0}) 0%, rgba(255,218,185,${lightLeakIntensity * 0.67}) 50%, rgba(255,255,224,${lightLeakIntensity * 0.5}) 100%)`,
            top: '-10%',
            left: '-10%',
            zIndex: 15,
            transform: 'translate3d(0,0,0)',
            willChange: 'transform',
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
        {
          id: 'light-leak-1-float',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 2.5,
            mode: 'provider',
            targetIds: ['light-leak-1'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 150, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 100, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Light leak 2 - Golden to yellow
    {
      id: 'light-leak-2',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-80 h-80 rounded-full blur-3xl mix-blend-screen',
          style: {
            background: `linear-gradient(45deg, rgba(255,223,186,${lightLeakIntensity * 0.83}) 0%, rgba(255,250,205,${lightLeakIntensity * 0.67}) 100%)`,
            top: '20%',
            right: '-15%',
            zIndex: 15,
            transform: 'translate3d(0,0,0)',
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0.2,
          duration: duration - 0.2,
        },
      },
      effects: [
        {
          id: 'light-leak-2-float',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 2.8,
            mode: 'provider',
            targetIds: ['light-leak-2'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -180, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 60, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Light leak 3 - Pink to gold
    {
      id: 'light-leak-3',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-72 h-72 rounded-full blur-3xl mix-blend-screen',
          style: {
            background: `linear-gradient(180deg, rgba(255,192,203,${lightLeakIntensity * 0.67}) 0%, rgba(255,215,0,${lightLeakIntensity * 0.5}) 100%)`,
            bottom: '10%',
            left: '30%',
            zIndex: 15,
            transform: 'translate3d(0,0,0)',
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0.4,
          duration: duration - 0.4,
        },
      },
      effects: [
        {
          id: 'light-leak-3-float',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: 3,
            mode: 'provider',
            targetIds: ['light-leak-3'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 80, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -40, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Bokeh container with all bokeh orbs
    {
      id: 'bokeh-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 12,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: bokehOrbs,
    } as RenderableComponentData,

    // Clip-path reveal container for next scene
    {
      id: 'clip-path-reveal-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath: 'circle(0% at 50% 50%)',
            zIndex: 20,
            transform: 'translate3d(0,0,0)',
            willChange: 'clip-path',
          },
        },
      },
      context: {
        timing: {
          start: revealStart,
          duration: revealDuration,
        },
      },
      effects: [
        {
          id: 'radial-reveal',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: revealDuration,
            mode: 'provider',
            targetIds: ['clip-path-reveal-container'],
            ranges: [
              { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
              { key: 'clipPath', val: 'circle(150% at 50% 50%)', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'next-scene-slot',
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
              duration: revealDuration,
            },
          },
          childrenData: [],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'soft-focus-vignette-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
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
  id: 'soft-focus-vignette-transition',
  title: 'Soft Focus Vignette Transition',
  description:
    'A dreamy film photography-inspired transition that mimics cinematographic soft-focus lens effects with natural light bloom. Features an animated radial vignette that darkens edges while spotlighting the center, floating light leaks in warm pink-to-gold gradients, soft bokeh orbs with overlay blend modes, and a radial clip-path reveal to transition between scenes. Evokes the romantic quality of wedding videography using prisms and crystals for magical light refractions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vignette',
    'romantic',
    'dreamy',
    'bokeh',
    'light-leak',
    'soft-focus',
    'wedding',
    'cinematic',
  ],
  defaultInputParams: {
    duration: 3,
    vignetteIntensity: 0.4,
    vignetteSize: 30,
    lightLeakIntensity: 0.6,
    bokehCount: 6,
    bokehIntensity: 0.3,
    revealStart: 1,
    revealDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const softFocusVignetteTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
