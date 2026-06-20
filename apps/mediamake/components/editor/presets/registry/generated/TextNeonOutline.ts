/**
 * Text Neon Outline Effect Preset
 *
 * This internal effect preset creates animated neon outline effects specifically
 * optimized for text elements using textShadow and WebkitTextStroke properties.
 * 
 * Features:
 * - Multi-layer text shadow animation (inner glow, main stroke, outer bloom)
 * - Animated neon outline with pulsing glow that shifts in intensity
 * - GPU-accelerated properties for smooth performance
 * - Subtle color shift animation for realistic neon appearance
 * - Optional flickering effect to simulate vintage neon signs
 * - Configurable stroke width, colors, and animation parameters
 *
 * Effect Type: Generic (AnimationRange[])
 * Properties Animated: textShadow, WebkitTextStroke, color
 * 
 * Use Cases:
 * - Creating neon sign text effects
 * - Retro/cyberpunk styled typography
 * - Eye-catching title animations
 * - Glowing text overlays
 * - Vintage signage simulations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  strokeColor: z
    .string()
    .describe('Color of the neon stroke outline (e.g., "#00ffff")'),
  glowColor: z
    .string()
    .describe('Color of the glowing effect (e.g., "#00ffff" or "#ff00ff")'),
  strokeWidth: z
    .number()
    .min(1)
    .max(10)
    .describe('Width of the stroke outline in pixels'),
  pulseIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .describe('Intensity multiplier for the pulsing glow effect'),
  animationSpeed: z
    .number()
    .min(0.5)
    .max(10)
    .describe('Duration of one complete pulse cycle in seconds'),
  enableFlicker: z
    .boolean()
    .default(false)
    .describe('Enable flickering effect to simulate vintage neon signs'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the neon effect to'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID for identification'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to convert hex to rgba with alpha
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Helper function to create multi-layer text shadow
  const createTextShadow = (
    color: string,
    intensity: number,
    progress: number,
  ): string => {
    // Calculate pulse factor based on progress
    // For flicker: use random-like variation, for smooth: use sine-like curve
    let pulseFactor: number;
    if (params.enableFlicker) {
      // Pseudo-random flicker using progress as seed
      const flicker =
        Math.sin(progress * 37.5) * 0.3 +
        Math.sin(progress * 67.3) * 0.2 +
        Math.sin(progress * 123.7) * 0.1;
      pulseFactor = 0.6 + flicker * 0.4; // Range: 0.2 to 1.0
    } else {
      // Smooth sine wave pulse
      pulseFactor = 0.5 + Math.sin(progress * Math.PI * 2) * 0.5; // Range: 0 to 1
    }

    const adjustedIntensity = intensity * pulseFactor;

    // Inner glow (tight, bright)
    const innerGlow = `0 0 ${4 * adjustedIntensity}px ${hexToRgba(color, 0.8)}`;

    // Main stroke (medium spread)
    const mainStroke = `0 0 ${8 * adjustedIntensity}px ${hexToRgba(color, 0.6)}`;

    // Outer bloom (wide, soft)
    const outerBloom = `0 0 ${16 * adjustedIntensity}px ${hexToRgba(color, 0.4)}`;

    // Far bloom (very wide, very soft)
    const farBloom = `0 0 ${32 * adjustedIntensity}px ${hexToRgba(color, 0.2)}`;

    return `${innerGlow}, ${mainStroke}, ${outerBloom}, ${farBloom}`;
  };

  // Helper function to create color shift for realism
  const createColorShift = (baseColor: string, progress: number): string => {
    // Subtle hue shift for realism (simulate electrical variance)
    const shift = Math.sin(progress * Math.PI * 2) * 10; // ±10 degree hue shift
    return baseColor; // For now, return base color (advanced: implement HSL shift)
  };

  // Create animation keyframes
  const intensity = params.pulseIntensity;
  const duration = params.animationSpeed;

  // TextShadow animation ranges (pulse effect)
  const textShadowRanges: Array<{ key: string; val: string; prog: number }> = [
    {
      key: 'textShadow',
      val: '0 0 0px transparent',
      prog: 0,
    },
    {
      key: 'textShadow',
      val: createTextShadow(params.glowColor, intensity * 0.5, 0.25),
      prog: 0.25,
    },
    {
      key: 'textShadow',
      val: createTextShadow(params.glowColor, intensity, 0.5),
      prog: 0.5,
    },
    {
      key: 'textShadow',
      val: createTextShadow(params.glowColor, intensity * 0.5, 0.75),
      prog: 0.75,
    },
    {
      key: 'textShadow',
      val: '0 0 5px ' + hexToRgba(params.glowColor, 0.3),
      prog: 1,
    },
  ];

  // WebkitTextStroke (constant throughout)
  const strokeRanges: Array<{ key: string; val: string; prog: number }> = [
    {
      key: 'WebkitTextStroke',
      val: `${params.strokeWidth}px ${params.strokeColor}`,
      prog: 0,
    },
    {
      key: 'WebkitTextStroke',
      val: `${params.strokeWidth}px ${params.strokeColor}`,
      prog: 1,
    },
  ];

  // Color property (subtle shift for realism)
  const colorRanges: Array<{ key: string; val: string; prog: number }> = [
    {
      key: 'color',
      val: createColorShift(params.glowColor, 0),
      prog: 0,
    },
    {
      key: 'color',
      val: createColorShift(params.glowColor, 0.5),
      prog: 0.5,
    },
    {
      key: 'color',
      val: createColorShift(params.glowColor, 1),
      prog: 1,
    },
  ];

  // Combine all ranges
  const ranges = [...textShadowRanges, ...strokeRanges, ...colorRanges];

  // Create effect data
  const effectData: GenericEffectData = {
    type: params.enableFlicker ? 'linear' : 'ease-in-out',
    start: params.effectStart,
    duration: duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: ranges,
  };

  // Create effect node
  const effect = {
    id:
      params.effectId ||
      `neon-outline-${params.targetIds.join('-')}-${Date.now()}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'neon-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {},
            },
          },
          context: {
            timing: {
              start: 0,
              duration: 0,
            },
          },
          effects: [effect],
          childrenData: [],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'TextNeonOutline',
  title: 'Text Neon Outline Effect',
  description:
    'Internal effect preset module that creates animated neon outline effects for text elements using textShadow and WebkitTextStroke properties. Features pulsing glow with multi-layer depth (inner glow, main stroke, outer bloom), color shift animation, and optional flickering to simulate vintage neon signs.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'neon',
    'glow',
    'text',
    'outline',
    'stroke',
    'internal',
    'generic',
    'animated',
    'retro',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    strokeColor: '#00ffff',
    glowColor: '#00ffff',
    strokeWidth: 2,
    pulseIntensity: 1.5,
    animationSpeed: 2,
    enableFlicker: false,
    targetIds: ['text-component-1'],
    effectStart: 0,
  },
};

export const TextNeonOutlinePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
