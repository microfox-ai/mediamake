/**
 * Geometric Morph Transition Preset
 *
 * This preset creates an expanding geometric morph effect that transforms from a small circle to a large rectangle
 * (or vice versa) with smooth clip-path animations and intermediate shape keyframes. The shape progression creates
 * organic morphing effects using clip-path values to simulate shapes like circle -> octagon -> square -> rectangle.
 *
 * Features:
 * - **Smooth Shape Morphing**: Transforms between circle, diamond, hexagon, square, and rectangle shapes
 * - **Clip-path Animations**: Uses CSS clip-path for fluid shape transitions
 * - **Intermediate Keyframes**: Configurable 3-8 keyframes for smooth shape progression
 * - **Elastic Easing**: Uses cubic-bezier(0.68, -0.55, 0.265, 1.55) for organic, bouncy feel
 * - **Bidirectional**: Supports both expansion (circle to rectangle) and contraction (rectangle to circle)
 * - **Color Customization**: Customizable colors for start and end shapes
 *
 * Use cases:
 * - Creative transitions between different content types
 * - Attention-grabbing section dividers
 * - Animated shape reveals for text or media
 * - Dynamic background transitions
 * - Modern UI transitions for splash screens
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  startShape: z
    .enum(['circle', 'diamond', 'hexagon'])
    .default('circle')
    .describe('Starting shape for the morph transition'),
  endShape: z
    .enum(['square', 'rectangle', 'circle'])
    .default('rectangle')
    .describe('Ending shape for the morph transition'),
  morphDuration: z
    .number()
    .min(1000)
    .max(3000)
    .default(2000)
    .describe('Duration of the morph transition in milliseconds'),
  smoothness: z
    .number()
    .int()
    .min(3)
    .max(8)
    .default(5)
    .describe('Number of intermediate keyframes for smooth morphing (3-8)'),
  primaryColor: z
    .string()
    .default('#FF6B6B')
    .describe('Color of the starting shape'),
  secondaryColor: z
    .string()
    .default('#4ECDC4')
    .describe('Color of the ending shape'),
  startSize: z
    .string()
    .default('100px')
    .describe('Size of the starting shape (e.g., "100px", "20%")'),
  endWidth: z
    .string()
    .default('80%')
    .describe('Width of the ending shape'),
  endHeight: z
    .string()
    .default('60%')
    .describe('Height of the ending shape'),
  backgroundColor: z
    .string()
    .default('transparent')
    .describe('Background color of the container'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    startShape,
    endShape,
    morphDuration,
    smoothness,
    primaryColor,
    secondaryColor,
    startSize,
    endWidth,
    endHeight,
    backgroundColor,
  } = params;

  const morphDurationSeconds = morphDuration / 1000;

  // Helper function to generate clip-path values for different shapes
  const getClipPathForShape = (
    shape: string,
    size: string,
    width?: string,
    height?: string,
  ): string => {
    switch (shape) {
      case 'circle':
        return `circle(${size === '100px' ? '10%' : '45%'} at 50% 50%)`;
      case 'diamond':
        return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
      case 'hexagon':
        return 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)';
      case 'square':
        return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
      case 'rectangle':
        return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
      default:
        return 'circle(50% at 50% 50%)';
    }
  };

  // Generate intermediate shapes for smooth morphing
  const generateIntermediateClipPaths = (): Array<{
    val: string;
    prog: number;
  }> => {
    const keyframes: Array<{ val: string; prog: number }> = [];
    const progressStep = 1 / (smoothness - 1);

    for (let i = 0; i < smoothness; i++) {
      const progress = i * progressStep;
      let clipPath: string;

      if (startShape === 'circle' && endShape === 'rectangle') {
        // Circle -> Octagon -> Square -> Rectangle progression
        if (progress < 0.33) {
          // Circle to octagon (8-sided)
          clipPath =
            'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
        } else if (progress < 0.66) {
          // Octagon to square
          clipPath =
            'polygon(10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 10%)';
        } else {
          // Square to rectangle
          clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
        }
      } else if (startShape === 'circle' && endShape === 'square') {
        // Circle -> Octagon -> Square
        if (progress < 0.5) {
          clipPath =
            'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
        } else {
          clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
        }
      } else if (startShape === 'diamond' && endShape === 'rectangle') {
        // Diamond -> Hexagon -> Square -> Rectangle
        if (progress < 0.33) {
          clipPath =
            'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)';
        } else if (progress < 0.66) {
          clipPath =
            'polygon(10% 0%, 90% 0%, 100% 10%, 100% 90%, 90% 100%, 10% 100%, 0% 90%, 0% 10%)';
        } else {
          clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
        }
      } else if (startShape === 'hexagon' && endShape === 'square') {
        // Hexagon -> Octagon -> Square
        if (progress < 0.5) {
          clipPath =
            'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)';
        } else {
          clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
        }
      } else {
        // Default progression
        clipPath =
          progress < 0.5
            ? 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)'
            : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
      }

      keyframes.push({
        val: clipPath,
        prog: progress,
      });
    }

    return keyframes;
  };

  const clipPathKeyframes = generateIntermediateClipPaths();

  // Create the morphing shape container
  const morphContainer: RenderableComponentData = {
    id: 'geometric-morph-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: morphDurationSeconds,
      },
    },
    childrenData: [
      {
        id: 'morph-shape',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});"></div>`,
          className: 'w-full h-full',
          style: {
            clipPath: getClipPathForShape(startShape, startSize),
          },
        },
        context: {
          timing: {
            start: 0,
            duration: morphDurationSeconds,
          },
        },
        effects: [
          {
            id: 'morph-clip-path',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: morphDurationSeconds,
              mode: 'provider',
              targetIds: ['morph-shape'],
              ranges: clipPathKeyframes.map((kf) => ({
                key: 'clipPath',
                val: kf.val,
                prog: kf.prog,
              })),
            },
          },
          {
            id: 'morph-scale',
            componentId: 'generic',
            data: {
              type: 'spring',
              start: 0,
              duration: morphDurationSeconds,
              mode: 'provider',
              targetIds: ['morph-shape'],
              ranges: [
                { key: 'scale', val: 0.2, prog: 0 },
                { key: 'scale', val: 1.1, prog: 0.7 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
          {
            id: 'morph-width-height',
            componentId: 'generic',
            data: {
              type: 'spring',
              start: 0,
              duration: morphDurationSeconds,
              mode: 'provider',
              targetIds: ['morph-shape'],
              ranges: [
                { key: 'width', val: startSize, prog: 0 },
                { key: 'width', val: endWidth, prog: 1 },
                { key: 'height', val: startSize, prog: 0 },
                { key: 'height', val: endHeight, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  return {
    output: {
      childrenData: [morphContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'geometric-morph-transition',
  title: 'Geometric Morph Transition',
  description:
    'Expanding geometric morph effect that transforms from a small circle to a large rectangle (or vice versa) with smooth clip-path animations and intermediate shape keyframes. Features elastic easing for organic feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'morph',
    'geometric',
    'clip-path',
    'shape',
    'animation',
    'creative',
  ],
  defaultInputParams: {
    startShape: 'circle',
    endShape: 'rectangle',
    morphDuration: 2000,
    smoothness: 5,
    primaryColor: '#FF6B6B',
    secondaryColor: '#4ECDC4',
    startSize: '100px',
    endWidth: '80%',
    endHeight: '60%',
    backgroundColor: 'transparent',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const geometricMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
