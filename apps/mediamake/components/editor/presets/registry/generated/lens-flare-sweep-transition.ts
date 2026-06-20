/**
 * Lens Flare Sweep Transition
 *
 * Creates a magical golden hour lens flare transition that sweeps across the frame,
 * simulating the dreamy moment when sunlight hits the camera lens during wedding photography.
 *
 * Features:
 * - Diagonal lens flare sweep with warm, soft gradient
 * - Chromatic aberration effects (red/green/blue separation) at flare edges
 * - Hexagonal bokeh shapes mimicking aperture blades
 * - Overexposure overlay during peak brightness
 * - Gentle camera shake for authentic handheld feel
 * - Smooth opacity and position animations
 *
 * Technical Details:
 * - Duration: 2 seconds total
 * - Flare: Diagonal sweep from -100% to 100% translateX
 * - Chromatic aberration: 3 color channels with slight offset
 * - Bokeh: 4 hexagonal shapes with varying sizes
 * - Camera shake: ±0.5deg rotation, ±2px translation during peak
 * - Performance optimized: Uses transforms, will-change properties
 *
 * Use Cases:
 * - Wedding video transitions
 * - Golden hour photography reveals
 * - Romantic scene transitions
 * - Cinematic lens flare effects
 * - Dreamy overexposure moments
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  duration: z
    .number()
    .default(2)
    .describe('Total duration of the lens flare transition in seconds'),
  flareIntensity: z
    .number()
    .default(0.9)
    .describe('Peak opacity of the main lens flare (0-1)'),
  overexposureIntensity: z
    .number()
    .default(0.6)
    .describe('Peak opacity of the overexposure overlay (0-1)'),
  bokehCount: z
    .number()
    .default(4)
    .describe('Number of hexagonal bokeh shapes (1-6)'),
  cameraShakeIntensity: z
    .number()
    .default(1)
    .describe('Intensity multiplier for camera shake effect (0-2)'),
  chromaticAberrationIntensity: z
    .number()
    .default(0.3)
    .describe('Intensity of chromatic aberration color channels (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    flareIntensity,
    overexposureIntensity,
    bokehCount,
    cameraShakeIntensity,
    chromaticAberrationIntensity,
  } = params;

  // Helper function to create bokeh positions
  const createBokehPositions = (count: number) => {
    const positions = [
      { top: '25%', left: '30%', size: 96 },
      { top: '45%', left: '55%', size: 64 },
      { top: '60%', left: '70%', size: 80 },
      { top: '35%', left: '75%', size: 48 },
      { top: '50%', left: '20%', size: 72 },
      { top: '70%', left: '40%', size: 56 },
    ];
    return positions.slice(0, Math.min(count, 6));
  };

  const bokehPositions = createBokehPositions(bokehCount);

  // Calculate timing keyframes
  const flareStartTime = 0.3; // Flare sweep starts at 0.3s
  const flareEndTime = 1.7; // Flare sweep ends at 1.7s
  const flarePeakStart = 0.8; // Peak brightness starts
  const flarePeakEnd = 1.2; // Peak brightness ends
  const bokehStart = 0.7; // Bokeh appears
  const bokehEnd = 1.3; // Bokeh fades
  const shakeStart = 0.5; // Camera shake starts
  const shakeEnd = 1.5; // Camera shake ends
  const overexposureStart = 0.9; // Overexposure peaks
  const overexposureEnd = 1.1; // Overexposure ends

  // Create bokeh shapes
  const bokehChildren: RenderableComponentData[] = bokehPositions.map(
    (pos, index) => ({
      id: `bokeh-${index + 1}`,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        shape: 'circle',
        color: `rgba(255, ${250 - index * 5}, ${230 - index * 10}, ${0.3 + index * 0.05})`,
        style: {
          position: 'absolute',
          width: `${pos.size}px`,
          height: `${pos.size}px`,
          top: pos.top,
          left: pos.left,
          clipPath:
            'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
          filter: `blur(${2 + index}px)`,
          mixBlendMode: 'screen',
          opacity: 0,
          willChange: 'opacity',
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
          id: `bokeh-${index + 1}-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: bokehStart,
            duration: bokehEnd - bokehStart,
            mode: 'provider',
            targetIds: [`bokeh-${index + 1}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.4 + index * 0.05, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  // Create chromatic aberration flare layers
  const chromaticFlares: RenderableComponentData[] = [
    {
      id: 'flare-red',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-[200%] h-32',
          style: {
            background: `linear-gradient(to right, transparent, rgba(255, 100, 100, ${chromaticAberrationIntensity}), transparent)`,
            opacity: 0,
            transform: 'translateX(-100%) rotate(45deg)',
            transformOrigin: 'center',
            mixBlendMode: 'screen',
            willChange: 'opacity, transform',
            top: '40%',
            left: '-50%',
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
          id: 'flare-red-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: flareStartTime,
            duration: flareEndTime - flareStartTime,
            mode: 'provider',
            targetIds: ['flare-red'],
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '100%', prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              {
                key: 'opacity',
                val: flareIntensity * chromaticAberrationIntensity,
                prog: 0.4,
              },
              {
                key: 'opacity',
                val: flareIntensity * chromaticAberrationIntensity,
                prog: 0.6,
              },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    },
    {
      id: 'flare-green',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-[200%] h-32',
          style: {
            background: `linear-gradient(to right, transparent, rgba(100, 255, 100, ${chromaticAberrationIntensity}), transparent)`,
            opacity: 0,
            transform: 'translateX(-100%) rotate(45deg)',
            transformOrigin: 'center',
            mixBlendMode: 'screen',
            willChange: 'opacity, transform',
            top: '42%',
            left: '-50%',
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
          id: 'flare-green-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: flareStartTime + 0.05,
            duration: flareEndTime - flareStartTime,
            mode: 'provider',
            targetIds: ['flare-green'],
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '100%', prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              {
                key: 'opacity',
                val: flareIntensity * chromaticAberrationIntensity,
                prog: 0.4,
              },
              {
                key: 'opacity',
                val: flareIntensity * chromaticAberrationIntensity,
                prog: 0.6,
              },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    },
    {
      id: 'flare-blue',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-[200%] h-32',
          style: {
            background: `linear-gradient(to right, transparent, rgba(100, 100, 255, ${chromaticAberrationIntensity}), transparent)`,
            opacity: 0,
            transform: 'translateX(-100%) rotate(45deg)',
            transformOrigin: 'center',
            mixBlendMode: 'screen',
            willChange: 'opacity, transform',
            top: '44%',
            left: '-50%',
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
          id: 'flare-blue-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: flareStartTime + 0.1,
            duration: flareEndTime - flareStartTime,
            mode: 'provider',
            targetIds: ['flare-blue'],
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '100%', prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              {
                key: 'opacity',
                val: flareIntensity * chromaticAberrationIntensity,
                prog: 0.4,
              },
              {
                key: 'opacity',
                val: flareIntensity * chromaticAberrationIntensity,
                prog: 0.6,
              },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    },
  ];

  // Main flare layer
  const mainFlare: RenderableComponentData = {
    id: 'flare-main',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute w-[200%] h-32',
        style: {
          background:
            'linear-gradient(to right, transparent, rgba(255, 250, 240, 0.95), transparent)',
          opacity: 0,
          transform: 'translateX(-100%) rotate(45deg)',
          transformOrigin: 'center',
          mixBlendMode: 'screen',
          willChange: 'opacity, transform',
          top: '42%',
          left: '-50%',
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
        id: 'flare-main-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: flareStartTime,
          duration: flareEndTime - flareStartTime,
          mode: 'provider',
          targetIds: ['flare-main'],
          ranges: [
            { key: 'translateX', val: '-100%', prog: 0 },
            { key: 'translateX', val: '100%', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: flareIntensity, prog: 0.4 },
            { key: 'opacity', val: flareIntensity, prog: 0.6 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Overexposure overlay
  const overexposureOverlay: RenderableComponentData = {
    id: 'overexposure-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-white',
        style: {
          mixBlendMode: 'screen',
          opacity: 0,
          willChange: 'opacity',
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
        id: 'overexposure-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: overexposureStart,
          duration: overexposureEnd - overexposureStart,
          mode: 'provider',
          targetIds: ['overexposure-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: overexposureIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Camera shake container
  const cameraShakeContainer: RenderableComponentData = {
    id: 'camera-shake-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          willChange: 'transform',
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
        id: 'camera-shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: shakeStart,
          duration: shakeEnd - shakeStart,
          mode: 'provider',
          targetIds: ['camera-shake-container'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            {
              key: 'rotate',
              val: 0.5 * cameraShakeIntensity,
              prog: 0.25,
            },
            {
              key: 'rotate',
              val: -0.4 * cameraShakeIntensity,
              prog: 0.5,
            },
            {
              key: 'rotate',
              val: 0.3 * cameraShakeIntensity,
              prog: 0.75,
            },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'translateX', val: 0, prog: 0 },
            {
              key: 'translateX',
              val: 2 * cameraShakeIntensity,
              prog: 0.25,
            },
            {
              key: 'translateX',
              val: -1.5 * cameraShakeIntensity,
              prog: 0.5,
            },
            {
              key: 'translateX',
              val: 1 * cameraShakeIntensity,
              prog: 0.75,
            },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            {
              key: 'translateY',
              val: -2 * cameraShakeIntensity,
              prog: 0.25,
            },
            {
              key: 'translateY',
              val: 1.5 * cameraShakeIntensity,
              prog: 0.5,
            },
            {
              key: 'translateY',
              val: -1 * cameraShakeIntensity,
              prog: 0.75,
            },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      overexposureOverlay,
      ...chromaticFlares,
      mainFlare,
      {
        id: 'bokeh-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: bokehChildren,
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'lens-flare-sweep-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [cameraShakeContainer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'lens-flare-sweep-transition',
  title: 'Lens Flare Sweep Transition',
  description:
    'A dreamy golden hour lens flare transition inspired by wedding photography. Features a diagonal light sweep with soft warm tones, hexagonal bokeh shapes mimicking aperture blades, subtle chromatic aberration at flare edges, and gentle handheld camera shake. The flare creeps in from a corner, sweeps across the frame with temporary overexposure, then reveals the next scene.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'lens-flare',
    'wedding',
    'golden-hour',
    'cinematic',
    'dreamy',
    'bokeh',
    'chromatic-aberration',
    'camera-shake',
    'overexposure',
  ],
  defaultInputParams: {
    duration: 2,
    flareIntensity: 0.9,
    overexposureIntensity: 0.6,
    bokehCount: 4,
    cameraShakeIntensity: 1,
    chromaticAberrationIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const lensFlareSweepTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
