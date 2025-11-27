/**
 * Racing Gear Shift Transition Preset
 *
 * Ultra-aggressive professional racing video transition effect with rapid-fire cuts, 
 * diagonal wipes, speed blur lines, chromatic aberration, shake with decay, and flash frames.
 * Mimics the violent acceleration feel of gear shifting with multiple overlapping layers 
 * and staggered timing for chaotic high-energy transitions.
 *
 * Features:
 * - Diagonal wipe transitions with motion blur
 * - Multiple speed lines streaking across screen
 * - Chromatic aberration RGB separation effect
 * - Camera shake with exponential decay
 * - Flash frames for impact
 * - Staggered timing for chaotic layering
 * - Supports scene-to-scene transitions and overlay effects
 *
 * Use cases:
 * - High-energy action video transitions
 * - Racing/sports content scene changes
 * - Music video rapid cuts
 * - Gaming highlight transitions
 * - Dynamic social media content
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  transitionDuration: z
    .number()
    .min(0.3)
    .max(0.5)
    .default(0.4)
    .describe('Duration of the transition effect in seconds (0.3-0.5)'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(100)
    .default(30)
    .describe('Maximum shake amplitude in pixels'),
  speedLineCount: z
    .number()
    .int()
    .min(4)
    .max(12)
    .default(8)
    .describe('Number of speed lines to render'),
  chromaticIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Chromatic aberration offset intensity in pixels'),
  flashIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Flash frame opacity (0-1)'),
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
  } = params;

  // Helper: Generate shake keyframes with exponential decay
  const generateShakeKeyframes = (
    duration: number,
    intensity: number,
    frameRate: number = 60,
  ) => {
    const frames = Math.ceil(duration * frameRate);
    const interval = 1 / frameRate;
    const keyframes: Array<{ key: string; val: number; prog: number }> = [];

    for (let i = 0; i <= frames; i++) {
      const progress = i / frames;
      // Exponential decay: intensity * e^(-4*progress)
      const decay = Math.exp(-4 * progress);
      const currentIntensity = intensity * decay;
      
      // Random offset with decreasing amplitude
      const offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
      const offsetY = (Math.random() - 0.5) * 2 * currentIntensity;

      keyframes.push(
        { key: 'translateX', val: offsetX, prog: progress },
        { key: 'translateY', val: offsetY, prog: progress },
      );
    }

    return keyframes;
  };

  // Helper: Generate speed lines with staggered delays
  const generateSpeedLines = (count: number): RenderableComponentData[] => {
    const lines: RenderableComponentData[] = [];
    const delays = [0, 50, 100]; // Staggered delays in ms
    const heights = ['h-0.5', 'h-0.5', 'h-1']; // Varied thickness

    for (let i = 0; i < count; i++) {
      const delay = delays[i % delays.length] / 1000; // Convert to seconds
      const height = heights[i % heights.length];
      const width = 20 + Math.random() * 35; // Random width 20-55%
      const top = (100 / (count + 1)) * (i + 1); // Distribute vertically

      lines.push({
        id: `speed-line-${i + 1}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute ${height}`,
            style: {
              width: `${width}%`,
              top: `${top}%`,
              background: 'linear-gradient(to right, white, transparent)',
              willChange: 'transform, opacity',
            },
          },
        },
        context: {
          timing: {
            start: delay,
            duration: transitionDuration - delay,
          },
        },
        effects: [
          {
            id: `speed-line-${i + 1}-anim`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration - delay,
              mode: 'provider',
              targetIds: [`speed-line-${i + 1}`],
              ranges: [
                { key: 'translateX', val: '-100%', prog: 0 },
                { key: 'translateX', val: '200%', prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      } as RenderableComponentData);
    }

    return lines;
  };

  // Generate shake keyframes
  const shakeKeyframes = generateShakeKeyframes(
    transitionDuration,
    shakeIntensity,
  );

  // Generate speed lines
  const speedLines = generateSpeedLines(speedLineCount);

  // Build child components
  const childrenData: RenderableComponentData[] = [
    // Outgoing scene layer
    {
      id: 'outgoing-scene-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            willChange: 'transform, opacity, clipPath',
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
          id: 'outgoing-clip-path',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-scene-layer'],
            ranges: [
              { key: 'clipPath', val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', prog: 0 },
              { key: 'clipPath', val: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)', prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Incoming scene layer
    {
      id: 'incoming-scene-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            willChange: 'transform, opacity, clipPath',
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
          id: 'incoming-clip-path',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-scene-layer'],
            ranges: [
              { key: 'clipPath', val: 'polygon(0 0, 0 0, 0 100%, 0 100%)', prog: 0 },
              { key: 'clipPath', val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Diagonal wipe edge line
    {
      id: 'diagonal-wipe-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-hidden',
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
      childrenData: [
        {
          id: 'wipe-edge-line',
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shape: 'rectangle',
            style: {
              width: '150%',
              height: '8px',
              background: 'linear-gradient(90deg, transparent 0%, white 20%, white 80%, transparent 100%)',
              position: 'absolute',
              top: '50%',
              left: '-75%',
              willChange: 'transform',
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
              id: 'wipe-edge-anim',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['wipe-edge-line'],
                ranges: [
                  { key: 'translateX', val: '0%', prog: 0 },
                  { key: 'translateX', val: '175%', prog: 1 },
                  { key: 'rotate', val: -45, prog: 0 },
                  { key: 'rotate', val: -45, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Speed lines layer
    {
      id: 'speed-lines-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-hidden',
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
      childrenData: speedLines,
    } as RenderableComponentData,

    // Chromatic aberration layer
    {
      id: 'chromatic-aberration-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
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
      childrenData: [
        // Red channel
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
                willChange: 'transform, opacity',
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
              id: 'chromatic-red-anim',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['chromatic-red'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: -chromaticIntensity, prog: 0.5 },
                  { key: 'translateX', val: 0, prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.15, prog: 0.5 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [],
        } as RenderableComponentData,
        // Green channel
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
                willChange: 'transform, opacity',
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
              id: 'chromatic-green-anim',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['chromatic-green'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.1, prog: 0.5 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [],
        } as RenderableComponentData,
        // Blue channel
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
                willChange: 'transform, opacity',
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
              id: 'chromatic-blue-anim',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['chromatic-blue'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: chromaticIntensity, prog: 0.5 },
                  { key: 'translateX', val: 0, prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.15, prog: 0.5 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Flash frame layer
    {
      id: 'flash-frame-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: 'white',
            willChange: 'opacity',
          },
        },
      },
      context: {
        timing: {
          start: transitionDuration * 0.4, // Flash at 40% through transition
          duration: 0.1,
        },
      },
      effects: [
        {
          id: 'flash-frame-anim',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.1,
            mode: 'provider',
            targetIds: ['flash-frame-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: flashIntensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Shake container
    {
      id: 'shake-container',
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
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'shake-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['shake-container'],
            ranges: shakeKeyframes,
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
  ];

  // Root container
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'racing-gear-shift-transition',
  title: 'Racing Gear Shift Transition',
  description:
    'Ultra-aggressive professional racing video transition effect with rapid-fire cuts, diagonal wipes, speed blur lines, chromatic aberration, shake with decay, and flash frames. Mimics the violent acceleration feel of gear shifting with multiple overlapping layers and staggered timing for chaotic high-energy transitions. Supports scene-to-scene transitions and overlay effects for existing content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'racing',
    'aggressive',
    'high-energy',
    'diagonal-wipe',
    'speed-lines',
    'chromatic-aberration',
    'shake',
    'flash',
    'motion-blur',
  ],
  defaultInputParams: {
    transitionDuration: 0.4,
    shakeIntensity: 30,
    speedLineCount: 8,
    chromaticIntensity: 8,
    flashIntensity: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const racingGearShiftTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
