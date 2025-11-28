/**
 * Ripple Reveal Text Effect Preset
 *
 * A dynamic water-droplet ripple effect where text appears with concentric scaling ripples 
 * emanating outward. The primary text scales from 0 to 100%, while ghost copies briefly 
 * appear at larger scales (120%, 140%+) with decreasing opacity, simulating ripple waves on water.
 *
 * Features:
 * - Primary text scales from 0 to 100% with ease-out animation
 * - Ghost ripple copies at 120% and 140%+ scale with fading opacity
 * - Configurable ripple count and spread for customization
 * - Perfect for wellness content, meditation apps, spa commercials
 * - Supports both single text mode and caption-based word-by-word reveals
 * - Staggered timing for multiple words (0.15s offset between words)
 *
 * Use cases:
 * - Wellness and meditation app text reveals
 * - Spa commercial text animations
 * - Calm, flowing motion for peaceful content
 * - Water-themed presentations
 * - Tranquil text overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Zod Parameter Schema ---

const presetParams = z.object({
  text: z.string().optional().describe('Single text to display with ripple effect (alternative to captions)'),
  captions: z.array(
    z.object({
      id: z.string().describe('Caption ID'),
      text: z.string().describe('Caption text content'),
      start: z.number().describe('Caption start time (relative)'),
      absoluteStart: z.number().describe('Caption absolute start time'),
      end: z.number().describe('Caption end time (relative)'),
      absoluteEnd: z.number().describe('Caption absolute end time'),
      duration: z.number().describe('Caption duration'),
      words: z.array(
        z.object({
          id: z.string().optional().describe('Word ID'),
          text: z.string().describe('Word text'),
          start: z.number().describe('Word start time (relative to caption)'),
          absoluteStart: z.number().describe('Word absolute start time'),
          end: z.number().describe('Word end time (relative to caption)'),
          absoluteEnd: z.number().describe('Word absolute end time'),
          duration: z.number().describe('Word duration'),
          confidence: z.number().optional().describe('Speech recognition confidence'),
        })
      ).describe('Array of words in the caption'),
    })
  ).optional().describe('Array of captions with word-level timing for word-by-word ripple reveals'),
  
  fontFamily: z.string().default('Inter').describe('Font family for text (e.g., "Inter:400", "Roboto:700")'),
  fontSize: z.number().default(64).describe('Font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color (CSS color value)'),
  
  rippleCount: z.number().min(1).max(5).default(2).describe('Number of ripple waves (1-5)'),
  rippleSpread: z.number().min(1.1).max(2.5).default(0.2).describe('Scale increment per ripple (e.g., 0.2 means 1.2x, 1.4x, 1.6x...)'),
  
  primaryDuration: z.number().default(0.5).describe('Duration of primary text scale animation (seconds)'),
  rippleDuration: z.number().default(0.4).describe('Duration of each ripple wave (seconds)'),
  rippleDelay: z.number().default(0.1).describe('Delay between ripple waves (seconds)'),
  
  wordStagger: z.number().default(0.15).describe('Stagger delay between words in caption mode (seconds)'),
  
  containerClassName: z.string().default('relative grid place-items-center w-full h-full').describe('CSS classes for root container'),
  textAlign: z.enum(['left', 'center', 'right']).default('center').describe('Text alignment'),
  
  trackName: z.string().default('ripple-reveal').describe('Track name for component IDs'),
});

// --- Preset Execution Function ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }
  
  const childrenData: RenderableComponentData[] = [];
  
  // Helper function to create ripple effect for a single text element
  const createRippleEffects = (
    targetId: string,
    relativeStart: number,
    duration: number
  ) => {
    const effects = [];
    
    // Primary text scale animation (0 → 1)
    effects.push({
      id: `${targetId}-primary-scale`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: relativeStart,
        duration: params.primaryDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    });
    
    return effects;
  };
  
  // Helper function to create ripple ghost copies
  const createRippleGhosts = (
    text: string,
    baseId: string,
    relativeStart: number,
    duration: number,
    fontFamily: string,
    fontStyle: React.CSSProperties
  ) => {
    const ripples: RenderableComponentData[] = [];
    
    for (let i = 0; i < params.rippleCount; i++) {
      const rippleId = `${baseId}-ripple-${i + 1}`;
      const rippleScale = 1 + (params.rippleSpread * (i + 1));
      const rippleStartOpacity = Math.max(0.5 - (i * 0.15), 0.1);
      const rippleDelay = relativeStart + (params.rippleDelay * (i + 1));
      
      ripples.push({
        id: rippleId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: text,
          style: {
            position: 'absolute',
            inset: 0,
            fontSize: params.fontSize,
            color: params.textColor,
            textAlign: params.textAlign,
            zIndex: 10 - (i + 1),
            pointerEvents: 'none',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `${rippleId}-scale-fade`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: rippleDelay,
              duration: params.rippleDuration,
              mode: 'provider',
              targetIds: [rippleId],
              ranges: [
                { key: 'scale', val: 1.0, prog: 0 },
                { key: 'scale', val: rippleScale, prog: 1 },
                { key: 'opacity', val: rippleStartOpacity, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    
    return ripples;
  };
  
  // Mode 1: Single text mode
  if (params.text && !params.captions) {
    const primaryTextId = `${params.trackName}-primary-text`;
    const containerId = `${params.trackName}-container`;
    
    const primaryText: RenderableComponentData = {
      id: primaryTextId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: params.text,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          textAlign: params.textAlign,
          zIndex: 10,
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: 5, // Default 5 seconds for single text
        },
      },
      effects: createRippleEffects(primaryTextId, 0, 5),
    };
    
    const rippleGhosts = createRippleGhosts(
      params.text,
      primaryTextId,
      0,
      5,
      fontFamily,
      fontStyle
    );
    
    const container: RenderableComponentData = {
      id: containerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: params.containerClassName,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: 5,
        },
      },
      childrenData: [primaryText, ...rippleGhosts],
    };
    
    childrenData.push(container);
  }
  
  // Mode 2: Caption-based word-by-word mode
  if (params.captions && params.captions.length > 0) {
    params.captions.forEach((caption, captionIndex) => {
      if (!caption.words || caption.words.length === 0) return;
      
      const captionContainerId = `${params.trackName}-caption-${captionIndex}`;
      const captionWords: RenderableComponentData[] = [];
      
      caption.words.forEach((word, wordIndex) => {
        const wordBaseId = `${captionContainerId}-word-${wordIndex}`;
        const primaryWordId = `${wordBaseId}-primary`;
        
        // Calculate staggered start time (relative to caption)
        const wordRelativeStart = word.start + (wordIndex * params.wordStagger);
        
        // Primary word
        const primaryWord: RenderableComponentData = {
          id: primaryWordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              textAlign: params.textAlign,
              zIndex: 10,
              marginRight: '0.3em',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: createRippleEffects(primaryWordId, wordRelativeStart, caption.duration),
        };
        
        // Ripple ghosts for this word
        const wordRipples = createRippleGhosts(
          word.text,
          primaryWordId,
          wordRelativeStart,
          caption.duration,
          fontFamily,
          fontStyle
        );
        
        // Word container (holds primary + ripples)
        const wordContainer: RenderableComponentData = {
          id: wordBaseId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative inline-block',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: [primaryWord, ...wordRipples],
        };
        
        captionWords.push(wordContainer);
      });
      
      // Caption container (horizontal flex layout)
      const captionContainer: RenderableComponentData = {
        id: captionContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `${params.containerClassName} flex flex-row flex-wrap`,
            style: {
              gap: '0.5em',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: captionWords,
      };
      
      childrenData.push(captionContainer);
    });
  }
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${params.trackName}-root`,
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
        duration: 30, // Default duration, will be overridden by children
      },
    },
    childrenData: childrenData,
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
  id: 'ripple-reveal-text',
  title: 'Ripple Reveal Text Effect',
  description: 'A dynamic water-droplet ripple effect where text appears with concentric scaling ripples emanating outward. The primary text scales from 0 to 100%, while ghost copies briefly appear at larger scales (120%, 140%+) with decreasing opacity, simulating ripple waves on water. Perfect for wellness content, meditation apps, spa commercials, or any context requiring calm, flowing motion. Supports both single text mode and caption-based word-by-word reveals with configurable ripple count and spread parameters.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'ripple', 'water', 'reveal', 'animation', 'wellness', 'meditation', 'spa', 'calm', 'flow', 'scale', 'fade'],
  dependencies: {},
  defaultInputParams: {
    text: 'Welcome to Wellness',
    fontFamily: 'Inter:400',
    fontSize: 64,
    textColor: '#FFFFFF',
    rippleCount: 2,
    rippleSpread: 0.2,
    primaryDuration: 0.5,
    rippleDuration: 0.4,
    rippleDelay: 0.1,
    wordStagger: 0.15,
    containerClassName: 'relative grid place-items-center w-full h-full',
    textAlign: 'center',
    trackName: 'ripple-reveal',
  },
};

// --- Export ---

export const rippleRevealTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
