/**
 * Kinetic Brush Stroke Typography Preset
 * 
 * High-energy kinetic typography preset where handwritten script text animates as if being drawn 
 * by an energetic brush with dynamic paint splatter effects. Features confident brush stroke motions, 
 * scattered paint droplets, rotation and scale transforms for momentum, and shake effects on impact.
 * 
 * Features:
 * - **Brush Stroke Animation**: Text appears with quick, confident brush stroke motion (translateY, scale, rotate)
 * - **Paint Splatter Effects**: Small paint droplets scatter and fade independently around each word
 * - **Momentum & Impact**: Rotation and scale transforms give words a sense of swinging through air
 * - **Shake Effect**: Subtle shake when each word "lands" to emphasize impact
 * - **Multi-layer Structure**: Base text layer for script, additional shape elements for paint splatters
 * - **Staggered Animation**: Words appear sequentially with 200ms overlap for kinetic energy
 * - **Spring Easing**: Natural motion using spring physics for brush stroke animations
 * - **Artistic Flair**: Captures spontaneity of street art/graffiti with expressive calligraphy feel
 * 
 * Use cases:
 * - High-energy title sequences
 * - Street art / graffiti aesthetics
 * - Expressive calligraphy animations
 * - Artistic video intros
 * - Dynamic brand reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text content to animate with brush stroke effect'),
  
  font: z.string()
    .default('Pacifico:400:normal')
    .optional()
    .describe('Font family with optional weight and style (e.g., "Pacifico:400:normal", "Kalam:700:normal")'),
  
  fontSize: z.number()
    .min(16)
    .max(120)
    .default(48)
    .optional()
    .describe('Font size in pixels (responsive with clamp)'),
  
  textColor: z.string()
    .default('#1a1a1a')
    .optional()
    .describe('Text color (CSS color value)'),
  
  splatterColors: z.array(z.string())
    .default(['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6'])
    .optional()
    .describe('Array of colors for paint splatters'),
  
  splatterCount: z.number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe('Number of paint splatters per word'),
  
  brushDuration: z.number()
    .min(0.3)
    .max(1.5)
    .default(0.6)
    .optional()
    .describe('Duration of brush stroke animation per word (seconds)'),
  
  wordStagger: z.number()
    .min(0.05)
    .max(0.5)
    .default(0.2)
    .optional()
    .describe('Time between word animations (seconds)'),
  
  impact: z.number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Impact multiplier for effects intensity'),
  
  backgroundColor: z.string()
    .default('linear-gradient(to bottom right, #f9fafb, #ffffff)')
    .optional()
    .describe('Background gradient or color'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    const fontStyle: Record<string, any> = {};
    
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Pacifico:400:normal');
  
  // Split text into words
  const words = params.text.split(' ').filter(w => w.length > 0);
  
  // Calculate total duration
  const totalDuration = (words.length * params.wordStagger!) + params.brushDuration!;
  
  // Helper: Create paint splatter
  const createSplatter = (wordIndex: number, splatterIndex: number) => {
    const size = Math.floor(8 + Math.random() * 12); // 8-20px
    const color = params.splatterColors![Math.floor(Math.random() * params.splatterColors!.length)];
    const top = Math.floor(-30 + Math.random() * 60); // -30 to 30px
    const left = Math.floor(-30 + Math.random() * 60); // -30 to 30px
    
    const splatterId = `splatter-${wordIndex}-${splatterIndex}`;
    
    const splatterComponent = {
      id: splatterId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background-color: ${color};"></div>`,
        className: 'absolute pointer-events-none',
        style: {
          top: `calc(50% + ${top}px)`,
          left: `calc(50% + ${left}px)`,
          transformOrigin: 'center',
        },
      },
      context: {
        timing: {
          start: 0.1 * params.impact!, // Splatters trigger 100ms after word
          duration: 0.8,
        },
      },
      effects: [
        {
          id: `splatter-effect-${splatterId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.8,
            mode: 'provider',
            targetIds: [splatterId],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 0.3 },
              { key: 'scale', val: 1, prog: 0.7 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };
    
    return splatterComponent;
  };
  
  // Helper: Create word component with effects
  const createWordComponent = (word: string, index: number) => {
    const wordId = `word-${index}`;
    const wordStart = index * params.wordStagger!;
    
    // Create splatters for this word
    const splatters = Array.from({ length: params.splatterCount! }, (_, i) =>
      createSplatter(index, i)
    );
    
    // Brush stroke effect
    const brushStrokeEffect = {
      id: `brush-stroke-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: 0,
        duration: params.brushDuration! * params.impact!,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // TranslateY: drop in from above
          { key: 'translateY', val: -30, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          // Scale: small to overshoot to settle
          { key: 'scale', val: 0.3, prog: 0 },
          { key: 'scale', val: 1.1, prog: 0.7 },
          { key: 'scale', val: 1, prog: 1 },
          // Rotate: swing motion
          { key: 'rotate', val: -15, prog: 0 },
          { key: 'rotate', val: 5, prog: 0.5 },
          { key: 'rotate', val: 0, prog: 1 },
        ],
      },
    };
    
    // Shake effect on landing
    const shakeEffect = {
      id: `shake-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: params.brushDuration! * 0.8, // Trigger near end of brush stroke
        duration: 0.1,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: 3, prog: 0.25 },
          { key: 'translateX', val: -3, prog: 0.5 },
          { key: 'translateX', val: 2, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
    };
    
    const wordTextComponent = {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `clamp(32px, 5vw, ${params.fontSize}px)`,
          fontWeight: fontStyle.fontWeight || 400,
          color: params.textColor,
          textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
          ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
          subsets: ['latin'],
          display: 'swap' as const,
          preload: true,
        },
        fallbackFonts: ['cursive', 'system-ui'],
      },
      context: {
        timing: {
          start: 0,
          duration: params.brushDuration!,
        },
      },
      effects: [brushStrokeEffect, shakeEffect],
    };
    
    // Word container with text + splatters
    const wordContainer = {
      id: `word-container-${index}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            transformOrigin: 'center bottom',
          },
        },
      },
      context: {
        timing: {
          start: wordStart,
          duration: params.brushDuration!,
        },
      },
      childrenData: [wordTextComponent, ...splatters] as RenderableComponentData[],
    };
    
    return wordContainer;
  };
  
  // Create all word containers
  const wordContainers = words.map((word, index) => createWordComponent(word, index));
  
  // Main text container
  const mainTextContainer = {
    id: 'main-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-wrap items-center justify-center gap-4',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordContainers as RenderableComponentData[],
  };
  
  // Root container
  const rootContainer = {
    id: 'kinetic-brush-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          background: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [mainTextContainer] as RenderableComponentData[],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'kinetic-brush-stroke-typography',
  title: 'Kinetic Brush Stroke Typography',
  description: 'High-energy kinetic typography preset with handwritten script text that animates like being drawn by an energetic brush. Features dynamic paint splatter effects, rotation/scale transforms for momentum, shake effects on impact, and multiple layers for artistic flair. Perfect for title sequences, street art aesthetics, and expressive calligraphy.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'brush-stroke',
    'paint-splatter',
    'animated',
    'handwritten',
    'script',
    'graffiti',
    'street-art',
    'calligraphy',
    'title-sequence',
    'artistic',
    'dynamic',
    'high-energy',
  ],
  defaultInputParams: {
    text: 'Hello World',
    font: 'Pacifico:400:normal',
    fontSize: 48,
    textColor: '#1a1a1a',
    splatterColors: ['#e74c3c', '#3498db', '#f39c12', '#2ecc71', '#9b59b6'],
    splatterCount: 3,
    brushDuration: 0.6,
    wordStagger: 0.2,
    impact: 1,
    backgroundColor: 'linear-gradient(to bottom right, #f9fafb, #ffffff)',
  },
  dependencies: {},
};

// ============================================================================
// EXPORT
// ============================================================================

export const kineticBrushStrokeTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
