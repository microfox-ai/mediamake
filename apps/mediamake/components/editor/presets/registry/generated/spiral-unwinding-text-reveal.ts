/**
 * Spiral Unwinding Text Reveal Preset
 *
 * Creates a cinematic text reveal effect where characters spiral outward from the center,
 * like unwrapping an ancient scroll. Each character follows a parametric spiral path
 * (x = t*cos(t), y = t*sin(t)) with rotation tied to position.
 *
 * Features:
 * - Parametric spiral motion path for each character
 * - Rotation synchronized with spiral position
 * - Scale and opacity fade-in effects
 * - Optional blur effect during animation
 * - Mystical glow overlay for enhanced atmosphere
 * - Customizable spiral parameters (tightness, expansion)
 * - Staggered timing for sequential reveal
 *
 * Use cases:
 * - Cinematic title sequences
 * - Ancient/mystical text reveals
 * - Fantasy or historical content introductions
 * - Dramatic chapter titles
 * - Story opening sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to reveal through spiral unwinding effect'),
  
  // Timing configuration
  totalDuration: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .describe('Total animation duration in seconds'),
  
  characterStagger: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Time offset between each character in seconds'),
  
  // Spiral parameters
  spiralTightness: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('How tightly wound the spiral is (higher = tighter)'),
  
  spiralExpansion: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('How far the spiral expands (higher = more expansion)'),
  
  spiralRotations: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Number of full rotations during spiral animation'),
  
  // Visual effects
  enableBlur: z
    .boolean()
    .default(true)
    .describe('Enable blur effect during animation'),
  
  blurIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Maximum blur intensity in pixels'),
  
  enableGlow: z
    .boolean()
    .default(true)
    .describe('Enable mystical glow overlay'),
  
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Glow overlay opacity (0-1)'),
  
  // Typography
  fontSize: z
    .number()
    .min(24)
    .max(128)
    .default(64)
    .describe('Font size in pixels'),
  
  font: z
    .string()
    .default('Cinzel:700')
    .describe('Font family with optional weight (e.g., "Cinzel:700", "Playfair Display:400")'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),
  
  glowColor: z
    .string()
    .default('rgba(255,215,0,0.6)')
    .describe('Text glow/shadow color'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Cinzel:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Split text into characters
  const characters = params.text.split('');
  const characterCount = characters.length;

  // Calculate spiral parameters
  const calculateSpiralPosition = (t: number, progress: number) => {
    // t parameter increases from 0 to spiralRotations * 2π
    const maxT = params.spiralRotations * 2 * Math.PI;
    const currentT = maxT * progress;
    
    // Parametric spiral: x = t * cos(t), y = t * sin(t)
    const spiralRadius = currentT * params.spiralExpansion * 10; // Scale for visibility
    const x = spiralRadius * Math.cos(currentT / params.spiralTightness);
    const y = spiralRadius * Math.sin(currentT / params.spiralTightness);
    
    return { x, y };
  };

  // Calculate rotation based on spiral angle
  const calculateRotation = (progress: number) => {
    const maxRotation = params.spiralRotations * 360;
    return maxRotation * (1 - progress); // Start with full rotation, end at 0
  };

  // Create character components
  const characterComponents: RenderableComponentData[] = characters.map((char, index) => {
    const characterId = `spiral-char-${index}`;
    const startTime = index * params.characterStagger;
    const duration = params.totalDuration - startTime;

    // Calculate final position (end of spiral)
    const finalPosition = calculateSpiralPosition(0, 1);
    
    // Calculate starting position (center of spiral)
    const startPosition = calculateSpiralPosition(0, 0);

    // Create spiral animation effect
    const spiralEffect: GenericEffectData = {
      type: 'ease-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [characterId],
      ranges: [
        // Spiral path - translate from center outward
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: finalPosition.x, prog: 0.7 },
        { key: 'translateX', val: finalPosition.x, prog: 1 },
        
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: finalPosition.y, prog: 0.7 },
        { key: 'translateY', val: finalPosition.y, prog: 1 },
        
        // Rotation - multiple rotations decreasing to 0
        { key: 'rotate', val: calculateRotation(0), prog: 0 },
        { key: 'rotate', val: calculateRotation(0.7), prog: 0.7 },
        { key: 'rotate', val: 0, prog: 1 },
        
        // Scale - start small, grow to full size
        { key: 'scale', val: 0.5, prog: 0 },
        { key: 'scale', val: 1, prog: 0.7 },
        { key: 'scale', val: 1, prog: 1 },
        
        // Opacity - fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 1 },
        
        // Optional blur effect
        ...(params.enableBlur
          ? [
              { key: 'filter', val: `blur(${params.blurIntensity}px)`, prog: 0 },
              { key: 'filter', val: `blur(${params.blurIntensity * 0.5}px)`, prog: 0.3 },
              { key: 'filter', val: 'blur(0px)', prog: 0.7 },
            ]
          : []),
      ],
    };

    const characterComponent: RenderableComponentData = {
      id: characterId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute transform-gpu',
          style: {
            willChange: 'transform, opacity, filter',
            left: '50%',
            top: '50%',
          },
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: duration,
        },
      },
      effects: [
        {
          id: `spiral-effect-${index}`,
          componentId: 'generic',
          data: spiralEffect,
        },
      ],
      childrenData: [
        {
          id: `char-text-${index}`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: char,
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              textShadow: `0 0 20px ${params.glowColor}`,
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        },
      ],
    } as RenderableComponentData;

    return characterComponent;
  });

  // Create glow overlay if enabled
  const glowOverlay: RenderableComponentData | null = params.enableGlow
    ? ({
        id: 'spiral-glow-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none mix-blend-screen',
            style: {
              background: 'radial-gradient(circle at center, rgba(255,215,0,0.3) 0%, transparent 50%)',
              opacity: params.glowIntensity,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.totalDuration,
          },
        },
      } as RenderableComponentData)
    : null;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'spiral-unwinding-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration + (characterCount * params.characterStagger),
      },
    },
    childrenData: [
      ...characterComponents,
      ...(glowOverlay ? [glowOverlay] : []),
    ] as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'spiralUnwindingTextReveal',
  title: 'Spiral Unwinding Text Reveal',
  description:
    'Typokinetic preset where text characters reveal through a spiral unwinding effect from the center, like unwrapping an ancient scroll. Each character follows a parametric spiral path with rotation tied to position, creating a mystical cinematic title sequence effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'spiral',
    'reveal',
    'cinematic',
    'title',
    'animation',
    'mystical',
    'ancient',
    'scroll',
    'unwrapping',
  ],
  defaultInputParams: {
    text: 'ANCIENT TEXT',
    totalDuration: 2.5,
    characterStagger: 0.05,
    spiralTightness: 1,
    spiralExpansion: 1,
    spiralRotations: 2,
    enableBlur: true,
    blurIntensity: 8,
    enableGlow: true,
    glowIntensity: 0.7,
    fontSize: 64,
    font: 'Cinzel:700',
    textColor: '#ffffff',
    glowColor: 'rgba(255,215,0,0.6)',
  },
  dependencies: {},
};

// Export preset
export const spiralUnwindingTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
