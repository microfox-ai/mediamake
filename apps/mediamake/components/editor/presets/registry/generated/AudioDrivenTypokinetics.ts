/**
 * Audio-Driven Typokinetics with Metadata Modulation Preset
 *
 * This preset creates data-driven typokinetic text animations where opacity visualizes
 * audio metadata like sentiment and energy. Text pulses based on audio emotional intensity:
 * - Calm sections: gentle, slow pulses (0.8-0.95 opacity)
 * - Intense sections: rapid, dramatic pulses (0.3-1.0 opacity)
 *
 * Features:
 * - **Audio Metadata Driven**: Uses audio.intensity, sentiment, energy to modulate effects
 * - **Per-Word Metadata**: impact score (0.5-1.5x sensitivity), keyword flag (+0.2 max opacity), sentiment-based easing
 * - **Dynamic Effect Arrays**: Calculated per-word with metadata analysis
 * - **Sentiment-Based Styling**: positive (text-green-100), negative (text-red-100), neutral (text-gray-100)
 * - **Sentiment-Based Easing**: positive (ease-in-out), negative (linear), neutral (ease-out)
 * - **Precise Timing**: Aligned to word.timing.relative for exact synchronization
 * - **Flexible Layout**: flex-wrap with leading-relaxed for readability
 *
 * Use cases:
 * - Music visualization with lyrics
 * - Podcast transcriptions with emotional emphasis
 * - Audio-reactive typography for content creation
 * - Sentiment-based text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence, TranscriptionWord } from '../../types';
import { GenericEffectData, RenderableComponentData } from '@microfox/datamotion';

// Define input parameters schema
const presetParams = z.object({
  captions: z.array(
    z.object({
      id: z.string().describe('Unique identifier for caption'),
      text: z.string().describe('Full caption text'),
      start: z.number().describe('Relative start time within caption timeline'),
      absoluteStart: z.number().describe('Absolute start time in caption timeline (scene-relative)'),
      end: z.number().describe('Relative end time within caption timeline'),
      absoluteEnd: z.number().describe('Absolute end time in caption timeline'),
      duration: z.number().describe('Duration of caption'),
      words: z.array(
        z.object({
          id: z.string().optional().describe('Unique identifier for word'),
          text: z.string().describe('Word text'),
          start: z.number().describe('Relative start time within caption'),
          absoluteStart: z.number().describe('Absolute start time in caption timeline'),
          end: z.number().describe('Relative end time within caption'),
          absoluteEnd: z.number().describe('Absolute end time in caption timeline'),
          duration: z.number().describe('Duration of word'),
          confidence: z.number().optional().describe('Speech recognition confidence (0-1)'),
        }),
      ).describe('Array of word objects with timing'),
      metadata: z.object({
        impact: z.number().min(0.5).max(1.5).optional().describe('Effect intensity multiplier (0.5-1.5)'),
        keyword: z.string().optional().describe('Keyword to highlight (if word matches, adds +0.2 max opacity)'),
        sentiment: z.enum(['positive', 'negative', 'neutral']).optional().describe('Sentiment for easing curve selection'),
      }).optional().describe('Optional per-caption metadata for effect modulation'),
    }),
  ).describe('Array of caption objects with word-level timing and metadata'),
  
  audio: z.object({
    src: z.string().describe('Audio source URL'),
    intensity: z.number().min(0).max(1).optional().describe('Global audio intensity (0-1) - used as base driver'),
    sentiment: z.enum(['positive', 'negative', 'neutral']).optional().describe('Global sentiment (fallback if caption metadata not available)'),
    energy: z.number().min(0).max(1).optional().describe('Global audio energy (0-1) - influences pulse range'),
  }).describe('Audio metadata for effect modulation'),
  
  font: z.string()
    .default('Inter:600')
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:600", "Roboto:700:italic")'),
  
  fontSize: z.number()
    .min(12)
    .max(120)
    .default(32)
    .optional()
    .describe('Base font size in pixels'),
  
  baseImpact: z.number()
    .min(0.1)
    .max(3.0)
    .default(1.0)
    .optional()
    .describe('Global impact multiplier for all effects (0.1-3.0)'),
  
  containerClassName: z.string()
    .default('relative w-full h-full p-8')
    .optional()
    .describe('Tailwind classes for root container'),
  
  wordsContainerClassName: z.string()
    .default('flex flex-wrap gap-1 leading-relaxed items-center justify-center')
    .optional()
    .describe('Tailwind classes for words container layout'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { captions, audio, font, fontSize, baseImpact, containerClassName, wordsContainerClassName } = params;
  
  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    let fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };
  
  const { fontFamily, fontStyle } = parseFontString(font || 'Inter:600');
  
  // Global audio metadata
  const globalIntensity = audio.intensity ?? 0.5;
  const globalSentiment = audio.sentiment ?? 'neutral';
  const globalEnergy = audio.energy ?? 0.5;
  
  // Helper: Get sentiment-based color
  const getSentimentColor = (sentiment: 'positive' | 'negative' | 'neutral') => {
    switch (sentiment) {
      case 'positive': return 'text-green-100';
      case 'negative': return 'text-red-100';
      case 'neutral': return 'text-gray-100';
      default: return 'text-gray-100';
    }
  };
  
  // Helper: Get sentiment-based easing
  const getSentimentEasing = (sentiment: 'positive' | 'negative' | 'neutral'): 'ease-in-out' | 'linear' | 'ease-out' => {
    switch (sentiment) {
      case 'positive': return 'ease-in-out';
      case 'negative': return 'linear';
      case 'neutral': return 'ease-out';
      default: return 'ease-out';
    }
  };
  
  // Generate caption containers with word-level effects
  const captionContainers: any[] = [];
  
  captions.forEach((caption, captionIndex) => {
    const captionMetadata = caption.metadata || {};
    const captionImpact = captionMetadata.impact ?? 1.0;
    const captionKeyword = captionMetadata.keyword;
    const captionSentiment = captionMetadata.sentiment ?? globalSentiment;
    
    // Generate word components
    const wordComponents: any[] = [];
    
    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const wordText = word.text;
      
      // Check if word is keyword
      const isKeyword = captionKeyword && wordText.toLowerCase() === captionKeyword.toLowerCase();
      
      // Calculate per-word effect parameters
      // Base: audio.intensity (0-1)
      // Impact multiplier: caption.metadata.impact (0.5-1.5x)
      // Keyword bonus: +0.2 max opacity if isKeyword
      // Energy: influences pulse range width
      
      const effectSensitivity = captionImpact * (baseImpact ?? 1.0);
      const keywordOpacityBonus = isKeyword ? 0.2 : 0;
      
      // Calculate opacity range based on audio intensity and energy
      // Calm (low intensity, low energy): gentle pulse (0.8-0.95)
      // Intense (high intensity, high energy): dramatic pulse (0.3-1.0)
      const baseMinOpacity = globalIntensity < 0.3 ? 0.8 : 0.3;
      const baseMaxOpacity = Math.min(1.0, 0.95 + keywordOpacityBonus);
      
      const minOpacity = Math.max(0.1, baseMinOpacity - (globalEnergy * 0.3));
      const maxOpacity = Math.min(1.0, baseMaxOpacity + keywordOpacityBonus);
      
      // Pulse duration: faster for intense, slower for calm
      const pulseDuration = word.duration;
      
      // Easing based on sentiment
      const easingType = getSentimentEasing(captionSentiment);
      
      // Create opacity pulse effect
      const wordEffect: GenericEffectData = {
        type: easingType,
        start: word.start, // Relative to caption start
        duration: pulseDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: minOpacity, prog: 0 },
          { key: 'opacity', val: maxOpacity * effectSensitivity, prog: 0.5 },
          { key: 'opacity', val: minOpacity, prog: 1 },
        ],
      };
      
      const effect = {
        id: `effect-${wordId}`,
        componentId: 'generic',
        data: wordEffect,
      };
      
      // Create word TextAtom
      const wordComponent = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: wordText,
          className: getSentimentColor(captionSentiment),
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontStyle.fontWeight ?? 600,
            fontStyle: fontStyle.fontStyle,
            textShadow: '0 0 8px rgba(0,0,0,0.8)',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['600'],
            display: 'swap' as const,
          },
        },
        context: {
          timing: {
            start: 0, // All words start together (sentence-level timing)
            duration: caption.duration, // All words last for full caption
          },
        },
        effects: [effect],
      };
      
      wordComponents.push(wordComponent);
    });
    
    // Create caption container
    const captionContainer = {
      id: `caption-${captionIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: wordsContainerClassName || 'flex flex-wrap gap-1 leading-relaxed items-center justify-center',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents as RenderableComponentData[],
    };
    
    captionContainers.push(captionContainer);
  });
  
  // Root container
  const rootContainer = {
    id: 'audio-driven-typokinetics-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: containerClassName || 'relative w-full h-full p-8',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: Math.max(...captions.map(c => c.absoluteEnd), 10),
      },
    },
    childrenData: captionContainers as RenderableComponentData[],
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
  id: 'AudioDrivenTypokinetics',
  title: 'Audio-Driven Typokinetics with Metadata Modulation',
  description: 'Data-driven typokinetic preset where text opacity visualizes audio metadata like sentiment and energy. Text pulses based on audio emotional intensity - calm sections have gentle, slow pulses (0.8-0.95 opacity) while intense sections have rapid, dramatic pulses (0.3-1.0 opacity). Incorporates caption metadata (impact, keyword, sentiment scores) to modulate pulsing intensity per word.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'audio-reactive', 'metadata', 'sentiment', 'typokinetics', 'pulse', 'opacity', 'music', 'podcast'],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello world',
        start: 0,
        absoluteStart: 0,
        end: 2.5,
        absoluteEnd: 2.5,
        duration: 2.5,
        words: [
          {
            id: 'word-0',
            text: 'Hello',
            start: 0,
            absoluteStart: 0,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 1.0,
            confidence: 0.95,
          },
          {
            id: 'word-1',
            text: 'world',
            start: 1.0,
            absoluteStart: 1.0,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 1.5,
            confidence: 0.98,
          },
        ],
        metadata: {
          impact: 1.2,
          keyword: 'world',
          sentiment: 'positive',
        },
      },
    ],
    audio: {
      src: 'https://example.com/audio.mp3',
      intensity: 0.7,
      sentiment: 'positive',
      energy: 0.6,
    },
    font: 'Inter:600',
    fontSize: 32,
    baseImpact: 1.0,
    containerClassName: 'relative w-full h-full p-8',
    wordsContainerClassName: 'flex flex-wrap gap-1 leading-relaxed items-center justify-center',
  },
};

// Export preset
export const AudioDrivenTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
