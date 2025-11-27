/**
 * Street Racing Glitch Transition Preset
 * 
 * A raw, aggressive glitch-style transition effect embodying the underground street racing aesthetic.
 * Features corrupted video frames, digital artifacts, RGB channel separation, datamoshing effects,
 * horizontal tear lines, and aggressive frame displacement. Multiple glitch techniques layer together
 * with rapid, unpredictable timing to create a dangerous, professional-looking corruption effect.
 * 
 * Technical implementation:
 * - RGB separation using three color layers with mix-blend-screen and translateX offsets
 * - Horizontal tear lines with flickering opacity for scan line corruption
 * - Datamosh effect using stepped easing for authentic frame-skip appearance
 * - Noise overlay with rapid opacity animation
 * - Scan lines using repeating linear-gradient
 * - Frame displacement using transform skewX/Y with random values
 * - Very short duration ranges (0.02-0.05s) for authentic glitch timing
 * - All effects use mode: 'provider' with targetIds for clean DOM structure
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.5)
    .describe('Duration of the glitch transition in seconds'),
  intensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for all glitch effects'),
  rgbSplitAmount: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Amount of RGB channel separation in pixels'),
  tearLineCount: z
    .number()
    .int()
    .min(3)
    .max(10)
    .default(5)
    .describe('Number of horizontal tear lines'),
  frameDisplacementAmount: z
    .number()
    .min(1)
    .max(20)
    .default(8)
    .describe('Amount of frame skew/displacement in degrees'),
  enableNoise: z
    .boolean()
    .default(true)
    .describe('Enable digital noise overlay'),
  enableScanlines: z
    .boolean()
    .default(true)
    .describe('Enable scan line interference'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    intensity,
    rgbSplitAmount,
    tearLineCount,
    frameDisplacementAmount,
    enableNoise,
    enableScanlines,
  } = params;

  // Generate random positions for tear lines
  const generateTearPositions = (count: number): number[] => {
    const positions: number[] = [];
    for (let i = 0; i < count; i++) {
      positions.push(Math.random() * 100);
    }
    return positions.sort((a, b) => a - b);
  };

  const tearPositions = generateTearPositions(tearLineCount);

  // Create tear line components
  const createTearLines = (): RenderableComponentData[] => {
    return tearPositions.map((position, index) => {
      const height = Math.floor(Math.random() * 3) + 2; // 2-4px
      
      return {
        id: `tear-line-${index}`,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shape: 'rectangle' as const,
          color: '#000000',
          style: {
            width: '100%',
            height: `${height}px`,
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
            id: `tear-flicker-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: 0,
              duration: duration,
              mode: 'provider' as const,
              targetIds: [`tear-line-${index}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.05 },
                { key: 'opacity', val: 0, prog: 0.1 },
                { key: 'opacity', val: 1, prog: 0.15 },
                { key: 'opacity', val: 1, prog: 0.25 },
                { key: 'opacity', val: 0, prog: 0.3 },
                { key: 'opacity', val: 1, prog: 0.4 },
                { key: 'opacity', val: 0, prog: 0.5 },
                { key: 'opacity', val: 1, prog: 0.6 },
                { key: 'opacity', val: 0, prog: 0.7 },
                { key: 'opacity', val: 1, prog: 0.85 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          {
            id: `tear-shift-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: 0,
              duration: duration,
              mode: 'provider' as const,
              targetIds: [`tear-line-${index}`],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: Math.random() * 20 - 10, prog: 0.2 },
                { key: 'translateX', val: Math.random() * 30 - 15, prog: 0.4 },
                { key: 'translateX', val: Math.random() * 20 - 10, prog: 0.6 },
                { key: 'translateX', val: 0, prog: 0.8 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    });
  };

  // Create tear lines container with child props for positioning
  const tearLinesContainer: RenderableComponentData = {
    id: 'horizontal-tears-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
      childrenProps: tearPositions.map((position) => ({
        className: 'absolute left-0 right-0',
        style: {
          top: `${position}%`,
        },
      })),
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: createTearLines(),
  };

  // RGB split layers
  const rgbRedLayer: RenderableComponentData = {
    id: 'rgb-red-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: `rgba(255, 0, 0, ${0.3 * intensity})`,
          mixBlendMode: 'screen' as const,
        },
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
        id: 'rgb-red-glitch',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: duration,
          mode: 'provider' as const,
          targetIds: ['rgb-red-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.05 },
            { key: 'opacity', val: 0, prog: 0.1 },
            { key: 'opacity', val: 0.8, prog: 0.2 },
            { key: 'opacity', val: 0, prog: 0.25 },
            { key: 'opacity', val: 1, prog: 0.4 },
            { key: 'opacity', val: 0, prog: 0.5 },
            { key: 'opacity', val: 0.9, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 0.75 },
            { key: 'opacity', val: 0.8, prog: 0.9 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'translateX', val: -rgbSplitAmount * intensity, prog: 0 },
            { key: 'translateX', val: rgbSplitAmount * intensity * 0.5, prog: 0.3 },
            { key: 'translateX', val: -rgbSplitAmount * intensity * 1.2, prog: 0.6 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const rgbGreenLayer: RenderableComponentData = {
    id: 'rgb-green-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: `rgba(0, 255, 0, ${0.3 * intensity})`,
          mixBlendMode: 'screen' as const,
        },
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
        id: 'rgb-green-glitch',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: duration,
          mode: 'provider' as const,
          targetIds: ['rgb-green-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.08 },
            { key: 'opacity', val: 0, prog: 0.15 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 0.35 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 0.6 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: rgbSplitAmount * intensity * 0.3, prog: 0.25 },
            { key: 'translateX', val: -rgbSplitAmount * intensity * 0.8, prog: 0.55 },
            { key: 'translateX', val: rgbSplitAmount * intensity, prog: 0.85 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const rgbBlueLayer: RenderableComponentData = {
    id: 'rgb-blue-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: `rgba(0, 0, 255, ${0.3 * intensity})`,
          mixBlendMode: 'screen' as const,
        },
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
        id: 'rgb-blue-glitch',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: duration,
          mode: 'provider' as const,
          targetIds: ['rgb-blue-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.9, prog: 0.12 },
            { key: 'opacity', val: 0, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 0.35 },
            { key: 'opacity', val: 0, prog: 0.45 },
            { key: 'opacity', val: 0.7, prog: 0.65 },
            { key: 'opacity', val: 0, prog: 0.72 },
            { key: 'opacity', val: 1, prog: 0.88 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'translateX', val: rgbSplitAmount * intensity, prog: 0 },
            { key: 'translateX', val: -rgbSplitAmount * intensity * 0.6, prog: 0.35 },
            { key: 'translateX', val: rgbSplitAmount * intensity * 1.3, prog: 0.65 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Datamosh layer with frame displacement
  const datamoshLayer: RenderableComponentData = {
    id: 'datamosh-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: 'transparent',
        },
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
        id: 'datamosh-effect',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: duration,
          mode: 'provider' as const,
          targetIds: ['datamosh-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.1 },
            { key: 'opacity', val: 0, prog: 0.2 },
            { key: 'opacity', val: 0.4, prog: 0.4 },
            { key: 'opacity', val: 0, prog: 0.5 },
            { key: 'opacity', val: 0.5, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 1.05, prog: 0.15 },
            { key: 'scaleX', val: 0.95, prog: 0.3 },
            { key: 'scaleX', val: 1.08, prog: 0.5 },
            { key: 'scaleX', val: 0.92, prog: 0.7 },
            { key: 'scaleX', val: 1, prog: 1 },
            { key: 'skewX', val: 0, prog: 0 },
            { key: 'skewX', val: frameDisplacementAmount * intensity, prog: 0.2 },
            { key: 'skewX', val: -frameDisplacementAmount * intensity * 0.8, prog: 0.4 },
            { key: 'skewX', val: frameDisplacementAmount * intensity * 1.2, prog: 0.6 },
            { key: 'skewX', val: -frameDisplacementAmount * intensity * 0.5, prog: 0.8 },
            { key: 'skewX', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Scanlines layer
  const scanlinesLayer: RenderableComponentData = {
    id: 'scanlines-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          backgroundSize: '100% 4px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: enableScanlines
      ? [
          {
            id: 'scanlines-effect',
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: 0,
              duration: duration,
              mode: 'provider' as const,
              targetIds: ['scanlines-layer'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.1 },
                { key: 'opacity', val: 0.3, prog: 0.3 },
                { key: 'opacity', val: 0.9, prog: 0.5 },
                { key: 'opacity', val: 0.4, prog: 0.7 },
                { key: 'opacity', val: 0.8, prog: 0.9 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -4, prog: 0.5 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
        ]
      : [],
  };

  // Noise layer
  const noiseLayer: RenderableComponentData = {
    id: 'noise-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: enableNoise
      ? [
          {
            id: 'noise-effect',
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: 0,
              duration: duration,
              mode: 'provider' as const,
              targetIds: ['noise-layer'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.05 },
                { key: 'opacity', val: 0.3, prog: 0.1 },
                { key: 'opacity', val: 0.9, prog: 0.2 },
                { key: 'opacity', val: 0.4, prog: 0.3 },
                { key: 'opacity', val: 1, prog: 0.4 },
                { key: 'opacity', val: 0.5, prog: 0.5 },
                { key: 'opacity', val: 0.9, prog: 0.6 },
                { key: 'opacity', val: 0.3, prog: 0.7 },
                { key: 'opacity', val: 0.8, prog: 0.8 },
                { key: 'opacity', val: 0.4, prog: 0.9 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ]
      : [],
  };

  // Assemble all layers
  const childrenData: RenderableComponentData[] = [
    rgbRedLayer,
    rgbGreenLayer,
    rgbBlueLayer,
    tearLinesContainer,
    datamoshLayer,
  ];

  if (enableScanlines) {
    childrenData.push(scanlinesLayer);
  }

  if (enableNoise) {
    childrenData.push(noiseLayer);
  }

  const rootContainer: RenderableComponentData = {
    id: 'street-racing-glitch-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
      childrenProps: childrenData.map(() => ({
        className: 'absolute inset-0',
      })),
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData,
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
  id: 'street-racing-glitch-transition',
  title: 'Street Racing Glitch Transition',
  description:
    'A raw, aggressive glitch-style transition effect inspired by street racing video aesthetics. Features RGB channel separation, horizontal tear lines, datamoshing effects, scan line interference, and digital noise patterns. Multiple glitch techniques layer together with rapid, unpredictable timing to create a dangerous, underground racing vibe. The effect simulates corrupted video frames and digital artifacts as if an editor\'s timeline is glitching during high-speed scrubbing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'street-racing',
    'rgb-split',
    'datamosh',
    'corruption',
    'digital-artifact',
    'underground',
    'aggressive',
    'effects',
  ],
  defaultInputParams: {
    duration: 0.5,
    intensity: 1,
    rgbSplitAmount: 3,
    tearLineCount: 5,
    frameDisplacementAmount: 8,
    enableNoise: true,
    enableScanlines: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const streetRacingGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
