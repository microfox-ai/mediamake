/**
 * Cosmic Starburst Reveal
 * 
 * Epic supernova-style burst effect with expanding circle, light rays, lens flares, 
 * particles, chromatic aberration, and camera shake. Perfect for revealing epic moments 
 * or highlighting important content with overwhelming visual impact.
 * 
 * Features:
 * - Intense bright point that flares out with light rays extending beyond circle edge
 * - Circle expansion behind the light burst
 * - Lens flares with screen blend mode
 * - Light streaks and particle effects that radiate outward
 * - Chromatic aberration at edges for intense energy look
 * - Subtle camera shake from the 'impact' of the burst
 * - Brightness peaks during initial burst then settles to normal
 * - Duration: 2 seconds with explosive ease-out for initial burst
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  trackId: z
    .string()
    .default('cosmic-starburst-reveal')
    .describe('Unique ID for this starburst reveal effect'),
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Total duration of the starburst reveal effect in seconds'),
  startTime: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the effect relative to parent timeline'),
  intensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Overall intensity multiplier for all effects (glow, rays, particles)'),
  backgroundColor: z
    .string()
    .default('rgba(0, 0, 0, 1)')
    .describe('Background color of the burst container'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { trackId, duration, startTime, intensity, backgroundColor } = params;

  // Helper function to generate unique IDs
  const genId = (suffix: string) => `${trackId}-${suffix}`;

  // Calculate timing values
  const fps = props.config?.fps || 30;
  const totalFrames = Math.round(duration * fps);
  const burstDuration = duration * 0.3; // Initial burst: 30% of total
  const expansionDuration = duration * 0.7; // Circle expansion: 70% of total
  const shakeDuration = 0.2; // Camera shake: 200ms
  const rayDuration = duration * 0.4; // Rays animate faster
  const flareDuration = duration * 0.6; // Lens flares
  const particleDuration = duration * 0.8; // Particles

  // Calculate glow values scaled by intensity
  const initialGlow = 100 * intensity;
  const finalGlow = 20 * intensity;

  // Generate 12 light rays at 30-degree intervals
  const rays = Array.from({ length: 12 }, (_, i) => {
    const angle = i * 30;
    return {
      id: genId(`ray-${i}`),
      componentId: 'HTMLBlockAtom',
      type: 'atom' as const,
      data: {
        html: '',
        className: 'absolute top-1/2 left-1/2 origin-left pointer-events-none',
        style: {
          width: '400px',
          height: '4px',
          background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.8), transparent)',
          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
          transformOrigin: '0 50%',
          willChange: 'transform, opacity',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: rayDuration,
        },
      },
      effects: [
        {
          id: genId(`ray-${i}-effect`),
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: rayDuration,
            mode: 'provider',
            targetIds: [genId(`ray-${i}`)],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 3 * intensity, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };
  });

  // Generate 3 lens flares with different colors and sizes
  const flares = [
    {
      id: genId('flare-cyan'),
      size: 128,
      color: 'rgba(0, 255, 255, 0.5)',
      delay: 0,
    },
    {
      id: genId('flare-magenta'),
      size: 96,
      color: 'rgba(255, 100, 255, 0.5)',
      delay: 0.05,
    },
    {
      id: genId('flare-yellow'),
      size: 160,
      color: 'rgba(255, 200, 100, 0.4)',
      delay: 0.1,
    },
  ].map(({ id, size, color, delay }) => ({
    id,
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: '',
      className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none',
      style: {
        width: `${size}px`,
        height: `${size}px`,
        background: `radial-gradient(circle, ${color}, transparent)`,
        mixBlendMode: 'screen',
        willChange: 'transform, opacity',
      },
    },
    context: {
      timing: {
        start: delay,
        duration: flareDuration,
      },
    },
    effects: [
      {
        id: `${id}-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: flareDuration,
          mode: 'provider',
          targetIds: [id],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1.5 * intensity, prog: 0.3 },
            { key: 'scale', val: 1 * intensity, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  }));

  // Generate 20 particles with radial velocity
  const particles = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * 360;
    const distance = 200 + Math.random() * 100;
    const endX = Math.cos((angle * Math.PI) / 180) * distance;
    const endY = Math.sin((angle * Math.PI) / 180) * distance;
    const size = i < 12 ? 2 : 3;
    const colors = ['bg-white', 'bg-cyan-300', 'bg-purple-300', 'bg-yellow-200', 'bg-pink-300', 'bg-orange-300', 'bg-blue-200'];
    const colorClass = i < 12 ? 'bg-white' : colors[i % colors.length];

    return {
      id: genId(`particle-${i}`),
      componentId: 'HTMLBlockAtom',
      type: 'atom' as const,
      data: {
        html: '',
        className: `absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none ${colorClass}`,
        style: {
          width: `${size}px`,
          height: `${size}px`,
          willChange: 'transform, opacity',
        },
      },
      context: {
        timing: {
          start: i < 10 ? 0 : 0.05,
          duration: particleDuration,
        },
      },
      effects: [
        {
          id: genId(`particle-${i}-effect`),
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: particleDuration,
            mode: 'provider',
            targetIds: [genId(`particle-${i}`)],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: endX * intensity, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: endY * intensity, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };
  });

  // Chromatic aberration: RGB channel splits
  const chromaticLayers = [
    {
      id: genId('chromatic-red'),
      color: 'red',
      offsetX: 2 * intensity,
      offsetY: 0,
    },
    {
      id: genId('chromatic-green'),
      color: 'lime',
      offsetX: 0,
      offsetY: 0,
    },
    {
      id: genId('chromatic-blue'),
      color: 'cyan',
      offsetX: -2 * intensity,
      offsetY: 0,
    },
  ].map(({ id, color, offsetX, offsetY }) => ({
    id,
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: '',
      className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none',
      style: {
        width: '16px',
        height: '16px',
        backgroundColor: color,
        mixBlendMode: 'screen',
        filter: 'blur(1px)',
        willChange: 'transform, opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: expansionDuration,
      },
    },
    effects: [
      {
        id: `${id}-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: expansionDuration,
          mode: 'provider',
          targetIds: [id],
          ranges: [
            { key: 'translateX', val: offsetX, prog: 0 },
            { key: 'translateX', val: offsetX * 5, prog: 1 },
            { key: 'translateY', val: offsetY, prog: 0 },
            { key: 'translateY', val: offsetY * 5, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 60, prog: 1 },
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  }));

  // Main circle with glow
  const mainCircleGlow = {
    id: genId('main-circle-glow'),
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: '',
      className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white pointer-events-none',
      style: {
        width: '16px',
        height: '16px',
        boxShadow: `0 0 ${initialGlow}px ${initialGlow / 2}px rgba(255,255,255,1)`,
        willChange: 'transform, filter, opacity',
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
        id: genId('main-circle-glow-effect'),
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [genId('main-circle-glow')],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 60, prog: 1 },
            { key: 'filter', val: `brightness(${3 * intensity}) blur(2px)`, prog: 0 },
            { key: 'filter', val: 'brightness(1) blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Main circle (solid)
  const mainCircle = {
    id: genId('main-circle'),
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: '',
      className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white pointer-events-none',
      style: {
        width: '16px',
        height: '16px',
        willChange: 'transform, opacity',
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
        id: genId('main-circle-effect'),
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [genId('main-circle')],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 60, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Camera shake effect container
  const effectContainer = {
    id: genId('effect-container'),
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
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
        id: genId('camera-shake-effect'),
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: shakeDuration,
          mode: 'provider',
          targetIds: [genId('effect-container')],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 5 * intensity, prog: 0.25 },
            { key: 'translateX', val: -5 * intensity, prog: 0.5 },
            { key: 'translateX', val: 3 * intensity, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -4 * intensity, prog: 0.25 },
            { key: 'translateY', val: 4 * intensity, prog: 0.5 },
            { key: 'translateY', val: -2 * intensity, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      ...chromaticLayers,
      mainCircleGlow,
      mainCircle,
      ...rays,
      ...flares,
      ...particles,
    ] as RenderableComponentData[],
  };

  // Root container
  const rootContainer = {
    id: genId('camera-shake-container'),
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: startTime,
        duration,
      },
    },
    childrenData: [effectContainer] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'cosmic-starburst-reveal',
  title: 'Cosmic Starburst Reveal',
  description:
    'Epic supernova-style burst effect with expanding circle, light rays, lens flares, particles, chromatic aberration, and camera shake. Powerful energy reveal perfect for highlighting epic moments or important content with overwhelming visual impact.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'reveal',
    'burst',
    'starburst',
    'supernova',
    'explosion',
    'cosmic',
    'energy',
    'light-rays',
    'lens-flare',
    'particles',
    'chromatic-aberration',
    'camera-shake',
    'epic',
    'intense',
    'powerful',
  ],
  dependencies: {},
  defaultInputParams: {
    trackId: 'cosmic-starburst-reveal',
    duration: 2,
    startTime: 0,
    intensity: 1,
    backgroundColor: 'rgba(0, 0, 0, 1)',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const cosmicStarburstRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
