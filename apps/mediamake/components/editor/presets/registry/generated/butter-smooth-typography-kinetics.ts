/**
 * Butter-Smooth Typography Kinetics Preset
 *
 * Premium typography preset featuring luxurious ease-in-out animations with sophisticated motion.
 * Each word flows in with butter-smooth kinetics, scaling from 0.85 to 1.0, fading from opacity 0 to 1,
 * and transitioning from a 5px blur to sharp clarity. Words cascade with 100ms stagger delays,
 * creating a premium video title aesthetic with subtle overshoot and satisfying settling.
 *
 * Features:
 * - **Butter-Smooth Curves**: Cubic-bezier(0.25, 0.46, 0.45, 0.94) easing for luxurious motion
 * - **Multi-Property Animation**: Simultaneous opacity, scale, and blur transitions
 * - **Cascading Reveal**: 100ms stagger between words for flowing reveal effect
 * - **GPU Acceleration**: Transform-gpu and will-change-transform for smooth performance
 * - **Premium Feel**: Settling animation with subtle overshoot for high-end motion graphics
 *
 * Use cases:
 * - Premium video titles and intros
 * - High-end motion graphics text reveals
 * - Sophisticated caption animations
 * - Luxury brand content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  captionData: z
    .object({
      id: z.string().describe('Caption ID'),
      text: z.string().describe('Full caption text'),
      start: z.number().describe('Caption start time (relative)'),
      duration: z.number().describe('Caption duration'),
      absoluteStart: z.number().describe('Caption absolute start in timeline'),
      words: z
        .array(
          z.object({
            text: z.string().describe('Word text'),
            start: z.number().describe('Word start time (relative to caption)'),
            duration: z.number().describe('Word duration'),
            absoluteStart: z
              .number()
              .describe('Word absolute start in timeline'),
          }),
        )
        .describe('Array of word objects with timing'),
    })
    .describe('Caption data with words array for word-level animation'),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels for text display'),

  fontFamily: z
    .string()
    .default('Inter:600')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600", "Roboto:700:italic")',
    ),

  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color in hex or CSS color format'),

  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .optional()
    .describe('Delay in seconds between each word animation (stagger timing)'),

  animationDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .optional()
    .describe('Duration in seconds for each word animation'),

  easingCurve: z
    .string()
    .default('cubic-bezier(0.25, 0.46, 0.45, 0.94)')
    .optional()
    .describe('CSS cubic-bezier easing curve for butter-smooth animation'),

  containerPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of the text container'),

  containerGap: z
    .number()
    .min(0)
    .max(100)
    .default(16)
    .optional()
    .describe('Gap in pixels between words'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captionData,
    fontSize = 48,
    fontFamily = 'Inter:600',
    textColor = '#ffffff',
    staggerDelay = 0.1,
    animationDuration = 0.8,
    easingCurve = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    containerPosition = 'center',
    containerGap = 16,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontParts = fontString.split(':');
    const family = fontParts[0];
    const weight = fontParts.length > 1 ? parseInt(fontParts[1], 10) : 600;
    const style =
      fontParts.length > 2
        ? (fontParts[2] as 'normal' | 'italic')
        : 'normal';
    return { family, weight, style };
  };

  const fontConfig = parseFontString(fontFamily);

  // Container positioning classes
  const positionClass =
    containerPosition === 'top'
      ? 'justify-start pt-20'
      : containerPosition === 'bottom'
        ? 'justify-end pb-20'
        : 'justify-center';

  // Create word components with butter-smooth effects
  const wordComponents: RenderableComponentData[] = captionData.words.map(
    (word, index) => {
      const wordId = `butter-word-${captionData.id}-${index}`;

      // Calculate staggered effect start time
      const effectStart = word.start + index * staggerDelay;

      // Create butter-smooth effect with multi-property animation
      const butterSmoothEffect = {
        id: `butter-smooth-effect-${wordId}`,
        componentId: 'generic',
        data: {
          type: easingCurve as any,
          start: effectStart,
          duration: animationDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Opacity: 0 → 1
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            // Scale: 0.85 → 1.0
            { key: 'scale', val: 0.85, prog: 0 },
            { key: 'scale', val: 1.0, prog: 1 },
            // Blur: 5px → 0px
            { key: 'filter', val: 'blur(5px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      };

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'transform-gpu will-change-transform',
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontConfig.weight,
            fontStyle: fontConfig.style,
            color: textColor,
          },
          font: {
            family: fontConfig.family,
            weights: [fontConfig.weight.toString()],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: captionData.duration,
          },
        },
        effects: [butterSmoothEffect],
      } as RenderableComponentData;
    },
  );

  // Root container with flex layout
  const rootContainer: RenderableComponentData = {
    id: `butter-smooth-container-${captionData.id}`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `flex flex-col items-center ${positionClass} w-full h-full`,
      },
    },
    context: {
      timing: {
        start: captionData.absoluteStart,
        duration: captionData.duration,
      },
    },
    childrenData: [
      {
        id: `butter-smooth-words-container-${captionData.id}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-wrap items-center justify-center',
            style: {
              gap: `${containerGap}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: captionData.duration,
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData,
    ],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'butter-smooth-typography-kinetics',
  title: 'Butter-Smooth Typography Kinetics',
  description:
    'Premium typography kinetics preset with luxurious ease-in-out animations. Each word flows in with butter-smooth motion, featuring simultaneous opacity fade (0→1), scale transformation (0.85→1.0), and blur-to-sharp transition (5px→0px). Words cascade with 100ms stagger delays, creating a satisfying settling effect with subtle overshoot. Optimized with GPU acceleration for high-end motion graphics quality.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetics',
    'butter-smooth',
    'premium',
    'motion-graphics',
    'stagger',
    'cascade',
    'ease-in-out',
    'gpu-accelerated',
    'luxury',
  ],
  defaultInputParams: {
    captionData: {
      id: 'caption-1',
      text: 'Flowing words with butter smooth motion',
      start: 0,
      duration: 5,
      absoluteStart: 0,
      words: [
        { text: 'Flowing', start: 0, duration: 0.8, absoluteStart: 0 },
        { text: 'words', start: 0.8, duration: 0.6, absoluteStart: 0.8 },
        { text: 'with', start: 1.4, duration: 0.4, absoluteStart: 1.4 },
        { text: 'butter', start: 1.8, duration: 0.7, absoluteStart: 1.8 },
        { text: 'smooth', start: 2.5, duration: 0.8, absoluteStart: 2.5 },
        { text: 'motion', start: 3.3, duration: 0.9, absoluteStart: 3.3 },
      ],
    },
    fontSize: 48,
    fontFamily: 'Inter:600',
    textColor: '#ffffff',
    staggerDelay: 0.1,
    animationDuration: 0.8,
    easingCurve: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    containerPosition: 'center',
    containerGap: 16,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const butterSmoothTypographyKineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
