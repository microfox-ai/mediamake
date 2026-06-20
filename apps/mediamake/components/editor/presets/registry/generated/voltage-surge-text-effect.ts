/**
 * Voltage Surge Text Effect Preset
 *
 * This preset creates an electrical surge text effect that recreates the look of a neon sign
 * suddenly receiving power. The effect features:
 * - Rapid initial flickering (3-4 times in first 100ms) with varying intensities
 * - Voltage surge pulse with expanding glow
 * - Steady glow with occasional micro-flickers for electrical instability
 * - Bright outline that pulses on impact then maintains steady glow
 * - High-contrast black background for maximum visual impact
 *
 * Use cases:
 * - Tech product reveals and announcements
 * - Cyberpunk or futuristic title cards
 * - Impact moments in music videos
 * - Gaming intro sequences
 * - Dramatic text reveals with electrical theme
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with voltage effect'),
  duration: z.number().default(3).describe('Duration in seconds'),
  fontSize: z
    .string()
    .default('72px')
    .describe('Font size (e.g., "72px", "4rem")'),
  color: z
    .string()
    .default('#00FFFF')
    .describe('Text color (neon cyan default)'),
  glowColor: z
    .string()
    .optional()
    .describe(
      'Glow color override (defaults to text color if not provided)',
    ),
  impact: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Effect intensity multiplier (0.5-2, default: 1)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { text, duration, fontSize, color, glowColor, impact = 1 } = params;

  // Use glowColor if provided, otherwise use text color
  const effectiveGlowColor = glowColor || color;

  // Component IDs
  const containerId = 'voltage-surge-container';
  const textWrapperId = 'voltage-text-wrapper';
  const borderOutlineId = 'voltage-border-outline';
  const mainTextId = 'voltage-main-text';

  // Calculate timing values based on impact
  const flickerDuration = 0.1 * impact;
  const pulseDuration = 0.2 * impact;
  const microFlickerInterval = 0.5 / impact;

  // Helper: Create flicker effect (opacity oscillation)
  const createFlickerEffect = (
    targetId: string,
    start: number,
    duration: number,
    pattern: number[],
  ): GenericEffectData => {
    const ranges = pattern.map((opacity, index) => ({
      key: 'opacity',
      val: opacity,
      prog: index / (pattern.length - 1),
    }));

    return {
      type: 'linear',
      start,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Helper: Create glow pulse effect (text-shadow expansion)
  const createGlowPulseEffect = (
    targetId: string,
    start: number,
    duration: number,
  ): GenericEffectData => {
    return {
      type: 'ease-out',
      start,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        {
          key: 'filter',
          val: `drop-shadow(0 0 30px ${effectiveGlowColor}) drop-shadow(0 0 40px ${effectiveGlowColor})`,
          prog: 0,
        },
        {
          key: 'filter',
          val: `drop-shadow(0 0 10px ${effectiveGlowColor}) drop-shadow(0 0 20px ${effectiveGlowColor})`,
          prog: 1,
        },
      ],
    };
  };

  // Helper: Create micro-flicker effect (recurring subtle flickers)
  const createMicroFlickerEffect = (
    targetId: string,
    start: number,
    duration: number,
  ): GenericEffectData => {
    return {
      type: 'linear',
      start,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.85, prog: 0.1 },
        { key: 'opacity', val: 1, prog: 0.2 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
  };

  // Helper: Create brightness oscillation effect
  const createBrightnessOscillation = (
    targetId: string,
    start: number,
    duration: number,
  ): GenericEffectData => {
    return {
      type: 'linear',
      start,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'brightness', val: 1, prog: 0 },
        { key: 'brightness', val: 1.1, prog: 0.5 },
        { key: 'brightness', val: 1, prog: 1 },
      ],
    };
  };

  // Main text effects
  const mainTextEffects = [];

  // 1. Initial flicker pattern: [0, 1, 0.3, 1, 0.6, 1] over 0.1s
  mainTextEffects.push({
    id: `${mainTextId}-initial-flicker`,
    componentId: 'generic',
    data: createFlickerEffect(mainTextId, 0, flickerDuration, [
      0, 1, 0.3, 1, 0.6, 1,
    ]),
  });

  // 2. Glow pulse (text-shadow blur radius from 30px to 10px)
  mainTextEffects.push({
    id: `${mainTextId}-glow-pulse`,
    componentId: 'generic',
    data: createGlowPulseEffect(
      mainTextId,
      flickerDuration,
      pulseDuration,
    ),
  });

  // 3. Recurring micro-flickers throughout duration
  const microFlickerCount = Math.floor(
    (duration - flickerDuration - pulseDuration) / microFlickerInterval,
  );
  for (let i = 0; i < microFlickerCount; i++) {
    const microFlickerStart =
      flickerDuration + pulseDuration + i * microFlickerInterval;
    mainTextEffects.push({
      id: `${mainTextId}-micro-flicker-${i}`,
      componentId: 'generic',
      data: createMicroFlickerEffect(
        mainTextId,
        microFlickerStart,
        microFlickerInterval * 0.3,
      ),
    });
  }

  // 4. Subtle brightness oscillation (every 0.5s)
  const brightnessOscillationCount = Math.floor(
    (duration - flickerDuration - pulseDuration) / microFlickerInterval,
  );
  for (let i = 0; i < brightnessOscillationCount; i++) {
    const oscillationStart =
      flickerDuration + pulseDuration + i * microFlickerInterval;
    mainTextEffects.push({
      id: `${mainTextId}-brightness-osc-${i}`,
      componentId: 'generic',
      data: createBrightnessOscillation(
        mainTextId,
        oscillationStart,
        microFlickerInterval,
      ),
    });
  }

  // Border outline effects (slight delay of 10ms = 0.01s)
  const borderOutlineEffects = [];

  // 1. Initial flicker (10ms delayed)
  borderOutlineEffects.push({
    id: `${borderOutlineId}-initial-flicker`,
    componentId: 'generic',
    data: createFlickerEffect(borderOutlineId, 0.01, flickerDuration, [
      0, 1, 0.3, 1, 0.6, 1,
    ]),
  });

  // 2. Glow pulse (10ms delayed)
  borderOutlineEffects.push({
    id: `${borderOutlineId}-glow-pulse`,
    componentId: 'generic',
    data: createGlowPulseEffect(
      borderOutlineId,
      flickerDuration + 0.01,
      pulseDuration,
    ),
  });

  // Main text component
  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'font-bold tracking-wider',
      style: {
        fontSize,
        color,
        WebkitTextStroke: `1px ${color}`,
        textShadow: `0 0 10px ${effectiveGlowColor}, 0 0 20px ${effectiveGlowColor}, 0 0 30px ${effectiveGlowColor}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: mainTextEffects,
  };

  // Border outline component (using HTMLBlockAtom since ShapeAtom is deprecated)
  const borderOutline: RenderableComponentData = {
    id: borderOutlineId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 border-2 pointer-events-none',
      style: {
        borderColor: color,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: borderOutlineEffects,
  };

  // Text wrapper (contains border and main text)
  const textWrapper: RenderableComponentData = {
    id: textWrapperId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [borderOutline, mainText],
  };

  // Root container (black background)
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textWrapper],
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
  id: 'voltage-surge-text-effect',
  title: 'Voltage Surge Text Effect',
  description:
    'An electric surge text effect that recreates the look of a neon sign powering on. Features rapid initial flickering (3-4 times in 100ms), a voltage surge pulse, and ongoing micro-flickers for an unstable electrical feel. Includes animated glow effects and pulsing outline for realistic electrical impact.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'neon',
    'electric',
    'voltage',
    'surge',
    'flicker',
    'glow',
    'cyberpunk',
    'tech',
    'impact',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'VOLTAGE',
    duration: 3,
    fontSize: '72px',
    color: '#00FFFF',
    impact: 1,
  },
};

// Export preset
export const voltageSurgeTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
