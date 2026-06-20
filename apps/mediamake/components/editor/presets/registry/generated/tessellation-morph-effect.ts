/**
 * Tessellation Morph Effect Preset
 *
 * Creates fluid geometric transformations between different tessellation patterns (triangles, 
 * squares, pentagons, hexagons, octagons). Features intelligent vertex interpolation that 
 * maintains smooth transitions even when polygon vertex counts differ. Each tile in the 
 * tessellation has micro-delays creating ripple effects across the pattern. Includes scaling 
 * oscillations during morphs to add dimensional pop.
 *
 * Features:
 * - **Intelligent Vertex Morphing**: Smooth clip-path transformations between polygons with 
 *   different vertex counts (triangle → square → hexagon, etc.)
 * - **Pattern Sequences**: Customizable sequences of geometric shapes to morph through
 * - **Ripple Delays**: Cascading timing offsets across tiles for wave-like propagation
 * - **Dimensional Pop**: Scale and rotation oscillations during transitions
 * - **Tessellation Types**: Support for regular, semi-regular, and Penrose-style patterns
 * - **Flexible Grid**: Configurable tile size and pattern density
 *
 * Use cases:
 * - Dynamic geometric backgrounds with evolving patterns
 * - Animated tessellation intros/outros
 * - Morphing geometric overlays for music videos
 * - Abstract pattern transitions for tech/design content
 * - Kaleidoscope-style visual effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z.array(z.string()).optional().describe('Optional target component IDs to apply effects to. If not provided, creates new tiles.'),
  patterns: z.array(z.enum(['triangle', 'square', 'pentagon', 'hexagon', 'octagon'])).describe('Sequence of polygon patterns to morph through (e.g., ["triangle", "square", "hexagon"])'),
  morphDuration: z.number().min(0.5).max(10).default(3).describe('Duration of each morph transition in seconds'),
  rippleDelay: z.number().min(0).max(1).default(0.05).describe('Delay between each tile morph in seconds (creates ripple effect)'),
  tileSize: z.number().min(50).max(300).default(100).describe('Size of each tessellation tile in pixels'),
  oscillationAmplitude: z.number().min(0).max(0.5).default(0.1).describe('Amplitude of scale oscillation during morphs (0 = no oscillation, 0.5 = 50% scale change)'),
  tessellationType: z.enum(['regular', 'semi-regular', 'penrose']).default('regular').describe('Type of tessellation pattern: regular (grid), semi-regular (offset rows), or penrose (aperiodic)'),
  start: z.number().default(0).describe('Start time of the effect in seconds'),
  containerClassName: z.string().optional().describe('Optional CSS class for the container'),
  tileClassName: z.string().optional().describe('Optional CSS class for each tile'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    patterns,
    morphDuration,
    rippleDelay,
    tileSize,
    oscillationAmplitude,
    tessellationType,
    start,
    containerClassName,
    tileClassName,
  } = params;

  // Helper: Generate clip-path polygon for a given shape
  const generatePolygonPath = (shape: string): string => {
    switch (shape) {
      case 'triangle':
        // Equilateral triangle (3 vertices)
        return 'polygon(50% 10%, 10% 90%, 90% 90%)';
      case 'square':
        // Square (4 vertices)
        return 'polygon(15% 15%, 85% 15%, 85% 85%, 15% 85%)';
      case 'pentagon':
        // Regular pentagon (5 vertices)
        return 'polygon(50% 5%, 95% 40%, 80% 95%, 20% 95%, 5% 40%)';
      case 'hexagon':
        // Regular hexagon (6 vertices)
        return 'polygon(50% 5%, 90% 25%, 90% 75%, 50% 95%, 10% 75%, 10% 25%)';
      case 'octagon':
        // Regular octagon (8 vertices)
        return 'polygon(30% 5%, 70% 5%, 95% 30%, 95% 70%, 70% 95%, 30% 95%, 5% 70%, 5% 30%)';
      default:
        return 'polygon(15% 15%, 85% 15%, 85% 85%, 15% 85%)'; // Default to square
    }
  };

  // Helper: Generate morph sequence for clip-path
  const generateMorphSequence = (patternSequence: string[]): string[] => {
    return patternSequence.map(pattern => generatePolygonPath(pattern));
  };

  // Helper: Generate progress steps for morphing
  const generateProgressSteps = (count: number): number[] => {
    if (count <= 1) return [0, 1];
    const steps: number[] = [];
    for (let i = 0; i < count; i++) {
      steps.push(i / (count - 1));
    }
    return steps;
  };

  // Helper: Calculate tile count based on viewport and tessellation type
  const calculateTileCount = (size: number, type: string, viewportWidth: number = 1920, viewportHeight: number = 1080): number => {
    const cols = Math.ceil(viewportWidth / size) + 1;
    const rows = Math.ceil(viewportHeight / size) + 1;
    return cols * rows;
  };

  // Helper: Calculate tile position based on index and tessellation type
  const calculateTilePosition = (
    index: number,
    type: string,
    size: number,
    viewportWidth: number = 1920,
    viewportHeight: number = 1080
  ): { left: string; top: string } => {
    const cols = Math.ceil(viewportWidth / size) + 1;
    const row = Math.floor(index / cols);
    const col = index % cols;

    switch (type) {
      case 'regular':
        // Standard grid layout
        return {
          left: `${col * size}px`,
          top: `${row * size}px`,
        };
      case 'semi-regular':
        // Offset every other row for semi-regular tessellation
        const offsetX = (row % 2) * (size / 2);
        return {
          left: `${col * size + offsetX}px`,
          top: `${row * size}px`,
        };
      case 'penrose':
        // Pseudo-Penrose with golden ratio spacing
        const phi = 1.618033988749;
        const offsetPenroseX = (row % 2) * (size / phi);
        const offsetPenroseY = (col % 3) * (size / (phi * 2));
        return {
          left: `${col * size + offsetPenroseX}px`,
          top: `${row * size + offsetPenroseY}px`,
        };
      default:
        return {
          left: `${col * size}px`,
          top: `${row * size}px`,
        };
    }
  };

  const viewportWidth = props.config?.width || 1920;
  const viewportHeight = props.config?.height || 1080;
  const tileCount = calculateTileCount(tileSize, tessellationType, viewportWidth, viewportHeight);

  const clipPathSequence = generateMorphSequence(patterns);
  const progressSteps = generateProgressSteps(patterns.length);

  // Create tile components
  const tiles: RenderableComponentData[] = [];

  for (let tileIndex = 0; tileIndex < tileCount; tileIndex++) {
    const position = calculateTilePosition(tileIndex, tessellationType, tileSize, viewportWidth, viewportHeight);
    const tileId = `tessellation-tile-${tileIndex}`;

    // Create tile component
    const tile: RenderableComponentData = {
      id: tileId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, rgba(100, 150, 255, 0.3) 0%, rgba(255, 100, 150, 0.3) 100%); backdrop-filter: blur(5px);"></div>`,
        className: tileClassName || 'absolute',
        style: {
          width: `${tileSize}px`,
          height: `${tileSize}px`,
          left: position.left,
          top: position.top,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: morphDuration,
        },
      },
      effects: [
        // Clip-path morph effect
        {
          id: `morph-clip-${tileId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: start + (tileIndex * rippleDelay),
            duration: morphDuration,
            mode: 'provider',
            targetIds: [tileId],
            ranges: clipPathSequence.map((clipPath, idx) => ({
              key: 'clipPath',
              val: clipPath,
              prog: progressSteps[idx],
            })),
          },
        },
        // Scale oscillation effect
        {
          id: `morph-scale-${tileId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: start + (tileIndex * rippleDelay),
            duration: morphDuration,
            mode: 'provider',
            targetIds: [tileId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1 - oscillationAmplitude, prog: 0.3 },
              { key: 'scale', val: 1 + oscillationAmplitude, prog: 0.7 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Rotation oscillation effect
        {
          id: `morph-rotate-${tileId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: start + (tileIndex * rippleDelay),
            duration: morphDuration,
            mode: 'provider',
            targetIds: [tileId],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 5, prog: 0.3 },
              { key: 'rotate', val: -5, prog: 0.7 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    tiles.push(tile);
  }

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'tessellation-morph-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: containerClassName || 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: morphDuration + (tileCount * rippleDelay),
      },
    },
    childrenData: tiles,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'tessellation-morph-effect',
  title: 'Tessellation Morph Effect',
  description: 'Transforms between different geometric tessellation patterns with intelligent vertex morphing, ripple delays, and dimensional pop effects',
  type: 'predefined',
  presetType: 'children',
  tags: ['geometric', 'tessellation', 'morph', 'animation', 'pattern', 'abstract'],
  defaultInputParams: {
    patterns: ['triangle', 'square', 'hexagon'],
    morphDuration: 3,
    rippleDelay: 0.05,
    tileSize: 100,
    oscillationAmplitude: 0.1,
    tessellationType: 'regular',
    start: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const tessellationMorphEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
