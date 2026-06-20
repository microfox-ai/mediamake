/**
 * Bouncy Typewriter Effect for Kids Preset
 *
 * This preset creates a playful, bouncy typewriter effect perfect for children's content
 * and fun animations. Characters drop from above with gravity-like physics, bounce multiple
 * times with decreasing amplitude, settle with a wobble, and feature colorful rainbow variations.
 *
 * Features:
 * - **Physics-Based Bounce**: Characters drop from above and bounce with realistic gravity simulation
 * - **Rainbow Colors**: Each character gets a unique color from the rainbow palette
 * - **Wobble Rotation**: Synchronized rotation wiggle during bounce
 * - **Squash-Stretch**: Scale deformation on impact for cartoon effect
 * - **Fun Cursor**: Star-shaped cursor that spins continuously
 * - **Celebration Bounce**: All letters do a synchronized celebration bounce after typing
 * - **Customizable Impact**: Adjust bounce intensity and timing
 *
 * Use cases:
 * - Children's cartoon titles and intros
 * - Fun social media content
 * - Educational content for kids
 * - Playful brand animations
 * - Party/celebration videos
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  text: z
    .string()
    .default('Hello')
    .describe('Text to display with bouncy typewriter effect'),
  font: z
    .string()
    .default('Inter:800')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:800:normal", "Inter:700")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  letterSpacing: z
    .number()
    .min(0)
    .max(20)
    .default(4)
    .describe('Spacing between characters in pixels'),
  bounceDuration: z
    .number()
    .min(0.3)
    .max(1.5)
    .default(0.6)
    .describe('Duration of each character bounce animation in seconds'),
  staggerDelay: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .describe('Delay between each character appearance in seconds'),
  bounceIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for bounce effect (1 = normal)'),
  enableCelebration: z
    .boolean()
    .default(true)
    .describe('Enable synchronized celebration bounce after all letters appear'),
  celebrationDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.3)
    .describe('Delay before celebration bounce starts (in seconds)'),
  celebrationDuration: z
    .number()
    .min(0.2)
    .max(1)
    .default(0.4)
    .describe('Duration of celebration bounce animation in seconds'),
  cursorEnabled: z
    .boolean()
    .default(true)
    .describe('Show animated cursor (star shape)'),
  cursorSize: z
    .number()
    .min(16)
    .max(64)
    .default(32)
    .describe('Size of cursor in pixels'),
  textShadow: z
    .boolean()
    .default(true)
    .describe('Add text shadow for depth'),
  totalDuration: z
    .number()
    .min(2)
    .max(30)
    .default(5)
    .describe('Total duration of the preset in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

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

  const { fontFamily, fontStyle } = parseFontString(
    params.font || 'Inter:800',
  );

  // Split text into characters
  const characters = params.text.split('');
  const charCount = characters.length;

  // Calculate timing
  const lastCharStartTime = (charCount - 1) * params.staggerDelay;
  const lastCharEndTime = lastCharStartTime + params.bounceDuration;
  const celebrationStartTime = params.enableCelebration
    ? lastCharEndTime + params.celebrationDelay
    : 0;

  // Generate character components with bounce effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `bouncy-char-${index}`;

      // Rainbow color calculation (hue based on index)
      const hue = (index * 30) % 360;
      const charColor = `hsl(${hue}, 80%, 60%)`;

      // Bounce effect timing
      const charStartTime = index * params.staggerDelay;

      // Create bounce effect with physics-based ranges
      const bounceEffect: any = {
        id: `bounce-effect-${charId}`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          start: charStartTime,
          duration: params.bounceDuration,
          mode: 'provider',
          targetIds: [charId],
          ranges: [
            // TranslateY: Drop and bounce
            {
              key: 'translateY',
              val: -50 * params.bounceIntensity,
              prog: 0,
            },
            { key: 'translateY', val: 20 * params.bounceIntensity, prog: 0.3 },
            {
              key: 'translateY',
              val: -10 * params.bounceIntensity,
              prog: 0.5,
            },
            { key: 'translateY', val: 5 * params.bounceIntensity, prog: 0.7 },
            { key: 'translateY', val: 0, prog: 1 },
            // Rotate: Wobble during bounce
            { key: 'rotate', val: -5, prog: 0 },
            { key: 'rotate', val: 5, prog: 0.3 },
            { key: 'rotate', val: -2, prog: 0.6 },
            { key: 'rotate', val: 0, prog: 1 },
            // ScaleY: Squash and stretch on impact
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 0.8, prog: 0.3 },
            { key: 'scaleY', val: 1.1, prog: 0.5 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      };

      return {
        id: charId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize: `${params.fontSize}px`,
            fontWeight: fontStyle.fontWeight || 800,
            color: charColor,
            textShadow: params.textShadow
              ? '2px 2px 4px rgba(0,0,0,0.3)'
              : undefined,
            display: 'inline-block',
            marginRight: '0.1em',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['800'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.totalDuration,
          },
        },
        effects: [bounceEffect],
      } as RenderableComponentData;
    },
  );

  // Create celebration effect (applied to all characters)
  let celebrationEffect: any = null;
  if (params.enableCelebration) {
    celebrationEffect = {
      id: 'celebration-bounce-all',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: celebrationStartTime,
        duration: params.celebrationDuration,
        mode: 'provider',
        targetIds: characterComponents.map((comp) => comp.id),
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -20, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.1, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    };
  }

  // Create cursor component (star shape)
  let cursorComponent: RenderableComponentData | null = null;
  if (params.cursorEnabled) {
    const cursorId = 'bouncy-cursor';
    const starClipPath =
      'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';

    cursorComponent = {
      id: cursorId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${params.cursorSize}px; height: ${params.cursorSize}px; background: linear-gradient(45deg, #ff6b9d, #ffc371); clip-path: ${starClipPath};"></div>`,
        style: {
          display: 'inline-block',
          marginLeft: '8px',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.totalDuration,
        },
      },
      effects: [
        {
          id: 'cursor-rotation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 2,
            mode: 'provider',
            targetIds: [cursorId],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 360, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    } as RenderableComponentData;
  }

  // Create text container with all characters
  const textContainerId = 'bouncy-text-container';
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-end justify-center',
        style: {
          gap: `${params.letterSpacing}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [
      ...characterComponents,
      ...(cursorComponent ? [cursorComponent] : []),
    ],
    effects: celebrationEffect ? [celebrationEffect] : [],
  } as RenderableComponentData;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'bouncy-typewriter-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration,
      },
    },
    childrenData: [textContainer],
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
  id: 'bouncy-typewriter-kids',
  title: 'Bouncy Typewriter Effect for Kids',
  description:
    'Playful, physics-based typewriter effect where each letter drops from above with gravity-like bounce physics, bounces with decreasing amplitude, and settles with a wobble. Features rainbow colors per character, optional sound effect triggers, animated cursor (star/heart shape with rotation), and synchronized celebration bounce. Perfect for children\'s content, cartoon titles, and fun animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typewriter',
    'bounce',
    'kids',
    'children',
    'playful',
    'fun',
    'animation',
    'rainbow',
    'physics',
    'cartoon',
    'celebration',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Hello',
    font: 'Inter:800',
    fontSize: 72,
    letterSpacing: 4,
    bounceDuration: 0.6,
    staggerDelay: 0.1,
    bounceIntensity: 1,
    enableCelebration: true,
    celebrationDelay: 0.3,
    celebrationDuration: 0.4,
    cursorEnabled: true,
    cursorSize: 32,
    textShadow: true,
    totalDuration: 5,
  },
};

// Export preset
export const bouncyTypewriterKidsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
