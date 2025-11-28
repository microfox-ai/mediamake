/**
 * BlurFocusSequence Internal Effect Preset
 *
 * This internal effect preset creates depth-of-field focus transitions across elements using blur filters.
 * Elements start blurred and come into sharp focus sequentially, simulating a camera rack focus effect.
 *
 * Features:
 * - **Blur-based depth simulation**: Uses blur and brightness adjustments for realistic depth-of-field
 * - **Multiple focus orders**: Sequential, random, center-out, edges-in strategies
 * - **Depth layers**: Group elements into focus planes that transition together
 * - **Hold focus control**: Elements can stay in focus or blur back after focusing
 * - **Brightness adjustment**: Subtle brightness changes enhance depth realism
 *
 * Use cases:
 * - Creating cinematic focus transitions across multiple elements
 * - Simulating camera rack focus effects in static compositions
 * - Drawing viewer attention through selective focus
 * - Building depth hierarchy in flat designs
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to apply blur focus transitions to'),
  maxBlur: z.number().min(0).default(10).describe('Maximum blur radius in pixels'),
  focusDuration: z.number().min(0).default(1000).describe('Time for each element to come into focus in milliseconds'),
  focusOrder: z.enum(['sequential', 'random', 'center-out', 'edges-in']).default('sequential').describe('Order in which elements come into focus'),
  holdFocus: z.boolean().default(true).describe('Whether elements stay in focus or blur back after focusing'),
  depthLayers: z.number().min(1).default(1).describe('Number of depth layers to group elements into (elements in same layer focus together)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { targetIds, maxBlur, focusDuration, focusOrder, holdFocus, depthLayers } = params;

  // Helper function to calculate focus delay based on strategy
  const calculateFocusDelay = (index: number, total: number, order: string): number => {
    const focusDurationSec = focusDuration / 1000;
    
    switch (order) {
      case 'sequential':
        return index * focusDurationSec;
      
      case 'random': {
        // Create deterministic but shuffled indices
        const indices = Array.from({ length: total }, (_, i) => i);
        // Simple deterministic shuffle based on index
        const shuffled = [...indices].sort((a, b) => {
          const hashA = (a * 2654435761) % 2147483648;
          const hashB = (b * 2654435761) % 2147483648;
          return hashA - hashB;
        });
        return shuffled.indexOf(index) * focusDurationSec;
      }
      
      case 'center-out': {
        const center = Math.floor(total / 2);
        const distance = Math.abs(index - center);
        return distance * focusDurationSec;
      }
      
      case 'edges-in': {
        const center = Math.floor(total / 2);
        const distanceFromEdge = Math.min(index, total - 1 - index);
        return distanceFromEdge * focusDurationSec;
      }
      
      default:
        return index * focusDurationSec;
    }
  };

  // Helper function to assign elements to depth layers
  const assignDepthLayer = (index: number, total: number, layers: number): number => {
    return Math.floor((index * layers) / total);
  };

  // Group elements by depth layer if needed
  const layeredTargets: Map<number, string[]> = new Map();
  
  targetIds.forEach((id, index) => {
    const layer = assignDepthLayer(index, targetIds.length, depthLayers);
    if (!layeredTargets.has(layer)) {
      layeredTargets.set(layer, []);
    }
    layeredTargets.get(layer)!.push(id);
  });

  // Create effects for each depth layer
  const effects: any[] = [];
  let layerIndex = 0;

  layeredTargets.forEach((ids, layer) => {
    // Calculate delay for this layer (use first element's position in original array)
    const firstElementIndex = targetIds.indexOf(ids[0]);
    const delay = calculateFocusDelay(firstElementIndex, targetIds.length, focusOrder);

    // Create blur animation ranges
    const blurRanges: Array<{ key: string; val: any; prog: number }> = [
      { key: 'blur', val: maxBlur, prog: 0 },
      { key: 'blur', val: 0, prog: 0.5 },
      { key: 'blur', val: holdFocus ? 0 : maxBlur, prog: 1 },
    ];

    // Create brightness animation ranges (simulates depth-of-field brightness falloff)
    const brightnessRanges: Array<{ key: string; val: any; prog: number }> = [
      { key: 'brightness', val: 0.7, prog: 0 },
      { key: 'brightness', val: 1, prog: 0.5 },
      { key: 'brightness', val: holdFocus ? 1 : 0.7, prog: 1 },
    ];

    // Create effect for this layer
    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: delay,
      duration: focusDuration / 1000,
      mode: 'provider',
      targetIds: ids,
      ranges: [...blurRanges, ...brightnessRanges],
    };

    effects.push({
      id: `blur-focus-layer-${layerIndex}`,
      componentId: 'generic',
      data: effectData,
    });

    layerIndex++;
  });

  // Return container with effects
  const rootContainer: RenderableComponentData = {
    id: 'blur-focus-root',
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
        duration: 10, // Default duration, will be adjusted by parent
      },
    },
    effects,
    childrenData: [],
  };

  return {
    output: {
      _extractedEffects: effects, // Allow extraction of effects array
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'BlurFocusSequence',
  title: 'BlurFocusSequence Internal Effect',
  description: 'Internal effect preset that uses blur filters to create a depth-of-field focus transition across elements. Elements start blurred and come into sharp focus sequentially, simulating a camera rack focus effect with depth layers and brightness adjustments.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'blur', 'focus', 'depth-of-field', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['element-1', 'element-2', 'element-3'],
    maxBlur: 10,
    focusDuration: 1000,
    focusOrder: 'sequential',
    holdFocus: true,
    depthLayers: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const BlurFocusSequencePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
