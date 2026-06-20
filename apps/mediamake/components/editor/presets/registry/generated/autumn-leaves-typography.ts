/**
 * Autumn Leaves Typography Preset
 *
 * A minimalist typography preset where letters gracefully descend like falling autumn leaves.
 * Each letter features dual-axis animation with vertical ease-out falling motion and horizontal
 * sine-wave pendulum oscillation. Letters fade in softly during descent and transition from
 * light gray to dark gray. Fall speeds vary by character weight - heavier characters (W, M, @)
 * fall faster than lighter ones (i, l, .).
 *
 * Features:
 * - **Dual-axis animation**: Vertical translateY with ease-out + horizontal sine wave oscillation
 * - **Weight-based fall speeds**: Heavier letters fall faster (1.5-2.5s duration range)
 * - **Opacity fade-in**: 0 to 1 over first 30% of fall duration
 * - **Color transition**: Gray-400 to Gray-900 during descent
 * - **Progressive delay**: 0.1s stagger between letters
 * - **Natural pivot**: Transform-origin set to top center for pendulum effect
 *
 * Use cases:
 * - Creating elegant, poetic text reveals
 * - Minimalist title animations
 * - Seasonal autumn-themed content
 * - Artistic typography effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Define preset parameters
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(z.any()).optional(),
        metadata: z.any().optional(),
      }),
    )
    .describe('Array of caption objects with text and timing information'),
  
  font: z
    .string()
    .optional()
    .default('Inter')
    .describe('Font family with optional weight and style (e.g., "Inter:400", "Roboto:600")'),
  
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .describe('Base font size in pixels'),
  
  textColor: z
    .string()
    .default('#1F2937')
    .describe('Final text color (Gray-900 by default)'),
  
  startColor: z
    .string()
    .default('#9CA3AF')
    .describe('Starting text color (Gray-400 by default)'),
  
  oscillations: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Number of horizontal oscillation cycles during fall'),
  
  oscillationAmplitude: z
    .number()
    .min(10)
    .max(100)
    .default(30)
    .describe('Maximum horizontal drift distance in pixels'),
  
  baseDuration: z
    .number()
    .min(1)
    .max(4)
    .default(2)
    .describe('Base fall duration in seconds (adjusted by letter weight)'),
  
  letterDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Progressive delay between letters in seconds'),
  
  verticalOffset: z
    .number()
    .min(0)
    .max(200)
    .default(50)
    .describe('Vertical position offset from top in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    startColor,
    oscillations,
    oscillationAmplitude,
    baseDuration,
    letterDelay,
    verticalOffset,
  } = params;

  // Helper: Parse font string
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

  // Helper: Calculate letter weight (heavier = faster fall = shorter duration)
  const getLetterWeight = (char: string): number => {
    const heavyChars = ['W', 'M', 'Q', '@', '#', '%', '&'];
    const lightChars = ['i', 'l', 'I', '1', '.', ',', '!', '|', "'"];
    
    if (heavyChars.includes(char)) return 1.3; // 30% faster
    if (lightChars.includes(char)) return 0.7; // 30% slower
    if (/[A-Z]/.test(char)) return 1.1; // Uppercase slightly faster
    if (/[a-z]/.test(char)) return 0.9; // Lowercase slightly slower
    return 1.0; // Default weight
  };

  // Helper: Calculate character width for positioning
  const getCharWidth = (char: string, fontSize: number): number => {
    const wideChars = ['W', 'M', 'Q', 'w', 'm', '@'];
    const narrowChars = ['i', 'l', 'I', '1', '.', ',', '!', '|', "'", ' '];
    
    let multiplier = 0.6; // Default
    if (wideChars.includes(char)) multiplier = 0.9;
    else if (narrowChars.includes(char)) multiplier = 0.3;
    else if (char === ' ') multiplier = 0.4;
    
    return fontSize * multiplier;
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  const allContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionText = caption.text;
    const letters = captionText.split('');
    
    // Calculate cumulative positions for each letter
    let cumulativeLeft = 0;
    const letterPositions: number[] = [];
    
    letters.forEach((char) => {
      letterPositions.push(cumulativeLeft);
      cumulativeLeft += getCharWidth(char, fontSize);
    });
    
    // Calculate center offset to center the entire text
    const totalWidth = cumulativeLeft;
    const centerOffset = -totalWidth / 2;

    const letterComponents: RenderableComponentData[] = letters.map((char, index) => {
      const letterId = `letter-${captionIndex}-${index}`;
      const letterWeight = getLetterWeight(char);
      const fallDuration = baseDuration / letterWeight; // Heavier = faster = shorter duration
      const letterStart = index * letterDelay;
      const leftPosition = letterPositions[index] + centerOffset;

      // Create falling effect with dual-axis animation
      const fallingEffect: GenericEffectData = {
        type: 'ease-out',
        start: letterStart,
        duration: fallDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // Vertical fall (translateY from negative to 0)
          { key: 'translateY', val: -300, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          
          // Horizontal oscillation (sine wave)
          // Using multiple keyframes to simulate sine wave
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: oscillationAmplitude * 0.5, prog: 0.125 },
          { key: 'translateX', val: oscillationAmplitude, prog: 0.25 },
          { key: 'translateX', val: oscillationAmplitude * 0.5, prog: 0.375 },
          { key: 'translateX', val: 0, prog: 0.5 },
          { key: 'translateX', val: -oscillationAmplitude * 0.5, prog: 0.625 },
          { key: 'translateX', val: -oscillationAmplitude, prog: 0.75 },
          { key: 'translateX', val: -oscillationAmplitude * 0.5, prog: 0.875 },
          { key: 'translateX', val: 0, prog: 1 },
          
          // Opacity fade-in (0 to 1 over first 30%)
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      // Create color transition effect
      const colorEffect: GenericEffectData = {
        type: 'ease-out',
        start: letterStart,
        duration: fallDuration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'color', val: startColor, prog: 0 },
          { key: 'color', val: textColor, prog: 1 },
        ],
      };

      const letterComponent: RenderableComponentData = {
        id: letterId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize: fontSize,
            fontWeight: fontStyle.fontWeight || 400,
            fontStyle: fontStyle.fontStyle || 'normal',
            color: startColor, // Starting color
            position: 'absolute',
            left: `${leftPosition}px`,
            top: `${verticalOffset}px`,
            transformOrigin: 'top center',
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration + letterStart + fallDuration,
          },
        },
        effects: [
          {
            id: `falling-effect-${letterId}`,
            componentId: 'generic',
            data: fallingEffect,
          },
          {
            id: `color-effect-${letterId}`,
            componentId: 'generic',
            data: colorEffect,
          },
        ],
      };

      return letterComponent;
    });

    // Container for all letters in this caption
    const captionContainer: RenderableComponentData = {
      id: `autumn-leaves-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full overflow-hidden',
          style: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration + (letters.length * letterDelay) + baseDuration,
        },
      },
      childrenData: letterComponents,
    };

    allContainers.push(captionContainer);
  });

  return {
    output: {
      childrenData: allContainers as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'autumn-leaves-typography',
  title: 'Autumn Leaves Typography',
  description: 'A minimalist typography preset where letters gracefully descend like falling autumn leaves. Each letter features dual-axis animation with vertical ease-out falling motion and horizontal sine-wave pendulum oscillation. Letters fade in softly during descent and transition from light gray to dark gray. Fall speeds vary by character weight - heavier characters (W, M, @) fall faster than lighter ones (i, l, .). Creates an elegant, poetic text reveal effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'autumn', 'leaves', 'falling', 'minimalist', 'elegant', 'poetic', 'seasonal', 'animation', 'pendulum', 'drift'],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello World',
        start: 0,
        end: 5,
        duration: 5,
        absoluteStart: 0,
        absoluteEnd: 5,
      },
    ],
    font: 'Inter:400',
    fontSize: 72,
    textColor: '#1F2937',
    startColor: '#9CA3AF',
    oscillations: 1.5,
    oscillationAmplitude: 30,
    baseDuration: 2,
    letterDelay: 0.1,
    verticalOffset: 50,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const autumnLeavesTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
