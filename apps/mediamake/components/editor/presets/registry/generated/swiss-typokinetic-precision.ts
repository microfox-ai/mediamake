/**
 * Swiss Typokinetic Precision Preset
 * 
 * A minimalist Swiss-style kinetic typography preset featuring mathematically precise
 * text positioning on a golden ratio grid. Text elements are revealed through animated
 * clip-path masks that expand from center points with surgical accuracy.
 * 
 * Features:
 * - Golden ratio grid system (1.618) for precise positioning
 * - Rectangular mask reveals with surgical precision
 * - Subtle baseline shifts and kerning animations
 * - Helvetica-inspired typography with clean geometric precision
 * - Absolute positioning locked to invisible grid guidelines
 * - Scene-based timing for synchronized reveals
 * 
 * Use cases:
 * - Swiss design aesthetic compositions
 * - Minimalist brand presentations
 * - Documentary-style title sequences
 * - Geometric precision typography
 * - Clean, purposeful text reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  primaryText: z
    .string()
    .default('PRECISION')
    .describe('Primary text displayed with bold weight at golden ratio position'),
  secondaryText: z
    .string()
    .default('SWISS DESIGN')
    .describe('Secondary text displayed with regular weight below primary'),
  tertiaryText: z
    .string()
    .default('GEOMETRIC ACCURACY')
    .describe('Tertiary text displayed with light weight at bottom-right'),
  duration: z
    .number()
    .default(8)
    .describe('Total scene duration in seconds'),
  revealStagger: z
    .number()
    .min(0)
    .max(2)
    .default(0.4)
    .describe('Time offset between text block reveals in seconds'),
  revealDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of clip-path reveal animation in seconds'),
  kerningDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of letter-spacing animation in seconds'),
  baselineShiftAmount: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Baseline shift amount in em units (±)'),
  baselineShiftDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Duration of baseline shift animation in seconds'),
  textColor: z
    .string()
    .default('#000000')
    .describe('Text color in hex format'),
  backgroundColor: z
    .string()
    .default('#FFFFFF')
    .describe('Background color in hex format'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    primaryText,
    secondaryText,
    tertiaryText,
    duration,
    revealStagger,
    revealDuration,
    kerningDuration,
    baselineShiftAmount,
    baselineShiftDuration,
    textColor,
    backgroundColor,
  } = params;

  // Golden ratio constant
  const goldenRatio = 1.618;

  // Calculate reveal timing for staggered effect
  const primaryStart = 0;
  const secondaryStart = revealStagger;
  const tertiaryStart = revealStagger * 2;

  // Helper function to create clip-path reveal effect
  const createClipPathReveal = (
    targetId: string,
    start: number,
  ): any => {
    return {
      id: `clip-reveal-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: start,
        duration: revealDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'clipPath', val: 'inset(50% 50% 50% 50%)', prog: 0 },
          { key: 'clipPath', val: 'inset(0% 0% 0% 0%)', prog: 1 },
        ],
      },
    };
  };

  // Helper function to create letter-spacing animation
  const createKerningAnimation = (
    targetId: string,
    start: number,
  ): any => {
    const kerningStart = start + revealDuration;
    return {
      id: `kerning-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: kerningStart,
        duration: kerningDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'letterSpacing', val: '0.05em', prog: 0 },
          { key: 'letterSpacing', val: '0.15em', prog: 0.5 },
          { key: 'letterSpacing', val: '0.1em', prog: 1 },
        ],
      },
    };
  };

  // Helper function to create baseline shift animation
  const createBaselineShift = (
    targetId: string,
    start: number,
  ): any => {
    const baselineStart = start + revealDuration + kerningDuration * 0.3;
    return {
      id: `baseline-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: baselineStart,
        duration: baselineShiftDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'translateY', val: `0em`, prog: 0 },
          { key: 'translateY', val: `${baselineShiftAmount}em`, prog: 0.3 },
          { key: 'translateY', val: `${-baselineShiftAmount * 0.5}em`, prog: 0.6 },
          { key: 'translateY', val: `0em`, prog: 1 },
        ],
      },
    };
  };

  // ============================================================================
  // PRIMARY TEXT BLOCK
  // ============================================================================

  const primaryTextId = 'primary-text';
  const primaryBlockId = 'primary-text-block';

  const primaryTextAtom: RenderableComponentData = {
    id: primaryTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: primaryText,
      className: 'font-sans',
      style: {
        fontSize: 'clamp(48px, 8vw, 120px)',
        fontWeight: 700,
        letterSpacing: '0.05em',
        lineHeight: 1,
        textTransform: 'uppercase',
        color: textColor,
      },
      font: {
        family: 'Helvetica Neue',
        weights: ['700'],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const primaryBlock: RenderableComponentData = {
    id: primaryBlockId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute overflow-hidden',
        style: {
          top: `calc(50% / ${goldenRatio})`,
          left: `calc(100% / ${goldenRatio} / ${goldenRatio})`,
          clipPath: 'inset(50% 50% 50% 50%)',
        },
      },
    },
    context: {
      timing: {
        start: primaryStart,
        duration: duration - primaryStart,
      },
    },
    effects: [
      createClipPathReveal(primaryBlockId, 0),
      createKerningAnimation(primaryTextId, 0),
      createBaselineShift(primaryTextId, 0),
    ],
    childrenData: [primaryTextAtom],
  };

  // ============================================================================
  // SECONDARY TEXT BLOCK
  // ============================================================================

  const secondaryTextId = 'secondary-text';
  const secondaryBlockId = 'secondary-text-block';

  const secondaryTextAtom: RenderableComponentData = {
    id: secondaryTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: secondaryText,
      className: 'font-sans',
      style: {
        fontSize: 'clamp(24px, 4vw, 60px)',
        fontWeight: 400,
        letterSpacing: '0.1em',
        lineHeight: 1.2,
        color: textColor,
      },
      font: {
        family: 'Helvetica Neue',
        weights: ['400'],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const secondaryBlock: RenderableComponentData = {
    id: secondaryBlockId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute overflow-hidden',
        style: {
          top: `calc(50%)`,
          left: `calc(100% / ${goldenRatio} / ${goldenRatio})`,
          clipPath: 'inset(50% 50% 50% 50%)',
        },
      },
    },
    context: {
      timing: {
        start: secondaryStart,
        duration: duration - secondaryStart,
      },
    },
    effects: [
      createClipPathReveal(secondaryBlockId, 0),
      createKerningAnimation(secondaryTextId, 0),
      createBaselineShift(secondaryTextId, 0),
    ],
    childrenData: [secondaryTextAtom],
  };

  // ============================================================================
  // TERTIARY TEXT BLOCK
  // ============================================================================

  const tertiaryTextId = 'tertiary-text';
  const tertiaryBlockId = 'tertiary-text-block';

  const tertiaryTextAtom: RenderableComponentData = {
    id: tertiaryTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: tertiaryText,
      className: 'font-sans',
      style: {
        fontSize: 'clamp(14px, 2vw, 32px)',
        fontWeight: 300,
        letterSpacing: '0.2em',
        lineHeight: 1.4,
        textTransform: 'uppercase',
        color: textColor,
      },
      font: {
        family: 'Helvetica Neue',
        weights: ['300'],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const tertiaryBlock: RenderableComponentData = {
    id: tertiaryBlockId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute overflow-hidden',
        style: {
          bottom: `calc(100% / ${goldenRatio} / ${goldenRatio})`,
          right: `calc(100% / ${goldenRatio} / ${goldenRatio})`,
          clipPath: 'inset(50% 50% 50% 50%)',
        },
      },
    },
    context: {
      timing: {
        start: tertiaryStart,
        duration: duration - tertiaryStart,
      },
    },
    effects: [
      createClipPathReveal(tertiaryBlockId, 0),
      createKerningAnimation(tertiaryTextId, 0),
      createBaselineShift(tertiaryTextId, 0),
    ],
    childrenData: [tertiaryTextAtom],
  };

  // ============================================================================
  // INVISIBLE GRID SYSTEM (OPTIONAL DEBUG)
  // ============================================================================

  const gridVertical1: RenderableComponentData = {
    id: 'grid-vertical-1',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute h-full',
        style: {
          left: `calc(100% / ${goldenRatio})`,
          width: '1px',
          backgroundColor: 'rgba(0,0,0,0.05)',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const gridVertical2: RenderableComponentData = {
    id: 'grid-vertical-2',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute h-full',
        style: {
          left: `calc(100% - (100% / ${goldenRatio}))`,
          width: '1px',
          backgroundColor: 'rgba(0,0,0,0.05)',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const gridHorizontal1: RenderableComponentData = {
    id: 'grid-horizontal-1',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute w-full',
        style: {
          top: `calc(100% / ${goldenRatio})`,
          height: '1px',
          backgroundColor: 'rgba(0,0,0,0.05)',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const gridHorizontal2: RenderableComponentData = {
    id: 'grid-horizontal-2',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute w-full',
        style: {
          top: `calc(100% - (100% / ${goldenRatio}))`,
          height: '1px',
          backgroundColor: 'rgba(0,0,0,0.05)',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const gridSystem: RenderableComponentData = {
    id: 'grid-system',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: 0, // Hidden by default
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      gridVertical1,
      gridVertical2,
      gridHorizontal1,
      gridHorizontal2,
    ],
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'swiss-typokinetic-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backgroundColor: backgroundColor,
          fontFamily: 'Helvetica, Arial, sans-serif',
          '--golden-ratio': goldenRatio.toString(),
          '--grid-unit': 'calc(100% / 8)',
        } as React.CSSProperties,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
        fitDurationTo: 'scene',
      },
    },
    childrenData: [
      gridSystem,
      primaryBlock,
      secondaryBlock,
      tertiaryBlock,
    ] as RenderableComponentData[],
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
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'swiss-typokinetic-precision',
  title: 'Swiss Typokinetic Precision',
  description:
    'A minimalist Swiss-style kinetic typography preset featuring mathematically precise text positioning on a golden ratio grid. Text elements are revealed through animated clip-path masks that expand from center points with surgical accuracy. Implements subtle kerning animations and baseline shifts while maintaining absolute geometric precision. Inspired by the Helvetica documentary aesthetic with clean, purposeful, and meticulously designed typography.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'swiss',
    'minimalist',
    'geometric',
    'kinetic',
    'precision',
    'golden-ratio',
    'helvetica',
    'documentary',
    'grid',
    'reveal',
    'clip-path',
    'kerning',
    'baseline',
  ],
  defaultInputParams: {
    primaryText: 'PRECISION',
    secondaryText: 'SWISS DESIGN',
    tertiaryText: 'GEOMETRIC ACCURACY',
    duration: 8,
    revealStagger: 0.4,
    revealDuration: 0.8,
    kerningDuration: 1.5,
    baselineShiftAmount: 0.5,
    baselineShiftDuration: 1.2,
    textColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const swissTypokineticPrecisionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};