/**
 * Digital Glitch Pop Text Preset
 *
 * A sharp, snappy text animation preset that combines clean scaling with micro-glitch effects.
 * Text scales from 0 to 100% with 2-3 controlled "digital hiccups" during the animation -
 * brief moments where scale jumps to 95% or 105% for single frames, creating a glitch aesthetic.
 * Includes subtle RGB color channel separation during glitch moments.
 *
 * Features:
 * - Clean 0-100% scale animation with micro-glitch interruptions
 * - RGB color channel separation during glitch moments (drop-shadow effects)
 * - Linear easing between glitch points for sharp digital transitions
 * - Fast 0.5 second duration for punchy feel
 * - Configurable intensity parameter to control glitch frequency and amplitude
 * - Caption-based implementation with synchronized glitch moments across all visible words
 *
 * Perfect for:
 * - Tech content and digital storytelling
 * - Gaming videos and esports content
 * - Cyberpunk aesthetics
 * - Modern brand presentations
 * - Any content requiring a digital/glitch aesthetic
 *
 * Technical approach:
 * - Uses generic effect with precise keyframe timing
 * - Glitch keyframes at 30%, 32%, 34% (first glitch), and 70% (second glitch)
 * - RGB split filter applied only during glitch frames
 * - All words in caption share synchronized timing for cohesive effect
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
        id: z.string().describe('Caption ID'),
        text: z.string().describe('Caption text'),
        start: z.number().describe('Relative start time'),
        end: z.number().describe('Relative end time'),
        duration: z.number().describe('Caption duration'),
        absoluteStart: z.number().describe('Absolute start in scene'),
        absoluteEnd: z.number().describe('Absolute end in scene'),
        words: z
          .array(
            z.object({
              id: z.string().optional().describe('Word ID'),
              text: z.string().describe('Word text'),
              start: z.number().describe('Relative start time'),
              end: z.number().describe('Relative end time'),
              duration: z.number().describe('Word duration'),
              absoluteStart: z.number().describe('Absolute start in scene'),
              absoluteEnd: z.number().describe('Absolute end in scene'),
              confidence: z.number().optional().describe('Confidence score'),
            }),
          )
          .describe('Array of word objects'),
        metadata: z
          .record(z.string(), z.any())
          .optional()
          .describe('Optional caption metadata'),
      }),
    )
    .describe('Array of caption objects with word-level timing'),

  intensity: z
    .number()
    .min(0.1)
    .max(3.0)
    .default(1.0)
    .optional()
    .describe(
      'Intensity multiplier for glitch effects (0.1 = subtle, 1.0 = default, 3.0 = extreme)',
    ),

  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(64)
    .optional()
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (hex or rgba)'),

  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe(
      'Font family with optional weight (e.g., "Inter:700", "Roboto:900")',
    ),

  position: z
    .enum(['top', 'center', 'bottom'])
    .default('bottom')
    .optional()
    .describe('Vertical position of text'),

  glitchDuration: z
    .number()
    .min(0.2)
    .max(1.0)
    .default(0.5)
    .optional()
    .describe('Total duration of glitch animation in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    intensity = 1.0,
    fontSize = 64,
    textColor = '#ffffff',
    font = 'Inter:700',
    position = 'bottom',
    glitchDuration = 0.5,
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontWeight = fontString.includes(':')
      ? parseInt(fontString.split(':')[1], 10)
      : 700;
    return { fontFamily, fontWeight };
  };

  const { fontFamily, fontWeight } = parseFontString(font);

  // Helper: Create glitch effect for a word
  const createGlitchEffect = (
    wordId: string,
    wordStart: number,
  ): RenderableComponentData['effects'][0] => {
    // Scale keyframes with glitch moments
    // 0% → scale 0
    // 30% → scale 0.95 (first glitch dip)
    // 32% → scale 1.05 (overshoot)
    // 34% → scale 0.95 (settle back)
    // 70% → scale 1.03 (second micro-glitch)
    // 100% → scale 1.0 (stable)

    const baseScaleDip = 0.95;
    const baseScaleOvershoot = 1.05;
    const baseMicroGlitch = 1.03;

    // Apply intensity to glitch amplitudes
    const scaleDip = 1 - (1 - baseScaleDip) * intensity;
    const scaleOvershoot = 1 + (baseScaleOvershoot - 1) * intensity;
    const microGlitch = 1 + (baseMicroGlitch - 1) * intensity;

    return {
      id: `glitch-effect-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: wordStart,
        duration: glitchDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Start: scale 0
          { key: 'scale', val: 0, prog: 0 },

          // First glitch sequence (30-34%)
          { key: 'scale', val: scaleDip, prog: 0.3 },
          { key: 'scale', val: scaleOvershoot, prog: 0.32 },
          { key: 'scale', val: scaleDip, prog: 0.34 },

          // Second micro-glitch (70%)
          { key: 'scale', val: microGlitch, prog: 0.7 },

          // End: stable at 1.0
          { key: 'scale', val: 1.0, prog: 1 },

          // RGB split during glitch moments
          // First glitch (30-34%)
          {
            key: 'filter',
            val: 'drop-shadow(-2px 0 0 rgba(255,0,0,0.7)) drop-shadow(2px 0 0 rgba(0,255,255,0.7))',
            prog: 0.3,
          },
          {
            key: 'filter',
            val: 'drop-shadow(-2px 0 0 rgba(255,0,0,0.7)) drop-shadow(2px 0 0 rgba(0,255,255,0.7))',
            prog: 0.34,
          },
          // Clear filter after first glitch
          { key: 'filter', val: 'none', prog: 0.35 },

          // Second glitch (68-72%)
          {
            key: 'filter',
            val: 'drop-shadow(-1px 0 0 rgba(255,0,0,0.5)) drop-shadow(1px 0 0 rgba(0,255,255,0.5))',
            prog: 0.68,
          },
          {
            key: 'filter',
            val: 'drop-shadow(-1px 0 0 rgba(255,0,0,0.5)) drop-shadow(1px 0 0 rgba(0,255,255,0.5))',
            prog: 0.72,
          },
          // Clear filter after second glitch
          { key: 'filter', val: 'none', prog: 0.73 },
        ],
      },
    };
  };

  // Position classes based on position param
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'absolute top-[10%] left-0 right-0 flex items-center justify-center';
      case 'center':
        return 'absolute inset-0 flex items-center justify-center';
      case 'bottom':
      default:
        return 'absolute bottom-[10%] left-0 right-0 flex items-center justify-center';
    }
  };

  // Process each caption
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      // Create word components
      const wordComponents: RenderableComponentData[] = caption.words.map(
        (word, wordIndex) => {
          const wordId = `word-${captionIndex}-${wordIndex}`;

          // Create glitch effect for this word
          const glitchEffect = createGlitchEffect(wordId, 0);

          return {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize,
                fontWeight,
                color: textColor,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
                marginRight: '0.3em',
              },
              font: {
                family: fontFamily,
                weights: [fontWeight.toString()],
              },
            },
            context: {
              timing: {
                start: 0, // All words start together (sentence-level timing)
                duration: caption.duration,
              },
            },
            effects: [glitchEffect],
          } as RenderableComponentData;
        },
      );

      // Caption container
      return {
        id: `caption-container-${captionIndex}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: getPositionClasses(),
          },
          repeatChildrenProps: {
            className: 'inline-block',
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
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'digital-glitch-pop-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative isolate w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10, // Will be overridden by actual caption timing
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
  id: 'digital-glitch-pop',
  title: 'Digital Glitch Pop Text',
  description:
    'A sharp, snappy text animation preset combining clean scaling with micro-glitch effects. Text scales from 0 to 100% with controlled digital hiccups - brief moments where scale jumps to 95% or 105% creating a glitch aesthetic. Features RGB color channel separation during glitch moments. Perfect for tech content, gaming videos, cyberpunk aesthetics, and modern digital storytelling. Supports intensity parameter to control glitch frequency and amplitude.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'captions',
    'glitch',
    'digital',
    'tech',
    'gaming',
    'cyberpunk',
    'modern',
    'scale',
    'rgb-split',
    'animation',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'DIGITAL GLITCH',
        start: 0,
        end: 2,
        duration: 2,
        absoluteStart: 0,
        absoluteEnd: 2,
        words: [
          {
            id: 'word-1',
            text: 'DIGITAL',
            start: 0,
            end: 1,
            duration: 1,
            absoluteStart: 0,
            absoluteEnd: 1,
          },
          {
            id: 'word-2',
            text: 'GLITCH',
            start: 1,
            end: 2,
            duration: 1,
            absoluteStart: 1,
            absoluteEnd: 2,
          },
        ],
      },
    ],
    intensity: 1.0,
    fontSize: 64,
    textColor: '#ffffff',
    font: 'Inter:700',
    position: 'bottom',
    glitchDuration: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const digitalGlitchPopPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};