/**
 * Quantum Tunneling Text Effect Preset
 *
 * This preset creates a scientific text effect simulating quantum tunneling where text
 * phases out of existence by shrinking into subatomic particles. The text vibrates at
 * increasing frequency while shrinking, as if molecules are breaking apart.
 *
 * Features:
 * - **High-frequency vibration**: Starts subtle (1-2px), increases frequency as size reduces
 * - **Quantum shrinking**: Scale animation with pulsing sine wave modulation
 * - **Probability wave collapse**: Rapid opacity flickering with increasing frequency
 * - **Chromatic aberration**: RGB channel separation via text-shadow (0 to 4px)
 * - **Quantum fog**: Blur effect increasing as particles break apart
 * - **Performance optimized**: Uses Web Animations API timing with CSS animations
 *
 * Use cases:
 * - Tech/science content transitions
 * - Futuristic video intros/outros
 * - Scientific visualization content
 * - Modern tech product reveals
 * - Cyberpunk/sci-fi themed videos
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  text: z.string().describe('Text to display and animate with quantum effect'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the quantum tunneling effect (1-10 seconds)'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .optional()
    .describe('Font size in pixels (24-200)'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family (e.g., Inter, Roboto, Montserrat)'),
  fontWeight: z
    .string()
    .default('700')
    .optional()
    .describe('Font weight (e.g., 400, 700, bold)'),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Base text color (hex or rgba)'),
  vibrationIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .optional()
    .describe('Vibration intensity multiplier (0.5-3, default: 1)'),
  shrinkStart: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('When shrinking starts (0-1, where 0 = start, 1 = end)'),
  rgbSplitIntensity: z
    .number()
    .min(0)
    .max(8)
    .default(4)
    .optional()
    .describe('Maximum RGB channel separation in pixels (0-8)'),
  blurIntensity: z
    .number()
    .min(0)
    .max(40)
    .default(20)
    .optional()
    .describe('Maximum blur amount in pixels (0-40)'),
  position: z
    .enum(['center', 'top', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of text'),
});

// Main preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper functions defined inside execution
  const getPositionClass = (position: string): string => {
    switch (position) {
      case 'top':
        return 'items-start pt-20';
      case 'bottom':
        return 'items-end pb-20';
      default:
        return 'items-center';
    }
  };

  // Extract parameters with defaults
  const {
    text,
    duration,
    fontSize = 72,
    fontFamily = 'Inter',
    fontWeight = '700',
    textColor = '#ffffff',
    vibrationIntensity = 1,
    shrinkStart = 0.3,
    rgbSplitIntensity = 4,
    blurIntensity = 20,
    position = 'center',
  } = params;

  // Calculate timing phases
  const vibrationPhase = {
    start: 0,
    duration: duration,
  };

  const shrinkPhase = {
    start: duration * shrinkStart,
    duration: duration * (1 - shrinkStart),
  };

  const flickerPhase = {
    start: duration * 0.6,
    duration: duration * 0.4,
  };

  // Component IDs
  const containerId = 'quantum-tunneling-container';
  const textId = 'quantum-text';

  // Build vibration effect with multiple stages for increasing frequency
  const vibrationEffect = {
    id: 'quantum-vibration',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: vibrationPhase.start,
      duration: vibrationPhase.duration,
      mode: 'provider' as const,
      targetIds: [textId],
      ranges: [
        // Early phase: Subtle 1-2px horizontal vibration
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: 2 * vibrationIntensity, prog: 0.05 },
        { key: 'translateX', val: -2 * vibrationIntensity, prog: 0.1 },
        { key: 'translateX', val: 0, prog: 0.15 },
        // Mid phase: Increased frequency, both X and Y
        { key: 'translateX', val: 1.5 * vibrationIntensity, prog: 0.2 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -1.5 * vibrationIntensity, prog: 0.25 },
        { key: 'translateX', val: -1.5 * vibrationIntensity, prog: 0.3 },
        { key: 'translateY', val: 1.5 * vibrationIntensity, prog: 0.35 },
        { key: 'translateX', val: 1 * vibrationIntensity, prog: 0.4 },
        { key: 'translateY', val: -1 * vibrationIntensity, prog: 0.45 },
        // Late phase: High frequency, smaller amplitude (quantum uncertainty)
        { key: 'translateX', val: -0.5 * vibrationIntensity, prog: 0.5 },
        { key: 'translateY', val: 0.5 * vibrationIntensity, prog: 0.55 },
        { key: 'translateX', val: 0.5 * vibrationIntensity, prog: 0.6 },
        { key: 'translateY', val: -0.5 * vibrationIntensity, prog: 0.65 },
        { key: 'translateX', val: -0.3 * vibrationIntensity, prog: 0.7 },
        { key: 'translateY', val: 0.3 * vibrationIntensity, prog: 0.75 },
        { key: 'translateX', val: 0.3 * vibrationIntensity, prog: 0.8 },
        { key: 'translateY', val: -0.3 * vibrationIntensity, prog: 0.85 },
        { key: 'translateX', val: -0.2 * vibrationIntensity, prog: 0.9 },
        { key: 'translateY', val: 0.2 * vibrationIntensity, prog: 0.95 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  };

  // Scale shrinking effect with sine wave modulation for pulsing
  const scaleEffect = {
    id: 'quantum-scale-shrink',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const,
      start: shrinkPhase.start,
      duration: shrinkPhase.duration,
      mode: 'provider' as const,
      targetIds: [textId],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 0.95, prog: 0.1 },
        { key: 'scale', val: 0.85, prog: 0.2 },
        { key: 'scale', val: 0.8, prog: 0.25 },
        { key: 'scale', val: 0.7, prog: 0.35 },
        { key: 'scale', val: 0.65, prog: 0.4 },
        { key: 'scale', val: 0.5, prog: 0.5 },
        { key: 'scale', val: 0.45, prog: 0.55 },
        { key: 'scale', val: 0.3, prog: 0.65 },
        { key: 'scale', val: 0.25, prog: 0.7 },
        { key: 'scale', val: 0.15, prog: 0.8 },
        { key: 'scale', val: 0.1, prog: 0.85 },
        { key: 'scale', val: 0.05, prog: 0.95 },
        { key: 'scale', val: 0, prog: 1 },
      ],
    },
  };

  // Rapid opacity flickering (probability wave collapse)
  const opacityEffect = {
    id: 'quantum-opacity-flicker',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: flickerPhase.start,
      duration: flickerPhase.duration,
      mode: 'provider' as const,
      targetIds: [textId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.7, prog: 0.05 },
        { key: 'opacity', val: 1, prog: 0.1 },
        { key: 'opacity', val: 0.4, prog: 0.15 },
        { key: 'opacity', val: 0.9, prog: 0.2 },
        { key: 'opacity', val: 0.3, prog: 0.25 },
        { key: 'opacity', val: 0.8, prog: 0.3 },
        { key: 'opacity', val: 0.5, prog: 0.35 },
        { key: 'opacity', val: 0.9, prog: 0.4 },
        { key: 'opacity', val: 0.3, prog: 0.45 },
        { key: 'opacity', val: 0.7, prog: 0.5 },
        { key: 'opacity', val: 0.2, prog: 0.55 },
        { key: 'opacity', val: 0.6, prog: 0.6 },
        { key: 'opacity', val: 0.3, prog: 0.65 },
        { key: 'opacity', val: 0.5, prog: 0.7 },
        { key: 'opacity', val: 0.2, prog: 0.75 },
        { key: 'opacity', val: 0.4, prog: 0.8 },
        { key: 'opacity', val: 0.1, prog: 0.85 },
        { key: 'opacity', val: 0.3, prog: 0.9 },
        { key: 'opacity', val: 0.1, prog: 0.95 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Blur effect (quantum fog)
  const blurEffect = {
    id: 'quantum-blur',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const,
      start: shrinkPhase.start,
      duration: shrinkPhase.duration,
      mode: 'provider' as const,
      targetIds: [textId],
      ranges: [
        { key: 'filter', val: 'blur(0px)', prog: 0 },
        { key: 'filter', val: `blur(${blurIntensity * 0.2}px)`, prog: 0.3 },
        { key: 'filter', val: `blur(${blurIntensity * 0.4}px)`, prog: 0.5 },
        { key: 'filter', val: `blur(${blurIntensity * 0.6}px)`, prog: 0.7 },
        { key: 'filter', val: `blur(${blurIntensity * 0.8}px)`, prog: 0.85 },
        { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 1 },
      ],
    },
  };

  // RGB chromatic aberration effect via text-shadow
  // Red and blue channels separate as vibration increases
  const rgbSplitEffect = {
    id: 'quantum-rgb-split',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const,
      start: vibrationPhase.start + duration * 0.2,
      duration: duration * 0.8,
      mode: 'provider' as const,
      targetIds: [textId],
      ranges: [
        { key: 'textShadow', val: '0 0 0 rgba(255,0,0,0)', prog: 0 },
        {
          key: 'textShadow',
          val: `${rgbSplitIntensity * 0.2}px 0 0 rgba(255,0,0,0.5), -${rgbSplitIntensity * 0.2}px 0 0 rgba(0,0,255,0.5)`,
          prog: 0.3,
        },
        {
          key: 'textShadow',
          val: `${rgbSplitIntensity * 0.5}px 0 0 rgba(255,0,0,0.7), -${rgbSplitIntensity * 0.5}px 0 0 rgba(0,0,255,0.7)`,
          prog: 0.5,
        },
        {
          key: 'textShadow',
          val: `${rgbSplitIntensity * 0.75}px 0 0 rgba(255,0,0,0.8), -${rgbSplitIntensity * 0.75}px 0 0 rgba(0,0,255,0.8)`,
          prog: 0.7,
        },
        {
          key: 'textShadow',
          val: `${rgbSplitIntensity}px 0 0 rgba(255,0,0,0.9), -${rgbSplitIntensity}px 0 0 rgba(0,0,255,0.9)`,
          prog: 1,
        },
      ],
    },
  };

  // Build the component tree
  const textAtom = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight,
        color: textColor,
        textAlign: 'center',
        willChange: 'transform, opacity, filter',
        userSelect: 'none',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        display: 'swap' as const,
        preload: true,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      vibrationEffect,
      scaleEffect,
      opacityEffect,
      blurEffect,
      rgbSplitEffect,
    ],
  };

  const rootContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex justify-center ${getPositionClass(position)}`,
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textAtom],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'quantumTunnelingTextEffect',
  title: 'Quantum Tunneling Text Effect',
  description:
    'Advanced text effect simulating quantum tunneling where text phases out of existence by shrinking into subatomic particles. Features increasing vibration frequency, chromatic RGB aberration, rapid opacity flickering (probability wave collapse), and quantum fog blur effect. Perfect for tech, science, and futuristic content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'effects',
    'quantum',
    'tunneling',
    'science',
    'tech',
    'futuristic',
    'vibration',
    'chromatic-aberration',
    'rgb-split',
    'particle',
    'shrink',
    'blur',
    'advanced',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'QUANTUM',
    duration: 3,
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#ffffff',
    vibrationIntensity: 1,
    shrinkStart: 0.3,
    rgbSplitIntensity: 4,
    blurIntensity: 20,
    position: 'center',
  },
};

// Export preset
export const quantumTunnelingTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
