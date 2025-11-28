/**
 * TemporalRipple Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates concentric time echoes radiating outward from elements, like dropping them into
 * a temporal pond. Each ripple is a scaled, faded echo that expands outward with subtle
 * rotation, creating mesmerizing time-distortion visuals.
 *
 * This internal effect preset generates multiple generic effects with staggered timing,
 * each representing a temporal ripple that emanates from the target element. The ripples
 * scale outward while fading and rotating, creating a spiral time-distortion effect.
 *
 * Features:
 * - Configurable ripple count (3-8 ripples)
 * - Customizable expansion scale (1.2x to 3x final size)
 * - Adjustable ripple speed and rotation
 * - Linear or exponential fade patterns
 * - Base pulse effect for the original element
 *
 * Use cases:
 * - Creating temporal distortion effects for dramatic reveals
 * - Adding echo effects to text or image elements
 * - Building time-themed visual effects
 * - Creating concentric animation patterns
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the temporal ripple effect to'),
  inputDuration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total duration of the effect sequence in seconds'),
  rippleCount: z
    .number()
    .min(3)
    .max(8)
    .default(5)
    .describe('Number of temporal ripples to create (3-8)'),
  expansionScale: z
    .number()
    .min(1.2)
    .max(3)
    .default(2)
    .describe('Final scale multiplier for ripples (1.2 = 120%, 3 = 300%)'),
  rippleSpeed: z
    .number()
    .min(0.3)
    .max(2)
    .default(1)
    .describe('Duration of each ripple animation in seconds'),
  rotationAmount: z
    .number()
    .min(0)
    .max(45)
    .default(15)
    .describe('Maximum rotation in degrees for spiral motion (0-45)'),
  fadePattern: z
    .enum(['linear', 'exponential'])
    .default('linear')
    .describe('Opacity fade pattern: linear or exponential decay'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    inputDuration,
    rippleCount,
    expansionScale,
    rippleSpeed,
    rotationAmount,
    fadePattern,
    effectIdPrefix,
  } = params;

  // Calculate fade values based on pattern
  const calculateFadeValue = (rippleIndex: number): number => {
    const baseOpacity = 0.8;
    const decayRate = fadePattern === 'exponential' ? 0.2 : 0.15;
    
    if (fadePattern === 'exponential') {
      // Exponential decay: faster initial fade
      return baseOpacity * Math.pow(0.6, rippleIndex);
    } else {
      // Linear decay
      return Math.max(0, baseOpacity - (rippleIndex * decayRate));
    }
  };

  // Generate ripple effects
  const rippleEffects = [];
  
  for (let i = 0; i < rippleCount; i++) {
    // Calculate staggered start time
    const startTime = i * (inputDuration / rippleCount);
    
    // Calculate scale progression for this ripple
    const targetScale = 1 + (expansionScale - 1) * ((i + 1) / rippleCount);
    
    // Calculate peak opacity for this ripple
    const peakOpacity = calculateFadeValue(i);
    
    // Calculate rotation for this ripple (alternating direction for variety)
    const rotationDirection = i % 2 === 0 ? 1 : -1;
    const rotationValue = rotationAmount * rotationDirection;

    const rippleEffectData: GenericEffectData = {
      type: 'ease-out',
      start: startTime,
      duration: rippleSpeed,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        // Scale: expand from 1.0 to target scale
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: targetScale, prog: 1 },
        
        // Opacity: fade in quickly, then fade out
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: peakOpacity, prog: 0.1 },
        { key: 'opacity', val: 0, prog: 1 },
        
        // Rotation: spiral motion
        { key: 'rotate', val: '0deg', prog: 0 },
        { key: 'rotate', val: `${rotationValue}deg`, prog: 1 },
      ],
    };

    const rippleEffect = {
      id: effectIdPrefix 
        ? `${effectIdPrefix}-ripple-${i}` 
        : `temporal-ripple-${i}-${targetIds[0] || 'target'}`,
      componentId: 'generic',
      data: rippleEffectData,
    };

    rippleEffects.push(rippleEffect);
  }

  // Create base pulse effect for the original element
  const basePulseData: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: inputDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 0.95, prog: 0.5 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  const basePulseEffect = {
    id: effectIdPrefix
      ? `${effectIdPrefix}-base-pulse`
      : `temporal-base-pulse-${targetIds[0] || 'target'}`,
    componentId: 'generic',
    data: basePulseData,
  };

  // Combine all effects
  const allEffects = [...rippleEffects, basePulseEffect];

  // Return in container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'temporal-ripple-effect-container',
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
        duration: inputDuration,
      },
    },
    effects: allEffects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: allEffects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'temporal-ripple-effect',
  title: 'TemporalRipple Internal Effect',
  description:
    'Creates concentric time echoes radiating outward from elements, like dropping them into a temporal pond. Each ripple is a scaled, faded echo that expands outward with subtle rotation, creating mesmerizing time-distortion visuals.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'ripple', 'temporal', 'echo', 'generic', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['target-component'],
    inputDuration: 5,
    rippleCount: 5,
    expansionScale: 2,
    rippleSpeed: 1,
    rotationAmount: 15,
    fadePattern: 'linear',
  },
};

export const temporalRippleEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
