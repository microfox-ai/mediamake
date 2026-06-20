/**
 * SoftFadeTransition - Internal Effect Preset Module
 *
 * SINGLE EFFECT
 *
 * This internal effect preset provides smooth opacity fade-in and fade-out effects
 * with customizable duration and easing. It creates a three-stage progression:
 * 1. Initial opacity (minOpacity) at start
 * 2. Peak opacity (maxOpacity) at fadeInRatio
 * 3. Hold at peak opacity through fadeInRatio + holdRatio
 * 4. Final opacity (minOpacity) at end
 *
 * The effect uses generic AnimationRange keyframes with normalized progression values
 * (0 to 1) based on the duration ratios to create smooth transitions.
 *
 * Features:
 * - Configurable total duration (default 2000ms)
 * - Separate control of fade-in, hold, and fade-out durations via ratios
 * - Customizable easing type (linear, ease-in, ease-out, ease-in-out)
 * - Optional min/max opacity values for partial fades
 * - Provider mode targeting via targetIds array
 *
 * Use cases:
 * - Creating smooth entrance/exit effects for text or media
 * - Building breathing animations with hold periods
 * - Adding gentle fade transitions to components
 * - Implementing custom opacity animations with multiple stages
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to apply the fade effect to'),
  duration: z.number().optional().describe('Total duration of the effect in milliseconds (default: 2000ms)'),
  fadeInRatio: z.number().min(0).max(1).optional().describe('Ratio of total duration for fade-in phase (default: 0.3)'),
  holdRatio: z.number().min(0).max(1).optional().describe('Ratio of total duration for hold phase at peak opacity (default: 0.4)'),
  fadeOutRatio: z.number().min(0).max(1).optional().describe('Ratio of total duration for fade-out phase (default: 0.3)'),
  minOpacity: z.number().min(0).max(1).optional().describe('Minimum opacity value for start and end (default: 0)'),
  maxOpacity: z.number().min(0).max(1).optional().describe('Maximum opacity value at peak (default: 1)'),
  easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out']).optional().describe('Easing function for the animation (default: ease-in-out)'),
  effectId: z.string().optional().describe('Optional custom effect ID (auto-generated if not provided)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const duration = params.duration ?? 2000;
  const fadeInRatio = params.fadeInRatio ?? 0.3;
  const holdRatio = params.holdRatio ?? 0.4;
  const fadeOutRatio = params.fadeOutRatio ?? 0.3;
  const minOpacity = params.minOpacity ?? 0;
  const maxOpacity = params.maxOpacity ?? 1;
  const easing = params.easing ?? 'ease-in-out';
  const targetIds = params.targetIds;

  // Validate ratios sum (allow some tolerance for floating point)
  const ratioSum = fadeInRatio + holdRatio + fadeOutRatio;
  if (Math.abs(ratioSum - 1.0) > 0.01) {
    console.warn(
      `SoftFadeTransition: Duration ratios sum to ${ratioSum.toFixed(2)}, expected 1.0. Normalizing ratios.`
    );
  }

  // Normalize ratios if needed
  const normalizedFadeInRatio = fadeInRatio / ratioSum;
  const normalizedHoldRatio = holdRatio / ratioSum;
  const normalizedFadeOutRatio = fadeOutRatio / ratioSum;

  // Calculate progression points
  const fadeInEnd = normalizedFadeInRatio;
  const holdEnd = normalizedFadeInRatio + normalizedHoldRatio;

  // Construct animation ranges
  const animationRanges = [
    { key: 'opacity', val: minOpacity, prog: 0 },
    { key: 'opacity', val: maxOpacity, prog: fadeInEnd },
    { key: 'opacity', val: maxOpacity, prog: holdEnd },
    { key: 'opacity', val: minOpacity, prog: 1 },
  ];

  // Convert duration from milliseconds to seconds
  const durationInSeconds = duration / 1000;

  // Construct effect data
  const effectData: GenericEffectData = {
    type: easing,
    start: 0,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: animationRanges,
  };

  // Generate effect ID
  const effectId = params.effectId || `soft-fade-transition-${targetIds.join('-')}`;

  // Create effect node
  const effect = {
    id: effectId,
    componentId: 'generic',
    data: effectData,
  };

  // Return output with effect attached to a container
  const rootContainer: RenderableComponentData = {
    id: 'soft-fade-transition-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: durationInSeconds,
      },
    },
    effects: [effect],
    childrenData: [],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'soft-fade-transition',
  title: 'SoftFadeTransition',
  description: 'Internal effect preset module providing smooth opacity fade-in and fade-out effects with customizable duration, easing, and three-stage progression (fade-in, hold, fade-out). Supports parameterization for total duration, duration ratios for each phase, easing type, min/max opacity values, and targetIds array for provider mode targeting.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'opacity', 'fade', 'transition', 'generic', 'internal'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['example-component'],
    duration: 2000,
    fadeInRatio: 0.3,
    holdRatio: 0.4,
    fadeOutRatio: 0.3,
    minOpacity: 0,
    maxOpacity: 1,
    easing: 'ease-in-out',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const softFadeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
