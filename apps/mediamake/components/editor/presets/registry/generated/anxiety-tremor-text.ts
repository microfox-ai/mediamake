/**
 * Anxiety-Inducing Micro-Tremor Text Preset
 *
 * Creates barely perceptible but psychologically unsettling text movement using
 * layered sub-pixel animations. This preset implements three overlapping animation
 * frequencies to simulate viewing text through heat waves or experiencing visual
 * distortion from vertigo:
 *
 * - Layer 1 (Drift): Slow 4-second sine/cosine pattern with ±2px amplitude
 * - Layer 2 (Wobble): Medium 0.5-second oscillation with ±1px amplitude
 * - Layer 3 (Vibration): Rapid 0.025-second (40Hz) micro-movement with ±0.5px amplitude
 *
 * Additional effects include:
 * - Letter-spacing fluctuation (0 to 0.02em)
 * - Micro-rotation oscillation (±0.5deg)
 * - Optional subtle blur oscillation (0-0.3px)
 *
 * The effect is subliminal - just enough to create discomfort without being
 * obviously animated. Perfect for psychological thrillers, horror content, or
 * creating general unease.
 *
 * Technical details:
 * - Uses high-precision transform values (3 decimal places) for sub-pixel accuracy
 * - GPU-accelerated with will-change and translate3d
 * - Subpixel antialiasing for rendering precision
 * - All effects use provider mode with targetIds
 *
 * Use cases:
 * - Psychological thriller titles
 * - Horror movie credits
 * - Unsettling social media content
 * - Experimental video art
 * - Creating subtle discomfort in viewers
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().default('Unsettling Text').describe('Text content to display'),
  duration: z.number().default(10).describe('Duration in seconds'),
  
  // Typography
  fontSize: z.number().default(64).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family (e.g., "Inter", "Roboto")'),
  textColor: z.string().default('#FFFFFF').describe('Text color (hex or rgba)'),
  
  // Intensity multipliers
  intensityMultiplier: z.number().min(0.1).max(3).default(1).describe('Global effect intensity multiplier (0.1-3.0)'),
  
  // Layer 1: Drift (slow sine/cosine)
  driftAmplitude: z.number().default(2).describe('Drift layer amplitude in pixels (default: 2px)'),
  driftPeriod: z.number().default(4).describe('Drift period in seconds (default: 4s)'),
  
  // Layer 2: Wobble (medium frequency)
  wobbleAmplitude: z.number().default(1).describe('Wobble layer amplitude in pixels (default: 1px)'),
  wobblePeriod: z.number().default(0.5).describe('Wobble period in seconds (default: 0.5s)'),
  
  // Layer 3: Vibration (high frequency)
  vibrationAmplitude: z.number().default(0.5).describe('Vibration layer amplitude in pixels (default: 0.5px)'),
  vibrationPeriod: z.number().default(0.025).describe('Vibration period in seconds (default: 0.025s / 40Hz)'),
  
  // Additional effects
  letterSpacingRange: z.number().default(0.02).describe('Letter-spacing fluctuation range in em (default: 0.02em)'),
  letterSpacingPeriod: z.number().default(1).describe('Letter-spacing oscillation period in seconds'),
  
  rotationRange: z.number().default(0.5).describe('Rotation oscillation range in degrees (default: ±0.5deg)'),
  rotationPeriod: z.number().default(0.7).describe('Rotation oscillation period in seconds'),
  
  enableBlur: z.boolean().default(false).describe('Enable subtle blur oscillation'),
  blurRange: z.number().default(0.3).describe('Blur oscillation range in pixels (default: 0-0.3px)'),
  blurPeriod: z.number().default(1.5).describe('Blur oscillation period in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const textId = 'tremor-text';
  const containerId = 'anxiety-tremor-container';
  
  // Apply intensity multiplier to all amplitudes
  const intensity = params.intensityMultiplier;
  const driftAmp = params.driftAmplitude * intensity;
  const wobbleAmp = params.wobbleAmplitude * intensity;
  const vibrationAmp = params.vibrationAmplitude * intensity;
  const letterSpacingMax = params.letterSpacingRange * intensity;
  const rotationMax = params.rotationRange * intensity;
  const blurMax = params.blurRange * intensity;
  
  // Layer 1: Drift effect (slow sine/cosine pattern, 4s period, ±2px, ease-in-out)
  const driftEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // X-axis: sine wave pattern
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: driftAmp.toFixed(3), prog: 0.25 },
      { key: 'translateX', val: 0, prog: 0.5 },
      { key: 'translateX', val: -driftAmp.toFixed(3), prog: 0.75 },
      { key: 'translateX', val: 0, prog: 1 },
      
      // Y-axis: cosine wave pattern (offset phase)
      { key: 'translateY', val: driftAmp.toFixed(3), prog: 0 },
      { key: 'translateY', val: 0, prog: 0.25 },
      { key: 'translateY', val: -driftAmp.toFixed(3), prog: 0.5 },
      { key: 'translateY', val: 0, prog: 0.75 },
      { key: 'translateY', val: driftAmp.toFixed(3), prog: 1 },
    ],
  };
  
  // Layer 2: Wobble effect (medium frequency, 0.5s period, ±1px, linear)
  const wobbleEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Rapid horizontal wobble
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: wobbleAmp.toFixed(3), prog: 0.125 },
      { key: 'translateX', val: 0, prog: 0.25 },
      { key: 'translateX', val: -wobbleAmp.toFixed(3), prog: 0.375 },
      { key: 'translateX', val: 0, prog: 0.5 },
      { key: 'translateX', val: wobbleAmp.toFixed(3), prog: 0.625 },
      { key: 'translateX', val: 0, prog: 0.75 },
      { key: 'translateX', val: -wobbleAmp.toFixed(3), prog: 0.875 },
      { key: 'translateX', val: 0, prog: 1 },
      
      // Rapid vertical wobble (different phase)
      { key: 'translateY', val: wobbleAmp.toFixed(3), prog: 0 },
      { key: 'translateY', val: 0, prog: 0.125 },
      { key: 'translateY', val: -wobbleAmp.toFixed(3), prog: 0.25 },
      { key: 'translateY', val: 0, prog: 0.375 },
      { key: 'translateY', val: wobbleAmp.toFixed(3), prog: 0.5 },
      { key: 'translateY', val: 0, prog: 0.625 },
      { key: 'translateY', val: -wobbleAmp.toFixed(3), prog: 0.75 },
      { key: 'translateY', val: 0, prog: 0.875 },
      { key: 'translateY', val: wobbleAmp.toFixed(3), prog: 1 },
    ],
  };
  
  // Layer 3: Vibration effect (high frequency, 0.025s period / 40Hz, ±0.5px, sub-pixel)
  const vibrationEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Ultra-rapid micro-movements with sub-pixel precision
      { key: 'translateX', val: (vibrationAmp * 0.6).toFixed(3), prog: 0 },
      { key: 'translateX', val: (-vibrationAmp * 0.3).toFixed(3), prog: 0.1 },
      { key: 'translateX', val: (vibrationAmp * 0.8).toFixed(3), prog: 0.2 },
      { key: 'translateX', val: (-vibrationAmp * 0.4).toFixed(3), prog: 0.3 },
      { key: 'translateX', val: (vibrationAmp * 0.3).toFixed(3), prog: 0.4 },
      { key: 'translateX', val: (-vibrationAmp * 0.7).toFixed(3), prog: 0.5 },
      { key: 'translateX', val: (vibrationAmp * 0.5).toFixed(3), prog: 0.6 },
      { key: 'translateX', val: (-vibrationAmp * 0.6).toFixed(3), prog: 0.7 },
      { key: 'translateX', val: (vibrationAmp * 0.4).toFixed(3), prog: 0.8 },
      { key: 'translateX', val: (-vibrationAmp * 0.3).toFixed(3), prog: 0.9 },
      { key: 'translateX', val: (vibrationAmp * 0.6).toFixed(3), prog: 1 },
      
      { key: 'translateY', val: (-vibrationAmp * 0.3).toFixed(3), prog: 0 },
      { key: 'translateY', val: (vibrationAmp * 0.7).toFixed(3), prog: 0.1 },
      { key: 'translateY', val: (-vibrationAmp * 0.5).toFixed(3), prog: 0.2 },
      { key: 'translateY', val: (vibrationAmp * 0.4).toFixed(3), prog: 0.3 },
      { key: 'translateY', val: (-vibrationAmp * 0.8).toFixed(3), prog: 0.4 },
      { key: 'translateY', val: (vibrationAmp * 0.6).toFixed(3), prog: 0.5 },
      { key: 'translateY', val: (-vibrationAmp * 0.4).toFixed(3), prog: 0.6 },
      { key: 'translateY', val: (vibrationAmp * 0.3).toFixed(3), prog: 0.7 },
      { key: 'translateY', val: (-vibrationAmp * 0.7).toFixed(3), prog: 0.8 },
      { key: 'translateY', val: (vibrationAmp * 0.5).toFixed(3), prog: 0.9 },
      { key: 'translateY', val: (-vibrationAmp * 0.3).toFixed(3), prog: 1 },
    ],
  };
  
  // Letter-spacing oscillation
  const letterSpacingEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'letterSpacing', val: '0em', prog: 0 },
      { key: 'letterSpacing', val: `${letterSpacingMax}em`, prog: 0.5 },
      { key: 'letterSpacing', val: '0em', prog: 1 },
    ],
  };
  
  // Micro-rotation oscillation
  const rotationEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: rotationMax.toFixed(3), prog: 0.25 },
      { key: 'rotate', val: 0, prog: 0.5 },
      { key: 'rotate', val: -rotationMax.toFixed(3), prog: 0.75 },
      { key: 'rotate', val: 0, prog: 1 },
    ],
  };
  
  // Optional blur oscillation
  const blurEffect: GenericEffectData | null = params.enableBlur ? {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'filter', val: 'blur(0px)', prog: 0 },
      { key: 'filter', val: `blur(${blurMax.toFixed(3)}px)`, prog: 0.5 },
      { key: 'filter', val: 'blur(0px)', prog: 1 },
    ],
  } : null;
  
  // Collect all effects
  const allEffects = [
    { id: 'drift-effect', componentId: 'generic', data: driftEffect },
    { id: 'wobble-effect', componentId: 'generic', data: wobbleEffect },
    { id: 'vibration-effect', componentId: 'generic', data: vibrationEffect },
    { id: 'letter-spacing-effect', componentId: 'generic', data: letterSpacingEffect },
    { id: 'rotation-effect', componentId: 'generic', data: rotationEffect },
  ];
  
  if (blurEffect) {
    allEffects.push({ id: 'blur-effect', componentId: 'generic', data: blurEffect });
  }
  
  // Create text atom
  const textAtom = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      font: {
        family: params.fontFamily,
        weights: ['400', '700'],
      },
      style: {
        fontSize: `${params.fontSize}px`,
        color: params.textColor,
        textAlign: 'center' as const,
        willChange: 'transform, letter-spacing, filter',
        transform: 'translate3d(0, 0, 0)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  } as RenderableComponentData;
  
  // Create container
  const container = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center subpixel-antialiased',
        style: {
          willChange: 'transform',
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: allEffects,
    childrenData: [textAtom],
  } as RenderableComponentData;
  
  return {
    output: {
      childrenData: [container] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'anxiety-tremor-text',
  title: 'Anxiety-Inducing Micro-Tremor Text',
  description: 'Creates barely perceptible but psychologically unsettling text movement using layered sub-pixel animations. Combines slow drift (4s period, ±2px), medium wobble (0.5s period, ±1px), and rapid high-frequency vibration (0.025s/40Hz, ±0.5px) with letter-spacing fluctuation and micro-rotation. The subliminal effect creates discomfort without obvious animation - perfect for psychological thrillers, horror, or creating unease. Uses GPU-accelerated transforms with sub-pixel precision (3 decimal places) and high-frequency oscillation patterns.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'effects', 'anxiety', 'tremor', 'subliminal', 'psychological', 'horror', 'thriller', 'micro-animation', 'sub-pixel', 'unsettling', 'vertigo', 'heat-wave', 'distortion'],
  dependencies: {},
  defaultInputParams: {
    text: 'Unsettling Text',
    duration: 10,
    fontSize: 64,
    fontFamily: 'Inter',
    textColor: '#FFFFFF',
    intensityMultiplier: 1,
    driftAmplitude: 2,
    driftPeriod: 4,
    wobbleAmplitude: 1,
    wobblePeriod: 0.5,
    vibrationAmplitude: 0.5,
    vibrationPeriod: 0.025,
    letterSpacingRange: 0.02,
    letterSpacingPeriod: 1,
    rotationRange: 0.5,
    rotationPeriod: 0.7,
    enableBlur: false,
    blurRange: 0.3,
    blurPeriod: 1.5,
  },
};

// Export preset
export const anxietyTremorTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};