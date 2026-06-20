/**
 * Tracking Line Glitch Internal Effect Preset
 *
 * Creates a classic VHS tracking line that moves vertically across the screen,
 * distorting everything it passes through. The tracking line applies a clip-path
 * that reveals a distortion zone moving across the screen, combined with horizontal
 * displacement, brightness changes, and scaling effects within that zone.
 *
 * Features:
 * - **Configurable Direction**: Move tracking line up, down, left, or right
 * - **Clip-Path Animation**: Creates a moving reveal zone using inset() clip-path
 * - **Distortion Effects**: Horizontal displacement (translateX), brightness changes, and scaleX warping
 * - **Synchronized Ranges**: Multiple AnimationRange objects coordinate the clip-path with distortion effects
 * - **Speed & Intensity Control**: Adjust movement speed and distortion strength
 *
 * Use cases:
 * - VHS tracking line effects for retro aesthetics
 * - Glitch transitions between scenes
 * - Scan-line effects for tech/cyberpunk themes
 * - Adding analog artifact simulations
 *
 * Technical details:
 * - Returns a generic effect with synchronized animation ranges
 * - Uses clip-path (inset) to create the moving zone
 * - Combines transform (translateX, scaleX) and filter (brightness) within the zone
 * - All effects use 'provider' mode targeting specified component IDs
 *
 * SINGLE EFFECT PRESET
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the tracking line effect to'),
  direction: z
    .enum(['up', 'down', 'left', 'right'])
    .default('up')
    .describe(
      'Direction of tracking line movement: up (bottom to top), down (top to bottom), left (right to left), right (left to right)',
    ),
  speed: z
    .number()
    .min(0.5)
    .max(5)
    .default(1)
    .describe(
      'Speed multiplier for tracking line movement (0.5 = slow, 1 = normal, 5 = fast)',
    ),
  distortionAmount: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe(
      'Intensity multiplier for distortion effects (0.1 = subtle, 1 = normal, 5 = extreme)',
    ),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the tracking line pass in seconds'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate clip-path ranges based on direction
  const generateClipPathRanges = (
    direction: 'up' | 'down' | 'left' | 'right',
  ): Array<{ key: string; val: string; prog: number }> => {
    switch (direction) {
      case 'up':
        // Bottom to top (vertical)
        return [
          { key: 'clipPath', val: 'inset(100% 0 0 0)', prog: 0 }, // Start: hidden at bottom
          { key: 'clipPath', val: 'inset(90% 0 5% 0)', prog: 0.1 }, // Reveal 5% at bottom
          { key: 'clipPath', val: 'inset(50% 0 45% 0)', prog: 0.5 }, // Middle: 5% strip in center
          { key: 'clipPath', val: 'inset(5% 0 90% 0)', prog: 0.9 }, // Reveal 5% at top
          { key: 'clipPath', val: 'inset(0 0 100% 0)', prog: 1 }, // End: hidden at top
        ];
      case 'down':
        // Top to bottom (vertical)
        return [
          { key: 'clipPath', val: 'inset(0 0 100% 0)', prog: 0 }, // Start: hidden at top
          { key: 'clipPath', val: 'inset(5% 0 90% 0)', prog: 0.1 }, // Reveal 5% at top
          { key: 'clipPath', val: 'inset(45% 0 50% 0)', prog: 0.5 }, // Middle: 5% strip in center
          { key: 'clipPath', val: 'inset(90% 0 5% 0)', prog: 0.9 }, // Reveal 5% at bottom
          { key: 'clipPath', val: 'inset(100% 0 0 0)', prog: 1 }, // End: hidden at bottom
        ];
      case 'left':
        // Right to left (horizontal)
        return [
          { key: 'clipPath', val: 'inset(0 0 0 100%)', prog: 0 }, // Start: hidden at right
          { key: 'clipPath', val: 'inset(0 5% 0 90%)', prog: 0.1 }, // Reveal 5% at right
          { key: 'clipPath', val: 'inset(0 45% 0 50%)', prog: 0.5 }, // Middle: 5% strip in center
          { key: 'clipPath', val: 'inset(0 90% 0 5%)', prog: 0.9 }, // Reveal 5% at left
          { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 1 }, // End: hidden at left
        ];
      case 'right':
        // Left to right (horizontal)
        return [
          { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 }, // Start: hidden at left
          { key: 'clipPath', val: 'inset(0 90% 0 5%)', prog: 0.1 }, // Reveal 5% at left
          { key: 'clipPath', val: 'inset(0 50% 0 45%)', prog: 0.5 }, // Middle: 5% strip in center
          { key: 'clipPath', val: 'inset(0 5% 0 90%)', prog: 0.9 }, // Reveal 5% at right
          { key: 'clipPath', val: 'inset(0 0 0 100%)', prog: 1 }, // End: hidden at right
        ];
    }
  };

  // Helper function to generate translateX ranges based on direction
  const generateTranslateRanges = (
    direction: 'up' | 'down' | 'left' | 'right',
    distortionAmount: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    // For vertical directions, we apply horizontal displacement
    // For horizontal directions, we can apply vertical displacement
    const isVertical = direction === 'up' || direction === 'down';
    const transformKey = isVertical ? 'translateX' : 'translateY';

    // Scale distortion values by distortionAmount
    const baseValues = [0, 20, -15, 25, 0];
    const scaledValues = baseValues.map(v => v * distortionAmount);

    return [
      { key: transformKey, val: scaledValues[0], prog: 0 },
      { key: transformKey, val: scaledValues[1], prog: 0.1 },
      { key: transformKey, val: scaledValues[2], prog: 0.5 },
      { key: transformKey, val: scaledValues[3], prog: 0.9 },
      { key: transformKey, val: scaledValues[4], prog: 1 },
    ];
  };

  // Helper function to generate brightness ranges
  const generateBrightnessRanges = (
    distortionAmount: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    // Brightness fluctuations (normalized around 1)
    const baseValues = [1, 1.5, 0.7, 1.3, 1];
    // Scale deviation from 1 by distortionAmount
    const scaledValues = baseValues.map(
      v => 1 + (v - 1) * distortionAmount,
    );

    return [
      { key: 'brightness', val: scaledValues[0], prog: 0 },
      { key: 'brightness', val: scaledValues[1], prog: 0.25 },
      { key: 'brightness', val: scaledValues[2], prog: 0.5 },
      { key: 'brightness', val: scaledValues[3], prog: 0.75 },
      { key: 'brightness', val: scaledValues[4], prog: 1 },
    ];
  };

  // Helper function to generate scaleX ranges
  const generateScaleRanges = (
    direction: 'up' | 'down' | 'left' | 'right',
    distortionAmount: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    const isVertical = direction === 'up' || direction === 'down';
    const scaleKey = isVertical ? 'scaleX' : 'scaleY';

    // Subtle scaling effect
    const baseValues = [1, 1.02, 0.98, 1.01, 1];
    // Scale deviation from 1 by distortionAmount
    const scaledValues = baseValues.map(
      v => 1 + (v - 1) * distortionAmount,
    );

    return [
      { key: scaleKey, val: scaledValues[0], prog: 0 },
      { key: scaleKey, val: scaledValues[1], prog: 0.25 },
      { key: scaleKey, val: scaledValues[2], prog: 0.5 },
      { key: scaleKey, val: scaledValues[3], prog: 0.75 },
      { key: scaleKey, val: scaledValues[4], prog: 1 },
    ];
  };

  // Calculate adjusted duration based on speed
  const adjustedDuration = params.effectDuration / params.speed;

  // Generate all animation ranges
  const clipPathRanges = generateClipPathRanges(params.direction);
  const translateRanges = generateTranslateRanges(
    params.direction,
    params.distortionAmount,
  );
  const brightnessRanges = generateBrightnessRanges(params.distortionAmount);
  const scaleRanges = generateScaleRanges(
    params.direction,
    params.distortionAmount,
  );

  // Combine all ranges
  const allRanges = [
    ...clipPathRanges,
    ...translateRanges,
    ...brightnessRanges,
    ...scaleRanges,
  ];

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear timing for constant tracking line speed
    start: params.effectStart,
    duration: adjustedDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: allRanges,
  };

  // Create effect object
  const effectId =
    params.effectId || `tracking-glitch-${params.targetIds.join('-')}`;
  const effect = {
    id: effectId,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect wrapped in container structure
  return {
    output: {
      childrenData: [
        {
          id: 'tracking-glitch-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: adjustedDuration,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'trackingLineGlitch',
  title: 'Tracking Line Glitch Effect',
  description:
    'Internal effect preset that creates a classic VHS tracking line moving vertically across the screen with distortion. Applies horizontal displacement, brightness changes, and scaling effects to content as the line passes through. Configurable direction (up/down/left/right) and distortion intensity. Returns a generic AnimationRange effect with synchronized clip-path, transform, and filter animations.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'glitch', 'vhs', 'tracking', 'distortion'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    direction: 'up',
    speed: 1,
    distortionAmount: 1,
    effectStart: 0,
    effectDuration: 1.5,
  },
};

// --- Export ---

export const trackingLineGlitchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
