/**
 * Emotion Pulse Subtitles Preset
 *
 * This preset creates dynamic, emotion-driven subtitles that scale and glow individual words
 * based on caption metadata impact scores or emotion tags. Words with higher emotional intensity
 * receive enhanced visual emphasis through scaling and glowing effects.
 *
 * Features:
 * - **Impact-Driven Scaling**: Words scale from 1.0x to 2.5x based on impact metadata
 * - **Emotion-Based Glow**: Different emotions map to different glow colors
 * - **Per-Word Animation**: Each word receives individual scale and glow effects
 * - **Smooth Transitions**: Easing functions create smooth pulse effects
 * - **Metadata Integration**: Uses caption.metadata.impact (0-1 range) and emotion tags
 * - **Fallback Support**: Graceful fallback to baseline effects when metadata is missing
 *
 * Use Cases:
 * - Emphasizing emotionally charged words in speeches or podcasts
 * - Creating dramatic effect for story narration
 * - Highlighting key moments in testimonials or interviews
 * - Adding visual punch to marketing or promotional content
 *
 * Impact Levels:
 * - High impact (>0.7): Maximum scale (2.0x+) and intense glow
 * - Medium impact (0.4-0.7): Moderate scale (1.3-1.7x) and medium glow
 * - Low impact (<0.4): Subtle scale (1.0-1.3x) and minimal glow
 *
 * @example
 * // Caption with impact metadata
 * {
 *   text: "This is absolutely incredible!",
 *   metadata: {
 *     impact: 0.9,
 *     emotion: "excitement"
 *   }
 * }
 */

import { z } from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/remotion';

