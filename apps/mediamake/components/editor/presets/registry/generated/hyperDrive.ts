/**
 * HyperDrive Internal Effect Preset
 *
 * ARRAY OF EFFECTS
 *
 * Creates an extreme motion blur tunnel effect for images and videos.
 * Simulates traveling at hyperspeed by combining radial blur simulation,
 * scale pulsing, brightness modulation, and edge vignetting.
 *
 * Features:
 * - Radial blur simulation via progressive filter increase
 * - Scale pulsing synchronized with blur intensity
 * - Brightness modulation for light flashing effect
 * - Edge vignetting using brightness/contrast filters
 * - Optional light streaks with opacity fade
 * - Radial distortion via scaleX/scaleY expansion
 *
 * Use cases:
 * - Hyperspeed travel effects for sci-fi content
 * - Extreme motion blur for action sequences
 * - Warp tunnel effects for transitions
 * - Speed line effects emanating from center
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the hyperdrive effect to'),
  duration: z
    .number()
    .default(1.8)
    .optional()
    .describe('Duration of the hyperdrive effect in seconds'),
  intensity: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .describe('Drive intensity multiplier (0-3, affects blur and scale)'),
  tunnelDepth: z
    .number()
    .default(1)
    .describe('Tunnel depth factor for radial distortion'),
  lightStreaks: z
    .boolean()
    .default(false)
    .optional()
    .describe('Whether to include light streaks effect'),
  centerPoint: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .default({ x: 0.5, y: 0.5 })
    .optional()
    .describe('Center point for radial effects (0-1 normalized coordinates)'),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect relative to component'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const intensity = params.intensity ?? 1;
  const duration = params.duration ?? 1.8;
  const tunnelDepth = params.tunnelDepth ?? 1;
  const lightStreaks = params.lightStreaks ?? false;
  const effectStart = params.effectStart ?? 0;
  const targetIds = params.targetIds || [];

  const effects: any[] = [];

  // 1. Radial Blur Effect - simulates motion blur from center outward
  const radialBlurEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'filter', val: 'blur(0px)', prog: 0 },
      { key: 'filter', val: `blur(${intensity * 8}px)`, prog: 0.5 },
      { key: 'filter', val: `blur(${intensity * 15}px)`, prog: 1 },
    ],
  };

  effects.push({
    id: `hyperdrive-blur-${targetIds.join('-')}`,
    componentId: 'generic',
    data: radialBlurEffect,
  });

  // 2. Scale Pulse Effect - creates expansion sensation
  const scalePulseEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 1.0 + intensity * 0.1, prog: 0.3 },
      { key: 'scale', val: 1.0 + intensity * 0.15, prog: 0.5 },
      { key: 'scale', val: 1.0 + intensity * 0.2, prog: 0.7 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  effects.push({
    id: `hyperdrive-scale-${targetIds.join('-')}`,
    componentId: 'generic',
    data: scalePulseEffect,
  });

  // 3. Brightness Modulation Effect - simulates light intensity changes
  const brightnessEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'brightness', val: 0.8, prog: 0 },
      { key: 'brightness', val: 0.8 + intensity * 0.15, prog: 0.25 },
      { key: 'brightness', val: 1.0 + intensity * 0.2, prog: 0.5 },
      { key: 'brightness', val: 0.9 + intensity * 0.1, prog: 0.75 },
      { key: 'brightness', val: 0.8, prog: 1 },
    ],
  };

  effects.push({
    id: `hyperdrive-brightness-${targetIds.join('-')}`,
    componentId: 'generic',
    data: brightnessEffect,
  });

  // 4. Vignette Effect - darkens edges for tunnel vision
  const vignetteEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'filter', val: 'brightness(1) contrast(1)', prog: 0 },
      { key: 'filter', val: 'brightness(0.7) contrast(1.3)', prog: 0.5 },
      { key: 'filter', val: 'brightness(1) contrast(1)', prog: 1 },
    ],
  };

  effects.push({
    id: `hyperdrive-vignette-${targetIds.join('-')}`,
    componentId: 'generic',
    data: vignetteEffect,
  });

  // 5. Light Streaks Effect (Optional) - creates radiating speed lines
  if (lightStreaks) {
    const lightStreaksEffect: GenericEffectData = {
      type: 'ease-out',
      start: effectStart,
      duration: duration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: intensity * 0.3, prog: 0.3 },
        { key: 'opacity', val: intensity * 0.5, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    effects.push({
      id: `hyperdrive-streaks-${targetIds.join('-')}`,
      componentId: 'generic',
      data: lightStreaksEffect,
    });
  }

  // 6. Radial Distortion Effect - creates outward space warping
  const radialDistortionEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'scaleX', val: 1, prog: 0 },
      { key: 'scaleX', val: 1.0 + tunnelDepth * 0.05, prog: 0.5 },
      { key: 'scaleX', val: 1, prog: 1 },
      { key: 'scaleY', val: 1, prog: 0 },
      { key: 'scaleY', val: 1.0 + tunnelDepth * 0.05, prog: 0.5 },
      { key: 'scaleY', val: 1, prog: 1 },
    ],
  };

  effects.push({
    id: `hyperdrive-distortion-${targetIds.join('-')}`,
    componentId: 'generic',
    data: radialDistortionEffect,
  });

  // Return effects in container structure
  // System will extract effects when _internalPresetOutput: 'effects' is set
  return {
    output: {
      childrenData: [
        {
          id: 'hyperdrive-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
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
  id: 'hyperDrive',
  title: 'HyperDrive Motion Blur Effect',
  description:
    'Internal effect preset that creates an extreme motion blur tunnel effect for images and videos. Simulates traveling at hyperspeed by combining radial blur simulation, scale pulsing, brightness modulation, and edge vignetting. The effect creates speed lines emanating from center outward, suggesting incredible velocity through space.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'hyperdrive', 'motion-blur', 'tunnel', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    duration: 1.8,
    intensity: 1,
    tunnelDepth: 1,
    lightStreaks: false,
    centerPoint: { x: 0.5, y: 0.5 },
    effectStart: 0,
  },
};

export const hyperDrivePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
