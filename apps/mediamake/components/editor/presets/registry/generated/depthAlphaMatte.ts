/**
 * Depth Alpha Matte 3D Reveal Internal Effect Preset
 *
 * Creates pseudo-3D reveal effects using depth maps and parallax. Simulates depth-based
 * revealing where closer elements (lower z-depth) appear first, with fog effects for
 * distant elements and cinematic focus transitions.
 *
 * ARRAY OF EFFECTS:
 * This preset returns multiple effects for a single target component:
 * - Opacity reveal effect (depth-based timing)
 * - TranslateZ parallax effect (3D depth positioning)
 * - Blur effect for cinematic focus (optional, based on depth range)
 *
 * Features:
 * - **Depth-Based Reveal**: Closer elements fade in first, distant elements fade in later
 * - **Fog Simulation**: Distant elements have reduced maximum opacity
 * - **3D Parallax**: Timeline-based translateZ animations for depth perception
 * - **Cinematic Focus**: Optional blur effects for specific depth ranges
 * - **Configurable Depth Layers**: Support for multiple z-depth values
 *
 * Technical Implementation:
 * - Uses z-depth values to calculate reveal start times (closer = earlier)
 * - Applies opacity fade-in with fog density affecting max opacity
 * - Implements translateZ transforms for true 3D perspective
 * - Supports focus depth ranges with blur transitions
 *
 * Use cases:
 * - Creating depth-based reveal animations
 * - Simulating 3D space with 2D elements
 * - Adding atmospheric fog effects to layered content
 * - Creating cinematic focus pulls between depth layers
 * - Building parallax scrolling effects with depth perception
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// Parameter schema with descriptions
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply depth effects to'),
  zDepth: z
    .number()
    .min(0)
    .max(1000)
    .describe('Z-depth value (0 = closest, higher = farther)'),
  depthLayers: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Total number of depth layers in the scene'),
  parallaxIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity of parallax movement (0 = none, 1 = normal, 2 = extreme)'),
  fogStart: z
    .number()
    .min(0)
    .max(1000)
    .default(200)
    .describe('Z-depth where fog begins to reduce opacity'),
  fogEnd: z
    .number()
    .min(0)
    .max(1000)
    .default(400)
    .describe('Z-depth where fog reaches maximum density'),
  focusDepth: z
    .number()
    .min(0)
    .max(1000)
    .optional()
    .describe('Z-depth value for focus center (blur elements outside focus range)'),
  focusRange: z
    .number()
    .min(0)
    .max(500)
    .default(100)
    .optional()
    .describe('Range around focusDepth that stays in focus'),
  effectStart: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the effect sequence (relative to parent)'),
  effectDuration: z
    .number()
    .min(0.5)
    .default(10)
    .describe('Total duration of the effect sequence'),
  revealDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Duration of individual opacity reveal animation'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Calculate opacity based on z-depth and fog
  const calculateMaxOpacity = (
    zDepth: number,
    fogStart: number,
    fogEnd: number,
  ): number => {
    if (zDepth <= fogStart) {
      return 1; // Full opacity before fog starts
    }
    if (zDepth >= fogEnd) {
      return 0.3; // Minimum opacity at maximum fog
    }
    // Linear interpolation between fogStart and fogEnd
    const fogProgress = (zDepth - fogStart) / (fogEnd - fogStart);
    return 1 - fogProgress * 0.7; // Reduce opacity from 1.0 to 0.3
  };

  // Helper function: Calculate reveal start time based on depth
  const calculateRevealStart = (
    zDepth: number,
    depthLayers: number,
    effectDuration: number,
  ): number => {
    // Closer elements (lower zDepth) reveal first
    // Spread reveals across the first half of effectDuration
    const maxRevealDelay = effectDuration * 0.4; // Use 40% of duration for staggered reveals
    const normalizedDepth = zDepth / 1000; // Normalize to 0-1 range
    return normalizedDepth * maxRevealDelay;
  };

  // Helper function: Calculate blur amount based on distance from focus depth
  const calculateBlurAmount = (
    zDepth: number,
    focusDepth?: number,
    focusRange?: number,
  ): number => {
    if (focusDepth === undefined || focusRange === undefined) {
      return 0; // No blur if focus not specified
    }

    const distanceFromFocus = Math.abs(zDepth - focusDepth);
    if (distanceFromFocus <= focusRange) {
      return 0; // In focus
    }

    // Blur increases with distance from focus
    const blurScale = (distanceFromFocus - focusRange) / 100;
    return Math.min(blurScale * 6, 10); // Max blur of 10px
  };

  // Extract parameters
  const {
    targetId,
    zDepth,
    depthLayers,
    parallaxIntensity,
    fogStart,
    fogEnd,
    focusDepth,
    focusRange,
    effectStart,
    effectDuration,
    revealDuration,
    effectId,
  } = params;

  // Calculate effect parameters based on depth
  const maxOpacity = calculateMaxOpacity(zDepth, fogStart, fogEnd);
  const revealStartTime = calculateRevealStart(
    zDepth,
    depthLayers,
    effectDuration,
  );
  const blurAmount = calculateBlurAmount(zDepth, focusDepth, focusRange);

  // Calculate parallax translateZ range based on depth
  const baseTranslateZ = -zDepth * 0.5; // Farther elements pushed back more
  const parallaxRange = parallaxIntensity * 20; // Amount of Z movement during animation

  // Effect 1: Opacity Reveal (depth-based fade-in with fog)
  const opacityEffect: GenericEffectData = {
    type: 'ease-out',
    start: effectStart + revealStartTime,
    duration: revealDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: maxOpacity, prog: 1 },
    ],
  };

  // Effect 2: Parallax TranslateZ (3D depth positioning)
  const parallaxEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'translateZ', val: baseTranslateZ, prog: 0 },
      { key: 'translateZ', val: baseTranslateZ + parallaxRange, prog: 1 },
    ],
  };

  // Effect 3: Cinematic Focus Blur (optional, if focus depth specified)
  const effects: any[] = [
    {
      id: `${effectId || 'depth'}-opacity-${targetId}`,
      componentId: 'generic',
      data: opacityEffect,
    },
    {
      id: `${effectId || 'depth'}-parallax-${targetId}`,
      componentId: 'generic',
      data: parallaxEffect,
    },
  ];

  // Add blur effect if out of focus
  if (blurAmount > 0) {
    const focusBlurEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: effectStart + effectDuration * 0.5, // Focus pull in middle of sequence
      duration: effectDuration * 0.3,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'blur', val: 0, prog: 0 },
        { key: 'blur', val: blurAmount, prog: 0.5 },
        { key: 'blur', val: blurAmount * 0.5, prog: 1 },
      ],
    };

    effects.push({
      id: `${effectId || 'depth'}-focus-blur-${targetId}`,
      componentId: 'generic',
      data: focusBlurEffect,
    });
  }

  // Return effects in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'depth-alpha-matte-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
            },
          },
        } as RenderableComponentData,
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'depthAlphaMatte',
  title: 'Depth Alpha Matte 3D Reveal',
  description:
    'Creates pseudo-3D reveal effects using depth maps and parallax. Simulates depth-based revealing where closer elements appear first, with fog effects for distant elements and optional cinematic focus transitions.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'depth', '3d', 'parallax', 'reveal', 'fog', 'internal'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetId: 'layer-1',
    zDepth: 0,
    depthLayers: 5,
    parallaxIntensity: 1,
    fogStart: 200,
    fogEnd: 400,
    focusDepth: 200,
    focusRange: 100,
    effectStart: 0,
    effectDuration: 10,
    revealDuration: 1.5,
  },
};

export const depthAlphaMattePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
