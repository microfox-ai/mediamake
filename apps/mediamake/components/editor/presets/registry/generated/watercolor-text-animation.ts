/**
 * Watercolor Text Animation Preset
 *
 * This preset creates a watercolor paint-spreading text animation that mimics the organic flow
 * of watercolor paint on wet paper. Each word appears as if painted with a soft brush, starting
 * from a small point and expanding outward with irregular, fluid edges.
 *
 * Features:
 * - Organic watercolor paint spreading effect with soft brush appearance
 * - Individual word animations with irregular, fluid edges
 * - Subtle breathing animation where watercolor 'bleeds' expand and contract
 * - Opacity transitions and scale transforms to simulate water absorption
 * - Letters float upward slightly as they settle (like paint lifting before drying)
 * - Subtle color variations within each word with soft pastel gradients
 * - Dreamy, weightless motion with varied float patterns per word
 * - Multiple overlapping text shadows for watercolor depth
 * - CSS filters for soft edges (blur, contrast, brightness)
 * - Staggered timing for natural, non-mechanical repetition
 *
 * Technical Implementation:
 * - BaseLayout with relative positioning for container
 * - Individual TextAtom per word with absolute positioning
 * - Multiple text shadows with varying blur radius and opacity
 * - CSS filters: blur transition from 0.5px to 0px, contrast(0.8), brightness(1.1)
 * - Generic keyframe effects: opacity 0→1 (800ms), scale 0.7→1.05→1 (1200ms)
 * - Continuous floating animation: translateY 0→-5px→0 (3000ms loop)
 * - Transform-origin: center bottom for natural growth
 * - Performance optimizations: will-change, mix-blend-multiply
 * - 150ms stagger between words
 *
 * Use cases:
 * - Creating dreamy, artistic text reveals
 * - Adding organic, hand-painted text effects
 * - Building poetic or emotional content
 * - Creating watercolor-themed title sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display with watercolor effect (words will be split automatically)'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Quicksand')
    .describe('Font family (Google Font name)'),
  fontWeight: z
    .string()
    .default('600')
    .describe('Font weight (e.g., "400", "600", "700")'),
  colorGradient1: z
    .string()
    .default('linear-gradient(135deg, #FFB6C1 0%, #DDA0DD 50%, #B0E0E6 100%)')
    .describe('CSS gradient for first word (soft pastels)'),
  colorGradient2: z
    .string()
    .default('linear-gradient(135deg, #DDA0DD 0%, #B0E0E6 50%, #FFE4E1 100%)')
    .describe('CSS gradient for second word (soft pastels)'),
  colorGradient3: z
    .string()
    .default('linear-gradient(135deg, #B0E0E6 0%, #FFE4E1 50%, #FFB6C1 100%)')
    .describe('CSS gradient for third word (soft pastels)'),
  wordSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(16)
    .describe('Gap between words in pixels'),
  initialBlur: z
    .number()
    .min(0)
    .max(5)
    .default(0.5)
    .describe('Initial blur in pixels (transitions to 0)'),
  fadeInDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.8)
    .describe('Fade-in duration in seconds'),
  scaleDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Scale animation duration in seconds'),
  floatDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Continuous floating animation duration in seconds (loops)'),
  floatDistance: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Vertical float distance in pixels'),
  staggerDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Stagger delay between words in seconds'),
  totalDuration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total duration for the animation in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Split text into words
  const words = params.text.trim().split(/\s+/);
  
  // Color gradients array (cycle through if more words than gradients)
  const gradients = [
    params.colorGradient1,
    params.colorGradient2,
    params.colorGradient3,
  ];

  // Create word components
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `word-${index}`;
    const wordWrapperId = `word-wrapper-${index}`;
    const gradient = gradients[index % gradients.length];
    
    // Calculate staggered start time for this word
    const wordStart = index * params.staggerDelay;
    
    // Vary float duration slightly per word for non-mechanical repetition
    const floatDurationVariation = params.floatDuration + (index * 0.2);
    
    // Vary float distance slightly per word
    const floatDistanceVariation = params.floatDistance + (index * 0.5);

    // Generate text shadows for watercolor depth effect
    const textShadow = [
      `0 0 4px ${gradient.match(/#[0-9A-Fa-f]{6}/)?.[0] || '#FFB6C1'}33`,
      `0 0 8px ${gradient.match(/#[0-9A-Fa-f]{6}/)?.[0] || '#DDA0DD'}22`,
      `0 0 12px ${gradient.match(/#[0-9A-Fa-f]{6}/)?.[0] || '#B0E0E6'}11`,
    ].join(', ');

    // Create effects for this word
    const wordEffects: any[] = [
      // Initial fade-in and blur transition (watercolor spreading)
      {
        id: `fade-blur-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: params.fadeInDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'blur', val: `${params.initialBlur}px`, prog: 0 },
            { key: 'blur', val: '0px', prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Scale animation (watercolor expansion: small→overshoot→settle)
      {
        id: `scale-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: params.scaleDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: 0.7, prog: 0 },
            { key: 'scale', val: 1.05, prog: 0.7 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Continuous floating animation (breathing/lifting effect)
      {
        id: `float-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: params.scaleDuration,
          duration: floatDurationVariation,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: `-${floatDistanceVariation}px`, prog: 0.5 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Looping floating animation (continues after initial)
      {
        id: `float-loop-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: params.scaleDuration + floatDurationVariation,
          duration: floatDurationVariation,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: `-${floatDistanceVariation}px`, prog: 0.5 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        } as GenericEffectData,
      },
    ];

    // Word wrapper with staggered timing
    const wordWrapper: RenderableComponentData = {
      id: wordWrapperId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative select-none pointer-events-none',
          style: {
            transformOrigin: 'center bottom',
            willChange: 'transform, opacity',
          },
        },
      },
      context: {
        timing: {
          start: wordStart,
          duration: params.totalDuration,
        },
      },
      childrenData: [
        {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word,
            style: {
              fontSize: `${params.fontSize}px`,
              fontWeight: params.fontWeight,
              background: gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: textShadow,
              filter: `contrast(0.8) brightness(1.1)`,
            },
            font: {
              family: params.fontFamily,
              weights: [params.fontWeight],
              display: 'swap',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.totalDuration,
            },
          },
          effects: wordEffects,
        } as RenderableComponentData,
      ],
    };

    return wordWrapper;
  });

  // Words container with flex layout
  const wordsContainer: RenderableComponentData = {
    id: 'words-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-wrap items-center justify-center',
        style: {
          gap: `${params.wordSpacing}px`,
          mixBlendMode: 'multiply',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration + (words.length * params.staggerDelay),
      },
    },
    childrenData: wordComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'watercolor-text-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration + (words.length * params.staggerDelay),
      },
    },
    childrenData: [wordsContainer],
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
  id: 'watercolor-text-animation',
  title: 'Watercolor Text Animation',
  description:
    'Organic watercolor paint-spreading text animation with soft brush effects, irregular fluid edges, breathing bleeds, subtle floating motion, and pastel gradient color variations. Creates a dreamy, weightless feel with each word appearing as if painted on wet paper.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'watercolor',
    'paint',
    'organic',
    'artistic',
    'dreamy',
    'floating',
    'gradient',
    'pastel',
    'soft',
    'breathing',
    'fluid',
    'hand-painted',
  ],
  defaultInputParams: {
    text: 'Watercolor Dreams',
    fontSize: 64,
    fontFamily: 'Quicksand',
    fontWeight: '600',
    colorGradient1:
      'linear-gradient(135deg, #FFB6C1 0%, #DDA0DD 50%, #B0E0E6 100%)',
    colorGradient2:
      'linear-gradient(135deg, #DDA0DD 0%, #B0E0E6 50%, #FFE4E1 100%)',
    colorGradient3:
      'linear-gradient(135deg, #B0E0E6 0%, #FFE4E1 50%, #FFB6C1 100%)',
    wordSpacing: 16,
    initialBlur: 0.5,
    fadeInDuration: 0.8,
    scaleDuration: 1.2,
    floatDuration: 3,
    floatDistance: 5,
    staggerDelay: 0.15,
    totalDuration: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const watercolorTextAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
