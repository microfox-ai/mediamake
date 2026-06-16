/**
 * Holographic Spectrum Internal Effect Preset
 *
 * Creates an iridescent, holographic color shifting effect by rapidly cycling through
 * RGB channel offsets in a rainbow pattern. Simulates holographic foil or oil slick surfaces
 * using CSS filters (hue-rotate, brightness, contrast, saturate) combined with subtle
 * channel separations via transform offsets.
 *
 * SINGLE EFFECT:
 * Returns a generic effect with continuous spectrum cycling (hue-rotate 0deg → 360deg)
 * synchronized with brightness modulation and optional channel offsets for shimmer.
 *
 * Features:
 * - Full spectrum color cycling (0° → 360° hue rotation)
 * - Brightness pulsing synchronized with color shifts
 * - Contrast and saturation boosts for metallic sheen
 * - Subtle translateX/Y channel separations for shimmer intensity
 * - Configurable wave direction (horizontal, vertical, radial)
 * - Metallic mode adds extra contrast and brightness
 *
 * Use cases:
 * - Futuristic UI elements with holographic appearance
 * - Attention-grabbing text effects
 * - Iridescent overlays for images/videos
 * - Oil slick surface simulations
 * - Holographic foil effects
 *
 * @param targetId - Component ID to apply effect to
 * @param effectStart - Start time (relative to parent)
 * @param effectDuration - Duration (use 'infinite' for continuous)
 * @param spectrumSpeed - Color cycle rate in seconds (default: 2)
 * @param shimmerIntensity - Channel offset amount 0-1 (default: 0.3)
 * @param waveDirection - Direction of wave pattern (default: 'horizontal')
 * @param metallic - Adds metallic sheen via contrast/brightness (default: false)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to target'),
  effectStart: z.number().default(0).describe('Start time of effect (relative to parent)'),
  effectDuration: z.number().default(2).describe('Duration of effect cycle in seconds'),
  spectrumSpeed: z.number().min(0.5).max(10).default(2).optional().describe('Color cycle rate in seconds (0.5-10, default: 2)'),
  shimmerIntensity: z.number().min(0).max(1).default(0.3).optional().describe('Channel offset amount for shimmer (0-1, default: 0.3)'),
  waveDirection: z.enum(['horizontal', 'vertical', 'radial']).default('horizontal').optional().describe('Direction of wave pattern'),
  metallic: z.boolean().default(false).optional().describe('Adds metallic sheen via increased contrast and brightness'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const spectrumSpeed = params.spectrumSpeed ?? 2;
  const shimmerIntensity = params.shimmerIntensity ?? 0.3;
  const waveDirection = params.waveDirection ?? 'horizontal';
  const metallic = params.metallic ?? false;

  // Calculate channel offset values based on shimmer intensity
  const maxOffset = shimmerIntensity * 3; // Max 3px offset at intensity 1.0

  // Base brightness and contrast values
  const baseBrightness = metallic ? 1.1 : 1.0;
  const baseContrast = metallic ? 1.2 : 1.0;
  const baseSaturate = metallic ? 1.3 : 1.15;

  // Create keyframes for holographic spectrum effect
  // Full cycle: 0deg → 120deg → 240deg → 360deg with synchronized brightness
  const holographicRanges = [
    // Start: Red-orange spectrum (0deg), normal brightness
    { key: 'filter', val: `hue-rotate(0deg) brightness(${baseBrightness}) contrast(${baseContrast}) saturate(${baseSaturate})`, prog: 0 },
    { key: 'translateX', val: 0, prog: 0 },
    { key: 'translateY', val: 0, prog: 0 },

    // 1/3: Green-cyan spectrum (120deg), brighter
    { key: 'filter', val: `hue-rotate(120deg) brightness(${baseBrightness * 1.2}) contrast(${baseContrast * 1.1}) saturate(${baseSaturate})`, prog: 0.33 },
    { key: 'translateX', val: waveDirection === 'horizontal' ? maxOffset : (waveDirection === 'radial' ? maxOffset * 0.7 : 0), prog: 0.33 },
    { key: 'translateY', val: waveDirection === 'vertical' ? maxOffset : (waveDirection === 'radial' ? maxOffset * 0.7 : 0), prog: 0.33 },

    // 2/3: Blue-purple spectrum (240deg), slightly dimmer
    { key: 'filter', val: `hue-rotate(240deg) brightness(${baseBrightness * 0.9}) contrast(${baseContrast}) saturate(${baseSaturate * 1.1})`, prog: 0.66 },
    { key: 'translateX', val: waveDirection === 'horizontal' ? -maxOffset : (waveDirection === 'radial' ? -maxOffset * 0.7 : 0), prog: 0.66 },
    { key: 'translateY', val: waveDirection === 'vertical' ? -maxOffset : (waveDirection === 'radial' ? -maxOffset * 0.7 : 0), prog: 0.66 },

    // End: Back to red spectrum (360deg = 0deg), return to normal
    { key: 'filter', val: `hue-rotate(360deg) brightness(${baseBrightness}) contrast(${baseContrast}) saturate(${baseSaturate})`, prog: 1 },
    { key: 'translateX', val: 0, prog: 1 },
    { key: 'translateY', val: 0, prog: 1 },
  ];

  const effectData: GenericEffectData = {
    type: 'linear', // Smooth continuous cycling
    start: params.effectStart,
    duration: spectrumSpeed,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: holographicRanges,
    iterations: 'infinite' as any, // Continuous loop
  };

  const effect = {
    id: params.effectId || `holographic-spectrum-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'holographic-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
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
  id: 'holographic-spectrum',
  title: 'Holographic Spectrum Effect',
  description: 'Internal effect preset that creates an iridescent, holographic color shifting effect by rapidly cycling through RGB channel offsets in a rainbow pattern. Simulates holographic foil or oil slick surfaces using CSS filters and transform offsets. Returns effect data for use by other presets.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'holographic', 'spectrum', 'rainbow', 'color-shift', 'iridescent', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 2,
    spectrumSpeed: 2,
    shimmerIntensity: 0.3,
    waveDirection: 'horizontal',
    metallic: false,
  },
};

export const holographicSpectrumPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
