/**
 * Paint Brush Transition Preset
 *
 * This preset simulates organic paint brush strokes revealing the next image,
 * perfect for transitioning between artistic illustrations with varying styles.
 * Like a video editor's custom wipe transition with keyframed paint stroke layers.
 *
 * Features:
 * - **Configurable Stroke Count**: 3-7 paint strokes with staggered timing
 * - **Multiple Directions**: Horizontal, vertical, diagonal, or radial stroke patterns
 * - **Artistic Blending**: Mix-blend-modes and blur effects for organic feel
 * - **Scale Animation**: Subtle zoom on incoming image (1.05 → 1.0)
 * - **Sound Effects**: Optional brush swoosh sounds synced to stroke animations
 * - **Hand-Painted Feel**: Offset timing creates natural, artistic reveal
 *
 * Use cases:
 * - Transitions between stick figure illustrations
 * - Artistic style changes between frames
 * - Creative wipe transitions with organic motion
 * - Video editing with custom paint stroke reveals
 */

import z from 'zod';
import { RenderableComponentData } from '@microfox/datamotion';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// Parameter schema
const presetParams = z.object({
  beforeImageUrl: z.string().describe('URL of the image to transition from'),
  afterImageUrl: z.string().describe('URL of the image to reveal'),
  duration: z
    .number()
    .default(1.5)
    .describe('Transition duration in seconds (default 1.5s)'),
  strokeCount: z
    .number()
    .min(3)
    .max(7)
    .default(5)
    .describe('Number of paint strokes (3-7)'),
  strokeDirection: z
    .enum(['horizontal', 'vertical', 'diagonal', 'radial'])
    .default('horizontal')
    .describe('Direction of paint strokes'),
  paintColor: z
    .string()
    .default('#ffffff')
    .describe('Color for the paint stroke effect (hex format)'),
  soundEffectUrl: z
    .string()
    .optional()
    .describe('Optional URL for brush swoosh sound effects'),
  blendMode: z
    .enum(['multiply', 'screen', 'overlay', 'normal'])
    .default('multiply')
    .describe('Blend mode for artistic effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    beforeImageUrl,
    afterImageUrl,
    duration,
    strokeCount,
    strokeDirection,
    paintColor,
    soundEffectUrl,
    blendMode,
  } = params;

  // Helper function to generate clip-path polygon based on direction and progress
  const generateClipPath = (
    direction: string,
    index: number,
    total: number,
  ): { initial: string; final: string } => {
    const position = index / total;

    switch (direction) {
      case 'horizontal':
        return {
          initial: `polygon(0% ${position * 100}%, 100% ${position * 100}%, 100% ${position * 100}%, 0% ${position * 100}%)`,
          final: `polygon(0% ${position * 100}%, 100% ${position * 100}%, 100% ${(position + 1 / total) * 100}%, 0% ${(position + 1 / total) * 100}%)`,
        };
      case 'vertical':
        return {
          initial: `polygon(${position * 100}% 0%, ${position * 100}% 100%, ${position * 100}% 100%, ${position * 100}% 0%)`,
          final: `polygon(${position * 100}% 0%, ${(position + 1 / total) * 100}% 0%, ${(position + 1 / total) * 100}% 100%, ${position * 100}% 100%)`,
        };
      case 'diagonal':
        return {
          initial: `polygon(${position * 100}% 0%, ${position * 100}% 0%, ${position * 100}% 0%, ${position * 100}% 0%)`,
          final: `polygon(${position * 100}% 0%, ${(position + 1 / total) * 100}% 0%, ${Math.min((position + 1 / total) * 100, 100)}% ${Math.min((position + 1 / total) * 100, 100)}%, ${Math.min(position * 100, 100)}% ${Math.min(position * 100, 100)}%)`,
        };
      case 'radial':
        const angle = (360 / total) * index;
        const nextAngle = (360 / total) * (index + 1);
        return {
          initial: `polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)`,
          final: `polygon(50% 50%, ${50 + 50 * Math.cos((angle * Math.PI) / 180)}% ${50 + 50 * Math.sin((angle * Math.PI) / 180)}%, ${50 + 50 * Math.cos((nextAngle * Math.PI) / 180)}% ${50 + 50 * Math.sin((nextAngle * Math.PI) / 180)}%, 50% 50%)`,
        };
      default:
        return {
          initial: `polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)`,
          final: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`,
        };
    }
  };

  // Helper function to get blend mode class
  const getBlendModeClass = (mode: string): string => {
    switch (mode) {
      case 'multiply':
        return 'mix-blend-multiply';
      case 'screen':
        return 'mix-blend-screen';
      case 'overlay':
        return 'mix-blend-overlay';
      default:
        return '';
    }
  };

  // Generate stroke masks with staggered timing
  const strokeMasks: RenderableComponentData[] = [];
  const staggerOffset = 0.1;

  for (let i = 0; i < strokeCount; i++) {
    const clipPaths = generateClipPath(strokeDirection, i, strokeCount);
    const strokeStart = i * staggerOffset;
    const strokeDuration = duration - strokeStart;

    const strokeId = `paint-brush-transition-stroke-${i}`;

    strokeMasks.push({
      id: strokeId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 pointer-events-none blur-sm ${getBlendModeClass(blendMode)}`,
          style: {
            backgroundColor: paintColor,
            clipPath: clipPaths.initial,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `${strokeId}-clip-path-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: strokeStart,
            duration: strokeDuration * 0.6,
            mode: 'provider',
            targetIds: [strokeId],
            ranges: [
              {
                key: 'clipPath',
                val: clipPaths.initial,
                prog: 0,
              },
              {
                key: 'clipPath',
                val: clipPaths.final,
                prog: 1,
              },
            ],
          },
        },
        {
          id: `${strokeId}-opacity-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: strokeStart,
            duration: strokeDuration,
            mode: 'provider',
            targetIds: [strokeId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData);
  }

  // Create children data structure
  const childrenData: RenderableComponentData[] = [
    // Before image (always visible)
    {
      id: 'paint-brush-transition-before-image',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: beforeImageUrl,
        containerProps: {
          className: 'absolute inset-0 w-full h-full object-cover',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [],
    } as RenderableComponentData,

    // After image container with scale effect
    {
      id: 'paint-brush-transition-after-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 w-full h-full',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'paint-brush-transition-scale-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['paint-brush-transition-after-container'],
            ranges: [
              { key: 'scale', val: 1.05, prog: 0 },
              { key: 'scale', val: 1.0, prog: 1 },
            ],
          },
        },
        {
          id: 'paint-brush-transition-after-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: duration * 0.3,
            mode: 'provider',
            targetIds: ['paint-brush-transition-after-container'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'paint-brush-transition-after-image',
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: afterImageUrl,
            containerProps: {
              className: 'w-full h-full object-cover',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          childrenData: [],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Stroke mask container
    {
      id: 'paint-brush-transition-stroke-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: strokeMasks,
    } as RenderableComponentData,
  ];

  // Add optional audio if provided
  if (soundEffectUrl) {
    childrenData.push({
      id: 'paint-brush-transition-audio',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: soundEffectUrl,
        volume: 0.7,
        startFrom: 0,
        endAt: duration,
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [],
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'paint-brush-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
        fitDurationTo: 'this',
      },
    },
    childrenData: childrenData as RenderableComponentData[],
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
  id: 'paint-brush-transition',
  title: 'PaintBrushTransition',
  description:
    'A paint brush stroke transition preset that simulates organic brush strokes revealing the next image. Features configurable stroke count (3-7), direction (horizontal, vertical, diagonal, radial), paint color, and optional brush sound effects. Includes a subtle scale animation on the incoming image for a gentle zoom effect. Each stroke animates with staggered timing, blur effects, and blend modes for an artistic hand-painted reveal feel.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'paint', 'brush', 'artistic', 'wipe', 'reveal'],
  defaultInputParams: {
    beforeImageUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&h=600&fit=crop',
    afterImageUrl:
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&h=600&fit=crop',
    duration: 1.5,
    strokeCount: 5,
    strokeDirection: 'horizontal',
    paintColor: '#ffffff',
    blendMode: 'multiply',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const paintBrushTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
