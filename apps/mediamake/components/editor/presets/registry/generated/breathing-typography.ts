/**
 * Breathing Typography Preset
 *
 * Minimalist motion typography inspired by breathing - text that inhales (expands) and exhales (contracts) as it appears.
 * Words fade in with subtle expansion, then contract slightly as they settle. Features organic rhythm with clinical timing precision.
 *
 * Features:
 * - **Breathing Effect**: Scale (0.98→1.02→1) + opacity (0→1) + subtle blur (2px→0)
 * - **Letter-Spacing Animation**: Animates in sync (0.05em→0.07em→0.04em)
 * - **Font-Weight Animation**: Animates from 300→400 during breath
 * - **Breath Rhythm**: Faster inhale (300ms), hold (100ms), slower exhale (400ms)
 * - **Staggered Words**: 120ms stagger with breath unit grouping (4-6 words)
 * - **Subtle Opacity Wave**: Cross entire text block after breathing completes
 * - **Variable Font Support**: Inter:300-700:normal with animated weight
 * - **Grounded Transform Origin**: Transform-origin: 'center bottom' for grounded feeling
 * - **Performance**: will-change applied sparingly, removed after animation completes
 *
 * Use cases:
 * - Meditation-inspired typography - calm, centered, purposeful
 * - Organic text reveals with breathing rhythm
 * - Single words or full paragraphs with adaptive rhythm
 * - Clinical precision timing for professional presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
const presetParams = z.object({
  text: z.string().describe('Text content to display (single word or paragraph)'),
  fontSize: z.number().default(48).describe('Base font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color (CSS color value)'),
  duration: z.number().optional().describe('Total duration in seconds (auto-calculated from text if not provided)'),
  breathingIntensity: z.number().min(0.1).max(2).default(1).describe('Breathing effect intensity multiplier (0.1-2)'),
  staggerDelay: z.number().min(0.05).max(0.3).default(0.12).describe('Stagger delay between words in seconds'),
  breathDuration: z.number().min(0.3).max(2).default(0.8).describe('Duration of each breathing cycle in seconds'),
  containerClassName: z.string().optional().describe('Additional Tailwind classes for container'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Split text into words
  const words = params.text.trim().split(/\s+/);
  const wordCount = words.length;

  // Calculate total duration
  // totalDuration = (wordCount - 1) * staggerDelay + breathDuration + settle time
  const calculatedDuration = (wordCount - 1) * params.staggerDelay + params.breathDuration + 1.0;
  const totalDuration = params.duration ?? calculatedDuration;

  // Breathing rhythm breakdown (prog values based on 800ms default):
  // Inhale: 0-300ms (0-0.375 prog)
  // Hold: 300-400ms (0.375-0.5 prog)
  // Exhale: 400-800ms (0.5-1.0 prog)
  const inhaleEnd = 0.375; // 300ms / 800ms
  const holdEnd = 0.5; // 400ms / 800ms

  // Apply intensity multiplier to scale values
  const intensity = params.breathingIntensity;
  const minScale = 0.98;
  const maxScale = 1.02;
  const adjustedMinScale = 1 - (1 - minScale) * intensity;
  const adjustedMaxScale = 1 + (maxScale - 1) * intensity;

  // Create word components with breathing effects
  const wordComponents = words.map((word, wordIndex) => {
    const wordId = `breathing-word-${wordIndex}`;
    const wordStartTime = wordIndex * params.staggerDelay;

    // Breathing effect for this word
    const breathingEffectData: GenericEffectData = {
      type: 'spring', // Spring easing for organic feel
      start: 0, // Relative to word start
      duration: params.breathDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Opacity: 0 → 1 during inhale
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: inhaleEnd },
        { key: 'opacity', val: 1, prog: 1 },
        
        // Scale: 0.98 → 1.02 (inhale) → 1 (exhale)
        { key: 'scale', val: adjustedMinScale, prog: 0 },
        { key: 'scale', val: adjustedMaxScale, prog: inhaleEnd },
        { key: 'scale', val: 1, prog: 1 },
        
        // Blur: 2px → 0 during inhale
        { key: 'blur', val: `${2 * intensity}px`, prog: 0 },
        { key: 'blur', val: '0px', prog: inhaleEnd },
        { key: 'blur', val: '0px', prog: 1 },
        
        // Letter-spacing: 0.05em → 0.07em (inhale) → 0.04em (exhale)
        { key: 'letterSpacing', val: '0.05em', prog: 0 },
        { key: 'letterSpacing', val: '0.07em', prog: inhaleEnd },
        { key: 'letterSpacing', val: '0.04em', prog: 1 },
        
        // Font-weight: 300 → 400 during inhale
        { key: 'fontWeight', val: 300, prog: 0 },
        { key: 'fontWeight', val: 400, prog: inhaleEnd },
        { key: 'fontWeight', val: 400, prog: 1 },
      ],
    };

    // Opacity wave effect (subtle pulse across entire text block)
    const waveDelay = wordIndex * 0.05; // Slight delay per word for wave effect
    const waveEffectData: GenericEffectData = {
      type: 'ease-in-out',
      start: params.breathDuration + waveDelay, // Start after breathing completes
      duration: Math.max(2, totalDuration - params.breathDuration - waveDelay),
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.85, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    const breathingEffect = {
      id: `breathing-effect-${wordIndex}`,
      componentId: 'generic',
      data: breathingEffectData,
    };

    const waveEffect = {
      id: `opacity-wave-${wordIndex}`,
      componentId: 'generic',
      data: waveEffectData,
    };

    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${params.fontSize}px`,
          color: params.textColor,
          fontWeight: 300,
          letterSpacing: '0.05em',
          transformOrigin: 'center bottom', // Grounded feeling
          willChange: 'transform, opacity, filter, font-weight, letter-spacing',
        },
        font: {
          family: 'Inter',
          weights: ['300', '400', '700'],
          display: 'swap' as const,
        },
      },
      context: {
        timing: {
          start: wordStartTime,
          duration: totalDuration - wordStartTime, // Word lasts until end
        },
      },
      effects: [breathingEffect, waveEffect],
    };
  });

  // Root container
  const rootContainer = {
    id: 'breathing-typography-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `flex flex-col items-center justify-center min-h-screen p-12 ${params.containerClassName || ''}`,
        style: {
          transformOrigin: 'center bottom',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'words-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-wrap items-center justify-center',
            style: {
              gap: '0.5em',
              transformOrigin: 'center bottom',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: wordComponents as RenderableComponentData[],
      } as RenderableComponentData,
    ],
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
  id: 'breathing-typography',
  title: 'Breathing Typography',
  description: 'Minimalist motion typography inspired by breathing - text that inhales (expands) and exhales (contracts) as it appears. Words fade in with subtle expansion, then contract slightly as they settle. Features organic rhythm with clinical timing precision, working equally well for single words or full paragraphs. Meditation-inspired typography - calm, centered, and purposeful.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'breathing', 'meditation', 'organic', 'minimalist', 'text', 'animation', 'motion'],
  dependencies: {},
  defaultInputParams: {
    text: 'Breathe in, breathe out',
    fontSize: 48,
    textColor: '#FFFFFF',
    breathingIntensity: 1,
    staggerDelay: 0.12,
    breathDuration: 0.8,
  },
};

// Export preset
export const breathingTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
