/**
 * Paper Fold Effect Preset
 *
 * This internal effect preset simulates realistic paper folding and unfolding using 2D CSS
 * transformations combined with dynamically calculated gradients and shadows to create the
 * illusion of light hitting folded surfaces. The effect uses rotation combined with 
 * background gradients and box shadows that adjust based on the fold angle and light source
 * position to create a tactile, material design effect.
 *
 * SINGLE EFFECT or ARRAY OF EFFECTS:
 * Returns a single effect node or an array of effects (for accordion/origami sequences)
 * depending on foldSequence parameter.
 *
 * Features:
 * - Mountain or valley fold types with different shadow characteristics
 * - Adjustable fold angle (rotation amount)
 * - Paper thickness parameter affecting shadow intensity
 * - Configurable light source position for realistic lighting simulation
 * - Support for multiple fold sequences and accordion-style folds
 * - Origami-like transformation capabilities
 * - Dynamic CSS gradient updates based on rotation for lighting realism
 * - All effects use mode: 'provider' with targetIds
 *
 * Technical Implementation:
 * - Rotation: CSS rotate property for fold angle
 * - Lighting: Linear gradients calculated based on light angle and fold angle
 * - Shadows: Box shadows with intensity based on thickness and fold type
 * - Filters: Brightness/contrast adjustments for depth perception
 *
 * Use cases:
 * - Creating paper-like fold animations for cards or panels
 * - Adding material design depth effects to UI elements
 * - Building origami-style transformations
 * - Simulating realistic paper behavior in 2D space
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the paper fold effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z
    .number()
    .default(2)
    .describe('Duration of the fold animation in seconds'),
  foldAngle: z
    .number()
    .min(-180)
    .max(180)
    .default(90)
    .describe('Maximum fold angle in degrees (positive for mountain, negative for reverse)'),
  foldType: z
    .enum(['mountain', 'valley'])
    .default('mountain')
    .describe('Type of fold: mountain (convex) or valley (concave)'),
  thickness: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Paper thickness affecting shadow intensity (0.1 = thin, 3 = thick)'),
  lightAngle: z
    .number()
    .min(0)
    .max(360)
    .default(135)
    .describe('Light source angle in degrees (0 = right, 90 = top, 180 = left, 270 = bottom)'),
  foldSequence: z
    .array(z.string())
    .default(['unfold-to-fold'])
    .describe('Array of fold sequence steps: "unfold-to-fold", "fold-to-unfold", "accordion", "origami-crane", "fan-fold"'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Calculate gradient based on rotation angle and light source
  const calculateGradient = (
    rotationDeg: number,
    lightAngleDeg: number,
    foldType: 'mountain' | 'valley',
  ): string => {
    // Normalize angles
    const normalizedRotation = ((rotationDeg % 360) + 360) % 360;
    const normalizedLight = ((lightAngleDeg % 360) + 360) % 360;

    // Calculate light direction relative to fold
    const relativeLightAngle = normalizedLight - normalizedRotation;

    // Determine if light is hitting the front or back of the fold
    const isFrontLit = Math.abs(relativeLightAngle) < 90 || Math.abs(relativeLightAngle) > 270;

    // Calculate gradient angle (perpendicular to fold line)
    const gradientAngle = normalizedRotation + 90;

    // Determine brightness based on light angle and fold type
    let brightnessFactor: number;
    if (foldType === 'mountain') {
      brightnessFactor = isFrontLit ? 1.2 : 0.7;
    } else {
      // Valley fold (inverted lighting)
      brightnessFactor = isFrontLit ? 0.7 : 1.2;
    }

    // Create gradient with lighting effect
    const lightColor = `rgba(255, 255, 255, ${0.2 * brightnessFactor})`;
    const shadowColor = `rgba(0, 0, 0, ${0.3 * (1 / brightnessFactor)})`;

    return `linear-gradient(${gradientAngle}deg, ${shadowColor} 0%, transparent 30%, transparent 70%, ${lightColor} 100%)`;
  };

  // Helper: Calculate box shadow based on fold angle and thickness
  const calculateBoxShadow = (
    rotationDeg: number,
    thickness: number,
    foldType: 'mountain' | 'valley',
  ): string => {
    const normalizedRotation = Math.abs(rotationDeg);
    const shadowIntensity = (normalizedRotation / 90) * thickness;

    // Calculate shadow offset based on fold type
    const offsetX = foldType === 'mountain' ? shadowIntensity * 3 : -shadowIntensity * 3;
    const offsetY = shadowIntensity * 2;
    const blur = shadowIntensity * 10;
    const spread = shadowIntensity * 0.5;

    const shadowAlpha = Math.min(0.4 * thickness, 0.6);

    return `${offsetX}px ${offsetY}px ${blur}px ${spread}px rgba(0, 0, 0, ${shadowAlpha})`;
  };

  // Helper: Calculate filter values for depth perception
  const calculateFilter = (rotationDeg: number, foldType: 'mountain' | 'valley'): string => {
    const normalizedRotation = Math.abs(rotationDeg);
    const foldProgress = normalizedRotation / 90;

    const brightness = foldType === 'mountain' ? 1 - foldProgress * 0.1 : 1 + foldProgress * 0.1;
    const contrast = 1 + foldProgress * 0.15;

    return `brightness(${brightness}) contrast(${contrast})`;
  };

  // Helper: Generate fold sequence ranges
  const generateFoldRanges = (
    sequence: string[],
    foldAngle: number,
    lightAngle: number,
    foldType: 'mountain' | 'valley',
    thickness: number,
  ): any[] => {
    const ranges: any[] = [];

    sequence.forEach((step, index) => {
      const stepStart = index / sequence.length;
      const stepEnd = (index + 1) / sequence.length;
      const stepMid = (stepStart + stepEnd) / 2;

      switch (step) {
        case 'unfold-to-fold':
          // Start unfolded (0deg) -> fold to target angle
          ranges.push(
            { key: 'rotate', val: 0, prog: stepStart },
            { key: 'rotate', val: foldAngle, prog: stepEnd },
            { key: 'background', val: calculateGradient(0, lightAngle, foldType), prog: stepStart },
            { key: 'background', val: calculateGradient(foldAngle, lightAngle, foldType), prog: stepEnd },
            { key: 'boxShadow', val: calculateBoxShadow(0, thickness, foldType), prog: stepStart },
            { key: 'boxShadow', val: calculateBoxShadow(foldAngle, thickness, foldType), prog: stepEnd },
            { key: 'filter', val: calculateFilter(0, foldType), prog: stepStart },
            { key: 'filter', val: calculateFilter(foldAngle, foldType), prog: stepEnd },
          );
          break;

        case 'fold-to-unfold':
          // Start folded -> unfold to 0deg
          ranges.push(
            { key: 'rotate', val: foldAngle, prog: stepStart },
            { key: 'rotate', val: 0, prog: stepEnd },
            { key: 'background', val: calculateGradient(foldAngle, lightAngle, foldType), prog: stepStart },
            { key: 'background', val: calculateGradient(0, lightAngle, foldType), prog: stepEnd },
            { key: 'boxShadow', val: calculateBoxShadow(foldAngle, thickness, foldType), prog: stepStart },
            { key: 'boxShadow', val: calculateBoxShadow(0, thickness, foldType), prog: stepEnd },
            { key: 'filter', val: calculateFilter(foldAngle, foldType), prog: stepStart },
            { key: 'filter', val: calculateFilter(0, foldType), prog: stepEnd },
          );
          break;

        case 'accordion':
          // Accordion effect: fold, unfold partially, fold again
          const quarterAngle = foldAngle / 4;
          ranges.push(
            { key: 'rotate', val: 0, prog: stepStart },
            { key: 'rotate', val: foldAngle, prog: stepMid - 0.1 },
            { key: 'rotate', val: quarterAngle, prog: stepMid },
            { key: 'rotate', val: foldAngle, prog: stepEnd },
            { key: 'background', val: calculateGradient(0, lightAngle, foldType), prog: stepStart },
            { key: 'background', val: calculateGradient(foldAngle, lightAngle, foldType), prog: stepMid },
            { key: 'background', val: calculateGradient(foldAngle, lightAngle, foldType), prog: stepEnd },
            { key: 'boxShadow', val: calculateBoxShadow(0, thickness, foldType), prog: stepStart },
            { key: 'boxShadow', val: calculateBoxShadow(foldAngle, thickness, foldType), prog: stepEnd },
            { key: 'filter', val: calculateFilter(0, foldType), prog: stepStart },
            { key: 'filter', val: calculateFilter(foldAngle, foldType), prog: stepEnd },
          );
          break;

        case 'origami-crane':
          // Complex origami-like fold sequence with multiple angles
          ranges.push(
            { key: 'rotate', val: 0, prog: stepStart },
            { key: 'rotate', val: foldAngle * 0.33, prog: stepStart + 0.1 },
            { key: 'rotate', val: foldAngle * 0.66, prog: stepMid },
            { key: 'rotate', val: foldAngle, prog: stepEnd },
            { key: 'background', val: calculateGradient(0, lightAngle, foldType), prog: stepStart },
            { key: 'background', val: calculateGradient(foldAngle * 0.5, lightAngle, foldType), prog: stepMid },
            { key: 'background', val: calculateGradient(foldAngle, lightAngle, foldType), prog: stepEnd },
            { key: 'boxShadow', val: calculateBoxShadow(0, thickness, foldType), prog: stepStart },
            { key: 'boxShadow', val: calculateBoxShadow(foldAngle, thickness, foldType), prog: stepEnd },
            { key: 'filter', val: calculateFilter(0, foldType), prog: stepStart },
            { key: 'filter', val: calculateFilter(foldAngle, foldType), prog: stepEnd },
          );
          break;

        case 'fan-fold':
          // Fan-like opening/closing with oscillation
          ranges.push(
            { key: 'rotate', val: foldAngle, prog: stepStart },
            { key: 'rotate', val: foldAngle * 0.2, prog: stepMid - 0.1 },
            { key: 'rotate', val: foldAngle * 0.6, prog: stepMid },
            { key: 'rotate', val: 0, prog: stepEnd },
            { key: 'background', val: calculateGradient(foldAngle, lightAngle, foldType), prog: stepStart },
            { key: 'background', val: calculateGradient(0, lightAngle, foldType), prog: stepEnd },
            { key: 'boxShadow', val: calculateBoxShadow(foldAngle, thickness, foldType), prog: stepStart },
            { key: 'boxShadow', val: calculateBoxShadow(0, thickness, foldType), prog: stepEnd },
            { key: 'filter', val: calculateFilter(foldAngle, foldType), prog: stepStart },
            { key: 'filter', val: calculateFilter(0, foldType), prog: stepEnd },
          );
          break;

        default:
          // Default: simple unfold-to-fold
          ranges.push(
            { key: 'rotate', val: 0, prog: stepStart },
            { key: 'rotate', val: foldAngle, prog: stepEnd },
            { key: 'background', val: calculateGradient(0, lightAngle, foldType), prog: stepStart },
            { key: 'background', val: calculateGradient(foldAngle, lightAngle, foldType), prog: stepEnd },
            { key: 'boxShadow', val: calculateBoxShadow(0, thickness, foldType), prog: stepStart },
            { key: 'boxShadow', val: calculateBoxShadow(foldAngle, thickness, foldType), prog: stepEnd },
            { key: 'filter', val: calculateFilter(0, foldType), prog: stepStart },
            { key: 'filter', val: calculateFilter(foldAngle, foldType), prog: stepEnd },
          );
      }
    });

    return ranges;
  };

  // Generate fold sequence ranges
  const ranges = generateFoldRanges(
    params.foldSequence,
    params.foldAngle,
    params.lightAngle,
    params.foldType,
    params.thickness,
  );

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: ranges,
  };

  // Create effect node
  const effect = {
    id: params.effectId || `paper-fold-${params.targetId}-${Date.now()}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'paper-fold-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: params.effectDuration,
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
  id: 'paperFoldEffect',
  title: 'Paper Fold Effect',
  description:
    'Internal effect preset that simulates paper folding and unfolding using rotation combined with dynamic CSS gradients for lighting simulation. Creates tactile, material design effects using 2D techniques with mountain/valley folds, adjustable paper thickness affecting shadow intensity, and configurable light source positioning. Supports single folds, accordion-style sequences, and origami-like transformations.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'paper-fold', 'material', 'origami', 'animation'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 2,
    foldAngle: 90,
    foldType: 'mountain',
    thickness: 1,
    lightAngle: 135,
    foldSequence: ['unfold-to-fold'],
  },
};

export const paperFoldEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
