/**
 * Architectural Typography Construction Preset
 *
 * This preset creates a hierarchical text animation that builds text like a modernist structure -
 * from foundation to completion. Words slide and lock into place with physical weight and momentum,
 * simulating time-lapse construction footage of a minimalist building.
 *
 * Features:
 * - **Hierarchical Construction**: Headers (larger elements) animate first with substantial movement,
 *   followed by body text filling in details
 * - **Construction-Order Algorithm**: Sorts elements by visual weight (fontSize * word-length),
 *   animates larger elements first with staggered timing
 * - **Physical Weight & Momentum**: Larger text has more dramatic slide/scale animations
 * - **Locking Effect**: Subtle bounce at animation end using cubic-bezier easing
 * - **Progressive Shadow Building**: Shadows grow during animation to suggest depth and weight
 * - **Construction Lines**: Optional thin borders that appear/disappear during build
 * - **Multi-Level Hierarchies**: Supports parent-child text relationships where structure
 *   establishes before details fill in
 *
 * Use cases:
 * - Creating architectural-style title sequences
 * - Building text hierarchies with physical presence
 * - Simulating construction/assembly animations
 * - Adding weight and substance to typography
 * - Creating time-lapse construction effects for text
 */

import { z } from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// --- Parameter Schema ---
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
            hierarchy: z
              .enum(['header', 'subheader', 'body', 'caption'])
              .optional()
              .describe('Text hierarchy level'),
            weight: z
              .number()
              .optional()
              .describe('Custom visual weight override'),
            constructionDelay: z
              .number()
              .optional()
              .describe('Custom delay before construction starts'),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with hierarchical metadata'),

  headerFont: z
    .string()
    .default('Helvetica:700')
    .describe('Font for headers (format: "Family:weight" or "Family")'),

  bodyFont: z
    .string()
    .default('Helvetica:400')
    .describe('Font for body text (format: "Family:weight" or "Family")'),

  headerColor: z
    .string()
    .default('#000000')
    .describe('Color for header text (CSS color)'),

  bodyColor: z
    .string()
    .default('#333333')
    .describe('Color for body text (CSS color)'),

  headerFontSize: z
    .number()
    .default(64)
    .describe('Font size for headers in pixels'),

  bodyFontSize: z
    .number()
    .default(32)
    .describe('Font size for body text in pixels'),

  staggerDelay: z
    .number()
    .default(0.1)
    .describe('Delay between each word construction (seconds)'),

  constructionSpeed: z
    .number()
    .default(1.0)
    .min(0.5)
    .max(2.0)
    .describe('Speed multiplier for construction animations'),

  showConstructionLines: z
    .boolean()
    .default(true)
    .describe('Show temporary construction lines during build'),

  constructionLineColor: z
    .string()
    .default('rgba(0,0,0,0.2)')
    .describe('Color for construction guide lines'),

  bounceFactor: z
    .number()
    .default(0.55)
    .min(0.0)
    .max(1.0)
    .describe('Intensity of bounce-lock effect (0 = no bounce, 1 = maximum)'),

  shadowIntensity: z
    .number()
    .default(0.1)
    .min(0.0)
    .max(0.3)
    .describe('Maximum shadow opacity during construction'),

  layoutDirection: z
    .enum(['vertical', 'horizontal'])
    .default('vertical')
    .describe('Layout direction for text hierarchy'),

  alignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Text alignment within container'),
});

