/**
 * LiquidMorphTransition Internal Effect Preset
 *
 * SINGLE EFFECT (ARRAY OF EFFECTS):
 * Creates smooth, liquid-like morphing transitions between states with complex bezier curves,
 * scale overshoot, rotate wobble, figure-8 path animation, and morphing blur.
 * Returns a generic effect with multiple animation ranges for organic motion.
 *
 * Features:
 * - Complex scale overshoot sequence (1.0 → 1.2 → 0.95 → 1.05 → 1.0)
 * - Rotate wobble effect (-5deg → 8deg → -3deg → 0deg)
 * - Figure-8 path animation using translateX/Y with 8+ keyframes
 * - Morphing blur that peaks mid-transition (0 → 5px → 0)
 * - Multiple morph styles: splash, drip, bubble, flow
 * - Configurable transition duration, overshoot amount, and elasticity
 *
 * Use cases:
 * - Creating liquid-like UI state transitions
 * - Adding organic motion to element transformations
 * - Professional morphing effects for smooth state changes
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('IDs of components to target with the liquid morph effect'),
  morphStyle: z
    .enum(['splash', 'drip', 'bubble', 'flow'])
    .optional()
    .describe('Style of liquid morphing animation'),
  transitionDuration: z
    .number()
    .optional()
    .describe('Duration of the transition in milliseconds (default: 800ms)'),
  overshootAmount: z
    .number()
    .optional()
    .describe('How far past the target the animation goes (default: 1.2 for 20% overshoot)'),
  elasticity: z
    .number()
    .optional()
    .describe('Spring tension/elasticity factor (default: 0.7, range: 0-1)'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent (seconds)'),
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
  // Helper function to generate figure-8 path coordinates
  const generateFigure8Path = (
    morphStyle: string,
    amplitude: number,
  ): Array<{ x: number; y: number; prog: number }> => {
    const points: Array<{ x: number; y: number; prog: number }> = [];
    const steps = 9; // 9 keyframes for smooth figure-8

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const angle = t * Math.PI * 2; // Full rotation

      let x: number;
      let y: number;

      switch (morphStyle) {
        case 'splash':
          // Explosive outward then return
          x = Math.sin(angle * 2) * amplitude * (1 - Math.abs(t - 0.5) * 2);
          y = Math.cos(angle * 2) * amplitude * (1 - Math.abs(t - 0.5) * 2);
          break;
        case 'drip':
          // Downward then upward motion
          x = Math.sin(angle) * amplitude * 0.3;
          y = Math.sin(angle * 2) * amplitude * (t < 0.5 ? t * 2 : (1 - t) * 2);
          break;
        case 'bubble':
          // Circular floating motion
          x = Math.sin(angle) * amplitude;
          y = Math.cos(angle) * amplitude;
          break;
        case 'flow':
        default:
          // Figure-8 pattern
          x = Math.sin(angle) * amplitude;
          y = Math.sin(angle * 2) * amplitude * 0.5;
          break;
      }

      points.push({ x, y, prog: t });
    }

    return points;
  };

  // Get parameters with defaults
  const morphStyle = params.morphStyle || 'flow';
  const transitionDuration = params.transitionDuration || 800;
  const overshootAmount = params.overshootAmount || 1.2;
  const elasticity = params.elasticity || 0.7;
  const effectStart = params.effectStart;
  const targetIds = params.targetIds;

  // Calculate duration in seconds
  const durationInSeconds = transitionDuration / 1000;

  // Generate figure-8 path based on morph style
  const pathAmplitude = morphStyle === 'splash' ? 50 : morphStyle === 'drip' ? 30 : 40;
  const figure8Points = generateFigure8Path(morphStyle, pathAmplitude);

  // Build animation ranges
  const ranges: Array<{ key: string; val: any; prog: number }> = [];

  // Scale overshoot sequence: 1.0 → 1.2 → 0.95 → 1.05 → 1.0
  ranges.push(
    { key: 'scale', val: 1.0, prog: 0 },
    { key: 'scale', val: overshootAmount, prog: 0.3 },
    { key: 'scale', val: 0.95, prog: 0.5 },
    { key: 'scale', val: 1.05, prog: 0.8 },
    { key: 'scale', val: 1.0, prog: 1 },
  );

  // Rotate wobble: -5deg → 8deg → -3deg → 0deg
  ranges.push(
    { key: 'rotate', val: -5, prog: 0 },
    { key: 'rotate', val: 8, prog: 0.35 },
    { key: 'rotate', val: -3, prog: 0.65 },
    { key: 'rotate', val: 0, prog: 1 },
  );

  // Figure-8 path animation with translateX and translateY
  figure8Points.forEach((point) => {
    ranges.push(
      { key: 'translateX', val: point.x, prog: point.prog },
      { key: 'translateY', val: point.y, prog: point.prog },
    );
  });

  // Morphing blur: 0 → 5px → 0
  ranges.push(
    { key: 'blur', val: '0px', prog: 0 },
    { key: 'blur', val: '5px', prog: 0.5 },
    { key: 'blur', val: '0px', prog: 1 },
  );

  // Create the generic effect
  const effectData: GenericEffectData = {
    type: 'spring',
    start: effectStart,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: ranges,
    elasticity: elasticity,
  };

  const effect = {
    id: params.effectId || `liquid-morph-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  // Return in container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'liquid-morph-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: -1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: durationInSeconds,
      },
    },
    effects: [effect],
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
  id: 'LiquidMorphTransition',
  title: 'LiquidMorphTransition',
  description:
    'Internal effect preset that creates smooth, liquid-like morphing transitions between states with complex bezier curves, scale overshoot, rotate wobble, figure-8 path animation, and morphing blur. Returns effect configuration objects for use in other presets.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'liquid', 'morph', 'transition', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    morphStyle: 'flow',
    transitionDuration: 800,
    overshootAmount: 1.2,
    elasticity: 0.7,
    effectStart: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const LiquidMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
