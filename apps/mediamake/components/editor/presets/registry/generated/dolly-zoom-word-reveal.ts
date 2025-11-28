/**
 * Dolly Zoom Word Reveal Preset
 *
 * A cinematic perspective-based preset using CSS 3D transforms to create a dolly zoom effect.
 * Words slide apart along the Z-axis as if the camera is pushing through them, while the
 * revealed focal word pulls back from extreme close-up into sharp focus using rack focus technique.
 *
 * Features:
 * - **3D Perspective Space**: Uses CSS 3D transforms with perspective: 1000px for genuine depth
 * - **Z-Axis Movement**: Words recede along translateZ from 0 to -200px to -500px
 * - **Rack Focus Effect**: Focal word starts at translateZ: 500px (large/blurry) and pulls back to 0 (sharp)
 * - **Depth of Field Blur**: Blur filters adjust based on Z position (0-6px for receding, 10px-0 for focal)
 * - **Scale Coordination**: Scale adjusts with depth (1 to 0.7 for receding, 2 to 1 for focal)
 * - **GPU Acceleration**: Uses transform3d and will-change for optimal performance
 * - **Dynamic Camera Angle**: Perspective-origin manipulation for cinematic effect
 *
 * Use cases:
 * - Creating cinematic title reveals
 * - Building dramatic word emphasis effects
 * - Adding film-like depth of field to text
 * - Creating professional dolly zoom transitions
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  recedingWordLeft: z
    .string()
    .default('CINEMATIC')
    .describe('Word that recedes to the left in 3D space'),
  recedingWordRight: z
    .string()
    .default('EFFECT')
    .describe('Word that recedes to the right in 3D space'),
  focalWord: z
    .string()
    .default('REVEAL')
    .describe('Central word that pulls into focus from extreme close-up'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the effect in seconds'),
  perspective: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('Perspective depth in pixels (lower = more dramatic)'),
  recedingDepth: z
    .number()
    .min(200)
    .max(800)
    .default(500)
    .describe('Maximum Z-depth for receding words in pixels'),
  focalStartDepth: z
    .number()
    .min(300)
    .max(800)
    .default(500)
    .describe('Starting Z-depth for focal word (how close it starts)'),
  maxBlur: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .describe('Maximum blur in pixels for out-of-focus elements'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(80)
    .describe('Base font size in pixels'),
  font: z
    .string()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700", "Roboto:900")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (hex or rgba)'),
  easingType: z
    .enum(['ease-in-out', 'ease-in', 'ease-out', 'linear'])
    .default('ease-in-out')
    .describe('Easing function for animations'),
});

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
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const duration = params.duration;
  const recedingDuration = duration * 0.6; // Receding words animate for 60% of total duration
  const focalDuration = duration; // Focal word animates for full duration

  // Calculate intermediate values for smooth transitions
  const recedingMidDepth = params.recedingDepth * 0.4; // -200px at 40% mark
  const recedingMidScale = 1 - (1 - 0.7) * 0.4; // 0.88 scale at 40% mark
  const recedingMidBlur = (params.maxBlur * 0.6) * 0.4; // ~2.4px blur at 40% mark

  // Receding word left effects (moves left and back in Z-space)
  const recedingLeftEffect: GenericEffectData = {
    type: params.easingType,
    start: 0,
    duration: recedingDuration,
    mode: 'provider',
    targetIds: ['receding-word-left'],
    ranges: [
      // Z-axis depth (0 → -200px → -500px)
      { key: 'translateZ', val: 0, prog: 0 },
      { key: 'translateZ', val: -recedingMidDepth, prog: 0.4 },
      { key: 'translateZ', val: -params.recedingDepth, prog: 1 },
      // Scale coordination (1 → 0.88 → 0.7)
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: recedingMidScale, prog: 0.4 },
      { key: 'scale', val: 0.7, prog: 1 },
      // Horizontal slide left (-50 → -150 → -300)
      { key: 'translateX', val: -50, prog: 0 },
      { key: 'translateX', val: -150, prog: 0.4 },
      { key: 'translateX', val: -300, prog: 1 },
      // Depth of field blur (0 → 2.4px → 6px)
      { key: 'blur', val: '0px', prog: 0 },
      { key: 'blur', val: `${recedingMidBlur}px`, prog: 0.4 },
      { key: 'blur', val: `${params.maxBlur * 0.6}px`, prog: 1 },
      // Opacity fade
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0.7, prog: 0.4 },
      { key: 'opacity', val: 0.3, prog: 1 },
    ],
  };

  // Receding word right effects (moves right and back in Z-space)
  const recedingRightEffect: GenericEffectData = {
    type: params.easingType,
    start: 0,
    duration: recedingDuration,
    mode: 'provider',
    targetIds: ['receding-word-right'],
    ranges: [
      // Z-axis depth (0 → -200px → -500px)
      { key: 'translateZ', val: 0, prog: 0 },
      { key: 'translateZ', val: -recedingMidDepth, prog: 0.4 },
      { key: 'translateZ', val: -params.recedingDepth, prog: 1 },
      // Scale coordination (1 → 0.88 → 0.7)
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: recedingMidScale, prog: 0.4 },
      { key: 'scale', val: 0.7, prog: 1 },
      // Horizontal slide right (50 → 150 → 300)
      { key: 'translateX', val: 50, prog: 0 },
      { key: 'translateX', val: 150, prog: 0.4 },
      { key: 'translateX', val: 300, prog: 1 },
      // Depth of field blur (0 → 2.4px → 6px)
      { key: 'blur', val: '0px', prog: 0 },
      { key: 'blur', val: `${recedingMidBlur}px`, prog: 0.4 },
      { key: 'blur', val: `${params.maxBlur * 0.6}px`, prog: 1 },
      // Opacity fade
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0.7, prog: 0.4 },
      { key: 'opacity', val: 0.3, prog: 1 },
    ],
  };

  // Focal word effect (rack focus: starts close and blurry, pulls back into focus)
  const focalWordEffect: GenericEffectData = {
    type: params.easingType,
    start: 0,
    duration: focalDuration,
    mode: 'provider',
    targetIds: ['focal-word'],
    ranges: [
      // Z-axis: extreme close (500px) → focal plane (0)
      { key: 'translateZ', val: params.focalStartDepth, prog: 0 },
      { key: 'translateZ', val: 200, prog: 0.3 },
      { key: 'translateZ', val: 0, prog: 1 },
      // Scale: large (2) → normal (1)
      { key: 'scale', val: 2, prog: 0 },
      { key: 'scale', val: 1.3, prog: 0.3 },
      { key: 'scale', val: 1, prog: 1 },
      // Depth of field blur: out of focus (10px) → sharp (0)
      { key: 'blur', val: `${params.maxBlur}px`, prog: 0 },
      { key: 'blur', val: `${params.maxBlur * 0.4}px`, prog: 0.3 },
      { key: 'blur', val: '0px', prog: 1 },
      // Opacity: fade in as it comes into focus
      { key: 'opacity', val: 0.5, prog: 0 },
      { key: 'opacity', val: 0.8, prog: 0.3 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Perspective origin manipulation for dynamic camera angle
  const perspectiveContainerEffect: GenericEffectData = {
    type: params.easingType,
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: ['perspective-container'],
    ranges: [
      // Subtle perspective-origin shift for camera movement feel
      { key: 'perspectiveOrigin', val: '50% 50%', prog: 0 },
      { key: 'perspectiveOrigin', val: '50% 45%', prog: 0.5 },
      { key: 'perspectiveOrigin', val: '50% 50%', prog: 1 },
    ],
  };

  const rootContainer = {
    id: 'dolly-zoom-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      {
        id: 'perspective-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              perspective: `${params.perspective}px`,
              transformStyle: 'preserve-3d',
              perspectiveOrigin: '50% 50%',
              overflow: 'hidden',
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
            id: 'perspective-origin-shift',
            componentId: 'generic',
            data: perspectiveContainerEffect,
          },
        ],
        childrenData: [
          {
            id: '3d-scene-wrapper',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0',
                style: {
                  transformStyle: 'preserve-3d',
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
            childrenData: [
              // Receding words container
              {
                id: 'receding-words-container',
                type: 'layout',
                componentId: 'BaseLayout',
                data: {
                  containerProps: {
                    className: 'absolute inset-0',
                    style: {
                      transformStyle: 'preserve-3d',
                    },
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: duration,
                  },
                },
                childrenData: [
                  // Left receding word
                  {
                    id: 'receding-word-left',
                    type: 'atom',
                    componentId: 'TextAtom',
                    data: {
                      text: params.recedingWordLeft,
                      className: 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                      style: {
                        fontSize: params.fontSize,
                        color: params.textColor,
                        ...fontStyle,
                        whiteSpace: 'nowrap',
                        willChange: 'transform, filter',
                      },
                      font: {
                        family: fontFamily,
                        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
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
                        id: 'receding-left-effect',
                        componentId: 'generic',
                        data: recedingLeftEffect,
                      },
                    ],
                  },
                  // Right receding word
                  {
                    id: 'receding-word-right',
                    type: 'atom',
                    componentId: 'TextAtom',
                    data: {
                      text: params.recedingWordRight,
                      className: 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                      style: {
                        fontSize: params.fontSize,
                        color: params.textColor,
                        ...fontStyle,
                        whiteSpace: 'nowrap',
                        willChange: 'transform, filter',
                      },
                      font: {
                        family: fontFamily,
                        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
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
                        id: 'receding-right-effect',
                        componentId: 'generic',
                        data: recedingRightEffect,
                      },
                    ],
                  },
                ],
              },
              // Focal word container
              {
                id: 'focal-word-container',
                type: 'layout',
                componentId: 'BaseLayout',
                data: {
                  containerProps: {
                    className: 'absolute inset-0',
                    style: {
                      transformStyle: 'preserve-3d',
                    },
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: duration,
                  },
                },
                childrenData: [
                  {
                    id: 'focal-word',
                    type: 'atom',
                    componentId: 'TextAtom',
                    data: {
                      text: params.focalWord,
                      className: 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                      style: {
                        fontSize: params.fontSize,
                        color: params.textColor,
                        ...fontStyle,
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                        willChange: 'transform, filter',
                      },
                      font: {
                        family: fontFamily,
                        weights: ['900'],
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
                        id: 'focal-word-effect',
                        componentId: 'generic',
                        data: focalWordEffect,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
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

const presetMetadata: PresetMetadata = {
  id: 'dolly-zoom-word-reveal',
  title: 'Dolly Zoom Word Reveal',
  description:
    'A cinematic perspective-based preset using CSS 3D transforms to create a dolly zoom effect. Words slide apart along the Z-axis as if the camera is pushing through them, while the revealed focal word pulls back from extreme close-up into sharp focus using rack focus technique. Features genuine depth with translateZ positioning, depth-of-field blur filters based on Z distance, and GPU-accelerated transforms.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    '3d',
    'perspective',
    'dolly-zoom',
    'rack-focus',
    'cinematic',
    'depth-of-field',
    'reveal',
    'film',
  ],
  dependencies: {},
  defaultInputParams: {
    recedingWordLeft: 'CINEMATIC',
    recedingWordRight: 'EFFECT',
    focalWord: 'REVEAL',
    duration: 3,
    perspective: 1000,
    recedingDepth: 500,
    focalStartDepth: 500,
    maxBlur: 10,
    fontSize: 80,
    font: 'Inter:700',
    textColor: '#FFFFFF',
    backgroundColor: '#000000',
    easingType: 'ease-in-out',
  },
};

export const dollyZoomWordRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