// --- Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Parse font string (format: "FontName:weight" or "FontName")
  const parseFont = (fontString: string) => {
    const parts = fontString.split(':');
    const family = parts[0];
    const weight = parts.length > 1 ? parts[1] : '400';
    return { family, weight };
  };

  // Helper: Calculate visual weight (fontSize * word-length)
  const calculateVisualWeight = (
    text: string,
    fontSize: number,
    customWeight?: number,
  ): number => {
    if (customWeight !== undefined) return customWeight;
    return fontSize * text.length;
  };

  // Helper: Determine hierarchy level from metadata or text characteristics
  const getHierarchyLevel = (
    caption: (typeof params.captions)[0],
  ): 'header' | 'body' => {
    if (caption.metadata?.hierarchy === 'header') return 'header';
    if (caption.metadata?.hierarchy === 'subheader') return 'header';
    // Default: longer text or all-caps = header, otherwise body
    if (caption.text.length < 20 || caption.text === caption.text.toUpperCase())
      return 'header';
    return 'body';
  };

  // Helper: Create construction effect with bounce-lock
  const createConstructionEffect = (
    targetId: string,
    startTime: number,
    isHeader: boolean,
    wordIndex: number,
  ): GenericEffectData => {
    const baseHeaderDuration = 0.6;
    const baseBodyDuration = 0.4;
    const baseDuration = isHeader ? baseHeaderDuration : baseBodyDuration;
    const duration = baseDuration / params.constructionSpeed;

    const translateDistance = isHeader ? 50 : 30;
    const scaleStart = isHeader ? 0.9 : 0.95;

    // Custom cubic-bezier for bounce-lock effect
    const bounceEasing = `cubic-bezier(0.68, ${-params.bounceFactor}, 0.265, ${1 + params.bounceFactor})`;

    return {
      type: bounceEasing as any,
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Slide up from bottom
        { key: 'translateY', val: translateDistance, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        // Scale up to normal size
        { key: 'scale', val: scaleStart, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        // Fade in quickly
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
      ],
    };
  };

  // Helper: Create shadow progression effect
  const createShadowEffect = (
    targetId: string,
    startTime: number,
    isHeader: boolean,
  ): GenericEffectData => {
    const baseHeaderDuration = 0.6;
    const baseBodyDuration = 0.4;
    const baseDuration = isHeader ? baseHeaderDuration : baseBodyDuration;
    const duration = baseDuration / params.constructionSpeed;

    const shadowBlur = isHeader ? 6 : 4;

    return {
      type: 'ease-out',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        {
          key: 'filter',
          val: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))',
          prog: 0,
        },
        {
          key: 'filter',
          val: `drop-shadow(0px 4px ${shadowBlur}px rgba(0,0,0,${params.shadowIntensity}))`,
          prog: 1,
        },
      ],
    };
  };

  // Helper: Create construction line effect
  const createConstructionLineEffect = (
    targetId: string,
    startTime: number,
    duration: number,
  ): GenericEffectData => {
    const fadeOutStart = 0.7; // Start fading at 70% of animation

    return {
      type: 'ease-out',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: fadeOutStart },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };
  };

  // Parse fonts
  const headerFont = parseFont(params.headerFont);
  const bodyFont = parseFont(params.bodyFont);

  // Build hierarchical structure with construction-order algorithm
  const hierarchyGroups: {
    headers: Array<{
      caption: (typeof params.captions)[0];
      weight: number;
      words: Array<{ text: string; weight: number }>;
    }>;
    body: Array<{
      caption: (typeof params.captions)[0];
      weight: number;
      words: Array<{ text: string; weight: number }>;
    }>;
  } = {
    headers: [],
    body: [],
  };

  // Categorize and calculate weights
  params.captions.forEach((caption) => {
    const level = getHierarchyLevel(caption);
    const fontSize =
      level === 'header' ? params.headerFontSize : params.bodyFontSize;
    const weight = calculateVisualWeight(
      caption.text,
      fontSize,
      caption.metadata?.weight,
    );

    const words = caption.words.map((word) => ({
      text: word.text,
      weight: calculateVisualWeight(word.text, fontSize),
    }));

    if (level === 'header') {
      hierarchyGroups.headers.push({ caption, weight, words });
    } else {
      hierarchyGroups.body.push({ caption, weight, words });
    }
  });

  // Sort by weight (heavier elements first)
  hierarchyGroups.headers.sort((a, b) => b.weight - a.weight);
  hierarchyGroups.body.sort((a, b) => b.weight - a.weight);

  // Create header components (construction layer z-20)
  const headerComponents: RenderableComponentData[] = [];
  let headerConstructionTime = 0;

  hierarchyGroups.headers.forEach((item, groupIndex) => {
    const caption = item.caption;
    const captionId = `header-caption-${groupIndex}`;

    // Sort words by weight within caption
    const sortedWordIndices = item.words
      .map((word, index) => ({ word, index }))
      .sort((a, b) => b.word.weight - a.word.weight)
      .map((item) => item.index);

    const wordComponents = sortedWordIndices.map((wordIndex, sortedIndex) => {
      const word = caption.words[wordIndex];
      const wordId = `${captionId}-word-${wordIndex}`;
      const constructionStart =
        headerConstructionTime + sortedIndex * params.staggerDelay;

      // Create effects array
      const effects: any[] = [
        {
          id: `${wordId}-construction`,
          componentId: 'generic',
          data: createConstructionEffect(
            wordId,
            constructionStart,
            true,
            sortedIndex,
          ),
        },
        {
          id: `${wordId}-shadow`,
          componentId: 'generic',
          data: createShadowEffect(wordId, constructionStart, true),
        },
      ];

      // Add construction lines if enabled
      if (params.showConstructionLines) {
        effects.push({
          id: `${wordId}-construction-line`,
          componentId: 'generic',
          data: createConstructionLineEffect(
            wordId,
            constructionStart,
            0.6 / params.constructionSpeed,
          ),
        });
      }

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${params.headerFontSize}px`,
            fontWeight: headerFont.weight,
            color: params.headerColor,
            marginRight: '0.2em',
            ...(params.showConstructionLines
              ? {
                  borderBottom: `1px solid ${params.constructionLineColor}`,
                  paddingBottom: '2px',
                }
              : {}),
          },
          font: {
            family: headerFont.family,
            weights: [headerFont.weight],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects,
      };
    });

    // Update construction time for next group
    headerConstructionTime +=
      sortedWordIndices.length * params.staggerDelay +
      (caption.metadata?.constructionDelay || 0);

    // Create caption container
    headerComponents.push({
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `flex ${params.layoutDirection === 'horizontal' ? 'flex-row' : 'flex-col'} items-${params.alignment === 'center' ? 'center' : params.alignment === 'right' ? 'end' : 'start'} justify-center`,
          style: {
            gap: '0.3em',
            marginBottom: params.layoutDirection === 'vertical' ? '1em' : '0',
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
    } as RenderableComponentData);
  });

  // Create body components (construction layer z-10, starts 200ms after headers)
  const bodyComponents: RenderableComponentData[] = [];
  const bodyLayerDelay = 0.2; // 200ms delay as per spec
  let bodyConstructionTime = 0;

  hierarchyGroups.body.forEach((item, groupIndex) => {
    const caption = item.caption;
    const captionId = `body-caption-${groupIndex}`;

    // Sort words by weight within caption
    const sortedWordIndices = item.words
      .map((word, index) => ({ word, index }))
      .sort((a, b) => b.word.weight - a.word.weight)
      .map((item) => item.index);

    const wordComponents = sortedWordIndices.map((wordIndex, sortedIndex) => {
      const word = caption.words[wordIndex];
      const wordId = `${captionId}-word-${wordIndex}`;
      const constructionStart =
        bodyConstructionTime + sortedIndex * params.staggerDelay;

      // Create effects array
      const effects: any[] = [
        {
          id: `${wordId}-construction`,
          componentId: 'generic',
          data: createConstructionEffect(
            wordId,
            constructionStart,
            false,
            sortedIndex,
          ),
        },
        {
          id: `${wordId}-shadow`,
          componentId: 'generic',
          data: createShadowEffect(wordId, constructionStart, false),
        },
      ];

      // Add construction lines if enabled
      if (params.showConstructionLines) {
        effects.push({
          id: `${wordId}-construction-line`,
          componentId: 'generic',
          data: createConstructionLineEffect(
            wordId,
            constructionStart,
            0.4 / params.constructionSpeed,
          ),
        });
      }

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${params.bodyFontSize}px`,
            fontWeight: bodyFont.weight,
            color: params.bodyColor,
            marginRight: '0.2em',
            ...(params.showConstructionLines
              ? {
                  borderBottom: `1px solid ${params.constructionLineColor}`,
                  paddingBottom: '2px',
                }
              : {}),
          },
          font: {
            family: bodyFont.family,
            weights: [bodyFont.weight],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects,
      };
    });

    // Update construction time for next group
    bodyConstructionTime +=
      sortedWordIndices.length * params.staggerDelay +
      (caption.metadata?.constructionDelay || 0);

    // Create caption container
    bodyComponents.push({
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `flex ${params.layoutDirection === 'horizontal' ? 'flex-row' : 'flex-col'} items-${params.alignment === 'center' ? 'center' : params.alignment === 'right' ? 'end' : 'start'} justify-center`,
          style: {
            gap: '0.3em',
            marginBottom: params.layoutDirection === 'vertical' ? '0.5em' : '0',
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
    } as RenderableComponentData);
  });

  // Calculate total duration
  const lastCaption = params.captions[params.captions.length - 1];
  const totalDuration = lastCaption
    ? lastCaption.absoluteEnd
    : params.captions[0]?.duration || 10;

  // Create header construction layer
  const headerLayer: RenderableComponentData = {
    id: 'header-construction-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative z-20',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: headerComponents,
  };

  // Create body construction layer (starts 200ms later)
  const bodyLayer: RenderableComponentData = {
    id: 'body-construction-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative z-10',
      },
    },
    context: {
      timing: {
        start: bodyLayerDelay,
        duration: totalDuration - bodyLayerDelay,
      },
    },
    childrenData: bodyComponents,
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'architectural-typography-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex flex-col items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [headerLayer, bodyLayer],
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

