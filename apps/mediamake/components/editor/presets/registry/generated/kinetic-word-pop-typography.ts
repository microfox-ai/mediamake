/**
 * Kinetic Typography Word Pop Preset
 *
 * This preset creates dynamic kinetic typography with word-by-word animations featuring:
 * - Spring-like bounce effect with overshoot (scale: 0.9 → 1.02 → 1.0)
 * - Blur-to-sharp transition (2px blur to 0) for depth-of-field effect
 * - Staggered word animations with 60ms delay between words
 * - Emphasis effects for keywords (metadata.keyword) or high-impact words (metadata.impact > 0.7)
 * - Responsive multi-line support with flexible layout
 * - Custom cubic-bezier easing for smooth bounce animation
 *
 * Features:
 * - **Word-by-word Animation**: Each word pops in with spring bounce effect
 * - **Blur Transition**: Simulates depth of field as text comes into focus
 * - **Staggered Timing**: Creates cascading animation across words
 * - **Keyword Emphasis**: Stronger effects for important words
 * - **Multi-line Support**: Gracefully handles single-line and multi-line text
 * - **Performance Optimized**: Combines transforms and uses GPU-accelerated filters
 *
 * Use cases:
 * - Energetic captions for social media content
 * - Modern title sequences
 * - Dynamic text overlays for music videos
 * - Kinetic typography for tech/gaming content
 * - Playful subtitle animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  captionData: z
    .array(
      z.object({
        id: z.string().describe('Unique caption ID'),
        text: z.string().describe('Full caption text'),
        start: z.number().describe('Relative start time (relative to caption start)'),
        end: z.number().describe('Relative end time'),
        duration: z.number().describe('Caption duration'),
        absoluteStart: z.number().describe('Absolute start in caption timeline (scene-relative)'),
        absoluteEnd: z.number().describe('Absolute end in caption timeline'),
        words: z.array(
          z.object({
            text: z.string().describe('Word text'),
            start: z.number().describe('Relative start time (relative to caption)'),
            end: z.number().describe('Relative end time'),
            duration: z.number().describe('Word duration'),
            absoluteStart: z.number().describe('Absolute start in caption timeline'),
            absoluteEnd: z.number().describe('Absolute end in caption timeline'),
          }),
        ),
        metadata: z
          .object({
            keyword: z
              .union([z.string(), z.boolean()])
              .optional()
              .describe('Keyword to highlight (string or boolean)'),
            impact: z
              .number()
              .min(0.1)
              .max(3)
              .optional()
              .describe('Effect intensity multiplier (0.1-3.0)'),
          })
          .optional()
          .describe('Optional metadata for emphasis'),
      }),
    )
    .describe('Array of caption objects with word-level timing'),

  // Styling parameters
  fontSize: z
    .number()
    .min(16)
    .max(120)
    .default(48)
    .describe('Base font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (format: "FontName" or "FontName:weight:style")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  fontWeight: z
    .union([z.string(), z.number()])
    .default('700')
    .describe('Font weight (e.g., "400", "700", 700)'),

  // Animation parameters
  animationDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.5)
    .describe('Duration of word animation in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.06)
    .describe('Delay between word animations in seconds'),

  // Effect intensity
  normalScale: z
    .object({
      start: z.number().default(0.9).describe('Starting scale for normal words'),
      peak: z.number().default(1.02).describe('Peak scale (overshoot) for normal words'),
      end: z.number().default(1.0).describe('Final scale for normal words'),
    })
    .default({ start: 0.9, peak: 1.02, end: 1.0 })
    .describe('Scale keyframes for normal words'),
  emphasisScale: z
    .object({
      start: z.number().default(0.85).describe('Starting scale for emphasis words'),
      peak: z.number().default(1.08).describe('Peak scale (overshoot) for emphasis words'),
      end: z.number().default(1.0).describe('Final scale for emphasis words'),
    })
    .default({ start: 0.85, peak: 1.08, end: 1.0 })
    .describe('Scale keyframes for emphasis words'),

  normalBlur: z
    .object({
      start: z.string().default('2px').describe('Starting blur for normal words'),
      end: z.string().default('0px').describe('Final blur for normal words'),
    })
    .default({ start: '2px', end: '0px' })
    .describe('Blur values for normal words'),
  emphasisBlur: z
    .object({
      start: z.string().default('3px').describe('Starting blur for emphasis words'),
      end: z.string().default('0px').describe('Final blur for emphasis words'),
    })
    .default({ start: '3px', end: '0px' })
    .describe('Blur values for emphasis words'),

  // Layout parameters
  containerClassName: z
    .string()
    .default('flex flex-wrap items-baseline justify-start max-w-4xl mx-auto px-4')
    .describe('Tailwind classes for container layout'),
  wordSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Gap between words in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captionData,
    fontSize,
    fontFamily,
    textColor,
    fontWeight,
    animationDuration,
    staggerDelay,
    normalScale,
    emphasisScale,
    normalBlur,
    emphasisBlur,
    containerClassName,
    wordSpacing,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontParts = fontString.split(':');
    const family = fontParts[0];
    const fontStyle: React.CSSProperties = {};
    let weights: string[] = [];

    if (fontParts.length > 2) {
      // Has style
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
      weights = [fontParts[1]];
    } else if (fontParts.length > 1) {
      // Has weight only
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
      weights = [fontParts[1]];
    }

    return { family, fontStyle, weights };
  };

  const { family: parsedFontFamily, fontStyle: parsedFontStyle, weights: parsedWeights } = parseFontString(fontFamily);

  // Helper: Check if word should have emphasis
  const shouldEmphasize = (caption: any, wordText: string): boolean => {
    if (!caption.metadata) return false;

    // Check keyword match
    if (caption.metadata.keyword) {
      const keyword = typeof caption.metadata.keyword === 'string' 
        ? caption.metadata.keyword 
        : '';
      if (keyword && wordText.toLowerCase().includes(keyword.toLowerCase())) {
        return true;
      }
    }

    // Check impact threshold
    if (caption.metadata.impact !== undefined && caption.metadata.impact > 0.7) {
      return true;
    }

    return false;
  };

  // Create caption containers
  const captionContainers: RenderableComponentData[] = [];

  captionData.forEach((caption, captionIndex) => {
    const wordComponents: RenderableComponentData[] = [];

    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const isEmphasis = shouldEmphasize(caption, word.text);

      // Choose scale and blur based on emphasis
      const scale = isEmphasis ? emphasisScale : normalScale;
      const blur = isEmphasis ? emphasisBlur : normalBlur;
      const duration = isEmphasis ? animationDuration * 1.2 : animationDuration;

      // Create word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: isEmphasis ? 'bold' : fontWeight,
            color: textColor,
            ...parsedFontStyle,
          },
          font: {
            family: parsedFontFamily,
            weights: parsedWeights.length > 0 ? parsedWeights : [String(fontWeight)],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: 0, // All words start together (sentence-level timing)
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `word-pop-effect-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'cubic-bezier',
              easingParams: [0.68, -0.55, 0.265, 1.55], // Bounce easing
              start: word.start + wordIndex * staggerDelay, // Relative to caption start + stagger
              duration: duration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                // Scale animation with overshoot
                { key: 'scale', val: scale.start, prog: 0 },
                { key: 'scale', val: scale.peak, prog: 0.7 },
                { key: 'scale', val: scale.end, prog: 1 },
                // Blur-to-sharp transition
                { key: 'filter:blur', val: blur.start, prog: 0 },
                { key: 'filter:blur', val: blur.end, prog: 1 },
              ],
            },
          },
        ],
      };

      wordComponents.push(wordComponent);
    });

    // Create caption container
    const captionContainer: RenderableComponentData = {
      id: `caption-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: containerClassName,
          style: {
            gap: `${wordSpacing}px`,
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

    captionContainers.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'kinetic-word-pop-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this', // Fit to children duration
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'kinetic-word-pop-typography',
  title: 'Kinetic Typography Word Pop',
  description:
    'Dynamic kinetic typography preset featuring word-by-word scale animations with spring-like bounce (overshoot principle), combined with blur-to-sharp transitions. Each word scales from 90% to 102% before settling at 100%, with simultaneous 2px to 0px blur, creating a playful "popping forward" effect. Supports single-line and multi-line responsive layouts with staggered timing and emphasis for high-impact keywords.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'word-pop',
    'bounce',
    'overshoot',
    'blur',
    'caption',
    'subtitle',
    'animated',
    'stagger',
    'emphasis',
    'responsive',
    'multi-line',
  ],
  defaultInputParams: {
    captionData: [
      {
        id: 'caption-1',
        text: 'Hello world from kinetic typography',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            text: 'Hello',
            start: 0,
            end: 0.5,
            duration: 0.5,
            absoluteStart: 0,
            absoluteEnd: 0.5,
          },
          {
            text: 'world',
            start: 0.5,
            end: 1.0,
            duration: 0.5,
            absoluteStart: 0.5,
            absoluteEnd: 1.0,
          },
          {
            text: 'from',
            start: 1.0,
            end: 1.3,
            duration: 0.3,
            absoluteStart: 1.0,
            absoluteEnd: 1.3,
          },
          {
            text: 'kinetic',
            start: 1.3,
            end: 1.8,
            duration: 0.5,
            absoluteStart: 1.3,
            absoluteEnd: 1.8,
          },
          {
            text: 'typography',
            start: 1.8,
            end: 3.0,
            duration: 1.2,
            absoluteStart: 1.8,
            absoluteEnd: 3.0,
          },
        ],
        metadata: {
          keyword: 'kinetic',
          impact: 1.0,
        },
      },
    ],
    fontSize: 48,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    fontWeight: '700',
    animationDuration: 0.5,
    staggerDelay: 0.06,
    normalScale: { start: 0.9, peak: 1.02, end: 1.0 },
    emphasisScale: { start: 0.85, peak: 1.08, end: 1.0 },
    normalBlur: { start: '2px', end: '0px' },
    emphasisBlur: { start: '3px', end: '0px' },
    containerClassName: 'flex flex-wrap items-baseline justify-start max-w-4xl mx-auto px-4',
    wordSpacing: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const kineticWordPopTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
