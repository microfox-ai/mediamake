/**
 * Wave Cascade Text Animation Preset
 *
 * Creates a fluid wave-like character cascade where letters fade in following a sine wave pattern.
 * Imagine dropping letters into water - they appear with a ripple effect that propagates through 
 * the text. Each character has a vertical oscillation (like floating on waves) combined with 
 * opacity fade. The wave travels from left to right, with characters bobbing up and down even 
 * after they've appeared.
 *
 * Features:
 * - Sine wave-based vertical motion with spring physics
 * - Continuous floating animation after reveal
 * - Subtle rotation following wave motion (-5deg to 5deg)
 * - Squash-and-stretch effect for organic feel
 * - Staggered cascade delay from left to right
 * - Optimized CSS transforms for smooth performance
 *
 * Technical Implementation:
 * - BaseLayout with inline-flex structure
 * - Each character (TextAtom) uses sentence-level timing for layout stability
 * - Wave function: Math.sin((index * 0.5) + (time * 2)) * 10 for translateY
 * - Multiple keyframe effects with spring easing
 * - Generic effects with provider mode for direct targeting
 *
 * Use cases:
 * - Poetic or artistic content
 * - Creative titles and intros
 * - Liquid/water-themed animations
 * - Organic, flowing text reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to animate with wave cascade effect'),
  
  // Timing
  duration: z.number().default(8).describe('Total duration of the animation in seconds'),
  cascadeDelay: z.number().default(0.08).describe('Delay between each character reveal (seconds)'),
  
  // Typography
  fontSize: z.number().default(72).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family name (e.g., "Inter:700" for weight 700)'),
  textColor: z.string().default('#FFFFFF').describe('Text color (CSS color value)'),
  letterSpacing: z.number().default(0).describe('Letter spacing in pixels'),
  
  // Wave Motion
  waveAmplitude: z.number().default(10).describe('Vertical wave amplitude in pixels (how high/low characters bob)'),
  waveFrequency: z.number().default(0.5).describe('Wave frequency multiplier (higher = more waves)'),
  waveSpeed: z.number().default(2).describe('Wave animation speed multiplier'),
  
  // Rotation
  rotationRange: z.number().default(5).describe('Maximum rotation in degrees (-rotationRange to +rotationRange)'),
  
  // Squash & Stretch
  squashStretch: z.number().default(0.1).describe('Amount of vertical scale variation (0.9 to 1.1 + this value)'),
  
  // Effects
  fadeInDuration: z.number().default(0.5).describe('Duration of initial fade-in effect (seconds)'),
  springStiffness: z.number().default(1).describe('Spring physics stiffness (higher = snappier motion)'),
  
  // Layout
  horizontalAlign: z.enum(['left', 'center', 'right']).default('center').describe('Horizontal alignment of text'),
  verticalAlign: z.enum(['top', 'center', 'bottom']).default('center').describe('Vertical alignment of text'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    cascadeDelay,
    fontSize,
    fontFamily,
    textColor,
    letterSpacing,
    waveAmplitude,
    waveFrequency,
    waveSpeed,
    rotationRange,
    squashStretch,
    fadeInDuration,
    horizontalAlign,
    verticalAlign,
  } = params;

  // Parse font family and weight
  const parseFontString = (fontString: string) => {
    const fontParts = fontString.split(':');
    const family = fontParts[0];
    const weight = fontParts.length > 1 ? parseInt(fontParts[1], 10) : 400;
    const style = fontParts.length > 2 ? fontParts[2] : 'normal';
    return { family, weight, style };
  };

  const { family: parsedFontFamily, weight: fontWeight, style: fontStyle } = parseFontString(fontFamily);

  // Split text into characters
  const characters = text.split('');

  // Helper function to create wave effects for a character
  const createCharacterEffects = (charIndex: number, charId: string): any[] => {
    const effects: any[] = [];
    
    // Calculate staggered start time for cascade
    const cascadeStart = charIndex * cascadeDelay;
    
    // Effect 1: Fade in + Initial wave reveal
    const fadeInEffect: GenericEffectData = {
      type: 'spring',
      start: cascadeStart,
      duration: fadeInDuration,
      mode: 'provider',
      targetIds: [charId],
      ranges: [
        // Opacity fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        
        // Initial drop with wave
        { key: 'translateY', val: -waveAmplitude * 3, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        
        // Initial scale (squash on landing)
        { key: 'scaleY', val: 0.9 - squashStretch, prog: 0 },
        { key: 'scaleY', val: 1, prog: 1 },
      ],
    };
    
    effects.push({
      id: `fade-in-${charId}`,
      componentId: 'generic',
      data: fadeInEffect,
    });
    
    // Effect 2: Continuous wave float (starts after fade-in, continues for rest of duration)
    const floatStart = cascadeStart + fadeInDuration;
    const floatDuration = duration - floatStart;
    
    if (floatDuration > 0) {
      // Create multiple wave cycles for continuous motion
      const numCycles = Math.ceil(floatDuration * waveSpeed / 2);
      const cycleRanges: any[] = [];
      
      for (let cycle = 0; cycle < numCycles; cycle++) {
        const basePhase = (charIndex * waveFrequency) + (cycle * Math.PI * 2);
        
        // 8 keyframes per cycle for smooth sine wave
        for (let step = 0; step <= 8; step++) {
          const progress = (cycle + step / 8) / numCycles;
          const phase = basePhase + (step / 8) * Math.PI * 2;
          
          // Sine wave for vertical motion
          const yOffset = Math.sin(phase) * waveAmplitude;
          
          // Rotation follows wave (derivative of sine is cosine)
          const rotation = Math.cos(phase) * rotationRange;
          
          // Subtle scaleY variation for squash/stretch
          const scaleY = 1 + Math.sin(phase) * squashStretch;
          
          cycleRanges.push(
            { key: 'translateY', val: yOffset, prog: progress },
            { key: 'rotate', val: rotation, prog: progress },
            { key: 'scaleY', val: scaleY, prog: progress },
          );
        }
      }
      
      const floatEffect: GenericEffectData = {
        type: 'linear', // Linear for continuous motion, not eased
        start: floatStart,
        duration: floatDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: cycleRanges,
      };
      
      effects.push({
        id: `float-${charId}`,
        componentId: 'generic',
        data: floatEffect,
      });
    }
    
    return effects;
  };

  // Create character components
  const characterComponents = characters.map((char, index) => {
    const charId = `wave-char-${index}`;
    
    const characterData: TextAtomData = {
      text: char,
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight: fontWeight,
        fontStyle: fontStyle as any,
        letterSpacing: `${letterSpacing}px`,
        display: 'inline-block',
        whiteSpace: 'pre', // Preserve spaces
      },
      font: {
        family: parsedFontFamily,
        weights: [fontWeight.toString()],
      },
    };
    
    const effects = createCharacterEffects(index, charId);
    
    return {
      id: charId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: characterData,
      context: {
        timing: {
          start: 0, // All characters use full duration for layout stability
          duration: duration,
        },
      },
      effects: effects,
    };
  });

  // Alignment class mapping
  const horizontalAlignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[horizontalAlign];
  
  const verticalAlignClass = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  }[verticalAlign];

  // Root container
  const rootContainer = {
    id: 'wave-cascade-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${horizontalAlignClass} ${verticalAlignClass}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: 'characters-wrapper',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-flex items-center gap-0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: characterComponents as RenderableComponentData[],
      },
    ],
  } as RenderableComponentData;

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
  id: 'wave-cascade-text',
  title: 'Wave Cascade Text Animation',
  description: 'Fluid wave-like character cascade where letters fade in following a sine wave pattern with continuous vertical oscillation, rotation, and organic motion. Each character bobs up and down like floating on water with spring physics, creating a poetic and artistic effect perfect for creative content.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'animation', 'wave', 'cascade', 'fluid', 'organic', 'water', 'ripple', 'floating', 'spring', 'artistic', 'poetic', 'creative'],
  dependencies: {},
  defaultInputParams: {
    text: 'Wave Cascade',
    duration: 8,
    cascadeDelay: 0.08,
    fontSize: 72,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    letterSpacing: 2,
    waveAmplitude: 10,
    waveFrequency: 0.5,
    waveSpeed: 2,
    rotationRange: 5,
    squashStretch: 0.1,
    fadeInDuration: 0.5,
    springStiffness: 1,
    horizontalAlign: 'center',
    verticalAlign: 'center',
  },
};

export const waveCascadeTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
