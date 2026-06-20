/**
 * Magnetic Settle Typography Preset
 *
 * Creates a minimalist typography effect where text appears to be magnetically pulled into position.
 * The text accelerates quickly from off-screen, slows down as it approaches, overshoots slightly,
 * then snaps back into perfect alignment with a subtle rotation correction.
 *
 * Features:
 * - Magnetic pull animation with overshoot and snap-back behavior
 * - Subtle rotation during overshoot phase (2-3 degrees)
 * - Dynamic shadow that fades as text settles
 * - Slight skewX for additional dynamism during overshoot
 * - Custom cubic-bezier easing for magnetic feel
 * - Transform-origin centered for smooth rotation
 *
 * Use cases:
 * - Eye-catching title reveals
 * - Dynamic typography effects
 * - Modern video intros
 * - Social media content headers
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .default('MAGNETIC')
    .describe('Text to display with magnetic settle effect'),
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
    .default('#000000')
    .describe('Text color (hex or rgba)'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total duration the text remains visible (seconds)'),
  effectDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.7)
    .describe('Duration of the magnetic settle animation (seconds)'),
  overshootAmount: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Overshoot percentage (how far past target text moves)'),
  rotationAmount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Rotation amount in degrees during overshoot'),
  skewAmount: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('SkewX amount in degrees during overshoot'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const containerId = 'magnetic-settle-container';
  const textElementId = 'magnetic-settle-text';
  const effectId = 'magnetic-settle-effect';

  // Parse font string for weight
  const fontWeight = params.fontWeight || '700';

  // Construct the magnetic settle effect
  const magneticEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [textElementId],
    ranges: [
      // TranslateX: start from right (100vw), overshoot to left (-8%), settle at center (0)
      { key: 'translateX', val: '100vw', prog: 0 },
      { key: 'translateX', val: `-${params.overshootAmount}%`, prog: 0.7 },
      { key: 'translateX', val: '0', prog: 1 },

      // Rotate: start at 0, rotate to -3deg at overshoot, return to 0
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: -params.rotationAmount, prog: 0.7 },
      { key: 'rotate', val: 0, prog: 1 },

      // Scale: start small (0.9), scale up at overshoot (1.03), settle at 1
      { key: 'scale', val: 0.9, prog: 0 },
      { key: 'scale', val: 1.03, prog: 0.7 },
      { key: 'scale', val: 1, prog: 1 },

      // SkewX: subtle skew during overshoot
      { key: 'skewX', val: 0, prog: 0 },
      { key: 'skewX', val: -params.skewAmount, prog: 0.7 },
      { key: 'skewX', val: 0, prog: 1 },

      // Drop-shadow: strong during motion, fade to none at settle
      {
        key: 'filter:drop-shadow',
        val: '0 10px 25px rgba(0,0,0,0.1)',
        prog: 0,
      },
      {
        key: 'filter:drop-shadow',
        val: '0 10px 25px rgba(0,0,0,0.1)',
        prog: 0.7,
      },
      { key: 'filter:drop-shadow', val: '0 0px 0px rgba(0,0,0,0)', prog: 1 },

      // Opacity: fade in quickly at the start
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.2 },
    ],
  };

  const effect = {
    id: effectId,
    componentId: 'generic' as const,
    data: magneticEffect,
  };

  // Create text atom
  const textAtom: RenderableComponentData = {
    id: textElementId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: fontWeight,
        color: params.textColor,
        transformOrigin: 'center',
        backfaceVisibility: 'hidden',
      },
      font: {
        family: params.fontFamily,
        weights: [fontWeight],
        subsets: ['latin'],
        display: 'swap' as const,
        preload: true,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [effect],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textAtom],
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
  id: 'magnetic-settle-typography',
  title: 'Magnetic Settle Typography',
  description:
    'A minimalist typography preset featuring magnetic pull animation where text accelerates, overshoots with slight rotation, then snaps into perfect alignment with tension-like settling behavior',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'magnetic',
    'kinetic',
    'title',
    'text',
    'motion',
    'overshoot',
    'snap',
    'minimalist',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'MAGNETIC',
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#000000',
    duration: 5,
    effectDuration: 0.7,
    overshootAmount: 8,
    rotationAmount: 3,
    skewAmount: 1,
  },
};

export const magneticSettleTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
