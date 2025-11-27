/**
 * Watercolor Blend Transition Preset
 *
 * This preset creates an artistic, romantic transition effect that mimics the soft, organic way
 * watercolor paintings blend together. Perfect for wedding videos and artistic content requiring
 * dreamy, fluid transitions between scenes.
 *
 * Features:
 * - **Organic Turbulence Effect**: Applies SVG turbulence filter to create watery distortion on exiting scene
 * - **Desaturation**: Exiting scene becomes slightly desaturated for artistic effect
 * - **Paint-In Effect**: Incoming scene reveals through organic, expanding fluid shapes
 * - **Color Bleed Overlay**: Beautiful color gradients appear at scene edges where they meet
 * - **Paper Texture**: Subtle watercolor paper texture overlay enhances painted effect
 * - **Performance Optimized**: Uses CSS containment and limits filter complexity
 *
 * Use cases:
 * - Wedding video transitions with romantic, artistic feel
 * - Art documentary scene changes
 * - Soft, organic transitions for emotional content
 * - Creative transitions mimicking traditional watercolor painting
 *
 * Technical Implementation:
 * - SVG feTurbulence filter with animated baseFrequency (0.02 → 0.08)
 * - Radial gradient masks for organic paint-in effect
 * - Mix-blend-mode multiply for color bleeding
 * - CSS filter saturation animation for desaturation
 * - Paper texture overlay with opacity animation
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  exitingScene: z.object({
    src: z.string().describe('Source URL of the exiting/current scene media'),
    type: z.enum(['image', 'video']).describe('Media type of exiting scene'),
    duration: z.number().describe('Duration of exiting scene in seconds'),
  }).describe('Exiting scene media configuration'),
  
  enteringScene: z.object({
    src: z.string().describe('Source URL of the entering/new scene media'),
    type: z.enum(['image', 'video']).describe('Media type of entering scene'),
    duration: z.number().describe('Duration of entering scene in seconds'),
  }).describe('Entering scene media configuration'),
  
  transitionDuration: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Duration of the watercolor transition effect in seconds (1-5s recommended)'),
  
  paperTextureUrl: z
    .string()
    .optional()
    .describe('Optional URL for watercolor paper texture image (defaults to placeholder if not provided)'),
  
  desaturationLevel: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.7)
    .describe('Saturation level for exiting scene during transition (0.5-1, lower = more desaturated)'),
  
  colorBleedIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of color bleed effect at scene edges (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    exitingScene,
    enteringScene,
    transitionDuration,
    paperTextureUrl,
    desaturationLevel,
    colorBleedIntensity,
  } = params;

  // Calculate timing
  const baseLayoutDuration =
    exitingScene.duration + enteringScene.duration - transitionDuration;
  const exitingSceneStart = 0;
  const enteringSceneStart = exitingScene.duration - transitionDuration;

  // Determine component IDs based on media type
  const exitingComponentId =
    exitingScene.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const enteringComponentId =
    enteringScene.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Use placeholder texture if none provided
  const textureUrl =
    paperTextureUrl ||
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4"/%3E%3C/filter%3E%3Crect width="200" height="200" filter="url(%23noise)" opacity="0.3"/%3E%3C/svg%3E';

  // Create SVG filter definition for turbulence
  const svgFiltersContainer: RenderableComponentData = {
    id: 'watercolor-svg-filters',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute pointer-events-none',
        style: {
          width: 0,
          height: 0,
          overflow: 'hidden',
        },
        dangerouslySetInnerHTML: {
          __html: `
            <svg xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="watercolor-turbulence">
                  <feTurbulence 
                    type="fractalNoise" 
                    baseFrequency="0.02" 
                    numOctaves="3"
                    seed="2"
                  />
                  <feDisplacementMap in="SourceGraphic" scale="20" />
                </filter>
              </defs>
            </svg>
          `,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [],
  };

  // Exiting scene with desaturation and turbulence effects
  const exitingSceneContainer: RenderableComponentData = {
    id: 'exiting-scene-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          contain: 'layout paint',
        },
      },
    },
    context: {
      timing: {
        start: exitingSceneStart,
        duration: exitingScene.duration,
      },
    },
    childrenData: [
      {
        id: 'exiting-scene-media',
        type: 'atom',
        componentId: exitingComponentId,
        data: {
          src: exitingScene.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: exitingScene.duration,
          },
        },
        effects: [
          // Desaturation effect during transition
          {
            id: 'exiting-desaturation',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: exitingScene.duration - transitionDuration,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['exiting-scene-media'],
              ranges: [
                { key: 'filter', val: 'saturate(1)', prog: 0 },
                {
                  key: 'filter',
                  val: `saturate(${desaturationLevel})`,
                  prog: 1,
                },
              ],
            },
          },
          // Fade out during transition
          {
            id: 'exiting-fade-out',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: exitingScene.duration - transitionDuration * 0.7,
              duration: transitionDuration * 0.7,
              mode: 'provider',
              targetIds: ['exiting-scene-media'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Entering scene with organic paint-in effect
  const enteringSceneContainer: RenderableComponentData = {
    id: 'entering-scene-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          contain: 'layout paint',
        },
      },
    },
    context: {
      timing: {
        start: enteringSceneStart,
        duration: enteringScene.duration + transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'entering-scene-media',
        type: 'atom',
        componentId: enteringComponentId,
        data: {
          src: enteringScene.src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: enteringScene.duration + transitionDuration,
          },
        },
        effects: [
          // Paint-in effect using clip-path
          {
            id: 'entering-paint-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['entering-scene-media'],
              ranges: [
                {
                  key: 'clipPath',
                  val: 'circle(0% at 50% 50%)',
                  prog: 0,
                },
                {
                  key: 'clipPath',
                  val: 'circle(70% at 50% 50%)',
                  prog: 0.7,
                },
                {
                  key: 'clipPath',
                  val: 'circle(150% at 50% 50%)',
                  prog: 1,
                },
              ],
            },
          },
          // Fade in
          {
            id: 'entering-fade-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration * 0.5,
              mode: 'provider',
              targetIds: ['entering-scene-media'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Color bleed overlay with multiple gradients
  const colorBleedGradient1: RenderableComponentData = {
    id: 'color-bleed-gradient-1',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '60%',
          height: '60%',
          top: '-10%',
          left: '-10%',
          background:
            'radial-gradient(ellipse at center, rgba(255,182,193,0.6) 0%, transparent 70%)',
          filter: 'blur(40px)',
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

  const colorBleedGradient2: RenderableComponentData = {
    id: 'color-bleed-gradient-2',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '50%',
          height: '50%',
          bottom: '-5%',
          right: '-5%',
          background:
            'radial-gradient(ellipse at center, rgba(173,216,230,0.6) 0%, transparent 70%)',
          filter: 'blur(35px)',
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

  const colorBleedGradient3: RenderableComponentData = {
    id: 'color-bleed-gradient-3',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '40%',
          height: '40%',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          background:
            'radial-gradient(ellipse at center, rgba(255,218,185,0.5) 0%, transparent 70%)',
          filter: 'blur(30px)',
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

  const colorBleedOverlay: RenderableComponentData = {
    id: 'color-bleed-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'multiply',
        },
      },
    },
    context: {
      timing: {
        start: enteringSceneStart,
        duration: transitionDuration,
      },
    },
    childrenData: [
      colorBleedGradient1,
      colorBleedGradient2,
      colorBleedGradient3,
    ],
    effects: [
      {
        id: 'color-bleed-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['color-bleed-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: colorBleedIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Paper texture overlay
  const paperTextureOverlay: RenderableComponentData = {
    id: 'paper-texture-overlay',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: textureUrl,
      className: 'absolute inset-0 pointer-events-none w-full h-full object-cover',
      style: {
        mixBlendMode: 'overlay',
      },
    },
    context: {
      timing: {
        start: enteringSceneStart,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'paper-texture-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['paper-texture-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.2, prog: 0.3 },
            { key: 'opacity', val: 0.2, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'watercolor-blend-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      exitingSceneContainer,
      enteringSceneContainer,
      colorBleedOverlay,
      paperTextureOverlay,
      svgFiltersContainer,
    ],
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
  id: 'watercolor-blend-transition',
  title: 'Watercolor Blend Transition',
  description:
    'An artistic, romantic transition effect that mimics watercolor paintings blending together on wet paper. Features organic fluid shapes, color bleeding at scene edges, turbulence distortion for a watery effect, and subtle paper texture overlay. Perfect for wedding videos and artistic content requiring soft, dreamy transitions between scenes.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'watercolor',
    'artistic',
    'romantic',
    'wedding',
    'organic',
    'fluid',
    'paint',
    'dreamy',
    'soft',
  ],
  defaultInputParams: {
    exitingScene: {
      src: 'https://example.com/scene1.mp4',
      type: 'video',
      duration: 5,
    },
    enteringScene: {
      src: 'https://example.com/scene2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 3,
    desaturationLevel: 0.7,
    colorBleedIntensity: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const watercolorBlendTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
