import {
  InputCompositionProps,
  GenericEffectData,
  TextAtomData,
  VideoAtomDataProps,
} from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { CSSProperties } from 'react';
import { loadAudioAnalysisBySrc } from '@/lib/audio-analysis-client';

const presetParams = z.object({
  trackName: z.string().describe('Track name'),
  audioUrl: z.string().describe('Audio URL'),
  quote: z.object({
    lines: z
      .array(
        z.object({
          text: z.string().describe('Text of the line'),
          keywords: z.array(z.string()).describe('Keywords of the line'),
          splitParts: z.array(z.string()).describe('Split parts of the line'),
        }),
      )
      .describe('Lines of the quote'),
    fontSet: z
      .object({
        headerFont: z.string().describe('Header font'),
        bodyFont: z.string().describe('Body font'),
      })
      .default({
        headerFont: 'Roboto:500:italic',
        bodyFont: 'ProtestRevolution',
      })
      .optional(),
    colorSet: z
      .object({
        headerColor: z.string().describe('Header color'),
        bodyColor: z.string().describe('Body color'),
      })
      .default({
        headerColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
      })
      .optional(),
    fontSize: z
      .object({
        baseSize: z.number().describe('Base font size'),
        headerMultiplier: z.number().describe('Header font size multiplier'),
      })
      .default({
        baseSize: 50,
        headerMultiplier: 1.2,
      })
      .optional(),
    position: z.enum(['top', 'center', 'bottom']).default('center').optional(),
    positionOffset: z.number().optional().describe('Position offset in pixels'),
    blackbox: z.boolean().optional().describe('Blackbox the quote'),
  }),
  displayMedia: z.object({
    videoSet: z
      .array(
        z.object({
          src: z.string(),
          duration: z.number(),
          playbackRate: z.number(),
          opacity: z.number().optional().describe('Opacity of the video'),
        }),
      )
      .describe('Video output URL'),
  }),
  beatFinding: z.object({
    customoffset: z.number().optional().describe('Custom offset in seconds'),
    windowDuration: z
      .number()
      .default(5)
      .optional()
      .describe('Window duration in seconds'),
    pickRhythm: z
      .number()
      .default(1)
      .optional()
      .describe('Pick one of the best beats set by the index.'),
  }),
  style: z
    .enum([
      'fullvideobg', // play the video in loop in bg
      'halfblackbg-halfvidebg', // half quote in black bg, half quote in video bg ( by half it is the timing, first half & seocnd half)
      'fullquote-fullvideobg', // full quote in black bg, and then the vidoe appears.
    ])
    .describe('Style of the Short'),
  quoteKineticAnimation: z
    .enum([
      'none',
      'gentle-fade',
      'soft-bounce',
      'smooth-slide',
      'minimal-scale',
      'subtle-glow',
      'gentle-float',
      'smooth-reveal',
    ])
    .describe('Kinetic animation for the quote'),
  speed: z
    .number()
    .min(0.1)
    .max(3.0)
    .default(1.0)
    .optional()
    .describe(
      'speed multiplier for word timing (0.1 = very slow, 3.0 = very fast)',
    ),
  audioRange: z
    .string()
    .describe(
      'Audio range to pick from like 0:30-3:30 means pick any audio start at 0:30 and end at 3:30 ',
    )
    .optional(),
  maxDuration: z
    .number()
    .default(60)
    .optional()
    .describe('Maximum duration of the short in seconds'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: {
    config: InputCompositionProps['config'];
    fetcher: (url: string, data: any) => Promise<any>;
  },
): Promise<Partial<PresetOutput>> => {
  const {
    audioUrl,
    quote,
    displayMedia,
    style,
    quoteKineticAnimation,
    speed = 1.0,
    audioRange,
    maxDuration = 60,
    beatFinding,
  } = params;

  // Extract position settings
  const position = quote.position || 'center';
  const positionOffset = quote.positionOffset || 0;

  // Generate position classes
  const getPositionClasses = () => {
    const baseClasses = 'absolute inset-0 text-center px-8 flex flex-col';

    switch (position) {
      case 'top':
        return `${baseClasses} justify-start items-center`;
      case 'bottom':
        return `${baseClasses} justify-end items-center`;
      case 'center':
      default:
        return `${baseClasses} justify-center items-center`;
    }
  };

  // Generate position styles with offset
  const getPositionStyles = () => {
    const styles: CSSProperties = {};

    if (positionOffset !== 0) {
      switch (position) {
        case 'top':
          styles.paddingTop = `${positionOffset}%`;
          break;
        case 'bottom':
          styles.paddingBottom = `${positionOffset}%`;
          break;
        case 'center':
        default:
          styles.transform = `translateY(${positionOffset}%)`;
          break;
      }
    } else {
      switch (position) {
        case 'top':
          styles.paddingTop = '20%';
          break;
        case 'bottom':
          styles.paddingBottom = '40%';
          break;
      }
    }

    return styles;
  };

  const { config } = props;

  // Analyze audio for beat detection
  const { analysis, durationInSeconds, summary } = await loadAudioAnalysisBySrc(
    audioUrl,
  );

  // Calculate quote duration based on character length - make it longer for readability
  const totalQuoteText = quote.lines.map(line => line.text).join(' ');
  const charCount = totalQuoteText.length;
  const baseDuration = Math.max(8, Math.min(charCount * 0.3, maxDuration)); // Increased from 0.1 to 0.3 and min from 3 to 8
  // We'll calculate the actual final duration after word data is generated

  // We'll calculate durations after word data is generated

  // Pre-processes captions to split combined words (exactly like sub-vertical-float)
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

  // Splits sentence into parts using metadata.splitParts if available (exactly like sub-vertical-float)
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

  // Simple character-based splitting (fallback) - exactly like sub-vertical-float
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

  // Create opacity fade-in effect for words (like sub-vertical-float)
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

  // Create letter spacing effect for highlighted words
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

  // Create glow effect for all words
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
      duration: shouldAnimate ? syncDuration || 8 : 3,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        {
          key: 'filter',
          val: 'drop-shadow(0 0 0px rgba(255,255,255,0))',
          prog: 0,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 8px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.7))`,
          prog: 0.5,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0 0 0px rgba(255,255,255,0))',
          prog: 1,
        },
      ],
    };
  };

  // Utility function to convert hex color to RGB
  const hexToRgb = (hex: string) => {
    return {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    };
  };

  // Generate word components exactly like sub-vertical-float
  const generateWordsData = (
    words: any[],
    caption: any,
    selectedFontChoice: any,
    avgFontSize: number | undefined,
    selectedColorChoice: any,
    partId: string,
    sentenceId: string,
    style?: any,
    animationStyle?: string,
    fontScaling?: { highlighted?: number; normal?: number },
    globalImpact?: number,
    isLastCaption?: boolean,
  ) => {
    const isAllWordsHighlighted = words.every(
      word => word.metadata?.isHighlight,
    );
    const syncDuration =
      isAllWordsHighlighted && words.length > 0 && caption.duration > 1
        ? words.reduce((sum, word) => sum + word.duration, 0)
        : null;

    return words.map((word, _j: number) => {
      const wordId = `word-${_j}-${partId}-${sentenceId}`;
      const isHighlight = word.metadata?.isHighlight;
      const shouldAnimate =
        word.duration >= 1 || (isAllWordsHighlighted && syncDuration > 1.5);

      // Create effects array based on animation style - only for last caption
      const effects = [];

      if (isLastCaption && animationStyle === 'word-fade-letterspace-float') {
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

      // Calculate font size and style exactly like sub-vertical-float
      let fontSize = avgFontSize ?? 50;
      const highlightedMultiplier = fontScaling?.highlighted ?? 1.35;
      const normalMultiplier = fontScaling?.normal ?? 0.85;
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
        effects: effects,
        data: {
          text: transformedText,
          className: isHighlight
            ? 'text-xl font-bold tracking-wide px-4 py-2 bg-transparent'
            : 'text-xl px-2 py-2 bg-transparent',
          style: {
            fontSize: fontCalculatedSize,
            color: textColor,
            ...fontStyle,
            backgroundColor: 'transparent',
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

  // Generate video components with beat sync
  const generateVideoComponents = () => {
    if (!displayMedia.videoSet || displayMedia.videoSet.length === 0) {
      return [];
    }

    const videoComponents: RenderableComponentData[] = [];

    // Get the last caption's start time
    const lastCaption = inputCaptions[inputCaptions.length - 1];
    let videoStartTime = lastCaption?.absoluteStart || 0;

    // If we have beats, sync video with them
    // if (videoBeats.length > 0) {
    //   const selectedBeats = videoBeats.slice(
    //     0,
    //     Math.min(displayMedia.videoSet.length, 5),
    //   );

    //   selectedBeats.forEach((beat: any, index: number) => {
    //     const videoSrc =
    //       displayMedia.videoSet[index % displayMedia.videoSet.length]?.src;
    //     const nextBeat = selectedBeats[index + 1];
    //     const duration = nextBeat
    //       ? nextBeat.timestamp - beat.timestamp
    //       : videoPlayDuration;

    //     const videoStrategy = calculateVideoStrategy(duration, videoSrc);

    //     videoComponents.push({
    //       type: 'atom',
    //       id: `video-${index}`,
    //       componentId: 'VideoAtom',
    //       data: {
    //         src: videoStrategy.src,
    //         startFrom: videoStrategy.startFrom,
    //         endAt: videoStrategy.endAt,
    //         playbackRate: videoStrategy.playbackRate,
    //         loop: videoStrategy.loop,
    //         className: 'w-full h-full object-cover',
    //         fit: 'cover',
    //         muted: true,
    //         volume: 0,
    //       },
    //       context: {
    //         timing: {
    //           start: beat.timestamp,
    //           duration: duration,
    //         },
    //       },
    //     } as RenderableComponentData);
    //   });
    // } else {
    // Fallback: show video from last caption start
    const videoSrc = displayMedia.videoSet[0]?.src;
    // const videoStrategy = calculateVideoStrategy(videoPlayDuration, videoSrc);

    displayMedia.videoSet.forEach((video, index) => {
      const _effects = [];
      if (index == 0) {
        _effects.push({
          id: `${params.trackName}-video-${index}-effect`,
          componentId: 'generic',
          data: {
            start: 0,
            duration: 0.5,
            mode: 'provider',
            targetIds: [`${params.trackName}-video-${index}`],
            type: 'ease-in-out',
            ranges: [
              {
                key: 'opacity',
                val: 0,
                prog: 0,
              },
              {
                key: 'opacity',
                val: video.opacity || 1,
                prog: 1,
              },
            ],
          } as GenericEffectData,
        });
        _effects.push({
          id: `${params.trackName}-video-${index}-effect`,
          componentId: 'generic',
          data: {
            start: 0,
            duration: 1,
            mode: 'provider',
            targetIds: [`${params.trackName}-video-${index}`],
            type: 'ease-out',
            ranges: [
              {
                key: 'scale',
                val: 1.05,
                prog: 0,
              },
              {
                key: 'scale',
                val: 1,
                prog: 1,
              },
            ],
          } as GenericEffectData,
        });
      }
      //   const videoStrategy = calculateVideoStrategy(videoPlayDuration, video.src);
      videoComponents.push({
        type: 'atom',
        id: `${params.trackName}-video-${index}`,
        componentId: 'VideoAtom',
        effects: _effects,
        data: {
          src: video.src,
          startFrom: 0,
          playbackRate: video.playbackRate || 1,
          loop: true,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          muted: true,
          volume: 0,
          style: {
            opacity: video.opacity || 1,
          },
        } as VideoAtomDataProps,
        context: {
          timing: {
            start: videoStartTime,
            duration: video.duration / (video.playbackRate || 1),
          },
        },
      });
      videoStartTime += video.duration / (video.playbackRate || 1);
    });

    // videoComponents.push({
    //   type: 'atom',
    //   id: 'video-fallback',
    //   componentId: 'VideoAtom',
    //   data: {
    //     src: videoStrategy.src,
    //     startFrom: videoStrategy.startFrom,
    //     endAt: videoStrategy.endAt,
    //     playbackRate: videoStrategy.playbackRate,
    //     loop: videoStrategy.loop,
    //     className: 'w-full h-full object-cover',
    //     fit: 'cover',
    //     muted: true,
    //     volume: 0,
    //   },
    //   context: {
    //     timing: {
    //       start: videoStartTime,
    //       duration: videoPlayDuration,
    //     },
    //   },
    // } as RenderableComponentData);
    // }

    return videoComponents;
  };

  // Applies noGaps extension to reduce gaps between captions (exactly like sub-vertical-float)
  const applyNoGapsExtension = (captions: any[], noGapsConfig: any) => {
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
          words: currentCaption.words.map((word: any, _j: number) => {
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

  // Creates part-specific layout with animations (exactly like sub-vertical-float)
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
    isLastCaption?: boolean,
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
      isLastCaption,
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

    // Calculate gap based on font size - use a percentage of the font size
    const containerClassName =
      'relative flex flex-row items-center justify-center px-8';

    if (params.quote.blackbox) {
      effects.push({
        id: `part-effects-${partId}`,
        componentId: 'generic',
        data: {
          start: partWords[0].absoluteStart,
          duration: 1,
          mode: 'provider',
          targetIds: [partId],
          ranges: [
            {
              key: 'backgroundColor',
              val: 'rgba(0, 0, 0, 0)',
              prog: 0,
            },
            {
              key: 'backgroundColor',
              val: 'rgba(0, 0, 0, 1)',
              prog: 1,
            },
          ],
        },
      });
    }

    return {
      type: 'layout',
      id: partId,
      componentId: 'BaseLayout',
      effects: effects,
      data: {
        containerProps: {
          className: containerClassName,
          style: {
            backgroundColor: params.quote.blackbox
              ? 'rgba(0, 0, 0, 1)'
              : 'transparent',
          },
        },
        repeatChildrenProps: {},
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      childrenData: wordsData,
    } as RenderableComponentData;
  };

  // Processes captions and applies highlighting logic (exactly like sub-vertical-float)
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

    return processedCaptions.map((caption: any, _i: number) => {
      const scentenceId = `caption-${_i}`;
      const isLastCaption = _i === processedCaptions.length - 1;

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
        caption.words.forEach((word: any, index: number) => {
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
          const keywordWordIndex = caption.words.findIndex((word: any) =>
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
      }

      // Apply highlighting logic to words
      const captionWords = caption.words.map((word: any, _j: number) => {
        let isHighlight = false;

        if (highlightedWordIndices.length > 0) {
          isHighlight =
            highlightedWordIndices.includes(_j) ||
            ((word as any).isSubWord &&
              highlightedWordIndices.includes((word as any).originalWordIndex));
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
          'horizontal',
          fontScaling,
          globalImpact,
          isLastCaption,
        );
      });

      // Main sentence block layout
      if (layout === 'horizontal') {
        // Calculate gap based on font size for horizontal layout
        const baseFontSize = avgFontSize || 50;
        const gapSize = Math.max(8, Math.floor(baseFontSize * 0.2)); // 20% of font size for main container, minimum 8px
        // Apply position styling to individual caption containers
        const getCaptionPositionClasses = () => {
          const baseClasses = 'h-full flex flex-row text-white pl-10';
          const alignmentClasses =
            textAlign === 'left'
              ? 'items-start'
              : textAlign === 'right'
                ? 'items-end'
                : 'items-center';

          switch (position) {
            case 'top':
              return `${baseClasses} ${alignmentClasses} justify-center items-start`;
            case 'bottom':
              return `${baseClasses} ${alignmentClasses} justify-center items-end`;
            case 'center':
            default:
              return `${baseClasses} ${alignmentClasses} justify-center items-center`;
          }
        };

        const mainLayoutClassName = getCaptionPositionClasses();

        return {
          type: 'layout',
          id: scentenceId,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: mainLayoutClassName,
              style: {
                gap: `${gapSize}px`,
                ...getPositionStyles(),
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
        // Apply position styling to individual caption containers (vertical layout)
        const getCaptionPositionClassesVertical = () => {
          const baseClasses = 'h-full flex flex-col text-white gap-2 pl-10';
          const alignmentClasses =
            textAlign === 'left'
              ? 'items-start'
              : textAlign === 'right'
                ? 'items-end'
                : 'items-center';

          switch (position) {
            case 'top':
              return `${baseClasses} ${alignmentClasses} justify-start`;
            case 'bottom':
              return `${baseClasses} ${alignmentClasses} justify-end`;
            case 'center':
            default:
              return `${baseClasses} ${alignmentClasses} justify-center`;
          }
        };

        const mainLayoutClassName = getCaptionPositionClassesVertical();

        return {
          type: 'layout',
          id: scentenceId,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: mainLayoutClassName,
              style: {
                ...getPositionStyles(),
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
      }
    });
  };

  // Font and color choices like sub-vertical-float
  const selectedFontChoice = {
    primaryFont: quote.fontSet?.bodyFont || 'Roboto:600:italic',
    headerFont: quote.fontSet?.headerFont || 'BebasNeue',
  };

  const selectedColorChoice = {
    primary: quote.colorSet?.bodyColor || '#FFFFFF',
    secondary: quote.colorSet?.bodyColor || '#CCCCCC',
    accent: quote.colorSet?.headerColor || '#FF6B6B',
  };

  // Create mock captions from quote lines (exactly like sub-vertical-float)
  const createMockCaptions = (videoSumDuration: number) => {
    // First line caption
    let prevLineEnd = 0;
    let captions: any[] = [];
    quote.lines.forEach((line, index) => {
      const thisLineStart = prevLineEnd;
      let prevWordEnd = 0;
      const thisLineWords = line.text.split(' ').map((text, wordIndex) => {
        const charCount = text.length;
        let wordDuration = 0.5 / speed; // Adjust duration based on speed
        if (wordIndex === line.text.split(' ').length - 1) {
          wordDuration += 1 / speed;
        }
        prevWordEnd += wordDuration;
        return {
          text,
          start: prevWordEnd - wordDuration,
          duration: wordDuration,
          absoluteStart: prevWordEnd - wordDuration,
          absoluteEnd: prevWordEnd,
          confidence: 1,
        };
      });
      let thisLineDuration = thisLineWords.reduce(
        (sum, word) => sum + word.duration,
        0,
      );
      if (index === quote.lines.length - 1 && videoSumDuration > 0) {
        thisLineDuration = Math.max(thisLineDuration, videoSumDuration);
      }
      captions.push({
        id: `caption-${index}`,
        text: line.text,
        absoluteStart: thisLineStart,
        absoluteEnd: thisLineStart + thisLineDuration,
        start: thisLineStart,
        end: thisLineStart + thisLineDuration,
        duration: thisLineDuration,
        metadata: {
          keyword: line.keywords?.join(' ') || '',
          splitParts: line.splitParts || [],
        },
        words: thisLineWords,
      });
      prevLineEnd = thisLineStart + thisLineDuration;
    });

    return captions;
  };

  const videoSumDuration =
    displayMedia.videoSet?.reduce(
      (sum, video) => sum + video.duration / (video.playbackRate || 1),
      0,
    ) || 0;
  // Process captions exactly like sub-vertical-float
  const inputCaptions = createMockCaptions(videoSumDuration);
  const processedCaptions = processCaptions(
    inputCaptions,
    0.15, // negativeOffset
    { enabled: false }, // noGaps
    quote.fontSize?.baseSize || 50, // avgFontSize
    selectedFontChoice,
    selectedColorChoice,
    5, // maxLines
    5, // floatThreshold
    'center', // textAlign
    false, // disableMetadata
    {
      textTransformSub: 'none',
      textTransformMain: 'uppercase',
    }, // style
    'word-fade-letterspace-float', // animationStyle
    'vertical', // layout
    {
      highlighted: quote.fontSize?.headerMultiplier || 1.2,
      normal: 0.9,
    }, // fontScaling
    1.0, // globalImpact
  );

  // Calculate final duration
  let finalDuration = Math.min(
    processedCaptions.reduce(
      (sum, caption) => sum + (caption.context?.timing?.duration || 0),
      0,
    ),
    maxDuration,
  );

  // Generate video components
  const videoComponents = generateVideoComponents();

  // Audio component - sync peak beat with last caption end
  const lastCaption = inputCaptions[inputCaptions.length - 1];
  const audioOffing = videoSumDuration - lastCaption?.duration;

  // Find the best rhythm segments in the audio and return their peak beats
  const findBestRhythms = (
    beats: any[],
    windowDuration: number = 5,
    count: number = 10,
  ) => {
    if (!beats || beats.length === 0) {
      return [];
    }

    const allWindows: { startTime: number; score: number; beats: any[] }[] = [];

    // Slide a window across the audio to find segments with high total intensity
    const maxTimestamp = beats[beats.length - 1]?.timestamp || 0;
    for (let t = 0; t < maxTimestamp - windowDuration; t += 1) {
      const windowStartTime = t;
      const windowEndTime = windowStartTime + windowDuration;

      const windowBeats = beats.filter(
        (beat: any) =>
          beat.timestamp >= windowStartTime && beat.timestamp < windowEndTime,
      );

      if (windowBeats.length === 0) {
        continue;
      }

      // Score the window by summing the intensity of its beats
      const windowScore = windowBeats.reduce(
        (sum: number, beat: any) => sum + beat.intensity,
        0,
      );

      if (windowScore > 0) {
        allWindows.push({
          startTime: windowStartTime,
          score: windowScore,
          beats: windowBeats,
        });
      }
    }

    if (allWindows.length === 0) {
      // Fallback if no rhythmic windows are found
      const fallbackBeat =
        analysis?.reduce((peak: any, beat: any) => {
          if (!peak || beat.intensity > peak.intensity) {
            return beat;
          }
          return peak;
        }, null) || analysis?.[0];
      return fallbackBeat ? [fallbackBeat] : [];
    }

    // Sort windows by score to find the best ones
    allWindows.sort((a, b) => b.score - a.score);

    // From the top `count` windows, extract the single most intense beat
    const topPeakBeats = allWindows
      .slice(0, count)
      .map(window => {
        return window.beats.reduce((peak: any, beat: any) => {
          if (!peak || beat.intensity > peak.intensity) {
            return beat;
          }
          return peak;
        }, null);
      })
      .filter((beat): beat is any => beat !== null);

    return topPeakBeats;
  };

  const bestRhythms = findBestRhythms(analysis, beatFinding.windowDuration, 10); // Find top 10 rhythms
  const pickRhythm = beatFinding.pickRhythm || 1;
  // Select the rhythm based on the pickRhythm parameter (1-based index)
  const selectedIndex =
    bestRhythms.length > 0 ? (pickRhythm - 1) % bestRhythms.length : 0;
  const peakBeat = bestRhythms[selectedIndex] || bestRhythms[0]; // Fallback to first

  // Calculate audio offset to align peak beat with last caption start
  const peakBeatTime = peakBeat?.timestamp || 0;
  const audioOffset =
    peakBeatTime -
    (lastCaption?.absoluteStart || 0) -
    (beatFinding.customoffset || 0);

  const audioComponent: RenderableComponentData = {
    type: 'atom',
    id: 'quote-audio',
    componentId: 'AudioAtom',
    data: {
      src: audioUrl,
      muted: false,
      startFrom: audioOffset, // Offset audio to align peak with last caption end
    },
    context: {
      timing: {
        start: 0,
        duration: finalDuration,
      },
    },
  } as RenderableComponentData;

  // Main layout
  const mainLayout: RenderableComponentData = {
    type: 'layout',
    id: params.trackName ?? 'quote-presentation',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
      repeatChildrenProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: finalDuration,
      },
    },
    childrenData: [
      //...backgroundComponents,
      ...videoComponents,
      {
        type: 'layout',
        id: 'quote-text-container',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 text-center px-8',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: finalDuration,
          },
        },
        childrenData: processedCaptions,
      },
      audioComponent,
    ],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [mainLayout],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'quote-present',
  title: 'Quote Presentation',
  description:
    'Presents quotes with first line appearing, then video reveals as second line appears. Features kinetic word-by-word animations and beat-synced video timing.',
  type: 'predefined',
  presetType: 'children',
  tags: ['quote', 'kinetic', 'beat-sync', 'video', 'animation', 'text'],
  defaultInputParams: {
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    quote: {
      lines: [
        {
          text: 'The future belongs to those who believe',
          keywords: ['future', 'believe'],
          splitParts: ['The future belongs to', 'those who believe'],
        },
        {
          text: 'in the beauty of their dreams',
          keywords: ['beauty', 'dreams'],
          splitParts: ['in the beauty of', 'their dreams'],
        },
      ],
      fontSet: {
        bodyFont: 'Roboto:500:italic',
        headerFont: 'ProtestRevolution',
      },
      colorSet: {
        headerColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
      },
      fontSize: {
        baseSize: 50,
        headerMultiplier: 1.2,
      },
    },
    displayMedia: {
      videoSet: [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      ],
    },
    beatFinding: {
      windowDuration: 5,
      pickRhythm: 1,
    },
    style: 'fullquote-fullvideobg',
    quoteKineticAnimation: 'soft-bounce',
    position: 'center',
    positionOffset: 0,
    speed: 1.0,
    audioRange: '0:30-3:30',
    maxDuration: 60,
  },
};

const presetFunction = presetExecution.toString();
const presetParamsSchema = z.toJSONSchema(presetParams);

const quotePresentPreset = {
  metadata: presetMetadata,
  presetFunction: presetFunction,
  presetParams: presetParamsSchema,
};

export { quotePresentPreset };
