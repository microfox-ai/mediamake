/**
 * Pendulum Swing Typokinetics Preset
 *
 * A mesmerizing kinetic typography preset where text lines swing like synchronized pendulums.
 * Each line is suspended from an invisible pivot point above the frame, swinging in opposing arcs
 * with physics-accurate pendulum motion. Odd lines swing left-to-right while even lines swing
 * right-to-left, creating a hypnotic Newton's cradle effect.
 *
 * Features:
 * - Physics-accurate pendulum motion with natural acceleration/deceleration
 * - Alternating swing patterns (odd lines left-to-right, even lines right-to-left)
 * - Subtle rotation following swing angle
 * - Momentum stretch effect via scaleY animation
 * - Gentle fade effect at swing extremes where text pauses before reversing
 * - Organic feel with slightly varied swing durations (1.9s-2.1s)
 * - Meditative, rhythmic motion like watching a Newton's cradle
 *
 * Use Cases:
 * - Hypnotic text presentations for meditative content
 * - Artistic title sequences with physics-based motion
 * - Dynamic poetry or lyric displays
 * - Experimental typography for creative projects
 * - Rhythmic text animations for ambient videos
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// --- Zod Params Schema ---

const presetParams = z.object({
  lines: z
    .array(z.string())
    .min(1)
    .max(10)
    .describe('Array of text lines to display as pendulums (1-10 lines)'),
  duration: z
    .number()
    .min(5)
    .max(300)
    .default(30)
    .describe('Total duration of the animation in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels for text'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family (e.g., "Inter", "Roboto", "Montserrat")'),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (hex or rgba)'),
  swingAngle: z
    .number()
    .min(10)
    .max(60)
    .default(30)
    .optional()
    .describe('Maximum swing angle in degrees (default: 30)'),
  baseSwingDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .optional()
    .describe('Base swing duration in seconds (default: 2s)'),
  lineSpacing: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .optional()
    .describe('Vertical spacing between lines as percentage of height (default: 15%)'),
});

// --- Preset Execution Function ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    lines,
    duration,
    fontSize = 48,
    fontFamily = 'Inter',
    textColor = '#ffffff',
    swingAngle = 30,
    baseSwingDuration = 2,
    lineSpacing = 15,
  } = params;

  // Helper function to create pendulum effect for a line
  const createPendulumEffect = (
    targetId: string,
    index: number,
  ): {
    id: string;
    componentId: string;
    data: GenericEffectData;
  } => {
    // Determine swing direction: even index swings right-to-left, odd swings left-to-right
    const isEven = index % 2 === 0;
    const startAngle = isEven ? -swingAngle : swingAngle;
    const midAngle = isEven ? swingAngle : -swingAngle;
    const endAngle = startAngle;

    // Vary duration slightly for organic feel
    const durationVariations = [0, 0.1, -0.1, 0.05, -0.05];
    const durationVariation =
      durationVariations[index % durationVariations.length];
    const effectDuration = baseSwingDuration + durationVariation;

    const effectData: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Rotation (pendulum swing)
        { key: 'rotateZ', val: startAngle, prog: 0 },
        { key: 'rotateZ', val: midAngle, prog: 0.5 },
        { key: 'rotateZ', val: endAngle, prog: 1 },

        // Opacity fade at extremes
        { key: 'opacity', val: 0.7, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.25 },
        { key: 'opacity', val: 1, prog: 0.75 },
        { key: 'opacity', val: 0.7, prog: 1 },

        // Momentum stretch (scaleY)
        { key: 'scaleY', val: 0.98, prog: 0 },
        { key: 'scaleY', val: 1.02, prog: 0.5 },
        { key: 'scaleY', val: 0.98, prog: 1 },
      ],
    };

    return {
      id: `pendulum-effect-${index}`,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Create pendulum line components
  const pendulumLines = lines.map((lineText, index) => {
    const lineId = `pendulum-line-${index}`;
    const textId = `text-${index}`;

    // Calculate vertical position
    const totalLines = lines.length;
    const startOffset = (100 - (totalLines - 1) * lineSpacing) / 2;
    const topPosition = startOffset + index * lineSpacing;

    // Create pendulum effect
    const pendulumEffect = createPendulumEffect(lineId, index);

    // Create text atom
    const textAtom: RenderableComponentData = {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: lineText,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 'bold',
          color: textColor,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        },
        font: {
          family: fontFamily,
          weights: ['400', '700'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    };

    // Create line container with transform-origin and effect
    const lineContainer: RenderableComponentData = {
      id: lineId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-full transform-gpu will-change-transform',
          style: {
            transformOrigin: 'top center',
            top: `${topPosition}%`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [pendulumEffect],
      childrenData: [textAtom],
    };

    return lineContainer;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'pendulum-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full flex flex-col justify-center items-center overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: pendulumLines as RenderableComponentData[],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'pendulum-swing-typokinetics',
  title: 'Pendulum Swing Typokinetics',
  description:
    'A mesmerizing kinetic typography preset where text lines swing like synchronized pendulums. Each line is suspended from an invisible pivot point above the frame, swinging in opposing arcs with physics-accurate pendulum motion. Odd lines swing left-to-right while even lines swing right-to-left, creating a hypnotic Newton\'s cradle effect. Features natural acceleration/deceleration, subtle rotation following swing angle, momentum stretch via scaleY, and opacity fade at swing extremes. The meditative, rhythmic motion is enhanced by slightly varied swing durations for organic feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'pendulum',
    'swing',
    'physics',
    'motion',
    'meditative',
    'rhythmic',
    'newton-cradle',
    'synchronized',
    'animation',
  ],
  dependencies: {},
  defaultInputParams: {
    lines: [
      'SYNCHRONIZED',
      'PENDULUM',
      'MOTION',
      'HYPNOTIC',
      'RHYTHM',
    ],
    duration: 30,
    fontSize: 48,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    swingAngle: 30,
    baseSwingDuration: 2,
    lineSpacing: 15,
  },
};

// --- Export Preset ---

export const pendulumSwingTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
