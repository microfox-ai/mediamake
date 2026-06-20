/**
 * Quantum Pixel Collapse Preset
 *
 * Creates a quantum computing-inspired visual effect where pixel regions exist in superposition
 * (multiple visual states) before collapsing into final positions. Each pixel region shows rapid
 * fluctuation between multiple states (different colors, positions, sizes) before settling.
 * The collapse propagates from quantum seed points with wave-like interference patterns.
 *
 * Features:
 * - **Superposition States**: Pixels fluctuate rapidly between multiple visual states
 * - **Quantum Seed Points**: Collapse propagates from user-defined seed coordinates
 * - **Interference Patterns**: Constructive, destructive, or mixed wave interactions
 * - **Stepped Animations**: Uses CSS steps() timing for discrete quantum state changes
 * - **Quantum Blur**: Filter effects create quantum uncertainty visualization
 * - **Wave Propagation**: Collapse spreads outward with calculated delays
 *
 * Technical Implementation:
 * - Uses generic effects with steps() timing for discrete state transitions
 * - Per-region animations with filter (blur + hue-rotate) and transform (quantum jitter)
 * - Wave delay calculated based on distance from seed points and interference pattern
 * - Dynamically generates grid of pixel regions based on configuration
 *
 * Use cases:
 * - Sci-fi quantum computing visualizations
 * - Futuristic loading/transition effects
 * - Abstract data processing animations
 * - Cyberpunk aesthetic overlays
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  seedPoints: z
    .array(
      z.object({
        x: z.number().min(0).max(1).describe('X coordinate (0-1, normalized)'),
        y: z.number().min(0).max(1).describe('Y coordinate (0-1, normalized)'),
      }),
    )
    .min(1)
    .describe('Array of quantum seed point coordinates where collapse originates'),
  superpositionStates: z
    .number()
    .int()
    .min(2)
    .max(20)
    .default(5)
    .describe('Number of quantum states each pixel cycles through before collapsing'),
  collapseSpeed: z
    .number()
    .positive()
    .default(1.5)
    .describe('Duration in seconds for collapse propagation'),
  interferencePattern: z
    .enum(['constructive', 'destructive', 'mixed'])
    .default('mixed')
    .describe(
      'Wave interference pattern: constructive (accelerates), destructive (delays), mixed (varied)',
    ),
  gridColumns: z
    .number()
    .int()
    .min(4)
    .max(32)
    .default(8)
    .describe('Number of columns in pixel grid'),
  gridRows: z
    .number()
    .int()
    .min(4)
    .max(32)
    .default(8)
    .describe('Number of rows in pixel grid'),
  quantumJitterIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe('Intensity of position fluctuation during superposition (in pixels)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color during quantum collapse'),
  pixelBaseColor: z
    .string()
    .default('#00ffff')
    .describe('Base color for pixel regions'),
  duration: z
    .number()
    .positive()
    .default(5)
    .describe('Total duration of the entire effect in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Calculate wave delay based on distance from seed points
  const calculateWaveDelay = (
    regionX: number,
    regionY: number,
    seedPoints: Array<{ x: number; y: number }>,
    interferencePattern: 'constructive' | 'destructive' | 'mixed',
    collapseSpeed: number,
  ): number => {
    // Find minimum distance to any seed point
    let minDistance = Infinity;
    seedPoints.forEach((seed) => {
      const dx = regionX - seed.x;
      const dy = regionY - seed.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      minDistance = Math.min(minDistance, distance);
    });

    // Normalize distance (max diagonal is sqrt(2) ≈ 1.414)
    const normalizedDistance = minDistance / 1.414;

    // Apply interference pattern
    let delayMultiplier = normalizedDistance;
    if (interferencePattern === 'constructive') {
      // Accelerates convergence - reduce delay
      delayMultiplier *= 0.5;
    } else if (interferencePattern === 'destructive') {
      // Creates delays - increase delay
      delayMultiplier *= 1.5;
    } else if (interferencePattern === 'mixed') {
      // Varied timing - add some randomness
      const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
      delayMultiplier *= randomFactor;
    }

    // Scale by collapse speed (inverse relationship - faster speed = less delay)
    return (delayMultiplier * collapseSpeed * 0.8);
  };

  // Helper: Generate quantum jitter transform
  const generateQuantumJitter = (intensity: number): string => {
    const angles = [0, 45, 90, 135, 180, 225, 270, 315];
    const jitters = angles.map((angle) => {
      const rad = (angle * Math.PI) / 180;
      const x = Math.cos(rad) * intensity;
      const y = Math.sin(rad) * intensity;
      return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
    });
    return jitters[Math.floor(Math.random() * jitters.length)];
  };

  // Generate pixel regions
  const pixelRegions: RenderableComponentData[] = [];
  const { gridColumns, gridRows, superpositionStates, collapseSpeed, interferencePattern, seedPoints, quantumJitterIntensity, pixelBaseColor } = params;

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridColumns; col++) {
      const regionId = `quantum-pixel-${row}-${col}`;
      
      // Calculate normalized position (0-1)
      const posX = (col + 0.5) / gridColumns;
      const posY = (row + 0.5) / gridRows;

      // Calculate wave delay for this region
      const waveDelay = calculateWaveDelay(
        posX,
        posY,
        seedPoints,
        interferencePattern,
        collapseSpeed,
      );

      // Generate random quantum jitter for this region
      const jitterTransform = generateQuantumJitter(quantumJitterIntensity);

      // Create the pixel region component
      const pixelRegion: RenderableComponentData = {
        id: regionId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background-color: ${pixelBaseColor}; border: 1px solid rgba(255, 255, 255, 0.1);"></div>`,
          style: {
            width: '100%',
            height: '100%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: `${regionId}-collapse-effect`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: waveDelay,
              duration: collapseSpeed,
              mode: 'provider',
              targetIds: [regionId],
              easing: `steps(${superpositionStates})`,
              ranges: [
                // Filter effects: blur + hue-rotate for quantum uncertainty
                { key: 'filter', val: 'blur(5px) hue-rotate(0deg)', prog: 0 },
                { key: 'filter', val: `blur(5px) hue-rotate(${720}deg)`, prog: 0.7 },
                { key: 'filter', val: 'blur(0px) hue-rotate(0deg)', prog: 1 },
                // Transform: quantum jitter during superposition, then stable
                { key: 'transform', val: jitterTransform, prog: 0 },
                { key: 'transform', val: jitterTransform, prog: 0.7 },
                { key: 'transform', val: 'translate(0px, 0px)', prog: 1 },
                // Opacity: fade in as collapse completes
                { key: 'opacity', val: 0.3, prog: 0 },
                { key: 'opacity', val: 0.7, prog: 0.7 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      };

      pixelRegions.push(pixelRegion);
    }
  }

  // Create grid container with dynamic grid template
  const gridContainer: RenderableComponentData = {
    id: 'quantum-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          display: 'grid',
          gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
          gridTemplateRows: `repeat(${gridRows}, 1fr)`,
          gap: '0px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: pixelRegions,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'quantum-collapse-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [gridContainer],
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
  id: 'quantum-pixel-collapse',
  title: 'Quantum Pixel Collapse',
  description:
    'Creates a quantum computing-inspired visual effect where pixel regions exist in superposition (multiple visual states) before collapsing into final positions. Pixels rapidly fluctuate between states (colors, positions, sizes) using stepped CSS animations, then settle as a wave propagates from quantum seed points. Features interference patterns (constructive, destructive, mixed) that affect collapse timing, creating a unique sci-fi aesthetic reminiscent of quantum computing visualizations.',
  type: 'predefined',
  presetType: 'children',
  tags: ['effects', 'visual', 'sci-fi', 'quantum', 'grid', 'animation'],
  dependencies: {},
  defaultInputParams: {
    seedPoints: [
      { x: 0.5, y: 0.5 }, // Center seed point
    ],
    superpositionStates: 5,
    collapseSpeed: 1.5,
    interferencePattern: 'mixed',
    gridColumns: 8,
    gridRows: 8,
    quantumJitterIntensity: 10,
    backgroundColor: '#000000',
    pixelBaseColor: '#00ffff',
    duration: 5,
  },
};

// Export preset
export const quantumPixelCollapsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
