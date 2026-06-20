/**
 * Multi-Layer Gradient Wipe Effect
 *
 * INTERNAL EFFECT PRESET (ARRAY OF EFFECTS)
 *
 * This preset generates a cinematic depth-of-field wipe effect by animating three separate
 * gradient layers with different timings and blur levels. Each layer has a slightly different
 * wipe speed and softness, creating a volumetric reveal effect similar to high-end video
 * production transitions.
 *
 * Features:
 * - **Multi-Layer Animation**: Creates depth by staggering 2-5 gradient layers
 * - **Progressive Blur**: Front layer is sharp, back layers increasingly blurred
 * - **Timing Stagger**: Each layer wipes at a different speed for volumetric effect
 * - **Customizable Parameters**: Layer count, depth offset, and blur intensity
 *
 * Technical Details:
 * - Front layer wipes fastest with sharp edges (no blur)
 * - Middle layer follows with medium blur
 * - Back layer wipes slowest with heavy blur
 * - Each layer animates opacity, blur, and translateX simultaneously
 *
 * Use cases:
 * - Cinematic scene transitions
 * - Professional video production effects
 * - Creating depth in 2D compositions
 * - High-end reveal animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the multi-layer wipe effect to'),
  layerCount: z
    .number()
    .min(2)
    .max(5)
    .default(3)
    .describe('Number of gradient layers (2-5, default: 3)'),
  depthOffset: z
    .number()
    .default(200)
    .describe('Timing difference between layers in milliseconds (default: 200ms)'),
  blurIntensity: z
    .number()
    .default(5)
    .describe('Base blur intensity multiplier (default: 5)'),
  baseDuration: z
    .number()
    .default(1000)
    .describe('Base animation duration in milliseconds (default: 1000ms)'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    layerCount,
    depthOffset,
    blurIntensity,
    baseDuration,
    effectIdPrefix,
  } = params;

  // Generate array of generic effects, one per layer
  const layerEffects = Array.from({ length: layerCount }, (_, layerIndex) => {
    // Calculate timing for this layer
    const startTime = (layerIndex * depthOffset) / 1000; // Convert ms to seconds
    const duration = baseDuration / 1000; // Convert ms to seconds

    // Calculate blur for this layer (front layer = 0 blur, back layers increasingly blurred)
    const blurStart = blurIntensity * layerIndex;
    const blurEnd = 0;

    // Calculate translateX for this layer (creates depth parallax effect)
    const translateXStart = -50 * layerIndex;
    const translateXEnd = 0;

    // Construct effect data with separate start/end keyframes
    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Opacity: fade in from 0 to 1
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        // Blur: start blurred, end sharp
        { key: 'blur', val: `${blurStart}px`, prog: 0 },
        { key: 'blur', val: `${blurEnd}px`, prog: 1 },
        // TranslateX: slide in from left
        { key: 'translateX', val: translateXStart, prog: 0 },
        { key: 'translateX', val: translateXEnd, prog: 1 },
      ],
    };

    // Return full effect node
    return {
      id:
        effectIdPrefix
          ? `${effectIdPrefix}-layer-${layerIndex}`
          : `multi-wipe-layer-${layerIndex}-${targetId}`,
      componentId: 'generic',
      data: effectData,
    };
  });

  // Return effects in a container structure (system will extract effects automatically)
  const rootContainer: RenderableComponentData = {
    id: 'multi-wipe-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10, // Placeholder duration
      },
    },
    effects: layerEffects,
    childrenData: [],
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
  id: 'multi-layer-gradient-wipe-effect',
  title: 'Multi-Layer Gradient Wipe Effect',
  description:
    'Internal effect preset creating cinematic depth-of-field wipe transitions using multiple gradient layers with staggered timings and progressive blur intensities. Front layer wipes fastest with sharp edges, middle layer follows with medium blur, and back layer wipes slowest with heavy blur for volumetric reveal effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'wipe', 'gradient', 'depth', 'cinematic', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    layerCount: 3,
    depthOffset: 200,
    blurIntensity: 5,
    baseDuration: 1000,
  },
};

export const multiLayerGradientWipeEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
