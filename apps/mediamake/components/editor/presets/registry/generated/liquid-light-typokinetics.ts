/**
 * Liquid Light Typokinetics Preset
 *
 * An immersive multi-dimensional text experience featuring cascading light leaks flowing like liquid mercury
 * across typography. Text elements emerge from 3D space with z-axis rotation (massive doors opening toward viewer),
 * refractive light effects, caustic water-light patterns, and progressive lighting stages.
 *
 * Features:
 * - 3D perspective space with preserve-3d transforms
 * - Z-axis text rotation (door-opening effect from -90deg to 0deg)
 * - Liquid mercury light flows with animated gradient and clip-path
 * - Caustic water-light patterns with animated radial gradients
 * - Refractive effects using backdrop-filter (blur + brightness)
 * - Progressive build: environmental light → text rotation → caustics → full brightness
 * - Three parallax text layers at different Z-depths (-50px, 0px, 50px)
 * - Caption-responsive brightness (maps word.metadata.impact to glow intensity)
 * - Performance optimization with will-change during animations
 *
 * Use cases:
 * - Cinematic title reveals with dramatic 3D rotation
 * - Immersive text experiences with liquid light aesthetics
 * - High-impact product launches or event announcements
 * - Architectural/futuristic branded content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .default('LIQUID LIGHT')
    .describe('Main text to display with 3D rotation and light effects'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the animation in seconds'),
  fontSize: z
    .number()
    .default(96)
    .describe('Font size in pixels for main text layer'),
  fontFamily: z
    .string()
    .default('Inter:800')
    .describe('Font family with weight (e.g., "Inter:800")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Main text color (hex or rgb)'),
  backgroundColor: z
    .string()
    .default('#0a0a0f')
    .describe('Background color for 3D space'),
  
  // Timing control
  environmentalLightStart: z
    .number()
    .default(0)
    .describe('Start time for environmental light fade-in (relative to parent)'),
  textRotationStart: z
    .number()
    .default(1)
    .describe('Start time for text 3D rotation animation (relative to parent)'),
  causticStart: z
    .number()
    .default(2)
    .describe('Start time for caustic pattern reveal (relative to parent)'),
  mercuryFlowStart: z
    .number()
    .default(1.5)
    .describe('Start time for mercury flow animation (relative to parent)'),
  fullBrightnessStart: z
    .number()
    .default(3)
    .describe('Start time for full brightness and refractive overlay (relative to parent)'),
  
  // Animation durations
  textRotationDuration: z
    .number()
    .default(3)
    .describe('Duration of text 3D rotation from -90deg to 0deg'),
  environmentalLightDuration: z
    .number()
    .default(1)
    .describe('Duration of environmental light fade-in'),
  causticFadeDuration: z
    .number()
    .default(1)
    .describe('Duration of caustic pattern fade-in'),
  refractiveFadeDuration: z
    .number()
    .default(1)
    .describe('Duration of refractive overlay fade-in'),
  
  // Effect intensities
  glowIntensity: z
    .number()
    .default(1.0)
    .describe('Global glow intensity multiplier for text shadows'),
  mercuryOpacity: z
    .number()
    .default(0.15)
    .describe('Opacity of mercury flow layer (0-1)'),
  causticOpacity: z
    .number()
    .default(1.0)
    .describe('Max opacity of caustic patterns (0-1)'),
  refractiveBlur: z
    .number()
    .default(2)
    .describe('Refractive blur amount in pixels'),
  refractiveBrightness: z
    .number()
    .default(1.2)
    .describe('Refractive brightness multiplier'),
  
  // Caption responsiveness (if using captions)
  useCaption: z
    .boolean()
    .default(false)
    .describe('Whether to use caption text and metadata for brightness mapping'),
  caption: z
    .object({
      text: z.string(),
      start: z.number(),
      absoluteStart: z.number(),
      duration: z.number(),
      words: z.array(
        z.object({
          text: z.string(),
          start: z.number(),
          duration: z.number(),
          absoluteStart: z.number(),
        })
      ),
      metadata: z
        .object({
          impact: z.number().optional(),
        })
        .optional(),
    })
    .optional()
    .describe('Optional caption data for text and metadata-driven effects'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter:800';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  let fontWeight = 800;
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontWeight = parseInt(fontParts[1], 10) || 800;
    }
  }

  // Determine text content
  const displayText = params.useCaption && params.caption
    ? params.caption.text
    : params.text;

  // Calculate brightness from caption metadata if available
  const captionImpact = params.useCaption && params.caption?.metadata?.impact
    ? params.caption.metadata.impact
    : 1.0;
  const brightnessMultiplier = Math.max(1.0, Math.min(1.5, captionImpact));
  const glowIntensity = params.glowIntensity * brightnessMultiplier;

  // Root container with 3D perspective
  const rootContainerId = 'liquid-light-typokinetics-root';
  
  // Layer IDs
  const environmentalLightLayerId = 'environmental-light-layer';
  const causticPatternLayerId = 'caustic-pattern-layer';
  const mercuryFlowLayerId = 'mercury-flow-layer';
  const textParallaxContainerId = 'text-parallax-container';
  const textLayerBackId = 'text-layer-back';
  const textLayerMainId = 'text-layer-main';
  const textLayerFrontId = 'text-layer-front';
  const textBackId = 'text-back';
  const textMainId = 'text-main';
  const textFrontId = 'text-front';
  const refractiveOverlayId = 'refractive-overlay';

  // Environmental light fade-in effect
  const environmentalLightEffect = {
    id: 'environmental-light-fade',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const,
      start: params.environmentalLightStart,
      duration: params.environmentalLightDuration,
      mode: 'provider' as const,
      targetIds: [environmentalLightLayerId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Text rotation effects (back layer)
  const textBackRotationEffect = {
    id: 'text-back-rotation',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: params.textRotationStart,
      duration: params.textRotationDuration,
      mode: 'provider' as const,
      targetIds: [textBackId],
      ranges: [
        { key: 'rotateY', val: -90, prog: 0 },
        { key: 'rotateY', val: 0, prog: 1 },
        { key: 'translateZ', val: 200, prog: 0 },
        { key: 'translateZ', val: 0, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.4, prog: 1 },
      ],
    },
  };

  // Text rotation effects (main layer)
  const textMainRotationEffect = {
    id: 'text-main-rotation',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: params.textRotationStart,
      duration: params.textRotationDuration,
      mode: 'provider' as const,
      targetIds: [textMainId],
      ranges: [
        { key: 'rotateY', val: -90, prog: 0 },
        { key: 'rotateY', val: 0, prog: 1 },
        { key: 'translateZ', val: 200, prog: 0 },
        { key: 'translateZ', val: 0, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Text rotation effects (front layer)
  const textFrontRotationEffect = {
    id: 'text-front-rotation',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: params.textRotationStart,
      duration: params.textRotationDuration,
      mode: 'provider' as const,
      targetIds: [textFrontId],
      ranges: [
        { key: 'rotateY', val: -90, prog: 0 },
        { key: 'rotateY', val: 0, prog: 1 },
        { key: 'translateZ', val: 200, prog: 0 },
        { key: 'translateZ', val: 0, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.6, prog: 1 },
      ],
    },
  };

  // Caustic pattern fade-in effect
  const causticFadeEffect = {
    id: 'caustic-fade-in',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const,
      start: params.causticStart,
      duration: params.causticFadeDuration,
      mode: 'provider' as const,
      targetIds: [causticPatternLayerId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: params.causticOpacity, prog: 1 },
      ],
    },
  };

  // Mercury flow animation (subtle movement)
  const mercuryFlowEffect = {
    id: 'mercury-flow-animation',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: params.mercuryFlowStart,
      duration: params.duration - params.mercuryFlowStart,
      mode: 'provider' as const,
      targetIds: [mercuryFlowLayerId],
      ranges: [
        { key: 'translateX', val: -20, prog: 0 },
        { key: 'translateX', val: 20, prog: 0.5 },
        { key: 'translateX', val: -20, prog: 1 },
      ],
    },
  };

  // Refractive overlay fade-in effect
  const refractiveFadeEffect = {
    id: 'refractive-overlay-fade',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const,
      start: params.fullBrightnessStart,
      duration: params.refractiveFadeDuration,
      mode: 'provider' as const,
      targetIds: [refractiveOverlayId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.3, prog: 1 },
      ],
    },
  };

  // Build composition structure
  const childrenData: RenderableComponentData[] = [
    // Root container with 3D perspective
    {
      id: rootContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full overflow-hidden',
          style: {
            backgroundColor: params.backgroundColor,
            perspective: '1500px',
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [
        // Environmental light layer
        {
          id: environmentalLightLayerId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                background:
                  'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(200,220,255,0.02) 0%, transparent 40%)',
                mixBlendMode: 'screen',
                opacity: 0,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
          effects: [environmentalLightEffect],
          childrenData: [],
        } as RenderableComponentData,

        // Caustic pattern layer
        {
          id: causticPatternLayerId,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: '<div></div>',
            className: 'absolute inset-0 pointer-events-none',
            style: {
              opacity: 0,
              maskImage:
                'radial-gradient(circle at 20% 30%, white 0%, transparent 30%), radial-gradient(circle at 60% 50%, white 0%, transparent 25%), radial-gradient(circle at 80% 70%, white 0%, transparent 35%)',
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(200,220,255,0.08) 50%, rgba(255,255,255,0.05) 100%)',
              mixBlendMode: 'overlay',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
          effects: [causticFadeEffect],
        } as RenderableComponentData,

        // Mercury flow layer
        {
          id: mercuryFlowLayerId,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: '<div></div>',
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background:
                'linear-gradient(to right, rgb(203,213,225), rgb(255,255,255), rgb(203,213,225))',
              opacity: params.mercuryOpacity,
              clipPath:
                'polygon(0% 45%, 10% 48%, 25% 42%, 40% 50%, 55% 44%, 70% 52%, 85% 46%, 100% 50%, 100% 55%, 85% 51%, 70% 57%, 55% 49%, 40% 55%, 25% 47%, 10% 53%, 0% 50%)',
              mixBlendMode: 'screen',
              filter: 'blur(1px)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
          effects: [mercuryFlowEffect],
        } as RenderableComponentData,

        // Text parallax container
        {
          id: textParallaxContainerId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 flex items-center justify-center',
              style: {
                transformStyle: 'preserve-3d',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
          childrenData: [
            // Back text layer (Z: -50px)
            {
              id: textLayerBackId,
              type: 'layout' as const,
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute flex items-center justify-center',
                  style: {
                    transform: 'translateZ(-50px)',
                    opacity: 0.4,
                    willChange: 'transform',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: params.duration,
                },
              },
              childrenData: [
                {
                  id: textBackId,
                  type: 'atom' as const,
                  componentId: 'TextAtom',
                  data: {
                    text: displayText,
                    style: {
                      fontSize: params.fontSize * 0.75,
                      fontWeight: fontWeight,
                      color: 'rgba(255,255,255,0.3)',
                      transform: 'rotateY(-90deg) translateZ(200px)',
                      filter: 'blur(2px)',
                      willChange: 'transform',
                    },
                    font: {
                      family: fontFamily,
                      weights: [fontWeight.toString()],
                    },
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: params.duration,
                    },
                  },
                  effects: [textBackRotationEffect],
                } as RenderableComponentData,
              ],
            } as RenderableComponentData,

            // Main text layer (Z: 0px)
            {
              id: textLayerMainId,
              type: 'layout' as const,
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute flex items-center justify-center',
                  style: {
                    transform: 'translateZ(0px)',
                    willChange: 'transform',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: params.duration,
                },
              },
              childrenData: [
                {
                  id: textMainId,
                  type: 'atom' as const,
                  componentId: 'TextAtom',
                  data: {
                    text: displayText,
                    style: {
                      fontSize: params.fontSize,
                      fontWeight: fontWeight,
                      color: params.textColor,
                      transform: 'rotateY(-90deg) translateZ(200px)',
                      textShadow: `0 0 ${40 * glowIntensity}px rgba(255,255,255,${0.5 * glowIntensity}), 0 0 ${80 * glowIntensity}px rgba(200,220,255,${0.3 * glowIntensity})`,
                      backdropFilter: `blur(${params.refractiveBlur}px) brightness(${params.refractiveBrightness})`,
                      willChange: 'transform',
                    },
                    font: {
                      family: fontFamily,
                      weights: [fontWeight.toString()],
                    },
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: params.duration,
                    },
                  },
                  effects: [textMainRotationEffect],
                } as RenderableComponentData,
              ],
            } as RenderableComponentData,

            // Front text layer (Z: 50px)
            {
              id: textLayerFrontId,
              type: 'layout' as const,
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute flex items-center justify-center',
                  style: {
                    transform: 'translateZ(50px)',
                    opacity: 0.6,
                    willChange: 'transform',
                  },
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: params.duration,
                },
              },
              childrenData: [
                {
                  id: textFrontId,
                  type: 'atom' as const,
                  componentId: 'TextAtom',
                  data: {
                    text: displayText,
                    style: {
                      fontSize: params.fontSize * 0.625,
                      fontWeight: fontWeight - 200,
                      color: 'rgba(255,255,255,0.2)',
                      transform: 'rotateY(-90deg) translateZ(200px)',
                      filter: 'blur(1px)',
                      willChange: 'transform',
                    },
                    font: {
                      family: fontFamily,
                      weights: [(fontWeight - 200).toString()],
                    },
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: params.duration,
                    },
                  },
                  effects: [textFrontRotationEffect],
                } as RenderableComponentData,
              ],
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,

        // Refractive overlay
        {
          id: refractiveOverlayId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                backdropFilter: `blur(${params.refractiveBlur}px) brightness(${params.refractiveBrightness})`,
                opacity: 0,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
          effects: [refractiveFadeEffect],
          childrenData: [],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  return {
    output: {
      childrenData: childrenData,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'liquid-light-typokinetics',
  title: 'Liquid Light Typokinetics',
  description:
    'An immersive multi-dimensional typography preset featuring cascading mercury-like light leaks, 3D text rotation with z-axis door-opening animation, caustic water-light patterns, and refractive effects. Text emerges through progressive lighting stages with parallax depth layers at different Z positions. Includes responsive brightness adaptation for caption content importance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'typokinetics',
    '3d',
    'rotation',
    'liquid',
    'light',
    'mercury',
    'caustic',
    'refractive',
    'parallax',
    'immersive',
    'cinematic',
    'progressive',
    'architectural',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIQUID LIGHT',
    duration: 5,
    fontSize: 96,
    fontFamily: 'Inter:800',
    textColor: '#ffffff',
    backgroundColor: '#0a0a0f',
    environmentalLightStart: 0,
    textRotationStart: 1,
    causticStart: 2,
    mercuryFlowStart: 1.5,
    fullBrightnessStart: 3,
    textRotationDuration: 3,
    environmentalLightDuration: 1,
    causticFadeDuration: 1,
    refractiveFadeDuration: 1,
    glowIntensity: 1.0,
    mercuryOpacity: 0.15,
    causticOpacity: 1.0,
    refractiveBlur: 2,
    refractiveBrightness: 1.2,
    useCaption: false,
  },
};

export const liquidLightTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
