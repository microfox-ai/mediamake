/**
 * Neon Sign Outline Effect Preset
 *
 * SINGLE EFFECT:
 * Creates a realistic neon tube lighting effect with flickering animations that simulates electrical interference.
 * Uses multi-layer box-shadow for inner bright core and outer colored glow, with random flicker patterns using
 * AnimationRange with non-linear progression values.
 *
 * Features:
 * - **Multi-layer Box Shadow**: Inner bright core + outer color glow for realistic neon appearance
 * - **Flickering Animation**: Random flicker patterns with non-linear progression to simulate electrical interference
 * - **Configurable Colors**: Support for different neon colors (red, blue, green, pink, yellow, custom)
 * - **Flicker Modes**: Steady glow or intermittent flickering with adjustable intensity
 * - **Adjustable Glow**: Control glow radius and brightness
 * - **Opacity Flicker**: Combines box-shadow animation with opacity flicker for realistic effect
 * - **Brightness Control**: Filter-based brightness adjustments for intensity variations
 *
 * Use cases:
 * - Creating neon sign text effects
 * - Adding retro neon lighting to logos or shapes
 * - Building cyberpunk/retro-themed visual elements
 * - Simulating realistic electrical interference in neon tubes
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the neon effect to'),
  effectStart: z
    .number()
    .describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the neon effect'),
  neonColor: z
    .enum(['red', 'blue', 'green', 'pink', 'yellow', 'cyan', 'orange', 'custom'])
    .default('blue')
    .describe('Predefined neon color or custom'),
  customColor: z
    .string()
    .optional()
    .describe('Custom hex color when neonColor is set to "custom" (e.g., #FF00FF)'),
  flickerIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of the flicker effect (0 = no flicker, 1 = maximum flicker)'),
  steadyGlow: z
    .boolean()
    .default(false)
    .describe('If true, maintains steady glow without intermittent flickering'),
  glowRadius: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Radius of the neon glow effect in pixels'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate multi-layer neon shadow
  const generateNeonShadow = (color: string, intensity: number): string => {
    const glowRadius = params.glowRadius;
    const innerGlow = glowRadius * 0.3;
    const midGlow = glowRadius * 0.6;
    const outerGlow = glowRadius;

    // Inner bright core (white/bright)
    const innerCore = `0 0 ${innerGlow * 0.5}px rgba(255, 255, 255, ${0.9 * intensity})`;
    const innerLayer = `0 0 ${innerGlow}px ${color}`;
    
    // Mid glow layers
    const midLayer1 = `0 0 ${midGlow}px ${color}`;
    const midLayer2 = `0 0 ${midGlow * 1.2}px ${color}`;
    
    // Outer glow layers
    const outerLayer1 = `0 0 ${outerGlow}px ${color}`;
    const outerLayer2 = `0 0 ${outerGlow * 1.5}px ${color}`;

    return [
      innerCore,
      innerLayer,
      midLayer1,
      midLayer2,
      outerLayer1,
      outerLayer2,
    ].join(', ');
  };

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Get neon color
  const colorMap: Record<string, string> = {
    red: hexToRgba('#FF0040', 0.8),
    blue: hexToRgba('#00BFFF', 0.8),
    green: hexToRgba('#39FF14', 0.8),
    pink: hexToRgba('#FF10F0', 0.8),
    yellow: hexToRgba('#FFFF00', 0.8),
    cyan: hexToRgba('#00FFFF', 0.8),
    orange: hexToRgba('#FF6600', 0.8),
  };

  let neonColorValue: string;
  if (params.neonColor === 'custom' && params.customColor) {
    neonColorValue = hexToRgba(params.customColor, 0.8);
  } else {
    neonColorValue = colorMap[params.neonColor] || colorMap.blue;
  }

  const flickerIntensity = params.flickerIntensity;
  const steadyGlow = params.steadyGlow;

  // Generate flicker pattern with non-linear progression
  // Flicker pattern uses random prog values to simulate electrical interference
  const flickerProgValues = steadyGlow
    ? [0, 1] // Steady glow: just start and end
    : [
        0, 0.12, 0.125, 0.15, 0.2, 0.25, 0.3, 0.35, 0.5, 0.6, 0.65, 0.7, 0.8,
        0.85, 0.9, 1.0,
      ];

  // Box-shadow animation ranges
  const boxShadowRanges = flickerProgValues.map((prog, index) => {
    // Create flicker pattern with varying intensities
    let intensity: number;
    
    if (steadyGlow) {
      intensity = 1.0;
    } else {
      // Random flicker pattern
      if (index === 0) {
        intensity = 0.3; // Start dim
      } else if (prog < 0.15) {
        intensity = Math.random() * 0.4 + 0.2; // Quick flicker on
      } else if (prog < 0.25) {
        intensity = Math.random() * 0.3 + 0.1; // Flicker dim
      } else if (prog < 0.35) {
        intensity = Math.random() * 0.5 + 0.5; // Flicker bright
      } else if (prog < 0.65) {
        intensity = 1.0 - flickerIntensity * 0.2; // Mostly steady
      } else if (prog < 0.7) {
        intensity = Math.random() * 0.4 + 0.3; // Mid flicker
      } else if (prog < 0.85) {
        intensity = 1.0; // Full glow
      } else {
        intensity = Math.random() * 0.5 + 0.5; // End with slight variation
      }
      
      // Apply flicker intensity multiplier
      intensity = intensity * (1 - flickerIntensity * 0.3) + flickerIntensity * intensity;
    }

    return {
      key: 'textShadow',
      val: generateNeonShadow(neonColorValue, intensity),
      prog,
    };
  });

  // Opacity flicker ranges (subtle)
  const opacityRanges = flickerProgValues.map((prog, index) => {
    let opacity: number;
    
    if (steadyGlow) {
      opacity = 1.0;
    } else {
      // Subtle opacity variations to enhance flicker
      if (prog < 0.15) {
        opacity = 0.85 + Math.random() * 0.15;
      } else if (prog < 0.25) {
        opacity = 0.7 + Math.random() * 0.2;
      } else if (prog < 0.35) {
        opacity = 0.9 + Math.random() * 0.1;
      } else if (prog < 0.7) {
        opacity = 1.0;
      } else if (prog < 0.85) {
        opacity = 0.95 + Math.random() * 0.05;
      } else {
        opacity = 0.9 + Math.random() * 0.1;
      }
      
      // Scale by flicker intensity
      opacity = 1.0 - (1.0 - opacity) * flickerIntensity;
    }

    return {
      key: 'opacity',
      val: opacity,
      prog,
    };
  });

  // Brightness filter ranges for additional intensity variation
  const brightnessRanges = flickerProgValues.map((prog, index) => {
    let brightness: number;
    
    if (steadyGlow) {
      brightness = 1.2;
    } else {
      if (prog < 0.15) {
        brightness = 0.9 + Math.random() * 0.2;
      } else if (prog < 0.25) {
        brightness = 0.8 + Math.random() * 0.3;
      } else if (prog < 0.35) {
        brightness = 1.1 + Math.random() * 0.2;
      } else if (prog < 0.7) {
        brightness = 1.2;
      } else if (prog < 0.85) {
        brightness = 1.15 + Math.random() * 0.1;
      } else {
        brightness = 1.0 + Math.random() * 0.2;
      }
      
      // Scale by flicker intensity
      brightness = 1.0 + (brightness - 1.0) * (0.5 + flickerIntensity * 0.5);
    }

    return {
      key: 'filter',
      val: `brightness(${brightness})`,
      prog,
    };
  });

  // Construct the generic effect data
  const effectData: GenericEffectData = {
    type: 'linear', // Linear for realistic flicker simulation
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges: [
      ...boxShadowRanges,
      ...opacityRanges,
      ...brightnessRanges,
    ],
  };

  // Create the effect object
  const effect = {
    id: params.effectId || `neon-flicker-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'neon-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
            },
          },
          effects: [effect],
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
  id: 'neon-sign-effect',
  title: 'Neon Sign Outline Effect',
  description:
    'A reusable effect preset that applies realistic neon tube lighting with flickering animations. Uses multi-layer box-shadow for inner bright core and outer colored glow, with random flicker patterns using AnimationRange with non-linear progression values to simulate electrical interference. Supports configurable neon colors, flicker intensities, and steady/intermittent modes.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'neon', 'flicker', 'glow', 'text', 'generic', 'internal'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'text-component',
    effectStart: 0,
    effectDuration: 5,
    neonColor: 'blue',
    flickerIntensity: 0.7,
    steadyGlow: false,
    glowRadius: 20,
  },
};

export const neonSignEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
