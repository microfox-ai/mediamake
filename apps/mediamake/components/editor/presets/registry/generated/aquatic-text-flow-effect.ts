/**
 * Aquatic Text Flow Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates flowing water-like text animations with per-character staggered wave propagation.
 * Each character receives multiple effects (translateY float, rotate wobble, scale breathing, 
 * scaleY drip, textShadow caustics) with staggered start times based on index * characterDelay.
 * 
 * Features:
 * - Per-character staggered animations creating wave propagation
 * - Vertical float: translateY oscillates 0 to -5px
 * - Wobble rotation: rotate oscillates -3deg to 3deg
 * - Breathing scale: scale pulses 0.95 to 1.05
 * - Drip effect: Random characters extend with scaleY 1.0 to 1.3 and back
 * - Water caustic text-shadow patterns beneath text
 * - Configurable flow speed, character delay, drip probability, and caustics intensity
 * 
 * Use cases:
 * - Typography presets with flowing water aesthetic
 * - Display text and headlines with aquatic motion
 * - Character-level animations for dynamic text effects
 * - Creating wave propagation effects across text
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfex/remotion';

const presetParams = z.object({
  flowSpeed: z
    .number()
    .min(500)
    .max(5000)
    .default(2000)
    .optional()
    .describe('Wave propagation speed in milliseconds (duration of each character animation cycle)'),
  characterDelay: z
    .number()
    .min(10)
    .max(200)
    .default(50)
    .optional()
    .describe('Stagger delay between each character in milliseconds (creates wave propagation)'),
  dripProbability: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Probability (0-1) that each character will have drip effect'),
  causticsIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for water caustic text-shadow effects'),
  supportsSplit: z
    .boolean()
    .default(true)
    .optional()
    .describe('Whether text is pre-split into character spans (must be true for per-character effects)'),
  targetIds: z
    .array(z.string())
    .optional()
    .describe('Array of character component IDs to target (one per character)'),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of effects relative to parent component'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const flowSpeed = params.flowSpeed ?? 2000;
  const characterDelay = params.characterDelay ?? 50;
  const dripProbability = params.dripProbability ?? 0.3;
  const causticsIntensity = params.causticsIntensity ?? 1;
  const effectStart = params.effectStart ?? 0;
  const targetIds = params.targetIds ?? [];

  if (!targetIds || targetIds.length === 0) {
    throw new Error('AquaticTextFlow requires targetIds array with character component IDs');
  }

  // Convert flow speed from ms to seconds
  const flowDuration = flowSpeed / 1000;
  const charDelay = characterDelay / 1000;

  // Helper: Generate drip effect ranges
  const generateDripRanges = (shouldDrip: boolean) => {
    if (!shouldDrip) return [];
    return [
      { key: 'scaleY', val: 1.0, prog: 0 },
      { key: 'scaleY', val: 1.3, prog: 0.3 },
      { key: 'scaleY', val: 1.0, prog: 0.6 },
      { key: 'scaleY', val: 1.0, prog: 1 },
    ];
  };

  // Helper: Generate caustic text-shadow ranges
  const generateCausticRanges = (intensity: number) => {
    const baseBlur = 4 * intensity;
    const peakBlur = 8 * intensity;
    const baseAlpha = 0.3 * intensity;
    const peakAlpha = 0.5 * intensity;

    return [
      { key: 'textShadow', val: `0 2px ${baseBlur}px rgba(0,150,255,${baseAlpha})`, prog: 0 },
      { key: 'textShadow', val: `0 4px ${peakBlur}px rgba(0,200,255,${peakAlpha})`, prog: 0.5 },
      { key: 'textShadow', val: `0 2px ${baseBlur}px rgba(0,150,255,${baseAlpha})`, prog: 1 },
    ];
  };

  // Create effects array for all characters
  const effects: any[] = [];

  targetIds.forEach((targetId, index) => {
    // Calculate staggered start time for this character
    const charStartTime = effectStart + (index * charDelay);

    // Determine if this character should have drip effect
    const shouldDrip = Math.random() < dripProbability;

    // Base animation ranges: float, wobble, breathing
    const baseRanges = [
      // Vertical float: 0 to -5px oscillation
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -5, prog: 0.5 },
      { key: 'translateY', val: 0, prog: 1 },
      
      // Wobble rotation: -3deg to 3deg oscillation
      { key: 'rotate', val: -3, prog: 0 },
      { key: 'rotate', val: 3, prog: 0.5 },
      { key: 'rotate', val: -3, prog: 1 },
      
      // Breathing scale: 0.95 to 1.05 pulse
      { key: 'scale', val: 0.95, prog: 0 },
      { key: 'scale', val: 1.05, prog: 0.5 },
      { key: 'scale', val: 0.95, prog: 1 },
    ];

    // Combine all ranges
    const allRanges = [
      ...baseRanges,
      ...generateDripRanges(shouldDrip),
      ...generateCausticRanges(causticsIntensity),
    ];

    // Create effect data for this character
    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: charStartTime,
      duration: flowDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: allRanges,
    };

    // Create effect node
    const effect = {
      id: `aquatic-flow-${targetId}-${index}`,
      componentId: 'generic',
      data: effectData,
    };

    effects.push(effect);
  });

  // Return effects in container structure
  return {
    output: {
      childrenData: [
        {
          id: 'aquatic-text-flow-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
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
  id: 'aquatic-text-flow-effect',
  title: 'Aquatic Text Flow Effect',
  description: 'Internal effect preset that creates flowing water-like text animations with per-character staggered wave propagation. Features vertical float, wobble rotation, breathing scale, random drip effects, and animated caustic light patterns beneath text. Designed for headlines and display text with customizable flow speed, character delay, drip probability, and caustics intensity.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'typography', 'text', 'aquatic', 'flow', 'water', 'wave', 'stagger', 'per-character', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    flowSpeed: 2000,
    characterDelay: 50,
    dripProbability: 0.3,
    causticsIntensity: 1,
    supportsSplit: true,
    targetIds: ['char-0', 'char-1', 'char-2'],
    effectStart: 0,
  },
};

export const aquaticTextFlowEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};