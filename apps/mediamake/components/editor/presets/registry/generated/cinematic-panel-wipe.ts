/**
 * Cinematic Panel Slide Wipe Transition Preset
 *
 * Professional broadcast-style wipe transition with 4-6 cascading horizontal panels.
 * Each panel slides from left (-100%) to center (0%) to right (100%) with staggered
 * timing offsets creating a domino wave effect. Features glass morphism with semi-transparent
 * dark gradients, backdrop blur, and motion blur during movement. Optimized with GPU
 * acceleration for smooth broadcast-quality transitions.
 *
 * Features:
 * - **Cascading Panel Animation**: 5 horizontal panels sliding in staggered sequence
 * - **Glass Morphism Design**: Semi-transparent dark gradients with backdrop blur
 * - **Motion Blur Effects**: Dynamic blur during movement for realistic motion feel
 * - **Depth Effects**: Subtle scale animations (0.95 → 1 → 0.95) for 3D depth
 * - **GPU Optimized**: Uses will-change: transform for hardware acceleration
 * - **Professional Timing**: Smooth ease-in-out curves with cascading 0.15s offsets
 *
 * Use cases:
 * - Broadcast-style segment transitions
 * - Professional video editing wipe effects
 * - Scene transitions in cinematic content
 * - Modern motion graphics packages
 * - High-end presentation transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Total duration of the panel wipe transition in seconds'),
  panelCount: z
    .number()
    .int()
    .min(4)
    .max(6)
    .default(5)
    .describe('Number of horizontal panels (4-6 panels)'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.0)
    .describe('Duration of each panel slide animation in seconds'),
  staggerOffset: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.15)
    .describe('Time offset between each panel start (0.05-0.3 seconds)'),
  motionBlurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .describe('Motion blur intensity in pixels during movement'),
  scaleEffect: z
    .boolean()
    .default(true)
    .describe('Enable subtle scale animation for depth effect'),
  backgroundColor: z
    .string()
    .default('from-black/80 to-black/60')
    .describe(
      'Gradient background for panels (Tailwind gradient classes or CSS)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    panelCount,
    transitionDuration,
    staggerOffset,
    motionBlurIntensity,
    scaleEffect,
    backgroundColor,
  } = params;

  // Helper: Calculate panel heights to create visual rhythm
  const calculatePanelHeights = (count: number): string[] => {
    const heightVariations = ['h-1/4', 'h-1/3', 'h-1/2', 'h-1/3', 'h-1/4'];
    const heights: string[] = [];
    for (let i = 0; i < count; i++) {
      heights.push(heightVariations[i % heightVariations.length]);
    }
    return heights;
  };

  // Helper: Calculate panel vertical positions
  const calculatePanelPositions = (
    count: number,
  ): Array<{ top: string; height: string }> => {
    const positions: Array<{ top: string; height: string }> = [];

    if (count === 4) {
      positions.push({ top: 'top-0', height: 'h-1/4' });
      positions.push({ top: 'top-1/4', height: 'h-1/3' });
      positions.push({ top: 'top-7/12', height: 'h-1/3' });
      positions.push({ top: 'top-3/4', height: 'h-1/4' });
    } else if (count === 5) {
      positions.push({ top: 'top-0', height: 'h-1/4' });
      positions.push({ top: 'top-1/4', height: 'h-1/3' });
      positions.push({ top: 'top-7/12', height: 'h-1/2' });
      positions.push({ top: 'top-3/4', height: 'h-1/4' });
      positions.push({ top: 'bottom-0', height: 'h-1/3' });
    } else {
      // count === 6
      positions.push({ top: 'top-0', height: 'h-1/6' });
      positions.push({ top: 'top-1/6', height: 'h-1/4' });
      positions.push({ top: 'top-5/12', height: 'h-1/3' });
      positions.push({ top: 'top-2/3', height: 'h-1/4' });
      positions.push({ top: 'top-5/6', height: 'h-1/6' });
      positions.push({ top: 'bottom-0', height: 'h-1/4' });
    }

    return positions;
  };

  const panelPositions = calculatePanelPositions(panelCount);

  // Create panel components with staggered animations
  const panelChildren: RenderableComponentData[] = [];

  for (let i = 0; i < panelCount; i++) {
    const panelId = `panel-${i + 1}`;
    const startOffset = i * staggerOffset;
    const position = panelPositions[i] || {
      top: `top-${i * 20}`,
      height: 'h-1/4',
    };

    // Build animation ranges
    const animationRanges: Array<{
      key: string;
      val: number | string;
      prog: number;
      unit?: string;
    }> = [
      // TranslateX: slide from left (-100%) to center (0%) to right (100%)
      { key: 'translateX', val: -100, prog: 0, unit: '%' },
      { key: 'translateX', val: 0, prog: 0.3, unit: '%' },
      { key: 'translateX', val: 0, prog: 0.7, unit: '%' },
      { key: 'translateX', val: 100, prog: 1, unit: '%' },
      // Motion blur: peaks during movement
      { key: 'blur', val: 0, prog: 0, unit: 'px' },
      { key: 'blur', val: motionBlurIntensity, prog: 0.15, unit: 'px' },
      { key: 'blur', val: motionBlurIntensity, prog: 0.85, unit: 'px' },
      { key: 'blur', val: 0, prog: 1, unit: 'px' },
    ];

    // Add scale effect if enabled
    if (scaleEffect) {
      animationRanges.push(
        { key: 'scale', val: 0.95, prog: 0 },
        { key: 'scale', val: 1, prog: 0.3 },
        { key: 'scale', val: 1, prog: 0.7 },
        { key: 'scale', val: 0.95, prog: 1 },
      );
    }

    const panelEffect = {
      id: `${panelId}-slide`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: startOffset,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [panelId],
        ranges: animationRanges,
      },
    };

    const panel: RenderableComponentData = {
      id: panelId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute left-0 w-full ${position.top} ${position.height} bg-gradient-to-r ${backgroundColor} backdrop-blur-md`,
          style: {
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [panelEffect],
      childrenData: [],
    };

    panelChildren.push(panel);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-panel-wipe-container',
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
      },
    },
    childrenData: panelChildren,
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

const presetMetadata: PresetMetadata = {
  id: 'cinematic-panel-wipe',
  title: 'Cinematic Panel Slide Wipe',
  description:
    'Professional broadcast-style wipe transition with 4-6 cascading horizontal panels. Each panel slides from left (-100%) to center (0%) to right (100%) with staggered timing offsets creating a domino wave effect. Features glass morphism with semi-transparent dark gradients, backdrop blur, and motion blur during movement. Optimized with GPU acceleration for smooth broadcast-quality transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'wipe',
    'panel',
    'cinematic',
    'broadcast',
    'professional',
    'glass-morphism',
    'motion-blur',
  ],
  defaultInputParams: {
    duration: 2.5,
    panelCount: 5,
    transitionDuration: 1.0,
    staggerOffset: 0.15,
    motionBlurIntensity: 4,
    scaleEffect: true,
    backgroundColor: 'from-black/80 to-black/60',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicPanelWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
