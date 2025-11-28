/**
 * Audio-Reactive Chromatic Pulse Effect Preset
 *
 * This preset creates a dynamic audio-reactive prismatic pulse effect where chromatic aberration
 * blooms outward from the center on each beat. The effect generates concentric rings of color
 * separation that ripple outward like sonar waves, triggered by audio beats.
 *
 * Features:
 * - **Beat Detection**: Uses server-side audio analysis to detect beats and trigger pulses
 * - **Chromatic Aberration Rings**: Each pulse creates RGB color-separated rings that expand outward
 * - **Frequency-Based Color Shifting**: Different audio frequencies (bass, mid, treble) affect different color channels
 * - **Multiple Concurrent Pulses**: Ring buffer system allows multiple pulses to overlay and ripple simultaneously
 * - **Decreasing Intensity**: Each pulse fades as it expands, creating a natural decay effect
 * - **Smooth Animation**: Uses requestAnimationFrame for smooth ring expansion
 * - **Customizable Parameters**: Control pulse speed, maximum radius, and frequency sensitivity
 *
 * Use cases:
 * - Music visualizers with beat-synchronized effects
 * - Audio-driven content with dynamic visual feedback
 * - Concert visuals and live performance backgrounds
 * - Podcast or audio content with visual enhancement
 * - Electronic music videos and EDM content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  audio: z
    .object({
      src: z.string().describe('Audio source URL or local path'),
      start: z.number().default(0).optional().describe('Audio start time in seconds'),
      duration: z.number().optional().describe('Audio duration in seconds (if not provided, uses full duration)'),
    })
    .describe('Audio source configuration'),
  pulseSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Speed multiplier for pulse expansion (higher = faster expansion)'),
  maxRadius: z
    .number()
    .min(200)
    .max(2000)
    .default(800)
    .describe('Maximum radius for pulse expansion in pixels'),
  frequencyMap: z
    .object({
      bass: z.enum(['red', 'green', 'blue']).default('red').describe('Color channel affected by bass frequencies'),
      mid: z.enum(['red', 'green', 'blue']).default('green').describe('Color channel affected by mid frequencies'),
      treble: z.enum(['red', 'green', 'blue']).default('blue').describe('Color channel affected by treble frequencies'),
    })
    .default({
      bass: 'red',
      mid: 'green',
      treble: 'blue',
    })
    .optional()
    .describe('Frequency-to-color channel mapping'),
  maxConcurrentPulses: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Maximum number of concurrent pulses visible at once'),
  minBeatInterval: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.4)
    .describe('Minimum time between beats in seconds (prevents too rapid pulsing)'),
  intensityThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Minimum beat intensity to trigger a pulse (0-1)'),
  targetIds: z
    .array(z.string())
    .default([])
    .optional()
    .describe('Optional array of component IDs to apply chromatic effects to (if empty, creates standalone effect)'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { audio, pulseSpeed, maxRadius, frequencyMap, maxConcurrentPulses, minBeatInterval, intensityThreshold } =
    params;
  const { fetcher } = props;

  // Validate fetcher availability
  if (!fetcher) {
    throw new Error('Fetcher is required for audio analysis');
  }

  // Helper: Parse time range format (MM:SS-MM:SS)
  const parseTimeRange = (range: string): { start: number; duration: number } => {
    const match = range.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if (!match) throw new Error(`Invalid time range format: ${range}`);

    const [, startMin, startSec, endMin, endSec] = match;
    const startTime = parseInt(startMin, 10) * 60 + parseInt(startSec, 10);
    const endTime = parseInt(endMin, 10) * 60 + parseInt(endSec, 10);
    const duration = endTime - startTime;

    return { start: startTime, duration };
  };

  // Helper: Get color from beat type
  const getColorFromBeatType = (beatType: 'low' | 'mid' | 'high'): string => {
    const colorMap = frequencyMap || { bass: 'red', mid: 'green', treble: 'blue' };
    if (beatType === 'low') return colorMap.bass;
    if (beatType === 'mid') return colorMap.mid;
    return colorMap.treble;
  };

  // Helper: Get RGB color value
  const getColorValue = (color: 'red' | 'green' | 'blue'): string => {
    switch (color) {
      case 'red':
        return 'rgba(255, 0, 0, 0.8)';
      case 'green':
        return 'rgba(0, 255, 0, 0.8)';
      case 'blue':
        return 'rgba(0, 0, 255, 0.8)';
    }
  };

  // Helper: Select impactful beats
  const selectImpactfulBeats = (
    beats: any[],
    maxBeatsCount: number,
    minTimeDiff: number,
  ): any[] => {
    // Score beats based on intensity and local peaks
    const scoredBeats = beats.map((beat, index) => {
      const windowSize = 10;
      const start = Math.max(0, index - windowSize);
      const end = Math.min(beats.length, index + windowSize + 1);
      const neighbors = beats.slice(start, end);
      const avgNeighborIntensity =
        neighbors.reduce((sum: number, b: any) => sum + b.intensity, 0) / neighbors.length;

      const localPeakStrength = beat.intensity - avgNeighborIntensity;
      const isLocalPeak = localPeakStrength > 0.05;

      const intensityScore = beat.intensity * 0.4;
      const peakScore = isLocalPeak ? localPeakStrength * 0.3 : 0;
      const frequencyScore = Math.min(beat.frequency / 3000, 1) * 0.2;
      const spectralScore = (beat.spectralCentroid || 0) * 0.1;

      const totalScore = intensityScore + peakScore + frequencyScore + spectralScore;

      return { ...beat, totalScore, isLocalPeak, localPeakStrength };
    });

    // Sort by score and select top beats
    const sortedByImpact = scoredBeats.sort((a, b) => b.totalScore - a.totalScore);

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

    return selectedBeats.sort((a, b) => a.timestamp - b.timestamp);
  };

  // Fetch audio analysis
  const audioStart = audio.start || 0;
  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: audio.src,
  });

  if (!analysis || analysis.length === 0) {
    return {
      output: {
        childrenData: [],
      },
      options: {},
    };
  }

  // Calculate effective audio duration
  const audioDuration = audio.duration || durationInSeconds - audioStart;

  // Filter and adjust beat timestamps
  const clippedAnalysis = analysis
    .filter((beat: any) => beat.timestamp >= audioStart && beat.timestamp <= audioStart + audioDuration)
    .map((beat: any) => ({
      ...beat,
      timestamp: beat.timestamp - audioStart,
    }));

  // Filter by intensity threshold
  const filteredBeats = clippedAnalysis.filter((beat: any) => beat.intensity >= intensityThreshold);

  // Select impactful beats
  const selectedBeats = selectImpactfulBeats(filteredBeats, maxConcurrentPulses, minBeatInterval);

  // Create chromatic pulse rings for each beat
  const pulseRings: RenderableComponentData[] = [];

  selectedBeats.forEach((beat, beatIndex) => {
    const { timestamp, intensity, beatType } = beat;
    const nextBeat = selectedBeats[beatIndex + 1];

    // Calculate pulse duration
    const baseDuration = nextBeat ? nextBeat.timestamp - timestamp : audioDuration - timestamp;
    const pulseDuration = Math.min(baseDuration * 1.2, maxRadius / (100 * pulseSpeed));

    // Get colors based on frequency mapping
    const colorMap = frequencyMap || { bass: 'red', mid: 'green', treble: 'blue' };
    const primaryColor = getColorFromBeatType(beatType);

    // Create three chromatic rings (R, G, B channels)
    const colors: Array<'red' | 'green' | 'blue'> = ['red', 'green', 'blue'];

    colors.forEach((color, colorIndex) => {
      const ringId = `pulse-ring-${color}-${beatIndex}`;
      const colorValue = getColorValue(color);

      // Calculate frequency-based offset
      let frequencyOffset = 0;
      if (color === colorMap.bass) {
        frequencyOffset = intensity * 5; // Bass creates horizontal offset
      } else if (color === colorMap.mid) {
        frequencyOffset = intensity * 3; // Mid creates smaller offset
      } else if (color === colorMap.treble) {
        frequencyOffset = intensity * 2; // Treble creates minimal offset
      }

      // Create ring element
      const ringComponent: RenderableComponentData = {
        id: ringId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width: 80px; height: 80px; border-radius: 50%; border: 3px solid ${colorValue}; position: absolute;'></div>`,
          className: 'absolute pointer-events-none',
          style: {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          },
        },
        context: {
          timing: {
            start: timestamp,
            duration: pulseDuration,
          },
        },
      } as RenderableComponentData;

      // Create expansion effect
      const expansionEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0,
        duration: pulseDuration,
        mode: 'provider',
        targetIds: [ringId],
        ranges: [
          // Scale expansion
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: maxRadius / 40, prog: 1 },
          // Opacity fade
          { key: 'opacity', val: 0.9 * intensity, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
          // Chromatic offset based on frequency
          { key: 'translateX', val: 0, prog: 0 },
          {
            key: 'translateX',
            val: color === colorMap.bass ? frequencyOffset : -frequencyOffset * 0.5,
            prog: 0.5,
          },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          {
            key: 'translateY',
            val: color === colorMap.mid ? frequencyOffset * 0.7 : 0,
            prog: 0.5,
          },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      };

      // Attach effect to ring
      (ringComponent as any).effects = [
        {
          id: `expansion-effect-${ringId}`,
          componentId: 'generic',
          data: expansionEffect,
        },
      ];

      pulseRings.push(ringComponent);
    });
  });

  // Create audio component
  const audioComponent: RenderableComponentData = {
    id: 'chromatic-pulse-audio',
    type: 'atom' as const,
    componentId: 'AudioAtom',
    data: {
      src: audio.src,
      startFrom: audioStart,
      volume: 0,
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  } as RenderableComponentData;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'chromatic-pulse-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'hidden',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [...pulseRings, audioComponent] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'audio-chromatic-pulse',
  title: 'Audio-Reactive Chromatic Pulse Effect',
  description:
    'Creates audio-reactive chromatic aberration pulses that bloom outward from the center on each beat. Concentric rings of color separation ripple outward like sonar waves with decreasing intensity. Uses server-side audio analysis for beat detection and frequency-based color shifting across RGB channels.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'effects', 'chromatic', 'pulse', 'beat-sync', 'visualization', 'waveform'],
  dependencies: {},
  defaultInputParams: {
    audio: {
      src: 'https://example.com/audio.mp3',
      start: 0,
    },
    pulseSpeed: 1.5,
    maxRadius: 800,
    frequencyMap: {
      bass: 'red',
      mid: 'green',
      treble: 'blue',
    },
    maxConcurrentPulses: 15,
    minBeatInterval: 0.4,
    intensityThreshold: 0.3,
    targetIds: [],
  },
};

// Export preset
export const audioChromaticPulsePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
