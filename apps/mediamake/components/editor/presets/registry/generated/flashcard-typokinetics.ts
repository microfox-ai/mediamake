/**
 * Flashcard Typokinetics Preset
 *
 * Treats each text element as a physical card with instant transitions - hard cuts between cards,
 * flip reveals, and directional slides. Perfect for educational Q&A, flashcards, and caption swaps
 * with no crossfades.
 *
 * Features:
 * - **Instant Card Swaps**: Hard cuts between cards with minimal overlap (0.01s)
 * - **Flip Effects**: 3D card flips with rotateY and backface-visibility
 * - **Directional Slides**: Instant position changes from different directions
 * - **Q&A Pairs**: Process captionData for alternating question/answer cards
 * - **3D Card Effects**: Perspective and preserve-3d for realistic card rendering
 * - **No Crossfades**: Pure instant transitions mimicking physical card manipulations
 *
 * Use cases:
 * - Educational flashcard sequences
 * - Q&A reveal animations
 * - Caption swap effects
 * - Card-based text presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        text: z.string().describe('Caption text'),
        absoluteStart: z.number().describe('Start time in seconds'),
        duration: z.number().describe('Duration in seconds'),
      }),
    )
    .describe('Array of captions to display as cards'),
  effectType: z
    .enum(['card-swap', 'card-flip', 'card-slide'])
    .default('card-swap')
    .describe('Type of card transition effect'),
  slideDirection: z
    .enum(['left', 'right', 'up', 'down'])
    .default('right')
    .optional()
    .describe('Direction for slide effect (only used with card-slide)'),
  cardDisplayDuration: z
    .number()
    .default(2)
    .describe('How long each card displays before transition (seconds)'),
  transitionDuration: z
    .number()
    .default(0.033)
    .describe('Duration of instant transition (default: 1 frame at 30fps)'),
  questionColor: z
    .string()
    .default('#1F2937')
    .describe('Background color for question cards'),
  answerColor: z
    .string()
    .default('#3B82F6')
    .describe('Background color for answer cards'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color for all cards'),
  fontSize: z.number().default(48).describe('Font size for card text'),
  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  cardPadding: z
    .number()
    .default(32)
    .describe('Padding inside cards in pixels'),
  cardBorderRadius: z
    .number()
    .default(16)
    .describe('Border radius for cards in pixels'),
  trackName: z
    .string()
    .default('flashcard-track')
    .describe('Name/ID for the track container'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    effectType,
    slideDirection,
    cardDisplayDuration,
    transitionDuration,
    questionColor,
    answerColor,
    textColor,
    fontSize,
    font,
    cardPadding,
    cardBorderRadius,
    trackName,
  } = params;

  // Parse font string
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

  const { fontFamily, fontStyle } = parseFontString(font || 'Inter:700');

  // Calculate total timeline
  let currentTime = 0;
  const cards: RenderableComponentData[] = [];

  captions.forEach((caption, index) => {
    const isQuestion = index % 2 === 0; // Alternate Q/A
    const cardId = `${trackName}-card-${index}`;
    const backgroundColor = isQuestion ? questionColor : answerColor;

    // Card start time
    const cardStart = currentTime;
    const cardEnd = cardStart + cardDisplayDuration;

    // Create card container with 3D effects
    const cardContainer: RenderableComponentData = {
      id: cardId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute flex items-center justify-center shadow-2xl',
          style: {
            inset: '32px',
            borderRadius: `${cardBorderRadius}px`,
            backgroundColor,
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            padding: `${cardPadding}px`,
          },
        },
      },
      context: {
        timing: {
          start: cardStart,
          duration: cardDisplayDuration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: `${cardId}-text`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: caption.text,
            className: 'text-center',
            style: {
              fontSize: `${fontSize}px`,
              color: textColor,
              fontWeight: fontStyle.fontWeight || 700,
              ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: cardDisplayDuration + transitionDuration,
            },
          },
        },
      ],
      effects: [],
    };

    // Apply effect based on type
    if (effectType === 'card-swap') {
      // Instant opacity swap
      const hideEffect = {
        id: `${cardId}-hide`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: cardDisplayDuration,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: [cardId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      };
      cardContainer.effects = [hideEffect];
    } else if (effectType === 'card-flip') {
      // 3D flip effect with instant rotation at midpoint
      const flipOutEffect = {
        id: `${cardId}-flip-out`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: cardDisplayDuration,
          duration: transitionDuration / 2,
          mode: 'provider' as const,
          targetIds: [cardId],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 90, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      };
      cardContainer.effects = [flipOutEffect];
    } else if (effectType === 'card-slide') {
      // Instant slide out
      const direction = slideDirection || 'right';
      const translateKey = direction === 'left' || direction === 'right' ? 'translateX' : 'translateY';
      const translateValue =
        direction === 'left' || direction === 'up' ? '-100' : '100';

      const slideOutEffect = {
        id: `${cardId}-slide-out`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: cardDisplayDuration,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: [cardId],
          ranges: [
            { key: translateKey, val: '0%', prog: 0 },
            { key: translateKey, val: `${translateValue}%`, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      };
      cardContainer.effects = [slideOutEffect];
    }

    cards.push(cardContainer);

    // Move to next card timing
    currentTime = cardEnd + transitionDuration;
  });

  // Calculate total duration
  const totalDuration = currentTime;

  // Create root container with perspective
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: cards,
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

const presetMetadata: PresetMetadata = {
  id: 'flashcard-typokinetics',
  title: 'Flashcard Typokinetics',
  description:
    'Treats each text element as a physical card with instant transitions - hard cuts between cards, flip reveals, and directional slides. Perfect for educational Q&A, flashcards, and caption swaps with no crossfades.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'flashcard',
    'cards',
    'instant',
    'transitions',
    'qa',
    'educational',
    'flip',
    'slide',
    'swap',
  ],
  defaultInputParams: {
    captions: [
      {
        text: 'Question 1: What is this?',
        absoluteStart: 0,
        duration: 2,
      },
      {
        text: 'Answer 1: This is the answer!',
        absoluteStart: 2.033,
        duration: 2,
      },
      {
        text: 'Question 2: Next question?',
        absoluteStart: 4.066,
        duration: 2,
      },
      {
        text: 'Answer 2: Another answer!',
        absoluteStart: 6.099,
        duration: 2,
      },
    ],
    effectType: 'card-flip',
    slideDirection: 'right',
    cardDisplayDuration: 2,
    transitionDuration: 0.033,
    questionColor: '#1F2937',
    answerColor: '#3B82F6',
    textColor: '#FFFFFF',
    fontSize: 48,
    font: 'Inter:700',
    cardPadding: 32,
    cardBorderRadius: 16,
    trackName: 'flashcard-track',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const flashcardTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};