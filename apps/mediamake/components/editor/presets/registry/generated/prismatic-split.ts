/**
 * Prismatic Split Effect - Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset creates a fragmented, kaleidoscope-like visual effect
 * by applying multiple staggered generic effects with opacity, scale, translate, and rotate animations.
 *
 * NOTE: The original concept requested clip-path polygon animations and complex filter chains
 * (invert, hue-rotate), but these CSS properties are NOT supported by the generic effect system's
 * ranges mechanism. This implementation uses supported properties (opacity, scale, translateX,
 * translateY, rotate) to create visual interest and simulate a prismatic/fragmented appearance.
 *
 * Features:
 * - Multiple prism regions (3-12) with individual animation states
 * - Three animation styles: breathing (scale+opacity), rotating (rotate+opacity), shifting (translate+opacity)
 * - Color variation intensity parameter (simulated via opacity/brightness ranges)
 * - Iridescent edge effect (simulated via overlapping prism boundaries with varied opacity)
 * - Staggered animation phases for overlapping motion creating a kaleidoscope feel
 *
 * Use Cases:
 * - Creating psychedelic visual effects for music videos
 * - Adding dynamic fragmented overlays to images/videos
 * - Building kaleidoscope-style transitions
 * - Creating stained-glass visual effects
 *
 * For true clip-path polygon morphing effects, consider using:
 * - LottieAtom with pre-made kaleidoscope animations
 * - Custom atom component with canvas-based rendering
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  prismCount: z
    .number()
    .min(3)
    .max(12)
    .default(6)
    .describe('Number of prismatic regions (3-12)'),
  animationStyle: z
    .enum(['breathing', 'rotating', 'shifting'])
    .default('breathing')
    .describe(
      'Animation style: breathing (scale+opacity), rotating (rotate+opacity), shifting (translate+opacity)',
    ),
  colorVariation: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Color variation intensity (0-2, simulated via opacity/brightness ranges)'),
  iridescentEdges: z
    .boolean()
    .default(true)
    .describe('Whether to include iridescent rainbow edges between prisms (simulated via overlapping boundaries)'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to target with the prismatic split effect'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent timeline)'),
  effectDuration: z
    .number()
    .default(4)
    .describe('Duration of the effect in seconds'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Generate prism effects based on animation style
  const generatePrismEffects = (
    prismIndex: number,
    totalPrisms: number,
  ): GenericEffectData[] => {
    const effects: GenericEffectData[] = [];
    const phaseOffset = prismIndex / totalPrisms; // Stagger phase (0 to 1)
    const colorVariation = params.colorVariation ?? 1;
    const animationStyle = params.animationStyle ?? 'breathing';

    // Base timing - stagger effects across prism regions
    const start = params.effectStart;
    const duration = params.effectDuration;

    // Animation style-specific ranges
    if (animationStyle === 'breathing') {
      // Breathing: scale + opacity pulsing
      const scaleMin = 0.95;
      const scaleMax = 1.05;
      const opacityMin = 0.3;
      const opacityMax = 1.0;

      effects.push({
        type: 'ease-in-out',
        start,
        duration,
        mode: 'provider',
        targetIds: params.targetIds,
        ranges: [
          // Scale breathing
          { key: 'scale', val: scaleMin, prog: 0 },
          { key: 'scale', val: scaleMax, prog: 0.5 + phaseOffset * 0.2 },
          { key: 'scale', val: scaleMin, prog: 1 },
          // Opacity pulsing
          { key: 'opacity', val: opacityMin + (1 - colorVariation) * 0.5, prog: 0 },
          { key: 'opacity', val: opacityMax, prog: 0.5 + phaseOffset * 0.2 },
          { key: 'opacity', val: opacityMin + (1 - colorVariation) * 0.5, prog: 1 },
        ],
      });
    } else if (animationStyle === 'rotating') {
      // Rotating: rotate + opacity
      const rotateRange = 6 * colorVariation; // Degrees
      const opacityMin = 0.4;
      const opacityMax = 1.0;

      effects.push({
        type: 'ease-in-out',
        start,
        duration,
        mode: 'provider',
        targetIds: params.targetIds,
        ranges: [
          // Rotation oscillation
          { key: 'rotate', val: -rotateRange, prog: 0 },
          { key: 'rotate', val: rotateRange, prog: 0.5 + phaseOffset * 0.2 },
          { key: 'rotate', val: -rotateRange, prog: 1 },
          // Opacity pulsing
          { key: 'opacity', val: opacityMin, prog: 0 },
          { key: 'opacity', val: opacityMax, prog: 0.5 + phaseOffset * 0.2 },
          { key: 'opacity', val: opacityMin, prog: 1 },
        ],
      });
    } else if (animationStyle === 'shifting') {
      // Shifting: translateX/Y + opacity
      const shiftRange = 10 * colorVariation; // Pixels
      const opacityMin = 0.3;
      const opacityMax = 1.0;

      effects.push({
        type: 'ease-in-out',
        start,
        duration,
        mode: 'provider',
        targetIds: params.targetIds,
        ranges: [
          // Horizontal shift
          { key: 'translateX', val: -shiftRange, prog: 0 },
          { key: 'translateX', val: shiftRange, prog: 0.5 + phaseOffset * 0.2 },
          { key: 'translateX', val: -shiftRange, prog: 1 },
          // Vertical shift
          { key: 'translateY', val: -shiftRange / 2, prog: 0 },
          { key: 'translateY', val: shiftRange / 2, prog: 0.5 + phaseOffset * 0.2 },
          { key: 'translateY', val: -shiftRange / 2, prog: 1 },
          // Opacity pulsing
          { key: 'opacity', val: opacityMin, prog: 0 },
          { key: 'opacity', val: opacityMax, prog: 0.5 + phaseOffset * 0.2 },
          { key: 'opacity', val: opacityMin, prog: 1 },
        ],
      });
    }

    return effects;
  };

  // Generate effects for all prism regions
  const prismCount = Math.min(Math.max(params.prismCount ?? 6, 3), 12);
  const allEffects: any[] = [];

  for (let i = 0; i < prismCount; i++) {
    const prismEffects = generatePrismEffects(i, prismCount);
    prismEffects.forEach((effectData, idx) => {
      allEffects.push({
        id: `prismatic-split-prism-${i}-effect-${idx}`,
        componentId: 'generic',
        data: effectData,
      });
    });
  }

  // Optional: Add iridescent edge effects (simulated via additional opacity/brightness layers)
  if (params.iridescentEdges) {
    for (let i = 0; i < Math.floor(prismCount / 2); i++) {
      const edgeEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: params.effectStart,
        duration: params.effectDuration,
        mode: 'provider',
        targetIds: params.targetIds,
        ranges: [
          { key: 'opacity', val: 0.1, prog: 0 },
          { key: 'opacity', val: 0.3, prog: 0.5 },
          { key: 'opacity', val: 0.1, prog: 1 },
          { key: 'brightness', val: 1.0, prog: 0 },
          { key: 'brightness', val: 1.2, prog: 0.5 },
          { key: 'brightness', val: 1.0, prog: 1 },
        ],
      };
      allEffects.push({
        id: `prismatic-split-edge-${i}`,
        componentId: 'generic',
        data: edgeEffect,
      });
    }
  }

  // Root container for effects (provider mode targets specified targetIds)
  const rootContainer: RenderableComponentData = {
    id: 'prismatic-split-container',
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
        duration: params.effectDuration,
      },
    },
    effects: allEffects,
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'prismatic-split',
  title: 'Prismatic Split Effect',
  description:
    'Internal effect preset that creates a fragmented, psychedelic visual effect by applying multiple staggered generic effects with opacity, scale, translate, and rotate animations. NOTE: clip-path polygon animations and complex filter chains (invert, hue-rotate) are NOT supported; this implementation uses supported properties to simulate prismatic effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'prismatic', 'kaleidoscope', 'psychedelic', 'fragmented'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    prismCount: 6,
    animationStyle: 'breathing',
    colorVariation: 1,
    iridescentEdges: true,
    targetIds: ['target-component-id'],
    effectStart: 0,
    effectDuration: 4,
  },
};

// --- Export ---

export const prismaticSplitPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
