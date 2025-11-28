/**
 * Typokinetics Pendulum Swing Preset
 *
 * A dramatic kinetic typography preset that treats text like a pendulum swinging through space.
 * The word swings in from the top-left corner as if suspended by an invisible string, reaching
 * its lowest point at center-bottom, then continuing its arc up to the top-right before swinging
 * back slightly in a dampened oscillation. Features natural rotation synced with swing motion,
 * dynamic scaling for depth perception (larger when closer at bottom of swing), and motion trail
 * echo effects during the fastest parts of the swing to emphasize kinetic energy.
 *
 * Features:
 * - **Pendulum Motion**: Chained keyframe effects with custom easing for realistic physics
 * - **Natural Rotation**: Text tilts left and right to maintain illusion of weight and momentum
 * - **Dynamic Scaling**: Grows larger when approaching viewer (bottom of swing), shrinks with distance
 * - **Motion Trail Effects**: 2-3 duplicate elements with decreasing opacity and slight animation delays
 * - **3D Perspective**: Subtle perspective transform on container for enhanced depth effect
 * - **Customizable Impact**: Adjustable intensity for swing amplitude and speed
 *
 * Use cases:
 * - Dramatic title reveals
 * - Impactful caption moments
 * - Kinetic typography demonstrations
 * - Attention-grabbing text animations
 * - Hypnotic pendulum motion effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to display with pendulum motion')
    .default('PENDULUM'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "BebasNeue")',
    )
    .default('Inter:700'),
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(96)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or CSS color)'),
  duration: z
    .number()
    .min(2)
    .max(20)
    .default(5)
    .describe('Total duration of the pendulum animation in seconds'),
  swingImpact: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe(
      'Impact multiplier for swing amplitude (1 = normal, 2 = extreme)',
    ),
  trailOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Base opacity for motion trail effects (0-1)'),
  enablePerspective: z
    .boolean()
    .default(true)
    .describe('Enable 3D perspective transform on container'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:700';
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

  // Calculate animation parameters with impact
  const impact = params.swingImpact;
  const duration = params.duration;

  // Base keyframe values adjusted by impact
  const translateXValues = {
    start: -40 * impact,
    center: 0,
    right: 40 * impact,
    dampenedLeft: -10 * impact,
    end: 0,
  };

  const translateYValues = {
    start: -60 * impact,
    bottom: 20 * impact,
    top: -60 * impact,
    dampenedBottom: 10 * impact,
    end: 0,
  };

  const rotateValues = {
    start: -25 * impact,
    center: 0,
    right: 25 * impact,
    dampenedLeft: -5 * impact,
    end: 0,
  };

  const scaleValues = {
    start: 0.8,
    large: 1.2,
    small: 0.8,
    dampenedLarge: 1.0,
    end: 1.0,
  };

  // Main text component ID
  const mainTextId = 'pendulum-main-text';

  // Trail text component IDs
  const trail1Id = 'pendulum-trail-1';
  const trail2Id = 'pendulum-trail-2';
  const trail3Id = 'pendulum-trail-3';

  // Shared text data
  const textData = {
    text: params.text,
    style: {
      fontSize: params.fontSize,
      color: params.textColor,
      fontWeight: fontStyle.fontWeight || 'bold',
      fontStyle: fontStyle.fontStyle || 'normal',
      transformOrigin: 'top center',
      textAlign: 'center' as const,
    },
    font: {
      family: fontFamily,
      weights: fontStyle.fontWeight
        ? [fontStyle.fontWeight.toString()]
        : ['700'],
    },
  };

  // Create main pendulum effect
  const createPendulumEffect = (
    targetId: string,
    startDelay: number = 0,
  ): GenericEffectData => {
    return {
      type: 'ease-in-out',
      start: startDelay,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // TranslateX: -40% → 0% → 40% → -10% → 0%
        { key: 'translateX', val: `${translateXValues.start}%`, prog: 0 },
        { key: 'translateX', val: `${translateXValues.center}%`, prog: 0.25 },
        { key: 'translateX', val: `${translateXValues.right}%`, prog: 0.5 },
        {
          key: 'translateX',
          val: `${translateXValues.dampenedLeft}%`,
          prog: 0.75,
        },
        { key: 'translateX', val: `${translateXValues.end}%`, prog: 1 },

        // TranslateY: -60% → 20% → -60% → 10% → 0%
        { key: 'translateY', val: `${translateYValues.start}%`, prog: 0 },
        { key: 'translateY', val: `${translateYValues.bottom}%`, prog: 0.25 },
        { key: 'translateY', val: `${translateYValues.top}%`, prog: 0.5 },
        {
          key: 'translateY',
          val: `${translateYValues.dampenedBottom}%`,
          prog: 0.75,
        },
        { key: 'translateY', val: `${translateYValues.end}%`, prog: 1 },

        // Rotate: -25deg → 0deg → 25deg → -5deg → 0deg
        { key: 'rotate', val: rotateValues.start, prog: 0 },
        { key: 'rotate', val: rotateValues.center, prog: 0.25 },
        { key: 'rotate', val: rotateValues.right, prog: 0.5 },
        { key: 'rotate', val: rotateValues.dampenedLeft, prog: 0.75 },
        { key: 'rotate', val: rotateValues.end, prog: 1 },

        // Scale: 0.8 → 1.2 → 0.8 → 1.0 → 1.0
        { key: 'scale', val: scaleValues.start, prog: 0 },
        { key: 'scale', val: scaleValues.large, prog: 0.25 },
        { key: 'scale', val: scaleValues.small, prog: 0.5 },
        { key: 'scale', val: scaleValues.dampenedLarge, prog: 0.75 },
        { key: 'scale', val: scaleValues.end, prog: 1 },
      ],
    };
  };

  // Trail components with decreasing opacity and animation delays
  const trail3Component = {
    id: trail3Id,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      ...textData,
      className: 'absolute pointer-events-none',
      style: {
        ...textData.style,
        opacity: 0.05 * params.trailOpacity,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: `pendulum-effect-${trail3Id}`,
        componentId: 'generic',
        data: createPendulumEffect(trail3Id, 0.15),
      },
    ],
  } as RenderableComponentData;

  const trail2Component = {
    id: trail2Id,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      ...textData,
      className: 'absolute pointer-events-none',
      style: {
        ...textData.style,
        opacity: 0.15 * params.trailOpacity,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: `pendulum-effect-${trail2Id}`,
        componentId: 'generic',
        data: createPendulumEffect(trail2Id, 0.1),
      },
    ],
  } as RenderableComponentData;

  const trail1Component = {
    id: trail1Id,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      ...textData,
      className: 'absolute pointer-events-none',
      style: {
        ...textData.style,
        opacity: 0.3 * params.trailOpacity,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: `pendulum-effect-${trail1Id}`,
        componentId: 'generic',
        data: createPendulumEffect(trail1Id, 0.05),
      },
    ],
  } as RenderableComponentData;

  // Main text component
  const mainTextComponent = {
    id: mainTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      ...textData,
      className: 'absolute',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: `pendulum-effect-${mainTextId}`,
        componentId: 'generic',
        data: createPendulumEffect(mainTextId, 0),
      },
    ],
  } as RenderableComponentData;

  // Root container with perspective
  const rootContainer = {
    id: 'typokinetics-pendulum-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-start justify-center',
        style: params.enablePerspective
          ? {
              perspective: '1000px',
              perspectiveOrigin: 'center center',
            }
          : undefined,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      trail3Component,
      trail2Component,
      trail1Component,
      mainTextComponent,
    ] as RenderableComponentData[],
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
  id: 'typokinetics-pendulum-swing',
  title: 'Typokinetics Pendulum Swing',
  description:
    'A dramatic kinetic typography preset that treats text like a pendulum swinging through space. The word swings in from the top-left corner as if suspended by an invisible string, reaching its lowest point at center-bottom, then continuing its arc up to the top-right before swinging back in a dampened oscillation. Features natural rotation synced with swing motion, dynamic scaling for depth perception (larger when closer at bottom of swing), and motion trail echo effects during the fastest parts of the swing to emphasize kinetic energy. Perfect for dramatic title reveals or impactful caption moments.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'pendulum',
    'swing',
    'motion',
    'text',
    'dramatic',
    'title',
    'reveal',
    'physics',
    'rotation',
    'scale',
    'trail',
    'echo',
    'depth',
    '3d',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'PENDULUM',
    font: 'Inter:700',
    fontSize: 96,
    textColor: '#FFFFFF',
    duration: 5,
    swingImpact: 1,
    trailOpacity: 0.4,
    enablePerspective: true,
  },
};

// Export preset
export const typokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
