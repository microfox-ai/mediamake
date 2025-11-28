/**
 * InkSplatterBurst Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal preset generates explosive ink splatter burst effects triggered by audio peaks.
 * Returns an array of effects (one per particle) that create sharp, staccato bursts synchronized
 * with audio treble frequencies.
 *
 * Features:
 * - Audio-reactive burst effects triggered by treble peaks (or bass/mid)
 * - Rapid scale spikes (1.0 to 1.4 in 50ms)
 * - Random rotation bursts (0 to 15deg)
 * - Opacity flashes for dramatic emphasis
 * - Splatter trail effect using translateX/Y with random offsets
 * - Multiple particle system with staggered timing
 * - Decay animations for trailing droplet effect
 *
 * Technical Implementation:
 * - Primary: Waveform zoom effect on audio peaks (sensitivity: 0.9, threshold: 0.5)
 * - Secondary: Generic rotate effect with random direction
 * - Tertiary: Generic translate with random X/Y offsets
 * - Particle system: Multiple effect instances with offset timings (0ms, 30ms, 60ms)
 *
 * Use cases:
 * - Dramatic emphasis on audio peaks
 * - Creating explosive visual accents
 * - Audio-synchronized burst animations
 * - Ink splatter visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData, GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the splatter effect to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z
    .number()
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),

  // Burst parameters
  burstIntensity: z
    .number()
    .min(1)
    .max(3)
    .default(1.5)
    .optional()
    .describe('Scale multiplier for burst intensity (1-3, default: 1.5)'),
  splatterCount: z
    .number()
    .int()
    .min(1)
    .max(5)
    .default(3)
    .optional()
    .describe('Number of splatter particles (1-5, default: 3)'),
  splatterSpread: z
    .number()
    .min(10)
    .max(100)
    .default(40)
    .optional()
    .describe('Maximum translation distance in pixels (10-100, default: 40)'),
  audioTrigger: z
    .enum(['bass', 'mid', 'treble'])
    .default('treble')
    .optional()
    .describe('Audio frequency to react to (default: treble)'),
  decaySpeed: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Speed of decay animation (0.1-1, default: 0.5)'),

  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper function: Random sign (-1 or 1)
  const randomSign = (): number => {
    return Math.random() < 0.5 ? -1 : 1;
  };

  // Extract parameters with defaults
  const burstIntensity = params.burstIntensity ?? 1.5;
  const splatterCount = params.splatterCount ?? 3;
  const splatterSpread = params.splatterSpread ?? 40;
  const audioTrigger = params.audioTrigger ?? 'treble';
  const decaySpeed = params.decaySpeed ?? 0.5;
  const effectIdPrefix = params.effectId || 'ink-splatter';

  // Calculate timing parameters
  const burstDuration = 0.05; // 50ms rapid spike
  const trailDuration = 1 / decaySpeed; // Decay duration based on speed

  // Generate effects for each particle
  const allEffects: any[] = [];

  for (let i = 0; i < splatterCount; i++) {
    const particleId = `${effectIdPrefix}-particle-${i}`;
    const timingOffset = i * 0.03; // 30ms stagger between particles

    // Random direction and distance for this particle
    const translateX = randomInRange(
      -splatterSpread,
      splatterSpread,
    ) * randomSign();
    const translateY = randomInRange(
      -splatterSpread,
      splatterSpread,
    ) * randomSign();
    const rotationAmount = randomInRange(0, 15) * randomSign();

    // 1. PRIMARY EFFECT: Waveform zoom burst (audio-reactive)
    const waveformZoomEffect: WaveformEffectData = {
      audioSrc: params.audioSrc,
      audioProperty: audioTrigger,
      effectType: 'zoom',
      intensity: burstIntensity * 0.4, // Scale amount (max 0.4 for 1.0->1.4)
      baseScale: 1,
      sensitivity: 0.9,
      threshold: 0.5,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: params.targetIds,
      start: params.effectStart + timingOffset,
      duration: params.effectDuration,
      smoothNormalisation: 0, // No smoothing for sharp, staccato bursts
    };

    allEffects.push({
      id: `${particleId}-waveform-zoom`,
      componentId: 'waveform',
      data: waveformZoomEffect,
    });

    // 2. SECONDARY EFFECT: Rotation burst (random direction)
    const rotateEffect: GenericEffectData = {
      type: 'ease-out',
      start: params.effectStart + timingOffset,
      duration: burstDuration,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: rotationAmount, prog: 1 },
      ],
    };

    allEffects.push({
      id: `${particleId}-rotate`,
      componentId: 'generic',
      data: rotateEffect,
    });

    // 3. TERTIARY EFFECT: Splatter trail (translate with decay)
    const splatterTrailEffect: GenericEffectData = {
      type: 'ease-out',
      start: params.effectStart + timingOffset,
      duration: trailDuration,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: [
        // Initial burst
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: translateX * 0.3, prog: 0.1 },
        { key: 'translateX', val: translateX, prog: 0.3 },
        { key: 'translateX', val: translateX * 0.7, prog: 1 }, // Decay back
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: translateY * 0.3, prog: 0.1 },
        { key: 'translateY', val: translateY, prog: 0.3 },
        { key: 'translateY', val: translateY * 0.7, prog: 1 }, // Decay back
      ],
    };

    allEffects.push({
      id: `${particleId}-trail`,
      componentId: 'generic',
      data: splatterTrailEffect,
    });

    // 4. OPACITY FLASH: Quick flash on burst
    const opacityFlashEffect: GenericEffectData = {
      type: 'linear',
      start: params.effectStart + timingOffset,
      duration: burstDuration * 2, // 100ms flash
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.7, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    allEffects.push({
      id: `${particleId}-opacity-flash`,
      componentId: 'generic',
      data: opacityFlashEffect,
    });
  }

  // Return effects in a container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'ink-splatter-burst-effect-container',
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
        duration: params.effectDuration,
      },
    },
    effects: allEffects,
    childrenData: [],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: allEffects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'ink-splatter-burst',
  title: 'InkSplatterBurst',
  description:
    'An internal audio-reactive effect preset that generates explosive ink splatter effects when triggered by audio peaks. Features rapid scale spikes (1.0 to 1.4 in 50ms), random rotation bursts (0-15deg), opacity flashes, and splatter trails with decaying translateX/Y offsets. Supports multiple particles with staggered timing for dramatic emphasis on treble frequencies.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'audio-reactive', 'waveform', 'burst', 'splatter', 'ink'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
    burstIntensity: 1.5,
    splatterCount: 3,
    splatterSpread: 40,
    audioTrigger: 'treble',
    decaySpeed: 0.5,
  },
};

export const inkSplatterBurstPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};