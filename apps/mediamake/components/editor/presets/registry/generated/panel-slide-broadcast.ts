/**
 * Panel Slide Broadcast Transition Preset
 *
 * Premium broadcast-quality panel slide transition with hydraulic door mechanics.
 * Features synchronized left/right panels with staggered timing (0.15s mechanical delay),
 * ease-in-out-back overshoot easing, animated light trail accents with fade-out effects,
 * and layered depth created by panel gaps revealing blurred background.
 *
 * Inspired by high-end motion graphics packages with sophisticated spring-loaded door
 * animations and negative space breathing room.
 *
 * Features:
 * - **Automated Studio Doors**: Panels slide in with synchronized timing and mechanical delay
 * - **Hydraulic Overshoot**: Ease-in-out-back easing mimics hydraulic door mechanisms
 * - **Light Trails**: Thin accent lines trace panel edges during movement
 * - **Layered Depth**: 40px gaps between panels reveal blurred background layer
 * - **GPU-Optimized**: Transform3d and contain property for paint optimization
 *
 * Use cases:
 * - Premium broadcast transitions
 * - High-end motion graphics packages
 * - Professional video productions
 * - Studio-quality reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  backgroundImage: z.object({
    src: z.string().describe('Background image source URL'),
  }).describe('Background image to show behind panel gaps'),
  leftPanelGradient: z.string()
    .default('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
    .describe('CSS gradient for left panel'),
  rightPanelGradient: z.string()
    .default('linear-gradient(135deg, #f093fb 0%, #f5576c 100%)')
    .describe('CSS gradient for right panel'),
  panelGap: z.number()
    .min(0)
    .max(100)
    .default(40)
    .describe('Gap between panels in pixels (reveals background)'),
  mechanicalDelay: z.number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Delay between left and right panel start (seconds)'),
  animationDuration: z.number()
    .min(0.5)
    .max(5)
    .default(1.2)
    .describe('Duration of panel slide animation (seconds)'),
  totalDuration: z.number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the transition (seconds)'),
  lightTrailIntensity: z.number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of light trail effect (0-1)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    backgroundImage,
    leftPanelGradient,
    rightPanelGradient,
    panelGap,
    mechanicalDelay,
    animationDuration,
    totalDuration,
    lightTrailIntensity,
  } = params;

  const halfGap = panelGap / 2;
  const panelWidth = `calc(50% - ${halfGap}px)`;

  // Cubic-bezier for ease-in-out-back (overshoot effect)
  const hydraulicEasing = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'panel-slide-broadcast-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          contain: 'paint layout',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  };

  // Background layer (blurred)
  const backgroundLayer: RenderableComponentData = {
    id: 'panel-slide-background',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          filter: 'blur(20px)',
          transform: 'scale(1.1)',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'panel-slide-bg-image',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: backgroundImage.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Left panel wrapper
  const leftPanelWrapper: RenderableComponentData = {
    id: 'panel-slide-left-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute h-full left-0',
        style: {
          width: panelWidth,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'panel-slide-left-panel',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'w-full h-full overflow-hidden',
            style: {
              boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)',
              willChange: 'transform',
              contain: 'paint layout style',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: 'left-panel-slide-effect',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: animationDuration,
              mode: 'provider',
              targetIds: ['panel-slide-left-panel'],
              ranges: [
                { key: 'translateX', val: '-100%', prog: 0 },
                { key: 'translateX', val: '0%', prog: 1 },
              ],
              props: {
                easing: hydraulicEasing,
              },
            },
          },
        ],
        childrenData: [
          {
            id: 'panel-slide-left-content',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: `<div style="width: 100%; height: 100%; background: ${leftPanelGradient};"></div>`,
              className: 'w-full h-full',
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
          } as RenderableComponentData,
          {
            id: 'panel-slide-left-trail',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none',
                style: {
                  background: `linear-gradient(to right, rgba(255, 255, 255, ${lightTrailIntensity}), transparent)`,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
            effects: [
              {
                id: 'left-trail-fade-effect',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: animationDuration,
                  mode: 'provider',
                  targetIds: ['panel-slide-left-trail'],
                  ranges: [
                    { key: 'opacity', val: lightTrailIntensity, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    ],
  };

  // Right panel wrapper (with mechanical delay)
  const rightPanelWrapper: RenderableComponentData = {
    id: 'panel-slide-right-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute h-full right-0',
        style: {
          width: panelWidth,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: mechanicalDelay,
        duration: totalDuration - mechanicalDelay,
      },
    },
    childrenData: [
      {
        id: 'panel-slide-right-panel',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'w-full h-full overflow-hidden',
            style: {
              boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)',
              willChange: 'transform',
              contain: 'paint layout style',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration - mechanicalDelay,
          },
        },
        effects: [
          {
            id: 'right-panel-slide-effect',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: animationDuration,
              mode: 'provider',
              targetIds: ['panel-slide-right-panel'],
              ranges: [
                { key: 'translateX', val: '100%', prog: 0 },
                { key: 'translateX', val: '0%', prog: 1 },
              ],
              props: {
                easing: hydraulicEasing,
              },
            },
          },
        ],
        childrenData: [
          {
            id: 'panel-slide-right-content',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: `<div style="width: 100%; height: 100%; background: ${rightPanelGradient};"></div>`,
              className: 'w-full h-full',
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration - mechanicalDelay,
              },
            },
          } as RenderableComponentData,
          {
            id: 'panel-slide-right-trail',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none',
                style: {
                  background: `linear-gradient(to left, rgba(255, 255, 255, ${lightTrailIntensity}), transparent)`,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration - mechanicalDelay,
              },
            },
            effects: [
              {
                id: 'right-trail-fade-effect',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: animationDuration,
                  mode: 'provider',
                  targetIds: ['panel-slide-right-trail'],
                  ranges: [
                    { key: 'opacity', val: lightTrailIntensity, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    ],
  };

  // Assemble composition
  rootContainer.childrenData = [
    backgroundLayer,
    leftPanelWrapper,
    rightPanelWrapper,
  ];

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
  id: 'panel-slide-broadcast',
  title: 'Panel Slide Broadcast Transition',
  description:
    'Premium broadcast-quality panel slide transition with hydraulic door mechanics. Features synchronized left/right panels with staggered timing (0.15s mechanical delay), ease-in-out-back overshoot easing, animated light trail accents with fade-out effects, and layered depth created by panel gaps revealing blurred background. Inspired by high-end motion graphics packages with sophisticated spring-loaded door animations and negative space breathing room.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'broadcast',
    'panel',
    'slide',
    'doors',
    'hydraulic',
    'premium',
    'motion-graphics',
    'studio',
    'reveal',
  ],
  defaultInputParams: {
    backgroundImage: {
      src: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&h=1080&fit=crop',
    },
    leftPanelGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    rightPanelGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    panelGap: 40,
    mechanicalDelay: 0.15,
    animationDuration: 1.2,
    totalDuration: 3,
    lightTrailIntensity: 0.3,
  },
  dependencies: {},
};

export const panelSlideBroadcastPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
