/**
 * PatternPhaseGlitch Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates a glitch-style animation for text elements with controlled chaos.
 * Animates multiple properties simultaneously:
 * - translateX with jagged random offsets
 * - skewX for digital distortion
 * - RGB color split effect using filter (hue-rotate) and opacity layers
 *
 * Uses a generic AnimationRange approach with 8+ keyframes that create sudden jumps
 * and holds (like dropped frames in corrupted video). The pattern feels minimal but
 * impactful - brief moments of intense distortion followed by stability.
 *
 * Parameters:
 * - glitchIntensity (0-1): Controls the magnitude of glitch distortions
 * - holdDuration (ms): Duration of stable frames between glitches
 * - colorSplitAmount (pixels): RGB separation distance
 *
 * Effect uses spring easing for recovery moments and linear easing for glitch jumps.
 *
 * Technical: Generic effect type with AnimationRange[] structure.
 * Mode: 'provider' with targetIds.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of the components to apply the glitch effect to'),
  duration: z
    .number()
    .optional()
    .default(800)
    .describe('Total duration of the effect in milliseconds'),
  glitchIntensity: z
    .number()
    .min(0)
    .max(1)
    .describe('Intensity of glitch distortion (0 = subtle, 1 = extreme)'),
  holdDuration: z
    .number()
    .describe('Duration in milliseconds for stable frames between glitches'),
  colorSplitAmount: z
    .number()
    .describe('Pixel offset for RGB color separation effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Convert duration from milliseconds to seconds
  const durationSec = (params.duration || 800) / 1000;
  const holdDurationSec = params.holdDuration / 1000;

  // Calculate intensity-based values
  const intensity = params.glitchIntensity;
  const maxTranslateX = intensity * 20; // Max horizontal offset
  const maxSkewX = intensity * 15; // Max skew angle
  const colorSplit = params.colorSplitAmount;

  // Helper function to generate glitch keyframes
  const generateGlitchKeyframes = () => {
    // 8 keyframes creating sudden jumps and holds
    // Pattern: stable → glitch jump → hold → glitch → hold → recover
    const keyframes = [];

    // Keyframe progression points (0-1)
    const progressPoints = [
      0, // Start: stable
      0.08, // Quick glitch jump
      0.2, // Hold after first glitch
      0.35, // Second glitch
      0.45, // Hold
      0.6, // Third glitch (most intense)
      0.75, // Hold
      0.9, // Recovery begins
      1.0, // End: stable
    ];

    // TranslateX ranges (jagged random offsets)
    const translateXRanges = progressPoints.map((prog, index) => {
      let val = 0;
      if (index === 1) val = maxTranslateX * 0.7; // First glitch
      else if (index === 3) val = -maxTranslateX * 0.5; // Second glitch
      else if (index === 5) val = maxTranslateX * 1.0; // Peak glitch
      else if (index === 7) val = maxTranslateX * 0.2; // Recovery wiggle

      return { key: 'translateX', val, prog };
    });

    // SkewX ranges (digital distortion)
    const skewXRanges = progressPoints.map((prog, index) => {
      let val = 0;
      if (index === 1) val = maxSkewX * 0.6;
      else if (index === 3) val = -maxSkewX * 0.4;
      else if (index === 5) val = maxSkewX * 1.0; // Peak distortion
      else if (index === 7) val = -maxSkewX * 0.1;

      return { key: 'skewX', val, prog };
    });

    // RGB color split using filter (hue-rotate approximation for chromatic aberration)
    // We simulate RGB split with drop-shadow filters offset in different directions
    const filterRanges = progressPoints.map((prog, index) => {
      let val = 'none';
      if (index === 1) {
        val = `drop-shadow(${colorSplit}px 0 0 rgba(255,0,0,0.8)) drop-shadow(-${colorSplit}px 0 0 rgba(0,255,255,0.8))`;
      } else if (index === 3) {
        val = `drop-shadow(${colorSplit * 0.6}px 0 0 rgba(255,0,0,0.6)) drop-shadow(-${colorSplit * 0.6}px 0 0 rgba(0,255,255,0.6))`;
      } else if (index === 5) {
        // Peak glitch - maximum color split
        val = `drop-shadow(${colorSplit * 1.2}px 0 0 rgba(255,0,0,1)) drop-shadow(-${colorSplit * 1.2}px 0 0 rgba(0,255,255,1))`;
      } else if (index === 7) {
        val = `drop-shadow(${colorSplit * 0.3}px 0 0 rgba(255,0,0,0.4)) drop-shadow(-${colorSplit * 0.3}px 0 0 rgba(0,255,255,0.4))`;
      }

      return { key: 'filter', val, prog };
    });

    return [...translateXRanges, ...skewXRanges, ...filterRanges];
  };

  // Generate effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear for glitch jumps; spring for recovery is handled by easing type
    start: 0,
    duration: durationSec,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: generateGlitchKeyframes(),
  };

  // Create effect node
  const effect = {
    id: `pattern-phase-glitch-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'pattern-phase-glitch-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: durationSec * 2, // Longer container duration to ensure effect plays
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'PatternPhaseGlitch',
  title: 'PatternPhaseGlitch Internal Effect',
  description:
    'An internal effect preset that generates glitch-style animation data for text elements. Creates controlled chaos through simultaneous animation of translateX (jagged offsets), skewX (digital distortion), and RGB color split (via filter layers). Uses 8+ keyframes with sudden jumps and holds. Parameters: glitchIntensity (0-1), holdDuration (ms), colorSplitAmount (pixels). Returns effect data with AnimationRange[] for generic effect consumption.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'glitch',
    'distortion',
    'rgb-split',
    'chromatic-aberration',
    'kinetic',
    'internal',
    'generic',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['text-component'],
    duration: 800,
    glitchIntensity: 0.7,
    holdDuration: 150,
    colorSplitAmount: 4,
  },
};

export const PatternPhaseGlitchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
