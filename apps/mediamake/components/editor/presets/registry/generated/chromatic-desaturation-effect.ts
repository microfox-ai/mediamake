/**
 * ChromaticDesaturation Internal Effect Preset
 *
 * ARRAY OF EFFECTS
 * 
 * This internal effect separates RGB channels before desaturating, creating a glitch-like 
 * color separation effect during transitions. Each color channel (red, green, blue) is 
 * animated independently with slight timing offsets, producing a prismatic desaturation 
 * that feels like analog video degradation.
 * 
 * Features:
 * - Independent RGB channel desaturation with staggered timing
 * - Chromatic aberration during transition (optional)
 * - Channel-specific intensity and timing controls
 * - Analog video degradation aesthetic
 * - Customizable per-channel brightness and contrast adjustments
 * 
 * Technical Details:
 * - Returns an array of 4 effects (one per RGB channel + composite effect)
 * - Uses generic effects with filter manipulation
 * - Supports optional chromatic aberration via transform offsets
 * - Channel delays create the prismatic separation effect
 * 
 * Use Cases:
 * - Creating glitchy transition effects between scenes
 * - Analog video degradation simulations
 * - Artistic color separation effects
 * - Retro/VHS-style visual effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the chromatic desaturation effect to'),
  intensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Overall intensity of the desaturation effect (0-2, default: 1)'),
  channelDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.15)
    .describe('Time offset between each RGB channel animation in seconds (default: 0.15)'),
  aberrationAmount: z
    .number()
    .min(0)
    .max(20)
    .optional()
    .describe('Amount of chromatic aberration displacement in pixels during transition (optional)'),
  duration: z
    .number()
    .min(0.1)
    .default(2)
    .describe('Total duration of the effect in seconds (default: 2)'),
  effectStart: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the effect relative to parent (default: 0)'),
  redChannelBrightness: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.1)
    .optional()
    .describe('Brightness adjustment for red channel during desaturation (default: 1.1)'),
  greenChannelBrightness: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.05)
    .optional()
    .describe('Brightness adjustment for green channel during desaturation (default: 1.05)'),
  blueChannelBrightness: z
    .number()
    .min(0.5)
    .max(2)
    .default(0.95)
    .optional()
    .describe('Brightness adjustment for blue channel during desaturation (default: 0.95)'),
  redChannelContrast: z
    .number()
    .min(0.5)
    .max(2)
    .default(0.9)
    .optional()
    .describe('Contrast adjustment for red channel during desaturation (default: 0.9)'),
  greenChannelContrast: z
    .number()
    .min(0.5)
    .max(2)
    .default(0.95)
    .optional()
    .describe('Contrast adjustment for green channel during desaturation (default: 0.95)'),
  blueChannelContrast: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.05)
    .optional()
    .describe('Contrast adjustment for blue channel during desaturation (default: 1.05)'),
  effectIds: z
    .object({
      red: z.string().optional(),
      green: z.string().optional(),
      blue: z.string().optional(),
      composite: z.string().optional(),
    })
    .optional()
    .describe('Optional custom IDs for each channel effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const intensity = params.intensity ?? 1;
  const channelDelay = params.channelDelay ?? 0.15;
  const aberrationAmount = params.aberrationAmount ?? 0;
  const duration = params.duration ?? 2;
  const effectStart = params.effectStart ?? 0;
  
  const redBrightness = (params.redChannelBrightness ?? 1.1) * intensity;
  const greenBrightness = (params.greenChannelBrightness ?? 1.05) * intensity;
  const blueBrightness = (params.blueChannelBrightness ?? 0.95) * intensity;
  
  const redContrast = params.redChannelContrast ?? 0.9;
  const greenContrast = params.greenChannelContrast ?? 0.95;
  const blueContrast = params.blueChannelContrast ?? 1.05;

  // Calculate grayscale progression based on intensity
  const finalGrayscale = Math.min(1, intensity);

  // Create red channel effect
  const redChannelEffect = {
    id: params.effectIds?.red || `chromatic-red-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: effectStart,
      duration: duration,
      mode: 'provider' as const,
      targetIds: params.targetIds,
      ranges: [
        // Desaturation
        { 
          key: 'filter', 
          val: `grayscale(0) brightness(1) contrast(1)`, 
          prog: 0 
        },
        { 
          key: 'filter', 
          val: `grayscale(${finalGrayscale}) brightness(${redBrightness}) contrast(${redContrast})`, 
          prog: 1 
        },
        // Chromatic aberration - X axis
        ...(aberrationAmount > 0 ? [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: aberrationAmount * 2, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
        ] : []),
      ],
    },
  };

  // Create green channel effect (delayed)
  const greenChannelEffect = {
    id: params.effectIds?.green || `chromatic-green-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: effectStart + channelDelay,
      duration: duration,
      mode: 'provider' as const,
      targetIds: params.targetIds,
      ranges: [
        // Desaturation
        { 
          key: 'filter', 
          val: `grayscale(0) brightness(1) contrast(1)`, 
          prog: 0 
        },
        { 
          key: 'filter', 
          val: `grayscale(${finalGrayscale}) brightness(${greenBrightness}) contrast(${greenContrast})`, 
          prog: 1 
        },
        // Chromatic aberration - Y axis
        ...(aberrationAmount > 0 ? [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: aberrationAmount * -1.5, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
        ] : []),
      ],
    },
  };

  // Create blue channel effect (double delayed)
  const blueChannelEffect = {
    id: params.effectIds?.blue || `chromatic-blue-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: effectStart + (channelDelay * 2),
      duration: duration,
      mode: 'provider' as const,
      targetIds: params.targetIds,
      ranges: [
        // Desaturation
        { 
          key: 'filter', 
          val: `grayscale(0) brightness(1) contrast(1)`, 
          prog: 0 
        },
        { 
          key: 'filter', 
          val: `grayscale(${finalGrayscale}) brightness(${blueBrightness}) contrast(${blueContrast})`, 
          prog: 1 
        },
        // Chromatic aberration - X and Y axis
        ...(aberrationAmount > 0 ? [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: aberrationAmount * -1.8, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: aberrationAmount * 1.2, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
        ] : []),
      ],
    },
  };

  // Create composite glitch effect for overall opacity pulse
  const compositeEffect = {
    id: params.effectIds?.composite || `chromatic-composite-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: effectStart + channelDelay,
      duration: duration - channelDelay,
      mode: 'provider' as const,
      targetIds: params.targetIds,
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.85, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Return all effects in a container for extraction
  const rootContainer: RenderableComponentData = {
    id: 'chromatic-desaturation-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + (channelDelay * 2),
      },
    },
    effects: [
      redChannelEffect,
      greenChannelEffect,
      blueChannelEffect,
      compositeEffect,
    ],
    childrenData: [],
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
  id: 'chromatic-desaturation-effect',
  title: 'Chromatic Desaturation Effect',
  description:
    'Internal effect preset that separates RGB channels before desaturating, creating a glitch-like color separation effect during transitions. Animates each color channel independently with slight timing offsets, producing a prismatic desaturation that feels like analog video degradation.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'chromatic', 'desaturation', 'glitch', 'rgb', 'internal', 'generic'],
  defaultInputParams: {
    targetIds: ['component-1'],
    intensity: 1,
    channelDelay: 0.15,
    aberrationAmount: 5,
    duration: 2,
    effectStart: 0,
    redChannelBrightness: 1.1,
    greenChannelBrightness: 1.05,
    blueChannelBrightness: 0.95,
    redChannelContrast: 0.9,
    greenChannelContrast: 0.95,
    blueChannelContrast: 1.05,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const chromaticDesaturationEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};