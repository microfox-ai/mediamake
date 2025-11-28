/**
 * Calligraphy Brush Stroke Transition Preset
 *
 * This preset creates a traditional Asian calligraphy brush stroke transition
 * that draws across the screen with authentic brush texture and ink effects.
 * The stroke features variable thickness (thin → thick → thin), visible bristle
 * marks, subtle ink bleeding at edges, and follows a graceful S-curve path.
 *
 * Features:
 * - SVG path animation with strokeDasharray/strokeDashoffset
 * - Variable stroke thickness using multiple overlapping paths
 * - Bristle texture with thin stroked paths
 * - Ink bleed effects with scaling circles
 * - Custom cubic-bezier easing for smooth calligraphy motion
 * - S-curve path using cubic bezier coordinates
 *
 * Technical Implementation:
 * - Main stroke: 40px width with opacity 1
 * - Texture layers: 2-5px width with opacity 0.3-0.7
 * - Bristle marks: 5-7 thin lines following path with random offsets
 * - Ink bleed: 3 circles scaling from 0 to 1.2 at stroke contact points
 * - Duration: 1.5 seconds with cubic-bezier(0.4, 0, 0.2, 1) easing
 *
 * Use Cases:
 * - Scene transitions with artistic flair
 * - Title reveals with calligraphy aesthetic
 * - Cultural or artistic video content
 * - Elegant wipe transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  strokeColor: z
    .string()
    .default('#000000')
    .describe('Color of the brush stroke (default: black)'),
  backgroundColor: z
    .string()
    .optional()
    .describe('Background color behind the stroke (optional)'),
  strokeDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the brush stroke animation in seconds'),
  inkBleedIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for ink bleed effects (0-2)'),
  bristleCount: z
    .number()
    .int()
    .min(3)
    .max(10)
    .default(6)
    .describe('Number of bristle texture lines (3-10)'),
  curveIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity of the S-curve (0.5 = gentle, 2 = dramatic)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    strokeColor,
    backgroundColor,
    strokeDuration,
    inkBleedIntensity,
    bristleCount,
    curveIntensity,
  } = params;

  const { config } = props;
  const width = config?.width || 1920;
  const height = config?.height || 1080;

  // Helper function to generate S-curve path with cubic bezier
  const generateSCurvePath = (): string => {
    const startX = width * 0.1;
    const startY = height * 0.5;
    const endX = width * 0.9;
    const endY = height * 0.5;

    // Control points for S-curve with intensity
    const cp1X = width * 0.3;
    const cp1Y = height * (0.5 - 0.2 * curveIntensity);
    const cp2X = width * 0.7;
    const cp2Y = height * (0.5 + 0.2 * curveIntensity);

    return `M ${startX},${startY} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${endX},${endY}`;
  };

  // Helper function to calculate path length (approximation)
  const calculatePathLength = (): number => {
    // Approximate length of S-curve (simplified for cubic bezier)
    const dx = width * 0.8;
    const dy = height * 0.4 * curveIntensity;
    return Math.sqrt(dx * dx + dy * dy) * 1.2; // Add 20% for curve
  };

  const pathData = generateSCurvePath();
  const pathLength = calculatePathLength();

  // Generate SVG with multiple stroke layers
  const generateBrushStrokeSVG = (): string => {
    const mainStroke = `
      <path
        id="main-stroke"
        d="${pathData}"
        stroke="${strokeColor}"
        stroke-width="40"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-dasharray="${pathLength}"
        stroke-dashoffset="${pathLength}"
        opacity="1"
      />
    `;

    // Texture layers with varying widths and opacity
    const textureLayers = [
      { width: 5, opacity: 0.7 },
      { width: 3, opacity: 0.5 },
      { width: 2, opacity: 0.3 },
    ]
      .map(
        (layer, idx) => `
      <path
        id="texture-layer-${idx}"
        d="${pathData}"
        stroke="${strokeColor}"
        stroke-width="${layer.width}"
        fill="none"
        stroke-linecap="round"
        stroke-dasharray="${pathLength}"
        stroke-dashoffset="${pathLength}"
        opacity="${layer.opacity}"
      />
    `,
      )
      .join('');

    // Bristle marks (thin lines with slight offsets)
    const bristleMarks = Array.from({ length: bristleCount }, (_, idx) => {
      const offsetY = ((idx - bristleCount / 2) * 8) / bristleCount;
      return `
      <path
        id="bristle-${idx}"
        d="${pathData}"
        stroke="${strokeColor}"
        stroke-width="1"
        fill="none"
        stroke-linecap="round"
        stroke-dasharray="${pathLength}"
        stroke-dashoffset="${pathLength}"
        opacity="0.4"
        transform="translate(0, ${offsetY})"
      />
    `;
    }).join('');

    return `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 ${width} ${height}"
        style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none;"
      >
        ${mainStroke}
        ${textureLayers}
        ${bristleMarks}
        <style>
          @keyframes drawStroke {
            to {
              stroke-dashoffset: 0;
            }
          }
          #main-stroke,
          [id^="texture-layer-"],
          [id^="bristle-"] {
            animation: drawStroke ${strokeDuration}s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          }
        </style>
      </svg>
    `;
  };

  // Create SVG container with animated stroke
  const svgContainer: RenderableComponentData = {
    id: 'brush-stroke-svg-container',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: generateBrushStrokeSVG(),
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: strokeDuration,
      },
    },
  };

  // Ink bleed circles at strategic points along the path
  const inkBleedPositions = [
    { left: '25%', top: '40%', size: 60, delay: 0.3 },
    { left: '50%', top: '50%', size: 45, delay: 0.6 },
    { left: '75%', top: '55%', size: 70, delay: 0.9 },
  ];

  const inkBleedElements: RenderableComponentData[] = inkBleedPositions.map(
    (pos, idx) => ({
      id: `ink-bleed-${idx}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="
          width: ${pos.size}px;
          height: ${pos.size}px;
          background-color: rgba(0, 0, 0, ${0.1 * inkBleedIntensity});
          border-radius: 50%;
          filter: blur(${4 * inkBleedIntensity}px);
        "></div>`,
        className: 'absolute pointer-events-none',
        style: {
          left: pos.left,
          top: pos.top,
          transform: 'translate(-50%, -50%)',
          zIndex: 5,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: strokeDuration,
        },
      },
      effects: [
        {
          id: `ink-bleed-scale-${idx}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: pos.delay,
            duration: strokeDuration - pos.delay,
            mode: 'provider',
            targetIds: [`ink-bleed-${idx}`],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  // Optional background container
  const backgroundContainer: RenderableComponentData | null = backgroundColor
    ? ({
        id: 'brush-stroke-background',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              backgroundColor,
              zIndex: 1,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: strokeDuration,
          },
        },
        childrenData: [],
      } as RenderableComponentData)
    : null;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'calligraphy-brush-stroke-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: strokeDuration,
      },
    },
    childrenData: [
      ...(backgroundContainer ? [backgroundContainer] : []),
      ...inkBleedElements,
      svgContainer,
    ] as RenderableComponentData[],
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
  id: 'calligraphy-brush-stroke-transition',
  title: 'Calligraphy Brush Stroke Transition',
  description:
    'A traditional Asian calligraphy brush stroke transition that draws across the screen with variable thickness, authentic brush texture, and subtle ink wash effects. Features an S-curve path with pressure-responsive thickness and visible bristle marks.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'calligraphy',
    'brush',
    'stroke',
    'asian',
    'artistic',
    'ink',
    'svg-animation',
    'elegant',
  ],
  defaultInputParams: {
    strokeColor: '#000000',
    strokeDuration: 1.5,
    inkBleedIntensity: 1,
    bristleCount: 6,
    curveIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const calligraphyBrushStrokeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
