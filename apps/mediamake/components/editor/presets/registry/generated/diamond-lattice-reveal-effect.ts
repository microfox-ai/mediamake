/**
 * Diamond Lattice Reveal Effect
 *
 * Internal effect preset that generates layered AnimationRange[] arrays for diamond/rhombus
 * clip-path animations with rotation, opacity gradients, and phase-shifted timing to create
 * crystalline lattice transition patterns.
 *
 * ARRAY OF EFFECTS:
 * This preset returns multiple generic effects with phase-shifted start times calculated using
 * sine wave modulation (Math.sin(index * 0.5) * phaseShift). Each effect targets the provided
 * targetIds array and uses provider mode with diamond-shaped clip-paths that interweave and
 * rotate, forming a crystalline lattice structure with depth through overlapping animations.
 *
 * Features:
 * - Multiple diamond-shaped clip-path animations that interweave
 * - Rotation patterns with sine wave modulation for organic motion
 * - Opacity gradients fading from center to edges
 * - Phase-shifted timing for kaleidoscope effects
 * - Configurable lattice complexity and diamond aspect ratio
 * - Z-index layering for depth (alternating foreground/background)
 *
 * Use cases:
 * - Creating intricate geometric reveal patterns
 * - Building crystalline transition effects
 * - Adding mesmerizing kaleidoscope animations
 * - Creating depth through overlapping diamond layers
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
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the effects to'),
  latticeSize: z
    .number()
    .min(2)
    .max(10)
    .default(6)
    .describe('Number of diamond layers (2-10)'),
  diamondRatio: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Aspect ratio of diamonds (width/height)'),
  rotationAmplitude: z
    .number()
    .min(0)
    .max(180)
    .default(45)
    .describe('Maximum rotation angle in degrees'),
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Animation duration in seconds'),
  layerCount: z
    .number()
    .min(1)
    .max(3)
    .default(2)
    .describe('Number of overlapping layers (1-3)'),
  phaseShift: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Time offset between layers in seconds'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effects (relative to parent)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    latticeSize,
    diamondRatio,
    rotationAmplitude,
    duration,
    layerCount,
    phaseShift,
    effectStart,
  } = params;

  // Helper function to generate diamond/rhombus clip-path
  const generateDiamondPath = (
    index: number,
    phase: number,
    latticeSize: number,
    diamondRatio: number,
  ): string[] => {
    const centerX = 50;
    const centerY = 50;
    const baseWidth = 40 / latticeSize; // Scale down with more layers
    const baseHeight = baseWidth / diamondRatio;

    // Offset based on index for lattice pattern
    const offsetX = ((index % latticeSize) - latticeSize / 2) * (baseWidth * 1.2);
    const offsetY = (Math.floor(index / latticeSize) - latticeSize / 2) * (baseHeight * 1.2);

    // Calculate diamond vertices
    const top = `${centerX + offsetX}% ${centerY + offsetY - baseHeight / 2}%`;
    const right = `${centerX + offsetX + baseWidth / 2}% ${centerY + offsetY}%`;
    const bottom = `${centerX + offsetX}% ${centerY + offsetY + baseHeight / 2}%`;
    const left = `${centerX + offsetX - baseWidth / 2}% ${centerY + offsetY}%`;

    // Phase progression: start hidden, reveal, hide
    const hiddenPath = `polygon(${centerX + offsetX}% ${centerY + offsetY}%, ${centerX + offsetX}% ${centerY + offsetY}%, ${centerX + offsetX}% ${centerY + offsetY}%, ${centerX + offsetX}% ${centerY + offsetY}%)`;
    const visiblePath = `polygon(${top}, ${right}, ${bottom}, ${left})`;

    return [hiddenPath, visiblePath, visiblePath, hiddenPath];
  };

  // Generate effects for each layer and lattice position
  const effects: any[] = [];
  const totalPositions = latticeSize * latticeSize;

  for (let layer = 0; layer < layerCount; layer++) {
    for (let position = 0; position < totalPositions; position++) {
      const effectIndex = layer * totalPositions + position;

      // Calculate phase-shifted start time using sine wave modulation
      const phaseOffset = Math.sin(effectIndex * 0.5) * phaseShift;
      const effectStartTime = effectStart + phaseOffset;

      // Generate diamond clip-path values
      const diamondPaths = generateDiamondPath(
        position,
        layer,
        latticeSize,
        diamondRatio,
      );

      // Calculate z-index for layering (alternate foreground/background)
      const zIndexValue = (effectIndex % 2) + 1;

      // Create effect data
      const effectData: GenericEffectData = {
        type: 'ease-in-out',
        start: effectStartTime,
        duration: duration,
        mode: 'provider',
        targetIds: targetIds,
        ranges: [
          // Clip-path animation (diamond reveal)
          { key: 'clipPath', val: diamondPaths[0], prog: 0 },
          { key: 'clipPath', val: diamondPaths[1], prog: 0.4 },
          { key: 'clipPath', val: diamondPaths[2], prog: 0.8 },
          { key: 'clipPath', val: diamondPaths[3], prog: 1 },
          // Rotation pattern (oscillating)
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: rotationAmplitude, prog: 0.33 },
          { key: 'rotate', val: -rotationAmplitude, prog: 0.66 },
          { key: 'rotate', val: 0, prog: 1 },
          // Opacity gradient (center to edges)
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.2 },
          { key: 'opacity', val: 1, prog: 0.8 },
          { key: 'opacity', val: 0, prog: 1 },
          // Z-index for layering
          { key: 'zIndex', val: zIndexValue, prog: 0 },
          { key: 'zIndex', val: zIndexValue, prog: 1 },
        ],
      };

      // Create effect node
      const effect = {
        id: `diamond-lattice-effect-${layer}-${position}`,
        componentId: 'generic',
        data: effectData,
      };

      effects.push(effect);
    }
  }

  // Return effects in a container structure (system extracts effects)
  const rootContainer: RenderableComponentData = {
    id: 'diamond-lattice-effect-container',
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
        duration: duration + phaseShift * 2,
      },
    },
    effects: effects,
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
  id: 'diamond-lattice-reveal-effect',
  title: 'Diamond Lattice Reveal Effect',
  description:
    'Internal effect preset that generates layered AnimationRange[] arrays for diamond/rhombus clip-path animations with rotation, opacity gradients, and phase-shifted timing to create crystalline lattice transition patterns. Returns effect data structures for use with targetIds.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'diamond', 'lattice', 'geometric', 'crystalline', 'reveal', 'clip-path', 'kaleidoscope'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    latticeSize: 6,
    diamondRatio: 1,
    rotationAmplitude: 45,
    duration: 2,
    layerCount: 2,
    phaseShift: 0.3,
    effectStart: 0,
  },
};

export const diamondLatticeRevealEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
