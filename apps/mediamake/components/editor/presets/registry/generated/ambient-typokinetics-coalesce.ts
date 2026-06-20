/**
 * Ambient Typokinetics: Particle Coalesce Preset
 *
 * This preset creates an ambient typokinetics effect where words dissolve in like particles
 * coalescing from a completely dispersed state. Each word starts with blur(20px) and
 * letter-spacing(0.5em), then gradually pulls together while fading in. Features subtle
 * color shift from desaturated to full color using CSS filters.
 *
 * Features:
 * - **Particle Coalesce Effect**: Words start dispersed (blur + letter-spacing) and pull together
 * - **Duration Variance**: Keywords take 1.2s, regular words 0.8s
 * - **Color Shift**: Grayscale → full color with brightness adjustment
 * - **Depth Layers**: Staggered z-index with subtle parallax motion
 * - **Smooth Convergence**: Custom cubic-bezier easing
 * - **Modern Typography**: Space Grotesk font with optimized rendering
 *
 * Use cases:
 * - Creating ethereal thought-forming effects
 * - Abstract concept visualization
 * - Meditative/contemplative content
 * - Artistic typography animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

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
        metadata: z
          .object({
            keyword: z.string().optional(),
          })
          .passthrough()
          .optional(),
      }),
    )
    .describe('Array of caption objects with word-level timing'),

  font: z
    .string()
    .default('Space Grotesk:300')
    .describe(
      'Font family with optional weight (e.g., "Space Grotesk:300", "Inter:400")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(120)
    .default(48)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Final text color after coalescing'),

  keywordDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Animation duration for keyword words in seconds'),

  regularDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(0.8)
    .describe('Animation duration for regular words in seconds'),

  initialBlur: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .describe('Initial blur amount in pixels'),

  initialLetterSpacing: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Initial letter spacing in em units'),

  finalLetterSpacing: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.02)
    .describe('Final letter spacing in em units'),

  position: z
    .enum(['center', 'bottom', 'top'])
    .default('center')
    .describe('Vertical position of text on screen'),

  verticalOffset: z
    .number()
    .min(-500)
    .max(500)
    .default(0)
    .describe('Vertical offset from position in pixels'),

  wordSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .describe('Spacing between words in pixels'),

  parallaxIntensity: z
    .number()
    .min(0)
    .max(100)
    .default(15)
    .describe('Parallax motion intensity in pixels'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    keywordDuration,
    regularDuration,
    initialBlur,
    initialLetterSpacing,
    finalLetterSpacing,
    position,
    verticalOffset,
    wordSpacing,
    parallaxIntensity,
  } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = font || 'Space Grotesk:300';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Position mapping
  const positionStyles: Record<string, React.CSSProperties> = {
    center: {
      top: '50%',
      transform: `translateY(calc(-50% + ${verticalOffset}px))`,
    },
    bottom: {
      bottom: `${80 + verticalOffset}px`,
    },
    top: {
      top: `${80 + verticalOffset}px`,
    },
  };

  // Create components for all captions
  const captionComponents: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      const words = caption.words;

      // Create word components
      const wordComponents: RenderableComponentData[] = words.map(
        (word, wordIndex) => {
          const wordId = `word-${captionIndex}-${wordIndex}`;

          // Check if this word is a keyword
          const isKeyword =
            caption.metadata?.keyword &&
            word.text.toLowerCase() ===
              caption.metadata.keyword.toLowerCase();

          // Determine animation duration
          const animDuration = isKeyword ? keywordDuration : regularDuration;

          // Calculate z-index based on word position (creates depth)
          const zIndex = 10 + wordIndex * 2;

          // Calculate parallax offset based on z-index
          const parallaxOffset = (zIndex - 10) * (parallaxIntensity / 20);

          // Create word effect - coalescing animation
          const wordEffect: {
            id: string;
            componentId: string;
            data: GenericEffectData;
          } = {
            id: `coalesce-effect-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'cubic-bezier' as any, // Custom easing
              start: word.start,
              duration: animDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                // Opacity: fade in
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.6 },

                // Blur: dispersed → sharp
                { key: 'blur', val: `${initialBlur}px`, prog: 0 },
                { key: 'blur', val: '0px', prog: 1 },

                // Letter spacing: dispersed → tight
                {
                  key: 'letterSpacing',
                  val: `${initialLetterSpacing}em`,
                  prog: 0,
                },
                { key: 'letterSpacing', val: `${finalLetterSpacing}em`, prog: 1 },

                // Grayscale: desaturated → full color
                { key: 'grayscale', val: 1, prog: 0 },
                { key: 'grayscale', val: 0, prog: 1 },

                // Brightness: dim → full
                { key: 'brightness', val: 0.5, prog: 0 },
                { key: 'brightness', val: 1, prog: 1 },

                // Parallax motion: subtle vertical movement
                { key: 'translateY', val: parallaxOffset, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          };

          // Create word component
          const wordComponent: RenderableComponentData = {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                ...fontStyle,
                marginRight: '0.3em',
                zIndex: zIndex,
                willChange: 'opacity, filter, letter-spacing, transform',
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['300'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [wordEffect],
          };

          return wordComponent;
        },
      );

      // Create caption container
      const captionContainer: RenderableComponentData = {
        id: `caption-container-${captionIndex}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute left-0 right-0 flex flex-row flex-wrap items-center justify-center px-8',
            style: {
              ...positionStyles[position],
              gap: `${wordSpacing}px`,
              perspective: '1000px', // Enable 3D transforms
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

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'ambient-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gradient-to-b from-gray-900 to-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10,
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

// --- Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'ambient-typokinetics-coalesce',
  title: 'Ambient Typokinetics: Particle Coalesce',
  description:
    'Ambient typokinetics preset where words dissolve in like particles coalescing from dispersed states. Features blur-to-focus transitions, letter spacing contraction, desaturated-to-full color shifts, depth layers with parallax motion, and duration variance based on keyword importance. Creates an ethereal effect of thoughts forming from abstract concepts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'captions',
    'ambient',
    'typokinetics',
    'particles',
    'coalesce',
    'blur',
    'letter-spacing',
    'grayscale',
    'parallax',
    'depth',
    'ethereal',
    'modern',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Thoughts forming from abstract concepts',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Thoughts',
            start: 0,
            absoluteStart: 0,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.8,
            confidence: 0.95,
          },
          {
            id: 'word-2',
            text: 'forming',
            start: 0.8,
            absoluteStart: 0.8,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 0.7,
            confidence: 0.95,
          },
          {
            id: 'word-3',
            text: 'from',
            start: 1.5,
            absoluteStart: 1.5,
            end: 1.9,
            absoluteEnd: 1.9,
            duration: 0.4,
            confidence: 0.95,
          },
          {
            id: 'word-4',
            text: 'abstract',
            start: 1.9,
            absoluteStart: 1.9,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 0.6,
            confidence: 0.95,
          },
          {
            id: 'word-5',
            text: 'concepts',
            start: 2.5,
            absoluteStart: 2.5,
            end: 3,
            absoluteEnd: 3,
            duration: 0.5,
            confidence: 0.95,
          },
        ],
        metadata: {
          keyword: 'Thoughts',
        },
      },
    ],
    font: 'Space Grotesk:300',
    fontSize: 48,
    textColor: '#FFFFFF',
    keywordDuration: 1.2,
    regularDuration: 0.8,
    initialBlur: 20,
    initialLetterSpacing: 0.5,
    finalLetterSpacing: 0.02,
    position: 'center',
    verticalOffset: 0,
    wordSpacing: 20,
    parallaxIntensity: 15,
  },
};

// --- Export ---
export const ambientTypokineticsCoalescePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
