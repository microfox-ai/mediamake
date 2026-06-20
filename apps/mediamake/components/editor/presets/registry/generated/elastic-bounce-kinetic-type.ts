/**
 * Elastic Bounce Kinetic Type Preset
 *
 * This preset creates smooth 'elastic bounce' kinetic typography inspired by Material Design's
 * motion principles. Text stretches slightly on arrival - scaling to 100% width but 115% height
 * momentarily, then bouncing back to perfect proportions. This creates a satisfying squash-and-stretch
 * effect that feels physical and responsive.
 *
 * Features:
 * - **Squash-and-Stretch Physics**: Separate scaleX and scaleY animations for organic bounce
 * - **Rotation Wobble**: Subtle rotation from -3° to +3° to 0° for extra personality
 * - **Elastic Easing**: Custom cubic-bezier(0.68, -0.55, 0.265, 1.55) for bounce feel
 * - **Word-Level Stagger**: 0.1s stagger for word-by-word animation
 * - **Synchronized Motion**: All words' squash-stretch synchronized for cohesive effect
 * - **Opacity Fade**: Smooth fade-in over first 30% of animation
 * - **Grounded Animation**: Transform-origin: center bottom for grounded bounce
 * - **Customizable Elasticity**: Adjust overshoot intensity via parameters
 *
 * Use Cases:
 * - Playful captions and call-to-action text
 * - Interactive UI mockups with touchable text
 * - Social media content with personality
 * - Modern title cards with kinetic energy
 * - Video intros with engaging typography
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to animate with elastic bounce effect'),

  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .optional()
    .default(64)
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .optional()
    .default('#FFFFFF')
    .describe('Text color (hex, rgb, or CSS color name)'),

  duration: z
    .number()
    .min(0.1)
    .max(10)
    .optional()
    .default(3)
    .describe('Total duration of the preset in seconds'),

  wordStagger: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.1)
    .describe('Stagger delay between words in seconds'),

  bounceDuration: z
    .number()
    .min(0.1)
    .max(2)
    .optional()
    .default(0.6)
    .describe('Duration of each word bounce animation in seconds'),

  elasticity: z
    .number()
    .min(0.5)
    .max(2)
    .optional()
    .default(1)
    .describe(
      'Elasticity multiplier - adjusts overshoot intensity (1 = default, >1 = more bounce, <1 = less bounce)',
    ),

  maxScaleY: z
    .number()
    .min(1)
    .max(1.5)
    .optional()
    .default(1.15)
    .describe(
      'Maximum Y scale at peak stretch (1.15 = 115% height, adjust for more/less squash)',
    ),

  rotationIntensity: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .default(3)
    .describe('Rotation wobble intensity in degrees (3 = ±3°)'),

  position: z
    .enum(['top', 'center', 'bottom'])
    .optional()
    .default('center')
    .describe('Vertical position of text on screen'),

  alignment: z
    .enum(['left', 'center', 'right'])
    .optional()
    .default('center')
    .describe('Text alignment'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:600';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
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

  // Split text into words
  const words = params.text.trim().split(/\s+/);

  // Calculate elasticity-adjusted values
  const elasticityFactor = params.elasticity ?? 1;
  const maxScaleY = params.maxScaleY ?? 1.15;
  const adjustedMaxScaleY = 1 + (maxScaleY - 1) * elasticityFactor;
  const rotationIntensity = (params.rotationIntensity ?? 3) * elasticityFactor;

  // Create word components with elastic bounce effects
  const wordComponents = words.map((word, index) => {
    const wordId = `elastic-word-${index}`;
    const wordStartTime = index * (params.wordStagger ?? 0.1);
    const bounceDuration = params.bounceDuration ?? 0.6;

    // Calculate progress points for keyframes
    const peakProgress = 0.35; // Peak stretch at 35%
    const settleProgress = 1.0; // Settle at 100%

    // Elastic bounce effect with squash-and-stretch
    const bounceEffect: GenericEffectData = {
      type: 'ease-in-out', // We'll use custom timing via ranges
      start: wordStartTime,
      duration: bounceDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Opacity fade-in (0 to 30% of animation)
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 1 },

        // ScaleX: 0 → 1 → 1 (width animation)
        { key: 'scaleX', val: 0, prog: 0 },
        { key: 'scaleX', val: 1.0, prog: peakProgress },
        { key: 'scaleX', val: 1.0, prog: settleProgress },

        // ScaleY: 0 → 115% → 1 (height squash-and-stretch)
        { key: 'scaleY', val: 0, prog: 0 },
        { key: 'scaleY', val: adjustedMaxScaleY, prog: peakProgress },
        { key: 'scaleY', val: 1.0, prog: settleProgress },

        // Rotation wobble: 0 → -3° → +3° → 0°
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: -rotationIntensity, prog: 0.25 },
        { key: 'rotate', val: rotationIntensity, prog: 0.5 },
        { key: 'rotate', val: 0, prog: settleProgress },
      ],
    };

    const bounceEffectNode = {
      id: `elastic-bounce-effect-${index}`,
      componentId: 'generic',
      data: bounceEffect,
    };

    // Create word atom
    const wordComponent: RenderableComponentData = {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: params.fontSize ?? 64,
          color: params.textColor ?? '#FFFFFF',
          display: 'inline-block',
          transformOrigin: 'center bottom',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : { weights: ['600'] }),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration ?? 3,
        },
      },
      effects: [bounceEffectNode],
    };

    return wordComponent;
  });

  // Determine position className
  const getPositionClass = () => {
    switch (params.position) {
      case 'top':
        return 'items-start pt-20';
      case 'bottom':
        return 'items-end pb-20';
      case 'center':
      default:
        return 'items-center';
    }
  };

  // Determine alignment className
  const getAlignmentClass = () => {
    switch (params.alignment) {
      case 'left':
        return 'justify-start pl-20';
      case 'right':
        return 'justify-end pr-20';
      case 'center':
      default:
        return 'justify-center';
    }
  };

  // Create text container with flex layout
  const textContainer: RenderableComponentData = {
    id: 'elastic-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `flex flex-row flex-wrap ${getAlignmentClass()}`,
        style: {
          gap: '0.3em',
          transformOrigin: 'center bottom',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration ?? 3,
      },
    },
    childrenData: wordComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'elastic-bounce-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${getPositionClass()}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration ?? 3,
      },
    },
    childrenData: [textContainer],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'elastic-bounce-kinetic-type',
  title: 'Elastic Bounce Kinetic Type',
  description:
    "Material Design-inspired elastic bounce text animation with squash-and-stretch physics. Text arrives with a satisfying bounce - stretching to 115% height before settling to perfect proportions. Includes subtle rotation wobble (-3° to +3° to 0°) for extra personality. Perfect for playful captions, CTAs, and interactive UI mockups. Features word-level staggering, customizable elasticity, and transform-origin: center bottom for grounded bounce feel.",
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'kinetic',
    'elastic',
    'bounce',
    'squash-stretch',
    'material-design',
    'typography',
    'animated',
    'playful',
    'interactive',
    'cta',
    'title',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Elastic Bounce Text!',
    font: 'Inter:600',
    fontSize: 64,
    textColor: '#FFFFFF',
    duration: 3,
    wordStagger: 0.1,
    bounceDuration: 0.6,
    elasticity: 1,
    maxScaleY: 1.15,
    rotationIntensity: 3,
    position: 'center',
    alignment: 'center',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const elasticBounceKineticTypePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
