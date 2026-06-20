/**
 * Nature-Inspired Stop Motion Typography Preset
 * 
 * Letters grow organically like plants in time-lapse photography with sprouting animation,
 * organic expansion, wind-like sway, and bioluminescent glow effects. Features staggered
 * natural timing, blur focus pull, and continuous subtle motion for authentic botanical aesthetics.
 * 
 * Features:
 * - Organic growth animation: Letters sprout from bottom with scaleY + scaleX pulse
 * - Wind sway effect: Gentle rotate oscillation after growth
 * - Time-lapse aesthetic: Blur focus pull during early growth phase
 * - Bioluminescent glow: Green-tinted text-shadow for depth
 * - Natural timing: Varied stagger per letter using randomized delays
 * - Transform-origin at bottom for realistic plant growth
 * 
 * Use cases:
 * - Nature documentaries and environmental content
 * - Organic product reveals
 * - Botanical brand animations
 * - Spring/growth-themed titles
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().describe('Text to animate with plant growth effect'),
  fontSize: z.number().default(80).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family for the text'),
  fontWeight: z.string().default('700').describe('Font weight (e.g., "400", "700", "bold")'),
  growthDuration: z.number().default(1.2).describe('Duration of growth animation per letter in seconds'),
  staggerMin: z.number().default(0.08).describe('Minimum stagger delay between letters in seconds'),
  staggerMax: z.number().default(0.18).describe('Maximum stagger delay between letters in seconds'),
  swayDuration: z.number().default(3).describe('Duration of one complete sway cycle in seconds'),
  swayIntensity: z.number().default(1).min(0.1).max(2).describe('Intensity multiplier for sway motion (0.1-2)'),
  glowIntensity: z.number().default(0.6).min(0).max(1).describe('Intensity of bioluminescent glow (0-1)'),
  totalDuration: z.number().default(10).describe('Total duration of the animation in seconds'),
  textColor: z.string().default('#22c55e').describe('Base text color (CSS color value, default green-500)'),
  position: z.enum(['top', 'center', 'bottom']).default('center').describe('Vertical positioning of text'),
  alignment: z.enum(['left', 'center', 'right']).default('center').describe('Horizontal alignment of text'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    growthDuration,
    staggerMin,
    staggerMax,
    swayDuration,
    swayIntensity,
    glowIntensity,
    totalDuration,
    textColor,
    position,
    alignment,
  } = params;

  // Helper function: Generate random stagger delay for natural timing
  const getRandomStagger = (index: number): number => {
    // Use seeded random based on index for consistent results
    const seed = index * 0.1234567;
    const random = Math.abs(Math.sin(seed));
    return staggerMin + random * (staggerMax - staggerMin);
  };

  // Split text into letters
  const letters = text.split('');

  // Create letter components with individual growth effects
  const letterComponents: RenderableComponentData[] = letters.map((letter, index) => {
    const letterId = `letter-${index}`;
    const staggerDelay = index * getRandomStagger(index);
    
    // Growth effect: ScaleY, ScaleX pulse, rotate oscillation, opacity, translateY, blur
    const growthEffect: GenericEffectData = {
      type: 'cubic-bezier(0.4, 0, 0.2, 1)' as any, // Natural growth curve
      start: staggerDelay,
      duration: growthDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // ScaleY: Sprout from bottom (0 to 1)
        { key: 'scaleY', val: 0, prog: 0 },
        { key: 'scaleY', val: 1, prog: 1 },
        
        // ScaleX: Organic pulse (0.8 to 1.1 to 1)
        { key: 'scaleX', val: 0.8, prog: 0 },
        { key: 'scaleX', val: 1.1, prog: 0.5 },
        { key: 'scaleX', val: 1, prog: 1 },
        
        // Rotate: Gentle oscillation during growth (-2deg to 2deg to 0deg)
        { key: 'rotate', val: -2, prog: 0 },
        { key: 'rotate', val: 2, prog: 0.5 },
        { key: 'rotate', val: 0, prog: 1 },
        
        // Opacity: Fade from 0.3 to 1 for depth
        { key: 'opacity', val: 0.3, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        
        // TranslateY: Rising motion (10px to 0)
        { key: 'translateY', val: 10, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        
        // Blur: Focus pull effect (2px to 0 at 70% progress)
        { key: 'blur', val: 2, prog: 0 },
        { key: 'blur', val: 0, prog: 0.7 },
      ],
    };

    // Sway effect: Infinite subtle motion after growth
    const swayStartTime = staggerDelay + growthDuration;
    const swayEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: swayStartTime,
      duration: totalDuration - swayStartTime, // Sway for remaining duration
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // TranslateX: Gentle horizontal sway (-2px to 2px)
        { key: 'translateX', val: -2 * swayIntensity, prog: 0 },
        { key: 'translateX', val: 2 * swayIntensity, prog: 0.25 },
        { key: 'translateX', val: 0, prog: 0.5 },
        { key: 'translateX', val: -2 * swayIntensity, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
        
        // Rotate: Wind-like oscillation (-1deg to 1deg)
        { key: 'rotate', val: -1 * swayIntensity, prog: 0 },
        { key: 'rotate', val: 1 * swayIntensity, prog: 0.25 },
        { key: 'rotate', val: 0, prog: 0.5 },
        { key: 'rotate', val: -1 * swayIntensity, prog: 0.75 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    };

    // Glow effect: Bioluminescent appearance
    const glowEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: staggerDelay,
      duration: growthDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        {
          key: 'textShadow',
          val: `0 0 0px rgba(0,255,0,0)`,
          prog: 0,
        },
        {
          key: 'textShadow',
          val: `0 0 ${20 * glowIntensity}px rgba(0,255,0,${glowIntensity})`,
          prog: 1,
        },
      ],
    };

    return {
      id: letterId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter, // Preserve spaces
        className: 'text-green-500',
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
          transformOrigin: 'bottom',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `growth-${letterId}`,
          componentId: 'generic',
          data: growthEffect,
        },
        {
          id: `sway-${letterId}`,
          componentId: 'generic',
          data: swayEffect,
        },
        {
          id: `glow-${letterId}`,
          componentId: 'generic',
          data: glowEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // Determine container positioning classes
  const getPositionClass = () => {
    if (position === 'top') return 'items-start';
    if (position === 'bottom') return 'items-end';
    return 'items-center';
  };

  const getAlignmentClass = () => {
    if (alignment === 'left') return 'justify-start';
    if (alignment === 'right') return 'justify-end';
    return 'justify-center';
  };

  // Letter container: Flex layout with gap
  const letterContainer: RenderableComponentData = {
    id: 'letter-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `flex items-end gap-2`,
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: letterComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'nature-stop-motion-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${getPositionClass()} ${getAlignmentClass()} px-6`,
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [letterContainer],
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
  id: 'nature-stop-motion-text',
  title: 'Nature-Inspired Stop Motion Typography',
  description: 'Letters grow organically like plants in time-lapse photography with sprouting animation, organic expansion, wind-like sway, and bioluminescent glow effects. Features staggered natural timing, blur focus pull, and continuous subtle motion for authentic botanical aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'nature',
    'organic',
    'growth',
    'plants',
    'time-lapse',
    'botanical',
    'kinetic',
    'text',
    'animation',
  ],
  defaultInputParams: {
    text: 'GROWING',
    fontSize: 80,
    fontFamily: 'Inter',
    fontWeight: '700',
    growthDuration: 1.2,
    staggerMin: 0.08,
    staggerMax: 0.18,
    swayDuration: 3,
    swayIntensity: 1,
    glowIntensity: 0.6,
    totalDuration: 10,
    textColor: '#22c55e',
    position: 'center',
    alignment: 'center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const natureStopMotionTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};