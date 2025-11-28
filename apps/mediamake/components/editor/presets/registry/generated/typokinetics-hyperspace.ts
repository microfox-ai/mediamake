/**
 * Typokinetics Hyperspace Preset
 *
 * A cinematic depth-of-field preset that simulates a sci-fi hyperspace jump where words
 * emerge from a vanishing point at the center and fly past the viewer with z-axis perspective
 * transforms. Features aggressive foreshortening, blur effects, Y-axis rotation, and staggered
 * word sequences with speed variations based on impact scores.
 *
 * Inspired by the classic Star Wars opening crawl but with individual words traveling toward
 * the camera at varying speeds. Words start as tiny blurred specks in the distance, rapidly
 * scale up and sharpen as they approach, then blur again as they pass by the edges.
 *
 * Features:
 * - **3D Perspective Transforms**: Z-axis movement with perspective foreshortening
 * - **Depth-of-Field Effects**: Blur effects simulate camera focus
 * - **Dynamic Speed System**: High-impact words (impact > 0.7) travel faster (3s vs 4s)
 * - **Staggered Queue**: Words overlap in motion creating continuous stream (0.2-0.4s stagger)
 * - **Y-Axis Rotation**: Subtle rotation enhances 3D illusion as words pass
 * - **Caption Metadata Support**: Uses impact scores for speed/intensity variations
 *
 * Use cases:
 * - Sci-fi and futuristic content
 * - Dramatic text reveals
 * - High-energy title sequences
 * - Action-packed video intros
 * - Space-themed presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Preset parameters schema
const presetParams = z.object({
  captionData: z.array(z.any()).describe('Array of caption objects with text, timing, and word data'),
  
  // Typography configuration
  fontSize: z.number().min(24).max(120).default(48).describe('Base font size for words in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family (e.g., "Inter:700", "Roboto:600:italic")'),
  textColor: z.string().default('#ffffff').describe('Text color (hex or rgba)'),
  
  // Speed and timing configuration
  baseWordDuration: z.number().min(2).max(6).default(4).describe('Base duration for normal words in seconds'),
  fastWordDuration: z.number().min(1.5).max(4).default(3).describe('Duration for high-impact words (impact > 0.7) in seconds'),
  normalStagger: z.number().min(0.1).max(0.8).default(0.4).describe('Stagger delay between normal words in seconds'),
  fastStagger: z.number().min(0.05).max(0.4).default(0.2).describe('Stagger delay between high-impact words in seconds'),
  
  // 3D perspective configuration
  perspectiveDistance: z.number().min(500).max(2000).default(1000).describe('Perspective distance in pixels (lower = more dramatic foreshortening)'),
  startZ: z.number().min(-5000).max(-500).default(-2000).describe('Starting Z position (distance) in pixels'),
  endZ: z.number().min(100).max(1000).default(500).describe('Ending Z position (past camera) in pixels'),
  
  // Scale configuration
  minScale: z.number().min(0.05).max(0.5).default(0.1).describe('Minimum scale (tiny speck in distance)'),
  maxScale: z.number().min(1.5).max(5).default(3).describe('Maximum scale (huge as it passes)'),
  
  // Blur configuration (depth-of-field)
  distanceBlur: z.number().min(5).max(20).default(10).describe('Blur amount in distance (pixels)'),
  passingBlur: z.number().min(2).max(10).default(5).describe('Blur amount when passing (pixels)'),
  
  // Rotation configuration
  rotationRange: z.number().min(0).max(15).default(5).describe('Y-axis rotation range in degrees'),
  
  // Impact threshold
  impactThreshold: z.number().min(0).max(1).default(0.7).describe('Impact score threshold for fast mode (0-1)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captionData as TranscriptionSentence[];
  
  // Parse font family
  const fontString = params.fontFamily || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  // Parse font style from font string
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
  
  // Collect all words from all captions
  const allWords: Array<{
    word: any;
    caption: TranscriptionSentence;
    absoluteStart: number;
    index: number;
  }> = [];
  
  captions.forEach((caption) => {
    if (caption.words && Array.isArray(caption.words)) {
      caption.words.forEach((word, wordIndex) => {
        allWords.push({
          word,
          caption,
          absoluteStart: word.absoluteStart,
          index: allWords.length,
        });
      });
    }
  });
  
  // Sort by absolute start time
  allWords.sort((a, b) => a.absoluteStart - b.absoluteStart);
  
  // Calculate cumulative stagger for each word
  let cumulativeStagger = 0;
  const wordConfigs = allWords.map((item, idx) => {
    const { word, caption } = item;
    
    // Determine if word is high-impact
    const impact = caption.metadata?.impact ?? 1.0;
    const isHighImpact = impact > params.impactThreshold;
    
    // Choose duration and stagger based on impact
    const duration = isHighImpact ? params.fastWordDuration : params.baseWordDuration;
    const stagger = isHighImpact ? params.fastStagger : params.normalStagger;
    
    const config = {
      wordText: word.text,
      wordId: `hyperspace-word-${idx}`,
      absoluteStart: word.absoluteStart,
      duration,
      stagger: cumulativeStagger,
      isHighImpact,
    };
    
    // Accumulate stagger for next word
    cumulativeStagger += stagger;
    
    return config;
  });
  
  // Create word components with effects
  const wordComponents: RenderableComponentData[] = wordConfigs.map((config) => {
    const wordId = config.wordId;
    
    // Create hyperspace zoom effect (translateZ, scale, opacity, blur)
    const zoomEffect: GenericEffectData = {
      type: 'ease-in',
      start: 0,
      duration: config.duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Z-axis translation (from far to close)
        { key: 'translateZ', val: params.startZ, prog: 0 },
        { key: 'translateZ', val: params.endZ, prog: 1 },
        
        // Scale (tiny to huge)
        { key: 'scale', val: params.minScale, prog: 0 },
        { key: 'scale', val: params.maxScale, prog: 1 },
        
        // Opacity (fade in, visible, fade out)
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 0, prog: 1 },
        
        // Blur (depth-of-field effect)
        { key: 'blur', val: params.distanceBlur, prog: 0 },
        { key: 'blur', val: 0, prog: 0.4 },
        { key: 'blur', val: params.passingBlur, prog: 1 },
      ],
    };
    
    // Create Y-axis rotation effect
    const rotationEffect: GenericEffectData = {
      type: 'ease-out',
      start: 0,
      duration: config.duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'rotateY', val: -params.rotationRange, prog: 0 },
        { key: 'rotateY', val: 0, prog: 0.5 },
        { key: 'rotateY', val: params.rotationRange, prog: 1 },
      ],
    };
    
    // Word container (positioned absolutely, centered)
    const wordContainer: RenderableComponentData = {
      id: `${wordId}-container`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: '50%',
            top: '50%',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: config.absoluteStart + config.stagger,
          duration: config.duration,
        },
      },
      effects: [
        {
          id: `${wordId}-zoom`,
          componentId: 'generic',
          data: zoomEffect,
        },
        {
          id: `${wordId}-rotation`,
          componentId: 'generic',
          data: rotationEffect,
        },
      ],
      childrenData: [
        {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: config.wordText,
            style: {
              fontSize: `${params.fontSize}px`,
              fontWeight: fontStyle.fontWeight || 'bold',
              fontStyle: fontStyle.fontStyle,
              color: params.textColor,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: config.duration,
            },
          },
        },
      ],
    };
    
    return wordContainer;
  });
  
  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-hyperspace-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: `${params.perspectiveDistance}px`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: allWords.length > 0 
          ? allWords[allWords.length - 1].absoluteStart + wordConfigs[wordConfigs.length - 1].duration + wordConfigs[wordConfigs.length - 1].stagger 
          : 10,
      },
    },
    childrenData: wordComponents,
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
  id: 'typokinetics-hyperspace',
  title: 'Typokinetics Hyperspace',
  description: 'Cinematic depth-of-field preset simulating a sci-fi hyperspace jump where words emerge from a vanishing point at center, flying past the viewer with z-axis perspective transforms. Features aggressive foreshortening, blur effects, Y-axis rotation, and staggered word sequences with speed variations based on impact scores. Creates a constant stream of text traveling through space like Star Wars opening crawl but with individual words.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'hyperspace',
    'sci-fi',
    '3d',
    'perspective',
    'depth-of-field',
    'blur',
    'rotation',
    'star-wars',
    'cinematic',
    'dramatic',
    'motion',
    'z-axis',
    'foreshortening',
  ],
  dependencies: {},
  defaultInputParams: {
    captionData: [],
    fontSize: 48,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    baseWordDuration: 4,
    fastWordDuration: 3,
    normalStagger: 0.4,
    fastStagger: 0.2,
    perspectiveDistance: 1000,
    startZ: -2000,
    endZ: 500,
    minScale: 0.1,
    maxScale: 3,
    distanceBlur: 10,
    passingBlur: 5,
    rotationRange: 5,
    impactThreshold: 0.7,
  },
};

// Export preset
export const typokineticsHyperspacePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
