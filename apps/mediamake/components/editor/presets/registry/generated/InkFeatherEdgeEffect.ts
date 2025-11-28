/**
 * InkFeatherEdgeEffect - Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect creates soft, feathered edges like ink bleeding into paper fibers.
 * It combines CSS filter chains (drop-shadow with multiple offsets, contrast adjustments) with
 * transform micro-jitter animations to simulate organic ink diffusion on textured paper.
 *
 * Returns an array of TWO effects:
 * 1. Filter effect: Animates drop-shadow spread (0-8px), contrast (80-120%), and applies SVG blur
 * 2. Jitter effect: Micro-oscillations using translateX/Y (±2px) for paper texture interaction
 *
 * Parameters:
 * - targetId: Component ID to apply the effect to
 * - effectStart: Start time of the effect (relative to parent)
 * - effectDuration: Duration of the effect
 * - featherRadius: Edge softness intensity (0-20px, default: 8)
 * - inkDensity: Contrast/opacity multiplier (0.5-1.5, default: 1.0)
 * - fiberTexture: Jitter intensity (0-5px, default: 2)
 * - edgeColor: Shadow color for bleeding effect (default: rgba(0,0,0,0.3))
 * - bleedDirection: Angle of primary bleed direction (0-360deg, default: 135)
 *
 * Advanced Usage:
 * Apply to any component to create organic, irregular edges with natural variation.
 * Perfect for simulating ink on textured paper, watercolor effects, or vintage print aesthetics.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply ink feather edge effect to'),
  effectStart: z.number().describe('Start time of the effect (relative to parent component)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  featherRadius: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .optional()
    .describe('Edge softness intensity in pixels (0-20px, default: 8)'),
  inkDensity: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(1.0)
    .optional()
    .describe('Contrast/opacity multiplier for ink density (0.5-1.5, default: 1.0)'),
  fiberTexture: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .optional()
    .describe('Jitter intensity for paper texture in pixels (0-5px, default: 2)'),
  edgeColor: z
    .string()
    .default('rgba(0, 0, 0, 0.3)')
    .optional()
    .describe('Shadow color for bleeding effect (CSS color, default: rgba(0,0,0,0.3))'),
  bleedDirection: z
    .number()
    .min(0)
    .max(360)
    .default(135)
    .optional()
    .describe('Angle of primary bleed direction in degrees (0-360, default: 135)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const featherRadius = params.featherRadius ?? 8;
  const inkDensity = params.inkDensity ?? 1.0;
  const fiberTexture = params.fiberTexture ?? 2;
  const edgeColor = params.edgeColor ?? 'rgba(0, 0, 0, 0.3)';
  const bleedDirection = params.bleedDirection ?? 135;

  // Helper function to calculate shadow offset based on direction
  const calculateShadowOffset = (radius: number, angle: number) => {
    const radians = (angle * Math.PI) / 180;
    const x = Math.cos(radians) * radius;
    const y = Math.sin(radians) * radius;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  // Helper function to create noise pattern for jitter (pseudo-random oscillation)
  // Uses time-based sine waves with different frequencies for organic feel
  const createJitterKeyframes = (intensity: number) => {
    const keyframes: Array<{ key: string; val: number; prog: number }> = [];
    const steps = 20; // Number of keyframe steps for smooth oscillation

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      // Multiple sine waves with different frequencies for organic variation
      const jitterX =
        Math.sin(progress * Math.PI * 6.3) * intensity * 0.7 +
        Math.sin(progress * Math.PI * 11.1) * intensity * 0.3;
      const jitterY =
        Math.cos(progress * Math.PI * 7.7) * intensity * 0.6 +
        Math.cos(progress * Math.PI * 9.4) * intensity * 0.4;

      keyframes.push({ key: 'translateX', val: jitterX, prog: progress });
      keyframes.push({ key: 'translateY', val: jitterY, prog: progress });
    }

    return keyframes;
  };

  // Effect 1: Filter effect (drop-shadow + contrast + blur)
  const filterRanges: Array<{ key: string; val: any; prog: number }> = [];

  // Shadow spread animation: 0px → featherRadius → featherRadius (fade-in hold)
  const shadowKeyframes = [
    { spread: 0, opacity: 0, prog: 0 },
    { spread: featherRadius, opacity: 1, prog: 0.3 },
    { spread: featherRadius, opacity: 1, prog: 1 },
  ];

  shadowKeyframes.forEach((kf) => {
    const offset = calculateShadowOffset(kf.spread, bleedDirection);
    // Parse edgeColor to extract RGB values for opacity control
    const colorMatch = edgeColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    let shadowColor = edgeColor;
    if (colorMatch) {
      const [, r, g, b] = colorMatch;
      shadowColor = `rgba(${r}, ${g}, ${b}, ${kf.opacity * 0.3})`;
    }

    // Multiple drop-shadows at different offsets for organic diffusion
    const filterValue = `
      drop-shadow(${offset.x}px ${offset.y}px ${kf.spread}px ${shadowColor})
      drop-shadow(${-offset.x * 0.5}px ${-offset.y * 0.5}px ${kf.spread * 0.7}px ${shadowColor})
      drop-shadow(${offset.y * 0.3}px ${-offset.x * 0.3}px ${kf.spread * 0.5}px ${shadowColor})
      blur(${kf.spread * 0.1}px)
    `.trim().replace(/\s+/g, ' ');

    filterRanges.push({
      key: 'filter',
      val: filterValue,
      prog: kf.prog,
    });
  });

  // Contrast animation: 100% → 80% → 120% (density variation)
  const contrastKeyframes = [
    { contrast: 1.0, prog: 0 },
    { contrast: 0.8 + (inkDensity - 1.0) * 0.4, prog: 0.5 },
    { contrast: 1.2 + (inkDensity - 1.0) * 0.2, prog: 1 },
  ];

  contrastKeyframes.forEach((kf) => {
    filterRanges.push({
      key: 'contrast',
      val: kf.contrast,
      prog: kf.prog,
    });
  });

  // Opacity tied to ink density
  filterRanges.push({ key: 'opacity', val: 0.7 * inkDensity, prog: 0 });
  filterRanges.push({ key: 'opacity', val: 1.0 * inkDensity, prog: 0.3 });
  filterRanges.push({ key: 'opacity', val: 0.95 * inkDensity, prog: 1 });

  const filterEffect = {
    id: params.effectId
      ? `${params.effectId}-filter`
      : `ink-feather-filter-${params.targetId}`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: params.effectStart,
      duration: params.effectDuration,
      mode: 'provider',
      targetIds: [params.targetId],
      ranges: filterRanges,
    } as GenericEffectData,
  };

  // Effect 2: Transform jitter (micro-oscillations)
  const jitterRanges = createJitterKeyframes(fiberTexture);

  const jitterEffect = {
    id: params.effectId
      ? `${params.effectId}-jitter`
      : `ink-feather-jitter-${params.targetId}`,
    componentId: 'generic',
    data: {
      type: 'linear', // Linear for continuous oscillation
      start: params.effectStart,
      duration: params.effectDuration,
      mode: 'provider',
      targetIds: [params.targetId],
      ranges: jitterRanges,
    } as GenericEffectData,
  };

  // Return both effects
  return {
    output: {
      childrenData: [
        {
          id: 'ink-feather-edge-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [filterEffect, jitterEffect],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'InkFeatherEdgeEffect',
  title: 'InkFeatherEdgeEffect',
  description:
    'Internal effect preset that creates soft, feathered edges like ink bleeding into paper fibers. Combines CSS filter chains (drop-shadow with multiple offsets, contrast adjustments) with transform micro-jitter animations to simulate organic ink diffusion on textured paper. Returns generic effects for filter animations and transform oscillations that can be applied to target components.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'ink', 'feather', 'edge', 'filter', 'transform', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 3,
    featherRadius: 8,
    inkDensity: 1.0,
    fiberTexture: 2,
    edgeColor: 'rgba(0, 0, 0, 0.3)',
    bleedDirection: 135,
  },
};

// Export preset
export const InkFeatherEdgeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
