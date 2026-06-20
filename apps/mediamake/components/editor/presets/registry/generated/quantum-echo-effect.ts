/**
 * QuantumEcho Internal Effect Preset
 *
 * Creates probabilistic motion echoes where elements appear to exist in multiple positions
 * simultaneously before collapsing to a single state - inspired by quantum superposition.
 *
 * ARRAY OF EFFECTS:
 * Returns multiple generic effects (3-8 echoes) plus one waveform effect for audio reactivity.
 * Each echo consists of opacity, scale, and position animations with staggered timings.
 *
 * Features:
 * - **Quantum States**: 3-8 probability clouds with varying opacity/scale/position
 * - **Staggered Timing**: Each echo starts slightly offset (0.05s intervals)
 * - **Position Variance**: Random translateX/Y offsets create spatial uncertainty
 * - **Collapse Animation**: Progressive opacity fade creates collapse effect
 * - **Audio Reactivity**: Waveform shake effect makes clouds pulse with audio
 *
 * Use cases:
 * - Creating quantum/sci-fi visual effects
 * - Implementing probabilistic motion design
 * - Adding glitchy, multi-state animations
 * - Building audio-reactive quantum visualizations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData, WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply quantum echo effects to'),
  echoCount: z
    .number()
    .min(3)
    .max(8)
    .default(5)
    .describe('Number of quantum echoes (probability clouds) to create'),
  quantumSpread: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Position variance in pixels - controls spatial uncertainty'),
  collapseSpeed: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .describe(
      'Speed of collapse animation (0.1=slow, 1=fast) - affects fade timing',
    ),
  audioReactivity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe(
      'Audio reactivity strength (0-1) - controls waveform shake intensity',
    ),
  audioSrc: z
    .string()
    .optional()
    .describe(
      'Audio source URL or ref:componentId for waveform effect (optional)',
    ),
  inputDuration: z
    .number()
    .default(5)
    .describe('Total duration of the effect in seconds'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    echoCount,
    quantumSpread,
    collapseSpeed,
    audioReactivity,
    audioSrc,
    inputDuration,
    effectIdPrefix,
  } = params;

  // Helper: Generate random offset within quantumSpread range
  const randomOffset = (spread: number): number => {
    return Math.random() * spread * 2 - spread; // Range: [-spread, +spread]
  };

  // Calculate fade timing based on collapse speed
  const fadeInProgress = 0.1; // Quick fade in
  const fadeOutStart = Math.max(0.7, 1 - collapseSpeed * 0.3); // Earlier fadeout = faster collapse

  // Generate quantum echo effects (generic effects)
  const quantumEffects: any[] = [];

  for (let i = 0; i < echoCount; i++) {
    const stagger = i * 0.05; // 0.05s stagger per echo
    const duration = inputDuration - stagger;
    const opacity = 0.3 + i * 0.04; // Progressive opacity increase
    const scale = 1 + i * 0.05; // Progressive scale increase
    const translateX = randomOffset(quantumSpread);
    const translateY = randomOffset(quantumSpread);

    // Each echo needs separate effects for opacity, scale, and translation
    const echoEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: stagger,
      duration: duration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        // Opacity: fade in → sustain → fade out (collapse)
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: opacity, prog: fadeInProgress },
        { key: 'opacity', val: opacity, prog: fadeOutStart },
        { key: 'opacity', val: 0, prog: 1 },
        // Scale: start larger, collapse to normal
        { key: 'scale', val: scale, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        // Position: random offset creates spatial uncertainty
        { key: 'translateX', val: translateX, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: translateY, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    quantumEffects.push({
      id: effectIdPrefix
        ? `${effectIdPrefix}-quantum-echo-${i}`
        : `quantum-echo-${i}`,
      componentId: 'generic',
      data: echoEffect,
    });
  }

  // Waveform audio-reactive effect (optional, only if audioSrc provided)
  const waveformEffect = audioSrc
    ? {
        id: effectIdPrefix
          ? `${effectIdPrefix}-quantum-waveform`
          : 'quantum-waveform',
        componentId: 'waveform',
        data: {
          audioSrc: audioSrc,
          audioProperty: 'bass',
          effectType: 'shake',
          intensity: quantumSpread * 0.5,
          shakeAxis: 'both',
          sensitivity: audioReactivity,
          threshold: 0.2,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / 30,
          mode: 'provider',
          targetIds: targetIds,
          start: 0,
          duration: inputDuration,
          smoothNormalisation: 1,
        } as WaveformEffectData,
      }
    : null;

  // Combine all effects
  const allEffects = waveformEffect
    ? [...quantumEffects, waveformEffect]
    : quantumEffects;

  // Return effects in a container structure
  // The system will extract effects from childrenData[0].effects when _internalPresetOutput: 'effects'
  return {
    output: {
      childrenData: [
        {
          id: 'quantum-echo-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: allEffects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: inputDuration,
            },
          },
        } as RenderableComponentData,
      ] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'quantum-echo-effect',
  title: 'QuantumEcho Internal Effect Preset',
  description:
    'Creates probabilistic motion echoes where elements appear in multiple quantum states simultaneously before collapsing. Generates layered generic effects (opacity, scale, translateX, translateY) with staggered timing for each echo, plus optional waveform audio reactivity that makes probability clouds pulse and shift.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'waveform', 'quantum', 'audio-reactive'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    echoCount: 5,
    quantumSpread: 20,
    collapseSpeed: 0.5,
    audioReactivity: 0.5,
    inputDuration: 5,
  },
};

// Export preset
export const quantumEchoEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
