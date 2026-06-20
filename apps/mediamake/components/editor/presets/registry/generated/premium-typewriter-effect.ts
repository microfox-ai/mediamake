/**
 * Premium Typewriter Effect Preset
 *
 * A modern, minimalist typewriter effect with smooth micro-animations inspired by
 * contemporary UI design. Perfect for luxury brands and tech products.
 *
 * Features:
 * - Character-by-character fade-in with translateY motion
 * - Elegant cursor that glides smoothly between characters
 * - Post-typing breathing effect (gentle scale pulsing)
 * - Variable font weight animation during typing
 * - Material design principles with subtle depth
 * - Performance-optimized (transform and opacity only)
 *
 * Use cases:
 * - Product launch videos
 * - Tech product presentations
 * - Luxury brand content
 * - Sophisticated title sequences
 * - Premium marketing materials
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('Your Premium Text')
    .describe('Text content to display with typewriter effect'),
  
  font: z
    .string()
    .optional()
    .default('Inter:300')
    .describe('Font family with optional weight and style (e.g., "Inter:300", "Roboto:400")'),
  
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  
  characterDelay: z
    .number()
    .min(10)
    .max(200)
    .default(40)
    .describe('Delay between characters in milliseconds'),
  
  fadeInDuration: z
    .number()
    .min(100)
    .max(1000)
    .default(300)
    .describe('Duration of character fade-in animation in milliseconds'),
  
  translateYDistance: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Vertical distance characters travel during fade-in (pixels)'),
  
  enableBreathing: z
    .boolean()
    .default(true)
    .describe('Enable breathing effect after typing completes'),
  
  breathingIntensity: z
    .number()
    .min(1.01)
    .max(1.1)
    .default(1.02)
    .describe('Scale intensity for breathing effect (1.01-1.1)'),
  
  breathingDuration: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Duration of breathing cycle in seconds'),
  
  enableVariableFont: z
    .boolean()
    .default(true)
    .describe('Enable variable font weight animation during typing'),
  
  fontWeightStart: z
    .number()
    .min(100)
    .max(900)
    .default(300)
    .describe('Starting font weight for variable font animation'),
  
  fontWeightEnd: z
    .number()
    .min(100)
    .max(900)
    .default(400)
    .describe('Ending font weight for variable font animation'),
  
  cursorEnabled: z
    .boolean()
    .default(true)
    .describe('Show animated cursor that glides between characters'),
  
  cursorColor: z
    .string()
    .optional()
    .describe('Cursor color (defaults to text color if not specified)'),
  
  duration: z
    .number()
    .optional()
    .describe('Total duration in seconds (auto-calculated if not specified)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const config = props.config || {};
  const fps = config.fps || 30;

  // Parse font string
  const parseFont = (fontString: string) => {
    const parts = fontString.split(':');
    const family = parts[0];
    let weight = undefined;
    let style = undefined;
    
    if (parts.length > 1) {
      weight = parseInt(parts[1], 10);
    }
    if (parts.length > 2) {
      style = parts[2];
    }
    
    return { family, weight, style };
  };

  const fontConfig = parseFont(params.font || 'Inter:300');
  const fontFamily = fontConfig.family;
  const baseFontWeight = fontConfig.weight || params.fontWeightStart;
  const fontStyle = fontConfig.style || 'normal';

  // Calculate timing
  const characters = params.text.split('');
  const characterDelaySeconds = params.characterDelay / 1000;
  const fadeInDurationSeconds = params.fadeInDuration / 1000;
  const typingDuration = characters.length * characterDelaySeconds + fadeInDurationSeconds;
  const totalDuration = params.duration || (typingDuration + 4); // Add 4s for breathing

  // Create character components with effects
  const characterComponents: RenderableComponentData[] = characters.map((char, index) => {
    const charId = `char-${index}`;
    const charStartTime = index * characterDelaySeconds;

    // Create character fade-in effect
    const fadeInEffect = {
      id: `fade-in-${charId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.4, 0, 0.2, 1)' as any, // ease-out curve
        start: charStartTime,
        duration: fadeInDurationSeconds,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'translateY', val: params.translateYDistance, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    };

    // Variable font weight effect (if enabled)
    const fontWeightEffect = params.enableVariableFont
      ? {
          id: `font-weight-${charId}`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)' as any,
            start: charStartTime,
            duration: fadeInDurationSeconds,
            mode: 'provider',
            targetIds: [charId],
            ranges: [
              { key: 'fontWeight', val: params.fontWeightStart, prog: 0 },
              { key: 'fontWeight', val: params.fontWeightEnd, prog: 1 },
            ],
          },
        }
      : null;

    const effects = fontWeightEffect ? [fadeInEffect, fontWeightEffect] : [fadeInEffect];

    return {
      id: charId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: char === ' ' ? '\u00A0' : char, // Use non-breaking space
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          fontWeight: baseFontWeight,
          fontStyle: fontStyle,
          textShadow: '0 1px 3px rgba(0,0,0,0.1)',
          willChange: 'transform',
        },
        font: {
          family: fontFamily,
          weights: [params.fontWeightStart.toString(), params.fontWeightEnd.toString()],
          preload: true,
          display: 'swap' as any,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects,
    } as RenderableComponentData;
  });

  // Create cursor component
  const cursorId = 'typewriter-cursor';
  let cursorComponent: RenderableComponentData | null = null;

  if (params.cursorEnabled) {
    // Calculate cursor positions
    const cursorPositions: number[] = [];
    const charWidth = params.fontSize * 0.6; // Approximate character width
    
    for (let i = 0; i <= characters.length; i++) {
      cursorPositions.push(i * charWidth);
    }

    // Create cursor glide effect
    const cursorRanges = cursorPositions.map((pos, index) => {
      const progress = index / cursorPositions.length;
      return {
        key: 'translateX',
        val: pos,
        prog: progress,
      };
    });

    const cursorEffect = {
      id: `cursor-glide`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as any,
        start: 0,
        duration: typingDuration,
        mode: 'provider',
        targetIds: [cursorId],
        ranges: cursorRanges,
      },
    };

    // Fade out cursor after typing
    const cursorFadeOutEffect = {
      id: `cursor-fade-out`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as any,
        start: typingDuration,
        duration: 0.5,
        mode: 'provider',
        targetIds: [cursorId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };

    cursorComponent = {
      id: cursorId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'inline-block w-0.5 rounded-full',
          style: {
            height: `${params.fontSize}px`,
            backgroundColor: params.cursorColor || params.textColor,
            marginLeft: '2px',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [cursorEffect, cursorFadeOutEffect],
      childrenData: [],
    } as RenderableComponentData;
  }

  // Create text container with breathing effect
  const textContainerId = 'text-content';
  const breathingEffect = params.enableBreathing
    ? {
        id: 'breathing-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as any,
          start: typingDuration,
          duration: params.breathingDuration,
          mode: 'provider',
          targetIds: [textContainerId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: params.breathingIntensity, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
          // Note: Remotion doesn't support direct infinite loops in effects
          // The effect will play once. For infinite loop, we'd need to replicate
          // the effect multiple times or use a custom component
        },
      }
    : null;

  const textContainerEffects = breathingEffect ? [breathingEffect] : [];

  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-center',
        style: {
          gap: '0px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: textContainerEffects,
    childrenData: params.cursorEnabled
      ? [...characterComponents, cursorComponent!]
      : characterComponents,
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'premium-typewriter-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center min-h-screen',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textContainer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'premium-typewriter-effect',
  title: 'Premium Typewriter Effect',
  description:
    'Modern, minimalist typewriter effect with smooth micro-animations inspired by contemporary UI design. Features character-by-character fade-in with translateY motion, elegant cursor gliding, post-typing breathing effect, and variable font weight animation. Optimized for luxury brands and tech products.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typewriter',
    'text',
    'animation',
    'typography',
    'premium',
    'luxury',
    'modern',
    'minimalist',
    'cursor',
    'breathing',
    'variable-font',
    'micro-animations',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Your Premium Text',
    font: 'Inter:300',
    fontSize: 48,
    textColor: '#FFFFFF',
    characterDelay: 40,
    fadeInDuration: 300,
    translateYDistance: 8,
    enableBreathing: true,
    breathingIntensity: 1.02,
    breathingDuration: 3,
    enableVariableFont: true,
    fontWeightStart: 300,
    fontWeightEnd: 400,
    cursorEnabled: true,
  },
};

// Export preset
export const premiumTypewriterEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
