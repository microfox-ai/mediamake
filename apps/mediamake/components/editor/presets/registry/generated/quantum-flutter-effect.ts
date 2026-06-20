/**
 * Quantum Flutter Internal Effect Preset
 *
 * ARRAY OF EFFECTS
 *
 * Creates microscopic, rapid position variations simulating quantum uncertainty or digital glitch hovering.
 * Combines high-frequency position jitter with occasional larger drift movements and optional opacity flickers.
 * Perfect for cyberpunk aesthetics, glitch effects, or creating tension through subtle visual instability.
 *
 * Features:
 * - High-frequency jitter: Rapid translateX/Y movements within ±intensity pixels (100-200ms cycles)
 * - Drift events: Larger movements (±intensity * 5) triggered by probability parameter
 * - Optional opacity flicker: Subtle opacity variations (1 → 0.95 → 1)
 * - Continuous looping: Jitter effect repeats throughout duration
 * - Configurable intensity: Control jitter amplitude (1-5px)
 * - Probabilistic drift: Control drift event frequency (0-0.3)
 *
 * Returns an array of effects:
 * - [0]: Continuous jitter effect
 * - [1]: Drift effect (if probability triggers)
 * - [2]: Flicker effect (if includeFlicker is true)
 *
 * Use cases:
 * - Cyberpunk UI elements with unstable positioning
 * - Digital glitch effects for logos or titles
 * - Hovering hologram simulations
 * - Creating visual tension in sci-fi interfaces
 * - Simulating quantum uncertainty in data visualization
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply quantum flutter effect to'),
  effectStart: z
    .number()
    .describe('Start time of the effect relative to parent (seconds)'),
  effectDuration: z
    .number()
    .describe('Duration of the quantum flutter effect (seconds)'),
  jitterIntensity: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .optional()
    .describe('Intensity of jitter in pixels (1-5px, default: 3)'),
  driftProbability: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.15)
    .optional()
    .describe(
      'Probability of drift events occurring (0-0.3, default: 0.15)',
    ),
  includeFlicker: z
    .boolean()
    .default(true)
    .optional()
    .describe('Whether to include opacity flicker effect (default: true)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate random value within range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Extract parameters
  const jitterIntensity = params.jitterIntensity ?? 3;
  const driftProbability = params.driftProbability ?? 0.15;
  const includeFlicker = params.includeFlicker ?? true;
  const effectIdPrefix = params.effectId || `quantum-flutter-${params.targetId}`;

  // Calculate jitter cycle parameters
  const jitterCycleDuration = 0.15; // 150ms per cycle
  const numJitterCycles = Math.ceil(params.effectDuration / jitterCycleDuration);

  // Generate jitter keyframes - continuous rapid position changes
  const jitterRanges = [];
  for (let i = 0; i <= numJitterCycles; i++) {
    const prog = i / numJitterCycles;
    const offsetX = randomInRange(-jitterIntensity, jitterIntensity);
    const offsetY = randomInRange(-jitterIntensity, jitterIntensity);
    
    jitterRanges.push(
      { key: 'translateX', val: offsetX, prog },
      { key: 'translateY', val: offsetY, prog },
    );
  }

  // Create continuous jitter effect
  const jitterEffect: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: jitterRanges,
  };

  const effects: any[] = [
    {
      id: `${effectIdPrefix}-jitter`,
      componentId: 'generic',
      data: jitterEffect,
    },
  ];

  // Determine if drift should occur based on probability
  const shouldDrift = Math.random() < driftProbability;

  if (shouldDrift) {
    // Calculate drift parameters
    const driftAmplitude = jitterIntensity * 5;
    const driftStartTime = params.effectStart + randomInRange(0, params.effectDuration * 0.7);
    const driftDuration = 0.5;

    // Generate drift target
    const driftX = randomInRange(-driftAmplitude, driftAmplitude);
    const driftY = randomInRange(-driftAmplitude, driftAmplitude);

    // Create drift effect (smooth movement and return)
    const driftEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: driftStartTime,
      duration: driftDuration,
      mode: 'provider',
      targetIds: [params.targetId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: driftX, prog: 0.5 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: driftY, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    effects.push({
      id: `${effectIdPrefix}-drift`,
      componentId: 'generic',
      data: driftEffect,
    });
  }

  // Add flicker effect if enabled
  if (includeFlicker) {
    // Generate subtle opacity oscillations
    const flickerCycleDuration = 0.2; // 200ms per flicker cycle
    const numFlickerCycles = Math.ceil(params.effectDuration / flickerCycleDuration);
    
    const flickerRanges = [];
    for (let i = 0; i <= numFlickerCycles; i++) {
      const prog = i / numFlickerCycles;
      // Subtle flicker between 1 and 0.95
      const opacity = i % 2 === 0 ? 1 : 0.95;
      flickerRanges.push({ key: 'opacity', val: opacity, prog });
    }

    const flickerEffect: GenericEffectData = {
      type: 'linear',
      start: params.effectStart,
      duration: params.effectDuration,
      mode: 'provider',
      targetIds: [params.targetId],
      ranges: flickerRanges,
    };

    effects.push({
      id: `${effectIdPrefix}-flicker`,
      componentId: 'generic',
      data: flickerEffect,
    });
  }

  // Return container with all effects
  return {
    output: {
      childrenData: [
        {
          id: 'quantum-flutter-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: params.effectDuration,
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
  id: 'quantum-flutter-effect',
  title: 'Quantum Flutter Effect',
  description:
    'An internal effect preset that creates microscopic, rapid position variations simulating quantum uncertainty or digital glitch hovering. Combines high-frequency position jitter with occasional larger drift movements and optional opacity flickers. Creates a shimmering, unstable hover effect perfect for cyberpunk aesthetics, glitch effects, or visual tension.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'glitch', 'quantum', 'jitter', 'drift', 'cyberpunk', 'unstable', 'hover'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 5,
    jitterIntensity: 3,
    driftProbability: 0.15,
    includeFlicker: true,
  },
};

export const quantumFlutterEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
