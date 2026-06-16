/**
 * Typokinetics Wave Follow-Through Preset
 *
 * This preset creates a wave-like character animation where each letter enters
 * with momentum, overshoots slightly, and settles into place with a subtle bounce.
 * The effect mimics dropping letters into water and watching ripples propagate.
 *
 * Features:
 * - Character-level splitting and animation
 * - Staggered delays for wave propagation effect
 * - Elastic follow-through motion with spring easing
 * - Multi-property animation (translateY, scale, rotate, opacity)
 * - GPU-accelerated transforms with will-change optimization
 * - Configurable timing and intensity
 *
 * Use cases:
 * - Title sequences with dramatic character reveals
 * - Dynamic text intros with organic motion
 * - Kinetic typography for editorial content
 * - Animated headlines with fluid motion
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  TextAtomData,
  GenericEffectData,
  BaseEffect,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to animate with wave follow-through effect'),
  duration: z
    .number()
    .min(0.1)
    .max(30)
    .default(3)
    .describe('Total duration for the animation sequence in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.05)
    .describe('Delay between each character animation in seconds'),
  characterDuration: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.8)
    .describe('Duration of each character animation in seconds'),
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(72)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700", "Roboto:600")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  translateYStart: z
    .number()
    .default(30)
    .describe('Initial vertical offset in pixels (characters enter from below)'),
  scaleStart: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.2)
    .describe('Initial scale value (>1 for overshoot effect)'),
  rotateStart: z
    .number()
    .default(-5)
    .describe('Initial rotation in degrees'),
  opacityStart: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Initial opacity value'),
  alignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Text alignment'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
      }
    }

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.fontFamily);

  // Split text into characters
  const characters = params.text.split('');

  // Calculate alignment class
  const alignmentClass =
    params.alignment === 'left'
      ? 'justify-start'
      : params.alignment === 'right'
        ? 'justify-end'
        : 'justify-center';

  // Generate character components with effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const characterId = `char-${index}`;
      const effectId = `wave-effect-${index}`;

      // Calculate staggered start time for this character
      const characterStart = index * params.staggerDelay;

      // Create wave follow-through effect
      const waveEffect: BaseEffect = {
        id: effectId,
        componentId: 'generic',
        data: {
          type: 'spring', // Spring easing for elastic follow-through
          start: characterStart,
          duration: params.characterDuration,
          mode: 'provider',
          targetIds: [characterId],
          ranges: [
            // TranslateY: Enter from below
            { key: 'translateY', val: params.translateYStart, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },

            // Scale: Overshoot then settle
            { key: 'scale', val: params.scaleStart, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },

            // Rotate: Slight rotation for dynamic motion
            { key: 'rotate', val: params.rotateStart, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },

            // Opacity: Fade in
            { key: 'opacity', val: params.opacityStart, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      };

      // Create character TextAtom
      return {
        id: characterId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char === ' ' ? '\u00A0' : char, // Use non-breaking space for spaces
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            display: 'inline-block',
            transformOrigin: 'center center',
            willChange: 'transform, opacity',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [waveEffect],
      } as RenderableComponentData;
    },
  );

  // Create container layout
  const rootContainer: RenderableComponentData = {
    id: 'wave-follow-through-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative overflow-hidden flex items-center ${alignmentClass} w-full h-full`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      {
        id: 'character-wrapper',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'inline-flex flex-row',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: characterComponents,
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

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
  id: 'typokinetics-wave-follow-through',
  title: 'Wave Follow-Through Typokinetics',
  description:
    'Character-level wave animation with elastic follow-through motion. Each character enters with momentum, overshoots, and settles with a subtle bounce - creating a fluid, water-ripple effect. Features GPU-accelerated transforms with translateY, scale, and rotation on individual character spans.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'wave',
    'character-animation',
    'follow-through',
    'elastic',
    'spring',
    'text',
    'title-sequence',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Wave Motion',
    duration: 3,
    staggerDelay: 0.05,
    characterDuration: 0.8,
    fontSize: 72,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    translateYStart: 30,
    scaleStart: 1.2,
    rotateStart: -5,
    opacityStart: 0.7,
    alignment: 'center',
  },
};

// Export preset
export const typokineticsWaveFollowThroughPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
