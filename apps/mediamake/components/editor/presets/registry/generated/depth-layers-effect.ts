/**
 * DepthLayers Internal Effect Preset
 *
 * Creates parallax transparency effects simulating depth of field. Elements have
 * varying opacity and blur based on their perceived distance from a focal point,
 * with closer elements more opaque and distant ones more transparent and blurred.
 *
 * Features:
 * - Dynamic depth calculation based on target index and focal point
 * - Configurable opacity falloff (constrained to [0.2, 1])
 * - Blur radius scaling based on depth
 * - Optional parallax translation effects
 * - AutoFocus animation that cycles focal point through layers
 *
 * Technical Details:
 * - Depth = Math.abs(index - focalPoint) / layerCount
 * - Opacity = 1 - (depth * opacityFalloff), clamped to [0.2, 1]
 * - Blur = depth * blurRadius
 * - Returns array of AnimationRange effects for opacity, filter (blur), and translateX/Y
 *
 * Use cases:
 * - Creating cinematic depth in image galleries
 * - Layered video compositions with depth simulation
 * - Immersive text animations with focus effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the target component to apply depth effect'),
  targetIndex: z.number().min(0).describe('Index of the target element in the layer sequence (0-based)'),
  layerCount: z.number().min(1).describe('Total number of layers in the composition'),
  focalPoint: z.number().min(0).describe('Which layer index is in perfect focus (0 = first layer)'),
  depthRange: z.object({
    near: z.number().describe('Near distance value for depth mapping'),
    far: z.number().describe('Far distance value for depth mapping'),
  }).describe('Range defining near to far distance mapping'),
  opacityFalloff: z.number().min(0).max(1).describe('How quickly transparency increases with distance (0 = no falloff, 1 = maximum)'),
  blurRadius: z.number().min(0).max(20).describe('Maximum blur radius in pixels for distant layers'),
  parallaxIntensity: z.number().describe('Movement differential intensity for parallax effect (0 = no parallax)'),
  autoFocus: z.boolean().describe('Enable automatic focal point animation cycling through layers'),
  effectStart: z.number().describe('Start time of the effect in seconds (relative to component)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    targetIndex,
    layerCount,
    focalPoint,
    depthRange,
    opacityFalloff,
    blurRadius,
    parallaxIntensity,
    autoFocus,
    effectStart,
    effectDuration,
    effectId,
  } = params;

  // Helper: Calculate depth value for target
  const calculateDepth = (index: number, focal: number, count: number): number => {
    return Math.abs(index - focal) / count;
  };

  // Helper: Calculate opacity based on depth
  const calculateOpacity = (depth: number, falloff: number): number => {
    const rawOpacity = 1 - (depth * falloff);
    // Constrain to [0.2, 1]
    return Math.max(0.2, Math.min(1, rawOpacity));
  };

  // Helper: Calculate blur based on depth
  const calculateBlur = (depth: number, maxBlur: number): number => {
    return depth * maxBlur;
  };

  const effects: any[] = [];

  if (autoFocus) {
    // AutoFocus mode: Create cycling animation through focal points
    const cycleCount = Math.min(layerCount, 3); // Cycle through up to 3 focal points
    const progressPoints = cycleCount + 1; // Including start and end

    // Generate progress markers for cycling (0, 0.5, 1 for 2 cycles, etc.)
    const progressMarkers: number[] = [];
    for (let i = 0; i <= cycleCount; i++) {
      progressMarkers.push(i / cycleCount);
    }

    // Create opacity ranges with cycling focal points
    const opacityRanges: { key: string; val: number; prog: number }[] = [];
    const blurRanges: { key: string; val: string; prog: number }[] = [];
    const translateXRanges: { key: string; val: number; prog: number }[] = [];
    const translateYRanges: { key: string; val: number; prog: number }[] = [];

    for (let i = 0; i < progressMarkers.length; i++) {
      const prog = progressMarkers[i];
      // Cycle focal point through layers
      const currentFocal = Math.floor((i / progressMarkers.length) * layerCount) % layerCount;
      
      const depth = calculateDepth(targetIndex, currentFocal, layerCount);
      const opacity = calculateOpacity(depth, opacityFalloff);
      const blur = calculateBlur(depth, blurRadius);
      
      // Parallax translation based on depth
      const parallaxX = depth * parallaxIntensity * 50; // 50px base movement
      const parallaxY = depth * parallaxIntensity * 30; // 30px vertical movement

      opacityRanges.push({ key: 'opacity', val: opacity, prog });
      blurRanges.push({ key: 'filter', val: `blur(${blur.toFixed(2)}px)`, prog });
      
      if (parallaxIntensity > 0) {
        translateXRanges.push({ key: 'translateX', val: parallaxX, prog });
        translateYRanges.push({ key: 'translateY', val: parallaxY, prog });
      }
    }

    // Create single effect with all animation ranges
    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        ...opacityRanges,
        ...blurRanges,
        ...(parallaxIntensity > 0 ? [...translateXRanges, ...translateYRanges] : []),
      ],
    };

    effects.push({
      id: effectId || `depth-layers-autofocus-${targetId}`,
      componentId: 'generic',
      data: effectData,
    });
  } else {
    // Static focal point mode
    const depth = calculateDepth(targetIndex, focalPoint, layerCount);
    const opacity = calculateOpacity(depth, opacityFalloff);
    const blur = calculateBlur(depth, blurRadius);

    // Create static effect
    const ranges: { key: string; val: any; prog: number }[] = [
      { key: 'opacity', val: opacity, prog: 0 },
      { key: 'opacity', val: opacity, prog: 1 },
      { key: 'filter', val: `blur(${blur.toFixed(2)}px)`, prog: 0 },
      { key: 'filter', val: `blur(${blur.toFixed(2)}px)`, prog: 1 },
    ];

    // Add parallax if enabled
    if (parallaxIntensity > 0) {
      const parallaxX = depth * parallaxIntensity * 50;
      const parallaxY = depth * parallaxIntensity * 30;
      
      ranges.push(
        { key: 'translateX', val: parallaxX, prog: 0 },
        { key: 'translateX', val: parallaxX, prog: 1 },
        { key: 'translateY', val: parallaxY, prog: 0 },
        { key: 'translateY', val: parallaxY, prog: 1 },
      );
    }

    const effectData: GenericEffectData = {
      type: 'linear',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };

    effects.push({
      id: effectId || `depth-layers-static-${targetId}`,
      componentId: 'generic',
      data: effectData,
    });
  }

  return {
    output: {
      childrenData: [
        {
          id: 'depth-layers-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: effectDuration,
            },
          },
        } as RenderableComponentData,
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'depthLayersEffect',
  title: 'DepthLayers Effect',
  description: 'Internal effect preset that creates parallax transparency effects simulating depth of field. Calculates depth value per target based on index and focalPoint, applies opacity falloff (constrained to [0.2, 1]), blur radius scaling, and optional parallax translation. Returns AnimationRange[] effects for opacity, blur (filter), and translateX/Y properties. Supports autoFocus animation that cycles focal point through layers.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'depth', 'parallax', 'blur', 'opacity', 'focus', 'layers', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    targetId: 'layer-0',
    targetIndex: 0,
    layerCount: 5,
    focalPoint: 2,
    depthRange: {
      near: 0,
      far: 1,
    },
    opacityFalloff: 0.8,
    blurRadius: 10,
    parallaxIntensity: 0.5,
    autoFocus: false,
    effectStart: 0,
    effectDuration: 5,
  },
};

export const depthLayersEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
