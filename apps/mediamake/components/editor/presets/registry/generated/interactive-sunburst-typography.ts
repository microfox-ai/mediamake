/**
 * Interactive Data-Drill Sunburst Typography Preset
 *
 * This preset creates a Nivo-inspired sunburst zoom visualization with radial arc layout.
 * It features dramatic zoom-into-category animations with spring easing, depth-of-field blur,
 * breadcrumb trail hierarchy, and burst-out sub-category animations.
 *
 * Features:
 * - **Radial Arc Layout**: Words arranged in arc segments representing data categories
 * - **Zoom-into-Category**: Dramatic zoom (scale 1→3) centered on selected word with spring easing
 * - **Depth-of-Field Effect**: Blur increases for words further from focus point
 * - **Breadcrumb Trail**: Animated hierarchy path with slash separators at top
 * - **Sub-Category Burst**: New words burst outward from zoomed parent with staggered radial animations
 * - **Sentence-Based Grouping**: Uses caption sentences to group related words into category arcs
 *
 * Use cases:
 * - Interactive data visualization effects
 * - Hierarchical content presentation
 * - Dynamic category exploration animations
 * - Data-driven typography with drill-down simulation
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  GenericEffectData,
  TextAtomData,
  RenderableComponentData,
} from '@microfox/remotion';

// ============================================================================
// PRESET PARAMETERS SCHEMA
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
        metadata: z
          .object({
            focusedCategory: z
              .string()
              .optional()
              .describe('Category name to focus on'),
            focusedSubCategory: z
              .string()
              .optional()
              .describe('Sub-category name to display'),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences to arrange in sunburst layout'),

  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600", "Roboto:700")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(64)
    .default(24)
    .describe('Base font size for category words in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color for category text'),

  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color for the scene'),

  arcRadius: z
    .number()
    .min(100)
    .max(400)
    .default(200)
    .describe('Radius of the arc segments in pixels'),

  zoomIntensity: z
    .number()
    .min(1.5)
    .max(5)
    .default(3)
    .describe('Scale multiplier for zoom effect (1 = no zoom, 3 = 3x scale)'),

  zoomDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .describe('Duration of zoom animation in seconds'),

  blurIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Maximum blur in pixels for non-focused words'),

  burstDuration: z
    .number()
    .min(0.2)
    .max(1)
    .default(0.4)
    .describe('Duration of sub-category burst animation in seconds'),

  burstStagger: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Stagger delay between burst animations in seconds'),

  breadcrumbFontSize: z
    .number()
    .min(10)
    .max(24)
    .default(16)
    .describe('Font size for breadcrumb trail in pixels'),

  enableBreadcrumb: z
    .boolean()
    .default(true)
    .describe('Whether to show breadcrumb trail at top'),

  enableDepthOfField: z
    .boolean()
    .default(true)
    .describe('Whether to apply depth-of-field blur effect'),

  enableSubBurst: z
    .boolean()
    .default(true)
    .describe('Whether to show sub-category burst animation'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:600';
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

  // Calculate total duration from captions
  const totalDuration =
    params.captions.length > 0
      ? Math.max(...params.captions.map((c) => c.absoluteEnd))
      : 10;

  // Helper: Create word component with effects
  const createWordComponent = (
    word: any,
    wordIndex: number,
    sentenceIndex: number,
    angle: number,
    caption: TranscriptionSentence,
  ): RenderableComponentData => {
    const wordId = `word-s${sentenceIndex}-w${wordIndex}`;
    const isFocused = wordIndex === 0; // Focus first word in each category

    // Zoom effect (spring easing approximated with cubic-bezier)
    const zoomEffect: GenericEffectData = {
      type: 'ease-out', // Approximating spring with ease-out
      start: word.start,
      duration: params.zoomDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: isFocused ? params.zoomIntensity : 1, prog: 1 },
      ],
    };

    // Blur effect for non-focused words
    const blurEffect: GenericEffectData = params.enableDepthOfField
      ? {
          type: 'ease-out',
          start: word.start + 0.1,
          duration: params.zoomDuration - 0.1,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            {
              key: 'filter',
              val: 'blur(0px)',
              prog: 0,
            },
            {
              key: 'filter',
              val: isFocused ? 'blur(0px)' : `blur(${params.blurIntensity}px)`,
              prog: 1,
            },
          ],
        }
      : null;

    // Fade effect for non-focused words
    const fadeEffect: GenericEffectData = {
      type: 'ease-out',
      start: word.start + 0.15,
      duration: params.zoomDuration - 0.15,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: isFocused ? 1 : 0.2, prog: 1 },
      ],
    };

    const effects = [zoomEffect, blurEffect, fadeEffect].filter(
      Boolean,
    ) as any[];

    return {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word.text,
        style: {
          fontSize: `${params.fontSize}px`,
          color: params.textColor,
          fontWeight: fontStyle.fontWeight || 600,
          position: 'absolute',
          transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${params.arcRadius}px)`,
          willChange: 'transform, filter, opacity',
          transformOrigin: 'center',
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['600'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      effects,
    } as RenderableComponentData;
  };

  // Helper: Create arc group for a sentence (category)
  const createArcGroup = (
    caption: TranscriptionSentence,
    sentenceIndex: number,
    startAngle: number,
    endAngle: number,
  ): RenderableComponentData => {
    const words = caption.words;
    const angleStep = (endAngle - startAngle) / Math.max(words.length, 1);

    const wordComponents = words.map((word, wordIndex) => {
      const angle = startAngle + angleStep * wordIndex;
      return createWordComponent(word, wordIndex, sentenceIndex, angle, caption);
    });

    return {
      id: `arc-group-category-${sentenceIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
        },
      },
      context: {
        timing: {
          start: caption.start,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData;
  };

  // Helper: Create sub-category burst container
  const createSubBurstContainer = (
    caption: TranscriptionSentence,
  ): RenderableComponentData | null => {
    if (!params.enableSubBurst) return null;

    const subWords = caption.metadata?.focusedSubCategory
      ? caption.metadata.focusedSubCategory.split(' ')
      : [];
    if (subWords.length === 0) return null;

    const burstChildren = subWords.map((word, index) => {
      const angle = (360 / subWords.length) * index;
      const distance = 150;
      const translateX = Math.cos((angle * Math.PI) / 180) * distance;
      const translateY = Math.sin((angle * Math.PI) / 180) * distance;

      const wordId = `sub-word-${caption.id}-${index}`;

      const burstEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0,
        duration: params.burstDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: translateX, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: translateY, prog: 1 },
          { key: 'scale', val: 0.3, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      return {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word,
          style: {
            fontSize: `${params.fontSize * 0.75}px`,
            color: params.textColor,
            fontWeight: fontStyle.fontWeight || 500,
            position: 'absolute',
            willChange: 'transform, opacity',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['500'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: index * params.burstStagger,
            duration: params.burstDuration,
          },
        },
        effects: [burstEffect],
      } as RenderableComponentData;
    });

    return {
      id: `sub-category-burst-${caption.id}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: caption.start + 0.5, // Start burst 0.5s after zoom
          duration: caption.duration - 0.5,
        },
      },
      childrenData: burstChildren,
    } as RenderableComponentData;
  };

  // Helper: Create breadcrumb trail
  const createBreadcrumbs = (
    caption: TranscriptionSentence,
  ): RenderableComponentData | null => {
    if (!params.enableBreadcrumb) return null;

    const focusedCategory = caption.metadata?.focusedCategory || 'Category';
    const focusedSubCategory =
      caption.metadata?.focusedSubCategory || 'Sub-Category';

    const breadcrumbParts = [
      { text: 'Root', delay: 0 },
      { text: '/', delay: 0, isSeparator: true },
      { text: focusedCategory, delay: 0.1 },
      { text: '/', delay: 0.1, isSeparator: true },
      { text: focusedSubCategory, delay: 0.2 },
    ];

    const breadcrumbChildren = breadcrumbParts.map((part, index) => {
      const itemId = `breadcrumb-${caption.id}-${index}`;

      const slideEffect: GenericEffectData = !part.isSeparator
        ? {
            type: 'ease-out',
            start: 0,
            duration: 0.4,
            mode: 'provider',
            targetIds: [itemId],
            ranges: [
              { key: 'translateX', val: -50, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          }
        : null;

      return {
        id: itemId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: part.text,
          style: {
            fontSize: `${params.breadcrumbFontSize}px`,
            color: part.isSeparator
              ? 'rgba(255, 255, 255, 0.4)'
              : index <= 2
              ? 'rgba(255, 255, 255, 0.7)'
              : 'rgba(255, 255, 255, 1)',
            fontWeight: part.isSeparator ? 400 : index <= 2 ? 500 : 600,
            margin: part.isSeparator ? '0 8px' : '0',
          },
          font: {
            family: fontFamily,
            weights: ['400', '500', '600'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: part.delay,
            duration: caption.duration - part.delay,
          },
        },
        effects: slideEffect ? [slideEffect] : [],
      } as RenderableComponentData;
    });

    return {
      id: `breadcrumb-container-${caption.id}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'absolute top-4 left-4 flex gap-2 text-white/70 z-50 flex-row items-center',
        },
      },
      context: {
        timing: {
          start: caption.start,
          duration: caption.duration,
        },
      },
      childrenData: breadcrumbChildren,
    } as RenderableComponentData;
  };

  // Build sunburst visualization
  const numCategories = Math.min(params.captions.length, 3); // Up to 3 categories
  const anglePerCategory = 360 / numCategories;

  const arcGroups = params.captions.slice(0, numCategories).map((caption, index) => {
    const startAngle = anglePerCategory * index;
    const endAngle = startAngle + anglePerCategory;
    return createArcGroup(caption, index, startAngle, endAngle);
  });

  // Create breadcrumbs for all captions
  const breadcrumbs = params.captions
    .map((caption) => createBreadcrumbs(caption))
    .filter(Boolean) as RenderableComponentData[];

  // Create sub-category bursts
  const subBursts = params.captions
    .map((caption) => createSubBurstContainer(caption))
    .filter(Boolean) as RenderableComponentData[];

  // Sunburst visualization container
  const sunburstContainer: RenderableComponentData = {
    id: 'sunburst-visualization-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [...arcGroups, ...subBursts],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'sunburst-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [...breadcrumbs, sunburstContainer],
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
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'interactiveSunburstTypography',
  title: 'Interactive Data-Drill Sunburst Typography',
  description:
    'Nivo-inspired sunburst zoom visualization with radial arc layout. Features dramatic zoom-into-category animations with spring easing, depth-of-field blur, breadcrumb trail hierarchy, and burst-out sub-category animations. Words arranged in arc segments representing data categories with interactive drill-down simulation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'sunburst',
    'data-visualization',
    'interactive',
    'zoom',
    'radial',
    'arc-layout',
    'depth-of-field',
    'breadcrumb',
    'burst-animation',
    'category',
    'drill-down',
    'nivo',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Technology Innovation Design',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            text: 'Technology',
            start: 0,
            absoluteStart: 0,
            end: 1,
            absoluteEnd: 1,
            duration: 1,
          },
          {
            text: 'Innovation',
            start: 1,
            absoluteStart: 1,
            end: 2,
            absoluteEnd: 2,
            duration: 1,
          },
          {
            text: 'Design',
            start: 2,
            absoluteStart: 2,
            end: 3,
            absoluteEnd: 3,
            duration: 1,
          },
        ],
        metadata: {
          focusedCategory: 'Technology',
          focusedSubCategory: 'Software Hardware Cloud',
        },
      },
      {
        id: 'caption-2',
        text: 'Business Strategy Growth',
        start: 3,
        absoluteStart: 3,
        end: 6,
        absoluteEnd: 6,
        duration: 3,
        words: [
          {
            text: 'Business',
            start: 0,
            absoluteStart: 3,
            end: 1,
            absoluteEnd: 4,
            duration: 1,
          },
          {
            text: 'Strategy',
            start: 1,
            absoluteStart: 4,
            end: 2,
            absoluteEnd: 5,
            duration: 1,
          },
          {
            text: 'Growth',
            start: 2,
            absoluteStart: 5,
            end: 3,
            absoluteEnd: 6,
            duration: 1,
          },
        ],
        metadata: {
          focusedCategory: 'Business',
          focusedSubCategory: 'Marketing Sales Operations',
        },
      },
      {
        id: 'caption-3',
        text: 'Science Research Discovery',
        start: 6,
        absoluteStart: 6,
        end: 9,
        absoluteEnd: 9,
        duration: 3,
        words: [
          {
            text: 'Science',
            start: 0,
            absoluteStart: 6,
            end: 1,
            absoluteEnd: 7,
            duration: 1,
          },
          {
            text: 'Research',
            start: 1,
            absoluteStart: 7,
            end: 2,
            absoluteEnd: 8,
            duration: 1,
          },
          {
            text: 'Discovery',
            start: 2,
            absoluteStart: 8,
            end: 3,
            absoluteEnd: 9,
            duration: 1,
          },
        ],
        metadata: {
          focusedCategory: 'Science',
          focusedSubCategory: 'Physics Chemistry Biology',
        },
      },
    ],
    font: 'Inter:600',
    fontSize: 24,
    textColor: '#ffffff',
    backgroundColor: '#000000',
    arcRadius: 200,
    zoomIntensity: 3,
    zoomDuration: 0.6,
    blurIntensity: 8,
    burstDuration: 0.4,
    burstStagger: 0.05,
    breadcrumbFontSize: 16,
    enableBreadcrumb: true,
    enableDepthOfField: true,
    enableSubBurst: true,
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const interactiveSunburstTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
