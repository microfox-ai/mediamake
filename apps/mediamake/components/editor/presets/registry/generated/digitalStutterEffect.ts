/**
 * Digital Stutter Effect Preset
 *
 * SINGLE EFFECT: This is an internal effect preset that simulates digital video buffer errors
 * where frames repeat rapidly then skip ahead, creating a machine-gun-like stutter effect.
 * The effect rapidly toggles between two or three positions/states before jumping to a new position,
 * mimicking CD skipping or digital file corruption.
 *
 * Features:
 * - Position stutter: rapid bouncing between -5px and 5px (or custom intensity)
 * - Scale stutter: opposite phase fluctuations (0.98 to 1.02)
 * - Brightness flicker: rapid brightness variations
 * - Optional RGB color glitch: hue-rotate alternations for chromatic aberration effect
 * - Configurable burst patterns with stutterSpeed controlling repetition rate
 * - Adjustable intensity for movement amount
 *
 * Use cases:
 * - Simulating digital glitches and buffer errors
 * - Creating retro/lo-fi aesthetic effects
 * - Adding visual emphasis through controlled chaos
 * - Enhancing transitions with digital artifacts
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the stutter effect to'),
  stutterSpeed: z
    .number()
    .min(0.01)
    .max(0.05)
    .default(0.02)
    .describe(
      'Repetition rate in prog units (0.01-0.05) - controls how fast frames alternate',
    ),
  stutterIntensity: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('Movement amount in pixels (1-20) - controls position jitter magnitude'),
  burstLength: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Duration of each stutter burst in seconds (0.1-0.5)'),
  includeColorGlitch: z
    .boolean()
    .default(true)
    .describe('Whether to include RGB color channel shifts (hue-rotate effect)'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent'),
  effectDuration: z
    .number()
    .default(2)
    .describe('Total duration of the effect in seconds'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Generate stutter keyframes helper function
  const generateStutterKeyframes = (
    speed: number,
    intensity: number,
    totalDuration: number,
    burstLength: number,
  ): Array<{ val: string; prog: number }> => {
    const keyframes: Array<{ val: string; prog: number }> = [];
    
    // Calculate number of bursts that fit in the duration
    const burstInterval = burstLength * 2; // burst + pause
    const numBursts = Math.floor(totalDuration / burstInterval);
    
    // If no bursts fit, create at least one
    const actualNumBursts = Math.max(1, numBursts);
    
    for (let burst = 0; burst < actualNumBursts; burst++) {
      const burstStartProg = (burst * burstInterval) / totalDuration;
      const burstEndProg = Math.min(
        (burst * burstInterval + burstLength) / totalDuration,
        1,
      );
      
      // Number of stutters within this burst
      const numStutters = Math.floor(burstLength / speed);
      
      for (let i = 0; i < numStutters; i++) {
        const progWithinBurst = i / numStutters;
        const absoluteProg = burstStartProg + (burstEndProg - burstStartProg) * progWithinBurst;
        
        if (absoluteProg > 1) break;
        
        // Alternate between positions
        const position = i % 3 === 0 ? 0 : i % 3 === 1 ? intensity : -intensity;
        keyframes.push({
          val: `${position}px`,
          prog: Math.min(absoluteProg, 1),
        });
      }
      
      // Add rest period after burst (return to 0)
      if (burstEndProg < 1) {
        keyframes.push({
          val: '0px',
          prog: Math.min(burstEndProg, 1),
        });
      }
    }
    
    // Ensure we end at 0
    if (keyframes.length === 0 || keyframes[keyframes.length - 1].prog < 1) {
      keyframes.push({ val: '0px', prog: 1 });
    }
    
    return keyframes;
  };

  // Generate scale stutter keyframes (opposite phase)
  const generateScaleStutterKeyframes = (
    positionKeyframes: Array<{ val: string; prog: number }>,
  ): Array<{ val: number; prog: number }> => {
    return positionKeyframes.map((kf) => {
      const positionVal = parseFloat(kf.val);
      // Opposite phase: when position is positive, scale down; when negative, scale up
      const scale = positionVal > 0 ? 0.98 : positionVal < 0 ? 1.02 : 1.0;
      return {
        val: scale,
        prog: kf.prog,
      };
    });
  };

  // Generate brightness flicker keyframes
  const generateBrightnessKeyframes = (
    speed: number,
    totalDuration: number,
    burstLength: number,
  ): Array<{ val: number; prog: number }> => {
    const keyframes: Array<{ val: number; prog: number }> = [];
    
    const burstInterval = burstLength * 2;
    const numBursts = Math.max(1, Math.floor(totalDuration / burstInterval));
    
    for (let burst = 0; burst < numBursts; burst++) {
      const burstStartProg = (burst * burstInterval) / totalDuration;
      const burstEndProg = Math.min(
        (burst * burstInterval + burstLength) / totalDuration,
        1,
      );
      
      const numFlickers = Math.floor(burstLength / speed);
      
      for (let i = 0; i < numFlickers; i++) {
        const progWithinBurst = i / numFlickers;
        const absoluteProg = burstStartProg + (burstEndProg - burstStartProg) * progWithinBurst;
        
        if (absoluteProg > 1) break;
        
        // Alternate brightness: 1 -> 0.9 -> 1.1 -> 1
        const brightness = i % 3 === 0 ? 1 : i % 3 === 1 ? 0.9 : 1.1;
        keyframes.push({
          val: brightness,
          prog: Math.min(absoluteProg, 1),
        });
      }
      
      if (burstEndProg < 1) {
        keyframes.push({ val: 1, prog: Math.min(burstEndProg, 1) });
      }
    }
    
    if (keyframes.length === 0 || keyframes[keyframes.length - 1].prog < 1) {
      keyframes.push({ val: 1, prog: 1 });
    }
    
    return keyframes;
  };

  // Generate hue-rotate color glitch keyframes
  const generateColorGlitchKeyframes = (
    speed: number,
    totalDuration: number,
    burstLength: number,
  ): Array<{ val: string; prog: number }> => {
    const keyframes: Array<{ val: string; prog: number }> = [];
    
    const burstInterval = burstLength * 2;
    const numBursts = Math.max(1, Math.floor(totalDuration / burstInterval));
    
    for (let burst = 0; burst < numBursts; burst++) {
      const burstStartProg = (burst * burstInterval) / totalDuration;
      const burstEndProg = Math.min(
        (burst * burstInterval + burstLength) / totalDuration,
        1,
      );
      
      const numGlitches = Math.floor(burstLength / speed);
      
      for (let i = 0; i < numGlitches; i++) {
        const progWithinBurst = i / numGlitches;
        const absoluteProg = burstStartProg + (burstEndProg - burstStartProg) * progWithinBurst;
        
        if (absoluteProg > 1) break;
        
        // Alternate hue: 0deg -> 10deg -> -10deg
        const hue = i % 3 === 0 ? 0 : i % 3 === 1 ? 10 : -10;
        keyframes.push({
          val: `hue-rotate(${hue}deg)`,
          prog: Math.min(absoluteProg, 1),
        });
      }
      
      if (burstEndProg < 1) {
        keyframes.push({
          val: 'hue-rotate(0deg)',
          prog: Math.min(burstEndProg, 1),
        });
      }
    }
    
    if (keyframes.length === 0 || keyframes[keyframes.length - 1].prog < 1) {
      keyframes.push({ val: 'hue-rotate(0deg)', prog: 1 });
    }
    
    return keyframes;
  };

  // Generate all keyframe ranges
  const positionXKeyframes = generateStutterKeyframes(
    params.stutterSpeed,
    params.stutterIntensity,
    params.effectDuration,
    params.burstLength,
  );
  
  // Y position with slight phase offset
  const positionYKeyframes = generateStutterKeyframes(
    params.stutterSpeed,
    params.stutterIntensity * 0.7, // Slightly less intense on Y axis
    params.effectDuration,
    params.burstLength,
  );

  const scaleKeyframes = generateScaleStutterKeyframes(positionXKeyframes);
  const brightnessKeyframes = generateBrightnessKeyframes(
    params.stutterSpeed,
    params.effectDuration,
    params.burstLength,
  );

  // Create position stutter effect
  const positionStutterEffect: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      ...positionXKeyframes.map((kf) => ({
        key: 'translateX' as const,
        val: kf.val,
        prog: kf.prog,
      })),
      ...positionYKeyframes.map((kf) => ({
        key: 'translateY' as const,
        val: kf.val,
        prog: kf.prog,
      })),
    ],
  };

  // Create scale stutter effect
  const scaleStutterEffect: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: scaleKeyframes.map((kf) => ({
      key: 'scale' as const,
      val: kf.val,
      prog: kf.prog,
    })),
  };

  // Create brightness flicker effect
  const brightnessFlickerEffect: GenericEffectData = {
    type: 'linear',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: brightnessKeyframes.map((kf) => ({
      key: 'brightness' as const,
      val: kf.val,
      prog: kf.prog,
    })),
  };

  // Build effects array
  const effects = [
    {
      id: `${params.effectId || 'digital-stutter'}-position`,
      componentId: 'generic' as const,
      data: positionStutterEffect,
    },
    {
      id: `${params.effectId || 'digital-stutter'}-scale`,
      componentId: 'generic' as const,
      data: scaleStutterEffect,
    },
    {
      id: `${params.effectId || 'digital-stutter'}-brightness`,
      componentId: 'generic' as const,
      data: brightnessFlickerEffect,
    },
  ];

  // Add color glitch effect if enabled
  if (params.includeColorGlitch) {
    const colorGlitchKeyframes = generateColorGlitchKeyframes(
      params.stutterSpeed,
      params.effectDuration,
      params.burstLength,
    );

    const colorGlitchEffect: GenericEffectData = {
      type: 'linear',
      start: params.effectStart,
      duration: params.effectDuration,
      mode: 'provider',
      targetIds: params.targetIds,
      ranges: colorGlitchKeyframes.map((kf) => ({
        key: 'filter' as const,
        val: kf.val,
        prog: kf.prog,
      })),
    };

    effects.push({
      id: `${params.effectId || 'digital-stutter'}-color`,
      componentId: 'generic' as const,
      data: colorGlitchEffect,
    });
  }

  return {
    output: {
      childrenData: [
        {
          id: 'digital-stutter-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: effects,
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
  id: 'digitalStutterEffect',
  title: 'Digital Stutter Effect',
  description:
    'Internal effect preset that simulates digital video buffer errors with rapid frame stuttering, position jittering, scale fluctuations, and optional RGB color channel shifts. Creates a machine-gun-like stutter pattern mimicking CD skipping or digital file corruption.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'glitch', 'stutter', 'digital', 'buffer-error', 'corruption'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    stutterSpeed: 0.02,
    stutterIntensity: 5,
    burstLength: 0.2,
    includeColorGlitch: true,
    effectStart: 0,
    effectDuration: 2,
  },
};

export const digitalStutterEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};