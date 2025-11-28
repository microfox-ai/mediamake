/**
 * TidalWaveDistortion Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This preset generates a sophisticated array of effects that simulate tidal water movement.
 * It combines multiple wave patterns (horizontal scaleX, vertical translateY, turbulence rotation/skew)
 * with dynamic contrast filtering and edge vignetting.
 *
 * Features:
 * - **Primary Wave**: Horizontal scaleX oscillation (0.95-1.05) at 500ms intervals
 * - **Vertical Tide**: Slow translateY oscillation (-30px to 30px) over 4000ms
 * - **Turbulence**: Chaotic rotate and skew effects based on turbulenceLevel
 * - **Refraction**: Dynamic contrast filter shifting between 90%-110%
 * - **Vignette**: Subtle inset box-shadow that intensifies during peak distortion
 * - **Wave Patterns**: Configurable modes: 'calm', 'choppy', 'storm'
 *
 * Parameters:
 * - tideStrength (0-1): Controls intensity of vertical tide movement
 * - turbulenceLevel (0-1): Controls chaos of rotation/skew effects
 * - refractionIntensity: Affects contrast filter range
 * - wavePattern: 'calm' | 'choppy' | 'storm' - determines timing and intensity
 *
 * Use cases:
 * - Full-screen video backgrounds with underwater effects
 * - Dynamic water distortion overlays
 * - Music video effects synchronized with beats
 * - Cinematic water simulation effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfx/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the tidal wave distortion effects to'),
  tideStrength: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Intensity of vertical tide movement (0 = no tide, 1 = full -30px to 30px range)'),
  turbulenceLevel: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Chaos level of turbulence effects (0 = calm, 1 = maximum chaos)'),
  refractionIntensity: z
    .number()
    .default(1)
    .optional()
    .describe('Multiplier for contrast filter range (1 = 90%-110%, higher = more extreme)'),
  wavePattern: z
    .enum(['calm', 'choppy', 'storm'])
    .default('calm')
    .optional()
    .describe('Wave pattern mode affecting timing and intensity: calm (smooth), choppy (medium), storm (chaotic)'),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect in seconds (relative to component timing)'),
  effectDuration: z
    .number()
    .default(4)
    .optional()
    .describe('Duration of the effect in seconds'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const tideStrength = params.tideStrength ?? 0.7;
  const turbulenceLevel = params.turbulenceLevel ?? 0.5;
  const refractionIntensity = params.refractionIntensity ?? 1;
  const wavePattern = params.wavePattern ?? 'calm';
  const effectStart = params.effectStart ?? 0;
  const effectDuration = params.effectDuration ?? 4;
  const effectIdPrefix = params.effectId ?? 'tidal-wave';

  // Calculate wave pattern timings and intensities
  const getWaveConfig = () => {
    switch (wavePattern) {
      case 'calm':
        return {
          scaleXDuration: 1500, // Slower horizontal wave
          tideDuration: 5000, // Slower vertical tide
          turbulenceRotateRange: 1.5, // Gentle rotation
          turbulenceSkewRange: 1, // Gentle skew
          contrastRange: 0.05, // Subtle contrast (95%-105%)
          vignetteIntensity: 0.15,
        };
      case 'choppy':
        return {
          scaleXDuration: 800, // Medium horizontal wave
          tideDuration: 4000, // Medium vertical tide
          turbulenceRotateRange: 3, // Medium rotation
          turbulenceSkewRange: 2, // Medium skew
          contrastRange: 0.1, // Standard contrast (90%-110%)
          vignetteIntensity: 0.25,
        };
      case 'storm':
        return {
          scaleXDuration: 500, // Fast horizontal wave
          tideDuration: 3000, // Fast vertical tide
          turbulenceRotateRange: 5, // Chaotic rotation
          turbulenceSkewRange: 3.5, // Chaotic skew
          contrastRange: 0.15, // Strong contrast (85%-115%)
          vignetteIntensity: 0.35,
        };
      default:
        return {
          scaleXDuration: 1000,
          tideDuration: 4000,
          turbulenceRotateRange: 2,
          turbulenceSkewRange: 1.5,
          contrastRange: 0.1,
          vignetteIntensity: 0.2,
        };
    }
  };

  const waveConfig = getWaveConfig();

  // Effect array to return
  const effects: any[] = [];

  // 1. PRIMARY HORIZONTAL WAVE (scaleX)
  // Oscillates 0.95 to 1.05 at fast intervals
  const scaleXEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    loop: true,
    composite: true,
    ranges: [
      { key: 'scaleX', val: 1, prog: 0 },
      { key: 'scaleX', val: 0.95, prog: 0.25 },
      { key: 'scaleX', val: 1, prog: 0.5 },
      { key: 'scaleX', val: 1.05, prog: 0.75 },
      { key: 'scaleX', val: 1, prog: 1 },
    ],
  };

  effects.push({
    id: `${effectIdPrefix}-scaleX`,
    componentId: 'generic',
    data: scaleXEffect,
  });

  // 2. VERTICAL TIDE (translateY)
  // Slow oscillation -30px to 30px over 4000ms
  const tideRange = 30 * tideStrength;
  const translateYEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    loop: true,
    composite: true,
    ranges: [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -tideRange, prog: 0.25 },
      { key: 'translateY', val: 0, prog: 0.5 },
      { key: 'translateY', val: tideRange, prog: 0.75 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  effects.push({
    id: `${effectIdPrefix}-translateY`,
    componentId: 'generic',
    data: translateYEffect,
  });

  // 3. TURBULENCE (rotate)
  // Chaotic rotation based on turbulenceLevel
  const rotateRange = waveConfig.turbulenceRotateRange * turbulenceLevel;
  const rotateEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    loop: true,
    composite: true,
    ranges: [
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: -rotateRange, prog: 0.2 },
      { key: 'rotate', val: rotateRange, prog: 0.4 },
      { key: 'rotate', val: -rotateRange * 0.5, prog: 0.6 },
      { key: 'rotate', val: rotateRange * 0.7, prog: 0.8 },
      { key: 'rotate', val: 0, prog: 1 },
    ],
  };

  effects.push({
    id: `${effectIdPrefix}-rotate`,
    componentId: 'generic',
    data: rotateEffect,
  });

  // 4. TURBULENCE (skew)
  // Skew varies by turbulenceLevel
  const skewRange = waveConfig.turbulenceSkewRange * turbulenceLevel;
  const skewEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    loop: true,
    composite: true,
    ranges: [
      { key: 'skewX', val: 0, prog: 0 },
      { key: 'skewX', val: skewRange, prog: 0.3 },
      { key: 'skewX', val: -skewRange, prog: 0.6 },
      { key: 'skewX', val: 0, prog: 1 },
    ],
  };

  effects.push({
    id: `${effectIdPrefix}-skew`,
    componentId: 'generic',
    data: skewEffect,
  });

  // 5. DYNAMIC CONTRAST FILTER (refraction)
  // Shifts between 90% and 110% (adjustable by refractionIntensity)
  const baseContrast = 1;
  const contrastVariation = waveConfig.contrastRange * refractionIntensity;
  const minContrast = baseContrast - contrastVariation;
  const maxContrast = baseContrast + contrastVariation;

  const contrastEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    loop: true,
    composite: true,
    ranges: [
      { key: 'filter', val: `contrast(${baseContrast})`, prog: 0 },
      { key: 'filter', val: `contrast(${minContrast})`, prog: 0.25 },
      { key: 'filter', val: `contrast(${baseContrast})`, prog: 0.5 },
      { key: 'filter', val: `contrast(${maxContrast})`, prog: 0.75 },
      { key: 'filter', val: `contrast(${baseContrast})`, prog: 1 },
    ],
  };

  effects.push({
    id: `${effectIdPrefix}-contrast`,
    componentId: 'generic',
    data: contrastEffect,
  });

  // 6. VIGNETTE EFFECT (box-shadow)
  // Inset box-shadow that darkens edges during peak distortion
  const vignetteIntensity = waveConfig.vignetteIntensity;
  const minVignette = `inset 0 0 50px rgba(0,0,0,${vignetteIntensity * 0.3})`;
  const maxVignette = `inset 0 0 100px rgba(0,0,0,${vignetteIntensity})`;

  const vignetteEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds: params.targetIds,
    loop: true,
    composite: true,
    ranges: [
      { key: 'boxShadow', val: minVignette, prog: 0 },
      { key: 'boxShadow', val: maxVignette, prog: 0.5 },
      { key: 'boxShadow', val: minVignette, prog: 1 },
    ],
  };

  effects.push({
    id: `${effectIdPrefix}-vignette`,
    componentId: 'generic',
    data: vignetteEffect,
  });

  // Return effects in a container structure
  const rootContainer: RenderableComponentData = {
    id: 'tidal-wave-effect-container',
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
        duration: effectDuration,
      },
    },
    effects: effects,
    childrenData: [],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effects,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'TidalWaveDistortion',
  title: 'Tidal Wave Distortion Effect',
  description:
    'Internal effect preset that combines multiple wave patterns to simulate tidal water movement with layered animations: horizontal scaleX waves (0.95-1.05), vertical translateY tide oscillation (-30px to 30px), turbulence using rotate/skew, dynamic contrast filter (90%-110%), and edge vignette using box-shadow. Configurable parameters control tide strength, turbulence level, refraction intensity, and wave pattern (calm/choppy/storm). Optimized for full-screen video backgrounds.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'tidal', 'wave', 'distortion', 'water', 'turbulence', 'vignette'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['video-background'],
    tideStrength: 0.7,
    turbulenceLevel: 0.5,
    refractionIntensity: 1,
    wavePattern: 'calm',
    effectStart: 0,
    effectDuration: 4,
  },
};

// Export preset
export const TidalWaveDistortionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
