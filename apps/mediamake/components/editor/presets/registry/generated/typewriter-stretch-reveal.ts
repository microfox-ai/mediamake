/**
 * Typewriter Stretch Reveal Preset
 *
 * A kinetic character-by-character reveal effect that mimics a vintage typewriter mechanism.
 * Instead of stamping letters, each character elastically stretches from extreme compression 
 * (scaleX: 0) into place. Characters animate sequentially with a rhythmic typing cadence,
 * stretching from width 0 → 200% → 100%, creating a mechanical yet organic spring-release effect.
 *
 * Features:
 * - **Character-by-Character Animation**: Each letter animates independently in sequence
 * - **Elastic Stretch Effect**: scaleX animation (0 → 2 → 1) creates spring-like release
 * - **Mechanical Bounce**: Subtle translateY (-2px → 0) adds typewriter impact feel
 * - **Rhythmic Cadence**: 50ms stagger delay between characters creates typing rhythm
 * - **Transform-Origin Control**: Left-aligned origin maintains typewriter direction
 * - **Word Boundary Preservation**: Smart spacing maintains word separation
 * - **Caption Integration**: Works with word-level caption data for synchronized reveal
 * - **Performance Optimized**: CSS containment and batched DOM updates
 *
 * Use cases:
 * - Creating vintage typewriter text reveals
 * - Building mechanical text animations
 * - Adding rhythmic character entrances
 * - Creating spring-based typography effects
 * - Simulating typing animations with stretch
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfex/remotion';

// --- Parameter Schema ---
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string().describe('Unique caption ID'),
        text: z.string().describe('Full caption text'),
        start: z.number().describe('Start time relative to caption (0)'),
        end: z.number().describe('End time relative to caption'),
        duration: z.number().describe('Caption duration'),
        absoluteStart: z.number().describe('Absolute start time in video'),
        absoluteEnd: z.number().describe('Absolute end time in video'),
        words: z.array(
          z.object({
            text: z.string().describe('Word text'),
            start: z.number().describe('Start time relative to caption'),
            end: z.number().describe('End time relative to caption'),
            duration: z.number().describe('Word duration'),
            absoluteStart: z.number().describe('Absolute start time in video'),
            absoluteEnd: z.number().describe('Absolute end time in video'),
          })
        ),
      })
    )
    .describe('Array of caption data with word-level timing'),
  
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter:600" for weight 600)'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  
  characterStagger: z
    .number()
    .min(0)
    .max(200)
    .default(50)
    .describe('Delay between character animations in milliseconds'),
  
  stretchDuration: z
    .number()
    .min(100)
    .max(1000)
    .default(400)
    .describe('Duration of each character stretch animation in milliseconds'),
  
  maxStretchScale: z
    .number()
    .min(1.2)
    .max(3)
    .default(2)
    .describe('Maximum horizontal stretch (scaleX peak value)'),
  
  bounceHeight: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Vertical bounce height in pixels'),
  
  wordSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Spacing between words in pixels (Tailwind mr-2 = 8px)'),
  
  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(32)
    .describe('Container horizontal padding in pixels'),
  
  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical positioning of text'),
  
  horizontalAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal text alignment'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize,
    fontFamily,
    textColor,
    characterStagger,
    stretchDuration,
    maxStretchScale,
    bounceHeight,
    wordSpacing,
    containerPadding,
    verticalPosition,
    horizontalAlign,
  } = params;

  // Parse font family and weight
  const parseFontString = (fontString: string): { family: string; weight: string } => {
    if (fontString.includes(':')) {
      const [family, weight] = fontString.split(':');
      return { family, weight: weight || '600' };
    }
    return { family: fontString, weight: '600' };
  };

  const { family: parsedFontFamily, weight: fontWeight } = parseFontString(fontFamily);

  // Convert durations from milliseconds to seconds
  const staggerDelay = characterStagger / 1000;
  const animationDuration = stretchDuration / 1000;

  // Create character effect generator
  const createCharacterStretchEffect = (
    charId: string,
    charIndex: number,
    wordStartTime: number,
  ): GenericEffectData => {
    const effectStart = wordStartTime + charIndex * staggerDelay;
    
    return {
      type: 'ease-out',
      start: effectStart,
      duration: animationDuration,
      mode: 'provider',
      targetIds: [charId],
      ranges: [
        // Horizontal stretch animation (0 → maxScale → 1)
        { key: 'scaleX', val: 0, prog: 0 },
        { key: 'scaleX', val: maxStretchScale, prog: 0.6 },
        { key: 'scaleX', val: 1, prog: 1 },
        
        // Vertical bounce for mechanical feel
        { key: 'translateY', val: -bounceHeight, prog: 0.3 },
        { key: 'translateY', val: 0, prog: 1 },
        
        // Opacity fade-in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },
      ],
    };
  };

  // Build all caption containers
  const captionContainers: RenderableComponentData[] = [];

  captions.forEach((caption) => {
    const wordContainers: RenderableComponentData[] = [];
    let globalCharIndex = 0; // Track character index across all words for cumulative stagger

    caption.words.forEach((word, wordIndex) => {
      const characters = word.text.split('');
      const characterComponents: RenderableComponentData[] = [];
      const wordEffects: any[] = [];

      characters.forEach((char, charIndexInWord) => {
        const charId = `char-${caption.id}-${wordIndex}-${charIndexInWord}`;
        
        // Create character text atom
        characterComponents.push({
          id: charId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: char,
            style: {
              fontSize: `${fontSize}px`,
              fontWeight: fontWeight,
              color: textColor,
              transformOrigin: 'left center', // Critical for typewriter direction
              willChange: 'transform',
              display: 'inline-block',
            },
            font: {
              family: parsedFontFamily,
              weights: [fontWeight],
              subsets: ['latin'],
              display: 'swap',
            },
          } as TextAtomData,
          context: {
            timing: {
              start: 0, // Relative to word container
              duration: caption.duration, // All characters persist for full caption
            },
          },
        } as RenderableComponentData);

        // Create stretch effect for this character
        const charEffect = createCharacterStretchEffect(
          charId,
          globalCharIndex, // Use global index for cumulative stagger across words
          word.start, // Relative to caption start
        );
        
        wordEffects.push({
          id: `stretch-${charId}`,
          componentId: 'generic',
          data: charEffect,
        });

        globalCharIndex++; // Increment global character counter
      });

      // Create word container with character children
      wordContainers.push({
        id: `word-${caption.id}-${wordIndex}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-flex',
            style: {
              marginRight: wordIndex < caption.words.length - 1 ? `${wordSpacing}px` : '0',
            },
          },
        },
        context: {
          timing: {
            start: word.start, // Relative to caption
            duration: caption.duration, // Match caption duration for persistence
          },
        },
        childrenData: characterComponents,
        effects: wordEffects, // Attach all character effects to word container
      } as RenderableComponentData);
    });

    // Determine vertical alignment class
    const verticalAlignClass =
      verticalPosition === 'top'
        ? 'items-start'
        : verticalPosition === 'bottom'
        ? 'items-end'
        : 'items-center';

    // Determine horizontal alignment class
    const horizontalAlignClass =
      horizontalAlign === 'left'
        ? 'justify-start'
        : horizontalAlign === 'right'
        ? 'justify-end'
        : 'justify-center';

    // Create caption container with words
    captionContainers.push({
      id: `caption-${caption.id}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex ${verticalAlignClass} ${horizontalAlignClass}`,
          style: {
            paddingLeft: `${containerPadding}px`,
            paddingRight: `${containerPadding}px`,
            contain: 'layout style paint', // Performance optimization
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart, // Absolute positioning in video timeline
          duration: caption.duration,
        },
      },
      childrenData: [
        {
          id: `words-wrapper-${caption.id}`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'inline-flex flex-wrap',
              style: {
                maxWidth: '90%',
                textAlign: horizontalAlign,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: wordContainers,
        } as RenderableComponentData,
      ],
    } as RenderableComponentData);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-stretch-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd : 10,
      },
    },
    childrenData: captionContainers as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'typewriter-stretch-reveal',
  title: 'Typewriter Stretch Reveal',
  description:
    'Vintage typewriter-style character reveal where each letter elastically stretches from extreme compression (scaleX: 0) to overshoot (scaleX: 2) before settling at final form (scaleX: 1). Creates a rhythmic typing cadence with mechanical bounce and spring-like release, featuring per-character sequencing with 50ms stagger delay and 400ms ease-out animation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'subtitles',
    'typewriter',
    'stretch',
    'reveal',
    'character',
    'kinetic',
    'mechanical',
    'vintage',
    'spring',
    'elastic',
    'bounce',
    'typography',
    'animation',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello World',
        start: 0,
        end: 2.5,
        duration: 2.5,
        absoluteStart: 0,
        absoluteEnd: 2.5,
        words: [
          {
            text: 'Hello',
            start: 0,
            end: 1.0,
            duration: 1.0,
            absoluteStart: 0,
            absoluteEnd: 1.0,
          },
          {
            text: 'World',
            start: 1.0,
            end: 2.5,
            duration: 1.5,
            absoluteStart: 1.0,
            absoluteEnd: 2.5,
          },
        ],
      },
    ],
    fontSize: 48,
    fontFamily: 'Inter:600',
    textColor: '#FFFFFF',
    characterStagger: 50,
    stretchDuration: 400,
    maxStretchScale: 2,
    bounceHeight: 2,
    wordSpacing: 8,
    containerPadding: 32,
    verticalPosition: 'center',
    horizontalAlign: 'center',
  },
};

// --- Export ---
export const typewriterStretchRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
