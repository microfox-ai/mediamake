/**
 * BeatStitch with Captions Preset
 *
 * This preset combines beat-synchronized video clips with caption-based clip selection.
 * It analyzes audio to detect beats and syncs video/image clips to the rhythm, while also
 * considering caption timing to select appropriate clips.
 *
 * Features:
 * - **Audio Beat Analysis**: Automatically detects beats, intensity, and frequency
 * - **Caption Integration**: Uses captions to influence clip selection timing
 * - **Smart Beat Selection**: Prioritizes high-impact beats for clip changes
 * - **Flexible Clip Ranges**: Optionally apply beat stitching to specific time ranges
 * - **Transition Effects**: Shake and smooth-blur transitions with adjustable impact
 * - **Caption Modes**: Play mixed, only when speaking, or only when not speaking
 *
 * Use cases:
 * - Creating music videos with beat-synced cuts and captions
 * - Building dynamic content that syncs audio, visuals, and text
 * - Creating engaging social media content with music and captions
 * - Producing professional video content with synchronized elements
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
  captions: z.array(
    z
      .object({
        text: z.string().describe('Text of the caption'),
        absoluteStart: z.number().describe('Start time of the caption'),
        absoluteEnd: z.number().describe('End time of the caption'),
        metadata: z
          .object({
            selectedImage: z
              .object({
                src: z.string().describe('Source URL of the selected image'),
              })
              .loose()
              .optional(),
            alternateImages: z
              .array(
                z
                  .object({
                    src: z
                      .string()
                      .describe('Source URL of the alternate image'),
                  })
                  .loose(),
              )
              .optional(),
          })
          .loose()
          .optional(),
      })
      .loose(),
  ).meta({
    [paramMetaTypes.referrableDataType]: 'captions',
  }),
  captionMode: z
    .enum([
      'play-mixed',
      'play-only-when-speaking',
      'play-only-when-not-speaking',
    ])
    .optional()
    .describe('Mode to play the captions'),
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
  clipRanges: z
    .array(z.string())
    .optional()
    .describe(
      'Time ranges where beat stitch should be applied (e.g., ["1:35-2:36", "3:45-4:20"])',
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
  },
): Promise<Partial<PresetOutput>> => {
  const {
    trackName,
    audio,
    clips,
    clipRanges,
    minTimeDiff,
    maxBeats,
    isRepeatClips,
    captions,
    captionMode,
  } = params;

  const { config, fetcher } = props;

  // Helper function to find caption at a specific timestamp
  const findCaptionAtTime = (timestamp: number) => {
    if (!captions || captions.length === 0) return null;
    return captions.find(
      caption =>
        timestamp >= caption.absoluteStart && timestamp <= caption.absoluteEnd,
    );
  };

  // Helper function to get available clips based on caption mode and timing
  const getAvailableClips = (timestamp: number, clipIndex: number) => {
    const caption = findCaptionAtTime(timestamp);

    // If no captions provided, use existing logic
    if (!captions || captions.length === 0) {
      return { clips: clips, isBlank: false };
    }

    switch (captionMode) {
      case 'play-mixed':
        if (caption && caption.metadata) {
          const captionClips = [];

          // Add selected image if available
          if (caption.metadata.selectedImage) {
            captionClips.push({
              src: caption.metadata.selectedImage.src,
              type: 'image' as const,
              fit: 'cover' as const,
            });
          }

          // Add alternate images if available
          if (
            caption.metadata.alternateImages &&
            caption.metadata.alternateImages.length > 0
          ) {
            caption.metadata.alternateImages.forEach(altImg => {
              captionClips.push({
                src: altImg.src,
                type: 'image' as const,
                fit: 'cover' as const,
              });
            });
          }

          // If we have caption clips, use them; otherwise fall back to standard clips
          if (captionClips.length > 0) {
            return { clips: captionClips, isBlank: false };
          }
        }
        // Fall back to standard clips if no caption or no caption images
        return { clips: clips, isBlank: false };

      case 'play-only-when-speaking':
        if (caption && caption.metadata) {
          const captionClips = [];

          // Add selected image if available
          if (caption.metadata.selectedImage) {
            captionClips.push({
              src: caption.metadata.selectedImage.src,
              type: 'image' as const,
              fit: 'cover' as const,
            });
          }

          // Add alternate images if available
          if (
            caption.metadata.alternateImages &&
            caption.metadata.alternateImages.length > 0
          ) {
            caption.metadata.alternateImages.forEach(altImg => {
              captionClips.push({
                src: altImg.src,
                type: 'image' as const,
                fit: 'cover' as const,
              });
            });
          }

          // If we have caption clips, use them; otherwise show blank
          if (captionClips.length > 0) {
            return { clips: captionClips, isBlank: false };
          }
        }
        // Show blank when not speaking
        return { clips: [], isBlank: true };

      case 'play-only-when-not-speaking':
        if (caption) {
          // Show blank when speaking
          return { clips: [], isBlank: true };
        }
        // Use standard clips when not speaking
        return { clips: clips, isBlank: false };

      default:
        // Default behavior - use standard clips
        return { clips: clips, isBlank: false };
    }
  };

  // Helper function to get clip for beat with smart selection to avoid repetition
  const getClipForBeat = (
    availableClips: any[],
    clipIndex: number,
    isRepeatClips: boolean,
  ) => {
    if (availableClips.length === 0) return null;

    // If only one clip available and caption modes are on, don't repeat unnecessarily
    if (availableClips.length === 1 && captions && captions.length > 0) {
      return availableClips[0];
    }

    // Standard logic for multiple clips
    if (isRepeatClips) {
      const selectedIndex = clipIndex % availableClips.length;
      return availableClips[selectedIndex];
    } else {
      if (clipIndex < availableClips.length) {
        return availableClips[clipIndex];
      }
    }

    return null;
  };

  // Helper function to generate clip ranges for non-speaking periods
  const generateNonSpeakingClipRanges = () => {
    if (
      !captions ||
      captions.length === 0 ||
      captionMode !== 'play-only-when-not-speaking'
    ) {
      return clipRanges;
    }

    const nonSpeakingRanges: string[] = [];
    let currentStart = 0;

    // Sort captions by start time
    const sortedCaptions = [...captions].sort(
      (a, b) => a.absoluteStart - b.absoluteStart,
    );

    for (const caption of sortedCaptions) {
      // Add range before this caption if there's a gap
      if (currentStart < caption.absoluteStart) {
        const startMinutes = Math.floor(currentStart / 60);
        const startSeconds = Math.floor(currentStart % 60);
        const endMinutes = Math.floor(caption.absoluteStart / 60);
        const endSeconds = Math.floor(caption.absoluteStart % 60);

        nonSpeakingRanges.push(
          `${startMinutes}:${startSeconds.toString().padStart(2, '0')}-${endMinutes}:${endSeconds.toString().padStart(2, '0')}`,
        );
      }
      currentStart = caption.absoluteEnd;
    }

    // Add final range if there's time after the last caption
    if (currentStart < durationInSeconds) {
      const startMinutes = Math.floor(currentStart / 60);
      const startSeconds = Math.floor(currentStart % 60);
      const endMinutes = Math.floor(durationInSeconds / 60);
      const endSeconds = Math.floor(durationInSeconds % 60);

      nonSpeakingRanges.push(
        `${startMinutes}:${startSeconds.toString().padStart(2, '0')}-${endMinutes}:${endSeconds.toString().padStart(2, '0')}`,
      );
    }

    return nonSpeakingRanges.length > 0 ? nonSpeakingRanges : clipRanges;
  };

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

  // Helper function to parse time range strings like "1:35-2:36"
  const parseTimeRange = (
    timeRange: string,
  ): { start: number; end: number } => {
    const [startStr, endStr] = timeRange.split('-');

    const parseTime = (timeStr: string): number => {
      const [minutes, seconds] = timeStr.split(':').map(Number);
      return minutes * 60 + seconds;
    };

    return {
      start: parseTime(startStr),
      end: parseTime(endStr),
    };
  };

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
      const parsedRanges = clipRanges.map(parseTimeRange);

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

  // Generate clip ranges based on caption mode
  const effectiveClipRanges = generateNonSpeakingClipRanges();

  if (effectiveClipRanges && effectiveClipRanges.length > 0) {
    const parsedRanges = effectiveClipRanges.map(parseTimeRange);

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
      if (maxBeats <= 0) {
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
      if (selectedBeatsInRange.length > 0) {
        // Find the actual first beat in the range (not just the first selected beat)
        const firstBeatInRange = analysisInRange.find(
          (beat: any) => beat.timestamp >= range.start,
        );
        const firstBeat = firstBeatInRange || selectedBeatsInRange[0];

        // Get available clips based on caption mode
        const { clips: availableClips, isBlank } = getAvailableClips(
          firstBeat.timestamp,
          0,
        );

        if (!isBlank && availableClips.length > 0) {
          const firstClip = availableClips[0];

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

          // Get available clips based on caption mode
          const { clips: availableClips, isBlank } = getAvailableClips(
            timestamp,
            index + 1,
          );

          if (isBlank || availableClips.length === 0) return acc;

          // Use smart clip selection to avoid repetition
          const clip = getClipForBeat(availableClips, index + 1, isRepeatClips);

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
    if (maxBeats <= 0) {
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
    if (selectedBeats.length > 0) {
      const firstBeat = selectedBeats[0];

      // Get available clips based on caption mode
      const { clips: availableClips, isBlank } = getAvailableClips(
        firstBeat.timestamp,
        0,
      );

      if (!isBlank && availableClips.length > 0) {
        const firstClip = availableClips[0];
        const firstClipDuration = firstBeat.timestamp;

        const firstClipType =
          firstClip.type ||
          (firstClip.src.match(/\.(png|jpg|jpeg|gif|webp|svg|avif)$/i)
            ? 'image'
            : 'video');
        const componentId =
          firstClipType === 'image' ? 'ImageAtom' : 'VideoAtom';

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
    }

    const beatSyncedClips = selectedBeats.reduce(
      (acc: any[], beatData: any, index: number) => {
        const { timestamp } = beatData;
        const nextBeat = selectedBeats[index + 1];
        const baseDuration = nextBeat ? nextBeat.timestamp - timestamp : 2;

        const overlapTime = transitionDuration;
        const duration = baseDuration + overlapTime;
        const startTime = timestamp - overlapTime / 2;

        // Get available clips based on caption mode
        const { clips: availableClips, isBlank } = getAvailableClips(
          timestamp,
          index + 1,
        );

        if (isBlank || availableClips.length === 0) return acc;

        // Use smart clip selection to avoid repetition
        const clip = getClipForBeat(availableClips, index + 1, isRepeatClips);

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
    const parsedRanges = clipRanges.map(parseTimeRange);

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
  id: 'beatstitchwithcaptions',
  title: 'BeatStitch with Captions',
  description:
    'Analyzes audio to create beat-synced animations with caption-based clip selection.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'beat-sync', 'animation', 'captions'],
  defaultInputParams: {
    trackName: 'beatstitch-captions-track',
    captions: [],
    captionMode: 'play-mixed',
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
    clipRanges: ['0:10-0:20', '0:30-0:40'],
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

const beatstitchWithCaptionsPreset = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

export { beatstitchWithCaptionsPreset };
