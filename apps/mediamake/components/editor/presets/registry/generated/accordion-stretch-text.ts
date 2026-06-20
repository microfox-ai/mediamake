/**
 * Accordion Stretch Text Animation Preset
 *
 * This preset creates an accordion-style stretch text animation where text expands and contracts
 * horizontally like an accordion being played. Features include:
 * - Rhythmic horizontal stretching with letter-spacing animation (0→20px→-5px→10px→0)
 * - Per-letter scaleX animation (1→0.7→1.3→0.85→1)
 * - Alternating vertical displacement for odd/even letters (accordion keys moving)
 * - 3D perspective tilt during maximum stretch (rotateY: 0→5deg→0)
 * - Gradient color transitions flowing across letters
 * - Musical timing with consistent rhythm (800ms default)
 *
 * Technical implementation:
 * - BaseLayout with perspective-1000 for 3D depth
 * - Individual TextAtom per letter with inline-flex layout
 * - Alternating translateY for odd (0→10px→0) and even (0→-10px→0) letters
 * - Synchronized effects with ease-in-out timing
 *
 * Use cases:
 * - Music-synchronized content with accordion-like rhythm
 * - Dynamic title animations with depth perception
 * - Creative text reveals with musical timing
 * - Rhythmic pulses for beat-synced content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text content to animate'),
  duration: z
    .number()
    .default(0.8)
    .describe('Animation duration in seconds (musical timing: 800ms default)'),
  fontSize: z
    .number()
    .default(64)
    .describe('Font size in pixels for the text'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (CSS color value)'),
  gradientStartColor: z
    .string()
    .default('#FF6B6B')
    .describe('Gradient start color (CSS color value)'),
  gradientMidColor: z
    .string()
    .default('#4ECDC4')
    .describe('Gradient middle color (CSS color value)'),
  gradientEndColor: z
    .string()
    .default('#45B7D1')
    .describe('Gradient end color (CSS color value)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    gradientStartColor,
    gradientMidColor,
    gradientEndColor,
  } = params;

  // Split text into individual letters
  const letters = text.split('');

  // Create letter components with alternating effects
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `accordion-letter-${index}`;
      const isOdd = index % 2 === 1;

      // Base letter component
      const letterComponent: RenderableComponentData = {
        id: letterId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: letter,
          style: {
            fontSize,
            fontWeight,
            color: textColor,
            display: 'inline-block',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight],
            subsets: ['latin'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [
          // Main accordion effect (letter-spacing, scaleX, translateY, rotateY)
          {
            id: `accordion-effect-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration,
              mode: 'provider',
              targetIds: [letterId],
              ranges: [
                // Letter-spacing animation: 0→20px→-5px→10px→0
                { key: 'letterSpacing', val: 0, prog: 0 },
                { key: 'letterSpacing', val: 20, prog: 0.25 },
                { key: 'letterSpacing', val: -5, prog: 0.5 },
                { key: 'letterSpacing', val: 10, prog: 0.75 },
                { key: 'letterSpacing', val: 0, prog: 1 },
                // ScaleX animation: 1→0.7→1.3→0.85→1
                { key: 'scaleX', val: 1, prog: 0 },
                { key: 'scaleX', val: 0.7, prog: 0.25 },
                { key: 'scaleX', val: 1.3, prog: 0.5 },
                { key: 'scaleX', val: 0.85, prog: 0.75 },
                { key: 'scaleX', val: 1, prog: 1 },
                // TranslateY animation (alternating for odd/even)
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: isOdd ? 10 : -10, prog: 0.5 },
                { key: 'translateY', val: 0, prog: 1 },
                // RotateY for 3D perspective tilt: 0→5deg→0
                { key: 'rotateY', val: 0, prog: 0 },
                { key: 'rotateY', val: 5, prog: 0.5 },
                { key: 'rotateY', val: 0, prog: 1 },
              ],
            },
          },
          // Gradient color transition effect
          {
            id: `gradient-effect-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration,
              mode: 'provider',
              targetIds: [letterId],
              ranges: [
                { key: 'color', val: gradientStartColor, prog: 0 },
                { key: 'color', val: gradientMidColor, prog: 0.5 },
                { key: 'color', val: gradientEndColor, prog: 1 },
              ],
            },
          },
        ],
      };

      return letterComponent;
    },
  );

  // Root container with perspective for 3D effect
  const rootContainer: RenderableComponentData = {
    id: 'accordion-stretch-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'inline-flex items-center justify-center',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      {
        id: 'accordion-letter-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-flex flex-row items-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: letterComponents,
      } as RenderableComponentData,
    ],
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
  id: 'accordion-stretch-text',
  title: 'Accordion Stretch Text Animation',
  description:
    'Dynamic accordion-style text animation where individual letters expand and contract horizontally with rhythmic timing. Features alternating vertical displacement for odd/even letters (like accordion keys), 3D perspective tilt during maximum stretch, gradient color transitions flowing across letters, and musical timing perfect for audio-synchronized content. Letters animate with decreasing/increasing spacing creating a pulsing accordion effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'accordion',
    'stretch',
    'animation',
    '3d',
    'perspective',
    'gradient',
    'music-sync',
    'rhythm',
    'kinetic',
  ],
  defaultInputParams: {
    text: 'ACCORDION',
    duration: 0.8,
    fontSize: 64,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#FFFFFF',
    gradientStartColor: '#FF6B6B',
    gradientMidColor: '#4ECDC4',
    gradientEndColor: '#45B7D1',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const accordionStretchTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
