/**
 * Morphing Outline Effect Preset
 *
 * This preset creates a morphing outline effect that transforms between different stroke styles:
 * solid → dashed → dotted patterns. It animates CSS outline-style and SVG stroke-dasharray
 * properties to create dynamic border effects with smooth transitions between dash patterns.
 *
 * Features:
 * - **Multiple Morph Stages**: Configurable patterns with dash/gap lengths
 * - **Smooth Transitions**: Animates stroke-dasharray and stroke-dashoffset
 * - **SVG Support**: Works with SVG elements for images/videos using SVG filters
 * - **CSS Outlines**: Works with CSS outlines for text elements
 * - **Customizable Patterns**: Define custom dash lengths, gaps, and durations
 * - **Sequential Morphing**: Supports multiple pattern stages in sequence
 *
 * Use cases:
 * - Creating animated borders that morph between patterns
 * - Adding dynamic outline effects to videos and images
 * - Building attention-grabbing border animations
 * - Creating morphing text outlines for titles
 *
 * Technical Details:
 * - Effect type: Generic (AnimationRange[])
 * - Properties: stroke-dasharray, stroke-dashoffset
 * - Mode: provider (targets specific components)
 * - Supports CSS custom properties for dynamic values
 *
 * INTERNAL EFFECT:
 * Returns AnimationRange[] data for morphing outline animations that can be applied
 * to any target component via 'generic' effect with provider mode.
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
  targetId: z.string().describe('ID of the component to apply the morphing outline effect to'),
  
  patterns: z
    .array(
      z.object({
        dash: z.number().describe('Dash length in pixels'),
        gap: z.number().describe('Gap length in pixels'),
        duration: z.number().describe('Duration for this pattern stage in seconds'),
      })
    )
    .min(2)
    .describe('Array of patterns to morph between (minimum 2 patterns). Each pattern defines dash, gap, and duration.'),
  
  strokeWidth: z
    .string()
    .default('4px')
    .describe('Width of the stroke/outline (e.g., "4px", "6px")'),
  
  color: z
    .string()
    .default('#00ff00')
    .describe('Color of the stroke/outline (CSS color value)'),
  
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent component)'),
  
  effectDuration: z
    .number()
    .optional()
    .describe('Total duration of the effect. If not provided, calculated from pattern durations.'),
  
  loop: z
    .boolean()
    .default(false)
    .describe('Whether to loop the morphing animation'),
  
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Calculate total duration from patterns if not provided
  const calculateTotalDuration = (): number => {
    if (params.effectDuration) {
      return params.effectDuration;
    }
    return params.patterns.reduce((sum, pattern) => sum + pattern.duration, 0);
  };

  const totalDuration = calculateTotalDuration();

  // Generate keyframes for stroke-dasharray morphing
  const generateDasharrayRanges = () => {
    const ranges: Array<{ key: string; val: string; prog: number }> = [];
    let accumulatedTime = 0;

    params.patterns.forEach((pattern, index) => {
      const progress = accumulatedTime / totalDuration;
      const dasharrayValue = `${pattern.dash} ${pattern.gap}`;
      
      ranges.push({
        key: 'strokeDasharray',
        val: dasharrayValue,
        prog: progress,
      });

      accumulatedTime += pattern.duration;
    });

    // Add final keyframe
    if (params.loop) {
      // Loop back to first pattern
      ranges.push({
        key: 'strokeDasharray',
        val: `${params.patterns[0].dash} ${params.patterns[0].gap}`,
        prog: 1,
      });
    } else {
      // Hold last pattern
      const lastPattern = params.patterns[params.patterns.length - 1];
      ranges.push({
        key: 'strokeDasharray',
        val: `${lastPattern.dash} ${lastPattern.gap}`,
        prog: 1,
      });
    }

    return ranges;
  };

  // Generate keyframes for stroke-dashoffset animation (creates moving effect)
  const generateDashoffsetRanges = () => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    
    // Animate offset to create "marching ants" effect
    ranges.push(
      { key: 'strokeDashoffset', val: 0, prog: 0 },
      { key: 'strokeDashoffset', val: -30, prog: 1 }
    );

    return ranges;
  };

  // Generate keyframes for stroke color (optional, based on pattern)
  const generateStrokeColorRanges = () => {
    const ranges: Array<{ key: string; val: string; prog: number }> = [];
    
    // For now, use solid color, but could be extended to morph colors
    ranges.push(
      { key: 'stroke', val: params.color, prog: 0 },
      { key: 'stroke', val: params.color, prog: 1 }
    );

    return ranges;
  };

  // Generate keyframes for stroke width
  const generateStrokeWidthRanges = () => {
    const ranges: Array<{ key: string; val: string; prog: number }> = [];
    
    ranges.push(
      { key: 'strokeWidth', val: params.strokeWidth, prog: 0 },
      { key: 'strokeWidth', val: params.strokeWidth, prog: 1 }
    );

    return ranges;
  };

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear for smooth morphing
    start: params.effectStart,
    duration: totalDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      ...generateDasharrayRanges(),
      ...generateDashoffsetRanges(),
      ...generateStrokeColorRanges(),
      ...generateStrokeWidthRanges(),
    ],
  };

  // Create effect node
  const effect = {
    id: params.effectId || `morphing-outline-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Create demo container with target element
  const demoTargetId = 'morph-target-element';
  
  const demoTarget: RenderableComponentData = {
    id: demoTargetId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <svg width="400" height="400" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
          <rect
            x="50"
            y="50"
            width="300"
            height="300"
            fill="transparent"
            stroke="${params.color}"
            stroke-width="${params.strokeWidth}"
            stroke-dasharray="${params.patterns[0].dash} ${params.patterns[0].gap}"
          />
        </svg>
      `,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [effect],
  };

  const rootContainer: RenderableComponentData = {
    id: 'morphing-outline-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [demoTarget],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      // Also expose extracted effect for use by other presets
      _extractedEffects: [effect],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'morphing-outline-effect',
  title: 'Morphing Outline Effect',
  description:
    'Internal effect preset that generates morphing outline animations transforming between different stroke styles (solid, dashed, dotted). Animates CSS outline-style and SVG stroke-dasharray properties to create dynamic border effects with smooth transitions between dash patterns. Supports customizable dash lengths, gaps, and multiple morph stages in sequence.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'outline', 'stroke', 'morph', 'border', 'animation', 'internal'],
  defaultInputParams: {
    targetId: 'morph-target-element',
    patterns: [
      { dash: 0, gap: 0, duration: 0 }, // Solid
      { dash: 10, gap: 5, duration: 1 }, // Dashed
      { dash: 2, gap: 8, duration: 1 }, // Dotted
      { dash: 20, gap: 0, duration: 1 }, // Solid again
    ],
    strokeWidth: '4px',
    color: '#00ff00',
    effectStart: 0,
    loop: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

// Export preset
export const morphingOutlineEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};