/**
 * Typokinetics Variable Weight Expansion Preset
 *
 * An advanced typokinetics preset that simulates variable font weight animation during letter expansion.
 * Creates the illusion that letters are stretching and thinning as they spread apart, starting with
 * letters compressed and bold (font-weight: 900 effect), then animating to normal weight (400)
 * while expanding outward.
 *
 * Features:
 * - **Multi-layer Variable Font Effect**: Crossfades between bold (900) and normal (400) weight layers
 *   to simulate variable font weight animation during expansion
 * - **Synchronized Horizontal Scale**: Letters start compressed (scaleX: 0.7), expand to normal (1.0),
 *   with subtle overshoot (scaleX: 1.05) before settling, creating an elastic feel
 * - **Dynamic Letter-Spacing**: Animates from compressed (-0.1em) to expanded (0.2em), proportional
 *   to the expansion phase
 * - **Subtle Vertical Scale**: Maintains visual proportions with slight scaleY animation (0.98 to 1.0)
 * - **Performance Optimized**: Uses transform-gpu, will-change on transform/opacity only, and efficient
 *   layer crossfading for smooth animations
 * - **Staggered Timing**: Each letter animates with index-based stagger (index * 0.03s) for cascading effect
 *
 * Technical Implementation:
 * - Two-layer approach: Bottom layer (font-weight-900) fades out as top layer (font-weight-400) fades in
 * - Three-phase animation: Compression release (0-0.25), expansion (0.25-0.75), settle (0.75-1.0)
 * - Total duration: 1.2s with smooth easing transitions
 * - Transform-gpu acceleration for optimal performance
 *
 * Use cases:
 * - Modern experimental typography for music videos or art projects
 * - Sophisticated title sequences with elastic motion design
 * - Brand reveals with dynamic weight-shifting typography
 * - Creative text animations for social media content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to animate with variable weight expansion effect'),
  font: z
    .string()
    .default('Inter')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:900", "Roboto:700:normal")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(80)
    .optional()
    .describe('Base font size in pixels for the text'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Color of the text (CSS color value)'),
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.2)
    .optional()
    .describe('Total duration of the animation in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.03)
    .optional()
    .describe('Delay between each letter animation start (in seconds)'),
  startScaleX: z
    .number()
    .min(0.3)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Initial horizontal scale compression factor'),
  overshootScaleX: z
    .number()
    .min(1)
    .max(1.2)
    .default(1.05)
    .optional()
    .describe('Maximum horizontal scale during overshoot phase'),
  startLetterSpacing: z
    .number()
    .min(-0.3)
    .max(0)
    .default(-0.1)
    .optional()
    .describe('Initial letter-spacing in em units (negative for compression)'),
  endLetterSpacing: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.2)
    .optional()
    .describe('Final letter-spacing in em units after expansion'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse parameters with defaults
  const text = params.text;
  const fontString = params.font || 'Inter';
  const fontSize = params.fontSize ?? 80;
  const textColor = params.textColor ?? '#FFFFFF';
  const duration = params.duration ?? 1.2;
  const staggerDelay = params.staggerDelay ?? 0.03;
  const startScaleX = params.startScaleX ?? 0.7;
  const overshootScaleX = params.overshootScaleX ?? 1.05;
  const startLetterSpacing = params.startLetterSpacing ?? -0.1;
  const endLetterSpacing = params.endLetterSpacing ?? 0.2;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
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
  const letters = text.split('');

  // Helper: Create letter component with wrapper
  const createLetterComponent = (
    letter: string,
    index: number,
    layerType: 'bold' | 'normal',
  ): RenderableComponentData => {
    const letterId = `letter-${layerType}-${index}`;
    const fontWeight = layerType === 'bold' ? 900 : 400;

    // Calculate staggered start time
    const letterStaggerStart = index * staggerDelay;

    // Create effects for this letter
    const effects: any[] = [];

    // Effect 1: Layer opacity crossfade
    // Bold layer: 1 → 0, Normal layer: 0 → 1
    const opacityEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: letterStaggerStart,
      duration: duration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        {
          key: 'opacity',
          val: layerType === 'bold' ? 1 : 0,
          prog: 0,
        },
        {
          key: 'opacity',
          val: layerType === 'bold' ? 0 : 1,
          prog: 1,
        },
      ],
    };

    effects.push({
      id: `opacity-effect-${letterId}`,
      componentId: 'generic',
      data: opacityEffect,
    });

    // Effect 2: ScaleX animation (compression → normal → overshoot → settle)
    // Phase 1 (0-0.25): Release compression (0.7 → 1.0)
    // Phase 2 (0.25-0.75): Expansion to overshoot (1.0 → 1.05)
    // Phase 3 (0.75-1.0): Settle back (1.05 → 1.0)
    const scaleXEffect: GenericEffectData = {
      type: 'spring',
      start: letterStaggerStart,
      duration: duration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        { key: 'scaleX', val: startScaleX, prog: 0 },
        { key: 'scaleX', val: 1.0, prog: 0.25 },
        { key: 'scaleX', val: overshootScaleX, prog: 0.75 },
        { key: 'scaleX', val: 1.0, prog: 1 },
      ],
    };

    effects.push({
      id: `scaleX-effect-${letterId}`,
      componentId: 'generic',
      data: scaleXEffect,
    });

    // Effect 3: ScaleY animation (subtle vertical adjustment)
    // Slightly compress vertically at start (0.98), return to normal (1.0)
    const scaleYEffect: GenericEffectData = {
      type: 'ease-out',
      start: letterStaggerStart,
      duration: duration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        { key: 'scaleY', val: 0.98, prog: 0 },
        { key: 'scaleY', val: 1.0, prog: 0.5 },
        { key: 'scaleY', val: 1.0, prog: 1 },
      ],
    };

    effects.push({
      id: `scaleY-effect-${letterId}`,
      componentId: 'generic',
      data: scaleYEffect,
    });

    // Effect 4: Letter-spacing animation
    // Start compressed (-0.1em), expand to (0.2em)
    const letterSpacingEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: letterStaggerStart,
      duration: duration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        {
          key: 'letterSpacing',
          val: `${startLetterSpacing}em`,
          prog: 0,
        },
        {
          key: 'letterSpacing',
          val: `${endLetterSpacing}em`,
          prog: 1,
        },
      ],
    };

    effects.push({
      id: `letterSpacing-effect-${letterId}`,
      componentId: 'generic',
      data: letterSpacingEffect,
    });

    // Create letter wrapper with TextAtom
    return {
      id: `letter-wrapper-${layerType}-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'inline-block relative transform-gpu origin-center',
          style: {
            willChange: 'transform, opacity',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration + letterStaggerStart,
        },
      },
      childrenData: [
        {
          id: letterId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: letter,
            style: {
              fontSize: `${fontSize}px`,
              color: textColor,
              fontWeight: fontWeight,
              display: 'inline-block',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: [fontWeight.toString()],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration + letterStaggerStart,
            },
          },
          effects: effects,
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  };

  // Create bold layer (font-weight: 900)
  const boldLayerLetters = letters.map((letter, index) =>
    createLetterComponent(letter, index, 'bold'),
  );

  // Create normal layer (font-weight: 400)
  const normalLayerLetters = letters.map((letter, index) =>
    createLetterComponent(letter, index, 'normal'),
  );

  // Calculate total duration including stagger
  const totalDuration = duration + letters.length * staggerDelay;

  // Build the composition structure
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-variable-weight-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [
          // Bold layer container (absolute, bottom layer)
          {
            id: 'bold-layer-container',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className:
                  'absolute inset-0 flex flex-row items-center justify-center',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
            childrenData: boldLayerLetters,
          } as RenderableComponentData,
          // Normal layer container (absolute, top layer)
          {
            id: 'normal-layer-container',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className:
                  'absolute inset-0 flex flex-row items-center justify-center',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
            childrenData: normalLayerLetters,
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

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
  id: 'typokinetics-variable-weight-expansion',
  title: 'Typokinetics Variable Weight Expansion',
  description:
    'Advanced typokinetics preset simulating variable font weight animation during letter expansion. Letters start compressed and bold (font-weight: 900), then animate to normal weight (400) while tracking outward. Features synchronized horizontal scale transformation with compression, expansion, and subtle overshoot, plus proportional letter-spacing animation for sophisticated elastic typography effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'variable-font',
    'weight-animation',
    'expansion',
    'elastic',
    'modern',
    'experimental',
    'text-effects',
    'motion-design',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'KINETIC',
    font: 'Inter',
    fontSize: 80,
    textColor: '#FFFFFF',
    duration: 1.2,
    staggerDelay: 0.03,
    startScaleX: 0.7,
    overshootScaleX: 1.05,
    startLetterSpacing: -0.1,
    endLetterSpacing: 0.2,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const typokineticsVariableWeightExpansionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
