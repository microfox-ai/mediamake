/**
 * GridPulseReveal Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates rhythmic pulsing effects synchronized with audio beats for grid-aligned elements.
 * Uses waveform data to detect bass hits and trigger scale pulses on grid intersection points.
 * The effect supports multiple grid cells pulsing in sequence, creating a wave-like pattern
 * across the grid radiating outward from a configurable origin point.
 *
 * Features:
 * - Audio-reactive waveform detection (bass frequency analysis)
 * - Grid-based delay calculation for wave-like propagation
 * - Multiple origin points (center, topLeft, bottomRight)
 * - Scale pulse with opacity dip and blur effect
 * - Configurable grid dimensions and timing
 * - Bass threshold and intensity controls
 *
 * Use cases:
 * - Creating audio-reactive grid animations
 * - Building beat-synchronized visual patterns
 * - Designing wave-like propagating effects across layouts
 * - Creating rhythmic pulsing grid overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Zod Parameter Schema ---
const presetParams = z.object({
  gridColumns: z
    .number()
    .min(1)
    .max(20)
    .default(4)
    .describe('Number of columns in the grid'),
  gridRows: z
    .number()
    .min(1)
    .max(20)
    .default(3)
    .describe('Number of rows in the grid'),
  pulseDelay: z
    .number()
    .min(0)
    .max(500)
    .default(50)
    .describe('Delay in milliseconds between cell pulses'),
  bassThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Threshold for bass detection (0-1), higher values require stronger bass hits'),
  pulseIntensity: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .describe('Scale multiplier for pulse effect (e.g., 1.2 = 120% scale)'),
  origin: z
    .enum(['center', 'topLeft', 'bottomRight'])
    .default('center')
    .describe('Origin point from which the pulse wave radiates'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of target component IDs to apply effects to (must match grid cell count)'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent timeline)'),
  effectDuration: z
    .number()
    .default(10)
    .describe('Duration of the effect in seconds'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    gridColumns,
    gridRows,
    pulseDelay,
    bassThreshold,
    pulseIntensity,
    origin,
    targetIds,
    audioSrc,
    effectStart,
    effectDuration,
  } = params;

  // Helper function: Calculate grid cell position
  const getCellPosition = (index: number): { row: number; col: number } => {
    return {
      row: Math.floor(index / gridColumns),
      col: index % gridColumns,
    };
  };

  // Helper function: Calculate origin coordinates
  const getOriginPosition = (): { row: number; col: number } => {
    switch (origin) {
      case 'center':
        return {
          row: (gridRows - 1) / 2,
          col: (gridColumns - 1) / 2,
        };
      case 'topLeft':
        return { row: 0, col: 0 };
      case 'bottomRight':
        return { row: gridRows - 1, col: gridColumns - 1 };
      default:
        return { row: 0, col: 0 };
    }
  };

  // Helper function: Calculate Euclidean distance from origin
  const calculateDistance = (
    cellRow: number,
    cellCol: number,
    originRow: number,
    originCol: number,
  ): number => {
    const rowDiff = cellRow - originRow;
    const colDiff = cellCol - originCol;
    return Math.sqrt(rowDiff * rowDiff + colDiff * colDiff);
  };

  // Helper function: Calculate delay based on distance from origin
  const calculateGridDelay = (index: number): number => {
    const cellPos = getCellPosition(index);
    const originPos = getOriginPosition();
    const distance = calculateDistance(
      cellPos.row,
      cellPos.col,
      originPos.row,
      originPos.col,
    );
    // Convert delay from milliseconds to seconds
    return (distance * pulseDelay) / 1000;
  };

  // Generate effects for each target ID
  const effects = targetIds.map((targetId, index) => {
    const delay = calculateGridDelay(index);

    // Waveform effect data for scale pulse
    const waveformEffectData: WaveformEffectData = {
      audioSrc,
      audioProperty: 'bass',
      effectType: 'scale',
      sensitivity: 0.8,
      threshold: bassThreshold,
      intensity: pulseIntensity - 1, // Convert scale multiplier to intensity (1.2 -> 0.2)
      baseScale: 1,
      mode: 'provider',
      targetIds: [targetId],
      start: effectStart + delay,
      duration: effectDuration - delay,
      numberOfSamples: 128,
      useFrequencyData: true,
      smoothNormalisation: 1,
    };

    // Generic effect for opacity dip and blur
    const opacityBlurRanges = [
      // Opacity dip (1.0 -> 0.8 -> 1.0)
      { key: 'opacity', val: 1.0, prog: 0 },
      { key: 'opacity', val: 0.8, prog: 0.3 },
      { key: 'opacity', val: 1.0, prog: 0.6 },
      // Blur effect (0px -> 2px -> 0px)
      { key: 'filter', val: 'blur(0px)', prog: 0 },
      { key: 'filter', val: 'blur(2px)', prog: 0.3 },
      { key: 'filter', val: 'blur(0px)', prog: 0.6 },
    ];

    return [
      // Waveform scale pulse effect
      {
        id: `waveform-scale-${targetId}-${index}`,
        componentId: 'waveform',
        data: waveformEffectData,
      },
      // Generic opacity and blur effect
      {
        id: `opacity-blur-${targetId}-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: effectStart + delay,
          duration: 0.3, // Short duration for quick opacity/blur pulse
          mode: 'provider',
          targetIds: [targetId],
          ranges: opacityBlurRanges,
        },
      },
    ];
  }).flat();

  // Create root container with effects
  const rootContainer: RenderableComponentData = {
    id: 'GridPulseReveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'GridPulseReveal',
  title: 'Grid Pulse Reveal',
  description:
    'Creates rhythmic pulsing effects synchronized with audio beats for grid-aligned elements. Detects bass hits using waveform data and triggers scale pulses on grid intersection points with wave-like patterns radiating from a configurable origin point.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'audio-reactive', 'waveform', 'grid', 'pulse', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    gridColumns: 4,
    gridRows: 3,
    pulseDelay: 50,
    bassThreshold: 0.6,
    pulseIntensity: 1.2,
    origin: 'center',
    targetIds: [
      'cell-0',
      'cell-1',
      'cell-2',
      'cell-3',
      'cell-4',
      'cell-5',
      'cell-6',
      'cell-7',
      'cell-8',
      'cell-9',
      'cell-10',
      'cell-11',
    ],
    audioSrc: 'https://example.com/audio.mp3',
    effectStart: 0,
    effectDuration: 10,
  },
};

// --- Export Preset ---
export const GridPulseRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
