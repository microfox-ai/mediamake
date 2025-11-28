/**
 * Elastic Draw Typokinetics Preset
 *
 * Hand-drawn animation style where each letter appears to be drawn on screen with elastic overshoot
 * and follow-through motion. Features scale, rotation, blur, and clip-path animations that create
 * a playful, organic feel similar to rotoscoping text frame by frame.
 *
 * Features:
 * - **Elastic Draw Effect**: Each letter scales from center with elastic overshoot (0.3 → 1.1 → 1.0)
 * - **Follow-Through Motion**: Rotation animation (15deg → -5deg → 0deg) for natural feel
 * - **Depth Effect**: Motion blur during scaling (4px → 0px) for depth perception
 * - **Staggered Reveal**: 0.08s delay per character for cascading wave effect
 * - **Clip-Path Animation**: Polygon reveal from center point expanding outward
 * - **Spring Easing**: Natural spring physics for settle animation
 *
 * Use cases:
 * - Creating playful, hand-drawn text animations
 * - Building organic kinetic typography effects
 * - Adding personality to title cards and overlays
 * - Creating frame-by-frame style text reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .default('HELLO')
    .describe('Text to display with elastic draw animation'),
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(72)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto", "BebasNeue")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),
  characterDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.08)
    .describe('Delay between each character animation in seconds'),
  animationDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.6)
    .describe('Duration of each character animation in seconds'),
  startTime: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the animation'),
  totalDuration: z
    .number()
    .min(1)
    .default(5)
    .describe('Total duration to keep text on screen'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    characterDelay,
    animationDuration,
    startTime,
    totalDuration,
  } = params;

  // Split text into characters
  const characters = text.split('');

  // Calculate total animation time for all characters
  const lastCharacterStart = (characters.length - 1) * characterDelay;
  const totalAnimationTime = lastCharacterStart + animationDuration;

  // Create character components with elastic draw effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `char-${index}`;
      const charStart = index * characterDelay;
      const charDuration = animationDuration + 0.08; // Buffer for spring settle

      // Elastic draw effect with scale, rotation, blur, and clip-path
      const elasticDrawEffect = {
        id: `elastic-draw-${charId}`,
        componentId: 'generic',
        data: {
          type: 'spring' as const,
          start: 0, // Relative to character start
          duration: animationDuration,
          mode: 'provider' as const,
          targetIds: [charId],
          ranges: [
            // Scale animation: 0.3 → 1.1 → 1.0 (elastic overshoot)
            { key: 'scale', val: 0.3, prog: 0 },
            { key: 'scale', val: 1.1, prog: 0.7 },
            { key: 'scale', val: 1.0, prog: 1 },
            // Rotation animation: 15deg → -5deg → 0deg (follow-through)
            { key: 'rotate', val: 15, prog: 0 },
            { key: 'rotate', val: -5, prog: 0.7 },
            { key: 'rotate', val: 0, prog: 1 },
            // Blur animation: 4px → 0px (depth effect)
            { key: 'filter', val: 'blur(4px)', prog: 0 },
            { key: 'filter', val: 'blur(2px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
            // Opacity animation: 0 → 1 (fade in)
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            // Clip-path animation: center point → full reveal
            {
              key: 'clipPath',
              val: 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
              prog: 0.6,
            },
          ],
        },
      };

      return {
        id: charId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            color: textColor,
            display: 'inline-block',
            transformOrigin: 'center',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight],
          },
        },
        context: {
          timing: {
            start: charStart,
            duration: charDuration,
          },
        },
        effects: [elasticDrawEffect],
      } as RenderableComponentData;
    },
  );

  // Create characters row container
  const charactersRow: RenderableComponentData = {
    id: 'characters-row',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-center justify-center',
        style: {
          gap: '0.1em',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: characterComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'elastic-draw-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformOrigin: 'center',
        },
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: totalDuration,
      },
    },
    childrenData: [charactersRow],
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
  id: 'elastic-draw-typokinetics',
  title: 'Elastic Draw Typokinetics',
  description:
    'Hand-drawn animation style where each letter appears to be drawn on screen with elastic overshoot and follow-through motion. Features scale, rotation, blur, and clip-path animations that create a playful, organic feel similar to rotoscoping text frame by frame. Each letter scales from a center point (0.3 → 1.1 → 1.0) with rotation (15deg → -5deg → 0deg), blur (4px → 0px), and staggered 0.08s delays per character for a pulled elastic band snap effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'elastic',
    'hand-drawn',
    'animation',
    'playful',
    'organic',
    'text',
    'title',
    'overlay',
    'spring',
    'overshoot',
    'follow-through',
    'rotoscope',
  ],
  defaultInputParams: {
    text: 'HELLO',
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#ffffff',
    characterDelay: 0.08,
    animationDuration: 0.6,
    startTime: 0,
    totalDuration: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const elasticDrawTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
