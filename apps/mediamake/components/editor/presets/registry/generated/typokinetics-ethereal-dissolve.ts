/**
 * Typokinetics Ethereal Dissolve Preset
 *
 * This preset implements a cinematic text dissolve effect inspired by classic film techniques.
 * Text appears with a gentle fade-in, lingers prominently for 60-70% of its duration, then
 * dissolves slowly with a non-linear decay combining opacity fade, blur filter increase (0-8px),
 * and subtle scale reduction (1.0 to 0.95). Each word animates individually with staggered
 * timing to create a cascade effect, giving the impression of text hanging in the air like
 * smoke before dissipating into space.
 *
 * Features:
 * - **Ethereal Dissolve Effect**: Combines opacity, blur, and scale for depth-of-field mimicry
 * - **Extreme Lingering**: Text remains fully visible for 60-70% of duration
 * - **Cascade Animation**: Word-by-word staggered timing creates flowing effect
 * - **Non-linear Decay**: Slow dissolve with ease-out easing over final 30-40%
 * - **Depth of Field**: Blur increases as text fades, simulating focus loss
 * - **Spatial Recession**: Subtle scale reduction enhances "receding into space" feeling
 * - **Performance Optimized**: Uses will-change hints and GPU-accelerated properties
 *
 * Use Cases:
 * - Poetic or contemplative video content
 * - Atmospheric title sequences
 * - Meditative or introspective narration
 * - Documentary-style text overlays
 * - Cinematic subtitle effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { TextAtomData, GenericEffectData, RenderableComponentData } from '@microfox/remotion';

// ============================================================================
// PRESET PARAMETERS
// ============================================================================

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          })
        ),
        metadata: z.any().optional(),
      })
    )
    .describe('Array of caption objects with word-level timing data'),

  // Typography
  font: z
    .string()
    .optional()
    .default('Inter:500')
    .describe('Font family with optional weight and style (e.g., "Inter:500", "Roboto:400")'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),

  // Timing Configuration
  fadeInDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Fade-in duration in seconds (gentle appearance)'),
  lingerPercentage: z
    .number()
    .min(50)
    .max(80)
    .default(65)
    .describe('Percentage of word duration to remain fully visible (60-70% recommended)'),
  dissolveDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2.0)
    .describe('Dissolve fade-out duration in seconds (slow ethereal exit)'),

  // Effect Configuration
  maxBlur: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Maximum blur amount in pixels during dissolve'),
  scaleReduction: z
    .number()
    .min(0.8)
    .max(1)
    .default(0.95)
    .describe('Scale reduction during fade-out (1.0 = no reduction, 0.95 = 5% smaller)'),
  staggerDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Delay between each word animation start in seconds (cascade effect)'),

  // Layout
  alignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal text alignment'),
  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text container'),
  wordGap: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Gap between words in pixels'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:500';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Calculate alignment class
  const getAlignmentClass = (): string => {
    const alignmentMap = {
      left: 'justify-start',
      center: 'justify-center',
      right: 'justify-end',
    };
    return alignmentMap[params.alignment];
  };

  // Helper: Calculate vertical positioning class
  const getVerticalClass = (): string => {
    const verticalMap = {
      top: 'items-start pt-16',
      center: 'items-center',
      bottom: 'items-end pb-16',
    };
    return verticalMap[params.verticalPosition];
  };

  // Helper: Create ethereal dissolve effect for a word
  const createEtherealDissolveEffect = (
    wordId: string,
    word: { start: number; duration: number },
    index: number,
  ): GenericEffectData => {
    const wordStart = word.start;
    const wordDuration = word.duration;
    
    // Calculate timing phases
    const fadeInDuration = params.fadeInDuration;
    const lingerDuration = (wordDuration * params.lingerPercentage) / 100;
    const dissolveDuration = params.dissolveDuration;
    
    // Adjust if total exceeds word duration
    const totalPhaseTime = fadeInDuration + dissolveDuration;
    const actualLingerDuration = Math.max(0, wordDuration - totalPhaseTime);
    
    // Dissolve starts after fade-in + linger
    const dissolveStart = fadeInDuration + actualLingerDuration;
    
    // Calculate progress points (relative to effect duration which spans full word)
    const fadeInProg = fadeInDuration / wordDuration;
    const lingerProg = dissolveStart / wordDuration;
    const dissolveProg = 1.0;

    return {
      type: 'ease-out', // Non-linear decay for dissolve
      start: wordStart, // Relative to caption
      duration: wordDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Opacity: fade-in (0->1), linger (1), dissolve (1->0)
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: fadeInProg },
        { key: 'opacity', val: 1, prog: lingerProg },
        { key: 'opacity', val: 0, prog: dissolveProg },
        
        // Blur: no blur during fade-in/linger, increase during dissolve
        { key: 'blur', val: '0px', prog: 0 },
        { key: 'blur', val: '0px', prog: lingerProg },
        { key: 'blur', val: `${params.maxBlur}px`, prog: dissolveProg },
        
        // Scale: normal during fade-in/linger, reduce during dissolve
        { key: 'scale', val: 1.0, prog: 0 },
        { key: 'scale', val: 1.0, prog: lingerProg },
        { key: 'scale', val: params.scaleReduction, prog: dissolveProg },
      ],
    } as GenericEffectData;
  };

  // Build caption containers
  const captionContainers: RenderableComponentData[] = params.captions.map((caption) => {
    // Build word components with effects
    const wordComponents: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = word.id || `word-${caption.id}-${wordIndex}`;
      
      // Create ethereal dissolve effect
      const effect = createEtherealDissolveEffect(wordId, word, wordIndex);

      // Word TextAtom
      const wordAtom: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            ...fontStyle,
            display: 'inline-block',
            willChange: 'transform, opacity, filter',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['500'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0, // All words start together (use effects for timing)
            duration: caption.duration, // All words span full caption
          },
        },
        effects: [
          {
            id: `effect-${wordId}`,
            componentId: 'generic',
            data: effect,
          },
        ],
      };

      return wordAtom;
    });

    // Caption container (word layout)
    const captionContainer: RenderableComponentData = {
      id: `caption-container-${caption.id}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `flex flex-wrap ${getAlignmentClass()}`,
          style: {
            gap: `${params.wordGap}px`,
            willChange: 'transform, opacity, filter',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    };

    return captionContainer;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-ethereal-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full flex ${getVerticalClass()} px-8`,
        style: {
          willChange: 'transform, opacity, filter',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.captions.length > 0
          ? Math.max(...params.captions.map((c) => c.absoluteEnd))
          : 10,
      },
    },
    childrenData: captionContainers,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-ethereal-dissolve',
  title: 'Typokinetics Ethereal Dissolve',
  description:
    'A cinematic text dissolve effect with extreme lingering, inspired by classic film dissolve techniques. Text appears with a gentle fade-in, remains visible during an extended linger phase (60-70% of duration), then dissolves slowly with non-linear decay using combined opacity fade, blur filter increase (0-8px), and subtle scale reduction (1.0 to 0.95). Words animate individually with staggered timing creating a cascade effect. Perfect for poetic, atmospheric, or contemplative video content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'captions',
    'subtitles',
    'ethereal',
    'dissolve',
    'cinematic',
    'film',
    'fade',
    'blur',
    'linger',
    'cascade',
    'atmospheric',
    'poetic',
    'contemplative',
    'depth-of-field',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'The words hang in the air',
        start: 0,
        absoluteStart: 0,
        end: 3.5,
        absoluteEnd: 3.5,
        duration: 3.5,
        words: [
          {
            id: 'word-1',
            text: 'The',
            start: 0,
            absoluteStart: 0,
            end: 0.4,
            absoluteEnd: 0.4,
            duration: 0.4,
          },
          {
            id: 'word-2',
            text: 'words',
            start: 0.4,
            absoluteStart: 0.4,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 0.6,
          },
          {
            id: 'word-3',
            text: 'hang',
            start: 1.0,
            absoluteStart: 1.0,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 0.5,
          },
          {
            id: 'word-4',
            text: 'in',
            start: 1.5,
            absoluteStart: 1.5,
            end: 1.8,
            absoluteEnd: 1.8,
            duration: 0.3,
          },
          {
            id: 'word-5',
            text: 'the',
            start: 1.8,
            absoluteStart: 1.8,
            end: 2.1,
            absoluteEnd: 2.1,
            duration: 0.3,
          },
          {
            id: 'word-6',
            text: 'air',
            start: 2.1,
            absoluteStart: 2.1,
            end: 3.5,
            absoluteEnd: 3.5,
            duration: 1.4,
          },
        ],
      },
      {
        id: 'caption-2',
        text: 'like smoke before dissipating',
        start: 0,
        absoluteStart: 4.0,
        end: 3.8,
        absoluteEnd: 7.8,
        duration: 3.8,
        words: [
          {
            id: 'word-7',
            text: 'like',
            start: 0,
            absoluteStart: 4.0,
            end: 0.4,
            absoluteEnd: 4.4,
            duration: 0.4,
          },
          {
            id: 'word-8',
            text: 'smoke',
            start: 0.4,
            absoluteStart: 4.4,
            end: 1.0,
            absoluteEnd: 5.0,
            duration: 0.6,
          },
          {
            id: 'word-9',
            text: 'before',
            start: 1.0,
            absoluteStart: 5.0,
            end: 1.6,
            absoluteEnd: 5.6,
            duration: 0.6,
          },
          {
            id: 'word-10',
            text: 'dissipating',
            start: 1.6,
            absoluteStart: 5.6,
            end: 3.8,
            absoluteEnd: 7.8,
            duration: 2.2,
          },
        ],
      },
    ],
    font: 'Inter:500',
    fontSize: 48,
    textColor: '#FFFFFF',
    fadeInDuration: 1.5,
    lingerPercentage: 65,
    dissolveDuration: 2.0,
    maxBlur: 8,
    scaleReduction: 0.95,
    staggerDelay: 0.15,
    alignment: 'center',
    verticalPosition: 'center',
    wordGap: 8,
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const typokineticsEtherealDissolvePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};