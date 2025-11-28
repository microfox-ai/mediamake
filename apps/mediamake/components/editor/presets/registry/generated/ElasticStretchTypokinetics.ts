/**
 * Elastic Stretch Typokinetics Preset
 *
 * This preset simulates elastic text stretching with rubber-band physics.
 * Features a two-phase animation: stretch phase (70% duration) with exponential
 * ease-out creating tension, followed by a settle phase (30%) with spring physics
 * showing subtle overshoot. Text stretches horizontally via scaleX transforms
 * (1.0 → 1.8 → 0.9 → 1.0) combined with letterSpacing animation (0 → 0.3em → -0.05em → 0).
 *
 * For captions, applies effects word-by-word with 50ms staggered delays creating
 * a wave-like stretch across sentences.
 *
 * Features:
 * - **Elastic Stretch Animation**: Two-phase rubber-band physics (stretch + settle)
 * - **ScaleX Transform**: Horizontal stretching from 1.0 → 1.8 → 0.9 → 1.0
 * - **Letter Spacing**: Animated letter spacing 0 → 0.3em → -0.05em → 0
 * - **Staggered Word Delays**: 50ms delay between words for wave effect
 * - **GPU Acceleration**: will-change: transform for smooth performance
 * - **Flexible Positioning**: Left, center, or right alignment
 * - **Font & Color Customization**: Custom fonts and color schemes
 *
 * Use cases:
 * - Creating energetic title animations with rubber-band stretch
 * - Building dynamic caption effects with wave-like motion
 * - Adding elastic typography to social media content
 * - Creating high-energy text reveals with physical tension
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// Parameters Schema
// ============================================================================

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
        metadata: z.any().optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  // Typography settings
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600")',
    ),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),

  // Positioning
  alignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Text alignment within container'),

  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical positioning of text container'),

  // Animation settings
  stretchDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Total duration of elastic stretch animation per word (seconds)'),

  staggerDelay: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Delay between word animations (seconds)'),

  maxScale: z
    .number()
    .min(1.2)
    .max(3)
    .default(1.8)
    .describe('Maximum horizontal scale (stretch peak)'),

  overshootScale: z
    .number()
    .min(0.7)
    .max(0.95)
    .default(0.9)
    .describe('Scale value during overshoot (should be less than 1.0)'),

  maxLetterSpacing: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Maximum letter spacing in em units'),

  overshootLetterSpacing: z
    .number()
    .min(-0.2)
    .max(0)
    .default(-0.05)
    .describe('Letter spacing during overshoot (negative for compression)'),

  // Styling
  textShadow: z
    .string()
    .optional()
    .default('0 2px 8px rgba(0,0,0,0.3)')
    .describe('CSS text-shadow property'),

  wordGap: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Gap between words in pixels'),
});

// ============================================================================
// Preset Execution
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Create elastic stretch effect for a word
  const createElasticStretchEffect = (
    wordId: string,
    wordStart: number,
    wordIndex: number,
  ) => {
    const effectStart = wordStart + wordIndex * params.staggerDelay;
    const duration = params.stretchDuration;

    // Two-phase keyframes:
    // Phase 1 (0 → 0.7): Stretch phase - exponential ease-out
    // Phase 2 (0.7 → 0.85): Snap back with overshoot
    // Phase 3 (0.85 → 1.0): Settle to normal

    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: effectStart,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // ScaleX animation
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleX', val: params.maxScale, prog: 0.7 },
        { key: 'scaleX', val: params.overshootScale, prog: 0.85 },
        { key: 'scaleX', val: 1, prog: 1 },
        // Letter spacing animation
        { key: 'letterSpacing', val: '0em', prog: 0 },
        { key: 'letterSpacing', val: `${params.maxLetterSpacing}em`, prog: 0.7 },
        {
          key: 'letterSpacing',
          val: `${params.overshootLetterSpacing}em`,
          prog: 0.85,
        },
        { key: 'letterSpacing', val: '0em', prog: 1 },
      ],
    };

    return {
      id: `elastic-stretch-${wordId}`,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Helper: Get alignment classes
  const getAlignmentClass = () => {
    switch (params.alignment) {
      case 'left':
        return 'justify-start';
      case 'right':
        return 'justify-end';
      default:
        return 'justify-center';
    }
  };

  // Helper: Get vertical position classes
  const getVerticalPositionClass = () => {
    switch (params.verticalPosition) {
      case 'top':
        return 'items-start pt-16';
      case 'bottom':
        return 'items-end pb-16';
      default:
        return 'items-center';
    }
  };

  // Build caption containers
  const captionContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionId = `caption-${captionIndex}`;

    // Build word components for this caption
    const wordComponents: RenderableComponentData[] = caption.words.map(
      (word, wordIndex) => {
        const wordId = `word-${captionIndex}-${wordIndex}`;

        // Create elastic stretch effect
        const effect = createElasticStretchEffect(
          wordId,
          word.start,
          wordIndex,
        );

        return {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              textShadow: params.textShadow,
              willChange: 'transform',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight
                ? { weights: [fontStyle.fontWeight.toString()] }
                : {}),
            },
          },
          context: {
            timing: {
              start: 0, // All words start together (sentence-level timing)
              duration: caption.duration, // All words last for full sentence
            },
          },
          effects: [effect],
        } as RenderableComponentData;
      },
    );

    // Caption container with word layout
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `flex flex-wrap ${getAlignmentClass()}`,
          style: {
            gap: `${params.wordGap}px`,
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

    captionContainers.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'elastic-stretch-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${getVerticalPositionClass()} px-8`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10,
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

// ============================================================================
// Preset Metadata
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'ElasticStretchTypokinetics',
  title: 'Elastic Stretch Typokinetics',
  description:
    'A typokinetics preset that simulates elastic text stretching with rubber-band physics. Features a two-phase animation: stretch phase (70% duration) with exponential ease-out creating tension, followed by a settle phase (30%) with spring physics showing subtle overshoot. Text stretches horizontally via scaleX transforms (1.0 → 1.8 → 0.9 → 1.0) combined with letterSpacing animation (0 → 0.3em → -0.05em → 0). For captions, applies effects word-by-word with 50ms staggered delays creating a wave-like stretch across sentences.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'typokinetics',
    'elastic',
    'stretch',
    'rubber-band',
    'captions',
    'animation',
    'kinetic',
    'wave',
    'physics',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Elastic text stretching',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            text: 'Elastic',
            start: 0,
            absoluteStart: 0,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.8,
          },
          {
            text: 'text',
            start: 0.9,
            absoluteStart: 0.9,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 0.6,
          },
          {
            text: 'stretching',
            start: 1.6,
            absoluteStart: 1.6,
            end: 3,
            absoluteEnd: 3,
            duration: 1.4,
          },
        ],
      },
    ],
    fontSize: 48,
    font: 'Inter:700',
    textColor: '#ffffff',
    alignment: 'center',
    verticalPosition: 'center',
    stretchDuration: 1.2,
    staggerDelay: 0.05,
    maxScale: 1.8,
    overshootScale: 0.9,
    maxLetterSpacing: 0.3,
    overshootLetterSpacing: -0.05,
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
    wordGap: 8,
  },
};

// ============================================================================
// Export
// ============================================================================

export const ElasticStretchTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};