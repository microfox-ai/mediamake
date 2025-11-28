/**
 * Vocal Pulse Motion Graphics Preset
 *
 * This preset creates energetic motion graphics where words pulse and throb with vocal energy,
 * like speakers vibrating to bass frequencies. It combines multiple animation layers for a rich,
 * dynamic effect that feels alive and responsive.
 *
 * Features:
 * - **Three-Layer Animation System**: Continuous gentle pulse (3s), emphasis triggers (0.5s), and micro-vibrations (0.1s)
 * - **Base Pulse Animation**: Gentle scale oscillation (0.98-1.02) creating a breathing rhythm
 * - **Emphasis Burst Effects**: Stronger pulses (0.95-1.15) triggered by caption metadata or keywords
 * - **Micro-Vibrations**: Subtle translateX/Y jitter (-1px to 1px) adding texture
 * - **Synchronized Blur Effects**: Blur decreases during emphasis peaks for focus-pull effect (2px to 0px)
 * - **GPU-Accelerated**: Optimized with transform-gpu and will-change properties
 * - **Flexible Layout**: Configurable word spacing, container positioning, and font styling
 *
 * Use cases:
 * - Creating energetic subtitle animations for music videos
 * - Building dynamic lyric displays synchronized with vocals
 * - Adding kinetic energy to promotional video captions
 * - Creating speaker-like pulsing effects for podcast visualizations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  TextAtomData,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z
              .number()
              .min(0.1)
              .max(3.0)
              .optional()
              .describe('Emphasis intensity multiplier'),
            keyword: z.string().optional().describe('Keyword to emphasize'),
            emphasis: z
              .boolean()
              .optional()
              .describe('Whether to apply emphasis'),
          })
          .optional(),
      }),
    )
    .describe('Caption data with word-level timing and optional metadata'),

  // Visual styling
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Base font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:900')
    .describe('Font family with weight (e.g., "Inter:900")'),
  textColor: z.string().default('#ffffff').describe('Text color'),
  textShadow: z
    .string()
    .default('0 0 20px rgba(255,255,255,0.5)')
    .describe('Text shadow CSS value'),

  // Layout
  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(40)
    .describe('Container padding in pixels'),
  wordGap: z
    .number()
    .min(0)
    .max(50)
    .default(16)
    .describe('Gap between words in pixels'),

  // Animation timing
  basePulseDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Base pulse duration in seconds (breathing rhythm)'),
  emphasisDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Emphasis burst duration in seconds'),
  microVibrationDuration: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.1)
    .describe('Micro-vibration duration in seconds'),

  // Animation intensity
  basePulseScale: z
    .object({
      min: z.number().min(0.8).max(1).default(0.98),
      max: z.number().min(1).max(1.2).default(1.02),
    })
    .default({ min: 0.98, max: 1.02 })
    .describe('Base pulse scale range'),
  emphasisScale: z
    .object({
      min: z.number().min(0.8).max(1).default(0.95),
      max: z.number().min(1).max(1.5).default(1.15),
    })
    .default({ min: 0.95, max: 1.15 })
    .describe('Emphasis burst scale range'),
  microVibrationRange: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Micro-vibration translate range in pixels'),

  // Blur effect
  blurAmount: z
    .object({
      max: z.number().min(0).max(10).default(2),
      min: z.number().min(0).max(10).default(0),
    })
    .default({ max: 2, min: 0 })
    .describe('Blur amount range (max at rest, min at peak)'),

  // Global impact multiplier
  globalImpact: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Global intensity multiplier for all effects'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize,
    fontFamily,
    textColor,
    textShadow,
    containerPadding,
    wordGap,
    basePulseDuration,
    emphasisDuration,
    microVibrationDuration,
    basePulseScale,
    emphasisScale,
    microVibrationRange,
    blurAmount,
    globalImpact,
  } = params;

  // Parse font family (format: "FontName:weight")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontWeight = fontString.includes(':')
      ? parseInt(fontString.split(':')[1], 10)
      : 900;
    return { fontFamily, fontWeight };
  };

  const { fontFamily: parsedFontFamily, fontWeight: parsedFontWeight } =
    parseFontString(fontFamily);

  // Helper: Generate base pulse effect
  const createBasePulseEffect = (
    wordId: string,
    captionDuration: number,
  ): GenericEffectData => {
    return {
      type: 'linear',
      start: 0,
      duration: Math.min(basePulseDuration, captionDuration),
      loop: true,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: basePulseScale.min, prog: 0 },
        { key: 'scale', val: basePulseScale.max, prog: 0.5 },
        { key: 'scale', val: basePulseScale.min, prog: 1 },
      ],
    } as GenericEffectData;
  };

  // Helper: Generate emphasis burst effect
  const createEmphasisEffect = (
    wordId: string,
    wordStart: number,
    impact: number,
  ): GenericEffectData => {
    const adjustedDuration = emphasisDuration * impact * globalImpact;
    return {
      type: 'ease-out',
      start: wordStart,
      duration: adjustedDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: emphasisScale.min, prog: 0 },
        { key: 'scale', val: emphasisScale.max, prog: 0.3 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    } as GenericEffectData;
  };

  // Helper: Generate micro-vibration effect
  const createMicroVibrationEffect = (
    wordId: string,
    captionDuration: number,
  ): GenericEffectData => {
    return {
      type: 'linear',
      start: 0,
      duration: microVibrationDuration,
      loop: true,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'translateX', val: -microVibrationRange, prog: 0 },
        { key: 'translateX', val: microVibrationRange, prog: 0.5 },
        { key: 'translateX', val: -microVibrationRange, prog: 1 },
        { key: 'translateY', val: -microVibrationRange, prog: 0 },
        { key: 'translateY', val: microVibrationRange, prog: 0.33 },
        { key: 'translateY', val: -microVibrationRange, prog: 0.66 },
        { key: 'translateY', val: microVibrationRange, prog: 1 },
      ],
    } as GenericEffectData;
  };

  // Helper: Generate blur focus-pull effect
  const createBlurEffect = (
    wordId: string,
    wordStart: number,
    impact: number,
  ): GenericEffectData => {
    const adjustedDuration = emphasisDuration * impact * globalImpact;
    return {
      type: 'ease-in-out',
      start: wordStart,
      duration: adjustedDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'filter', val: `blur(${blurAmount.max}px)`, prog: 0 },
        { key: 'filter', val: `blur(${blurAmount.min}px)`, prog: 0.5 },
        { key: 'filter', val: `blur(${blurAmount.max}px)`, prog: 1 },
      ],
    } as GenericEffectData;
  };

  // Process captions
  const captionContainers = captions.map((caption, captionIndex) => {
    const captionId = `caption-container-${captionIndex}`;
    const impact = caption.metadata?.impact ?? globalImpact;
    const hasEmphasis = caption.metadata?.emphasis ?? false;
    const keyword = caption.metadata?.keyword?.toLowerCase();

    // Create word components
    const wordComponents = caption.words.map((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const isKeyword = keyword && word.text.toLowerCase().includes(keyword);
      const shouldEmphasize = hasEmphasis || isKeyword;

      // Base pulse effect (always active)
      const basePulse = createBasePulseEffect(wordId, caption.duration);

      // Micro-vibration effect (always active)
      const microVibration = createMicroVibrationEffect(
        wordId,
        caption.duration,
      );

      // Emphasis effects (triggered by metadata or keyword)
      const effects = [
        {
          id: `base-pulse-${wordId}`,
          componentId: 'generic',
          data: basePulse,
        },
        {
          id: `micro-vibration-${wordId}`,
          componentId: 'generic',
          data: microVibration,
        },
      ];

      if (shouldEmphasize) {
        const emphasisEffect = createEmphasisEffect(
          wordId,
          word.start,
          impact,
        );
        const blurEffect = createBlurEffect(wordId, word.start, impact);

        effects.push({
          id: `emphasis-${wordId}`,
          componentId: 'generic',
          data: emphasisEffect,
        });

        effects.push({
          id: `blur-${wordId}`,
          componentId: 'generic',
          data: blurEffect,
        });
      }

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize,
            fontWeight: parsedFontWeight,
            color: textColor,
            textShadow,
            willChange: 'transform, filter',
          },
          font: {
            family: parsedFontFamily,
            weights: [parsedFontWeight.toString()],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects,
      };
    });

    // Caption container
    return {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex flex-wrap items-center justify-center',
          style: {
            padding: `${containerPadding}px`,
            gap: `${wordGap}px`,
          },
        },
        repeatChildrenProps: {
          className: 'relative inline-block transform-gpu',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    };
  });

  // Root container
  const rootContainer = {
    id: 'vocal-pulse-root',
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
        fitDurationTo: 'this',
      },
    },
    childrenData: captionContainers,
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
  id: 'VocalPulseMotionPreset',
  title: 'Vocal Pulse Motion Graphics',
  description:
    'Energetic motion graphics preset where words pulse and throb with vocal energy, combining multiple animation frequencies - continuous gentle pulse (3s breathing), emphasis triggers (0.5s bursts), and micro-vibrations (0.1s texture) with synchronized blur effects for focus-pull.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'subtitles',
    'kinetic',
    'motion',
    'pulse',
    'throb',
    'energetic',
    'vocal',
    'bass',
    'vibration',
    'emphasis',
    'blur',
    'focus-pull',
    'multi-layer',
    'animation',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello world',
        start: 0,
        absoluteStart: 0,
        end: 2.5,
        absoluteEnd: 2.5,
        duration: 2.5,
        words: [
          {
            text: 'Hello',
            start: 0,
            absoluteStart: 0,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 1.0,
          },
          {
            text: 'world',
            start: 1.0,
            absoluteStart: 1.0,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 1.5,
          },
        ],
        metadata: {
          impact: 1.2,
          keyword: 'Hello',
          emphasis: true,
        },
      },
    ],
    fontSize: 64,
    fontFamily: 'Inter:900',
    textColor: '#ffffff',
    textShadow: '0 0 20px rgba(255,255,255,0.5)',
    containerPadding: 40,
    wordGap: 16,
    basePulseDuration: 3,
    emphasisDuration: 0.5,
    microVibrationDuration: 0.1,
    basePulseScale: { min: 0.98, max: 1.02 },
    emphasisScale: { min: 0.95, max: 1.15 },
    microVibrationRange: 1,
    blurAmount: { max: 2, min: 0 },
    globalImpact: 1,
  },
};

// Export preset
export const VocalPulseMotionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
