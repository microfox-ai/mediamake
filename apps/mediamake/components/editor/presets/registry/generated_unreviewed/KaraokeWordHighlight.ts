/**
 * Word-by-Word Karaoke Subtitles Preset
 *
 * This preset creates karaoke-style subtitles where each word is sequentially highlighted
 * using word-level timing data from transcription. The layout remains stable throughout
 * (no shifts or jumps), while individual words scale up, change color, and add glow effects
 * when they become active.
 *
 * Features:
 * - **Word-Level Highlighting**: Each word highlights precisely at its spoken time
 * - **Stable Layout**: All words remain visible; only styling changes (no position shifts)
 * - **Smooth Transitions**: Scale, color, and glow effects applied per word
 * - **Next Sentence Preview**: Shows upcoming sentence with reduced opacity
 * - **Customizable Styling**: Font, colors, sizes, effects, and positioning
 * - **Perfect Sync**: Uses word-level timing from transcription data
 *
 * Use Cases:
 * - Karaoke videos with sing-along subtitles
 * - Language learning content with word emphasis
 * - Music videos with lyric highlighting
 * - Educational content requiring word-by-word focus
 * - Podcast/interview clips with dynamic emphasis
 *
 * Technical Implementation:
 * - All words in a sentence use sentence-level context timing (stable layout)
 * - Word highlighting achieved via individual effects triggered at word.start
 * - Effects include scale, color transition, and glow (box-shadow)
 * - Two-line layout: current sentence (full opacity) + next sentence (preview, 50% opacity)
 * - Smooth cross-fade transitions between sentences
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// PARAMS SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

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
          }),
        ),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .describe('Array of caption objects with word-level timing'),

  // Typography
  fontSize: z.number().default(48).describe('Font size for current sentence in pixels'),
  nextSentenceFontSize: z.number().default(36).describe('Font size for next sentence preview in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family for all text'),
  fontWeight: z.string().default('bold').describe('Font weight for current sentence'),
  nextSentenceFontWeight: z.string().default('medium').describe('Font weight for next sentence'),

  // Colors
  defaultColor: z.string().default('#FFFFFF').describe('Default text color (unhighlighted)'),
  highlightColor: z.string().default('#FFD700').describe('Color when word is highlighted (gold)'),
  nextSentenceColor: z.string().default('#CCCCCC').describe('Color for next sentence preview'),

  // Positioning
  position: z
    .enum(['bottom', 'top', 'center'])
    .default('bottom')
    .describe('Vertical position of subtitles'),
  paddingBottom: z.number().default(64).describe('Padding from bottom in pixels (when position=bottom)'),
  paddingTop: z.number().default(64).describe('Padding from top in pixels (when position=top)'),
  horizontalPadding: z.number().default(32).describe('Horizontal padding in pixels'),
  maxWidth: z.string().default('80vw').describe('Maximum width of subtitle container'),

  // Effects
  highlightScale: z.number().default(1.15).describe('Scale multiplier when word is highlighted'),
  highlightDuration: z.number().default(0.2).describe('Duration of highlight transition in seconds'),
  glowIntensity: z.number().default(20).describe('Glow radius in pixels when highlighted'),
  glowColor: z.string().default('rgba(255,215,0,0.8)').describe('Glow color (box-shadow)'),
  
  // Layout
  wordGap: z.number().default(8).describe('Gap between words in pixels'),
  lineGap: z.number().default(16).describe('Gap between current and next sentence lines in pixels'),
  showNextSentence: z.boolean().default(true).describe('Whether to show next sentence preview'),
  nextSentenceOpacity: z.number().default(0.5).describe('Opacity of next sentence preview (0-1)'),

  // Timing
  sentenceFadeInDuration: z.number().default(0.3).describe('Duration of sentence fade-in in seconds'),
  sentenceFadeOutDuration: z.number().default(0.3).describe('Duration of sentence fade-out in seconds'),

  // Text styling
  textShadow: z
    .string()
    .default('0 2px 8px rgba(0,0,0,0.8)')
    .describe('Text shadow for readability'),
  nextSentenceTextShadow: z
    .string()
    .default('0 1px 4px rgba(0,0,0,0.6)')
    .describe('Text shadow for next sentence'),
});

// ─────────────────────────────────────────────────────────────────────────────
// PRESET EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize,
    nextSentenceFontSize,
    fontFamily,
    fontWeight,
    nextSentenceFontWeight,
    defaultColor,
    highlightColor,
    nextSentenceColor,
    position,
    paddingBottom,
    paddingTop,
    horizontalPadding,
    maxWidth,
    highlightScale,
    highlightDuration,
    glowIntensity,
    glowColor,
    wordGap,
    lineGap,
    showNextSentence,
    nextSentenceOpacity,
    sentenceFadeInDuration,
    sentenceFadeOutDuration,
    textShadow,
    nextSentenceTextShadow,
  } = params;

  if (!captions || captions.length === 0) {
    return {
      output: {
        childrenData: [],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  // Helper function to create word highlight effects
  const createWordHighlightEffect = (
    wordId: string,
    wordStart: number,
    wordDuration: number,
  ) => {
    const effectDuration = Math.min(highlightDuration, wordDuration);

    return {
      id: `${wordId}-highlight-effect`,
      componentId: wordId,
      data: {
        type: 'ease-in-out',
        start: wordStart,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Scale up at word start
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: highlightScale, prog: effectDuration / wordDuration },
          { key: 'scale', val: highlightScale, prog: 1 - (effectDuration / wordDuration) },
          { key: 'scale', val: 1, prog: 1 },

          // Color transition
          { key: 'color', val: defaultColor, prog: 0 },
          { key: 'color', val: highlightColor, prog: effectDuration / wordDuration },
          { key: 'color', val: highlightColor, prog: 1 - (effectDuration / wordDuration) },
          { key: 'color', val: defaultColor, prog: 1 },

          // Glow (box-shadow)
          { key: 'textShadow', val: textShadow, prog: 0 },
          {
            key: 'textShadow',
            val: `${textShadow}, 0 0 ${glowIntensity}px ${glowColor}`,
            prog: effectDuration / wordDuration,
          },
          {
            key: 'textShadow',
            val: `${textShadow}, 0 0 ${glowIntensity}px ${glowColor}`,
            prog: 1 - (effectDuration / wordDuration),
          },
          { key: 'textShadow', val: textShadow, prog: 1 },
        ],
      },
    };
  };

  // Helper function to create sentence fade effects
  const createSentenceFadeEffect = (
    sentenceId: string,
    captionDuration: number,
  ) => {
    const fadeIn = sentenceFadeInDuration;
    const fadeOut = sentenceFadeOutDuration;
    const fadeInProg = fadeIn / captionDuration;
    const fadeOutProg = 1 - (fadeOut / captionDuration);

    return {
      id: `${sentenceId}-fade-effect`,
      componentId: sentenceId,
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: captionDuration,
        mode: 'provider',
        targetIds: [sentenceId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: fadeInProg },
          { key: 'opacity', val: 1, prog: fadeOutProg },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Build sentence components
  const sentenceComponents: any[] = [];

  captions.forEach((caption, captionIndex) => {
    const { id, text, absoluteStart, duration, words } = caption;

    if (!words || words.length === 0) {
      return; // Skip captions without words
    }

    // Create word components for current sentence
    const wordComponents = words.map((word, wordIndex) => {
      const wordId = `karaoke-word-${id}-${wordIndex}`;
      
      // Word highlight effect (relative to caption start)
      const wordEffect = createWordHighlightEffect(
        wordId,
        word.start, // Relative to caption
        word.duration,
      );

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            fontFamily: fontFamily,
            fontWeight: fontWeight,
            color: defaultColor,
            textShadow: textShadow,
            display: 'inline-block',
            transition: 'all 0.2s ease-in-out',
          },
        },
        context: {
          timing: {
            start: 0, // All words start together (stable layout)
            duration: duration, // All words last for full sentence
          },
        },
        effects: [wordEffect],
      };
    });

    // Current sentence container
    const currentSentenceId = `karaoke-current-sentence-${id}`;
    const sentenceFadeEffect = createSentenceFadeEffect(currentSentenceId, duration);

    const currentSentenceContainer = {
      id: currentSentenceId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row flex-wrap justify-center items-center',
          style: {
            gap: `${wordGap}px`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [sentenceFadeEffect],
      childrenData: wordComponents,
    };

    // Next sentence preview (if available and enabled)
    let nextSentenceContainer = null;
    if (showNextSentence && captionIndex < captions.length - 1) {
      const nextCaption = captions[captionIndex + 1];
      const nextSentenceId = `karaoke-next-sentence-${id}`;

      const nextWordComponents = (nextCaption.words || []).map((word, wordIndex) => {
        return {
          id: `karaoke-next-word-${nextCaption.id}-${wordIndex}`,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: `${nextSentenceFontSize}px`,
              fontFamily: fontFamily,
              fontWeight: nextSentenceFontWeight,
              color: nextSentenceColor,
              textShadow: nextSentenceTextShadow,
              display: 'inline-block',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        };
      });

      nextSentenceContainer = {
        id: nextSentenceId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row flex-wrap justify-center items-center',
            style: {
              gap: `${wordGap}px`,
              opacity: nextSentenceOpacity,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [],
        childrenData: nextWordComponents,
      };
    }

    // Sentence group container (current + next)
    const sentenceGroupId = `karaoke-sentence-group-${id}`;
    const sentenceGroupChildren: any[] = [currentSentenceContainer];
    if (nextSentenceContainer) {
      sentenceGroupChildren.push(nextSentenceContainer);
    }

    const sentenceGroup = {
      id: sentenceGroupId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-col items-center justify-center',
          style: {
            gap: `${lineGap}px`,
            maxWidth: maxWidth,
          },
        },
      },
      context: {
        timing: {
          start: absoluteStart,
          duration: duration,
        },
      },
      childrenData: sentenceGroupChildren,
    };

    sentenceComponents.push(sentenceGroup);
  });

  // Determine positioning class
  let positionClass = 'items-end';
  let positionPadding = `pb-[${paddingBottom}px]`;

  if (position === 'top') {
    positionClass = 'items-start';
    positionPadding = `pt-[${paddingTop}px]`;
  } else if (position === 'center') {
    positionClass = 'items-center';
    positionPadding = '';
  }

  // Root container
  const rootContainer = {
    id: 'karaoke-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${positionClass} justify-center ${positionPadding}`,
        style: {
          paddingLeft: `${horizontalPadding}px`,
          paddingRight: `${horizontalPadding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions[captions.length - 1].absoluteEnd,
      },
    },
    childrenData: sentenceComponents,
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// METADATA
// ─────────────────────────────────────────────────────────────────────────────

const presetMetadata: PresetMetadata = {
  id: 'KaraokeWordHighlight',
  title: 'Word-by-Word Karaoke Subtitles',
  description:
    'Sequentially highlights each word using word-level timing while keeping layout stable. Perfect for karaoke-style subtitles with smooth word-by-word emphasis and consistent positioning.',
  type: 'predefined',
  presetType: 'children',
  tags: ['subtitles', 'karaoke', 'word-highlight', 'stable-layout', 'word-timing', 'lyrics', 'sing-along'],
  defaultInputParams: {
    captions: [],
    fontSize: 48,
    nextSentenceFontSize: 36,
    fontFamily: 'Inter',
    fontWeight: 'bold',
    nextSentenceFontWeight: 'medium',
    defaultColor: '#FFFFFF',
    highlightColor: '#FFD700',
    nextSentenceColor: '#CCCCCC',
    position: 'bottom',
    paddingBottom: 64,
    paddingTop: 64,
    horizontalPadding: 32,
    maxWidth: '80vw',
    highlightScale: 1.15,
    highlightDuration: 0.2,
    glowIntensity: 20,
    glowColor: 'rgba(255,215,0,0.8)',
    wordGap: 8,
    lineGap: 16,
    showNextSentence: true,
    nextSentenceOpacity: 0.5,
    sentenceFadeInDuration: 0.3,
    sentenceFadeOutDuration: 0.3,
    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
    nextSentenceTextShadow: '0 1px 4px rgba(0,0,0,0.6)',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

export const KaraokeWordHighlightPreset = {
  id: presetMetadata.id,
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
