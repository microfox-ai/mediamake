/**
 * Typewriter Reverse Effect Preset
 *
 * This preset creates a typewriter backspace deletion effect where text disappears
 * character by character from right to left. Each character shrinks and fades before
 * removal, mimicking the mechanical rhythm of old typewriters with modern animation flair.
 *
 * Features:
 * - **Right-to-Left Deletion**: Characters disappear in reverse order (backspace effect)
 * - **Two-Phase Animation**: Quick shrink (70%) followed by collapse to 0% with fade
 * - **Word-Level Grouping**: Uses caption word data for natural deletion rhythm
 * - **Mechanical Timing**: Linear progression for consistent, rhythmic feel
 * - **Clean Masking**: Uses clip-path for sharp edge rendering
 * - **Terminal-Style**: Feels like deletion animation in code editors
 *
 * Use cases:
 * - Creating backspace/deletion animations
 * - Text reveal effects in reverse
 * - Terminal or typewriter-themed transitions
 * - Dynamic text removal for storytelling
 * - Code editor simulation effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

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
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .describe('Array of caption objects with word-level timing data'),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),

  font: z
    .string()
    .default('Inter:600')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:700:italic", "Inter:600")',
    ),

  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of text on screen'),

  horizontalAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .optional()
    .describe('Horizontal alignment of text'),

  backgroundColor: z
    .string()
    .optional()
    .describe(
      'Optional background color for text container (e.g., "rgba(0,0,0,0.5)")',
    ),

  padding: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .optional()
    .describe('Padding around text in pixels'),

  wordSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(16)
    .optional()
    .describe('Spacing between words in pixels'),

  shrinkPhaseRatio: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .optional()
    .describe(
      'Ratio of word duration used for Phase 1 (shrink to 70%) - default 0.2 (20%)',
    ),

  shrinkTargetScale: z
    .number()
    .min(0.5)
    .max(0.9)
    .default(0.7)
    .optional()
    .describe('Target scale for Phase 1 shrink (0.7 = 70% size)'),
});

// ============================================================================
// PRESET EXECUTION FUNCTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

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

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font ?? 'Inter:600');

  // Position mapping
  const positionMap: Record<string, string> = {
    top: 'items-start pt-16',
    center: 'items-center',
    bottom: 'items-end pb-16',
  };

  const alignmentMap: Record<string, string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  const positionClass = positionMap[params.position ?? 'center'];
  const alignmentClass = alignmentMap[params.horizontalAlign ?? 'center'];

  // Build captions with reversed words for each caption
  const captionContainers: RenderableComponentData[] = [];

  params.captions.forEach((caption: TranscriptionSentence, captionIndex) => {
    // Reverse word order for right-to-left deletion
    const wordsReversed = [...caption.words].reverse();

    const wordComponents: RenderableComponentData[] = [];

    wordsReversed.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const wordWrapperId = `word-wrapper-${captionIndex}-${wordIndex}`;

      // Calculate effect durations
      const phase1Duration = word.duration * (params.shrinkPhaseRatio ?? 0.2);
      const phase2Duration = word.duration * (1 - (params.shrinkPhaseRatio ?? 0.2));

      // Phase 1: Shrink from 1 to 0.7 (20% of word time)
      const phase1Effect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: phase1Duration,
        mode: 'provider',
        targetIds: [wordWrapperId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: params.shrinkTargetScale ?? 0.7, prog: 1 },
        ],
      };

      // Phase 2: Collapse from 0.7 to 0 with fade (80% of word time)
      const phase2Effect: GenericEffectData = {
        type: 'linear',
        start: phase1Duration,
        duration: phase2Duration,
        mode: 'provider',
        targetIds: [wordWrapperId],
        ranges: [
          { key: 'scale', val: params.shrinkTargetScale ?? 0.7, prog: 0 },
          { key: 'scale', val: 0, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'clipPath', val: 'inset(0 0 0 0%)', prog: 0 },
          { key: 'clipPath', val: 'inset(0 0 0 100%)', prog: 1 },
        ],
      };

      // Word wrapper container with effects
      const wordWrapper: RenderableComponentData = {
        id: wordWrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block',
            style: {
              textOverflow: 'clip',
              whiteSpace: 'nowrap',
            },
          },
        },
        context: {
          timing: {
            start: word.start,
            duration: word.duration,
          },
        },
        effects: [
          {
            id: `phase1-${wordId}`,
            componentId: 'generic',
            data: phase1Effect,
          },
          {
            id: `phase2-${wordId}`,
            componentId: 'generic',
            data: phase2Effect,
          },
        ],
        childrenData: [
          {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text + ' ',
              style: {
                fontSize: params.fontSize ?? 48,
                color: params.textColor ?? '#FFFFFF',
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
                start: 0,
                duration: word.duration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;

      wordComponents.push(wordWrapper);
    });

    // Caption container
    const captionContainer: RenderableComponentData = {
      id: `caption-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex ${positionClass} ${alignmentClass} px-8`,
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
          id: `caption-text-wrapper-${captionIndex}`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-row flex-wrap',
              style: {
                gap: `${params.wordSpacing ?? 16}px`,
                padding: `${params.padding ?? 20}px`,
                ...(params.backgroundColor
                  ? {
                      backgroundColor: params.backgroundColor,
                      borderRadius: '12px',
                    }
                  : {}),
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: wordComponents,
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;

    captionContainers.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-reverse-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          params.captions.length > 0
            ? params.captions[params.captions.length - 1].absoluteEnd
            : 10,
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
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'typewriterReverseEffect',
  title: 'Typewriter Reverse Effect',
  description:
    'Text disappears character by character from right to left with shrink and fade animations, mimicking backspace deletion in old typewriters with modern flair. Uses word-level caption data for natural groupings and mechanical rhythm.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'captions',
    'typewriter',
    'reverse',
    'deletion',
    'backspace',
    'animation',
    'kinetic',
    'terminal',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello World',
        start: 0,
        end: 2,
        duration: 2,
        absoluteStart: 0,
        absoluteEnd: 2,
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            end: 1,
            duration: 1,
            absoluteStart: 0,
            absoluteEnd: 1,
          },
          {
            id: 'word-2',
            text: 'World',
            start: 1,
            end: 2,
            duration: 1,
            absoluteStart: 1,
            absoluteEnd: 2,
          },
        ],
      },
    ],
    fontSize: 48,
    textColor: '#FFFFFF',
    font: 'Inter:600',
    position: 'center',
    horizontalAlign: 'center',
    wordSpacing: 16,
    padding: 20,
    shrinkPhaseRatio: 0.2,
    shrinkTargetScale: 0.7,
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const typewriterReverseEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
