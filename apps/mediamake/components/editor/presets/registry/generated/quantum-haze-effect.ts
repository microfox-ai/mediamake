/**
 * QuantumHaze Combined Internal Effect Preset
 *
 * ARRAY OF EFFECTS
 * This internal effect preset returns multiple effects that layer to create a complex
 * atmospheric distortion:
 * 1. Generic effect: Slow hypnotic 3D rotation using rotate3d
 * 2. Waveform effect: Audio-reactive scale and blur modulation
 * 3. Generic effect: Particle-like shimmer using multiple box-shadows
 *
 * The combined result creates a surreal, multi-dimensional haze effect with pseudo-3D
 * movement, audio synchronization, and dynamic particle shimmer.
 *
 * Features:
 * - **3D Rotation**: Slow hypnotic rotation on a configurable 3D axis
 * - **Audio Reactivity**: Scale and blur respond to audio frequencies (bass/mid)
 * - **Particle Shimmer**: Multiple independent box-shadows create a particle effect
 * - **Phase Offset**: Timing variations for shimmer effect
 * - **Configurable Parameters**: Control rotation axis, audio sensitivity, particle count, glow intensity
 *
 * Use cases:
 * - Creating atmospheric overlays for music videos
 * - Adding surreal visual effects to text or images
 * - Building audio-reactive multi-dimensional effects
 * - Creating complex layered animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData, WaveformEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply the quantum haze effects to'),
  rotationAxis: z
    .array(z.number())
    .length(3)
    .default([1, 1, 0])
    .describe('3D rotation axis as [x, y, z] vector'),
  audioSensitivity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.7)
    .describe('Audio response sensitivity (0.1-2)'),
  particleCount: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe('Number of shadow particle instances'),
  glowIntensity: z
    .number()
    .min(1)
    .max(30)
    .default(10)
    .describe('Shadow blur/spread intensity (pixels)'),
  phaseOffset: z
    .number()
    .min(0)
    .default(500)
    .describe('Timing offset for shimmer effect (milliseconds)'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for waveform effect (optional, can be ref:componentId)'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of effects (relative to target)'),
  effectDuration: z
    .number()
    .default(10)
    .describe('Total duration of effects in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate particle box-shadow layers
  const generateParticleShadows = (count: number, intensity: number): string => {
    const shadows: string[] = [];
    const colors = [
      'rgba(138, 43, 226, 0.6)', // Purple
      'rgba(75, 0, 130, 0.5)', // Indigo
      'rgba(0, 191, 255, 0.4)', // Deep Sky Blue
      'rgba(147, 112, 219, 0.5)', // Medium Purple
      'rgba(255, 20, 147, 0.3)', // Deep Pink
    ];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 10 + i * 5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const blur = intensity + i * 2;
      const spread = Math.floor(intensity / 2);
      const color = colors[i % colors.length];
      
      shadows.push(`${x}px ${y}px ${blur}px ${spread}px ${color}`);
    }

    return shadows.join(', ');
  };

  // Extract parameters
  const rotationAxis = params.rotationAxis ?? [1, 1, 0];
  const audioSensitivity = params.audioSensitivity ?? 0.7;
  const particleCount = params.particleCount ?? 5;
  const glowIntensity = params.glowIntensity ?? 10;
  const phaseOffsetMs = params.phaseOffset ?? 500;
  const phaseOffsetSec = phaseOffsetMs / 1000;
  const effectStart = params.effectStart ?? 0;
  const effectDuration = params.effectDuration ?? 10;

  // Effect 1: Hypnotic 3D rotation (generic effect)
  const rotationEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: 4,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      {
        key: 'transform',
        val: `rotate3d(${rotationAxis[0]}, ${rotationAxis[1]}, ${rotationAxis[2]}, 0deg)`,
        prog: 0,
      },
      {
        key: 'transform',
        val: `rotate3d(${rotationAxis[0]}, ${rotationAxis[1]}, ${rotationAxis[2]}, 360deg)`,
        prog: 1,
      },
    ],
  };

  // Effect 2: Waveform audio-reactive scale and blur (only if audioSrc provided)
  const waveformEffect: WaveformEffectData | null = params.audioSrc
    ? {
        audioSrc: params.audioSrc,
        mode: 'provider',
        targetIds: params.targetIds,
        // Scale modulation
        effectType: 'scale',
        audioProperty: 'bass',
        intensity: audioSensitivity * 0.1,
        baseScale: 1,
        sensitivity: audioSensitivity,
        threshold: 0.1,
        smoothNormalisation: 1,
        numberOfSamples: 128,
        useFrequencyData: true,
        start: effectStart,
        duration: effectDuration,
      }
    : null;

  // Additional blur effect for waveform
  const waveformBlurEffect: WaveformEffectData | null = params.audioSrc
    ? {
        audioSrc: params.audioSrc,
        mode: 'provider',
        targetIds: params.targetIds,
        effectType: 'blur',
        audioProperty: 'mid',
        intensity: audioSensitivity * 3,
        sensitivity: audioSensitivity,
        threshold: 0.1,
        smoothNormalisation: 1,
        numberOfSamples: 128,
        useFrequencyData: true,
        start: effectStart,
        duration: effectDuration,
      }
    : null;

  // Effect 3: Particle shimmer using box-shadows (generic effect)
  const particleShadows = generateParticleShadows(particleCount, glowIntensity);
  
  const shimmerEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart + phaseOffsetSec,
    duration: 3,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      {
        key: 'boxShadow',
        val: particleShadows,
        prog: 0,
      },
      {
        key: 'boxShadow',
        val: particleShadows
          .replace(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/g, 'rgba($1, $2, $3, 0.9)')
          .replace(/(\d+)px (\d+)px (\d+)px/g, (match, x, y, blur) => {
            const newX = parseFloat(x) * 1.5;
            const newY = parseFloat(y) * 1.5;
            const newBlur = parseFloat(blur) * 1.3;
            return `${newX}px ${newY}px ${newBlur}px`;
          }),
        prog: 0.5,
      },
      {
        key: 'boxShadow',
        val: particleShadows,
        prog: 1,
      },
    ],
  };

  // Build effects array
  const effects = [
    {
      id: 'quantum-haze-rotation',
      componentId: 'generic' as const,
      data: rotationEffect,
    },
  ];

  if (waveformEffect) {
    effects.push({
      id: 'quantum-haze-waveform-scale',
      componentId: 'waveform' as const,
      data: waveformEffect,
    });
  }

  if (waveformBlurEffect) {
    effects.push({
      id: 'quantum-haze-waveform-blur',
      componentId: 'waveform' as const,
      data: waveformBlurEffect,
    });
  }

  effects.push({
    id: 'quantum-haze-shimmer',
    componentId: 'generic' as const,
    data: shimmerEffect,
  });

  return {
    output: {
      childrenData: [
        {
          id: 'quantum-haze-effect-container',
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
  id: 'quantum-haze-effect',
  title: 'QuantumHaze Combined Effect',
  description:
    'A combined internal effect preset that layers generic rotation, waveform audio-reactive scaling/blur, and particle shimmer effects to create a complex atmospheric distortion with pseudo-3D movement and multi-dimensional haze',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'waveform', 'rotation', '3d', 'audio-reactive', 'particles', 'shimmer'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['target-component'],
    rotationAxis: [1, 1, 0],
    audioSensitivity: 0.7,
    particleCount: 5,
    glowIntensity: 10,
    phaseOffset: 500,
    audioSrc: '',
    effectStart: 0,
    effectDuration: 10,
  },
};

export const quantumHazeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
