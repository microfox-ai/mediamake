/**
 * Notification Pop Text Preset
 *
 * A sophisticated notification-style text animation preset that treats text like UI toast notifications.
 * Text slides upward (translateY from 20px to 0) while scaling from 0 to 100% with smooth ease-out easing.
 * Features dynamic shadow growth creating a lifting-off-surface illusion.
 *
 * Features:
 * - **Notification Pop Animation**: Text slides up from 20px to 0 while scaling from 0 to 100%
 * - **Dynamic Shadow Growth**: Shadow animates from transparent to visible, creating depth
 * - **Dual Animation Modes**: Sentence-level for headlines, word-level for body text
 * - **Impact-Based Scaling**: High-impact words get 10% larger scale and 0.1s longer duration
 * - **Professional Aesthetics**: Clean, modern animation perfect for tech product launches
 * - **Flexible Typography**: Supports custom fonts, colors, and sizing
 *
 * Use cases:
 * - Tech product launch videos
 * - App promo feature callouts
 * - Modern UI demonstrations
 * - Floating notification cards
 * - Feature announcement overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
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
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            id: z.string().optional(),
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
    .describe('Array of caption objects with timing and word data'),

  animationMode: z
    .enum(['sentence', 'word'])
    .default('sentence')
    .describe('Animation level: sentence-level for headlines, word-level for body text'),

  font: z
    .string()
    .default('Inter:600')
    .describe('Font family with optional weight and style (e.g., "Inter:600", "Roboto:700:italic")'),

  fontSize: z
    .number()
    .default(48)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),

  baseDuration: z
    .number()
    .default(0.4)
    .describe('Base animation duration in seconds for standard words'),

  impactScale: z
    .number()
    .default(1.1)
    .describe('Scale multiplier for high-impact words (default: 1.1 = 10% larger)'),

  impactDurationBonus: z
    .number()
    .default(0.1)
    .describe('Additional duration in seconds for high-impact words'),

  impactThreshold: z
    .number()
    .default(0.8)
    .describe('Minimum impact score to trigger enhanced scaling (0-1)'),

  position: z
    .enum(['bottom', 'center', 'top'])
    .default('bottom')
    .describe('Vertical position of notification'),

  horizontalAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal alignment'),

  bottomOffset: z
    .number()
    .default(80)
    .describe('Offset from bottom in pixels when position is bottom'),

  wordSpacing: z
    .number()
    .default(0.25)
    .describe('Gap between words in em units'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const parseFontString = (fontString: string) => {
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

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font);

  // Position calculation helper
  const getPositionStyle = () => {
    const alignMap = {
      left: 'left-0 translate-x-0',
      center: 'left-1/2 -translate-x-1/2',
      right: 'right-0 translate-x-0',
    };

    const positionMap = {
      bottom: `bottom-[${params.bottomOffset}px]`,
      center: 'top-1/2 -translate-y-1/2',
      top: 'top-[80px]',
    };

    return `absolute ${positionMap[params.position]} ${alignMap[params.horizontalAlign]}`;
  };

  // Create notification pop effect for a target
  const createNotificationPopEffect = (
    targetId: string,
    startTime: number,
    duration: number,
    scale: number = 1,
  ): GenericEffectData => {
    return {
      type: 'ease-out',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Slide up from 20px to 0
        { key: 'translateY', val: 20, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        // Scale from 0 to final scale
        { key: 'scale', val: 0, prog: 0 },
        { key: 'scale', val: scale, prog: 1 },
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
  };

  // Create shadow growth effect
  const createShadowGrowEffect = (
    targetId: string,
    startTime: number,
    duration: number,
  ): GenericEffectData => {
    return {
      type: 'ease-out',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'filter', val: 'drop-shadow(0 0 0px rgba(0,0,0,0))', prog: 0 },
        { key: 'filter', val: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))', prog: 1 },
      ],
    };
  };

  const childrenData: RenderableComponentData[] = [];

  // Process each caption
  params.captions.forEach((caption) => {
    const captionImpact = caption.metadata?.impact ?? 1.0;

    if (params.animationMode === 'sentence') {
      // Sentence-level animation
      const captionId = `notification-caption-${caption.id}`;
      const containerId = `notification-container-${caption.id}`;

      const captionContainer = {
        id: containerId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: getPositionStyle(),
            style: {
              width: 'auto',
              maxWidth: '90%',
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
            id: captionId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: caption.text,
              style: {
                fontSize: params.fontSize,
                color: params.textColor,
                textAlign: 'center' as const,
                whiteSpace: 'pre-wrap' as const,
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['600'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
          },
        ],
        effects: [
          {
            id: `notification-pop-${caption.id}`,
            componentId: 'generic',
            data: createNotificationPopEffect(containerId, 0, params.baseDuration * captionImpact),
          },
          {
            id: `shadow-grow-${caption.id}`,
            componentId: 'generic',
            data: createShadowGrowEffect(containerId, 0, params.baseDuration * captionImpact),
          },
        ],
      } as RenderableComponentData;

      childrenData.push(captionContainer);
    } else {
      // Word-level animation
      const containerId = `notification-container-${caption.id}`;
      const wordComponents: RenderableComponentData[] = [];

      caption.words.forEach((word, wordIndex) => {
        const wordId = `notification-word-${caption.id}-${wordIndex}`;
        const wordImpact = captionImpact;
        const isHighImpact = wordImpact >= params.impactThreshold;

        const wordScale = isHighImpact ? params.impactScale : 1.0;
        const wordDuration = params.baseDuration + (isHighImpact ? params.impactDurationBonus : 0);

        const wordComponent = {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              display: 'inline-block' as const,
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['600'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: [
            {
              id: `word-pop-${caption.id}-${wordIndex}`,
              componentId: 'generic',
              data: createNotificationPopEffect(wordId, word.start, wordDuration, wordScale),
            },
            {
              id: `word-shadow-${caption.id}-${wordIndex}`,
              componentId: 'generic',
              data: createShadowGrowEffect(wordId, word.start, wordDuration),
            },
          ],
        } as RenderableComponentData;

        wordComponents.push(wordComponent);
      });

      const captionContainer = {
        id: containerId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `${getPositionStyle()} flex flex-row flex-wrap justify-center`,
            style: {
              gap: `${params.wordSpacing}em`,
              maxWidth: '90%',
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
      } as RenderableComponentData;

      childrenData.push(captionContainer);
    }
  });

  const rootContainer = {
    id: 'notification-pop-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10,
      },
    },
    childrenData: childrenData,
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
  id: 'notification-pop-text',
  title: 'Notification Pop Text',
  description:
    'A sophisticated notification-style text animation preset that treats text like UI toast notifications. Text slides upward (translateY from 20px to 0) while scaling from 0 to 100% with smooth ease-out easing. Features dynamic shadow growth creating a lifting-off-surface illusion. Supports both sentence-level animations for headlines and word-level animations for body text, with high-impact words receiving 10% larger scale and 0.1s longer duration. Perfect for tech product launches, app promo videos, and modern motion graphics with clean, professional aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'notification', 'toast', 'animation', 'pop', 'slide', 'scale', 'shadow', 'ui', 'modern', 'tech'],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'New Feature Unlocked',
        start: 0,
        absoluteStart: 0,
        end: 2.5,
        absoluteEnd: 2.5,
        duration: 2.5,
        words: [
          {
            text: 'New',
            start: 0,
            absoluteStart: 0,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.8,
            id: 'word-1',
            confidence: 1,
          },
          {
            text: 'Feature',
            start: 0.8,
            absoluteStart: 0.8,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 0.7,
            id: 'word-2',
            confidence: 1,
          },
          {
            text: 'Unlocked',
            start: 1.5,
            absoluteStart: 1.5,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 1.0,
            id: 'word-3',
            confidence: 1,
          },
        ],
        metadata: {
          impact: 1.2,
        },
      },
    ],
    animationMode: 'sentence',
    font: 'Inter:600',
    fontSize: 48,
    textColor: '#FFFFFF',
    baseDuration: 0.4,
    impactScale: 1.1,
    impactDurationBonus: 0.1,
    impactThreshold: 0.8,
    position: 'bottom',
    horizontalAlign: 'center',
    bottomOffset: 80,
    wordSpacing: 0.25,
  },
};

// Export preset
export const notificationPopTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
