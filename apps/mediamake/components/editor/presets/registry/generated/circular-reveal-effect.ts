/**
 * Circular Reveal Effect (Internal Effect Preset)
 *
 * SINGLE EFFECT:
 * Generates an expanding circular reveal effect using clip-path animation.
 * Starts from center (or custom position) and grows outward like a ripple.
 * Creates cinematic reveals for text, images, or video elements.
 *
 * Features:
 * - Circular and elliptical expansion patterns
 * - Configurable initial radius size (0-10%)
 * - Multiple easing curves: ease-out, spring, ease-in-out
 * - Smooth expansion from 0% to 150% radius
 * - Center-origin animation with customizable anchor point
 *
 * Technical Details:
 * - Uses clip-path: circle() for circular reveals
 * - Uses clip-path: ellipse() for elliptical reveals
 * - Progress keyframes at [0, 0.6, 1] for smooth ease-out by default
 * - Animates from 'circle(0% at 50% 50%)' to 'circle(150% at 50% 50%)'
 * - Returns effects array in provider mode for direct application
 *
 * Usage:
 * Call this preset with target component ID, timing, and configuration.
 * Extract the effect and apply to your component's effects array.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the reveal effect to'),
  effectStart: z.number().describe('Start time of the effect (relative to parent timeline, in seconds)'),
  duration: z.number().default(1).describe('Duration of the reveal animation in seconds (default: 1000ms = 1s)'),
  initialRadius: z.number().min(0).max(10).default(0).optional().describe('Initial radius size as percentage (0-10%, default: 0%)'),
  easingType: z.enum(['ease-out', 'spring', 'ease-in-out']).default('ease-out').optional().describe('Easing curve for the animation'),
  shape: z.enum(['circle', 'ellipse']).default('circle').optional().describe('Shape of the reveal pattern (circle or ellipse)'),
  anchorX: z.number().min(0).max(100).default(50).optional().describe('Horizontal anchor point as percentage (0-100%, default: 50% = center)'),
  anchorY: z.number().min(0).max(100).default(50).optional().describe('Vertical anchor point as percentage (0-100%, default: 50% = center)'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const duration = params.duration ?? 1;
  const initialRadius = params.initialRadius ?? 0;
  const easingType = params.easingType ?? 'ease-out';
  const shape = params.shape ?? 'circle';
  const anchorX = params.anchorX ?? 50;
  const anchorY = params.anchorY ?? 50;

  // Build clip-path strings based on shape
  const anchorPoint = `${anchorX}% ${anchorY}%`;
  
  let initialClipPath: string;
  let finalClipPath: string;

  if (shape === 'circle') {
    initialClipPath = `circle(${initialRadius}% at ${anchorPoint})`;
    finalClipPath = `circle(150% at ${anchorPoint})`;
  } else {
    // Ellipse uses two radii values (horizontal and vertical)
    initialClipPath = `ellipse(${initialRadius}% ${initialRadius}% at ${anchorPoint})`;
    finalClipPath = `ellipse(150% 150% at ${anchorPoint})`;
  }

  // Create animation ranges with smooth progression
  // Using [0, 0.6, 1] progress values for smooth ease-out feel
  const effectData: GenericEffectData = {
    type: easingType,
    start: params.effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      { key: 'clipPath', val: initialClipPath, prog: 0 },
      { key: 'clipPath', val: `${shape}(${initialRadius + (150 - initialRadius) * 0.6}% at ${anchorPoint})`, prog: 0.6 },
      { key: 'clipPath', val: finalClipPath, prog: 1 },
    ],
  };

  // Create the effect node
  const effect = {
    id: params.effectId || `circular-reveal-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return in standard internal effect format
  return {
    output: {
      childrenData: [
        {
          id: 'circular-reveal-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10, // Placeholder duration for container
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
  id: 'circularRevealEffect',
  title: 'Circular Reveal Effect',
  description: 'Internal effect preset that generates an expanding circular reveal effect using clip-path animation. Starts from center and grows outward like a ripple. Supports both circular and elliptical expansion patterns with configurable duration, initial radius, and easing curves. Returns effects array for use with generic effect provider mode.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'reveal', 'circular', 'clip-path', 'internal', 'generic', 'ripple', 'expand'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    duration: 1,
    initialRadius: 0,
    easingType: 'ease-out',
    shape: 'circle',
    anchorX: 50,
    anchorY: 50,
  },
};

// Export preset
export const circularRevealEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
