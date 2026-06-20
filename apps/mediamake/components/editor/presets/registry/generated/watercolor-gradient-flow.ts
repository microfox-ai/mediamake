/**
 * WatercolorGradientFlow Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Creates flowing gradient transitions like watercolor paint mixing on paper.
 * Animates CSS gradient backgrounds with dynamic color stops that shift over time.
 * Returns an array of effects for gradient animation, background positioning, hue rotation, and optional opacity pulses.
 *
 * Features:
 * - Dynamic gradient backgrounds (linear, radial, or conic)
 * - Animated color stops that blend and flow over time
 * - Background position animation (0-200%) for flow movement
 * - Background size animation (100-150%) for zoom/breathing effect
 * - Subtle hue rotation for color variation (0-30deg)
 * - Optional rhythmic opacity waves for transparency effects
 * - Smooth, organic color mixing like wet watercolors
 *
 * Use cases:
 * - Creating living gradient backgrounds
 * - Watercolor paint mixing effects
 * - Flowing color transitions
 * - Organic ambient backgrounds
 * - Artistic overlays and color bleeds
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('IDs of components to apply watercolor gradient flow effects'),
  flowColors: z
    .array(z.string())
    .min(2)
    .describe('Array of colors to blend (minimum 2 colors)'),
  flowSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Animation rate multiplier (0.5=slow, 2=fast)'),
  gradientType: z
    .enum(['linear', 'radial', 'conic'])
    .default('linear')
    .describe('Type of gradient to create'),
  mixingIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('How much colors blend (0=discrete, 1=fully mixed)'),
  pulseEnabled: z
    .boolean()
    .default(false)
    .describe('Adds rhythmic opacity waves'),
  effectStart: z.number().default(0).describe('Start time of effects (relative)'),
  effectDuration: z.number().describe('Duration of effects'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate gradient stops with dynamic positions
  const generateGradientStops = (
    colors: string[],
    mixingIntensity: number,
  ): string[] => {
    const stops: string[] = [];
    const colorCount = colors.length;

    if (colorCount < 2) {
      return [`${colors[0]} 0%`, `${colors[0]} 100%`];
    }

    // Start and end colors at 0% and 100%
    stops.push(`${colors[0]} 0%`);
    stops.push(`${colors[colorCount - 1]} 100%`);

    // Intermediate stops based on mixing intensity
    if (mixingIntensity > 0) {
      const intermediateCount = Math.max(1, Math.floor(mixingIntensity * 4));
      
      for (let i = 1; i < colorCount; i++) {
        const position = (i / colorCount) * 100;
        stops.push(`${colors[i % colorCount]} ${position}%`);
        
        // Add blending stops between colors
        if (mixingIntensity > 0.3) {
          const blendPosition = position - (10 * mixingIntensity);
          const blendColor = colors[(i - 1) % colorCount];
          stops.push(`${blendColor} ${Math.max(0, blendPosition)}%`);
        }
      }
    }

    return stops;
  };

  // Helper function to create gradient string
  const createGradientString = (
    type: 'linear' | 'radial' | 'conic',
    stops: string[],
    angle: number = 135,
  ): string => {
    const stopsStr = stops.join(', ');
    
    switch (type) {
      case 'radial':
        return `radial-gradient(circle at center, ${stopsStr})`;
      case 'conic':
        return `conic-gradient(from ${angle}deg at center, ${stopsStr})`;
      case 'linear':
      default:
        return `linear-gradient(${angle}deg, ${stopsStr})`;
    }
  };

  const {
    targetIds,
    flowColors,
    flowSpeed,
    gradientType,
    mixingIntensity,
    pulseEnabled,
    effectStart,
    effectDuration,
    effectId,
  } = params;

  const idPrefix = effectId || `watercolor-flow-${targetIds[0]}`;

  // Calculate timing based on flow speed
  const baseDuration = effectDuration / flowSpeed;

  // Generate gradient stops
  const gradientStops = generateGradientStops(flowColors, mixingIntensity);

  // Create effects array
  const effects: any[] = [];

  // Effect 1: Gradient evolution with color stop animation
  const gradientEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: baseDuration,
    mode: 'provider',
    targetIds,
    ranges: [
      // Animate gradient with multiple keyframes for organic flow
      {
        key: 'backgroundImage',
        val: createGradientString(gradientType, gradientStops, 45),
        prog: 0,
      },
      {
        key: 'backgroundImage',
        val: createGradientString(gradientType, gradientStops, 90),
        prog: 0.25,
      },
      {
        key: 'backgroundImage',
        val: createGradientString(gradientType, gradientStops, 135),
        prog: 0.5,
      },
      {
        key: 'backgroundImage',
        val: createGradientString(gradientType, gradientStops, 180),
        prog: 0.75,
      },
      {
        key: 'backgroundImage',
        val: createGradientString(gradientType, gradientStops, 225),
        prog: 1,
      },
    ],
  };

  effects.push({
    id: `${idPrefix}-gradient`,
    componentId: 'generic',
    data: gradientEffect,
  });

  // Effect 2: Background position animation for flow movement
  const positionEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: baseDuration * 1.2,
    mode: 'provider',
    targetIds,
    ranges: [
      {
        key: 'backgroundPosition',
        val: '0% 0%',
        prog: 0,
      },
      {
        key: 'backgroundPosition',
        val: '50% 50%',
        prog: 0.33,
      },
      {
        key: 'backgroundPosition',
        val: '100% 100%',
        prog: 0.67,
      },
      {
        key: 'backgroundPosition',
        val: '200% 200%',
        prog: 1,
      },
    ],
  };

  effects.push({
    id: `${idPrefix}-position`,
    componentId: 'generic',
    data: positionEffect,
  });

  // Effect 3: Background size animation for breathing/flow
  const sizeEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: baseDuration * 0.8,
    mode: 'provider',
    targetIds,
    ranges: [
      {
        key: 'backgroundSize',
        val: '100% 100%',
        prog: 0,
      },
      {
        key: 'backgroundSize',
        val: '125% 125%',
        prog: 0.5,
      },
      {
        key: 'backgroundSize',
        val: '150% 150%',
        prog: 1,
      },
    ],
  };

  effects.push({
    id: `${idPrefix}-size`,
    componentId: 'generic',
    data: sizeEffect,
  });

  // Effect 4: Hue rotation for color variation
  const hueRotateEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: baseDuration * 1.5,
    mode: 'provider',
    targetIds,
    ranges: [
      {
        key: 'filter',
        val: 'hue-rotate(0deg)',
        prog: 0,
      },
      {
        key: 'filter',
        val: 'hue-rotate(15deg)',
        prog: 0.5,
      },
      {
        key: 'filter',
        val: 'hue-rotate(30deg)',
        prog: 1,
      },
    ],
  };

  effects.push({
    id: `${idPrefix}-hue`,
    componentId: 'generic',
    data: hueRotateEffect,
  });

  // Effect 5: Optional opacity pulse
  if (pulseEnabled) {
    const pulseEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: effectStart,
      duration: baseDuration * 0.6,
      mode: 'provider',
      targetIds,
      ranges: [
        {
          key: 'opacity',
          val: 0.85,
          prog: 0,
        },
        {
          key: 'opacity',
          val: 1,
          prog: 0.25,
        },
        {
          key: 'opacity',
          val: 0.9,
          prog: 0.5,
        },
        {
          key: 'opacity',
          val: 1,
          prog: 0.75,
        },
        {
          key: 'opacity',
          val: 0.85,
          prog: 1,
        },
      ],
    };

    effects.push({
      id: `${idPrefix}-pulse`,
      componentId: 'generic',
      data: pulseEffect,
    });
  }

  // Return effects in a container structure
  const rootContainer: RenderableComponentData = {
    id: 'watercolor-gradient-flow-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects,
    childrenData: [],
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
  id: 'watercolor-gradient-flow',
  title: 'WatercolorGradientFlow',
  description:
    'Internal effect preset that creates flowing gradient transitions like watercolor paint mixing on paper. Animates CSS gradient backgrounds with dynamic color stops, background-position, background-size, hue rotation, and optional opacity pulses to simulate wet colors merging with smooth, organic transitions.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'gradient', 'watercolor', 'flow', 'blend', 'organic'],
  defaultInputParams: {
    targetIds: ['component-1'],
    flowColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'],
    flowSpeed: 1,
    gradientType: 'linear',
    mixingIntensity: 0.5,
    pulseEnabled: false,
    effectStart: 0,
    effectDuration: 10,
  },
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const watercolorGradientFlowPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
