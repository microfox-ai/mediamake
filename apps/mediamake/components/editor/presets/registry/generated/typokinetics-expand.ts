/**
 * Typokinetics Reverse Zoom Expansion Preset
 *
 * A cinematic typokinetic preset where letters start tightly kerned at the center and 
 * smoothly expand outward with spring-based easing, like a reverse crash zoom. Each letter 
 * maintains individual identity while participating in collective expansion, with subtle 
 * rotation for depth and dimensionality. Works with single words and multi-word captions, 
 * adapting expansion distance based on container space.
 *
 * Features:
 * - **Reverse Zoom Effect**: Letters start tightly kerned and expand outward
 * - **Spring Physics**: Natural, elastic motion with overshoot and settling
 * - **Per-Letter Rotation**: Subtle rotation effects for handheld camera feel
 * - **Staggered Animation**: Each letter animates with slight delay for organic feel
 * - **Multi-Word Support**: Adapts expansion distance for single and multi-word captions
 * - **Container Aware**: Calculates spacing based on available space
 * - **GPU Accelerated**: Transform-based animations for smooth performance
 *
 * Use cases:
 * - Creating cinematic title reveals
 * - Building dynamic typography effects
 * - Adding organic motion to text
 * - Creating reverse zoom effects similar to video editing
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define preset parameters
const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with text and timing data'),
  font: z.string().optional().describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  fontSize: z.number().default(72).describe('Base font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color'),
  expansionDistance: z.number().default(150).describe('Maximum expansion distance in pixels per letter from center'),
  animationDuration: z.number().default(1.5).describe('Duration of expansion animation in seconds'),
  staggerDelay: z.number().default(0.03).describe('Delay between each letter animation in seconds'),
  rotationIntensity: z.number().default(2).describe('Maximum rotation angle in degrees for subtle rotation effect'),
  springDamping: z.number().default(0.7).describe('Spring damping (0-1, lower = more bounce)'),
  springStiffness: z.number().default(100).describe('Spring stiffness (higher = snappier)'),
  initialKerning: z.number().default(0.1).describe('Initial tight kerning multiplier (0-1, lower = tighter)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font = 'Inter:700',
    fontSize = 72,
    textColor = '#FFFFFF',
    expansionDistance = 150,
    animationDuration = 1.5,
    staggerDelay = 0.03,
    rotationIntensity = 2,
    springDamping = 0.7,
    springStiffness = 100,
    initialKerning = 0.1,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold
  }

  // Create caption components
  const captionComponents: RenderableComponentData[] = captions.map((caption: TranscriptionSentence, captionIndex: number) => {
    const captionText = caption.text;
    const words = captionText.split(' ');
    
    // Create word components
    const wordComponents: RenderableComponentData[] = words.map((word: string, wordIndex: number) => {
      const letters = word.split('');
      const centerIndex = (letters.length - 1) / 2;
      
      // Create letter components
      const letterComponents: RenderableComponentData[] = letters.map((letter: string, letterIndex: number) => {
        const letterId = `caption-${captionIndex}-word-${wordIndex}-letter-${letterIndex}`;
        const relativeIndex = letterIndex - centerIndex;
        
        // Calculate initial tight position
        const initialTranslateX = relativeIndex * fontSize * initialKerning;
        
        // Calculate final expanded position
        const finalTranslateX = relativeIndex * expansionDistance;
        
        // Calculate rotation (varies per letter for organic feel)
        const initialRotate = -rotationIntensity * (relativeIndex / centerIndex);
        
        // Calculate stagger delay based on distance from center
        const delay = Math.abs(relativeIndex) * staggerDelay;
        
        // Create expansion effect
        const expansionEffect = {
          id: `expansion-${letterId}`,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: delay,
            duration: animationDuration,
            mode: 'provider',
            targetIds: [letterId],
            props: {
              damping: springDamping,
              stiffness: springStiffness,
            },
            ranges: [
              // Translate from tight to expanded
              { key: 'translateX', val: initialTranslateX, prog: 0 },
              { key: 'translateX', val: finalTranslateX, prog: 1 },
              // Rotate from initial to neutral
              { key: 'rotate', val: initialRotate, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              // Fade in slightly
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        };
        
        return {
          id: letterId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: letter,
            className: 'inline-block transform-gpu',
            style: {
              fontSize: `${fontSize}px`,
              color: textColor,
              willChange: 'transform',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
              display: 'swap',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: [expansionEffect],
        } as RenderableComponentData;
      });
      
      return {
        id: `caption-${captionIndex}-word-${wordIndex}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-flex relative',
            style: {
              marginRight: wordIndex < words.length - 1 ? '0.5em' : '0',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: letterComponents,
      } as RenderableComponentData;
    });
    
    return {
      id: `caption-${captionIndex}-container`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [
        {
          id: `caption-${captionIndex}-words`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-wrap items-center justify-center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: wordComponents,
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Create root container
  const rootContainer = {
    id: 'typokinetics-expand-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? captions[captions.length - 1].absoluteEnd 
          : 10,
      },
    },
    childrenData: captionComponents,
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
  id: 'typokinetics-expand',
  title: 'Typokinetics Reverse Zoom Expansion',
  description: 'A cinematic typokinetic preset where letters start tightly kerned at the center and smoothly expand outward with spring-based easing, like a reverse crash zoom. Each letter maintains individual identity while participating in collective expansion, with subtle rotation for depth and dimensionality. Works with single words and multi-word captions, adapting expansion distance based on container space.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'expansion', 'reverse-zoom', 'cinematic', 'spring', 'letters', 'animation'],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'EXPAND',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [],
      },
    ],
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#FFFFFF',
    expansionDistance: 150,
    animationDuration: 1.5,
    staggerDelay: 0.03,
    rotationIntensity: 2,
    springDamping: 0.7,
    springStiffness: 100,
    initialKerning: 0.1,
  },
};

// Export preset
export const typokineticsExpandPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
