/**
 * Swiss Typography Grid Preset
 *
 * A minimalist Swiss-design inspired typography preset featuring grid-based layout with subtle,
 * precise word scaling (1.0 to 1.08) and letter-spacing animations. Implements fine-tuned visual
 * hierarchy through controlled scale and tracking adjustments that feel like adjusting type weight
 * in a design program.
 *
 * Features:
 * - **Grid-Based Layout**: Words maintain strict geometric alignment within grid cells
 * - **Subtle Scale Animation**: Words grow from 1.0 to 1.08 during emphasis with linear easing
 * - **Letter-Spacing Animation**: Tracking expands from 0 to 0.05em during emphasis
 * - **Opacity Depth**: Non-emphasized words fade to 0.7 opacity for visual hierarchy
 * - **Transform-Origin Center**: Maintains grid alignment during scaling
 * - **Smooth Transitions**: 500ms linear transitions for precision feel
 * - **Swiss Design Principles**: Clean, geometric, purposeful animations
 *
 * Use cases:
 * - Creating minimalist caption overlays with subtle emphasis
 * - Building Swiss-style typography animations for modern content
 * - Displaying text with controlled, precise visual hierarchy
 * - Adding professional typographic effects with minimal distraction
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

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
          }),
        ),
      }),
    )
    .describe('Array of caption sentences with word-level timing data'),

  font: z
    .string()
    .optional()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:400", "Helvetica:700")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(120)
    .default(32)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#000000')
    .describe('Text color in hex format (default: black)'),

  gridGap: z
    .number()
    .min(0)
    .max(50)
    .default(12)
    .describe('Gap between grid cells in pixels'),

  emphasisScale: z
    .number()
    .min(1.0)
    .max(1.2)
    .default(1.08)
    .describe('Scale factor for emphasized words (1.0 to 1.2)'),

  emphasisLetterSpacing: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.05)
    .describe('Letter spacing for emphasized words in em units'),

  nonEmphasisOpacity: z
    .number()
    .min(0.3)
    .max(1.0)
    .default(0.7)
    .describe('Opacity for non-emphasized words (0.3 to 1.0)'),

  transitionDuration: z
    .number()
    .min(100)
    .max(1000)
    .default(500)
    .describe('Transition duration in milliseconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { captions, font, fontSize, textColor, gridGap, emphasisScale, emphasisLetterSpacing, nonEmphasisOpacity, transitionDuration } = params;

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

  const { fontFamily, fontStyle } = parseFontString(font);

  // Build captions structure
  const captionContainers: RenderableComponentData[] = [];

  for (const caption of captions) {
    const captionId = `swiss-grid-caption-${caption.id}`;

    // Build word components for this caption
    const wordComponents: RenderableComponentData[] = caption.words.map(
      (word, wordIndex) => {
        const wordId = `${captionId}-word-${wordIndex}`;

        // Create effects for this word
        const effects: any[] = [];

        // Scale effect (1.0 to emphasisScale during word timing)
        const scaleEffect = {
          id: `${wordId}-scale`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: word.start,
            duration: word.duration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'scale', val: 1.0, prog: 0 },
              { key: 'scale', val: emphasisScale, prog: 0.5 },
              { key: 'scale', val: 1.0, prog: 1 },
            ],
          },
        };
        effects.push(scaleEffect);

        // Letter-spacing effect (0 to emphasisLetterSpacing during word timing)
        const letterSpacingEffect = {
          id: `${wordId}-letterSpacing`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: word.start,
            duration: word.duration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'letterSpacing', val: '0em', prog: 0 },
              { key: 'letterSpacing', val: `${emphasisLetterSpacing}em`, prog: 0.5 },
              { key: 'letterSpacing', val: '0em', prog: 1 },
            ],
          },
        };
        effects.push(letterSpacingEffect);

        // Opacity effect (1.0 during word, nonEmphasisOpacity outside)
        const opacityEffect = {
          id: `${wordId}-opacity`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: caption.duration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'opacity', val: nonEmphasisOpacity, prog: 0 },
              {
                key: 'opacity',
                val: nonEmphasisOpacity,
                prog: word.start / caption.duration,
              },
              {
                key: 'opacity',
                val: 1.0,
                prog: (word.start + word.duration * 0.1) / caption.duration,
              },
              {
                key: 'opacity',
                val: 1.0,
                prog: (word.end - word.duration * 0.1) / caption.duration,
              },
              {
                key: 'opacity',
                val: nonEmphasisOpacity,
                prog: word.end / caption.duration,
              },
              { key: 'opacity', val: nonEmphasisOpacity, prog: 1 },
            ],
          },
        };
        effects.push(opacityEffect);

        // Word component (TextAtom)
        const wordComponent: RenderableComponentData = {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: `${fontSize}px`,
              color: textColor,
              ...fontStyle,
              transformOrigin: 'center',
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
              duration: caption.duration,
            },
          },
          effects,
        };

        return wordComponent;
      },
    );

    // Grid container for this caption
    const gridContainer: RenderableComponentData = {
      id: `${captionId}-grid`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'grid items-center justify-items-center',
          style: {
            gridTemplateColumns: 'repeat(auto-fit, minmax(80px, max-content))',
            gap: `${gridGap}px`,
            maxWidth: '90%',
          },
        },
        repeatChildrenProps: {
          className: 'transform-gpu will-change-transform',
          style: {
            transformOrigin: 'center',
            transition: `all ${transitionDuration}ms linear`,
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
    };

    // Root container for this caption (centered on screen)
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center font-sans tracking-tight',
          style: {
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [gridContainer],
    };

    captionContainers.push(captionContainer);
  }

  return {
    output: {
      childrenData: captionContainers as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'swiss-typography-grid',
  title: 'Swiss Typography Grid',
  description:
    'A minimalist Swiss-design inspired typography preset featuring grid-based layout with subtle, precise word scaling (1.0 to 1.08) and letter-spacing animations. Implements fine-tuned visual hierarchy through controlled scale and tracking adjustments that feel like adjusting type weight in a design program. Words maintain strict geometric alignment within their grid cells while growing/shrinking with smooth, purposeful transitions. Includes subtle opacity shifts for depth.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'grid',
    'swiss-design',
    'minimal',
    'captions',
    'subtitles',
    'scale',
    'letter-spacing',
    'geometric',
    'precision',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Swiss Design Typography',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            id: 'word-1',
            text: 'Swiss',
            start: 0,
            end: 0.8,
            duration: 0.8,
            absoluteStart: 0,
            absoluteEnd: 0.8,
          },
          {
            id: 'word-2',
            text: 'Design',
            start: 0.9,
            end: 1.8,
            duration: 0.9,
            absoluteStart: 0.9,
            absoluteEnd: 1.8,
          },
          {
            id: 'word-3',
            text: 'Typography',
            start: 1.9,
            end: 3,
            duration: 1.1,
            absoluteStart: 1.9,
            absoluteEnd: 3,
          },
        ],
      },
    ],
    font: 'Inter',
    fontSize: 32,
    textColor: '#000000',
    gridGap: 12,
    emphasisScale: 1.08,
    emphasisLetterSpacing: 0.05,
    nonEmphasisOpacity: 0.7,
    transitionDuration: 500,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const swissTypographyGridPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
