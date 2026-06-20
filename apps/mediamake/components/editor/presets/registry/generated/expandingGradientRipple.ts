/**
 * Expanding Gradient Ripple Effect Preset
 *
 * Creates an ambient expanding gradient wave effect that radiates from the center,
 * simulating the ripple effect of a stone dropped in water. This preset supports
 * multiple concurrent ripples with different colors and timing configurations.
 *
 * Features:
 * - **Multiple Concurrent Ripples**: Support for 1-3 simultaneous ripple waves
 * - **Radial Gradient Animation**: Smooth expanding gradient circles from center
 * - **Configurable Colors**: Custom hex colors for each ripple wave
 * - **Timing Control**: Adjustable ripple speed (500-2000ms) and staggered starts
 * - **Fade Control**: Optional fade-out as ripples expand
 * - **Radius Control**: Configurable maximum expansion (50%, 100%, or 150%)
 * - **Smooth Animation**: Progressive expansion through multiple stages
 *
 * Use cases:
 * - Ambient background effects for calm scenes
 * - Interaction highlights (clicks, taps, notifications)
 * - Water/liquid themed transitions
 * - Meditation or wellness content backgrounds
 * - Abstract visual effects for music videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  rippleColor: z
    .string()
    .default('#3b82f6')
    .describe('Hex color for ripple gradient (e.g., #3b82f6)'),
  rippleCount: z
    .number()
    .int()
    .min(1)
    .max(3)
    .default(3)
    .describe('Number of concurrent ripples (1-3)'),
  rippleSpeed: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('Duration of each ripple expansion in milliseconds (500-2000ms)'),
  fadeOut: z
    .boolean()
    .default(true)
    .describe('Whether ripples fade out as they expand'),
  maxRadius: z
    .enum(['50%', '100%', '150%'])
    .default('100%')
    .describe('Maximum expansion radius for ripples'),
  duration: z
    .number()
    .default(10)
    .describe('Total duration of the effect in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    rippleColor,
    rippleCount,
    rippleSpeed,
    fadeOut,
    maxRadius,
    duration,
  } = params;

  // Convert ripple speed from milliseconds to seconds
  const rippleSpeedSeconds = rippleSpeed / 1000;

  // Calculate stagger delay between ripples
  const staggerDelay = rippleCount > 1 ? rippleSpeedSeconds / rippleCount : 0;

  // Helper function to generate ripple color variants
  const generateRippleColors = (baseColor: string, count: number): string[] => {
    // For multiple ripples, generate color variations
    if (count === 1) return [baseColor];

    const colors = [baseColor];
    if (count >= 2) colors.push(shiftHue(baseColor, 60));
    if (count >= 3) colors.push(shiftHue(baseColor, -60));

    return colors;
  };

  // Helper function to shift hue of hex color
  const shiftHue = (hex: string, degrees: number): string => {
    // Simple hue shift - parse hex to RGB, convert to HSL, shift hue, convert back
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    const l = (max + min) / 2;
    const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);

    if (max !== min) {
      if (max === r) h = ((g - b) / (max - min) + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / (max - min) + 2) / 6;
      else h = ((r - g) / (max - min) + 4) / 6;
    }

    // Shift hue
    h = (h * 360 + degrees) % 360;
    if (h < 0) h += 360;
    h = h / 360;

    // Convert back to RGB
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const rOut = Math.round(hue2rgb(p, q, h + 1 / 3) * 255);
    const gOut = Math.round(hue2rgb(p, q, h) * 255);
    const bOut = Math.round(hue2rgb(p, q, h - 1 / 3) * 255);

    return `#${rOut.toString(16).padStart(2, '0')}${gOut.toString(16).padStart(2, '0')}${bOut.toString(16).padStart(2, '0')}`;
  };

  const rippleColors = generateRippleColors(rippleColor, rippleCount);

  // Create ripple components
  const rippleChildren: RenderableComponentData[] = [];

  for (let i = 0; i < rippleCount; i++) {
    const rippleId = `ripple-${i + 1}`;
    const color = rippleColors[i] || rippleColor;
    const startTime = i * staggerDelay;

    // Create opacity ranges based on fadeOut setting
    const opacityRanges = fadeOut
      ? [
          { key: 'opacity', val: 0.8, prog: 0 },
          { key: 'opacity', val: 0.6, prog: 0.3 },
          { key: 'opacity', val: 0.3, prog: 0.6 },
          { key: 'opacity', val: 0, prog: 1 },
        ]
      : [
          { key: 'opacity', val: 0.8, prog: 0 },
          { key: 'opacity', val: 0.8, prog: 1 },
        ];

    // Create effect for ripple expansion and fade
    const rippleEffect: GenericEffectData = {
      type: 'ease-out',
      start: startTime,
      duration: rippleSpeedSeconds,
      mode: 'provider',
      targetIds: [rippleId],
      ranges: [
        // Width expansion
        { key: 'width', val: '0%', prog: 0 },
        { key: 'width', val: '20%', prog: 0.2 },
        { key: 'width', val: '40%', prog: 0.4 },
        { key: 'width', val: '60%', prog: 0.6 },
        { key: 'width', val: '80%', prog: 0.8 },
        { key: 'width', val: maxRadius, prog: 1 },
        // Height expansion (same as width for circular ripple)
        { key: 'height', val: '0%', prog: 0 },
        { key: 'height', val: '20%', prog: 0.2 },
        { key: 'height', val: '40%', prog: 0.4 },
        { key: 'height', val: '60%', prog: 0.6 },
        { key: 'height', val: '80%', prog: 0.8 },
        { key: 'height', val: maxRadius, prog: 1 },
        // Opacity fade
        ...opacityRanges,
      ],
    };

    // Create ripple element
    const rippleElement: RenderableComponentData = {
      id: rippleId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute rounded-full pointer-events-none',
          style: {
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '0%',
            height: '0%',
            background: `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 70%)`,
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `${rippleId}-expansion-effect`,
          componentId: 'generic',
          data: rippleEffect,
        },
      ],
      childrenData: [],
    };

    rippleChildren.push(rippleElement);
  }

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'expanding-gradient-ripple-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden pointer-events-none',
        style: {
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: rippleChildren,
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

const presetMetadata: PresetMetadata = {
  id: 'expandingGradientRipple',
  title: 'Expanding Gradient Ripple Effect',
  description:
    'An ambient background effect that creates expanding radial gradient waves radiating from the center, similar to ripples from a stone dropped in water. Supports multiple concurrent ripples with configurable colors, timing, and expansion radius. Perfect for background ambiance or interaction highlights.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'background',
    'gradient',
    'ripple',
    'wave',
    'ambient',
    'radial',
    'expanding',
    'water',
    'animation',
  ],
  defaultInputParams: {
    rippleColor: '#3b82f6',
    rippleCount: 3,
    rippleSpeed: 1000,
    fadeOut: true,
    maxRadius: '100%',
    duration: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const expandingGradientRipplePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
