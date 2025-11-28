/**
 * Swiss Typokinetics Focus Pull Preset
 *
 * A minimalist Swiss typography-inspired preset featuring a single word gliding horizontally
 * across the screen with mathematical precision. Implements a cinematic depth-of-field effect
 * where the word sharpens into focus at screen center and blurs on exit, mimicking a
 * cinematographic focus pull.
 *
 * Features:
 * - **Linear Horizontal Movement**: Constant velocity motion from -120% to 120% over 8-10 seconds
 * - **Depth of Field Effect**: Blur (3px → 0px → 3px) synchronized with screen position
 * - **Breathing Letter Spacing**: Contracts from 0.3em → 0.1em → 0.3em at focal point
 * - **Dynamic Drop Shadow**: Shadow angle shifts based on word position (simulating fixed light source)
 * - **Opacity Ramping**: Subtle fade in/out (0.7 → 1 → 0.7) for smooth entry/exit
 * - **GPU Acceleration**: Uses transform3d for smooth performance
 *
 * Use cases:
 * - Minimalist typography animations
 * - Swiss design-inspired motion graphics
 * - Cinematic text reveals
 * - Modern typographic title sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PRESET PARAMETERS
// ============================================================================

const presetParams = z.object({
  word: z
    .string()
    .default('PRECISION')
    .describe('The word to display (single word for best effect)'),
  duration: z
    .number()
    .min(6)
    .max(15)
    .default(9)
    .describe('Duration of the animation in seconds (8-10s recommended)'),
  fontSize: z
    .number()
    .min(40)
    .max(200)
    .default(80)
    .describe('Font size in pixels'),
  font: z
    .string()
    .default('Inter:300')
    .describe(
      'Font family with weight (e.g., "Inter:300", "Helvetica:200", "Roboto:300")',
    ),
  textColor: z
    .string()
    .default('#000000')
    .describe('Text color (hex or CSS color value)'),
  backgroundColor: z
    .string()
    .default('#ffffff')
    .describe('Background color (hex or CSS color value)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const fontString = params.font || 'Inter:300';
  const fontParts = fontString.split(':');
  const fontFamily = fontParts[0];
  const fontWeight = fontParts.length > 1 ? parseInt(fontParts[1], 10) : 300;

  // Component IDs
  const textId = 'typokinetics-text';
  const containerId = 'typokinetics-root';

  // ============================================================================
  // EFFECTS CONFIGURATION
  // ============================================================================

  // Effect 1: Horizontal Translation (linear, constant velocity)
  const translateEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'translateX', val: '-120%', prog: 0 },
      { key: 'translateX', val: '120%', prog: 1 },
    ],
  };

  // Effect 2: Blur (depth of field - sharp focus at center)
  const blurEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'blur', val: 3, prog: 0 },
      { key: 'blur', val: 0, prog: 0.5 }, // Sharp focus at screen center
      { key: 'blur', val: 3, prog: 1 },
    ],
  };

  // Effect 3: Letter Spacing (breathing effect)
  const letterSpacingEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'letterSpacing', val: '0.3em', prog: 0 },
      { key: 'letterSpacing', val: '0.1em', prog: 0.5 }, // Contracts at center
      { key: 'letterSpacing', val: '0.3em', prog: 1 },
    ],
  };

  // Effect 4: Text Shadow (shifting light source)
  const textShadowEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      {
        key: 'textShadow',
        val: '2px 2px 4px rgba(0,0,0,0.2)',
        prog: 0,
      }, // Light from left
      {
        key: 'textShadow',
        val: '0px 4px 4px rgba(0,0,0,0.15)',
        prog: 0.5,
      }, // Direct overhead
      {
        key: 'textShadow',
        val: '-2px 2px 4px rgba(0,0,0,0.2)',
        prog: 1,
      }, // Light from right
    ],
  };

  // Effect 5: Opacity Ramp (subtle entry/exit)
  const opacityEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'opacity', val: 0.7, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.5 }, // Full opacity at center
      { key: 'opacity', val: 0.7, prog: 1 },
    ],
  };

  // ============================================================================
  // COMPONENT TREE
  // ============================================================================

  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.word.toUpperCase(),
      className: 'absolute whitespace-nowrap',
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: fontWeight,
        color: params.textColor,
        textTransform: 'uppercase' as const,
        willChange: 'transform, filter, opacity',
        top: '50%',
        transform: 'translateY(-50%)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
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
    effects: [
      {
        id: 'translate-effect',
        componentId: 'generic',
        data: translateEffect,
      },
      {
        id: 'blur-effect',
        componentId: 'generic',
        data: blurEffect,
      },
      {
        id: 'letter-spacing-effect',
        componentId: 'generic',
        data: letterSpacingEffect,
      },
      {
        id: 'text-shadow-effect',
        componentId: 'generic',
        data: textShadowEffect,
      },
      {
        id: 'opacity-effect',
        componentId: 'generic',
        data: opacityEffect,
      },
    ],
  };

  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center w-full h-full',
        style: {
          backgroundColor: params.backgroundColor,
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textAtom] as RenderableComponentData[],
  };

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
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
  id: 'swiss-typokinetics-focus-pull',
  title: 'Swiss Typokinetics Focus Pull',
  description:
    'A minimalist Swiss typography-inspired preset featuring a single word gliding horizontally across the screen with mathematical precision. Implements a cinematic depth-of-field effect where the word sharpens into focus at center and blurs on exit. Features synchronized letter-spacing breathing effect and subtle opacity ramping.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'swiss-design',
    'minimalist',
    'focus-pull',
    'depth-of-field',
    'cinematic',
    'linear-motion',
    'text',
    'modern',
  ],
  dependencies: {},
  defaultInputParams: {
    word: 'PRECISION',
    duration: 9,
    fontSize: 80,
    font: 'Inter:300',
    textColor: '#000000',
    backgroundColor: '#ffffff',
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const swissTypokinetticsFocusPullPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
