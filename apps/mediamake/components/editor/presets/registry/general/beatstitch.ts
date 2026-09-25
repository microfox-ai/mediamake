/**
 * BeatStitch Preset
 *
 * This preset analyzes audio tracks to detect beats and automatically syncs video/image clips
 * to the musical rhythm. It creates dynamic, beat-synchronized video sequences with smooth
 * transitions between clips.
 *
 * Features:
 * - **Audio Analysis**: Automatically detects beats, intensity, and frequency from audio files
 * - **Smart Beat Selection**: Prioritizes high-impact beats for clip changes using intensity analysis
 * - **Flexible Clip Ranges**: Optionally apply beat stitching only to specific time ranges
 * - **Transition Effects**: Shake and smooth-blur transitions with adjustable impact
 * - **Continuous Scale Animation**: Dynamic zoom effects that adapt to clip duration
 * - **Beat Counter**: Optional visual beat counter overlay (can be hidden)
 * - **Clip Management**: Repeat clips when needed or use unique clips per beat
 *
 * Use cases:
 * - Music video creation with beat-synced cuts
 * - Dynamic video montages synchronized to music
 * - Creating energetic, rhythm-driven content
 * - Highlighting specific musical moments with visual cuts
 * - Building engaging social media content with music
 */

import {
  InputCompositionProps,
  PanEffectData,
  ZoomEffectData,
  GenericEffectData,
} from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { paramMetaTypes } from '../../dataTypes';

type Effect = {
  id: string;
  componentId: string;
  data: any;
};

