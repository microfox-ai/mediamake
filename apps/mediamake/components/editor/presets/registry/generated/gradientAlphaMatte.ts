/**
 * Gradient Alpha Matte Effect Preset
 *
 * SINGLE EFFECT:
 * Creates a gradient-based alpha reveal using CSS linear-gradient or radial-gradient masks.
 * Animates gradient mask position to reveal content smoothly with customizable stops, angles, and hardness levels.
 *
 * Features:
 * - **Gradient Types**: Linear (with angle control) and radial gradients
 * - **Multi-Stop Gradients**: Support for 2-stop (simple) and complex multi-stop configurations
 * - **Hardness Control**: Adjust gradient edge softness/sharpness
 * - **Color-Based Masking**: Specific color values determine transparency levels
 * - **Animated Reveal**: Flowing reveal effects via maskPosition and maskSize animation
 * - **Flexible Targeting**: Provider mode with targetIds for precise component targeting
 *
 * Use cases:
 * - Creating smooth content reveals with gradient masks
 * - Implementing wipe/reveal transitions
 * - Building color-based transparency effects
 * - Adding flowing reveal animations to images/videos
 *
 * Technical:
 * - Uses CSS mask-image with linear-gradient() or radial-gradient()
 * - Animates maskPosition for movement-based reveals
 * - Supports custom gradient stops with position and color
 * - Easing control for smooth or snappy animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the gradient mask reveal to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(2)
    .describe('Duration of the gradient reveal effect'),
  gradientType: z
    .enum(['linear', 'radial'])
    .default('linear')
    .describe('Type of gradient mask (linear or radial)'),
  angle: z
    .number()
    .default(90)
    .describe('Angle for linear gradient in degrees (0-360)'),
  stops: z
    .array(
      z.object({
        color: z
          .string()
          .describe('CSS color value (e.g., "transparent", "#000", "rgba(0,0,0,0.5)")'),
        position: z
          .number()
          .min(0)
          .max(100)
          .describe('Position of stop as percentage (0-100)'),
      }),
    )
    .default([
      { color: 'transparent', position: 0 },
      { color: 'black', position: 50 },
      { color: 'black', position: 100 },
    ])
    .describe('Array of gradient stops defining the mask'),
  hardness: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Hardness of gradient edges (0=soft, 1=hard)'),
  animatePosition: z
    .boolean()
    .default(true)
    .describe('Whether to animate the mask position'),
  startPosition: z
    .string()
    .default('0% 50%')
    .describe('Starting mask position (e.g., "0% 50%", "center")'),
  endPosition: z
    .string()
    .default('100% 50%')
    .describe('Ending mask position (e.g., "100% 50%", "center")'),
  easingType: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'])
    .default('ease-out')
    .describe('Easing function for the animation'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Build gradient string based on type and stops
  const buildGradientString = (
    type: 'linear' | 'radial',
    angle: number,
    stops: Array<{ color: string; position: number }>,
    hardness: number,
  ): string => {
    // Adjust hardness: compress the gradient stops towards the center
    const adjustedStops = stops.map((stop, index) => {
      if (index === 0 || index === stops.length - 1) return stop;
      
      // Apply hardness: higher hardness = stops closer together
      const centerPosition = 50;
      const distanceFromCenter = stop.position - centerPosition;
      const adjustedDistance = distanceFromCenter * (1 - hardness * 0.7);
      const adjustedPosition = centerPosition + adjustedDistance;
      
      return { ...stop, position: adjustedPosition };
    });

    const stopStrings = adjustedStops
      .map((stop) => `${stop.color} ${stop.position}%`)
      .join(', ');

    if (type === 'radial') {
      return `radial-gradient(circle, ${stopStrings})`;
    } else {
      // Linear gradient
      return `linear-gradient(${angle}deg, ${stopStrings})`;
    }
  };

  // Generate gradient mask-image
  const gradientString = buildGradientString(
    params.gradientType,
    params.angle,
    params.stops,
    params.hardness,
  );

  // Build animation ranges
  const ranges: Array<{ key: string; val: any; prog: number }> = [
    // Set mask-image (static property)
    { key: 'maskImage', val: gradientString, prog: 0 },
    { key: 'maskImage', val: gradientString, prog: 1 },
    { key: '-webkit-mask-image', val: gradientString, prog: 0 },
    { key: '-webkit-mask-image', val: gradientString, prog: 1 },
  ];

  // Animate position if enabled
  if (params.animatePosition) {
    ranges.push(
      { key: 'maskPosition', val: params.startPosition, prog: 0 },
      { key: 'maskPosition', val: params.endPosition, prog: 1 },
      { key: '-webkit-mask-position', val: params.startPosition, prog: 0 },
      { key: '-webkit-mask-position', val: params.endPosition, prog: 1 },
    );
  } else {
    // Static position
    ranges.push(
      { key: 'maskPosition', val: params.startPosition, prog: 0 },
      { key: 'maskPosition', val: params.startPosition, prog: 1 },
      { key: '-webkit-mask-position', val: params.startPosition, prog: 0 },
      { key: '-webkit-mask-position', val: params.startPosition, prog: 1 },
    );
  }

  // Add mask-size for better control
  const maskSize = params.gradientType === 'radial' ? '200% 200%' : '100% 100%';
  ranges.push(
    { key: 'maskSize', val: maskSize, prog: 0 },
    { key: 'maskSize', val: maskSize, prog: 1 },
    { key: '-webkit-mask-size', val: maskSize, prog: 0 },
    { key: '-webkit-mask-size', val: maskSize, prog: 1 },
  );

  // Mask repeat
  ranges.push(
    { key: 'maskRepeat', val: 'no-repeat', prog: 0 },
    { key: 'maskRepeat', val: 'no-repeat', prog: 1 },
    { key: '-webkit-mask-repeat', val: 'no-repeat', prog: 0 },
    { key: '-webkit-mask-repeat', val: 'no-repeat', prog: 1 },
  );

  // Construct effect data
  const effectData: GenericEffectData = {
    type: params.easingType,
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: ranges,
  };

  // Create effect node
  const effect = {
    id: params.effectId || `gradient-alpha-matte-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect wrapped in a container
  const container: RenderableComponentData = {
    id: 'gradient-alpha-matte-container',
    type: 'layout',
    componentId: 'BaseLayout',
    effects: [effect],
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: params.effectDuration,
      },
    },
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [container] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'gradientAlphaMatte',
  title: 'Gradient Alpha Matte Effect',
  description:
    'Internal effect preset that creates gradient-based alpha reveal using CSS linear-gradient or radial-gradient masks. Animates gradient mask position to reveal content smoothly with customizable stops, angles, and hardness levels. Supports both simple two-stop and complex multi-stop configurations with color-based masking for transparency control.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'gradient', 'mask', 'reveal', 'alpha', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 2,
    gradientType: 'linear',
    angle: 90,
    stops: [
      { color: 'transparent', position: 0 },
      { color: 'black', position: 50 },
      { color: 'black', position: 100 },
    ],
    hardness: 0.5,
    animatePosition: true,
    startPosition: '0% 50%',
    endPosition: '100% 50%',
    easingType: 'ease-out',
  },
};

// Export preset
export const gradientAlphaMattePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
