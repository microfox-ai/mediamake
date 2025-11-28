/**
 * Hex Glitch Mosaic Internal Effect
 * 
 * An internal effect that breaks content into hexagonal cells that individually glitch and corrupt.
 * Creates a corrupted video codec effect where hexagonal macroblocks freeze, flicker, shift colors, 
 * and disappear independently with staggered timing.
 * 
 * Features:
 * - Hexagonal grid layout using CSS clip-path
 * - Per-cell glitch effects (freeze, invert, shift, disappear)
 * - Staggered propagation with configurable spread
 * - Corruption wave animation across the grid
 * - Independent timing for each hex cell
 * 
 * Technical Implementation:
 * - Each hex cell is created as a BaseLayout with hexagon clip-path
 * - Generic effects apply random transformations per cell
 * - Propagation delay creates wave effect
 * - Multiple effect types can be combined per cell
 * 
 * ARRAY OF EFFECTS:
 * Returns an array of effects, one per hexagonal cell, each with staggered start times.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  gridSize: z
    .number()
    .min(20)
    .max(200)
    .default(80)
    .describe('Size of each hexagonal cell in pixels'),
  corruptionSpread: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Percentage of cells that glitch (0-1)'),
  glitchTypes: z
    .array(z.enum(['freeze', 'invert', 'shift', 'disappear']))
    .default(['freeze', 'invert', 'shift', 'disappear'])
    .describe('Array of glitch effect types to apply'),
  propagationSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .describe('Time in seconds for corruption to spread across all cells'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total duration of the effect in seconds'),
  targetIds: z
    .array(z.string())
    .default([])
    .describe('Array of component IDs to target (for provider mode)'),
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
  // Helper function to create hexagonal clip-path
  const createHexClipPath = (): string => {
    return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
  };

  // Helper function to calculate grid dimensions
  const calculateGridDimensions = (
    gridSize: number,
    width: number = 1920,
    height: number = 1080,
  ): { cols: number; rows: number; totalCells: number } => {
    // Hexagons pack with 75% horizontal spacing and 87% vertical spacing
    const hexWidth = gridSize;
    const hexHeight = gridSize * 0.866; // sqrt(3)/2 for hex height
    
    const cols = Math.ceil(width / (hexWidth * 0.75)) + 1;
    const rows = Math.ceil(height / hexHeight) + 1;
    const totalCells = cols * rows;

    return { cols, rows, totalCells };
  };

  // Helper function to calculate hexagon position
  const calculateHexPosition = (
    col: number,
    row: number,
    gridSize: number,
  ): { x: number; y: number } => {
    const hexWidth = gridSize;
    const hexHeight = gridSize * 0.866;
    
    const x = col * hexWidth * 0.75;
    const y = row * hexHeight + (col % 2 === 1 ? hexHeight / 2 : 0);

    return { x, y };
  };

  // Helper function to generate random glitch effect ranges
  const generateGlitchRanges = (
    glitchType: 'freeze' | 'invert' | 'shift' | 'disappear',
    intensity: number,
  ): Array<{ key: string; val: any; prog: number }> => {
    const ranges: Array<{ key: string; val: any; prog: number }> = [];

    switch (glitchType) {
      case 'freeze':
        // Opacity flicker with freeze frames
        ranges.push(
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.1 * intensity },
          { key: 'opacity', val: 1, prog: 0.15 * intensity },
          { key: 'opacity', val: 0, prog: 0.3 * intensity },
          { key: 'opacity', val: 1, prog: 0.35 * intensity },
          { key: 'opacity', val: 1, prog: 1 },
        );
        break;

      case 'invert':
        // Color inversion filter
        ranges.push(
          { key: 'filter', val: 'invert(0)', prog: 0 },
          { key: 'filter', val: 'invert(1)', prog: 0.2 * intensity },
          { key: 'filter', val: 'invert(0)', prog: 0.4 * intensity },
          { key: 'filter', val: 'invert(1)', prog: 0.6 * intensity },
          { key: 'filter', val: 'invert(0)', prog: 1 },
        );
        break;

      case 'shift':
        // Translate and hue shift
        const shiftAmount = 20 * intensity;
        ranges.push(
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: shiftAmount * (Math.random() - 0.5) * 2, prog: 0.3 },
          { key: 'translateX', val: 0, prog: 0.6 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: shiftAmount * (Math.random() - 0.5) * 2, prog: 0.3 },
          { key: 'translateY', val: 0, prog: 0.6 },
          { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
          { key: 'filter', val: `hue-rotate(${180 * intensity}deg)`, prog: 0.5 },
          { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
        );
        break;

      case 'disappear':
        // Fade out with scale
        ranges.push(
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.4 * intensity },
          { key: 'opacity', val: 0, prog: 0.8 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0.5, prog: 0.4 * intensity },
          { key: 'scale', val: 0.5, prog: 0.8 },
          { key: 'scale', val: 1, prog: 1 },
        );
        break;
    }

    return ranges;
  };

  // Extract parameters
  const {
    gridSize,
    corruptionSpread,
    glitchTypes,
    propagationSpeed,
    duration,
    targetIds,
    effectId,
  } = params;

  // Calculate grid
  const { cols, rows, totalCells } = calculateGridDimensions(gridSize);

  // Calculate which cells should glitch
  const numGlitchCells = Math.floor(totalCells * corruptionSpread);
  const glitchCellIndices = new Set<number>();
  
  while (glitchCellIndices.size < numGlitchCells) {
    glitchCellIndices.add(Math.floor(Math.random() * totalCells));
  }

  // Calculate propagation delay per cell
  const propagationDelay = propagationSpeed / totalCells;

  // Generate hex cells and their effects
  const hexCells: RenderableComponentData[] = [];
  const effects: any[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellIndex = row * cols + col;
      const cellId = `hex-cell-${cellIndex}`;
      const { x, y } = calculateHexPosition(col, row, gridSize);

      // Create hex cell component
      const hexCell: RenderableComponentData = {
        id: cellId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              left: `${x}px`,
              top: `${y}px`,
              width: `${gridSize}px`,
              height: `${gridSize}px`,
              clipPath: createHexClipPath(),
              pointerEvents: 'none',
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
      };

      hexCells.push(hexCell);

      // Add glitch effects to selected cells
      if (glitchCellIndices.has(cellIndex)) {
        // Pick random glitch type(s)
        const numEffects = Math.floor(Math.random() * 2) + 1; // 1-2 effects
        const selectedGlitchTypes = [...glitchTypes]
          .sort(() => Math.random() - 0.5)
          .slice(0, numEffects);

        selectedGlitchTypes.forEach((glitchType, effectIndex) => {
          const intensity = Math.random() * 0.5 + 0.5; // 0.5-1.0
          const ranges = generateGlitchRanges(glitchType, intensity);

          // Stagger effect start based on cell position
          const effectStart = cellIndex * propagationDelay;
          const effectDuration = duration - effectStart;

          const effectData: GenericEffectData = {
            type: 'linear',
            start: effectStart,
            duration: Math.max(0.5, effectDuration), // Minimum 0.5s duration
            mode: 'provider',
            targetIds: targetIds.length > 0 ? targetIds : [cellId],
            ranges: ranges,
          };

          const effect = {
            id: `${effectId || 'hex-glitch'}-${cellIndex}-${effectIndex}`,
            componentId: 'generic',
            data: effectData,
          };

          effects.push(effect);
        });
      }
    }
  }

  // Create container with all hex cells
  const rootContainer: RenderableComponentData = {
    id: `${effectId || 'hex-glitch'}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: effects,
    childrenData: hexCells,
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'hexGlitchMosaic',
  title: 'Hex Glitch Mosaic Effect',
  description:
    'An internal effect that breaks content into hexagonal cells that individually glitch and corrupt, creating a corrupted video codec macroblock effect',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'glitch', 'hexagon', 'corruption', 'mosaic', 'codec'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    gridSize: 80,
    corruptionSpread: 0.6,
    glitchTypes: ['freeze', 'invert', 'shift', 'disappear'],
    propagationSpeed: 1.5,
    duration: 5,
    targetIds: [],
  },
};

// Export preset
export const hexGlitchMosaicPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
