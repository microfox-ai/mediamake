/**
 * Liquid Gold Calligraphy Typography Preset
 *
 * A flowing calligraphy-inspired typography preset where text appears as if being painted by
 * an invisible brush with liquid gold ink. Features natural brush stroke thickness variation
 * via clipPath reveal animation, sequential letter painting following handwriting stroke order,
 * ink splatter effects at word beginnings, gentle drips on descenders (g, j, p, q, y), and a
 * warm luminous metallic gold finish with pulsing highlights.
 *
 * Features:
 * - **Brush Stroke Animation**: Letters reveal with clipPath animation simulating brush strokes
 * - **Sequential Letter Painting**: Letters appear one by one in handwriting order
 * - **Ink Splatter Effects**: Subtle splatter animations at the start of each word
 * - **Drip Effects**: Gentle drips on descender letters (g, j, p, q, y)
 * - **Metallic Gold Finish**: Warm luminous gold with gradient and glow effects
 * - **Pulsing Highlights**: Soft pulsing glow effect after text is fully revealed
 *
 * Use cases:
 * - Luxury brand titles and logos
 * - Elegant captions for premium content
 * - Wedding and event videography
 * - High-end product showcases
 * - Sophisticated intro/outro sequences
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z.string().describe('Text to display with calligraphy effect'),
  
  font: z
    .string()
    .optional()
    .default('Cinzel Decorative:600')
    .describe('Font family with optional weight and style (e.g., "Cinzel Decorative:600", "Playfair Display:700:italic")'),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .optional()
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .optional()
    .default('#FFD700')
    .describe('Primary gold color for the text gradient'),
  
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .optional()
    .describe('Total duration of the animation in seconds'),
  
  letterDelay: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .optional()
    .describe('Delay between each letter animation in seconds'),
  
  strokeDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Duration of each letter stroke reveal animation in seconds'),
  
  enableSplatters: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable ink splatter effects at word beginnings'),
  
  enableDrips: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable drip effects on descender letters'),
  
  glowIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity of the golden glow effect'),
  
  pulseEffect: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable gentle pulsing glow after text is fully revealed'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse parameters
  const text = params.text;
  const fontSize = params.fontSize ?? 72;
  const letterDelay = params.letterDelay ?? 0.15;
  const strokeDuration = params.strokeDuration ?? 0.3;
  const totalDuration = params.duration ?? 5;
  const enableSplatters = params.enableSplatters ?? true;
  const enableDrips = params.enableDrips ?? true;
  const glowIntensity = params.glowIntensity ?? 1;
  const pulseEffect = params.pulseEffect ?? true;
  const textColor = params.textColor ?? '#FFD700';

  // Parse font string
  const fontString = params.font || 'Cinzel Decorative:600';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  
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

  // Split text into words and letters
  const words = text.split(' ');
  const letters: Array<{ char: string; wordIndex: number; letterIndex: number; isDescender: boolean }> = [];
  const descenders = ['g', 'j', 'p', 'q', 'y'];
  
  words.forEach((word, wordIndex) => {
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      letters.push({
        char,
        wordIndex,
        letterIndex: i,
        isDescender: descenders.includes(char.toLowerCase()),
      });
    }
    // Add space after each word except the last
    if (wordIndex < words.length - 1) {
      letters.push({
        char: ' ',
        wordIndex,
        letterIndex: -1,
        isDescender: false,
      });
    }
  });

  // Calculate glow shadow based on intensity
  const glowShadow = [
    `0 0 ${8 * glowIntensity}px rgba(255, 215, 0, ${0.6 * glowIntensity})`,
    `0 0 ${16 * glowIntensity}px rgba(255, 165, 0, ${0.4 * glowIntensity})`,
    `0 0 ${24 * glowIntensity}px rgba(255, 215, 0, ${0.2 * glowIntensity})`,
  ].join(', ');

  // Build letter components
  const letterComponents: RenderableComponentData[] = [];
  const splatterComponents: RenderableComponentData[] = [];
  const dripComponents: RenderableComponentData[] = [];
  
  letters.forEach((letter, index) => {
    if (letter.char === ' ') {
      // Space - just add a space element without animation
      letterComponents.push({
        id: `space-${index}`,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: '\u00A0', // Non-breaking space
          style: {
            fontSize: `${fontSize}px`,
            display: 'inline-block',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData);
      return;
    }

    const letterId = `letter-${index}`;
    const letterStartTime = index * letterDelay;
    
    // Letter reveal effect (clipPath animation)
    const letterRevealEffect = {
      id: `reveal-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.4, 0, 0.2, 1)',
        start: letterStartTime,
        duration: strokeDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
          { key: 'clipPath', val: 'inset(0 0% 0 0)', prog: 1 },
        ],
      },
    };

    // Opacity effect (fade in)
    const opacityEffect = {
      id: `opacity-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.4, 0, 0.2, 1)',
        start: letterStartTime,
        duration: strokeDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };

    // Create letter component
    letterComponents.push({
      id: letterId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: letter.char,
        style: {
          fontSize: `${fontSize}px`,
          ...fontStyle,
          background: `linear-gradient(135deg, ${textColor} 0%, #FFA500 50%, ${textColor} 100%)`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: `drop-shadow(${glowShadow})`,
          display: 'inline-block',
          clipPath: 'inset(0 100% 0 0)', // Initial state
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [letterRevealEffect, opacityEffect],
    } as RenderableComponentData);

    // Add splatter effect at start of each word
    if (enableSplatters && letter.letterIndex === 0 && letter.wordIndex >= 0) {
      const splatterCount = 3;
      for (let i = 0; i < splatterCount; i++) {
        const splatterId = `splatter-${index}-${i}`;
        const angle = (Math.random() - 0.5) * 60; // -30 to +30 degrees
        const distance = 20 + Math.random() * 30; // 20-50px
        const size = 8 + Math.random() * 8; // 8-16px
        
        const splatterEffect = {
          id: `splatter-effect-${splatterId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: letterStartTime,
            duration: 0.3,
            mode: 'provider',
            targetIds: [splatterId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1.5, prog: 0.5 },
              { key: 'scale', val: 1.2, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: Math.cos(angle * Math.PI / 180) * distance, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: Math.sin(angle * Math.PI / 180) * distance, prog: 1 },
            ],
          },
        };

        splatterComponents.push({
          id: splatterId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '<div></div>',
            style: {
              position: 'absolute',
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${textColor} 0%, #FFA500 60%, transparent 100%)`,
              opacity: 0,
              filter: 'blur(1px)',
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
          effects: [splatterEffect],
        } as RenderableComponentData);
      }
    }

    // Add drip effect on descender letters
    if (enableDrips && letter.isDescender) {
      const dripId = `drip-${index}`;
      const dripStartTime = letterStartTime + strokeDuration * 0.8;
      
      const dripEffect = {
        id: `drip-effect-${dripId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: dripStartTime,
          duration: 0.8,
          mode: 'provider',
          targetIds: [dripId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.9, prog: 0.2 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 30, prog: 1 },
          ],
        },
      };

      dripComponents.push({
        id: dripId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          style: {
            position: 'absolute',
            width: '3px',
            height: '20px',
            background: `linear-gradient(180deg, ${textColor} 0%, #FFA500 50%, transparent 100%)`,
            borderRadius: '0 0 3px 3px',
            opacity: 0,
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [dripEffect],
      } as RenderableComponentData);
    }
  });

  // Calculate when all letters are revealed
  const allLettersRevealedTime = letters.length * letterDelay + strokeDuration;

  // Build letters container
  const lettersContainer: RenderableComponentData = {
    id: 'letters-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative inline-flex items-baseline',
        style: {
          gap: '0',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: letterComponents,
    effects: pulseEffect ? [
      {
        id: 'glow-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: allLettersRevealedTime,
          duration: 2,
          mode: 'provider',
          targetIds: ['letters-container'],
          loop: true,
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.02, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ] : [],
  };

  // Build splatters container (absolute overlay)
  const splattersContainer: RenderableComponentData = {
    id: 'splatters-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-visible',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: splatterComponents,
  };

  // Build drips container (absolute overlay)
  const dripsContainer: RenderableComponentData = {
    id: 'drips-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-visible',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: dripComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-gold-calligraphy-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative inline-flex items-baseline justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [lettersContainer, splattersContainer, dripsContainer],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'liquidGoldCalligraphy',
  title: 'Liquid Gold Calligraphy',
  description:
    'A flowing calligraphy-inspired typography preset where text appears as if being painted by an invisible brush with liquid gold ink. Features natural brush stroke thickness variation via clipPath reveal animation, sequential letter painting following handwriting stroke order, ink splatter effects at word beginnings, gentle drips on descenders (g, j, p, q, y), and a warm luminous metallic gold finish with pulsing highlights. Perfect for luxury brand titles and elegant captions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'calligraphy',
    'luxury',
    'gold',
    'elegant',
    'brush-stroke',
    'metallic',
    'animation',
    'ink',
    'splatter',
    'drip',
    'glow',
    'pulse',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Luxury Brand',
    font: 'Cinzel Decorative:600',
    fontSize: 72,
    textColor: '#FFD700',
    duration: 5,
    letterDelay: 0.15,
    strokeDuration: 0.3,
    enableSplatters: true,
    enableDrips: true,
    glowIntensity: 1,
    pulseEffect: true,
  },
};

// --- Export ---

export const liquidGoldCalligraphyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
