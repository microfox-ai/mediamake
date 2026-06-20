/**
 * Typewriter Slide Text Animation Preset
 *
 * This preset creates a hybrid typewriter-meets-slide animation where text appears 
 * character-by-character (typewriter effect) and then each completed word slides 
 * smoothly into its final position from the right. Features quick, snappy slide 
 * motion (0.2-0.3s) with strong ease-out curve, while the typewriter effect provides 
 * the primary timing rhythm.
 *
 * Features:
 * - **Character-by-Character Reveal**: Classic typewriter effect using clipPath animation
 * - **Smooth Word Sliding**: Each completed word slides into position from the right
 * - **Quick Snappy Motion**: 0.25s slide duration with ease-out curve
 * - **Continuous Flow**: Words reveal and position in sequence for kinetic movement
 * - **Monospace Typography**: Authentic typewriter aesthetic with font-mono
 * - **Flexible Positioning**: Configurable container alignment and word spacing
 * - **Caption Data Integration**: Works with word-level timing from transcription data
 *
 * Use cases:
 * - Tech presentations with typing effect
 * - Coding tutorials and developer content
 * - Terminal/command-line aesthetic videos
 * - Kinetic typography for tech brands
 * - Modern programming content with retro feel
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with word-level timing data'),
  
  fontSize: z.number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels for the typewriter text'),
  
  textColor: z.string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),
  
  font: z.string()
    .default('Inter:500')
    .optional()
    .describe('Font family with optional weight (e.g., "Roboto:600", "JetBrainsMono:400")'),
  
  containerAlignment: z.enum(['left', 'center', 'right'])
    .default('center')
    .optional()
    .describe('Horizontal alignment of the text container'),
  
  verticalPosition: z.enum(['top', 'center', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of the text container'),
  
  wordSpacing: z.number()
    .min(0)
    .max(50)
    .default(10)
    .optional()
    .describe('Spacing between words in pixels'),
  
  slideDuration: z.number()
    .min(0.1)
    .max(0.5)
    .default(0.25)
    .optional()
    .describe('Duration of the slide animation in seconds (0.2-0.3s recommended)'),
  
  slideDistance: z.number()
    .min(20)
    .max(200)
    .default(50)
    .optional()
    .describe('Distance words slide from in pixels'),
  
  containerPadding: z.number()
    .min(0)
    .max(100)
    .default(20)
    .optional()
    .describe('Padding around the text container in pixels'),
  
  backgroundBlur: z.boolean()
    .default(false)
    .optional()
    .describe('Whether to add a blurred background box behind text'),
  
  backgroundColor: z.string()
    .default('rgba(0, 0, 0, 0.3)')
    .optional()
    .describe('Background color for blur box (CSS color with alpha)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:500';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  // Parse font weight from font string
  let fontWeight: number | undefined;
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontWeight = parseInt(fontParts[1], 10);
    }
  }
  
  // Container alignment mapping
  const alignmentMap = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };
  
  // Vertical position mapping
  const verticalMap = {
    top: 'items-start',
    center: 'items-center',
    bottom: 'items-end',
  };
  
  // Process captions
  const captions = params.captions as TranscriptionSentence[];
  
  // Create container for all captions
  const captionContainers: RenderableComponentData[] = captions.map((caption, captionIndex) => {
    // Create word components for this caption
    const wordComponents: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = `typewriter-word-${captionIndex}-${wordIndex}`;
      const containerId = `typewriter-container-${captionIndex}-${wordIndex}`;
      
      // Typewriter effect: clip from right (0 → 100% revealed)
      const typewriterEffect = {
        id: `typewriter-effect-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: word.start, // Relative to caption
          duration: word.duration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 }, // Fully clipped from right
            { key: 'clipPath', val: 'inset(0 0% 0 0)', prog: 1 },   // Fully revealed
          ],
        },
      };
      
      // Slide effect: translateX from offset to final position
      const slideEffect = {
        id: `slide-effect-${containerId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: word.start + word.duration, // Triggers when typewriter completes
          duration: params.slideDuration || 0.25,
          mode: 'provider' as const,
          targetIds: [containerId],
          ranges: [
            { key: 'translateX', val: params.slideDistance || 50, prog: 0 }, // Start offset to right
            { key: 'translateX', val: 0, prog: 1 },                           // Final position
            { key: 'opacity', val: 0.7, prog: 0 },                           // Slight fade in
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      };
      
      // Word container with inline-flex for proper spacing
      const wordContainer: RenderableComponentData = {
        id: containerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-flex font-mono relative',
            style: {
              marginRight: wordIndex < caption.words.length - 1 ? `${params.wordSpacing || 10}px` : '0px',
            },
          },
        },
        context: {
          timing: {
            start: 0, // All words start together (see TYPOGRAPHY.md)
            duration: caption.duration, // All words last for full sentence
          },
        },
        effects: [slideEffect],
        childrenData: [
          {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              className: 'font-mono',
              style: {
                fontSize: `${params.fontSize || 48}px`,
                color: params.textColor || '#FFFFFF',
                fontWeight: fontWeight || 500,
              },
              font: {
                family: fontFamily,
                weights: fontWeight ? [fontWeight.toString()] : ['500'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [typewriterEffect],
          } as RenderableComponentData,
        ],
      };
      
      return wordContainer;
    });
    
    // Caption container with flex-wrap for word flow
    const captionContainer: RenderableComponentData = {
      id: `typewriter-caption-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex flex-wrap items-baseline ${alignmentMap[params.containerAlignment || 'center']} ${verticalMap[params.verticalPosition || 'center']}`,
          style: {
            padding: `${params.containerPadding || 20}px`,
            gap: '0px', // Use word margins instead
            ...(params.backgroundBlur ? {
              backgroundColor: params.backgroundColor || 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
            } : {}),
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    };
    
    return captionContainer;
  });
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-slide-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? Math.max(...captions.map(c => c.absoluteEnd))
          : 10,
      },
    },
    childrenData: captionContainers,
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
  id: 'typewriter-slide-text',
  title: 'Typewriter Slide Text Animation',
  description: 'A hybrid typewriter-meets-slide animation where text appears character-by-character (typewriter effect) and then each completed word slides smoothly into its final position from the right. Features quick, snappy slide motion (0.2-0.3s) with strong ease-out curve, while the typewriter effect provides the primary timing rhythm. Perfect for tech presentations, coding tutorials, and kinetic typography needs.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'typewriter', 'slide', 'kinetic', 'animation', 'tech', 'coding', 'terminal', 'monospace', 'captions', 'subtitles'],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    fontSize: 48,
    textColor: '#FFFFFF',
    font: 'JetBrainsMono:500',
    containerAlignment: 'center',
    verticalPosition: 'center',
    wordSpacing: 10,
    slideDuration: 0.25,
    slideDistance: 50,
    containerPadding: 20,
    backgroundBlur: false,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
};

// --- Export ---

export const typewriterSlideTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
