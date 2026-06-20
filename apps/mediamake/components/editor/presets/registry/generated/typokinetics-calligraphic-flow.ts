/**
 * Typokinetics - Calligraphic Text Flow Preset
 *
 * This preset simulates handwritten calligraphic text with variable speed animation,
 * pen pressure effects through opacity and scale, and organic rhythm. Uses serif fonts
 * (Cinzel, Abril Fatface) to create the effect of watching a master calligrapher at work
 * with natural pauses, flourishes, and varying stroke emphasis based on word importance.
 *
 * Features:
 * - **Calligraphic Flow**: Words appear with varying speeds simulating handwriting rhythm
 * - **Pen Pressure Simulation**: Dynamic opacity and scale variations create stroke weight illusion
 * - **Variable Speed Animation**: Important words slow down and scale up, connectors flow quickly
 * - **Multiple Text Shadows**: Layered shadows simulate calligraphic stroke width
 * - **Spring vs Linear Easing**: Keywords use spring physics, connectors use linear flow
 * - **Metadata-Driven**: Uses caption.metadata.impact and .keyword for dynamic timing
 *
 * Use cases:
 * - Elegant title sequences with calligraphic feel
 * - Poetry or literary content with emphasis on rhythm
 * - Handwritten-style announcements
 * - Artistic typography animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

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
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
            keyword: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),
  font: z
    .string()
    .default('Cinzel:600')
    .describe(
      'Font family with optional weight (e.g., "Cinzel:600", "Abril Fatface:700")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#1a1a1a')
    .describe('Text color (CSS color value)'),
  lowImpactDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Duration for low-impact connector words (seconds)'),
  highImpactDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Duration for high-impact keywords (seconds)'),
  keywordScaleFactor: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .describe('Scale multiplier for keyword emphasis'),
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of text shadow layers (0-1)'),
  globalImpact: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Global impact multiplier for all animations'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    lowImpactDuration,
    highImpactDuration,
    keywordScaleFactor,
    shadowIntensity,
    globalImpact,
  } = params;

  // Helper: Parse font string
  const parseFontString = (
    fontString: string,
  ): { family: string; weight: number } => {
    const parts = fontString.split(':');
    return {
      family: parts[0] || 'Cinzel',
      weight: parts[1] ? parseInt(parts[1], 10) : 600,
    };
  };

  // Helper: Calculate word duration based on impact
  const calculateWordDuration = (
    word: string,
    caption: TranscriptionSentence,
  ): number => {
    const captionImpact = caption.metadata?.impact ?? 1;
    const isKeyword =
      caption.metadata?.keyword &&
      word.toLowerCase() === caption.metadata.keyword.toLowerCase();

    const baseDuration = isKeyword ? highImpactDuration : lowImpactDuration;
    return baseDuration * captionImpact * globalImpact;
  };

  // Helper: Generate text shadow layers
  const generateTextShadow = (
    impact: number,
    intensity: number,
  ): string => {
    const layers = [];
    const shadowCount = Math.floor(2 + impact);

    for (let i = 0; i < shadowCount; i++) {
      const offset = i * 0.5;
      const blur = i * 1.5;
      const opacity = (0.2 * intensity * (1 - i / shadowCount)).toFixed(2);
      layers.push(
        `${offset}px ${offset}px ${blur}px rgba(0,0,0,${opacity})`,
      );
    }

    return layers.join(', ');
  };

  // Helper: Create calligraphic reveal effect
  const createCalligraphicEffect = (
    wordId: string,
    wordDuration: number,
    isKeyword: boolean,
    impact: number,
  ): GenericEffectData => {
    const scalePeak = isKeyword ? keywordScaleFactor : 1;

    return {
      type: isKeyword ? 'spring' : 'linear',
      start: 0,
      duration: wordDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Opacity (pen pressure simulation)
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.7, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 1 },
        // Horizontal entry (pen movement)
        { key: 'translateX', val: -10, prog: 0 },
        { key: 'translateX', val: 0, prog: 0.4 },
        // Scale (emphasis for keywords)
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: scalePeak, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };
  };

  const fontConfig = parseFontString(font);
  const captionContainers: RenderableComponentData[] = [];

  // Process each caption
  captions.forEach((caption, captionIndex) => {
    const words = caption.words || [];
    const captionImpact = caption.metadata?.impact ?? 1;

    // Calculate total duration for this caption based on word durations
    const wordDurations = words.map((word) =>
      calculateWordDuration(word.text, caption),
    );
    const totalCaptionDuration = wordDurations.reduce(
      (sum, dur) => sum + dur,
      0,
    );

    // Create word components with cumulative timing
    let cumulativeStart = 0;
    const wordComponents: RenderableComponentData[] = words.map(
      (word, wordIndex) => {
        const wordId = `word-${captionIndex}-${wordIndex}`;
        const wordDuration = wordDurations[wordIndex];
        const isKeyword =
          caption.metadata?.keyword &&
          word.text.toLowerCase() === caption.metadata.keyword.toLowerCase();

        // Calculate font weight based on impact
        const fontWeight = Math.min(
          900,
          Math.max(400, Math.floor(fontConfig.weight * captionImpact)),
        );

        // Generate text shadow
        const textShadow = generateTextShadow(
          captionImpact,
          shadowIntensity,
        );

        // Create effect
        const effect = createCalligraphicEffect(
          wordId,
          wordDuration,
          isKeyword,
          captionImpact,
        );

        // Word wrapper (positioned at cumulative start)
        const wordWrapper: RenderableComponentData = {
          id: `word-wrapper-${captionIndex}-${wordIndex}`,
          type: 'layout',
          componentId: 'BaseLayout',
          context: {
            timing: {
              start: cumulativeStart,
              duration: wordDuration,
            },
          },
          childrenData: [
            {
              id: wordId,
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: word.text,
                style: {
                  fontSize: `${fontSize}px`,
                  fontWeight: fontWeight,
                  color: textColor,
                  textShadow: textShadow,
                },
                font: {
                  family: fontConfig.family,
                  weights: [fontWeight.toString()],
                },
              } as TextAtomData,
              context: {
                timing: {
                  start: 0,
                  duration: wordDuration,
                },
              },
            },
          ],
          effects: [
            {
              id: `effect-${wordId}`,
              componentId: 'generic',
              data: effect,
            },
          ],
        };

        cumulativeStart += wordDuration;
        return wordWrapper;
      },
    );

    // Words container
    const wordsContainer: RenderableComponentData = {
      id: `words-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'flex flex-row flex-wrap items-center justify-center gap-2',
          style: {
            maxWidth: '80%',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalCaptionDuration,
        },
      },
      childrenData: wordComponents,
    };

    // Caption root container (positioned at absoluteStart)
    const captionContainer: RenderableComponentData = {
      id: `caption-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: totalCaptionDuration,
        },
      },
      childrenData: [wordsContainer],
    };

    captionContainers.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 30, // Default duration, will be overridden by composition
      },
    },
    childrenData: captionContainers,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokinetics-calligraphic-flow',
  title: 'Typokinetics - Calligraphic Text Flow',
  description:
    'Simulates handwritten calligraphic text with variable speed animation, pen pressure effects through opacity and scale, and organic rhythm. Uses serif fonts (Cinzel, Abril Fatface) to create the effect of watching a master calligrapher at work with natural pauses, flourishes, and varying stroke emphasis based on word importance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'calligraphy',
    'handwriting',
    'kinetic',
    'elegant',
    'serif',
    'variable-speed',
    'pen-pressure',
    'organic',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'The art of beautiful writing',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            text: 'The',
            start: 0,
            absoluteStart: 0,
            end: 0.3,
            absoluteEnd: 0.3,
            duration: 0.3,
          },
          {
            text: 'art',
            start: 0.3,
            absoluteStart: 0.3,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 1.2,
          },
          {
            text: 'of',
            start: 1.5,
            absoluteStart: 1.5,
            end: 1.8,
            absoluteEnd: 1.8,
            duration: 0.3,
          },
          {
            text: 'beautiful',
            start: 1.8,
            absoluteStart: 1.8,
            end: 3,
            absoluteEnd: 3,
            duration: 1.2,
          },
          {
            text: 'writing',
            start: 3,
            absoluteStart: 3,
            end: 4.2,
            absoluteEnd: 4.2,
            duration: 1.2,
          },
        ],
        metadata: {
          impact: 1.2,
          keyword: 'art',
        },
      },
    ],
    font: 'Cinzel:600',
    fontSize: 48,
    textColor: '#1a1a1a',
    lowImpactDuration: 0.3,
    highImpactDuration: 1.2,
    keywordScaleFactor: 1.2,
    shadowIntensity: 0.5,
    globalImpact: 1,
  },
  dependencies: {},
};

// Export preset
export const typokineticsCalligraphicFlowPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
