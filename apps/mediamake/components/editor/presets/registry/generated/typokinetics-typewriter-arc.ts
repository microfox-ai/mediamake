/**
 * Typokinetics Typewriter Arc Preset
 *
 * A kinetic typography preset inspired by typewriter mechanics where each letter
 * slides in from the right following individual arc trajectories with bounce easing,
 * assembles at center with ink-spread scale pulse effects, holds with subtle vibration
 * impact, then exits left as a complete unit.
 *
 * Features:
 * - **Mechanical Precision**: Each letter follows its own arc trajectory like typewriter keys
 * - **Cascading Wave Effect**: Staggered timing creates a wave-like assembly motion
 * - **Ink Spread Effect**: Brief scale pulse when each letter lands
 * - **Vibration Impact**: Subtle oscillation mimicking typewriter strike
 * - **Perfect Stillness**: Moment of calm before exit begins
 * - **Complete Unit Exit**: Assembled word slides off as one piece
 *
 * Use cases:
 * - Creating typewriter-inspired text animations
 * - Building mechanical kinetic typography effects
 * - Adding vintage/retro text reveals with modern motion
 * - Creating cascading wave text assemblies
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display (single word recommended for best effect)'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "RobotoMono:600", "CourierPrime:700")',
    ),
  textColor: z.string().default('#FFFFFF').describe('Text color (CSS color value)'),
  letterStagger: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .describe('Time offset between each letter entry in seconds'),
  arcHeight: z
    .number()
    .min(10)
    .max(50)
    .default(20)
    .describe('Maximum arc trajectory height as percentage of viewport (varies per letter)'),
  entryDuration: z
    .number()
    .min(0.2)
    .max(1)
    .default(0.4)
    .describe('Duration of each letter entry arc animation in seconds'),
  scaleIntensity: z
    .number()
    .min(1.05)
    .max(1.3)
    .default(1.15)
    .describe('Scale pulse intensity when letter lands (ink spread effect)'),
  scaleDuration: z
    .number()
    .min(0.1)
    .max(0.3)
    .default(0.2)
    .describe('Duration of scale pulse effect in seconds'),
  assemblyHold: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration word holds at center after assembly (stillness moment) in seconds'),
  vibrationDuration: z
    .number()
    .min(0.2)
    .max(0.5)
    .default(0.3)
    .describe('Duration of vibration effect after assembly in seconds'),
  vibrationIntensity: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Vibration intensity in pixels (typewriter impact effect)'),
  exitDuration: z
    .number()
    .min(1)
    .max(3)
    .default(1.5)
    .describe('Duration of complete word exit animation in seconds'),
  textShadow: z
    .string()
    .optional()
    .describe('CSS text shadow for depth (e.g., "0 2px 4px rgba(0,0,0,0.3)")'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'RobotoMono:600';
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

  // Split text into letters
  const letters = params.text.split('');
  const letterCount = letters.length;

  // Calculate total duration
  const totalEntryTime = letterCount * params.letterStagger + params.entryDuration;
  const totalDuration = totalEntryTime + params.assemblyHold + params.exitDuration;

  // Helper: Generate arc trajectory for each letter
  const generateArcEffect = (
    letterIndex: number,
    letterId: string,
  ): GenericEffectData => {
    // Vary arc height per letter (alternating pattern for wave effect)
    const arcVariation = 0.7 + (letterIndex % 3) * 0.15; // 0.7, 0.85, 1.0 pattern
    const arcHeightPx = (params.arcHeight * arcVariation * props.config.height) / 100;

    const entryStart = letterIndex * params.letterStagger;

    return {
      type: 'ease-out',
      start: entryStart,
      duration: params.entryDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Horizontal: 100% → 0%
        { key: 'translateX', val: props.config.width * 0.5, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
        // Vertical arc: 0% → -arcHeight% → 0%
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -arcHeightPx, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
        // Opacity fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },
      ],
    };
  };

  // Helper: Generate scale pulse (ink spread effect)
  const generateScalePulse = (
    letterIndex: number,
    letterId: string,
  ): GenericEffectData => {
    const landingTime = letterIndex * params.letterStagger + params.entryDuration;

    return {
      type: 'ease-in-out',
      start: landingTime,
      duration: params.scaleDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: params.scaleIntensity, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };
  };

  // Helper: Generate vibration effect (on letter-group container)
  const generateVibration = (containerId: string): GenericEffectData => {
    const vibrationStart = totalEntryTime;
    const intensity = params.vibrationIntensity;

    return {
      type: 'linear',
      start: vibrationStart,
      duration: params.vibrationDuration,
      mode: 'provider',
      targetIds: [containerId],
      ranges: [
        // Rapid X oscillation
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: intensity, prog: 0.1 },
        { key: 'translateX', val: -intensity, prog: 0.2 },
        { key: 'translateX', val: intensity, prog: 0.3 },
        { key: 'translateX', val: -intensity, prog: 0.4 },
        { key: 'translateX', val: intensity, prog: 0.5 },
        { key: 'translateX', val: -intensity, prog: 0.6 },
        { key: 'translateX', val: intensity, prog: 0.7 },
        { key: 'translateX', val: -intensity, prog: 0.8 },
        { key: 'translateX', val: 0, prog: 1 },
        // Rapid Y oscillation (smaller amplitude)
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: intensity * 0.5, prog: 0.15 },
        { key: 'translateY', val: -intensity * 0.5, prog: 0.25 },
        { key: 'translateY', val: intensity * 0.5, prog: 0.35 },
        { key: 'translateY', val: -intensity * 0.5, prog: 0.45 },
        { key: 'translateY', val: intensity * 0.5, prog: 0.55 },
        { key: 'translateY', val: -intensity * 0.5, prog: 0.65 },
        { key: 'translateY', val: intensity * 0.5, prog: 0.75 },
        { key: 'translateY', val: -intensity * 0.5, prog: 0.85 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };
  };

  // Helper: Generate exit effect (entire word)
  const generateExit = (containerId: string): GenericEffectData => {
    const exitStart = totalEntryTime + params.assemblyHold;

    return {
      type: 'ease-in',
      start: exitStart,
      duration: params.exitDuration,
      mode: 'provider',
      targetIds: [containerId],
      ranges: [
        // Slide left off screen
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: -props.config.width * 0.6, prog: 1 },
        // Fade out
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.8 },
      ],
    };
  };

  // Create letter components
  const letterComponents = letters.map((letter, index) => {
    const letterId = `letter-${index}`;
    const arcEffect = generateArcEffect(index, letterId);
    const scalePulse = generateScalePulse(index, letterId);

    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          fontWeight: fontStyle.fontWeight || 600,
          fontStyle: fontStyle.fontStyle || 'normal',
          textShadow: params.textShadow || '0 2px 4px rgba(0,0,0,0.3)',
          display: 'inline-block',
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['600'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `arc-${letterId}`,
          componentId: 'generic',
          data: arcEffect,
        },
        {
          id: `pulse-${letterId}`,
          componentId: 'generic',
          data: scalePulse,
        },
      ],
    };
  }) as RenderableComponentData[];

  // Letter group container (holds all letters)
  const letterGroupId = 'letter-group';
  const vibrationEffect = generateVibration(letterGroupId);
  const exitEffect = generateExit(letterGroupId);

  const letterGroup: RenderableComponentData = {
    id: letterGroupId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-row',
        style: {
          gap: '0',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'vibration-effect',
        componentId: 'generic',
        data: vibrationEffect,
      },
      {
        id: 'exit-effect',
        componentId: 'generic',
        data: exitEffect,
      },
    ],
    childrenData: letterComponents,
  };

  // Word assembly container (centers everything)
  const wordAssemblyContainer: RenderableComponentData = {
    id: 'word-assembly-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [letterGroup],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [wordAssemblyContainer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokinetics-typewriter-arc',
  title: 'Typokinetics Typewriter Arc',
  description:
    'A kinetic typography preset inspired by typewriter mechanics where each letter slides in from the right following individual arc trajectories with bounce easing, assembles at center with ink-spread scale pulse effects, holds with subtle vibration impact, then exits left as a complete unit. Features staggered letter timing, cascading wave motion, and mechanical precision meets organic movement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'typewriter',
    'mechanical',
    'arc',
    'wave',
    'cascade',
    'text',
    'animation',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'TYPEWRITER',
    fontSize: 72,
    font: 'RobotoMono:600',
    textColor: '#FFFFFF',
    letterStagger: 0.1,
    arcHeight: 20,
    entryDuration: 0.4,
    scaleIntensity: 1.15,
    scaleDuration: 0.2,
    assemblyHold: 1.5,
    vibrationDuration: 0.3,
    vibrationIntensity: 2,
    exitDuration: 1.5,
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
};

// Export preset
export const typokineticsTypewriterArcPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
