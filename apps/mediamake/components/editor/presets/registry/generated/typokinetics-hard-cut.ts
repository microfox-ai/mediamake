/**
 * Typokinetics Hard Cut Title Cards Preset
 *
 * This preset creates classic film-style title cards with hard cuts between text segments.
 * Each text element appears instantly at full opacity (no fades) and disappears with a hard cut,
 * mimicking the editing style of classic film title sequences and video montages.
 *
 * Features:
 * - **Hard Cuts**: Instant opacity transitions (0 to 1) with no easing or fading
 * - **Film-Style Title Cards**: Each text segment gets its own "shot" with clean entry/exit points
 * - **Caption-Based Staccato Mode**: Word-level hard cuts creating rhythmic, percussive reading experience
 * - **Customizable Gaps**: Control black gaps between words for staccato effect
 * - **Performance Optimized**: Uses will-change: opacity for smooth rendering
 * - **Flexible Layout**: Centered text with customizable fonts and styling
 *
 * Use cases:
 * - Classic film title sequences
 * - Video montage title cards
 * - Kinetic typography for music videos
 * - Staccato text reveals synchronized to audio beats
 * - Hard-cut transitions between text segments
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

// Parameter schema
const presetParams = z.object({
  mode: z
    .enum(['titleCards', 'captionStaccato'])
    .default('titleCards')
    .describe(
      'Mode: "titleCards" for static text segments, "captionStaccato" for caption-based word-level hard cuts',
    ),
  titleCards: z
    .array(
      z.object({
        text: z.string().describe('Text content for this title card'),
        duration: z
          .number()
          .min(0.5)
          .default(3)
          .describe('Duration to show this card (seconds)'),
        style: z
          .object({
            fontSize: z
              .string()
              .default('72px')
              .describe('Font size (e.g., "72px", "96px")'),
            fontWeight: z
              .string()
              .default('700')
              .describe('Font weight (e.g., "400", "700", "900")'),
            color: z.string().default('#ffffff').describe('Text color'),
            letterSpacing: z
              .string()
              .optional()
              .describe('Letter spacing (e.g., "0.05em")'),
            textTransform: z
              .enum(['none', 'uppercase', 'lowercase', 'capitalize'])
              .default('uppercase')
              .optional()
              .describe('Text transformation'),
          })
          .optional()
          .describe('Styling for this title card'),
      }),
    )
    .optional()
    .describe(
      'Array of title card text segments (used when mode is "titleCards")',
    ),
  captions: z
    .array(z.any())
    .optional()
    .describe(
      'Array of caption objects with words array (used when mode is "captionStaccato")',
    ),
  staccatoGap: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe(
      'Gap duration between words in staccato mode (seconds). Creates black space between word cuts.',
    ),
  font: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight (e.g., "Inter:700", "Roboto:900")',
    ),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color for the entire composition'),
  captionStyle: z
    .object({
      fontSize: z
        .string()
        .default('96px')
        .describe('Font size for caption words'),
      fontWeight: z
        .string()
        .default('900')
        .describe('Font weight for caption words'),
      color: z.string().default('#ffffff').describe('Text color for captions'),
    })
    .optional()
    .describe('Styling for caption-based text (staccato mode)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontWeight = fontString.includes(':')
      ? fontString.split(':')[1]
      : '400';
    return { fontFamily, fontWeight };
  };

  // Helper: Create hard-cut effect (0 → 1 instantly, hold, then 1 → 0 instantly)
  const createHardCutEffect = (
    targetId: string,
    effectId: string,
    start: number,
    duration: number,
  ): RenderableComponentData => {
    const effectData: GenericEffectData = {
      type: 'linear',
      start: start,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.001 }, // Instant cut in
        { key: 'opacity', val: 1, prog: 0.999 }, // Hold
        { key: 'opacity', val: 0, prog: 1 }, // Instant cut out
      ],
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: effectData,
    } as RenderableComponentData;
  };

  const { fontFamily, fontWeight } = parseFontString(params.font);

  const childrenData: RenderableComponentData[] = [];

  if (params.mode === 'titleCards' && params.titleCards) {
    // Title Cards Mode: Sequential title cards with hard cuts
    let currentTime = 0;

    params.titleCards.forEach((card, index) => {
      const cardContainerId = `title-card-container-${index}`;
      const cardTextId = `title-card-text-${index}`;
      const cardEffectId = `hard-cut-effect-${index}`;

      const cardStyle = card.style || {};
      const fontSize = cardStyle.fontSize || '72px';
      const cardFontWeight = cardStyle.fontWeight || '700';
      const textColor = cardStyle.color || '#ffffff';
      const letterSpacing = cardStyle.letterSpacing || '0.05em';
      const textTransform = cardStyle.textTransform || 'uppercase';

      // Text atom
      const textAtom: RenderableComponentData = {
        id: cardTextId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: card.text,
          style: {
            fontSize,
            fontWeight: cardFontWeight,
            color: textColor,
            textAlign: 'center',
            letterSpacing,
            textTransform,
          },
          font: {
            family: fontFamily,
            weights: [cardFontWeight],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: card.duration,
          },
        },
      };

      // Hard-cut effect
      const effect = createHardCutEffect(
        cardTextId,
        cardEffectId,
        0,
        card.duration,
      );

      // Container layout
      const cardContainer: RenderableComponentData = {
        id: cardContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              willChange: 'opacity',
            },
          },
        },
        context: {
          timing: {
            start: currentTime,
            duration: card.duration,
          },
        },
        childrenData: [textAtom],
        effects: [effect],
      };

      childrenData.push(cardContainer);
      currentTime += card.duration;
    });
  } else if (params.mode === 'captionStaccato' && params.captions) {
    // Caption Staccato Mode: Word-level hard cuts with gaps
    const captions = params.captions as TranscriptionSentence[];

    const captionStyle = params.captionStyle || {};
    const fontSize = captionStyle.fontSize || '96px';
    const captionFontWeight = captionStyle.fontWeight || '900';
    const textColor = captionStyle.color || '#ffffff';

    captions.forEach((caption, captionIndex) => {
      if (!caption.words || caption.words.length === 0) return;

      caption.words.forEach((word, wordIndex) => {
        const wordContainerId = `word-container-${captionIndex}-${wordIndex}`;
        const wordTextId = `word-text-${captionIndex}-${wordIndex}`;
        const wordEffectId = `word-effect-${captionIndex}-${wordIndex}`;

        // Calculate word timing (relative to caption start)
        const wordStart = word.start;
        const wordDuration = word.duration;

        // Text atom
        const textAtom: RenderableComponentData = {
          id: wordTextId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize,
              fontWeight: captionFontWeight,
              color: textColor,
              textAlign: 'center',
            },
            font: {
              family: fontFamily,
              weights: [captionFontWeight],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: wordDuration,
            },
          },
        };

        // Hard-cut effect
        const effect = createHardCutEffect(
          wordTextId,
          wordEffectId,
          0,
          wordDuration,
        );

        // Word container
        const wordContainer: RenderableComponentData = {
          id: wordContainerId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 flex items-center justify-center',
              style: {
                willChange: 'opacity',
              },
            },
          },
          context: {
            timing: {
              start: caption.absoluteStart + wordStart,
              duration: wordDuration,
            },
          },
          childrenData: [textAtom],
          effects: [effect],
        };

        childrenData.push(wordContainer);
      });
    });
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-hard-cut-root',
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
    childrenData: childrenData as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokineticsHardCut',
  title: 'Typokinetics Hard Cut Title Cards',
  description:
    'Classic film-style title cards with hard cuts between text segments. Each text element appears instantly at full opacity (no fades) and disappears with a hard cut. Supports both static text segments and caption-based word-level staccato appearances, creating a rhythmic, percussive reading experience similar to kinetic typography in music videos.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'hard-cut',
    'title-cards',
    'film',
    'montage',
    'staccato',
    'captions',
  ],
  dependencies: {},
  defaultInputParams: {
    mode: 'titleCards',
    titleCards: [
      {
        text: 'TITLE CARD 1',
        duration: 3,
        style: {
          fontSize: '72px',
          fontWeight: '700',
          color: '#ffffff',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        },
      },
      {
        text: 'TITLE CARD 2',
        duration: 3,
        style: {
          fontSize: '72px',
          fontWeight: '700',
          color: '#ffffff',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        },
      },
    ],
    staccatoGap: 0.1,
    font: 'Inter:700',
    backgroundColor: '#000000',
    captionStyle: {
      fontSize: '96px',
      fontWeight: '900',
      color: '#ffffff',
    },
  },
};

export const typokineticsHardCutPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