// Parameter schema with descriptions
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
            emotion: z
              .enum(['excitement', 'joy', 'anger', 'sadness', 'fear', 'neutral'])
              .optional()
              .describe('Emotion classification of the caption'),
            impact: z
              .number()
              .optional()
              .describe('Effect intensity multiplier (0.1 - 3.0)'),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with emotion metadata'),

  baseFontSize: z
    .number()
    .default(48)
    .describe('Base font size in pixels for normal impact words'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for subtitle text'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color for subtitles'),
  scaleMultiplier: z
    .number()
    .default(1.5)
    .describe(
      'Maximum scale multiplier for high-impact words (1.0 = no scaling, 2.0 = double size)',
    ),
  glowIntensity: z
    .number()
    .default(30)
    .describe('Maximum glow intensity in pixels for high-impact words'),
  enableGlow: z
    .boolean()
    .default(true)
    .describe('Enable or disable glow effects on words'),
  transitionDuration: z
    .number()
    .default(0.3)
    .describe('Duration in seconds for scale and glow transitions'),
  defaultImpact: z
    .number()
    .default(0.5)
    .describe(
      'Default impact value (0-1) when caption.metadata.impact is not provided',
    ),
  emotionColorMap: z
    .record(z.string(), z.string())
    .default({
      excitement: '#ff6b35',
      joy: '#ffd60a',
      anger: '#e63946',
      sadness: '#457b9d',
      fear: '#9b59b6',
      neutral: '#ffffff',
    })
    .describe('Map of emotion tags to glow colors (hex values)'),
  containerPadding: z
    .number()
    .default(80)
    .describe('Bottom padding in pixels for subtitle safe zone'),
  wordSpacing: z
    .number()
    .default(0.5)
    .describe('Spacing between words in em units'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    baseFontSize,
    fontFamily,
    textColor,
    scaleMultiplier,
    glowIntensity,
    enableGlow,
    transitionDuration,
    defaultImpact,
    emotionColorMap,
    containerPadding,
    wordSpacing,
  } = params;

  // Helper function to calculate scale based on impact
  const calculateScale = (impact: number): number => {
    // Clamp impact between 0 and 1
    const clampedImpact = Math.max(0, Math.min(1, impact));
    // Scale from 1.0 to scaleMultiplier based on impact
    return 1.0 + clampedImpact * (scaleMultiplier - 1.0);
  };

  // Helper function to calculate glow intensity based on impact
  const calculateGlow = (impact: number): number => {
    if (!enableGlow) return 0;
    const clampedImpact = Math.max(0, Math.min(1, impact));
    return clampedImpact * glowIntensity;
  };

  // Helper function to get glow color based on emotion
  const getGlowColor = (emotion?: string): string => {
    if (!emotion) return emotionColorMap.neutral || '#ffffff';
    return emotionColorMap[emotion] || emotionColorMap.neutral || '#ffffff';
  };

  const captionComponents: any[] = [];

  captions.forEach((caption, captionIndex: number) => {
    const { words, absoluteStart, duration, metadata } = caption;

    // Get caption-level impact or use default
    const captionImpact = metadata?.impact ?? defaultImpact;
    const captionEmotion = metadata?.emotion;

    // Create word components for this caption
    const wordComponents: any[] = [];
    const wordEffects: any[] = [];

    words.forEach((word: any, wordIndex: number) => {
      const wordId = `emotion-pulse-word-${captionIndex}-${wordIndex}`;

      // Determine impact for this word (use caption-level impact)
      const wordImpact = captionImpact;
      const wordScale = calculateScale(wordImpact);
      const wordGlowIntensity = calculateGlow(wordImpact);
      const wordGlowColor = getGlowColor(captionEmotion);

      // Create word component
      const wordComponent = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          font: {
            family: fontFamily,
            weight: 700,
          },
          style: {
            fontSize: `${baseFontSize}px`,
            color: textColor,
            textShadow: `0 2px 8px rgba(0, 0, 0, 0.3)`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration, // All words use full sentence duration
          },
        },
      };

      wordComponents.push(wordComponent);

      // Create scale effect for the word
      const scaleEffect = {
        id: `scale-effect-${wordId}`,
        componentId: wordId,
        data: {
          type: 'ease-out',
          start: word.start,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: 1.0, prog: 0 },
            { key: 'scale', val: wordScale, prog: 1 },
          ],
        },
      };

      wordEffects.push(scaleEffect);

      // Create glow effect if enabled and impact is significant
      if (enableGlow && wordGlowIntensity > 0) {
        const glowEffect = {
          id: `glow-effect-${wordId}`,
          componentId: wordId,
          data: {
            type: 'ease-out',
            start: word.start,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              {
                key: 'filter',
                val: `drop-shadow(0 0 0px ${wordGlowColor})`,
                prog: 0,
              },
              {
                key: 'filter',
                val: `drop-shadow(0 0 ${wordGlowIntensity}px ${wordGlowColor})`,
                prog: 1,
              },
            ],
          },
        };

        wordEffects.push(glowEffect);
      }

      // Add opacity fade-in effect for smooth appearance
      const opacityEffect = {
        id: `opacity-effect-${wordId}`,
        componentId: wordId,
        data: {
          type: 'ease-out',
          start: word.start,
          duration: Math.min(transitionDuration * 0.5, 0.2),
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      };

      wordEffects.push(opacityEffect);
    });

    // Create container for this caption's words
    const captionContainerId = `emotion-pulse-caption-${captionIndex}`;
    const captionContainer = {
      id: captionContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row flex-wrap items-center justify-center',
          style: {
            gap: `${wordSpacing}em`,
            maxWidth: '90vw',
          },
        },
      },
      context: {
        timing: {
          start: absoluteStart,
          duration: duration,
        },
      },
      effects: wordEffects,
      childrenData: wordComponents,
    };

    captionComponents.push(captionContainer);
  });

  // Create root container
  const rootContainer = {
    id: 'emotion-pulse-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-end justify-center',
        style: {
          paddingBottom: `${containerPadding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: props.config?.duration || 30,
      },
    },
    childrenData: captionComponents,
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
  id: 'EmotionPulseSubtitles',
  title: 'Emotion Pulse Subtitles',
  description:
    'Dynamic subtitle preset that scales and glows individual words based on caption metadata impact scores or emotion tags, creating emphasis on emotionally charged content',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'emotion',
    'impact',
    'scale',
    'glow',
    'dynamic',
    'pulse',
    'kinetic',
    'animated',
  ],
  defaultInputParams: {
    captions: [],
    baseFontSize: 48,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    scaleMultiplier: 1.5,
    glowIntensity: 30,
    enableGlow: true,
    transitionDuration: 0.3,
    defaultImpact: 0.5,
    emotionColorMap: {
      excitement: '#ff6b35',
      joy: '#ffd60a',
      anger: '#e63946',
      sadness: '#457b9d',
      fear: '#9b59b6',
      neutral: '#ffffff',
    },
    containerPadding: 80,
    wordSpacing: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const EmotionPulseSubtitlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
