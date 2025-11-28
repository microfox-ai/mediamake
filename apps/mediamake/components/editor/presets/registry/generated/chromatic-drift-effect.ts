/**
 * ChromaticDrift Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Applies a minimal color-shifting effect to text or shape elements through RGB channel manipulation.
 * Creates a gentle prismatic light refraction effect with smooth spectrum shifts and chromatic aberration
 * via text-shadow (for text) or filter effects. Animates through a limited color palette (3-4 colors max)
 * while RGB channels slightly separate and converge, with optional brightness pulse.
 *
 * Features:
 * - Smooth color transitions through custom palette
 * - Chromatic aberration via text-shadow for channel separation
 * - Optional brightness pulse for added dynamism
 * - Configurable drift speed and aberration intensity
 * - Uses generic AnimationRange for smooth animations
 *
 * Use cases:
 * - Adding subtle prismatic effects to text overlays
 * - Creating gentle color-shifting animations
 * - Enhancing text with chromatic aberration
 * - Building melodic, smooth color effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to target'),
  colorPalette: z.array(z.string()).min(2).max(4).describe('Array of hex color codes (3-4 colors max) for color drift'),
  driftSpeed: z.number().optional().default(1500).describe('Duration in milliseconds for one complete color cycle'),
  aberrationAmount: z.number().optional().default(2).describe('Pixel offset for chromatic aberration (channel separation)'),
  pulseIntensity: z.number().optional().describe('Optional brightness pulse intensity (0-1, adds brightness variation)'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    colorPalette,
    driftSpeed = 1500,
    aberrationAmount = 2,
    pulseIntensity,
    effectId,
  } = params;

  // Helper function to generate chromatic aberration text-shadow values
  const generateChromaticShadow = (offset: number, intensity: number): string => {
    const normalizedIntensity = intensity / 2;
    return `${offset * normalizedIntensity}px 0 rgba(255, 0, 0, 0.7), -${offset * normalizedIntensity}px 0 rgba(0, 255, 255, 0.7)`;
  };

  // Build color animation ranges
  const colorRanges = colorPalette.map((color, index) => ({
    key: 'color',
    val: color,
    prog: index / (colorPalette.length - 1),
  }));

  // Build chromatic aberration ranges (text-shadow)
  // Peak aberration at 0.5 progress for maximum channel separation
  const shadowRanges = [
    {
      key: 'textShadow',
      val: generateChromaticShadow(0, aberrationAmount),
      prog: 0,
    },
    {
      key: 'textShadow',
      val: generateChromaticShadow(aberrationAmount, aberrationAmount),
      prog: 0.5,
    },
    {
      key: 'textShadow',
      val: generateChromaticShadow(0, aberrationAmount),
      prog: 1,
    },
  ];

  // Build brightness ranges if pulseIntensity is provided
  const brightnessRanges = pulseIntensity
    ? [
        { key: 'filter', val: 'brightness(1)', prog: 0 },
        { key: 'filter', val: `brightness(${1 + pulseIntensity})`, prog: 0.5 },
        { key: 'filter', val: 'brightness(1)', prog: 1 },
      ]
    : [];

  // Combine all ranges
  const ranges = [
    ...colorRanges,
    ...shadowRanges,
    ...(brightnessRanges.length > 0 ? brightnessRanges : []),
  ];

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: driftSpeed / 1000, // Convert ms to seconds
    mode: 'provider',
    targetIds: targetIds,
    ranges: ranges,
  };

  // Create effect
  const effect = {
    id: effectId || `chromatic-drift-${targetIds[0]}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'chromatic-drift-effect-container',
          type: 'layout',
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
  id: 'chromaticDriftEffect',
  title: 'ChromaticDrift Effect',
  description: 'An internal effect preset that applies a minimal color-shifting effect to text or shape elements through RGB channel manipulation. Creates gentle prismatic light refraction with smooth spectrum shifts and chromatic aberration via text-shadow or filter effects. Supports customizable color palettes (3-4 colors), drift speed, aberration amount for channel separation, and optional brightness pulse intensity.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'chromatic', 'drift', 'color-shift', 'aberration', 'rgb', 'prismatic', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['text-component-1'],
    colorPalette: ['#FF6B9D', '#C44569', '#FFA07A', '#FF6B9D'],
    driftSpeed: 1500,
    aberrationAmount: 2,
    pulseIntensity: 0.2,
  },
};

export const chromaticDriftEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
