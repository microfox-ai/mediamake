/**
 * Typokinetics River Flow Preset
 *
 * This preset creates a dynamic kinetic typography effect where text flows like a river
 * across the screen in smooth, wavelike patterns. Words surface from below the viewport,
 * float across in serpentine sine wave trajectories, then dive back down - like dolphins
 * breaching and diving.
 *
 * Features:
 * - **Multiple Depth Layers**: 3-4 depth layers with parallax effects using opacity and scale
 * - **Sine Wave Trajectories**: Each word follows a unique sine wave path with varying amplitude and frequency
 * - **Current Effect**: All words drift horizontally while maintaining wave patterns
 * - **Gentle Rotation**: Rotation follows the curve of the motion path
 * - **Keyword Emphasis**: Important words "jump" higher and glow briefly at their peak
 * - **GPU Acceleration**: Uses transform-gpu for optimal performance
 *
 * Use cases:
 * - Creating dynamic flowing text effects for motion graphics
 * - Building engaging river-like word animations
 * - Adding kinetic typography to videos
 * - Creating dolphin-like word motion effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
  TextAtomData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  words: z
    .array(
      z.object({
        text: z.string().describe('Word text'),
        keyword: z
          .boolean()
          .optional()
          .describe('Whether this word is emphasized (jumps higher, glows)'),
      }),
    )
    .describe('Array of word objects to display'),
  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),
  textColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  duration: z
    .number()
    .min(5)
    .max(30)
    .default(10)
    .describe('Total duration of the animation in seconds'),
  wordDuration: z
    .number()
    .min(3)
    .max(10)
    .default(6)
    .describe('Duration each word stays on screen (5-7 seconds recommended)'),
  staggerDelay: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.4)
    .describe('Delay between word starts (0.3-0.5s recommended)'),
  depthLayers: z
    .number()
    .int()
    .min(2)
    .max(5)
    .default(4)
    .describe('Number of depth layers for parallax effect'),
  impact: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Effect intensity multiplier'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:600';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

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

  // Helper function to distribute words across depth layers
  const distributeWordsToLayers = (
    words: Array<{ text: string; keyword?: boolean }>,
    numLayers: number,
  ) => {
    const layers: Array<Array<{ text: string; keyword?: boolean; index: number }>> = Array(
      numLayers,
    )
      .fill(null)
      .map(() => []);

    words.forEach((word, index) => {
      const layerIndex = index % numLayers;
      layers[layerIndex].push({ ...word, index });
    });

    return layers;
  };

  // Distribute words across layers
  const layers = distributeWordsToLayers(params.words, params.depthLayers);

  // Helper function to create sine wave effect for a word
  const createSineWaveEffect = (
    wordId: string,
    layerIndex: number,
    wordIndex: number,
    isKeyword: boolean,
  ): GenericEffectData => {
    // Calculate layer-specific parameters
    const depthFactor = (layerIndex + 1) / params.depthLayers;
    const baseAmplitude = 30 + layerIndex * 10; // Deeper layers have larger waves
    const amplitude = isKeyword
      ? baseAmplitude * 1.8 * params.impact
      : baseAmplitude * params.impact;

    // Vary frequency based on word index for organic feel
    const frequencyVariation = (wordIndex % 3) * 0.1;
    const baseFrequency = 1 + frequencyVariation;

    // Calculate wave points (0%, 25%, 50%, 75%, 100%)
    const wave0 = (Math.sin(0 * Math.PI * 2) * amplitude) / 2;
    const wave25 = (Math.sin(0.25 * Math.PI * 2 * baseFrequency) * amplitude);
    const wave50 = (Math.sin(0.5 * Math.PI * 2 * baseFrequency) * amplitude) / 2;
    const wave75 = (Math.sin(0.75 * Math.PI * 2 * baseFrequency) * amplitude);
    const wave100 = (Math.sin(1 * Math.PI * 2 * baseFrequency) * amplitude) / 2;

    // Scale based on depth
    const minScale = 0.6 + depthFactor * 0.3;
    const maxScale = minScale + 0.2;

    // Opacity based on depth
    const minOpacity = 0.4 + depthFactor * 0.3;
    const maxOpacity = 0.7 + depthFactor * 0.3;

    // Rotation range
    const rotationRange = 5 + wordIndex * 2;

    const ranges = [
      // Horizontal drift (translateX)
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: 120, prog: 1 },
      
      // Vertical sine wave (translateY)
      { key: 'translateY', val: wave0, prog: 0 },
      { key: 'translateY', val: wave25, prog: 0.25 },
      { key: 'translateY', val: wave50, prog: 0.5 },
      { key: 'translateY', val: wave75, prog: 0.75 },
      { key: 'translateY', val: wave100, prog: 1 },
      
      // Rotation following curve
      { key: 'rotate', val: -rotationRange * 0.6, prog: 0 },
      { key: 'rotate', val: rotationRange * 0.4, prog: 0.25 },
      { key: 'rotate', val: -rotationRange * 0.2, prog: 0.5 },
      { key: 'rotate', val: rotationRange * 0.6, prog: 0.75 },
      { key: 'rotate', val: -rotationRange * 0.4, prog: 1 },
      
      // Scale based on depth
      { key: 'scale', val: minScale, prog: 0 },
      { key: 'scale', val: maxScale, prog: 0.5 },
      { key: 'scale', val: minScale, prog: 1 },
      
      // Opacity based on vertical position
      { key: 'opacity', val: minOpacity, prog: 0 },
      { key: 'opacity', val: maxOpacity, prog: 0.5 },
      { key: 'opacity', val: minOpacity, prog: 1 },
    ];

    return {
      type: 'ease-in-out',
      start: 0,
      duration: params.wordDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges,
    };
  };

  // Helper function to create glow effect for keywords
  const createGlowEffect = (wordId: string, layerIndex: number): GenericEffectData => {
    const glowIntensity = 40 + layerIndex * 10;
    
    return {
      type: 'ease-in-out',
      start: 0,
      duration: params.wordDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'textShadow', val: '0 0 20px rgba(255,255,255,0)', prog: 0 },
        { key: 'textShadow', val: `0 0 ${glowIntensity}px rgba(255,255,255,0.8)`, prog: 0.25 },
        { key: 'textShadow', val: '0 0 20px rgba(255,255,255,0)', prog: 0.5 },
      ],
    };
  };

  // Create depth layer containers
  const depthLayerContainers = layers.map((layerWords, layerIndex) => {
    if (layerWords.length === 0) return null;

    const zIndex = layerIndex + 1;
    const fontSize = 28 + layerIndex * 6; // Larger text for foreground layers

    // Create word components for this layer
    const wordComponents = layerWords.map((word) => {
      const wordId = `word-${layerIndex}-${word.index}`;
      const startTime = word.index * params.staggerDelay;

      // Create effects
      const sineWaveEffect = createSineWaveEffect(
        wordId,
        layerIndex,
        word.index,
        word.keyword || false,
      );

      const effects = [
        {
          id: `sine-wave-${wordId}`,
          componentId: 'generic',
          data: sineWaveEffect,
        },
      ];

      // Add glow effect for keywords
      if (word.keyword) {
        const glowEffect = createGlowEffect(wordId, layerIndex);
        effects.push({
          id: `glow-${wordId}`,
          componentId: 'generic',
          data: glowEffect,
        });
      }

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: word.keyword ? '800' : fontStyle.fontWeight || '600',
            color: params.textColor,
            position: 'absolute',
            left: '-10%',
            top: '50%',
            whiteSpace: 'nowrap',
            ...(word.keyword ? { textShadow: '0 0 20px rgba(255,255,255,0)' } : {}),
          },
          className: 'transform-gpu',
          font: {
            family: fontFamily,
            weights: word.keyword
              ? ['800']
              : fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['600'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: startTime,
            duration: params.wordDuration,
          },
        },
        effects,
      } as RenderableComponentData;
    });

    return {
      id: `depth-layer-${layerIndex + 1}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData;
  }).filter(Boolean) as RenderableComponentData[];

  // Root container
  const rootContainer = {
    id: 'typokinetics-river-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: depthLayerContainers,
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
  id: 'typokineticsRiverFlow',
  title: 'Typokinetics River Flow',
  description:
    'Dynamic kinetic typography where words flow like a river across the screen in smooth wavelike patterns. Words surface from below, float across in serpentine sine wave trajectories, then dive back down like dolphins breaching. Features multiple depth layers with parallax effects, varying wave amplitudes/frequencies, subtle horizontal drift, rotation following motion paths, and emphasis effects for important keywords with glow at peak positions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'motion-graphics',
    'waves',
    'river',
    'parallax',
    'sine-wave',
    'dolphins',
    'flow',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    words: [
      { text: 'flowing', keyword: false },
      { text: 'words', keyword: false },
      { text: 'cascade', keyword: false },
      { text: 'breaching', keyword: false },
      { text: 'serpentine', keyword: false },
      { text: 'motion', keyword: false },
      { text: 'kinetic', keyword: true },
      { text: 'dolphin', keyword: false },
      { text: 'parallax', keyword: true },
      { text: 'wavelike', keyword: true },
      { text: 'typography', keyword: true },
    ],
    font: 'Inter:600',
    textColor: '#ffffff',
    duration: 10,
    wordDuration: 6,
    staggerDelay: 0.4,
    depthLayers: 4,
    impact: 1,
  },
};

export const typokineticsRiverFlowPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};