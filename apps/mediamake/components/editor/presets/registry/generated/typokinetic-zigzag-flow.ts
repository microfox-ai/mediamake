/**
 * Typokinetic Zigzag Flow Preset
 *
 * This preset creates dynamic kinetic typography with alternating directional slides,
 * mimicking the energetic feel of music video typography. Words snap in from alternating
 * left/right directions with rotation, overshoot, and elastic settling for a zigzag
 * energy flow effect.
 *
 * Features:
 * - **Alternating Directional Slides**: Words slide in from left/right creating zigzag flow
 * - **Snap-In Motion**: Quick whip-pan style entrance with strong ease-out curves
 * - **Rotation Effects**: 5-10 degree rotation during slide that straightens on lock
 * - **Elastic Overshoot**: Brief position overshoot before settling (like elastic easing)
 * - **GPU-Optimized**: Uses will-change-transform and transform-3d for smooth performance
 * - **Caption-Based**: Automatically extracts words from caption data
 *
 * Use cases:
 * - Music video typography with energetic rhythmic feel
 * - Social media content with dynamic text animations
 * - Video intros/outros with kinetic energy
 * - Content requiring handheld camera stabilization aesthetic
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
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with word timing data'),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),

  fontFamily: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or CSS color)'),

  wordSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(12)
    .describe('Horizontal gap between words in pixels'),

  animationDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.5)
    .describe('Duration of snap-in animation in seconds'),

  rotationAmount: z
    .number()
    .min(0)
    .max(30)
    .default(10)
    .describe('Rotation angle in degrees during slide'),

  overshootAmount: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Overshoot distance as percentage'),

  slideDistance: z
    .number()
    .min(50)
    .max(200)
    .default(120)
    .describe('Initial slide distance as percentage'),

  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text'),

  defaultImpact: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Global effect intensity multiplier'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize,
    fontFamily,
    textColor,
    wordSpacing,
    animationDuration,
    rotationAmount,
    overshootAmount,
    slideDistance,
    position,
    defaultImpact,
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontParts = fontString.split(':');
    const family = fontParts[0];
    const fontStyle: React.CSSProperties = {};

    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }

    return { family, fontStyle };
  };

  const { family: parsedFontFamily, fontStyle } = parseFontString(fontFamily);

  // Position mapping
  const positionClasses = {
    top: 'items-start pt-20',
    center: 'items-center',
    bottom: 'items-end pb-20',
  };

  const captionContainers: RenderableComponentData[] = captions.map(
    (caption) => {
      const { words, absoluteStart, duration, metadata } = caption;
      const impact = metadata?.impact ?? defaultImpact;

      // Effective animation duration with impact
      const effectiveDuration = animationDuration * impact;

      const wordComponents: RenderableComponentData[] = words.map(
        (word, index) => {
          const wordId = `word-${caption.id}-${index}`;

          // Alternating logic: even = left, odd = right
          const isEven = index % 2 === 0;
          const slideStart = isEven
            ? `-${slideDistance}%`
            : `${slideDistance}%`;
          const overshootPos = isEven
            ? `-${overshootAmount}%`
            : `${overshootAmount}%`;
          const rotationStart = isEven
            ? `${rotationAmount}deg`
            : `-${rotationAmount}deg`;

          // Slide + rotation effect
          const slideEffect: GenericEffectData = {
            type: 'spring',
            start: word.start,
            duration: effectiveDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              // TranslateX with overshoot
              { key: 'translateX', val: slideStart, prog: 0 },
              { key: 'translateX', val: overshootPos, prog: 0.8 },
              { key: 'translateX', val: '0%', prog: 1 },
              // Rotate straightening
              { key: 'rotate', val: rotationStart, prog: 0 },
              { key: 'rotate', val: '0deg', prog: 1 },
              // Opacity fade-in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
            ],
          };

          const wordComponent: RenderableComponentData = {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              className: 'will-change-transform transform-gpu',
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                fontWeight: fontStyle.fontWeight ?? 700,
                fontStyle: fontStyle.fontStyle,
              },
              font: {
                family: parsedFontFamily,
                ...(fontStyle.fontWeight
                  ? { weights: [fontStyle.fontWeight.toString()] }
                  : {}),
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration, // All words visible for full sentence duration
              },
            },
            effects: [
              {
                id: `slide-effect-${wordId}`,
                componentId: 'generic',
                data: slideEffect,
              },
            ],
          };

          return wordComponent;
        },
      );

      const captionContainer: RenderableComponentData = {
        id: `caption-container-${caption.id}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `flex flex-row justify-center ${positionClasses[position]} w-full absolute inset-0`,
            style: {
              gap: `${wordSpacing}px`,
            },
          },
        },
        context: {
          timing: {
            start: absoluteStart,
            duration: duration,
          },
        },
        childrenData: wordComponents,
      };

      return captionContainer;
    },
  );

  const rootContainer: RenderableComponentData = {
    id: 'typokinetic-zigzag-container',
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
        duration: 10, // Will be auto-adjusted by system
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

const presetMetadata: PresetMetadata = {
  id: 'typokinetic-zigzag-flow',
  title: 'Typokinetic Zigzag Flow',
  description:
    'Dynamic kinetic typography preset with alternating directional slides creating a zigzag energy flow. Words snap in from left/right with rotation, overshoot, and elastic settling, mimicking handheld camera stabilization and whip-pan transitions. Perfect for music videos and energetic content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'zigzag',
    'alternating',
    'music-video',
    'whip-pan',
    'elastic',
    'rotation',
    'overshoot',
    'energetic',
    'captions',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello world from kinetic',
        start: 0,
        absoluteStart: 0,
        end: 2.5,
        absoluteEnd: 2.5,
        duration: 2.5,
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            absoluteStart: 0,
            end: 0.5,
            absoluteEnd: 0.5,
            duration: 0.5,
          },
          {
            id: 'word-2',
            text: 'world',
            start: 0.5,
            absoluteStart: 0.5,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 0.5,
          },
          {
            id: 'word-3',
            text: 'from',
            start: 1.0,
            absoluteStart: 1.0,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 0.5,
          },
          {
            id: 'word-4',
            text: 'kinetic',
            start: 1.5,
            absoluteStart: 1.5,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 1.0,
          },
        ],
      },
    ],
    fontSize: 48,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    wordSpacing: 12,
    animationDuration: 0.5,
    rotationAmount: 10,
    overshootAmount: 5,
    slideDistance: 120,
    position: 'center',
    defaultImpact: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const typokineticZigzagFlowPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