// --- Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'architectural-typography-preset',
  title: 'Architectural Typography Construction',
  description:
    'A hierarchical text animation preset that builds text like a modernist structure - from foundation to completion. Words slide and lock into place with physical weight and momentum, simulating time-lapse construction footage. Headers (larger elements) animate first with substantial movement, followed by body text filling in details. Features construction-order algorithm, weight-based staggering, bounce-lock effects, and progressive shadow building.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'architectural',
    'construction',
    'hierarchy',
    'modernist',
    'weight',
    'momentum',
    'time-lapse',
    'text',
    'captions',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'MODERN DESIGN',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            text: 'MODERN',
            start: 0,
            absoluteStart: 0,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 1.5,
          },
          {
            text: 'DESIGN',
            start: 1.5,
            absoluteStart: 1.5,
            end: 3,
            absoluteEnd: 3,
            duration: 1.5,
          },
        ],
        metadata: {
          hierarchy: 'header',
        },
      },
      {
        id: 'caption-2',
        text: 'Building the future with precision and elegance',
        start: 0,
        absoluteStart: 3.2,
        end: 5,
        absoluteEnd: 8.2,
        duration: 5,
        words: [
          {
            text: 'Building',
            start: 0,
            absoluteStart: 3.2,
            end: 0.8,
            absoluteEnd: 4.0,
            duration: 0.8,
          },
          {
            text: 'the',
            start: 0.8,
            absoluteStart: 4.0,
            end: 1.2,
            absoluteEnd: 4.4,
            duration: 0.4,
          },
          {
            text: 'future',
            start: 1.2,
            absoluteStart: 4.4,
            end: 2.0,
            absoluteEnd: 5.2,
            duration: 0.8,
          },
          {
            text: 'with',
            start: 2.0,
            absoluteStart: 5.2,
            end: 2.5,
            absoluteEnd: 5.7,
            duration: 0.5,
          },
          {
            text: 'precision',
            start: 2.5,
            absoluteStart: 5.7,
            end: 3.5,
            absoluteEnd: 6.7,
            duration: 1.0,
          },
          {
            text: 'and',
            start: 3.5,
            absoluteStart: 6.7,
            end: 4.0,
            absoluteEnd: 7.2,
            duration: 0.5,
          },
          {
            text: 'elegance',
            start: 4.0,
            absoluteStart: 7.2,
            end: 5.0,
            absoluteEnd: 8.2,
            duration: 1.0,
          },
        ],
        metadata: {
          hierarchy: 'body',
        },
      },
    ],
    headerFont: 'Helvetica:700',
    bodyFont: 'Helvetica:400',
    headerColor: '#000000',
    bodyColor: '#333333',
    headerFontSize: 64,
    bodyFontSize: 32,
    staggerDelay: 0.1,
    constructionSpeed: 1.0,
    showConstructionLines: true,
    constructionLineColor: 'rgba(0,0,0,0.2)',
    bounceFactor: 0.55,
    shadowIntensity: 0.1,
    layoutDirection: 'vertical',
    alignment: 'center',
  },
};

// --- Export ---
export const architecturalTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
