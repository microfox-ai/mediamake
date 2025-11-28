/**
 * AudioFocusWave Internal Effect
 *
 * This internal effect preset creates traveling waves of focus across multiple elements
 * based on audio frequency analysis. It maps different frequency ranges to different
 * focus behaviors: high frequencies control opacity waves (sparkle effects) and low
 * frequencies control blur waves (depth pulsations).
 *
 * ARRAY OF EFFECTS:
 * Returns an array of waveform effects with calculated delay offsets per targetId.
 * Each target element receives both high-frequency opacity effects and low-frequency
 * blur effects, synchronized with customizable wave propagation patterns.
 *
 * Features:
 * - Full-spectrum frequency analysis (2000-8000Hz for highs, bass range for lows)
 * - Radial or linear wave propagation patterns
 * - Customizable wave speed and decay
 * - Resonance parameter for standing wave patterns at specific frequencies
 * - Independent sensitivity controls for high and low frequency ranges
 * - Calculated per-element delays based on position and wave pattern
 *
 * Use cases:
 * - Creating audio-reactive focus effects that travel across UI elements
 * - Building sparkle/shimmer effects synchronized with high frequencies
 * - Adding depth pulsation effects driven by bass/low frequencies
 * - Implementing wave-based audio visualizations with spatial propagation
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { WaveformEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply wave effects to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for frequency analysis'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effects (relative to parent)'),
  effectDuration: z
    .number()
    .describe('Duration of the effects in seconds'),
  waveSpeed: z
    .number()
    .default(1)
    .describe('Speed multiplier for wave propagation (1 = normal speed)'),
  wavePattern: z
    .enum(['radial', 'linear'])
    .default('radial')
    .describe('Wave propagation pattern: radial from center or linear direction'),
  centerPoint: z
    .object({
      x: z.number().describe('X coordinate (0-1, relative to container width)'),
      y: z.number().describe('Y coordinate (0-1, relative to container height)'),
    })
    .optional()
    .describe(
      'Center point for radial waves or start point for linear waves (defaults to center: {x: 0.5, y: 0.5})'
    ),
  decay: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe(
      'Wave decay factor (0 = no decay, 1 = strong decay) - how much the effect diminishes with distance'
    ),
  resonanceFreq: z
    .number()
    .optional()
    .describe(
      'Optional resonance frequency in Hz - creates standing wave patterns at this frequency'
    ),
  sensitivity: z
    .object({
      high: z
        .number()
        .default(0.7)
        .describe('Sensitivity multiplier for high-frequency effects (opacity waves)'),
      low: z
        .number()
        .default(0.5)
        .describe('Sensitivity multiplier for low-frequency effects (blur waves)'),
    })
    .default({ high: 0.7, low: 0.5 })
    .describe('Sensitivity controls for high and low frequency ranges'),
  positions: z
    .array(
      z.object({
        x: z.number().describe('X position (0-1)'),
        y: z.number().describe('Y position (0-1)'),
      })
    )
    .optional()
    .describe(
      'Optional array of positions for each target element (must match targetIds length). If not provided, elements are assumed to be evenly distributed.'
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  const {
    targetIds,
    audioSrc,
    effectStart,
    effectDuration,
    waveSpeed,
    wavePattern,
    centerPoint = { x: 0.5, y: 0.5 },
    decay,
    resonanceFreq,
    sensitivity,
    positions,
  } = params;

  // Helper function to calculate distance from center point
  const calculateDistance = (
    pos: { x: number; y: number },
    center: { x: number; y: number },
    pattern: 'radial' | 'linear'
  ): number => {
    if (pattern === 'radial') {
      // Euclidean distance for radial pattern
      const dx = pos.x - center.x;
      const dy = pos.y - center.y;
      return Math.sqrt(dx * dx + dy * dy);
    } else {
      // Linear distance (horizontal or based on angle from center)
      // For simplicity, we'll use horizontal distance for linear pattern
      return Math.abs(pos.x - center.x);
    }
  };

  // Helper function to calculate delay based on distance and wave speed
  const calculateDelay = (
    distance: number,
    speed: number,
    decayFactor: number
  ): number => {
    // Base delay is proportional to distance
    // Speed > 1 makes waves travel faster (shorter delays)
    // Speed < 1 makes waves travel slower (longer delays)
    const baseDelay = distance / speed;

    // Apply decay to delay (optional, could also affect intensity)
    // For now, we'll keep delay simple and apply decay to effect intensity later
    return baseDelay;
  };

  // Generate default positions if not provided (evenly distributed horizontally)
  const elementPositions: Array<{ x: number; y: number }> =
    positions && positions.length === targetIds.length
      ? positions
      : targetIds.map((_, index) => ({
          x: (index + 1) / (targetIds.length + 1), // Evenly distribute horizontally
          y: 0.5, // Center vertically
        }));

  // Calculate delays for each target element
  const delays = elementPositions.map(pos => {
    const distance = calculateDistance(pos, centerPoint, wavePattern);
    return calculateDelay(distance, waveSpeed, decay);
  });

  // Create effects array
  const effects: Array<{
    id: string;
    componentId: string;
    data: WaveformEffectData;
  }> = [];

  targetIds.forEach((targetId, index) => {
    const elementDelay = delays[index];
    const distance = calculateDistance(
      elementPositions[index],
      centerPoint,
      wavePattern
    );

    // Calculate intensity falloff based on distance and decay
    const intensityFalloff = Math.max(0, 1 - distance * decay);

    // High-frequency opacity wave (sparkle effect)
    const highFreqEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'frequency',
      effectType: 'custom',
      useFrequencyData: true,
      numberOfSamples: 256,
      sensitivity: sensitivity.high * intensityFalloff,
      threshold: 0.1,
      smoothing: 0.3,
      mode: 'provider',
      targetIds: [targetId],
      start: effectStart + elementDelay,
      duration: effectDuration - elementDelay,
      // Custom opacity oscillation via props
      props: {
        frequencyRange: resonanceFreq
          ? [resonanceFreq - 500, resonanceFreq + 500]
          : [2000, 8000], // High frequency range
        opacity: {
          oscillate: true,
          min: 0.7 * intensityFalloff,
          max: 1.0,
          smooth: true,
        },
      },
    };

    effects.push({
      id: `audiofocus-high-${targetId}-${index}`,
      componentId: 'waveform',
      data: highFreqEffect,
    });

    // Low-frequency blur wave (depth pulsation effect)
    // Note: Blur is implemented via filter property oscillation
    const lowFreqEffect: WaveformEffectData = {
      audioSrc,
      audioProperty: 'bass',
      effectType: 'custom',
      useFrequencyData: false, // Bass doesn't need frequency data
      numberOfSamples: 128,
      sensitivity: sensitivity.low * intensityFalloff,
      threshold: 0.15,
      smoothing: 0.5,
      smoothNormalisation: 2, // More smoothing for bass
      mode: 'provider',
      targetIds: [targetId],
      start: effectStart + elementDelay * 0.8, // Slightly faster for bass (more immediate)
      duration: effectDuration - elementDelay * 0.8,
      // Custom blur oscillation via props
      props: {
        filter: {
          blur: {
            min: 0,
            max: 8 * intensityFalloff,
            smooth: true,
          },
        },
      },
    };

    effects.push({
      id: `audiofocus-low-${targetId}-${index}`,
      componentId: 'waveform',
      data: lowFreqEffect,
    });

    // If resonance frequency is specified, add a third effect for standing waves
    if (resonanceFreq) {
      const resonanceEffect: WaveformEffectData = {
        audioSrc,
        audioProperty: 'frequency',
        effectType: 'custom',
        useFrequencyData: true,
        numberOfSamples: 512, // Higher resolution for resonance detection
        sensitivity: 1.0 * intensityFalloff,
        threshold: 0.2,
        smoothing: 0.2, // Less smoothing for sharper resonance response
        mode: 'provider',
        targetIds: [targetId],
        start: effectStart + elementDelay,
        duration: effectDuration - elementDelay,
        props: {
          frequencyRange: [resonanceFreq - 100, resonanceFreq + 100], // Narrow band around resonance
          scale: {
            oscillate: true,
            min: 1.0,
            max: 1.15 * intensityFalloff,
            smooth: false, // Sharp response for standing wave effect
          },
        },
      };

      effects.push({
        id: `audiofocus-resonance-${targetId}-${index}`,
        componentId: 'waveform',
        data: resonanceEffect,
      });
    }
  });

  // Return effects in a container structure
  return {
    output: {
      childrenData: [
        {
          id: 'audiofocuswave-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                pointerEvents: 'none',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
            },
          },
          effects,
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
  id: 'AudioFocusWave',
  title: 'AudioFocusWave Internal Effect',
  description:
    'Creates traveling waves of focus across multiple elements based on audio frequency analysis. High frequencies drive opacity sparkle effects, low frequencies drive blur depth pulsations. Supports radial and linear wave propagation with customizable speed, decay, and resonance.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio', 'waveform', 'focus', 'frequency', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['element-1', 'element-2', 'element-3'],
    audioSrc: 'audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    waveSpeed: 1,
    wavePattern: 'radial',
    centerPoint: { x: 0.5, y: 0.5 },
    decay: 0.3,
    sensitivity: { high: 0.7, low: 0.5 },
  },
};

export const AudioFocusWavePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
