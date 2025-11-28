/**
 * Typewriter Subtitles Preset
 *
 * This preset creates typewriter-style subtitles that reveal text character by character,
 * accompanied by a blinking cursor effect. Each caption triggers a new typewriter sequence
 * with characters appearing progressively at precise timings.
 *
 * Features:
 * - **Character-by-character reveal**: Text appears one character at a time like a typewriter
 * - **Blinking cursor**: Subtle cursor blink effect at the end of the text
 * - **Configurable speed**: Adjust typing speed via characters per second parameter
 * - **Caption synchronization**: Each caption starts a fresh typewriter sequence
 * - **Smooth timing**: Character reveal timing is precisely calculated based on caption duration
 * - **Customizable styling**: Font family, size, colors, and background styling
 *
 * Use Cases:
 * - Classic typewriter text reveals for storytelling
 * - Retro or vintage-styled subtitle animations
 * - Technical/programming content with terminal-like reveals
 * - Any content requiring character-by-character text emphasis
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  // Caption data
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
        words: z
          .array(
            z.object({
              text: z.string(),
              start: z.number(),
              end: z.number(),
              duration: z.number(),
              absoluteStart: z.number(),
              absoluteEnd: z.number(),
            }),
          )
          .optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .describe('Array of caption objects with timing and text data'),

  // Typography
  fontFamily: z
    .string()
    .default('Courier New')
    .describe('Font family for typewriter text (monospace recommended)'),
  fontSize: z.number().default(48).describe('Font size in pixels'),
  fontWeight: z
    .string()
    .default('normal')
    .describe('Font weight (normal, bold, etc.)'),
  textColor: z.string().default('#ffffff').describe('Text color'),

  // Typewriter effect
  charactersPerSecond: z
    .number()
    .default(20)
    .describe('Typing speed in characters per second'),

  // Cursor effect
  cursorColor: z.string().default('#ffffff').describe('Cursor color'),
  cursorWidth: z.number().default(3).describe('Cursor width in pixels'),
  cursorHeight: z.number().default(32).describe('Cursor height in pixels'),
  cursorBlinkInterval: z
    .number()
    .default(0.5)
    .describe('Cursor blink interval in seconds'),

  // Container styling
  containerPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('bottom')
    .describe('Vertical position of subtitle container'),
  containerPadding: z
    .number()
    .default(16)
    .describe('Container padding in pixels'),
  backgroundColor: z
    .string()
    .default('rgba(0, 0, 0, 0.7)')
    .describe('Background color of subtitle container'),
  backdropBlur: z
    .boolean()
    .default(true)
    .describe('Enable backdrop blur effect'),
  borderRadius: z
    .number()
    .default(8)
    .describe('Border radius of container in pixels'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontFamily,
    fontSize,
    fontWeight,
    textColor,
    charactersPerSecond,
    cursorColor,
    cursorWidth,
    cursorHeight,
    cursorBlinkInterval,
    containerPosition,
    containerPadding,
    backgroundColor,
    backdropBlur,
    borderRadius,
  } = params;

  // Helper: Calculate timing for character reveals
  const calculateCharacterTimings = (
    text: string,
    captionDuration: number,
  ): { char: string; revealTime: number }[] => {
    const chars = text.split('');
    const totalChars = chars.length;
    const timePerChar = 1 / charactersPerSecond;

    return chars.map((char, index) => ({
      char,
      revealTime: Math.min(index * timePerChar, captionDuration),
    }));
  };

  // Determine container position className
  const positionClass =
    containerPosition === 'top'
      ? 'items-start pt-16'
      : containerPosition === 'center'
        ? 'items-center'
        : 'items-end pb-16';

  // Calculate total duration (last caption's absolute end)
  const totalDuration =
    captions.length > 0
      ? Math.max(...captions.map((c) => c.absoluteEnd))
      : 10;

  // Build caption layouts
  const captionLayouts = captions.map((caption, captionIndex) => {
    const captionId = `typewriter-caption-${captionIndex}`;
    const charTimings = calculateCharacterTimings(
      caption.text,
      caption.duration,
    );

    // Create character components with reveal effects
    const characterComponents = charTimings.map((timing, charIndex) => {
      const charId = `${captionId}-char-${charIndex}`;

      // Effect: fade-in opacity for each character at its reveal time
      const revealEffect = {
        id: `${charId}-reveal-effect`,
        componentId: charId,
        data: {
          type: 'ease-out',
          start: timing.revealTime,
          duration: 0.1, // Fast reveal
          mode: 'provider',
          targetIds: [charId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      };

      return {
        id: charId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: timing.char,
          style: {
            fontFamily,
            fontSize: `${fontSize}px`,
            fontWeight,
            color: textColor,
            display: 'inline-block',
            whiteSpace: 'pre',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [revealEffect],
      };
    });

    // Cursor for this caption
    const cursorId = `${captionId}-cursor`;

    // Cursor blink effect (oscillates opacity)
    const blinkCycles = Math.ceil(caption.duration / (cursorBlinkInterval * 2));
    const cursorBlinkRanges: { key: string; val: number; prog: number }[] = [];

    for (let i = 0; i <= blinkCycles; i++) {
      const progOn = (i * 2 * cursorBlinkInterval) / caption.duration;
      const progOff = ((i * 2 + 1) * cursorBlinkInterval) / caption.duration;

      if (progOn <= 1) {
        cursorBlinkRanges.push({ key: 'opacity', val: 1, prog: progOn });
      }
      if (progOff <= 1) {
        cursorBlinkRanges.push({ key: 'opacity', val: 0, prog: progOff });
      }
    }

    // Ensure cursor ends visible
    if (
      cursorBlinkRanges.length === 0 ||
      cursorBlinkRanges[cursorBlinkRanges.length - 1].prog < 1
    ) {
      cursorBlinkRanges.push({ key: 'opacity', val: 1, prog: 1 });
    }

    const cursorBlinkEffect = {
      id: `${cursorId}-blink-effect`,
      componentId: cursorId,
      data: {
        type: 'linear',
        start: 0,
        duration: caption.duration,
        mode: 'provider',
        targetIds: [cursorId],
        ranges: cursorBlinkRanges,
      },
    };

    const cursorComponent = {
      id: cursorId,
      type: 'atom' as const,
      componentId: 'ShapeAtom',
      data: {
        shapeType: 'rectangle',
        width: cursorWidth,
        height: cursorHeight,
        fill: cursorColor,
        className: 'ml-1',
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      effects: [cursorBlinkEffect],
    };

    // Text container (horizontal layout for characters + cursor)
    const textContainerId = `${captionId}-text-container`;
    const textContainer = {
      id: textContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row items-center justify-center',
          style: {
            padding: `${containerPadding}px`,
            backgroundColor,
            borderRadius: `${borderRadius}px`,
            backdropFilter: backdropBlur ? 'blur(8px)' : undefined,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      childrenData: [...characterComponents, cursorComponent],
    };

    // Caption layout wrapper
    return {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex ${positionClass} justify-center`,
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [textContainer],
    };
  });

  // Root container
  const rootContainer = {
    id: 'typewriter-subtitles-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: captionLayouts,
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'typewriter-subtitles',
  title: 'Typewriter Subtitles',
  description:
    'Simulates typewriter text reveal per caption with subtle cursor blink effect. Characters appear one by one with precise timing, accompanied by a blinking cursor that mimics classic typewriter behavior.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'typewriter',
    'character-reveal',
    'cursor',
    'animation',
    'text',
    'retro',
  ],
  defaultInputParams: {
    captions: [],
    fontFamily: 'Courier New',
    fontSize: 48,
    fontWeight: 'normal',
    textColor: '#ffffff',
    charactersPerSecond: 20,
    cursorColor: '#ffffff',
    cursorWidth: 3,
    cursorHeight: 32,
    cursorBlinkInterval: 0.5,
    containerPosition: 'bottom',
    containerPadding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropBlur: true,
    borderRadius: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const typewriterSubtitlesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
