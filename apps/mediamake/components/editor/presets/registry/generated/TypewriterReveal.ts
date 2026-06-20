/**
 * TypewriterReveal Internal Effect Preset
 *
 * This preset generates typewriter-style text reveal animations for text elements.
 * It simulates a typewriter effect by revealing text character-by-character, word-by-word,
 * or line-by-line with configurable timing, optional cursor blink animation, glitch effects,
 * and natural typing rhythm variations.
 *
 * Features:
 * - Character/word/line-based reveal units
 * - Natural typing rhythm with random variation
 * - Optional blinking cursor animation
 * - Glitch mode with random opacity flickers and position jitters
 * - Sound sync support (placeholder for future audio integration)
 * - Configurable typing speed and timing
 *
 * Usage:
 * This is an INTERNAL effect preset that returns an array of generic effects.
 * Call it from other presets to apply typewriter animations to text components.
 *
 * Example:
 * ```typescript
 * const effectResult = await presets.TypewriterReveal({
 *   targetId: 'text-component',
 *   text: 'Hello World',
 *   typeSpeed: 50,
 *   unit: 'character',
 *   cursorBlink: true,
 *   glitchMode: false,
 *   naturalVariation: 0.3,
 * }, props);
 *
 * const effects = effectResult?.output?._extractedEffects || [];
 * ```
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the text component to apply typewriter effect to'),
  text: z.string().describe('Text content to analyze and split into units'),
  typeSpeed: z
    .number()
    .min(10)
    .max(500)
    .default(50)
    .optional()
    .describe('Base typing speed in milliseconds per character/word/line'),
  unit: z
    .enum(['character', 'word', 'line'])
    .default('character')
    .optional()
    .describe('Unit of text to reveal sequentially'),
  cursorBlink: z
    .boolean()
    .default(true)
    .optional()
    .describe('Show animated blinking cursor during typing'),
  soundSync: z
    .boolean()
    .default(false)
    .optional()
    .describe(
      'Sync animation timing with typewriter sound effect (placeholder for future audio integration)',
    ),
  glitchMode: z
    .boolean()
    .default(false)
    .optional()
    .describe(
      'Add random opacity flickers and position jitters for retro terminal effect',
    ),
  naturalVariation: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe(
      'Variation in typing speed for human-like rhythm (0 = constant, 1 = high variation)',
    ),
  startDelay: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Delay before typing begins in seconds'),
  endHold: z
    .number()
    .min(0)
    .default(1)
    .optional()
    .describe('Duration to hold complete text after typing finishes in seconds'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    targetId,
    text,
    typeSpeed = 50,
    unit = 'character',
    cursorBlink = true,
    glitchMode = false,
    naturalVariation = 0.3,
    startDelay = 0,
    endHold = 1,
    effectIdPrefix = 'typewriter',
  } = params;

  // Helper: Split text into units
  const splitTextIntoUnits = (
    inputText: string,
    unitType: 'character' | 'word' | 'line',
  ): string[] => {
    if (unitType === 'character') {
      // Split by character, preserving spaces
      return inputText.split('');
    } else if (unitType === 'word') {
      // Split by whitespace
      return inputText.split(/\s+/).filter(word => word.length > 0);
    } else {
      // Split by newline
      return inputText.split('\n').filter(line => line.length > 0);
    }
  };

  // Helper: Calculate timing with variation
  const calculateTiming = (
    index: number,
    baseSpeed: number,
    variation: number,
  ): number => {
    // Random variation factor (0 to 1)
    const randomFactor = Math.random() * variation;
    // Calculate delay: index * baseSpeed * (1 + randomFactor)
    const delay = index * baseSpeed * (1 + randomFactor);
    return delay;
  };

  // Helper: Create reveal effect for a single unit
  const createRevealEffect = (
    unitIndex: number,
    startTime: number,
    speed: number,
    includeGlitch: boolean,
  ): GenericEffectData => {
    const ranges: Array<{
      key: string;
      val: number | string;
      prog: number;
    }> = [];

    // Base opacity animation (0 → 1)
    ranges.push({ key: 'opacity', val: 0, prog: 0 });
    ranges.push({ key: 'opacity', val: 1, prog: 0.1 }); // Fast reveal
    ranges.push({ key: 'opacity', val: 1, prog: 1 }); // Hold

    // Add glitch effects if enabled
    if (includeGlitch) {
      // Random opacity flicker
      const flickerProg = 0.05 + Math.random() * 0.1;
      const flickerOpacity = 0.7 + Math.random() * 0.3;
      ranges.push({ key: 'opacity', val: flickerOpacity, prog: flickerProg });

      // Random vertical jitter
      const jitterProg = Math.random() * 0.15;
      const jitterY = -2 + Math.random() * 4; // -2 to 2
      ranges.push({ key: 'translateY', val: jitterY, prog: jitterProg });
      ranges.push({ key: 'translateY', val: 0, prog: jitterProg + 0.05 });

      // Random horizontal jitter
      const jitterX = -1 + Math.random() * 2; // -1 to 1
      ranges.push({ key: 'translateX', val: jitterX, prog: jitterProg });
      ranges.push({ key: 'translateX', val: 0, prog: jitterProg + 0.05 });
    }

    return {
      type: 'linear',
      start: startTime / 1000, // Convert ms to seconds
      duration: speed / 1000, // Convert ms to seconds
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Helper: Create cursor blink effect
  const createCursorEffect = (
    totalDuration: number,
  ): GenericEffectData | null => {
    if (!cursorBlink) return null;

    // Cursor blinks throughout typing duration
    const blinkSpeed = 0.5; // Blink every 0.5 seconds

    return {
      type: 'linear',
      start: startDelay,
      duration: totalDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
  };

  // Split text into units
  const textUnits = splitTextIntoUnits(text, unit);

  if (textUnits.length === 0) {
    // No text to reveal, return empty effects
    return {
      output: {
        childrenData: [
          {
            id: `${effectIdPrefix}-container`,
            type: 'layout',
            componentId: 'BaseLayout',
            effects: [],
            childrenData: [],
            context: {
              timing: {
                start: 0,
                duration: 1,
              },
            },
          },
        ],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  // Generate reveal effects for each unit
  const effects: Array<{
    id: string;
    componentId: string;
    data: GenericEffectData;
  }> = [];

  let currentTime = startDelay * 1000; // Convert to milliseconds

  textUnits.forEach((textUnit, index) => {
    // Calculate start time with variation
    const timing = calculateTiming(index, typeSpeed, naturalVariation);
    const effectStartTime = currentTime + timing;

    // Create reveal effect
    const revealEffect = createRevealEffect(
      index,
      effectStartTime,
      typeSpeed,
      glitchMode,
    );

    effects.push({
      id: `${effectIdPrefix}-reveal-${index}`,
      componentId: 'generic',
      data: revealEffect,
    });

    // Update current time for next unit
    currentTime = effectStartTime + typeSpeed;
  });

  // Calculate total duration
  const lastEffectEnd = currentTime / 1000; // Convert to seconds
  const totalDuration = lastEffectEnd + endHold;

  // Add cursor blink effect if enabled
  if (cursorBlink) {
    const cursorEffect = createCursorEffect(totalDuration - startDelay);
    if (cursorEffect) {
      effects.push({
        id: `${effectIdPrefix}-cursor`,
        componentId: 'generic',
        data: cursorEffect,
      });
    }
  }

  // Return effects in container structure
  return {
    output: {
      childrenData: [
        {
          id: `${effectIdPrefix}-effect-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        },
      ],
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
  id: 'TypewriterReveal',
  title: 'Typewriter Reveal Effect',
  description:
    'Internal effect preset that simulates typewriter-style text reveal with character-by-character, word-by-word, or line-by-line animations. Features include configurable typing speed, optional cursor blink animation, glitch mode for retro terminal effects, natural typing rhythm variation, and optional sound synchronization. Returns effect definitions that target existing text components.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'typewriter',
    'text',
    'reveal',
    'animation',
    'internal',
    'generic',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'text-component',
    text: 'Hello World',
    typeSpeed: 50,
    unit: 'character',
    cursorBlink: true,
    soundSync: false,
    glitchMode: false,
    naturalVariation: 0.3,
    startDelay: 0,
    endHold: 1,
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const TypewriterRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
