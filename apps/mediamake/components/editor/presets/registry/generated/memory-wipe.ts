/**
 * MemoryWipe Instant Visibility Effect Preset
 *
 * This preset simulates memory allocation/deallocation in computer systems with instant
 * state changes and visual memory addressing artifacts. Elements appear (allocate) or
 * disappear (free) instantly, accompanied by a scanline effect representing the memory pointer.
 *
 * Features:
 * - **Instant State Changes**: Elements appear/disappear instantly like RAM allocation
 * - **Scanline Pointer**: Brief horizontal line effect showing memory pointer movement
 * - **Memory Patterns**: Sequential, random, or fragmented memory allocation patterns
 * - **Wipe Direction**: 'allocate' (appear) or 'free' (disappear) modes
 * - **Configurable Scanline**: Customizable color and speed for the pointer effect
 *
 * Use cases:
 * - Tech/programming content transitions
 * - System process visualization
 * - Computer-themed video effects
 * - Debug/analytics overlays with tech aesthetic
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the memory wipe effect to'),
  wipeDirection: z
    .enum(['allocate', 'free'])
    .describe(
      "Direction of memory operation: 'allocate' (appear) or 'free' (disappear)",
    ),
  scanlineColor: z
    .string()
    .default('#00FF00')
    .describe('Color of the scanline pointer (CSS color value)'),
  pointerSpeed: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.1)
    .describe('Speed/duration of the memory pointer effect in seconds'),
  memoryPattern: z
    .enum(['sequential', 'random', 'fragmented'])
    .default('sequential')
    .describe(
      "Memory allocation pattern: 'sequential' (smooth), 'random' (unpredictable), 'fragmented' (flickering)",
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    wipeDirection,
    scanlineColor,
    pointerSpeed,
    memoryPattern,
  } = params;

  // Helper function to create opacity ranges based on pattern
  const createOpacityRanges = (
    direction: 'allocate' | 'free',
    pattern: 'sequential' | 'random' | 'fragmented',
  ) => {
    const initialOpacity = direction === 'allocate' ? 0 : 1;
    const finalOpacity = direction === 'allocate' ? 1 : 0;

    if (pattern === 'fragmented') {
      // Fragmented: multiple flickers before final state
      return [
        { key: 'opacity', val: initialOpacity, prog: 0 },
        { key: 'opacity', val: finalOpacity, prog: 0.01 },
        { key: 'opacity', val: initialOpacity, prog: 0.015 },
        { key: 'opacity', val: finalOpacity, prog: 0.02 },
        { key: 'opacity', val: initialOpacity, prog: 0.025 },
        { key: 'opacity', val: finalOpacity, prog: 0.03 },
        { key: 'opacity', val: initialOpacity, prog: 0.035 },
        { key: 'opacity', val: finalOpacity, prog: 0.05 },
      ];
    } else {
      // Sequential/Random: instant change
      return [
        { key: 'opacity', val: initialOpacity, prog: 0 },
        { key: 'opacity', val: finalOpacity, prog: 0.001 },
        { key: 'opacity', val: finalOpacity, prog: 1 },
      ];
    }
  };

  // Helper function to create scanline box-shadow effect
  const createScanlineRanges = () => {
    const scanlineStart = 0.001;
    const scanlineMiddle = pointerSpeed / 2;
    const scanlineEnd = pointerSpeed;

    // Scanline appears as a horizontal line using box-shadow
    const scanlineValue = `0 0 2px 2px ${scanlineColor}, 0 1px 0 0 ${scanlineColor}, 0 -1px 0 0 ${scanlineColor}`;

    return [
      { key: 'boxShadow', val: 'none', prog: 0 },
      { key: 'boxShadow', val: scanlineValue, prog: scanlineStart },
      { key: 'boxShadow', val: scanlineValue, prog: scanlineMiddle },
      { key: 'boxShadow', val: 'none', prog: scanlineEnd },
    ];
  };

  // Create effects array for each target
  const effects: RenderableComponentData['effects'] = [];

  targetIds.forEach((targetId, index) => {
    // Calculate stagger for random pattern
    const stagger = memoryPattern === 'random' ? Math.random() * 0.02 : 0;

    // Base visibility effect (instant opacity change)
    const visibilityEffect = {
      id: `memory-visibility-${targetId}-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: stagger,
        duration: pointerSpeed + 0.05,
        mode: 'provider',
        targetIds: [targetId],
        ranges: createOpacityRanges(wipeDirection, memoryPattern),
      } as GenericEffectData,
    };

    // Scanline pointer effect
    const scanlineEffect = {
      id: `memory-scanline-${targetId}-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: stagger,
        duration: pointerSpeed + 0.05,
        mode: 'provider',
        targetIds: [targetId],
        ranges: createScanlineRanges(),
      } as GenericEffectData,
    };

    effects.push(visibilityEffect, scanlineEffect);
  });

  // Create root container with effects
  const rootContainer: RenderableComponentData = {
    id: 'memory-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: pointerSpeed + 0.1,
      },
    },
    effects,
    childrenData: [],
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
  id: 'memory-wipe',
  title: 'MemoryWipe',
  description:
    'Instant visibility effect simulating RAM memory allocation/deallocation with scanline pointer artifacts. Elements appear (allocate) or disappear (free) instantly with a brief horizontal scanline representing the memory pointer. Supports sequential, random, and fragmented memory patterns.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'visibility', 'instant', 'tech', 'memory', 'computer'],
  defaultInputParams: {
    targetIds: ['component-1'],
    wipeDirection: 'allocate',
    scanlineColor: '#00FF00',
    pointerSpeed: 0.1,
    memoryPattern: 'sequential',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const memoryWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
