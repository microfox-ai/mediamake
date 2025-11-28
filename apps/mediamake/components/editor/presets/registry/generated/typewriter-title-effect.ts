/**
 * Classic Typewriter Title Effect Preset
 *
 * Authentic mechanical typewriter effect with character-by-character reveal. Each letter
 * appears sequentially with vertical bounce animation mimicking typebar impact, accompanied
 * by subtle opacity fade-in and a brief text-shadow "ink impression" effect. Features a
 * blinking cursor that advances with each character, and a carriage return effect where
 * the entire text shifts left after completion.
 *
 * Features:
 * - Character-by-character sequential reveal with spring easing for mechanical authenticity
 * - Vertical bounce animation (4px translateY) on each character appearance
 * - Subtle text-shadow impact effect simulating ink impression
 * - Blinking cursor (vertical bar) that advances with each character
 * - Carriage return effect: entire text shifts left (-10px) after typing completes
 * - Configurable typing speed and color customization
 * - GPU-accelerated transforms and opacity for smooth performance
 *
 * Use cases:
 * - Vintage/retro title sequences
 * - Documentary or historical content introductions
 * - Creative storytelling with nostalgic aesthetics
 * - Social media content with classic typography effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// --- PARAMETER SCHEMA ---

const presetParams = z.object({
  text: z
    .string()
    .describe('The title text to display with typewriter effect'),
  typingSpeed: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.08)
    .describe(
      'Time delay between each character appearance in seconds (60-100ms = 0.06-0.1)',
    ),
  color: z
    .string()
    .default('#000000')
    .describe('Text color in CSS format (e.g., #000000 or rgb(0,0,0))'),
  fontSize: z
    .number()
    .default(48)
    .describe('Font size in pixels for the title text'),
  fontFamily: z
    .string()
    .default('Courier New')
    .describe('Font family for the typewriter text (monospace recommended)'),
});

// --- PRESET EXECUTION ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { text, typingSpeed, color, fontSize, fontFamily } = params;

  // Split text into individual characters
  const characters = text.split('');
  const characterCount = characters.length;

  // Calculate total duration
  const typingDuration = characterCount * typingSpeed;
  const carriageReturnDuration = 0.3;
  const totalDuration = typingDuration + carriageReturnDuration;

  // Create character components with effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `typewriter-char-${index}`;

      // Character reveal effect (opacity + translateY with spring easing)
      const revealEffect: GenericEffectData = {
        type: 'spring',
        start: index * typingSpeed, // Relative to text-container start
        duration: 0.15,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'translateY', val: 4, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      };

      // Text shadow impact effect (brief drop shadow on character impact)
      const shadowEffect: GenericEffectData = {
        type: 'ease-out',
        start: index * typingSpeed, // Relative to text-container start
        duration: 0.1,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          {
            key: 'filter',
            val: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.4))',
            prog: 0,
          },
          {
            key: 'filter',
            val: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))',
            prog: 1,
          },
        ],
      };

      // Character component
      return {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: 600,
            color: color,
            fontFamily: `${fontFamily}, monospace`,
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0, // All characters start together (relative to text-container)
            duration: totalDuration, // Persist until end of animation
          },
        },
        effects: [
          {
            id: `${charId}-reveal`,
            componentId: 'generic',
            data: revealEffect,
          },
          {
            id: `${charId}-shadow`,
            componentId: 'generic',
            data: shadowEffect,
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Text container with carriage return effect
  const carriageReturnEffect: GenericEffectData = {
    type: 'ease-out',
    start: typingDuration, // Start after typing completes (relative to text-container)
    duration: carriageReturnDuration,
    mode: 'provider',
    targetIds: ['typewriter-text-container'],
    ranges: [
      { key: 'translateX', val: -10, prog: 0 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  const textContainer: RenderableComponentData = {
    id: 'typewriter-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: characterComponents,
    effects: [
      {
        id: 'carriage-return-effect',
        componentId: 'generic',
        data: carriageReturnEffect,
      },
    ],
  } as RenderableComponentData;

  // Blinking cursor
  const cursorBlinkEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: 0.5, // 500ms blink cycle
    mode: 'provider',
    targetIds: ['typewriter-cursor'],
    ranges: [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0, prog: 0.25 },
      { key: 'opacity', val: 0, prog: 0.5 },
      { key: 'opacity', val: 1, prog: 0.75 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Calculate cursor position (advances with each character)
  // Using translateX to move cursor right as characters appear
  const cursorAdvanceRanges: Array<{ key: string; val: number; prog: number }> =
    [];
  const charWidth = fontSize * 0.6; // Approximate character width for monospace

  for (let i = 0; i <= characterCount; i++) {
    const progress = i / characterCount;
    const xPosition = i * charWidth;
    cursorAdvanceRanges.push({
      key: 'translateX',
      val: xPosition,
      prog: progress,
    });
  }

  const cursorAdvanceEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: typingDuration,
    mode: 'provider',
    targetIds: ['typewriter-cursor'],
    ranges: cursorAdvanceRanges,
  };

  const cursor: RenderableComponentData = {
    id: 'typewriter-cursor',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '2px',
          height: `${fontSize}px`,
          backgroundColor: color,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'cursor-blink',
        componentId: 'generic',
        data: cursorBlinkEffect,
      },
      {
        id: 'cursor-advance',
        componentId: 'generic',
        data: cursorAdvanceEffect,
      },
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textContainer, cursor],
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

// --- PRESET METADATA ---

const presetMetadata: PresetMetadata = {
  id: 'typewriter-title-effect',
  title: 'Classic Typewriter Title Effect',
  description:
    'Authentic mechanical typewriter effect with character-by-character reveal. Each letter appears sequentially with vertical bounce animation mimicking typebar impact, accompanied by subtle opacity fade-in. Features a blinking cursor that advances with each character and a carriage return effect where the entire text shifts left after completion. Uses spring easing for realistic mechanical feel with configurable typing speed and color customization.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'title',
    'typewriter',
    'text',
    'animation',
    'vintage',
    'retro',
    'classic',
    'mechanical',
    'character-reveal',
    'spring-easing',
    'cursor',
    'carriage-return',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'CLASSIC TYPEWRITER',
    typingSpeed: 0.08,
    color: '#000000',
    fontSize: 48,
    fontFamily: 'Courier New',
  },
};

// --- EXPORT ---

export const typewriterTitleEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
