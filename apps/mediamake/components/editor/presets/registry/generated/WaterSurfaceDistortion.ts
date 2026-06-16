/**
 * Water Surface Distortion Effect
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset simulates looking through moving water by combining
 * multiple transform and filter effects:
 * - Primary wave: translateX sine wave oscillating between -20px and 20px
 * - Secondary wave: translateY sine wave oscillating between -10px and 10px (offset timing)
 * - Perspective transform: oscillates between 800px and 1000px for depth effect
 * - Dynamic blur: oscillates between 0 and 3px to simulate focus shifts
 * - Opacity fluctuation: subtle changes between 0.9 and 1.0 for water transparency
 *
 * All effects use GPU-accelerated transforms (transform, filter) with willChange
 * for optimal performance. Effects loop continuously to simulate ongoing water movement.
 *
 * The preset returns an array of 5 generic effects that parent presets can extract
 * and apply to target components via targetIds parameter.
 *
 * Features:
 * - Configurable wave speed (default 1500ms)
 * - Wave amplitude multiplier for translation distances
 * - Adjustable perspective depth effect
 * - Three distortion modes: gentle, moderate, intense
 * - GPU-accelerated transforms for smooth performance
 * - Looping animations for continuous water effect
 *
 * Use cases:
 * - Simulating underwater views
 * - Creating dreamy, fluid text effects
 * - Adding organic movement to static images
 * - Building immersive water-themed compositions
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  waveSpeed: z
    .number()
    .min(500)
    .max(5000)
    .default(1500)
    .optional()
    .describe('Duration of one wave cycle in milliseconds'),
  waveAmplitude: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.0)
    .optional()
    .describe('Multiplier for translation distances (scales wave movement)'),
  depthEffect: z
    .number()
    .min(500)
    .max(2000)
    .default(800)
    .optional()
    .describe('Perspective distance in pixels for depth effect'),
  distortionMode: z
    .enum(['gentle', 'moderate', 'intense'])
    .default('moderate')
    .optional()
    .describe(
      'Intensity of distortion: gentle (subtle), moderate (balanced), intense (dramatic)',
    ),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply water distortion effects to'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const waveSpeed = params.waveSpeed ?? 1500;
  const waveAmplitude = params.waveAmplitude ?? 1.0;
  const depthEffect = params.depthEffect ?? 800;
  const distortionMode = params.distortionMode ?? 'moderate';
  const targetIds = params.targetIds;

  // Calculate distortion multipliers based on mode
  const getModeMultipliers = (
    mode: 'gentle' | 'moderate' | 'intense',
  ): { translation: number; blur: number; opacity: number } => {
    switch (mode) {
      case 'gentle':
        return { translation: 0.5, blur: 0.5, opacity: 0.05 };
      case 'moderate':
        return { translation: 1.0, blur: 1.0, opacity: 0.1 };
      case 'intense':
        return { translation: 1.5, blur: 1.5, opacity: 0.15 };
      default:
        return { translation: 1.0, blur: 1.0, opacity: 0.1 };
    }
  };

  const modeMultipliers = getModeMultipliers(distortionMode);

  // Calculate final effect values
  const translateXRange = 20 * waveAmplitude * modeMultipliers.translation;
  const translateYRange = 10 * waveAmplitude * modeMultipliers.translation;
  const blurMax = 3 * modeMultipliers.blur;
  const opacityMin = 1.0 - 0.1 * modeMultipliers.opacity;
  const perspectiveMin = depthEffect;
  const perspectiveMax = depthEffect + 200;

  // Convert wave speed to seconds
  const durationInSeconds = waveSpeed / 1000;

  // Effect 1: Primary wave - translateX sine wave (-20px to 20px)
  const translateXEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'translateX', val: '0px', prog: 0 },
      { key: 'translateX', val: `${translateXRange}px`, prog: 0.25 },
      { key: 'translateX', val: '0px', prog: 0.5 },
      { key: 'translateX', val: `${-translateXRange}px`, prog: 0.75 },
      { key: 'translateX', val: '0px', prog: 1 },
    ],
    loop: true,
    willChange: 'transform, filter',
  };

  // Effect 2: Secondary wave - translateY offset sine wave (-10px to 10px)
  // Offset by 0.125 in prog values to create asynchronous wave motion
  const translateYEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'translateY', val: `${translateYRange / 2}px`, prog: 0 }, // Start at 5px (offset)
      { key: 'translateY', val: `${translateYRange}px`, prog: 0.125 }, // Peak at 10px
      { key: 'translateY', val: `${translateYRange / 2}px`, prog: 0.375 }, // Back to 5px
      { key: 'translateY', val: '0px', prog: 0.625 }, // Down to 0
      { key: 'translateY', val: `${-translateYRange / 2}px`, prog: 0.875 }, // Down to -5px
      { key: 'translateY', val: `${translateYRange / 2}px`, prog: 1 }, // Back to 5px
    ],
    loop: true,
    willChange: 'transform, filter',
  };

  // Effect 3: Perspective oscillation (800px-1000px)
  const perspectiveEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'perspective', val: `${perspectiveMin}px`, prog: 0 },
      { key: 'perspective', val: `${perspectiveMax}px`, prog: 0.5 },
      { key: 'perspective', val: `${perspectiveMin}px`, prog: 1 },
    ],
    loop: true,
    willChange: 'transform, filter',
  };

  // Effect 4: Dynamic blur (0-3px-0)
  const blurEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'blur', val: '0px', prog: 0 },
      { key: 'blur', val: `${blurMax}px`, prog: 0.5 },
      { key: 'blur', val: '0px', prog: 1 },
    ],
    loop: true,
    willChange: 'transform, filter',
  };

  // Effect 5: Opacity fluctuation (1.0-0.9-1.0)
  const opacityEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'opacity', val: 1.0, prog: 0 },
      { key: 'opacity', val: opacityMin, prog: 0.5 },
      { key: 'opacity', val: 1.0, prog: 1 },
    ],
    loop: true,
    willChange: 'transform, filter',
  };

  // Create effect nodes
  const effects = [
    {
      id: `water-translateX-${targetIds.join('-')}`,
      componentId: 'generic' as const,
      data: translateXEffect,
    },
    {
      id: `water-translateY-${targetIds.join('-')}`,
      componentId: 'generic' as const,
      data: translateYEffect,
    },
    {
      id: `water-perspective-${targetIds.join('-')}`,
      componentId: 'generic' as const,
      data: perspectiveEffect,
    },
    {
      id: `water-blur-${targetIds.join('-')}`,
      componentId: 'generic' as const,
      data: blurEffect,
    },
    {
      id: `water-opacity-${targetIds.join('-')}`,
      componentId: 'generic' as const,
      data: opacityEffect,
    },
  ];

  // Return effects in a container structure
  // System will extract effects array when _internalPresetOutput: 'effects'
  const rootContainer: RenderableComponentData = {
    id: 'water-surface-distortion-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    effects: effects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: durationInSeconds,
      },
    },
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects, // Explicit extraction for easier access
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'WaterSurfaceDistortion',
  title: 'Water Surface Distortion Effect',
  description:
    'Internal effect preset that simulates looking through moving water with multiple transform effects (translateX sine wave, translateY offset wave, perspective depth, dynamic blur, opacity fluctuation). Returns effect data only - no component structure. Parent presets call this and attach the effects to target components via targetIds parameter.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'internal',
    'water',
    'distortion',
    'transform',
    'generic',
    'animation',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    waveSpeed: 1500,
    waveAmplitude: 1.0,
    depthEffect: 800,
    distortionMode: 'moderate',
    targetIds: ['example-component'],
  },
};

export const WaterSurfaceDistortionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
