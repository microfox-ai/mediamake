/**
 * Gradient Wipe Reveal Effect
 *
 * INTERNAL EFFECT PRESET - SINGLE EFFECT
 *
 * This preset creates a smooth gradient wipe transition that reveals content by animating
 * a clipPath from one edge to another. The effect simulates a cinematic wipe transition
 * similar to those found in video editing software.
 *
 * Features:
 * - **Directional Wipes**: Support for left, right, up, and down wipe directions
 * - **Gradient Softness**: Configurable gradient edge softness (0-1 scale)
 * - **Smooth Easing**: Uses ease-in-out easing for natural motion
 * - **Flexible Timing**: Configurable duration and start time
 *
 * Technical Implementation:
 * - Uses clipPath with inset() values to create the wipe effect
 * - Combines opacity animation for smooth reveal
 * - Generic effect with provider mode for direct component targeting
 *
 * Use Cases:
 * - Revealing text or images with a directional wipe
 * - Creating cinematic transitions between scenes
 * - Adding professional polish to content reveals
 * - Building custom transition effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the wipe reveal effect to'),
  direction: z
    .enum(['left', 'right', 'up', 'down'])
    .default('left')
    .describe('Direction of the wipe transition'),
  duration: z
    .number()
    .min(100)
    .max(5000)
    .default(1000)
    .describe('Duration of the wipe transition in milliseconds'),
  softness: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe(
      'Gradient edge softness (0 = hard edge, 1 = very soft gradient edge)',
    ),
  start: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to target component (seconds)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Convert duration from milliseconds to seconds
  const durationInSeconds = params.duration / 1000;

  // Calculate clipPath values based on direction
  const getClipPathValues = (
    direction: 'left' | 'right' | 'up' | 'down',
  ): { start: string; end: string } => {
    switch (direction) {
      case 'left':
        // Reveal from left edge (start hidden on left, reveal to full)
        return {
          start: 'inset(0 100% 0 0)', // Hidden (right edge at left)
          end: 'inset(0 0 0 0)', // Fully visible
        };
      case 'right':
        // Reveal from right edge (start hidden on right, reveal to full)
        return {
          start: 'inset(0 0 0 100%)', // Hidden (left edge at right)
          end: 'inset(0 0 0 0)', // Fully visible
        };
      case 'up':
        // Reveal from top edge (start hidden at top, reveal to full)
        return {
          start: 'inset(100% 0 0 0)', // Hidden (bottom edge at top)
          end: 'inset(0 0 0 0)', // Fully visible
        };
      case 'down':
        // Reveal from bottom edge (start hidden at bottom, reveal to full)
        return {
          start: 'inset(0 0 100% 0)', // Hidden (top edge at bottom)
          end: 'inset(0 0 0 0)', // Fully visible
        };
    }
  };

  const clipPathValues = getClipPathValues(params.direction);

  // Calculate opacity keyframes based on softness
  // Softness controls how gradual the opacity transition is
  // 0 = instant opacity change (hard edge)
  // 1 = very gradual opacity change (soft gradient edge)
  const opacityKeyframes = (() => {
    if (params.softness === 0) {
      // Hard edge: instant transition at midpoint
      return [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ];
    } else {
      // Soft edge: gradual transition
      // The softness parameter determines how early the fade starts
      const fadeStartProgress = Math.max(0, 0.5 - params.softness * 0.4);
      const fadeEndProgress = Math.min(1, 0.5 + params.softness * 0.4);

      return [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0, prog: fadeStartProgress },
        { key: 'opacity', val: 1, prog: fadeEndProgress },
        { key: 'opacity', val: 1, prog: 1 },
      ];
    }
  })();

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: params.start,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      // Opacity animation (controlled by softness)
      ...opacityKeyframes,
      // ClipPath animation (creates the wipe)
      { key: 'clipPath', val: clipPathValues.start, prog: 0 },
      { key: 'clipPath', val: clipPathValues.end, prog: 1 },
    ],
  };

  // Create effect node
  const effect = {
    id: params.effectId || `gradient-wipe-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure
  // The system will extract the effect via _extractedEffects
  const container: RenderableComponentData = {
    id: 'gradient-wipe-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'hidden',
        style: {
          pointerEvents: 'none',
          position: 'absolute',
          width: '0px',
          height: '0px',
        },
      },
    },
    effects: [effect],
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: 10,
      },
    },
  };

  return {
    output: {
      childrenData: [container] as RenderableComponentData[],
      _extractedEffects: [effect],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'gradient-wipe-reveal-effect',
  title: 'Gradient Wipe Reveal Effect',
  description:
    'Internal effect preset that applies a smooth gradient wipe transition to reveal content by animating clipPath and opacity. Supports left/right/up/down wipe directions with configurable duration and gradient softness. Uses generic AnimationRange effects with ease-in-out easing to create cinematic wipe transitions similar to video editing software.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'wipe', 'reveal', 'gradient', 'transition', 'internal'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    direction: 'left',
    duration: 1000,
    softness: 0.3,
    start: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const gradientWipeRevealEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