const presetParams = z.object({
  trackName: z.string().describe('Name of the track ( used for the ID )'),
  audio: z.object({
    src: z.string().describe('Audio source URL'),
    start: z.number().optional(),
    duration: z.number().optional(),
    muted: z.boolean().optional(),
  }),
  clips: z
    .array(
      z.object({
        src: z.string().url().describe('Clip source URL'),
        type: z.enum(['video', 'image']).describe('Clip type'),
        fit: z
          .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
          .optional()
          .describe('How to fit the clip'),
        objectPosition: z
          .enum(['top', 'center', 'bottom', 'left', 'right'])
          .optional()
          .describe('Object position'),
        startOffset: z.number().optional().describe('Start offset in seconds'),
        duration: z.number().optional().describe('Duration in seconds'),
        loop: z.boolean().optional().describe('Loop the clip'),
        mute: z.boolean().optional().describe('Mute the clip'),
        volume: z.number().optional().describe('Volume level'),
        opacity: z.number().min(0).max(1).optional().describe('Opacity level'),
      }),
    )
    .min(1)
    .describe('Array of video/image clips to cut with beats'),
  rangeString: z
    .string()
    .optional()
    .meta({ [paramMetaTypes.rangeField]: true })
    .describe(
      'Time ranges where beat stitch should be applied (MM:SS-MM:SS, comma-separated, e.g. 0:10-0:20,0:30-0:40)',
    ),
  minTimeDiff: z
    .number()
    .min(0.1)
    .max(2)
    .optional()
    .describe('Minimum time between beats in seconds')
    .default(0.5),
  maxBeats: z
    .number()
    .min(0)
    .max(50)
    .optional()
    .describe(
      'Maximum number of beats to show (0 = auto-detect based on music)',
    )
    .default(0),
  isRepeatClips: z
    .boolean()
    .optional()
    .describe('Whether to repeat clips when there are more beats than clips')
    .default(true),
  hideBeatCount: z
    .boolean()
    .optional()
    .describe('Whether to hide the beat count')
    .default(false),
  transition: z.object({
    impact: z.number().optional().describe('The impact of the transition'),
    type: z.enum(['shake', 'smooth-blur']),
  }),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: {
    config: InputCompositionProps['config'];
    fetcher: (url: string, data: any) => Promise<any>;
    helpers?: Record<string, Function>;
  },
): Promise<Partial<PresetOutput>> => {
  const {
    trackName,
    audio,
    clips,
    minTimeDiff,
    maxBeats,
    isRepeatClips,
  } = params;

  const { config, fetcher, helpers } = props;
  const normalizeRangeString = helpers!.normalizeRangeString as (
    v: unknown,
  ) => string;
  const parseTimeRange = helpers!.parseTimeRange as (
    range: string,
  ) => { start: number; end: number } | null;
  const parseClipRanges = (ranges: string[]) =>
    ranges
      .map(r => parseTimeRange(r))
      .filter((r): r is { start: number; end: number } => r !== null);

  // Imageloop-style rangeString; accept legacy clipRanges array/string
  const rangeString = normalizeRangeString(
    (params as any).rangeString ?? (params as any).clipRanges,
  );
  const clipRanges = rangeString
    ? rangeString
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : [];
  const { analysis, durationInSeconds, summary } = await fetcher(
    '/api/analyze-audio',
    {
      audioSrc: audio.src,
    },
  );

  if (!analysis || analysis.length === 0) {
    // Return an empty output or some indication of failure
    return {
      output: {
        childrenData: [],
      },
      options: {},
    };
  }

  const getTransitionDuration = (
    transition: z.infer<typeof presetParams>['transition'],
  ): number => {
    const impact = transition.impact ?? 1;
    switch (transition.type) {
      case 'smooth-blur':
        // Calculate a duration that gets shorter with higher impact
        return Math.max(0.4, 0.9 - impact * 0.3);
      case 'shake':
      default:
        // Shake is a quick effect, so it doesn't need a long overlap
        return 0.3;
    }
  };

  // Smart calculation of optimal beat count based on musical characteristics
  const calculateOptimalBeatCount = (beats: any[], duration: number) => {
    if (beats.length === 0) return 10;

    // Analyze musical characteristics
    const avgIntensity =
      beats.reduce((sum, b) => sum + b.intensity, 0) / beats.length;
    const avgFrequency =
      beats.reduce((sum, b) => sum + b.frequency, 0) / beats.length;

    // Calculate tempo (beats per minute)
    const totalBeats = beats.length;
    const tempo = (totalBeats / duration) * 60; // BPM

    // Calculate intensity variance (how dynamic the music is)
    const intensityVariance =
      beats.reduce(
        (sum, b) => sum + Math.pow(b.intensity - avgIntensity, 2),
        0,
      ) / beats.length;

    // Calculate frequency diversity (how varied the frequencies are)
    const frequencyVariance =
      beats.reduce(
        (sum, b) => sum + Math.pow(b.frequency - avgFrequency, 2),
        0,
      ) / beats.length;

    // Smart calculation based on musical characteristics
    let optimalBeats = 10; // Base number

    // Tempo-based adjustment
    if (tempo > 140) {
      // Fast music - more frequent cuts
      optimalBeats = Math.min(25, Math.floor(duration * 1.5));
    } else if (tempo > 100) {
      // Medium tempo - balanced cuts
      optimalBeats = Math.min(20, Math.floor(duration * 1.2));
    } else {
      // Slow music - fewer, more impactful cuts
      optimalBeats = Math.min(15, Math.floor(duration * 0.8));
    }

    // Adjust based on intensity variance (more dynamic = more cuts)
    if (intensityVariance > 0.1) {
      optimalBeats = Math.min(optimalBeats + 5, 30);
    }

    // Adjust based on frequency diversity (more varied = more cuts)
    if (frequencyVariance > 100000) {
      optimalBeats = Math.min(optimalBeats + 3, 30);
    }

    // Ensure minimum and maximum bounds
    optimalBeats = Math.max(5, Math.min(optimalBeats, 30));

    return optimalBeats;
  };

  // Smart beat selection for clip changes - prioritize highest impact moments
  const selectImpactfulBeats = (
    beats: any[],
    maxBeatsCount: number = 30,
    minTimeDiff: number = 0.5,
  ) => {
    if (beats.length === 0) return [];

    // Calculate local intensity peaks (beats that are significantly higher than neighbors)
    const beatsWithLocalPeaks = beats.map((beat, index) => {
      const windowSize = 10; // Increased window for better musical context
      const start = Math.max(0, index - windowSize);
      const end = Math.min(beats.length, index + windowSize + 1);
      const neighbors = beats.slice(start, end);
      const avgNeighborIntensity =
        neighbors.reduce((sum, b) => sum + b.intensity, 0) / neighbors.length;

      const localPeakStrength = beat.intensity - avgNeighborIntensity;
      const isLocalPeak = localPeakStrength > 0.05; // More sensitive threshold

      return {
        ...beat,
        localPeakStrength,
        isLocalPeak,
        avgNeighborIntensity,
      };
    });

    // Score beats based on multiple factors
    const scoredBeats = beatsWithLocalPeaks.map(beat => {
      // Base intensity score (but not too dominant)
      const intensityScore = beat.intensity * 0.3;

      // Local peak bonus (most important for impact)
      const peakScore = beat.isLocalPeak ? beat.localPeakStrength * 0.4 : 0;

      // Frequency diversity (prefer varied frequencies)
      const frequencyScore = Math.min(beat.frequency / 3000, 1) * 0.2;

      // Spectral richness (more complex sounds)
      const spectralScore = (beat.spectralCentroid || 0) * 0.1;

      const totalScore =
        intensityScore + peakScore + frequencyScore + spectralScore;

      return {
        ...beat,
        totalScore,
        intensityScore,
        peakScore,
        frequencyScore,
        spectralScore,
      };
    });

    // Sort by total score (highest impact first)
    const sortedByImpact = scoredBeats.sort(
      (a, b) => b.totalScore - a.totalScore,
    );

    const selectedBeats: any[] = [];
    const usedTimestamps = new Set<number>();

    // Select beats ensuring minimum time difference

    for (const beat of sortedByImpact) {
      const tooClose = Array.from(usedTimestamps).some(
        usedTime => Math.abs(beat.timestamp - usedTime) < minTimeDiff,
      );

      if (!tooClose && selectedBeats.length < maxBeatsCount) {
        selectedBeats.push(beat);
        usedTimestamps.add(beat.timestamp);
      }
    }

    // If we need more beats, fill with remaining high-scoring ones that still respect minTimeDiff
    if (selectedBeats.length < maxBeatsCount) {
      const remainingBeats = sortedByImpact.filter(
        beat => !selectedBeats.includes(beat),
      );

      for (const beat of remainingBeats) {
        if (selectedBeats.length < maxBeatsCount) {
          // Still check minTimeDiff even in fallback
          const tooClose = Array.from(usedTimestamps).some(
            usedTime => Math.abs(beat.timestamp - usedTime) < minTimeDiff,
          );

          if (!tooClose) {
            selectedBeats.push(beat);
            usedTimestamps.add(beat.timestamp);
          }
        }
      }
    }

    const finalBeats = selectedBeats.sort((a, b) => a.timestamp - b.timestamp);

    return finalBeats;
  };

  // First, clip the analysis data based on audio start and duration or clipRanges
  const clipAnalysisData = (
    analysisData: any[],
    audioStart: number = 0,
    audioDuration?: number,
    clipRanges?: string[],
  ) => {
    let clippedData = analysisData;

    if (clipRanges && clipRanges.length > 0) {
      // If clipRanges are provided, filter beats to only include those within the specified ranges
      const parsedRanges = parseClipRanges(clipRanges);

      clippedData = analysisData.filter(beat => {
        return parsedRanges.some(
          range => beat.timestamp >= range.start && beat.timestamp <= range.end,
        );
      });

      // Don't adjust timestamps - keep them as absolute timestamps
      // The timing will be handled by the main track's start time
      clippedData = clippedData.map(beat => ({
        ...beat,
        timestamp: beat.timestamp,
      }));
    } else {
      // Original behavior: clip based on audio start and duration
      clippedData = analysisData.filter(beat => beat.timestamp >= audioStart);

      if (audioDuration) {
        const endTime = audioStart + audioDuration;
        clippedData = clippedData.filter(beat => beat.timestamp <= endTime);
      }

      // Adjust timestamps to be relative to the video start
      // If audio starts at 54s in the video, beats at 54.5s should appear at 0.5s in video
      // and if the clip duration was 58.5-59.5s & 64.5-65.5s, then the clips must only be visible from 0.5s to 1.5 seconds & 6.5s to 7.5s in the video, rest is empty space.
      clippedData = clippedData.map(beat => ({
        ...beat,
        timestamp: beat.timestamp - audioStart,
      }));
    }

    return clippedData;
  };

  const transitionDuration = getTransitionDuration(params.transition);
  const allClipsWithEffects: any[] = [];
  const allTextComponents: any[] = [];

  if (clipRanges && clipRanges.length > 0) {
    const parsedRanges = parseClipRanges(clipRanges);

    for (const range of parsedRanges) {
      // Step 1: Filter analysis data for the current range.
      const analysisInRange = analysis.filter(
        (beat: any) =>
          beat.timestamp >= range.start && beat.timestamp <= range.end,
      );

      // Debug logs for analysis data
      console.log(`🔍 Analysis data for range ${range.start}-${range.end}:`);
      console.log(`  - Total beats in range:`, analysisInRange.length);
      console.log(
        `  - First 3 beats:`,
        analysisInRange.slice(0, 3).map((b: any) => ({
          timestamp: b.timestamp,
          intensity: b.intensity,
        })),
      );

      // Step 2: Calculate optimal beats for this specific range.
      let maxBeatsForRange = maxBeats;
      if (maxBeats === 0) {
        maxBeatsForRange = calculateOptimalBeatCount(
          analysisInRange,
          range.end - range.start,
        );
      }

      // Step 3: Select the most impactful beats within this range.
      const selectedBeatsInRange = selectImpactfulBeats(
        analysisInRange,
        maxBeatsForRange,
        minTimeDiff,
      );

      // Step 4: Generate clip components for the beats in this range.
      const clipsInRange = [];

      // Add first clip that starts at the beginning of the range (before first beat)
      if (selectedBeatsInRange.length > 0 && clips.length > 0) {
        // Find the actual first beat in the range (not just the first selected beat)
        const firstBeatInRange = analysisInRange.find(
          (beat: any) => beat.timestamp >= range.start,
        );
        const firstBeat = firstBeatInRange || selectedBeatsInRange[0];
        const firstClip = clips[0];

        // Debug logs
        console.log(`🎵 Range ${range.start}-${range.end}:`);
        console.log(
          `  - First beat in range timestamp:`,
          firstBeatInRange?.timestamp,
        );
        console.log(
          `  - First selected beat timestamp:`,
          selectedBeatsInRange[0]?.timestamp,
        );
        console.log(`  - Using beat timestamp:`, firstBeat.timestamp);
        console.log(
          `  - Time to first beat:`,
          firstBeat.timestamp - range.start,
        );

        // Always create a first clip, even if very short
        const timeToFirstBeat = firstBeat.timestamp - range.start;
        const firstClipDuration = timeToFirstBeat;

        const firstClipType =
          firstClip.type ||
          (firstClip.src.match(/\.(png|jpg|jpeg|gif|webp|svg|avif)$/i)
            ? 'image'
            : 'video');
        const firstComponentId =
          firstClipType === 'image' ? 'ImageAtom' : 'VideoAtom';

        clipsInRange.push({
          id: `${trackName}-beat-clip-first-${range.start}`,
          componentId: firstComponentId,
          type: 'atom' as const,
          data: {
            src: firstClip.src,
            className: 'w-full h-full object-cover',
            fit: firstClip.fit || 'cover',
            ...(firstClipType === 'video'
              ? {
                  loop: firstClip.loop || false,
                  muted: firstClip.mute || true,
                  volume: firstClip.volume || 0,
                  startFrom: firstClip.startOffset || 0,
                }
              : {}),
            style: {
              ...(firstClip.opacity !== undefined
                ? { opacity: firstClip.opacity }
                : {}),
              ...(firstClip.objectPosition !== undefined
                ? { objectPosition: firstClip.objectPosition }
                : {}),
            },
          },
          context: { timing: { start: 0, duration: firstClipDuration } },
          effects: [],
        });

        console.log(
          `  - First clip timing: start=0, duration=${firstClipDuration}`,
        );
      }

      // Add beat-synced clips
      const beatSyncedClips = selectedBeatsInRange.reduce(
        (acc: any[], beatData: any, index: number) => {
          const { timestamp } = beatData;
          const nextBeat = selectedBeatsInRange[index + 1];
          const baseDuration = nextBeat
            ? nextBeat.timestamp - timestamp
            : range.end - timestamp;

          const overlapTime = transitionDuration;
          const duration = baseDuration + overlapTime;
          const startTime = timestamp - overlapTime / 2;

          let clip;
          if (isRepeatClips) {
            const clipIndex = (index + 1) % clips.length; // +1 because first clip is already used
            clip = clips[clipIndex];
          } else {
            const clipIndex = index + 1;
            if (clipIndex < clips.length) {
              clip = clips[clipIndex];
            }
          }

          if (!clip) return acc;

          const clipType =
            clip.type ||
            (clip.src.match(/\.(png|jpg|jpeg|gif|webp|svg|avif)$/i)
              ? 'image'
              : 'video');

          const componentId = clipType === 'image' ? 'ImageAtom' : 'VideoAtom';
          const component = {
            id: `${trackName}-beat-clip-${range.start}-${index}`,
            componentId,
            type: 'atom' as const,
            data: {
              src: clip.src,
              className: 'w-full h-full object-cover',
              fit: clip.fit || 'cover',
              ...(clipType === 'video'
                ? {
                    loop: clip.loop || false,
                    muted: clip.mute || true,
                    volume: clip.volume || 0,
                    startFrom: clip.startOffset || 0,
                  }
                : {}),
              style: {
                ...(clip.opacity !== undefined
                  ? { opacity: clip.opacity }
                  : {}),
                ...(clip.objectPosition !== undefined
                  ? { objectPosition: clip.objectPosition }
                  : {}),
              },
            },
            context: { timing: { start: startTime, duration } },
            effects: [],
          };
          acc.push(component);
          return acc;
        },
        [],
      );

      clipsInRange.push(...beatSyncedClips);

      // Step 5: Apply transition effects to the clips in this range.
      const clipsInRangeWithEffects = clipsInRange.map((clip, index) => {
        const effects: Effect[] = [...(clip.effects || [])];
        // Effect logic can be added here if it needs to be range-specific
        return { ...clip, effects };
      });

      // Step 6: Generate text components for this range.
      const textInRange = selectedBeatsInRange.map(
        (beatData: any, index: number) => {
          const { timestamp, intensity, beatType } = beatData;
          const nextBeat = selectedBeatsInRange[index + 1];
          const duration = nextBeat
            ? nextBeat.timestamp - timestamp
            : range.end - timestamp;

          let color = 'white';
          if (beatType === 'low') color = '#ff6b6b';
          else if (beatType === 'mid') color = '#4ecdc4';
          else color = '#45b7d1';

          const fontSize = Math.max(50, 100 + intensity * 100);

          return {
            id: `${trackName}-beat-text-${range.start}-${index}`,
            componentId: 'TextAtom',
            type: 'atom' as const,
            data: {
              text: `${index + 1}`, // Local index for beat count
              style: {
                fontSize,
                fontWeight: 'bold',
                color,
                textAlign: 'center',
                opacity: 0.7 + intensity * 0.3,
              },
            },
            context: { timing: { start: timestamp, duration } },
          };
        },
      );

      allClipsWithEffects.push(...clipsInRangeWithEffects);
      allTextComponents.push(...textInRange);
    }
  } else {
    // This is the original logic for generating clips when no ranges are specified.
    const clippedAnalysis = clipAnalysisData(
      analysis,
      audio.start || 0,
      audio.duration,
    );
    let finalMaxBeats = maxBeats;
    if (maxBeats === 0) {
      finalMaxBeats = calculateOptimalBeatCount(
        clippedAnalysis,
        audio.duration || 20,
      );
    }
    const selectedBeats = selectImpactfulBeats(
      clippedAnalysis,
      finalMaxBeats,
      minTimeDiff,
    );

    const clipComponents = [];
    if (selectedBeats.length > 0 && clips.length > 0) {
      const firstBeat = selectedBeats[0];
      const firstClip = clips[0];
      const firstClipDuration = firstBeat.timestamp;

      const firstClipType =
        firstClip.type ||
        (firstClip.src.match(/\.(png|jpg|jpeg|gif|webp|svg|avif)$/i)
          ? 'image'
          : 'video');
      const componentId = firstClipType === 'image' ? 'ImageAtom' : 'VideoAtom';

      clipComponents.push({
        id: `${trackName}-beat-clip-first`,
        componentId,
        type: 'atom' as const,
        data: {
          src: firstClip.src,
          className: 'w-full h-full object-cover',
          fit: firstClip.fit || 'cover',
          ...(firstClipType === 'video'
            ? {
                loop: firstClip.loop || false,
                muted: firstClip.mute || true,
                volume: firstClip.volume || 0,
                startFrom: firstClip.startOffset || 0,
              }
            : {}),
          style: {
            ...(firstClip.opacity !== undefined
              ? { opacity: firstClip.opacity }
              : {}),
            ...(firstClip.objectPosition !== undefined
              ? { objectPosition: firstClip.objectPosition }
              : {}),
          },
        },
        context: { timing: { start: 0, duration: firstClipDuration } },
        effects: [],
      });
    }

    const beatSyncedClips = selectedBeats.reduce(
      (acc: any[], beatData: any, index: number) => {
        const { timestamp } = beatData;
        const nextBeat = selectedBeats[index + 1];
        const baseDuration = nextBeat ? nextBeat.timestamp - timestamp : 2;

        const overlapTime = transitionDuration;
        const duration = baseDuration + overlapTime;
        const startTime = timestamp - overlapTime / 2;

        let clip;
        if (isRepeatClips) {
          const clipIndex = (index + 1) % clips.length;
          clip = clips[clipIndex];
        } else {
          const clipIndex = index + 1;
          if (clipIndex < clips.length) {
            clip = clips[clipIndex];
          }
        }

        if (!clip) return acc;

        const clipType =
          clip.type ||
          (clip.src.match(/\.(png|jpg|jpeg|gif|webp|svg|avif)$/i)
            ? 'image'
            : 'video');
        const componentId = clipType === 'image' ? 'ImageAtom' : 'VideoAtom';

        acc.push({
          id: `${trackName}-beat-clip-${index}`,
          componentId,
          type: 'atom' as const,
          data: {
            src: clip.src,
            className: 'w-full h-full object-cover',
            fit: clip.fit || 'cover',
            ...(clipType === 'video'
              ? {
                  loop: clip.loop || false,
                  muted: clip.mute || true,
                  volume: clip.volume || 0,
                  startFrom: clip.startOffset || 0,
                }
              : {}),
            style: {
              ...(clip.opacity !== undefined ? { opacity: clip.opacity } : {}),
              ...(clip.objectPosition !== undefined
                ? { objectPosition: clip.objectPosition }
                : {}),
            },
          },
          context: { timing: { start: startTime, duration: duration } },
          effects: [],
        });
        return acc;
      },
      [],
    );

    const allClipComponents = [...clipComponents, ...beatSyncedClips];
    allClipsWithEffects.push(...allClipComponents); // Use the same array for simplicity.

    allTextComponents.push(
      ...selectedBeats.map((beatData: any, index: number) => {
        const { timestamp, intensity, beatType } = beatData;
        const nextBeat = selectedBeats[index + 1];
        const duration = nextBeat ? nextBeat.timestamp - timestamp : 2;

        let color = 'white';
        if (beatType === 'low') color = '#ff6b6b';
        else if (beatType === 'mid') color = '#4ecdc4';
        else color = '#45b7d1';

        const fontSize = Math.max(50, 100 + intensity * 100);

        return {
          id: `${trackName}-beat-text-${index}`,
          componentId: 'TextAtom',
          type: 'atom' as const,
          data: {
            text: `${index + 1}`,
            style: {
              fontSize,
              fontWeight: 'bold',
              color,
              textAlign: 'center',
              opacity: 0.7 + intensity * 0.3,
            },
          },
          context: { timing: { start: timestamp, duration } },
        };
      }),
    );
  }

  // Apply global effects like shake and continuous scale to all generated clips.
  const continuousEffects: any[] = [];
  const clipsWithTransitions = allClipsWithEffects.map((clip, index) => {
    const effects: Effect[] = [...(clip.effects || [])];
    const impact = params.transition.impact ?? 1;

    // This logic for applying transitions assumes a continuous list of clips.
    // It may need adjustment for correctness across discontinuous segments.
    // For now, we apply it globally to all collected clips.

    // --- INCOMING TRANSITION ---
    if (index > 0) {
      if (params.transition.type === 'shake') {
        const amplitude = 5 + 10 * impact; // Simplified for now
        const frequency = 0.3 + 0.5 * impact;
        const shakeDuration = 0.3 + 0.5;
        effects.push({
          id: `shake-effect-${clip.id}`,
          componentId: 'shake',
          data: {
            mode: 'provider',
            targetIds: [clip.id],
            type: 'linear',
            amplitude,
            frequency,
            decay: true,
            axis: 'both',
            duration: shakeDuration,
            start: 0,
          },
        });
      } else if (params.transition.type === 'smooth-blur') {
        // Simplified smooth-blur logic for now
      }
    }

    // --- CONTINUOUS SCALE EFFECT ---
    const clipDuration = clip.context.timing.duration;
    const minScale = 1.1;
    const maxScale = 1.3;
    const minDuration = 0.5;
    const maxDuration = 2.0;
    const durationRatio =
      (clipDuration - minDuration) / (maxDuration - minDuration);
    const clampedRatio = Math.max(0, Math.min(1, durationRatio));
    const inverseRatio = 1 - clampedRatio;
    const scaleFactor = minScale + (maxScale - minScale) * inverseRatio;

    const continuousScaleEffect = {
      id: `continuous-scale-effect-${clip.id}`,
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [clip.id],
        type: 'spring',
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1 * scaleFactor, prog: 0.1 },
          { key: 'scale', val: 1.1 * scaleFactor, prog: 0.7 },
          { key: 'scale', val: 1.2 * scaleFactor, prog: 1 },
        ],
        duration: clipDuration,
        start: 0,
      },
    };
    (effects as any[]).push(continuousScaleEffect);

    return {
      ...clip,
      effects,
    };
  });

  const audioAtom = {
    id: `${trackName}-beatstitch-audio`,
    componentId: 'AudioAtom',
    type: 'atom' as const,
    data: {
      src: audio.src,
      muted: audio.muted ?? false,
      startFrom: audio.start ?? 0,
    },
    context: {
      timing: {},
    },
  };

  // Create separate track segments for each clip range
  const createTrackSegments = () => {
    // When no clipRanges are given, create a single continuous track as before.
    if (!clipRanges || clipRanges.length === 0) {
      return [
        {
          id: `${trackName}-beatstitch-track`,
          componentId: 'BaseLayout',
          type: 'layout' as const,
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
            repeatChildrenProps: {
              className: 'absolute inset-0 flex items-center justify-center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: durationInSeconds - (audio.start ?? 0),
            },
          },
          childrenData: [
            ...clipsWithTransitions,
            ...(params.hideBeatCount ? [] : allTextComponents),
            ...(params.audio.muted ? [] : [audioAtom]),
          ],
          effects: continuousEffects,
        },
      ];
    }

    // If clipRanges are provided, create a separate segment for each time range.
    const segments = [];
    const parsedRanges = parseClipRanges(clipRanges);

    for (let i = 0; i < parsedRanges.length; i++) {
      const range = parsedRanges[i];
      const rangeStart = range.start;
      const rangeEnd = range.end;
      const rangeDuration = rangeEnd - rangeStart;

      // Filter clips, text, and effects to include only those within the current time range.
      // For clips, we need to check if they belong to this range by looking at their ID pattern
      const rangeClips = clipsWithTransitions.filter(clip => {
        // Check if the clip belongs to this range by looking at the ID pattern
        return (
          clip.id.includes(`${trackName}-beat-clip-${rangeStart}-`) ||
          clip.id.includes(`${trackName}-beat-clip-first-${rangeStart}`)
        );
      });

      const rangeTextComponents = allTextComponents.filter(text => {
        // Check if the text belongs to this range by looking at the ID pattern
        return text.id.includes(`${trackName}-beat-text-${rangeStart}-`);
      });

      // Make the timing of the filtered components relative to the start of their segment.
      const adjustedClips = rangeClips.map(clip => ({
        ...clip,
        context: {
          ...clip.context,
          timing: {
            ...clip.context.timing,
            start: clip.context.timing.start - rangeStart,
          },
        },
      }));

      const adjustedTextComponents = rangeTextComponents.map(text => ({
        ...text,
        context: {
          ...text.context,
          timing: {
            ...text.context.timing,
            start: text.context.timing.start - rangeStart,
          },
        },
      }));

      console.log(
        `📺 Creating segment ${i}: start=${rangeStart}, duration=${rangeDuration}`,
      );

      segments.push({
        id: `${trackName}-beatstitch-track-${i}`,
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
          repeatChildrenProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: rangeStart,
            duration: rangeDuration,
          },
        },
        childrenData: [
          ...adjustedClips,
          ...(params.hideBeatCount ? [] : adjustedTextComponents),
          ...(params.audio.muted ? [] : [audioAtom]),
        ],
        effects: continuousEffects, // Note: continuousEffects might need per-segment adjustment if they are not global.
      });
    }

    return segments;
  };

  return {
    output: {
      childrenData: createTrackSegments(),
    },
    options: {
      attachedToId: `BaseScene`,
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'beatstitch',
  title: 'BeatStitch',
  description: 'Analyzes audio to create beat-synced number animations.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'beat-sync', 'animation'],
  defaultInputParams: {
    trackName: 'beatstitch-track',
    audio: {
      src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      start: 0,
      duration: 30,
    },
    clips: [
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        type: 'video',
        fit: 'cover',
        opacity: 0.8,
      },
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        type: 'video',
        fit: 'cover',
        opacity: 0.9,
      },
    ],
    rangeString: '0:10-0:20,0:30-0:40',
    minTimeDiff: 0.5,
    maxBeats: 0,
    isRepeatClips: true,
    hideBeatCount: true,
    transition: {
      type: 'shake',
      impact: 1,
    },
  },
};

const presetFunction = presetExecution.toString();
const presetParamsSchema = z.toJSONSchema(presetParams);

const beatstitchPreset = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

export { beatstitchPreset };
