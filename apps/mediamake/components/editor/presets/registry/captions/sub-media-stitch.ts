/**
 * Subtitle Media Stitch Preset
 *
 * This preset combines captions with media sources, automatically inserting video/image clips
 * in gaps between captions. It creates dynamic sequences where media plays during caption breaks.
 *
 * Features:
 * - **Gap Detection**: Automatically identifies gaps between captions
 * - **Media Insertion**: Inserts media clips in detected gaps based on gap duration
 * - **Sequence Speed Control**: Rapid, slow, or mixed media sequence speeds
 * - **Transition Effects**: Shake, smooth-blur, fade, slide, zoom, and glitch transitions
 * - **Flexible Positioning**: Left, center, right, circle, random, or fixed positioning
 * - **Subtitle Synchronization**: Configurable negative offset and gap handling
 * - **Font & Color Choices**: Custom font families and color schemes
 *
 * Use cases:
 * - Creating dynamic video content with captions and B-roll
 * - Building engaging presentations with media breaks
 * - Adding visual interest during caption gaps
 * - Creating professional video content with synchronized media
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

type Effect = {
  id: string;
  componentId: string;
  data: any;
};

const presetParams = z.object({
  inputCaptions: z.array(z.any()).meta({
    [paramMetaTypes.referrableDataType]: 'captions',
  }),
  mediaSources: z
    .array(
      z.object({
        src: z.string().url().describe('Media source URL'),
        type: z.enum(['video', 'image']).describe('Media type'),
        fit: z
          .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
          .optional()
          .describe('How to fit the media'),
        startOffset: z.number().optional().describe('Start offset in seconds'),
        duration: z.number().optional().describe('Duration in seconds'),
        loop: z.boolean().optional().describe('Loop the media'),
        mute: z.boolean().optional().describe('Mute the media'),
        volume: z.number().optional().describe('Volume level'),
        opacity: z.number().min(0).max(1).optional().describe('Opacity level'),
      }),
    )
    .min(1)
    .describe('Array of media sources to stitch between captions'),
  sequenceSpeed: z
    .enum(['rapid', 'slow', 'mixed'])
    .default('rapid')
    .describe('Speed of media sequences between captions'),
  minGapDuration: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Minimum gap duration in seconds to insert media'),
  maxMediaPerGap: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Maximum number of media items per gap'),
  transition: z.object({
    impact: z.number().optional().describe('The impact of the transition'),
    type: z.enum(['shake', 'smooth-blur', 'fade', 'slide', 'zoom', 'glitch']),
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
    mediaSources,
    sequenceSpeed,
    minGapDuration,
    maxMediaPerGap,
    transition,
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
    const targetLines = maxLines || 3;

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

  // Creates transition effects for media
  const createMediaTransitionEffect = (
    mediaId: string,
    transitionType: string,
    impact: number,
    duration: number,
    startTime: number,
  ): GenericEffectData => {
    const baseImpact = impact || 1;

    switch (transitionType) {
      case 'shake':
        return {
          type: 'spring',
          start: startTime,
          duration: Math.min(0.5, duration * 0.3),
          mode: 'provider',
          targetIds: [mediaId],
          ranges: [
            { key: 'translateX', val: -5 * baseImpact, prog: 0 },
            { key: 'translateX', val: 5 * baseImpact, prog: 0.3 },
            { key: 'translateX', val: -3 * baseImpact, prog: 0.6 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        };

      case 'smooth-blur':
        return {
          type: 'ease-out',
          start: startTime,
          duration: Math.min(0.8, duration * 0.4),
          mode: 'provider',
          targetIds: [mediaId],
          ranges: [
            { key: 'filter', val: `blur(${10 * baseImpact}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        };

      case 'fade':
        return {
          type: 'ease-out',
          start: startTime,
          duration: Math.min(0.6, duration * 0.3),
          mode: 'provider',
          targetIds: [mediaId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        };

      case 'slide':
        return {
          type: 'ease-out',
          start: startTime,
          duration: Math.min(0.7, duration * 0.4),
          mode: 'provider',
          targetIds: [mediaId],
          ranges: [
            { key: 'translateX', val: `${100 * baseImpact}%`, prog: 0 },
            { key: 'translateX', val: '0%', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        };

      case 'zoom':
        return {
          type: 'spring',
          start: startTime,
          duration: Math.min(0.8, duration * 0.5),
          mode: 'provider',
          targetIds: [mediaId],
          ranges: [
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1.1 * baseImpact, prog: 0.7 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        };

      case 'glitch':
        return {
          type: 'ease-out',
          start: startTime,
          duration: Math.min(0.6, duration * 0.3),
          mode: 'provider',
          targetIds: [mediaId],
          ranges: [
            { key: 'translateX', val: -20 * baseImpact, prog: 0 },
            { key: 'translateX', val: 20 * baseImpact, prog: 0.3 },
            { key: 'translateX', val: -10 * baseImpact, prog: 0.6 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'filter', val: `contrast(1.5) brightness(1.2)`, prog: 0 },
            { key: 'filter', val: `contrast(1) brightness(1)`, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        };

      default:
        return {
          type: 'ease-out',
          start: startTime,
          duration: 0.5,
          mode: 'provider',
          targetIds: [mediaId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
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
  ) => {
    return words.map((word, _j: number) => {
      const wordId = `word-${_j}-${partId}-${scentenceId}`;
      const isHighlight = word.metadata?.isHighlight;

      // Calculate font size and style
      let fontSize = avgFontSize ?? 50;
      const fontCalculatedSize = isHighlight
        ? fontSize * 1.35
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
        ? selectedColorChoice.accent
        : selectedColorChoice.primary;
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
        effects: [], // No word-level effects for static approach
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

    // Find words with significant duration
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

  // Detects gaps between captions and creates media sequences
  const detectGapsAndCreateMedia = (
    captions: any[],
    mediaSources: any[],
    sequenceSpeed: string,
    minGapDuration: number,
    maxMediaPerGap: number,
    transition: any,
  ) => {
    const mediaComponents: any[] = [];
    let mediaIndex = 0;

    for (let i = 0; i < captions.length - 1; i++) {
      const currentCaption = captions[i];
      const nextCaption = captions[i + 1];

      const currentEnd = currentCaption.absoluteEnd;
      const nextStart = nextCaption.absoluteStart;
      const gap = nextStart - currentEnd;

      // Only insert media if gap is large enough
      if (gap >= minGapDuration) {
        // Calculate how many media items to insert based on sequence speed
        let mediaCount = 1;

        if (sequenceSpeed === 'rapid') {
          mediaCount = Math.min(maxMediaPerGap, Math.floor(gap / 0.5)); // 0.5s per media
        } else if (sequenceSpeed === 'slow') {
          mediaCount = Math.min(maxMediaPerGap, Math.floor(gap / 2)); // 2s per media
        } else if (sequenceSpeed === 'mixed') {
          // Random between rapid and slow
          const isRapid = Math.random() > 0.5;
          mediaCount = Math.min(
            maxMediaPerGap,
            Math.floor(gap / (isRapid ? 0.5 : 2)),
          );
        }

        // Calculate duration per media item
        const mediaDuration = gap / mediaCount;
        const transitionOverlap = 0.2; // 0.2s overlap for smooth transitions

        for (let j = 0; j < mediaCount; j++) {
          const mediaStart = currentEnd + j * mediaDuration;
          const mediaEnd = mediaStart + mediaDuration + transitionOverlap;

          // Select media source (cycle through available sources)
          const selectedMedia = mediaSources[mediaIndex % mediaSources.length];
          mediaIndex++;

          // Determine media type
          let mediaType = selectedMedia.type;
          if (!mediaType) {
            if (
              selectedMedia.src.endsWith('.png') ||
              selectedMedia.src.endsWith('.jpg') ||
              selectedMedia.src.endsWith('.jpeg') ||
              selectedMedia.src.endsWith('.gif') ||
              selectedMedia.src.endsWith('.webp') ||
              selectedMedia.src.endsWith('.svg') ||
              selectedMedia.src.endsWith('.avif')
            ) {
              mediaType = 'image';
            } else {
              mediaType = 'video';
            }
          }

          // Create media component
          let mediaComponent: any;
          if (mediaType === 'video') {
            mediaComponent = {
              id: `media-gap-${i}-${j}`,
              componentId: 'VideoAtom',
              type: 'atom' as const,
              data: {
                src: selectedMedia.src,
                className: 'w-full h-full object-cover',
                fit: selectedMedia.fit || 'cover',
                loop: selectedMedia.loop || true,
                muted: selectedMedia.mute || true,
                volume: selectedMedia.volume || 0,
                startFrom: selectedMedia.startOffset || 0,
                style: {
                  ...(selectedMedia.opacity !== undefined
                    ? { opacity: selectedMedia.opacity }
                    : {}),
                },
              },
              context: {
                timing: {
                  start: mediaStart,
                  duration: mediaDuration + transitionOverlap,
                },
              },
              effects: [],
            };
          } else {
            mediaComponent = {
              id: `media-gap-${i}-${j}`,
              componentId: 'ImageAtom',
              type: 'atom' as const,
              data: {
                src: selectedMedia.src,
                className: 'w-full h-full object-cover',
                fit: selectedMedia.fit || 'cover',
                style: {
                  ...(selectedMedia.opacity !== undefined
                    ? { opacity: selectedMedia.opacity }
                    : {}),
                },
              },
              context: {
                timing: {
                  start: mediaStart,
                  duration: mediaDuration + transitionOverlap,
                },
              },
              effects: [],
            };
          }

          // Add transition effects
          const transitionEffect = createMediaTransitionEffect(
            mediaComponent.id,
            transition.type,
            transition.impact || 1,
            mediaDuration,
            mediaStart,
          );

          mediaComponent.effects.push({
            id: `transition-${mediaComponent.id}`,
            componentId: 'generic',
            data: transitionEffect,
          });

          mediaComponents.push(mediaComponent);
        }
      }
    }

    return mediaComponents;
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

        // Determine which word to highlight
        let highlightedWordIndex = -1;

        if (!disableMetadata && caption.metadata?.keyword?.length > 0) {
          // Find the word index that contains the keyword
          const keywordWordIndex = caption.words.findIndex(word =>
            word.text
              ?.toLowerCase()
              ?.includes(caption.metadata?.keyword?.toLowerCase() || ''),
          );
          if (keywordWordIndex !== -1) {
            highlightedWordIndex = keywordWordIndex;
          }
        }

        // Only apply fallback logic if no keyword was found in metadata
        if (highlightedWordIndex === -1) {
          highlightedWordIndex = selectHighlightWord(
            caption.words,
            caption.metadata,
          );
        }

        // Ensure at least one word is highlighted
        if (highlightedWordIndex === -1) {
          highlightedWordIndex = 0; // Fallback to first word
        }

        // Apply highlighting logic to words
        const captionWords = caption.words.map((word, _j: number) => {
          let isHighlight = false;

          // Check if this word should be highlighted (including sub-words)
          if ((word as any).originalWordIndex === highlightedWordIndex) {
            isHighlight = true;
          } else {
            isHighlight = _j === highlightedWordIndex;
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
            textAlign,
            style,
          );
        });

        // Main sentence block layout
        return {
          type: 'layout',
          id: scentenceId,
          componentId: 'BaseLayout',
          effects: [], // No sentence-level effects for static approach
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
    position?.textAlign,
    subtitleSync?.disableMetadata,
    style,
  );
  // Detect gaps and create media components
  const mediaComponents = detectGapsAndCreateMedia(
    inputCaptions,
    mediaSources,
    sequenceSpeed,
    minGapDuration,
    maxMediaPerGap,
    transition,
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
          childrenData: [...captionsChildrenData, ...mediaComponents],
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
  id: 'sub-media-stitch',
  title: 'Media Stitch Subtitles',
  description:
    'Stitches media sources between caption sentences with configurable speed and transition effects, perfect for filling gaps in content',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'media-stitch',
    'transitions',
    'gaps',
    'video',
    'image',
    'sequences',
  ],
  defaultInputParams: {
    inputCaptions: [],
    mediaSources: [
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        type: 'video',
        fit: 'cover',
        loop: true,
        mute: true,
        opacity: 0.8,
      },
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        type: 'video',
        fit: 'cover',
        loop: true,
        mute: true,
        opacity: 0.9,
      },
    ],
    sequenceSpeed: 'rapid',
    minGapDuration: 2,
    maxMediaPerGap: 3,
    transition: {
      impact: 1,
      type: 'smooth-blur',
    },
    subtitleSync: {
      negativeOffset: 0.15,
      maxLines: 3,
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
  },
};

const _presetExecution = presetExecution.toString();

export const subMediaStitchPreset = {
  metadata: presetMetadata,
  presetFunction: _presetExecution,
  presetParams: z.toJSONSchema(presetParams),
};
