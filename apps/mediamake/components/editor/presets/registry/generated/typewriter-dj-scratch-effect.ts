/**
 * Typewriter DJ Scratch Effect Preset
 *
 * This preset creates a dynamic typewriter effect with a vinyl record scratch aesthetic.
 * Each character slides in from the side with a brief reverse motion (like a record being
 * scratched back), then snaps forward into place with subtle distortion and skew during
 * the scratch motion.
 *
 * Features:
 * - **Character-by-Character Reveal**: Text appears one character at a time on beats
 * - **Vinyl Scratch Aesthetic**: Reverse motion with skew and blur during scratch
 * - **Beat-Synchronized Typing**: Typing speed matches musical tempo
 * - **Rhythm-Synced Cursor**: Blinking cursor that pulses with the music
 * - **RGB Noise Effect**: Subtle analog chromatic aberration during scratch
 * - **Monospace Typography**: Terminal/coding aesthetic with green-on-black theme
 *
 * Use cases:
 * - Creating retro terminal/hacker-style text animations
 * - Beat-synced lyric displays with analog vinyl aesthetic
 * - Dynamic coding/tech presentations synchronized to music
 * - Glitch-style text reveals for music videos
 * - Creative caption displays with rhythmic timing
 */

import { RenderableComponentData } from '@microfox/datamotion';
import {
  BaseEffect,
  GenericEffectData,
  TextAtomData,
} from '@microfox/remotion';
import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';

// ============================================================================
// PRESET PARAMETERS
// ============================================================================

