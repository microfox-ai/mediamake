/**
 * VibrantGlowPulse Internal Effect Preset
 *
 * ARRAY OF EFFECTS (4 effects returned):
 * This internal effect preset creates a complex, ethereal pulsating glow by layering four separate
 * generic effects with offset timing for an organic, breathing rhythm. Each effect animates a different
 * visual property:
 * 1. Drop-shadow glow that pulses in size and opacity (offset: 0)
 * 2. Saturation breathing from 1.0 to 1.8 (offset: 0.25 * pulseSpeed)
 * 3. Brightness oscillation from 1.0 to 1.2 (offset: 0.5 * pulseSpeed)
 * 4. Soft blur that comes and goes 0px to 2px (offset: 0.75 * pulseSpeed)
 *
 * The effects can be applied to any target component via provider mode. The glow shadow expands
 * from 0px to 20px spread radius, creating a vibrant pulsating aura around the target.
 *
 * Features:
 * - Four layered effects with staggered timing
 * - Customizable glow color (default: rgba(255, 100, 200, 0.5))
 * - Adjustable pulse speed (default: 3s)
 * - Intensity multiplier (0.5 to 2.0) for fine-tuning
 * - Organic rhythm from offset timing
 *
 * Use cases:
 * - Creating ethereal, glowing text effects
 * - Adding pulsating aura to icons or images
 * - Building complex, multi-layered animations
 * - Creating organic, breathing visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the vibrant glow pulse effect to'),
  glowColor: z
    .string()
    .default('rgba(255, 100, 200, 0.5)')
    .describe('Color of the glowing drop-shadow (CSS color value with opacity)'),
  pulseSpeed: z
    .number()
    .default(3)
    .describe('Duration of one complete pulse cycle in seconds'),
  intensity: z
    .number()
    .min(0.5)
    .max(2.0)
    .default(1)
    .describe('Intensity multiplier for all effects (0.5 to 2.0, default: 1)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { targetIds, glowColor, pulseSpeed, intensity } = params;

  // Calculate intensity-adjusted values
  const maxSpread = 20 * intensity;
  const maxSaturation = 1.0 + (0.8 * intensity); // 1.0 to 1.8 default, scaled by intensity
  const maxBrightness = 1.0 + (0.2 * intensity); // 1.0 to 1.2 default, scaled by intensity
  const maxBlur = 2 * intensity;

  // Helper function to parse rgba color and extract opacity
  const parseGlowColor = (color: string): { rgb: string; opacity: number } => {
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch) {
      const [, r, g, b, a] = rgbaMatch;
      return {
        rgb: `${r}, ${g}, ${b}`,
        opacity: a ? parseFloat(a) : 1,
      };
    }
    // Fallback for hex or named colors - assume full opacity
    return { rgb: '255, 100, 200', opacity: 0.5 };
  };

  const { rgb, opacity: baseOpacity } = parseGlowColor(glowColor);

  // Effect 1: Drop-shadow glow that pulses in size and opacity
  const dropShadowEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0, // No offset for first effect
    duration: pulseSpeed,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // Shadow spread radius animation (0px to maxSpread)
      {
        key: 'filter',
        val: `drop-shadow(0 0 0px rgba(${rgb}, ${baseOpacity * 0.3}))`,
        prog: 0,
      },
      {
        key: 'filter',
        val: `drop-shadow(0 0 ${maxSpread}px rgba(${rgb}, ${baseOpacity}))`,
        prog: 0.5,
      },
      {
        key: 'filter',
        val: `drop-shadow(0 0 0px rgba(${rgb}, ${baseOpacity * 0.3}))`,
        prog: 1,
      },
    ],
  };

  // Effect 2: Saturation breathing from 1.0 to maxSaturation
  const saturationEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0.25 * pulseSpeed, // Offset by 25% of pulse cycle
    duration: pulseSpeed,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'filter', val: 'saturate(1.0)', prog: 0 },
      { key: 'filter', val: `saturate(${maxSaturation})`, prog: 0.5 },
      { key: 'filter', val: 'saturate(1.0)', prog: 1 },
    ],
  };

  // Effect 3: Brightness oscillation from 1.0 to maxBrightness
  const brightnessEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0.5 * pulseSpeed, // Offset by 50% of pulse cycle
    duration: pulseSpeed,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'filter', val: 'brightness(1.0)', prog: 0 },
      { key: 'filter', val: `brightness(${maxBrightness})`, prog: 0.5 },
      { key: 'filter', val: 'brightness(1.0)', prog: 1 },
    ],
  };

  // Effect 4: Soft blur that comes and goes (0px to maxBlur)
  const blurEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0.75 * pulseSpeed, // Offset by 75% of pulse cycle
    duration: pulseSpeed,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'filter', val: 'blur(0px)', prog: 0 },
      { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0.5 },
      { key: 'filter', val: 'blur(0px)', prog: 1 },
    ],
  };

  // Create effect nodes (full BaseEffect structure)
  const effects = [
    {
      id: `vibrant-glow-drop-shadow-${targetIds.join('-')}`,
      componentId: 'generic',
      data: dropShadowEffect,
    },
    {
      id: `vibrant-glow-saturation-${targetIds.join('-')}`,
      componentId: 'generic',
      data: saturationEffect,
    },
    {
      id: `vibrant-glow-brightness-${targetIds.join('-')}`,
      componentId: 'generic',
      data: brightnessEffect,
    },
    {
      id: `vibrant-glow-blur-${targetIds.join('-')}`,
      componentId: 'generic',
      data: blurEffect,
    },
  ];

  // Return as container with effects (system will extract via _internalPresetOutput)
  const rootContainer: RenderableComponentData = {
    id: 'vibrant-glow-pulse-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: pulseSpeed,
      },
    },
    effects: effects,
    childrenData: [] as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'VibrantGlowPulse',
  title: 'Vibrant Glow Pulse Effect',
  description:
    'Internal effect preset that layers multiple pulsating effects (drop-shadow glow, saturation breathing, brightness oscillation, and soft blur) with offset timing to create a complex, organic ethereal rhythm. Returns an array of generic effect objects that can be applied to any target components via provider mode.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'glow', 'pulse', 'multi-layer', 'internal', 'generic', 'ethereal'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['example-component'],
    glowColor: 'rgba(255, 100, 200, 0.5)',
    pulseSpeed: 3,
    intensity: 1,
  },
};

export const VibrantGlowPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
