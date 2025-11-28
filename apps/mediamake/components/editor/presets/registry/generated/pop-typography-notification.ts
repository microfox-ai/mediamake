/**
 * Pop Typography - Notification Bubble Style
 *
 * Creates a clean typography preset that mimics the subtle bounce and scale animation
 * of mobile notification bubbles. Each word appears with a smooth elastic animation
 * that scales from 85% to 102% (overshoot) before settling at 100%, combined with
 * a soft fade-in and optional subtle blur effect.
 *
 * Features:
 * - Elastic scale animation (85% → 102% → 100%) with spring-like feel
 * - Soft fade-in during first 20% of animation
 * - Optional subtle blur-to-sharp transition for depth
 * - Staggered word animations with configurable delays
 * - Centrally positioned with flexible layout options
 * - Organic, friendly animation feel inspired by iOS notifications
 *
 * Use cases:
 * - Title sequences with friendly, attention-grabbing reveals
 * - Social media content with playful text animations
 * - Notification-style text overlays
 * - UI-inspired typography effects
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

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(z.any())
    .describe('Array of caption objects with words metadata'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter:600" for weight)'),
  textColor: z.string().default('#FFFFFF').describe('Text color'),
  staggerDelay: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.12)
    .describe('Delay between word animations in seconds'),
  animationDuration: z
    .number()
    .min(0.3)
    .max(1.0)
    .default(0.55)
    .describe('Duration of each word pop animation in seconds'),
  enableBlur: z
    .boolean()
    .default(true)
    .describe('Enable subtle blur-to-sharp transition'),
  blurAmount: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Initial blur amount in pixels'),
  alignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Text alignment'),
  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical positioning'),
  wordGap: z
    .number()
    .min(0)
    .max(50)
    .default(0.5)
    .describe('Gap between words in em units'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize,
    fontFamily,
    textColor,
    staggerDelay,
    animationDuration,
    enableBlur,
    blurAmount,
    alignment,
    verticalPosition,
    wordGap,
  } = params;

  // Parse font family and weight
  const parseFontString = (font: string) => {
    const parts = font.split(':');
    const family = parts[0] || 'Inter';
    const weight = parts[1] ? parseInt(parts[1], 10) : 400;
    const style = parts[2] || 'normal';
    return { family, weight, style };
  };

  const fontConfig = parseFontString(fontFamily);

  // Alignment class mapping
  const alignmentMap = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  const verticalMap = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  };

  const childrenData: RenderableComponentData[] = [];

  // Process each caption
  captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
    const words = caption.words || [];
    if (words.length === 0) return;

    const captionId = `pop-caption-${captionIndex}`;

    // Create word components with staggered pop animations
    const wordComponents: RenderableComponentData[] = words.map(
      (word, wordIndex) => {
        const wordId = `${captionId}-word-${wordIndex}`;

        // Calculate staggered start time
        const effectStart = word.start + wordIndex * staggerDelay;

        // Create pop animation effect
        const popEffect: GenericEffectData = {
          type: 'spring',
          start: effectStart,
          duration: animationDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Fade in (first 20% of animation)
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 1 },

            // Scale animation with overshoot
            { key: 'scale', val: 0.85, prog: 0 },
            { key: 'scale', val: 1.02, prog: 0.7 },
            { key: 'scale', val: 1.0, prog: 1 },

            // Optional blur effect
            ...(enableBlur
              ? [
                  {
                    key: 'filter',
                    val: `blur(${blurAmount}px)`,
                    prog: 0,
                  },
                  { key: 'filter', val: 'blur(0px)', prog: 0.5 },
                  { key: 'filter', val: 'blur(0px)', prog: 1 },
                ]
              : []),
          ],
        };

        const effect = {
          id: `${wordId}-pop-effect`,
          componentId: 'generic',
          data: popEffect,
        };

        // Create TextAtom for word
        const wordComponent: RenderableComponentData = {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: `${fontSize}px`,
              color: textColor,
              fontWeight: fontConfig.weight,
              fontStyle: fontConfig.style as any,
            },
            font: {
              family: fontConfig.family,
              weights: [fontConfig.weight.toString()],
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
      },
    );

    // Create caption container with flex layout
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex ${verticalMap[verticalPosition]} ${alignmentMap[alignment]} px-8`,
        },
        repeatChildrenProps: {
          style: {
            marginRight: `${wordGap}em`,
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

    childrenData.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'pop-typography-root',
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
    childrenData: childrenData as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'pop-typography-notification',
  title: 'Pop Typography - Notification Bubble Style',
  description:
    'A clean typography preset mimicking iOS notification bubble animations. Each word appears with a smooth elastic scale-up from 85% to 102% overshoot before settling to 100%, combined with a soft fade-in and subtle blur-to-sharp transition. Designed for centrally positioned text with staggered multi-word sequences. The animation feels organic and friendly, inspired by mobile UI interactions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'pop',
    'notification',
    'bubble',
    'elastic',
    'spring',
    'bounce',
    'ios',
    'mobile',
    'ui',
    'captions',
    'stagger',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    fontSize: 48,
    fontFamily: 'Inter:600',
    textColor: '#FFFFFF',
    staggerDelay: 0.12,
    animationDuration: 0.55,
    enableBlur: true,
    blurAmount: 2,
    alignment: 'center',
    verticalPosition: 'center',
    wordGap: 0.5,
  },
};

// Export preset
export const popTypographyNotificationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
