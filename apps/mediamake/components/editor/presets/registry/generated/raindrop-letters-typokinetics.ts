/**
 * Raindrop Letters Typokinetics Preset
 *
 * A gentle typokinetic preset where text letters fall from above like soft raindrops.
 * Each letter starts from a random height above its final position with staggered timing,
 * creating a cascading waterfall effect. Letters feature:
 * - Random starting heights (-50px to -150px)
 * - Spring bounce easing when landing (subtle, like water droplets on a leaf)
 * - Slight blur during fall that clears on landing (simulating depth of field)
 * - Scale transformation (0.8 to 1.0) for depth perception
 * - Letter-level stagger (75ms between each) for cascading effect
 *
 * Features:
 * - Supports both direct text input and caption data integration
 * - GPU-accelerated animations (transform and opacity only)
 * - Word-level timing with letter-level stagger for captions
 * - Customizable text styling (font, color, size, weight)
 * - Configurable cascade timing and animation parameters
 *
 * Use cases:
 * - Creating gentle rain effects for titles
 * - Building organic, playful text animations
 * - Adding subtle motion to headings
 * - Creating depth-aware text reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  // Text input - either direct text or caption data
  text: z.string().optional().describe('Direct text input (letters will be split and animated)'),
  captions: z
    .array(
      z.object({
        text: z.string(),
        start: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        words: z.array(
          z.object({
            text: z.string(),
            start: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
          }),
        ),
      }),
    )
    .optional()
    .describe('Caption data with word-level timing for synchronized animations'),

  // Text styling
  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  fontSize: z.number().default(64).describe('Font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color (hex or rgba)'),
  letterSpacing: z.number().default(0).describe('Letter spacing in pixels (can be negative)'),

  // Animation timing
  letterDelayMin: z
    .number()
    .default(0.05)
    .describe('Minimum delay between letters in seconds (50ms default)'),
  letterDelayMax: z
    .number()
    .default(0.1)
    .describe('Maximum delay between letters in seconds (100ms default)'),
  fallDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the fall animation in seconds'),

  // Animation parameters
  fallHeightMin: z
    .number()
    .default(-50)
    .describe('Minimum starting height above final position in pixels'),
  fallHeightMax: z
    .number()
    .default(-150)
    .describe('Maximum starting height above final position in pixels'),
  scaleStart: z.number().default(0.8).describe('Starting scale value for depth effect'),
  scaleEnd: z.number().default(1.0).describe('Ending scale value'),
  blurAmount: z.number().default(2).describe('Blur amount during fall in pixels'),

  // Layout
  alignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Text alignment'),
  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical positioning on screen'),

  // Timing for direct text mode
  start: z.number().default(0).describe('Start time in seconds (for direct text mode)'),
  duration: z.number().default(5).describe('Duration in seconds (for direct text mode)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
  const fontParts = fontString.split(':');
  const fontFamily = fontParts[0];
  let fontWeight: number | undefined;
  let fontStyle: string | undefined;

  if (fontParts.length > 1) {
    fontWeight = parseInt(fontParts[1], 10);
  }
  if (fontParts.length > 2) {
    fontStyle = fontParts[2];
  }

  // Helper: Generate random value between min and max
  const randomBetween = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Create raindrop effect for a letter
  const createRaindropEffect = (
    letterId: string,
    effectStart: number,
    fallHeight: number,
  ) => {
    const effectId = `raindrop-${letterId}`;

    return {
      id: effectId,
      componentId: 'generic' as const,
      data: {
        type: 'spring' as const,
        start: effectStart,
        duration: params.fallDuration,
        mode: 'provider' as const,
        targetIds: [letterId],
        ranges: [
          // Opacity: fade in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 1 },
          // TranslateY: fall from above
          { key: 'translateY', val: fallHeight, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          // Scale: depth perception
          { key: 'scale', val: params.scaleStart, prog: 0 },
          { key: 'scale', val: params.scaleEnd, prog: 1 },
          // Blur: simulate depth of field
          { key: 'filter', val: `blur(${params.blurAmount}px)`, prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 0.7 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    };
  };

  // Determine alignment class
  const alignmentMap = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };
  const alignmentClass = alignmentMap[params.alignment];

  // Determine vertical positioning
  const verticalMap = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  };
  const verticalClass = verticalMap[params.verticalPosition];

  const childrenData: RenderableComponentData[] = [];

  // Process captions if provided
  if (params.captions && params.captions.length > 0) {
    params.captions.forEach((caption, captionIndex) => {
      const words = caption.words || [];

      words.forEach((word, wordIndex) => {
        const letters = word.text.split('');
        const wordId = `word-${captionIndex}-${wordIndex}`;

        const letterComponents: RenderableComponentData[] = [];

        letters.forEach((letter, letterIndex) => {
          const letterId = `letter-${captionIndex}-${wordIndex}-${letterIndex}`;
          const letterDelay = randomBetween(params.letterDelayMin, params.letterDelayMax);
          const fallHeight = randomBetween(params.fallHeightMin, params.fallHeightMax);

          // Effect starts at word.start + stagger
          const effectStart = word.start + letterIndex * letterDelay;

          const letterEffect = createRaindropEffect(letterId, effectStart, fallHeight);

          letterComponents.push({
            id: letterId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: letter,
              style: {
                fontSize: params.fontSize,
                color: params.textColor,
                fontWeight: fontWeight || 700,
                fontStyle: fontStyle || 'normal',
              },
              font: {
                family: fontFamily,
                weights: fontWeight ? [fontWeight.toString()] : ['700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [letterEffect],
          } as RenderableComponentData);
        });

        // Word container
        const wordContainer: RenderableComponentData = {
          id: wordId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-row items-end',
              style: {
                gap: params.letterSpacing > 0 ? `${params.letterSpacing}px` : undefined,
                marginRight: '0.3em',
                willChange: 'transform, opacity',
              },
            },
          },
          context: {
            timing: {
              start: word.start,
              duration: word.duration,
            },
          },
          childrenData: letterComponents,
        };

        childrenData.push(wordContainer);
      });
    });
  } else if (params.text) {
    // Direct text mode: split into letters
    const letters = params.text.split('');
    const letterComponents: RenderableComponentData[] = [];

    letters.forEach((letter, index) => {
      // Skip spaces but maintain them in layout
      if (letter === ' ') {
        letterComponents.push({
          id: `space-${index}`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              style: {
                width: '0.3em',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
          childrenData: [],
        } as RenderableComponentData);
        return;
      }

      const letterId = `letter-${index}`;
      const letterDelay = randomBetween(params.letterDelayMin, params.letterDelayMax);
      const fallHeight = randomBetween(params.fallHeightMin, params.fallHeightMax);

      const effectStart = index * letterDelay;
      const letterEffect = createRaindropEffect(letterId, effectStart, fallHeight);

      letterComponents.push({
        id: letterId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: letter,
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            fontWeight: fontWeight || 700,
            fontStyle: fontStyle || 'normal',
          },
          font: {
            family: fontFamily,
            weights: fontWeight ? [fontWeight.toString()] : ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [letterEffect],
      } as RenderableComponentData);
    });

    childrenData.push({
      id: 'text-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `flex flex-row items-end ${alignmentClass}`,
          style: {
            gap: params.letterSpacing > 0 ? `${params.letterSpacing}px` : undefined,
            willChange: 'transform, opacity',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: letterComponents,
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'raindrop-letters-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex flex-row ${verticalClass} ${alignmentClass} gap-1`,
        style: {
          willChange: 'transform, opacity',
        },
      },
    },
    context: {
      timing: {
        start: params.captions && params.captions.length > 0 ? params.captions[0].absoluteStart : params.start,
        duration:
          params.captions && params.captions.length > 0
            ? params.captions[params.captions.length - 1].absoluteStart +
              params.captions[params.captions.length - 1].duration -
              params.captions[0].absoluteStart
            : params.duration,
      },
    },
    childrenData,
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
  id: 'raindrop-letters-typokinetics',
  title: 'Raindrop Letters Typokinetics',
  description:
    'A gentle typokinetic preset where text letters fall from above like soft raindrops, each with individual timing tracks. Letters cascade with staggered delays (75ms between each), falling from random heights (-50px to -150px) with spring-bounce easing simulating water droplets landing on a leaf. Includes subtle blur during fall and scale transformation (0.8 to 1.0) for depth perception. Supports both direct text input and caption data integration for word-level timing with letter-level stagger.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'typokinetics',
    'text',
    'animation',
    'raindrop',
    'cascade',
    'fall',
    'spring',
    'bounce',
    'blur',
    'depth',
    'gentle',
    'organic',
    'playful',
    'letters',
    'stagger',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'RAINDROP LETTERS',
    font: 'Inter:700',
    fontSize: 64,
    textColor: '#FFFFFF',
    letterSpacing: 0,
    letterDelayMin: 0.05,
    letterDelayMax: 0.1,
    fallDuration: 1.2,
    fallHeightMin: -50,
    fallHeightMax: -150,
    scaleStart: 0.8,
    scaleEnd: 1.0,
    blurAmount: 2,
    alignment: 'center',
    verticalPosition: 'center',
    start: 0,
    duration: 5,
  },
};

// Export preset
export const raindropLettersTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
