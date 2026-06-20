/**
 * GridWaveDistortion - Audio-Reactive Grid Effect
 *
 * Creates wave-like distortions across a grid of elements based on frequency analysis.
 * Different frequency bands (bass, mid, treble) affect different grid regions, creating
 * a visual equalizer effect with fluid wave motion and color shifts.
 *
 * Features:
 * - **Multi-Frequency Reactive**: Bass affects bottom rows, mids affect center, treble affects top
 * - **Wave Motion**: Primary vertical waves (translateY) and secondary horizontal waves (translateX)
 * - **Color Shifts**: Dynamic background colors based on frequency intensity
 * - **Configurable Grid**: Adjustable grid dimensions (width × height)
 * - **Smoothing Control**: Interpolation between cells for fluid motion
 * - **Frequency Mapping**: Precise control over which frequencies affect which rows
 *
 * Use cases:
 * - Music visualizers with spatial frequency distribution
 * - Audio-reactive backgrounds for music videos
 * - Dynamic grid-based visual equalizers
 * - Audio-synchronized geometric animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { WaveformEffectData } from '@microfox/remotion';

const presetParams = z.object({
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for audio analysis'),
  gridWidth: z
    .number()
    .min(1)
    .max(20)
    .default(8)
    .describe('Number of columns in the grid'),
  gridHeight: z
    .number()
    .min(1)
    .max(20)
    .default(6)
    .describe('Number of rows in the grid'),
  waveAmplitude: z
    .number()
    .min(5)
    .max(100)
    .default(20)
    .describe('Maximum wave displacement in pixels'),
  bassColor: z
    .string()
    .default('#ff0000')
    .describe('Color for bass frequency (low rows)'),
  midColor: z
    .string()
    .default('#00ff00')
    .describe('Color for mid frequency (middle rows)'),
  trebleColor: z
    .string()
    .default('#0000ff')
    .describe('Color for treble frequency (top rows)'),
  smoothing: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Smoothing factor for interpolation between cells (0-1)'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.7)
    .describe('Audio sensitivity multiplier'),
  cellBorderRadius: z
    .number()
    .min(0)
    .max(20)
    .default(4)
    .describe('Border radius for grid cells in pixels'),
  cellGap: z
    .number()
    .min(0)
    .max(20)
    .default(4)
    .describe('Gap between grid cells in pixels'),
  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .describe('Padding around the grid container in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    audioSrc,
    gridWidth,
    gridHeight,
    waveAmplitude,
    bassColor,
    midColor,
    trebleColor,
    smoothing,
    sensitivity,
    cellBorderRadius,
    cellGap,
    containerPadding,
  } = params;

  // Helper: Determine frequency band based on row position
  const getFrequencyBand = (
    row: number,
    totalRows: number,
  ): 'bass' | 'mid' | 'treble' => {
    const rowPercent = row / totalRows;
    if (rowPercent < 0.33) return 'bass'; // Bottom 33% - bass
    if (rowPercent < 0.66) return 'mid'; // Middle 33% - mid
    return 'treble'; // Top 33% - treble
  };

  // Helper: Get color based on frequency band
  const getColorForBand = (band: 'bass' | 'mid' | 'treble'): string => {
    if (band === 'bass') return bassColor;
    if (band === 'mid') return midColor;
    return trebleColor;
  };

  // Helper: Calculate darker version of color for base state
  const getDarkerColor = (color: string): string => {
    // Simple darkening by adding alpha or reducing brightness
    // For simplicity, we'll return a semi-transparent version
    return `${color}33`; // Add 20% opacity (33 in hex)
  };

  // Generate grid cells
  const totalCells = gridWidth * gridHeight;
  const gridCells: RenderableComponentData[] = [];

  for (let index = 0; index < totalCells; index++) {
    const row = Math.floor(index / gridWidth);
    const col = index % gridWidth;
    const cellId = `grid-cell-${row}-${col}`;

    // Determine frequency band for this cell
    const frequencyBand = getFrequencyBand(row, gridHeight);
    const intensityColor = getColorForBand(frequencyBand);
    const baseColor = getDarkerColor(intensityColor);

    // Create waveform effects for this cell
    const effects: any[] = [
      // Primary wave effect (translateY)
      {
        id: `wave-y-${cellId}`,
        componentId: 'waveform',
        data: {
          audioSrc,
          audioProperty: frequencyBand,
          effectType: 'translateY',
          intensity: waveAmplitude,
          sensitivity,
          threshold: 0.1,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / 30,
          mode: 'provider',
          targetIds: [cellId],
          start: 0,
          smoothing,
          type: 'continuous',
        } as WaveformEffectData,
      },
      // Secondary wave effect (translateX)
      {
        id: `wave-x-${cellId}`,
        componentId: 'waveform',
        data: {
          audioSrc,
          audioProperty: frequencyBand,
          effectType: 'translateX',
          intensity: waveAmplitude * 0.3, // Reduced amplitude for secondary wave
          sensitivity: sensitivity * 0.8,
          threshold: 0.1,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / 30,
          mode: 'provider',
          targetIds: [cellId],
          start: 0,
          smoothing,
          type: 'continuous',
        } as WaveformEffectData,
      },
      // Color shift effect
      {
        id: `color-${cellId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          mode: 'provider',
          targetIds: [cellId],
          ranges: [
            { key: 'backgroundColor', val: baseColor, prog: 0 },
            { key: 'backgroundColor', val: intensityColor, prog: 1 },
          ],
        },
      },
    ];

    const gridCell: RenderableComponentData = {
      id: cellId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; border-radius: ${cellBorderRadius}px; background-color: ${baseColor};"></div>`,
        style: {
          width: '100%',
          height: '100%',
          borderRadius: `${cellBorderRadius}px`,
          backgroundColor: baseColor,
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'audio-source',
        },
      },
      effects,
    };

    gridCells.push(gridCell);
  }

  // Audio source component
  const audioSource: RenderableComponentData = {
    id: 'audio-source',
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: audioSrc,
      volume: 1,
    },
    context: {
      timing: {
        start: 0,
      },
    },
  };

  // Grid container
  const gridContainer: RenderableComponentData = {
    id: 'grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          display: 'grid',
          gridTemplateColumns: `repeat(${gridWidth}, 1fr)`,
          gridTemplateRows: `repeat(${gridHeight}, 1fr)`,
          gap: `${cellGap}px`,
          padding: `${containerPadding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-source',
      },
    },
    childrenData: gridCells,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'grid-wave-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-source',
      },
    },
    childrenData: [audioSource, gridContainer],
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
  id: 'GridWaveDistortion',
  title: 'Grid Wave Distortion Audio Reactive Effect',
  description:
    'Creates wave-like distortions across a grid of elements based on frequency analysis. Different frequency bands (bass, mid, treble) affect different grid regions, creating a visual equalizer effect with fluid wave motion and color shifts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'waveform',
    'grid',
    'frequency',
    'equalizer',
    'reactive',
    'music',
    'visualization',
  ],
  dependencies: {},
  defaultInputParams: {
    audioSrc: 'https://example.com/audio.mp3',
    gridWidth: 8,
    gridHeight: 6,
    waveAmplitude: 20,
    bassColor: '#ff0000',
    midColor: '#00ff00',
    trebleColor: '#0000ff',
    smoothing: 0.5,
    sensitivity: 0.7,
    cellBorderRadius: 4,
    cellGap: 4,
    containerPadding: 20,
  },
};

export const GridWaveDistortionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
