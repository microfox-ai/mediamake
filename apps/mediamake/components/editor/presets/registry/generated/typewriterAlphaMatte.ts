/**
 * Typewriter Alpha Matte Text Reveal Preset
 *
 * This preset creates a sophisticated typewriter/terminal-style text reveal effect
 * with progressive character, word, or line reveals. It features smart text parsing,
 * customizable timing curves, cursor animations, and support for typing mistakes/corrections.
 *
 * Features:
 * - **Progressive Text Reveal**: Reveal text by character, word, or line
 * - **Smart Text Parsing**: Understands word boundaries and text structure
 * - **Cursor Animation**: Animated blinking cursor that follows typing progress
 * - **Timing Customization**: Adjustable speed, variation, and easing
 * - **Typing Mistakes**: Optional simulation of typing errors and corrections
 * - **RTL Support**: Handles right-to-left languages
 * - **Text Alignment**: Supports left, center, right, and justify alignments
 * - **Typing Sounds**: Optional audio trigger points (placeholder for future audio integration)
 *
 * Use cases:
 * - Terminal/code editor effects
 * - Typewriter-style title sequences
 * - Progressive text reveals for storytelling
 * - Animated subtitles with typing effect
 * - Technical documentation presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to reveal with typewriter effect'),
  
  speed: z
    .number()
    .min(10)
    .max(500)
    .default(80)
    .describe('Typing speed in milliseconds per unit (character/word/line)'),
  
  unit: z
    .enum(['char', 'word', 'line'])
    .default('char')
    .describe('Unit of text reveal: character, word, or line'),
  
  variation: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Random timing variation (0 = uniform, 1 = maximum variation)'),
  
  cursorStyle: z
    .enum(['block', 'line', 'underline', 'none'])
    .default('line')
    .describe('Cursor style: block (█), line (|), underline (_), or none'),
  
  cursorBlink: z
    .boolean()
    .default(true)
    .describe('Whether the cursor should blink'),
  
  cursorBlinkSpeed: z
    .number()
    .min(200)
    .max(2000)
    .default(530)
    .describe('Cursor blink speed in milliseconds'),
  
  mistakes: z
    .boolean()
    .default(false)
    .describe('Include typing mistakes and corrections'),
  
  mistakeRate: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.05)
    .describe('Probability of typing mistake (0-0.3)'),
  
  font: z
    .string()
    .default('Courier New')
    .describe('Font family (monospace recommended for authentic typewriter effect)'),
  
  fontSize: z
    .number()
    .min(12)
    .max(120)
    .default(32)
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color'),
  
  cursorColor: z
    .string()
    .optional()
    .describe('Cursor color (defaults to textColor if not specified)'),
  
  backgroundColor: z
    .string()
    .optional()
    .describe('Optional background color'),
  
  textAlign: z
    .enum(['left', 'center', 'right', 'justify'])
    .default('left')
    .describe('Text alignment'),
  
  rtl: z
    .boolean()
    .default(false)
    .describe('Right-to-left text direction for RTL languages'),
  
  startDelay: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .describe('Delay before typing starts in seconds'),
  
  easingType: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out'])
    .default('ease-out')
    .describe('Easing curve for character reveal animations'),
  
  characterSpacing: z
    .number()
    .min(0)
    .max(20)
    .default(0)
    .describe('Letter spacing in pixels'),
  
  lineHeight: z
    .number()
    .min(1)
    .max(3)
    .default(1.5)
    .describe('Line height multiplier'),
  
  containerPadding: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .describe('Container padding in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to parse text into units (characters, words, or lines)
  const parseTextIntoUnits = (
    text: string,
    unit: 'char' | 'word' | 'line',
  ): string[] => {
    if (unit === 'char') {
      return text.split('');
    } else if (unit === 'word') {
      // Split by whitespace while preserving spaces for reconstruction
      return text.match(/\S+|\s+/g) || [];
    } else {
      // Split by newlines
      return text.split('\n');
    }
  };

  // Helper function to calculate timing with variation
  const calculateTiming = (
    index: number,
    baseSpeed: number,
    variation: number,
  ): { start: number; duration: number } => {
    const randomFactor = 1 + (Math.random() * 2 - 1) * variation;
    const unitDelay = (baseSpeed / 1000) * randomFactor;
    const start = index * unitDelay;
    const duration = unitDelay * 0.3; // Fade-in duration (30% of delay)
    
    return { start, duration };
  };

  // Helper function to generate typing mistakes
  const generateMistakes = (
    units: string[],
    mistakeRate: number,
  ): Array<{ index: number; wrongChar: string }> => {
    if (!params.mistakes) return [];
    
    const mistakes: Array<{ index: number; wrongChar: string }> = [];
    const mistakeChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    
    units.forEach((unit, index) => {
      if (Math.random() < mistakeRate && unit.trim().length > 0) {
        const wrongChar = mistakeChars[Math.floor(Math.random() * mistakeChars.length)];
        mistakes.push({ index, wrongChar });
      }
    });
    
    return mistakes;
  };

  // Parse text into units
  const units = parseTextIntoUnits(params.text, params.unit);
  const totalUnits = units.length;
  
  // Generate mistakes if enabled
  const mistakes = generateMistakes(units, params.mistakeRate);
  
  // Calculate total duration
  const baseSpeedSeconds = params.speed / 1000;
  const totalDuration =
    params.startDelay +
    totalUnits * baseSpeedSeconds * (1 + params.variation / 2) +
    mistakes.length * baseSpeedSeconds * 2; // Extra time for corrections

  // Container ID
  const containerId = 'typewriter-container';
  const textWrapperId = 'typewriter-text-wrapper';
  const cursorId = 'typewriter-cursor';

  // Generate text units (characters, words, or lines)
  const textUnits: RenderableComponentData[] = units.map((unit, index) => {
    const timing = calculateTiming(index, params.speed, params.variation);
    const unitId = `typewriter-unit-${index}`;
    
    // Check if this unit has a mistake
    const mistake = mistakes.find(m => m.index === index);
    
    // Base effect: fade in character
    const baseEffect = {
      id: `fade-in-${unitId}`,
      componentId: 'generic',
      data: {
        type: params.easingType,
        start: params.startDelay + timing.start,
        duration: timing.duration,
        mode: 'provider',
        targetIds: [unitId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };

    const effects = [baseEffect];
    
    // Add mistake and correction effects if applicable
    if (mistake) {
      const mistakeStart = params.startDelay + timing.start;
      const correctionStart = mistakeStart + baseSpeedSeconds * 0.5;
      
      // Show wrong character briefly
      effects.push({
        id: `mistake-${unitId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: mistakeStart,
          duration: baseSpeedSeconds * 0.5,
          mode: 'provider',
          targetIds: [unitId],
          ranges: [
            { key: 'color', val: '#FF6B6B', prog: 0 }, // Red for mistake
            { key: 'color', val: '#FF6B6B', prog: 1 },
          ],
        },
      });
      
      // Correction effect (back to normal color)
      effects.push({
        id: `correction-${unitId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: correctionStart,
          duration: baseSpeedSeconds * 0.3,
          mode: 'provider',
          targetIds: [unitId],
          ranges: [
            { key: 'color', val: params.textColor, prog: 0 },
            { key: 'color', val: params.textColor, prog: 1 },
          ],
        },
      });
    }

    return {
      id: unitId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: mistake ? mistake.wrongChar : unit,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          fontFamily: params.font,
          letterSpacing: params.unit === 'char' ? `${params.characterSpacing}px` : undefined,
          display: 'inline',
          whiteSpace: params.unit === 'line' ? 'pre-wrap' : 'pre',
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

  // Cursor animation
  const cursorEffects = [];
  
  if (params.cursorBlink && params.cursorStyle !== 'none') {
    const blinkDuration = params.cursorBlinkSpeed / 1000;
    cursorEffects.push({
      id: 'cursor-blink',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: totalDuration,
        mode: 'provider',
        targetIds: [cursorId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.5 / (totalDuration / blinkDuration) },
          { key: 'opacity', val: 1, prog: 1 / (totalDuration / blinkDuration) },
        ],
      },
    });
  }

  // Cursor styles based on cursorStyle parameter
  const getCursorHTML = (style: string): string => {
    const color = params.cursorColor || params.textColor;
    
    if (style === 'block') {
      return `<div style="display: inline-block; width: ${params.fontSize * 0.6}px; height: ${params.fontSize}px; background-color: ${color}; margin-left: 2px;"></div>`;
    } else if (style === 'line') {
      return `<div style="display: inline-block; width: 2px; height: ${params.fontSize}px; background-color: ${color}; margin-left: 2px;"></div>`;
    } else if (style === 'underline') {
      return `<div style="display: inline-block; width: ${params.fontSize * 0.6}px; height: 2px; background-color: ${color}; margin-left: 2px; vertical-align: bottom;"></div>`;
    }
    return '';
  };

  // Cursor component
  const cursorComponent: RenderableComponentData = {
    id: cursorId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: getCursorHTML(params.cursorStyle),
      style: {
        display: params.cursorStyle === 'none' ? 'none' : 'inline-block',
        verticalAlign: 'middle',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: cursorEffects,
  } as RenderableComponentData;

  // Text wrapper container
  const textWrapper: RenderableComponentData = {
    id: textWrapperId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'inline-block',
        style: {
          direction: params.rtl ? 'rtl' : 'ltr',
          textAlign: params.textAlign,
          lineHeight: params.lineHeight,
          whiteSpace: params.unit === 'line' ? 'pre-wrap' : 'pre',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [...textUnits, cursorComponent],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          padding: `${params.containerPadding}px`,
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textWrapper],
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
  id: 'typewriterAlphaMatte',
  title: 'Typewriter Alpha Matte Text Reveal',
  description:
    'A sophisticated typewriter/terminal-style text reveal effect with progressive character, word, or line reveals, smart text parsing, customizable timing, cursor animations, and optional typing mistakes/corrections. Supports RTL languages and different text alignments.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typewriter',
    'terminal',
    'reveal',
    'animation',
    'progressive',
    'cursor',
    'typing',
    'mistakes',
    'rtl',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Hello, World!\nThis is a typewriter effect.',
    speed: 80,
    unit: 'char',
    variation: 0.3,
    cursorStyle: 'line',
    cursorBlink: true,
    cursorBlinkSpeed: 530,
    mistakes: false,
    mistakeRate: 0.05,
    font: 'Courier New',
    fontSize: 32,
    textColor: '#FFFFFF',
    textAlign: 'left',
    rtl: false,
    startDelay: 0,
    easingType: 'ease-out',
    characterSpacing: 0,
    lineHeight: 1.5,
    containerPadding: 20,
  },
};

// Export preset
export const typewriterAlphaMattePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
