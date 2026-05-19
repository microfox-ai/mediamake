/**
 * Fast Rap Static Subtitles Preset
 *
 * This preset creates fast-paced, static-style subtitles optimized for rapid speech content
 * like rap music or fast-paced narration. It displays text with minimal animations for clarity.
 *
 * Features:
 * - **Fast-Paced Display**: Optimized for rapid text changes
 * - **Static Style**: Minimal animations for clear readability
 * - **Flexible Positioning**: Left, center, right, circle, random, or fixed positioning
 * - **Font & Color Customization**: Custom font families and color schemes
 * - **Timing Optimization**: Optimized for quick text transitions
 *
 * Use cases:
 * - Creating subtitles for rap music videos
 * - Displaying fast-paced narration
 * - Creating clear, readable text for rapid speech
 * - Building static-style caption displays
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
  inputCaptions: z
    .array(z.any())
    .meta({
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
    eachWordAScentence: z
      .boolean()
      .optional()
      .describe('each word as a sentence'),
    // Transition styles optimized for fast rap
    transitionStyle: z
      .enum([
        'blur-slide-right', // Fast blur slide in from right after each sentence
        'fade-blur-smooth', // Smooth fade with blur transition between sentences
        'scale-blur-entrance', // Scale up with blur for dramatic entrance
        'slide-up-blur', // Slide up from bottom with blur effect
        'zoom-blur-impact', // Zoom in with blur for high impact
        'glitch-blur-transition', // Glitch-style transition with blur
        'wave-blur-flow', // Wave-like motion with blur for flow
        'pulse-blur-beat', // Pulse effect with blur matching beat
      ])
      .default('blur-slide-right')
      .optional(),
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
    transitionDuration: z
      .number()
      .default(0.3)
      .optional()
      .describe('duration of transition between sentences'),
    staticWordOpacity: z
      .number()
      .default(1.0)
      .optional()
      .describe('opacity for static words (0.0 to 1.0)'),
    highlightIntensity: z
      .number()
      .default(1.2)
      .optional()
      .describe('intensity multiplier for highlighted words'),
    disableMetadata: z
      .boolean()
      .optional()
      .describe('ignore all metadata provided in captions'),
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
      extraStyleProps: z.any().optional().describe('extra style properties'),
    })
    .optional()
    .describe('style'),
  avgFontSize: z.number().optional().describe('average font size'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props?: Partial<PresetPassedProps>,
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
            primaryFont: 'Roboto:700:normal',
            headerFont: 'BebasNeue:900',
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
              originalWordIndex: originalWordIndex,
              isSubWord: true,
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

  // Pre-processes captions to split each word into its own caption
  const preprocessCaptionsForEachWord = (captions: any[]) => {
    const wordCaptions: any[] = [];

    captions.forEach((caption, captionIndex) => {
      caption.words.forEach((word: any, wordIndex: number) => {
        const wordCaption = {
          ...caption,
          id: `word-caption-${captionIndex}-${wordIndex}`,
          text: word.text,
          absoluteStart: word.absoluteStart,
          absoluteEnd: word.absoluteEnd,
          start: 0, // Relative to caption, so always 0
          end: word.absoluteEnd - word.absoluteStart, // Duration
          duration: word.absoluteEnd - word.absoluteStart,
          words: [
            {
              ...word,
              start: 0, // Relative to caption, so always 0
              duration: word.absoluteEnd - word.absoluteStart,
              absoluteStart: word.absoluteStart,
              absoluteEnd: word.absoluteEnd,
            },
          ],
          metadata: {
            ...caption.metadata,
            isWordCaption: true,
            originalCaptionIndex: captionIndex,
            wordIndex: wordIndex,
          },
        };
        wordCaptions.push(wordCaption);
      });
    });

    return wordCaptions;
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
    const targetLines = maxLines || 3; // Reduced for fast rap

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

  // Creates sentence-level transition effects
  const createSentenceTransitionEffect = (
    sentenceId: string,
    transitionStyle: string,
    transitionDuration: number,
    selectedColorChoice: any,
  ): GenericEffectData => {
    const accentRgb = hexToRgb(selectedColorChoice.accent) || {
      r: 255,
      g: 107,
      b: 107,
    };

    switch (transitionStyle) {
      case 'blur-slide-right':
        return {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [sentenceId],
          ranges: [
            {
              key: 'translateX',
              val: 200,
              prog: 0,
            },
            {
              key: 'translateX',
              val: 0,
              prog: 1,
            },
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 1,
              prog: 1,
            },
          ],
        };

      case 'fade-blur-smooth':
        return {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [sentenceId],
          ranges: [
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 0.3,
              prog: 0.3,
            },
            {
              key: 'opacity',
              val: 1,
              prog: 1,
            },
            {
              key: 'filter',
              val: `blur(6px) drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `blur(0px) drop-shadow(0 0 8px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.6))`,
              prog: 1,
            },
          ],
        };

      case 'scale-blur-entrance':
        return {
          type: 'spring',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [sentenceId],
          ranges: [
            {
              key: 'scale',
              val: 0.8,
              prog: 0,
            },
            {
              key: 'scale',
              val: 1.05,
              prog: 0.7,
            },
            {
              key: 'scale',
              val: 1,
              prog: 1,
            },
            {
              key: 'filter',
              val: `blur(4px) drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `blur(0px) drop-shadow(0 0 10px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.7))`,
              prog: 1,
            },
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 1,
              prog: 1,
            },
          ],
        };

      case 'slide-up-blur':
        return {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [sentenceId],
          ranges: [
            {
              key: 'translateY',
              val: 100,
              prog: 0,
            },
            {
              key: 'translateY',
              val: 0,
              prog: 1,
            },
            {
              key: 'filter',
              val: `blur(6px) drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `blur(0px) drop-shadow(0 0 8px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.6))`,
              prog: 1,
            },
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 1,
              prog: 1,
            },
          ],
        };

      case 'zoom-blur-impact':
        return {
          type: 'spring',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [sentenceId],
          ranges: [
            {
              key: 'scale',
              val: 0.5,
              prog: 0,
            },
            {
              key: 'scale',
              val: 1.1,
              prog: 0.6,
            },
            {
              key: 'scale',
              val: 1,
              prog: 1,
            },
            {
              key: 'filter',
              val: `blur(10px) drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `blur(0px) drop-shadow(0 0 15px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.9))`,
              prog: 1,
            },
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 1,
              prog: 1,
            },
          ],
        };

      case 'glitch-blur-transition':
        return {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [sentenceId],
          ranges: [
            {
              key: 'translateX',
              val: -20,
              prog: 0,
            },
            {
              key: 'translateX',
              val: 20,
              prog: 0.3,
            },
            {
              key: 'translateX',
              val: -10,
              prog: 0.6,
            },
            {
              key: 'translateX',
              val: 0,
              prog: 1,
            },
            {
              key: 'filter',
              val: `blur(8px) drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0)) contrast(1.5) brightness(1.2)`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `blur(0px) drop-shadow(0 0 12px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.8)) contrast(1) brightness(1)`,
              prog: 1,
            },
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 1,
              prog: 1,
            },
          ],
        };

      case 'wave-blur-flow':
        return {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [sentenceId],
          ranges: [
            {
              key: 'translateY',
              val: Math.sin(0) * 20,
              prog: 0,
            },
            {
              key: 'translateY',
              val: Math.sin(0.5) * 20,
              prog: 0.5,
            },
            {
              key: 'translateY',
              val: 0,
              prog: 1,
            },
            {
              key: 'filter',
              val: `blur(6px) drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `blur(0px) drop-shadow(0 0 8px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.6))`,
              prog: 1,
            },
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 1,
              prog: 1,
            },
          ],
        };

      case 'pulse-blur-beat':
        return {
          type: 'spring',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [sentenceId],
          ranges: [
            {
              key: 'scale',
              val: 0.9,
              prog: 0,
            },
            {
              key: 'scale',
              val: 1.1,
              prog: 0.4,
            },
            {
              key: 'scale',
              val: 0.95,
              prog: 0.7,
            },
            {
              key: 'scale',
              val: 1,
              prog: 1,
            },
            {
              key: 'filter',
              val: `blur(4px) drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `blur(0px) drop-shadow(0 0 10px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.7))`,
              prog: 1,
            },
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 1,
              prog: 1,
            },
          ],
        };

      default:
        return {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [sentenceId],
          ranges: [
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 1,
              prog: 1,
            },
          ],
        };
    }
  };

  // Creates static word data without animations
  const generateStaticWordsData = (
    words: any[],
    caption: any,
    selectedFontChoice: any,
    avgFontSize: number | undefined,
    selectedColorChoice: any,
    partId: string,
    scentenceId: string,
    style?: any,
    staticWordOpacity: number = 1.0,
    highlightIntensity: number = 1.2,
  ) => {
    return words.map((word, _j: number) => {
      const wordId = `word-${_j}-${partId}-${scentenceId}`;
      const isHighlight = word.metadata?.isHighlight;

      // Calculate font size and style
      let fontSize = avgFontSize ?? 50;
      const fontCalculatedSize = isHighlight
        ? fontSize * 1.35 * highlightIntensity
        : fontSize * 0.85;
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
        ? selectedColorChoice.secondary
        : selectedColorChoice.primary;

      const accentRgb = hexToRgb(selectedColorChoice.accent);
      const textShadowStyle = {
        filter:
          `drop-shadow(0 0 8px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.7))` as any,
      };
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

      const effects = [];

      if (isHighlight) {
        const accentRgb = hexToRgb(selectedColorChoice.accent);
        effects.push({
          id: `glow-effect-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: caption.duration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              {
                key: 'filter',
                val: `drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))`,
                prog: 0,
              },
              {
                key: 'filter',
                val: `drop-shadow(0 0 8px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.7))`,
                prog: 0.5,
              },
              {
                key: 'filter',
                val: `drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))`,
                prog: 1,
              },
            ],
          } as GenericEffectData,
        });
      }

      return {
        type: 'atom',
        id: wordId,
        componentId: 'TextAtom',
        effects: effects, // No word-level effects for static approach
        data: {
          text: transformedText,
          className: isHighlight
            ? 'rounded-xl text-xl font-bold tracking-wide'
            : 'rounded-xl text-xl',
          style: {
            fontSize: fontCalculatedSize,
            color: textColor,
            opacity: staticWordOpacity,
            ...fontStyle,
            ...style?.extraStyleProps,
            ...textShadowStyle,
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

    // For fast rap, prioritize words with longer duration or significant impact
    const significantWords = words.map((word, index) => ({
      word,
      index,
      duration: word.duration,
      isSignificant:
        word.duration >= avgDuration * 0.8 ||
        word.duration >= maxDuration * 0.7,
    }));

    // Find the most significant word
    const candidates = significantWords.filter(w => w.isSignificant);
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)].index;
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
      const circleRadius = radius || 200;
      const centerX = 960;
      const centerY = 540;

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

  // Creates part-specific layout with static words
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
    textAlign?: string,
    style?: any,
    staticWordOpacity: number = 1.0,
    highlightIntensity: number = 1.2,
  ) => {
    const wordsData = generateStaticWordsData(
      partWords,
      caption,
      selectedFontChoice,
      avgFontSize,
      selectedColorChoice,
      partId,
      scentenceId,
      style,
      staticWordOpacity,
      highlightIntensity,
    );

    return {
      type: 'layout',
      id: partId,
      componentId: 'BaseLayout',
      effects: [], // No part-level effects for static approach
      data: {
        containerProps: {
          className: 'relative flex flex-row gap-4 items-center justify-center',
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
    textAlign?: string,
    disableMetadata?: boolean,
    style?: any,
    transitionStyle?: string,
    transitionDuration?: number,
    staticWordOpacity?: number,
    highlightIntensity?: number,
    eachWordAScentence?: boolean,
  ): { captionsChildrenData: any[]; finalCaptions: any[] } => {
    // Pre-process captions based on eachWordAScentence option
    let preprocessedCaptions;
    if (eachWordAScentence) {
      preprocessedCaptions = preprocessCaptionsForEachWord(inputCaptions);
    } else {
      preprocessedCaptions = preprocessCaptions(inputCaptions);
    }

    // Apply negative offset to all captions
    const offsetCaptions = preprocessedCaptions.map(caption => ({
      ...caption,
      absoluteStart: caption.absoluteStart - (negativeOffset ?? 0.15),
      absoluteEnd: caption.absoluteEnd - (negativeOffset ?? 0.15),
    }));

    // Apply noGaps extension if enabled
    const finalCaptions = applyNoGapsExtension(offsetCaptions, noGapsConfig);

    const captionsChildrenData = finalCaptions.map(
      (caption: Transcription['captions'][number], _i: number) => {
        const scentenceId = `caption-${_i}`;

        // Split sentence into parts first (use metadata.splitParts if available)
        const sentenceParts = splitSentenceIntoParts(
          caption.words,
          maxLines,
          caption.metadata?.splitParts,
        );

        // Determine which word to highlight
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

        // Only apply fallback logic if no keyword was found in metadata
        if (highlightedWordIndices.length === 0) {
          let highlightedWordIndex = selectHighlightWord(
            caption.words,
            caption.metadata,
          );

          // Ensure at least one word is highlighted
          if (highlightedWordIndex === -1) {
            highlightedWordIndex = 0; // Fallback to first word
          }
          highlightedWordIndices.push(highlightedWordIndex);
        }

        // Apply highlighting logic to words
        const captionWords = caption.words.map((word, _j: number) => {
          const isHighlight =
            highlightedWordIndices.includes(_j) ||
            ((word as any).isSubWord &&
              highlightedWordIndices.includes((word as any).originalWordIndex));

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
            textAlign,
            style,
            staticWordOpacity,
            highlightIntensity,
          );
        });

        // Create sentence-level transition effect
        const sentenceTransitionEffect = createSentenceTransitionEffect(
          scentenceId,
          transitionStyle || 'blur-slide-right',
          transitionDuration || 0.3,
          selectedColorChoice,
        );

        // Main sentence block layout with transition
        return {
          type: 'layout',
          id: scentenceId,
          componentId: 'BaseLayout',
          effects: [
            {
              id: `sentence-transition-${scentenceId}`,
              componentId: 'generic',
              data: sentenceTransitionEffect,
            },
          ],
          data: {
            containerProps: {
              className: `h-full flex flex-col ${
                textAlign === 'left'
                  ? 'items-start'
                  : textAlign === 'right'
                    ? 'items-end'
                    : 'items-center'
              } justify-center text-white gap-2 pl-10`,
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
      },
    );

    return { captionsChildrenData, finalCaptions };
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
  const { captionsChildrenData, finalCaptions } = processCaptions(
    inputCaptions,
    subtitleSync?.negativeOffset,
    subtitleSync?.noGaps,
    avgFontSize,
    selectedFontChoice,
    selectedColorChoice,
    subtitleSync?.maxLines,
    position?.textAlign,
    subtitleSync?.disableMetadata,
    style,
    subtitleSync?.transitionStyle,
    subtitleSync?.transitionDuration,
    subtitleSync?.staticWordOpacity,
    subtitleSync?.highlightIntensity,
    subtitleSync?.eachWordAScentence,
  );
  captionsChildrenData.forEach((captionNode, index) => {
    const built = props?.buildDataItemIds?.({
      paramKeys: ['inputCaptions'],
      arrayIndex: index,
    });
    const ids =
      built != null && built.length > 0
        ? built
        : ['inputCaptions.[${index}]'];
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
                // Use the processed captions for text length calculation
                const captionForPosition = finalCaptions[_j];
                const textLength = captionForPosition?.text?.length || 0;
                const positionStyle = getPosition(
                  textLength > 20 ? 800 : 600,
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
  id: 'sub-fast-rap-static',
  title: 'Fast Rap Static Subtitles',
  description:
    'Optimized for fast rap content with static words and smooth sentence-level transitions including blur slide, fade effects, and dynamic entrances',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'fast-rap',
    'static',
    'transitions',
    'blur',
    'slide',
    'fade',
    'impact',
    'dynamic',
  ],
  defaultInputParams: {
    subtitleSync: {
      transitionStyle: 'blur-slide-right',
      negativeOffset: 0.15,
      maxLines: 3,
      transitionDuration: 0.3,
      staticWordOpacity: 1.0,
      highlightIntensity: 1.2,
      disableMetadata: false,
      noGaps: {
        enabled: false,
        maxLength: 3,
      },
    },
    position: {
      align: 'left',
      randomize: false,
      textAlign: 'center',
    },
    fontChoices: [
      {
        primaryFont: 'Roboto:700:normal',
        headerFont: 'BebasNeue:900',
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
        text: 'Fast rap lyrics here!',
        absoluteStart: 0,
        absoluteEnd: 10,
        start: 0,
        end: 10,
        duration: 10,
        metadata: {},
        words: [
          {
            id: 'word-1',
            text: 'Fast',
            start: 0,
            duration: 3,
            absoluteStart: 0,
            absoluteEnd: 3,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'rap',
            start: 3,
            duration: 3,
            absoluteStart: 3,
            absoluteEnd: 6,
            confidence: 1,
          },
          {
            id: 'word-3',
            text: 'lyrics',
            start: 6,
            duration: 2,
            absoluteStart: 6,
            absoluteEnd: 8,
            confidence: 1,
          },
          {
            id: 'word-4',
            text: 'here!',
            start: 8,
            duration: 2,
            absoluteStart: 8,
            absoluteEnd: 10,
            confidence: 1,
          },
        ],
      },
    ],
  },
};

const _presetExecution = presetExecution.toString();

export const subFastRapStaticPreset = {
  metadata: presetMetadata,
  presetFunction: _presetExecution,
  presetParams: z.toJSONSchema(presetParams),
};
