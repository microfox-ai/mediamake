/**
 * Precision-Timed Kinetic Typography Preset
 *
 * This preset creates a precision-timed typography animation inspired by kinetic infographics
 * and data dashboards. Text appears through masking and revelation animations, with each word
 * unveiled by an invisible wipe moving at precisely calculated speeds for optimal readability.
 *
 * Features:
 * - **Precision-Timed Reveals**: Each word appears via translateX animation with timing
 *   calculated based on character count (40 chars/second base speed)
 * - **Hypnotic Rhythm**: Micro-pauses (50ms) between sentence groups create natural reading flow
 * - **Sentence Grouping**: Automatically detects sentence boundaries via punctuation to group
 *   related words together with appropriate pauses
 * - **Synchronized Highlighting**: Key terms (uppercase words, punctuation-ending words, or
 *   marked terms) briefly glow after appearing to reinforce importance
 * - **Impact-Adjusted Timing**: Uses metadata.impact to scale reveal speeds dynamically
 * - **Masking & Revelation**: Words slide in from left with overflow:hidden containers
 *
 * Technical Implementation:
 * - Root container positioned at caption.absoluteStart with full caption duration
 * - Each word wrapped in BaseLayout with overflow:hidden for masking effect
 * - Reveal effect: translateX animation from -100px to 0px with opacity fade
 * - Highlight effect: drop-shadow glow pulse (0 → 20px → 0) applied to key terms
 * - Timing: baseSpeed 40 chars/sec, adjusted by impact, with 50ms group pauses
 *
 * Use Cases:
 * - Data-driven storytelling videos
 * - Kinetic infographic animations
 * - Dashboard-style presentations
 * - Technical explainer videos
 * - News/media overlays with emphasis
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  trackId: z.string().default('precision-kinetic-typography').describe('Unique ID for this preset instance'),
  captions: z.array(z.any()).describe('Array of caption sentences with word-level timing (TranscriptionSentence[])'),
  baseSpeed: z.number().min(10).max(100).default(40).optional().describe('Base reveal speed in characters per second (default: 40)'),
  defaultImpact: z.number().min(0.1).max(3).default(1).optional().describe('Default impact multiplier for reveal speed when caption.metadata.impact is not set (higher = faster)'),
  groupPauseDuration: z.number().min(0).max(0.5).default(0.05).optional().describe('Pause duration in seconds added between sentence groups (default: 0.05s = 50ms)'),
  highlightKeyTerms: z.boolean().default(true).optional().describe('Enable synchronized highlighting for key terms (uppercase words, punctuation-ending words)'),
  highlightDelay: z.number().min(0).max(1).default(0.2).optional().describe('Delay in seconds before highlight effect starts after word reveal (default: 0.2s)'),
  highlightDuration: z.number().min(0.1).max(2).default(0.4).optional().describe('Duration of highlight glow pulse effect (default: 0.4s)'),
  font: z.string().optional().describe('Font family with optional weight and style (e.g., "SF Pro Display:500:normal", "Inter:700", "Roboto")'),
  fontSize: z.number().min(12).max(200).default(48).optional().describe('Font size in pixels (default: 48px)'),
  textColor: z.string().default('#ffffff').optional().describe('Text color (default: white)'),
  highlightColor: z.string().default('rgba(59, 130, 246, 0.5)').optional().describe('Color for highlight glow effect (default: blue)'),
  containerClassName: z.string().default('absolute inset-0 flex items-center justify-center').optional().describe('Tailwind classes for root container positioning'),
  wordGap: z.string().default('0.5rem').optional().describe('Gap between words (CSS value, e.g., "0.5rem", "8px")'),
  maxWidth: z.string().default('90%').optional().describe('Maximum width of text container (CSS value, e.g., "90%", "1200px")'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackId,
    captions,
    baseSpeed = 40,
    defaultImpact = 1,
    groupPauseDuration = 0.05,
    highlightKeyTerms = true,
    highlightDelay = 0.2,
    highlightDuration = 0.4,
    font = 'SF Pro Display:500:normal',
    fontSize = 48,
    textColor = '#ffffff',
    highlightColor = 'rgba(59, 130, 246, 0.5)',
    containerClassName = 'absolute inset-0 flex items-center justify-center',
    wordGap = '0.5rem',
    maxWidth = '90%',
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    let fontStyle: React.CSSProperties = {};
    
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

  // Helper: Detect if word ends with sentence-ending punctuation
  const isSentenceEnd = (wordText: string): boolean => {
    const punctuation = ['.', '!', '?', ';', ':'];
    return punctuation.some(p => wordText.trim().endsWith(p));
  };

  // Helper: Detect if word is a key term (uppercase, punctuation-ending, or marked in metadata)
  const isKeyTerm = (wordText: string, wordMetadata?: any): boolean => {
    if (wordMetadata?.isKeyTerm) return true;
    
    // Check if all letters are uppercase (exclude punctuation)
    const lettersOnly = wordText.replace(/[^a-zA-Z]/g, '');
    if (lettersOnly.length > 0 && lettersOnly === lettersOnly.toUpperCase()) return true;
    
    // Check if ends with punctuation
    if (isSentenceEnd(wordText)) return true;
    
    return false;
  };

  // Helper: Calculate reveal duration for a word
  const calculateRevealDuration = (
    wordText: string,
    impact: number,
    isLastInGroup: boolean,
  ): number => {
    const charCount = wordText.length;
    const baseDuration = Math.max(0.3, charCount / baseSpeed);
    const impactMultiplier = 1 + (impact - 1) * 0.5; // Scale impact effect
    const adjustedDuration = baseDuration * impactMultiplier;
    const groupPause = isLastInGroup ? groupPauseDuration : 0;
    
    return adjustedDuration + groupPause;
  };

  // Process each caption
  const captionContainers: RenderableComponentData[] = [];

  (captions as TranscriptionSentence[]).forEach((caption, captionIndex) => {
    if (!caption.words || caption.words.length === 0) return;

    const captionImpact = (caption.metadata?.impact as number) ?? defaultImpact;
    
    // Create word components with reveal and highlight effects
    const wordComponents: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = `${trackId}-caption-${captionIndex}-word-${wordIndex}`;
      const isLastWord = wordIndex === caption.words.length - 1;
      const isLastInSentenceGroup = isLastWord || isSentenceEnd(word.text);
      
      const revealDuration = calculateRevealDuration(
        word.text,
        captionImpact,
        isLastInSentenceGroup,
      );
      
      const shouldHighlight = highlightKeyTerms && isKeyTerm(word.text, word.metadata);

      // Create reveal effect (translateX + opacity)
      const revealEffect: any = {
        id: `${wordId}-reveal`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: word.start, // Relative to caption
          duration: revealDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateX', val: -100, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
          ],
        } as GenericEffectData,
      };

      // Create highlight effect if applicable
      const highlightEffect: any = shouldHighlight ? {
        id: `${wordId}-highlight`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: word.start + revealDuration + highlightDelay,
          duration: highlightDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'filter', val: 'drop-shadow(0 0 0px rgba(0, 0, 0, 0))', prog: 0 },
            { key: 'filter', val: `drop-shadow(0 0 20px ${highlightColor})`, prog: 0.5 },
            { key: 'filter', val: 'drop-shadow(0 0 0px rgba(0, 0, 0, 0))', prog: 1 },
          ],
        } as GenericEffectData,
      } : null;

      const effects = highlightEffect ? [revealEffect, highlightEffect] : [revealEffect];

      // Word wrapper with overflow:hidden for masking
      const wordWrapper: RenderableComponentData = {
        id: `${wordId}-wrapper`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block',
            style: {
              overflow: 'hidden',
            },
          },
        },
        context: {
          timing: {
            start: 0, // All words use caption duration
            duration: caption.duration,
          },
        },
        childrenData: [
          {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: fontStyle.fontWeight || 500,
                fontStyle: fontStyle.fontStyle || 'normal',
                color: textColor,
                lineHeight: '1.2',
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['500'],
                display: 'swap',
                preload: true,
              },
              fallbackFonts: ['system-ui', 'sans-serif'],
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects,
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;

      return wordWrapper;
    });

    // Caption container with flex layout
    const captionContainer: RenderableComponentData = {
      id: `${trackId}-caption-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative flex flex-wrap items-center justify-center',
          style: {
            gap: wordGap,
            maxWidth: maxWidth,
            textAlign: 'center',
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
    } as RenderableComponentData;

    captionContainers.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: containerClassName,
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? (captions as TranscriptionSentence[])[captions.length - 1].absoluteEnd 
          : 10,
      },
    },
    childrenData: captionContainers,
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
  id: 'precision-kinetic-typography',
  title: 'Precision-Timed Kinetic Typography',
  description: 'Precision-timed typography preset inspired by kinetic infographics and data dashboards. Text appears through translateX-based reveal animations with hypnotic timing rhythm, micro-pauses grouping related words, and synchronized highlighting for key terms. Includes sentence-based grouping with punctuation detection and configurable timing parameters.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'precision', 'dashboard', 'infographic', 'reveal', 'masking', 'highlighting', 'data-driven'],
  dependencies: {},
  defaultInputParams: {
    trackId: 'precision-kinetic-typography',
    captions: [],
    baseSpeed: 40,
    defaultImpact: 1,
    groupPauseDuration: 0.05,
    highlightKeyTerms: true,
    highlightDelay: 0.2,
    highlightDuration: 0.4,
    font: 'SF Pro Display:500:normal',
    fontSize: 48,
    textColor: '#ffffff',
    highlightColor: 'rgba(59, 130, 246, 0.5)',
    containerClassName: 'absolute inset-0 flex items-center justify-center',
    wordGap: '0.5rem',
    maxWidth: '90%',
  },
};

// Export preset
export const precisionKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};