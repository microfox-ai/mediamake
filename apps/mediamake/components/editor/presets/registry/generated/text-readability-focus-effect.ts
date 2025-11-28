/**
 * Text Readability Focus Effect - Internal Effect Preset
 *
 * This preset creates a readability-focused effect specifically optimized for text elements.
 * Instead of using filter blur (which degrades text quality), it uses subtle opacity transitions,
 * text-shadow spreading, and letter-spacing adjustments to create focus effects while maintaining
 * text clarity.
 *
 * Features:
 * - Opacity transitions (0.5-1 range) for subtle focus control
 * - Text-shadow blur spreading (0-5px) instead of filter blur
 * - Letter-spacing adjustments (condensed when blurred, expanded when focused)
 * - Typewriter mode for word-by-word focus progression
 * - Highlighter mode that adds background glow to focused text
 * - Bidirectional support (fade-in and fade-out)
 * - Reading-optimized timing curves
 *
 * SINGLE EFFECT:
 * Returns a single generic effect that applies opacity, text-shadow, and letter-spacing animations
 * to the target text element.
 *
 * Advanced Usage:
 * - Use typewriter mode to create sequential word-by-word focus effects
 * - Enable highlighter mode to add background glow emphasis
 * - Adjust timing curves based on reading speed preferences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the text component to target'),
  effectStart: z
    .number()
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  direction: z
    .enum(['in', 'out'])
    .default('in')
    .describe('Animation direction: in (unfocused to focused) or out (focused to unfocused)'),
  typewriterMode: z
    .object({
      enabled: z.boolean().describe('Enable word-by-word typewriter focus'),
      wordsPerSecond: z
        .number()
        .min(0.5)
        .max(10)
        .default(3)
        .describe('Speed of word-by-word progression'),
    })
    .optional()
    .describe('Typewriter mode configuration for sequential word focus'),
  highlighter: z
    .object({
      enabled: z.boolean().describe('Enable background glow for focused text'),
      color: z
        .string()
        .default('#ffff00')
        .describe('Highlighter glow color (CSS color value)'),
      intensity: z
        .number()
        .min(0)
        .max(1)
        .default(0.5)
        .describe('Highlighter glow intensity (0-1)'),
    })
    .optional()
    .describe('Highlighter mode configuration for background glow'),
  readingOptimized: z
    .boolean()
    .default(true)
    .describe('Use timing curves optimized for reading speed'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Determine if we reverse the animation ranges for 'out' direction
  const isReversed = params.direction === 'out';

  // Base animation ranges for 'in' direction (unfocused → focused)
  const baseOpacityRange = [
    { key: 'opacity', val: 0.5, prog: 0 },
    { key: 'opacity', val: 0.7, prog: 0.3 },
    { key: 'opacity', val: 0.9, prog: 0.7 },
    { key: 'opacity', val: 1, prog: 1 },
  ];

  const baseTextShadowRange = [
    { key: 'textShadow', val: '0 0 5px rgba(0,0,0,0.5)', prog: 0 },
    { key: 'textShadow', val: '0 0 3px rgba(0,0,0,0.3)', prog: 0.3 },
    { key: 'textShadow', val: '0 0 1px rgba(0,0,0,0.1)', prog: 0.7 },
    { key: 'textShadow', val: 'none', prog: 1 },
  ];

  const baseLetterSpacingRange = [
    { key: 'letterSpacing', val: '-0.05em', prog: 0 },
    { key: 'letterSpacing', val: '-0.02em', prog: 0.3 },
    { key: 'letterSpacing', val: '0em', prog: 0.7 },
    { key: 'letterSpacing', val: '0.02em', prog: 1 },
  ];

  // Reverse ranges if direction is 'out'
  const opacityRange = isReversed
    ? baseOpacityRange.map((r) => ({ ...r, prog: 1 - r.prog })).reverse()
    : baseOpacityRange;

  const textShadowRange = isReversed
    ? baseTextShadowRange.map((r) => ({ ...r, prog: 1 - r.prog })).reverse()
    : baseTextShadowRange;

  const letterSpacingRange = isReversed
    ? baseLetterSpacingRange
        .map((r) => ({ ...r, prog: 1 - r.prog }))
        .reverse()
    : baseLetterSpacingRange;

  // Combine all ranges
  let ranges = [...opacityRange, ...textShadowRange, ...letterSpacingRange];

  // Add highlighter background glow if enabled
  if (params.highlighter?.enabled) {
    const highlighterColor = params.highlighter.color || '#ffff00';
    const intensity = params.highlighter.intensity || 0.5;
    const maxSpread = 20 * intensity; // Scale spread based on intensity

    const baseHighlighterRange = [
      {
        key: 'filter',
        val: `drop-shadow(0 0 0px ${highlighterColor})`,
        prog: 0,
      },
      {
        key: 'filter',
        val: `drop-shadow(0 0 ${maxSpread * 0.3}px ${highlighterColor})`,
        prog: 0.3,
      },
      {
        key: 'filter',
        val: `drop-shadow(0 0 ${maxSpread * 0.7}px ${highlighterColor})`,
        prog: 0.7,
      },
      {
        key: 'filter',
        val: `drop-shadow(0 0 ${maxSpread}px ${highlighterColor})`,
        prog: 1,
      },
    ];

    const highlighterRange = isReversed
      ? baseHighlighterRange.map((r) => ({ ...r, prog: 1 - r.prog })).reverse()
      : baseHighlighterRange;

    ranges = [...ranges, ...highlighterRange];
  }

  // Determine easing type based on reading optimization
  const easingType = params.readingOptimized ? 'ease-in-out' : 'ease-out';

  // Construct effect data
  const effectData: GenericEffectData = {
    type: easingType,
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: ranges,
  };

  // Create effect node
  const effect = {
    id: params.effectId || `text-readability-focus-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'text-readability-focus-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'textReadabilityFocusEffect',
  title: 'Text Readability Focus Effect',
  description:
    'Internal effect preset optimized for text elements that enhances focus using subtle opacity transitions (0.5-1 range), text-shadow spreading (0-5px blur radius), and letter-spacing adjustments instead of filter blur to maintain text readability. Includes typewriter mode for word-by-word focus progression and highlighter parameter for background glow on focused text. Supports both fade-in and fade-out directions with timing curves optimized for reading speed.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'text', 'readability', 'focus', 'opacity', 'text-shadow', 'letter-spacing', 'typewriter', 'highlighter', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'text-element',
    effectStart: 0,
    effectDuration: 0.6,
    direction: 'in',
    typewriterMode: {
      enabled: false,
      wordsPerSecond: 3,
    },
    highlighter: {
      enabled: false,
      color: '#ffff00',
      intensity: 0.5,
    },
    readingOptimized: true,
  },
};

export const textReadabilityFocusEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
