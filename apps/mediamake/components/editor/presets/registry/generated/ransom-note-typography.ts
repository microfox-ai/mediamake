/**
 * Ransom Note Typography Preset
 *
 * Creates a typography effect that simulates physical cut-out letters from magazines,
 * complete with stop-motion jitter animations. Each word appears with unique random
 * styling (fonts, sizes, colors, backgrounds) and a harsh "slap down" entrance animation.
 *
 * Features:
 * - Random styling per word (fonts, sizes, colors, backgrounds)
 * - Stop-motion jitter effect with continuous animation
 * - "Slap down" entrance animation (scale + rotation)
 * - Torn edge effects using CSS clip-path
 * - Paper texture overlay for authenticity
 * - Jitter intensity decreases over time for realism
 * - Word-by-word staggered appearance (200ms stagger)
 *
 * Use cases:
 * - Horror or thriller video titles
 * - Edgy creative content
 * - Punk or grunge aesthetic videos
 * - Mystery or crime documentaries
 * - Rebellious social media content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- PARAMS SCHEMA ---
const presetParams = z.object({
  captions: z.array(
    z.object({
      id: z.string().describe('Unique caption identifier'),
      text: z.string().describe('Full caption text'),
      start: z.number().describe('Relative start time'),
      end: z.number().describe('Relative end time'),
      duration: z.number().describe('Caption duration'),
      absoluteStart: z.number().describe('Absolute start in caption timeline'),
      absoluteEnd: z.number().describe('Absolute end in caption timeline'),
      words: z.array(
        z.object({
          id: z.string().optional().describe('Unique word identifier'),
          text: z.string().describe('Word text'),
          start: z.number().describe('Relative start time'),
          end: z.number().describe('Relative end time'),
          duration: z.number().describe('Word duration'),
          absoluteStart: z.number().describe('Absolute start in caption timeline'),
          absoluteEnd: z.number().describe('Absolute end in caption timeline'),
        })
      ).describe('Array of words in the caption'),
    })
  ).describe('Array of caption sentences with word timings'),
  
  // Styling configuration
  fontChoices: z.array(z.string()).optional().default([
    'Courier:700',
    'Arial:900:italic',
    'Georgia:400',
    'Impact:400',
    'Courier:400:italic',
    'Arial:700',
  ]).describe('Array of font strings (format: "FontName:weight:style" or "FontName:weight")'),
  
  colorPalette: z.array(z.string()).optional().default([
    '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#000000', '#808080',
  ]).describe('Array of text colors'),
  
  backgroundColorPalette: z.array(z.string()).optional().default([
    '#FFFFFF', '#F0F0F0', '#FFE4B5', '#FFDAB9', '#E0E0E0', '#D3D3D3',
    '#FFF8DC', '#FFFACD', '#F5F5DC', '#FAF0E6',
  ]).describe('Array of background colors'),
  
  fontSizeRange: z.object({
    min: z.number().describe('Minimum font size in pixels'),
    max: z.number().describe('Maximum font size in pixels'),
  }).optional().default({ min: 24, max: 48 }).describe('Font size range for randomization'),
  
  paddingRange: z.object({
    min: z.number().describe('Minimum padding in pixels'),
    max: z.number().describe('Maximum padding in pixels'),
  }).optional().default({ min: 4, max: 12 }).describe('Padding range for randomization'),
  
  // Animation configuration
  slapDownDuration: z.number().optional().default(0.3).describe('Duration of slap-down entrance animation in seconds'),
  
  jitterIntensity: z.number().optional().default(2).describe('Initial jitter intensity in pixels'),
  
  jitterInterval: z.number().optional().default(0.1).describe('Interval between jitter keyframes in seconds'),
  
  jitterDecayFactor: z.number().optional().default(0.7).describe('Factor for jitter decay over time (0-1, lower = faster decay)'),
  
  wordStaggerDelay: z.number().optional().default(0.2).describe('Delay between word appearances in seconds'),
  
  // Paper texture
  paperTextureUrl: z.string().optional().describe('URL for paper texture overlay (optional)'),
  
  paperTextureOpacity: z.number().optional().default(0.15).describe('Opacity of paper texture overlay (0-1)'),
});

// --- PRESET EXECUTION ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];
  
  // Helper: Random selection from array
  const randomFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  
  // Helper: Random number in range
  const randomRange = (min: number, max: number): number => 
    Math.random() * (max - min) + min;
  
  // Helper: Random integer in range
  const randomInt = (min: number, max: number): number => 
    Math.floor(randomRange(min, max));
  
  // Helper: Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFont = (fontString: string) => {
    const parts = fontString.split(':');
    const family = parts[0];
    const weight = parts[1] ? parseInt(parts[1], 10) : 400;
    const style = parts[2] || 'normal';
    return { family, weight, style };
  };
  
  // Helper: Generate torn edge clip-path
  const generateTornEdge = (): string => {
    const points = 12;
    const pathPoints: string[] = [];
    
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 360;
      const radius = 50 + randomRange(-5, 5);
      const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
      const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
      pathPoints.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
    }
    
    return `polygon(${pathPoints.join(', ')})`;
  };
  
  // Build all word components
  const allWordComponents: RenderableComponentData[] = [];
  
  captions.forEach((caption, captionIndex) => {
    const words = caption.words;
    
    words.forEach((word, wordIndex) => {
      const wordId = `ransom-word-${captionIndex}-${wordIndex}`;
      
      // Random styling
      const selectedFont = randomFrom(params.fontChoices);
      const font = parseFont(selectedFont);
      const fontSize = randomInt(params.fontSizeRange.min, params.fontSizeRange.max);
      const textColor = randomFrom(params.colorPalette);
      const bgColor = randomFrom(params.backgroundColorPalette);
      const padding = randomInt(params.paddingRange.min, params.paddingRange.max);
      const rotation = randomRange(-5, 5);
      
      // Calculate word timing with stagger
      const wordStagger = wordIndex * params.wordStaggerDelay;
      const wordStart = word.start + wordStagger;
      const wordDuration = caption.duration - wordStagger;
      
      // Calculate jitter decay based on word appearance time
      const timeIntoCaption = word.start;
      const jitterDecay = Math.pow(params.jitterDecayFactor, timeIntoCaption / caption.duration);
      const currentJitterIntensity = params.jitterIntensity * jitterDecay;
      
      // Create jitter effect (continuous shake with 8 keyframes)
      const jitterEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateX', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0 },
          { key: 'translateY', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0 },
          { key: 'translateX', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0.125 },
          { key: 'translateY', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0.125 },
          { key: 'translateX', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0.25 },
          { key: 'translateY', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0.25 },
          { key: 'translateX', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0.375 },
          { key: 'translateY', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0.375 },
          { key: 'translateX', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0.5 },
          { key: 'translateY', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0.5 },
          { key: 'translateX', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0.625 },
          { key: 'translateY', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0.625 },
          { key: 'translateX', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0.75 },
          { key: 'translateY', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0.75 },
          { key: 'translateX', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0.875 },
          { key: 'translateY', val: randomRange(-currentJitterIntensity, currentJitterIntensity), prog: 0.875 },
        ],
      };
      
      // Create slap-down entrance effect
      const slapDownEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: 0,
        duration: params.slapDownDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scale', val: 1.5, prog: 0 },
          { key: 'scale', val: 0.9, prog: 0.6 },
          { key: 'scale', val: 1.0, prog: 1 },
          { key: 'rotate', val: rotation * 2, prog: 0 },
          { key: 'rotate', val: rotation, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
        ],
      };
      
      // Create word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-block relative',
            style: {
              backgroundColor: bgColor,
              padding: `${padding}px`,
              clipPath: generateTornEdge(),
              boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              transform: `rotate(${rotation}deg)`,
              willChange: 'transform',
              transformStyle: 'preserve-3d' as const,
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `${wordId}-slap`,
            componentId: 'generic',
            data: slapDownEffect,
          },
          {
            id: `${wordId}-jitter`,
            componentId: 'generic',
            data: jitterEffect,
          },
        ],
        childrenData: [
          {
            id: `${wordId}-text`,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                fontWeight: font.weight,
                fontStyle: font.style as any,
                userSelect: 'none' as const,
              },
              font: {
                family: font.family,
                weights: [font.weight.toString()],
              },
            },
            context: {
              timing: {
                start: wordStart,
                duration: wordDuration,
              },
            },
          },
        ],
      };
      
      allWordComponents.push(wordComponent);
    });
  });
  
  // Create paper texture overlay (if provided)
  const paperTextureOverlay = params.paperTextureUrl
    ? {
        id: 'ransom-paper-texture',
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: params.paperTextureUrl,
          className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
          style: {
            opacity: params.paperTextureOpacity,
            mixBlendMode: 'multiply' as const,
            zIndex: 1000,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: captions[captions.length - 1].absoluteEnd,
          },
        },
      }
    : null;
  
  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'ransom-note-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-wrap gap-2 p-8',
        style: {
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions[captions.length - 1].absoluteEnd,
      },
    },
    childrenData: [
      ...allWordComponents,
      ...(paperTextureOverlay ? [paperTextureOverlay] : []),
    ],
  };
  
  return {
    output: {
      childrenData: [rootContainer as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- PRESET METADATA ---
const presetMetadata: PresetMetadata = {
  id: 'ransomNoteTypography',
  title: 'Ransom Note Typography',
  description: 'A typography preset that simulates physical cut-out letters from magazines with stop-motion style animations. Each word appears with unique random styling (fonts, sizes, colors, backgrounds) and a "slap down" entrance animation. Includes paper texture overlays and torn edge effects for authenticity. Perfect for edgy, creative, or horror-themed content.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'ransom-note', 'cut-out', 'magazine', 'stop-motion', 'jitter', 'grunge', 'horror', 'edgy', 'creative', 'physical', 'texture'],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'PAY ATTENTION',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          { id: 'word-1', text: 'PAY', start: 0, end: 1, duration: 1, absoluteStart: 0, absoluteEnd: 1 },
          { id: 'word-2', text: 'ATTENTION', start: 1, end: 3, duration: 2, absoluteStart: 1, absoluteEnd: 3 },
        ],
      },
    ],
    fontChoices: ['Courier:700', 'Arial:900:italic', 'Georgia:400', 'Impact:400'],
    colorPalette: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#000000'],
    backgroundColorPalette: ['#FFFFFF', '#F0F0F0', '#FFE4B5', '#FFDAB9', '#E0E0E0'],
    fontSizeRange: { min: 24, max: 48 },
    paddingRange: { min: 4, max: 12 },
    slapDownDuration: 0.3,
    jitterIntensity: 2,
    jitterInterval: 0.1,
    jitterDecayFactor: 0.7,
    wordStaggerDelay: 0.2,
    paperTextureOpacity: 0.15,
  },
  dependencies: {},
};

// --- EXPORT ---
export const ransomNoteTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};