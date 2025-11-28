/**
 * QuantumFade Internal Effect Preset
 *
 * Creates a probabilistic, particle-like dissolution effect that simulates quantum uncertainty.
 * Instead of uniform fading, opacity fluctuates randomly within probability bounds before settling
 * into final states using high-frequency micro-variations (quantum jitter) that gradually stabilize.
 *
 * ARRAY OF EFFECTS:
 * This preset generates multiple effects:
 * 1. Primary quantum opacity effect with 50+ keyframes for probabilistic fade
 * 2. Optional chromatic aberration effect during peak uncertainty (if enabled)
 *
 * Features:
 * - Quantum jitter: High-frequency opacity oscillations (50+ keyframes)
 * - Uncertainty level: Controls jitter intensity (randomness amplitude)
 * - Wave collapse speed: How quickly the effect stabilizes
 * - Entanglement: Correlated randomness across multiple elements using shared seed
 * - Quantum tunneling: Brief moments of full opacity/transparency
 * - Chromatic aberration: RGB channel splits during peak uncertainty for reality-breaking visuals
 *
 * Use cases:
 * - Creating quantum-inspired particle dissolution effects
 * - Adding probabilistic fade animations with decreasing randomness
 * - Building reality-breaking visual effects with chromatic aberration
 * - Simulating quantum uncertainty in visual transitions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfex/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the quantum fade effect to'),
  duration: z
    .number()
    .min(0.1)
    .default(2)
    .optional()
    .describe('Duration of the quantum fade effect in seconds'),
  uncertaintyLevel: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Jitter intensity - controls the amplitude of quantum uncertainty (0 = no jitter, 1 = maximum jitter)'),
  collapseSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .optional()
    .describe('How quickly the uncertainty collapses/stabilizes (higher = faster collapse)'),
  entangled: z
    .boolean()
    .default(false)
    .optional()
    .describe('Whether multiple elements fade with correlated randomness (shared seed)'),
  tunneling: z
    .boolean()
    .default(false)
    .optional()
    .describe('Enable quantum tunneling - brief moments of full opacity/transparency'),
  tunnelingProbability: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .optional()
    .describe('Probability of quantum tunneling events occurring (0 = never, 1 = always)'),
  chromaticAberration: z
    .boolean()
    .default(false)
    .optional()
    .describe('Enable chromatic aberration effect during peak uncertainty for reality-breaking visuals'),
  seed: z
    .number()
    .default(0)
    .optional()
    .describe('Random seed for entanglement - same seed produces correlated randomness across elements'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const duration = params.duration ?? 2;
  const uncertaintyLevel = params.uncertaintyLevel ?? 0.5;
  const collapseSpeed = params.collapseSpeed ?? 1;
  const entangled = params.entangled ?? false;
  const tunneling = params.tunneling ?? false;
  const tunnelingProbability = params.tunnelingProbability ?? 0.1;
  const chromaticAberration = params.chromaticAberration ?? false;
  const seed = params.seed ?? 0;
  const targetIds = params.targetIds;

  // Seeded random number generator for entanglement
  const seededRandom = (seedValue: number, index: number): number => {
    const x = Math.sin(seedValue + index) * 10000;
    return x - Math.floor(x);
  };

  // Generate quantum keyframes with high-frequency oscillations (50+ keyframes)
  const generateQuantumKeyframes = (): Array<{ key: string; val: number; prog: number }> => {
    const keyframes: Array<{ key: string; val: number; prog: number }> = [];
    const numKeyframes = 60; // High-frequency keyframes for quantum jitter

    for (let i = 0; i <= numKeyframes; i++) {
      const prog = i / numKeyframes;
      
      // Base fade curve: start at 0, fade to 1
      const baseOpacity = prog;

      // Uncertainty decreases over time (wave collapse)
      const collapseProgress = Math.pow(prog, collapseSpeed);
      const currentUncertainty = uncertaintyLevel * (1 - collapseProgress);

      // Generate random fluctuation
      const randomValue = entangled
        ? seededRandom(seed, i) - 0.5
        : Math.random() - 0.5;

      // Quantum jitter: opacity = baseOpacity + random * uncertainty
      let opacity = baseOpacity + randomValue * currentUncertainty;

      // Quantum tunneling: brief moments of full opacity/transparency
      if (tunneling && Math.random() < tunnelingProbability) {
        opacity = Math.random() < 0.5 ? 0 : 1;
      }

      // Clamp opacity to valid range
      opacity = Math.max(0, Math.min(1, opacity));

      keyframes.push({
        key: 'opacity',
        val: opacity,
        prog,
      });
    }

    return keyframes;
  };

  // Generate chromatic aberration keyframes (active during peak uncertainty)
  const generateChromaticAberrationKeyframes = (): Array<{ key: string; val: string; prog: number }> => {
    const keyframes: Array<{ key: string; val: string; prog: number }> = [];
    const aberrationDuration = 0.7; // First 70% of duration (peak uncertainty)
    const numKeyframes = 40;

    for (let i = 0; i <= numKeyframes; i++) {
      const prog = i / numKeyframes;
      const relativeProg = prog / aberrationDuration;

      if (relativeProg > 1) break;

      // Calculate aberration intensity (peaks in the middle, fades at edges)
      const intensityCurve = Math.sin(relativeProg * Math.PI);
      const aberrationAmount = intensityCurve * uncertaintyLevel * 3; // Max 3px shift

      // RGB channel offsets
      const redOffset = aberrationAmount * (entangled ? seededRandom(seed, i * 3) : Math.random());
      const greenOffset = aberrationAmount * (entangled ? seededRandom(seed, i * 3 + 1) : Math.random());
      const blueOffset = aberrationAmount * (entangled ? seededRandom(seed, i * 3 + 2) : Math.random());

      // CSS filter for chromatic aberration using drop-shadow
      const filterValue = `
        drop-shadow(${redOffset}px 0 0 rgba(255, 0, 0, 0.5))
        drop-shadow(${greenOffset}px 0 0 rgba(0, 255, 0, 0.5))
        drop-shadow(${blueOffset}px 0 0 rgba(0, 0, 255, 0.5))
      `.replace(/\s+/g, ' ').trim();

      keyframes.push({
        key: 'filter',
        val: filterValue,
        prog,
      });
    }

    // Add final keyframe to remove aberration
    keyframes.push({
      key: 'filter',
      val: 'none',
      prog: 1,
    });

    return keyframes;
  };

  // Create primary quantum opacity effect
  const quantumKeyframes = generateQuantumKeyframes();
  const quantumEffectData: GenericEffectData = {
    type: 'linear', // Linear interpolation for smooth quantum jitter
    start: 0,
    duration,
    mode: 'provider',
    targetIds,
    ranges: quantumKeyframes,
  };

  const quantumEffect = {
    id: `quantum-fade-${targetIds.join('-')}`,
    componentId: 'generic',
    data: quantumEffectData,
  };

  // Create chromatic aberration effect if enabled
  const effects: Array<{ id: string; componentId: string; data: GenericEffectData }> = [quantumEffect];

  if (chromaticAberration) {
    const aberrationKeyframes = generateChromaticAberrationKeyframes();
    const aberrationEffectData: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: duration * 0.7, // Only during first 70% (peak uncertainty)
      mode: 'provider',
      targetIds,
      ranges: aberrationKeyframes,
    };

    const aberrationEffect = {
      id: `chromatic-aberration-${targetIds.join('-')}`,
      componentId: 'generic',
      data: aberrationEffectData,
    };

    effects.push(aberrationEffect);
  }

  // Create container structure
  const rootContainer: RenderableComponentData = {
    id: 'quantum-fade-effect-container',
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
        duration,
      },
    },
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects, // For internal preset extraction
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'quantum-fade-effect',
  title: 'QuantumFade Effect',
  description:
    'Internal effect preset that creates probabilistic particle-like dissolution with quantum uncertainty simulation. Generates high-frequency opacity oscillations (50+ keyframes) with decreasing randomness over time. Features include: uncertainty level (jitter intensity), wave collapse speed (stabilization rate), entanglement (correlated randomness across multiple targets using shared seed), quantum tunneling (brief full opacity/transparency spikes), and optional chromatic aberration during peak uncertainty. Returns effect data to be applied to target components via mode: provider and targetIds.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'quantum', 'fade', 'jitter', 'probabilistic', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    duration: 2,
    uncertaintyLevel: 0.5,
    collapseSpeed: 1,
    entangled: false,
    tunneling: false,
    tunnelingProbability: 0.1,
    chromaticAberration: false,
    seed: 0,
  },
};

export const quantumFadeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
