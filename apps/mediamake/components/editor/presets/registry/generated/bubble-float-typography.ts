/**
 * Bubble Float Typography Animation Preset
 *
 * This preset creates an elegant "bubble-float" typography animation that simulates text bubbling up
 * like carbonation in a champagne glass. Each word appears with a gentle wobble as it scales up,
 * incorporating subtle horizontal sway (like bubbles don't rise perfectly straight).
 *
 * Features:
 * - Words start at 0% scale and opacity, animate to 100% with slight overshoot
 * - Compound animation: scale (0 → 1.05 → 1), translateY (30px → -5px → 0), translateX with sine-wave oscillation
 * - Spring easing for natural bounce physics
 * - Random variation per word for organic bubble drift effect
 * - Optional blur-to-focus effect (2px → 0) for depth
 * - Keyword support: important words are 15% larger and rise slightly higher
 * - Staggered timing (0.12s delay between words)
 *
 * Use cases:
 * - Event titles and announcements
 * - Celebratory moments
 * - Playful captions
 * - Content that needs to feel light, buoyant, and joyful
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { GenericEffectData, TextAtomData, RenderableComponentData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string().describe('Caption ID'),
        text: z.string().describe('Caption text'),
        start: z.number().describe('Caption start time (relative)'),
        absoluteStart: z.number().describe('Caption absolute start time'),
        end: z.number().describe('Caption end time'),
        absoluteEnd: z.number().describe('Caption absolute end time'),
        duration: z.number().describe('Caption duration'),
        words: z.array(
          z.object({
            id: z.string().optional().describe('Word ID'),
            text: z.string().describe('Word text'),
            start: z.number().describe('Word start time (relative to caption)'),
            absoluteStart: z.number().describe('Word absolute start time'),
            end: z.number().describe('Word end time'),
            absoluteEnd: z.number().describe('Word absolute end time'),
            duration: z.number().describe('Word duration'),
            confidence: z.number().optional().describe('Word confidence'),
          }),
        ),
        metadata: z
          .object({
            keyword: z.string().optional().describe('Keyword to highlight'),
            impact: z.number().optional().describe('Effect intensity multiplier'),
          })
          .optional()
          .describe('Optional caption metadata'),
      }),
    )
    .describe('Array of caption sentences with word timing'),

  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe('Font family with optional weight and style (e.g., "Inter:600", "Roboto:700:italic")'),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),

  keywordScaleMultiplier: z
    .number()
    .min(1)
    .max(2)
    .default(1.15)
    .describe('Scale multiplier for keyword words (1.15 = 15% larger)'),

  enableBlur: z
    .boolean()
    .default(true)
    .describe('Enable blur-to-focus effect for depth'),

  wordDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Base animation duration per word (seconds)'),

  wordStagger: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.12)
    .describe('Stagger delay between words (seconds)'),

  impactMultiplier: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Global effect intensity multiplier'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Generate random variation for horizontal drift
  const getRandomDrift = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper function: Generate random timing variation
  const getRandomTimingVariation = (): number => {
    return (Math.random() - 0.5) * 0.1; // ±0.05s variation
  };

  // Parse font string
  const fontString = params.font || 'Inter:600';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
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

  // Build caption containers
  const captionContainers: RenderableComponentData[] = params.captions.map((caption) => {
    const captionId = `bubble-caption-${caption.id}`;

    // Determine keyword from metadata
    const keyword = caption.metadata?.keyword;
    const captionImpact = caption.metadata?.impact ?? params.impactMultiplier;

    // Build word components
    const wordComponents: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = `bubble-word-${caption.id}-${wordIndex}`;
      const isKeyword = keyword && word.text.toLowerCase().includes(keyword.toLowerCase());

      // Calculate font size (keywords are larger)
      const wordFontSize = isKeyword
        ? params.fontSize * params.keywordScaleMultiplier
        : params.fontSize;

      // Calculate animation duration with random variation
      const baseDuration = params.wordDuration * captionImpact;
      const wordAnimDuration = baseDuration + getRandomTimingVariation();

      // Random horizontal drift for each word
      const driftX = getRandomDrift(-5, 5);

      // Effect timing: start when word is spoken (relative to caption start)
      const effectStart = word.start;

      // Build compound effect ranges
      const effectRanges: any[] = [
        // Scale: 0 → 1.05 (overshoot) → 1
        { key: 'scale', val: 0, prog: 0 },
        { key: 'scale', val: 1.05, prog: 0.7 },
        { key: 'scale', val: 1, prog: 1 },

        // TranslateY: 30px (below) → -5px (overshoot up) → 0 (settle)
        { key: 'translateY', val: 30, prog: 0 },
        { key: 'translateY', val: isKeyword ? -8 : -5, prog: 0.6 },
        { key: 'translateY', val: 0, prog: 1 },

        // TranslateX: oscillate with sine wave
        { key: 'translateX', val: driftX, prog: 0 },
        { key: 'translateX', val: -driftX * 0.7, prog: 0.3 },
        { key: 'translateX', val: driftX * 0.5, prog: 0.6 },
        { key: 'translateX', val: 0, prog: 1 },

        // Opacity: 0 → 1
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.5 },
      ];

      // Optional blur effect
      if (params.enableBlur) {
        effectRanges.push(
          { key: 'filter', val: 'blur(2px)', prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 0.6 },
        );
      }

      // Build effect
      const wordEffect: GenericEffectData = {
        type: 'spring',
        start: effectStart,
        duration: wordAnimDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: effectRanges,
      };

      // Build word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: wordFontSize,
            color: params.textColor,
            fontWeight: fontStyle.fontWeight || 600,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['600'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `bubble-effect-${wordId}`,
            componentId: 'generic',
            data: wordEffect,
          },
        ],
      };

      return wordComponent;
    });

    // Build caption container (words container)
    const wordsContainer: RenderableComponentData = {
      id: `${captionId}-words`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-wrap items-center justify-center gap-x-3 gap-y-2',
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

    // Build caption root container
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-col items-center justify-end h-full pb-12',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [wordsContainer],
    };

    return captionContainer;
  });

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'bubble-float-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
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
  id: 'bubble-float-typography',
  title: 'Bubble Float Typography',
  description:
    'Elegant typography animation simulating text bubbling up like champagne carbonation. Words appear with gentle wobble, scale-up with overshoot, horizontal sway oscillation, and optional blur-to-focus effect. Perfect for event titles, announcements, and celebratory captions with a light, buoyant, joyful feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'captions',
    'animation',
    'bubble',
    'float',
    'champagne',
    'celebration',
    'elegant',
    'playful',
    'spring',
    'kinetic',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Celebrate your moment',
        start: 0,
        absoluteStart: 2,
        end: 3,
        absoluteEnd: 5,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Celebrate',
            start: 0,
            absoluteStart: 2,
            end: 0.8,
            absoluteEnd: 2.8,
            duration: 0.8,
            confidence: 0.95,
          },
          {
            id: 'word-2',
            text: 'your',
            start: 0.92,
            absoluteStart: 2.92,
            end: 1.3,
            absoluteEnd: 3.3,
            duration: 0.38,
            confidence: 0.98,
          },
          {
            id: 'word-3',
            text: 'moment',
            start: 1.42,
            absoluteStart: 3.42,
            end: 2.5,
            absoluteEnd: 4.5,
            duration: 1.08,
            confidence: 0.97,
          },
        ],
        metadata: {
          keyword: 'Celebrate',
          impact: 1.2,
        },
      },
    ],
    font: 'Inter:600',
    fontSize: 48,
    textColor: '#FFFFFF',
    keywordScaleMultiplier: 1.15,
    enableBlur: true,
    wordDuration: 0.8,
    wordStagger: 0.12,
    impactMultiplier: 1,
  },
};

// --- Export ---

export const bubbleFloatTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
