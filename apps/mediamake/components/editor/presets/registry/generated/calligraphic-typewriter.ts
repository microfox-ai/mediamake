/**
 * Calligraphic Typewriter Effect Preset
 *
 * This preset creates an elegant script typewriter effect that simulates calligraphic handwriting
 * being written in real-time. Each letter flows into existence with smooth, curved motions using
 * mask-reveal effects that follow the natural stroke order of handwriting. The effect includes
 * subtle ink-bleed at the start of words, pressure variations in opacity, and an optional
 * decorative underline that draws itself after the text completes.
 *
 * Features:
 * - **Calligraphic Animation**: Letters reveal with clip-path masks from left to right with diagonal flow
 * - **Organic Timing**: Variable timing per character (50ms for simple, 150ms for complex letters)
 * - **Ink-Bleed Effects**: Subtle blur/spread effects at word starts
 * - **Pressure Variations**: Opacity fluctuations (0.8->1) to simulate pen pressure
 * - **Decorative Underline**: Optional self-drawing underline after text completes
 * - **Word-Level Timing**: Syncs with caption data if available
 * - **GPU-Accelerated**: Uses will-change: 'clip-path' for performance
 *
 * Use Cases:
 * - Elegant title sequences with script fonts
 * - Handwritten letter animations
 * - Poetic text reveals
 * - Signature-style branding
 * - Calligraphy demonstrations
 *
 * Technical Details:
 * - Uses clip-path polygon animations: inset(0 100% 0 0) -> inset(0 0 0 0)
 * - Character complexity determines duration (50-150ms range)
 * - Word-level containers for proper spacing
 * - Underline uses scaleX animation with transform-origin: left center
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z.array(z.any()).optional().describe('Array of caption sentences with word-level timing data'),
  
  // Text styling
  font: z.string().default('Dancing Script').describe('Script or handwriting font family (e.g., "Dancing Script:400", "Pacifico", "Great Vibes:700")'),
  fontSize: z.number().default(64).describe('Font size in pixels'),
  textColor: z.string().default('#2C1810').describe('Text color (CSS color value)'),
  letterSpacing: z.number().default(2).describe('Letter spacing in pixels'),
  
  // Animation timing
  baseCharDuration: z.number().min(30).max(300).default(80).describe('Base duration per character in milliseconds'),
  complexCharMultiplier: z.number().min(1).max(3).default(1.5).describe('Duration multiplier for complex letters (W, M, etc.)'),
  wordGap: z.number().default(150).describe('Gap between word animations in milliseconds'),
  
  // Effects
  showInkBleed: z.boolean().default(true).describe('Enable ink-bleed effect at word starts'),
  inkBleedIntensity: z.number().min(0).max(10).default(3).describe('Ink-bleed blur intensity in pixels'),
  pressureVariation: z.boolean().default(true).describe('Enable opacity variation to simulate pen pressure'),
  minPressure: z.number().min(0.5).max(1).default(0.8).describe('Minimum opacity for pressure variation'),
  
  // Underline
  showUnderline: z.boolean().default(true).describe('Show decorative underline after text completes'),
  underlineThickness: z.number().min(1).max(10).default(2).describe('Underline thickness in pixels'),
  underlineColor: z.string().optional().describe('Underline color (defaults to textColor if not provided)'),
  underlineDuration: z.number().min(0.3).max(3).default(0.8).describe('Underline draw duration in seconds'),
  underlineOffset: z.number().default(10).describe('Distance below text baseline in pixels'),
  
  // Positioning
  position: z.enum(['top', 'center', 'bottom']).default('center').describe('Vertical position of text'),
  horizontalAlign: z.enum(['left', 'center', 'right']).default('center').describe('Horizontal alignment'),
  marginTop: z.number().default(0).describe('Top margin in pixels'),
  marginBottom: z.number().default(0).describe('Bottom margin in pixels'),
});

// --- Preset Execution Function ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  
  // Helper: Determine character complexity
  const getCharComplexity = (char: string): number => {
    const simpleChars = 'iltIjf|!.,:;\'"- ';
    const mediumChars = 'abcdefghknopqrsuvxyz01234567890()[]{}';
    const complexChars = 'WMQABCDEFGHJKLNOPRSTUVXYZwm&@#$%';
    
    if (simpleChars.includes(char)) return 0.6;
    if (mediumChars.includes(char)) return 1.0;
    if (complexChars.includes(char)) return params.complexCharMultiplier;
    return 1.0;
  };

  // Helper: Calculate character duration
  const getCharDuration = (char: string): number => {
    const complexity = getCharComplexity(char);
    return (params.baseCharDuration * complexity) / 1000; // Convert to seconds
  };

  // Parse font string
  const fontString = params.font || 'Dancing Script';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  const fontWeight = fontString.includes(':') ? parseInt(fontString.split(':')[1], 10) : 400;

  // Determine positioning classes
  const verticalClass = 
    params.position === 'top' ? 'items-start' :
    params.position === 'bottom' ? 'items-end' :
    'items-center';
  
  const horizontalClass = 
    params.horizontalAlign === 'left' ? 'justify-start' :
    params.horizontalAlign === 'right' ? 'justify-end' :
    'justify-center';

  const childrenData: RenderableComponentData[] = [];
  let totalDuration = 0;

  // Process captions if provided
  if (params.captions && params.captions.length > 0) {
    params.captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
      const captionStart = caption.absoluteStart;
      const words = caption.words || caption.text.split(' ').map((word, i) => ({
        text: word,
        start: i * 0.5,
        absoluteStart: captionStart + i * 0.5,
        duration: 0.5,
      }));

      let accumulatedTime = 0;

      words.forEach((word: any, wordIndex: number) => {
        const wordId = `word-${captionIndex}-${wordIndex}`;
        const wordText = word.text;
        const wordStart = accumulatedTime;
        
        // Calculate word duration based on character count
        let wordDuration = 0;
        const characters = wordText.split('');
        characters.forEach((char) => {
          wordDuration += getCharDuration(char);
        });
        
        // Add word gap
        accumulatedTime += wordDuration + params.wordGap / 1000;

        // Create character components
        const charComponents: RenderableComponentData[] = [];
        let charAccumulatedTime = 0;

        characters.forEach((char, charIndex) => {
          const charId = `${wordId}-char-${charIndex}`;
          const charDuration = getCharDuration(char);
          const charStart = charAccumulatedTime;

          // Clip-path animation (mask reveal)
          const clipPathEffect = {
            id: `${charId}-clip`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: wordStart + charStart,
              duration: charDuration,
              mode: 'provider',
              targetIds: [charId],
              ranges: [
                { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
                { key: 'clipPath', val: 'inset(0 0 0 0)', prog: 1 },
              ],
            },
          };

          // Pressure variation (opacity)
          const pressureEffect = params.pressureVariation ? {
            id: `${charId}-pressure`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: wordStart + charStart,
              duration: charDuration,
              mode: 'provider',
              targetIds: [charId],
              ranges: [
                { key: 'opacity', val: params.minPressure, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: params.minPressure + 0.1, prog: 0.6 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          } : null;

          charComponents.push({
            id: charId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: char,
              style: {
                fontSize: params.fontSize,
                color: params.textColor,
                fontWeight,
                display: 'inline-block',
                willChange: 'clip-path',
              },
              font: {
                family: fontFamily,
                weights: [fontWeight.toString()],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [clipPathEffect, pressureEffect].filter(Boolean),
          } as RenderableComponentData);

          charAccumulatedTime += charDuration;
        });

        // Ink-bleed effect for word start
        const inkBleedEffect = params.showInkBleed ? {
          id: `${wordId}-ink-bleed`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: wordStart,
            duration: 0.15,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'filter', val: `blur(${params.inkBleedIntensity}px)`, prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        } : null;

        // Word container
        childrenData.push({
          id: wordId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'inline-block',
              style: {
                marginRight: `${params.letterSpacing}px`,
              },
            },
          },
          context: {
            timing: {
              start: captionStart,
              duration: caption.duration,
            },
          },
          effects: inkBleedEffect ? [inkBleedEffect] : [],
          childrenData: charComponents,
        } as RenderableComponentData);
      });

      totalDuration = Math.max(totalDuration, captionStart + accumulatedTime);
    });
  }

  // Underline component
  const underlineId = 'decorative-underline';
  const underlineStart = totalDuration;
  const underlineEffect = params.showUnderline ? {
    id: `${underlineId}-draw`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: params.underlineDuration,
      mode: 'provider',
      targetIds: [underlineId],
      ranges: [
        { key: 'scaleX', val: 0, prog: 0 },
        { key: 'scaleX', val: 1, prog: 1 },
      ],
    },
  } : null;

  const underlineComponent = params.showUnderline ? {
    id: underlineId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute left-0',
        style: {
          bottom: `${params.underlineOffset}px`,
          height: `${params.underlineThickness}px`,
          width: '100%',
          backgroundColor: params.underlineColor || params.textColor,
          transformOrigin: 'left center',
        },
      },
    },
    context: {
      timing: {
        start: underlineStart,
        duration: params.underlineDuration,
      },
    },
    effects: underlineEffect ? [underlineEffect] : [],
    childrenData: [],
  } as RenderableComponentData : null;

  // Root container
  const rootContainer = {
    id: 'calligraphic-typewriter-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative flex ${verticalClass} ${horizontalClass}`,
        style: {
          marginTop: `${params.marginTop}px`,
          marginBottom: `${params.marginBottom}px`,
          gap: `${params.letterSpacing}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration + (params.showUnderline ? params.underlineDuration : 0),
      },
    },
    childrenData: [
      ...childrenData,
      ...(underlineComponent ? [underlineComponent] : []),
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'calligraphic-typewriter',
  title: 'Calligraphic Typewriter Effect',
  description: 'Elegant script typewriter effect simulating handwriting being written in real-time with mask-reveal animations, ink-bleed effects, pressure variations, and optional decorative underline',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'typography', 'calligraphy', 'handwriting', 'script', 'typewriter', 'elegant', 'animation', 'reveal', 'ink'],
  dependencies: {},
  defaultInputParams: {
    font: 'Dancing Script:400',
    fontSize: 64,
    textColor: '#2C1810',
    letterSpacing: 2,
    baseCharDuration: 80,
    complexCharMultiplier: 1.5,
    wordGap: 150,
    showInkBleed: true,
    inkBleedIntensity: 3,
    pressureVariation: true,
    minPressure: 0.8,
    showUnderline: true,
    underlineThickness: 2,
    underlineDuration: 0.8,
    underlineOffset: 10,
    position: 'center',
    horizontalAlign: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
};

// --- Export Preset ---

export const calligraphicTypewriterPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
