/**
 * Layered Peel Transition Effect Preset
 *
 * This preset simulates multiple layers of flat cutouts peeling away sequentially,
 * creating a cascading reveal effect. Each layer animates with a different delay,
 * with subtle 3D rotation on the Y-axis, making it feel like paper sheets being turned.
 * The effect resembles flipping through a paper flipbook or removing masking tape layers.
 *
 * Features:
 * - **Configurable Layer Count**: 2-10 layers with independent animations
 * - **Peel Direction**: Left or right peel with appropriate transform origins
 * - **Stagger Timing**: Adjustable delay between layer peels for cascading effect
 * - **Optional Drop Shadows**: Add depth with dynamic shadows during peel
 * - **3D Rotation**: Y-axis rotation (0 to 90deg) for realistic paper turn effect
 * - **Depth Control**: TranslateZ for layered depth perception
 * - **Opacity Fade**: Smooth fade out as layers peel away
 *
 * Use cases:
 * - Page turn transitions for slideshows or presentations
 * - Reveal animations for storytelling content
 * - Sequential unmasking effects for creative videos
 * - Flipbook-style transitions between scenes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  layerCount: z
    .number()
    .min(2)
    .max(10)
    .default(3)
    .describe('Number of layers to peel away (2-10)'),
  peelDirection: z
    .enum(['left', 'right'])
    .default('left')
    .describe('Direction of peel animation'),
  staggerDelay: z
    .number()
    .min(0)
    .default(300)
    .describe('Delay between layer peels in milliseconds'),
  addShadows: z
    .boolean()
    .default(true)
    .describe('Whether to add drop shadows during peel'),
  baseDuration: z
    .number()
    .min(100)
    .default(800)
    .describe('Duration of each layer peel in milliseconds'),
  targetIds: z
    .array(z.string())
    .default([])
    .describe('Array of component IDs to target (one per layer)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    layerCount,
    peelDirection,
    staggerDelay,
    addShadows,
    baseDuration,
    targetIds,
  } = params;

  // Convert milliseconds to seconds for effect timing
  const staggerDelaySec = staggerDelay / 1000;
  const baseDurationSec = baseDuration / 1000;

  // Calculate transform origin based on peel direction
  const transformOrigin = peelDirection === 'left' ? 'left center' : 'right center';

  // Calculate total effect duration
  const totalDuration =
    (layerCount - 1) * staggerDelaySec + baseDurationSec;

  // Generate effects for each layer
  const effects = Array.from({ length: layerCount }, (_, layerIndex) => {
    const targetId =
      targetIds[layerIndex] || `peel-layer-${layerIndex}`;
    const startTime = layerIndex * staggerDelaySec;

    // Rotation direction based on peel direction
    const rotateYStart = 0;
    const rotateYEnd = peelDirection === 'left' ? -90 : 90;

    // Build animation ranges
    const ranges: Array<{ key: string; val: any; prog: number }> = [
      // Y-axis rotation for peel effect
      { key: 'rotateY', val: rotateYStart, prog: 0 },
      { key: 'rotateY', val: rotateYEnd, prog: 1 },
      // TranslateZ for depth
      { key: 'translateZ', val: 0, prog: 0 },
      { key: 'translateZ', val: -50, prog: 0.5 },
      { key: 'translateZ', val: -100, prog: 1 },
      // Opacity fade out
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.3 },
      { key: 'opacity', val: 0, prog: 1 },
    ];

    // Add drop shadow if enabled
    if (addShadows) {
      ranges.push(
        {
          key: 'filter',
          val: 'drop-shadow(0 0 0px rgba(0,0,0,0))',
          prog: 0,
        },
        {
          key: 'filter',
          val: 'drop-shadow(-10px 10px 20px rgba(0,0,0,0.4))',
          prog: 0.5,
        },
        {
          key: 'filter',
          val: 'drop-shadow(-20px 20px 30px rgba(0,0,0,0.6))',
          prog: 1,
        }
      );
    }

    return {
      id: `peel-effect-layer-${layerIndex}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: startTime,
        duration: baseDurationSec,
        mode: 'provider',
        targetIds: [targetId],
        ranges,
      },
    };
  });

  // Create container with perspective for 3D effect
  const rootContainer: RenderableComponentData = {
    id: 'layered-peel-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects,
    childrenData: Array.from({ length: layerCount }, (_, i) => ({
      id: targetIds[i] || `peel-layer-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            transformOrigin,
            backfaceVisibility: 'hidden',
            zIndex: layerCount - i,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [],
    })) as RenderableComponentData[],
  };

  return {
    output: {
      _extractedEffects: effects,
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'layeredPeelTransition',
  title: 'Layered Peel Transition',
  description:
    'A cascading reveal effect that simulates multiple layers of flat cutouts peeling away sequentially. Each layer animates with a staggered delay, creating a paper flipbook or masking tape removal feel. Includes 3D Y-axis rotation during peel, optional drop shadows, and configurable peel direction (left/right).',
  type: 'predefined',
  presetType: 'effects',
  tags: ['transition', 'peel', '3d', 'cascade', 'layers', 'internal'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    layerCount: 3,
    peelDirection: 'left',
    staggerDelay: 300,
    addShadows: true,
    baseDuration: 800,
    targetIds: ['peel-layer-0', 'peel-layer-1', 'peel-layer-2'],
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const layeredPeelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
