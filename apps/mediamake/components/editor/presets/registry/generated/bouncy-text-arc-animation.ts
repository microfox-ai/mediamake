/**
 * Playful Bouncy Text Arc Animation Preset
 *
 * This preset creates a joyful bouncy text animation where individual words follow
 * smooth curved arc paths, like text bouncing along a rainbow. Each word hops from
 * point to point along an invisible bezier curve, with staggered timing creating
 * a wave-like cascade effect.
 *
 * Features:
 * - **Curved Arc Paths**: Words follow mathematically smooth quadratic bezier trajectories
 * - **Squash-and-Stretch**: Subtle compression on impact and stretching during arc
 * - **Spring-Like Easing**: Natural bounce motion with spring physics
 * - **Wave Cascade**: Staggered delays create wave-like motion across words
 * - **Secondary Animation**: Synchronized scale and rotation enhance playfulness
 * - **8-10 Keyframe Interpolation**: Ensures smooth curve interpolation
 *
 * Use cases:
 * - Children's animated title sequences
 * - Playful brand intros
 * - Fun social media content
 * - Joyful text reveals
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
} from '@microfox/datamotion';

// ==================== PARAMS SCHEMA ====================

const presetParams = z.object({
  text: z.string().describe('The text to animate (will be split into words)'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size for the text in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z
    .string()
    .default('#FF6B6B')
    .optional()
    .describe('Color of the text (CSS color value)'),
  arcHeight: z
    .number()
    .min(50)
    .max(500)
    .default(150)
    .optional()
    .describe('Height of the bounce arc in pixels'),
  horizontalSpacing: z
    .number()
    .min(50)
    .max(300)
    .default(120)
    .optional()
    .describe('Horizontal spacing between word landing positions in pixels'),
  wordStagger: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .optional()
    .describe('Time delay between each word starting its animation in seconds'),
  wordDuration: z
    .number()
    .min(1)
    .max(3)
    .default(1.75)
    .optional()
    .describe('Duration of each word bounce animation in seconds'),
  totalDuration: z
    .number()
    .min(2)
    .max(20)
    .default(5)
    .optional()
    .describe('Total duration of the preset animation in seconds'),
});

// ==================== PRESET EXECUTION ====================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.fontFamily || 'Inter';
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
  } else {
    fontStyle.fontWeight = 700; // Default bold
  }

  // Split text into words
  const words = params.text.trim().split(/\s+/);
  const wordCount = words.length;

  // Calculate bezier curve points for smooth arc
  const calculateBezierArc = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    arcHeight: number,
    numPoints: number,
  ): Array<{ x: number; y: number }> => {
    // Quadratic bezier: P(t) = (1-t)²*P0 + 2(1-t)t*P1 + t²*P2
    const p0 = { x: startX, y: startY };
    const p1 = { x: (startX + endX) / 2, y: startY - arcHeight }; // Control point
    const p2 = { x: endX, y: endY };

    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < numPoints; i++) {
      const t = i / (numPoints - 1);
      const oneMinusT = 1 - t;

      const x =
        oneMinusT * oneMinusT * p0.x +
        2 * oneMinusT * t * p1.x +
        t * t * p2.x;
      const y =
        oneMinusT * oneMinusT * p0.y +
        2 * oneMinusT * t * p1.y +
        t * t * p2.y;

      points.push({ x, y });
    }

    return points;
  };

  // Generate word components with bouncy arc animations
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `word-${index}`;
    const relativeStart = index * (params.wordStagger || 0.15);

    // Calculate arc trajectory
    const startX = -50; // Start slightly off left
    const startY = 0; // Start at baseline
    const endX = index * (params.horizontalSpacing || 120); // Horizontal position
    const endY = 0; // End at baseline

    // Generate 10 keyframe points along bezier curve
    const arcPoints = calculateBezierArc(
      startX,
      startY,
      endX,
      endY,
      params.arcHeight || 150,
      10,
    );

    // Create keyframe ranges for translation
    const translateXRanges = arcPoints.map((point, i) => ({
      key: 'translateX',
      val: point.x,
      prog: i / (arcPoints.length - 1),
    }));

    const translateYRanges = arcPoints.map((point, i) => ({
      key: 'translateY',
      val: point.y,
      prog: i / (arcPoints.length - 1),
    }));

    // Squash and stretch effect (scale)
    // Compress on impact (start), stretch during arc (mid), normalize (end)
    const scaleRanges = [
      { key: 'scale', val: 0.9, prog: 0 }, // Squash at start
      { key: 'scale', val: 1.1, prog: 0.3 }, // Stretch early in arc
      { key: 'scale', val: 1.0, prog: 0.5 }, // Normal at peak
      { key: 'scale', val: 1.1, prog: 0.7 }, // Stretch on descent
      { key: 'scale', val: 0.9, prog: 0.9 }, // Squash before landing
      { key: 'scale', val: 1.0, prog: 1 }, // Normal at rest
    ];

    // Subtle rotation for playfulness (-5deg to 5deg)
    const rotationRanges = [
      { key: 'rotate', val: -5, prog: 0 },
      { key: 'rotate', val: 3, prog: 0.25 },
      { key: 'rotate', val: 0, prog: 0.5 },
      { key: 'rotate', val: -3, prog: 0.75 },
      { key: 'rotate', val: 0, prog: 1 },
    ];

    // Combine all animation ranges
    const effectData: GenericEffectData = {
      type: 'spring', // Spring easing for natural bounce
      start: 0, // Relative to word wrapper start
      duration: params.wordDuration || 1.75,
      mode: 'provider',
      targetIds: [`${wordId}-text`],
      ranges: [
        ...translateXRanges,
        ...translateYRanges,
        ...scaleRanges,
        ...rotationRanges,
      ],
    };

    const wordEffect = {
      id: `bouncy-arc-effect-${index}`,
      componentId: 'generic',
      data: effectData,
    };

    // Word wrapper layout (absolute positioned)
    const wordWrapper: RenderableComponentData = {
      id: wordId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            transformOrigin: 'center center',
          },
        },
      },
      context: {
        timing: {
          start: relativeStart, // Staggered start
          duration: params.totalDuration || 5,
        },
      },
      effects: [wordEffect],
      childrenData: [
        {
          id: `${wordId}-text`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word,
            style: {
              fontSize: `${params.fontSize || 48}px`,
              fontWeight: fontStyle.fontWeight,
              fontStyle: fontStyle.fontStyle,
              color: params.textColor || '#FF6B6B',
              whiteSpace: 'nowrap',
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.totalDuration || 5,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;

    return wordWrapper;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'bouncy-text-arc-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.totalDuration || 5,
      },
    },
    childrenData: [
      {
        id: 'word-group-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              width: `${wordCount * (params.horizontalSpacing || 120)}px`,
              height: `${(params.arcHeight || 150) * 2}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.totalDuration || 5,
          },
        },
        childrenData: wordComponents,
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

// ==================== PRESET METADATA ====================

const presetMetadata: PresetMetadata = {
  id: 'bouncy-text-arc-animation',
  title: 'Playful Bouncy Text Arc Animation',
  description:
    'A joyful text animation where individual words follow smooth quadratic bezier curve paths with spring-like bounce physics. Each word animates along an invisible arc with staggered timing creating a wave-like cascade effect. Features squash-and-stretch at bounce points, synchronized scale and rotation effects, and mathematically smooth trajectories using 8-10 keyframe interpolation per word for organic, children\'s-title-sequence-style motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'bouncy',
    'arc',
    'playful',
    'kinetic',
    'curved-path',
    'bezier',
    'spring',
    'cascade',
    'squash-stretch',
    'children',
    'title-sequence',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Hello Wonderful World',
    fontSize: 48,
    fontFamily: 'Inter:700',
    textColor: '#FF6B6B',
    arcHeight: 150,
    horizontalSpacing: 120,
    wordStagger: 0.15,
    wordDuration: 1.75,
    totalDuration: 5,
  },
};

// ==================== EXPORT ====================

export const bouncyTextArcAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
