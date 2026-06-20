/**
 * Neon Glow Pulse Effect Internal Preset
 *
 * SINGLE EFFECT:
 * This internal effect preset creates a soft, animated neon glow effect using CSS filter properties
 * and box-shadow animations. The effect creates a pulsing glow that emanates from the target element
 * with a three-stage animation: fade-in (0-0.2), pulse loop (0.2-0.8), and fade-out (0.8-1.0).
 *
 * Technical Details:
 * - Uses generic effect type with AnimationRange keyframes
 * - Animates filter (drop-shadow), boxShadow, and opacity properties
 * - Spring easing for organic, lifelike motion
 * - Multi-layer shadows for depth and richness
 * - Configurable glow color, intensity, pulse speed, and blur radius
 *
 * Use Cases:
 * - Add emphasis to text, buttons, or UI elements
 * - Create cyberpunk or futuristic aesthetic
 * - Highlight important content with animated glow
 * - Add depth and visual interest to flat designs
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters with validation
const presetParams = z.object({
  glowColor: z.string().describe('Hex color string for the glow effect'),
  intensity: z
    .number()
    .min(0)
    .max(1)
    .describe('Glow intensity multiplier (0-1, where 1 is maximum)'),
  pulseSpeed: z
    .number()
    .positive()
    .describe('Duration of one complete pulse cycle in milliseconds'),
  blurRadius: z
    .number()
    .positive()
    .describe('Base blur radius for the glow in pixels'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the glow effect to'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    // Remove # if present
    const cleanHex = hex.replace('#', '');

    // Parse RGB values
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${g === b && r === g ? g : b}, ${alpha})`;
  };

  // Convert pulse speed from ms to seconds
  const durationInSeconds = params.pulseSpeed / 1000;

  // Calculate blur values based on intensity and blur radius
  const minBlur = params.blurRadius * 0.3;
  const midBlur = params.blurRadius * params.intensity;
  const maxBlur = params.blurRadius * params.intensity * 1.5;

  // Create RGBA color with varying alpha for different stages
  const colorLowAlpha = hexToRgba(params.glowColor, 0);
  const colorMidAlpha = hexToRgba(params.glowColor, params.intensity * 0.6);
  const colorHighAlpha = hexToRgba(params.glowColor, params.intensity * 0.9);

  // Construct animation ranges for three-stage glow effect
  const effectData: GenericEffectData = {
    type: 'spring',
    start: 0,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      // === FADE-IN PHASE (0 → 0.2) ===
      // Filter: drop-shadow fade in
      {
        key: 'filter',
        val: `drop-shadow(0 0 0px ${colorLowAlpha})`,
        prog: 0,
      },
      {
        key: 'filter',
        val: `drop-shadow(0 0 ${minBlur}px ${colorMidAlpha})`,
        prog: 0.2,
      },

      // Box-shadow: multi-layer glow fade in
      {
        key: 'boxShadow',
        val: `0 0 0px ${colorLowAlpha}, 0 0 0px ${colorLowAlpha}`,
        prog: 0,
      },
      {
        key: 'boxShadow',
        val: `0 0 ${minBlur}px ${colorMidAlpha}, 0 0 ${minBlur * 2}px ${colorMidAlpha}`,
        prog: 0.2,
      },

      // Opacity: fade in
      { key: 'opacity', val: 0.6, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.2 },

      // === PULSE LOOP PHASE (0.2 → 0.8) ===
      // Filter: drop-shadow pulse from mid to max to mid
      {
        key: 'filter',
        val: `drop-shadow(0 0 ${maxBlur}px ${colorHighAlpha})`,
        prog: 0.5,
      },
      {
        key: 'filter',
        val: `drop-shadow(0 0 ${midBlur}px ${colorMidAlpha})`,
        prog: 0.8,
      },

      // Box-shadow: multi-layer glow pulse
      {
        key: 'boxShadow',
        val: `0 0 ${maxBlur}px ${colorHighAlpha}, 0 0 ${maxBlur * 2}px ${colorMidAlpha}, 0 0 ${maxBlur * 3}px ${colorLowAlpha}`,
        prog: 0.5,
      },
      {
        key: 'boxShadow',
        val: `0 0 ${midBlur}px ${colorMidAlpha}, 0 0 ${midBlur * 2}px ${colorMidAlpha}`,
        prog: 0.8,
      },

      // Opacity: maintain full visibility during pulse
      { key: 'opacity', val: 1, prog: 0.5 },
      { key: 'opacity', val: 1, prog: 0.8 },

      // === FADE-OUT PHASE (0.8 → 1.0) ===
      // Filter: drop-shadow fade out
      {
        key: 'filter',
        val: `drop-shadow(0 0 0px ${colorLowAlpha})`,
        prog: 1,
      },

      // Box-shadow: glow fade out
      {
        key: 'boxShadow',
        val: `0 0 0px ${colorLowAlpha}, 0 0 0px ${colorLowAlpha}`,
        prog: 1,
      },

      // Opacity: fade out
      { key: 'opacity', val: 0.6, prog: 1 },
    ],
  };

  // Create the effect object
  const neonGlowEffect = {
    id: `neon-glow-pulse-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect wrapped in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'neon-glow-pulse-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [neonGlowEffect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: durationInSeconds,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'neonGlowPulse',
  title: 'Neon Glow Pulse Effect',
  description:
    'Creates a soft, animated neon glow effect with pulsing animation using CSS filters and box-shadow. Features three-stage animation with spring easing for organic motion.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'glow', 'neon', 'pulse', 'animation', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    glowColor: '#00ffff',
    intensity: 0.8,
    pulseSpeed: 2000,
    blurRadius: 20,
    targetIds: ['target-element'],
  },
};

// Export preset
export const neonGlowPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
