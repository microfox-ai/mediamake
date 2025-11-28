/**
 * InkBleed Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates an ink bleeding/spreading effect using animated clip-path and filters.
 * The effect starts from a configurable origin point (center, edge, or random points)
 * and spreads organically like real ink bleeding on paper. Supports multiple bleed
 * patterns (organic, splatter, drip) and adjustable spread speed/viscosity.
 *
 * This is an internal effect preset that returns effect configuration data to be
 * applied to target components via provider mode.
 *
 * Parameters:
 * - targetId: Component to apply the ink bleed effect to
 * - effectStart: Start time of the effect (relative to parent)
 * - effectDuration: Duration of the ink bleed animation
 * - origin: Where the ink starts bleeding from (center, edges, or random points)
 * - inkColor: Color of the ink effect (applied via filter)
 * - speed: Spread speed multiplier (affects animation timing)
 * - pattern: Bleed pattern style (organic, splatter, drip)
 * - viscosity: Controls spread behavior (lower = faster spread, higher = slower)
 *
 * Usage:
 * Apply to any component (text, image, video) to create an ink bleeding reveal effect.
 * Works best with text reveals and image transitions for artistic presentations.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the ink bleed effect to'),
  effectStart: z.number().describe('Start time of the effect in seconds (relative to parent)'),
  effectDuration: z.number().describe('Duration of the ink bleed animation in seconds'),
  origin: z
    .enum(['center', 'top', 'bottom', 'left', 'right', 'random-points'])
    .default('center')
    .describe('Origin point where the ink starts bleeding from'),
  inkColor: z.string().default('#000000').describe('Color of the ink effect (hex format)'),
  speed: z.number().min(0.1).max(3).default(1).describe('Spread speed multiplier (0.1-3)'),
  pattern: z
    .enum(['organic', 'splatter', 'drip'])
    .default('organic')
    .describe('Bleed pattern style'),
  viscosity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Spread behavior (lower = faster, higher = slower)'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    effectStart,
    effectDuration,
    origin,
    inkColor,
    speed,
    pattern,
    viscosity,
    effectId,
  } = params;

  // Helper function to generate clip-path keyframes based on origin and pattern
  const generateClipPathKeyframes = (
    originType: string,
    patternType: string,
    viscosityValue: number,
  ): Array<{ key: string; val: string; prog: number }> => {
    const keyframes: Array<{ key: string; val: string; prog: number }> = [];

    // Adjust progression based on viscosity (higher viscosity = slower spread)
    const viscosityFactor = viscosityValue;

    if (originType === 'center') {
      if (patternType === 'organic') {
        // Organic circular spread from center
        keyframes.push(
          { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
          { key: 'clipPath', val: `circle(${5 / viscosityFactor}% at 50% 50%)`, prog: 0.2 },
          { key: 'clipPath', val: `circle(${20 / viscosityFactor}% at 50% 50%)`, prog: 0.4 },
          { key: 'clipPath', val: `circle(${45 / viscosityFactor}% at 50% 50%)`, prog: 0.6 },
          { key: 'clipPath', val: `circle(${75 / viscosityFactor}% at 50% 50%)`, prog: 0.8 },
          { key: 'clipPath', val: 'circle(100% at 50% 50%)', prog: 1 },
        );
      } else if (patternType === 'splatter') {
        // Splatter from center with irregular edges
        keyframes.push(
          { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
          { key: 'clipPath', val: `circle(${8 / viscosityFactor}% at 50% 50%)`, prog: 0.2 },
          { key: 'clipPath', val: `circle(${25 / viscosityFactor}% at 50% 50%)`, prog: 0.4 },
          { key: 'clipPath', val: `circle(${50 / viscosityFactor}% at 50% 50%)`, prog: 0.6 },
          { key: 'clipPath', val: `circle(${80 / viscosityFactor}% at 50% 50%)`, prog: 0.8 },
          { key: 'clipPath', val: 'circle(110% at 50% 50%)', prog: 1 },
        );
      } else {
        // Drip pattern from center (radial with downward bias)
        keyframes.push(
          { key: 'clipPath', val: 'ellipse(0% 0% at 50% 50%)', prog: 0 },
          { key: 'clipPath', val: `ellipse(${5 / viscosityFactor}% ${8 / viscosityFactor}% at 50% 50%)`, prog: 0.2 },
          { key: 'clipPath', val: `ellipse(${15 / viscosityFactor}% ${25 / viscosityFactor}% at 50% 55%)`, prog: 0.4 },
          { key: 'clipPath', val: `ellipse(${35 / viscosityFactor}% ${50 / viscosityFactor}% at 50% 60%)`, prog: 0.6 },
          { key: 'clipPath', val: `ellipse(${60 / viscosityFactor}% ${80 / viscosityFactor}% at 50% 65%)`, prog: 0.8 },
          { key: 'clipPath', val: 'ellipse(100% 100% at 50% 70%)', prog: 1 },
        );
      }
    } else if (originType === 'top') {
      // Bleed from top edge downward
      keyframes.push(
        { key: 'clipPath', val: 'inset(0% 0% 100% 0%)', prog: 0 },
        { key: 'clipPath', val: `inset(0% 0% ${80 / viscosityFactor}% 0%)`, prog: 0.2 },
        { key: 'clipPath', val: `inset(0% 0% ${60 / viscosityFactor}% 0%)`, prog: 0.4 },
        { key: 'clipPath', val: `inset(0% 0% ${35 / viscosityFactor}% 0%)`, prog: 0.6 },
        { key: 'clipPath', val: `inset(0% 0% ${15 / viscosityFactor}% 0%)`, prog: 0.8 },
        { key: 'clipPath', val: 'inset(0% 0% 0% 0%)', prog: 1 },
      );
    } else if (originType === 'bottom') {
      // Bleed from bottom edge upward
      keyframes.push(
        { key: 'clipPath', val: 'inset(100% 0% 0% 0%)', prog: 0 },
        { key: 'clipPath', val: `inset(${80 / viscosityFactor}% 0% 0% 0%)`, prog: 0.2 },
        { key: 'clipPath', val: `inset(${60 / viscosityFactor}% 0% 0% 0%)`, prog: 0.4 },
        { key: 'clipPath', val: `inset(${35 / viscosityFactor}% 0% 0% 0%)`, prog: 0.6 },
        { key: 'clipPath', val: `inset(${15 / viscosityFactor}% 0% 0% 0%)`, prog: 0.8 },
        { key: 'clipPath', val: 'inset(0% 0% 0% 0%)', prog: 1 },
      );
    } else if (originType === 'left') {
      // Bleed from left edge rightward
      keyframes.push(
        { key: 'clipPath', val: 'inset(0% 100% 0% 0%)', prog: 0 },
        { key: 'clipPath', val: `inset(0% ${80 / viscosityFactor}% 0% 0%)`, prog: 0.2 },
        { key: 'clipPath', val: `inset(0% ${60 / viscosityFactor}% 0% 0%)`, prog: 0.4 },
        { key: 'clipPath', val: `inset(0% ${35 / viscosityFactor}% 0% 0%)`, prog: 0.6 },
        { key: 'clipPath', val: `inset(0% ${15 / viscosityFactor}% 0% 0%)`, prog: 0.8 },
        { key: 'clipPath', val: 'inset(0% 0% 0% 0%)', prog: 1 },
      );
    } else if (originType === 'right') {
      // Bleed from right edge leftward
      keyframes.push(
        { key: 'clipPath', val: 'inset(0% 0% 0% 100%)', prog: 0 },
        { key: 'clipPath', val: `inset(0% 0% 0% ${80 / viscosityFactor}%)`, prog: 0.2 },
        { key: 'clipPath', val: `inset(0% 0% 0% ${60 / viscosityFactor}%)`, prog: 0.4 },
        { key: 'clipPath', val: `inset(0% 0% 0% ${35 / viscosityFactor}%)`, prog: 0.6 },
        { key: 'clipPath', val: `inset(0% 0% 0% ${15 / viscosityFactor}%)`, prog: 0.8 },
        { key: 'clipPath', val: 'inset(0% 0% 0% 0%)', prog: 1 },
      );
    } else if (originType === 'random-points') {
      // Multiple random points spreading (using polygon approximation)
      if (patternType === 'splatter') {
        // Random splatter points
        keyframes.push(
          { key: 'clipPath', val: 'polygon(50% 50%, 50% 50%, 50% 50%)', prog: 0 },
          { key: 'clipPath', val: `polygon(30% 40%, 60% 30%, 70% 60%, 40% 70%, 20% 50%)`, prog: 0.2 },
          { key: 'clipPath', val: `polygon(15% 25%, 75% 20%, 85% 70%, 25% 85%, 10% 45%)`, prog: 0.4 },
          { key: 'clipPath', val: `polygon(5% 15%, 85% 10%, 95% 80%, 15% 95%, 0% 40%)`, prog: 0.6 },
          { key: 'clipPath', val: `polygon(0% 5%, 95% 0%, 100% 90%, 10% 100%, 0% 30%)`, prog: 0.8 },
          { key: 'clipPath', val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', prog: 1 },
        );
      } else {
        // Organic random spread
        keyframes.push(
          { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
          { key: 'clipPath', val: `circle(${10 / viscosityFactor}% at 45% 55%)`, prog: 0.2 },
          { key: 'clipPath', val: `circle(${30 / viscosityFactor}% at 48% 52%)`, prog: 0.4 },
          { key: 'clipPath', val: `circle(${55 / viscosityFactor}% at 50% 50%)`, prog: 0.6 },
          { key: 'clipPath', val: `circle(${80 / viscosityFactor}% at 50% 50%)`, prog: 0.8 },
          { key: 'clipPath', val: 'circle(120% at 50% 50%)', prog: 1 },
        );
      }
    }

    return keyframes;
  };

  // Helper function to generate filter keyframes for ink edges
  const generateFilterKeyframes = (
    colorHex: string,
  ): Array<{ key: string; val: string; prog: number }> => {
    // Convert hex to RGB for filter effects
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 0, g: 0, b: 0 };
    };

    const rgb = hexToRgb(colorHex);
    const filterColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;

    return [
      {
        key: 'filter',
        val: `blur(8px) contrast(1.5) drop-shadow(0 0 2px ${filterColor})`,
        prog: 0,
      },
      {
        key: 'filter',
        val: `blur(6px) contrast(1.4) drop-shadow(0 0 3px ${filterColor})`,
        prog: 0.2,
      },
      {
        key: 'filter',
        val: `blur(4px) contrast(1.3) drop-shadow(0 0 4px ${filterColor})`,
        prog: 0.4,
      },
      {
        key: 'filter',
        val: `blur(2px) contrast(1.2) drop-shadow(0 0 3px ${filterColor})`,
        prog: 0.6,
      },
      {
        key: 'filter',
        val: `blur(1px) contrast(1.1) drop-shadow(0 0 2px ${filterColor})`,
        prog: 0.8,
      },
      { key: 'filter', val: 'blur(0px) contrast(1) drop-shadow(0 0 0px transparent)', prog: 1 },
    ];
  };

  // Generate clip-path keyframes
  const clipPathKeyframes = generateClipPathKeyframes(origin, pattern, viscosity);

  // Generate filter keyframes for ink edges
  const filterKeyframes = generateFilterKeyframes(inkColor);

  // Opacity keyframes for smooth reveal
  const opacityKeyframes = [
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 0.3, prog: 0.2 },
    { key: 'opacity', val: 0.7, prog: 0.4 },
    { key: 'opacity', val: 0.9, prog: 0.6 },
    { key: 'opacity', val: 1, prog: 0.8 },
    { key: 'opacity', val: 1, prog: 1 },
  ];

  // Combine all keyframes
  const allRanges = [...clipPathKeyframes, ...filterKeyframes, ...opacityKeyframes];

  // Adjust animation type based on speed
  const animationType = speed > 1.5 ? 'ease-in' : speed < 0.7 ? 'ease-out' : 'ease-in-out';

  // Calculate actual effect duration based on speed
  const adjustedDuration = effectDuration / speed;

  // Construct effect data
  const effectData: GenericEffectData = {
    type: animationType,
    start: effectStart,
    duration: adjustedDuration,
    mode: 'provider',
    targetIds: [targetId],
    ranges: allRanges,
  };

  // Create effect object
  const effect = {
    id: effectId || `ink-bleed-${targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'ink-bleed-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: adjustedDuration + effectStart,
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
  id: 'ink-bleed-effect',
  title: 'InkBleed Internal Effect Preset',
  description:
    'An internal effect preset that creates an ink bleeding/spreading effect with animated clip-path and filter combinations. Perfect for artistic text reveals or image transitions. The effect starts from a configurable origin point or edge and spreads organically like real ink on paper. Returns effect configuration data that can be attached to target components.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'ink', 'bleed', 'spread', 'artistic', 'reveal', 'transition', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 2,
    origin: 'center',
    inkColor: '#000000',
    speed: 1,
    pattern: 'organic',
    viscosity: 1,
  },
};

export const inkBleedEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
