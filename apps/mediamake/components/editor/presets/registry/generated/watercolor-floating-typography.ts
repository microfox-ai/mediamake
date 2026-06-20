/**
 * Floating Watercolor Typography Preset
 *
 * Creates serene watercolor text effect where words materialize through soft focus pull
 * with translucent quality, flowing color gradients, gentle wave distortions, and light
 * refractions creating an underwater ink-dissolving aesthetic.
 *
 * Features:
 * - Soft focus pull animation (blur to sharp)
 * - Translucent watercolor appearance
 * - Flowing gradient colors through letters
 * - Gentle wave-like distortions
 * - Light refraction glints
 * - Serene, meditative feel
 *
 * Use cases:
 * - Poetic or artistic video titles
 * - Meditation or wellness content
 * - Nature documentaries
 * - Abstract creative projects
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
  words: z
    .array(z.string())
    .default(['Floating', 'Watercolor', 'Typography'])
    .describe('Array of words to display with watercolor effect'),
  font: z
    .string()
    .default('Raleway:300')
    .describe(
      'Font family with optional weight and style (e.g., "Raleway:300", "Inter:400")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  backgroundColor: z
    .string()
    .default('rgba(245, 250, 255, 0.95)')
    .describe('Background color for the scene'),
  gradients: z
    .array(z.string())
    .optional()
    .describe(
      'Array of gradient strings for each word. If not provided, defaults will be used.',
    ),
  focusPullDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of focus pull animation in seconds'),
  waveDistortionDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration of wave distortion cycle in seconds'),
  brightnessGlintDuration: z
    .number()
    .min(1)
    .max(10)
    .default(4)
    .describe('Duration of brightness glint cycle in seconds'),
  gradientFlowDuration: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Duration of gradient color flow cycle in seconds'),
  wordStagger: z
    .number()
    .min(0)
    .max(2)
    .default(0.3)
    .describe('Time delay between each word appearance in seconds'),
  opacity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.85)
    .describe('Final opacity of text (translucent quality)'),
  letterSpacing: z
    .string()
    .default('0.05em')
    .describe('Letter spacing for text'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    words,
    font,
    fontSize,
    backgroundColor,
    gradients,
    focusPullDuration,
    waveDistortionDuration,
    brightnessGlintDuration,
    gradientFlowDuration,
    wordStagger,
    opacity,
    letterSpacing,
  } = params;

  // Parse font string
  const fontParts = font.split(':');
  const fontFamily = fontParts[0];
  const fontWeight = fontParts[1] ? parseInt(fontParts[1], 10) : 300;

  // Default gradients for each word
  const defaultGradients = [
    'linear-gradient(135deg, rgba(100, 150, 220, 0.8), rgba(150, 100, 220, 0.8), rgba(100, 180, 200, 0.8))',
    'linear-gradient(135deg, rgba(180, 120, 200, 0.8), rgba(100, 180, 220, 0.8), rgba(150, 200, 150, 0.8))',
    'linear-gradient(135deg, rgba(150, 200, 150, 0.8), rgba(200, 150, 100, 0.8), rgba(100, 150, 220, 0.8))',
  ];

  const wordGradients = gradients || defaultGradients;

  // Calculate horizontal positions for words (distributed across width)
  const calculateWordPosition = (index: number, total: number): string => {
    if (total === 1) return '50%';
    const spacing = 60 / (total - 1); // Distribute between 20% and 80%
    return `${20 + spacing * index}%`;
  };

  // Calculate vertical positions with slight variation
  const calculateWordVerticalPosition = (
    index: number,
    total: number,
  ): string => {
    const baseVertical = 50; // Center
    const variation = 10; // +/- 10% variation
    const offset = ((index % 3) - 1) * variation; // Alternate pattern
    return `${baseVertical + offset}%`;
  };

  // Create word components with effects
  const wordComponents: RenderableComponentData[] = words.map(
    (word, index) => {
      const wordId = `word-${index}`;
      const wrapperId = `word-${index}-wrapper`;
      const gradient =
        wordGradients[index % wordGradients.length] || defaultGradients[0];

      const leftPosition = calculateWordPosition(index, words.length);
      const topPosition = calculateWordVerticalPosition(index, words.length);

      // Calculate staggered timing
      const wordStart = index * wordStagger;

      // Focus pull effect (blur to sharp, fade in, scale down)
      const focusPullEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0, // Relative to word wrapper
        duration: focusPullDuration,
        mode: 'provider',
        targetIds: [wrapperId],
        ranges: [
          { key: 'filter', val: 'blur(8px)', prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: opacity, prog: 1 },
          { key: 'scale', val: 1.2, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      };

      // Wave distortion effect (scaleY oscillation)
      const waveDistortionEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: 0,
        duration: waveDistortionDuration,
        mode: 'provider',
        targetIds: [wrapperId],
        ranges: [
          { key: 'scaleY', val: 1, prog: 0 },
          { key: 'scaleY', val: 1.05, prog: 0.33 },
          { key: 'scaleY', val: 0.95, prog: 0.66 },
          { key: 'scaleY', val: 1, prog: 1 },
        ],
      };

      // Brightness glint effect (light refraction)
      const brightnessGlintEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: focusPullDuration + index * 0.5, // Start after focus pull with stagger
        duration: brightnessGlintDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'filter', val: 'brightness(1)', prog: 0 },
          { key: 'filter', val: 'brightness(1.3)', prog: 0.5 },
          { key: 'filter', val: 'brightness(1)', prog: 1 },
        ],
      };

      // Gradient flow effect (hue rotation for color animation)
      const gradientFlowEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: gradientFlowDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
          { key: 'filter', val: 'hue-rotate(30deg)', prog: 1 },
        ],
      };

      // Text atom for the word
      const textAtom: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word,
          className: 'backdrop-blur-sm',
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            backgroundImage: gradient,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            backgroundSize: '200% 200%',
            letterSpacing: letterSpacing,
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 8, // Each word visible for 8 seconds
          },
        },
        effects: [
          {
            id: `brightness-glint-${wordId}`,
            componentId: 'generic',
            data: brightnessGlintEffect,
          },
          {
            id: `gradient-flow-${wordId}`,
            componentId: 'generic',
            data: gradientFlowEffect,
          },
        ],
      };

      // Wrapper for each word (positioned absolutely)
      const wordWrapper: RenderableComponentData = {
        id: wrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute will-change-transform backdrop-blur-sm',
            style: {
              left: leftPosition,
              top: topPosition,
              transform: 'translate(-50%, -50%)',
            },
          },
        },
        context: {
          timing: {
            start: wordStart, // Staggered start
            duration: 8, // Duration of wrapper
          },
        },
        childrenData: [textAtom],
        effects: [
          {
            id: `focus-pull-${wrapperId}`,
            componentId: 'generic',
            data: focusPullEffect,
          },
          {
            id: `wave-distortion-${wrapperId}`,
            componentId: 'generic',
            data: waveDistortionEffect,
          },
        ],
      };

      return wordWrapper;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'watercolor-floating-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full flex items-center justify-center',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'scene', // Match scene duration
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
  id: 'watercolor-floating-typography',
  title: 'Floating Watercolor Typography',
  description:
    'Serene watercolor text effect where words materialize through soft focus pull with translucent quality, flowing color gradients, gentle wave distortions, and light refractions creating an underwater ink-dissolving aesthetic',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'watercolor',
    'floating',
    'artistic',
    'gradient',
    'blur',
    'animation',
    'serene',
    'meditative',
  ],
  defaultInputParams: {
    words: ['Floating', 'Watercolor', 'Typography'],
    font: 'Raleway:300',
    fontSize: 72,
    backgroundColor: 'rgba(245, 250, 255, 0.95)',
    focusPullDuration: 2,
    waveDistortionDuration: 3,
    brightnessGlintDuration: 4,
    gradientFlowDuration: 5,
    wordStagger: 0.3,
    opacity: 0.85,
    letterSpacing: '0.05em',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const watercolorFloatingTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
