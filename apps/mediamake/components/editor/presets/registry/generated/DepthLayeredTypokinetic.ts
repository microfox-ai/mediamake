/**
 * Depth-Layered Typokinetic Preset
 *
 * This preset creates a parallax-like text reveal similar to 2.5D animation in After Effects.
 * Words scale from 90% to 100% with simulated z-depth based on word importance/impact.
 *
 * Features:
 * - **Z-Depth Layering**: Multiple BaseLayout layers with z-index positioning based on word importance
 * - **Conditional Scaling**: High-impact words scale [0.85, 1.0], normal words [0.92, 1.0]
 * - **Depth-of-Field Blur**: Words blur(1.5px) → blur(0px) as they scale up
 * - **Color Grading**: Distant words desaturated (saturate(0.7)) → vibrant (saturate(1))
 * - **Parallax Animation**: High-impact words animate first, others follow with delay
 * - **Performance Optimization**: Uses CSS contain: layout for layer optimization
 *
 * Use cases:
 * - Creating 2.5D text reveals with depth simulation
 * - Building parallax-like typography effects
 * - Adding dynamic depth-based word animations
 * - Creating video-editor-style layered text compositions
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
            keyword: z.string().optional(),
            impact: z.number().optional(),
            splitParts: z.array(z.string()).optional(),
          })
          .passthrough()
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color for all words'),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),

  // Scale range configuration
  highImpactScaleStart: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.85)
    .describe('Starting scale for high-impact words (0.85 default)'),

  normalImpactScaleStart: z
    .number()
    .min(0.7)
    .max(1)
    .default(0.92)
    .describe('Starting scale for normal-impact words (0.92 default)'),

  // Blur configuration
  blurStart: z
    .number()
    .min(0)
    .max(10)
    .default(1.5)
    .describe('Starting blur amount in pixels (depth-of-field effect)'),

  // Color grading configuration
  desaturationLevel: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Saturation level for distant words (0.7 = 70% saturated)'),

  // Timing configuration
  animationDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.6)
    .describe('Duration of scale/blur/color animation in seconds'),

  normalWordDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Delay for normal/low-impact words relative to high-impact'),

  // Impact threshold
  impactThreshold: z
    .number()
    .min(0)
    .max(2)
    .default(1.2)
    .describe(
      'Impact threshold to classify as high-impact (metadata.impact >= threshold)',
    ),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { captions } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
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

  // Helper: Determine impact level based on metadata
  const getImpactLevel = (
    caption: TranscriptionSentence,
  ): 'high' | 'normal' | 'low' => {
    const impact = caption.metadata?.impact ?? 1.0;
    if (impact >= params.impactThreshold) return 'high';
    if (impact >= 0.8) return 'normal';
    return 'low';
  };

  // Helper: Create word component with depth-based effects
  const createWordComponent = (
    word: any,
    wordIndex: number,
    caption: TranscriptionSentence,
    impactLevel: 'high' | 'normal' | 'low',
  ): RenderableComponentData => {
    const wordId = `word-${caption.id}-${wordIndex}`;

    // Determine animation parameters based on impact level
    const scaleStart =
      impactLevel === 'high'
        ? params.highImpactScaleStart
        : params.normalImpactScaleStart;
    const animationDelay =
      impactLevel === 'high' ? 0 : params.normalWordDelay;

    // Create scale + blur + saturation effect
    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: word.start + animationDelay,
      duration: params.animationDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Scale animation
        { key: 'scale', val: scaleStart, prog: 0 },
        { key: 'scale', val: 1.0, prog: 1 },
        // Blur animation (depth-of-field)
        { key: 'filter', val: `blur(${params.blurStart}px)`, prog: 0 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
        // Saturation animation (color grading)
        {
          key: 'filter',
          val: `saturate(${params.desaturationLevel})`,
          prog: 0,
        },
        { key: 'filter', val: 'saturate(1)', prog: 1 },
      ],
    };

    const effect = {
      id: `depth-effect-${wordId}`,
      componentId: 'generic',
      data: effectData,
    };

    // Create TextAtom
    const wordComponent: RenderableComponentData = {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word.text,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          marginRight: '0.3em',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : {}),
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      effects: [effect],
    };

    return wordComponent;
  };

  // Process captions and organize by impact level
  const captionsByImpact: {
    high: TranscriptionSentence[];
    normal: TranscriptionSentence[];
    low: TranscriptionSentence[];
  } = {
    high: [],
    normal: [],
    low: [],
  };

  captions.forEach((caption) => {
    const impactLevel = getImpactLevel(caption);
    captionsByImpact[impactLevel].push(caption);
  });

  // Create word components for each impact level
  const createLayerWords = (
    captionsInLayer: TranscriptionSentence[],
    impactLevel: 'high' | 'normal' | 'low',
  ): RenderableComponentData[] => {
    const words: RenderableComponentData[] = [];

    captionsInLayer.forEach((caption) => {
      caption.words.forEach((word, wordIndex) => {
        const wordComponent = createWordComponent(
          word,
          wordIndex,
          caption,
          impactLevel,
        );
        words.push(wordComponent);
      });
    });

    return words;
  };

  const highImpactWords = createLayerWords(captionsByImpact.high, 'high');
  const normalImpactWords = createLayerWords(captionsByImpact.normal, 'normal');
  const lowImpactWords = createLayerWords(captionsByImpact.low, 'low');

  // Create caption containers for each impact level
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      const impactLevel = getImpactLevel(caption);

      // Determine z-index based on impact level
      const zIndex = impactLevel === 'high' ? 30 : impactLevel === 'normal' ? 20 : 10;

      // Create words for this caption
      const captionWords = caption.words.map((word, wordIndex) =>
        createWordComponent(word, wordIndex, caption, impactLevel),
      );

      return {
        id: `caption-layer-${caption.id}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              zIndex,
              contain: 'layout',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [
          {
            id: `caption-word-group-${caption.id}`,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'flex flex-wrap items-center justify-center gap-2',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            childrenData: captionWords,
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'depth-layered-typokinetic-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          contain: 'layout',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'DepthLayeredTypokinetic',
  title: 'Depth-Layered Typokinetic Text',
  description:
    'Ultra-dynamic depth-layered typokinetic preset where words scale from 90% to 100% with simulated z-depth. Important words (keywords/high impact) start at 85% scale and animate to 100%, while supporting words go from 92% to 100%. Features depth-of-field blur effect where words outside the "focus range" have slight blur that sharpens as they scale up. Layer includes subtle color grading - distant words slightly desaturated, becoming vibrant at full scale. Creates a parallax-like text reveal similar to 2.5D animation in After Effects using multiple BaseLayout layers with z-index positioning based on word importance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'captions',
    'depth',
    'parallax',
    '2.5D',
    'z-depth',
    'blur',
    'color-grading',
    'typokinetic',
    'scale',
    'layered',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Inter:700',
    textColor: '#FFFFFF',
    fontSize: 48,
    highImpactScaleStart: 0.85,
    normalImpactScaleStart: 0.92,
    blurStart: 1.5,
    desaturationLevel: 0.7,
    animationDuration: 0.6,
    normalWordDelay: 0.2,
    impactThreshold: 1.2,
  },
};

// --- Export Preset ---
export const DepthLayeredTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
