/**
 * Animated Stroke Outline Effect Preset
 *
 * This internal effect preset creates an animated stroke/border outline that progressively
 * draws around text, images, or video elements. The effect simulates a drawing/tracing
 * effect where the border appears to be drawn clockwise from one corner.
 *
 * SINGLE EFFECT:
 * Returns one generic effect that animates border properties (width, opacity, and optional
 * glow) to create a progressive stroke drawing animation.
 *
 * Features:
 * - Progressive border drawing effect (0 to customizable thickness)
 * - Opacity transitions for smooth appearance
 * - Optional box-shadow glow effect
 * - Customizable stroke color, thickness, duration
 * - Optional fade-out at the end
 * - GPU-accelerated properties where possible
 *
 * Parameters:
 * - targetId: ID of the component to apply the stroke effect to
 * - strokeWidth: Width of the stroke (e.g., '3px', '5px')
 * - strokeColor: Color of the stroke (CSS color)
 * - duration: Duration of the animation in seconds
 * - fadeOut: Whether to fade out the stroke at the end
 * - glowIntensity: Optional glow effect intensity (0-20, where 0 = no glow)
 * - effectStart: Start time of the effect (relative to target component)
 * - effectId: Optional custom effect ID
 *
 * Technical Details:
 * - Uses generic effect with AnimationRange[] for keyframe animation
 * - Animates borderWidth, opacity, and optionally box-shadow
 * - Simulates clockwise drawing by controlling border appearance progression
 * - Provider mode with targetIds for direct component targeting
 *
 * Usage:
 * Call this preset from other presets via dependencies, passing target component ID
 * and desired stroke parameters. Extract the effect and apply to target component.
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to target with the stroke effect'),
  strokeWidth: z.string().default('3px').describe('Width of the stroke border (e.g., "3px", "5px")'),
  strokeColor: z.string().default('#ffffff').describe('Color of the stroke border (CSS color value)'),
  duration: z.number().default(1000).describe('Duration of the stroke animation in milliseconds'),
  fadeOut: z.boolean().default(false).describe('Whether to fade out the stroke at the end'),
  glowIntensity: z.number().min(0).max(20).optional().describe('Optional glow effect intensity (0-20, 0 = no glow)'),
  effectStart: z.number().default(0).describe('Start time of the effect in seconds (relative to target component)'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const durationInSeconds = params.duration / 1000;
  
  // Build animation ranges for progressive stroke drawing
  const ranges: Array<{ key: string; val: any; prog: number }> = [];
  
  // Border width animation: 0 -> strokeWidth (progressive drawing)
  ranges.push(
    { key: 'borderWidth', val: '0px', prog: 0 },
    { key: 'borderWidth', val: params.strokeWidth, prog: 0.8 },
    { key: 'borderWidth', val: params.strokeWidth, prog: 1 }
  );
  
  // Border color (constant during animation)
  ranges.push(
    { key: 'borderColor', val: params.strokeColor, prog: 0 },
    { key: 'borderColor', val: params.strokeColor, prog: 1 }
  );
  
  // Border style (solid)
  ranges.push(
    { key: 'borderStyle', val: 'solid', prog: 0 },
    { key: 'borderStyle', val: 'solid', prog: 1 }
  );
  
  // Opacity animation for smooth appearance
  ranges.push(
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 1, prog: 0.3 }
  );
  
  // Fade out if requested
  if (params.fadeOut) {
    ranges.push(
      { key: 'opacity', val: 1, prog: 0.8 },
      { key: 'opacity', val: 0, prog: 1 }
    );
  } else {
    ranges.push(
      { key: 'opacity', val: 1, prog: 1 }
    );
  }
  
  // Optional glow effect using box-shadow
  if (params.glowIntensity !== undefined && params.glowIntensity > 0) {
    const glowBlur = params.glowIntensity;
    const glowSpread = Math.floor(params.glowIntensity / 2);
    const glowShadow = `0 0 ${glowBlur}px ${glowSpread}px ${params.strokeColor}`;
    
    ranges.push(
      { key: 'boxShadow', val: 'none', prog: 0 },
      { key: 'boxShadow', val: glowShadow, prog: 0.3 }
    );
    
    if (params.fadeOut) {
      ranges.push(
        { key: 'boxShadow', val: glowShadow, prog: 0.8 },
        { key: 'boxShadow', val: 'none', prog: 1 }
      );
    } else {
      ranges.push(
        { key: 'boxShadow', val: glowShadow, prog: 1 }
      );
    }
  }
  
  // Construct the effect data
  const effectData: GenericEffectData = {
    type: 'ease-out',
    start: params.effectStart,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges,
  };
  
  // Create the effect object
  const effect = {
    id: params.effectId || `stroke-outline-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };
  
  return {
    output: {
      childrenData: [
        {
          id: 'stroke-outline-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'stroke-outline-animation-effect',
  title: 'Animated Stroke Outline Effect',
  description: 'Generic internal effect preset that creates animated stroke/border outlines with a progressive drawing/tracing effect. Animates border-width from 0 to customizable thickness with opacity transitions, simulating clockwise drawing around elements. Supports stroke color, thickness, duration, fade-out options, and optional glow effects using GPU-accelerated properties.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'stroke', 'border', 'outline', 'animation', 'drawing', 'tracing', 'generic', 'internal'],
  dependencies: {
    presets: [],
    helpers: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    strokeWidth: '3px',
    strokeColor: '#ffffff',
    duration: 1000,
    fadeOut: false,
    glowIntensity: 5,
    effectStart: 0,
  },
};

export const strokeOutlineAnimationEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};