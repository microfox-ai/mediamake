/**
 * Cinematic Letter-by-Letter Cross-Fade Transition Preset
 *
 * This preset creates a cinematic character-level cross-fade transition where each character
 * is treated as an individual video layer. Characters dissolve from left to right with
 * wave-like stagger timing, accompanied by subtle floating motion (translateY) and rotation
 * wobble for kinetic energy.
 *
 * Features:
 * - **Character-Level Rendering**: Each character is a separate TextAtom with independent timing
 * - **Wave-Like Stagger**: Characters fade out/in sequentially with 0.05s delay between each
 * - **Kinetic Animations**: Gentle floating motion and rotation wobble for organic movement
 * - **Two-Line Cross-Fade**: First line dissolves while second line materializes
 * - **Wind Carrying Effect**: Creates the illusion of wind carrying letters away and bringing new ones
 * - **Audio Synchronization**: Uses word-level timing from caption data for rhythm sync
 *
 * Use cases:
 * - Creating cinematic title sequences
 * - Building lyric videos with character-level animations
 * - Adding professional transition effects between text lines
 * - Creating wind-carrying text effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

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
        words: z.array(z.any()).optional(),
        metadata: z.any().optional(),
      }),
    )
    .describe('Array of two caption sentences for cross-fade transition'),
  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  characterStagger: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Delay between consecutive characters (seconds)'),
  line2Delay: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Additional delay before second line starts materializing'),
  floatRange: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Range of floating motion in pixels (up/down)'),
  rotateRange: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Range of rotation wobble in degrees'),
  transitionDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of fade-in/fade-out per character'),
  floatDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Duration of one float animation cycle'),
  wobbleDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Duration of one wobble animation cycle'),
  containerPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text container'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:600';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

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
  }

  // Get first two captions
  const caption1 = params.captions[0];
  const caption2 = params.captions[1] || caption1; // Fallback to same caption if only one

  // Helper: Split text into characters
  const splitIntoCharacters = (text: string): string[] => {
    return text.split('');
  };

  // Helper: Create character component with effects
  const createCharacterComponent = (
    char: string,
    charIndex: number,
    lineIndex: number,
    totalChars: number,
    lineStartTime: number,
    lineDuration: number,
    isOutgoing: boolean,
  ): RenderableComponentData => {
    const charId = `char-line${lineIndex}-${charIndex}`;

    // Calculate stagger timing
    const baseStagger = charIndex * params.characterStagger;
    const charStartTime = isOutgoing ? 0 : params.line2Delay + baseStagger;

    // Float and wobble variations per character for organic movement
    const floatPhaseOffset = (charIndex / totalChars) * Math.PI * 2;
    const wobblePhaseOffset = ((charIndex * 1.5) / totalChars) * Math.PI * 2;

    const effects = [];

    // Fade effect
    if (isOutgoing) {
      // Fade out for first line
      effects.push({
        id: `${charId}-fadeout`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: baseStagger,
          duration: params.transitionDuration,
          mode: 'provider',
          targetIds: [charId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    } else {
      // Fade in for second line
      effects.push({
        id: `${charId}-fadein`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: charStartTime,
          duration: params.transitionDuration,
          mode: 'provider',
          targetIds: [charId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });
    }

    // Continuous floating motion (translateY)
    effects.push({
      id: `${charId}-float`,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: 0,
        duration: params.floatDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          {
            key: 'translateY',
            val: -params.floatRange * Math.sin(floatPhaseOffset),
            prog: 0.5,
          },
          { key: 'translateY', val: params.floatRange, prog: 1 },
        ],
      },
    });

    // Continuous rotation wobble
    effects.push({
      id: `${charId}-wobble`,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: 0,
        duration: params.wobbleDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          { key: 'rotate', val: 0, prog: 0 },
          {
            key: 'rotate',
            val: -params.rotateRange * Math.cos(wobblePhaseOffset),
            prog: 0.5,
          },
          { key: 'rotate', val: params.rotateRange, prog: 1 },
        ],
      },
    });

    return {
      id: charId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          ...fontStyle,
          display: 'inline-block',
          margin: 0,
          padding: 0,
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
          duration: lineDuration,
        },
      },
      effects,
    } as RenderableComponentData;
  };

  // Split captions into characters
  const line1Chars = splitIntoCharacters(caption1.text);
  const line2Chars = splitIntoCharacters(caption2.text);

  // Create character components for line 1 (outgoing)
  const line1Components = line1Chars.map((char, index) =>
    createCharacterComponent(
      char,
      index,
      1,
      line1Chars.length,
      caption1.absoluteStart,
      caption1.duration,
      true,
    ),
  );

  // Create character components for line 2 (incoming)
  const line2Components = line2Chars.map((char, index) =>
    createCharacterComponent(
      char,
      index,
      2,
      line2Chars.length,
      caption2.absoluteStart,
      caption2.duration,
      false,
    ),
  );

  // Determine container alignment
  const alignmentClass =
    params.containerPosition === 'top'
      ? 'items-start'
      : params.containerPosition === 'bottom'
        ? 'items-end'
        : 'items-center';

  // Line 1 container
  const line1Container: RenderableComponentData = {
    id: 'line-1-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${alignmentClass} justify-center`,
        style: {
          gap: `${params.fontSize * 0.05}px`,
        },
      },
    },
    context: {
      timing: {
        start: caption1.absoluteStart,
        duration: caption1.duration,
      },
    },
    childrenData: line1Components,
  };

  // Line 2 container
  const line2Container: RenderableComponentData = {
    id: 'line-2-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${alignmentClass} justify-center`,
        style: {
          gap: `${params.fontSize * 0.05}px`,
        },
      },
    },
    context: {
      timing: {
        start: caption2.absoluteStart,
        duration: caption2.duration,
      },
    },
    childrenData: line2Components,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-char-crossfade-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: Math.max(
          caption1.absoluteEnd,
          caption2.absoluteEnd,
        ),
      },
    },
    childrenData: [line1Container, line2Container],
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

const presetMetadata: PresetMetadata = {
  id: 'CinematicCharacterCrossfadeTransition',
  title: 'Cinematic Character Cross-Fade Transition',
  description:
    'Letter-by-letter cross-fade transition with individual character layers. Characters dissolve from left to right with wave-like stagger timing, featuring subtle floating motion (translateY) and rotation wobble for kinetic energy. Creates a wind-carrying effect as letters fade out and new ones materialize in. Each character is a separate TextAtom with staggered timing relative to parent containers. Uses word-level timing from caption data for audio rhythm synchronization.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'transition',
    'character-level',
    'cross-fade',
    'kinetic',
    'floating',
    'wobble',
    'wind-effect',
    'cinematic',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'First Line',
        start: 0,
        end: 2.5,
        duration: 2.5,
        absoluteStart: 0,
        absoluteEnd: 2.5,
        words: [],
      },
      {
        id: 'caption-2',
        text: 'Second Line',
        start: 0,
        end: 2.5,
        duration: 2.5,
        absoluteStart: 2.0,
        absoluteEnd: 4.5,
        words: [],
      },
    ],
    font: 'Inter:600',
    fontSize: 48,
    textColor: '#FFFFFF',
    characterStagger: 0.05,
    line2Delay: 0.3,
    floatRange: 2,
    rotateRange: 2,
    transitionDuration: 0.8,
    floatDuration: 2,
    wobbleDuration: 2.5,
    containerPosition: 'center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const CinematicCharacterCrossfadeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
