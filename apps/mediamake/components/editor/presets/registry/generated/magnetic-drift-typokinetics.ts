/**
 * Magnetic Drift Typokinetics Preset
 *
 * This preset creates a kinetic typography effect where text appears to be pulled
 * horizontally by an invisible magnetic force with varying intensity. The movement
 * pattern simulates iron filings being drawn across paper by a magnet underneath,
 * with slow-fast-slow acceleration through the middle.
 *
 * Features:
 * - **Magnetic Force Simulation**: Text drifts horizontally with acceleration/deceleration
 * - **Stick Points**: Momentary resistance points where text slows or pauses
 * - **Rotation Wobble**: Subtle rotation during sticky moments (tension effect)
 * - **Scale Pulse**: Tension effect via subtle scale changes at stick points
 * - **Thin Typography**: Elegant Lato 100 weight for delicate aesthetic
 * - **Custom Easing**: Spring easing for wobble, ease-in-out for smooth drift
 *
 * Use cases:
 * - Creating magnetic pull effects for titles
 * - Building tension through stuck/released motion
 * - Adding dynamic kinetic typography with physics feel
 * - Creating abstract horizontal drift animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  TextAtomData,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display with magnetic drift effect'),
  duration: z
    .number()
    .min(1)
    .default(5)
    .describe('Duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  driftIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for magnetic drift distance'),
  wobbleIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for rotation wobble during stick points'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Lato:100", "Roboto:300")',
    ),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const fontString = params.font || 'Lato:100';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font weight and style from font string
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

  const textId = 'magnetic-drift-text';

  // Calculate drift distances based on intensity
  const baseDrift = 30;
  const driftStart = baseDrift * params.driftIntensity;
  const driftStick1 = 25 * params.driftIntensity;
  const driftStick2 = 20 * params.driftIntensity;
  const driftCenter = 0;
  const driftStick3 = -20 * params.driftIntensity;
  const driftStick4 = -25 * params.driftIntensity;
  const driftEnd = -30 * params.driftIntensity;

  // Calculate wobble rotation based on intensity
  const wobbleMax = 2 * params.wobbleIntensity;
  const wobbleMin = -2 * params.wobbleIntensity;

  // Magnetic drift effect with custom keyframes
  const magneticDriftEffect: GenericEffectData = {
    type: 'ease-in-out', // Smooth sections use ease-in-out
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // TranslateX: Horizontal magnetic drift with acceleration/deceleration
      { key: 'translateX', val: driftStart, prog: 0 }, // Start: far right
      { key: 'translateX', val: driftStick1, prog: 0.3 }, // First stick point
      { key: 'translateX', val: driftStick2, prog: 0.4 }, // Resistance zone 1
      { key: 'translateX', val: driftCenter, prog: 0.5 }, // Center: fastest point
      { key: 'translateX', val: driftStick3, prog: 0.6 }, // Resistance zone 2
      { key: 'translateX', val: driftStick4, prog: 0.7 }, // Second stick point
      { key: 'translateX', val: driftEnd, prog: 1 }, // End: far left

      // Rotate: Wobble during stick points (0.3-0.4 and 0.6-0.7)
      { key: 'rotate', val: 0, prog: 0 }, // No rotation at start
      { key: 'rotate', val: wobbleMin, prog: 0.3 }, // Wobble left at first stick
      { key: 'rotate', val: wobbleMax, prog: 0.35 }, // Wobble right
      { key: 'rotate', val: 0, prog: 0.4 }, // Return to neutral
      { key: 'rotate', val: 0, prog: 0.6 }, // No rotation before second stick
      { key: 'rotate', val: wobbleMax, prog: 0.65 }, // Wobble right at second stick
      { key: 'rotate', val: wobbleMin, prog: 0.7 }, // Wobble left
      { key: 'rotate', val: 0, prog: 1 }, // Return to neutral at end

      // Scale: Pulse at stick points for tension effect
      { key: 'scale', val: 1, prog: 0 }, // Normal scale at start
      { key: 'scale', val: 0.97, prog: 0.3 }, // Compress at first stick
      { key: 'scale', val: 1, prog: 0.4 }, // Return to normal
      { key: 'scale', val: 1, prog: 0.6 }, // Normal before second stick
      { key: 'scale', val: 0.97, prog: 0.7 }, // Compress at second stick
      { key: 'scale', val: 1, prog: 1 }, // Return to normal at end
    ],
  };

  // Construct text atom with font and styling
  const textAtomData: TextAtomData = {
    text: params.text,
    className: 'font-extralight tracking-wide',
    style: {
      fontSize: params.fontSize,
      color: params.textColor,
      willChange: 'transform',
      backfaceVisibility: 'hidden',
      ...fontStyle,
    },
    font: {
      family: fontFamily,
      weights: fontStyle.fontWeight
        ? [fontStyle.fontWeight.toString()]
        : ['100'],
      subsets: ['latin'],
      display: 'swap',
      preload: true,
    },
  };

  // Text atom component
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: textAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'magnetic-drift-effect',
        componentId: 'generic',
        data: magneticDriftEffect,
      },
    ],
  };

  // Root container with centered layout
  const rootContainer: RenderableComponentData = {
    id: 'magnetic-drift-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textComponent],
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
  id: 'magnetic-drift-typokinetics',
  title: 'Magnetic Drift Typokinetics',
  description:
    'A kinetic typography preset where text appears to be pulled horizontally by an invisible magnetic force with varying intensity. Features slow-fast-slow acceleration pattern simulating iron filings being drawn by a magnet, momentary sticky pauses with rotation wobble as if encountering resistance, and subtle scale pulses creating tension. Thin elegant Lato typography contrasts with dynamic motion for visual interest.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'magnetic',
    'drift',
    'horizontal',
    'motion',
    'tension',
    'wobble',
    'physics',
    'elegant',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'MAGNETIC PULL',
    duration: 5,
    fontSize: 64,
    textColor: '#FFFFFF',
    driftIntensity: 1,
    wobbleIntensity: 1,
    font: 'Lato:100',
  },
};

// Export preset
export const magneticDriftTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
