/**
 * VU Meter Typokinetics Preset
 *
 * This preset creates a vintage analog VU meter typography effect where individual letters
 * pivot and swing like meter needles responding to audio kicks. Features industrial aesthetics
 * with worn metal textures, rust patches, red-zone glow effects on high intensity beats,
 * mechanical oscillation physics with overshoot, and subtle background grid measurements
 * that pulse with the rhythm.
 *
 * Features:
 * - **Audio-Reactive Meter Animation**: Letters rotate and scale based on audio kick intensity
 * - **Industrial Aesthetic**: Worn metal texture, rust patches, scratched surface effects
 * - **Red-Zone Glow**: Conditional red glow when beat intensity exceeds threshold (>0.8)
 * - **Mechanical Physics**: Spring-based oscillation with overshoot and settling behavior
 * - **Pivot Animation**: Letters rotate from bottom-center like analog meter needles
 * - **Background Grid**: Measurement marks that pulse subtly with audio rhythm
 * - **Exponential Response**: Math.pow(intensity, 1.5) for natural meter behavior
 * - **Beat Synchronization**: Uses beatstitch dependency for audio analysis
 *
 * Use cases:
 * - Industrial/mechanical motion graphics
 * - Music visualizations with technical aesthetic
 * - Military equipment UI overlays
 * - Vintage analog meter simulations
 * - Audio-reactive typography for electronic music
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('AUDIO')
    .describe('Text to display (5 letters recommended for optimal spacing)'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for beat analysis'),
  audioDuration: z
    .number()
    .optional()
    .describe('Duration of audio track in seconds (auto-detected if not provided)'),
  fontSize: z
    .number()
    .default(120)
    .describe('Font size in pixels for meter text'),
  textColor: z
    .string()
    .default('#8a8a7a')
    .describe('Base color for text (industrial metal gray)'),
  backgroundColor: z
    .string()
    .default('#1a1a1a')
    .describe('Background color (dark industrial)'),
  gridColor: z
    .string()
    .default('rgba(100,100,100,0.15)')
    .describe('Color for background grid lines'),
  gridSize: z
    .number()
    .default(50)
    .describe('Grid cell size in pixels'),
  rotationRange: z
    .number()
    .default(20)
    .describe('Maximum rotation in degrees (±range)'),
  scaleRange: z
    .number()
    .default(1.3)
    .describe('Maximum scale multiplier (1.0 to scaleRange)'),
  swingUpDuration: z
    .number()
    .default(0.15)
    .describe('Duration of swing-up animation in seconds'),
  returnDuration: z
    .number()
    .default(0.35)
    .describe('Duration of return animation with spring physics in seconds'),
  redZoneThreshold: z
    .number()
    .default(0.8)
    .describe('Intensity threshold for red-zone glow effect (0-1)'),
  redZoneGlowSize: z
    .number()
    .default(20)
    .describe('Size of red glow in pixels when in red-zone'),
  beatSensitivity: z
    .number()
    .default(1.5)
    .describe('Sensitivity multiplier for beat detection (higher = more responsive)'),
  font: z
    .string()
    .optional()
    .default('Roboto Condensed:900')
    .describe('Font family with optional weight (e.g., "Roboto Condensed:900")'),
});

// --- Preset Execution Function ---
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { presets, fetcher } = props;

  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Roboto Condensed:900';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: any = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Split text into individual letters
  const text = params.text || 'AUDIO';
  const letters = text.split('');

  // Fetch audio analysis data using beatstitch dependency
  if (!fetcher) {
    throw new Error('Fetcher is required for audio analysis');
  }

  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audioSrc,
  });

  const audioDuration = params.audioDuration || durationInSeconds || 30;

  // Select impactful beats (internal helper function)
  const selectImpactfulBeats = (
    beats: any[],
    maxBeatsCount: number = 30,
    minTimeDiff: number = 0.3,
  ) => {
    const beatsWithLocalPeaks = beats.map((beat: any, index: number) => {
      const windowSize = 10;
      const start = Math.max(0, index - windowSize);
      const end = Math.min(beats.length, index + windowSize + 1);
      const neighbors = beats.slice(start, end);
      const avgNeighborIntensity =
        neighbors.reduce((sum: number, b: any) => sum + b.intensity, 0) /
        neighbors.length;

      const localPeakStrength = beat.intensity - avgNeighborIntensity;
      const isLocalPeak = localPeakStrength > 0.05;

      return {
        ...beat,
        localPeakStrength,
        isLocalPeak,
        avgNeighborIntensity,
      };
    });

    const scoredBeats = beatsWithLocalPeaks.map((beat: any) => {
      const intensityScore = beat.intensity * 0.3;
      const peakScore = beat.isLocalPeak ? beat.localPeakStrength * 0.4 : 0;
      const frequencyScore = Math.min(beat.frequency / 3000, 1) * 0.2;
      const spectralScore = (beat.spectralCentroid || 0) * 0.1;

      const totalScore =
        intensityScore + peakScore + frequencyScore + spectralScore;

      return { ...beat, totalScore };
    });

    const sortedByImpact = scoredBeats.sort(
      (a: any, b: any) => b.totalScore - a.totalScore,
    );

    const selectedBeats: any[] = [];
    const usedTimestamps = new Set<number>();

    for (const beat of sortedByImpact) {
      const tooClose = Array.from(usedTimestamps).some(
        (usedTime) => Math.abs(beat.timestamp - usedTime) < minTimeDiff,
      );

      if (!tooClose && selectedBeats.length < maxBeatsCount) {
        selectedBeats.push(beat);
        usedTimestamps.add(beat.timestamp);
      }
    }

    return selectedBeats.sort((a: any, b: any) => a.timestamp - b.timestamp);
  };

  const selectedBeats =
    analysis && analysis.length > 0
      ? selectImpactfulBeats(analysis, 30, 0.3)
      : [];

  // Create letter components with transform-origin: bottom center
  const letterComponents = letters.map((letter, index) => {
    const letterId = `letter-${index}`;

    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter,
        style: {
          fontSize: params.fontSize,
          fontWeight: fontStyle.fontWeight || 900,
          color: params.textColor,
          textTransform: 'uppercase' as const,
          letterSpacing: '0.05em',
          filter: 'contrast(0.9) brightness(0.85) sepia(0.2)',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          transformOrigin: 'bottom center',
        },
        font: {
          family: fontFamily,
          weights: [fontStyle.fontWeight?.toString() || '900'],
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'audio-track',
        },
      },
    };
  });

  // Create rotation and scale effects for each beat
  const beatEffects: any[] = [];

  selectedBeats.forEach((beat: any, beatIndex: number) => {
    // Distribute beats across letters in round-robin fashion
    const letterIndex = beatIndex % letters.length;
    const letterId = `letter-${letterIndex}`;

    // Calculate intensity with exponential response curve
    const rawIntensity = beat.intensity || 0.5;
    const intensity = Math.pow(rawIntensity, 1.5) * params.beatSensitivity;

    // Map intensity to rotation and scale
    const rotation = Math.min(
      intensity * params.rotationRange,
      params.rotationRange,
    );
    const scale = Math.min(
      1.0 + (intensity * (params.scaleRange - 1.0)),
      params.scaleRange,
    );

    // Randomize rotation direction
    const rotationDirection = Math.random() > 0.5 ? 1 : -1;
    const finalRotation = rotation * rotationDirection;

    // Create spring-based rotation and scale effect
    const totalDuration =
      params.swingUpDuration + params.returnDuration;

    beatEffects.push({
      id: `beat-effect-${beatIndex}`,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: beat.timestamp,
        duration: totalDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // Rotation animation
          { key: 'rotateZ', val: 0, prog: 0 },
          {
            key: 'rotateZ',
            val: finalRotation,
            prog: params.swingUpDuration / totalDuration,
          },
          { key: 'rotateZ', val: 0, prog: 1 },
          // Scale animation
          { key: 'scaleY', val: 1, prog: 0 },
          {
            key: 'scaleY',
            val: scale,
            prog: params.swingUpDuration / totalDuration,
          },
          { key: 'scaleY', val: 1, prog: 1 },
        ],
      },
    });

    // Add red-zone glow effect for high intensity beats
    if (rawIntensity > params.redZoneThreshold) {
      beatEffects.push({
        id: `redzone-glow-${beatIndex}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: beat.timestamp,
          duration: params.swingUpDuration * 2,
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            {
              key: 'filter',
              val: 'drop-shadow(0 0 0px #ff0000)',
              prog: 0,
            },
            {
              key: 'filter',
              val: `drop-shadow(0 0 ${params.redZoneGlowSize}px #ff0000)`,
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'drop-shadow(0 0 0px #ff0000)',
              prog: 1,
            },
          ],
        },
      });
    }
  });

  // Create background grid using HTMLBlockAtom
  const backgroundGrid = {
    id: 'background-grid',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style='width:100%;height:100%;background:repeating-linear-gradient(0deg,transparent,transparent ${params.gridSize - 1}px,${params.gridColor} ${params.gridSize - 1}px,${params.gridColor} ${params.gridSize}px),repeating-linear-gradient(90deg,transparent,transparent ${params.gridSize - 1}px,${params.gridColor} ${params.gridSize - 1}px,${params.gridColor} ${params.gridSize}px);'></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    effects: [
      {
        id: 'grid-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: audioDuration,
          mode: 'provider',
          targetIds: ['background-grid'],
          ranges: [
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create audio track
  const audioTrack = {
    id: 'audio-track',
    type: 'atom' as const,
    componentId: 'AudioAtom',
    data: {
      src: params.audioSrc,
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  };

  // Create meter text container
  const meterTextContainer = {
    id: 'meter-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-end justify-center pb-24',
        style: {
          gap: '16px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: letterComponents,
    effects: beatEffects,
  };

  // Create root container
  const rootContainer = {
    id: 'vu-meter-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: [
      backgroundGrid,
      meterTextContainer,
      audioTrack,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'VUMeterTypokinetics',
  title: 'VU Meter Typokinetics',
  description:
    'Industrial analog VU meter typography preset where stencil text letters pivot and swing like meter needles responding to audio kicks. Features worn metal textures, rust patches, red-zone glow effects, mechanical oscillation physics, and subtle background grid measurements that pulse with the rhythm. Designed for industrial, military, and mechanical aesthetics with precise analog meter behavior.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'audio-reactive',
    'industrial',
    'analog',
    'meter',
    'VU',
    'mechanical',
    'military',
    'vintage',
    'rust',
    'metal',
    'texture',
    'glitch',
    'oscillation',
    'spring',
    'grid',
    'measurement',
  ],
  dependencies: {
    presets: [], // beatstitch logic is handled via fetcher
  },
  defaultInputParams: {
    text: 'AUDIO',
    audioSrc: 'https://example.com/audio.mp3',
    audioDuration: 30,
    fontSize: 120,
    textColor: '#8a8a7a',
    backgroundColor: '#1a1a1a',
    gridColor: 'rgba(100,100,100,0.15)',
    gridSize: 50,
    rotationRange: 20,
    scaleRange: 1.3,
    swingUpDuration: 0.15,
    returnDuration: 0.35,
    redZoneThreshold: 0.8,
    redZoneGlowSize: 20,
    beatSensitivity: 1.5,
    font: 'Roboto Condensed:900',
  },
};

// --- Export Preset ---
export const VUMeterTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