const presetParams = z.object({
  captions: z
    .array(z.any())
    .describe(
      'Array of caption objects with word-level timing data for character reveal',
    ),
  beatTiming: z
    .array(z.number())
    .optional()
    .describe(
      'Optional array of beat timestamps (seconds) for precise character timing. If not provided, uses word timing from captions.',
    ),
  scratchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .optional()
    .describe(
      'Intensity multiplier for scratch motion and distortion effects (0.1-3, default: 1)',
    ),
  typingSpeed: z
    .enum(['slow', 'medium', 'fast', 'auto'])
    .default('auto')
    .optional()
    .describe(
      'Typing speed: slow (melodious), medium (balanced), fast (rapid-fire), auto (matches tempo)',
    ),
  cursorBlinkSpeed: z
    .number()
    .min(0.05)
    .max(1)
    .default(0.125)
    .optional()
    .describe(
      'Cursor blink interval in seconds (8th note subdivision at default tempo)',
    ),
  showCursor: z
    .boolean()
    .default(true)
    .optional()
    .describe('Whether to show the blinking cursor'),
  rgbNoiseIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe(
      'Intensity of RGB chromatic aberration during scratch (0-1, default: 0.3)',
    ),
  font: z
    .string()
    .default('Courier New')
    .optional()
    .describe(
      'Monospace font family for terminal aesthetic (e.g., "Courier New", "Roboto Mono:400", "JetBrains Mono:700")',
    ),
  textColor: z
    .string()
    .default('#4ade80')
    .optional()
    .describe('Text color (default: green-400 for terminal aesthetic)'),
  backgroundColor: z
    .string()
    .default('#111827')
    .optional()
    .describe('Background color (default: gray-900 for terminal aesthetic)'),
  fontSize: z
    .number()
    .min(12)
    .max(120)
    .default(48)
    .optional()
    .describe('Font size in pixels (default: 48)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Courier New';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as 'normal' | 'italic';
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Calculate character appearance times
  const calculateCharacterTiming = (
    captions: TranscriptionSentence[],
    beatTiming?: number[],
  ): Array<{ char: string; time: number; captionId: string }> => {
    const characters: Array<{
      char: string;
      time: number;
      captionId: string;
    }> = [];

    if (beatTiming && beatTiming.length > 0) {
      // Use beat timing: distribute characters across beats
      const allText = captions.map(c => c.text).join(' ');
      const charCount = allText.length;
      const beatInterval = beatTiming.length / charCount;

      for (let i = 0; i < charCount; i++) {
        const beatIndex = Math.min(
          Math.floor(i * beatInterval),
          beatTiming.length - 1,
        );
        characters.push({
          char: allText[i],
          time: beatTiming[beatIndex],
          captionId: `beat-${beatIndex}`,
        });
      }
    } else {
      // Use word timing: distribute characters within word durations
      captions.forEach((caption, captionIndex) => {
        caption.words.forEach((word, wordIndex) => {
          const wordChars = word.text.split('');
          const charDuration = word.duration / wordChars.length;

          wordChars.forEach((char, charIndex) => {
            characters.push({
              char,
              time: word.absoluteStart + charIndex * charDuration,
              captionId: `caption-${captionIndex}-word-${wordIndex}`,
            });
          });

          // Add space after word (except last word)
          if (wordIndex < caption.words.length - 1) {
            characters.push({
              char: ' ',
              time: word.absoluteEnd,
              captionId: `caption-${captionIndex}-word-${wordIndex}`,
            });
          }
        });

        // Add space between captions
        if (captionIndex < captions.length - 1) {
          const lastWord = caption.words[caption.words.length - 1];
          characters.push({
            char: ' ',
            time: lastWord.absoluteEnd,
            captionId: `caption-${captionIndex}`,
          });
        }
      });
    }

    return characters;
  };

  // Helper: Create scratch effect for character
  const createScratchEffect = (
    characterId: string,
    startTime: number,
    intensity: number,
    rgbIntensity: number,
  ): BaseEffect => {
    const scratchDuration = 0.2 * intensity;
    const reversePoint = 0.4; // Scratch back at 40% progress

    const effectData: GenericEffectData = {
      type: 'cubic-bezier(0.11, 0, 0.5, 0)',
      start: startTime,
      duration: scratchDuration,
      mode: 'provider',
      targetIds: [characterId],
      ranges: [
        // Horizontal movement: reverse scratch
        { key: 'translateX', val: -20 * intensity, prog: 0 },
        { key: 'translateX', val: 10 * intensity, prog: reversePoint },
        { key: 'translateX', val: 0, prog: 1 },
        // Skew distortion
        { key: 'skewX', val: 0, prog: 0 },
        { key: 'skewX', val: -15 * intensity, prog: reversePoint },
        { key: 'skewX', val: 0, prog: 1 },
        // Opacity fade-in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 1 },
        // Blur during motion
        { key: 'blur', val: 0, prog: 0 },
        { key: 'blur', val: 1 * intensity, prog: reversePoint },
        { key: 'blur', val: 0, prog: 1 },
      ],
    };

    // Add RGB noise effect via filter if intensity > 0
    if (rgbIntensity > 0) {
      const rgbOffset = 2 * rgbIntensity;
      effectData.ranges?.push(
        {
          key: 'filter',
          val: `blur(0px) drop-shadow(${rgbOffset}px 0px 0px rgba(255,0,0,0.3)) drop-shadow(-${rgbOffset}px 0px 0px rgba(0,255,255,0.3))`,
          prog: 0,
        },
        {
          key: 'filter',
          val: `blur(1px) drop-shadow(${rgbOffset}px 0px 0px rgba(255,0,0,0.6)) drop-shadow(-${rgbOffset}px 0px 0px rgba(0,255,255,0.6))`,
          prog: reversePoint,
        },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      );
    }

    return {
      id: `scratch-effect-${characterId}`,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Helper: Create cursor blink effect
  const createCursorBlinkEffect = (
    cursorId: string,
    blinkSpeed: number,
  ): BaseEffect => {
    const effectData: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: blinkSpeed,
      mode: 'provider',
      targetIds: [cursorId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    return {
      id: `cursor-blink-${cursorId}`,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Calculate character timing
  const characters = calculateCharacterTiming(
    params.captions as TranscriptionSentence[],
    params.beatTiming,
  );

  // Calculate total duration
  const totalDuration =
    characters.length > 0
      ? Math.max(...characters.map(c => c.time)) + 2
      : 10;

  // Determine scratch intensity
  const scratchIntensity = params.scratchIntensity ?? 1;
  const rgbIntensity = params.rgbNoiseIntensity ?? 0.3;

  // Create character atoms with scratch effects
  const characterNodes: RenderableComponentData[] = characters.map(
    (charData, index) => {
      const characterId = `char-${index}`;

      // Create scratch effect
      const scratchEffect = createScratchEffect(
        characterId,
        0, // Effect starts relative to character appearance
        scratchIntensity,
        rgbIntensity,
      );

      return {
        id: characterId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: charData.char,
          className: 'inline-block',
          style: {
            fontSize: params.fontSize ?? 48,
            color: params.textColor ?? '#4ade80',
            fontFamily: fontFamily,
            ...fontStyle,
            whiteSpace: 'pre',
            opacity: 0,
            transform: 'translateX(-20px)',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: charData.time,
            duration: totalDuration - charData.time,
          },
        },
        effects: [scratchEffect],
      } as RenderableComponentData;
    },
  );

  // Create cursor
  const cursorId = 'typewriter-cursor';
  const cursorNode: RenderableComponentData = {
    id: cursorId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: '|',
      className: 'inline-block',
      style: {
        fontSize: params.fontSize ?? 48,
        color: params.textColor ?? '#4ade80',
        fontFamily: fontFamily,
        ...fontStyle,
        marginLeft: '2px',
        opacity: 1,
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: params.showCursor
      ? [createCursorBlinkEffect(cursorId, params.cursorBlinkSpeed ?? 0.125)]
      : [],
  } as RenderableComponentData;

  // Create text line container
  const textLineContainer: RenderableComponentData = {
    id: 'text-line-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row flex-wrap items-baseline',
        style: {
          gap: '0px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [...characterNodes, cursorNode],
  } as RenderableComponentData;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-dj-scratch-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'font-mono p-8 flex items-center justify-start',
        style: {
          backgroundColor: params.backgroundColor ?? '#111827',
          color: params.textColor ?? '#4ade80',
          whiteSpace: 'pre',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textLineContainer],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'typewriter-dj-scratch-effect',
  title: 'Typewriter DJ Scratch Effect',
  description:
    'Beat-synced typewriter effect with vinyl record scratch aesthetics. Characters slide in with reverse scratch motion, skew distortion, and subtle blur during motion. Includes a rhythm-synced blinking cursor. Uses caption word-level timing for beat synchronization.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'typewriter',
    'scratch',
    'vinyl',
    'dj',
    'beat-sync',
    'captions',
    'glitch',
    'retro',
    'terminal',
    'monospace',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    scratchIntensity: 1,
    typingSpeed: 'auto',
    cursorBlinkSpeed: 0.125,
    showCursor: true,
    rgbNoiseIntensity: 0.3,
    font: 'Courier New',
    textColor: '#4ade80',
    backgroundColor: '#111827',
    fontSize: 48,
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const typewriterDjScratchEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
