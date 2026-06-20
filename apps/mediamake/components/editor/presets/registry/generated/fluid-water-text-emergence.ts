/**
 * Fluid Water Text Emergence Preset
 *
 * This preset creates a water-like text animation where words flow into view with organic Y-axis rotation,
 * as if emerging from liquid. Features a wave-like undulating motion (30deg → -10deg → 5deg → 0deg),
 * vertical float effect, gradual opacity fade-in mimicking text surfacing from depths, and blur-to-focus
 * transition for underwater distortion. Includes subtle scale breathing motion for added fluidity.
 *
 * Features:
 * - **Organic Y-axis Rotation**: Undulating wave motion with spring easing
 * - **Vertical Float Effect**: Text appears to rise through water (translateY: 20px → -5px → 0px)
 * - **Gradual Opacity Fade**: Mimics text surfacing from depths (0 → 0.6 → 1)
 * - **Blur-to-Focus Transition**: Underwater distortion effect (8px → 0px)
 * - **Subtle Scale Breathing**: Scale effect for organic motion (0.95 → 1.02 → 1)
 * - **Fluid Continuity**: 200ms overlap between words using spring easing
 * - **Perspective Container**: 800px perspective for 3D rotation effects
 *
 * Use cases:
 * - Creating water-themed text animations
 * - Building fluid, organic text reveals
 * - Adding liquid motion effects to titles
 * - Creating underwater-style text emergence
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
    .describe('Array of caption sentences with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(12)
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
    .max(5)
    .default(1.8)
    .optional()
    .describe('Duration of the water emergence effect in seconds'),

  wordOverlap: z
    .number()
    .min(0)
    .max(1000)
    .default(200)
    .optional()
    .describe('Overlap time between words in milliseconds for fluid continuity'),

  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of text on screen'),

  textShadow: z
    .string()
    .optional()
    .default('0 2px 8px rgba(0,0,0,0.3)')
    .describe('Text shadow for better visibility'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    effectDuration,
    wordOverlap,
    position,
    textShadow,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
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

  // Position configuration
  const getPositionClass = () => {
    switch (position) {
      case 'top':
        return 'items-start pt-20';
      case 'bottom':
        return 'items-end pb-20';
      case 'center':
      default:
        return 'items-center';
    }
  };

  // Generate all caption containers
  const captionContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const words = caption.words;

    // Generate word components with fluid water effects
    const wordComponents: RenderableComponentData[] = words.map(
      (word, wordIndex) => {
        const wordId = `water-word-${captionIndex}-${wordIndex}`;
        const effectId = `water-effect-${captionIndex}-${wordIndex}`;

        // Calculate effect start time (with overlap for fluid continuity)
        const effectStart = Math.max(0, word.start - wordOverlap / 1000);

        // Create fluid water emergence effect
        const waterEffect = {
          id: effectId,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: effectStart,
            duration: effectDuration || 1.8,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              // Organic Y-axis rotation (wave-like undulation)
              { key: 'rotateY', val: 30, prog: 0 },
              { key: 'rotateY', val: -10, prog: 0.35 },
              { key: 'rotateY', val: 5, prog: 0.65 },
              { key: 'rotateY', val: 0, prog: 1 },

              // Vertical float effect (rising through water)
              { key: 'translateY', val: 20, prog: 0 },
              { key: 'translateY', val: -5, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 1 },

              // Gradual opacity fade (surfacing from depths)
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.4 },
              { key: 'opacity', val: 1, prog: 1 },

              // Blur-to-focus transition (underwater distortion)
              { key: 'blur', val: 8, prog: 0 },
              { key: 'blur', val: 3, prog: 0.3 },
              { key: 'blur', val: 0, prog: 1 },

              // Subtle scale breathing motion
              { key: 'scale', val: 0.95, prog: 0 },
              { key: 'scale', val: 1.02, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        };

        return {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: `${fontSize}px`,
              color: textColor,
              textShadow: textShadow,
              marginRight: '0.3em',
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
              start: 0,
              duration: caption.duration,
            },
          },
          effects: [waterEffect],
        } as RenderableComponentData;
      },
    );

    // Create words container layout
    const wordsContainer: RenderableComponentData = {
      id: `water-words-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-wrap items-center justify-center gap-2',
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

    // Create caption container with perspective
    const captionContainer: RenderableComponentData = {
      id: `water-caption-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `relative w-full h-full flex ${getPositionClass()} justify-center`,
          style: {
            perspective: '800px',
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
    id: 'fluid-water-text-emergence-root',
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
        duration:
          captions.length > 0
            ? captions[captions.length - 1].absoluteEnd
            : 10,
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
  id: 'fluid-water-text-emergence',
  title: 'Fluid Water Text Emergence',
  description:
    'Water-like preset where text flows into view with organic Y-axis rotation undulation (30deg → -10deg → 5deg → 0deg), vertical float effect (translateY), gradual opacity fade-in, blur-to-focus transition mimicking underwater distortion, and subtle scale breathing motion. Features wave-like motion with spring easing and 200ms word overlap for fluid continuity.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'water',
    'fluid',
    'organic',
    'wave',
    'undulate',
    'float',
    'blur',
    'emergence',
    'spring',
    '3d',
    'rotation',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Text emerges from liquid depths',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Text',
            start: 0,
            absoluteStart: 0,
            end: 0.5,
            absoluteEnd: 0.5,
            duration: 0.5,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'emerges',
            start: 0.5,
            absoluteStart: 0.5,
            end: 1.2,
            absoluteEnd: 1.2,
            duration: 0.7,
            confidence: 1,
          },
          {
            id: 'word-3',
            text: 'from',
            start: 1.2,
            absoluteStart: 1.2,
            end: 1.6,
            absoluteEnd: 1.6,
            duration: 0.4,
            confidence: 1,
          },
          {
            id: 'word-4',
            text: 'liquid',
            start: 1.6,
            absoluteStart: 1.6,
            end: 2.2,
            absoluteEnd: 2.2,
            duration: 0.6,
            confidence: 1,
          },
          {
            id: 'word-5',
            text: 'depths',
            start: 2.2,
            absoluteStart: 2.2,
            end: 3,
            absoluteEnd: 3,
            duration: 0.8,
            confidence: 1,
          },
        ],
        metadata: {},
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#ffffff',
    effectDuration: 1.8,
    wordOverlap: 200,
    position: 'center',
    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const fluidWaterTextEmergencePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
