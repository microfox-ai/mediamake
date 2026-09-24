/**
 * Word-by-Word Narrator Emphasis Preset
 *
 * This preset creates a sophisticated word-by-word emphasis effect where each word scales,
 * brightens, and glows individually as if being spoken by a narrator. Perfect for TED talk
 * style presentations where key words pulse with importance.
 *
 * Features:
 * - Three-phase animation: rest → emphasis → settled
 * - Buttery smooth transitions with bell curve easing
 * - Color progression from gray → white → warm off-white
 * - Impact-based intensity scaling for high-impact words
 * - Subtle glow effect at peak emphasis
 * - Word-level timing synchronization with caption data
 *
 * Use Cases:
 * - TED talk style presentations
 * - Educational content with emphasis
 * - Keynote speeches with word highlighting
 * - Narrative storytelling with visual emphasis
 * - Professional presentation videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// ============================================================
// PRESET PARAMETERS SCHEMA
// ============================================================

const presetParams = z.object({
  captionData: z
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
            end: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing data'),

  fontSize: z
    .number()
    .min(12)
    .max(120)
    .default(48)
    .optional()
    .describe('Font size in pixels for the text'),

  font: z
    .string()
    .default('Inter:600')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600", "Roboto:700:italic")',
    ),

  wordGap: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .optional()
    .describe('Gap between words in pixels'),

  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(32)
    .optional()
    .describe('Padding around the text container in pixels'),

  globalImpact: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .optional()
    .describe(
      'Global impact multiplier for emphasis intensity (0.1-3.0, default 1.0)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================
// PRESET EXECUTION FUNCTION
// ============================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captionData,
    fontSize = 48,
    font = 'Inter:600',
    wordGap = 8,
    containerPadding = 32,
    globalImpact = 1,
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: Record<string, any> = {};

    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Create word components for all captions
  const captionContainers: RenderableComponentData[] = [];

  captionData.forEach((caption, captionIndex) => {
    const wordComponents: RenderableComponentData[] = [];

    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;

      // Calculate impact for this word
      const wordImpact = caption.metadata?.impact ?? globalImpact;
      const useHighImpact = wordImpact > 0.7;

      // Calculate effect timings (relative to caption start)
      const riseStart = word.start;
      const riseDuration = 0.4;
      const holdStart = riseStart + riseDuration;
      const holdDuration = 0.2;
      const settleStart = holdStart + holdDuration;
      const settleDuration = 0.4;

      // Create three-phase effects
      const riseEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: riseStart,
        duration: riseDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Scale
          { key: 'scale', val: 0.9, prog: 0 },
          { key: 'scale', val: useHighImpact ? 1.15 : 1.1, prog: 1 },
          // Opacity
          { key: 'opacity', val: 0.7, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          // Color
          { key: 'color', val: 'rgb(200, 200, 200)', prog: 0 },
          { key: 'color', val: 'rgb(255, 255, 255)', prog: 1 },
          // Glow
          {
            key: 'filter',
            val: 'drop-shadow(0 0 0px rgba(255,255,255,0))',
            prog: 0,
          },
          {
            key: 'filter',
            val: useHighImpact
              ? 'drop-shadow(0 0 12px rgba(255,255,255,0.6))'
              : 'drop-shadow(0 0 8px rgba(255,255,255,0.5))',
            prog: 1,
          },
        ],
      };

      const holdEffect: GenericEffectData = {
        type: 'linear',
        start: holdStart,
        duration: holdDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Hold scale
          { key: 'scale', val: useHighImpact ? 1.15 : 1.1, prog: 0 },
          { key: 'scale', val: useHighImpact ? 1.15 : 1.1, prog: 1 },
          // Hold opacity
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          // Hold color
          { key: 'color', val: 'rgb(255, 255, 255)', prog: 0 },
          { key: 'color', val: 'rgb(255, 255, 255)', prog: 1 },
          // Hold glow
          {
            key: 'filter',
            val: useHighImpact
              ? 'drop-shadow(0 0 12px rgba(255,255,255,0.6))'
              : 'drop-shadow(0 0 8px rgba(255,255,255,0.5))',
            prog: 0,
          },
          {
            key: 'filter',
            val: useHighImpact
              ? 'drop-shadow(0 0 12px rgba(255,255,255,0.6))'
              : 'drop-shadow(0 0 8px rgba(255,255,255,0.5))',
            prog: 1,
          },
        ],
      };

      const settleEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: settleStart,
        duration: settleDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Scale down to settled
          { key: 'scale', val: useHighImpact ? 1.15 : 1.1, prog: 0 },
          { key: 'scale', val: 1.0, prog: 1 },
          // Opacity to settled
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.85, prog: 1 },
          // Color to warm off-white
          { key: 'color', val: 'rgb(255, 255, 255)', prog: 0 },
          { key: 'color', val: 'rgb(255, 252, 248)', prog: 1 },
          // Glow fade out
          {
            key: 'filter',
            val: useHighImpact
              ? 'drop-shadow(0 0 12px rgba(255,255,255,0.6))'
              : 'drop-shadow(0 0 8px rgba(255,255,255,0.5))',
            prog: 0,
          },
          {
            key: 'filter',
            val: 'drop-shadow(0 0 0px rgba(255,255,255,0))',
            prog: 1,
          },
        ],
      };

      // Create word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'transition-all duration-400 ease-in-out',
          style: {
            color: 'rgb(200, 200, 200)',
            fontSize: `${fontSize}px`,
            fontWeight: 600,
            transform: 'scale(0.9)',
            opacity: 0.7,
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['600'],
          },
        },
        context: {
          timing: {
            start: 0, // Relative to caption container
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `rise-${wordId}`,
            componentId: 'generic',
            data: riseEffect,
          },
          {
            id: `hold-${wordId}`,
            componentId: 'generic',
            data: holdEffect,
          },
          {
            id: `settle-${wordId}`,
            componentId: 'generic',
            data: settleEffect,
          },
        ],
      };

      wordComponents.push(wordComponent);
    });

    // Create caption container
    const captionContainer: RenderableComponentData = {
      id: `caption-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `flex flex-wrap items-center justify-center gap-${wordGap} px-${containerPadding}`,
          style: {
            gap: `${wordGap}px`,
            padding: `0 ${containerPadding}px`,
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
    };

    captionContainers.push(captionContainer);
  });

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'word-emphasis-narrator-root',
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
        fitDurationTo: 'captionData',
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

// ============================================================
// PRESET METADATA
// ============================================================

const presetMetadata: PresetMetadata = {
  id: 'word-emphasis-narrator',
  title: 'Word-by-Word Narrator Emphasis',
  description:
    'Sophisticated word-by-word emphasis preset where each word scales and brightens individually as if being spoken by a narrator. Features buttery smooth three-phase transitions (rest → emphasis → settled) with color shifts from gray through white to warm off-white, plus optional impact-based intensity scaling. Perfect for TED talk style presentations where key words pulse with importance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'text',
    'word-emphasis',
    'narrator',
    'ted-talk',
    'emphasis',
    'smooth-transitions',
    'scale',
    'glow',
    'impact',
  ],
  defaultInputParams: {
    captionData: [
      {
        id: 'caption-1',
        text: 'Welcome to this amazing presentation',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Welcome',
            start: 0,
            end: 0.5,
            absoluteStart: 0,
            absoluteEnd: 0.5,
            duration: 0.5,
            confidence: 0.95,
          },
          {
            id: 'word-2',
            text: 'to',
            start: 0.5,
            end: 0.7,
            absoluteStart: 0.5,
            absoluteEnd: 0.7,
            duration: 0.2,
            confidence: 0.98,
          },
          {
            id: 'word-3',
            text: 'this',
            start: 0.7,
            end: 1,
            absoluteStart: 0.7,
            absoluteEnd: 1,
            duration: 0.3,
            confidence: 0.96,
          },
          {
            id: 'word-4',
            text: 'amazing',
            start: 1,
            end: 1.7,
            absoluteStart: 1,
            absoluteEnd: 1.7,
            duration: 0.7,
            confidence: 0.94,
          },
          {
            id: 'word-5',
            text: 'presentation',
            start: 1.7,
            end: 3,
            absoluteStart: 1.7,
            absoluteEnd: 3,
            duration: 1.3,
            confidence: 0.93,
          },
        ],
        metadata: {
          impact: 1.2,
        },
      },
    ],
    fontSize: 48,
    font: 'Inter:600',
    wordGap: 8,
    containerPadding: 32,
    globalImpact: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================
// PRESET EXPORT
// ============================================================

export const wordEmphasisNarratorPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
