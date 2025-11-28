/**
 * Dreamy Gaussian Blur Dissolve Text Preset
 *
 * A meditative text reveal effect that transitions from an ethereal, dream-like blur
 * to sharp reality. Features extreme initial blur (25px) with breathing scale animation
 * during blur phase, opacity fade-in, color temperature shift (cool to neutral), and
 * glow text-shadow that dissipates as focus is achieved.
 *
 * Technical Features:
 * - Extreme initial blur (25px) with smooth reduction to sharp focus
 * - Breathing animation (scale oscillating 0.98-1.02) during first 60% of animation
 * - Opacity fade-in from 0.4 to 1.0
 * - Color temperature shift via hue-rotate (cool blue tint to neutral)
 * - Glow effect via text-shadow (dissipates as focus achieved)
 * - GPU acceleration via translateZ(0)
 * - Slow, meditative timing (4.5s) with custom easing
 *
 * Use Cases:
 * - Dreamy title reveals
 * - Waking-from-dream transitions
 * - Emerging-from-underwater effects
 * - Meditative content intros
 * - Ethereal brand reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('The text content to display'),
  
  fontSize: z
    .union([z.number(), z.string()])
    .default(72)
    .describe('Font size for the text (number in px or string like "72px")'),
  
  color: z
    .string()
    .default('#FFFFFF')
    .describe('Text color when fully focused (neutral state)'),
  
  fontWeight: z
    .union([z.string(), z.number()])
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold", 700)'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (Google Font)'),
  
  duration: z
    .number()
    .default(4.5)
    .describe('Total duration of the dream-blur-dissolve effect in seconds'),
  
  initialBlur: z
    .number()
    .min(10)
    .max(40)
    .default(25)
    .describe('Initial blur amount in pixels (extreme blur state)'),
  
  initialOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Initial opacity (0-1, ethereal state)'),
  
  initialBrightness: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .describe('Initial brightness multiplier (glow effect)'),
  
  initialHueRotate: z
    .number()
    .min(-30)
    .max(0)
    .default(-10)
    .describe('Initial hue rotation in degrees (negative = cool blue tint)'),
  
  breathingScaleMin: z
    .number()
    .min(0.9)
    .max(1)
    .default(0.98)
    .describe('Minimum scale during breathing animation'),
  
  breathingScaleMax: z
    .number()
    .min(1)
    .max(1.1)
    .default(1.02)
    .describe('Maximum scale during breathing animation'),
  
  breathingDurationPercent: z
    .number()
    .min(0.3)
    .max(0.8)
    .default(0.6)
    .describe('Percentage of total duration for breathing effect (0-1, default 0.6 = 60%)'),
  
  glowColor: z
    .string()
    .default('rgba(100,150,255,0.5)')
    .describe('Glow color in rgba format'),
  
  glowRadius: z
    .number()
    .min(10)
    .max(50)
    .default(30)
    .describe('Initial glow radius in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    text,
    fontSize,
    color,
    fontWeight,
    fontFamily,
    duration,
    initialBlur,
    initialOpacity,
    initialBrightness,
    initialHueRotate,
    breathingScaleMin,
    breathingScaleMax,
    breathingDurationPercent,
    glowColor,
    glowRadius,
  } = params;

  // Calculate timing breakpoints
  const breathingDuration = duration * breathingDurationPercent;

  // Component IDs
  const containerId = 'dreamy-blur-container';
  const textId = 'dreamy-blur-text';

  // Parse fontSize to ensure it's a number for calculations
  const fontSizeNum = typeof fontSize === 'string' 
    ? parseInt(fontSize, 10) 
    : fontSize;

  // ============================================================================
  // EFFECTS DEFINITION
  // ============================================================================

  // Effect 1: Main blur + brightness + hue-rotate (filter animation)
  const filterEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Blur: 25px → 0px
      { key: 'blur', val: `${initialBlur}px`, prog: 0 },
      { key: 'blur', val: '0px', prog: 1 },
      
      // Brightness: 1.2 → 1.0 (glow dissipates)
      { key: 'brightness', val: initialBrightness, prog: 0 },
      { key: 'brightness', val: 1, prog: 1 },
      
      // Hue-rotate: -10deg → 0deg (cool to neutral)
      { key: 'hueRotate', val: initialHueRotate, prog: 0 },
      { key: 'hueRotate', val: 0, prog: 1 },
    ],
  };

  // Effect 2: Opacity fade-in
  const opacityEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'opacity', val: initialOpacity, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Effect 3: Breathing scale animation (first 60% of animation)
  const breathingEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: breathingDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Breathe in: min → max
      { key: 'scale', val: breathingScaleMin, prog: 0 },
      { key: 'scale', val: breathingScaleMax, prog: 0.25 },
      // Breathe out: max → min
      { key: 'scale', val: breathingScaleMin, prog: 0.5 },
      // Breathe in: min → max
      { key: 'scale', val: breathingScaleMax, prog: 0.75 },
      // Stabilize to 1.0
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  // Effect 4: Text-shadow glow (dissipates)
  const glowEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { 
        key: 'textShadow', 
        val: `0 0 ${glowRadius}px ${glowColor}`, 
        prog: 0 
      },
      { 
        key: 'textShadow', 
        val: `0 0 0px rgba(0,0,0,0)`, 
        prog: 1 
      },
    ],
  };

  // Create effect objects
  const effects = [
    {
      id: 'dreamy-blur-filter-effect',
      componentId: 'generic',
      data: filterEffect,
    },
    {
      id: 'dreamy-blur-opacity-effect',
      componentId: 'generic',
      data: opacityEffect,
    },
    {
      id: 'dreamy-blur-breathing-effect',
      componentId: 'generic',
      data: breathingEffect,
    },
    {
      id: 'dreamy-blur-glow-effect',
      componentId: 'generic',
      data: glowEffect,
    },
  ];

  // ============================================================================
  // TEXT ATOM
  // ============================================================================

  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSizeNum,
        color: color,
        fontWeight: fontWeight,
        textAlign: 'center',
        transform: 'translateZ(0)', // GPU acceleration
      },
      font: {
        family: fontFamily,
        weights: ['400', '500', '600', '700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // ============================================================================
  // CONTAINER LAYOUT
  // ============================================================================

  const container: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: effects,
    childrenData: [textAtom],
  };

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

  return {
    output: {
      childrenData: [container] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'dreamy-blur-dissolve-text',
  title: 'Dreamy Gaussian Blur Dissolve',
  description:
    'A meditative text reveal effect that transitions from an ethereal, dream-like blur to sharp reality. Features extreme initial blur (25px) with breathing scale animation during blur phase, opacity fade-in, and glow text-shadow that dissipates as focus is achieved. Uses slow 4.5s timing with smooth easing for a waking-from-dream sensation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'blur',
    'dissolve',
    'dreamy',
    'ethereal',
    'gaussian',
    'breathing',
    'glow',
    'fade',
    'meditative',
    'slow',
    'smooth',
    'waking',
    'underwater',
    'focus',
    'reveal',
  ],
  defaultInputParams: {
    text: 'Dreamy Text Reveal',
    fontSize: 72,
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Inter',
    duration: 4.5,
    initialBlur: 25,
    initialOpacity: 0.4,
    initialBrightness: 1.2,
    initialHueRotate: -10,
    breathingScaleMin: 0.98,
    breathingScaleMax: 1.02,
    breathingDurationPercent: 0.6,
    glowColor: 'rgba(100,150,255,0.5)',
    glowRadius: 30,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const dreamyBlurDissolveTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
