/**
 * Music Video Bounce Words Preset
 *
 * This preset creates a music video-style subtitle animation where words bounce and scale
 * to an imaginary beat with vocal emphasis acting as accent hits. It features:
 *
 * - Constant baseline oscillation (scale 0.98-1.02) on all words for a subtle groove
 * - Emphasized words break out with punchy scale animations (1.0-1.3 with bounce-back)
 * - Rotation tilts (-5deg to 5deg) for dynamic movement
 * - Position shifts (hop effect with translateY -10px to 0px)
 * - Color flashes (rgba(255,255,0,0.3)) during emphasis peaks for extra impact
 * - 3D transform perspective with transform-style: preserve-3d
 * - Performance optimized with transform-gpu and contain: layout style paint
 *
 * Use cases:
 * - Music video lyrics with beat-synchronized animations
 * - Dynamic subtitle presentations with rhythmic feel
 * - Energetic text overlays for music content
 * - Vocal-emphasis-based text highlighting
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
  TranscriptionWord,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string().describe('Caption ID'),
        text: z.string().describe('Caption text'),
        start: z.number().describe('Caption start time (relative)'),
        absoluteStart: z.number().describe('Caption absolute start time'),
        end: z.number().describe('Caption end time (relative)'),
        absoluteEnd: z.number().describe('Caption absolute end time'),
        duration: z.number().describe('Caption duration'),
        words: z
          .array(
            z.object({
              id: z.string().describe('Word ID'),
              text: z.string().describe('Word text'),
              start: z.number().describe('Word start time (relative)'),
              absoluteStart: z
                .number()
                .describe('Word absolute start time'),
              end: z.number().describe('Word end time (relative)'),
              absoluteEnd: z.number().describe('Word absolute end time'),
              duration: z.number().describe('Word duration'),
              confidence: z.number().describe('Word confidence'),
            }),
          )
          .describe('Array of words in the caption'),
      }),
    )
    .describe('Array of caption objects with word-level timing'),
  emphasisMetadata: z
    .array(
      z.object({
        wordId: z.string().describe('ID of the emphasized word'),
        emphasisLevel: z
          .number()
          .min(0)
          .max(1)
          .describe('Emphasis level (0-1)'),
      }),
    )
    .optional()
    .describe(
      'Optional metadata for emphasized words with emphasis levels',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color for all words'),
  fontSize: z
    .number()
    .default(48)
    .describe('Font size in pixels for all words'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for text'),
  fontWeights: z
    .array(z.string())
    .default(['400', '700'])
    .describe('Font weights to load'),
  baselineOscillationSpeed: z
    .number()
    .default(0.5)
    .describe('Duration of baseline oscillation cycle in seconds'),
  emphasisBounceDuration: z
    .number()
    .default(0.6)
    .describe('Duration of emphasis bounce animation in seconds'),
  emphasisRotationDuration: z
    .number()
    .default(0.6)
    .describe('Duration of emphasis rotation animation in seconds'),
  emphasisHopDuration: z
    .number()
    .default(0.5)
    .describe('Duration of emphasis hop animation in seconds'),
  emphasisColorFlashDuration: z
    .number()
    .default(0.4)
    .describe('Duration of emphasis color flash animation in seconds'),
  emphasisScaleMax: z
    .number()
    .default(1.3)
    .describe('Maximum scale for emphasis bounce'),
  emphasisRotationRange: z
    .number()
    .default(5)
    .describe('Rotation range in degrees (-range to +range)'),
  emphasisHopHeight: z
    .number()
    .default(10)
    .describe('Hop height in pixels'),
  emphasisFlashColor: z
    .string()
    .default('rgba(255,255,0,0.3)')
    .describe('Color flash for emphasis peaks'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    emphasisMetadata = [],
    textColor,
    fontSize,
    fontFamily,
    fontWeights,
    baselineOscillationSpeed,
    emphasisBounceDuration,
    emphasisRotationDuration,
    emphasisHopDuration,
    emphasisColorFlashDuration,
    emphasisScaleMax,
    emphasisRotationRange,
    emphasisHopHeight,
    emphasisFlashColor,
  } = params;

  // Helper function to check if a word is emphasized
  const isWordEmphasized = (wordId: string): boolean => {
    return emphasisMetadata.some((meta) => meta.wordId === wordId);
  };

  // Helper function to get emphasis level for a word
  const getEmphasisLevel = (wordId: string): number => {
    const meta = emphasisMetadata.find((meta) => meta.wordId === wordId);
    return meta ? meta.emphasisLevel : 0;
  };

  // Helper function to create baseline oscillation effect
  const createBaselineOscillationEffect = (
    wordId: string,
    wordDuration: number,
  ) => {
    const cycleCount = Math.ceil(wordDuration / baselineOscillationSpeed);
    const ranges = [];

    for (let i = 0; i <= cycleCount * 2; i++) {
      const prog = i / (cycleCount * 2);
      const scale = i % 2 === 0 ? 0.98 : 1.02;
      ranges.push({ key: 'scale', val: scale, prog });
    }

    return {
      id: `baseline-oscillation-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges,
      },
    };
  };

  // Helper function to create emphasis bounce effect
  const createEmphasisBounceEffect = (wordId: string, level: number) => {
    const scaleMax = 1 + (emphasisScaleMax - 1) * level;
    return {
      id: `emphasis-bounce-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: 0,
        duration: emphasisBounceDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: scaleMax, prog: 0.4 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Helper function to create emphasis rotation effect
  const createEmphasisRotationEffect = (wordId: string, level: number) => {
    const rotation = emphasisRotationRange * level;
    return {
      id: `emphasis-rotation-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: emphasisRotationDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'rotate', val: -rotation, prog: 0 },
          { key: 'rotate', val: rotation, prog: 0.3 },
          { key: 'rotate', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Helper function to create emphasis hop effect
  const createEmphasisHopEffect = (wordId: string, level: number) => {
    const hopHeight = emphasisHopHeight * level;
    return {
      id: `emphasis-hop-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: emphasisHopDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateY', val: -hopHeight, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Helper function to create emphasis color flash effect
  const createEmphasisColorFlashEffect = (wordId: string) => {
    return {
      id: `emphasis-color-flash-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: emphasisColorFlashDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          {
            key: 'backgroundColor',
            val: 'rgba(255,255,0,0)',
            prog: 0,
          },
          {
            key: 'backgroundColor',
            val: emphasisFlashColor,
            prog: 0.3,
          },
          {
            key: 'backgroundColor',
            val: 'rgba(255,255,0,0)',
            prog: 1,
          },
        ],
      },
    };
  };

  // Build word components for all captions
  const allCaptionComponents: RenderableComponentData[] = captions.map(
    (caption) => {
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word) => {
          const wordId = `word-${word.id}`;
          const isEmphasized = isWordEmphasized(word.id);
          const emphasisLevel = getEmphasisLevel(word.id);

          const effects = [];

          // Baseline oscillation for all words
          effects.push(
            createBaselineOscillationEffect(wordId, word.duration),
          );

          // Emphasis effects for emphasized words
          if (isEmphasized) {
            effects.push(createEmphasisBounceEffect(wordId, emphasisLevel));
            effects.push(
              createEmphasisRotationEffect(wordId, emphasisLevel),
            );
            effects.push(createEmphasisHopEffect(wordId, emphasisLevel));
            effects.push(createEmphasisColorFlashEffect(wordId));
          }

          return {
            id: wordId,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'inline-block transform-gpu',
                style: {
                  contain: 'layout style paint',
                },
              },
            },
            context: {
              timing: {
                start: word.start,
                duration: word.duration,
              },
            },
            effects,
            childrenData: [
              {
                id: `text-${word.id}`,
                type: 'atom' as const,
                componentId: 'TextAtom',
                data: {
                  text: word.text,
                  style: {
                    fontSize: `${fontSize}px`,
                    fontWeight: isEmphasized ? '700' : '400',
                    color: textColor,
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                  },
                  font: {
                    family: fontFamily,
                    weights: fontWeights,
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: word.duration,
                  },
                },
              },
            ],
          } as RenderableComponentData;
        },
      );

      return {
        id: `caption-${caption.id}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'absolute inset-0 flex flex-wrap items-center justify-center gap-3',
            style: {
              transformStyle: 'preserve-3d',
              contain: 'layout style paint',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer = {
    id: 'music-video-bounce-words-root',
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
        duration:
          captions.length > 0
            ? Math.max(
                ...captions.map((c) => c.absoluteStart + c.duration),
              )
            : 10,
      },
    },
    childrenData: allCaptionComponents,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'MusicVideoBounceWords',
  title: 'Music Video Bounce Words',
  description:
    'Music video-style preset where words bounce and scale to an imaginary beat with vocal emphasis acting as accent hits. Features constant baseline oscillation (scale 0.98-1.02) on all words, with emphasized words breaking out with punchy scale animations (1.0-1.3 with bounce-back), rotation tilts (-5deg to 5deg), position shifts (hop effect), and color flashes. Optimized for performance with transform-gpu and contain: layout style paint. Supports audio waveform beat-sync when available.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'music-video',
    'bounce',
    'rhythm',
    'emphasis',
    'dynamic',
    'beat-sync',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: '1',
        text: 'Hello world example',
        start: 0,
        absoluteStart: 0,
        end: 2,
        absoluteEnd: 2,
        duration: 2,
        words: [
          {
            id: 'w1',
            text: 'Hello',
            start: 0,
            absoluteStart: 0,
            end: 0.5,
            absoluteEnd: 0.5,
            duration: 0.5,
            confidence: 1,
          },
          {
            id: 'w2',
            text: 'world',
            start: 0.5,
            absoluteStart: 0.5,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 1.0,
            confidence: 1,
          },
          {
            id: 'w3',
            text: 'example',
            start: 1.5,
            absoluteStart: 1.5,
            end: 2,
            absoluteEnd: 2,
            duration: 0.5,
            confidence: 1,
          },
        ],
      },
    ],
    emphasisMetadata: [
      {
        wordId: 'w2',
        emphasisLevel: 1.0,
      },
    ],
    textColor: '#ffffff',
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeights: ['400', '700'],
    baselineOscillationSpeed: 0.5,
    emphasisBounceDuration: 0.6,
    emphasisRotationDuration: 0.6,
    emphasisHopDuration: 0.5,
    emphasisColorFlashDuration: 0.4,
    emphasisScaleMax: 1.3,
    emphasisRotationRange: 5,
    emphasisHopHeight: 10,
    emphasisFlashColor: 'rgba(255,255,0,0.3)',
  },
};

// Export preset
export const MusicVideoBounceWordsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
