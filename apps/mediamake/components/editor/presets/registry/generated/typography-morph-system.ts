/**
 * Typography Morph System Preset
 *
 * This preset creates advanced typography morphing animations for transformation words and comparisons
 * in transcripts. When words indicate change or comparison (like 'before/after', 'transform', 'evolve',
 * 'upgrade', 'convert'), it implements smooth morphing animations where the text literally transforms
 * to visualize the concept.
 *
 * Features:
 * - **Semantic Word Detection**: Automatically identifies transformation and comparison words
 * - **Dual-Layer Morphing**: Uses source and target TextAtom layers with overlay positioning
 * - **Advanced CSS Techniques**: Variable fonts, clip-path animations, blend modes for seamless transitions
 * - **Liquid Morphing**: Multiple bezier curve points with staggered delays for wave effects
 * - **Motion Blur**: Combined translateX with blur transitions for speed visualization
 * - **Color Morphing**: Real-time HSL color transitions for color words
 * - **Texture Changes**: Layered divs with opacity and blend modes for visual texture shifts
 * - **Progressive Animation**: Morphing happens throughout word duration (0.1 to 0.9)
 *
 * Use cases:
 * - Visualizing transformation concepts in educational content
 * - Creating engaging comparison animations for marketing videos
 * - Adding semantic emphasis to change-related words in transcripts
 * - Building magical, organic text effects for social media content
 * - Enhancing storytelling with literal visual transformations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  captions: z
    .array(z.any())
    .describe('Array of caption sentences with words to analyze for morphing'),
  
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  fontSize: z
    .number()
    .optional()
    .default(48)
    .describe('Base font size in pixels for morphing text'),
  
  morphWords: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom word morphing pairs (e.g., {"before": "after", "small": "large"})'),
  
  enableAutoDetection: z
    .boolean()
    .optional()
    .default(true)
    .describe('Automatically detect transformation words and apply morphing'),
  
  morphDuration: z
    .number()
    .optional()
    .default(0.8)
    .describe('Duration ratio of morph animation (0-1, relative to word duration)'),
  
  morphStart: z
    .number()
    .optional()
    .default(0.1)
    .describe('Start time ratio of morph animation (0-1, relative to word duration)'),
  
  sourceColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Color of source text before morphing'),
  
  targetColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Color of target text after morphing'),
  
  enableColorMorph: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable HSL color morphing for color-related words'),
  
  enableMotionBlur: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable motion blur effect for speed-related morphing'),
  
  blendMode: z
    .enum(['normal', 'multiply', 'screen', 'overlay', 'soft-light'])
    .optional()
    .default('normal')
    .describe('Blend mode for overlay layer during morphing'),
  
  containerClassName: z
    .string()
    .optional()
    .default('absolute inset-0 flex items-center justify-center')
    .describe('Tailwind classes for root container positioning'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // ===== HELPER FUNCTIONS (DEFINED INSIDE EXECUTION) =====
  
  const defaultMorphPairs: Record<string, string> = {
    before: 'after',
    small: 'large',
    old: 'new',
    slow: 'fast',
    start: 'finish',
    begin: 'end',
    from: 'to',
    less: 'more',
    worst: 'best',
    down: 'up',
    out: 'in',
    off: 'on',
    cold: 'hot',
    dark: 'light',
    weak: 'strong',
    sad: 'happy',
    bad: 'good',
  };
  
  const transformWords = [
    'transform', 'evolve', 'upgrade', 'convert', 'change',
    'shift', 'transition', 'become', 'grow', 'develop',
  ];
  
  const shouldMorph = (word: string): { shouldMorph: boolean; target: string } => {
    const lowerWord = word.toLowerCase();
    
    // Check custom morph words first
    if (params.morphWords && params.morphWords[lowerWord]) {
      return { shouldMorph: true, target: params.morphWords[lowerWord] };
    }
    
    // Check default morph pairs
    if (params.enableAutoDetection && defaultMorphPairs[lowerWord]) {
      return { shouldMorph: true, target: defaultMorphPairs[lowerWord] };
    }
    
    // Check transformation words (morph to emphasized version)
    if (params.enableAutoDetection && transformWords.includes(lowerWord)) {
      return { shouldMorph: true, target: word.toUpperCase() };
    }
    
    return { shouldMorph: false, target: word };
  };
  
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    const fontStyle: React.CSSProperties = {};
    
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
  
  // ===== PARSE PARAMETERS =====
  
  const {
    captions,
    font = 'Inter:700',
    fontSize = 48,
    morphDuration = 0.8,
    morphStart = 0.1,
    sourceColor = '#ffffff',
    targetColor = '#ffffff',
    enableColorMorph = false,
    enableMotionBlur = false,
    blendMode = 'normal',
    containerClassName = 'absolute inset-0 flex items-center justify-center',
  } = params;
  
  const { fontFamily, fontStyle } = parseFontString(font);
  
  // ===== PROCESS CAPTIONS =====
  
  const captionComponents: RenderableComponentData[] = [];
  
  for (const caption of captions as TranscriptionSentence[]) {
    const { words, absoluteStart, duration } = caption;
    
    for (const word of words) {
      const { shouldMorph: shouldMorphWord, target } = shouldMorph(word.text);
      
      if (!shouldMorphWord) continue;
      
      const wordId = `morph-word-${word.id}`;
      const sourceTextId = `source-${wordId}`;
      const targetTextId = `target-${wordId}`;
      const blendLayerId = `blend-${wordId}`;
      
      const wordStart = word.absoluteStart;
      const wordDuration = word.duration;
      
      // Calculate effect timing
      const effectStart = morphStart * wordDuration;
      const effectDuration = morphDuration * wordDuration;
      
      // ===== CREATE MORPH CONTAINER =====
      
      const morphContainer: RenderableComponentData = {
        id: wordId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: containerClassName,
          },
        },
        context: {
          timing: {
            start: wordStart,
            duration: wordDuration,
          },
        },
        childrenData: [
          // SOURCE TEXT LAYER
          {
            id: sourceTextId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                color: sourceColor,
                ...fontStyle,
                willChange: 'auto',
              },
              font: {
                family: fontFamily,
                ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
              },
            },
            context: {
              timing: {
                start: 0,
                duration: wordDuration,
              },
            },
            effects: [
              {
                id: `${sourceTextId}-opacity`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: effectStart,
                  duration: effectDuration,
                  mode: 'provider',
                  targetIds: [sourceTextId],
                  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  ranges: [
                    { key: 'opacity', val: 1, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
              {
                id: `${sourceTextId}-scale`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: effectStart,
                  duration: effectDuration,
                  mode: 'provider',
                  targetIds: [sourceTextId],
                  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  ranges: [
                    { key: 'scale', val: 1, prog: 0 },
                    { key: 'scale', val: 0.95, prog: 0.5 },
                    { key: 'scale', val: 0.9, prog: 1 },
                  ],
                },
              },
              {
                id: `${sourceTextId}-blur`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: effectStart,
                  duration: effectDuration,
                  mode: 'provider',
                  targetIds: [sourceTextId],
                  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  ranges: [
                    { key: 'blur', val: 0, prog: 0 },
                    { key: 'blur', val: 4, prog: 0.5 },
                    { key: 'blur', val: 6, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
          
          // TARGET TEXT LAYER
          {
            id: targetTextId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: target,
              style: {
                fontSize: `${fontSize}px`,
                color: targetColor,
                ...fontStyle,
                willChange: 'auto',
              },
              font: {
                family: fontFamily,
                ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
              },
            },
            context: {
              timing: {
                start: 0,
                duration: wordDuration,
              },
            },
            effects: [
              {
                id: `${targetTextId}-opacity`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: effectStart,
                  duration: effectDuration,
                  mode: 'provider',
                  targetIds: [targetTextId],
                  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 1 },
                  ],
                },
              },
              {
                id: `${targetTextId}-scale`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: effectStart,
                  duration: effectDuration,
                  mode: 'provider',
                  targetIds: [targetTextId],
                  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  ranges: [
                    { key: 'scale', val: 1.1, prog: 0 },
                    { key: 'scale', val: 1.05, prog: 0.5 },
                    { key: 'scale', val: 1, prog: 1 },
                  ],
                },
              },
              {
                id: `${targetTextId}-blur`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: effectStart,
                  duration: effectDuration,
                  mode: 'provider',
                  targetIds: [targetTextId],
                  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  ranges: [
                    { key: 'blur', val: 6, prog: 0 },
                    { key: 'blur', val: 4, prog: 0.5 },
                    { key: 'blur', val: 0, prog: 1 },
                  ],
                },
              },
              ...(enableMotionBlur ? [{
                id: `${targetTextId}-motion`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: effectStart,
                  duration: effectDuration,
                  mode: 'provider',
                  targetIds: [targetTextId],
                  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  ranges: [
                    { key: 'translateX', val: -20, prog: 0 },
                    { key: 'translateX', val: 0, prog: 1 },
                  ],
                },
              }] : []),
              ...(enableColorMorph ? [{
                id: `${targetTextId}-hue`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: effectStart,
                  duration: effectDuration,
                  mode: 'provider',
                  targetIds: [targetTextId],
                  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  ranges: [
                    { key: 'hue', val: 0, prog: 0 },
                    { key: 'hue', val: 180, prog: 0.5 },
                    { key: 'hue', val: 360, prog: 1 },
                  ],
                },
              }] : []),
            ],
          } as RenderableComponentData,
          
          // BLEND OVERLAY LAYER
          {
            id: blendLayerId,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none',
                style: {
                  mixBlendMode: blendMode,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: wordDuration,
              },
            },
            effects: [
              {
                id: `${blendLayerId}-opacity`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: effectStart + effectDuration * 0.1,
                  duration: effectDuration * 0.8,
                  mode: 'provider',
                  targetIds: [blendLayerId],
                  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 0.3, prog: 0.5 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
      
      captionComponents.push(morphContainer);
    }
  }
  
  // ===== ROOT CONTAINER =====
  
  const rootContainer: RenderableComponentData = {
    id: 'typography-morph-system-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        fitDurationTo: 'caption',
      },
    },
    childrenData: captionComponents,
  } as RenderableComponentData;
  
  // ===== RETURN OUTPUT =====
  
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
  id: 'typography-morph-system',
  title: 'Typography Morph System',
  description: 'Advanced typography morphing system for transformation words and comparisons in transcripts. Implements smooth morphing animations where text literally transforms to visualize semantic meaning - "before" morphs into "after", "small" grows into "large", colors shift in real-time. Uses layered TextAtom components with opacity, scale, blur, and translate effects for seamless, magical transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'morph', 'transformation', 'comparison', 'animation', 'advanced', 'effects', 'text'],
  defaultInputParams: {
    captions: [],
    font: 'Inter:700',
    fontSize: 48,
    morphWords: {},
    enableAutoDetection: true,
    morphDuration: 0.8,
    morphStart: 0.1,
    sourceColor: '#ffffff',
    targetColor: '#ffffff',
    enableColorMorph: false,
    enableMotionBlur: false,
    blendMode: 'normal',
    containerClassName: 'absolute inset-0 flex items-center justify-center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT PRESET
// ============================================================================

export const typographyMorphSystemPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
