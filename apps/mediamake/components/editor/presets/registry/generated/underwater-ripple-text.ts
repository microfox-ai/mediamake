/**
 * Underwater Ripple Text Distortion Preset
 *
 * This preset creates a text animation that simulates underwater ripple distortion
 * through continuous wave transformations. The text appears to undulate as if viewed
 * through moving water, with each character having slightly offset wave phases.
 *
 * Features:
 * - Character-level wave distortion with staggered phases
 * - Sine wave pattern affecting both horizontal (translateX) and vertical (translateY) positioning
 * - Gentle S-curve deformation traveling through the text
 * - Subtle vertical scaling (scaleY) to enhance ripple effect
 * - Synchronized opacity fluctuations simulating light refraction through water
 * - GPU-accelerated transforms for smooth performance
 * - Seamless looping animations
 *
 * Technical Details:
 * - translateY range: -8px to 8px
 * - translateX range: -5px to 5px
 * - scaleY range: 0.98 to 1.02
 * - opacity range: 0.95 to 1.0
 * - Phase offset between characters: configurable (default 0.1s)
 * - Wave cycle duration: 2-3 seconds (configurable)
 * - Easing: ease-in-out for smooth sine-wave-like motion
 *
 * Use Cases:
 * - Underwater scene titles and credits
 * - Water-themed promotional videos
 * - Aquatic documentary overlays
 * - Music videos with fluid, organic motion
 * - Creative text animations for social media
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('The text content to display with underwater ripple effect'),
  duration: z.number().default(10).describe('Duration of the animation in seconds'),
  fontFamily: z.string().default('Inter').describe('Font family for the text (e.g., "Inter", "Roboto")'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color (CSS color value)'),
  fontWeight: z.union([z.string(), z.number()]).default('bold').describe('Font weight (e.g., "bold", "400", "700")'),
  waveCycleDuration: z.number().default(2.5).describe('Duration of one complete wave cycle in seconds (2-3 seconds recommended)'),
  phaseOffset: z.number().default(0.1).describe('Time offset between characters in seconds to create staggered wave effect'),
  translateYAmplitude: z.number().default(8).describe('Maximum vertical displacement in pixels'),
  translateXAmplitude: z.number().default(5).describe('Maximum horizontal displacement in pixels'),
  scaleYMin: z.number().default(0.98).describe('Minimum vertical scale factor'),
  scaleYMax: z.number().default(1.02).describe('Maximum vertical scale factor'),
  opacityMin: z.number().default(0.95).describe('Minimum opacity value (0-1)'),
  opacityMax: z.number().default(1.0).describe('Maximum opacity value (0-1)'),
  backgroundEnabled: z.boolean().default(false).describe('Whether to show a semi-transparent background box'),
  backgroundColor: z.string().default('rgba(0, 0, 0, 0.3)').describe('Background color if enabled'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontFamily,
    fontSize,
    textColor,
    fontWeight,
    waveCycleDuration,
    phaseOffset,
    translateYAmplitude,
    translateXAmplitude,
    scaleYMin,
    scaleYMax,
    opacityMin,
    opacityMax,
    backgroundEnabled,
    backgroundColor,
  } = params;

  // Split text into individual characters
  const characters = text.split('');

  // Create character components with wave effects
  const characterComponents: RenderableComponentData[] = characters.map((char, index) => {
    const charId = `underwater-char-${index}`;
    
    // Calculate effect start times based on phase offset
    const effectStart = index * phaseOffset;

    // Vertical wave effect (translateY)
    const translateYEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: effectStart,
      duration: waveCycleDuration,
      mode: 'provider',
      targetIds: [charId],
      ranges: [
        { key: 'translateY', val: -translateYAmplitude, prog: 0 },
        { key: 'translateY', val: translateYAmplitude, prog: 0.5 },
        { key: 'translateY', val: -translateYAmplitude, prog: 1 },
      ],
    };

    // Horizontal wave effect (translateX)
    const translateXEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: effectStart,
      duration: waveCycleDuration,
      mode: 'provider',
      targetIds: [charId],
      ranges: [
        { key: 'translateX', val: -translateXAmplitude, prog: 0 },
        { key: 'translateX', val: translateXAmplitude, prog: 0.5 },
        { key: 'translateX', val: -translateXAmplitude, prog: 1 },
      ],
    };

    // Vertical scale effect (scaleY) to enhance ripple
    const scaleYEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: effectStart,
      duration: waveCycleDuration,
      mode: 'provider',
      targetIds: [charId],
      ranges: [
        { key: 'scaleY', val: scaleYMin, prog: 0 },
        { key: 'scaleY', val: scaleYMax, prog: 0.5 },
        { key: 'scaleY', val: scaleYMin, prog: 1 },
      ],
    };

    // Opacity fluctuation at half frequency (simulating light refraction)
    const opacityEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: effectStart,
      duration: waveCycleDuration * 2, // Half frequency = double duration
      mode: 'provider',
      targetIds: [charId],
      ranges: [
        { key: 'opacity', val: opacityMin, prog: 0 },
        { key: 'opacity', val: opacityMax, prog: 0.5 },
        { key: 'opacity', val: opacityMin, prog: 1 },
      ],
    };

    return {
      id: charId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          display: 'inline-block',
          whiteSpace: 'pre',
          fontSize: `${fontSize}px`,
          color: textColor,
          fontWeight: fontWeight,
        },
        font: {
          family: fontFamily,
          weights: typeof fontWeight === 'number' ? [fontWeight.toString()] : [fontWeight],
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
          id: `wave-translateY-${index}`,
          componentId: 'generic',
          data: translateYEffect,
        },
        {
          id: `wave-translateX-${index}`,
          componentId: 'generic',
          data: translateXEffect,
        },
        {
          id: `wave-scaleY-${index}`,
          componentId: 'generic',
          data: scaleYEffect,
        },
        {
          id: `wave-opacity-${index}`,
          componentId: 'generic',
          data: opacityEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // Text characters container
  const textCharactersContainer: RenderableComponentData = {
    id: 'text-characters-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative flex flex-row items-center justify-center ${backgroundEnabled ? 'bg-opacity-30 px-6 py-3 rounded-lg' : ''}`,
        style: backgroundEnabled ? {
          backgroundColor: backgroundColor,
          backdropFilter: 'blur(10px)',
        } : {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: characterComponents,
  };

  // Root container with GPU acceleration
  const rootContainer: RenderableComponentData = {
    id: 'underwater-ripple-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full flex items-center justify-center transform-gpu',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textCharactersContainer],
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
  id: 'underwater-ripple-text',
  title: 'Underwater Ripple Text Distortion',
  description: 'Text animation preset that simulates underwater ripple distortion through continuous wave transformations. Characters undulate with staggered sine-wave phases affecting translateX (-5px to 5px), translateY (-8px to 8px), and scaleY (0.98 to 1.02). Includes subtle opacity fluctuations (95-100%) at half frequency to simulate light refraction through water. GPU-accelerated with transform-gpu class.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'animation', 'underwater', 'ripple', 'wave', 'distortion', 'water', 'fluid', 'organic', 'kinetic'],
  dependencies: {},
  defaultInputParams: {
    text: 'UNDERWATER',
    duration: 10,
    fontFamily: 'Inter',
    fontSize: 72,
    textColor: '#FFFFFF',
    fontWeight: 'bold',
    waveCycleDuration: 2.5,
    phaseOffset: 0.1,
    translateYAmplitude: 8,
    translateXAmplitude: 5,
    scaleYMin: 0.98,
    scaleYMax: 1.02,
    opacityMin: 0.95,
    opacityMax: 1.0,
    backgroundEnabled: false,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
};

export const underwaterRippleTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
