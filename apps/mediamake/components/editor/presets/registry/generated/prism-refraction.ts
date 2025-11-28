/**
 * Prism Refraction Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset simulates light passing through a prism, creating beautiful
 * rainbow-like RGB color channel separations. Each color channel follows a unique bezier
 * path to create organic, physics-based refraction movement.
 *
 * Features:
 * - **RGB Channel Separation**: Creates three separate effects for red, green, and blue channels
 * - **Bezier Curve Motion**: Smooth, physics-based movement along customizable paths
 * - **Configurable Refraction**: Control spread angle, intensity, and convergence behavior
 * - **Organic Animation**: Each channel follows a slightly different arc for realistic prism effect
 * - **Color Channel Isolation**: Uses hue-rotate filters to create distinct RGB separation
 *
 * Returns three generic effects (one for each color channel) that apply to target components.
 *
 * Use cases:
 * - Creating chromatic aberration effects
 * - Simulating light refraction through glass
 * - Adding cinematic color separation effects
 * - Building psychedelic or trippy visual styles
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Component IDs to apply prism refraction effect to'),
  refractionAngle: z
    .number()
    .min(0)
    .max(45)
    .default(20)
    .describe('Maximum spread angle for RGB channel separation in pixels'),
  prismIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Opacity and strength of separated color channels'),
  motionCurve: z
    .string()
    .default('cubic-bezier(0.4, 0.0, 0.2, 1)')
    .describe('Bezier curve definition for arc motion paths'),
  convergencePoint: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe(
      'Progress point where channels reunite (0=never converge, 1=converge at end)',
    ),
  duration: z.number().default(2).describe('Effect duration in seconds'),
  start: z
    .number()
    .default(0)
    .describe('Effect start time in seconds (relative to component)'),
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
    refractionAngle,
    prismIntensity,
    convergencePoint,
    duration,
    start,
    effectIdPrefix,
  } = params;

  // Helper function to determine convergence based on progress
  const getConvergedValue = (
    initialValue: number,
    prog: number,
  ): number => {
    if (convergencePoint === 0) {
      return initialValue;
    }
    if (prog >= convergencePoint) {
      return 0;
    }
    return initialValue;
  };

  // Red Channel Effect - Arc motion to the left
  const redChannelData: GenericEffectData = {
    type: 'ease-in-out',
    start,
    duration,
    mode: 'provider',
    targetIds,
    ranges: [
      // Horizontal arc motion (left)
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: -refractionAngle * 0.7, prog: 0.5 },
      {
        key: 'translateX',
        val: getConvergedValue(-refractionAngle, 1),
        prog: 1,
      },
      // Vertical arc motion (up then back)
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -refractionAngle * 0.3, prog: 0.4 },
      { key: 'translateY', val: 0, prog: 1 },
      // Color isolation and enhancement
      {
        key: 'filter',
        val: 'hue-rotate(0deg) saturate(150%) brightness(1.1)',
        prog: 0,
      },
      {
        key: 'filter',
        val: 'hue-rotate(0deg) saturate(150%) brightness(1.1)',
        prog: 1,
      },
      // Opacity control
      { key: 'opacity', val: prismIntensity, prog: 0 },
      { key: 'opacity', val: prismIntensity, prog: 1 },
    ],
  };

  // Green Channel Effect - Straight path with slight Y offset
  const greenChannelData: GenericEffectData = {
    type: 'ease-in-out',
    start,
    duration,
    mode: 'provider',
    targetIds,
    ranges: [
      // Minimal horizontal movement
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: 0, prog: 1 },
      // Slight vertical offset
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: refractionAngle * 0.2, prog: 0.5 },
      {
        key: 'translateY',
        val: getConvergedValue(refractionAngle * 0.15, 1),
        prog: 1,
      },
      // Color isolation and enhancement
      {
        key: 'filter',
        val: 'hue-rotate(90deg) saturate(140%) brightness(1.05)',
        prog: 0,
      },
      {
        key: 'filter',
        val: 'hue-rotate(90deg) saturate(140%) brightness(1.05)',
        prog: 1,
      },
      // Slightly reduced opacity
      { key: 'opacity', val: prismIntensity * 0.9, prog: 0 },
      { key: 'opacity', val: prismIntensity * 0.9, prog: 1 },
    ],
  };

  // Blue Channel Effect - Arc motion to the right (opposite of red)
  const blueChannelData: GenericEffectData = {
    type: 'ease-in-out',
    start,
    duration,
    mode: 'provider',
    targetIds,
    ranges: [
      // Horizontal arc motion (right)
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: refractionAngle * 0.7, prog: 0.5 },
      {
        key: 'translateX',
        val: getConvergedValue(refractionAngle, 1),
        prog: 1,
      },
      // Vertical arc motion (down then back)
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: refractionAngle * 0.3, prog: 0.4 },
      { key: 'translateY', val: 0, prog: 1 },
      // Color isolation and enhancement
      {
        key: 'filter',
        val: 'hue-rotate(240deg) saturate(160%) brightness(1.15)',
        prog: 0,
      },
      {
        key: 'filter',
        val: 'hue-rotate(240deg) saturate(160%) brightness(1.15)',
        prog: 1,
      },
      // Slightly reduced opacity
      { key: 'opacity', val: prismIntensity * 0.85, prog: 0 },
      { key: 'opacity', val: prismIntensity * 0.85, prog: 1 },
    ],
  };

  // Create effect objects
  const prefix = effectIdPrefix || 'prism-refraction';
  const redEffect = {
    id: `${prefix}-red`,
    componentId: 'generic',
    data: redChannelData,
  };

  const greenEffect = {
    id: `${prefix}-green`,
    componentId: 'generic',
    data: greenChannelData,
  };

  const blueEffect = {
    id: `${prefix}-blue`,
    componentId: 'generic',
    data: blueChannelData,
  };

  // Return effects in a container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: `${prefix}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10,
      },
    },
    effects: [redEffect, greenEffect, blueEffect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: [redEffect, greenEffect, blueEffect],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'prism-refraction',
  title: 'Prism Refraction Effect',
  description:
    'Internal effect preset that simulates light passing through a prism, creating beautiful rainbow-like RGB color channel separations. Each color channel follows a unique bezier path to create organic, physics-based refraction movement.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'prism', 'refraction', 'chromatic', 'rgb', 'color-separation'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    refractionAngle: 20,
    prismIntensity: 0.7,
    motionCurve: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    convergencePoint: 1,
    duration: 2,
    start: 0,
  },
};

export const prismRefractionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
