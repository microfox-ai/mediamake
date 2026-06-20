/**
 * Split-Flap Display Beat Animation Preset
 *
 * This preset creates a vintage mechanical split-flap display animation synchronized to musical beats.
 * Each beat triggers a 3D flip rotation effect where text mechanically flips from current to next word,
 * with tactile shake effects, motion blur, and realistic shadows mimicking train station or airport departure boards.
 *
 * Features:
 * - **Beat-Synchronized Flips**: Text changes on detected audio beats with 3D rotateX animation
 * - **Mechanical Feel**: Shake effects on impact simulate physical movement
 * - **Motion Blur**: Blur effect during flip midpoint for realistic motion
 * - **3D Perspective**: Drop shadows and perspective transform for depth
 * - **Configurable Words**: Display custom word sequences or beat counter
 * - **Audio Analysis**: Uses beat detection to trigger flip animations
 *
 * Use cases:
 * - Creating retro-style lyric videos
 * - Building vintage countdown animations
 * - Adding mechanical text effects to music videos
 * - Creating nostalgic departure board aesthetics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Zod schema for input parameters
const presetParams = z.object({
  audio: z.object({
    src: z.string().describe('Audio source URL for beat detection'),
    volume: z.number().min(0).max(2).default(1).optional().describe('Audio volume (0-2)'),
    start: z.number().min(0).default(0).optional().describe('Audio start time in seconds'),
    duration: z.number().min(0).optional().describe('Audio duration in seconds'),
    muted: z.boolean().default(false).optional().describe('Mute audio playback'),
  }).describe('Audio configuration for beat detection'),
  
  words: z.array(z.string()).optional().describe('Array of words to display on each beat (if not provided, shows beat counter)'),
  
  maxBeats: z.number().min(5).max(50).default(20).optional().describe('Maximum number of beats to use'),
  minTimeDiff: z.number().min(0.1).max(2).default(0.5).optional().describe('Minimum time difference between beats in seconds'),
  
  flipDuration: z.number().min(0.1).max(1).default(0.3).optional().describe('Duration of flip animation in seconds'),
  shakeDuration: z.number().min(0.01).max(0.2).default(0.05).optional().describe('Duration of shake effect in seconds'),
  shakeIntensity: z.number().min(0).max(10).default(2).optional().describe('Shake intensity in pixels'),
  
  fontSize: z.number().min(20).max(200).default(80).optional().describe('Font size in pixels'),
  textColor: z.string().default('#FFEB3B').optional().describe('Text color (CSS color)'),
  backgroundColor: z.string().default('#1a1a1a').optional().describe('Background color (CSS color)'),
  
  font: z.string().default('Courier New').optional().describe('Font family (monospace recommended)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;
  
  // Helper function to select impactful beats
  const selectImpactfulBeats = (
    beats: any[],
    maxBeatsCount: number,
    minTimeDiff: number,
  ) => {
    const beatsWithLocalPeaks = beats.map((beat, index) => {
      const windowSize = 10;
      const start = Math.max(0, index - windowSize);
      const end = Math.min(beats.length, index + windowSize + 1);
      const neighbors = beats.slice(start, end);
      const avgNeighborIntensity =
        neighbors.reduce((sum, b) => sum + b.intensity, 0) / neighbors.length;

      const localPeakStrength = beat.intensity - avgNeighborIntensity;
      const isLocalPeak = localPeakStrength > 0.05;

      return {
        ...beat,
        localPeakStrength,
        isLocalPeak,
      };
    });

    const scoredBeats = beatsWithLocalPeaks.map((beat) => {
      const intensityScore = beat.intensity * 0.3;
      const peakScore = beat.isLocalPeak ? beat.localPeakStrength * 0.4 : 0;
      const frequencyScore = Math.min(beat.frequency / 3000, 1) * 0.2;
      const spectralScore = (beat.spectralCentroid || 0) * 0.1;

      const totalScore =
        intensityScore + peakScore + frequencyScore + spectralScore;

      return { ...beat, totalScore };
    });

    const sortedByImpact = scoredBeats.sort(
      (a, b) => b.totalScore - a.totalScore,
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

    return selectedBeats.sort((a, b) => a.timestamp - b.timestamp);
  };

  // Fetch audio analysis
  if (!fetcher) {
    throw new Error('Fetcher not available in props');
  }

  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audio.src,
  });

  if (!analysis || analysis.length === 0) {
    return {
      output: {
        childrenData: [],
      },
      options: {},
    };
  }

  const audioStart = params.audio.start || 0;
  const audioDuration = params.audio.duration || durationInSeconds - audioStart;

  // Filter and adjust timestamps
  const clippedAnalysis = analysis
    .filter((beat: any) => beat.timestamp >= audioStart && beat.timestamp <= audioStart + audioDuration)
    .map((beat: any) => ({
      ...beat,
      timestamp: beat.timestamp - audioStart,
    }));

  // Select impactful beats
  const selectedBeats = selectImpactfulBeats(
    clippedAnalysis,
    params.maxBeats || 20,
    params.minTimeDiff || 0.5,
  );

  // Create flip card components for each beat
  const flipDuration = params.flipDuration || 0.3;
  const shakeDuration = params.shakeDuration || 0.05;
  const shakeIntensity = params.shakeIntensity || 2;
  const fontSize = params.fontSize || 80;
  const textColor = params.textColor || '#FFEB3B';
  const backgroundColor = params.backgroundColor || '#1a1a1a';
  const font = params.font || 'Courier New';

  const flipCards: RenderableComponentData[] = selectedBeats.map((beat, index) => {
    const nextBeat = selectedBeats[index + 1];
    const duration = nextBeat
      ? nextBeat.timestamp - beat.timestamp
      : audioDuration - beat.timestamp;

    const currentText = params.words
      ? params.words[index % params.words.length]
      : `${index + 1}`;
    const nextText = params.words
      ? params.words[(index + 1) % params.words.length]
      : `${index + 2}`;

    const flipCardId = `flip-card-${index}`;
    const currentTextId = `current-text-${index}`;
    const nextTextId = `next-text-${index}`;

    return {
      id: flipCardId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative bg-gray-900 text-yellow-400 font-mono rounded drop-shadow-lg overflow-hidden',
          style: {
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            fontSize: `${fontSize}px`,
            color: textColor,
            backgroundColor: backgroundColor,
            padding: '0.5em 1em',
            fontFamily: font,
            fontWeight: 'bold',
          },
        },
      },
      context: {
        timing: {
          start: beat.timestamp,
          duration: duration,
        },
      },
      effects: [
        // Shake effect at start (impact)
        {
          id: `shake-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: shakeDuration,
            mode: 'provider',
            targetIds: [flipCardId],
            ranges: [
              { key: 'translateX', val: shakeIntensity, prog: 0 },
              { key: 'translateX', val: -shakeIntensity, prog: 0.25 },
              { key: 'translateX', val: shakeIntensity, prog: 0.5 },
              { key: 'translateX', val: -shakeIntensity, prog: 0.75 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: shakeIntensity / 2, prog: 0 },
              { key: 'translateY', val: -shakeIntensity / 2, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Current text (front face)
        {
          id: currentTextId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: currentText,
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: flipDuration,
            },
          },
          effects: [
            // Flip out effect (rotateX 0 to -180)
            {
              id: `flip-out-${index}`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: flipDuration,
                mode: 'provider',
                targetIds: [currentTextId],
                ranges: [
                  { key: 'rotateX', val: 0, prog: 0 },
                  { key: 'rotateX', val: -180, prog: 1 },
                  // Motion blur at midpoint
                  { key: 'filter', val: 'blur(0px)', prog: 0 },
                  { key: 'filter', val: 'blur(2px)', prog: 0.5 },
                  { key: 'filter', val: 'blur(0px)', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        // Next text (back face)
        {
          id: nextTextId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: nextText,
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              backfaceVisibility: 'hidden',
              transformStyle: 'preserve-3d',
              transform: 'rotateX(180deg)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: flipDuration,
            },
          },
          effects: [
            // Flip in effect (rotateX 180 to 0)
            {
              id: `flip-in-${index}`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: flipDuration,
                mode: 'provider',
                targetIds: [nextTextId],
                ranges: [
                  { key: 'rotateX', val: 180, prog: 0 },
                  { key: 'rotateX', val: 0, prog: 1 },
                  // Motion blur at midpoint
                  { key: 'filter', val: 'blur(0px)', prog: 0 },
                  { key: 'filter', val: 'blur(2px)', prog: 0.5 },
                  { key: 'filter', val: 'blur(0px)', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Audio track
  const audioTrack: RenderableComponentData = {
    id: 'split-flap-audio',
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: params.audio.src,
      volume: params.audio.volume ?? 1,
      startFrom: params.audio.start ?? 0,
      muted: params.audio.muted ? { type: 'full', value: true } : undefined,
    },
    context: {
      timing: {
        start: 0,
      },
    },
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'split-flap-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [
      audioTrack,
      {
        id: 'flip-display-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
        childrenData: flipCards,
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

const presetMetadata: PresetMetadata = {
  id: 'split-flap-display',
  title: 'Split-Flap Display Beat Animation',
  description:
    'Vintage mechanical split-flap display animation synchronized to musical beats. Each beat triggers a 3D flip rotation effect (rotateX) where text mechanically flips from current to next word, with tactile shake effects, motion blur, and realistic shadows mimicking train station or airport departure boards.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'beat-sync',
    'animation',
    'split-flap',
    'mechanical',
    'vintage',
    'retro',
    '3d',
    'flip',
    'typography',
  ],
  defaultInputParams: {
    audio: {
      src: 'https://example.com/audio.mp3',
      volume: 1,
      start: 0,
      muted: false,
    },
    words: ['HELLO', 'WORLD', 'SPLIT', 'FLAP', 'DISPLAY'],
    maxBeats: 20,
    minTimeDiff: 0.5,
    flipDuration: 0.3,
    shakeDuration: 0.05,
    shakeIntensity: 2,
    fontSize: 80,
    textColor: '#FFEB3B',
    backgroundColor: '#1a1a1a',
    font: 'Courier New',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const splitFlapDisplayPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
