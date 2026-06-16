/**
 * Radial Text Fill Animation Preset
 *
 * This preset creates a radial/circular fill effect that expands from the center of each letter outward,
 * like dropping ink into water. Each character gets a perfect circular reveal that starts as a small dot
 * at the geometric center and floods the entire letter shape.
 *
 * Features:
 * - **Per-Character Animation**: Each letter gets its own radial expansion effect
 * - **Staggered Timing**: Wave-like progression across characters
 * - **Gradient Fill**: Subtle color variations within the fill for depth
 * - **Smooth Expansion**: Circular mask reveals synchronized across characters
 * - **GPU-Accelerated**: Uses transform: translateZ(0) for hardware acceleration
 *
 * Use cases:
 * - Creating dynamic text reveals for titles and headings
 * - Building engaging social media content with animated text
 * - Adding professional text effects to videos
 * - Creating ink-drop style animations for artistic content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to animate with radial fill effect'),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size in pixels for the text'),
  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto")'),
  gradientColors: z
    .object({
      start: z.string().default('#ff6b6b').describe('Starting gradient color'),
      mid: z.string().default('#4ecdc4').describe('Middle gradient color'),
      end: z.string().default('#45b7d1').describe('Ending gradient color'),
    })
    .default({ start: '#ff6b6b', mid: '#4ecdc4', end: '#45b7d1' })
    .describe('Gradient colors for the fill effect'),
  fillDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the fill animation per character (seconds)'),
  staggerDelay: z
    .number()
    .default(0.08)
    .describe('Delay between each character animation (seconds)'),
  hueRotateDuration: z
    .number()
    .default(1.5)
    .describe('Duration of subtle hue rotation effect (seconds)'),
  hueRotateAmount: z
    .number()
    .default(30)
    .describe('Maximum hue rotation in degrees'),
  totalDuration: z
    .number()
    .optional()
    .describe('Total duration of the preset (auto-calculated if not provided)'),
  startTime: z
    .number()
    .default(0)
    .describe('Start time of the animation (seconds)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontWeight,
    fontFamily,
    gradientColors,
    fillDuration,
    staggerDelay,
    hueRotateDuration,
    hueRotateAmount,
    totalDuration,
    startTime,
  } = params;

  // Split text into characters
  const characters = text.split('');

  // Calculate total duration if not provided
  const lastCharacterStartTime = (characters.length - 1) * staggerDelay;
  const calculatedDuration = lastCharacterStartTime + fillDuration + 0.5; // Add 0.5s buffer
  const duration = totalDuration ?? calculatedDuration;

  // Create character components
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `radial-fill-char-${index}`;
      const staggeredStart = index * staggerDelay;

      // Radial fill effect
      const radialFillEffect = {
        id: `radial-fill-effect-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: staggeredStart,
          duration: fillDuration,
          mode: 'provider',
          targetIds: [charId],
          ranges: [
            { key: 'backgroundSize', val: '0% 0%', prog: 0 },
            { key: 'backgroundSize', val: '250% 250%', prog: 1 },
          ],
        },
      };

      // Hue rotate effect for color variation
      const hueRotateEffect = {
        id: `hue-rotate-effect-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: staggeredStart,
          duration: hueRotateDuration,
          mode: 'provider',
          targetIds: [charId],
          ranges: [
            { key: 'filter:hue-rotate', val: '0deg', prog: 0 },
            { key: 'filter:hue-rotate', val: `${hueRotateAmount}deg`, prog: 0.5 },
            { key: 'filter:hue-rotate', val: '0deg', prog: 1 },
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
            color: 'transparent',
            background: `radial-gradient(circle at center, ${gradientColors.start} 0%, ${gradientColors.mid} 50%, ${gradientColors.end} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            backgroundSize: '0% 0%',
            backgroundPosition: 'center center',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight === 'bold' ? '700' : '400'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [radialFillEffect, hueRotateEffect],
      } as RenderableComponentData;
    },
  );

  // Character container layout
  const characterContainerLayout: RenderableComponentData = {
    id: 'radial-fill-character-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-center justify-center gap-0.5',
      },
      repeatChildrenProps: {
        className: 'relative overflow-hidden',
        style: {
          transform: 'translateZ(0)', // GPU acceleration
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: characterComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'radial-fill-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center gap-0.5',
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: duration,
      },
    },
    childrenData: [characterContainerLayout],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'radial-text-fill',
  title: 'Radial Text Fill Animation',
  description:
    'Creates a radial/circular fill effect that expands from the center of each letter outward, like dropping ink into water. Features per-character circular mask reveals with staggered timing and subtle color variations for depth.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'radial',
    'fill',
    'circular',
    'ink',
    'gradient',
    'reveal',
    'stagger',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'HELLO WORLD',
    fontSize: 72,
    fontWeight: 'bold',
    fontFamily: 'Inter',
    gradientColors: {
      start: '#ff6b6b',
      mid: '#4ecdc4',
      end: '#45b7d1',
    },
    fillDuration: 1.2,
    staggerDelay: 0.08,
    hueRotateDuration: 1.5,
    hueRotateAmount: 30,
    startTime: 0,
  },
};

// Export preset
export const radialTextFillPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
