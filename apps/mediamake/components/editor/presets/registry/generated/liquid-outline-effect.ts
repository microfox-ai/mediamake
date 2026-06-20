/**
 * Liquid Outline Effect Preset
 *
 * Creates organic, viscous fluid borders with surface tension animations. The effect simulates
 * liquid flowing and dripping with realistic physics-based motion. Features morphing blob-like
 * outlines that flow and merge using border-radius animations and transform properties.
 *
 * Features:
 * - **Viscous Fluid Borders**: Organic liquid-like outlines with surface tension
 * - **Physics-Based Motion**: Realistic acceleration curves and gravity effects
 * - **Border-Radius Morphing**: Independent corner animations for blob-like shapes
 * - **Gravity Simulation**: Directional flow with configurable strength
 * - **Droplet Effects**: Optional dripping liquid droplets with stretch
 * - **Configurable Viscosity**: Control flow speed and smoothness
 * - **Surface Tension**: Adjustable shape retention strength
 *
 * Use cases:
 * - Creating organic animated borders for titles or containers
 * - Building liquid-themed visual effects
 * - Adding dynamic flowing outlines to media content
 * - Creating dripping or melting text effects
 * - Building fluid transition animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .min(1)
    .describe(
      'Array of component IDs to apply the liquid outline effect to',
    ),
  viscosity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .describe(
      'How quickly the liquid flows (0.1 = very slow/thick, 1 = fast/thin)',
    ),
  surfaceTension: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe(
      'How much the outline wants to maintain its shape (0 = loose, 1 = tight)',
    ),
  gravity: z
    .object({
      direction: z
        .number()
        .min(0)
        .max(360)
        .default(180)
        .describe(
          'Direction of gravity in degrees (0 = right, 90 = down, 180 = left, 270 = up)',
        ),
      strength: z
        .number()
        .min(0)
        .max(2)
        .default(0.5)
        .describe('Strength of gravity effect (0 = none, 2 = strong)'),
    })
    .describe('Gravity configuration for flow direction'),
  droplets: z
    .boolean()
    .default(true)
    .describe('Whether to show dripping liquid droplets'),
  borderColor: z
    .string()
    .default('#00ffff')
    .describe('Color of the liquid border (CSS color value)'),
  borderWidth: z
    .number()
    .min(1)
    .max(20)
    .default(4)
    .describe('Width of the liquid border in pixels'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of the glow effect (0 = no glow, 1 = strong glow)'),
  effectDuration: z
    .number()
    .min(1)
    .max(30)
    .default(10)
    .describe('Duration of the effect in seconds'),
  effectStart: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the effect relative to parent'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate liquid morph keyframes based on viscosity
  const generateLiquidMorph = (viscosity: number, surfaceTension: number) => {
    // More viscous = slower, smoother transitions
    // Less surface tension = more distortion
    const distortionFactor = 1 - surfaceTension;
    const baseDistortion = 20 + distortionFactor * 30; // 20-50% distortion
    const altDistortion = 70 - distortionFactor * 30; // 70-40% distortion

    return [
      {
        key: 'borderRadius',
        val: `${30 + baseDistortion * 0.5}% ${70 - baseDistortion * 0.5}% ${70 - baseDistortion * 0.5}% ${30 + baseDistortion * 0.5}% / ${30 + baseDistortion * 0.5}% ${30 + baseDistortion * 0.5}% ${70 - baseDistortion * 0.5}% ${70 - baseDistortion * 0.5}%`,
        prog: 0,
      },
      {
        key: 'borderRadius',
        val: `${altDistortion - baseDistortion}% ${30 + baseDistortion}% ${30 + baseDistortion}% ${altDistortion - baseDistortion}% / ${altDistortion - baseDistortion}% ${altDistortion - baseDistortion}% ${30 + baseDistortion}% ${30 + baseDistortion}%`,
        prog: 0.25,
      },
      {
        key: 'borderRadius',
        val: `${40 + baseDistortion * 0.3}% ${60 - baseDistortion * 0.3}% ${40 + baseDistortion * 0.3}% ${60 - baseDistortion * 0.3}% / ${60 - baseDistortion * 0.3}% ${40 + baseDistortion * 0.3}% ${60 - baseDistortion * 0.3}% ${40 + baseDistortion * 0.3}%`,
        prog: 0.5,
      },
      {
        key: 'borderRadius',
        val: `${60 - baseDistortion * 0.5}% ${40 + baseDistortion * 0.5}% ${60 - baseDistortion * 0.5}% ${40 + baseDistortion * 0.5}% / ${40 + baseDistortion * 0.5}% ${60 - baseDistortion * 0.5}% ${40 + baseDistortion * 0.5}% ${60 - baseDistortion * 0.5}%`,
        prog: 0.75,
      },
      {
        key: 'borderRadius',
        val: `${30 + baseDistortion * 0.5}% ${70 - baseDistortion * 0.5}% ${70 - baseDistortion * 0.5}% ${30 + baseDistortion * 0.5}% / ${30 + baseDistortion * 0.5}% ${30 + baseDistortion * 0.5}% ${70 - baseDistortion * 0.5}% ${70 - baseDistortion * 0.5}%`,
        prog: 1,
      },
    ];
  };

  // Helper function to calculate gravity transform
  const calculateGravityTransform = (
    direction: number,
    strength: number,
  ) => {
    const radians = (direction * Math.PI) / 180;
    const translateX = Math.cos(radians) * strength * 10;
    const translateY = Math.sin(radians) * strength * 10;
    return [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: translateX, prog: 1 },
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: translateY, prog: 1 },
    ];
  };

  // Calculate easing based on viscosity (more viscous = smoother/slower)
  const easingType = params.viscosity > 0.7 ? 'ease-in-out' : 'ease-out';

  // Generate liquid morph keyframes
  const liquidMorphRanges = generateLiquidMorph(
    params.viscosity,
    params.surfaceTension,
  );

  // Generate gravity transform
  const gravityTransformRanges = calculateGravityTransform(
    params.gravity.direction,
    params.gravity.strength,
  );

  // Create the main liquid border effect
  const liquidBorderEffect = {
    id: `liquid-outline-morph-${params.targetIds[0]}`,
    componentId: 'generic' as const,
    data: {
      type: easingType,
      start: params.effectStart,
      duration: params.effectDuration / params.viscosity, // Adjust duration by viscosity
      mode: 'provider' as const,
      targetIds: params.targetIds,
      ranges: [...liquidMorphRanges, ...gravityTransformRanges],
    },
  };

  // Create glow effect if intensity > 0
  const glowEffect =
    params.glowIntensity > 0
      ? {
          id: `liquid-outline-glow-${params.targetIds[0]}`,
          componentId: 'generic' as const,
          data: {
            type: 'ease-in-out' as const,
            start: params.effectStart,
            duration: params.effectDuration / 2,
            mode: 'provider' as const,
            targetIds: params.targetIds,
            ranges: [
              {
                key: 'filter',
                val: `drop-shadow(0 0 ${params.glowIntensity * 20}px ${params.borderColor})`,
                prog: 0,
              },
              {
                key: 'filter',
                val: `drop-shadow(0 0 ${params.glowIntensity * 40}px ${params.borderColor})`,
                prog: 0.5,
              },
              {
                key: 'filter',
                val: `drop-shadow(0 0 ${params.glowIntensity * 20}px ${params.borderColor})`,
                prog: 1,
              },
            ],
          },
        }
      : null;

  // Create droplet components if enabled
  const dropletComponents: any[] = [];
  const dropletEffects: any[] = [];

  if (params.droplets) {
    const dropletCount = 3;
    const gravityRadians = (params.gravity.direction * Math.PI) / 180;

    for (let i = 0; i < dropletCount; i++) {
      const dropletId = `liquid-droplet-${i}`;
      const startDelay = params.effectStart + (i + 1) * 2;
      const dropletDuration = 3 / params.viscosity; // More viscous = slower drip

      // Position based on gravity direction
      const startX = 20 + i * 30;
      const startY = 10 + i * 15;

      // Movement direction based on gravity
      const moveDistance = 100 * params.gravity.strength;
      const endX = startX + Math.cos(gravityRadians) * moveDistance;
      const endY = startY + Math.sin(gravityRadians) * moveDistance;

      dropletComponents.push({
        id: dropletId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class="liquid-droplet" style="width: ${15 - i * 2}px; height: ${15 - i * 2}px; border-radius: 50%; background: ${params.borderColor}; position: absolute; top: ${startY}%; left: ${startX}%; opacity: 0;"></div>`,
          className: 'absolute inset-0 pointer-events-none',
        },
        context: {
          timing: {
            start: startDelay,
            duration: dropletDuration,
          },
        },
      });

      // Create droplet drip effect with acceleration
      dropletEffects.push({
        id: `liquid-droplet-drip-${i}`,
        componentId: 'generic' as const,
        data: {
          type: 'ease-in' as const, // Gravity acceleration
          start: 0,
          duration: dropletDuration,
          mode: 'provider' as const,
          targetIds: [dropletId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.1 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'translateX', val: 0, prog: 0 },
            {
              key: 'translateX',
              val: (endX - startX) * 5,
              prog: 1,
            },
            { key: 'translateY', val: 0, prog: 0 },
            {
              key: 'translateY',
              val: (endY - startY) * 5,
              prog: 1,
            },
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 1.5 + params.gravity.strength * 0.5, prog: 1 },
          ],
        },
      });
    }
  }

  // Build the container with all effects
  const liquidOutlineContainer = {
    id: 'liquid-outline-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          border: `${params.borderWidth}px solid ${params.borderColor}`,
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          background: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: params.effectStart,
        duration: params.effectDuration,
      },
    },
    effects: [liquidBorderEffect, ...(glowEffect ? [glowEffect] : [])],
    childrenData: dropletComponents.map((droplet, index) => ({
      ...droplet,
      effects: [dropletEffects[index]],
    })) as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [liquidOutlineContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'liquid-outline-effect',
  title: 'Liquid Outline Effect',
  description:
    'Creates organic, viscous fluid borders with surface tension animations. Features blob-like outlines that flow and merge using border-radius morphing. Includes parameters for viscosity (flow speed), surface tension (shape retention), gravity direction, and optional droplet effects. Uses physics-based interpolation for realistic liquid motion with dripping and acceleration curves.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'liquid',
    'fluid',
    'organic',
    'border',
    'outline',
    'morph',
    'viscous',
    'surface-tension',
    'gravity',
    'droplets',
    'drip',
    'flow',
    'physics',
  ],
  dependencies: {},
  defaultInputParams: {
    targetIds: ['component-1'],
    viscosity: 0.5,
    surfaceTension: 0.5,
    gravity: {
      direction: 180,
      strength: 0.5,
    },
    droplets: true,
    borderColor: '#00ffff',
    borderWidth: 4,
    glowIntensity: 0.3,
    effectDuration: 10,
    effectStart: 0,
  },
};

// Export the preset
export const liquidOutlineEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
