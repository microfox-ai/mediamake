/**
 * Gentle Morph Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates a smooth, sophisticated text morphing effect that transforms letterSpacing, fontSize, 
 * and optionally applies a subtle hue-rotate color shift. Perfect for elegant text transitions
 * in title sequences or emphasis effects.
 *
 * Features:
 * - Animates letterSpacing from tight (-0.05em) to normal (0) to slightly loose (0.02em)
 * - Scales fontSize from 95% to 100% to 102% and settles at 100%
 * - Optional subtle color shift via hue-rotate filter (-5deg to 5deg)
 * - Sophisticated easing (ease-in-out) with staggered progress points
 * - Configurable morphIntensity (0-1) to scale effect strength
 * - Toggleable textExpansion and colorShift features
 *
 * Use cases:
 * - Elegant text transitions in title sequences
 * - Emphasis effects for key words or phrases
 * - Smooth morphing animations for typography
 * - Professional text reveal effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to apply the morph effect to'),
  duration: z.number().default(1500).optional().describe('Duration of the effect in milliseconds'),
  morphIntensity: z.number().min(0).max(1).default(1).optional().describe('Intensity multiplier for the morph effect (0-1, default: 1)'),
  textExpansion: z.boolean().default(true).optional().describe('Enable letterSpacing and fontSize expansion animation'),
  colorShift: z.boolean().default(true).optional().describe('Enable subtle hue-rotate color shift animation'),
  effectId: z.string().optional().describe('Optional custom effect ID'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Convert duration from milliseconds to seconds
  const durationInSeconds = (params.duration ?? 1500) / 1000;
  
  // Get intensity multiplier
  const intensity = params.morphIntensity ?? 1;
  
  // Calculate scaled values based on intensity
  const calculateScaledValue = (value: number): number => {
    return value * intensity;
  };

  // Build ranges array based on enabled features
  const ranges: Array<{ key: string; val: any; prog: number }> = [];

  // Add letterSpacing animation if textExpansion is enabled
  if (params.textExpansion !== false) {
    const letterSpacingTight = `${calculateScaledValue(-0.05)}em`;
    const letterSpacingLoose = `${calculateScaledValue(0.02)}em`;
    
    ranges.push(
      { key: 'letterSpacing', val: letterSpacingTight, prog: 0 },
      { key: 'letterSpacing', val: '0em', prog: 0.3 },
      { key: 'letterSpacing', val: letterSpacingLoose, prog: 0.7 },
      { key: 'letterSpacing', val: '0em', prog: 1 }
    );
  }

  // Add fontSize animation if textExpansion is enabled
  if (params.textExpansion !== false) {
    const fontSizeMin = 95 + (100 - 95) * (1 - intensity);
    const fontSizeMax = 100 + (102 - 100) * intensity;
    
    ranges.push(
      { key: 'fontSize', val: `${fontSizeMin}%`, prog: 0 },
      { key: 'fontSize', val: '100%', prog: 0.4 },
      { key: 'fontSize', val: `${fontSizeMax}%`, prog: 0.7 },
      { key: 'fontSize', val: '100%', prog: 1 }
    );
  }

  // Add hue-rotate filter animation if colorShift is enabled
  if (params.colorShift !== false) {
    const hueRotateStart = calculateScaledValue(-5);
    const hueRotatePeak = calculateScaledValue(5);
    
    ranges.push(
      { key: 'filter', val: `hue-rotate(${hueRotateStart}deg)`, prog: 0 },
      { key: 'filter', val: `hue-rotate(${hueRotatePeak}deg)`, prog: 0.6 },
      { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 }
    );
  } else {
    // If colorShift is disabled, ensure no filter is applied
    ranges.push(
      { key: 'filter', val: 'none', prog: 0 },
      { key: 'filter', val: 'none', prog: 1 }
    );
  }

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges,
  };

  // Create effect
  const effect = {
    id: params.effectId || `gentle-morph-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'gentle-morph-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                pointerEvents: 'none' as const,
              },
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
  id: 'gentleMorphTextEffect',
  title: 'Gentle Morph Text Effect',
  description: 'Internal effect preset that smoothly transforms text properties (letterSpacing, fontSize, filter hue-rotate) with sophisticated easing. Perfect for elegant text transitions in title sequences or emphasis effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'text', 'morph', 'typography', 'transition', 'internal', 'generic'],
  defaultInputParams: {
    targetIds: ['text-component-1'],
    duration: 1500,
    morphIntensity: 1,
    textExpansion: true,
    colorShift: true,
  },
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const gentleMorphTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
