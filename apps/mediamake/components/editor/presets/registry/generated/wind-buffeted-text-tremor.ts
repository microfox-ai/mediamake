/**
 * Wind-Buffeted Text Tremor Preset
 *
 * This preset simulates text being shaken by invisible gusts of wind, like a sign swaying
 * in a storm. It implements three wind intensity levels (gentle breeze, moderate wind, 
 * strong gusts) with physics-based movement including momentum and inertia using spring easing.
 *
 * Features:
 * - Three intensity levels: gentle breeze (1-2px sway), moderate wind (3-6px with slight rotation),
 *   and strong gusts (10-15px displacement with 5-10° rotation)
 * - Physics-based fluid dynamics: slow build-up, sustained shake, gradual settling
 * - Subtle skew transformation during strong gusts to simulate wind pressure bending text
 * - Random turbulence moments where shake becomes chaotic before returning to rhythmic swaying
 * - Transform origin set to bottom center for realistic pivot behavior
 * - Multi-layered effects combining base sway, wind gusts, rotation, and skew
 * - Hardware-accelerated transforms for smooth performance
 *
 * Use cases:
 * - Opening credits where text appears mounted on flexible springs
 * - Environmental text effects responding to invisible forces
 * - Storm or weather-themed video sequences
 * - Dynamic typography with natural, organic movement
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().default('WIND SHAKE').describe('Text content to display'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text (e.g., "Inter:700", "Roboto:600")'),
  fontSize: z.number().default(80).describe('Font size in pixels'),
  fontWeight: z.string().default('700').describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z.string().default('#FFFFFF').describe('Text color'),
  
  windIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Wind intensity level (0-1): 0-0.3 = gentle breeze, 0.3-0.7 = moderate wind, 0.7-1 = strong gusts'),
  
  turbulenceFrequency: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Frequency of turbulence moments (0-1): 0 = no turbulence, 1 = constant chaos'),
  
  dominantDirection: z
    .enum(['left', 'right', 'random'])
    .default('right')
    .describe('Dominant wind direction: left = blows left, right = blows right, random = varies'),
  
  duration: z
    .number()
    .default(10)
    .describe('Duration of the wind shake effect in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font weight from font string or use provided weight
  let fontWeight = params.fontWeight;
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontWeight = fontParts[1];
    }
  }

  // Calculate intensity-based parameters
  const intensity = params.windIntensity;
  const turbulence = params.turbulenceFrequency;
  
  // Sway parameters (base oscillation)
  const swayAmplitude = intensity <= 0.3 ? 2 : intensity <= 0.7 ? 5 : 12;
  const swayPeriod = 2.5; // seconds per cycle
  
  // Gust parameters (episodic strong winds)
  const gustAmplitude = intensity <= 0.3 ? 3 : intensity <= 0.7 ? 8 : 15;
  const gustDuration = intensity <= 0.3 ? 0.5 : intensity <= 0.7 ? 0.7 : 1.0;
  const gustRotation = intensity <= 0.3 ? 2 : intensity <= 0.7 ? 5 : 10;
  const gustSkew = intensity <= 0.3 ? 1 : intensity <= 0.7 ? 3 : 5;
  
  // Direction multiplier
  const directionMultiplier = params.dominantDirection === 'left' ? -1 : 1;
  
  // Turbulence parameters
  const turbulenceIntensity = turbulence * 20; // Max shake during turbulence
  const turbulenceDuration = 0.3; // Quick chaotic burst
  
  // Calculate number of gusts and turbulence events based on duration
  const gustInterval = 3.5; // Average seconds between gusts
  const numGusts = Math.floor(params.duration / gustInterval);
  const turbulenceInterval = 5; // Average seconds between turbulence
  const numTurbulence = Math.floor(params.duration / turbulenceInterval);

  // Helper function to generate gust timing
  const generateGustTimings = (count: number, totalDuration: number) => {
    const timings = [];
    for (let i = 0; i < count; i++) {
      const baseTime = (i + 0.5) * (totalDuration / count);
      const jitter = (Math.random() - 0.5) * gustInterval * 0.3;
      timings.push(Math.max(0.5, Math.min(totalDuration - 1.5, baseTime + jitter)));
    }
    return timings;
  };

  // Helper function to generate turbulence timing
  const generateTurbulenceTimings = (count: number, totalDuration: number) => {
    const timings = [];
    for (let i = 0; i < count; i++) {
      const baseTime = (i + 0.7) * (totalDuration / count);
      const jitter = (Math.random() - 0.5) * turbulenceInterval * 0.4;
      timings.push(Math.max(1, Math.min(totalDuration - 1, baseTime + jitter)));
    }
    return timings;
  };

  const gustTimings = generateGustTimings(numGusts, params.duration);
  const turbulenceTimings = generateTurbulenceTimings(numTurbulence, params.duration);

  const textAtomId = 'wind-buffeted-text';
  const effects = [];

  // Effect 1: Base continuous sway (sine wave pattern)
  effects.push({
    id: 'base-sway-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [textAtomId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: swayAmplitude * directionMultiplier, prog: 0.25 },
        { key: 'translateX', val: 0, prog: 0.5 },
        { key: 'translateX', val: -swayAmplitude * directionMultiplier, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    },
  });

  // Effect 2: Wind gusts (episodic strong displacement with rotation and skew)
  gustTimings.forEach((gustStart, index) => {
    // Gust build-up phase (slow acceleration)
    const buildUpDuration = gustDuration * 0.3;
    const sustainDuration = gustDuration * 0.4;
    const settlingDuration = gustDuration * 0.3;

    // Build-up effect
    effects.push({
      id: `gust-buildup-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: gustStart,
        duration: buildUpDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: gustAmplitude * directionMultiplier * 0.3, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -gustAmplitude * 0.2, prog: 1 },
        ],
      },
    });

    // Sustained shake effect
    effects.push({
      id: `gust-sustain-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: gustStart + buildUpDuration,
        duration: sustainDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        ranges: [
          { key: 'translateX', val: gustAmplitude * directionMultiplier * 0.3, prog: 0 },
          { key: 'translateX', val: gustAmplitude * directionMultiplier, prog: 0.5 },
          { key: 'translateX', val: gustAmplitude * directionMultiplier * 0.7, prog: 1 },
          { key: 'translateY', val: -gustAmplitude * 0.2, prog: 0 },
          { key: 'translateY', val: -gustAmplitude * 0.4, prog: 0.5 },
          { key: 'translateY', val: -gustAmplitude * 0.3, prog: 1 },
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: gustRotation * directionMultiplier, prog: 0.5 },
          { key: 'rotate', val: gustRotation * directionMultiplier * 0.7, prog: 1 },
          { key: 'skewX', val: 0, prog: 0 },
          { key: 'skewX', val: gustSkew * directionMultiplier, prog: 0.5 },
          { key: 'skewX', val: gustSkew * directionMultiplier * 0.5, prog: 1 },
        ],
      },
    });

    // Settling phase (spring back to rest)
    effects.push({
      id: `gust-settle-${index}`,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: gustStart + buildUpDuration + sustainDuration,
        duration: settlingDuration,
        mode: 'provider',
        targetIds: [textAtomId],
        ranges: [
          { key: 'translateX', val: gustAmplitude * directionMultiplier * 0.7, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: -gustAmplitude * 0.3, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'rotate', val: gustRotation * directionMultiplier * 0.7, prog: 0 },
          { key: 'rotate', val: 0, prog: 1 },
          { key: 'skewX', val: gustSkew * directionMultiplier * 0.5, prog: 0 },
          { key: 'skewX', val: 0, prog: 1 },
        ],
      },
    });
  });

  // Effect 3: Turbulence moments (chaotic rapid shaking)
  if (turbulence > 0) {
    turbulenceTimings.forEach((turbStart, index) => {
      effects.push({
        id: `turbulence-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: turbStart,
          duration: turbulenceDuration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: turbulenceIntensity * (Math.random() - 0.5) * 2, prog: 0.1 },
            { key: 'translateX', val: turbulenceIntensity * (Math.random() - 0.5) * 2, prog: 0.2 },
            { key: 'translateX', val: turbulenceIntensity * (Math.random() - 0.5) * 2, prog: 0.3 },
            { key: 'translateX', val: turbulenceIntensity * (Math.random() - 0.5) * 2, prog: 0.4 },
            { key: 'translateX', val: turbulenceIntensity * (Math.random() - 0.5) * 2, prog: 0.5 },
            { key: 'translateX', val: turbulenceIntensity * (Math.random() - 0.5) * 2, prog: 0.6 },
            { key: 'translateX', val: turbulenceIntensity * (Math.random() - 0.5) * 2, prog: 0.7 },
            { key: 'translateX', val: turbulenceIntensity * (Math.random() - 0.5) * 2, prog: 0.8 },
            { key: 'translateX', val: turbulenceIntensity * (Math.random() - 0.5) * 2, prog: 0.9 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: turbulenceIntensity * (Math.random() - 0.5) * 2 * 0.5, prog: 0.1 },
            { key: 'translateY', val: turbulenceIntensity * (Math.random() - 0.5) * 2 * 0.5, prog: 0.2 },
            { key: 'translateY', val: turbulenceIntensity * (Math.random() - 0.5) * 2 * 0.5, prog: 0.3 },
            { key: 'translateY', val: turbulenceIntensity * (Math.random() - 0.5) * 2 * 0.5, prog: 0.4 },
            { key: 'translateY', val: turbulenceIntensity * (Math.random() - 0.5) * 2 * 0.5, prog: 0.5 },
            { key: 'translateY', val: turbulenceIntensity * (Math.random() - 0.5) * 2 * 0.5, prog: 0.6 },
            { key: 'translateY', val: turbulenceIntensity * (Math.random() - 0.5) * 2 * 0.5, prog: 0.7 },
            { key: 'translateY', val: turbulenceIntensity * (Math.random() - 0.5) * 2 * 0.5, prog: 0.8 },
            { key: 'translateY', val: turbulenceIntensity * (Math.random() - 0.5) * 2 * 0.5, prog: 0.9 },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: (Math.random() - 0.5) * 10, prog: 0.2 },
            { key: 'rotate', val: (Math.random() - 0.5) * 10, prog: 0.4 },
            { key: 'rotate', val: (Math.random() - 0.5) * 10, prog: 0.6 },
            { key: 'rotate', val: (Math.random() - 0.5) * 10, prog: 0.8 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      });
    });
  }

  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        color: params.textColor,
        fontWeight: fontWeight,
        transformOrigin: 'bottom center',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects,
  };

  const rootContainer: RenderableComponentData = {
    id: 'wind-shake-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center h-full transform-gpu',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textAtom],
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
  id: 'wind-buffeted-text-tremor',
  title: 'Wind-Buffeted Text Tremor',
  description:
    'A physics-based wind shake effect for text that simulates environmental forces like gusts of air. Features three intensity levels (gentle breeze, moderate wind, strong gusts), natural momentum and inertia using spring easing, skew transformation during peak wind, and random turbulence moments. The text pivots from bottom center like a sign mounted on flexible springs, with multi-layered effects combining base sway, gust displacement, rotation, and skew.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'wind',
    'shake',
    'physics',
    'spring',
    'tremor',
    'environmental',
    'storm',
    'kinetic',
    'turbulence',
    'gust',
  ],
  defaultInputParams: {
    text: 'WIND SHAKE',
    fontFamily: 'Inter',
    fontSize: 80,
    fontWeight: '700',
    textColor: '#FFFFFF',
    windIntensity: 0.7,
    turbulenceFrequency: 0.3,
    dominantDirection: 'right',
    duration: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const windBuffetedTextTremorPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
