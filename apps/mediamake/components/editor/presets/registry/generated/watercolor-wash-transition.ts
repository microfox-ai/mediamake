/**
 * WatercolorWashTransition Internal Effect Preset
 *
 * SINGLE EFFECT:
 * Creates a soft, flowing watercolor wash effect with color transitions, opacity layering,
 * scale breathing, and optional letter-spacing animation for text elements.
 *
 * Effect simulates wet brush painting with:
 * - Gradual color buildup (transparent → diluted → full saturation)
 * - Smooth opacity curve (0 → 0.3 @ 0.1 → 0.6 @ 0.5 → 1.0)
 * - Subtle scale breathing (0.98 to 1.02)
 * - Letter-spacing expansion for text (optional)
 *
 * ARRAY OF EFFECTS:
 * Returns multiple animation ranges for backgroundColor, opacity, scale, and letterSpacing.
 *
 * Advanced Usage:
 * Apply to container elements for wash background effects, or to text elements for
 * combined color, opacity, and letter-spacing animations.
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to target with the wash effect'),
  washColors: z
    .array(z.string())
    .min(2)
    .describe(
      'Array of color stops for the wash gradient (e.g., ["transparent", "rgba(255,100,100,0.3)", "#ff6b6b"])',
    ),
  washDirection: z
    .enum(['horizontal', 'vertical', 'radial'])
    .default('horizontal')
    .optional()
    .describe(
      'Direction of the wash flow - horizontal (left to right), vertical (top to bottom), or radial (center outward)',
    ),
  washSoftness: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .optional()
    .describe('Blur amount for soft edges (0-10px, default: 5)'),
  flowDuration: z
    .number()
    .positive()
    .describe('Total duration of the wash effect in seconds'),
  textSpread: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.2)
    .optional()
    .describe(
      'Letter-spacing amount for text elements (0-0.5em, default: 0.2em)',
    ),
  effectStart: z
    .number()
    .default(0)
    .optional()
    .describe('Start time of the effect relative to parent (seconds)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (defaults to wash-effect-{targetId})'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    washColors,
    washDirection = 'horizontal',
    washSoftness = 5,
    flowDuration,
    textSpread = 0.2,
    effectStart = 0,
    effectId,
  } = params;

  // Helper function to interpolate colors at different progress points
  const createColorStops = (): Array<{ val: string; prog: number }> => {
    const colorCount = washColors.length;
    const stops: Array<{ val: string; prog: number }> = [];

    washColors.forEach((color, index) => {
      const progress = index / (colorCount - 1);
      stops.push({ val: color, prog: progress });
    });

    return stops;
  };

  // Helper function to create gradient string based on direction
  const createGradient = (color: string, prog: number): string => {
    const colorStops = createColorStops();
    
    // Find the two surrounding colors for interpolation
    let startColor = washColors[0];
    let endColor = washColors[washColors.length - 1];
    
    for (let i = 0; i < colorStops.length - 1; i++) {
      if (prog >= colorStops[i].prog && prog <= colorStops[i + 1].prog) {
        startColor = colorStops[i].val;
        endColor = colorStops[i + 1].val;
        break;
      }
    }

    // Create gradient based on direction
    switch (washDirection) {
      case 'vertical':
        return `linear-gradient(180deg, ${startColor}, ${endColor})`;
      case 'radial':
        return `radial-gradient(circle, ${startColor}, ${endColor})`;
      case 'horizontal':
      default:
        return `linear-gradient(90deg, ${startColor}, ${endColor})`;
    }
  };

  // Create color animation ranges
  const backgroundColorRanges = createColorStops().map((stop) => ({
    key: 'backgroundColor' as const,
    val: stop.val,
    prog: stop.prog,
  }));

  // Create opacity ranges (specific curve: 0 → 0.3 @ 0.1 → 0.6 @ 0.5 → 1.0)
  const opacityRanges = [
    { key: 'opacity' as const, val: 0, prog: 0 },
    { key: 'opacity' as const, val: 0.3, prog: 0.1 },
    { key: 'opacity' as const, val: 0.6, prog: 0.5 },
    { key: 'opacity' as const, val: 1, prog: 1 },
  ];

  // Create scale breathing ranges (0.98 → 1.0 → 1.02 → 1.0)
  const scaleRanges = [
    { key: 'scale' as const, val: 0.98, prog: 0 },
    { key: 'scale' as const, val: 1.0, prog: 0.25 },
    { key: 'scale' as const, val: 1.02, prog: 0.5 },
    { key: 'scale' as const, val: 1.0, prog: 0.75 },
    { key: 'scale' as const, val: 0.98, prog: 1 },
  ];

  // Create letter-spacing ranges for text (0 → textSpread)
  const letterSpacingRanges = [
    { key: 'letterSpacing' as const, val: '0em', prog: 0 },
    { key: 'letterSpacing' as const, val: `${textSpread}em`, prog: 0.5 },
    { key: 'letterSpacing' as const, val: `${textSpread}em`, prog: 1 },
  ];

  // Create blur filter ranges for softness
  const filterRanges = [
    {
      key: 'filter' as const,
      val: `blur(${washSoftness}px)`,
      prog: 0,
    },
    {
      key: 'filter' as const,
      val: `blur(${washSoftness * 0.5}px)`,
      prog: 0.5,
    },
    {
      key: 'filter' as const,
      val: 'blur(0px)',
      prog: 1,
    },
  ];

  // Combine all ranges
  const allRanges = [
    ...backgroundColorRanges,
    ...opacityRanges,
    ...scaleRanges,
    ...letterSpacingRanges,
    ...filterRanges,
  ];

  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: flowDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: allRanges,
  };

  // Create effect with unique ID
  const effect = {
    id: effectId || `watercolor-wash-${targetIds.join('-')}`,
    componentId: 'generic',
    data: effectData,
  };

  return {
    output: {
      childrenData: [
        {
          id: 'watercolor-wash-effect-container',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: flowDuration,
            },
          },
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                pointerEvents: 'none' as const,
              },
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'watercolor-wash-transition',
  title: 'WatercolorWashTransition',
  description:
    'Internal effect preset that creates a soft, flowing watercolor wash effect with color transitions, opacity layering, scale breathing, and letter-spacing animation. Returns AnimationRange[] for generic effects targeting specified components. Simulates wet brush painting with gradual color buildup and soft edges.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'watercolor',
    'wash',
    'transition',
    'color',
    'opacity',
    'generic',
    'internal',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    washColors: [
      'transparent',
      'rgba(255, 107, 107, 0.3)',
      'rgba(255, 107, 107, 0.6)',
      '#ff6b6b',
    ],
    washDirection: 'horizontal',
    washSoftness: 5,
    flowDuration: 2.5,
    textSpread: 0.2,
    effectStart: 0,
  },
};

export const watercolorWashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
