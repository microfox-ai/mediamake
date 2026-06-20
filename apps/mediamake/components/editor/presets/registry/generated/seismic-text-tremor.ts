/**
 * Seismic Text Tremor Preset
 *
 * Creates an earthquake-style text animation with three distinct phases:
 * 1. Anticipation (0-20%): Subtle vibration with ±1px displacement
 * 2. Climax (20-60%): Violent shaking up to ±20px with blur and letter-spacing expansion
 * 3. Recovery (60-100%): Spring-dampened oscillations settling back to rest
 *
 * Features:
 * - Three-phase seismic animation (anticipation → climax → recovery)
 * - Random directional shaking with peak amplitude of 15-20px
 * - Motion blur simulation during peak intensity (0-2px blur)
 * - Letter-spacing expansion to 0.2em during shake (text torn apart effect)
 * - Scale pulsing (0.98-1.02) during climax
 * - Spring physics recovery with overshoot and dampening
 * - Performance-optimized with batched transforms
 * - Configurable intensity, duration ratios, and blur amount
 *
 * Use cases:
 * - Dramatic reveal moments in thrillers
 * - Emphasizing shock or revelation
 * - Impact words in trailers or promos
 * - Earthquake or disaster scene text effects
 * - High-energy transitions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().describe('Text content to display with seismic effect'),
  
  // Duration and timing
  duration: z
    .number()
    .positive()
    .default(3)
    .describe('Total duration of the seismic animation in seconds'),
  
  // Phase duration ratios
  anticipationRatio: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Ratio of total duration for anticipation phase (default: 0.2 = 20%)'),
  climaxRatio: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Ratio of total duration for climax phase (default: 0.4 = 40%)'),
  
  // Intensity parameters
  intensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Overall intensity multiplier for shake amplitude and effects'),
  maxDisplacement: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Maximum displacement in pixels during climax phase'),
  
  // Visual effects
  maxBlur: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Maximum blur in pixels during peak intensity (motion blur simulation)'),
  maxLetterSpacing: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Maximum letter spacing in em units during climax (text torn apart)'),
  
  // Scale pulsing
  enableScalePulse: z
    .boolean()
    .default(true)
    .describe('Enable scale pulsing during climax phase'),
  minScale: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.98)
    .describe('Minimum scale value during pulse'),
  maxScale: z
    .number()
    .min(1)
    .max(2)
    .default(1.02)
    .describe('Maximum scale value during pulse'),
  
  // Recovery physics
  recoveryOvershoot: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Overshoot factor during recovery phase (spring physics)'),
  
  // Typography
  fontSize: z
    .union([z.string(), z.number()])
    .default('64px')
    .describe('Font size (e.g., "64px" or 64)'),
  fontWeight: z
    .union([z.string(), z.number()])
    .default('bold')
    .describe('Font weight (e.g., "bold", 700)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  color: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Calculate phase timings
  const totalDuration = params.duration;
  const anticipationDuration = totalDuration * params.anticipationRatio;
  const climaxDuration = totalDuration * params.climaxRatio;
  const recoveryDuration = totalDuration * (1 - params.anticipationRatio - params.climaxRatio);
  
  // Apply intensity multiplier
  const maxDisplacement = params.maxDisplacement * params.intensity;
  const maxBlur = params.maxBlur * params.intensity;
  const maxLetterSpacing = params.maxLetterSpacing * params.intensity;
  
  // Component IDs
  const containerId = 'seismic-text-container';
  const textId = 'seismic-text';
  
  // Helper function to generate random displacement
  const generateRandomDisplacement = (amplitude: number, seed: number): { x: number; y: number } => {
    // Use seed for pseudo-randomness
    const random1 = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    const random2 = Math.sin(seed * 93.9898 + 12.233) * 43758.5453;
    const x = (random1 - Math.floor(random1)) * 2 - 1;
    const y = (random2 - Math.floor(random2)) * 2 - 1;
    return {
      x: x * amplitude,
      y: y * amplitude,
    };
  };
  
  // Build animation ranges for the seismic effect
  const buildSeismicRanges = (): GenericEffectData['ranges'] => {
    const ranges: GenericEffectData['ranges'] = [];
    
    // Phase 1: Anticipation (0-20%)
    const anticipationEndProg = params.anticipationRatio;
    
    // Subtle vibration with ±1px
    ranges.push(
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: 1 * params.intensity, prog: anticipationEndProg * 0.25 },
      { key: 'translateX', val: -1 * params.intensity, prog: anticipationEndProg * 0.5 },
      { key: 'translateX', val: 1 * params.intensity, prog: anticipationEndProg * 0.75 },
      { key: 'translateX', val: 0, prog: anticipationEndProg },
      
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -1 * params.intensity, prog: anticipationEndProg * 0.25 },
      { key: 'translateY', val: 1 * params.intensity, prog: anticipationEndProg * 0.5 },
      { key: 'translateY', val: -1 * params.intensity, prog: anticipationEndProg * 0.75 },
      { key: 'translateY', val: 0, prog: anticipationEndProg },
    );
    
    // Phase 2: Climax (20-60%)
    const climaxStartProg = anticipationEndProg;
    const climaxEndProg = anticipationEndProg + params.climaxRatio;
    
    // Generate intense shaking keyframes every ~5% progress
    const climaxSteps = 8;
    for (let i = 0; i <= climaxSteps; i++) {
      const prog = climaxStartProg + (i / climaxSteps) * params.climaxRatio;
      const progressInClimaxPhase = i / climaxSteps;
      
      // Amplitude ramps up to peak at middle, then sustains
      const amplitudeFactor = progressInClimaxPhase < 0.3 
        ? progressInClimaxPhase / 0.3 
        : 1;
      
      const displacement = generateRandomDisplacement(maxDisplacement * amplitudeFactor, i + 100);
      ranges.push(
        { key: 'translateX', val: displacement.x, prog },
        { key: 'translateY', val: displacement.y, prog },
      );
    }
    
    // Blur progression during climax
    ranges.push(
      { key: 'filter', val: 'blur(0px)', prog: climaxStartProg },
      { key: 'filter', val: `blur(${maxBlur}px)`, prog: climaxStartProg + params.climaxRatio * 0.5 },
      { key: 'filter', val: `blur(${maxBlur}px)`, prog: climaxEndProg },
    );
    
    // Letter spacing expansion during climax
    ranges.push(
      { key: 'letterSpacing', val: '0em', prog: climaxStartProg },
      { key: 'letterSpacing', val: `${maxLetterSpacing}em`, prog: climaxStartProg + params.climaxRatio * 0.5 },
      { key: 'letterSpacing', val: `${maxLetterSpacing}em`, prog: climaxEndProg },
    );
    
    // Scale pulsing during climax
    if (params.enableScalePulse) {
      const pulseCycles = 3;
      for (let i = 0; i <= pulseCycles * 2; i++) {
        const prog = climaxStartProg + (i / (pulseCycles * 2)) * params.climaxRatio;
        const scale = i % 2 === 0 ? params.minScale : params.maxScale;
        ranges.push({ key: 'scale', val: scale, prog });
      }
    } else {
      ranges.push(
        { key: 'scale', val: 1, prog: climaxStartProg },
        { key: 'scale', val: 1, prog: climaxEndProg },
      );
    }
    
    // Phase 3: Recovery (60-100%)
    const recoveryStartProg = climaxEndProg;
    
    // Dampening oscillations using decay envelope
    const recoverySteps = 10;
    for (let i = 0; i <= recoverySteps; i++) {
      const prog = recoveryStartProg + (i / recoverySteps) * (1 - recoveryStartProg);
      const progressInRecovery = i / recoverySteps;
      
      // Exponential decay with overshoot (spring physics)
      const decay = Math.exp(-4 * progressInRecovery);
      const overshoot = params.recoveryOvershoot * Math.sin(progressInRecovery * Math.PI * 3);
      const amplitude = (decay + overshoot) * maxDisplacement * 0.5;
      
      const displacement = generateRandomDisplacement(amplitude, i + 200);
      ranges.push(
        { key: 'translateX', val: displacement.x, prog },
        { key: 'translateY', val: displacement.y, prog },
      );
    }
    
    // Final settle
    ranges.push(
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: 0, prog: 1 },
    );
    
    // Blur fade out during recovery
    ranges.push(
      { key: 'filter', val: `blur(${maxBlur}px)`, prog: recoveryStartProg },
      { key: 'filter', val: 'blur(0px)', prog: recoveryStartProg + (1 - recoveryStartProg) * 0.5 },
      { key: 'filter', val: 'blur(0px)', prog: 1 },
    );
    
    // Letter spacing return during recovery
    ranges.push(
      { key: 'letterSpacing', val: `${maxLetterSpacing}em`, prog: recoveryStartProg },
      { key: 'letterSpacing', val: '0em', prog: recoveryStartProg + (1 - recoveryStartProg) * 0.5 },
      { key: 'letterSpacing', val: '0em', prog: 1 },
    );
    
    // Scale return during recovery
    ranges.push(
      { key: 'scale', val: params.enableScalePulse ? params.maxScale : 1, prog: recoveryStartProg },
      { key: 'scale', val: 1, prog: 1 },
    );
    
    return ranges;
  };
  
  // Create the seismic effect
  const seismicEffect = {
    id: 'seismic-tremor-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: totalDuration,
      mode: 'provider' as const,
      targetIds: [textId],
      ranges: buildSeismicRanges(),
    } as GenericEffectData,
  };
  
  // Create text atom
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: params.fontWeight,
        color: params.color,
        letterSpacing: '0em',
        willChange: 'transform, filter, letter-spacing',
      },
      font: {
        family: params.fontFamily,
        weights: ['400', '700', '900'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };
  
  // Create container layout
  const containerLayout: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center w-full h-full',
      },
      repeatChildrenProps: {
        className: 'relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [seismicEffect],
    childrenData: [textAtom],
  };
  
  return {
    output: {
      childrenData: [containerLayout] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'seismic-text-tremor',
  title: 'Seismic Text Tremor',
  description:
    'Earthquake-style text animation with three distinct phases: anticipation (subtle vibration), climax (violent shaking with blur and letter-spacing expansion), and recovery (spring-dampened oscillations). Creates dramatic emphasis for thriller moments, shock reveals, or impactful statements. Features configurable intensity, motion blur simulation, and spring physics recovery.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'seismic',
    'earthquake',
    'shake',
    'tremor',
    'dramatic',
    'thriller',
    'shock',
    'reveal',
    'impact',
    'motion-blur',
    'spring-physics',
    'three-phase',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'EARTHQUAKE',
    duration: 3,
    anticipationRatio: 0.2,
    climaxRatio: 0.4,
    intensity: 1,
    maxDisplacement: 20,
    maxBlur: 2,
    maxLetterSpacing: 0.2,
    enableScalePulse: true,
    minScale: 0.98,
    maxScale: 1.02,
    recoveryOvershoot: 0.15,
    fontSize: '64px',
    fontWeight: 'bold',
    fontFamily: 'Inter',
    color: '#FFFFFF',
  },
};

// Export preset
export const seismicTextTremorPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
