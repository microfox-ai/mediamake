/**
 * Rhythmic Typokinetics Preset
 *
 * This preset treats text like percussion in a music video, with hard-cut beat synchronization.
 * Each word or phrase appears and disappears on the beat with zero fade time - pure instant cuts
 * synchronized to rhythm. Uses beat detection to time hard cuts, with stroboscopic effects during
 * intense sections for rapid text flashing.
 *
 * Features:
 * - **Hard-Cut Beat Synchronization**: Text appears/disappears instantly on beats (no fade)
 * - **Audio Beat Detection**: Fetches audio analysis data to map beat timestamps
 * - **Rhythmic Chunking**: Breaks titles into rhythmic chunks that appear in sequence
 * - **Stroboscopic Effects**: Rapid flashing during intense sections (high intensity beats)
 * - **Caption Word Sync**: Aligns caption words to nearest beat timestamps
 * - **GPU-Accelerated Scaling**: Uses transform: scale3d() for performance
 * - **Zero Fade Time**: Pure hard cuts with instant opacity changes (0 or 1, no transitions)
 *
 * Use cases:
 * - Music video text that "hits" on beats
 * - Title sequences synchronized to percussion
 * - Lyric videos with beat-synced word appearance
 * - High-energy text animations for drops/choruses
 * - Stroboscopic text effects for intense musical sections
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  // Audio source for beat detection
  audio: z
    .object({
      src: z.string().describe('Audio source URL for beat detection'),
      start: z.number().optional().describe('Audio start time in seconds'),
      duration: z.number().optional().describe('Audio duration in seconds'),
    })
    .describe('Audio source for beat synchronization'),

  // Mode selection
  mode: z
    .enum(['title', 'captions', 'words'])
    .default('title')
    .describe(
      'Mode: "title" for rhythmic title chunks, "captions" for full captions on beats, "words" for word-by-word alignment to beats',
    ),

  // Title mode parameters
  title: z
    .object({
      text: z
        .string()
        .optional()
        .describe('Title text to display (for title mode)'),
      chunks: z
        .array(z.string())
        .optional()
        .describe(
          'Pre-split title chunks (e.g., ["BEAT", "DROP", "NOW"]). If not provided, auto-splits by spaces.',
        ),
      fontSize: z
        .number()
        .default(72)
        .describe('Font size for title text in pixels'),
      fontWeight: z
        .string()
        .default('bold')
        .describe('Font weight (e.g., "bold", "700")'),
      textTransform: z
        .enum(['uppercase', 'lowercase', 'capitalize', 'none'])
        .default('uppercase')
        .describe('Text transformation'),
      color: z.string().default('#ffffff').describe('Text color'),
      font: z
        .string()
        .optional()
        .describe(
          'Font family with optional weight and style (e.g., "Inter:700", "BebasNeue")',
        ),
    })
    .optional()
    .describe('Title mode configuration'),

  // Caption mode parameters
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z.any().optional(),
      }),
    )
    .optional()
    .describe('Caption data for caption/words mode'),

  // Caption styling
  captionStyle: z
    .object({
      fontSize: z.number().default(48).describe('Caption font size in pixels'),
      fontWeight: z
        .string()
        .default('bold')
        .describe('Caption font weight'),
      color: z.string().default('#ffffff').describe('Caption text color'),
      font: z
        .string()
        .optional()
        .describe(
          'Font family with optional weight and style (e.g., "Inter:600")',
        ),
      textTransform: z
        .enum(['uppercase', 'lowercase', 'capitalize', 'none'])
        .default('uppercase')
        .describe('Text transformation'),
    })
    .optional()
    .describe('Caption styling configuration'),

  // Beat synchronization parameters
  beatSync: z
    .object({
      intensityThreshold: z
        .number()
        .min(0)
        .max(1)
        .default(0.6)
        .describe(
          'Minimum intensity threshold for beat selection (0-1). Higher = fewer, more impactful beats.',
        ),
      maxBeats: z
        .number()
        .default(30)
        .describe('Maximum number of beats to use'),
      minTimeDiff: z
        .number()
        .default(0.3)
        .describe('Minimum time difference between beats in seconds'),
      strobeIntensityThreshold: z
        .number()
        .min(0)
        .max(1)
        .default(0.8)
        .describe(
          'Intensity threshold for strobe effects (0-1). Beats above this trigger rapid flashing.',
        ),
    })
    .optional()
    .describe('Beat synchronization configuration'),

  // Strobe effect parameters
  strobe: z
    .object({
      enabled: z
        .boolean()
        .default(true)
        .describe('Enable stroboscopic effects for intense sections'),
      flashCount: z
        .number()
        .default(3)
        .describe('Number of rapid flashes during strobe'),
      flashDuration: z
        .number()
        .default(0.05)
        .describe('Duration of each flash in seconds'),
      scaleVariation: z
        .boolean()
        .default(true)
        .describe('Add scale variations during strobe'),
    })
    .optional()
    .describe('Stroboscopic effect configuration'),

  // Scale effect parameters
  scale: z
    .object({
      enabled: z.boolean().default(true).describe('Enable scale effects on beats'),
      baseScale: z
        .number()
        .default(1.2)
        .describe('Initial scale multiplier on beat hit'),
      endScale: z.number().default(1).describe('Final scale at beat end'),
      duration: z
        .number()
        .default(0.15)
        .describe('Duration of scale animation in seconds'),
    })
    .optional()
    .describe('Scale effect configuration'),

  // Layout parameters
  layout: z
    .object({
      position: z
        .enum(['center', 'top', 'bottom', 'left', 'right'])
        .default('center')
        .describe('Text position on screen'),
      letterSpacing: z
        .string()
        .default('0.05em')
        .describe('Letter spacing'),
    })
    .optional()
    .describe('Layout configuration'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { audio, mode, title, captions, captionStyle, beatSync, strobe, scale, layout } = params;
  const { fetcher, config } = props;

  if (!fetcher) {
    throw new Error('Fetcher is required for audio analysis');
  }

  // Parse font string helper
  const parseFontString = (fontString?: string) => {
    if (!fontString) return { family: 'Inter', weight: undefined, style: undefined };
    const parts = fontString.split(':');
    return {
      family: parts[0],
      weight: parts[1] ? parseInt(parts[1], 10) : undefined,
      style: parts[2] as 'normal' | 'italic' | undefined,
    };
  };

  // Fetch audio analysis
  const audioStart = audio.start || 0;
  const audioDuration = audio.duration;

  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: audio.src,
  });

  if (!analysis || analysis.length === 0) {
    return {
      output: {
        childrenData: [],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  // Filter and adjust analysis based on audio start/duration
  const effectiveDuration = audioDuration || durationInSeconds - audioStart;
  const clippedAnalysis = analysis
    .filter(
      (beat: any) =>
        beat.timestamp >= audioStart &&
        beat.timestamp <= audioStart + effectiveDuration,
    )
    .map((beat: any) => ({
      ...beat,
      timestamp: beat.timestamp - audioStart,
    }));

  // Select impactful beats
  const selectImpactfulBeats = (
    beats: any[],
    intensityThreshold: number,
    maxBeatsCount: number,
    minTimeDiff: number,
  ) => {
    const filteredBeats = beats.filter(
      (beat) => beat.intensity >= intensityThreshold,
    );

    const sortedByImpact = filteredBeats.sort(
      (a, b) => b.intensity - a.intensity,
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

  const beatSyncConfig = beatSync || {
    intensityThreshold: 0.6,
    maxBeats: 30,
    minTimeDiff: 0.3,
    strobeIntensityThreshold: 0.8,
  };

  const selectedBeats = selectImpactfulBeats(
    clippedAnalysis,
    beatSyncConfig.intensityThreshold,
    beatSyncConfig.maxBeats,
    beatSyncConfig.minTimeDiff,
  );

  // Get position classes
  const getPositionClasses = (position: string) => {
    switch (position) {
      case 'top':
        return 'absolute top-0 left-0 right-0 flex items-start justify-center pt-20';
      case 'bottom':
        return 'absolute bottom-0 left-0 right-0 flex items-end justify-center pb-20';
      case 'left':
        return 'absolute left-0 top-0 bottom-0 flex items-center justify-start pl-20';
      case 'right':
        return 'absolute right-0 top-0 bottom-0 flex items-center justify-end pr-20';
      case 'center':
      default:
        return 'absolute inset-0 flex items-center justify-center';
    }
  };

  const layoutConfig = layout || { position: 'center', letterSpacing: '0.05em' };
  const strobeConfig = strobe || {
    enabled: true,
    flashCount: 3,
    flashDuration: 0.05,
    scaleVariation: true,
  };
  const scaleConfig = scale || {
    enabled: true,
    baseScale: 1.2,
    endScale: 1,
    duration: 0.15,
  };

  const childrenData: RenderableComponentData[] = [];

  // ============================================================================
  // MODE: TITLE (Rhythmic Chunks)
  // ============================================================================
  if (mode === 'title' && title) {
    const titleText = title.text || '';
    const chunks = title.chunks || titleText.split(' ').filter((w) => w.length > 0);

    if (chunks.length === 0) {
      return {
        output: { childrenData: [] },
        options: { attachedToId: 'BaseScene' },
      };
    }

    const titleFont = parseFontString(title.font || 'Inter:700');

    chunks.forEach((chunk, index) => {
      if (index >= selectedBeats.length) return;

      const beat = selectedBeats[index];
      const nextBeat = selectedBeats[index + 1];
      const duration = nextBeat
        ? nextBeat.timestamp - beat.timestamp
        : effectiveDuration - beat.timestamp;

      const isIntense = beat.intensity >= beatSyncConfig.strobeIntensityThreshold;

      const chunkId = `title-chunk-${index}`;
      const effects: any[] = [];

      // Hard cut opacity (instant appearance)
      effects.push({
        id: `opacity-${chunkId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.01,
          mode: 'provider',
          targetIds: [chunkId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });

      // Hard cut disappearance
      effects.push({
        id: `opacity-out-${chunkId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration - 0.01,
          duration: 0.01,
          mode: 'provider',
          targetIds: [chunkId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });

      // Scale effect on beat hit
      if (scaleConfig.enabled) {
        effects.push({
          id: `scale-${chunkId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: scaleConfig.duration,
            mode: 'provider',
            targetIds: [chunkId],
            ranges: [
              { key: 'scale', val: scaleConfig.baseScale, prog: 0 },
              { key: 'scale', val: scaleConfig.endScale, prog: 1 },
            ],
          },
        });
      }

      // Strobe effect for intense beats
      if (strobeConfig.enabled && isIntense) {
        for (let i = 0; i < strobeConfig.flashCount; i++) {
          const flashStart = i * strobeConfig.flashDuration * 2;
          effects.push({
            id: `strobe-${i}-${chunkId}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: flashStart,
              duration: strobeConfig.flashDuration,
              mode: 'provider',
              targetIds: [chunkId],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          });

          if (strobeConfig.scaleVariation) {
            const scaleVal = 1 + (i % 2 === 0 ? 0.1 : -0.1);
            effects.push({
              id: `strobe-scale-${i}-${chunkId}`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: flashStart,
                duration: strobeConfig.flashDuration,
                mode: 'provider',
                targetIds: [chunkId],
                ranges: [
                  { key: 'scale', val: scaleVal, prog: 0 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            });
          }
        }
      }

      childrenData.push({
        id: chunkId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: chunk,
          style: {
            fontSize: title.fontSize || 72,
            fontWeight: titleFont.weight || title.fontWeight || 'bold',
            color: title.color || '#ffffff',
            textTransform: title.textTransform || 'uppercase',
            letterSpacing: layoutConfig.letterSpacing,
            ...(titleFont.style ? { fontStyle: titleFont.style } : {}),
          },
          font: {
            family: titleFont.family,
            ...(titleFont.weight ? { weights: [titleFont.weight.toString()] } : {}),
          },
        },
        context: {
          timing: {
            start: beat.timestamp,
            duration,
          },
        },
        effects,
      } as RenderableComponentData);
    });
  }

  // ============================================================================
  // MODE: CAPTIONS (Full Caption on Beat)
  // ============================================================================
  if (mode === 'captions' && captions && captions.length > 0) {
    const captionStyleConfig = captionStyle || {
      fontSize: 48,
      fontWeight: 'bold',
      color: '#ffffff',
      textTransform: 'uppercase' as const,
    };
    const captionFont = parseFontString(captionStyleConfig.font || 'Inter:600');

    captions.forEach((caption: TranscriptionSentence, index) => {
      const nearestBeat = selectedBeats.reduce((prev, curr) =>
        Math.abs(curr.timestamp - caption.absoluteStart) <
        Math.abs(prev.timestamp - caption.absoluteStart)
          ? curr
          : prev,
      );

      const beatTimestamp = nearestBeat.timestamp;
      const nextBeat = selectedBeats.find((b) => b.timestamp > beatTimestamp);
      const duration = nextBeat
        ? nextBeat.timestamp - beatTimestamp
        : caption.duration;

      const isIntense =
        nearestBeat.intensity >= beatSyncConfig.strobeIntensityThreshold;

      const captionId = `caption-${index}`;
      const effects: any[] = [];

      // Hard cut opacity
      effects.push({
        id: `opacity-${captionId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.01,
          mode: 'provider',
          targetIds: [captionId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });

      // Hard cut disappearance
      effects.push({
        id: `opacity-out-${captionId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration - 0.01,
          duration: 0.01,
          mode: 'provider',
          targetIds: [captionId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });

      // Scale on beat
      if (scaleConfig.enabled) {
        effects.push({
          id: `scale-${captionId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: scaleConfig.duration,
            mode: 'provider',
            targetIds: [captionId],
            ranges: [
              { key: 'scale', val: scaleConfig.baseScale, prog: 0 },
              { key: 'scale', val: scaleConfig.endScale, prog: 1 },
            ],
          },
        });
      }

      // Strobe for intense beats
      if (strobeConfig.enabled && isIntense) {
        for (let i = 0; i < strobeConfig.flashCount; i++) {
          const flashStart = i * strobeConfig.flashDuration * 2;
          effects.push({
            id: `strobe-${i}-${captionId}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: flashStart,
              duration: strobeConfig.flashDuration,
              mode: 'provider',
              targetIds: [captionId],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          });
        }
      }

      childrenData.push({
        id: captionId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: caption.text,
          style: {
            fontSize: captionStyleConfig.fontSize,
            fontWeight: captionFont.weight || captionStyleConfig.fontWeight,
            color: captionStyleConfig.color,
            textTransform: captionStyleConfig.textTransform,
            letterSpacing: layoutConfig.letterSpacing,
            ...(captionFont.style ? { fontStyle: captionFont.style } : {}),
          },
          font: {
            family: captionFont.family,
            ...(captionFont.weight
              ? { weights: [captionFont.weight.toString()] }
              : {}),
          },
        },
        context: {
          timing: {
            start: beatTimestamp,
            duration,
          },
        },
        effects,
      } as RenderableComponentData);
    });
  }

  // ============================================================================
  // MODE: WORDS (Word-by-Word Beat Alignment)
  // ============================================================================
  if (mode === 'words' && captions && captions.length > 0) {
    const captionStyleConfig = captionStyle || {
      fontSize: 48,
      fontWeight: 'bold',
      color: '#ffffff',
      textTransform: 'uppercase' as const,
    };
    const captionFont = parseFontString(captionStyleConfig.font || 'Inter:600');

    const allWords = captions.flatMap((caption: TranscriptionSentence) =>
      caption.words.map((word) => ({
        ...word,
        captionId: caption.id,
      })),
    );

    allWords.forEach((word, index) => {
      const nearestBeat = selectedBeats.reduce((prev, curr) =>
        Math.abs(curr.timestamp - word.absoluteStart) <
        Math.abs(prev.timestamp - word.absoluteStart)
          ? curr
          : prev,
      );

      const beatTimestamp = nearestBeat.timestamp;
      const nextBeat = selectedBeats.find((b) => b.timestamp > beatTimestamp);
      const duration = nextBeat
        ? nextBeat.timestamp - beatTimestamp
        : word.duration;

      const isIntense =
        nearestBeat.intensity >= beatSyncConfig.strobeIntensityThreshold;

      const wordId = `word-${index}`;
      const effects: any[] = [];

      // Hard cut opacity
      effects.push({
        id: `opacity-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.01,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });

      // Hard cut disappearance
      effects.push({
        id: `opacity-out-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration - 0.01,
          duration: 0.01,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });

      // Scale on beat
      if (scaleConfig.enabled) {
        effects.push({
          id: `scale-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: scaleConfig.duration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'scale', val: scaleConfig.baseScale, prog: 0 },
              { key: 'scale', val: scaleConfig.endScale, prog: 1 },
            ],
          },
        });
      }

      // Strobe for intense beats
      if (strobeConfig.enabled && isIntense) {
        for (let i = 0; i < strobeConfig.flashCount; i++) {
          const flashStart = i * strobeConfig.flashDuration * 2;
          effects.push({
            id: `strobe-${i}-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: flashStart,
              duration: strobeConfig.flashDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          });
        }
      }

      childrenData.push({
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: captionStyleConfig.fontSize,
            fontWeight: captionFont.weight || captionStyleConfig.fontWeight,
            color: captionStyleConfig.color,
            textTransform: captionStyleConfig.textTransform,
            letterSpacing: layoutConfig.letterSpacing,
            ...(captionFont.style ? { fontStyle: captionFont.style } : {}),
          },
          font: {
            family: captionFont.family,
            ...(captionFont.weight
              ? { weights: [captionFont.weight.toString()] }
              : {}),
          },
        },
        context: {
          timing: {
            start: beatTimestamp,
            duration,
          },
        },
        effects,
      } as RenderableComponentData);
    });
  }

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================
  const rootContainer: RenderableComponentData = {
    id: 'rhythmic-typokinetics-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: getPositionClasses(layoutConfig.position),
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectiveDuration,
      },
    },
    childrenData,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'rhythmicTypokineticsPreset',
  title: 'Rhythmic Typokinetics Preset',
  description:
    'Treats text like percussion in a music video with hard-cut beat synchronization. Each word or phrase appears and disappears on the beat with zero fade time - pure instant cuts synchronized to rhythm. Uses beat detection to time hard cuts, with stroboscopic effects during intense sections for rapid text flashing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'music',
    'beat-sync',
    'rhythm',
    'hard-cut',
    'strobe',
    'percussion',
    'typography',
    'audio-reactive',
  ],
  defaultInputParams: {
    audio: {
      src: 'https://example.com/audio.mp3',
      start: 0,
    },
    mode: 'title',
    title: {
      text: 'BEAT DROP NOW',
      fontSize: 72,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: '#ffffff',
      font: 'Inter:700',
    },
    beatSync: {
      intensityThreshold: 0.6,
      maxBeats: 30,
      minTimeDiff: 0.3,
      strobeIntensityThreshold: 0.8,
    },
    strobe: {
      enabled: true,
      flashCount: 3,
      flashDuration: 0.05,
      scaleVariation: true,
    },
    scale: {
      enabled: true,
      baseScale: 1.2,
      endScale: 1,
      duration: 0.15,
    },
    layout: {
      position: 'center',
      letterSpacing: '0.05em',
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const rhythmicTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
