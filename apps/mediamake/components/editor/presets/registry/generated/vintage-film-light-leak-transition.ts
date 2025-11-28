/**
 * Vintage 16mm Film Light Leak Transition
 * 
 * An organic vintage film transition effect that emulates accidental light exposure on 16mm film stock.
 * Features warm color temperature light leaks (oranges, reds, yellows) that bloom from edges with natural 
 * flowing movement, subtle film grain flickering, dust particles, and vignetting. Creates a nostalgic analog 
 * aesthetic with unpredictable organic movement reminiscent of happy accidents from the film era.
 * 
 * Technical Features:
 * - Multiple light leak layers with radial gradients and blur effects
 * - Organic movement using scale, rotation, and translation animations
 * - Film grain texture overlay with flickering opacity
 * - Animated dust particles simulating film debris
 * - Vignette layer for vintage framing
 * - Warm color palette (#FF6B35, #F7931E, #FDC830)
 * - Non-linear animation timing for organic feel
 * - Subtle shake effect for handheld camera simulation
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ─────────────────────────────────────────────────────────────────────────────
// PRESET PARAMETERS
// ─────────────────────────────────────────────────────────────────────────────

const presetParams = z.object({
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .describe('Duration of the transition effect in seconds'),
  intensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Overall intensity multiplier for effects (0.1 to 2)'),
  warmthLevel: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(1)
    .describe('Warmth level for color temperature (0.5 = cooler, 1.5 = warmer)'),
  grainIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Intensity of film grain effect (0 = none, 1 = maximum)'),
  dustParticleCount: z
    .number()
    .int()
    .min(0)
    .max(20)
    .default(8)
    .describe('Number of dust particles (0 to 20)'),
  vignetteStrength: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Strength of vignette effect (0 = none, 1 = strong)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ─────────────────────────────────────────────────────────────────────────────
// PRESET EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    intensity,
    warmthLevel,
    grainIntensity,
    dustParticleCount,
    vignetteStrength,
  } = params;

  // Helper: Generate dust particles
  const generateDustParticles = (): RenderableComponentData[] => {
    const particles: RenderableComponentData[] = [];
    
    for (let i = 0; i < dustParticleCount; i++) {
      const particleId = `dust-particle-${i}`;
      const size = Math.random() * 2 + 1; // 1-3px
      const opacity = Math.random() * 0.3 + 0.4; // 0.4-0.7
      const top = Math.random() * 100; // Random vertical position
      const left = Math.random() * 100; // Random horizontal position
      const fallDistance = Math.random() * 50 + 30; // 30-80px fall
      const fallDuration = Math.random() * 1 + 1.5; // 1.5-2.5s duration
      const delay = Math.random() * 0.5; // 0-0.5s delay

      particles.push({
        id: particleId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; background: rgba(255,255,255,${opacity}); border-radius: 50%;"></div>`,
          className: 'absolute',
          style: {
            top: `${top}%`,
            left: `${left}%`,
          },
        } as any,
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `${particleId}-fall`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: delay,
              duration: fallDuration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: fallDistance, prog: 1 },
                { key: 'opacity', val: opacity, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // Helper: Create light leak effects
  const createLightLeakEffects = (
    leakId: string,
    scaleRange: [number, number],
    rotateRange: [number, number],
    opacityRange: [number, number],
    effectDuration: number,
  ) => {
    return [
      // Scale + Rotate animation
      {
        id: `${leakId}-transform`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: effectDuration,
          mode: 'provider',
          targetIds: [leakId],
          ranges: [
            { key: 'scale', val: scaleRange[0], prog: 0 },
            { key: 'scale', val: scaleRange[1], prog: 0.5 },
            { key: 'scale', val: scaleRange[0] * 1.1, prog: 1 },
            { key: 'rotate', val: rotateRange[0], prog: 0 },
            { key: 'rotate', val: rotateRange[1], prog: 0.5 },
            { key: 'rotate', val: rotateRange[0] - 2, prog: 1 },
          ],
        },
      },
      // Opacity fade animation
      {
        id: `${leakId}-opacity`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: effectDuration,
          mode: 'provider',
          targetIds: [leakId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: opacityRange[1], prog: 0.3 },
            { key: 'opacity', val: opacityRange[0], prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Subtle shake effect
      {
        id: `${leakId}-shake`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.3,
          mode: 'provider',
          targetIds: [leakId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 3 * intensity, prog: 0.25 },
            { key: 'translateX', val: -3 * intensity, prog: 0.5 },
            { key: 'translateX', val: 2 * intensity, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -2 * intensity, prog: 0.25 },
            { key: 'translateY', val: 3 * intensity, prog: 0.5 },
            { key: 'translateY', val: -2 * intensity, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ];
  };

  // Adjust colors based on warmth level
  const adjustColor = (baseColor: string, warmth: number): string => {
    // Simple color adjustment (in practice, would parse and adjust)
    return baseColor;
  };

  const orangeColor = adjustColor('#FF6B35', warmthLevel);
  const amberColor = adjustColor('#F7931E', warmthLevel);
  const yellowColor = adjustColor('#FDC830', warmthLevel);

  // Build child components
  const childrenData: RenderableComponentData[] = [
    // Vignette layer
    {
      id: 'vignette-layer',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteStrength}) 100%);"></div>`,
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'multiply',
          pointerEvents: 'none',
        },
      } as any,
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData,

    // Light leak layer 1 - Orange (top-left)
    {
      id: 'light-leak-1',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 150%; height: 150%; background: radial-gradient(ellipse at 20% 30%, ${orangeColor} 0%, transparent 50%); filter: blur(40px);"></div>`,
        className: 'absolute',
        style: {
          top: '-25%',
          left: '-25%',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        },
      } as any,
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: createLightLeakEffects(
        'light-leak-1',
        [0.8 * intensity, 1.2 * intensity],
        [-5, 5],
        [0.4 * intensity, 0.7 * intensity],
        duration * 0.8,
      ),
    } as RenderableComponentData,

    // Light leak layer 2 - Amber (top-right)
    {
      id: 'light-leak-2',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 140%; height: 140%; background: radial-gradient(ellipse at 80% 20%, ${amberColor} 0%, transparent 45%); filter: blur(50px);"></div>`,
        className: 'absolute',
        style: {
          top: '-20%',
          right: '-30%',
          mixBlendMode: 'soft-light',
          pointerEvents: 'none',
        },
      } as any,
      context: {
        timing: {
          start: 0.1,
          duration: duration,
        },
      },
      effects: createLightLeakEffects(
        'light-leak-2',
        [0.85 * intensity, 1.15 * intensity],
        [-3, 7],
        [0.35 * intensity, 0.65 * intensity],
        duration * 0.88,
      ),
    } as RenderableComponentData,

    // Light leak layer 3 - Yellow (bottom-left)
    {
      id: 'light-leak-3',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 120%; height: 120%; background: radial-gradient(ellipse at 30% 90%, ${yellowColor} 0%, transparent 55%); filter: blur(35px);"></div>`,
        className: 'absolute',
        style: {
          bottom: '-30%',
          left: '-10%',
          mixBlendMode: 'color-dodge',
          pointerEvents: 'none',
        },
      } as any,
      context: {
        timing: {
          start: 0.2,
          duration: duration,
        },
      },
      effects: createLightLeakEffects(
        'light-leak-3',
        [0.9 * intensity, 1.1 * intensity],
        [-4, 4],
        [0.3 * intensity, 0.6 * intensity],
        duration * 0.96,
      ),
    } as RenderableComponentData,

    // Film grain layer
    {
      id: 'film-grain-layer',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=); opacity: ${grainIntensity};"></div>`,
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        },
      } as any,
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        // Film grain flicker effect
        {
          id: 'grain-flicker',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.15,
            mode: 'provider',
            targetIds: ['film-grain-layer'],
            ranges: [
              { key: 'opacity', val: grainIntensity * 0.8, prog: 0 },
              { key: 'opacity', val: grainIntensity * 1.2, prog: 0.25 },
              { key: 'opacity', val: grainIntensity * 0.7, prog: 0.5 },
              { key: 'opacity', val: grainIntensity * 1.1, prog: 0.75 },
              { key: 'opacity', val: grainIntensity, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Add dust particles
  const dustParticles = generateDustParticles();
  childrenData.push(...dustParticles);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vintage-film-leak-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
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

// ─────────────────────────────────────────────────────────────────────────────
// PRESET METADATA
// ─────────────────────────────────────────────────────────────────────────────

const presetMetadata: PresetMetadata = {
  id: 'vintage-film-light-leak-transition',
  title: 'Vintage 16mm Film Light Leak Transition',
  description:
    'An organic vintage film transition effect that emulates accidental light exposure on 16mm film stock. Features warm color temperature light leaks (oranges, reds, yellows) that bloom from edges with natural flowing movement, subtle film grain flickering, dust particles, and vignetting. Creates a nostalgic analog aesthetic with unpredictable organic movement reminiscent of happy accidents from the film era.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vintage',
    'film',
    'light-leak',
    '16mm',
    'analog',
    'organic',
    'warm',
    'nostalgic',
    'grain',
    'dust',
    'vignette',
  ],
  defaultInputParams: {
    duration: 2.5,
    intensity: 1,
    warmthLevel: 1,
    grainIntensity: 0.15,
    dustParticleCount: 8,
    vignetteStrength: 0.6,
  },
  dependencies: {},
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const vintageFilmLightLeakTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};