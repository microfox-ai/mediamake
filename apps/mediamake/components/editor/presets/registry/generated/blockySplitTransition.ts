/**
 * Blocky Split Transition Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset generates multiple generic effects to create a grid-based
 * split transition. Each block in the grid animates independently with scale, rotation,
 * and opacity changes. Blocks further from the center animate later, creating a
 * fragmented digital glitch aesthetic like corrupted data or a malfunctioning CRT monitor.
 *
 * This preset returns effect configurations only - the visual grid structure must be
 * created by the consuming preset. The consuming preset is responsible for:
 * 1. Dividing the content into grid sections (gridSize × gridSize)
 * 2. Providing block IDs via the targetIds parameter
 * 3. Rendering the actual visual grid structure
 *
 * Features:
 * - **Grid-Based Animation**: Divides target into gridSize × gridSize blocks
 * - **Staggered Timing**: Blocks further from center animate later
 * - **Multi-Property Animation**: Scale, rotation, and opacity changes
 * - **Transition Types**: 'scatter' (random) or 'collapse' (center-out)
 * - **Configurable Parameters**: Grid size, stagger delay, rotation amount
 *
 * Parameters:
 * - gridSize: Number of blocks per row/column (default: 3)
 * - staggerDelay: Delay between block animations in seconds (default: 0.05)
 * - rotationAmount: Rotation in degrees (default: 45)
 * - transitionType: 'scatter' or 'collapse' animation pattern
 * - targetIds: Array of block element IDs to target
 *
 * Technical Details:
 * - Each block gets a generic effect with mode: 'provider'
 * - Effects are staggered based on distance from center
 * - All effects have duration of 0.6s with ease-in-out easing
 * - Returns array of effect objects to be applied to grid blocks
 *
 * Use cases:
 * - Creating digital glitch transitions
 * - Fragmented reveal/hide animations
 * - Corrupted data visual effects
 * - Malfunctioning screen aesthetics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  gridSize: z
    .number()
    .min(2)
    .max(10)
    .default(3)
    .describe('Number of blocks per row and column in the grid'),
  staggerDelay: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Delay in seconds between each block animation'),
  rotationAmount: z
    .number()
    .min(-360)
    .max(360)
    .default(45)
    .describe('Rotation amount in degrees for each block'),
  transitionType: z
    .enum(['scatter', 'collapse'])
    .default('scatter')
    .describe(
      'Animation pattern: scatter (random order) or collapse (center-out)',
    ),
  targetIds: z
    .array(z.string())
    .describe('Array of block element IDs to target with effects'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
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
    gridSize,
    staggerDelay,
    rotationAmount,
    transitionType,
    targetIds,
    effectStart,
    effectIdPrefix = 'blocky-split',
  } = params;

  // Calculate grid positions and distances from center
  const calculateBlockPositions = () => {
    const blocks: Array<{
      index: number;
      row: number;
      col: number;
      distanceFromCenter: number;
    }> = [];

    const centerRow = (gridSize - 1) / 2;
    const centerCol = (gridSize - 1) / 2;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const index = row * gridSize + col;
        
        // Calculate Euclidean distance from center
        const distanceFromCenter = Math.sqrt(
          Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2),
        );

        blocks.push({
          index,
          row,
          col,
          distanceFromCenter,
        });
      }
    }

    return blocks;
  };

  // Sort blocks by distance for staggered animation
  const sortBlocksByPattern = (
    blocks: Array<{
      index: number;
      row: number;
      col: number;
      distanceFromCenter: number;
    }>,
  ) => {
    if (transitionType === 'collapse') {
      // Sort by distance from center (center animates first)
      return [...blocks].sort(
        (a, b) => a.distanceFromCenter - b.distanceFromCenter,
      );
    } else {
      // Scatter: randomize order
      return [...blocks].sort(() => Math.random() - 0.5);
    }
  };

  const blocks = calculateBlockPositions();
  const sortedBlocks = sortBlocksByPattern(blocks);

  // Generate effects for each block
  const blockEffects = sortedBlocks.map((block, animationOrder) => {
    const targetId = targetIds[block.index];
    if (!targetId) return null;

    const blockStartTime = effectStart + animationOrder * staggerDelay;
    const effectDuration = 0.6;

    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: blockStartTime,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Scale animation: 1 -> 0
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 0, prog: 1 },
        // Rotation animation: 0 -> rotationAmount
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: rotationAmount, prog: 1 },
        // Opacity animation: 1 -> 0 (fade out at 70% progress)
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.7 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    return {
      id: `${effectIdPrefix}-block-${block.index}`,
      componentId: 'generic',
      data: effectData,
    };
  }).filter(Boolean);

  // Return effects in a container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: `${effectIdPrefix}-effect-container`,
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
    effects: blockEffects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: blockEffects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'blockySplitTransition',
  title: 'Blocky Split Transition Effect',
  description:
    'An internal effect preset that generates multiple generic effects to create a grid-based split transition. Each block in the grid animates independently with scale, rotation, and opacity changes. Blocks further from center animate later, creating a fragmented digital glitch aesthetic like corrupted data or a malfunctioning CRT monitor. This preset returns effect configurations only - the visual grid structure must be created by the consuming preset.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'transition', 'glitch', 'grid', 'blocky'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    gridSize: 3,
    staggerDelay: 0.05,
    rotationAmount: 45,
    transitionType: 'scatter',
    targetIds: [
      'block-0',
      'block-1',
      'block-2',
      'block-3',
      'block-4',
      'block-5',
      'block-6',
      'block-7',
      'block-8',
    ],
    effectStart: 0,
    effectIdPrefix: 'blocky-split',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const blockySplitTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};