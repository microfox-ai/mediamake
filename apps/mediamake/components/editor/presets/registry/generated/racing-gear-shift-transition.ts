/**
 * Racing Gear Shift Transition Preset
 *
 * Ultra-aggressive professional racing-style transition effect with rapid-fire cuts, speed blur,
 * diagonal wipes, chromatic aberration, shake decay, and flash frames. Mimics the violent
 * acceleration burst of gear shifting with multiple overlapping layers and staggered timing
 * for chaotic high-energy feel.
 *
 * Features:
 * - **Speed Lines**: Multiple horizontal streaking lines with staggered timing
 * - **Chromatic Aberration**: RGB channel separation with blend modes
 * - **Diagonal Wipes**: Clip-path polygon animations
 * - **Flash Frames**: Rapid white flashes for impact
 * - **Shake Effect**: Decaying random translation for camera shake
 * - **Layered Chaos**: Multiple simultaneous sub-animations with staggered delays
 *
 * Use cases:
 * - Racing video transitions
 * - High-energy sports content
 * - Action sequence cuts
 * - Aggressive brand reveal transitions
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
  transitionDuration: z
    .number()
    .min(0.3)
    .max(0.5)
    .default(0.4)
    .describe('Duration of the transition in seconds (0.3-0.5s)'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .describe('Maximum shake displacement in pixels'),
  speedLineCount: z
    .number()
    .int()
    .min(3)
    .max(10)
    .default(5)
    .describe('Number of speed lines to render'),
  chromaticIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Chromatic aberration offset in pixels'),
  flashIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Flash frame opacity (0-1)'),
  enableShake: z.boolean().default(true).describe('Enable shake effect'),
  enableSpeedLines: z.boolean().default(true).describe('Enable speed lines'),
  enableChromatic: z
    .boolean()
    .default(true)
    .describe('Enable chromatic aberration'),
  enableFlash: z.boolean().default(true).describe('Enable flash frames'),
  enableDiagonalWipe: z
    .boolean()
    .default(true)
    .describe('Enable diagonal wipe'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    transitionDuration,
    shakeIntensity,
    speedLineCount,
    chromaticIntensity,
    flashIntensity,
    enableShake,
    enableSpeedLines,
    enableChromatic,
    enableFlash,
    enableDiagonalWipe,
  } = params;

  const childrenData: RenderableComponentData[] = [];
  const effects: any[] = [];

  // Helper: Generate shake keyframes with decay
  const generateShakeRanges = (): any[] => {
    const ranges: any[] = [];
    const keyframeCount = Math.floor(transitionDuration / 0.05); // 0.05s intervals

    for (let i = 0; i <= keyframeCount; i++) {
      const prog = i / keyframeCount;
      const decay = 1 - prog; // Linear decay
      const randomX = (Math.random() - 0.5) * 2 * shakeIntensity * decay;
      const randomY = (Math.random() - 0.5) * 2 * shakeIntensity * decay;

      ranges.push({ key: 'translateX', val: randomX, prog });
      ranges.push({ key: 'translateY', val: randomY, prog });
    }

    return ranges;
  };

  // Root container with relative positioning
  const rootContainer: RenderableComponentData = {
    id: 'racing-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
        style: {
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [],
  };

  // Speed Lines Layer
  if (enableSpeedLines) {
    const speedLinesChildren: RenderableComponentData[] = [];

    for (let i = 0; i < speedLineCount; i++) {
      const yPosition = (i + 1) * (100 / (speedLineCount + 1));
      const delay = i * 50; // 50ms stagger
      const height = i === Math.floor(speedLineCount / 2) ? 4 : 2; // Center line is thicker
      const opacity = 0.7 + Math.random() * 0.3;

      speedLinesChildren.push({
        id: `speed-line-${i}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute w-full',
            style: {
              top: `${yPosition}%`,
              height: `${height}px`,
              background: 'linear-gradient(to right, white, transparent)',
              willChange: 'transform',
              opacity,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `speed-line-effect-${i}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: delay / 1000,
              duration: transitionDuration - delay / 1000,
              mode: 'provider',
              targetIds: [`speed-line-${i}`],
              ranges: [
                { key: 'translateX', val: '-100%', prog: 0 },
                { key: 'translateX', val: '200%', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    const speedLinesLayer: RenderableComponentData = {
      id: 'speed-lines-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 10,
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: speedLinesChildren,
    };

    childrenData.push(speedLinesLayer);
  }

  // Chromatic Aberration Layer
  if (enableChromatic) {
    const chromaticChildren: RenderableComponentData[] = [
      {
        id: 'chromatic-red',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              mixBlendMode: 'screen',
              backgroundColor: 'rgba(255, 0, 0, 0.15)',
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'chromatic-red-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['chromatic-red'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: chromaticIntensity, prog: 0.5 },
                { key: 'translateX', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      {
        id: 'chromatic-green',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              mixBlendMode: 'screen',
              backgroundColor: 'rgba(0, 255, 0, 0.1)',
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'chromatic-green-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0.025,
              duration: transitionDuration - 0.025,
              mode: 'provider',
              targetIds: ['chromatic-green'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      {
        id: 'chromatic-blue',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              mixBlendMode: 'screen',
              backgroundColor: 'rgba(0, 0, 255, 0.15)',
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'chromatic-blue-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0.05,
              duration: transitionDuration - 0.05,
              mode: 'provider',
              targetIds: ['chromatic-blue'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: -chromaticIntensity, prog: 0.5 },
                { key: 'translateX', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ];

    const chromaticLayer: RenderableComponentData = {
      id: 'chromatic-aberration-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 15,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: chromaticChildren,
    };

    childrenData.push(chromaticLayer);
  }

  // Diagonal Wipe Layer
  if (enableDiagonalWipe) {
    const diagonalWipeLayer: RenderableComponentData = {
      id: 'diagonal-wipe-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 20,
            backgroundColor: 'white',
            willChange: 'clip-path, opacity',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'diagonal-wipe-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionDuration * 0.3,
            duration: transitionDuration * 0.4,
            mode: 'provider',
            targetIds: ['diagonal-wipe-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              {
                key: 'clipPath',
                val: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
                prog: 0,
              },
              {
                key: 'clipPath',
                val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
                prog: 1,
              },
            ],
          },
        },
      ],
    };

    childrenData.push(diagonalWipeLayer);
  }

  // Flash Layer
  if (enableFlash) {
    const flashLayer: RenderableComponentData = {
      id: 'flash-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 25,
            backgroundColor: 'white',
            willChange: 'opacity',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'flash-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionDuration / 2 - 0.05,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['flash-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: flashIntensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    childrenData.push(flashLayer);
  }

  // Shake Container Effect (applied to root)
  if (enableShake) {
    effects.push({
      id: 'shake-effect',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: ['racing-transition-root'],
        ranges: generateShakeRanges(),
      },
    });
  }

  // Assign children and effects to root
  rootContainer.childrenData = childrenData;
  rootContainer.effects = effects;

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
  id: 'racing-gear-shift-transition',
  title: 'Racing Gear Shift Transition',
  description:
    'Ultra-aggressive professional racing-style transition effect with rapid-fire cuts, speed blur, diagonal wipes, chromatic aberration, shake decay, and flash frames. Mimics the violent acceleration burst of gear shifting with multiple overlapping layers and staggered timing for chaotic high-energy feel. Supports scene-to-scene transitions and overlay effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'racing',
    'aggressive',
    'high-energy',
    'speed-blur',
    'chromatic-aberration',
    'shake',
    'flash',
    'diagonal-wipe',
    'professional',
  ],
  defaultInputParams: {
    transitionDuration: 0.4,
    shakeIntensity: 20,
    speedLineCount: 5,
    chromaticIntensity: 8,
    flashIntensity: 0.8,
    enableShake: true,
    enableSpeedLines: true,
    enableChromatic: true,
    enableFlash: true,
    enableDiagonalWipe: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const racingGearShiftTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
