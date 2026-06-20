/**
 * Semantic Word Animation System Preset
 *
 * A sophisticated letter-by-letter word animation system that detects semantic categories 
 * (action verbs, emotional words, emphasis words) in transcripts and applies contextually 
 * appropriate kinetic typography effects.
 *
 * Features:
 * - **Action Verb Animations**: EXPLODE, CRASH, JUMP with physics-based letter scatter/reassemble
 * - **Emotional Word Animations**: LOVE, ANGRY, HAPPY with mood-based effects (pulse, shake, rainbow)
 * - **Emphasis Word Animations**: IMPORTANT, WARNING, BREAKING with attention-grabbing effects
 * - **Hardware Acceleration**: Uses transform-gpu for smooth 60fps animations
 * - **Letter-Level Control**: Each letter is individually animated with staggered delays
 * - **Semantic Detection**: Automatically categorizes words based on meaning
 * - **Readability Maintained**: Effects express meaning while keeping text legible
 *
 * Use cases:
 * - Creating dynamic kinetic typography for video content
 * - Adding expressive animations to transcript-based videos
 * - Building engaging social media content with animated text
 * - Creating emphasis effects for important words in captions
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---
const presetParams = z.object({
  captions: z
    .array(z.any())
    .describe('Array of caption objects with word-level timing from transcript'),
  
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with weight and style (e.g., "Roboto:600:italic", "Inter:700")'),
  
  fontSize: z
    .number()
    .optional()
    .default(72)
    .describe('Base font size in pixels'),
  
  textColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Base text color for normal words'),
  
  position: z
    .enum(['top', 'center', 'bottom'])
    .optional()
    .default('center')
    .describe('Vertical position of text on screen'),
  
  effectIntensity: z
    .number()
    .optional()
    .default(1.0)
    .describe('Global effect intensity multiplier (0.1 - 3.0)'),
  
  enableActionWords: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable action verb animations (explode, crash, jump)'),
  
  enableEmotionalWords: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable emotional word animations (love, angry, happy)'),
  
  enableEmphasisWords: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable emphasis word animations (important, warning, breaking)'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font = 'Inter:700',
    fontSize = 72,
    textColor = '#ffffff',
    position = 'center',
    effectIntensity = 1.0,
    enableActionWords = true,
    enableEmotionalWords = true,
    enableEmphasisWords = true,
  } = params;

  // --- Helper Functions (defined inside presetExecution) ---

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
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

  // Semantic word detection
  const actionWords = new Set([
    'EXPLODE', 'CRASH', 'JUMP', 'SMASH', 'BOOM', 'BANG', 'BURST', 'SHATTER',
    'BLAST', 'POP', 'SNAP', 'BREAK', 'SLAM', 'HIT', 'STRIKE', 'POUND',
  ]);

  const emotionalWords = new Map([
    ['LOVE', 'love'],
    ['HAPPY', 'happy'],
    ['ANGRY', 'angry'],
    ['SAD', 'sad'],
    ['JOY', 'happy'],
    ['FEAR', 'fear'],
    ['EXCITED', 'happy'],
    ['MAD', 'angry'],
    ['FURIOUS', 'angry'],
    ['DELIGHTED', 'happy'],
  ]);

  const emphasisWords = new Set([
    'IMPORTANT', 'WARNING', 'BREAKING', 'ALERT', 'URGENT', 'CRITICAL',
    'ATTENTION', 'CAUTION', 'DANGER', 'NOTICE', 'ANNOUNCEMENT',
  ]);

  // Detect word category
  const detectWordCategory = (text: string): { category: string; subtype?: string } => {
    const upperText = text.toUpperCase();
    
    if (enableActionWords && actionWords.has(upperText)) {
      if (['EXPLODE', 'BOOM', 'BLAST', 'BURST'].includes(upperText)) {
        return { category: 'action', subtype: 'explode' };
      } else if (['CRASH', 'SMASH', 'SLAM', 'BREAK'].includes(upperText)) {
        return { category: 'action', subtype: 'crash' };
      } else if (['JUMP', 'HOP', 'BOUNCE', 'LEAP'].includes(upperText)) {
        return { category: 'action', subtype: 'jump' };
      }
      return { category: 'action', subtype: 'explode' };
    }
    
    if (enableEmotionalWords && emotionalWords.has(upperText)) {
      return { category: 'emotional', subtype: emotionalWords.get(upperText) };
    }
    
    if (enableEmphasisWords && emphasisWords.has(upperText)) {
      if (['WARNING', 'CAUTION', 'DANGER'].includes(upperText)) {
        return { category: 'emphasis', subtype: 'warning' };
      } else if (['BREAKING', 'URGENT', 'ALERT'].includes(upperText)) {
        return { category: 'emphasis', subtype: 'breaking' };
      }
      return { category: 'emphasis', subtype: 'important' };
    }
    
    return { category: 'normal' };
  };

  // Create scatter effect for action words (explode)
  const createScatterEffect = (letterId: string, letterIndex: number, wordDuration: number) => {
    const randomX = Math.random() * 400 - 200;
    const randomY = Math.random() * 400 - 200;
    const randomRotate = Math.random() * 720;
    const duration = wordDuration * 0.7 * effectIntensity;

    return {
      id: `scatter-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          // Scatter out (0-40%)
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0 },
          
          { key: 'translateX', val: randomX, prog: 0.4 },
          { key: 'translateY', val: randomY, prog: 0.4 },
          { key: 'rotate', val: randomRotate, prog: 0.4 },
          { key: 'opacity', val: 0.3, prog: 0.4 },
          
          // Hold (40-60%)
          { key: 'translateX', val: randomX, prog: 0.6 },
          { key: 'translateY', val: randomY, prog: 0.6 },
          { key: 'rotate', val: randomRotate, prog: 0.6 },
          { key: 'opacity', val: 0.3, prog: 0.6 },
          
          // Reassemble (60-100%)
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'rotate', val: 0, prog: 1 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Create crash effect (fall and bounce)
  const createCrashEffect = (letterId: string, letterIndex: number, wordDuration: number) => {
    const fallDistance = 200;
    const duration = wordDuration * 0.7 * effectIntensity;

    return {
      id: `crash-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'translateY', val: -100, prog: 0 },
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0 },
          
          { key: 'translateY', val: fallDistance, prog: 0.5 },
          { key: 'rotate', val: 45, prog: 0.5 },
          
          { key: 'translateY', val: fallDistance - 30, prog: 0.7 },
          { key: 'rotate', val: 30, prog: 0.7 },
          
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'rotate', val: 0, prog: 1 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Create jump effect (hop with gravity)
  const createJumpEffect = (letterId: string, letterIndex: number, wordDuration: number) => {
    const jumpHeight = 50;
    const duration = wordDuration * 0.7 * effectIntensity;
    const delay = letterIndex * 0.03;

    return {
      id: `jump-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        start: delay,
        duration: duration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'scale', val: 1, prog: 0 },
          
          { key: 'translateY', val: -jumpHeight, prog: 0.5 },
          { key: 'scale', val: 1.1, prog: 0.5 },
          
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Create pulse effect for emotional words (love)
  const createPulseEffect = (letterId: string, wordDuration: number) => {
    const duration = wordDuration * 0.7 * effectIntensity;

    return {
      id: `pulse-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'scale', val: 1.0, prog: 0 },
          { key: 'opacity', val: 1.0, prog: 0 },
          
          { key: 'scale', val: 1.2, prog: 0.5 },
          { key: 'opacity', val: 0.8, prog: 0.5 },
          
          { key: 'scale', val: 1.0, prog: 1 },
          { key: 'opacity', val: 1.0, prog: 1 },
        ],
      },
    };
  };

  // Create shake effect for emotional words (angry)
  const createShakeEffect = (letterId: string, wordDuration: number) => {
    const duration = wordDuration * 0.7 * effectIntensity;

    return {
      id: `shake-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: 10, prog: 0.1 },
          { key: 'translateX', val: -10, prog: 0.2 },
          { key: 'translateX', val: 10, prog: 0.3 },
          { key: 'translateX', val: -10, prog: 0.4 },
          { key: 'translateX', val: 10, prog: 0.5 },
          { key: 'translateX', val: -10, prog: 0.6 },
          { key: 'translateX', val: 10, prog: 0.7 },
          { key: 'translateX', val: -10, prog: 0.8 },
          { key: 'translateX', val: 5, prog: 0.9 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Create rainbow effect for emotional words (happy)
  const createRainbowEffect = (letterId: string, letterIndex: number, wordDuration: number) => {
    const duration = wordDuration * 0.7 * effectIntensity;
    const delay = letterIndex * 0.05;

    return {
      id: `rainbow-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: delay,
        duration: duration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'hue-rotate', val: 0, prog: 0 },
          { key: 'scale', val: 1, prog: 0 },
          
          { key: 'hue-rotate', val: 360, prog: 1 },
          { key: 'scale', val: 1.15, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Create scale effect for emphasis words (important)
  const createScaleEffect = (letterId: string, wordDuration: number) => {
    const duration = wordDuration * 0.7 * effectIntensity;

    return {
      id: `scale-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: duration * 0.3,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'opacity', val: 0, prog: 0 },
          
          { key: 'scale', val: 1.3, prog: 1 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Create flash effect for emphasis words (warning)
  const createFlashEffect = (letterId: string, wordDuration: number) => {
    const duration = wordDuration * 0.7 * effectIntensity;

    return {
      id: `flash-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.3, prog: 0.1 },
          { key: 'opacity', val: 1, prog: 0.2 },
          { key: 'opacity', val: 0.3, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 0.4 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Create shatter effect for emphasis words (breaking)
  const createShatterEffect = (letterId: string, letterIndex: number, wordDuration: number) => {
    const randomX = (Math.random() - 0.5) * 150;
    const randomY = (Math.random() - 0.5) * 150;
    const randomRotate = Math.random() * 360;
    const duration = wordDuration * 0.7 * effectIntensity;

    return {
      id: `shatter-${letterId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [letterId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'scale', val: 1, prog: 0 },
          
          { key: 'translateX', val: randomX, prog: 1 },
          { key: 'translateY', val: randomY, prog: 1 },
          { key: 'rotate', val: randomRotate, prog: 1 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'scale', val: 0.5, prog: 1 },
        ],
      },
    };
  };

  // Parse font
  const { fontFamily, fontStyle } = parseFontString(font);

  // Position class mapping
  const positionClassMap = {
    top: 'items-start pt-20',
    center: 'items-center',
    bottom: 'items-end pb-20',
  };

  // Build word components
  const wordContainers: RenderableComponentData[] = [];

  captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const wordCategory = detectWordCategory(word.text);
      const letters = word.text.split('');
      
      // Create letter components
      const letterComponents: RenderableComponentData[] = letters.map((letter, letterIndex) => {
        const letterId = `${wordId}-letter-${letterIndex}`;
        
        // Determine color based on category
        let letterColor = textColor;
        if (wordCategory.category === 'emotional') {
          if (wordCategory.subtype === 'love') letterColor = '#ff69b4';
          else if (wordCategory.subtype === 'angry') letterColor = '#ff0000';
          else if (wordCategory.subtype === 'happy') letterColor = '#ffcc00';
        } else if (wordCategory.category === 'emphasis') {
          if (wordCategory.subtype === 'warning') letterColor = '#ffaa00';
          else if (wordCategory.subtype === 'breaking') letterColor = '#ff0000';
          else letterColor = '#00aaff';
        }

        // Create effects based on category
        let letterEffects: any[] = [];
        
        if (wordCategory.category === 'action') {
          if (wordCategory.subtype === 'explode') {
            letterEffects = [createScatterEffect(letterId, letterIndex, word.duration)];
          } else if (wordCategory.subtype === 'crash') {
            letterEffects = [createCrashEffect(letterId, letterIndex, word.duration)];
          } else if (wordCategory.subtype === 'jump') {
            letterEffects = [createJumpEffect(letterId, letterIndex, word.duration)];
          }
        } else if (wordCategory.category === 'emotional') {
          if (wordCategory.subtype === 'love') {
            letterEffects = [createPulseEffect(letterId, word.duration)];
          } else if (wordCategory.subtype === 'angry') {
            letterEffects = [createShakeEffect(letterId, word.duration)];
          } else if (wordCategory.subtype === 'happy') {
            letterEffects = [createRainbowEffect(letterId, letterIndex, word.duration)];
          }
        } else if (wordCategory.category === 'emphasis') {
          if (wordCategory.subtype === 'important') {
            letterEffects = [createScaleEffect(letterId, word.duration)];
          } else if (wordCategory.subtype === 'warning') {
            letterEffects = [createFlashEffect(letterId, word.duration)];
          } else if (wordCategory.subtype === 'breaking') {
            letterEffects = [createShatterEffect(letterId, letterIndex, word.duration)];
          }
        }

        return {
          id: letterId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: letter,
            style: {
              ...fontStyle,
              fontSize: `${fontSize}px`,
              color: letterColor,
              display: 'inline-block',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight
                ? { weights: [fontStyle.fontWeight.toString()] }
                : {}),
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: letterEffects,
        } as RenderableComponentData;
      });

      // Create word container
      wordContainers.push({
        id: wordId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-flex gap-0 transform-gpu',
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: letterComponents,
      } as RenderableComponentData);

      // Add space between words
      if (wordIndex < caption.words.length - 1) {
        wordContainers.push({
          id: `space-${captionIndex}-${wordIndex}`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: ' ',
            style: {
              ...fontStyle,
              fontSize: `${fontSize}px`,
              display: 'inline-block',
            },
            font: {
              family: fontFamily,
            },
          },
          context: {
            timing: {
              start: caption.absoluteStart,
              duration: caption.duration,
            },
          },
        } as RenderableComponentData);
      }
    });
  });

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'semantic-word-animation-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex flex-col justify-center ${positionClassMap[position]} px-10`,
      },
    },
    context: {
      timing: {
        fitDurationTo: 'self',
      },
    },
    childrenData: [
      {
        id: 'word-flex-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row flex-wrap justify-center items-center max-w-[90vw]',
            style: {
              gap: `${fontSize * 0.3}px`,
            },
          },
        },
        context: {
          timing: {
            fitDurationTo: 'parent',
          },
        },
        childrenData: wordContainers,
      } as RenderableComponentData,
    ],
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
  id: 'semantic-word-kinetic-typography',
  title: 'Semantic Word Animation System',
  description:
    'A sophisticated letter-by-letter word animation system that detects semantic categories (action verbs, emotional words, emphasis words) in transcripts and applies contextually appropriate kinetic typography effects. Action words like EXPLODE scatter letters with physics-based trajectories, emotional words like LOVE pulse with mood-appropriate colors, and emphasis words like WARNING use attention-grabbing effects. Each letter is individually animated using transform-gpu for hardware acceleration with proper easing curves for realistic physics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'kinetic',
    'typography',
    'semantic',
    'action',
    'emotional',
    'emphasis',
    'letter-animation',
    'physics',
    'hardware-accelerated',
  ],
  defaultInputParams: {
    captions: [],
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#ffffff',
    position: 'center',
    effectIntensity: 1.0,
    enableActionWords: true,
    enableEmotionalWords: true,
    enableEmphasisWords: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---
export const semanticWordKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
