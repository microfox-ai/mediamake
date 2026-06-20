/**
 * Internal Effect Preset: Glitch Displace
 *
 * SINGLE EFFECT PRESET (PROVIDER MODE)
 *
 * Simulates digital noise displacement through rapid, jerky transform translations.
 * Creates data corruption artifacts with stepped X/Y translations controlled by:
 * - intensity (0-100px max displacement)
 * - duration (ms)
 * - glitchFrequency (number of glitch 'hits')
 * - seed (for reproducible randomness)
 *
 * Returns effects array in provider mode targeting specific component IDs.
 * Uses non-smooth, stepped keyframes to simulate digital artifacts.
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  intensity: z
    .number()
    .min(0)
    .max(100)
    .describe('Maximum displacement in pixels (0-100)'),
  duration: z.number().describe('Duration of the effect in milliseconds'),
  glitchFrequency: z
    .number()
    .describe('Number of glitch hits/keyframes to generate'),
  seed: z
    .number()
    .optional()
    .describe('Seed for reproducible randomness (optional)'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to target with the effect'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { intensity, duration, glitchFrequency, seed, targetIds } = params;

  // Seeded random number generator (LCG algorithm)
  const seededRandom = (s: number) => {
    let currentSeed = s;
    return () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  };

  const random = seededRandom(seed ?? Date.now());

  // Generate non-linear progression values (stepped, not smooth)
  const generateSteppedProgValues = (count: number): number[] => {
    const progs: number[] = [0];
    let currentProg = 0;

    for (let i = 1; i < count - 1; i++) {
      // Create jumps in progression (non-uniform steps)
      const step = random() * 0.15 + 0.05; // Random step between 0.05-0.2
      currentProg = Math.min(currentProg + step, 1);
      progs.push(parseFloat(currentProg.toFixed(3)));
    }

    progs.push(1);
    return progs;
  };

  // Generate displacement values that oscillate randomly
  const generateDisplacementValue = (): number => {
    const sign = random() > 0.5 ? 1 : -1;
    const magnitude = random() * intensity;
    return parseFloat((sign * magnitude).toFixed(2));
  };

  // Create keyframe count (10-20 range based on glitchFrequency)
  const keyframeCount = Math.max(
    10,
    Math.min(20, Math.floor(glitchFrequency * 2)),
  );

  // Generate stepped progression values
  const progValues = generateSteppedProgValues(keyframeCount);

  // Generate translateX keyframes
  const translateXRanges = progValues.map((prog) => ({
    key: 'translateX',
    val: `${generateDisplacementValue()}px`,
    prog,
  }));

  // Generate translateY keyframes (opposite timing pattern)
  const translateYRanges = progValues.map((prog, index) => ({
    key: 'translateY',
    val: `${generateDisplacementValue()}px`,
    prog: progValues[progValues.length - 1 - index], // Reverse progression
  }));

  // Combine ranges
  const ranges = [...translateXRanges, ...translateYRanges];

  // Create effect data
  const effectData = {
    type: 'linear' as const, // Linear for stepped motion
    start: 0,
    duration: duration / 1000, // Convert ms to seconds
    mode: 'provider' as const,
    targetIds,
    ranges,
  };

  // Create effect node
  const effect = {
    id: `glitch-displace-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect wrapped in container structure
  const rootContainer: RenderableComponentData = {
    id: 'glitch-displace-container',
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
        duration: duration / 1000,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'glitchDisplace',
  title: 'Glitch Displace Effect',
  description:
    'Internal effect preset that simulates digital noise displacement through rapid, jerky transform translations. Creates data corruption artifacts with stepped X/Y translations controlled by intensity (0-100px max displacement), duration (ms), glitch frequency (number of glitch hits), and reproducible randomness via seed. Mode: provider targeting specific component IDs. Returns effects array for application to target components.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'glitch', 'displacement', 'transform', 'internal'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    intensity: 50,
    duration: 1000,
    glitchFrequency: 8,
    seed: 12345,
    targetIds: ['component-1'],
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const glitchDisplacePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
