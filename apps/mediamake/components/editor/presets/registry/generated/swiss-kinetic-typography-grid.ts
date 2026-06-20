/**
 * Swiss Kinetic Typography Grid Preset
 *
 * A minimalist Swiss-style kinetic typography preset inspired by the International Typographic Style.
 * This preset creates a precise, systematic, and elegantly restrained typographic experience perfect 
 * for Instagram's clean aesthetic.
 *
 * Features:
 * - **Modular Grid System**: 5-row horizontal track system for organized text flow
 * - **Alternating Slide Animation**: Words slide in from left/right based on index with spring easing
 * - **Typewriter Reveal**: Quick 100ms slide-in with subtle bounce lock-in effect
 * - **Emphasis Scaling**: Important words (impact > 0.6) scale to 120% then settle to 100%
 * - **Monochromatic Design**: Pure black (#000000) text on white with red (#FF0000) accent keywords
 * - **Geometric Accents**: Thin lines and circles appear between text blocks as compositional elements
 * - **Performance Optimized**: Transform-only animations to avoid layout reflows
 *
 * Use cases:
 * - Instagram stories and posts with clean typography
 * - Minimalist caption overlays for professional content
 * - Swiss-style motion graphics and title sequences
 * - Modern editorial video layouts
 * - Typography-focused brand content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---
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
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          })
        ),
        metadata: z
          .object({
            keyword: z.string().optional(),
            impact: z.number().optional(),
            sentiment: z.string().optional(),
          })
          .optional(),
      })
    )
    .describe('Array of caption sentences with words and timing information'),

  font: z
    .string()
    .default('RobotoMono:500')
    .describe('Monospace font family with optional weight and style (e.g., "RobotoMono:500", "Courier:600")'),

  impactThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Threshold for keyword emphasis scaling (0-1). Words with impact above this get scale effect'),

  slideSpeed: z
    .number()
    .min(50)
    .max(500)
    .default(100)
    .describe('Speed of slide-in animation in milliseconds'),

  scaleAmount: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .describe('Maximum scale multiplier for emphasis words'),

  showGeometricShapes: z
    .boolean()
    .default(true)
    .describe('Show geometric accent shapes (lines, circles) between text blocks'),

  geometricFrequency: z
    .number()
    .min(1)
    .max(10)
    .default(4)
    .describe('Show geometric shape every N words'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  const {
    captions,
    font,
    impactThreshold,
    slideSpeed,
    scaleAmount,
    showGeometricShapes,
    geometricFrequency,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
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
    
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Helper: Generate unique ID
  const generateId = (prefix: string, index: number) => `swiss-kinetic-${prefix}-${index}`;

  // Collect all words from all captions with track assignments
  interface WordWithTrack {
    word: any;
    caption: any;
    wordIndex: number;
    globalIndex: number;
    track: number;
    isKeyword: boolean;
  }

  const allWords: WordWithTrack[] = [];
  let globalWordIndex = 0;

  captions.forEach((caption) => {
    caption.words.forEach((word, wordIndex) => {
      const impact = caption.metadata?.impact ?? 0;
      const isKeyword = 
        caption.metadata?.keyword === word.text || 
        impact > impactThreshold;
      
      // Assign to track (0-4) based on global word index
      const track = globalWordIndex % 5;

      allWords.push({
        word,
        caption,
        wordIndex,
        globalIndex: globalWordIndex,
        track,
        isKeyword,
      });

      globalWordIndex++;
    });
  });

  // Create track containers (5 horizontal tracks)
  const trackContainers: RenderableComponentData[] = [];

  for (let trackIndex = 0; trackIndex < 5; trackIndex++) {
    const isEvenTrack = trackIndex % 2 === 0;
    const alignment = isEvenTrack ? 'text-left' : 'text-right';
    const justifyContent = isEvenTrack ? 'justify-start' : 'justify-end';

    trackContainers.push({
      id: generateId(`track`, trackIndex),
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `col-span-full flex items-center ${alignment} ${justifyContent} gap-2`,
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'this',
        },
      },
      childrenData: [],
    } as RenderableComponentData);
  }

  // Geometric shape elements
  const geometricShapes: RenderableComponentData[] = [];
  let shapeIndex = 0;

  // Process each word and assign to track
  allWords.forEach((item, index) => {
    const { word, caption, globalIndex, track, isKeyword } = item;
    const wordId = generateId('word', globalIndex);
    const isEvenWord = globalIndex % 2 === 0;
    
    // Calculate timing
    const wordStart = caption.absoluteStart + word.start;
    const cascadeOffset = track * (slideSpeed / 1000); // 100ms * track index
    const actualStart = wordStart + cascadeOffset;
    
    // Slide direction based on word index (even from left, odd from right)
    const slideFrom = isEvenWord ? '-100%' : '100%';
    
    // Base slide-in effect (100ms spring easing)
    const slideEffect = {
      id: `${wordId}-slide`,
      componentId: 'generic',
      data: {
        type: 'custom',
        easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Spring bounce
        start: 0,
        duration: slideSpeed / 1000,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateX', val: slideFrom, prog: 0 },
          { key: 'translateX', val: '0%', prog: 1 },
        ],
      },
    };

    // Effects array
    const effects: any[] = [slideEffect];

    // Add scale effect for keywords
    if (isKeyword) {
      const scaleUpEffect = {
        id: `${wordId}-scale-up`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: slideSpeed / 1000,
          duration: 0.15,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: scaleAmount, prog: 1 },
          ],
        },
      };

      const scaleDownEffect = {
        id: `${wordId}-scale-down`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: slideSpeed / 1000 + 0.15,
          duration: 0.15,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: scaleAmount, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      };

      effects.push(scaleUpEffect, scaleDownEffect);
    }

    // Text color and style based on keyword status
    const textColor = isKeyword ? 'text-red-600' : 'text-black';
    const fontWeight = isKeyword ? 'font-bold' : '';

    // Create word component
    const wordComponent: RenderableComponentData = {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word.text,
        className: `font-mono ${textColor} ${fontWeight} text-2xl md:text-3xl leading-none tracking-tight pointer-events-none`,
        style: {
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
        },
      },
      context: {
        timing: {
          start: actualStart,
          duration: word.duration,
        },
      },
      effects,
    } as RenderableComponentData;

    // Add word to appropriate track
    trackContainers[track].childrenData!.push(wordComponent);

    // Add geometric shapes at intervals
    if (showGeometricShapes && globalIndex > 0 && globalIndex % geometricFrequency === 0) {
      const shapeType = shapeIndex % 3; // Cycle through 3 shape types
      const shapeId = generateId('shape', shapeIndex);
      
      // Random position within frame
      const randomX = 10 + Math.random() * 80; // 10-90%
      const randomY = 10 + Math.random() * 80;

      let shapeComponent: RenderableComponentData;

      if (shapeType === 0) {
        // Horizontal line
        shapeComponent = {
          id: shapeId,
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shape: 'rectangle',
            className: 'absolute bg-black pointer-events-none',
            style: {
              width: '60px',
              height: '1px',
              left: `${randomX}%`,
              top: `${randomY}%`,
            },
          },
          context: {
            timing: {
              start: actualStart,
              duration: 0.3,
            },
          },
          effects: [
            {
              id: `${shapeId}-fade`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: 0.2,
                mode: 'provider',
                targetIds: [shapeId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData;
      } else if (shapeType === 1) {
        // Vertical line
        shapeComponent = {
          id: shapeId,
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shape: 'rectangle',
            className: 'absolute bg-black pointer-events-none',
            style: {
              width: '1px',
              height: '40px',
              left: `${randomX}%`,
              top: `${randomY}%`,
            },
          },
          context: {
            timing: {
              start: actualStart,
              duration: 0.3,
            },
          },
          effects: [
            {
              id: `${shapeId}-fade`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: 0.2,
                mode: 'provider',
                targetIds: [shapeId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData;
      } else {
        // Circle
        shapeComponent = {
          id: shapeId,
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shape: 'circle',
            className: 'absolute border border-black bg-transparent pointer-events-none rounded-full',
            style: {
              width: '12px',
              height: '12px',
              left: `${randomX}%`,
              top: `${randomY}%`,
            },
          },
          context: {
            timing: {
              start: actualStart,
              duration: 0.3,
            },
          },
          effects: [
            {
              id: `${shapeId}-fade-scale`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: 0.2,
                mode: 'provider',
                targetIds: [shapeId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                  { key: 'scale', val: 0.5, prog: 0 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData;
      }

      geometricShapes.push(shapeComponent);
      shapeIndex++;
    }
  });

  // Grid container with 5 tracks
  const gridContainer: RenderableComponentData = {
    id: 'swiss-kinetic-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-rows-5 gap-2 p-8',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: trackContainers,
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'swiss-kinetic-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-white',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: [gridContainer, ...geometricShapes],
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'swissKineticTypographyGrid',
  title: 'Swiss Kinetic Typography Grid',
  description: 'A minimalist Swiss-style kinetic typography preset inspired by the International Typographic Style. Features words sliding in from alternating sides along a strict 5-row modular grid system, with typewriter-style reveals using spring easing. Implements monochromatic black on white design with red accent keywords. Includes thin geometric shapes (lines, circles) as compositional elements. Perfect for Instagram\'s clean aesthetic with precise, systematic, and elegantly restrained motion design.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'swiss',
    'minimalist',
    'grid',
    'modular',
    'international-typographic-style',
    'monochromatic',
    'geometric',
    'instagram',
    'clean',
    'caption',
    'subtitle',
    'text',
  ],
  defaultInputParams: {
    captions: [],
    font: 'RobotoMono:500',
    impactThreshold: 0.6,
    slideSpeed: 100,
    scaleAmount: 1.2,
    showGeometricShapes: true,
    geometricFrequency: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---
export const swissKineticTypographyGridPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
