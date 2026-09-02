/**
 * Scrolling Vertical Subtitles Preset
 *
 * This preset creates vertically scrolling subtitles with advanced animation effects.
 * Captions scroll up or down the screen with customizable word animations, highlighting,
 * and visual effects.
 *
 * Features:
 * - **Scroll Direction**: Up or down scrolling with configurable speed and easing
 * - **Word Animations**: Fade-in, scale-in, slide-in, typewriter, glow-pulse, shake, bounce, wave
 * - **Highlight Effects**: Glow, scale, color-shift, pulse, shake, float effects for highlighted words
 * - **Visual Effects**: Background blur, shadow depth, border glow, particle trails
 * - **Flexible Positioning**: Left, center, or right alignment with margin control
 * - **Font & Color Customization**: Custom font families and color schemes
 *
 * Use cases:
 * - Creating dynamic scrolling captions for videos
 * - Building engaging subtitle animations
 * - Creating social media content with animated text
 * - Adding professional scrolling text effects
 */

import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { paramMetaTypes } from '../../dataTypes';

const presetParams = z.object({
  inputCaptions: z.array(z.any()).meta({
    [paramMetaTypes.referrableDataType]: 'captions',
  }),
  position: z.object({
    align: z.enum(['left', 'center', 'right']).default('center'),
    margin: z.number().default(80).describe('margin from edges'),
  }),
  scrollConfig: z.object({
    scrollDirection: z.enum(['up', 'down']).default('up'),
    scrollSpeed: z.number().default(1.0).describe('scroll speed multiplier'),
    scrollEasing: z
      .enum(['linear', 'ease-in', 'ease-out', 'bounce', 'elastic'])
      .default('linear'),
    scrollGap: z.number().default(40).describe('gap between caption lines'),
    scrollOffset: z.number().default(0).describe('initial scroll offset'),
    scrollDuration: z
      .number()
      .default(30)
      .describe('total scroll duration in seconds'),
  }),
  wordAnimation: z.object({
    style: z
      .enum([
        'fade-in', // Simple fade in
        'scale-in', // Scale from small to normal
        'slide-in', // Slide in from side
        'typewriter', // Character by character reveal
        'glow-pulse', // Glow and pulse effect
        'shake', // Shake effect
        'bounce', // Bounce effect
        'wave', // Wave-like motion
      ])
      .default('fade-in'),
    duration: z.number().default(0.5).describe('word animation duration'),
    intensity: z.number().default(1.0).describe('animation intensity'),
    stagger: z.number().default(0.05).describe('stagger between words'),
  }),
  highlightEffects: z.object({
    enabled: z.boolean().default(true).describe('enable word highlighting'),
    style: z
      .enum(['glow', 'scale', 'color-shift', 'pulse', 'shake', 'float'])
      .default('glow'),
    intensity: z.number().default(1.5).describe('highlight intensity'),
    duration: z.number().default(0.3).describe('highlight duration'),
  }),
  visualEffects: z.object({
    backgroundBlur: z.boolean().default(false).describe('add background blur'),
    shadowDepth: z.number().default(0).describe('shadow depth (0-10)'),
    borderGlow: z.boolean().default(false).describe('add glowing border'),
    particleTrail: z.boolean().default(false).describe('add particle trail'),
  }),
  fontChoices: z
    .array(
      z.object({
        primaryFont: z.string().describe('primary font family'),
        headerFont: z.string().describe('header font family'),
      }),
    )
    .optional()
    .describe('font choices'),
  colorChoices: z
    .array(
      z.object({
        primary: z.string().describe('primary color'),
        secondary: z.string().describe('secondary color'),
        accent: z.string().describe('accent color'),
        background: z.string().describe('background color'),
      }),
    )
    .optional()
    .describe('color choices'),
  style: z
    .object({
      textTransform: z
        .enum(['none', 'uppercase', 'lowercase', 'capitalize'])
        .default('none'),
      fontSize: z.number().default(48).describe('base font size'),
      fontWeight: z
        .enum(['normal', 'bold', 'lighter', 'bolder'])
        .default('normal'),
    })
    .optional()
    .describe('text styling'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props?: Partial<PresetPassedProps>,
): PresetOutput => {
  const {
    inputCaptions,
    position,
    scrollConfig,
    wordAnimation,
    highlightEffects,
    visualEffects,
    fontChoices,
    colorChoices,
    style,
  } = params;

  // Font choices configuration
  const FONT_CHOICES =
    fontChoices && fontChoices.length > 0
      ? fontChoices
      : [
          {
            primaryFont: 'Inter:600',
            headerFont: 'BebasNeue:400',
          },
        ];

  // Color choices configuration
  const COLOR_CHOICES =
    colorChoices && colorChoices.length > 0
      ? colorChoices
      : [
          {
            primary: '#ffffff',
            secondary: '#cccccc',
            accent: '#ff6b6b',
            background: 'rgba(0,0,0,0.3)',
          },
        ];

  // Utility function to convert hex color to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 255, b: 255 };
  };

  // Split caption into parts based on metadata or duration
  const splitCaptionIntoParts = (caption: any) => {
    // If metadata has splitParts, use it
    if (
      caption.metadata?.splitParts &&
      caption.metadata.splitParts.length > 0
    ) {
      const parts = [];
      let currentWordIndex = 0;

      for (const splitPart of caption.metadata.splitParts) {
        const partWords = [];
        const targetText = splitPart.trim().toLowerCase();

        // Find words that match this split part
        while (currentWordIndex < caption.words.length) {
          const word = caption.words[currentWordIndex];
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

      return parts.length > 0 ? parts : [caption.words];
    }

    // Fallback: split by duration (longer than 2 seconds)
    const parts = [];
    let currentPart = [];
    let currentDuration = 0;
    const maxPartDuration = 2.0; // 2 seconds max per part

    for (const word of caption.words) {
      currentPart.push(word);
      currentDuration += word.duration;

      if (currentDuration >= maxPartDuration || currentPart.length >= 4) {
        parts.push([...currentPart]);
        currentPart = [];
        currentDuration = 0;
      }
    }

    // Add remaining words as last part
    if (currentPart.length > 0) {
      parts.push(currentPart);
    }

    return parts.length > 0 ? parts : [caption.words];
  };

  // Create word animation effects
  const createWordAnimation = (
    wordId: string,
    word: any,
    animationStyle: string,
    duration: number,
    intensity: number,
  ): GenericEffectData => {
    const ranges = [];
    const shortWordThreshold = 0.2;

    switch (animationStyle) {
      case 'fade-in':
        if (word.duration > shortWordThreshold) {
          ranges.push({ key: 'opacity', val: 0, prog: 0 });
          ranges.push({ key: 'opacity', val: 1, prog: 1 });
        } else {
          ranges.push({ key: 'opacity', val: 0, prog: 0 });
          ranges.push({ key: 'opacity', val: 1, prog: 0.05 });
        }
        break;

      case 'scale-in':
        ranges.push({ key: 'scale', val: 0.8, prog: 0 });
        ranges.push({ key: 'scale', val: 1.1 * intensity, prog: 0.7 });
        ranges.push({ key: 'scale', val: 1, prog: 1 });
        if (word.duration > shortWordThreshold) {
          ranges.push({ key: 'opacity', val: 0, prog: 0 });
          ranges.push({ key: 'opacity', val: 1, prog: 0.3 });
        } else {
          ranges.push({ key: 'opacity', val: 0, prog: 0 });
          ranges.push({ key: 'opacity', val: 1, prog: 0.05 });
        }
        break;

      case 'slide-in':
        ranges.push({ key: 'translateX', val: -30 * intensity, prog: 0 });
        ranges.push({ key: 'translateX', val: 0, prog: 1 });
        if (word.duration > shortWordThreshold) {
          ranges.push({ key: 'opacity', val: 0, prog: 0 });
          ranges.push({ key: 'opacity', val: 1, prog: 0.5 });
        } else {
          ranges.push({ key: 'opacity', val: 0, prog: 0 });
          ranges.push({ key: 'opacity', val: 1, prog: 0.05 });
        }
        break;

      case 'typewriter':
        const wordLength = word.text.length;
        for (let i = 0; i <= wordLength; i++) {
          const prog = i / wordLength;
          ranges.push({
            key: 'opacity',
            val: 0,
            prog: Math.max(0, prog - 0.1),
          });
          ranges.push({
            key: 'opacity',
            val: 1,
            prog: Math.min(1, prog + 0.1),
          });
        }
        break;

      case 'glow-pulse':
        if (word.duration > shortWordThreshold) {
          ranges.push({ key: 'opacity', val: 0, prog: 0 });
          ranges.push({ key: 'opacity', val: 1, prog: 0.3 });
        } else {
          ranges.push({ key: 'opacity', val: 0, prog: 0 });
          ranges.push({ key: 'opacity', val: 1, prog: 0.05 });
        }
        ranges.push({ key: 'scale', val: 1, prog: 0 });
        ranges.push({ key: 'scale', val: 1.05 * intensity, prog: 0.5 });
        ranges.push({ key: 'scale', val: 1, prog: 1 });
        break;

      case 'shake':
        if (word.duration > shortWordThreshold) {
          ranges.push({ key: 'opacity', val: 0, prog: 0 });
          ranges.push({ key: 'opacity', val: 1, prog: 0.2 });
        } else {
          ranges.push({ key: 'opacity', val: 0, prog: 0 });
          ranges.push({ key: 'opacity', val: 1, prog: 0.05 });
        }
        for (let i = 0; i <= 10; i++) {
          const prog = i / 10;
          const shakeValue = (Math.random() - 0.5) * 4 * intensity;
          ranges.push({ key: 'translateX', val: shakeValue, prog });
        }
        ranges.push({ key: 'translateX', val: 0, prog: 1 });
        break;

      case 'bounce':
        if (word.duration > shortWordThreshold) {
          ranges.push({ key: 'opacity', val: 0, prog: 0 });
          ranges.push({ key: 'opacity', val: 1, prog: 0.1 });
        } else {
          ranges.push({ key: 'opacity', val: 0, prog: 0 });
          ranges.push({ key: 'opacity', val: 1, prog: 0.05 });
        }
        ranges.push({ key: 'scale', val: 0.5, prog: 0 });
        ranges.push({ key: 'scale', val: 1.2 * intensity, prog: 0.6 });
        ranges.push({ key: 'scale', val: 1, prog: 1 });
        break;

      case 'wave':
        if (word.duration > shortWordThreshold) {
          ranges.push({ key: 'opacity', val: 0, prog: 0 });
          ranges.push({ key: 'opacity', val: 1, prog: 0.3 });
        } else {
          ranges.push({ key: 'opacity', val: 0, prog: 0 });
          ranges.push({ key: 'opacity', val: 1, prog: 0.05 });
        }
        for (let i = 0; i <= 8; i++) {
          const prog = i / 8;
          const waveValue = Math.sin(prog * Math.PI * 2) * 3 * intensity;
          ranges.push({ key: 'translateY', val: waveValue, prog });
        }
        ranges.push({ key: 'translateY', val: 0, prog: 1 });
        break;
    }

    return {
      type: 'ease-out',
      start: word.absoluteStart,
      duration: Math.min(duration * intensity, word.duration * 2), // Limit animation to 2x word duration
      mode: 'provider',
      targetIds: [wordId],
      ranges,
    };
  };

  // Create highlight effect for words
  const createHighlightEffect = (
    wordId: string,
    word: any,
    style: string,
    intensity: number,
    duration: number,
    selectedColorChoice: any,
  ): GenericEffectData => {
    const accentRgb = hexToRgb(selectedColorChoice.accent);
    const ranges = [];

    switch (style) {
      case 'glow':
        ranges.push({
          key: 'filter',
          val: `drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))`,
          prog: 0,
        });
        ranges.push({
          key: 'filter',
          val: `drop-shadow(0 0 ${8 * intensity}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.8))`,
          prog: 0.5,
        });
        ranges.push({
          key: 'filter',
          val: `drop-shadow(0 0 ${4 * intensity}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.6))`,
          prog: 1,
        });
        break;

      case 'scale':
        ranges.push({ key: 'scale', val: 1, prog: 0 });
        ranges.push({ key: 'scale', val: 1.1 * intensity, prog: 0.5 });
        ranges.push({ key: 'scale', val: 1, prog: 1 });
        break;

      case 'color-shift':
        ranges.push({
          key: 'color',
          val: selectedColorChoice.primary,
          prog: 0,
        });
        ranges.push({
          key: 'color',
          val: selectedColorChoice.accent,
          prog: 0.5,
        });
        ranges.push({
          key: 'color',
          val: selectedColorChoice.primary,
          prog: 1,
        });
        break;

      case 'pulse':
        ranges.push({ key: 'scale', val: 1, prog: 0 });
        ranges.push({ key: 'scale', val: 1.05 * intensity, prog: 0.5 });
        ranges.push({ key: 'scale', val: 1, prog: 1 });
        break;

      case 'shake':
        for (let i = 0; i <= 5; i++) {
          const prog = i / 5;
          const shakeValue = (Math.random() - 0.5) * 3 * intensity;
          ranges.push({ key: 'translateX', val: shakeValue, prog });
        }
        ranges.push({ key: 'translateX', val: 0, prog: 1 });
        break;

      case 'float':
        ranges.push({ key: 'translateY', val: 0, prog: 0 });
        ranges.push({ key: 'translateY', val: -3 * intensity, prog: 0.5 });
        ranges.push({ key: 'translateY', val: 0, prog: 1 });
        break;
    }

    return {
      type: 'ease-out',
      start: word.absoluteStart,
      duration: Math.min(duration, word.duration * 2), // Limit highlight to 2x word duration
      mode: 'provider',
      targetIds: [wordId],
      ranges,
    };
  };

  // Create continuous scroll effect for the entire container
  const createScrollEffect = (
    containerId: string,
    scrollDirection: string,
    scrollSpeed: number,
    scrollEasing: string,
    totalDuration: number,
  ): GenericEffectData => {
    const ranges = [];

    switch (scrollDirection) {
      case 'up':
        ranges.push({ key: 'translateY', val: 100, prog: 0 });
        ranges.push({ key: 'translateY', val: -100, prog: 1 });
        break;
      case 'down':
        ranges.push({ key: 'translateY', val: -100, prog: 0 });
        ranges.push({ key: 'translateY', val: 100, prog: 1 });
        break;
    }

    return {
      type: scrollEasing === 'linear' ? 'linear' : 'ease-out',
      start: 0,
      duration: totalDuration,
      mode: 'provider',
      targetIds: [containerId],
      ranges,
    };
  };

  // Calculate total duration from all captions with extra time for scrolling
  const calculateTotalDuration = (captions: any[]) => {
    if (captions.length === 0) return 30;
    const lastCaption = captions[captions.length - 1];
    // Add extra time for scrolling - each caption should stay visible for 2-3 more captions
    const extraTime = captions.length > 3 ? 3 * 5 : captions.length * 5; // 5 seconds per caption
    return lastCaption.absoluteEnd + extraTime;
  };

  // Generate word data with animations
  const generateWordData = (
    word: any,
    wordIndex: number,
    caption: any,
    selectedFontChoice: any,
    selectedColorChoice: any,
    wordId: string,
    isHighlight: boolean,
    styleConfig?: any,
  ) => {
    const effects = [];

    // Add word animation
    effects.push({
      id: `word-animation-${wordId}`,
      componentId: 'generic',
      data: createWordAnimation(
        wordId,
        word,
        wordAnimation.style,
        wordAnimation.duration,
        wordAnimation.intensity,
      ),
    });

    // Add highlight effect if enabled and word is highlighted
    if (highlightEffects.enabled && isHighlight) {
      effects.push({
        id: `highlight-${wordId}`,
        componentId: 'generic',
        data: createHighlightEffect(
          wordId,
          word,
          highlightEffects.style,
          highlightEffects.intensity,
          highlightEffects.duration,
          selectedColorChoice,
        ),
      });
    }

    // Calculate font size and style
    const fontSize = styleConfig?.fontSize || 48;
    const font = isHighlight
      ? selectedFontChoice.headerFont
      : selectedFontChoice.primaryFont;
    const fontFamily = font.includes(':') ? font.split(':')[0] : font;

    // Parse font weight
    let fontWeight = 'normal';
    if (font.includes(':')) {
      const parts = font.split(':');
      if (parts.length > 1) {
        fontWeight = parts[1] || 'normal';
      }
    }

    // Set text color
    const textColor = isHighlight
      ? selectedColorChoice.accent
      : selectedColorChoice.primary;

    // Apply text transform
    let transformedText = word.text;
    if (styleConfig?.textTransform) {
      switch (styleConfig.textTransform) {
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
      }
    }

    return {
      type: 'atom',
      id: wordId,
      componentId: 'TextAtom',
      effects: effects,
      data: {
        text: transformedText,
        className: isHighlight ? 'font-bold tracking-wide' : 'font-normal',
        style: {
          fontSize: fontSize,
          color: textColor,
          fontWeight: fontWeight,
          fontFamily: fontFamily,
        },
        font: {
          family: fontFamily,
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData;
  };

  // Generate caption part data (each part contains multiple words)
  const generateCaptionPartData = (
    partWords: any[],
    partIndex: number,
    caption: any,
    selectedFontChoice: any,
    selectedColorChoice: any,
    partId: string,
    styleConfig?: any,
  ) => {
    // Generate word data for all words in this part
    const wordsData = partWords.map((word: any, wordIndex: number) => {
      const wordId = `word-${wordIndex}-${partId}`;
      const isHighlight = word.metadata?.isHighlight || false;

      return generateWordData(
        word,
        wordIndex,
        caption,
        selectedFontChoice,
        selectedColorChoice,
        wordId,
        isHighlight,
        styleConfig,
      );
    });

    // Create part container with horizontal layout
    return {
      type: 'layout',
      id: partId,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row items-center justify-center gap-2',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: wordsData,
    } as RenderableComponentData;
  };

  // Generate caption data with continuous scrolling
  const generateCaptionData = (
    caption: any,
    captionIndex: number,
    selectedFontChoice: any,
    selectedColorChoice: any,
    totalDuration: number,
    styleConfig?: any,
  ) => {
    const captionId = `caption-${captionIndex}`;

    // Split caption into parts
    const captionParts = splitCaptionIntoParts(caption);

    // Generate part data for each part
    const partsData = captionParts.map(
      (partWords: any[], partIndex: number) => {
        const partId = `part-${partIndex}-${captionId}`;
        return generateCaptionPartData(
          partWords,
          partIndex,
          caption,
          selectedFontChoice,
          selectedColorChoice,
          partId,
          styleConfig,
        );
      },
    );

    // Calculate position based on alignment
    const getAlignmentStyle = () => {
      const baseStyle: any = {
        position: 'absolute',
        width: '100%',
        padding: `0 ${position.margin}px`,
      };

      switch (position.align) {
        case 'left':
          return { ...baseStyle, textAlign: 'left' };
        case 'right':
          return { ...baseStyle, textAlign: 'right' };
        case 'center':
        default:
          return { ...baseStyle, textAlign: 'center' };
      }
    };

    // Add visual effects
    const visualEffectsStyle: any = {};

    if (visualEffects.backgroundBlur) {
      visualEffectsStyle.backdropFilter = 'blur(10px)';
      visualEffectsStyle.backgroundColor = selectedColorChoice.background;
    }

    if (visualEffects.shadowDepth > 0) {
      visualEffectsStyle.boxShadow = `0 ${visualEffects.shadowDepth}px ${visualEffects.shadowDepth * 2}px rgba(0,0,0,0.3)`;
    }

    if (visualEffects.borderGlow) {
      const accentRgb = hexToRgb(selectedColorChoice.accent);
      visualEffectsStyle.border = `2px solid rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.3)`;
      visualEffectsStyle.borderRadius = '8px';
    }

    // Calculate vertical position for continuous scrolling
    const verticalPosition = captionIndex * (scrollConfig.scrollGap + 100); // 100px for caption height

    return {
      type: 'layout',
      id: captionId,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-col items-center justify-center gap-2',
          style: {
            ...getAlignmentStyle(),
            ...visualEffectsStyle,
            position: 'absolute',
            top: `${verticalPosition}px`,
            width: '100%',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: partsData,
    } as RenderableComponentData;
  };

  // Select random font and color choices
  const selectedFontChoice =
    FONT_CHOICES[Math.floor(Math.random() * FONT_CHOICES.length)];
  const selectedColorChoice =
    COLOR_CHOICES[Math.floor(Math.random() * COLOR_CHOICES.length)];

  // Calculate total duration from captions
  const totalDuration = calculateTotalDuration(inputCaptions);

  // Process all captions
  const captionsData = inputCaptions.map((caption, index) =>
    generateCaptionData(
      caption,
      index,
      selectedFontChoice,
      selectedColorChoice,
      totalDuration,
      style,
    ),
  );
  captionsData.forEach((captionNode, index) => {
    const built = props?.buildDataItemIds?.({
      paramKeys: ['inputCaptions'],
      arrayIndex: index,
    });
    const ids =
      built != null && built.length > 0
        ? built
        : [`inputCaptions.[${index}]`];
    props?.applyDataItemIdsToNodeTree?.(captionNode, ids);
  });
  // Create scroll effect for the main container
  const scrollEffect = createScrollEffect(
    'ScrollingSubtitles',
    scrollConfig.scrollDirection,
    scrollConfig.scrollSpeed,
    scrollConfig.scrollEasing,
    totalDuration,
  );

  // Generate final composition structure
  return {
    output: {
      config: {
        duration: totalDuration,
      },
      childrenData: [
        {
          id: 'ScrollingSubtitles',
          componentId: 'BaseLayout',
          type: 'layout',
          effects: [
            {
              id: 'scroll-effect',
              componentId: 'generic',
              data: scrollEffect,
            },
          ],
          data: {
            containerProps: {
              className: 'absolute inset-0 overflow-hidden',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
          childrenData: captionsData,
        } as RenderableComponentData,
      ],
    },
    options: {
      attachedToId: 'BaseScene',
      attachedContainers: [
        {
          className: 'absolute inset-0',
        },
      ],
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'sub-scrolling-vertical',
  title: 'Scrolling Vertical Subtitles',
  description:
    'Continuous scrolling subtitles like movie credits with word animations that trigger as words are spoken. Features smooth scrolling with configurable word animations including fade-in, scale-in, typewriter, glow-pulse, and more.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'scrolling',
    'vertical',
    'continuous',
    'credits',
    'word-animations',
    'fade-in',
    'scale-in',
    'typewriter',
    'glow-pulse',
    'bounce',
    'wave',
  ],
  defaultInputParams: {
    position: {
      align: 'center',
      margin: 80,
    },
    scrollConfig: {
      scrollDirection: 'up',
      scrollSpeed: 1.0,
      scrollEasing: 'linear',
      scrollOffset: 0,
      scrollGap: 40,
      scrollDuration: 30,
    },
    wordAnimation: {
      style: 'fade-in',
      duration: 0.5,
      intensity: 1.0,
      stagger: 0.05,
    },
    highlightEffects: {
      enabled: true,
      style: 'glow',
      intensity: 1.5,
      duration: 0.3,
    },
    visualEffects: {
      backgroundBlur: false,
      shadowDepth: 0,
      borderGlow: false,
      particleTrail: false,
    },
    fontChoices: [
      {
        primaryFont: 'Inter:600',
        headerFont: 'BebasNeue:400',
      },
    ],
    colorChoices: [
      {
        primary: '#ffffff',
        secondary: '#cccccc',
        accent: '#ff6b6b',
        background: 'rgba(0,0,0,0.3)',
      },
    ],
    style: {
      textTransform: 'none',
      fontSize: 48,
      fontWeight: 'normal',
    },
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
            metadata: { isHighlight: true },
          },
          {
            id: 'word-2',
            text: 'world',
            start: 5,
            duration: 5,
            absoluteStart: 5,
            absoluteEnd: 10,
            confidence: 1,
            metadata: { isHighlight: false },
          },
        ],
      },
    ],
  },
};

const _presetExecution = presetExecution.toString();

export const subScrollingVerticalPreset = {
  metadata: presetMetadata,
  presetFunction: _presetExecution,
  presetParams: z.toJSONSchema(presetParams),
};
