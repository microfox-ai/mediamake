/**
 * Organic Growth Text Preset
 *
 * A typokinetics preset that mimics biological growth patterns where words sprout like
 * leaves from a central vertical stem with organic branching connections. Each word emerges
 * with an unfurling animation - starting compressed and rotating slightly as it expands to
 * full size. Connection lines grow with a natural, slightly curved path. The color palette
 * transitions from pale/translucent to vibrant as words 'mature'. Sentiment metadata
 * influences color - positive words bloom into warm colors, negative into cool blues.
 *
 * Features:
 * - **Central Stem Layout**: Vertical central axis with words branching alternating left/right
 * - **Unfurling Animation**: Words start compressed, rotate, and expand (scale + rotate + opacity)
 * - **Organic Lines**: Curved connection lines simulated with multiple SVG segments
 * - **Color Maturation**: Words transition from pale/translucent to vibrant sentiment-based colors
 * - **Sentiment-Based Colors**: Positive = warm colors, negative = cool blues, neutral = greens
 * - **Sequential Growth**: Lines animate in segments for natural growth illusion
 *
 * Use cases:
 * - Creating organic, nature-inspired text animations
 * - Building sentiment-aware word visualizations
 * - Adding biological growth metaphors to captions
 * - Creating kinetic typography with branching structures
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type {
  GenericEffectData,
  TextAtomData,
  BaseEffect,
} from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        text: z.string().describe('Sentence text'),
        start: z.number().describe('Start time relative to caption timeline'),
        absoluteStart: z
          .number()
          .describe('Absolute start time in caption timeline'),
        duration: z.number().describe('Duration of the caption'),
        words: z
          .array(
            z.object({
              text: z.string().describe('Word text'),
              start: z.number().describe('Start time relative to caption'),
              absoluteStart: z
                .number()
                .describe('Absolute start time in caption timeline'),
              duration: z.number().describe('Duration of the word'),
            }),
          )
          .describe('Array of words in the caption'),
        metadata: z
          .object({
            sentiment: z
              .enum(['positive', 'negative', 'neutral'])
              .optional()
              .describe('Sentiment of the caption'),
          })
          .optional()
          .describe('Caption metadata for color determination'),
      }),
    )
    .describe('Array of captions with words and sentiment metadata'),

  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600:italic", "Roboto:700", "BebasNeue")',
    ),

  fontSize: z
    .number()
    .default(24)
    .describe('Base font size for words in pixels'),

  verticalSpacing: z
    .number()
    .default(60)
    .describe('Vertical spacing between word branches in pixels'),

  horizontalOffset: z
    .number()
    .default(200)
    .describe('Horizontal offset from stem for branching words in pixels'),

  unfurlDuration: z
    .number()
    .default(0.5)
    .describe('Duration of unfurling animation in seconds'),

  maturationDuration: z
    .number()
    .default(0.3)
    .describe(
      'Duration of color maturation animation (after unfurl) in seconds',
    ),

  lineGrowthDelay: z
    .number()
    .default(0.2)
    .describe(
      'Delay before line growth starts (relative to word unfurl) in seconds',
    ),

  lineSegmentDuration: z
    .number()
    .default(0.1)
    .describe('Duration for each line segment to grow in seconds'),

  positiveColors: z
    .array(z.string())
    .default(['#FF6B6B', '#FFD93D', '#FFA07A', '#FF8C69'])
    .describe('Color palette for positive sentiment words (warm colors)'),

  negativeColors: z
    .array(z.string())
    .default(['#4ECDC4', '#45B7D1', '#6C5CE7', '#74B9FF'])
    .describe('Color palette for negative sentiment words (cool blues)'),

  neutralColors: z
    .array(z.string())
    .default(['#6BCF7F', '#7FD97F', '#95E1A3', '#A8E6B3'])
    .describe('Color palette for neutral sentiment words (greens)'),

  paleColor: z
    .string()
    .default('rgba(200, 200, 200, 0.4)')
    .describe('Initial pale/translucent color before maturation'),

  lineColor: z
    .string()
    .default('rgba(150, 150, 150, 0.6)')
    .describe('Color for connection lines'),

  lineWidth: z.number().default(2).describe('Stroke width for connection lines'),

  impact: z
    .number()
    .default(1.0)
    .min(0.1)
    .max(3.0)
    .describe('Effect intensity multiplier (0.1 - 3.0)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    font,
    fontSize,
    verticalSpacing,
    horizontalOffset,
    unfurlDuration,
    maturationDuration,
    lineGrowthDelay,
    lineSegmentDuration,
    positiveColors,
    negativeColors,
    neutralColors,
    paleColor,
    lineColor,
    lineWidth,
    impact,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    let fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const fontConfig = font ? parseFontString(font) : null;

  // Helper: Get sentiment color
  const getSentimentColor = (
    sentiment: 'positive' | 'negative' | 'neutral' | undefined,
    index: number,
  ): string => {
    const colors =
      sentiment === 'positive'
        ? positiveColors
        : sentiment === 'negative'
          ? negativeColors
          : neutralColors;
    return colors[index % colors.length];
  };

  // Helper: Create curved SVG path (3 segments approximating a bezier curve)
  const createCurvedPath = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): string[] => {
    const midX1 = startX + (endX - startX) * 0.33;
    const midY1 = startY + (endY - startY) * 0.33;
    const midX2 = startX + (endX - startX) * 0.66;
    const midY2 = startY + (endY - startY) * 0.66;

    // Three path segments
    return [
      `M ${startX} ${startY} L ${midX1} ${midY1}`, // Segment 1
      `M ${midX1} ${midY1} L ${midX2} ${midY2}`, // Segment 2
      `M ${midX2} ${midY2} L ${endX} ${endY}`, // Segment 3
    ];
  };

  // Collect all words with metadata
  const allWords: Array<{
    word: string;
    captionStart: number;
    captionAbsoluteStart: number;
    wordStart: number;
    wordAbsoluteStart: number;
    wordDuration: number;
    sentiment: 'positive' | 'negative' | 'neutral' | undefined;
    index: number;
  }> = [];

  captions.forEach((caption) => {
    caption.words.forEach((word, wordIndex) => {
      allWords.push({
        word: word.text,
        captionStart: caption.start,
        captionAbsoluteStart: caption.absoluteStart,
        wordStart: word.start,
        wordAbsoluteStart: word.absoluteStart,
        wordDuration: word.duration,
        sentiment: caption.metadata?.sentiment,
        index: allWords.length,
      });
    });
  });

  // Calculate total duration
  const totalDuration =
    allWords.length > 0
      ? Math.max(
          ...allWords.map(
            (w) => w.wordAbsoluteStart + w.wordDuration + maturationDuration,
          ),
        )
      : 10;

  // Build word branches
  const childrenData: RenderableComponentData[] = [];

  allWords.forEach((wordData, wordIndex) => {
    const { word, wordAbsoluteStart, wordDuration, sentiment, index } =
      wordData;

    // Alternate left/right branching
    const isLeft = wordIndex % 2 === 0;
    const branchX = isLeft ? -horizontalOffset : horizontalOffset;
    const branchY = wordIndex * verticalSpacing;

    // Calculate final color based on sentiment
    const finalColor = getSentimentColor(sentiment, wordIndex);

    // Word branch container ID
    const wordBranchId = `word-branch-${wordIndex}`;
    const wordTextId = `word-text-${wordIndex}`;
    const lineContainerId = `line-container-${wordIndex}`;

    // Create word text atom with effects
    const wordTextAtom: RenderableComponentData = {
      id: wordTextId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: fontSize,
          color: paleColor, // Start with pale color
          transformOrigin: 'center',
          ...(fontConfig?.fontStyle || {}),
        },
        font: fontConfig
          ? {
              family: fontConfig.fontFamily,
              ...(fontConfig.fontStyle.fontWeight
                ? { weights: [fontConfig.fontStyle.fontWeight.toString()] }
                : {}),
            }
          : undefined,
      } as TextAtomData,
      context: {
        timing: {
          start: 0, // Relative to word branch
          duration: wordDuration + maturationDuration,
        },
      },
      effects: [],
    };

    // Unfurl effects: scale, rotate, opacity
    const unfurlScaleEffect: BaseEffect = {
      id: `unfurl-scale-${wordIndex}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: unfurlDuration * impact,
        mode: 'provider',
        targetIds: [wordTextId],
        ranges: [
          { key: 'scale', val: 0.1, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    };

    const unfurlRotateEffect: BaseEffect = {
      id: `unfurl-rotate-${wordIndex}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: unfurlDuration * impact,
        mode: 'provider',
        targetIds: [wordTextId],
        ranges: [
          { key: 'rotate', val: -30, prog: 0 },
          { key: 'rotate', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };

    const unfurlOpacityEffect: BaseEffect = {
      id: `unfurl-opacity-${wordIndex}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: unfurlDuration * impact,
        mode: 'provider',
        targetIds: [wordTextId],
        ranges: [
          { key: 'opacity', val: 0.2, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    };

    // Color maturation effect
    const maturationEffect: BaseEffect = {
      id: `maturation-${wordIndex}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: unfurlDuration * impact,
        duration: maturationDuration * impact,
        mode: 'provider',
        targetIds: [wordTextId],
        ranges: [
          { key: 'color', val: paleColor, prog: 0 },
          { key: 'color', val: finalColor, prog: 1 },
        ],
      } as GenericEffectData,
    };

    wordTextAtom.effects = [
      unfurlScaleEffect,
      unfurlRotateEffect,
      unfurlOpacityEffect,
      maturationEffect,
    ];

    // Create connection lines (3 segments for curve)
    const stemCenterX = 0;
    const stemCenterY = branchY;
    const wordCenterX = branchX;
    const wordCenterY = branchY;

    const pathSegments = createCurvedPath(
      stemCenterX,
      stemCenterY,
      wordCenterX,
      wordCenterY,
    );

    const lineSegments: RenderableComponentData[] = pathSegments.map(
      (path, segIndex) => {
        const segmentId = `line-segment-${wordIndex}-${segIndex}`;

        const lineSegment: RenderableComponentData = {
          id: segmentId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<svg style="position: absolute; width: 100%; height: 100%; pointer-events: none; overflow: visible;">
              <path d="${path}" stroke="${lineColor}" stroke-width="${lineWidth}" fill="none" stroke-dasharray="100" stroke-dashoffset="100" />
            </svg>`,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0, // Relative to line container
              duration: lineSegmentDuration * impact,
            },
          },
          effects: [
            {
              id: `line-grow-${wordIndex}-${segIndex}`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: lineSegmentDuration * impact,
                mode: 'provider',
                targetIds: [segmentId],
                ranges: [
                  { key: 'strokeDashoffset', val: 100, prog: 0 },
                  { key: 'strokeDashoffset', val: 0, prog: 1 },
                ],
              } as GenericEffectData,
            },
          ],
        };

        return lineSegment;
      },
    );

    // Line container (staggered segment timing)
    const lineContainer: RenderableComponentData = {
      id: lineContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: lineGrowthDelay, // Start after unfurl begins
          duration:
            lineSegmentDuration * lineSegments.length * impact +
            lineGrowthDelay,
        },
      },
      childrenData: lineSegments.map((seg, segIndex) => ({
        ...seg,
        context: {
          timing: {
            start: segIndex * lineSegmentDuration * impact, // Stagger each segment
            duration: lineSegmentDuration * impact,
          },
        },
      })) as RenderableComponentData[],
    };

    // Word branch layout
    const wordBranch: RenderableComponentData = {
      id: wordBranchId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: `calc(50% + ${branchX}px)`,
            top: `${branchY}px`,
            transform: 'translateX(-50%)',
          },
        },
      },
      context: {
        timing: {
          start: wordAbsoluteStart, // Absolute start for word appearance
          duration: wordDuration + maturationDuration,
        },
      },
      childrenData: [wordTextAtom, lineContainer] as RenderableComponentData[],
    };

    childrenData.push(wordBranch);
  });

  // Root stem container
  const rootContainer: RenderableComponentData = {
    id: 'organic-growth-stem-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: childrenData,
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'OrganicGrowthText',
  title: 'Organic Growth Text',
  description:
    'A typokinetics preset mimicking biological growth patterns where words sprout like leaves from a central stem with organic branching connections. Features unfurling animations, curved growth lines, and sentiment-based color maturation from pale/translucent to vibrant colors.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'organic',
    'growth',
    'sentiment',
    'branching',
    'nature',
    'animated',
  ],
  defaultInputParams: {
    captions: [
      {
        text: 'Words bloom like flowers',
        start: 0,
        absoluteStart: 0,
        duration: 3,
        words: [
          {
            text: 'Words',
            start: 0,
            absoluteStart: 0,
            duration: 0.6,
          },
          {
            text: 'bloom',
            start: 0.6,
            absoluteStart: 0.6,
            duration: 0.6,
          },
          {
            text: 'like',
            start: 1.2,
            absoluteStart: 1.2,
            duration: 0.6,
          },
          {
            text: 'flowers',
            start: 1.8,
            absoluteStart: 1.8,
            duration: 1.2,
          },
        ],
        metadata: {
          sentiment: 'positive',
        },
      },
      {
        text: 'Growing organically from the stem',
        start: 3,
        absoluteStart: 3,
        duration: 4,
        words: [
          {
            text: 'Growing',
            start: 0,
            absoluteStart: 3,
            duration: 0.8,
          },
          {
            text: 'organically',
            start: 0.8,
            absoluteStart: 3.8,
            duration: 1.0,
          },
          {
            text: 'from',
            start: 1.8,
            absoluteStart: 4.8,
            duration: 0.6,
          },
          {
            text: 'the',
            start: 2.4,
            absoluteStart: 5.4,
            duration: 0.4,
          },
          {
            text: 'stem',
            start: 2.8,
            absoluteStart: 5.8,
            duration: 1.2,
          },
        ],
        metadata: {
          sentiment: 'neutral',
        },
      },
    ],
    font: 'Inter:500',
    fontSize: 24,
    verticalSpacing: 60,
    horizontalOffset: 200,
    unfurlDuration: 0.5,
    maturationDuration: 0.3,
    lineGrowthDelay: 0.2,
    lineSegmentDuration: 0.1,
    positiveColors: ['#FF6B6B', '#FFD93D', '#FFA07A', '#FF8C69'],
    negativeColors: ['#4ECDC4', '#45B7D1', '#6C5CE7', '#74B9FF'],
    neutralColors: ['#6BCF7F', '#7FD97F', '#95E1A3', '#A8E6B3'],
    paleColor: 'rgba(200, 200, 200, 0.4)',
    lineColor: 'rgba(150, 150, 150, 0.6)',
    lineWidth: 2,
    impact: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const OrganicGrowthTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
