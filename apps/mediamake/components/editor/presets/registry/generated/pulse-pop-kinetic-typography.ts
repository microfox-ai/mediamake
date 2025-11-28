/**
 * Pulse-Pop Kinetic Typography Preset
 *
 * This preset creates minimalist Apple Keynote-inspired kinetic typography animations
 * with a gentle pulsing scale effect. Text materializes from a tiny point (5% scale),
 * rapidly expands to 110% scale, then eases back to 100% scale like a ripple settling.
 * Includes synchronized brightness pulse that makes text briefly glow during peak scale.
 * Creates the feeling of text being 'activated' or 'powered on'.
 *
 * Features:
 * - Multi-keyframe scale animation (0.05 → 1.1 → 1.0)
 * - Synchronized brightness pulse (100% → 150% → 100%)
 * - Subtle rotation effect (-2deg → 0deg)
 * - Optional word-level stagger timing (0.08s between words)
 * - Customizable intensity parameter for effect scaling
 * - Performance optimized with will-change: transform, filter
 *
 * Use cases:
 * - Title cards and chapter markers
 * - Emphasis moments in video essays
 * - Product reveals and feature announcements
 * - Any text that needs an 'activation' feel
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().optional().describe('Text to display (used when captions not provided)'),
  captions: z.array(z.any()).optional().describe('Array of caption objects with text and timing'),
  fontSize: z.number().default(64).describe('Font size in pixels'),
  fontWeight: z.union([z.string(), z.number()]).default('bold').describe('Font weight (e.g., "bold", 700)'),
  fontFamily: z.string().default('Inter').describe('Font family name (e.g., "Inter", "Roboto")'),
  color: z.string().default('#FFFFFF').describe('Text color (CSS color value)'),
  intensity: z.number().min(0.1).max(2).default(1).describe('Effect intensity multiplier (scales all effect values proportionally)'),
  wordStagger: z.boolean().default(false).describe('Enable word-level stagger timing (0.08s between words)'),
  staggerDelay: z.number().default(0.08).describe('Delay between word animations in seconds (when wordStagger is enabled)'),
  duration: z.number().optional().describe('Duration for single text mode (when captions not provided)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    captions,
    fontSize,
    fontWeight,
    fontFamily,
    color,
    intensity,
    wordStagger,
    staggerDelay,
    duration,
  } = params;

  // Parse font string if it contains weight/style (format: "FontName:weight:style")
  const parseFontString = (fontString: string) => {
    if (!fontString.includes(':')) {
      return { family: fontString, weight: undefined, style: undefined };
    }
    const parts = fontString.split(':');
    return {
      family: parts[0],
      weight: parts.length > 1 ? parseInt(parts[1], 10) : undefined,
      style: parts.length > 2 ? parts[2] : undefined,
    };
  };

  const parsedFont = parseFontString(fontFamily);
  const finalFontFamily = parsedFont.family;
  const finalFontWeight = parsedFont.weight || fontWeight;

  // Create pulse-pop effect
  const createPulsePopEffect = (targetId: string, effectStart: number, wordDuration: number) => {
    // Scale animation values (adjusted by intensity)
    const minScale = 0.05 * intensity;
    const peakScale = 1.1 * (0.1 * intensity + 0.9); // 1.1 at intensity=1, scales to 1.2 at intensity=2
    const finalScale = 1.0;

    // Brightness values (adjusted by intensity)
    const normalBrightness = 1.0;
    const peakBrightness = 1.0 + (0.5 * intensity); // 1.5 at intensity=1, 2.0 at intensity=2

    // Rotation values (adjusted by intensity)
    const startRotation = -2 * intensity;
    const endRotation = 0;

    // Effect duration (0.6s base, scales with intensity)
    const effectDuration = 0.6 * (intensity * 0.3 + 0.7); // 0.6s at intensity=1

    return {
      id: `pulse-pop-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: effectStart,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Scale animation: 0.05 → 1.1 → 1.0
          { key: 'scale', val: minScale, prog: 0 },
          { key: 'scale', val: peakScale, prog: 0.4 },
          { key: 'scale', val: finalScale, prog: 1 },
          
          // Brightness pulse: 100% → 150% → 100%
          { key: 'brightness', val: normalBrightness, prog: 0 },
          { key: 'brightness', val: peakBrightness, prog: 0.4 },
          { key: 'brightness', val: normalBrightness, prog: 1 },
          
          // Subtle rotation: -2deg → 0deg
          { key: 'rotate', val: startRotation, prog: 0 },
          { key: 'rotate', val: endRotation, prog: 0.4 },
        ],
      },
    };
  };

  const childrenData: RenderableComponentData[] = [];

  // Mode 1: Caption-based (word-level animation with optional stagger)
  if (captions && captions.length > 0) {
    captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
      const words = caption.words || [];
      
      if (wordStagger && words.length > 0) {
        // Word-level stagger mode
        words.forEach((word, wordIndex) => {
          const wordId = `pulse-pop-word-${captionIndex}-${wordIndex}`;
          const wordStart = word.start; // Relative to caption
          const wordDuration = word.duration;
          
          // Create word component
          const wordComponent: RenderableComponentData = {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: finalFontWeight,
                color: color,
                marginRight: '0.3em',
                willChange: 'transform, filter',
              },
              font: {
                family: finalFontFamily,
                weights: [String(finalFontWeight)],
              },
            },
            context: {
              timing: {
                start: 0, // All words visible for entire caption duration
                duration: caption.duration,
              },
            },
            effects: [
              createPulsePopEffect(wordId, wordStart + (wordIndex * staggerDelay), wordDuration),
            ],
          };
          
          childrenData.push(wordComponent);
        });
      } else {
        // Sentence-level animation (all words together)
        const sentenceId = `pulse-pop-sentence-${captionIndex}`;
        const sentenceComponent: RenderableComponentData = {
          id: sentenceId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: caption.text,
            style: {
              fontSize: `${fontSize}px`,
              fontWeight: finalFontWeight,
              color: color,
              willChange: 'transform, filter',
            },
            font: {
              family: finalFontFamily,
              weights: [String(finalFontWeight)],
            },
          },
          context: {
            timing: {
              start: caption.absoluteStart,
              duration: caption.duration,
            },
          },
          effects: [
            createPulsePopEffect(sentenceId, 0, caption.duration),
          ],
        };
        
        childrenData.push(sentenceComponent);
      }
    });
  } else if (text) {
    // Mode 2: Simple text mode
    const textId = 'pulse-pop-text';
    const textDuration = duration || 3;
    
    const textComponent: RenderableComponentData = {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: text,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: finalFontWeight,
          color: color,
          willChange: 'transform, filter',
        },
        font: {
          family: finalFontFamily,
          weights: [String(finalFontWeight)],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: textDuration,
        },
      },
      effects: [
        createPulsePopEffect(textId, 0, textDuration),
      ],
    };
    
    childrenData.push(textComponent);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'pulse-pop-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'grid place-items-center min-h-screen',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions && captions.length > 0
          ? Math.max(...captions.map((c: TranscriptionSentence) => c.absoluteEnd))
          : (duration || 3),
      },
    },
    childrenData: childrenData,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'pulse-pop-kinetic-typography',
  title: 'Pulse-Pop Kinetic Typography',
  description: 'Minimalist Apple Keynote-inspired kinetic typography preset. Text materializes with a gentle pulsing scale effect - starting from 5% scale, rapidly expanding to 110%, then settling to 100% like a ripple. Includes synchronized brightness pulse for a "powered on" activation feel. Features multi-keyframe scale animation (0.05 → 1.1 → 1.0), brightness filter sync (100% → 150% → 100%), subtle rotation (-2deg → 0deg), and optional word-level stagger timing (0.08s). Perfect for title cards, chapter markers, and emphasis moments. Supports customizable intensity parameter to scale all effect values proportionally.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'text', 'pulse', 'pop', 'apple', 'keynote', 'title', 'animated', 'scale', 'brightness', 'glow', 'minimalist', 'activation'],
  dependencies: {},
  defaultInputParams: {
    text: 'Hello World',
    fontSize: 64,
    fontWeight: 'bold',
    fontFamily: 'Inter',
    color: '#FFFFFF',
    intensity: 1,
    wordStagger: false,
    staggerDelay: 0.08,
    duration: 3,
  },
};

// Export preset
export const pulsePopKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
