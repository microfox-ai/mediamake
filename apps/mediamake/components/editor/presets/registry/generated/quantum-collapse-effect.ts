/**
 * QuantumCollapse Instant Visibility Effect Preset
 *
 * Simulates quantum superposition collapse where elements exist in multiple states simultaneously
 * before instantly collapsing to visible or hidden. Features a pre-collapse "probability cloud" phase
 * where the element rapidly oscillates between multiple opacity and blur states, then instantly snaps
 * to the final visibility state.
 *
 * Features:
 * - Quantum superposition simulation with oscillating opacity/blur
 * - Configurable probability states (3-10 oscillation keyframes)
 * - Adjustable collapse delay and oscillation intensity
 * - Instant collapse to target state (visible/hidden)
 * - Generic effect with multi-property animation
 *
 * Use cases:
 * - Creating quantum-themed reveal/hide effects
 * - Simulating observation-based state determination
 * - Building sci-fi or physics-themed transitions
 * - Adding uncertainty/probability visual metaphors
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of the components to apply the quantum collapse effect to'),
  collapseDelay: z
    .number()
    .min(0.2)
    .max(2)
    .describe('Time in seconds before collapse occurs (duration of probability cloud phase)'),
  oscillationIntensity: z
    .number()
    .min(5)
    .max(20)
    .describe('Maximum blur amount in pixels during oscillation phase'),
  probabilityStates: z
    .number()
    .min(3)
    .max(10)
    .describe('Number of superposition states (keyframes) in the oscillation phase'),
  targetState: z
    .boolean()
    .describe('Final visibility state after collapse (true = visible, false = hidden)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    collapseDelay,
    oscillationIntensity,
    probabilityStates,
    targetState,
  } = params;

  // Helper function to generate oscillation keyframes using sin wave approximation
  const generateOscillationRanges = (): {
    opacityRanges: Array<{ key: string; val: number; prog: number }>;
    blurRanges: Array<{ key: string; val: string; prog: number }>;
  } => {
    const opacityRanges: Array<{ key: string; val: number; prog: number }> = [];
    const blurRanges: Array<{ key: string; val: string; prog: number }> = [];

    // Oscillation phase spans progress 0-0.8
    const oscillationEndProg = 0.8;

    // Generate probabilityStates keyframes distributed across the oscillation phase
    for (let i = 0; i < probabilityStates; i++) {
      const prog = (i / (probabilityStates - 1)) * oscillationEndProg;
      
      // Use sin wave to create oscillating pattern
      // Phase offset creates different patterns for opacity and blur
      const phase = (i / probabilityStates) * Math.PI * 2;
      
      // Opacity oscillates between 0.3 and 0.7
      const opacityValue = 0.5 + 0.2 * Math.sin(phase);
      
      // Blur oscillates between 0 and oscillationIntensity
      const blurValue = (oscillationIntensity / 2) * (1 + Math.sin(phase + Math.PI / 2));

      opacityRanges.push({
        key: 'opacity',
        val: opacityValue,
        prog,
      });

      blurRanges.push({
        key: 'blur',
        val: `${blurValue.toFixed(2)}px`,
        prog,
      });
    }

    return { opacityRanges, blurRanges };
  };

  // Generate oscillation keyframes
  const { opacityRanges, blurRanges } = generateOscillationRanges();

  // Collapse phase - instant snap at prog 0.81
  const collapseProg = 0.81;
  const collapseOpacity = targetState ? 1 : 0;
  const collapseBlur = '0px';

  // Combine oscillation and collapse ranges
  const opacityCollapseRanges = [
    ...opacityRanges,
    { key: 'opacity', val: collapseOpacity, prog: collapseProg },
    { key: 'opacity', val: collapseOpacity, prog: 1 },
  ];

  const blurCollapseRanges = [
    ...blurRanges,
    { key: 'blur', val: collapseBlur, prog: collapseProg },
    { key: 'blur', val: collapseBlur, prog: 1 },
  ];

  // Construct the quantum collapse effect
  const quantumEffect: GenericEffectData = {
    type: 'linear', // Linear for instant collapse feel
    start: 0,
    duration: collapseDelay,
    mode: 'provider',
    targetIds,
    ranges: [...opacityCollapseRanges, ...blurCollapseRanges],
  };

  // Create effect node
  const effect = {
    id: `quantum-collapse-${targetIds.join('-')}`,
    componentId: 'generic',
    data: quantumEffect,
  };

  // Return effects-only output
  const rootContainer: RenderableComponentData = {
    id: 'quantum-collapse-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: collapseDelay,
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

const presetMetadata: PresetMetadata = {
  id: 'quantum-collapse-effect',
  title: 'QuantumCollapse Instant Visibility Effect',
  description:
    'Simulates quantum superposition collapse where elements exist in multiple opacity/blur states simultaneously (probability cloud) before instantly snapping to final visibility. Features oscillating pre-collapse phase with configurable intensity and state count, followed by instant deterministic collapse.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'quantum', 'visibility', 'collapse', 'instant', 'physics'],
  defaultInputParams: {
    targetIds: ['component-1'],
    collapseDelay: 1.0,
    oscillationIntensity: 10,
    probabilityStates: 5,
    targetState: true,
  },
  dependencies: {},
};

export const quantumCollapseEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
