/**
 * Vertical Float Subtitles Preset
 *
 * This preset creates floating subtitles with vertical positioning and advanced animation styles.
 * It supports multiple animation modes including word-fade, sentence-highlight, aggressive-pulse,
 * melodic effects, and horizontal layouts.
 *
 * Features:
 * - **Multiple Animation Styles**: Word-fade, sentence-highlight, aggressive-pulse, melodic effects
 * - **Flexible Positioning**: Left, center, right, circle, random, or fixed positioning
 * - **Layout Options**: Horizontal or vertical layout directions
 * - **Font Scaling**: Different font sizes for highlighted vs normal words
 * - **Gap Handling**: Configurable gap detection and filling
 * - **Metadata Support**: Uses caption metadata for enhanced effects
 * - **Font & Color Choices**: Custom font families and color schemes
 *
 * Use cases:
 * - Creating dynamic floating captions with various animation styles
 * - Building engaging subtitle presentations
 * - Creating social media content with animated text
 * - Adding professional floating text effects
 */

import { Transcription } from '@/app/types/transcription';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  GenericEffectData,
  InputCompositionProps,
  TextAtomData,
} from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { CSSProperties } from 'react';
import { paramMetaTypes } from '../../dataTypes';

const presetParams = z.object({
  inputCaptions: z.array(z.any()).meta({
    [paramMetaTypes.referrableDataType]: 'captions',
  }),
  position: z.object({
    align: z.enum(['left', 'center', 'right', 'circle', 'random', 'fixed']),
    top: z
      .number()
      .optional()
      .describe('top position - used only when align is fixed'),
    left: z
      .number()
      .optional()
      .describe('left position - used only when align is fixed'),
    right: z
      .number()
      .optional()
      .describe('right position - used only when align is fixed'),
    bottom: z
      .number()
      .optional()
      .describe('bottom position - used only when align is fixed'),
    radius: z
      .number()
      .optional()
      .describe(
        'radius for circle positioning - used only when align is circle',
      ),
    randomize: z
      .boolean()
      .optional()
      .describe('randomize position if alignment is not fixed'),
    textAlign: z
      .enum(['left', 'center', 'right'])
      .optional()
      .describe('text alignment within parts'),
  }),
  subtitleSync: z.object({
    //timing-normalnime-imapctanime-continuosanime
    animationStyle: z
      .enum([
        'word-fade-letterspace-float', // each word fades in exact time from 0 to 1 opacity, with letterspace aniamtion for imapctful words, and all liens floating.
        'scentence-highlight-letterspace-float', // each word is already at 1 opacity, it jsuts highlighted with deeper glow at exact wor time, with letterspace animation for imapctful words, and all liens floating.
        'scentence-highlight-float', // same as above, but no letter spacing.
        'aggressive-pulse-shake-float', // aggressive rock-style animation with pulse, shake, and distortion effects for fast beat energy
        'melodic-fade-blur-float', // smooth fade with gentle blur effects, perfect for melodic content with longer sentences
        'melodic-wave-breathing', // gentle wave-like floating with soft breathing effects for melodic rhythm
        'melodic-color-flow', // smooth color transitions with gentle drift for melodic flow
        'melodic-gentle-drift', // subtle position and scale drift with soft fade for melodic feel
        'horizontal-slide-reveal', // words slide in from left to right, perfect for horizontal layouts
        'horizontal-typewriter', // typewriter effect with horizontal flow, ideal for horizontal text
        'horizontal-bounce-flow', // words bounce in sequence from left to right with flow
        'horizontal-ripple-expand', // ripple effect expanding horizontally across words
        'horizontal-zoom-cascade', // zoom effect cascading from left to right
      ])
      .default('word-fade-letterspace-float')
      .optional(),
    layout: z
      .enum(['horizontal', 'vertical'])
      .default('vertical')
      .optional()
      .describe('layout direction for parts - horizontal or vertical'),
    negativeOffset: z.number().optional(),
    maxLines: z.number().optional(),
    noGaps: z.object({
      enabled: z.boolean().optional().describe('enable no gaps'),
      maxLength: z
        .number()
        .default(3)
        .optional()
        .describe('max duration it can extend'),
    }),
    floatThreshold: z.number().optional(),
    disableMetadata: z
      .boolean()
      .optional()
      .describe('ignore all metadata provided in captions'),
    fontScaling: z
      .object({
        highlighted: z
          .number()
          .default(1.35)
          .optional()
          .describe('font size multiplier for highlighted words'),
        normal: z
          .number()
          .default(0.85)
          .optional()
          .describe('font size multiplier for normal words'),
      })
      .optional()
      .describe('font size scaling for different word types'),
    impact: z
      .number()
      .default(1.0)
      .optional()
      .describe(
        'global impact multiplier for all animations (0.1 = very subtle, 2.0 = very intense)',
      ),
    isGlowEnabled: z
      .boolean()
      .default(false)
      .optional()
      .describe('enable glow effects for words'),
  }),
  fontChoices: z
    .array(
      z.object({
        primaryFont: z
          .string()
          .describe('small text font family like Roboto:600:italic'),
        headerFont: z.string().describe('impact font family like BebasNeue'),
      }),
    )
    .optional()
    .describe('font choices - primary and secondary font families'),
  colorChoices: z
    .array(
      z.object({
        primary: z.string().describe('primary color'),
        secondary: z.string().describe('secondary color'),
        accent: z.string().describe('accent color'),
      }),
    )
    .optional()
    .describe('color choices - primary and secondary colors'),
  style: z
    .object({
      textTransformSub: z
        .enum(['none', 'uppercase', 'lowercase', 'capitalize'])
        .optional()
        .describe('text transform'),
      textTransformMain: z
        .enum(['none', 'uppercase', 'lowercase', 'capitalize'])
        .optional()
        .describe('text transform'),
    })
    .optional()
    .describe('style'),
  avgFontSize: z.number().optional().describe('average font size'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: Partial<PresetPassedProps>,
): PresetOutput => {
  const {
    inputCaptions,
    position,
    subtitleSync,
    avgFontSize,
    colorChoices,
    fontChoices,
    style,
  } = params;

  // Font choices configuration
  const FONT_CHOICES =
    fontChoices && fontChoices.length > 0
      ? fontChoices
      : [
          {
            primaryFont: 'Roboto:600:italic',
            headerFont: 'BebasNeue',
          },
        ];

  // Utility function to convert hex color to RGB
  const hexToRgb = (hex: string) => {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  };

  // Pre-processes captions to split combined words
  const preprocessCaptions = (captions: any[]) => {
    return captions.map(caption => {
      const processedWords: any[] = [];
      let originalWordIndex = 0;

      for (const word of caption.words) {
        // Check if word contains multiple words (has spaces)
        if (word.text.includes(' ')) {
          const subWords = word.text.split(' ');
          const wordDuration = word.duration;
          const wordStart = word.start;
          const wordAbsoluteStart = word.absoluteStart;

          // Distribute timing evenly among sub-words
          const subWordDuration = wordDuration / subWords.length;

          subWords.forEach((subWord: string, index: number) => {
            const subWordStart = wordStart + index * subWordDuration;
            const subWordAbsoluteStart =
              wordAbsoluteStart + index * subWordDuration;
            const subWordAbsoluteEnd = subWordAbsoluteStart + subWordDuration;

            processedWords.push({
              ...word,
              text: subWord.trim(),
              start: subWordStart,
              duration: subWordDuration,
              absoluteStart: subWordAbsoluteStart,
              absoluteEnd: subWordAbsoluteEnd,
              originalWordIndex: originalWordIndex, // Track original word index
              isSubWord: true, // Mark as sub-word
            } as any);
          });
        } else {
          processedWords.push({
            ...word,
            originalWordIndex: originalWordIndex,
            isSubWord: false,
          } as any);
        }
        originalWordIndex++;
      }

      return {
        ...caption,
        words: processedWords,
      };
    });
  };

  // Splits sentence into parts using metadata.splitParts if available
  const splitSentenceIntoParts = (
    words: any[],
    maxLines?: number,
    splitParts?: string[],
  ) => {
    // If splitParts is provided, use it for splitting
    if (splitParts && splitParts.length > 0) {
      const parts: any[][] = [];
      let currentWordIndex = 0;

      for (const splitPart of splitParts) {
        const partWords: any[] = [];
        const targetText = splitPart.trim().toLowerCase();

        // Find words that match this split part
        while (currentWordIndex < words.length) {
          const word = words[currentWordIndex];
          const wordText = word.text.toLowerCase();

          // Check if this word could be part of the current split part
          if (
            targetText.includes(wordText) ||
            wordText.includes(targetText.split(' ')[0])
          ) {
            partWords.push(word);
            currentWordIndex++;

            // If we've matched all words in the split part, break
            if (partWords.length >= splitPart.split(' ').length) {
              break;
            }
          } else {
            break;
          }
        }

        if (partWords.length > 0) {
          parts.push(partWords);
        }
      }

      // Add any remaining words to the last part
      if (currentWordIndex < words.length) {
        const lastPart = parts[parts.length - 1];
        if (lastPart) {
          lastPart.push(...words.slice(currentWordIndex));
        } else {
          parts.push(words.slice(currentWordIndex));
        }
      }

      return parts.length > 0 ? parts : [words];
    }

    // Fallback to simple character-based distribution
    return splitSentenceIntoPartsSimple(words, maxLines);
  };

  // Simple character-based splitting (fallback)
  const splitSentenceIntoPartsSimple = (words: any[], maxLines?: number) => {
    // Very short sentences: don't split
    if (words.length <= 1) {
      return [words];
    }

    // If no maxLines specified, use default smart splitting
    const targetLines = maxLines || 5;

    // If we have only 1 word, return as single part
    if (words.length <= 1) {
      return [words];
    }

    // Calculate total characters and target characters per line
    const totalCharacters = words.reduce(
      (sum, word) => sum + word.text.length,
      0,
    );
    const targetCharsPerLine = Math.ceil(totalCharacters / targetLines);

    const parts: any[][] = [];
    let currentPart: any[] = [];
    let currentCharCount = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const wordLength = word.text.length;

      currentPart.push(word);
      currentCharCount += wordLength;

      // Break if we've reached target characters per line or we're at the last word
      if (currentCharCount >= targetCharsPerLine || i === words.length - 1) {
        parts.push([...currentPart]);
        currentPart = [];
        currentCharCount = 0;
      }
    }

    // Ensure we don't exceed target lines
    if (parts.length > targetLines) {
      const lastPart = parts.pop();
      const secondLastPart = parts.pop();
      if (secondLastPart && lastPart) {
        parts.push([...secondLastPart, ...lastPart]);
      }
    }

    return parts;
  };

  // Creates opacity fade-in effect for words
  const createOpacityEffect = (
    wordId: string,
    word: any,
    caption: any,
  ): GenericEffectData => ({
    type: 'ease-out',
    start: word.start,
    duration: 1,
    mode: 'provider',
    targetIds: [wordId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      {
        key: 'opacity',
        val: 1,
        prog: caption.duration >= 1 ? 0.5 : 0.05,
      },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  });

  // Creates opacity effect for sentence highlight style (0.7 to 1)
  const createSentenceOpacityEffect = (
    wordId: string,
    word: any,
    caption: any,
  ): GenericEffectData => ({
    type: 'ease-out',
    start: word.start,
    duration: 1,
    mode: 'provider',
    targetIds: [wordId],
    ranges: [
      { key: 'opacity', val: 0.3, prog: 0 },
      {
        key: 'opacity',
        val: 1,
        prog: caption.duration >= 1 ? 0.5 : 0.05,
      },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  });

  // Creates letter spacing effect for highlighted words
  const createLetterSpacingEffect = (
    wordId: string,
    word: any,
    syncDuration: number | null,
    shouldAnimate: boolean,
    impact: number,
  ): GenericEffectData => ({
    type: 'ease-out',
    start: word.start,
    duration: shouldAnimate ? syncDuration || 8 : 3,
    mode: 'provider',
    targetIds: [wordId],
    ranges: [
      { key: 'letterSpacing', val: '0.1em' as any, prog: 0 },
      { key: 'letterSpacing', val: `${impact * 0.175}em` as any, prog: 1 },
    ],
  });

  // Creates spring scale effect for normal words
  const createSpringScaleEffect = (
    wordId: string,
    word: any,
    impact: number,
    impactWord: boolean,
  ): GenericEffectData => ({
    type: 'spring',
    start: word.start,
    duration: 0.3,
    mode: 'provider',
    targetIds: [wordId],
    ranges: [
      { key: 'scale', val: impactWord ? 1 : 0.9, prog: 0 },
      { key: 'scale', val: 1.1 * impact, prog: 0.5 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  });

  // Creates glow effect for all words
  const createGlowEffect = (
    wordId: string,
    word: any,
    selectedColorChoice: any,
    syncDuration: number | null,
    shouldAnimate: boolean,
  ): GenericEffectData => {
    const accentRgb = hexToRgb(selectedColorChoice.accent) || {
      r: 255,
      g: 107,
      b: 107,
    };

    return {
      type: 'ease-in',
      start: word.start,
      duration: shouldAnimate ? syncDuration || word.duration : 0.1,
      mode: 'provider',
      targetIds: [wordId],
      ranges: shouldAnimate
        ? [
            {
              key: 'filter',
              val: `drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))` as any,
              prog: 0,
            },
            {
              key: 'filter',
              val: `drop-shadow(0 0 12px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.8)) drop-shadow(0 0 24px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.4))` as any,
              prog: 0.5,
            },
            {
              key: 'filter',
              val: `drop-shadow(0 0 24px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.6))` as any,
              prog: 1,
            },
          ]
        : [
            {
              key: 'filter',
              val: `drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))` as any,
              prog: 0,
            },
            {
              key: 'filter',
              val: `drop-shadow(0 0 8px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.9))` as any,
              prog: 1,
            },
          ],
    };
  };

  // Creates vibration effect using translateX for rock-style animation
  const createVibrationEffect = (
    wordId: string,
    word: any,
    impact: number,
  ): GenericEffectData => ({
    type: 'spring',
    start: word.start,
    duration: 0.2,
    mode: 'provider',
    targetIds: [wordId],
    ranges: [
      { key: 'translateX', val: -5 * impact, prog: 0 },
      { key: 'translateX', val: 6 * impact, prog: 0.3 },
      { key: 'translateX', val: -3 * impact, prog: 0.6 },
      { key: 'translateX', val: 3 * impact, prog: 0.8 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  });

  // Creates continuous shake effect for long-duration words with amplitude and frequency control
  const createContinuousShakeEffect = (
    wordId: string,
    word: any,
    amplitude: number,
    frequency: number = 0.1, // Shake every 0.1 seconds
  ): GenericEffectData => {
    const duration = word.duration;
    const shakeCount = Math.floor(duration / frequency);
    const ranges = [];

    // Create shake pattern with specified amplitude and frequency
    for (let i = 0; i <= shakeCount; i++) {
      const prog = i / shakeCount;
      const shakeValue = (i % 2 === 0 ? 1 : -1) * amplitude;
      ranges.push({ key: 'translateX', val: shakeValue, prog });
    }

    // End at center position
    ranges.push({ key: 'translateX', val: 0, prog: 1 });

    return {
      type: 'ease-out',
      start: word.start,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges,
    };
  };

  // Creates motion blur effect for word entrance
  const createMotionBlurEffect = (
    wordId: string,
    word: any,
    selectedColorChoice: any,
    impact: number,
  ): GenericEffectData => {
    const accentRgb = hexToRgb(selectedColorChoice.accent) || {
      r: 255,
      g: 107,
      b: 107,
    };

    return {
      type: 'ease-out',
      start: word.start,
      duration: 0.4,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        {
          key: 'filter',
          val: `blur(8px) drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))` as any,
          prog: 0,
        },
        {
          key: 'filter',
          val: `blur(4px) drop-shadow(0 0 ${6 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.6))` as any,
          prog: 0.3,
        },
        {
          key: 'filter',
          val: `blur(1px) drop-shadow(0 0 ${4 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.8))` as any,
          prog: 0.7,
        },
        {
          key: 'filter',
          val: `blur(0px) drop-shadow(0 0 ${2 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.9))` as any,
          prog: 1,
        },
      ],
    };
  };

  // Creates distortion effect for rock intensity
  const createDistortionEffect = (
    wordId: string,
    word: any,
    selectedColorChoice: any,
    impact: number,
  ): GenericEffectData => {
    const accentRgb = hexToRgb(selectedColorChoice.accent) || {
      r: 255,
      g: 107,
      b: 107,
    };

    return {
      type: 'ease-in',
      start: word.start,
      duration: 0.3,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        {
          key: 'filter',
          val: `drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0)) contrast(1) brightness(1)` as any,
          prog: 0,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${8 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.9)) contrast(1.5) brightness(1.3) saturate(1.5)` as any,
          prog: 0.4,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${12 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.7)) contrast(1.2) brightness(1.1)` as any,
          prog: 0.7,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${6 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.8)) contrast(1) brightness(1)` as any,
          prog: 1,
        },
      ],
    };
  };

  // Creates fast beat sync effect for rock timing
  const createFastBeatSyncEffect = (
    wordId: string,
    word: any,
    impact: number,
  ): GenericEffectData => ({
    type: 'spring',
    start: word.start,
    duration: 0.08,
    mode: 'provider',
    targetIds: [wordId],
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 1.15 * impact, prog: 0.5 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  });

  // Creates smooth fade-blur effect for melodic content
  const createMelodicFadeBlurEffect = (
    wordId: string,
    word: any,
    selectedColorChoice: any,
    impact: number,
  ): GenericEffectData => {
    const accentRgb = hexToRgb(selectedColorChoice.accent) || {
      r: 255,
      g: 107,
      b: 107,
    };

    return {
      type: 'ease-out',
      start: word.start,
      duration: Math.max(0.8, word.duration * 0.6), // Longer, smoother duration
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        {
          key: 'opacity',
          val: 0,
          prog: 0,
        },
        {
          key: 'opacity',
          val: 0.3,
          prog: 0.2,
        },
        {
          key: 'opacity',
          val: 0.8,
          prog: 0.6,
        },
        {
          key: 'opacity',
          val: 1,
          prog: 1,
        },
      ],
    };
  };

  // Creates gentle blur effect for melodic smoothness
  const createMelodicBlurEffect = (
    wordId: string,
    word: any,
    selectedColorChoice: any,
    impact: number,
  ): GenericEffectData => {
    const accentRgb = hexToRgb(selectedColorChoice.accent) || {
      r: 255,
      g: 107,
      b: 107,
    };

    return {
      type: 'ease-out',
      start: word.start,
      duration: Math.max(1.2, word.duration * 0.8),
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        {
          key: 'filter',
          val: `blur(6px) drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))` as any,
          prog: 0,
        },
        {
          key: 'filter',
          val: `blur(3px) drop-shadow(0 0 ${4 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.4))` as any,
          prog: 0.3,
        },
        {
          key: 'filter',
          val: `blur(1px) drop-shadow(0 0 ${6 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.6))` as any,
          prog: 0.7,
        },
        {
          key: 'filter',
          val: `blur(0px) drop-shadow(0 0 ${3 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.8))` as any,
          prog: 1,
        },
      ],
    };
  };

  // Creates gentle wave-like floating effect for melodic rhythm
  const createMelodicWaveEffect = (
    wordId: string,
    word: any,
    impact: number,
  ): GenericEffectData => {
    const duration = Math.max(2.0, word.duration * 1.2);
    const waveCount = Math.floor(duration / 0.8); // Wave every 0.8 seconds
    const ranges = [];

    // Create smooth wave pattern
    for (let i = 0; i <= waveCount; i++) {
      const prog = i / waveCount;
      const waveValue = Math.sin(prog * Math.PI * 2) * 3 * impact; // Gentle 3px amplitude
      ranges.push({ key: 'translateY', val: waveValue, prog });
    }

    // End at neutral position
    ranges.push({ key: 'translateY', val: 0, prog: 1 });

    return {
      type: 'ease-out',
      start: word.start,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges,
    };
  };

  // Creates soft breathing effect for melodic rhythm
  const createMelodicBreathingEffect = (
    wordId: string,
    word: any,
    impact: number,
  ): GenericEffectData => {
    const duration = Math.max(1.5, word.duration * 1.0);
    const breathCount = Math.floor(duration / 1.2); // Breathe every 1.2 seconds
    const ranges = [];

    // Create gentle breathing pattern
    for (let i = 0; i <= breathCount; i++) {
      const prog = i / breathCount;
      const breathValue = 1 + Math.sin(prog * Math.PI * 2) * 0.05 * impact; // 5% scale variation
      ranges.push({ key: 'scale', val: breathValue, prog });
    }

    // End at normal scale
    ranges.push({ key: 'scale', val: 1, prog: 1 });

    return {
      type: 'ease-out',
      start: word.start,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges,
    };
  };

  // Creates smooth color transition effect for melodic flow
  const createMelodicColorFlowEffect = (
    wordId: string,
    word: any,
    selectedColorChoice: any,
    impact: number,
  ): GenericEffectData => {
    const primaryRgb = hexToRgb(selectedColorChoice.primary) || {
      r: 255,
      g: 255,
      b: 255,
    };
    const accentRgb = hexToRgb(selectedColorChoice.accent) || {
      r: 255,
      g: 107,
      b: 107,
    };

    return {
      type: 'ease-out',
      start: word.start,
      duration: Math.max(1.0, word.duration * 0.8),
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        {
          key: 'color',
          val: `rgb(${primaryRgb.r},${primaryRgb.g},${primaryRgb.b})`,
          prog: 0,
        },
        {
          key: 'color',
          val: `rgb(${Math.floor(primaryRgb.r + (accentRgb.r - primaryRgb.r) * 0.3)},${Math.floor(primaryRgb.g + (accentRgb.g - primaryRgb.g) * 0.3)},${Math.floor(primaryRgb.b + (accentRgb.b - primaryRgb.b) * 0.3)})`,
          prog: 0.5,
        },
        {
          key: 'color',
          val: `rgb(${accentRgb.r},${accentRgb.g},${accentRgb.b})`,
          prog: 1,
        },
      ],
    };
  };

  // Creates gentle drift effect for melodic feel
  const createMelodicDriftEffect = (
    wordId: string,
    word: any,
    impact: number,
  ): GenericEffectData => {
    const duration = Math.max(1.8, word.duration * 1.1);
    const driftCount = Math.floor(duration / 1.5); // Drift every 1.5 seconds
    const ranges = [];

    // Create subtle position drift
    for (let i = 0; i <= driftCount; i++) {
      const prog = i / driftCount;
      const driftX = Math.sin(prog * Math.PI * 1.5) * 2 * impact; // 2px horizontal drift
      const driftY = Math.cos(prog * Math.PI * 1.5) * 1.5 * impact; // 1.5px vertical drift
      ranges.push({ key: 'translateX', val: driftX, prog });
      ranges.push({ key: 'translateY', val: driftY, prog });
    }

    // End at center position
    ranges.push({ key: 'translateX', val: 0, prog: 1 });
    ranges.push({ key: 'translateY', val: 0, prog: 1 });

    return {
      type: 'ease-out',
      start: word.start,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges,
    };
  };

  // Creates soft glow effect for melodic ambiance
  const createMelodicGlowEffect = (
    wordId: string,
    word: any,
    selectedColorChoice: any,
    impact: number,
  ): GenericEffectData => {
    const accentRgb = hexToRgb(selectedColorChoice.accent) || {
      r: 255,
      g: 107,
      b: 107,
    };

    return {
      type: 'ease-out',
      start: word.start,
      duration: Math.max(1.5, word.duration * 1.0),
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        {
          key: 'filter',
          val: `drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))` as any,
          prog: 0,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${4 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.3))` as any,
          prog: 0.3,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${8 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.5))` as any,
          prog: 0.7,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${6 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.7))` as any,
          prog: 1,
        },
      ],
    };
  };

  // Creates horizontal slide reveal effect - words slide in from left to right
  const createHorizontalSlideRevealEffect = (
    wordId: string,
    word: any,
    wordIndex: number,
    totalWords: number,
    globalImpact: number = 1.0,
  ): GenericEffectData => {
    const slideDistance = (30 + wordIndex * 5) * globalImpact; // Scale with global impact
    const delay = wordIndex * 0.05; // Reduced delay

    return {
      type: 'ease-out',
      start: word.start + delay,
      duration: 0.5, // Faster animation
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'translateX', val: -slideDistance, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.4 },
        { key: 'filter', val: `blur(${3 * globalImpact}px)`, prog: 0 },
        { key: 'filter', val: `blur(${1 * globalImpact}px)`, prog: 0.6 },
        { key: 'filter', val: `blur(0px)`, prog: 1 },
      ],
    };
  };

  // Creates horizontal typewriter effect - words appear sequentially from left to right
  const createHorizontalTypewriterEffect = (
    wordId: string,
    word: any,
    wordIndex: number,
    totalWords: number,
    globalImpact: number = 1.0,
  ): GenericEffectData => {
    const typewriterDelay = wordIndex * 0.08; // Reduced delay

    return {
      type: 'ease-out',
      start: word.start + typewriterDelay,
      duration: 0.3, // Much faster
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.6 },
        { key: 'scale', val: 0.95, prog: 0 },
        { key: 'scale', val: 1 + 0.02 * globalImpact, prog: 0.8 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };
  };

  // Creates horizontal bounce flow effect - words bounce in sequence
  const createHorizontalBounceFlowEffect = (
    wordId: string,
    word: any,
    wordIndex: number,
    totalWords: number,
    impact: number,
    globalImpact: number = 1.0,
  ): GenericEffectData => {
    const bounceDelay = wordIndex * 0.06; // Reduced delay
    const bounceHeight = 8 * impact * globalImpact; // Scale with global impact

    return {
      type: 'spring',
      start: word.start + bounceDelay,
      duration: 0.6, // Much faster settling
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'translateY', val: bounceHeight, prog: 0 },
        { key: 'translateY', val: -bounceHeight * 0.2, prog: 0.4 },
        { key: 'translateY', val: 0, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
      ],
    };
  };

  // Creates horizontal ripple expand effect - ripple effect across words
  const createHorizontalRippleExpandEffect = (
    wordId: string,
    word: any,
    wordIndex: number,
    totalWords: number,
    selectedColorChoice: any,
    impact: number,
    globalImpact: number = 1.0,
    isGlowEnabled: boolean = false,
  ): GenericEffectData => {
    const rippleDelay = wordIndex * 0.04; // Reduced delay
    const accentRgb = hexToRgb(selectedColorChoice.accent) || {
      r: 255,
      g: 107,
      b: 107,
    };

    const ranges: any[] = [
      { key: 'scale', val: 0.9, prog: 0 },
      { key: 'scale', val: 1 + 0.03 * impact * globalImpact, prog: 0.5 },
      { key: 'scale', val: 1, prog: 1 },
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.4 },
    ];

    // Add glow effects only if enabled
    if (isGlowEnabled) {
      ranges.push(
        {
          key: 'filter',
          val: `drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))` as any,
          prog: 0,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${4 * impact * globalImpact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.6))` as any,
          prog: 0.6,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${2 * impact * globalImpact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.4))` as any,
          prog: 1,
        },
      );
    }

    return {
      type: 'ease-out',
      start: word.start + rippleDelay,
      duration: 0.5, // Much faster
      mode: 'provider',
      targetIds: [wordId],
      ranges,
    };
  };

  // Creates horizontal zoom cascade effect - zoom effect cascading from left to right
  const createHorizontalZoomCascadeEffect = (
    wordId: string,
    word: any,
    wordIndex: number,
    totalWords: number,
    impact: number,
    globalImpact: number = 1.0,
  ): GenericEffectData => {
    const cascadeDelay = wordIndex * 0.05; // Reduced delay
    const zoomIntensity = 0.1 * impact * globalImpact; // Scale with global impact

    return {
      type: 'ease-out',
      start: word.start + cascadeDelay,
      duration: 0.4, // Much faster settling
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: 0.8, prog: 0 },
        { key: 'scale', val: 1.05 + zoomIntensity, prog: 0.6 },
        { key: 'scale', val: 1, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'translateY', val: 3 * globalImpact, prog: 0 },
        { key: 'translateY', val: -1 * globalImpact, prog: 0.6 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };
  };

  // Generates word data with effects and styling
  const generateWordsData = (
    words: any[],
    caption: any,
    selectedFontChoice: any,
    avgFontSize: number | undefined,
    selectedColorChoice: any,
    partId: string,
    scentenceId: string,
    style?: any,
    animationStyle?: string,
    fontScaling?: { highlighted?: number; normal?: number },
    globalImpact?: number,
    isGlowEnabled?: boolean,
  ) => {
    const isAllWordsHighlighted = words.every(
      word => word.metadata?.isHighlight,
    );
    const syncDuration =
      isAllWordsHighlighted && words.length > 0 && caption.duration > 1
        ? words.reduce((sum, word) => sum + word.duration, 0)
        : null;

    return words.map((word, _j: number) => {
      const wordId = `word-${_j}-${partId}-${scentenceId}`;
      const isHighlight = word.metadata?.isHighlight;
      const shouldAnimate =
        word.duration >= 1 || (isAllWordsHighlighted && syncDuration > 1.5);

      // Create effects array based on animation style
      const effects = [];

      if (animationStyle === 'word-fade-letterspace-float') {
        // Original behavior: fade-in opacity for all words
        effects.push({
          id: `opacity-${wordId}`,
          componentId: 'generic',
          data: createOpacityEffect(wordId, word, caption),
        });

        // Add letter spacing and glow effects only for highlighted words
        if (isHighlight) {
          effects.push({
            id: `letter-spacing-${wordId}`,
            componentId: 'generic',
            data: createLetterSpacingEffect(
              wordId,
              word,
              syncDuration,
              shouldAnimate,
              1,
            ),
          });

          if (isGlowEnabled) {
            effects.push({
              id: `glow-${wordId}`,
              componentId: 'generic',
              data: createGlowEffect(
                wordId,
                word,
                selectedColorChoice,
                syncDuration,
                shouldAnimate,
              ),
            });
          }
        }
      } else if (animationStyle === 'scentence-highlight-letterspace-float') {
        // ALL words get opacity effect (0.7 to 1)
        effects.push({
          id: `opacity-${wordId}`,
          componentId: 'generic',
          data: createSentenceOpacityEffect(wordId, word, caption),
        });

        // ALL words get glow effect when they start (if enabled)
        if (isGlowEnabled) {
          effects.push({
            id: `glow-${wordId}`,
            componentId: 'generic',
            data: createGlowEffect(
              wordId,
              word,
              selectedColorChoice,
              syncDuration,
              shouldAnimate,
            ),
          });
        }

        // Normal words get spring scale effect (scale-press) + letter spacing
        if (!isHighlight) {
          effects.push({
            id: `spring-scale-${wordId}`,
            componentId: 'generic',
            data: createSpringScaleEffect(wordId, word, 0.8, false),
          });

          effects.push({
            id: `letter-spacing-${wordId}`,
            componentId: 'generic',
            data: createLetterSpacingEffect(
              wordId,
              word,
              syncDuration,
              shouldAnimate,
              0.95,
            ),
          });
        }

        // Impact words get letter spacing effect (larger) + spring scale effect (smaller)
        if (isHighlight) {
          effects.push({
            id: `spring-scale-${wordId}`,
            componentId: 'generic',
            data: createSpringScaleEffect(wordId, word, 0.9, true),
          });

          effects.push({
            id: `letter-spacing-${wordId}`,
            componentId: 'generic',
            data: createLetterSpacingEffect(
              wordId,
              word,
              syncDuration,
              shouldAnimate,
              1.25,
            ),
          });
        }
      } else if (animationStyle === 'scentence-highlight-float') {
        // Same as scentence-highlight-letterspace-float but without letter spacing
        // ALL words get opacity effect (0.7 to 1)
        effects.push({
          id: `opacity-${wordId}`,
          componentId: 'generic',
          data: createSentenceOpacityEffect(wordId, word, caption),
        });

        // ALL words get glow effect when they start (if enabled)
        if (isGlowEnabled) {
          effects.push({
            id: `glow-${wordId}`,
            componentId: 'generic',
            data: createGlowEffect(
              wordId,
              word,
              selectedColorChoice,
              syncDuration,
              shouldAnimate,
            ),
          });
        }
      } else if (animationStyle === 'aggressive-pulse-shake-float') {
        // Aggressive rock-style animation with enhanced effects
        const wordDuration = word.duration;
        const isLongWord = wordDuration > 1.5;
        const impact = isHighlight ? 1.3 : 1.2; // Increased from 0.9 to 1.2 for better visibility

        // ALL words start from 0 opacity with smooth fade-in
        effects.push({
          id: `opacity-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: word.start,
            duration: Math.min(0.6, wordDuration * 0.4), // Smoother based on duration
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.3 },
              { key: 'opacity', val: 0.8, prog: 0.7 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        });

        // Motion blur effect for dramatic entrance
        effects.push({
          id: `motion-blur-${wordId}`,
          componentId: 'generic',
          data: createMotionBlurEffect(
            wordId,
            word,
            selectedColorChoice,
            impact,
          ),
        });

        // Vibration effect using translateX for rock presence
        effects.push({
          id: `vibration-${wordId}`,
          componentId: 'generic',
          data: createVibrationEffect(wordId, word, impact),
        });

        // Continuous shake for long-duration words with proper amplitude and frequency
        if (isLongWord) {
          effects.push({
            id: `continuous-shake-${wordId}`,
            componentId: 'generic',
            data: createContinuousShakeEffect(
              wordId,
              word,
              impact, // Use impact for amplitude (1.2 for normal, 1.3 for highlight)
              0.15, // Shake every 0.15 seconds for rock rhythm
            ),
          });
        }

        // Distortion effect for rock intensity
        effects.push({
          id: `distortion-${wordId}`,
          componentId: 'generic',
          data: createDistortionEffect(
            wordId,
            word,
            selectedColorChoice,
            impact,
          ),
        });

        // Fast beat sync for highlighted words
        if (isHighlight) {
          effects.push({
            id: `fast-beat-${wordId}`,
            componentId: 'generic',
            data: createFastBeatSyncEffect(wordId, word, 1.2),
          });
        }

        // Enhanced letter spacing for highlighted words
        if (isHighlight) {
          effects.push({
            id: `letter-spacing-${wordId}`,
            componentId: 'generic',
            data: createLetterSpacingEffect(
              wordId,
              word,
              syncDuration,
              shouldAnimate,
              1.4,
            ),
          });
        }
      } else if (animationStyle === 'melodic-fade-blur-float') {
        // Smooth fade-blur effect for melodic content
        const impact = isHighlight ? 1.2 : 0.8;

        // Smooth fade effect
        effects.push({
          id: `melodic-fade-${wordId}`,
          componentId: 'generic',
          data: createMelodicFadeBlurEffect(
            wordId,
            word,
            selectedColorChoice,
            impact,
          ),
        });

        // Gentle blur effect
        effects.push({
          id: `melodic-blur-${wordId}`,
          componentId: 'generic',
          data: createMelodicBlurEffect(
            wordId,
            word,
            selectedColorChoice,
            impact,
          ),
        });

        // Soft glow for ambiance (if enabled)
        if (isGlowEnabled) {
          effects.push({
            id: `melodic-glow-${wordId}`,
            componentId: 'generic',
            data: createMelodicGlowEffect(
              wordId,
              word,
              selectedColorChoice,
              impact,
            ),
          });
        }
      } else if (animationStyle === 'melodic-wave-breathing') {
        // Gentle wave-like floating with soft breathing
        const impact = isHighlight ? 1.1 : 0.9;

        // Smooth fade effect
        effects.push({
          id: `melodic-fade-${wordId}`,
          componentId: 'generic',
          data: createMelodicFadeBlurEffect(
            wordId,
            word,
            selectedColorChoice,
            impact,
          ),
        });

        // Wave-like floating effect
        effects.push({
          id: `melodic-wave-${wordId}`,
          componentId: 'generic',
          data: createMelodicWaveEffect(wordId, word, impact),
        });

        // Soft breathing effect
        effects.push({
          id: `melodic-breathing-${wordId}`,
          componentId: 'generic',
          data: createMelodicBreathingEffect(wordId, word, impact),
        });

        // Gentle glow (if enabled)
        if (isGlowEnabled) {
          effects.push({
            id: `melodic-glow-${wordId}`,
            componentId: 'generic',
            data: createMelodicGlowEffect(
              wordId,
              word,
              selectedColorChoice,
              impact,
            ),
          });
        }
      } else if (animationStyle === 'melodic-color-flow') {
        // Smooth color transitions with gentle drift
        const impact = isHighlight ? 1.3 : 1.0;

        // Smooth fade effect
        effects.push({
          id: `melodic-fade-${wordId}`,
          componentId: 'generic',
          data: createMelodicFadeBlurEffect(
            wordId,
            word,
            selectedColorChoice,
            impact,
          ),
        });

        // Color flow effect
        effects.push({
          id: `melodic-color-flow-${wordId}`,
          componentId: 'generic',
          data: createMelodicColorFlowEffect(
            wordId,
            word,
            selectedColorChoice,
            impact,
          ),
        });

        // Gentle drift effect
        effects.push({
          id: `melodic-drift-${wordId}`,
          componentId: 'generic',
          data: createMelodicDriftEffect(wordId, word, impact),
        });

        // Soft glow (if enabled)
        if (isGlowEnabled) {
          effects.push({
            id: `melodic-glow-${wordId}`,
            componentId: 'generic',
            data: createMelodicGlowEffect(
              wordId,
              word,
              selectedColorChoice,
              impact,
            ),
          });
        }
      } else if (animationStyle === 'melodic-gentle-drift') {
        // Subtle position and scale drift with soft fade
        const impact = isHighlight ? 1.1 : 0.8;

        // Smooth fade effect
        effects.push({
          id: `melodic-fade-${wordId}`,
          componentId: 'generic',
          data: createMelodicFadeBlurEffect(
            wordId,
            word,
            selectedColorChoice,
            impact,
          ),
        });

        // Gentle drift effect
        effects.push({
          id: `melodic-drift-${wordId}`,
          componentId: 'generic',
          data: createMelodicDriftEffect(wordId, word, impact),
        });

        // Soft breathing for rhythm
        effects.push({
          id: `melodic-breathing-${wordId}`,
          componentId: 'generic',
          data: createMelodicBreathingEffect(wordId, word, impact),
        });

        // Gentle glow (if enabled)
        if (isGlowEnabled) {
          effects.push({
            id: `melodic-glow-${wordId}`,
            componentId: 'generic',
            data: createMelodicGlowEffect(
              wordId,
              word,
              selectedColorChoice,
              impact,
            ),
          });
        }
      } else if (animationStyle === 'horizontal-slide-reveal') {
        // Words slide in from left to right, perfect for horizontal layouts
        const impact = isHighlight ? 1.1 : 1.0;

        effects.push({
          id: `horizontal-slide-${wordId}`,
          componentId: 'generic',
          data: createHorizontalSlideRevealEffect(
            wordId,
            word,
            _j,
            words.length,
            globalImpact || 1.0,
          ),
        });

        // Add glow effect for highlighted words (if enabled)
        if (isHighlight && isGlowEnabled) {
          effects.push({
            id: `glow-${wordId}`,
            componentId: 'generic',
            data: createGlowEffect(
              wordId,
              word,
              selectedColorChoice,
              syncDuration,
              shouldAnimate,
            ),
          });
        }
      } else if (animationStyle === 'horizontal-typewriter') {
        // Typewriter effect with horizontal flow, ideal for horizontal text
        const impact = isHighlight ? 1.05 : 1.0;

        effects.push({
          id: `horizontal-typewriter-${wordId}`,
          componentId: 'generic',
          data: createHorizontalTypewriterEffect(
            wordId,
            word,
            _j,
            words.length,
            globalImpact || 1.0,
          ),
        });

        // Add letter spacing for highlighted words
        if (isHighlight) {
          effects.push({
            id: `letter-spacing-${wordId}`,
            componentId: 'generic',
            data: createLetterSpacingEffect(
              wordId,
              word,
              syncDuration,
              shouldAnimate,
              impact,
            ),
          });
        }
      } else if (animationStyle === 'horizontal-bounce-flow') {
        // Words bounce in sequence from left to right with flow
        const impact = isHighlight ? 1.1 : 1.0;

        effects.push({
          id: `horizontal-bounce-${wordId}`,
          componentId: 'generic',
          data: createHorizontalBounceFlowEffect(
            wordId,
            word,
            _j,
            words.length,
            impact,
            globalImpact || 1.0,
          ),
        });

        // Add glow effect for highlighted words (if enabled)
        if (isHighlight && isGlowEnabled) {
          effects.push({
            id: `glow-${wordId}`,
            componentId: 'generic',
            data: createGlowEffect(
              wordId,
              word,
              selectedColorChoice,
              syncDuration,
              shouldAnimate,
            ),
          });
        }
      } else if (animationStyle === 'horizontal-ripple-expand') {
        // Ripple effect expanding horizontally across words
        const impact = isHighlight ? 1.1 : 1.0;

        effects.push({
          id: `horizontal-ripple-${wordId}`,
          componentId: 'generic',
          data: createHorizontalRippleExpandEffect(
            wordId,
            word,
            _j,
            words.length,
            selectedColorChoice,
            impact,
            globalImpact || 1.0,
            isGlowEnabled || false,
          ),
        });
      } else if (animationStyle === 'horizontal-zoom-cascade') {
        // Zoom effect cascading from left to right
        const impact = isHighlight ? 1.05 : 1.0;

        effects.push({
          id: `horizontal-zoom-${wordId}`,
          componentId: 'generic',
          data: createHorizontalZoomCascadeEffect(
            wordId,
            word,
            _j,
            words.length,
            impact,
            globalImpact || 1.0,
          ),
        });

        // Add glow effect for highlighted words (if enabled)
        if (isHighlight && isGlowEnabled) {
          effects.push({
            id: `glow-${wordId}`,
            componentId: 'generic',
            data: createGlowEffect(
              wordId,
              word,
              selectedColorChoice,
              syncDuration,
              shouldAnimate,
            ),
          });
        }
      }

      // Calculate font size and style
      let fontSize = avgFontSize ?? 50;
      const highlightedMultiplier = fontScaling?.highlighted ?? 1.35;
      const normalMultiplier = fontScaling?.normal ?? 0.85;
      const fontCalculatedSize = isHighlight
        ? fontSize * highlightedMultiplier
        : fontSize * normalMultiplier;
      const font = isHighlight
        ? selectedFontChoice.headerFont
        : selectedFontChoice.primaryFont;

      // Ensure font is defined before using includes
      const fontString = font || 'Roboto';
      const fontFamily = fontString.includes(':')
        ? fontString.split(':')[0]
        : fontString;

      // Parse font style from font string
      let fontStyle: CSSProperties = {};
      if (fontString.includes(':')) {
        const _fontStyle = fontString.split(':');
        if (_fontStyle.length > 2) {
          fontStyle.fontStyle = _fontStyle[2];
          fontStyle.fontWeight = parseInt(_fontStyle[1]);
        } else if (_fontStyle.length > 1) {
          fontStyle.fontWeight = parseInt(_fontStyle[1]);
        }
      }

      // Set text colors based on highlight status
      const textColor = isHighlight
        ? selectedColorChoice.accent
        : selectedColorChoice.secondary;
      const textShadowColor = isHighlight
        ? selectedColorChoice.accent
        : selectedColorChoice.secondary;

      // Apply text transform based on highlight status
      const textTransform = isHighlight
        ? style?.textTransformMain || 'none'
        : style?.textTransformSub || 'none';

      // Apply text transform to the word text
      let transformedText = word.text;
      switch (textTransform) {
        case 'uppercase':
          transformedText = word.text.toUpperCase();
          break;
        case 'lowercase':
          transformedText = word.text.toLowerCase();
          break;
        case 'capitalize':
          transformedText =
            word.text.charAt(0).toUpperCase() +
            word.text.slice(1).toLowerCase();
          break;
        case 'none':
        default:
          transformedText = word.text;
          break;
      }

      return {
        type: 'atom',
        id: wordId,
        componentId: 'TextAtom',
        effects: effects,
        data: {
          text: transformedText,
          className: isHighlight
            ? 'rounded-xl text-xl font-bold tracking-wide'
            : 'rounded-xl text-xl',
          style: {
            fontSize: fontCalculatedSize,
            color: textColor,
            ...fontStyle,
          },
          font: {
            family: fontFamily,
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
      } as RenderableComponentData;
    });
  };

  // Smart word selection algorithm for highlighting
  const selectHighlightWord = (words: any[], metadata?: any) => {
    // If AI metadata is available, use it for selection
    if (metadata?.highlightWordIndex !== undefined) {
      return metadata.highlightWordIndex;
    }

    const wordDurations = words.map(word => word.duration);
    const avgDuration =
      wordDurations.reduce((sum, dur) => sum + dur, 0) / words.length;
    const maxDuration = Math.max(...wordDurations);

    // Check if all words are fast (less than 0.5 seconds)
    const allFast = wordDurations.every(dur => dur < 0.5);

    if (allFast) {
      // Sort by word length and pick from top 3 longest
      const wordsWithLength = words.map((word, index) => ({
        word,
        index,
        length: word.text.length,
      }));

      const sortedByLength = wordsWithLength.sort(
        (a, b) => b.length - a.length,
      );
      const topThree = sortedByLength.slice(0, 3);
      return topThree[Math.floor(Math.random() * topThree.length)].index;
    }

    // Find words with significant duration
    const significantWords = words.map((word, index) => ({
      word,
      index,
      duration: word.duration,
      isSignificant:
        word.duration >= avgDuration * 0.8 ||
        word.duration >= maxDuration * 0.7,
    }));

    // Find context words (short words that precede/succeed long duration words)
    const contextWords = [];
    for (let i = 0; i < words.length; i++) {
      const currentWord = words[i];
      const prevWord = i > 0 ? words[i - 1] : null;
      const nextWord = i < words.length - 1 ? words[i + 1] : null;

      const isShort = currentWord.duration < avgDuration * 0.6;
      const hasLongNeighbor =
        (prevWord && prevWord.duration >= maxDuration * 0.8) ||
        (nextWord && nextWord.duration >= maxDuration * 0.8);

      if (isShort && hasLongNeighbor) {
        contextWords.push(i);
      }
    }

    // Combine significant words and context words
    const candidateIndices = [
      ...significantWords.filter(w => w.isSignificant).map(w => w.index),
      ...contextWords,
    ];

    const uniqueCandidates = [...new Set(candidateIndices)];

    // If we have candidates, pick one randomly
    if (uniqueCandidates.length > 0) {
      return uniqueCandidates[
        Math.floor(Math.random() * uniqueCandidates.length)
      ];
    }

    // Fallback: pick the word with longest duration
    return wordDurations.indexOf(maxDuration);
  };

  // Applies noGaps extension to reduce gaps between captions
  const applyNoGapsExtension = (
    captions: Transcription['captions'],
    noGapsConfig: any,
  ) => {
    if (!noGapsConfig?.enabled) {
      return captions;
    }

    const maxExtension = noGapsConfig.maxLength || 3;
    const extendedCaptions = [...captions];

    for (let i = 0; i < extendedCaptions.length - 1; i++) {
      const currentCaption = extendedCaptions[i];
      const nextCaption = extendedCaptions[i + 1];

      const currentEnd = currentCaption.absoluteEnd;
      const nextStart = nextCaption.absoluteStart;
      const gap = nextStart - currentEnd;

      // If there's a gap, extend the current caption
      if (gap > 0) {
        const extensionAmount = Math.min(gap, maxExtension);
        const newDuration = currentCaption.duration + extensionAmount;
        const newAbsoluteEnd = currentCaption.absoluteStart + newDuration;

        // Update the current caption's duration and all word timings
        extendedCaptions[i] = {
          ...currentCaption,
          duration: newDuration,
          absoluteEnd: newAbsoluteEnd,
          words: currentCaption.words.map((word, _j: number) => {
            // Extend the last word to fill the gap
            if (_j === currentCaption.words.length - 1) {
              return {
                ...word,
                duration: word.duration + extensionAmount,
                absoluteEnd: word.absoluteEnd + extensionAmount,
              };
            }
            return word;
          }),
        };
      }
    }

    return extendedCaptions;
  };

  // Generates position based on alignment type
  const getPosition = (height: number, positionConfig: any) => {
    const { align, top, left, right, bottom, radius, randomize } =
      positionConfig;

    // Handle fixed positioning
    if (align === 'fixed') {
      const style: any = { position: 'absolute' as const };

      if (top !== undefined) style.top = `${top}px`;
      if (left !== undefined) style.left = `${left}px`;
      if (right !== undefined) style.right = `${right}px`;
      if (bottom !== undefined) style.bottom = `${bottom}px`;

      return style;
    }

    // Handle circle positioning
    if (align === 'circle') {
      const circleRadius = radius || 200; // Default radius
      const centerX = 960; // Center of 1920px width
      const centerY = 540; // Center of 1080px height

      // Generate random angle for position on circle circumference
      const angle = Math.random() * 2 * Math.PI;
      const circleX = centerX + circleRadius * Math.cos(angle);
      const circleY = centerY + circleRadius * Math.sin(angle);

      return {
        position: 'absolute' as const,
        left: `${Math.max(0, Math.min(1920 - 200, circleX))}px`,
        top: `${Math.max(0, Math.min(1080 - (height || 600), circleY))}px`,
      };
    }

    // Handle random positioning
    if (align === 'random' || randomize) {
      const maxTop = 1080 - (height || 600);
      const maxLeft = 1920 - 1000;

      const randomTop = 100 + Math.random() * maxTop;
      const randomLeft = 100 + Math.random() * maxLeft;

      return {
        position: 'absolute' as const,
        top: `${randomTop}px`,
        left: `${randomLeft}px`,
      };
    }

    // Handle left, center, right alignments
    const baseStyle: any = { position: 'absolute' as const };

    switch (align) {
      case 'left':
        return {
          ...baseStyle,
          left: '80px',
          top: '50%',
          transform: 'translateY(-50%)',
        };
      case 'center':
        return {
          ...baseStyle,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        };
      case 'right':
        return {
          ...baseStyle,
          right: '80px',
          top: '50%',
          transform: 'translateY(-50%)',
        };
      default:
        return {
          ...baseStyle,
          left: '80px',
          top: '50%',
          transform: 'translateY(-50%)',
        };
    }
  };

  // Creates part-specific layout with animations
  const createPartLayout = (
    partWords: any[],
    partIndex: number,
    totalParts: number,
    caption: any,
    avgFontSize: number | undefined,
    selectedFontChoice: any,
    selectedColorChoice: any,
    partId: string,
    scentenceId: string,
    floatThreshold?: number,
    textAlign?: string,
    style?: any,
    animationStyle?: string,
    layout?: string,
    fontScaling?: { highlighted?: number; normal?: number },
    globalImpact?: number,
    isGlowEnabled?: boolean,
  ) => {
    const wordsData = generateWordsData(
      partWords,
      caption,
      selectedFontChoice,
      avgFontSize,
      selectedColorChoice,
      partId,
      scentenceId,
      style,
      animationStyle,
      fontScaling,
      globalImpact,
      isGlowEnabled,
    );

    // Calculate displacement based on character count or floatThreshold
    const partCharacterCount = partWords.reduce(
      (sum, word) => sum + word.text.length,
      0,
    );

    // If floatThreshold is provided, use it; otherwise calculate based on character count
    const displacement =
      floatThreshold !== undefined
        ? floatThreshold
        : Math.max(5, Math.min(30, partCharacterCount * 1.5)); // Scale with character count, min 5, max 30

    // Create part-specific effects using provider mode - only apply horizontal effects if layout is vertical
    const effects = [];
    if (layout === 'vertical') {
      const partRanges = [
        {
          key: 'translateX',
          val: partIndex % 2 === 0 ? displacement : -displacement,
          prog: 0,
        },
        {
          key: 'translateX',
          val: partIndex % 2 === 0 ? -displacement : displacement,
          prog: 1,
        },
      ];

      const partEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0,
        duration: 8,
        mode: 'provider',
        targetIds: [partId],
        ranges: partRanges,
      };

      effects.push({
        id: `part-effects-${partId}`,
        componentId: 'generic',
        data: partEffect,
      });
    }

    // Part containers should always be horizontal (words within a part are horizontal)
    // The layout parameter only affects the main container (how parts are arranged)
    if (layout === 'horizontal') {
      // Calculate gap based on font size - use a percentage of the font size
      const baseFontSize = avgFontSize || 50;
      const gapSize = Math.max(8, Math.floor(baseFontSize * 0.3)); // 30% of font size, minimum 8px
      const containerClassName =
        'relative flex flex-row items-center justify-center';

      return {
        type: 'layout',
        id: partId,
        componentId: 'BaseLayout',
        effects: effects,
        data: {
          containerProps: {
            className: containerClassName,
            style: {
              gap: `${gapSize}px`,
            },
          },
        },
        context: {
          boundaries: {
            reset: true,
          },
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: wordsData,
      } as RenderableComponentData;
    } else {
      // For vertical layout, parts are vertical but words within each part are horizontal
      const containerClassName =
        'relative flex flex-row gap-8 items-center justify-center';

      return {
        type: 'layout',
        id: partId,
        componentId: 'BaseLayout',
        effects: effects,
        data: {
          containerProps: {
            className: containerClassName,
          },
        },
        context: {
          boundaries: {
            reset: true,
          },
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: wordsData,
      } as RenderableComponentData;
    }
  };

  // Processes captions and applies highlighting logic
  const processCaptions = (
    inputCaptions: any[],
    negativeOffset: number | undefined,
    noGapsConfig: any,
    avgFontSize: number | undefined,
    selectedFontChoice: any,
    selectedColorChoice: any,
    maxLines?: number,
    floatThreshold?: number,
    textAlign?: string,
    disableMetadata?: boolean,
    style?: any,
    animationStyle?: string,
    layout?: string,
    fontScaling?: { highlighted?: number; normal?: number },
    globalImpact?: number,
    isGlowEnabled?: boolean,
  ) => {
    // Pre-process captions to split combined words
    const preprocessedCaptions = preprocessCaptions(inputCaptions);

    // Apply negative offset to all captions
    const offsetCaptions = preprocessedCaptions.map(caption => ({
      ...caption,
      absoluteStart: caption.absoluteStart - (negativeOffset ?? 0.15),
      absoluteEnd: caption.absoluteEnd - (negativeOffset ?? 0.15),
    }));

    // Apply noGaps extension if enabled
    const processedCaptions = applyNoGapsExtension(
      offsetCaptions,
      noGapsConfig,
    );

    return processedCaptions.map(
      (caption: Transcription['captions'][number], _i: number) => {
        const scentenceId = `caption-${_i}`;

        // Split sentence into parts first (use metadata.splitParts if available)
        const sentenceParts = splitSentenceIntoParts(
          caption.words,
          maxLines,
          caption.metadata?.splitParts,
        );

        // Determine which part to highlight
        const highlightedWordIndices: number[] = [];
        if (!disableMetadata && caption.metadata?.keyword?.length > 0) {
          const cleanKeywords = caption.metadata?.keyword
            .toLowerCase()
            .split(' ')
            .map((keyword: string) => keyword.replace(/[^a-zA-Z0-9]/g, ''));
          caption.words.forEach((word, index) => {
            const cleanWord = word.text
              ?.toLowerCase()
              .replace(/[^a-zA-Z0-9]/g, '');
            if (
              cleanKeywords.some((_keyword: string) =>
                cleanWord?.includes(_keyword),
              )
            ) {
              highlightedWordIndices.push(index);
            }
          });
        }

        let highlightedPartIndex = -1;
        let highlightedWordIndex = -1;

        if (highlightedWordIndices.length === 0) {
          if (!disableMetadata && caption.metadata?.keyword?.length > 0) {
            // Find the word index that contains the keyword
            const keywordWordIndex = caption.words.findIndex(word =>
              caption.metadata?.keyword
                ?.toLowerCase()
                ?.includes(word.text?.toLowerCase() || ''),
            );
            if (keywordWordIndex !== -1) {
              // Find which part contains this word
              let wordCount = 0;
              for (let i = 0; i < sentenceParts.length; i++) {
                const part = sentenceParts[i];
                if (keywordWordIndex < wordCount + part.length) {
                  // Check if the part is too long (more than 2 words or 10 characters)
                  const partCharacterCount = part.reduce(
                    (sum, word) => sum + word.text.length,
                    0,
                  );
                  const isPartTooLong =
                    part.length > 2 || partCharacterCount > 10;

                  if (isPartTooLong) {
                    // Only highlight the specific word containing the keyword
                    highlightedPartIndex = -1; // Don't highlight entire part
                    highlightedWordIndex = keywordWordIndex;
                  } else {
                    // Highlight the entire part if it's short enough
                    highlightedPartIndex = i;
                    highlightedWordIndex = keywordWordIndex;
                  }
                  break;
                }
                wordCount += part.length;
              }
            }
          }

          // Only apply fallback logic if no keyword was found in metadata
          if (highlightedPartIndex === -1 && highlightedWordIndex === -1) {
            // Always select a single word to highlight, never entire parts
            const allWords = caption.words;
            const wordDurations = allWords.map(word => word.duration);
            const avgDuration =
              wordDurations.reduce((sum, dur) => sum + dur, 0) /
              allWords.length;
            const maxDuration = Math.max(...wordDurations);

            // Find the word with the longest duration that's above average
            const significantWords = allWords
              .map((word, index) => ({ word, index, duration: word.duration }))
              .filter(
                w =>
                  w.duration >= avgDuration * 0.8 ||
                  w.duration >= maxDuration * 0.7,
              )
              .sort((a, b) => b.duration - a.duration);

            if (significantWords.length > 0) {
              // Select the most significant word
              highlightedWordIndex = significantWords[0].index;
            } else {
              // Fallback: select the word with maximum duration
              highlightedWordIndex = wordDurations.indexOf(maxDuration);
            }
          }
        }

        // Ensure at least one word is highlighted
        if (
          highlightedWordIndices.length === 0 &&
          highlightedPartIndex === -1 &&
          highlightedWordIndex === -1
        ) {
          highlightedWordIndex = 0; // Fallback to first word
        }

        // Apply highlighting logic to words
        const captionWords = caption.words.map((word, _j: number) => {
          let isHighlight = false;

          if (highlightedWordIndices.length > 0) {
            isHighlight =
              highlightedWordIndices.includes(_j) ||
              ((word as any).isSubWord &&
                highlightedWordIndices.includes(
                  (word as any).originalWordIndex,
                ));
          } else {
            // If we have a specific word to highlight (from keyword metadata or fallback)
            if (highlightedWordIndex >= 0 && highlightedPartIndex === -1) {
              // Check if this word should be highlighted (including sub-words)
              if ((word as any).originalWordIndex === highlightedWordIndex) {
                isHighlight = true;
              } else {
                isHighlight = _j === highlightedWordIndex;
              }
            } else if (highlightedWordIndex >= 0) {
              // If we have both part and word index, prioritize word index
              if ((word as any).originalWordIndex === highlightedWordIndex) {
                isHighlight = true;
              } else {
                isHighlight = _j === highlightedWordIndex;
              }
            } else if (highlightedPartIndex >= 0) {
              const highlightedPart = sentenceParts[highlightedPartIndex];
              const isLastPart =
                highlightedPartIndex === sentenceParts.length - 1;

              if (isLastPart) {
                // Find which part this word belongs to
                let wordPartIndex = -1;
                let currentIndex = 0;

                for (
                  let partIndex = 0;
                  partIndex < sentenceParts.length;
                  partIndex++
                ) {
                  const part = sentenceParts[partIndex];
                  if (_j >= currentIndex && _j < currentIndex + part.length) {
                    wordPartIndex = partIndex;
                    break;
                  }
                  currentIndex += part.length;
                }

                isHighlight = wordPartIndex === highlightedPartIndex;
              } else {
                // For first part, find a representative word to highlight
                if (highlightedWordIndex === -1) {
                  const partStartIndex = sentenceParts
                    .slice(0, highlightedPartIndex)
                    .reduce((sum, part) => sum + part.length, 0);
                  const partEndIndex = partStartIndex + highlightedPart.length;
                  const partWords = caption.words.slice(
                    partStartIndex,
                    partEndIndex,
                  );

                  const maxDuration = Math.max(
                    ...partWords.map(w => w.duration),
                  );
                  highlightedWordIndex =
                    partWords.findIndex(w => w.duration === maxDuration) +
                    partStartIndex;
                }

                isHighlight = _j === highlightedWordIndex;
              }
            }
          }

          return {
            ...word,
            metadata: {
              isHighlight,
            },
          };
        });

        const totalParts = sentenceParts.length;

        // Create layout for each part
        const partsData = sentenceParts.map((partWords, partIndex) => {
          const startIndex = sentenceParts
            .slice(0, partIndex)
            .reduce((sum, part) => sum + part.length, 0);
          const endIndex = startIndex + partWords.length;
          const modifiedPartWords = captionWords.slice(startIndex, endIndex);
          const partId = `part-${partIndex}`;

          return createPartLayout(
            modifiedPartWords,
            partIndex,
            totalParts,
            caption,
            avgFontSize,
            selectedFontChoice,
            selectedColorChoice,
            partId,
            scentenceId,
            floatThreshold,
            textAlign,
            style,
            animationStyle,
            layout,
            fontScaling,
            globalImpact,
            isGlowEnabled,
          );
        });

        // Main sentence block layout
        if (layout === 'horizontal') {
          // Calculate gap based on font size for horizontal layout
          const baseFontSize = avgFontSize || 50;
          const gapSize = Math.max(8, Math.floor(baseFontSize * 0.2)); // 20% of font size for main container, minimum 8px
          const mainLayoutClassName = `h-full flex flex-row ${
            textAlign === 'left'
              ? 'items-start'
              : textAlign === 'right'
                ? 'items-end'
                : 'items-center'
          } justify-center text-white pl-10`;

          return {
            type: 'layout',
            id: scentenceId,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: mainLayoutClassName,
                style: {
                  gap: `${gapSize}px`,
                },
              },
            },
            context: {
              boundaries: {
                reset: true,
              },
              timing: {
                start: caption.absoluteStart,
                duration: caption.duration,
              },
            },
            childrenData: partsData,
          } as RenderableComponentData;
        } else {
          const mainLayoutClassName = `h-full flex flex-col ${
            textAlign === 'left'
              ? 'items-start'
              : textAlign === 'right'
                ? 'items-end'
                : 'items-center'
          } justify-center text-white gap-2 pl-10`;

          return {
            type: 'layout',
            id: scentenceId,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: mainLayoutClassName,
              },
            },
            context: {
              boundaries: {
                reset: true,
              },
              timing: {
                start: caption.absoluteStart,
                duration: caption.duration,
              },
            },
            childrenData: partsData,
          } as RenderableComponentData;
        }
      },
    );
  };

  // Select random font and color choices
  const selectedFontChoice =
    FONT_CHOICES[Math.floor(Math.random() * FONT_CHOICES.length)];
  const selectedColorChoice =
    colorChoices && colorChoices.length > 0
      ? colorChoices[Math.floor(Math.random() * colorChoices.length)]
      : {
          primary: '#ffffff',
          secondary: '#cccccc',
          accent: '#ff6b6b',
        };

  // Process all captions with highlighting and effects
  const captionsChildrenData = processCaptions(
    inputCaptions,
    subtitleSync?.negativeOffset,
    subtitleSync?.noGaps,
    avgFontSize,
    selectedFontChoice,
    selectedColorChoice,
    subtitleSync?.maxLines,
    subtitleSync?.floatThreshold,
    position?.textAlign,
    subtitleSync?.disableMetadata,
    style,
    subtitleSync?.animationStyle,
    subtitleSync?.layout,
    subtitleSync?.fontScaling,
    subtitleSync?.impact,
    subtitleSync?.isGlowEnabled,
  );
  captionsChildrenData.forEach((captionNode, index) => {
    const built = props?.buildDataItemIds?.({
      paramKeys: ['inputCaptions'],
      arrayIndex: index,
    });
    const ids =
      built != null && built.length > 0 ? built : ['inputCaptions.[${index}]'];
    props?.applyDataItemIdsToNodeTree?.(captionNode, ids);
  });

  const lastCaptionTiming =
    captionsChildrenData[captionsChildrenData.length - 1]?.context?.timing;
  const totalCaptionsDuration =
    (lastCaptionTiming?.start ?? 0) + (lastCaptionTiming?.duration ?? 0);

  // Generate final composition structure
  return {
    output: {
      config: {
        duration: totalCaptionsDuration,
      },
      childrenData: [
        {
          id: 'SubtitlesOverlay',
          componentId: 'BaseLayout',
          type: 'layout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
            childrenProps: Array(captionsChildrenData.length)
              .fill({
                className: 'absolute',
              })
              .map((child, _j) => {
                // Get position based on position configuration
                const positionStyle = getPosition(
                  (inputCaptions[_j]?.text?.length ?? 0) > 20 ? 800 : 600,
                  position,
                );

                return {
                  ...child,
                  style: positionStyle,
                };
              }),
          },
          context: {
            timing: {
              start: 0,
              duration: totalCaptionsDuration,
            },
          },
          childrenData: captionsChildrenData,
        } as RenderableComponentData,
      ],
    },
    options: {
      attachedToId: `BaseScene`,
      attachedContainers: [
        {
          className: 'absolute inset-0',
        },
      ],
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'sub-vertical-float',
  title: 'Subtitles Vertical Float',
  description:
    'Kinetic Subtitle with configurable layout (horizontal or vertical) and smooth melodic animations including fade-blur, wave-breathing, color-flow, and gentle drift effects perfect for melodic content',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'vertical',
    'horizontal',
    'float',
    'melodic',
    'smooth',
    'fade',
    'blur',
    'wave',
    'breathing',
    'color-flow',
    'drift',
    'slide',
    'typewriter',
    'bounce',
    'ripple',
    'zoom',
    'cascade',
  ],
  defaultInputParams: {
    subtitleSync: {
      animationStyle: 'horizontal-slide-reveal',
      layout: 'horizontal',
      negativeOffset: 0.15,
      maxLines: 5,
      floatThreshold: 15,
      disableMetadata: false,
      noGaps: {
        enabled: false,
        maxLength: 3,
      },
      fontScaling: {
        highlighted: 1.35,
        normal: 0.85,
      },
      impact: 0.3,
      isGlowEnabled: false,
    },
    position: {
      align: 'left',
      randomize: false,
      textAlign: 'center',
    },
    fontChoices: [
      {
        primaryFont: 'Roboto:600:italic',
        headerFont: 'BebasNeue',
      },
    ],
    colorChoices: [
      {
        primary: '#ffffff',
        secondary: '#cccccc',
        accent: '#ff6b6b',
      },
    ],
    style: {
      textTransformSub: 'uppercase',
      textTransformMain: 'uppercase',
    },
    avgFontSize: 50,
    inputCaptions: [
      {
        id: 'caption-1',
        text: 'Hello, world!',
        absoluteStart: 0,
        absoluteEnd: 10,
        start: 0,
        end: 10,
        duration: 10,
        metadata: {},
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            duration: 5,
            absoluteStart: 0,
            absoluteEnd: 5,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'world',
            start: 5,
            duration: 5,
            absoluteStart: 5,
            absoluteEnd: 10,
            confidence: 1,
          },
        ],
      },
    ],
  },
};

const _presetExecution = presetExecution.toString();

export const subVerticalFloatPreset = {
  metadata: presetMetadata,
  presetFunction: _presetExecution,
  presetParams: z.toJSONSchema(presetParams),
};

// I want ti to select 1 random font pair if not given.
// the placement of the scentence should be random.
// fontsizing should not be same, ( highlight should be highlighted )
// animation effects should be smooth ( not simple fade in )
// add boxed/glassy blur effects
// inversion of colors ( if dark image bg or plain colored bg)
