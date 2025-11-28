/**
 * Cinematic Title Reveal Preset
 *
 * This preset creates a premium cinematic title reveal with smooth 3D Y-axis rotation.
 * Text rotates from -90deg (perpendicular to camera) to 0deg (facing camera) while
 * simultaneously fading in from 0 to 100% opacity, creating a film credit sequence effect.
 *
 * Features:
 * - **3D Y-axis Rotation**: Text pivots from perpendicular to facing camera (-90deg → 0deg)
 * - **Perspective Depth**: Uses preserve-3d transform style for dimensional depth
 * - **Simultaneous Fade**: Opacity animates from 0 to 1 alongside rotation
 * - **Cascading Reveal**: Word-by-word staggered delays (100-200ms) for sequential effect
 * - **Animated Text Shadow**: Shadow evolves from transparent to visible for 3D illusion
 * - **Luxurious Timing**: Ease-out curve over 1200-1500ms per word for premium feel
 * - **Safe Overflow Handling**: Container clips text during rotation to prevent visual glitches
 *
 * Use cases:
 * - Creating film-style title sequences
 * - Building premium brand reveals
 * - Adding professional credit roll effects
 * - Cinematic intro/outro text animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

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
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing data'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (CSS color value)'),

  effectDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .optional()
    .describe('Duration of rotation-fade effect per word (seconds)'),

  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.15)
    .optional()
    .describe('Delay between each word animation start (seconds)'),

  easingType: z
    .enum(['ease-out', 'ease-in-out', 'spring'])
    .default('ease-out')
    .optional()
    .describe('Easing curve for animation'),

  perspective: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .optional()
    .describe('CSS perspective value for 3D depth (pixels)'),

  rotationStart: z
    .number()
    .min(-180)
    .max(0)
    .default(-90)
    .optional()
    .describe('Starting Y-axis rotation angle (degrees, negative values)'),

  rotationEnd: z
    .number()
    .min(0)
    .max(180)
    .default(0)
    .optional()
    .describe('Ending Y-axis rotation angle (degrees)'),

  textShadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Text shadow opacity intensity (0-1)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font = 'Inter:700',
    fontSize = 48,
    textColor = '#ffffff',
    effectDuration = 1.2,
    staggerDelay = 0.15,
    easingType = 'ease-out',
    perspective = 1000,
    rotationStart = -90,
    rotationEnd = 0,
    textShadowIntensity = 0.3,
  } = params;

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

  // Create word components with rotation-fade effects
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption) => {
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `word-${caption.id}-${wordIndex}`;

          // Create rotation-fade effect for this word
          const effectData: GenericEffectData = {
            type: easingType,
            start: word.start + wordIndex * staggerDelay, // Staggered start
            duration: effectDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              // Y-axis rotation: -90deg → 0deg
              { key: 'rotateY', val: rotationStart, prog: 0 },
              { key: 'rotateY', val: rotationEnd, prog: 1 },
              // Opacity: 0 → 1
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              // Text shadow: transparent → visible
              {
                key: 'textShadow',
                val: '0 0 0 transparent',
                prog: 0,
              },
              {
                key: 'textShadow',
                val: `2px 2px 8px rgba(0,0,0,${textShadowIntensity})`,
                prog: 1,
              },
            ],
          };

          const effect = {
            id: `effect-${wordId}`,
            componentId: 'generic',
            data: effectData,
          };

          // Word TextAtom
          const wordComponent: RenderableComponentData = {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                marginRight: '0.3em',
                transformStyle: 'preserve-3d',
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
                start: 0, // All words start together (relative to caption)
                duration: caption.duration, // All words last for full caption duration
              },
            },
            effects: [effect],
          };

          return wordComponent;
        },
      );

      // Caption container with perspective
      const captionContainer: RenderableComponentData = {
        id: `caption-container-${caption.id}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row flex-wrap items-center justify-center',
            style: {
              transformStyle: 'preserve-3d',
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

      return captionContainer;
    },
  );

  // Root container with perspective and overflow hidden
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-title-reveal-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full flex items-center justify-center overflow-hidden',
        style: {
          perspective: `${perspective}px`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: Math.max(
          ...captions.map((c) => c.absoluteEnd),
          10, // Minimum 10s
        ),
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

// --- Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'cinematicTitleReveal',
  title: 'Cinematic Title Reveal',
  description:
    'Cinematic 3D Y-axis rotation title reveal with cascading word animations. Text rotates from -90deg (perpendicular) to 0deg (facing camera) with simultaneous fade-in, creating a premium film credit sequence effect. Features perspective depth, staggered word delays (100-200ms), animated text-shadow, and luxurious ease-out timing over 1.2-1.5 seconds per word.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'cinematic',
    'title',
    'reveal',
    '3d',
    'rotation',
    'fade',
    'perspective',
    'cascade',
    'premium',
    'film',
    'credits',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Cinematic Title',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-0',
            text: 'Cinematic',
            start: 0,
            absoluteStart: 0,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 1.5,
          },
          {
            id: 'word-1',
            text: 'Title',
            start: 1.5,
            absoluteStart: 1.5,
            end: 3,
            absoluteEnd: 3,
            duration: 1.5,
          },
        ],
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#ffffff',
    effectDuration: 1.2,
    staggerDelay: 0.15,
    easingType: 'ease-out',
    perspective: 1000,
    rotationStart: -90,
    rotationEnd: 0,
    textShadowIntensity: 0.3,
  },
};

// --- Export ---

export const cinematicTitleRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
