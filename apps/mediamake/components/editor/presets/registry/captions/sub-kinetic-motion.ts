/**
 * Kinetic Motion Subtitles Preset
 *
 * This preset creates dynamic, kinetic-style subtitles with motion effects and animations.
 * It provides energetic text animations with various motion styles and positioning options.
 *
 * Features:
 * - **Kinetic Motion Effects**: Dynamic motion animations for text
 * - **Flexible Positioning**: Left, center, right, circle, random, or fixed positioning
 * - **Animation Styles**: Multiple animation modes for engaging text effects
 * - **Font & Color Customization**: Custom font families and color schemes
 * - **Timing Control**: Configurable animation timing and synchronization
 *
 * Use cases:
 * - Creating energetic subtitle animations
 * - Building dynamic text effects with motion
 * - Creating engaging social media content
 * - Adding kinetic typography effects
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
  kineticMotion: z.object({
    animationPreset: z
      .enum([
        'gentle-fade',
        'soft-bounce',
        'smooth-slide',
        'minimal-scale',
        'subtle-glow',
        'gentle-float',
        'smooth-reveal',
        'soft-pulse',
        'elegant-drift',
        'clean-entrance',
        'sharp-reveal',
      ])
      .default('gentle-fade')
      .optional()
      .describe('animation preset style'),
    motionIntensity: z
      .number()
      .default(0.8)
      .optional()
      .describe(
        'global motion intensity multiplier (0.1 = subtle, 3.0 = extreme)',
      ),
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
    disableMetadata: z
      .boolean()
      .optional()
      .describe('ignore all metadata provided in captions'),
    fontScaling: z
      .object({
        highlighted: z
          .number()
          .default(1.2)
          .optional()
          .describe('font size multiplier for highlighted words'),
        normal: z
          .number()
          .default(0.95)
          .optional()
          .describe('font size multiplier for normal words'),
      })
      .optional()
      .describe('font size scaling for different word types'),
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
  props?: Partial<PresetPassedProps>,
): PresetOutput => {
  const {
    inputCaptions,
    position,
    kineticMotion,
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

  // Analyze caption characteristics for smart motion design
  const analyzeCaptionCharacteristics = (caption: any) => {
    // Check if caption has words property and it's an array
    if (
      !caption.words ||
      !Array.isArray(caption.words) ||
      caption.words.length === 0
    ) {
      return {
        isFastPaced: false,
        isSlowPaced: false,
        hasHighVariance: false,
        isLongCaption: (caption.duration || 0) > 5,
        isShortCaption: (caption.duration || 0) < 2,
        hasEmphasis: false,
        avgWordDuration: caption.duration || 1,
        wordCount: 1,
      };
    }

    const wordDurations = caption.words.map((w: any) => w.duration || 1);
    const avgWordDuration =
      wordDurations.reduce((a: number, b: number) => a + b, 0) /
      wordDurations.length;
    const maxWordDuration = Math.max(...wordDurations);
    const minWordDuration = Math.min(...wordDurations);
    const durationVariance = maxWordDuration - minWordDuration;
    const totalDuration = caption.duration;
    const wordCount = caption.words.length;
    const avgWordsPerSecond = wordCount / totalDuration;

    // Determine motion characteristics
    const isFastPaced = avgWordsPerSecond > 2.5;
    const isSlowPaced = avgWordsPerSecond < 1.0;
    const hasHighVariance = durationVariance > avgWordDuration * 0.5;
    const isLongCaption = totalDuration > 5;
    const isShortCaption = totalDuration < 2;

    return {
      isFastPaced,
      isSlowPaced,
      hasHighVariance,
      isLongCaption,
      isShortCaption,
    };
  };

  // Create word animation effects based on the selected preset
  const createWordAnimationEffects = (
    wordId: string,
    word: any,
    presetName: string,
    intensity: number,
    selectedColorChoice: any,
  ): GenericEffectData[] => {
    const effects: GenericEffectData[] = [];
    const entranceDuration = 0.3; // Fast entrance
    const shortWordThreshold = 0.2; // Words shorter than this will fade in rapidly

    // Shared entrance effect (super fast for short words)
    const opacityRanges =
      word.duration > shortWordThreshold
        ? [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ]
        : [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.05 },
          ];

    effects.push({
      type: 'ease-out',
      start: word.start,
      duration:
        word.duration > shortWordThreshold ? entranceDuration : word.duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: opacityRanges,
    });

    switch (presetName) {
      case 'gentle-fade':
        effects.push({
          type: 'ease-out',
          start: word.start,
          duration: entranceDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        });
        break;

      case 'soft-bounce':
        effects.push({
          type: 'spring',
          start: word.start,
          duration: entranceDuration * 2,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateY', val: -10 * intensity, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        });
        break;

      case 'smooth-slide':
        effects.push({
          type: 'ease-out',
          start: word.start,
          duration: entranceDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateX', val: -15 * intensity, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        });
        break;

      case 'minimal-scale':
        effects.push({
          type: 'spring',
          start: word.start,
          duration: entranceDuration * 1.5,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: 0.9, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        });
        break;

      case 'subtle-glow':
        const accentRgb = hexToRgb(selectedColorChoice.accent);
        effects.push({
          type: 'ease-out',
          start: word.start,
          duration: word.duration,
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
              val: `drop-shadow(0 0 ${
                8 * intensity
              }px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.7))`,
              prog: 0.5,
            },
            {
              key: 'filter',
              val: `drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))`,
              prog: 1,
            },
          ],
        });
        break;

      case 'gentle-float':
        effects.push({
          type: 'ease-in-out',
          start: word.start,
          duration: word.duration > 1 ? word.duration : 1.5,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -5 * intensity, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        });
        break;

      case 'smooth-reveal':
        effects.push({
          type: 'ease-out',
          start: word.start,
          duration: entranceDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'filter', val: 'blur(5px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        });
        break;

      case 'soft-pulse':
        effects.push({
          type: 'ease-in-out',
          start: word.start,
          duration: word.duration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.05 + intensity, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        });
        break;

      case 'elegant-drift':
        effects.push({
          type: 'ease-in-out',
          start: word.start,
          duration: word.duration > 1 ? word.duration : 2,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 8 * intensity, prog: 1 },
          ],
        });
        break;

      case 'sharp-reveal':
        effects.push({
          type: 'ease-out',
          start: word.start,
          duration: entranceDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'letterSpacing', val: '0.2em', prog: 0 },
            { key: 'letterSpacing', val: '0em', prog: 1 },
            { key: 'filter', val: 'blur(3px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        });
        break;

      case 'clean-entrance':
        // Just the default opacity, nothing else.
        break;
    }

    return effects;
  };

  // Create dynamic and powerful part animation effects
  const createPartAnimationEffects = (
    partId: string,
    caption: any,
    characteristics: any,
    partIndex: number,
    motionIntensity: number,
  ): GenericEffectData[] => {
    const effects: GenericEffectData[] = [];

    // Use characteristics to define animation parameters
    const displacement =
      (characteristics.isFastPaced ? 50 : 25) * motionIntensity;
    const scale = characteristics.isFastPaced ? 1.1 : 1.05;
    const duration = caption.duration > 0.5 ? caption.duration * 0.6 : 0.4;

    // Powerful entrance animation with blur and scale
    effects.push({
      type: 'spring',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [partId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 }, // Fast fade in
        { key: 'scale', val: scale, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        {
          key: 'translateX',
          val: (partIndex % 2 === 0 ? -1 : 1) * displacement,
          prog: 0,
        },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    });

    // Add a shake effect for more dynamic captions
    if (
      (characteristics.isFastPaced || characteristics.hasHighVariance) &&
      caption.duration > duration
    ) {
      const shakeIntensity = characteristics.isFastPaced ? 4 : 2;
      effects.push({
        type: 'ease-in-out',
        start: duration, // Start after the entrance animation
        duration: caption.duration - duration,
        mode: 'provider',
        targetIds: [partId],
        ranges: [
          { key: 'translateX', val: shakeIntensity, prog: 0 },
          { key: 'translateX', val: -shakeIntensity, prog: 0.25 },
          { key: 'translateX', val: shakeIntensity / 2, prog: 0.5 },
          { key: 'translateX', val: -shakeIntensity / 2, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      });
    }

    return effects;
  };

  // Pre-processes captions to split combined words
  const preprocessCaptions = (captions: any[]) => {
    return captions.map(caption => {
      const processedWords: any[] = [];
      let originalWordIndex = 0;

      // Check if caption has words property and it's an array
      if (!caption.words || !Array.isArray(caption.words)) {
        // If no words property, create a single word from the text
        const singleWord = {
          text: caption.text || '',
          start: caption.absoluteStart || 0,
          duration:
            caption.duration ||
            caption.absoluteEnd - caption.absoluteStart ||
            1,
          absoluteStart: caption.absoluteStart || 0,
          absoluteEnd: caption.absoluteEnd || caption.absoluteStart + 1,
          confidence: 1,
        };
        return {
          ...caption,
          words: [singleWord],
        };
      }

      for (const word of caption.words) {
        // Ensure word has required properties
        if (!word.text) {
          continue; // Skip words without text
        }

        if (word.text.includes(' ')) {
          const subWords = word.text.split(' ');
          const wordDuration = word.duration || 1;
          const wordStart = word.start || 0;
          const wordAbsoluteStart = word.absoluteStart || 0;

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

  // Splits sentence into parts using metadata.splitParts if available
  const splitSentenceIntoParts = (
    words: any[],
    maxLines?: number,
    splitParts?: string[],
  ) => {
    if (splitParts && splitParts.length > 0) {
      const parts: any[][] = [];
      let currentWordIndex = 0;

      for (const splitPart of splitParts) {
        const partWords: any[] = [];
        const targetText = splitPart.trim().toLowerCase();

        while (currentWordIndex < words.length) {
          const word = words[currentWordIndex];
          const wordText = word.text.toLowerCase();

          if (
            targetText.includes(wordText) ||
            wordText.includes(targetText.split(' ')[0])
          ) {
            partWords.push(word);
            currentWordIndex++;

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

    return splitSentenceIntoPartsSimple(words, maxLines);
  };

  // Simple character-based splitting (fallback)
  const splitSentenceIntoPartsSimple = (words: any[], maxLines?: number) => {
    if (words.length <= 1) {
      return [words];
    }

    const targetLines = maxLines || 5;
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

      if (currentCharCount >= targetCharsPerLine || i === words.length - 1) {
        parts.push([...currentPart]);
        currentPart = [];
        currentCharCount = 0;
      }
    }

    if (parts.length > targetLines) {
      const lastPart = parts.pop();
      const secondLastPart = parts.pop();
      if (secondLastPart && lastPart) {
        parts.push([...secondLastPart, ...lastPart]);
      }
    }

    return parts;
  };

  // Generates word data with kinetic motion effects
  const generateWordsData = (
    words: any[],
    caption: any,
    selectedFontChoice: any,
    avgFontSize: number | undefined,
    selectedColorChoice: any,
    partId: string,
    sentenceId: string,
    style?: any,
    fontScaling?: { highlighted?: number; normal?: number },
  ) => {
    return words.map((word, wordIndex: number) => {
      const wordId = `word-${wordIndex}-${partId}-${sentenceId}`;
      const isHighlight = word.metadata?.isHighlight;

      // Create kinetic motion effects
      const kineticEffects = createWordAnimationEffects(
        wordId,
        word,
        kineticMotion.animationPreset || 'gentle-fade',
        kineticMotion.motionIntensity || 0.8,
        selectedColorChoice,
      );

      // Calculate font size and style
      let fontSize = avgFontSize ?? 50;
      const highlightedMultiplier = fontScaling?.highlighted ?? 1.5;
      const normalMultiplier = fontScaling?.normal ?? 0.9;
      const fontCalculatedSize = isHighlight
        ? fontSize * highlightedMultiplier
        : fontSize * normalMultiplier;
      const font = isHighlight
        ? selectedFontChoice.headerFont
        : selectedFontChoice.primaryFont;

      const fontString = font || 'Roboto';
      const fontFamily = fontString.includes(':')
        ? fontString.split(':')[0]
        : fontString;

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

      const textColor = isHighlight
        ? selectedColorChoice.secondary
        : selectedColorChoice.primary;

      const textTransform = isHighlight
        ? style?.textTransformMain || 'none'
        : style?.textTransformSub || 'none';

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
        effects: kineticEffects.map((effect, index) => ({
          id: `kinetic-${wordId}-${index}`,
          componentId: 'generic',
          data: effect,
        })),
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

  // Creates part-specific layout with kinetic motion
  const createPartLayout = (
    partWords: any[],
    partIndex: number,
    totalParts: number,
    caption: any,
    avgFontSize: number | undefined,
    selectedFontChoice: any,
    selectedColorChoice: any,
    partId: string,
    sentenceId: string,
    characteristics: any,
    textAlign?: string,
    style?: any,
    fontScaling?: { highlighted?: number; normal?: number },
  ) => {
    const wordsData = generateWordsData(
      partWords,
      caption,
      selectedFontChoice,
      avgFontSize,
      selectedColorChoice,
      partId,
      sentenceId,
      style,
      fontScaling,
    );

    const partEffectsData = createPartAnimationEffects(
      partId,
      caption,
      characteristics,
      partIndex,
      kineticMotion.motionIntensity || 0.8,
    );

    const partEffects = partEffectsData.map((effect, index) => ({
      id: `part-kinetic-${partId}-${index}`,
      componentId: 'generic',
      data: effect,
    }));

    const baseFontSize = avgFontSize || 50;
    const gapSize = Math.max(12, Math.floor(baseFontSize * 0.4));
    const containerClassName =
      'relative flex flex-row items-center justify-center';

    return {
      type: 'layout',
      id: partId,
      componentId: 'BaseLayout',
      effects: partEffects,
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

      if (gap > 0) {
        const extensionAmount = Math.min(gap, maxExtension);
        const newDuration = currentCaption.duration + extensionAmount;
        const newAbsoluteEnd = currentCaption.absoluteStart + newDuration;

        extendedCaptions[i] = {
          ...currentCaption,
          duration: newDuration,
          absoluteEnd: newAbsoluteEnd,
          words: currentCaption.words.map((word, _j: number) => {
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

    if (align === 'fixed') {
      const style: any = { position: 'absolute' as const };
      if (top !== undefined) style.top = `${top}px`;
      if (left !== undefined) style.left = `${left}px`;
      if (right !== undefined) style.right = `${right}px`;
      if (bottom !== undefined) style.bottom = `${bottom}px`;
      return style;
    }

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

  // Processes captions with kinetic motion
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
    fontScaling?: { highlighted?: number; normal?: number },
  ) => {
    const preprocessedCaptions = preprocessCaptions(inputCaptions);

    const offsetCaptions = preprocessedCaptions.map(caption => ({
      ...caption,
      absoluteStart: caption.absoluteStart - (negativeOffset ?? 0.15),
      absoluteEnd: caption.absoluteEnd - (negativeOffset ?? 0.15),
    }));

    const processedCaptions = applyNoGapsExtension(
      offsetCaptions,
      noGapsConfig,
    );

    return processedCaptions.map(
      (caption: Transcription['captions'][number], _i: number) => {
        const sentenceId = `caption-${_i}`;

        const characteristics = analyzeCaptionCharacteristics(caption);

        // Split sentence into parts
        const sentenceParts = splitSentenceIntoParts(
          caption.words || [],
          maxLines,
          caption.metadata?.splitParts,
        );

        // Smart word highlighting based on analysis
        const highlightedWordIndices: number[] = [];

        if (!disableMetadata && caption.metadata?.keyword?.length > 0) {
          const cleanKeywords = caption.metadata?.keyword
            ?.toLowerCase()
            ?.split(' ')
            ?.map((keyword: string) => keyword.replace(/[^a-zA-Z0-9]/g, ''));
          (caption.words || []).forEach((word, index) => {
            const cleanWord = word.text
              ?.toLowerCase()
              .replace(/[^a-zA-Z0-9]/g, '');
            if (
              cleanKeywords.some((_keyword: string) =>
                cleanWord.includes(_keyword),
              )
            ) {
              highlightedWordIndices.push(index);
            }
          });
        }

        // Fallback to smart selection if no keyword matches
        if (
          highlightedWordIndices.length === 0 &&
          caption.words &&
          Array.isArray(caption.words)
        ) {
          let highlightedWordIndex = -1;
          const wordDurations = caption.words.map(word => word.duration || 1);
          const avgDuration =
            wordDurations.reduce((sum, dur) => sum + dur, 0) /
            wordDurations.length;
          const maxDuration = Math.max(...wordDurations);

          const significantWords = caption.words
            .map((word, index) => ({ word, index, duration: word.duration }))
            .filter(
              w =>
                w.duration >= avgDuration * 0.8 ||
                w.duration >= maxDuration * 0.7,
            )
            .sort((a, b) => b.duration - a.duration);

          if (significantWords.length > 0) {
            highlightedWordIndex = significantWords[0].index;
          } else {
            highlightedWordIndex = wordDurations.indexOf(maxDuration);
          }
          if (highlightedWordIndex !== -1) {
            highlightedWordIndices.push(highlightedWordIndex);
          }
        }

        // Apply highlighting
        const captionWords = (caption.words || []).map((word, _j: number) => {
          const isHighlight = highlightedWordIndices.includes(_j);
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
            sentenceId,
            characteristics,
            textAlign,
            style,
            fontScaling,
          );
        });

        const mainLayoutClassName = `h-full flex flex-col ${
          textAlign === 'left'
            ? 'items-start'
            : textAlign === 'right'
              ? 'items-end'
              : 'items-center'
        } justify-center text-white gap-4 pl-10`;

        return {
          type: 'layout',
          id: sentenceId,
          componentId: 'BaseLayout',
          effects: [], // No sentence-level effects
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
  // Process all captions with kinetic motion
  const captionsChildrenData = processCaptions(
    inputCaptions,
    kineticMotion?.negativeOffset,
    kineticMotion?.noGaps,
    avgFontSize,
    selectedFontChoice,
    selectedColorChoice,
    kineticMotion?.maxLines,
    position?.textAlign,
    kineticMotion?.disableMetadata,
    style,
    kineticMotion?.fontScaling,
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
          id: 'KineticSubtitlesOverlay',
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
  id: 'sub-kinetic-motion',
  title: 'Kinetic Motion Subtitles',
  description:
    'Ultra-dynamic kinetic motion subtitles with emotion-based animations, smart content analysis, and high-motion effects including rotation, scaling, translation, color flow, motion blur, and wave distortion',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'kinetic',
    'motion',
    'dynamic',
    'emotion',
    'rotation',
    'scaling',
    'translation',
    'color-flow',
    'motion-blur',
    'wave-distortion',
    'smart-analysis',
    'high-motion',
  ],
  defaultInputParams: {
    kineticMotion: {
      animationPreset: 'soft-bounce',
      motionIntensity: 0.8,
      negativeOffset: 0.15,
      maxLines: 5,
      disableMetadata: false,
      noGaps: {
        enabled: false,
        maxLength: 3,
      },
      fontScaling: {
        highlighted: 1.2,
        normal: 0.95,
      },
    },
    position: {
      align: 'center',
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
        metadata: {
          keywordFeel: 'energetic',
          keyword: 'Hello',
        },
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

export const subKineticMotionPreset = {
  metadata: presetMetadata,
  presetFunction: _presetExecution,
  presetParams: z.toJSONSchema(presetParams),
};
