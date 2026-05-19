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
    animationStyle: z
      .enum([
        'gradient-wave-float', // Gradient colors wave through text with floating animation
        'gradient-pulse-glow', // Gradient with pulsing glow effects
        'gradient-shimmer-slide', // Gradient shimmer effect with slide animation
        'gradient-rainbow-flow', // Rainbow gradient flowing through text
        'gradient-neon-burst', // Neon-style gradient with burst effects
        'gradient-metallic-shine', // Metallic gradient with shine effect
        'gradient-aurora-drift', // Aurora borealis style gradient with drift
        'gradient-fire-flicker', // Fire-style gradient with flicker effect
      ])
      .default('gradient-wave-float')
      .optional(),
    layout: z
      .enum(['horizontal', 'vertical'])
      .default('horizontal')
      .optional()
      .describe('layout direction for parts - horizontal or vertical'),
    negativeOffset: z.number().optional(),
    maxLines: z.number().optional(),
    noGaps: z
      .object({
        enabled: z.boolean().optional().describe('enable no gaps'),
        maxLength: z
          .number()
          .default(3)
          .optional()
          .describe('max duration it can extend'),
      })
      .optional(),
    floatThreshold: z.number().optional(),
    disableMetadata: z
      .boolean()
      .optional()
      .describe('ignore all metadata provided in captions'),
    fontScaling: z
      .object({
        highlighted: z
          .number()
          .default(1.5)
          .optional()
          .describe('font size multiplier for highlighted words'),
        normal: z
          .number()
          .default(0.9)
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
  gradientChoices: z
    .array(
      z.object({
        normalGradient: z
          .string()
          .describe('gradient for normal words (CSS gradient string)'),
        highlightGradient: z
          .string()
          .describe('gradient for highlighted words (CSS gradient string)'),
        accentColor: z.string().describe('accent color for effects'),
      }),
    )
    .optional()
    .describe('gradient color schemes for text'),
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
    subtitleSync,
    avgFontSize,
    gradientChoices,
    fontChoices,
    style,
  } = params;

  // Validate inputCaptions is an array
  if (!inputCaptions || !Array.isArray(inputCaptions)) {
    throw new Error('inputCaptions must be an array');
  }

  // Ensure position has default values
  const positionConfig = position || {
    align: 'center',
    textAlign: 'center',
  };

  // Ensure subtitleSync has default values
  const subtitleSyncConfig = subtitleSync || {
    animationStyle: 'gradient-wave-float',
    layout: 'horizontal',
    negativeOffset: 0.15,
    maxLines: 5,
    floatThreshold: 15,
    disableMetadata: false,
    fontScaling: {
      highlighted: 1.5,
      normal: 0.9,
    },
    impact: 1.0,
  };

  // Font choices configuration
  const FONT_CHOICES =
    fontChoices && fontChoices.length > 0
      ? fontChoices
      : [
          {
            primaryFont: 'Roboto:700',
            headerFont: 'BebasNeue:700',
          },
        ];

  // Gradient choices configuration with stunning presets
  const GRADIENT_CHOICES =
    gradientChoices && gradientChoices.length > 0
      ? gradientChoices
      : [
          {
            normalGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            highlightGradient:
              'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            accentColor: '#f5576c',
          },
          {
            normalGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            highlightGradient:
              'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            accentColor: '#38f9d7',
          },
          {
            normalGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            highlightGradient:
              'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
            accentColor: '#30cfd0',
          },
          {
            normalGradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            highlightGradient:
              'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            accentColor: '#ff9a9e',
          },
          {
            normalGradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            highlightGradient:
              'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
            accentColor: '#ff6e7f',
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
    if (!captions || !Array.isArray(captions)) {
      throw new Error('preprocessCaptions expects an array');
    }

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
    duration: 0.6,
    mode: 'provider',
    targetIds: [wordId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  });

  // Creates scale effect for word entrance
  const createScaleEffect = (
    wordId: string,
    word: any,
    impact: number,
  ): GenericEffectData => ({
    type: 'spring',
    start: word.start,
    duration: 0.4,
    mode: 'provider',
    targetIds: [wordId],
    ranges: [
      { key: 'scale', val: 0.8, prog: 0 },
      { key: 'scale', val: 1.05 * impact, prog: 0.7 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  });

  // Creates glow effect for gradient text
  const createGradientGlowEffect = (
    wordId: string,
    word: any,
    selectedGradientChoice: any,
    impact: number,
  ): GenericEffectData => {
    const accentRgb = hexToRgb(selectedGradientChoice.accentColor) || {
      r: 255,
      g: 107,
      b: 107,
    };

    return {
      type: 'ease-in-out',
      start: word.start,
      duration: Math.max(1.5, word.duration * 0.8),
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
          val: `drop-shadow(0 0 ${12 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.8)) drop-shadow(0 0 ${24 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.4))` as any,
          prog: 0.5,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${8 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.6))` as any,
          prog: 1,
        },
      ],
    };
  };

  // Creates wave floating effect
  const createWaveFloatEffect = (
    wordId: string,
    word: any,
    impact: number,
  ): GenericEffectData => {
    const duration = Math.max(2.5, word.duration * 1.5);
    const waveCount = Math.floor(duration / 1.0);
    const ranges = [];

    for (let i = 0; i <= waveCount; i++) {
      const prog = i / waveCount;
      const waveValue = Math.sin(prog * Math.PI * 2) * 5 * impact;
      ranges.push({ key: 'translateY', val: waveValue, prog });
    }

    ranges.push({ key: 'translateY', val: 0, prog: 1 });

    return {
      type: 'ease-in-out',
      start: word.start,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges,
    };
  };

  // Creates pulse effect for gradient text
  const createPulseEffect = (
    wordId: string,
    word: any,
    impact: number,
  ): GenericEffectData => {
    const duration = Math.max(1.2, word.duration * 0.8);
    const pulseCount = Math.floor(duration / 0.6);
    const ranges = [];

    for (let i = 0; i <= pulseCount; i++) {
      const prog = i / pulseCount;
      const scaleValue = 1 + Math.sin(prog * Math.PI * 2) * 0.08 * impact;
      ranges.push({ key: 'scale', val: scaleValue, prog });
    }

    ranges.push({ key: 'scale', val: 1, prog: 1 });

    return {
      type: 'ease-in-out',
      start: word.start,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges,
    };
  };

  // Creates shimmer slide effect
  const createShimmerSlideEffect = (
    wordId: string,
    word: any,
    wordIndex: number,
    impact: number,
  ): GenericEffectData => {
    const slideDistance = 15 * impact;
    const delay = wordIndex * 0.05;

    return {
      type: 'ease-out',
      start: word.start + delay,
      duration: 0.6,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'translateX', val: -slideDistance, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.4 },
      ],
    };
  };

  // Creates neon burst effect
  const createNeonBurstEffect = (
    wordId: string,
    word: any,
    selectedGradientChoice: any,
    impact: number,
  ): GenericEffectData => {
    const accentRgb = hexToRgb(selectedGradientChoice.accentColor) || {
      r: 255,
      g: 107,
      b: 107,
    };

    return {
      type: 'spring',
      start: word.start,
      duration: 0.5,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: 0.7, prog: 0 },
        { key: 'scale', val: 1.15 * impact, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
        {
          key: 'filter',
          val: `drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))` as any,
          prog: 0,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${20 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},1)) drop-shadow(0 0 ${40 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.6))` as any,
          prog: 0.5,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${10 * impact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.7))` as any,
          prog: 1,
        },
      ],
    };
  };

  // Creates metallic shine effect
  const createMetallicShineEffect = (
    wordId: string,
    word: any,
    impact: number,
  ): GenericEffectData => {
    return {
      type: 'ease-in-out',
      start: word.start,
      duration: Math.max(1.0, word.duration * 0.7),
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        {
          key: 'filter',
          val: `brightness(1) contrast(1)` as any,
          prog: 0,
        },
        {
          key: 'filter',
          val: `brightness(${1.3 * impact}) contrast(1.2)` as any,
          prog: 0.5,
        },
        {
          key: 'filter',
          val: `brightness(1) contrast(1)` as any,
          prog: 1,
        },
      ],
    };
  };

  // Creates aurora drift effect
  const createAuroraDriftEffect = (
    wordId: string,
    word: any,
    impact: number,
  ): GenericEffectData => {
    const duration = Math.max(3.0, word.duration * 1.8);
    const driftCount = Math.floor(duration / 1.5);
    const ranges = [];

    for (let i = 0; i <= driftCount; i++) {
      const prog = i / driftCount;
      const driftX = Math.sin(prog * Math.PI * 1.5) * 4 * impact;
      const driftY = Math.cos(prog * Math.PI * 1.5) * 3 * impact;
      ranges.push({ key: 'translateX', val: driftX, prog });
      ranges.push({ key: 'translateY', val: driftY, prog });
    }

    ranges.push({ key: 'translateX', val: 0, prog: 1 });
    ranges.push({ key: 'translateY', val: 0, prog: 1 });

    return {
      type: 'ease-in-out',
      start: word.start,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges,
    };
  };

  // Creates fire flicker effect
  const createFireFlickerEffect = (
    wordId: string,
    word: any,
    selectedGradientChoice: any,
    impact: number,
  ): GenericEffectData => {
    const accentRgb = hexToRgb(selectedGradientChoice.accentColor) || {
      r: 255,
      g: 107,
      b: 107,
    };

    const duration = Math.max(1.5, word.duration);
    const flickerCount = Math.floor(duration / 0.15);
    const ranges = [];

    // Use deterministic pattern instead of random values
    for (let i = 0; i <= flickerCount; i++) {
      const prog = i / flickerCount;
      // Create pseudo-random but deterministic intensity based on index
      const intensity = 0.7 + (i % 3) * 0.15;
      const glowSize = (8 + (i % 5) * 3) * impact;
      const brightness = 0.9 + (i % 4) * 0.1;
      ranges.push({
        key: 'filter',
        val: `drop-shadow(0 0 ${glowSize}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},${intensity})) brightness(${brightness})` as any,
        prog,
      });
    }

    return {
      type: 'ease-in-out',
      start: word.start,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges,
    };
  };

  // Generates word data with gradient effects and styling
  const generateWordsData = (
    words: any[],
    caption: any,
    selectedFontChoice: any,
    avgFontSize: number | undefined,
    selectedGradientChoice: any,
    partId: string,
    scentenceId: string,
    style?: any,
    animationStyle?: string,
    fontScaling?: { highlighted?: number; normal?: number },
    globalImpact?: number,
  ) => {
    return words.map((word, _j: number) => {
      const wordId = `word-${_j}-${partId}-${scentenceId}`;
      const isHighlight = word.metadata?.isHighlight;
      const impact = isHighlight ? 1.3 : 1.0;

      // Create effects array based on animation style
      const effects = [];

      // Base opacity effect for all styles
      effects.push({
        id: `opacity-${wordId}`,
        componentId: 'generic',
        data: createOpacityEffect(wordId, word, caption),
      });

      if (animationStyle === 'gradient-wave-float') {
        effects.push({
          id: `wave-float-${wordId}`,
          componentId: 'generic',
          data: createWaveFloatEffect(
            wordId,
            word,
            impact * (globalImpact || 1.0),
          ),
        });

        effects.push({
          id: `glow-${wordId}`,
          componentId: 'generic',
          data: createGradientGlowEffect(
            wordId,
            word,
            selectedGradientChoice,
            impact * (globalImpact || 1.0),
          ),
        });

        effects.push({
          id: `scale-${wordId}`,
          componentId: 'generic',
          data: createScaleEffect(wordId, word, impact * (globalImpact || 1.0)),
        });
      } else if (animationStyle === 'gradient-pulse-glow') {
        effects.push({
          id: `pulse-${wordId}`,
          componentId: 'generic',
          data: createPulseEffect(wordId, word, impact * (globalImpact || 1.0)),
        });

        effects.push({
          id: `glow-${wordId}`,
          componentId: 'generic',
          data: createGradientGlowEffect(
            wordId,
            word,
            selectedGradientChoice,
            impact * (globalImpact || 1.0),
          ),
        });
      } else if (animationStyle === 'gradient-shimmer-slide') {
        effects.push({
          id: `shimmer-slide-${wordId}`,
          componentId: 'generic',
          data: createShimmerSlideEffect(
            wordId,
            word,
            _j,
            impact * (globalImpact || 1.0),
          ),
        });

        effects.push({
          id: `scale-${wordId}`,
          componentId: 'generic',
          data: createScaleEffect(wordId, word, impact * (globalImpact || 1.0)),
        });

        if (isHighlight) {
          effects.push({
            id: `glow-${wordId}`,
            componentId: 'generic',
            data: createGradientGlowEffect(
              wordId,
              word,
              selectedGradientChoice,
              impact * (globalImpact || 1.0),
            ),
          });
        }
      } else if (animationStyle === 'gradient-rainbow-flow') {
        effects.push({
          id: `wave-float-${wordId}`,
          componentId: 'generic',
          data: createWaveFloatEffect(
            wordId,
            word,
            impact * (globalImpact || 1.0),
          ),
        });

        effects.push({
          id: `pulse-${wordId}`,
          componentId: 'generic',
          data: createPulseEffect(
            wordId,
            word,
            impact * 0.5 * (globalImpact || 1.0),
          ),
        });

        effects.push({
          id: `glow-${wordId}`,
          componentId: 'generic',
          data: createGradientGlowEffect(
            wordId,
            word,
            selectedGradientChoice,
            impact * (globalImpact || 1.0),
          ),
        });
      } else if (animationStyle === 'gradient-neon-burst') {
        effects.push({
          id: `neon-burst-${wordId}`,
          componentId: 'generic',
          data: createNeonBurstEffect(
            wordId,
            word,
            selectedGradientChoice,
            impact * (globalImpact || 1.0),
          ),
        });
      } else if (animationStyle === 'gradient-metallic-shine') {
        effects.push({
          id: `scale-${wordId}`,
          componentId: 'generic',
          data: createScaleEffect(wordId, word, impact * (globalImpact || 1.0)),
        });

        effects.push({
          id: `metallic-shine-${wordId}`,
          componentId: 'generic',
          data: createMetallicShineEffect(
            wordId,
            word,
            impact * (globalImpact || 1.0),
          ),
        });
      } else if (animationStyle === 'gradient-aurora-drift') {
        effects.push({
          id: `aurora-drift-${wordId}`,
          componentId: 'generic',
          data: createAuroraDriftEffect(
            wordId,
            word,
            impact * (globalImpact || 1.0),
          ),
        });

        effects.push({
          id: `glow-${wordId}`,
          componentId: 'generic',
          data: createGradientGlowEffect(
            wordId,
            word,
            selectedGradientChoice,
            impact * 0.8 * (globalImpact || 1.0),
          ),
        });
      } else if (animationStyle === 'gradient-fire-flicker') {
        effects.push({
          id: `fire-flicker-${wordId}`,
          componentId: 'generic',
          data: createFireFlickerEffect(
            wordId,
            word,
            selectedGradientChoice,
            impact * (globalImpact || 1.0),
          ),
        });

        effects.push({
          id: `scale-${wordId}`,
          componentId: 'generic',
          data: createScaleEffect(
            wordId,
            word,
            impact * 0.8 * (globalImpact || 1.0),
          ),
        });
      }

      // Calculate font size and style
      let fontSize = avgFontSize ?? 60;
      const highlightedMultiplier = fontScaling?.highlighted ?? 1.5;
      const normalMultiplier = fontScaling?.normal ?? 0.9;
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

      // Select gradient based on highlight status
      const gradient = isHighlight
        ? selectedGradientChoice.highlightGradient
        : selectedGradientChoice.normalGradient;

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
          gradient: gradient, // Apply gradient to text
          className: isHighlight
            ? 'rounded-xl font-bold tracking-wide'
            : 'rounded-xl',
          style: {
            fontSize: fontCalculatedSize,
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [String(fontStyle.fontWeight)]
              : ['400', '700'],
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

  // Applies noGaps extension to reduce gaps between captions
  const applyNoGapsExtension = (
    captions: Transcription['captions'],
    noGapsConfig: any,
  ) => {
    if (!captions || !Array.isArray(captions)) {
      return captions;
    }

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

      // Use deterministic angle based on height value to ensure consistency
      const angle = ((height || 600) % 360) * (Math.PI / 180);
      const circleX = centerX + circleRadius * Math.cos(angle);
      const circleY = centerY + circleRadius * Math.sin(angle);

      return {
        position: 'absolute' as const,
        left: `${Math.max(0, Math.min(1920 - 200, circleX))}px`,
        top: `${Math.max(0, Math.min(1080 - (height || 600), circleY))}px`,
      };
    }

    // Handle random positioning - use center positioning as fallback
    // (Random positioning needs to be deterministic for Remotion)
    if (align === 'random' || randomize) {
      // Fall back to center positioning for consistency
      const baseStyle: any = { position: 'absolute' as const };
      return {
        ...baseStyle,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
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
    selectedGradientChoice: any,
    partId: string,
    scentenceId: string,
    floatThreshold?: number,
    textAlign?: string,
    style?: any,
    animationStyle?: string,
    layout?: string,
    fontScaling?: { highlighted?: number; normal?: number },
    globalImpact?: number,
  ) => {
    const wordsData = generateWordsData(
      partWords,
      caption,
      selectedFontChoice,
      avgFontSize,
      selectedGradientChoice,
      partId,
      scentenceId,
      style,
      animationStyle,
      fontScaling,
      globalImpact,
    );

    // Calculate displacement based on character count or floatThreshold
    const partCharacterCount = partWords.reduce(
      (sum, word) => sum + word.text.length,
      0,
    );

    const displacement =
      floatThreshold !== undefined
        ? floatThreshold
        : Math.max(5, Math.min(30, partCharacterCount * 1.5));

    // Create part-specific effects using provider mode
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
        type: 'ease-in-out',
        start: 0,
        duration: 10,
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

    // Calculate gap based on font size
    const baseFontSize = avgFontSize || 60;
    const gapSize = Math.max(12, Math.floor(baseFontSize * 0.35));

    if (layout === 'horizontal') {
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
    }
  };

  // Processes captions and applies highlighting logic
  const processCaptions = (
    inputCaptions: any[],
    negativeOffset: number | undefined,
    noGapsConfig: any,
    avgFontSize: number | undefined,
    selectedFontChoice: any,
    selectedGradientChoice: any,
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

    return processedCaptions.map(
      (caption: Transcription['captions'][number], _i: number) => {
        const scentenceId = `caption-${_i}`;

        // Split sentence into parts
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

        let highlightedWordIndex = -1;

        if (highlightedWordIndices.length === 0) {
          // Fallback logic to select most significant word
          const allWords = caption.words;
          const wordDurations = allWords.map(word => word.duration);
          const avgDuration =
            wordDurations.reduce((sum, dur) => sum + dur, 0) / allWords.length;
          const maxDuration = Math.max(...wordDurations);

          const significantWords = allWords
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
        }

        // Ensure at least one word is highlighted
        if (
          highlightedWordIndices.length === 0 &&
          highlightedWordIndex === -1
        ) {
          highlightedWordIndex = 0;
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
            if ((word as any).originalWordIndex === highlightedWordIndex) {
              isHighlight = true;
            } else {
              isHighlight = _j === highlightedWordIndex;
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
            selectedGradientChoice,
            partId,
            scentenceId,
            floatThreshold,
            textAlign,
            style,
            animationStyle,
            layout,
            fontScaling,
            globalImpact,
          );
        });

        // Main sentence block layout
        const baseFontSize = avgFontSize || 60;
        const gapSize = Math.max(10, Math.floor(baseFontSize * 0.25));

        if (layout === 'horizontal') {
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
          } justify-center text-white gap-3 pl-10`;

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

  // Select font and gradient choices - use first choice for consistency (deterministic)
  const selectedFontChoice = FONT_CHOICES[0];
  const selectedGradientChoice = GRADIENT_CHOICES[0];

  // Process all captions with gradient highlighting and effects
  const captionsChildrenData = processCaptions(
    inputCaptions,
    subtitleSyncConfig.negativeOffset,
    subtitleSyncConfig.noGaps,
    avgFontSize,
    selectedFontChoice,
    selectedGradientChoice,
    subtitleSyncConfig.maxLines,
    subtitleSyncConfig.floatThreshold,
    positionConfig.textAlign,
    subtitleSyncConfig.disableMetadata,
    style,
    subtitleSyncConfig.animationStyle,
    subtitleSyncConfig.layout,
    subtitleSyncConfig.fontScaling,
    subtitleSyncConfig.impact,
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
                const positionStyle = getPosition(
                  (inputCaptions[_j]?.text?.length ?? 0) > 20 ? 800 : 600,
                  positionConfig,
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
  id: 'sub-kinetic-gradient-flow',
  title: 'Kinetic Gradient Flow Subtitles',
  description:
    'Stunning gradient text subtitles with kinetic animations including wave-float, pulse-glow, shimmer-slide, rainbow-flow, neon-burst, metallic-shine, aurora-drift, and fire-flicker effects',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'gradient',
    'kinetic',
    'animated',
    'wave',
    'pulse',
    'glow',
    'shimmer',
    'rainbow',
    'neon',
    'metallic',
    'aurora',
    'fire',
    'colorful',
    'modern',
  ],
  defaultInputParams: {
    subtitleSync: {
      animationStyle: 'gradient-wave-float',
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
        highlighted: 1.5,
        normal: 0.9,
      },
      impact: 1.0,
    },
    position: {
      align: 'center',
      randomize: false,
      textAlign: 'center',
    },
    fontChoices: [
      {
        primaryFont: 'Roboto:700',
        headerFont: 'BebasNeue:700',
      },
    ],
    gradientChoices: [
      {
        normalGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        highlightGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        accentColor: '#f5576c',
      },
    ],
    style: {
      textTransformSub: 'uppercase',
      textTransformMain: 'uppercase',
    },
    avgFontSize: 60,
    inputCaptions: [
      {
        id: 'caption-1',
        text: 'Beautiful Gradient Text!',
        absoluteStart: 0,
        absoluteEnd: 10,
        start: 0,
        end: 10,
        duration: 10,
        metadata: {},
        words: [
          {
            id: 'word-1',
            text: 'Beautiful',
            start: 0,
            duration: 4,
            absoluteStart: 0,
            absoluteEnd: 4,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'Gradient',
            start: 4,
            duration: 3,
            absoluteStart: 4,
            absoluteEnd: 7,
            confidence: 1,
          },
          {
            id: 'word-3',
            text: 'Text',
            start: 7,
            duration: 3,
            absoluteStart: 7,
            absoluteEnd: 10,
            confidence: 1,
          },
        ],
      },
    ],
  },
};

const _presetExecution = presetExecution.toString();

export const subKineticGradientFlowPreset = {
  metadata: presetMetadata,
  presetFunction: _presetExecution,
  presetParams: z.toJSONSchema(presetParams),
};
