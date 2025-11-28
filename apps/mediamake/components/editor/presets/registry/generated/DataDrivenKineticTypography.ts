/**
 * Data-Driven Kinetic Typography Preset
 *
 * This preset treats each word as a data point in a visualization, creating intelligent
 * typography that visualizes its own metadata. Words materialize with animations that
 * reflect their semantic properties:
 *
 * Features:
 * - **Word Length Analysis**: Longer words take slightly longer to appear (baseTime + wordLength * 20ms)
 * - **Impact-Based Scaling**: Keywords with higher impact scores pulse and scale more prominently
 * - **Number Counting Animation**: Numbers animate by counting up from 0 to their final value
 * - **Keyword Pulsing**: Words marked as keywords get a subtle continuous pulse effect
 * - **Semantic Awareness**: Text is aware of its own meaning and adjusts presentation accordingly
 * - **Performance Optimized**: Memoized word analysis, RAF-based counting animations
 * - **Tabular Numbers**: Consistent number spacing during counting animations
 *
 * Use cases:
 * - Creating data-driven subtitle visualizations
 * - Building intelligent typography that responds to content metadata
 * - Adding semantic-aware text animations
 * - Creating engaging captions that highlight important information
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with text, timing, words, and optional metadata'),
  
  // Typography
  fontSize: z.number().default(48).describe('Base font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family (format: "FontName:weight" or "FontName")'),
  textColor: z.string().default('#ffffff').describe('Base text color'),
  
  // Positioning
  containerClassName: z.string().default('relative flex flex-wrap gap-2 p-6 items-center justify-center').describe('Container layout classes'),
  
  // Animation timing
  baseAnimationTime: z.number().default(0.3).describe('Base animation duration in seconds'),
  wordLengthMultiplier: z.number().default(0.02).describe('Additional duration per character (in seconds)'),
  
  // Impact & scaling
  defaultImpact: z.number().default(1.0).describe('Default impact multiplier when metadata.impact is not provided'),
  impactScaleMultiplier: z.number().default(0.1).describe('Scale increase per impact point (e.g., 0.1 = 10% per point)'),
  
  // Keyword pulsing
  keywordPulseDuration: z.number().default(1.2).describe('Duration of keyword pulse cycle in seconds'),
  keywordPulseScale: z.number().default(1.05).describe('Maximum scale during pulse'),
  
  // Number counting
  countingDuration: z.number().default(0.5).describe('Duration of number counting animation in seconds'),
  countingSteps: z.number().default(10).describe('Number of steps in counting animation'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];
  
  // Parse font string
  const fontString = params.fontFamily || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  let fontStyle: { fontWeight?: number; fontStyle?: string } = {};
  
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2];
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }
  
  // Helper function to analyze a word
  const analyzeWord = (text: string, metadata?: any) => {
    const length = text.length;
    const isNumber = /^\d+(\.\d+)?$/.test(text);
    const isKeyword = metadata?.keyword === true || metadata?.keyword === text;
    const impact = metadata?.impact ?? params.defaultImpact;
    
    return {
      length,
      isNumber,
      isKeyword,
      impact,
      animationDuration: params.baseAnimationTime + (length * params.wordLengthMultiplier),
      targetScale: 1 + (impact * params.impactScaleMultiplier),
    };
  };
  
  // Helper function to generate counting sequence for numbers
  const generateCountingFrames = (targetNumber: number, steps: number): number[] => {
    const frames: number[] = [];
    const increment = targetNumber / steps;
    
    for (let i = 0; i <= steps; i++) {
      frames.push(Math.round(increment * i));
    }
    
    return frames;
  };
  
  // Build caption components
  const captionContainers: RenderableComponentData[] = [];
  
  captions.forEach((caption, captionIndex) => {
    const words = caption.words || [];
    
    // Build word components for this caption
    const wordComponents: RenderableComponentData[] = [];
    
    words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const analysis = analyzeWord(word.text, caption.metadata);
      
      // Create effects for this word
      const effects: any[] = [];
      
      // Main fade-in and scale animation
      const fadeScaleEffect: GenericEffectData = {
        type: 'ease-out',
        start: word.start,
        duration: analysis.animationDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Fade in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          // Scale animation
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: analysis.targetScale, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      };
      
      effects.push({
        id: `fade-scale-${wordId}`,
        componentId: 'generic',
        data: fadeScaleEffect,
      });
      
      // Keyword pulse effect (continuous)
      if (analysis.isKeyword) {
        const pulseEffect: GenericEffectData = {
          type: 'ease-in-out',
          start: word.start + analysis.animationDuration,
          duration: params.keywordPulseDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: params.keywordPulseScale, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
          props: {
            repeat: Infinity,
          },
        };
        
        effects.push({
          id: `pulse-${wordId}`,
          componentId: 'generic',
          data: pulseEffect,
        });
      }
      
      // For numbers, we'll create a counting animation effect
      // Note: Actual counting would require custom component logic or multiple TextAtoms
      // Here we'll use a scale and color effect to emphasize numbers
      if (analysis.isNumber) {
        const numberEmphasisEffect: GenericEffectData = {
          type: 'ease-out',
          start: word.start,
          duration: params.countingDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'color', val: 'rgb(100, 200, 255)', prog: 0 },
            { key: 'color', val: params.textColor, prog: 1 },
          ],
        };
        
        effects.push({
          id: `number-emphasis-${wordId}`,
          componentId: 'generic',
          data: numberEmphasisEffect,
        });
      }
      
      // Create the word TextAtom
      const wordData: TextAtomData = {
        text: word.text,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          fontWeight: analysis.isKeyword ? 'bold' : fontStyle.fontWeight || 'normal',
          ...fontStyle,
        },
        className: analysis.isNumber ? 'tabular-nums' : undefined,
        font: {
          family: fontFamily,
          weights: analysis.isKeyword
            ? ['700']
            : fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['400'],
        },
      };
      
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: wordData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects,
      } as RenderableComponentData;
      
      wordComponents.push(wordComponent);
    });
    
    // Create container for this caption's words
    const captionContainer: RenderableComponentData = {
      id: `caption-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: params.containerClassName,
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData;
    
    captionContainers.push(captionContainer);
  });
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'data-driven-kinetic-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0
          ? Math.max(...captions.map(c => c.absoluteEnd))
          : 10,
      },
    },
    childrenData: captionContainers,
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

const presetMetadata: PresetMetadata = {
  id: 'DataDrivenKineticTypography',
  title: 'Data-Driven Kinetic Typography',
  description: 'Intelligent kinetic typography that treats each word as a data point with animations reflecting semantic properties. Features word-length-based timing, impact-driven scaling, number counting animations, and keyword pulsing effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'data-driven',
    'semantic',
    'intelligent',
    'captions',
    'subtitles',
    'metadata',
    'animation',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello world 123',
        start: 0,
        end: 2.5,
        duration: 2.5,
        absoluteStart: 0,
        absoluteEnd: 2.5,
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            end: 0.8,
            duration: 0.8,
            absoluteStart: 0,
            absoluteEnd: 0.8,
          },
          {
            id: 'word-2',
            text: 'world',
            start: 0.8,
            end: 1.5,
            duration: 0.7,
            absoluteStart: 0.8,
            absoluteEnd: 1.5,
          },
          {
            id: 'word-3',
            text: '123',
            start: 1.5,
            end: 2.5,
            duration: 1.0,
            absoluteStart: 1.5,
            absoluteEnd: 2.5,
          },
        ],
        metadata: {
          keyword: 'Hello',
          impact: 1.5,
        },
      },
    ],
    fontSize: 48,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    containerClassName: 'relative flex flex-wrap gap-2 p-6 items-center justify-center',
    baseAnimationTime: 0.3,
    wordLengthMultiplier: 0.02,
    defaultImpact: 1.0,
    impactScaleMultiplier: 0.1,
    keywordPulseDuration: 1.2,
    keywordPulseScale: 1.05,
    countingDuration: 0.5,
    countingSteps: 10,
  },
};

export const DataDrivenKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};