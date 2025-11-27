/**
 * Street Racing Glitch Transition Preset
 *
 * A raw, aggressive glitch-style transition effect inspired by underground street racing aesthetics.
 * Features RGB channel separation, datamoshing simulation, horizontal tear lines, digital noise patterns,
 * scan line interference, and frame displacement. Multiple glitch techniques layered with varying
 * intensities create a dangerous, unpredictable corruption effect perfect for high-energy automotive
 * or action content.
 *
 * Technical Implementation:
 * - RGB channel separation using three identical content layers with mix-blend-screen
 * - Horizontal tears using positioned divs with flickering opacity
 * - Datamosh effect using scale and translateX with stepped easing for frame-skip appearance
 * - Noise overlay using CSS background-image with opacity animation
 * - Scan lines using repeating linear-gradient
 * - Frame displacement using skewX/Y transforms
 * - Very short duration effects (0.02-0.05s) for authentic glitch timing
 * - Performance optimized with 5-7 active layers using transform-origin and requestAnimationFrame timing
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
    .min(0.5)
    .max(10)
    .default(2)
    .describe('Total duration of the glitch transition in seconds'),
  intensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe(
      'Overall intensity multiplier for all glitch effects (0.1 = subtle, 2 = extreme)',
    ),
  rgbSplitAmount: z
    .number()
    .min(1)
    .max(10)
    .default(4)
    .describe('Maximum pixel offset for RGB channel separation'),
  tearCount: z
    .number()
    .int()
    .min(5)
    .max(30)
    .default(12)
    .describe('Number of horizontal tear lines'),
  datamoshIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Intensity of datamosh frame displacement effect'),
  noiseOpacity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.4)
    .describe('Maximum opacity for digital noise overlay'),
  scanlineOpacity: z
    .number()
    .min(0.1)
    .max(0.8)
    .default(0.3)
    .describe('Opacity of scan line overlay'),
  frameDisplacementAmount: z
    .number()
    .min(1)
    .max(20)
    .default(8)
    .describe('Maximum degree of frame skew displacement'),
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
    tearCount,
    datamoshIntensity,
    noiseOpacity,
    scanlineOpacity,
    frameDisplacementAmount,
  } = params;

  // Helper function to generate random values for glitch effects
  const generateGlitchTiming = (count: number): number[] => {
    const timings: number[] = [];
    for (let i = 0; i < count; i++) {
      timings.push(Math.random() * duration);
    }
    return timings.sort((a, b) => a - b);
  };

  // Helper function to create tear line elements
  const createTearLines = (): RenderableComponentData[] => {
    const tears: RenderableComponentData[] = [];
    const glitchTimings = generateGlitchTiming(tearCount);

    for (let i = 0; i < tearCount; i++) {
      const position = (i / tearCount) * 100;
      const startTime = glitchTimings[i];
      const flickerDuration = 0.02 + Math.random() * 0.03; // 0.02-0.05s

      tears.push({
        id: `tear-line-${i}`,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shape: 'rectangle' as const,
          color: '#000000',
          style: {
            position: 'absolute',
            top: `${position}%`,
            left: 0,
            width: '100%',
            height: '2px',
            zIndex: 100,
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
            id: `tear-flicker-${i}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: startTime,
              duration: flickerDuration,
              mode: 'provider',
              targetIds: [`tear-line-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.9 * intensity, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 0.6 },
                { key: 'opacity', val: 0.7 * intensity, prog: 0.8 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return tears;
  };

  // RGB Split Effects - Three separate effect groups for each channel
  const rgbSplitEffects = [];
  const glitchCount = Math.floor(duration / 0.1); // Glitch every 0.1s

  for (let i = 0; i < glitchCount; i++) {
    const startTime = i * 0.1;
    const effectDuration = 0.03 + Math.random() * 0.02; // 0.03-0.05s
    const offset = (rgbSplitAmount * intensity * (Math.random() - 0.5)) / 2;

    // Red channel displacement
    rgbSplitEffects.push({
      id: `rgb-red-split-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: ['rgb-red-channel'],
        ranges: [
          { key: 'translateX', val: `${-offset}px`, prog: 0 },
          { key: 'translateX', val: '0px', prog: 1 },
        ],
      },
    });

    // Blue channel displacement
    rgbSplitEffects.push({
      id: `rgb-blue-split-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: ['rgb-blue-channel'],
        ranges: [
          { key: 'translateX', val: `${offset}px`, prog: 0 },
          { key: 'translateX', val: '0px', prog: 1 },
        ],
      },
    });
  }

  // Datamosh Effects
  const datamoshEffects = [];
  const datamoshCount = Math.floor(duration / 0.15);

  for (let i = 0; i < datamoshCount; i++) {
    const startTime = i * 0.15 + Math.random() * 0.05;
    const effectDuration = 0.04;

    datamoshEffects.push({
      id: `datamosh-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: ['datamosh-layer'],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0.98 + Math.random() * 0.04, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
          {
            key: 'translateX',
            val: `${(Math.random() - 0.5) * 20 * datamoshIntensity * intensity}px`,
            prog: 0,
          },
          { key: 'translateX', val: '0px', prog: 1 },
        ],
      },
    });
  }

  // Noise Overlay Effects
  const noiseEffects = [];
  const noiseFlickerCount = Math.floor(duration / 0.05);

  for (let i = 0; i < noiseFlickerCount; i++) {
    const startTime = i * 0.05;
    const effectDuration = 0.025;

    noiseEffects.push({
      id: `noise-flicker-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: ['noise-overlay-layer'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: noiseOpacity * intensity, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    });
  }

  // Scanline Animation
  const scanlineEffect = {
    id: 'scanline-scroll',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: ['scanlines-layer'],
      ranges: [
        { key: 'translateY', val: '0px', prog: 0 },
        { key: 'translateY', val: '4px', prog: 1 },
      ],
    },
  };

  // Frame Displacement Effects
  const frameDisplacementEffects = [];
  const displacementCount = Math.floor(duration / 0.12);

  for (let i = 0; i < displacementCount; i++) {
    const startTime = i * 0.12;
    const effectDuration = 0.03;
    const skewAmount =
      (Math.random() - 0.5) * frameDisplacementAmount * intensity;

    frameDisplacementEffects.push({
      id: `displacement-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: startTime,
        duration: effectDuration,
        mode: 'provider',
        targetIds: ['frame-displacement-layer'],
        ranges: [
          { key: 'skewX', val: `${skewAmount}deg`, prog: 0 },
          { key: 'skewX', val: '0deg', prog: 1 },
          { key: 'skewY', val: `${skewAmount / 2}deg`, prog: 0 },
          { key: 'skewY', val: '0deg', prog: 1 },
        ],
      },
    });
  }

  // Base64 noise pattern (small repeating noise texture)
  const noisePattern =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+CiAgPGZpbHRlciBpZD0ibm9pc2UiPgogICAgPGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNSIgLz4KICA8L2ZpbHRlcj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiAvPgo8L3N2Zz4=';

  // Create the composition structure
  const childrenData: RenderableComponentData[] = [
    // RGB Split Layer Container
    {
      id: 'rgb-split-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'screen',
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
      effects: rgbSplitEffects,
      childrenData: [
        // Red Channel
        {
          id: 'rgb-red-channel',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                filter:
                  'saturate(0) brightness(1) sepia(1) hue-rotate(-50deg) saturate(6)',
                opacity: 0.8,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          childrenData: [],
        } as RenderableComponentData,
        // Green Channel
        {
          id: 'rgb-green-channel',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                filter:
                  'saturate(0) brightness(1) sepia(1) hue-rotate(50deg) saturate(6)',
                opacity: 0.8,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          childrenData: [],
        } as RenderableComponentData,
        // Blue Channel
        {
          id: 'rgb-blue-channel',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                filter:
                  'saturate(0) brightness(1) sepia(1) hue-rotate(170deg) saturate(6)',
                opacity: 0.8,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          childrenData: [],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Horizontal Tears Layer
    {
      id: 'horizontal-tears-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
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
      childrenData: createTearLines(),
    } as RenderableComponentData,

    // Datamosh Layer
    {
      id: 'datamosh-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
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
      effects: datamoshEffects,
      childrenData: [],
    } as RenderableComponentData,

    // Noise Overlay Layer
    {
      id: 'noise-overlay-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            backgroundImage: `url('${noisePattern}')`,
            backgroundSize: '50px 50px',
            mixBlendMode: 'overlay',
            pointerEvents: 'none',
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: noiseEffects,
      childrenData: [],
    } as RenderableComponentData,

    // Scanlines Layer
    {
      id: 'scanlines-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,' +
              scanlineOpacity +
              ') 2px, rgba(0,0,0,' +
              scanlineOpacity +
              ') 4px)',
            backgroundSize: '100% 4px',
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
      effects: [scanlineEffect],
      childrenData: [],
    } as RenderableComponentData,

    // Frame Displacement Layer
    {
      id: 'frame-displacement-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
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
      effects: frameDisplacementEffects,
      childrenData: [],
    } as RenderableComponentData,
  ];

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
    'A raw, aggressive glitch-style transition effect inspired by underground street racing aesthetics. Features RGB channel separation, datamoshing simulation, horizontal tear lines, digital noise patterns, scan line interference, and frame displacement. Multiple glitch techniques layered with varying intensities create a dangerous, unpredictable corruption effect perfect for high-energy automotive or action content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'street-racing',
    'rgb-split',
    'datamosh',
    'corruption',
    'digital-artifacts',
    'aggressive',
    'automotive',
    'action',
    'underground',
  ],
  defaultInputParams: {
    duration: 2,
    intensity: 1,
    rgbSplitAmount: 4,
    tearCount: 12,
    datamoshIntensity: 1.5,
    noiseOpacity: 0.4,
    scanlineOpacity: 0.3,
    frameDisplacementAmount: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const streetRacingGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
