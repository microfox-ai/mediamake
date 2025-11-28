/**
 * Neon Sign Flicker-On Effect Preset
 *
 * Creates a realistic vintage neon sign flicker-on animation where characters illuminate
 * one by one with electrical flickering effects. Simulates vintage neon signs powering up
 * with initial rapid flickers, stabilization attempts, and steady glow. Features:
 *
 * - Per-character flicker animation with realistic electrical patterns
 * - Color temperature shift from cold (blue) to warm (red/orange) as "neon" heats up
 * - Multiple glow effect layers: inner text-shadow, outer drop-shadow
 * - Variable flicker intensity per character for realism
 * - Continuous breathing pulse after stabilization
 * - Staggered activation with random variation
 * - Dark background for neon contrast
 *
 * Perfect for creating nostalgic vintage motel signs, theater marquees, or retro branding.
 *
 * Use Cases:
 * - Vintage title cards and intros
 * - Retro branding animations
 * - Nostalgic motel/diner aesthetics
 * - Theater marquee reveals
 * - 80s/90s themed content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
  TextAtomData,
  BaseLayoutData,
} from '@microfox/remotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text to display with neon flicker effect'),
  
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(64)
    .describe('Font size in pixels for the neon text'),
  
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700", "BebasNeue:800")'),
  
  flickerDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .describe('Duration of the initial flicker effect in seconds'),
  
  staggerDelay: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .describe('Base delay between character activations in seconds'),
  
  staggerRandomness: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Random variation in stagger timing (±seconds)'),
  
  glowIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Overall glow effect intensity multiplier'),
  
  pulseDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Duration of continuous breathing pulse in seconds'),
  
  coldColor: z
    .string()
    .default('rgb(150, 150, 255)')
    .describe('Initial cold neon color (blue-ish)'),
  
  warmColor: z
    .string()
    .default('rgb(255, 150, 150)')
    .describe('Final warm neon color (red/orange-ish)'),
  
  backgroundColor: z
    .string()
    .default('#111827')
    .describe('Dark background color (CSS color value)'),
  
  duration: z
    .number()
    .min(2)
    .max(30)
    .default(5)
    .describe('Total duration of the preset in seconds'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const fontString = params.fontFamily || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Random offset for stagger
  const randomOffset = () => {
    return (Math.random() - 0.5) * 2 * params.staggerRandomness;
  };

  // Helper: Random flicker intensity per character (0.7 - 1.3)
  const randomFlickerIntensity = () => {
    return 0.7 + Math.random() * 0.6;
  };

  // Split text into characters
  const characters = params.text.split('');
  
  // Create character components with effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `neon-char-${index}`;
      const charStart = index * params.staggerDelay + randomOffset();
      const flickerIntensity = randomFlickerIntensity();

      // Flicker opacity keyframes: [0, 1, 0, 0.3, 0, 1, 0.7, 0, 1, 0.9, 1]
      const flickerOpacityKeyframes = [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: flickerIntensity * 1, prog: 0.05 },
        { key: 'opacity', val: 0, prog: 0.1 },
        { key: 'opacity', val: flickerIntensity * 0.3, prog: 0.2 },
        { key: 'opacity', val: 0, prog: 0.3 },
        { key: 'opacity', val: flickerIntensity * 1, prog: 0.45 },
        { key: 'opacity', val: flickerIntensity * 0.7, prog: 0.6 },
        { key: 'opacity', val: 0, prog: 0.7 },
        { key: 'opacity', val: flickerIntensity * 1, prog: 0.85 },
        { key: 'opacity', val: flickerIntensity * 0.9, prog: 0.95 },
        { key: 'opacity', val: 1, prog: 1 },
      ];

      // Color temperature shift: cold (blue) to warm (red)
      const colorShiftKeyframes = [
        { key: 'color', val: params.coldColor, prog: 0 },
        { key: 'color', val: params.warmColor, prog: 1 },
      ];

      // Glow animation: text-shadow from none to intense
      const baseGlow = params.glowIntensity * 20;
      const glowKeyframes = [
        {
          key: 'textShadow',
          val: '0 0 0px currentColor',
          prog: 0,
        },
        {
          key: 'textShadow',
          val: `0 0 ${baseGlow}px currentColor, 0 0 ${baseGlow * 2}px currentColor`,
          prog: 1,
        },
      ];

      // Outer glow via filter drop-shadow
      const outerGlowKeyframes = [
        {
          key: 'filter',
          val: 'drop-shadow(0 0 0px currentColor)',
          prog: 0,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 ${baseGlow}px currentColor)`,
          prog: 1,
        },
      ];

      // Combine flicker effects (opacity + color + glow)
      const flickerEffect: GenericEffectData = {
        type: 'linear',
        start: charStart,
        duration: params.flickerDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          ...flickerOpacityKeyframes,
          ...colorShiftKeyframes,
          ...glowKeyframes,
          ...outerGlowKeyframes,
        ],
      };

      // Continuous breathing pulse after stabilization
      const pulseStart = charStart + params.flickerDuration;
      const pulseEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: pulseStart,
        duration: params.duration - pulseStart,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          // Subtle scale pulse: 1 -> 1.02 -> 1
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.02, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
          // Subtle opacity pulse: 0.9 -> 1 -> 0.9
          { key: 'opacity', val: 0.9, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 0.9, prog: 1 },
        ],
      };

      // Create character TextAtom
      const charComponent: RenderableComponentData = {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char === ' ' ? '\u00A0' : char, // Non-breaking space for proper spacing
          style: {
            fontSize: params.fontSize,
            ...fontStyle,
            color: params.coldColor, // Initial color (overridden by effects)
            textShadow: '0 0 0px currentColor', // Initial no glow (overridden by effects)
            filter: 'drop-shadow(0 0 0px currentColor)', // Initial no drop-shadow
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: `flicker-${charId}`,
            componentId: 'generic',
            data: flickerEffect,
          },
          {
            id: `pulse-${charId}`,
            componentId: 'generic',
            data: pulseEffect,
          },
        ],
      };

      return charComponent;
    },
  );

  // Root container with dark background
  const rootContainer: RenderableComponentData = {
    id: 'neon-sign-flicker-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    } as BaseLayoutData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      {
        id: 'neon-text-row',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row',
            style: {
              gap: '0.1em',
            },
          },
        } as BaseLayoutData,
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: characterComponents,
      } as RenderableComponentData,
    ],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'neonSignFlickerEffect',
  title: 'Vintage Neon Sign Flicker Effect',
  description:
    'Realistic neon sign flicker-on animation with per-character electrical flickering, glow effects, color temperature shifts from cold to warm, and subtle breathing pulse. Captures the nostalgic feel of vintage motel signs and theater marquees.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'neon',
    'flicker',
    'vintage',
    'retro',
    'glow',
    'electrical',
    'motel',
    'theater',
    'marquee',
    'nostalgic',
    'animation',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'NEON SIGN',
    fontSize: 64,
    fontFamily: 'Inter:700',
    flickerDuration: 0.6,
    staggerDelay: 0.15,
    staggerRandomness: 0.05,
    glowIntensity: 1,
    pulseDuration: 2,
    coldColor: 'rgb(150, 150, 255)',
    warmColor: 'rgb(255, 150, 150)',
    backgroundColor: '#111827',
    duration: 5,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const neonSignFlickerEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
