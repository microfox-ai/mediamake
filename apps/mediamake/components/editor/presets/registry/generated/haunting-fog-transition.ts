/**
 * Haunting Fog Transition Effect Preset
 *
 * A horror-movie inspired fog transition effect with multi-layered tendrils of dark smoke
 * creeping from screen edges. Features varying opacity layers moving at different speeds,
 * tension-building pacing through four phases, breathing/pulsation effects, and eerie color
 * shifts from deep blacks to dark purples.
 *
 * Features:
 * - 6 fog layers with radial gradients creating organic smoke tendrils
 * - Four-phase transition: subtle wisps (0-20%), accelerating coverage (20-60%),
 *   full obscuration (60-80%), reveal through gaps (80-100%)
 * - Breathing/pulsation effects with oscillating opacity for living fog feel
 * - Color shifts from deep blacks to dark purples and grays
 * - Drift movements using translateX/Y for organic, unpredictable patterns
 * - Blur effects for depth perception (foreground vs background layers)
 * - Performance-optimized with will-change classes
 *
 * Use cases:
 * - Horror movie transitions between scenes
 * - Suspenseful content intros/outros
 * - Halloween or spooky themed videos
 * - Creating atmospheric tension in narratives
 * - Dramatic scene transitions with organic motion
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
    .min(2)
    .max(20)
    .default(8)
    .describe('Total duration of the fog transition in seconds'),
  intensity: z
    .number()
    .min(0.3)
    .max(2)
    .default(1)
    .describe('Overall intensity multiplier for fog opacity and movement (0.3-2)'),
  speed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed multiplier for fog drift and movement animations (0.5-3)'),
  colorScheme: z
    .enum(['dark-purple', 'deep-black', 'mixed'])
    .default('mixed')
    .describe('Color scheme for fog layers: dark-purple, deep-black, or mixed'),
  breathingIntensity: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.1)
    .describe('Intensity of breathing/pulsation effect (0-0.3)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { duration, intensity, speed, colorScheme, breathingIntensity } = params;

  // Helper function to generate fog layer gradients based on color scheme
  const getFogColor = (layerIndex: number): string => {
    if (colorScheme === 'dark-purple') {
      // Purple tones for all layers
      const purples = [
        'rgba(20, 10, 30, 0.85)',
        'rgba(30, 15, 40, 0.8)',
        'rgba(40, 25, 50, 0.75)',
        'rgba(35, 20, 45, 0.7)',
        'rgba(25, 15, 35, 0.8)',
        'rgba(15, 5, 20, 0.9)',
      ];
      return purples[layerIndex % purples.length];
    } else if (colorScheme === 'deep-black') {
      // Black and gray tones
      const blacks = [
        'rgba(10, 10, 10, 0.85)',
        'rgba(15, 15, 15, 0.8)',
        'rgba(20, 20, 20, 0.75)',
        'rgba(18, 18, 18, 0.7)',
        'rgba(12, 12, 12, 0.8)',
        'rgba(8, 8, 8, 0.9)',
      ];
      return blacks[layerIndex % blacks.length];
    } else {
      // Mixed: alternate between purples and blacks
      const mixed = [
        'rgba(20, 10, 30, 0.85)',
        'rgba(30, 15, 40, 0.8)',
        'rgba(40, 25, 50, 0.75)',
        'rgba(35, 20, 45, 0.7)',
        'rgba(15, 5, 20, 0.9)',
        'rgba(10, 5, 15, 0.95)',
      ];
      return mixed[layerIndex % mixed.length];
    }
  };

  // Helper function to calculate effect timing for four phases
  const getPhaseEffectRanges = (
    layerIndex: number,
  ): Array<{ key: string; val: any; prog: number }> => {
    // Phase timings:
    // Phase 1 (0-20%): Subtle wisps at edges - opacity 0 → 0.3
    // Phase 2 (20-60%): Accelerating coverage - opacity 0.3 → 0.7
    // Phase 3 (60-80%): Full obscuration - opacity 0.7 → 0.9
    // Phase 4 (80-100%): Reveal through gaps - opacity 0.9 → 0.2

    const baseOpacity = [0.85, 0.8, 0.75, 0.7, 0.9, 0.95][layerIndex];
    const adjustedOpacity = baseOpacity * intensity;

    return [
      // Phase 1: Fade in from edges
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0.3 * adjustedOpacity, prog: 0.2 },
      // Phase 2: Accelerating coverage
      { key: 'opacity', val: 0.7 * adjustedOpacity, prog: 0.6 },
      // Phase 3: Full obscuration
      { key: 'opacity', val: 0.9 * adjustedOpacity, prog: 0.8 },
      // Phase 4: Reveal through gaps
      { key: 'opacity', val: 0.2 * adjustedOpacity, prog: 1 },
    ];
  };

  // Helper function to calculate drift movement ranges
  const getDriftRanges = (
    layerIndex: number,
  ): Array<{ key: string; val: any; prog: number }> => {
    // Each layer drifts in different directions and speeds
    const driftPatterns = [
      { x: ['-10%', '5%', '10%'], y: ['0%', '3%', '5%'] }, // Layer 0: drift right and down
      { x: ['110%', '95%', '90%'], y: ['0%', '-3%', '-5%'] }, // Layer 1: drift left and up
      { x: ['-10%', '0%', '5%'], y: ['50%', '48%', '45%'] }, // Layer 2: drift right, center
      { x: ['110%', '105%', '100%'], y: ['60%', '58%', '55%'] }, // Layer 3: drift left, lower center
      { x: ['50%', '48%', '45%'], y: ['110%', '100%', '95%'] }, // Layer 4: drift up from bottom
      { x: ['50%', '52%', '55%'], y: ['-10%', '0%', '5%'] }, // Layer 5: drift down from top
    ];

    const pattern = driftPatterns[layerIndex % driftPatterns.length];
    const speedMult = speed;

    // Create staggered movement with speed multiplier
    return [
      { key: 'translateX', val: pattern.x[0], prog: 0 },
      { key: 'translateX', val: pattern.x[1], prog: 0.5 },
      { key: 'translateX', val: pattern.x[2], prog: 1 },
      { key: 'translateY', val: pattern.y[0], prog: 0 },
      { key: 'translateY', val: pattern.y[1], prog: 0.5 },
      { key: 'translateY', val: pattern.y[2], prog: 1 },
    ];
  };

  // Helper function to calculate blur ranges for depth
  const getBlurRanges = (
    layerIndex: number,
  ): Array<{ key: string; val: any; prog: number }> => {
    // Front layers have less blur, back layers have more blur
    const blurLevels = ['0px', '1px', '2px', '2px', '1px', '0px'];
    const maxBlur = blurLevels[layerIndex % blurLevels.length];

    return [
      { key: 'filter', val: `blur(${maxBlur})`, prog: 0 },
      { key: 'filter', val: `blur(${maxBlur})`, prog: 0.5 },
      { key: 'filter', val: `blur(0px)`, prog: 1 },
    ];
  };

  // Helper function to calculate scale ranges for growing/shrinking
  const getScaleRanges = (): Array<{ key: string; val: any; prog: number }> => {
    return [
      { key: 'scale', val: 0.8, prog: 0 },
      { key: 'scale', val: 1.3, prog: 0.6 },
      { key: 'scale', val: 1, prog: 1 },
    ];
  };

  // Create 6 fog layers
  const fogLayers: RenderableComponentData[] = [];

  for (let i = 0; i < 6; i++) {
    const layerId = `fog-layer-${i}`;
    const fogColor = getFogColor(i);
    const zIndex = 10 + i * 10;

    // Stagger layer animations by 10-15% offset
    const staggerOffset = i * 0.12; // 12% stagger per layer
    const effectStart = staggerOffset * duration;
    const effectDuration = duration - effectStart;

    // Determine gradient position and size based on layer
    const gradientConfigs = [
      'ellipse 120% 80% at 0% 100%', // Bottom-left
      'ellipse 100% 90% at 100% 0%', // Top-right
      'ellipse 80% 100% at -10% 50%', // Left center
      'ellipse 90% 70% at 110% 60%', // Right lower
      'ellipse 60% 50% at 50% 110%', // Bottom center
      'ellipse 70% 60% at 50% -10%', // Top center
    ];
    const gradientConfig = gradientConfigs[i % gradientConfigs.length];

    // Create fog layer with radial gradient
    const fogLayer: RenderableComponentData = {
      id: layerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'absolute inset-0 will-change-transform will-change-opacity pointer-events-none',
          style: {
            background: `radial-gradient(${gradientConfig}, ${fogColor} 0%, transparent 70%)`,
            zIndex,
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
        // Main fog animation (opacity phases)
        {
          id: `${layerId}-opacity-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: effectStart,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [layerId],
            ranges: getPhaseEffectRanges(i),
          },
        },
        // Drift movement
        {
          id: `${layerId}-drift-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: effectStart,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [layerId],
            ranges: getDriftRanges(i),
          },
        },
        // Blur for depth
        {
          id: `${layerId}-blur-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: effectStart,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [layerId],
            ranges: getBlurRanges(i),
          },
        },
        // Scale for growing/shrinking
        {
          id: `${layerId}-scale-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: effectStart,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [layerId],
            ranges: getScaleRanges(),
          },
        },
        // Breathing/pulsation effect (oscillating opacity)
        ...(breathingIntensity > 0
          ? [
              {
                id: `${layerId}-breathing-effect`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: effectStart,
                  duration: effectDuration * 0.2, // Breathing cycle: 20% of total duration
                  mode: 'provider',
                  targetIds: [layerId],
                  ranges: [
                    { key: 'opacity', val: -breathingIntensity, prog: 0 },
                    { key: 'opacity', val: breathingIntensity, prog: 0.5 },
                    { key: 'opacity', val: -breathingIntensity, prog: 1 },
                  ],
                },
              },
            ]
          : []),
      ],
    };

    fogLayers.push(fogLayer);
  }

  // Create vignette overlay (darkens edges)
  const vignetteOverlay: RenderableComponentData = {
    id: 'fog-vignette-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none will-change-opacity',
        style: {
          background:
            'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 20%, rgba(10, 5, 15, 0.95) 100%)',
          zIndex: 60,
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
        id: 'vignette-fade-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: duration * 0.6, // Fade in during first 60%
          mode: 'provider',
          targetIds: ['fog-vignette-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'vignette-fadeout-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: duration * 0.8, // Fade out during last 20%
          duration: duration * 0.2,
          mode: 'provider',
          targetIds: ['fog-vignette-overlay'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'haunting-fog-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [...fogLayers, vignetteOverlay] as RenderableComponentData[],
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
  id: 'haunting-fog-transition',
  title: 'Haunting Fog Transition',
  description:
    'A horror-movie inspired fog transition effect with multi-layered tendrils of dark smoke creeping from screen edges. Features varying opacity layers moving at different speeds, tension-building pacing through four phases, breathing/pulsation effects, and eerie color shifts from deep blacks to dark purples.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'fog',
    'horror',
    'atmospheric',
    'smoke',
    'dark',
    'suspense',
    'organic',
    'multi-layer',
    'breathing',
  ],
  defaultInputParams: {
    duration: 8,
    intensity: 1,
    speed: 1,
    colorScheme: 'mixed',
    breathingIntensity: 0.1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const hauntingFogTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};