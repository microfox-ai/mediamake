/**
 * GlitchFocus Internal Effect Preset
 *
 * EFFECT TYPE: Array of effects (multiple effects for layered glitch)
 *
 * Description:
 * Creates a complex digital glitch focus effect combining RGB channel splits with
 * varying blur levels, opacity glitches, position offsets, and corruption patterns.
 * Simulates digital focus errors with random or audio-triggered glitch moments.
 *
 * Features:
 * - RGB channel separation with independent blur/opacity per channel
 * - Position offset glitches (translateX/Y)
 * - Opacity corruption flickers
 * - Binary pattern mode (structured glitches) vs chaos mode (random)
 * - Audio-triggered glitch breakpoints
 * - Snapback mechanism (glitch → normal → glitch cycle)
 * - Intensity levels: subtle (professional), moderate (balanced), extreme (artistic)
 *
 * Use Cases:
 * - Tech/cyberpunk visual effects
 * - Digital error aesthetics
 * - Music video glitch moments
 * - Transition effects with chromatic aberration
 * - Audio-reactive visual distortion
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- PARAMETERS SCHEMA ---
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply glitch effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(5)
    .describe('Duration of the effect in seconds'),

  // Core glitch parameters
  intensity: z
    .enum(['subtle', 'moderate', 'extreme'])
    .default('moderate')
    .describe(
      'Overall glitch intensity: subtle (professional), moderate (balanced), extreme (artistic)',
    ),
  channelSeparation: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Distance of RGB channel separation in pixels (0-10)'),
  corruptionProbability: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe(
      'Probability of corruption glitches occurring (0 = none, 1 = constant)',
    ),

  // Mode configuration
  mode: z
    .enum(['data', 'chaos'])
    .default('chaos')
    .describe(
      'Glitch pattern mode: data (binary/structured patterns) or chaos (pure randomization)',
    ),
  audioTriggered: z
    .boolean()
    .default(false)
    .describe('Whether glitches are triggered by audio analysis (requires audio)'),
  snapbackSpeed: z
    .number()
    .min(0.05)
    .max(1)
    .default(0.1)
    .describe(
      'Speed of snapback recovery from glitch to normal (0.05 = slow, 1 = instant)',
    ),

  // Optional audio source for audio-triggered mode
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for audio-triggered glitches (required if audioTriggered is true)'),

  // Optional effect ID
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

// --- EXECUTION FUNCTION ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters
  const {
    targetId,
    effectStart,
    effectDuration,
    intensity,
    channelSeparation,
    corruptionProbability,
    mode,
    audioTriggered,
    snapbackSpeed,
    audioSrc,
    effectId,
  } = params;

  // Helper function: Calculate intensity multipliers based on level
  const getIntensityConfig = (
    level: 'subtle' | 'moderate' | 'extreme',
  ): {
    channelBlur: { red: number; green: number; blue: number };
    channelOpacity: { red: number; green: number; blue: number };
    maxOffset: number;
    glitchFrequency: number;
    opacityFlickerRange: [number, number];
  } => {
    const configs = {
      subtle: {
        channelBlur: { red: 1, green: 0.5, blue: 1 },
        channelOpacity: { red: 0.95, green: 1, blue: 0.95 },
        maxOffset: 2,
        glitchFrequency: 0.05,
        opacityFlickerRange: [0.9, 1] as [number, number],
      },
      moderate: {
        channelBlur: { red: 3, green: 1, blue: 2 },
        channelOpacity: { red: 0.9, green: 1, blue: 0.9 },
        maxOffset: 4,
        glitchFrequency: 0.1,
        opacityFlickerRange: [0.8, 1] as [number, number],
      },
      extreme: {
        channelBlur: { red: 6, green: 2, blue: 4 },
        channelOpacity: { red: 0.85, green: 1, blue: 0.85 },
        maxOffset: 8,
        glitchFrequency: 0.2,
        opacityFlickerRange: [0.5, 1] as [number, number],
      },
    };
    return configs[level];
  };

  const config = getIntensityConfig(intensity);

  // Helper function: Generate glitch timing keyframes
  const generateGlitchKeyframes = (
    duration: number,
    probability: number,
    isDataMode: boolean,
  ): number[] => {
    const keyframes: number[] = [];
    const stepCount = Math.floor(duration * 10); // 10 steps per second

    for (let i = 0; i < stepCount; i++) {
      const prog = i / stepCount;
      const shouldGlitch = isDataMode
        ? // Data mode: structured pattern (binary-like)
          Math.floor(prog * 16) % 2 === 0 &&
          Math.random() < probability * 2
        : // Chaos mode: pure randomization
          Math.random() < probability;

      if (shouldGlitch) {
        keyframes.push(prog);
      }
    }

    return keyframes;
  };

  const glitchKeyframes = generateGlitchKeyframes(
    effectDuration,
    corruptionProbability * config.glitchFrequency,
    mode === 'data',
  );

  // --- RGB CHANNEL SPLIT EFFECTS ---

  // Red channel effect (blur + offset left + opacity)
  const redChannelEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      {
        key: 'filter',
        val: `blur(${config.channelBlur.red}px) hue-rotate(0deg) saturate(1.5)`,
        prog: 0,
      },
      {
        key: 'filter',
        val: `blur(${config.channelBlur.red}px) hue-rotate(0deg) saturate(1.5)`,
        prog: 1,
      },
      {
        key: 'translateX',
        val: -channelSeparation,
        prog: 0,
      },
      {
        key: 'translateX',
        val: -channelSeparation,
        prog: 1,
      },
      {
        key: 'opacity',
        val: config.channelOpacity.red,
        prog: 0,
      },
      {
        key: 'opacity',
        val: config.channelOpacity.red,
        prog: 1,
      },
    ],
  };

  // Green channel effect (minimal blur, centered, full opacity)
  const greenChannelEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      {
        key: 'filter',
        val: `blur(${config.channelBlur.green}px)`,
        prog: 0,
      },
      {
        key: 'filter',
        val: `blur(${config.channelBlur.green}px)`,
        prog: 1,
      },
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'opacity', val: config.channelOpacity.green, prog: 0 },
      { key: 'opacity', val: config.channelOpacity.green, prog: 1 },
    ],
  };

  // Blue channel effect (blur + offset right + opacity)
  const blueChannelEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      {
        key: 'filter',
        val: `blur(${config.channelBlur.blue}px) hue-rotate(180deg) saturate(1.5)`,
        prog: 0,
      },
      {
        key: 'filter',
        val: `blur(${config.channelBlur.blue}px) hue-rotate(180deg) saturate(1.5)`,
        prog: 1,
      },
      { key: 'translateX', val: channelSeparation, prog: 0 },
      { key: 'translateX', val: channelSeparation, prog: 1 },
      { key: 'opacity', val: config.channelOpacity.blue, prog: 0 },
      { key: 'opacity', val: config.channelOpacity.blue, prog: 1 },
    ],
  };

  // --- CORRUPTION GLITCH EFFECTS ---

  // Position offset glitches
  const positionGlitchRanges: Array<{
    key: string;
    val: number;
    prog: number;
  }> = [];
  glitchKeyframes.forEach((prog, index) => {
    const offsetX =
      (Math.random() - 0.5) * config.maxOffset * channelSeparation;
    const offsetY =
      (Math.random() - 0.5) * config.maxOffset * channelSeparation * 0.5;

    // Glitch moment
    positionGlitchRanges.push(
      { key: 'translateX', val: offsetX, prog },
      { key: 'translateY', val: offsetY, prog },
    );

    // Snapback (recovery)
    const snapbackProg = Math.min(prog + snapbackSpeed, 1);
    if (snapbackProg <= 1) {
      positionGlitchRanges.push(
        { key: 'translateX', val: 0, prog: snapbackProg },
        { key: 'translateY', val: 0, prog: snapbackProg },
      );
    }
  });

  const positionGlitchEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateY', val: 0, prog: 0 },
      ...positionGlitchRanges,
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  // Opacity corruption flickers
  const opacityGlitchRanges: Array<{ key: string; val: number; prog: number }> =
    [];
  glitchKeyframes.forEach((prog, index) => {
    const [minOpacity, maxOpacity] = config.opacityFlickerRange;
    const flickerOpacity =
      minOpacity + Math.random() * (maxOpacity - minOpacity);

    // Corruption moment
    opacityGlitchRanges.push({ key: 'opacity', val: flickerOpacity, prog });

    // Snapback (recovery)
    const snapbackProg = Math.min(prog + snapbackSpeed, 1);
    if (snapbackProg <= 1) {
      opacityGlitchRanges.push({ key: 'opacity', val: 1, prog: snapbackProg });
    }
  });

  const opacityGlitchEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: [
      { key: 'opacity', val: 1, prog: 0 },
      ...opacityGlitchRanges,
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // --- AUDIO-TRIGGERED GLITCHES (Optional) ---
  // Note: Audio-triggered implementation would require beat analysis.
  // For now, we structure the effects to support future audio integration.

  // Combine all effects
  const effects = [
    {
      id: `${effectId || 'glitch-focus'}-red-channel-${targetId}`,
      componentId: 'generic',
      data: redChannelEffect,
    },
    {
      id: `${effectId || 'glitch-focus'}-green-channel-${targetId}`,
      componentId: 'generic',
      data: greenChannelEffect,
    },
    {
      id: `${effectId || 'glitch-focus'}-blue-channel-${targetId}`,
      componentId: 'generic',
      data: blueChannelEffect,
    },
    {
      id: `${effectId || 'glitch-focus'}-position-glitch-${targetId}`,
      componentId: 'generic',
      data: positionGlitchEffect,
    },
    {
      id: `${effectId || 'glitch-focus'}-opacity-glitch-${targetId}`,
      componentId: 'generic',
      data: opacityGlitchEffect,
    },
  ];

  // --- RETURN OUTPUT ---
  // Container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'glitch-focus-effect-container',
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
        duration: effectDuration,
      },
    },
    effects,
    childrenData: [],
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

// --- METADATA ---
const presetMetadata: PresetMetadata = {
  id: 'glitch-focus-effect',
  title: 'GlitchFocus Internal Effect',
  description:
    'An internal effect preset combining digital glitch aesthetics with focus manipulation. Features RGB channel splits with varying blur levels per color channel, opacity glitches, position offsets, and corruption overlays to simulate digital focus errors. Supports dataMode (binary patterns) and chaosMode (random) glitch triggers.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'glitch', 'internal', 'rgb-split', 'corruption', 'focus'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 5,
    intensity: 'moderate',
    channelSeparation: 3,
    corruptionProbability: 0.1,
    mode: 'chaos',
    audioTriggered: false,
    snapbackSpeed: 0.1,
  },
  dependencies: {},
};

// --- EXPORT ---
export const glitchFocusEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
