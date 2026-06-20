/**
 * Typewriter Ribbon Effect Preset
 * 
 * This preset creates a kinetic typography effect that simulates overlapping typewriter
 * ribbons in motion. Text lines slide horizontally across the screen with the mechanical
 * precision of a typewriter carriage return - smooth horizontal motion with a slight
 * 'bounce' at the end of each traverse. The text is layered with varying opacities to
 * simulate the semi-transparent quality of ribbon ink, and each line has a vertical
 * offset that increases, creating a cascading effect like paper feeding through a
 * typewriter.
 * 
 * Features:
 * - Horizontal sliding motion with bounce easing (cubic-bezier for carriage return feel)
 * - Character-by-character reveal using clip-path animation
 * - Layered opacity (1, 0.8, 0.6, 0.4, 0.3) for ribbon overlap effect
 * - Cascading vertical offsets (0px, 20px, 40px, 60px, 80px)
 * - Mechanical wobble via subtle rotateZ animation
 * - Rhythmic pause points at keyframes for typewriter mechanical stops
 * - Monospace font (Courier New) with tracking-wider for authentic appearance
 * - Subtle text-shadow for ink bleed effect
 * 
 * Use Cases:
 * - Vintage typewriter-themed video intros
 * - Retro text animations for creative content
 * - Nostalgic documentary titles
 * - Literary or writer-focused video content
 * - Mechanical/industrial aesthetic videos
 */

import { z } from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  line0Text: z
    .string()
    .default('TYPEWRITER RIBBON')
    .describe('Text content for the first line (top, full opacity)'),
  line1Text: z
    .string()
    .default('MECHANICAL MOTION')
    .describe('Text content for the second line (0.8 opacity)'),
  line2Text: z
    .string()
    .default('VINTAGE AESTHETIC')
    .describe('Text content for the third line (0.6 opacity)'),
  line3Text: z
    .string()
    .default('CLASSIC TYPOGRAPHY')
    .describe('Text content for the fourth line (0.4 opacity)'),
  line4Text: z
    .string()
    .default('RIBBON OVERLAY')
    .describe('Text content for the fifth line (0.3 opacity)'),
  fontSize: z
    .string()
    .default('48px')
    .describe('Font size for all text lines (e.g., "48px", "3rem")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color for all lines (CSS color value)'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(8)
    .describe('Total duration of the effect in seconds'),
  slideDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2.5)
    .describe('Duration of the horizontal slide motion per line in seconds'),
  revealDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.8)
    .describe('Duration of the character-by-character reveal animation in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Delay between each line starting its animation (stagger effect) in seconds'),
  wobbleIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Intensity of the mechanical wobble effect (0 = none, 5 = max)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters
  const {
    line0Text,
    line1Text,
    line2Text,
    line3Text,
    line4Text,
    fontSize,
    textColor,
    duration,
    slideDuration,
    revealDuration,
    staggerDelay,
    wobbleIntensity,
  } = params;

  // Configuration for each line
  const lineConfigs = [
    { text: line0Text, topOffset: 0, opacity: 1 },
    { text: line1Text, topOffset: 20, opacity: 0.8 },
    { text: line2Text, topOffset: 40, opacity: 0.6 },
    { text: line3Text, topOffset: 60, opacity: 0.4 },
    { text: line4Text, topOffset: 80, opacity: 0.3 },
  ];

  // Helper: Create effects for a single line
  const createLineEffects = (
    lineId: string,
    textId: string,
    lineIndex: number,
  ) => {
    const effects = [];
    const startDelay = lineIndex * staggerDelay;

    // Slide animation with bounce easing
    // Cubic-bezier(0.68, -0.55, 0.265, 1.55) creates the carriage return "bounce"
    effects.push({
      id: `slide-effect-${lineId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: startDelay,
        duration: slideDuration,
        mode: 'provider' as const,
        targetIds: [lineId],
        ranges: [
          // Horizontal slide with pause points for typewriter rhythm
          { key: 'translateX', val: -100, prog: 0 },
          { key: 'translateX', val: -60, prog: 0.45 }, // Pause at 45%
          { key: 'translateX', val: -60, prog: 0.55 }, // Pause until 55%
          { key: 'translateX', val: 0, prog: 1 },
        ],
        props: {
          customEasing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        },
      },
    });

    // Character reveal animation (clip-path)
    effects.push({
      id: `reveal-effect-${textId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: startDelay,
        duration: revealDuration,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: [
          { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
          { key: 'clipPath', val: 'inset(0 50% 0 0)', prog: 0.45 },
          { key: 'clipPath', val: 'inset(0 50% 0 0)', prog: 0.55 },
          { key: 'clipPath', val: 'inset(0 0% 0 0)', prog: 1 },
        ],
      },
    });

    // Mechanical wobble (subtle rotateZ oscillation)
    if (wobbleIntensity > 0) {
      const wobbleAngle = wobbleIntensity * 0.5; // Max 2.5deg at intensity 5
      effects.push({
        id: `wobble-effect-${lineId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: startDelay,
          duration: slideDuration,
          mode: 'provider' as const,
          targetIds: [lineId],
          ranges: [
            { key: 'rotateZ', val: wobbleAngle, prog: 0 },
            { key: 'rotateZ', val: -wobbleAngle, prog: 0.25 },
            { key: 'rotateZ', val: wobbleAngle, prog: 0.5 },
            { key: 'rotateZ', val: -wobbleAngle, prog: 0.75 },
            { key: 'rotateZ', val: 0, prog: 1 },
          ],
        },
      });
    }

    return effects;
  };

  // Build line components
  const lineComponents: RenderableComponentData[] = lineConfigs.map(
    (config, index) => {
      const lineId = `ribbon-line-${index}`;
      const textId = `text-line-${index}`;

      const lineEffects = createLineEffects(lineId, textId, index);

      return {
        id: lineId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute w-full',
            style: {
              top: `${config.topOffset}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: lineEffects,
        childrenData: [
          {
            id: textId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: config.text,
              className: 'tracking-wider whitespace-nowrap',
              style: {
                opacity: config.opacity,
                textShadow:
                  '1px 1px 2px rgba(0,0,0,0.3), -1px -1px 0px rgba(0,0,0,0.1)',
                fontSize: fontSize,
                color: textColor,
              },
              font: {
                family: 'Courier New',
                weights: ['400'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-ribbon-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full font-mono bg-transparent overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: lineComponents,
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
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'typewriter-ribbon-effect',
  title: 'Typewriter Ribbon Effect',
  description:
    'A kinetic typography preset simulating overlapping typewriter ribbons in motion. Text lines slide horizontally with mechanical carriage-return bounce, layered with decreasing opacity for ink transparency effect. Features character-by-character reveal, cascading vertical offsets, rhythmic pause points, and subtle mechanical wobble for authentic vintage typewriter aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'typewriter',
    'vintage',
    'retro',
    'mechanical',
    'slide',
    'reveal',
    'layered',
    'ribbon',
    'monospace',
  ],
  dependencies: {},
  defaultInputParams: {
    line0Text: 'TYPEWRITER RIBBON',
    line1Text: 'MECHANICAL MOTION',
    line2Text: 'VINTAGE AESTHETIC',
    line3Text: 'CLASSIC TYPOGRAPHY',
    line4Text: 'RIBBON OVERLAY',
    fontSize: '48px',
    textColor: '#FFFFFF',
    duration: 8,
    slideDuration: 2.5,
    revealDuration: 1.8,
    staggerDelay: 0.3,
    wobbleIntensity: 1,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const typewriterRibbonEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};