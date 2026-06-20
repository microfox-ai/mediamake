/**
 * Alpha Matte Reveal Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Applies a smooth alpha matte reveal effect using opacity masking and clipPath animation.
 * Creates a progressive reveal with customizable direction (top/bottom/left/right/center) 
 * and staggered wave-like pattern across the target element.
 *
 * Features:
 * - Opacity animation from 0 to 1 with gradient-like progression
 * - ClipPath animation for true matte effect
 * - Customizable reveal direction (top, bottom, left, right, center)
 * - Staggered reveal with wave-like pattern
 * - Configurable duration, easing, and stagger amount
 * - Works with any component type (text, video, image) via targetIds
 *
 * Technical Details:
 * - Uses generic AnimationRange[] with multiple keyframes (prog: 0, 0.2, 0.4, 0.6, 0.8, 1.0)
 * - Combines clipPath and opacity for smooth reveal
 * - Stagger implemented via timing adjustments in intermediate keyframes
 * - Provider mode targeting via targetIds array
 *
 * Use cases:
 * - Creating smooth content reveals
 * - Building engaging entrance animations
 * - Adding directional wipe effects
 * - Creating professional transition effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to target with the reveal effect'),
  start: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent timeline)'),
  duration: z
    .number()
    .default(1500)
    .describe('Duration of the reveal effect in milliseconds'),
  direction: z
    .enum(['top', 'bottom', 'left', 'right', 'center'])
    .default('center')
    .describe('Direction of the reveal animation'),
  easing: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'])
    .default('ease-out')
    .describe('Easing function for the animation'),
  stagger: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Stagger amount for wave-like progression (0-1)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for the reveal effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Convert duration from milliseconds to seconds
  const durationSeconds = params.duration / 1000;

  // Helper function to generate clipPath values based on direction
  const generateClipPath = (prog: number, direction: string): string => {
    // Apply stagger to create wave-like progression
    const staggeredProg = Math.min(1, prog + prog * params.stagger);
    
    switch (direction) {
      case 'top':
        // Reveal from top to bottom
        return `inset(${100 - staggeredProg * 100}% 0% 0% 0%)`;
      case 'bottom':
        // Reveal from bottom to top
        return `inset(0% 0% ${100 - staggeredProg * 100}% 0%)`;
      case 'left':
        // Reveal from left to right
        return `inset(0% ${100 - staggeredProg * 100}% 0% 0%)`;
      case 'right':
        // Reveal from right to left
        return `inset(0% 0% 0% ${100 - staggeredProg * 100}%)`;
      case 'center':
        // Reveal from center outward (circular-like)
        const centerOffset = (100 - staggeredProg * 100) / 2;
        return `inset(${centerOffset}% ${centerOffset}% ${centerOffset}% ${centerOffset}%)`;
      default:
        return `inset(0% 0% 0% 0%)`;
    }
  };

  // Helper function to generate opacity values with gradient-like progression
  const generateOpacity = (prog: number): number => {
    // Create a smooth gradient-like opacity curve
    // Early stages fade in faster, then stabilize
    if (prog < 0.3) {
      return prog / 0.3 * 0.5; // 0 to 0.5 in first 30%
    } else if (prog < 0.6) {
      return 0.5 + (prog - 0.3) / 0.3 * 0.3; // 0.5 to 0.8 in next 30%
    } else {
      return 0.8 + (prog - 0.6) / 0.4 * 0.2; // 0.8 to 1.0 in final 40%
    }
  };

  // Create animation ranges with progressive keyframes
  const progressPoints = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
  
  const clipPathRanges = progressPoints.map(prog => ({
    key: 'clipPath',
    val: generateClipPath(prog, params.direction),
    prog: prog,
  }));

  const opacityRanges = progressPoints.map(prog => ({
    key: 'opacity',
    val: generateOpacity(prog),
    prog: prog,
  }));

  // Combine all ranges
  const ranges = [...clipPathRanges, ...opacityRanges];

  // Construct effect data
  const effectData: GenericEffectData = {
    type: params.easing,
    start: params.start,
    duration: durationSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: ranges,
  };

  // Create effect object
  const effect = {
    id: params.effectId || `alpha-matte-reveal-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect wrapped in container structure
  return {
    output: {
      childrenData: [
        {
          id: 'alpha-matte-reveal-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'alphaMatteReveal',
  title: 'Alpha Matte Reveal Effect',
  description:
    'Internal effect preset that implements a smooth alpha matte reveal effect using opacity masking and clipPath animation. Creates a progressive reveal with customizable direction (top/bottom/left/right/center) and staggered wave-like pattern. Returns effects configuration only, designed to be called via props.presets[id]() in provider mode.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'reveal', 'matte', 'alpha', 'wipe', 'transition', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    start: 0,
    duration: 1500,
    direction: 'center',
    easing: 'ease-out',
    stagger: 0.3,
  },
};

// Export preset
export const alphaMatteRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
