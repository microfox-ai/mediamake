/**
 * Breathing Outline Effect Preset
 *
 * This preset applies a rhythmic breathing animation to target components using smooth
 * sine wave interpolation. The effect simulates organic breathing or pulsing motion
 * by expanding and contracting the outline width, adjusting opacity, and subtly changing
 * color saturation during the breath cycle.
 *
 * Features:
 * - **Sine Wave Interpolation**: Smooth, natural expansion/contraction cycles
 * - **Asymmetric Breathing**: Support for different inhale/exhale durations
 * - **Variable Breath Depths**: Control min/max outline width range
 * - **Dynamic Saturation**: Color saturation increases at peak expansion
 * - **Multiple Breath Cycles**: Repeat breathing pattern multiple times
 * - **Customizable Properties**: Control outline-width, outline-offset, opacity, and filter saturation
 *
 * Use cases:
 * - Creating attention-drawing focus effects
 * - Adding organic motion to UI elements
 * - Simulating "living" or "breathing" interfaces
 * - Highlighting important content with subtle animation
 * - Creating meditation or wellness app visuals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the breathing effect to'),
  breathDuration: z
    .number()
    .min(1)
    .max(30)
    .default(4)
    .describe('Total duration of one complete breath cycle in seconds'),
  breathCount: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(3)
    .describe('Number of breath cycles to generate (total effect duration = breathDuration * breathCount)'),
  minWidth: z
    .string()
    .default('2px')
    .describe('Minimum outline width at the contracted state (e.g., "2px", "0.5rem")'),
  maxWidth: z
    .string()
    .default('8px')
    .describe('Maximum outline width at peak expansion (e.g., "8px", "1rem")'),
  outlineColor: z
    .string()
    .default('rgba(59, 130, 246, 0.8)')
    .describe('CSS color value for the outline (e.g., "#3b82f6", "rgba(59, 130, 246, 0.8)")'),
  asymmetry: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Asymmetry factor for inhale/exhale timing (0.5 = symmetric, <0.5 = faster inhale, >0.5 = faster exhale)'),
  minOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Minimum opacity at contracted state'),
  maxOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Maximum opacity at peak expansion'),
  minSaturation: z
    .number()
    .min(0)
    .max(2)
    .default(0.8)
    .describe('Minimum color saturation multiplier at contracted state (1 = normal)'),
  maxSaturation: z
    .number()
    .min(0)
    .max(2)
    .default(1.2)
    .describe('Maximum color saturation multiplier at peak expansion (1 = normal)'),
  outlineStyle: z
    .enum(['solid', 'dashed', 'dotted', 'double'])
    .default('solid')
    .describe('CSS outline style'),
  effectStart: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the effect relative to parent component (seconds)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Generate sine wave keyframes for smooth breathing animation
  const generateSineWaveKeyframes = (
    min: number,
    max: number,
    cycles: number,
    asymmetry: number = 0.5,
  ): Array<{ val: number; prog: number }> => {
    const keyframes: Array<{ val: number; prog: number }> = [];
    const pointsPerCycle = 20; // Number of keyframes per cycle for smoothness
    const totalPoints = cycles * pointsPerCycle;

    for (let i = 0; i <= totalPoints; i++) {
      const progress = i / totalPoints;
      const cycleProgress = (i % pointsPerCycle) / pointsPerCycle;

      // Apply asymmetry: adjust the sine wave phase
      let phase: number;
      if (cycleProgress < asymmetry) {
        // Inhale phase (0 to asymmetry)
        phase = (cycleProgress / asymmetry) * Math.PI;
      } else {
        // Exhale phase (asymmetry to 1)
        phase = Math.PI + ((cycleProgress - asymmetry) / (1 - asymmetry)) * Math.PI;
      }

      // Sine wave: -1 to 1, then map to min-max range
      const sineValue = Math.sin(phase);
      const normalizedValue = (sineValue + 1) / 2; // Convert -1..1 to 0..1
      const value = min + normalizedValue * (max - min);

      keyframes.push({
        val: value,
        prog: progress,
      });
    }

    return keyframes;
  };

  // Helper function: Parse width string to number (assumes px units)
  const parseWidth = (width: string): number => {
    const match = width.match(/^([\d.]+)/);
    return match ? parseFloat(match[1]) : 2;
  };

  // Extract parameters
  const {
    targetIds,
    breathDuration,
    breathCount,
    minWidth,
    maxWidth,
    outlineColor,
    asymmetry,
    minOpacity,
    maxOpacity,
    minSaturation,
    maxSaturation,
    outlineStyle,
    effectStart,
  } = params;

  // Calculate total effect duration
  const totalDuration = breathDuration * breathCount;

  // Parse width values
  const minWidthNum = parseWidth(minWidth);
  const maxWidthNum = parseWidth(maxWidth);

  // Generate sine wave keyframes for outline width
  const outlineWidthKeyframes = generateSineWaveKeyframes(
    minWidthNum,
    maxWidthNum,
    breathCount,
    asymmetry,
  ).map((kf) => ({
    key: 'outlineWidth',
    val: `${kf.val}px`,
    prog: kf.prog,
  }));

  // Generate sine wave keyframes for opacity
  const opacityKeyframes = generateSineWaveKeyframes(
    minOpacity,
    maxOpacity,
    breathCount,
    asymmetry,
  ).map((kf) => ({
    key: 'opacity',
    val: kf.val,
    prog: kf.prog,
  }));

  // Generate sine wave keyframes for saturation (using filter)
  const saturationKeyframes = generateSineWaveKeyframes(
    minSaturation,
    maxSaturation,
    breathCount,
    asymmetry,
  ).map((kf) => ({
    key: 'filter',
    val: `saturate(${kf.val})`,
    prog: kf.prog,
  }));

  // Generate subtle outline-offset variation (optional enhancement)
  const outlineOffsetKeyframes = generateSineWaveKeyframes(
    0,
    2,
    breathCount,
    asymmetry,
  ).map((kf) => ({
    key: 'outlineOffset',
    val: `${kf.val}px`,
    prog: kf.prog,
  }));

  // Combine all keyframes into ranges
  const ranges = [
    ...outlineWidthKeyframes,
    ...opacityKeyframes,
    ...saturationKeyframes,
    ...outlineOffsetKeyframes,
  ];

  // Create the generic effect
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: totalDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: ranges,
  };

  const breathingEffect = {
    id: 'breathing-outline-effect',
    componentId: 'generic',
    data: effectData,
  };

  // Create container with effect
  const containerNode: RenderableComponentData = {
    id: 'breathing-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [breathingEffect],
    childrenData: [],
  };

  // Apply initial outline styles to targets via inline styles
  // Note: This is a limitation - we can't directly set outlineColor through effects
  // So we rely on the user to set outline color via component styling, or we use a wrapper approach
  // For this preset, we'll apply the outline color through the effect's base styles
  // by adding it to the containerProps style
  const containerWithStyles: RenderableComponentData = {
    ...containerNode,
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          outlineColor: outlineColor,
          outlineStyle: outlineStyle,
        },
      },
    },
  };

  return {
    output: {
      childrenData: [containerWithStyles] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'breathing-outline-effect',
  title: 'Breathing Outline Effect',
  description:
    'A generic effect preset that applies rhythmic breathing animation to target components using sine wave interpolation for outline width, opacity, and color saturation. Supports asymmetric breathing patterns with different inhale/exhale durations and variable breath depths for organic, pulsing motion.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'generic', 'breathing', 'outline', 'pulse', 'organic', 'animation'],
  defaultInputParams: {
    targetIds: ['target-component-1'],
    breathDuration: 4,
    breathCount: 3,
    minWidth: '2px',
    maxWidth: '8px',
    outlineColor: 'rgba(59, 130, 246, 0.8)',
    asymmetry: 0.5,
    minOpacity: 0.6,
    maxOpacity: 1,
    minSaturation: 0.8,
    maxSaturation: 1.2,
    outlineStyle: 'solid',
    effectStart: 0,
  },
  dependencies: {},
};

// Export preset
export const breathingOutlineEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
