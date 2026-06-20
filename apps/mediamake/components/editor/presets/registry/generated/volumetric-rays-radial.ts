/**
 * VolumetricRaysRadial Internal Effect Preset
 *
 * This internal effect preset simulates volumetric god rays emanating from behind text/media elements.
 * It creates animated light beams using CSS radial gradients with multiple layered effects.
 *
 * Features:
 * - Multiple ray layers with different rotation angles (configurable via rayCount)
 * - Pulsing opacity animation (0 → 0.3 → 0)
 * - Breathing scale effect (0.8 → 1.2 → 0.8)
 * - Depth-of-field blur animation (20px → 0px → 20px)
 * - Staggered timing offsets for natural organic movement
 * - Configurable ray color, intensity, and spread
 *
 * ARRAY OF EFFECTS:
 * Returns an array of generic effects (one per ray layer) that can be applied to target components.
 * Each effect targets a specific ray layer with slightly offset timing for natural motion.
 *
 * Use cases:
 * - Creating cinematic god ray effects behind titles
 * - Adding atmospheric lighting to video overlays
 * - Building dramatic reveal animations with volumetric lighting
 * - Creating pulsing radial light effects for music videos
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply volumetric rays to'),
  rayCount: z
    .number()
    .min(2)
    .max(8)
    .default(4)
    .describe('Number of ray layers (2-8)'),
  rayColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the rays (hex format)'),
  rayIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of ray opacity (0-1)'),
  pulseDuration: z
    .number()
    .default(3000)
    .describe('Duration of one pulse cycle in milliseconds'),
  raySpread: z
    .number()
    .default(45)
    .describe('Angular spread between rays in degrees'),
  start: z
    .number()
    .optional()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  duration: z
    .number()
    .optional()
    .default(10)
    .describe('Duration of the effect in seconds'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Calculate ray parameters
  const rayCount = params.rayCount;
  const rayColor = params.rayColor;
  const maxOpacity = params.rayIntensity * 0.3; // Max opacity scaled by intensity
  const pulseDurationSec = params.pulseDuration / 1000;
  const raySpread = params.raySpread;

  // Generate ray layer effects
  const rayEffects: Array<{
    id: string;
    componentId: string;
    data: GenericEffectData;
  }> = [];

  for (let i = 0; i < rayCount; i++) {
    const rotationAngle = (i * raySpread) % 360;
    const timingOffset = (i / rayCount) * pulseDurationSec * 0.3; // Stagger by 30% of pulse duration

    // Create radial gradient with ray color
    const rayGradient = `radial-gradient(ellipse at center, ${hexToRgba(rayColor, maxOpacity)} 0%, transparent 70%)`;

    // Create ray layer effect with pulsing opacity, breathing scale, and depth-of-field blur
    const rayEffect = {
      id: `${params.effectIdPrefix || 'volumetric-ray'}-layer-${i}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: params.start + timingOffset,
        duration: params.duration,
        mode: 'provider' as const,
        targetIds: params.targetIds,
        ranges: [
          // Opacity pulse (0 → 0.15 → max → 0.15 → 0)
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: maxOpacity * 0.5, prog: 0.25 },
          { key: 'opacity', val: maxOpacity, prog: 0.5 },
          { key: 'opacity', val: maxOpacity * 0.5, prog: 0.75 },
          { key: 'opacity', val: 0, prog: 1 },
          // Scale breathing (0.8 → 1.0 → 1.2 → 1.0 → 0.8)
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1.0, prog: 0.25 },
          { key: 'scale', val: 1.2, prog: 0.5 },
          { key: 'scale', val: 1.0, prog: 0.75 },
          { key: 'scale', val: 0.8, prog: 1 },
          // Blur depth-of-field (20px → 10px → 0px → 10px → 20px)
          { key: 'filter', val: 'blur(20px)', prog: 0 },
          { key: 'filter', val: 'blur(10px)', prog: 0.25 },
          { key: 'filter', val: 'blur(0px)', prog: 0.5 },
          { key: 'filter', val: 'blur(10px)', prog: 0.75 },
          { key: 'filter', val: 'blur(20px)', prog: 1 },
          // Rotation (constant per layer)
          { key: 'rotate', val: rotationAngle, prog: 0 },
          { key: 'rotate', val: rotationAngle, prog: 1 },
          // Background gradient (constant)
          { key: 'background', val: rayGradient, prog: 0 },
          { key: 'background', val: rayGradient, prog: 1 },
        ],
      } as GenericEffectData,
    };

    rayEffects.push(rayEffect);
  }

  // Return output with effects container
  return {
    output: {
      childrenData: [
        {
          id: 'volumetric-rays-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: rayEffects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: params.duration || 10,
            },
          },
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                overflow: 'hidden',
                mixBlendMode: 'screen',
              },
            },
          },
        } as RenderableComponentData,
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'volumetricRaysRadial',
  title: 'VolumetricRaysRadial',
  description:
    'Internal effect preset that simulates volumetric god rays emanating from behind text/media elements. Creates animated light beams using CSS gradients with pulsing opacity (0→0.3), breathing scale (0.8→1.2), and depth-of-field blur (20px→0px) animations. Supports configurable rayCount, rayColor, rayIntensity, pulseDuration, and raySpread parameters.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'volumetric', 'god-rays', 'radial', 'light', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    rayCount: 4,
    rayColor: '#ffffff',
    rayIntensity: 0.5,
    pulseDuration: 3000,
    raySpread: 45,
    start: 0,
    duration: 10,
  },
};

export const volumetricRaysRadialPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
