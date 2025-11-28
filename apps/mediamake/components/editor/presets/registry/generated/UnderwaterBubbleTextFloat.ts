/**
 * Underwater Bubble Text Float Preset
 *
 * This preset creates text elements that float like underwater bubbles with caustic light effects.
 * Text elements rise gently through the scene with realistic water physics including:
 * - Upward motion with varying speeds (simulating water resistance)
 * - Figure-8 drift patterns (horizontal swaying using sin waves)
 * - Wobble scale animation (breathing effect)
 * - Caustic shimmer (brightness pulsing for light refraction)
 * - Water color shift (blue tint for depth)
 * - Depth-based opacity fade (hazier at extremes)
 *
 * Features:
 * - **Realistic Water Physics**: Bubbles rise with natural motion patterns
 * - **Figure-8 Drift**: Horizontal swaying using combined sine waves
 * - **Wobble Effect**: Scale breathing animation
 * - **Caustic Shimmer**: Light refraction brightness effects
 * - **Depth Fade**: Opacity changes simulate water depth
 * - **Customizable Text**: Multiple text elements with individual timing
 *
 * Use cases:
 * - Creating underwater-themed text animations
 * - Building aquatic scene transitions
 * - Adding dreamy floating text effects
 * - Creating ocean/water-themed content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, BaseLayoutData, TextAtomData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  texts: z.array(z.string()).default(['Sample Text 1', 'Sample Text 2', 'Sample Text 3', 'Sample Text 4', 'Sample Text 5']).describe('Array of text strings to display as floating bubbles'),
  duration: z.number().default(30).describe('Total duration of the animation in seconds'),
  font: z.string().optional().describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  fontSize: z.number().default(48).describe('Font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color (CSS color value)'),
  backgroundColor: z.string().optional().describe('Optional background gradient (CSS gradient string, e.g., "linear-gradient(180deg, #001a33 0%, #003d66 50%, #006699 100%)")'),
  
  // Motion parameters
  minRiseSpeed: z.number().default(15).describe('Minimum rise duration in seconds (faster rise)'),
  maxRiseSpeed: z.number().default(25).describe('Maximum rise duration in seconds (slower rise)'),
  
  // Figure-8 drift parameters
  driftAmplitude1: z.number().default(50).describe('Amplitude of first sine wave for horizontal drift (pixels)'),
  driftAmplitude2: z.number().default(25).describe('Amplitude of second sine wave for horizontal drift (pixels)'),
  driftFrequency1: z.number().default(1).describe('Frequency multiplier for first sine wave'),
  driftFrequency2: z.number().default(2).describe('Frequency multiplier for second sine wave'),
  
  // Wobble parameters
  wobbleDuration: z.number().default(1).describe('Duration of one wobble cycle in seconds'),
  wobbleScaleMin: z.number().default(0.95).describe('Minimum scale during wobble'),
  wobbleScaleMax: z.number().default(1.05).describe('Maximum scale during wobble'),
  
  // Shimmer parameters
  shimmerDuration: z.number().default(0.5).describe('Duration of one shimmer cycle in seconds'),
  shimmerBrightnessMin: z.number().default(1.0).describe('Minimum brightness during shimmer'),
  shimmerBrightnessMax: z.number().default(1.3).describe('Maximum brightness during shimmer'),
  
  // Depth fade parameters
  opacityDeep: z.number().default(0.6).describe('Opacity at bottom (deep water)'),
  opacityMid: z.number().default(1.0).describe('Opacity at middle (optimal viewing)'),
  opacitySurface: z.number().default(0.4).describe('Opacity at top (surface distortion)'),
  
  // Water color shift
  waterHueRotate: z.number().default(10).describe('Hue rotation in degrees for water tint'),
  waterSaturation: z.number().default(0.8).describe('Saturation level for water color (0-1)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate random left position (5% to 85% to avoid edges)
  const randomLeftPosition = (): string => {
    return `${randomInRange(5, 85)}%`;
  };

  // Create text bubble elements
  const textBubbles = params.texts.map((text, index) => {
    const bubbleId = `bubble-text-${index}`;
    const leftPosition = randomLeftPosition();
    const riseDuration = randomInRange(params.minRiseSpeed, params.maxRiseSpeed);
    const shimmerDelay = randomInRange(0, params.shimmerDuration);

    // Calculate stagger start time (spread bubbles over first 5 seconds)
    const staggerDelay = (index / params.texts.length) * 5;

    // Upward motion effect (translateY from bottom to top)
    const upwardMotionEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: riseDuration,
      mode: 'provider',
      targetIds: [bubbleId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 }, // Start at bottom (position: bottom-0)
        { key: 'translateY', val: -window.innerHeight - 100, prog: 1 }, // Move to top (-100vh - 100px)
      ],
    };

    // Figure-8 drift pattern (horizontal swaying)
    // Using sin(t) and sin(2t) with different amplitudes
    const driftEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: riseDuration,
      mode: 'provider',
      targetIds: [bubbleId],
      ranges: [
        // First sine wave (slower, larger amplitude)
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: params.driftAmplitude1 * Math.sin(params.driftFrequency1 * Math.PI * 0.25), prog: 0.25 },
        { key: 'translateX', val: params.driftAmplitude1 * Math.sin(params.driftFrequency1 * Math.PI * 0.5), prog: 0.5 },
        { key: 'translateX', val: params.driftAmplitude1 * Math.sin(params.driftFrequency1 * Math.PI * 0.75), prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    };

    // Second sine wave for figure-8 (faster, smaller amplitude)
    const drift2Effect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: riseDuration,
      mode: 'provider',
      targetIds: [bubbleId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: params.driftAmplitude2 * Math.sin(params.driftFrequency2 * Math.PI * 0.25), prog: 0.25 },
        { key: 'translateX', val: params.driftAmplitude2 * Math.sin(params.driftFrequency2 * Math.PI * 0.5), prog: 0.5 },
        { key: 'translateX', val: params.driftAmplitude2 * Math.sin(params.driftFrequency2 * Math.PI * 0.75), prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    };

    // Wobble scale effect (breathing motion)
    const wobbleEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: params.wobbleDuration,
      mode: 'provider',
      targetIds: [bubbleId],
      ranges: [
        { key: 'scale', val: params.wobbleScaleMin, prog: 0 },
        { key: 'scale', val: params.wobbleScaleMax, prog: 0.5 },
        { key: 'scale', val: params.wobbleScaleMin, prog: 1 },
      ],
    };

    // Caustic shimmer effect (brightness pulsing)
    const shimmerEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: shimmerDelay,
      duration: params.shimmerDuration,
      mode: 'provider',
      targetIds: [bubbleId],
      ranges: [
        { key: 'brightness', val: params.shimmerBrightnessMin, prog: 0 },
        { key: 'brightness', val: params.shimmerBrightnessMax, prog: 0.5 },
        { key: 'brightness', val: params.shimmerBrightnessMin, prog: 1 },
      ],
    };

    // Depth-based opacity fade
    const opacityEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: riseDuration,
      mode: 'provider',
      targetIds: [bubbleId],
      ranges: [
        { key: 'opacity', val: params.opacityDeep, prog: 0 }, // Deep (bottom)
        { key: 'opacity', val: params.opacityMid, prog: 0.5 }, // Mid (optimal)
        { key: 'opacity', val: params.opacitySurface, prog: 1 }, // Surface (top)
      ],
    };

    // Create text atom
    const textAtom: RenderableComponentData = {
      id: bubbleId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: text,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          fontWeight: fontStyle.fontWeight || 'bold',
          fontStyle: fontStyle.fontStyle,
          textShadow: '0 0 20px rgba(255,255,255,0.5)',
          filter: `hue-rotate(${params.waterHueRotate}deg) saturate(${params.waterSaturation})`,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: staggerDelay,
          duration: riseDuration,
        },
      },
      effects: [
        {
          id: `${bubbleId}-upward`,
          componentId: 'generic',
          data: upwardMotionEffect,
        },
        {
          id: `${bubbleId}-drift1`,
          componentId: 'generic',
          data: driftEffect,
        },
        {
          id: `${bubbleId}-drift2`,
          componentId: 'generic',
          data: drift2Effect,
        },
        {
          id: `${bubbleId}-wobble`,
          componentId: 'generic',
          data: wobbleEffect,
        },
        {
          id: `${bubbleId}-shimmer`,
          componentId: 'generic',
          data: shimmerEffect,
        },
        {
          id: `${bubbleId}-opacity`,
          componentId: 'generic',
          data: opacityEffect,
        },
      ],
    };

    return textAtom;
  });

  // Container layout with blue gradient background
  const containerBackground = params.backgroundColor || 'linear-gradient(180deg, #001a33 0%, #003d66 50%, #006699 100%)';

  const rootContainer: RenderableComponentData = {
    id: 'underwater-scene-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          background: containerBackground,
        },
      },
    } as BaseLayoutData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: textBubbles as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'UnderwaterBubbleTextFloat',
  title: 'Underwater Bubble Text Float',
  description: 'Text that floats like underwater bubbles with caustic light effects, wobbling motion, figure-8 drift patterns, and depth-based fade. Features realistic water resistance, shimmer effects, clustering behavior, and blue color shift for distant elements.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'underwater', 'bubbles', 'float', 'caustic', 'water', 'drift', 'wobble', 'shimmer', 'depth', 'aquatic', 'ocean'],
  dependencies: {},
  defaultInputParams: {
    texts: ['Sample Text 1', 'Sample Text 2', 'Sample Text 3', 'Sample Text 4', 'Sample Text 5'],
    duration: 30,
    fontSize: 48,
    textColor: '#FFFFFF',
    minRiseSpeed: 15,
    maxRiseSpeed: 25,
    driftAmplitude1: 50,
    driftAmplitude2: 25,
    driftFrequency1: 1,
    driftFrequency2: 2,
    wobbleDuration: 1,
    wobbleScaleMin: 0.95,
    wobbleScaleMax: 1.05,
    shimmerDuration: 0.5,
    shimmerBrightnessMin: 1.0,
    shimmerBrightnessMax: 1.3,
    opacityDeep: 0.6,
    opacityMid: 1.0,
    opacitySurface: 0.4,
    waterHueRotate: 10,
    waterSaturation: 0.8,
  },
};

export const UnderwaterBubbleTextFloatPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};