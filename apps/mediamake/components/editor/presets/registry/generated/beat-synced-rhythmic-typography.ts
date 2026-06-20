/**
 * Beat-Synced Rhythmic Typography Preset
 *
 * This preset creates a dynamic text animation that synchronizes individual words or phrases 
 * to musical beats. Text elements cascade in with punchy, percussive animations, bouncing 
 * from below with elastic overshoot, then settling into place. As new text enters, previous 
 * text scales down slightly and fades to 70% opacity, creating a layered depth effect.
 *
 * Features:
 * - **Audio Beat Detection**: Uses audio analysis API to detect beats and time each word's entrance
 * - **Elastic Bounce Animation**: Text bounces in from below with overshoot using cubic-bezier(0.68, -0.55, 0.265, 1.55)
 * - **Layered Depth Effect**: Previous text scales down to 95% and fades to 70% opacity when new text enters
 * - **Rhythmic Performance**: Creates a typography performance where text dances to the music
 * - **Beat-Reactive Scaling**: Optional waveform zoom effect for subtle beat-reactive scaling on active words
 * - **Center-Bottom Positioning**: Text positioned at bottom-1/3 left-1/2 -translate-x-1/2 for centered alignment
 * - **Performance Optimized**: Uses will-change: transform, opacity on animated elements
 *
 * Use cases:
 * - Music video lyrics that hit on the beat
 * - Rhythmic text reveals synchronized to audio
 * - Percussive typography animations
 * - Beat-driven content for social media
 * - Dynamic text overlays for musical content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  WaveformEffectData,
  BaseEffect,
} from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  audio: z
    .object({
      src: z.string().describe('Audio source URL'),
      start: z.number().optional().describe('Audio start time in seconds'),
      duration: z.number().optional().describe('Audio duration in seconds'),
      volume: z.number().min(0).max(2).default(1).optional().describe('Audio volume (0-2)'),
    })
    .describe('Audio source configuration'),
  
  words: z
    .array(z.string())
    .describe('Array of words or phrases to sync to beats'),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels'),
  
  fontFamily: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (CSS color value)'),
  
  enableBeatZoom: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable subtle beat-reactive zoom effect on active word'),
  
  zoomIntensity: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .optional()
    .describe('Zoom intensity for beat-reactive scaling'),
  
  backgroundColor: z
    .string()
    .optional()
    .describe('Optional background color for text container (e.g., "rgba(0,0,0,0.3)")'),
  
  maxBeats: z
    .number()
    .min(5)
    .max(50)
    .default(30)
    .optional()
    .describe('Maximum number of beats to use from audio analysis'),
  
  minTimeDiff: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Minimum time difference between beats in seconds'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  if (!fetcher) {
    throw new Error('Fetcher not available for audio analysis');
  }

  // Fetch audio analysis
  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audio.src,
  });

  if (!analysis || analysis.length === 0) {
    throw new Error('No beats detected in audio');
  }

  // Helper: Select impactful beats
  const selectImpactfulBeats = (
    beats: any[],
    maxBeatsCount: number,
    minTimeDiff: number,
  ) => {
    // Calculate local intensity peaks
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
        avgNeighborIntensity,
      };
    });

    // Score beats
    const scoredBeats = beatsWithLocalPeaks.map((beat) => {
      const intensityScore = beat.intensity * 0.3;
      const peakScore = beat.isLocalPeak ? beat.localPeakStrength * 0.4 : 0;
      const frequencyScore = Math.min(beat.frequency / 3000, 1) * 0.2;
      const spectralScore = (beat.spectralCentroid || 0) * 0.1;

      const totalScore =
        intensityScore + peakScore + frequencyScore + spectralScore;

      return { ...beat, totalScore };
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

  // Filter and adjust beats based on audio start/duration
  const audioStart = params.audio.start || 0;
  const audioDuration = params.audio.duration || durationInSeconds;

  const clippedAnalysis = analysis.filter(
    (beat: any) =>
      beat.timestamp >= audioStart &&
      beat.timestamp <= audioStart + audioDuration,
  );

  const adjustedBeats = clippedAnalysis.map((beat: any) => ({
    ...beat,
    timestamp: beat.timestamp - audioStart,
  }));

  // Select impactful beats
  const selectedBeats = selectImpactfulBeats(
    adjustedBeats,
    params.maxBeats || 30,
    params.minTimeDiff || 0.5,
  );

  // Limit to available words
  const beatsToUse = selectedBeats.slice(0, params.words.length);

  // Parse font string
  const fontString = params.fontFamily || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  let fontStyle: any = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2];
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold
  }

  // Create text elements for each beat
  const textElements: RenderableComponentData[] = beatsToUse.map((beat, index) => {
    const word = params.words[index];
    const nextBeat = beatsToUse[index + 1];
    const beatTime = beat.timestamp;
    const duration = nextBeat
      ? nextBeat.timestamp - beatTime
      : audioDuration - beatTime;

    const textElementId = `beat-text-${index}`;
    const textAtomId = `beat-text-atom-${index}`;

    // Entrance effect: bounce from below with elastic overshoot
    const entranceEffect: BaseEffect = {
      id: `entrance-${textElementId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: 0.4,
        mode: 'provider',
        targetIds: [textAtomId],
        ranges: [
          { key: 'translateY', val: '100%', prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1.1, prog: 0.6 },
          { key: 'scale', val: 1.0, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
        ],
      } as GenericEffectData,
    };

    // Scale down effect when next text enters
    const scaleDownEffect: BaseEffect | null = nextBeat
      ? {
          id: `scale-down-${textElementId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: duration - 0.2,
            duration: 0.2,
            mode: 'provider',
            targetIds: [textAtomId],
            ranges: [
              { key: 'scale', val: 1.0, prog: 0 },
              { key: 'scale', val: 0.95, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 1 },
            ],
          } as GenericEffectData,
        }
      : null;

    // Optional beat-reactive zoom effect
    const beatZoomEffect: BaseEffect | null =
      params.enableBeatZoom !== false
        ? {
            id: `beat-zoom-${textElementId}`,
            componentId: 'waveform',
            data: {
              audioSrc: params.audio.src,
              audioProperty: 'bass',
              effectType: 'zoom',
              intensity: params.zoomIntensity || 0.15,
              baseScale: 1,
              sensitivity: 1.5,
              threshold: 0.2,
              numberOfSamples: 128,
              useFrequencyData: true,
              windowInSeconds: 1 / 30,
              mode: 'provider',
              targetIds: [textAtomId],
              start: 0,
              duration: duration,
              smoothNormalisation: 1,
            } as WaveformEffectData,
          }
        : null;

    const effects = [entranceEffect, scaleDownEffect, beatZoomEffect].filter(
      Boolean,
    ) as BaseEffect[];

    return {
      id: textElementId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute bottom-1/3 left-1/2 -translate-x-1/2',
          style: {
            willChange: 'transform, opacity',
          },
        },
      },
      context: {
        timing: {
          start: beatTime,
          duration: duration,
        },
      },
      childrenData: [
        {
          id: textAtomId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word,
            style: {
              fontSize: params.fontSize || 48,
              fontWeight: fontStyle.fontWeight,
              ...(fontStyle.fontStyle && { fontStyle: fontStyle.fontStyle }),
              color: params.textColor || '#ffffff',
              textAlign: 'center',
              ...(params.backgroundColor && {
                backgroundColor: params.backgroundColor,
                padding: '20px 40px',
                borderRadius: '20px',
              }),
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight
                ? { weights: [fontStyle.fontWeight.toString()] }
                : {}),
            },
          },
          effects: effects,
        } as RenderableComponentData,
      ] as RenderableComponentData[],
    } as RenderableComponentData;
  });

  // Audio element
  const audioElement: RenderableComponentData = {
    id: 'beat-synced-audio',
    type: 'atom' as const,
    componentId: 'AudioAtom',
    data: {
      src: params.audio.src,
      volume: params.audio.volume || 1,
      startFrom: params.audio.start || 0,
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'beat-synced-typography-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'beat-synced-audio',
      },
    },
    childrenData: [
      {
        id: 'text-stack-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'beat-synced-audio',
          },
        },
        childrenData: textElements as RenderableComponentData[],
      } as RenderableComponentData,
      audioElement,
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

const presetMetadata: PresetMetadata = {
  id: 'beat-synced-rhythmic-typography',
  title: 'Beat-Synced Rhythmic Typography',
  description:
    'Dynamic text animation preset that synchronizes individual words or phrases to musical beats with punchy, percussive animations. Each word bounces in from below with elastic overshoot on beat hits, while previous text scales down and fades, creating a layered depth effect. Uses audio analysis API to detect beats and time entrances accordingly.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'audio',
    'beat-sync',
    'animation',
    'typography',
    'music',
    'rhythmic',
    'percussive',
  ],
  dependencies: {},
  defaultInputParams: {
    audio: {
      src: 'https://example.com/audio.mp3',
      start: 0,
      volume: 1,
    },
    words: [
      'Feel',
      'The',
      'Beat',
      'Drop',
      'Now',
      'Dance',
      'Move',
      'Flow',
      'Groove',
      'Vibe',
    ],
    fontSize: 48,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    enableBeatZoom: true,
    zoomIntensity: 0.15,
    maxBeats: 30,
    minTimeDiff: 0.5,
  },
};

export const beatSyncedRhythmicTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};