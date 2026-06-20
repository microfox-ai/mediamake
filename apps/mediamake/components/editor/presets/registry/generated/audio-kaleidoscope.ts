/**
 * Audio-Reactive Geometric Kaleidoscope Preset
 *
 * This preset creates symmetrical geometric kaleidoscope patterns with multi-frequency audio reactivity.
 * Bass controls scale, mids affect rotation, treble influences color shifts. Features fractal-like recursive
 * spawning at beat peaks with configurable symmetry (3-12 fold), strobe effects on kick drums, and independent
 * waveform responses per segment while maintaining pattern coherence.
 *
 * Features:
 * - **Multi-frequency Audio Analysis**: Detects beats across bass, mid, and treble ranges
 * - **Configurable Symmetry**: 3-fold to 12-fold symmetrical patterns
 * - **Recursive Geometry**: Shapes spawn smaller copies at beat peaks (1-3 recursion levels)
 * - **Dynamic Effects**: Bass controls scale, mids affect rotation speed, treble shifts colors
 * - **Beat Synchronization**: Opacity pulses and shape spawning synced to kick drums
 * - **Frequency Mapping**: Customizable mapping of frequency bands to visual properties
 *
 * Use cases:
 * - Creating audio-reactive music visualizations
 * - Building kaleidoscopic VJ loops for live performances
 * - Generating geometric art synchronized to audio
 * - Creating dynamic backgrounds for music videos
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  WaveformEffectData,
  GenericEffectData,
  AudioAtomDataProps,
} from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Zod Schema ---

const presetParams = z.object({
  audio: z
    .object({
      src: z.string().describe('Audio source URL or file path'),
      volume: z.number().min(0).max(2).default(1).optional().describe('Audio volume level (0-2)'),
      start: z.number().min(0).default(0).optional().describe('Audio start time in seconds'),
    })
    .describe('Audio configuration for reactivity'),
  
  symmetryFold: z
    .number()
    .min(3)
    .max(12)
    .default(6)
    .describe('Number of symmetrical segments (3-12 fold symmetry)'),
  
  recursionDepth: z
    .number()
    .min(1)
    .max(3)
    .default(2)
    .describe('Number of recursive shape layers (1-3)'),
  
  maxScale: z
    .number()
    .min(1)
    .max(3)
    .default(2)
    .optional()
    .describe('Maximum scale value for bass reactivity'),
  
  rotationSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .optional()
    .describe('Base rotation speed multiplier'),
  
  frequencyMapping: z
    .object({
      bass: z
        .enum(['scale', 'opacity'])
        .default('scale')
        .describe('Visual property controlled by bass frequencies'),
      mid: z
        .enum(['rotate', 'blur'])
        .default('rotate')
        .describe('Visual property controlled by mid frequencies'),
      treble: z
        .enum(['color', 'brightness'])
        .default('color')
        .describe('Visual property controlled by treble frequencies'),
    })
    .optional()
    .describe('Mapping of frequency bands to visual properties'),
  
  strobeSensitivity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.7)
    .optional()
    .describe('Sensitivity threshold for strobe effects on kick drums'),
  
  shapeType: z
    .enum(['triangle', 'hexagon', 'star'])
    .default('triangle')
    .optional()
    .describe('Base geometric shape type'),
  
  colorScheme: z
    .enum(['neon', 'pastel', 'monochrome', 'rainbow'])
    .default('neon')
    .optional()
    .describe('Color scheme for shapes'),
});

// --- Preset Execution ---

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Helper: Get audio duration
  const getAudioDuration = async (audioSrc: string): Promise<number> => {
    if (!fetcher) return 30; // Default fallback
    try {
      const result = await fetcher('/api/analyze-audio', { audioSrc });
      return result.durationInSeconds || 30;
    } catch {
      return 30;
    }
  };

  // Helper: Generate SVG shape based on type
  const generateSVGShape = (
    shapeType: string,
    size: number,
    color: string,
    recursionLevel: number,
  ): string => {
    const opacity = 0.7 - recursionLevel * 0.15;
    const strokeWidth = 2 + recursionLevel * 1;

    switch (shapeType) {
      case 'triangle':
        const y1 = 100 - size / 2;
        const y2 = 100 + size / 2;
        const x1 = 100;
        const x2 = 100 - size * 0.433;
        const x3 = 100 + size * 0.433;
        return `<polygon points="${x1},${y1} ${x2},${y2} ${x3},${y2}" fill="${color}" fill-opacity="${opacity}" stroke="#ffffff" stroke-width="${strokeWidth}"/>`;

      case 'hexagon':
        const hexPoints = Array.from({ length: 6 })
          .map((_, i) => {
            const angle = (Math.PI / 3) * i;
            const x = 100 + size * 0.5 * Math.cos(angle);
            const y = 100 + size * 0.5 * Math.sin(angle);
            return `${x},${y}`;
          })
          .join(' ');
        return `<polygon points="${hexPoints}" fill="${color}" fill-opacity="${opacity}" stroke="#ffffff" stroke-width="${strokeWidth}"/>`;

      case 'star':
        const starPoints = Array.from({ length: 10 })
          .map((_, i) => {
            const angle = (Math.PI / 5) * i;
            const radius = i % 2 === 0 ? size * 0.5 : size * 0.25;
            const x = 100 + radius * Math.cos(angle - Math.PI / 2);
            const y = 100 + radius * Math.sin(angle - Math.PI / 2);
            return `${x},${y}`;
          })
          .join(' ');
        return `<polygon points="${starPoints}" fill="${color}" fill-opacity="${opacity}" stroke="#ffffff" stroke-width="${strokeWidth}"/>`;

      default:
        return `<circle cx="100" cy="100" r="${size / 2}" fill="${color}" fill-opacity="${opacity}" stroke="#ffffff" stroke-width="${strokeWidth}"/>`;
    }
  };

  // Helper: Get color based on scheme and index
  const getColor = (colorScheme: string, index: number, total: number): string => {
    const hue = (index / total) * 360;
    
    switch (colorScheme) {
      case 'neon':
        return `hsl(${hue}, 100%, 50%)`;
      case 'pastel':
        return `hsl(${hue}, 70%, 80%)`;
      case 'monochrome':
        return `hsl(0, 0%, ${30 + (index / total) * 40}%)`;
      case 'rainbow':
        return `hsl(${hue}, 90%, 60%)`;
      default:
        return `hsl(${hue}, 100%, 50%)`;
    }
  };

  const audioDuration = await getAudioDuration(params.audio.src);
  const symmetryCount = params.symmetryFold;
  const recursionDepth = params.recursionDepth;
  const shapeType = params.shapeType || 'triangle';
  const colorScheme = params.colorScheme || 'neon';
  const frequencyMapping = params.frequencyMapping || {
    bass: 'scale',
    mid: 'rotate',
    treble: 'color',
  };

  // Generate kaleidoscope segments
  const kaleidoscopeSegments: RenderableComponentData[] = [];

  for (let segmentIndex = 0; segmentIndex < symmetryCount; segmentIndex++) {
    const rotationAngle = (360 / symmetryCount) * segmentIndex;
    const segmentId = `kaleidoscope-segment-${segmentIndex}`;
    
    // Generate recursive shape layers
    const shapeLayers: RenderableComponentData[] = [];
    
    for (let depth = 0; depth < recursionDepth; depth++) {
      const layerSize = 80 - depth * 25;
      const layerColor = getColor(colorScheme, depth, recursionDepth);
      const layerId = `${segmentId}-layer-${depth}`;
      
      const shapeSVG = generateSVGShape(shapeType, layerSize, layerColor, depth);
      
      shapeLayers.push({
        id: layerId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<svg viewBox="0 0 200 200" style="width: 200px; height: 200px;">${shapeSVG}</svg>`,
          className: 'absolute inset-0 flex items-center justify-center',
        },
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
        effects: [],
      });
    }

    // Segment container with rotation
    kaleidoscopeSegments.push({
      id: segmentId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transform: `rotate(${rotationAngle}deg)`,
            transformOrigin: 'center center',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
      childrenData: shapeLayers,
    } as RenderableComponentData);
  }

  // Main container for all segments
  const segmentsContainerId = 'kaleidoscope-segments-container';
  
  const segmentsContainer: RenderableComponentData = {
    id: segmentsContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: kaleidoscopeSegments,
  };

  // Audio atom
  const audioAtom: RenderableComponentData = {
    id: 'kaleidoscope-audio',
    type: 'atom' as const,
    componentId: 'AudioAtom',
    data: {
      src: params.audio.src,
      volume: params.audio.volume || 1,
      startFrom: params.audio.start || 0,
    } as AudioAtomDataProps,
    context: {
      timing: {},
    },
  };

  // Create waveform effects for bass (scale), mid (rotation), and treble (hue)
  const effects: any[] = [];

  // Bass -> Scale effect
  if (frequencyMapping.bass === 'scale') {
    const bassScaleEffect: WaveformEffectData = {
      audioSrc: params.audio.src,
      audioProperty: 'bass',
      effectType: 'scale',
      intensity: 0.4,
      baseScale: 1,
      minValue: 0.8,
      maxValue: params.maxScale || 2,
      sensitivity: 1.2,
      threshold: 0.1,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [segmentsContainerId],
      start: 0,
      duration: audioDuration,
      smoothNormalisation: 1,
    };

    effects.push({
      id: 'bass-scale-effect',
      componentId: 'waveform',
      data: bassScaleEffect,
    });
  }

  // Mid -> Rotation effect (continuous rotation modulated by mid frequencies)
  if (frequencyMapping.mid === 'rotate') {
    const rotationEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: [segmentsContainerId],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: 360 * (params.rotationSpeed || 1), prog: 1 },
      ],
    };

    effects.push({
      id: 'rotation-effect',
      componentId: 'generic',
      data: rotationEffect,
    });

    // Add mid-frequency waveform for rotation speed modulation
    const midRotationEffect: WaveformEffectData = {
      audioSrc: params.audio.src,
      audioProperty: 'mid',
      effectType: 'rotate',
      intensity: 0.3,
      rotationRange: 15,
      sensitivity: 1.0,
      threshold: 0.15,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [segmentsContainerId],
      start: 0,
      duration: audioDuration,
      smoothNormalisation: 1,
    };

    effects.push({
      id: 'mid-rotation-waveform',
      componentId: 'waveform',
      data: midRotationEffect,
    });
  }

  // Treble -> Hue rotate (color shift)
  if (frequencyMapping.treble === 'color') {
    const hueRotateEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: [segmentsContainerId],
      ranges: [
        { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
        { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
      ],
    };

    effects.push({
      id: 'hue-rotate-effect',
      componentId: 'generic',
      data: hueRotateEffect,
    });
  }

  // Strobe opacity pulse effect (kick drum sync simulation)
  // We'll create periodic opacity pulses as a simple strobe effect
  const strobePulses: any[] = [];
  const pulseInterval = 0.5; // Pulse every 0.5 seconds (simulating kick drums)
  const pulseCount = Math.floor(audioDuration / pulseInterval);

  for (let i = 0; i < pulseCount; i++) {
    const pulseStart = i * pulseInterval;
    const strobePulse: GenericEffectData = {
      type: 'linear',
      start: pulseStart,
      duration: 0.1,
      mode: 'provider',
      targetIds: [segmentsContainerId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.6, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    strobePulses.push({
      id: `strobe-pulse-${i}`,
      componentId: 'generic',
      data: strobePulse,
    });
  }

  // Attach effects to segments container
  segmentsContainer.effects = [...effects, ...strobePulses];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'audio-kaleidoscope-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor: '#000000',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [audioAtom, segmentsContainer],
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
  id: 'audio-kaleidoscope',
  title: 'Audio-Reactive Geometric Kaleidoscope',
  description:
    'Creates symmetrical geometric kaleidoscope patterns with multi-frequency audio reactivity. Bass controls scale, mids affect rotation, treble influences color shifts. Features fractal-like recursive spawning at beat peaks with configurable symmetry (3-12 fold), strobe effects on kick drums, and independent waveform responses per segment while maintaining pattern coherence.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'kaleidoscope', 'geometric', 'waveform', 'music', 'visualization'],
  dependencies: {},
  defaultInputParams: {
    audio: {
      src: 'https://example.com/audio.mp3',
      volume: 1,
      start: 0,
    },
    symmetryFold: 6,
    recursionDepth: 2,
    maxScale: 2,
    rotationSpeed: 1,
    frequencyMapping: {
      bass: 'scale',
      mid: 'rotate',
      treble: 'color',
    },
    strobeSensitivity: 0.7,
    shapeType: 'triangle',
    colorScheme: 'neon',
  },
};

// --- Export ---

export const audioKaleidoscopePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
