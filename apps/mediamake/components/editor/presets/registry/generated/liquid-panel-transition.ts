/**
 * Liquid Panel Flow Transition Preset
 *
 * This preset creates a professional liquid mercury-style panel transition with organic motion.
 * Panels flow like liquid across the screen with bezier curve motion paths, expanding and
 * contracting as they move. Features synchronized warping effects (scaleX), skew distortion,
 * and color shift effects that follow the wave motion.
 *
 * Features:
 * - **Liquid Mercury Motion**: Panels move with S-shaped bezier curve paths
 * - **Organic Scaling**: Panels expand horizontally as they flow, then contract
 * - **Warping Effects**: ScaleX animations synchronized with horizontal movement
 * - **Skew Distortion**: Dynamic skew creates fluid distortion effect
 * - **Color Shift**: Hue rotation follows the wave motion through gradient spectrum
 * - **Staggered Flow**: Each panel delayed for continuous wave-like motion
 * - **Professional Polish**: Glass effect with backdrop-filter blur
 *
 * Use cases:
 * - High-end video production transitions
 * - Professional scene changes
 * - Dynamic intro/outro sequences
 * - Broadcast-quality visual effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  panelCount: z
    .number()
    .min(4)
    .max(10)
    .default(6)
    .describe('Number of vertical panels flowing across screen (4-10)'),
  duration: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Duration of each panel animation in seconds'),
  staggerDelay: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Time delay between each panel start in seconds'),
  panelWidth: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Initial narrow width of each panel in pixels'),
  maxScale: z
    .number()
    .min(1)
    .max(2)
    .default(1.5)
    .describe('Maximum horizontal scale at peak expansion'),
  skewAmount: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Maximum skew angle in degrees for fluid distortion'),
  hueRotation: z
    .number()
    .min(0)
    .max(360)
    .default(180)
    .describe('Total hue rotation in degrees (color shift range)'),
  blurAmount: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .describe('Backdrop filter blur amount in pixels for glass effect'),
  opacityMin: z
    .number()
    .min(0.3)
    .max(0.9)
    .default(0.7)
    .describe('Minimum opacity during animation'),
  opacityMax: z
    .number()
    .min(0.8)
    .max(1)
    .default(1)
    .describe('Maximum opacity at peak'),
  backgroundColor: z
    .string()
    .default('from-purple-900 to-blue-900')
    .describe('Tailwind gradient classes for background'),
  panelGradient: z
    .string()
    .default('from-cyan-500 via-purple-500 to-pink-500')
    .describe('Tailwind gradient classes for panel colors'),
  blendMode: z
    .enum(['screen', 'multiply', 'overlay', 'normal', 'color-dodge', 'lighten'])
    .default('screen')
    .describe('CSS blend mode for panel layers'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    panelCount,
    duration,
    staggerDelay,
    panelWidth,
    maxScale,
    skewAmount,
    hueRotation,
    blurAmount,
    opacityMin,
    opacityMax,
    backgroundColor,
    panelGradient,
    blendMode,
  } = params;

  // Calculate total duration needed for all panels
  const totalDuration = duration + staggerDelay * (panelCount - 1);

  // Create panels with staggered timing and effects
  const panels: RenderableComponentData[] = [];

  for (let i = 0; i < panelCount; i++) {
    const panelId = `liquid-panel-${i}`;
    const panelStart = i * staggerDelay;

    // Create panel element
    const panel: RenderableComponentData = {
      id: panelId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${panelWidth}px; height: 100%; background: linear-gradient(to right, #06b6d4, #a855f7, #ec4899); mix-blend-mode: ${blendMode}; backdrop-filter: blur(${blurAmount}px);"></div>`,
        className: 'absolute h-full',
        style: {
          left: '0',
          willChange: 'transform, filter',
        },
      },
      context: {
        timing: {
          start: panelStart,
          duration: duration,
        },
      },
      effects: [
        // TranslateX effect with bezier curve motion
        {
          id: `translateX-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.65, 0, 0.35, 1)',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'translateX', val: -100, prog: 0, unit: '%' },
              { key: 'translateX', val: -50, prog: 0.25, unit: '%' },
              { key: 'translateX', val: 50, prog: 0.75, unit: '%' },
              { key: 'translateX', val: 110, prog: 1, unit: '%' },
            ],
          },
        },
        // ScaleX warping effect synchronized with motion
        {
          id: `scaleX-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'scaleX', val: 0.1, prog: 0 },
              { key: 'scaleX', val: 0.5, prog: 0.25 },
              { key: 'scaleX', val: maxScale, prog: 0.5 },
              { key: 'scaleX', val: 0.5, prog: 0.75 },
              { key: 'scaleX', val: 0.1, prog: 1 },
            ],
          },
        },
        // SkewX fluid distortion effect
        {
          id: `skewX-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'skewX', val: 0, prog: 0, unit: 'deg' },
              { key: 'skewX', val: skewAmount, prog: 0.33, unit: 'deg' },
              { key: 'skewX', val: -skewAmount, prog: 0.66, unit: 'deg' },
              { key: 'skewX', val: 0, prog: 1, unit: 'deg' },
            ],
          },
        },
        // Hue rotation color shift effect
        {
          id: `hue-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'filter:hue-rotate', val: 0, prog: 0, unit: 'deg' },
              { key: 'filter:hue-rotate', val: hueRotation, prog: 1, unit: 'deg' },
            ],
          },
        },
        // Opacity variation effect
        {
          id: `opacity-effect-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'opacity', val: opacityMin, prog: 0 },
              { key: 'opacity', val: opacityMax, prog: 0.5 },
              { key: 'opacity', val: opacityMin, prog: 1 },
            ],
          },
        },
      ],
    };

    panels.push(panel);
  }

  // Create root container with panels
  const rootContainer: RenderableComponentData = {
    id: 'liquid-panel-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full overflow-hidden bg-gradient-to-br ${backgroundColor}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: panels,
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
  id: 'liquid-panel-transition',
  title: 'Liquid Panel Flow Transition',
  description:
    'Professional liquid mercury-style panel transition with bezier motion paths, organic scaling, skew distortion, and color shift effects. Panels flow as narrow vertical strips that expand and contract like liquid, creating wave-like motion across the screen with synchronized warping and hue rotation effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'liquid',
    'mercury',
    'flow',
    'panel',
    'wave',
    'organic',
    'bezier',
    'warp',
    'skew',
    'color-shift',
    'professional',
    'broadcast',
    'high-end',
    'glass-effect',
  ],
  defaultInputParams: {
    panelCount: 6,
    duration: 3,
    staggerDelay: 0.2,
    panelWidth: 4,
    maxScale: 1.5,
    skewAmount: 15,
    hueRotation: 180,
    blurAmount: 10,
    opacityMin: 0.7,
    opacityMax: 1,
    backgroundColor: 'from-purple-900 to-blue-900',
    panelGradient: 'from-cyan-500 via-purple-500 to-pink-500',
    blendMode: 'screen',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidPanelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
