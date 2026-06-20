/**
 * Data Typewriter - Minimal Typographic Visualization Preset
 *
 * This preset treats text as data visualization with a minimal, purposeful aesthetic.
 * Words cascade left-to-right with a smooth clip-path reveal combined with translateX,
 * creating a modern typewriter effect that feels like watching real-time dashboard data rendering.
 *
 * Features:
 * - **Clip-path Reveal Animation**: Words reveal with polygon(0% → 100%) clip-path progression
 * - **Smooth Entry Motion**: Combined translateX movement (-20px → 0) for fluid appearance
 * - **Multi-line Support**: Each line animates independently with visual cohesion
 * - **Musical Timing**: Natural pauses at commas (100ms) and periods (200ms) for rhythm
 * - **Technical Typography**: Choose between font-mono or font-sans tracking-tight
 * - **Efficient Performance**: Separate layers for transform and clip-path for optimal compositing
 * - **Data-driven Layout**: CSS Grid structure with automatic line breaking based on word count
 *
 * Use cases:
 * - Technical presentation captions with data visualization aesthetic
 * - Dashboard-style text reveals for tech content
 * - Modern minimal typography for clean, informative videos
 * - Code/terminal-inspired text animations
 * - Real-time data rendering visual metaphors
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
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
          }),
        ),
      }),
    )
    .describe('Array of caption sentences with word-level timing data'),
  
  fontSize: z
    .number()
    .min(12)
    .max(120)
    .default(24)
    .describe('Font size in pixels for text rendering'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex, rgb, or named color)'),
  
  fontStyle: z
    .enum(['mono', 'sans'])
    .default('mono')
    .describe('Font style: mono for technical feel, sans for modern look'),
  
  wordsPerLine: z
    .number()
    .min(1)
    .max(20)
    .default(6)
    .describe('Maximum number of words per line for line breaking'),
  
  lineGap: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Gap between lines in pixels'),
  
  wordGap: z
    .number()
    .min(0)
    .max(30)
    .default(8)
    .describe('Gap between words in pixels'),
  
  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(24)
    .describe('Padding around the text container in pixels'),
  
  effectDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.4)
    .describe('Duration of clip-path reveal animation per word in seconds'),
  
  translateDistance: z
    .number()
    .min(-100)
    .max(0)
    .default(-20)
    .describe('Starting translateX distance for entry animation (negative values)'),
  
  commaDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Additional delay after comma punctuation in seconds'),
  
  periodDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Additional delay after period punctuation in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to detect punctuation and calculate delay
  const getPunctuationDelay = (text: string): number => {
    const trimmed = text.trim();
    if (trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('?')) {
      return params.periodDelay;
    }
    if (trimmed.endsWith(',') || trimmed.endsWith(';')) {
      return params.commaDelay;
    }
    return 0;
  };

  // Helper function to break words into lines
  const breakIntoLines = (words: any[]): any[][] => {
    const lines: any[][] = [];
    let currentLine: any[] = [];
    
    words.forEach((word, index) => {
      currentLine.push(word);
      
      // Break line if reached wordsPerLine or if word ends with period
      if (
        currentLine.length >= params.wordsPerLine ||
        getPunctuationDelay(word.text) === params.periodDelay
      ) {
        lines.push([...currentLine]);
        currentLine = [];
      }
    });
    
    // Add remaining words as final line
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    
    return lines;
  };

  // Build child structure
  const captionContainers: RenderableComponentData[] = [];
  
  params.captions.forEach((caption, captionIndex) => {
    // Break caption words into lines
    const lines = breakIntoLines(caption.words);
    
    // Create line containers
    const lineContainers: RenderableComponentData[] = [];
    let cumulativeDelay = 0;
    
    lines.forEach((lineWords, lineIndex) => {
      const wordComponents: RenderableComponentData[] = [];
      
      lineWords.forEach((word, wordIndex) => {
        const wordId = `word-${captionIndex}-${lineIndex}-${wordIndex}`;
        
        // Calculate effect start time with cumulative delays
        const effectStart = word.start + cumulativeDelay;
        
        // Create clip-path + translateX effect
        const wordEffect: GenericEffectData = {
          type: 'ease-out',
          start: effectStart,
          duration: params.effectDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Clip-path reveal
            { key: 'clipPath', val: 'polygon(0 0, 0% 0, 0% 100%, 0 100%)', prog: 0 },
            { key: 'clipPath', val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', prog: 1 },
            // TranslateX entry
            { key: 'translateX', val: params.translateDistance, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        };
        
        // Add punctuation delay for next word
        const punctuationDelay = getPunctuationDelay(word.text);
        cumulativeDelay += punctuationDelay;
        
        // Create word component
        const wordComponent: RenderableComponentData = {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: `${params.fontSize}px`,
              color: params.textColor,
            },
            className: params.fontStyle === 'mono' ? 'font-mono' : 'font-sans tracking-tight',
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: [
            {
              id: `effect-${wordId}`,
              componentId: 'generic',
              data: wordEffect,
            },
          ],
        };
        
        wordComponents.push(wordComponent);
      });
      
      // Create line container
      const lineId = `line-${captionIndex}-${lineIndex}`;
      const lineContainer: RenderableComponentData = {
        id: lineId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'overflow-hidden relative flex flex-row flex-wrap',
            style: {
              gap: `${params.wordGap}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: wordComponents,
      };
      
      lineContainers.push(lineContainer);
    });
    
    // Create caption container
    const captionId = `caption-${captionIndex}`;
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'grid grid-cols-1',
          style: {
            gap: `${params.lineGap}px`,
            padding: `${params.containerPadding}px`,
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: lineContainers,
    };
    
    captionContainers.push(captionContainer);
  });

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'data-typewriter-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    childrenData: captionContainers,
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'data-typewriter-preset',
  title: 'Data Typewriter - Minimal Typographic Visualization',
  description:
    'Minimal typographic preset treating text as data visualization. Words cascade left-to-right with clip-path reveal mimicking real-time dashboard rendering. Multi-line support with independent line animations, musical timing with natural pauses at punctuation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'captions', 'minimal', 'data-viz', 'typewriter', 'clean', 'dashboard'],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Data visualization, but for words.',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          { id: 'w1', text: 'Data', start: 0, absoluteStart: 0, end: 0.5, absoluteEnd: 0.5, duration: 0.5, confidence: 1 },
          { id: 'w2', text: 'visualization,', start: 0.5, absoluteStart: 0.5, end: 1.3, absoluteEnd: 1.3, duration: 0.8, confidence: 1 },
          { id: 'w3', text: 'but', start: 1.3, absoluteStart: 1.3, end: 1.6, absoluteEnd: 1.6, duration: 0.3, confidence: 1 },
          { id: 'w4', text: 'for', start: 1.6, absoluteStart: 1.6, end: 1.9, absoluteEnd: 1.9, duration: 0.3, confidence: 1 },
          { id: 'w5', text: 'words.', start: 1.9, absoluteStart: 1.9, end: 3, absoluteEnd: 3, duration: 1.1, confidence: 1 },
        ],
      },
    ],
    fontSize: 24,
    textColor: '#ffffff',
    fontStyle: 'mono',
    wordsPerLine: 6,
    lineGap: 8,
    wordGap: 8,
    containerPadding: 24,
    effectDuration: 0.4,
    translateDistance: -20,
    commaDelay: 0.1,
    periodDelay: 0.2,
  },
};

// Export preset
export const dataTypewriterPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
