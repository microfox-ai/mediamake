/**
 * Word-by-Word Breath Reveal Preset
 *
 * This preset creates a sophisticated word-by-word reveal animation where each word emerges
 * through scaling animation timed to vocal emphasis patterns. Words start at scale 0, then
 * grow to their emphasized size based on caption metadata.
 *
 * Features:
 * - **Emphasis-Based Animation**: High-emphasis words overshoot slightly (scale 1.1) before
 *   settling to 1.0, while regular words simply fade in at normal size
 * - **Playful Rotation**: Subtle rotation effect (-2deg to 2deg) during scale animation
 * - **Staggered Cascade**: Each word animates at its precise timing to follow natural speech rhythm
 * - **Responsive Layout**: Flex-wrap layout adapts to different word counts and screen sizes
 * - **Performance Optimized**: Uses transform-gpu and will-change for smooth animations
 *
 * Use cases:
 * - Creating dynamic word-by-word reveals synchronized with narration
 * - Building engaging typography that responds to vocal emphasis
 * - Adding energy to spoken content through animated text
 * - Creating playful, breath-like text animations for educational or promotional videos
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  trackId: z
    .string()
    .default('word-breath-reveal')
    .describe('Unique ID for this preset'),
  captions: z
    .array(z.any())
    .describe('Array of caption objects with word-level timing and metadata'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  textShadow: z
    .string()
    .optional()
    .default('0 2px 8px rgba(0,0,0,0.3)')
    .describe('Text shadow for better visibility'),
  wordGap: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Gap between words in pixels'),
  containerPadding: z
    .number()
    .min(0)
    .max(200)
    .default(32)
    .describe('Horizontal padding for container in pixels'),
  animationDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.4)
    .describe('Duration of word reveal animation in seconds'),
  emphasisOvershoot: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.1)
    .describe('Scale overshoot for emphasized words'),
  rotationRange: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Maximum rotation in degrees during animation'),
  impact: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Global impact multiplier for animation intensity'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];

  // Helper: Parse font string
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

  // Parse font
  const fontString = params.font || 'Inter:700';
  const { fontFamily, fontStyle } = parseFontString(fontString);

  // Helper: Create word reveal effect
  const createWordEffect = (
    word: any,
    wordId: string,
    caption: TranscriptionSentence,
  ) => {
    // Check if word has emphasis from caption metadata
    const isEmphasized =
      caption.metadata?.keyword?.toLowerCase() === word.text.toLowerCase();

    // Get impact multiplier (per-caption or global)
    const captionImpact = caption.metadata?.impact ?? params.impact;

    // Calculate animation duration with impact
    const duration = params.animationDuration * captionImpact;

    // Determine target scale based on emphasis
    const targetScale = isEmphasized ? params.emphasisOvershoot : 1.0;

    // Rotation direction (alternate between positive and negative)
    const rotationStart =
      Math.random() > 0.5 ? params.rotationRange : -params.rotationRange;

    // Build effect ranges
    const ranges: any[] = [
      // Opacity fade-in
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.3 },
      { key: 'opacity', val: 1, prog: 1 },

      // Scale animation
      { key: 'scale', val: 0, prog: 0 },
      { key: 'scale', val: targetScale, prog: 0.7 },
      { key: 'scale', val: 1, prog: 1 },

      // Rotation animation
      { key: 'rotate', val: rotationStart, prog: 0 },
      { key: 'rotate', val: 0, prog: 1 },
    ];

    // Effect data
    const effectData: GenericEffectData = {
      type: isEmphasized ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'ease-out',
      start: word.start, // Relative to caption
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: ranges,
    };

    return {
      id: `word-reveal-${wordId}`,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Build children data for all captions
  const captionContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionId = `caption-${params.trackId}-${captionIndex}`;

    // Build word components
    const wordComponents: RenderableComponentData[] = [];

    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionId}-${wordIndex}`;

      // Create word effect
      const wordEffect = createWordEffect(word, wordId, caption);

      // Word text atom
      const wordAtom: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${params.fontSize}px`,
            color: params.textColor,
            textShadow: params.textShadow,
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
            start: 0, // All words visible for full caption duration
            duration: caption.duration,
          },
        },
        effects: [wordEffect],
      };

      wordComponents.push(wordAtom);
    });

    // Words container with flex-wrap layout
    const wordsContainer: RenderableComponentData = {
      id: `words-wrapper-${captionId}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-wrap items-center justify-center',
          style: {
            gap: `${params.wordGap}px`,
            maxWidth: '90%',
          },
        },
        repeatChildrenProps: {
          className: 'inline-block',
          style: {
            opacity: 0,
            transform: 'scale(0)',
            transformOrigin: 'center center',
            willChange: 'transform, opacity',
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

    // Caption container
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            padding: `0 ${params.containerPadding}px`,
          },
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

    captionContainers.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${params.trackId}-root`,
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
        duration: 10,
      },
    },
    childrenData: captionContainers,
  } as RenderableComponentData;

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
  id: 'word-by-word-breath-reveal',
  title: 'Word-by-Word Breath Reveal',
  description:
    'Sophisticated word-by-word reveal preset where each word emerges through scaling animation timed to vocal emphasis patterns. Words start at scale 0, then grow to their emphasized size based on caption metadata. High-emphasis words overshoot slightly (scale 1.1) before settling to 1.0, while regular words simply fade in at normal size. Features subtle rotation (-2deg to 2deg) during scale animation for a playful, dynamic feel that creates a staggered cascade effect following natural speech rhythm.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'typography',
    'word-by-word',
    'emphasis',
    'animation',
    'reveal',
    'breath',
    'playful',
  ],
  dependencies: {},
  defaultInputParams: {
    trackId: 'word-breath-reveal',
    captions: [
      {
        id: 'caption-1',
        text: 'Hello world',
        start: 0,
        end: 2.5,
        duration: 2.5,
        absoluteStart: 0,
        absoluteEnd: 2.5,
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            end: 1.0,
            duration: 1.0,
            absoluteStart: 0,
            absoluteEnd: 1.0,
            confidence: 0.95,
          },
          {
            id: 'word-2',
            text: 'world',
            start: 1.0,
            end: 2.5,
            duration: 1.5,
            absoluteStart: 1.0,
            absoluteEnd: 2.5,
            confidence: 0.93,
          },
        ],
        metadata: {
          keyword: 'Hello',
          impact: 1.2,
        },
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#ffffff',
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
    wordGap: 8,
    containerPadding: 32,
    animationDuration: 0.4,
    emphasisOvershoot: 1.1,
    rotationRange: 2,
    impact: 1,
  },
};

// Export preset
export const wordByWordBreathRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
