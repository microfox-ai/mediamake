/**
 * BinaryFlicker Internal Effect Preset
 *
 * ARRAY OF EFFECTS
 * Creates a digital glitch-style instant visibility toggle using rapid opacity flickering.
 * This preset generates a stroboscopic reveal/hide effect with configurable 3-10 instant
 * flickers before settling on the final state (visible or hidden). Each flicker is frame-perfect
 * with no interpolation to maintain a strict binary on/off aesthetic.
 *
 * Features:
 * - Frame-perfect instant opacity transitions (no smooth interpolation)
 * - Configurable flicker count (3-10 flickers)
 * - Adjustable flicker speed (10-100ms between flickers)
 * - Final state control (visible or hidden)
 * - Optional brightness surge during flickers for enhanced digital artifact effect
 * - Digital artifact effects using CSS filters (contrast, brightness, saturation)
 *
 * Returns two effects:
 * - Opacity flicker effect (binary on/off transitions)
 * - Digital artifact filter effect (synchronized visual glitches)
 *
 * Use cases:
 * - Digital glitch reveals/transitions
 * - Cyberpunk aesthetic effects
 * - Tech/sci-fi title reveals
 * - Error/warning state animations
 * - Binary system boot sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the flicker effect to'),
  flickerCount: z
    .number()
    .min(3)
    .max(10)
    .describe('Number of instant flickers (3-10)'),
  flickerSpeed: z
    .number()
    .min(10)
    .max(100)
    .describe('Milliseconds between each flicker (10-100ms)'),
  finalState: z
    .enum(['visible', 'hidden'])
    .describe('Final visibility state after flickering completes'),
  brightnessSurge: z
    .boolean()
    .optional()
    .describe(
      'Enable extra brightness boost during ON states for enhanced digital artifact effect',
    ),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect (relative to parent)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom ID prefix for the generated effects'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Calculate total effect duration in seconds
  const totalDuration = (params.flickerCount * params.flickerSpeed) / 1000;
  const effectStart = params.effectStart ?? 0;

  // Helper function to generate opacity flicker ranges
  const generateOpacityRanges = (): Array<{
    key: string;
    val: number;
    prog: number;
  }> => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    const stepSize = 1 / params.flickerCount;

    // Start with opacity 0 (OFF state)
    ranges.push({ key: 'opacity', val: 0, prog: 0 });

    // Generate alternating ON/OFF flickers
    for (let i = 0; i < params.flickerCount; i++) {
      const flickerStart = i * stepSize;
      const flickerMid = flickerStart + stepSize * 0.02; // 2% spacing for instant transition

      // ON state (visible)
      ranges.push({ key: 'opacity', val: 1, prog: flickerStart + stepSize * 0.5 });

      // OFF state (hidden) - instant transition
      if (i < params.flickerCount - 1) {
        ranges.push({ key: 'opacity', val: 0, prog: flickerMid + stepSize * 0.5 });
      }
    }

    // Final state
    const finalOpacity = params.finalState === 'visible' ? 1 : 0;
    ranges.push({ key: 'opacity', val: finalOpacity, prog: 1 });

    return ranges;
  };

  // Helper function to generate digital artifact filter ranges
  const generateFilterRanges = (): Array<{
    key: string;
    val: string;
    prog: number;
  }> => {
    const ranges: Array<{ key: string; val: string; prog: number }> = [];
    const stepSize = 1 / params.flickerCount;
    const brightnessSurge = params.brightnessSurge ?? false;

    // Start with high-intensity artifacts
    ranges.push({
      key: 'filter',
      val: 'contrast(200%) brightness(150%) saturate(120%)',
      prog: 0,
    });

    // Generate synchronized filter effects with opacity flickers
    for (let i = 0; i < params.flickerCount; i++) {
      const flickerProg = i * stepSize + stepSize * 0.5;

      // Artifact surge during ON states
      if (brightnessSurge) {
        ranges.push({
          key: 'filter',
          val: 'contrast(250%) brightness(200%) saturate(150%)',
          prog: flickerProg,
        });
      } else {
        ranges.push({
          key: 'filter',
          val: 'contrast(200%) brightness(150%) saturate(120%)',
          prog: flickerProg,
        });
      }

      // Reduce artifacts during OFF states
      if (i < params.flickerCount - 1) {
        ranges.push({
          key: 'filter',
          val: 'contrast(120%) brightness(110%) saturate(100%)',
          prog: flickerProg + stepSize * 0.02,
        });
      }
    }

    // Final state - no artifacts
    ranges.push({
      key: 'filter',
      val: 'none',
      prog: 1,
    });

    return ranges;
  };

  // Create the opacity flicker effect
  const opacityFlickerData: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: totalDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: generateOpacityRanges(),
  };

  const opacityFlickerEffect = {
    id: params.effectId
      ? `${params.effectId}-opacity-flicker`
      : `binary-flicker-opacity-${params.targetIds[0]}`,
    componentId: 'generic',
    data: opacityFlickerData,
  };

  // Create the digital artifact filter effect
  const filterArtifactData: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: totalDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: generateFilterRanges(),
  };

  const filterArtifactEffect = {
    id: params.effectId
      ? `${params.effectId}-digital-artifact`
      : `binary-flicker-artifact-${params.targetIds[0]}`,
    componentId: 'generic',
    data: filterArtifactData,
  };

  // Return both effects in a container structure
  return {
    output: {
      childrenData: [
        {
          id: params.effectId
            ? `${params.effectId}-container`
            : 'binary-flicker-effect-container',
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
              duration: totalDuration,
            },
          },
          effects: [opacityFlickerEffect, filterArtifactEffect],
          childrenData: [],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'binary-flicker-effect',
  title: 'BinaryFlicker',
  description:
    'Internal effect preset that creates a digital glitch-style instant visibility toggle using rapid opacity flickering. Creates a stroboscopic reveal/hide with configurable 3-10 instant flickers before settling on the final state (visible or hidden). Each flicker is frame-perfect with no interpolation to maintain binary on/off aesthetic. Includes digital artifact effects using CSS filters (contrast, brightness, saturation) during the flicker sequence, with optional brightness surge parameter. Targets any media atom type through provider mode.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'glitch', 'digital', 'flicker', 'binary', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['component-1'],
    flickerCount: 5,
    flickerSpeed: 50,
    finalState: 'visible',
    brightnessSurge: true,
    effectStart: 0,
  },
};

export const binaryFlickerEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
