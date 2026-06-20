/**
 * Binary Fragmentation Effect
 *
 * INTERNAL EFFECT PRESET
 * 
 * Creates a high-tech data materialization effect by converting the element into a binary
 * (0s and 1s) representation that fragments and reassembles. The effect overlays a grid
 * of binary digits that initially shows random values, then organizes into patterns that
 * reveal/hide the underlying content.
 *
 * Features:
 * - Dynamic binary grid generation based on resolution parameter
 * - Multiple pattern types: random, wave, spiral
 * - Multiple reveal directions: center-out, top-down, random
 * - Rapid digit flipping with digital ticker effect
 * - Gradual stabilization as transition completes
 * - CSS grid for positioning, transform for digit flips
 *
 * Usage:
 * This is an internal preset that generates effects for binary fragmentation animations.
 * It returns an array of effects that can be extracted and applied to target components.
 *
 * @example
 * const binaryEffect = await presets.binaryFragmentationEffect({
 *   targetIds: ['my-component'],
 *   gridResolution: 20,
 *   flipSpeed: 0.1,
 *   patternType: 'wave',
 *   revealDirection: 'center-out'
 * }, props);
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('IDs of components to apply binary fragmentation effect to'),
  gridResolution: z.number().default(20).describe('Density of binary grid (number of cells per side)'),
  flipSpeed: z.number().default(0.1).describe('Rate of digit changes (seconds between flips)'),
  patternType: z.enum(['random', 'wave', 'spiral']).default('wave').describe('Pattern type for binary organization'),
  revealDirection: z.enum(['center-out', 'top-down', 'random']).default('center-out').describe('Direction of content reveal'),
  duration: z.number().default(2.5).describe('Total duration of the effect in seconds'),
  effectStart: z.number().default(0).describe('Start time of the effect (relative to parent)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    gridResolution,
    flipSpeed,
    patternType,
    revealDirection,
    duration,
    effectStart,
  } = params;

  // Helper: Calculate delay based on pattern type and position
  const calculateDelay = (row: number, col: number, totalRows: number, totalCols: number): number => {
    const centerRow = totalRows / 2;
    const centerCol = totalCols / 2;

    switch (patternType) {
      case 'random':
        return Math.random() * duration * 0.5;
      
      case 'wave':
        // Wave from left to right
        const waveProgress = col / totalCols;
        return waveProgress * duration * 0.6;
      
      case 'spiral':
        // Spiral from center outward
        const distanceFromCenter = Math.sqrt(
          Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
        );
        const maxDistance = Math.sqrt(centerRow * centerRow + centerCol * centerCol);
        return (distanceFromCenter / maxDistance) * duration * 0.6;
      
      default:
        return 0;
    }
  };

  // Helper: Calculate reveal delay based on direction
  const calculateRevealDelay = (row: number, col: number, totalRows: number, totalCols: number): number => {
    const centerRow = totalRows / 2;
    const centerCol = totalCols / 2;

    switch (revealDirection) {
      case 'center-out':
        const distanceFromCenter = Math.sqrt(
          Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2)
        );
        const maxDistance = Math.sqrt(centerRow * centerRow + centerCol * centerCol);
        return (distanceFromCenter / maxDistance) * duration * 0.7;
      
      case 'top-down':
        return (row / totalRows) * duration * 0.7;
      
      case 'random':
        return Math.random() * duration * 0.7;
      
      default:
        return 0;
    }
  };

  // Generate binary grid cells
  const binaryGridCells: RenderableComponentData[] = [];
  
  for (let row = 0; row < gridResolution; row++) {
    for (let col = 0; col < gridResolution; col++) {
      const cellId = `binary-cell-${row}-${col}`;
      const cellDelay = calculateDelay(row, col, gridResolution, gridResolution);
      const revealDelay = calculateRevealDelay(row, col, gridResolution, gridResolution);
      
      // Random initial binary value
      const initialValue = Math.random() > 0.5 ? '1' : '0';
      
      binaryGridCells.push({
        id: cellId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: initialValue,
          className: 'text-center font-mono',
          style: {
            fontSize: `${Math.max(8, 1200 / gridResolution)}px`,
            color: '#00ff00',
            textShadow: '0 0 5px rgba(0, 255, 0, 0.5)',
            gridColumn: col + 1,
            gridRow: row + 1,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData);
    }
  }

  // Create effects for binary digits
  const digitEffects = binaryGridCells.map((cell) => {
    const cellId = cell.id;
    const match = cellId.match(/binary-cell-(\d+)-(\d+)/);
    if (!match) return null;
    
    const row = parseInt(match[1], 10);
    const col = parseInt(match[2], 10);
    const cellDelay = calculateDelay(row, col, gridResolution, gridResolution);
    const revealDelay = calculateRevealDelay(row, col, gridResolution, gridResolution);

    return {
      id: `${cellId}-effect`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: effectStart + cellDelay,
        duration: duration - cellDelay,
        mode: 'provider',
        targetIds: [cellId],
        ranges: [
          // Fade in digit
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
          // Flip animation (3D rotate)
          { key: 'transform', val: 'rotateX(90deg)', prog: 0 },
          { key: 'transform', val: 'rotateX(0deg)', prog: 0.5 },
          // Fade out as content reveals
          { key: 'opacity', val: 1, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };
  }).filter(Boolean);

  // Create content reveal effects for each target
  const contentRevealEffects = targetIds.map((targetId) => ({
    id: `${targetId}-reveal-effect`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: effectStart,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Content hidden at start
        { key: 'opacity', val: 0, prog: 0 },
        // Content starts revealing
        { key: 'opacity', val: 0, prog: 0.3 },
        { key: 'opacity', val: 0.5, prog: 0.6 },
        // Content fully visible
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  }));

  // Combine all effects
  const allEffects = [...digitEffects, ...contentRevealEffects];

  // Container structure with binary grid overlay
  const rootContainer: RenderableComponentData = {
    id: 'binary-fragmentation-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          position: 'relative',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: allEffects,
    childrenData: [
      // Binary grid overlay
      {
        id: 'binary-grid-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              display: 'grid',
              gridTemplateColumns: `repeat(${gridResolution}, 1fr)`,
              gridTemplateRows: `repeat(${gridResolution}, 1fr)`,
              pointerEvents: 'none',
              zIndex: 10,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: binaryGridCells,
      } as RenderableComponentData,
      // Content container (targets will be here)
      {
        id: 'content-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 1,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [],
      } as RenderableComponentData,
    ],
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
  id: 'binary-fragmentation-effect',
  title: 'Binary Fragmentation Effect',
  description: 'Internal effect that converts elements into a binary (0s and 1s) representation with fragmentation and reassembly animation. Creates a high-tech data materialization effect with configurable grid density, flip speed, pattern types (random, wave, spiral), and reveal directions (center-out, top-down, random).',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'binary', 'fragmentation', 'data', 'digital', 'internal', 'generic'],
  defaultInputParams: {
    targetIds: ['component-1'],
    gridResolution: 20,
    flipSpeed: 0.1,
    patternType: 'wave',
    revealDirection: 'center-out',
    duration: 2.5,
    effectStart: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

// --- Export ---

export const binaryFragmentationEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
