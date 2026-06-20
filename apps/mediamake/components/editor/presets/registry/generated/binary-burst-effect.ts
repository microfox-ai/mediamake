/**
 * BinaryBurst Instant Visibility Effect
 *
 * Treats visibility as binary data streams - elements appear/disappear through
 * rapid binary state changes that form patterns. Creates data packet-style
 * reveals where visibility is transmitted as binary chunks (101101 patterns).
 *
 * Features:
 * - Binary pattern parsing into instant visibility states
 * - Configurable data packet size and transmission speed
 * - Error simulation with random bit flips
 * - TCP (reliable with acknowledgment pauses) vs UDP (continuous unreliable) protocols
 * - Feels like watching network data transmission where visibility states are data packets
 *
 * Technical Implementation:
 * - Effect type: generic with programmatic pattern generation
 * - Parse binary string into visibility states with instant transitions
 * - Convert dataPattern string to opacity keyframes
 * - Example: '101101' becomes 6 instant transitions
 * - Calculate prog values: each bit gets 1/pattern.length of timeline
 * - Add instant transitions between bits: additional keyframe at prog + 0.001 to maintain state
 * - For error simulation, randomly flip bits based on errorRate
 * - TCP protocol adds acknowledgment pause, UDP is continuous
 *
 * Use Cases:
 * - Glitch-style visibility effects
 * - Tech/cyber aesthetic animations
 * - Data transmission visualizations
 * - Binary code reveal effects
 * - Network protocol simulations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the binary burst effect to'),
  dataPattern: z
    .string()
    .regex(/^[01]+$/)
    .describe(
      'Binary string pattern (e.g., "101101") - 1 = visible, 0 = invisible',
    ),
  packetSize: z
    .number()
    .min(4)
    .max(32)
    .default(8)
    .describe('Number of bits per data packet chunk (affects effect duration)'),
  transmissionSpeed: z
    .number()
    .min(10)
    .max(200)
    .default(100)
    .describe(
      'Transmission speed in milliseconds per packet (lower = faster)',
    ),
  errorRate: z
    .number()
    .min(0)
    .max(0.3)
    .default(0)
    .describe('Random bit flip probability (0 = no errors, 0.3 = 30% errors)'),
  protocol: z
    .enum(['TCP', 'UDP'])
    .default('UDP')
    .describe(
      'Transmission protocol: TCP (reliable with pauses) or UDP (continuous unreliable)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    dataPattern,
    packetSize,
    transmissionSpeed,
    errorRate,
    protocol,
  } = params;

  /**
   * Generate binary visibility ranges from pattern string
   * Creates instant transitions between binary states
   */
  const generateBinaryRanges = (
    pattern: string,
    errorProbability: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    const patternArray = pattern.split('');
    const totalBits = patternArray.length;

    patternArray.forEach((bit, index) => {
      // Apply error simulation (random bit flip)
      let finalBit = parseInt(bit, 10);
      if (errorProbability > 0 && Math.random() < errorProbability) {
        finalBit = finalBit === 1 ? 0 : 1; // Flip bit
      }

      // Calculate progress position for this bit
      const prog = index / totalBits;

      // Add keyframe at exact position
      ranges.push({
        key: 'opacity',
        val: finalBit,
        prog: prog,
      });

      // Add instant transition maintenance keyframe (holds state)
      // This ensures the state stays until the next bit
      if (index < totalBits - 1) {
        ranges.push({
          key: 'opacity',
          val: finalBit,
          prog: prog + 0.001,
        });
      }
    });

    // Ensure final state holds until end
    const lastBit = ranges[ranges.length - 1];
    if (lastBit) {
      ranges.push({
        key: 'opacity',
        val: lastBit.val,
        prog: 1,
      });
    }

    return ranges;
  };

  // Calculate effect duration based on packet size and transmission speed
  // Duration = (packetSize * transmissionSpeed) / 1000 seconds
  const effectDuration = (packetSize * transmissionSpeed) / 1000;

  // Generate binary ranges with error simulation
  const binaryRanges = generateBinaryRanges(dataPattern, errorRate);

  // Calculate acknowledgment pause duration for TCP protocol
  // TCP adds a brief pause between packets (10% of transmission time)
  const acknowledgmentPause = protocol === 'TCP' ? effectDuration * 0.1 : 0;

  // Construct the binary burst effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Instant transitions, no easing
    start: 0,
    duration: effectDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: binaryRanges,
  };

  // Create the effect node
  const binaryBurstEffect = {
    id: `binary-burst-${targetIds[0] || 'effect'}`,
    componentId: 'generic',
    data: effectData,
  };

  // If TCP protocol, we need to add acknowledgment pauses
  // We do this by extending the duration and adding pause ranges
  const effects = [binaryBurstEffect];

  if (protocol === 'TCP' && acknowledgmentPause > 0) {
    // Add a secondary effect that creates the acknowledgment pause
    // This effect keeps opacity at final state for the pause duration
    const pauseEffect = {
      id: `tcp-ack-pause-${targetIds[0] || 'effect'}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: effectDuration,
        duration: acknowledgmentPause,
        mode: 'provider',
        targetIds: targetIds,
        ranges: [
          { key: 'opacity', val: binaryRanges[binaryRanges.length - 1]?.val || 1, prog: 0 },
          { key: 'opacity', val: binaryRanges[binaryRanges.length - 1]?.val || 1, prog: 1 },
        ],
      } as GenericEffectData,
    };
    effects.push(pauseEffect);
  }

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'binary-burst-root',
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
        duration: effectDuration + acknowledgmentPause,
      },
    },
    effects: effects,
    childrenData: [],
  };

  return {
    output: {
      _extractedEffects: effects,
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'binary-burst-effect',
  title: 'BinaryBurst Instant Visibility Effect',
  description:
    'An internal effects preset that treats visibility as binary data streams. Elements appear/disappear through rapid binary state changes forming data packet-style reveals. Supports TCP (reliable with acknowledgment pauses) and UDP (continuous unreliable) transmission protocols, with configurable data patterns, packet sizes, transmission speeds, and error rates for random bit flips.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'binary', 'visibility', 'glitch', 'data', 'internal', 'generic'],
  defaultInputParams: {
    targetIds: ['example-component'],
    dataPattern: '101101',
    packetSize: 8,
    transmissionSpeed: 100,
    errorRate: 0.05,
    protocol: 'UDP',
  },
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

// Export preset
export const binaryBurstEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
