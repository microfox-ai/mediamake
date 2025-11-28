/**
 * Paper Cutout Puppet Show Transition Preset
 *
 * This preset creates a theatrical paper puppet show transition where hand-cut silhouette 
 * characters on wooden sticks move across the screen to wipe between videos. The effect 
 * simulates vintage paper puppet theater aesthetics with wobbly movement, rough edges, 
 * visible sticks, vignette overlay, and paper grain texture.
 *
 * Features:
 * - 4 unique silhouette characters with irregular hand-cut paths
 * - Visible wooden puppet sticks attached to each silhouette
 * - Staggered animation timing (0.4s delays) for organic entry
 * - Wobbly movement with ±2deg rotation and steps(5) timing for hand-animated feel
 * - Crossfade between outgoing and incoming videos during transition
 * - Vintage vignette overlay for old theater aesthetic
 * - Paper grain texture with screen blend mode
 *
 * Technical Implementation:
 * - BaseLayout with 2.5s overlap period
 * - Silhouettes slide in from 4 different edges (left, right, top, bottom)
 * - Dark gray silhouettes (z-30) reveal incoming video behind them
 * - Outgoing video fades from opacity 1 to 0
 * - Incoming video at z-0 (background layer)
 * - Radial gradient vignette overlay (z-40)
 * - Paper grain texture overlay with mix-blend-screen (z-50)
 *
 * Use Cases:
 * - Theatrical video transitions
 * - Vintage/retro content transitions
 * - Children's content or puppet show themes
 * - Creative storytelling transitions
 * - Artistic wipe effects between scenes
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
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the transition overlap in seconds'),
  silhouetteColor: z
    .string()
    .default('#1a1a1a')
    .describe('Color of the silhouette cutouts'),
  stickColor: z
    .string()
    .default('#8B7355')
    .describe('Color of the wooden puppet sticks'),
  wobbleAmount: z
    .number()
    .default(2)
    .describe('Amount of rotation wobble in degrees (±)'),
  staggerDelay: z
    .number()
    .default(0.4)
    .describe('Delay between each silhouette animation in seconds'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of the vignette overlay (0-1)'),
  grainOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Opacity of the paper grain texture (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    silhouetteColor,
    stickColor,
    wobbleAmount,
    staggerDelay,
    vignetteIntensity,
    grainOpacity,
  } = params;

  // Helper function to create silhouette SVG paths (hand-cut irregular shapes)
  const createSilhouettePath = (type: number): string => {
    const paths = [
      // Silhouette 1: Character-like shape
      'M 50 10 L 45 25 L 35 30 L 30 45 L 25 60 L 20 75 L 25 95 L 40 110 L 60 110 L 75 95 L 80 75 L 75 60 L 70 45 L 65 30 L 55 25 Z',
      // Silhouette 2: Creature-like shape
      'M 30 20 L 40 15 L 55 10 L 70 15 L 75 25 L 80 40 L 78 55 L 82 70 L 85 85 L 80 100 L 65 110 L 45 115 L 30 110 L 20 95 L 15 75 L 18 55 L 22 40 L 25 25 Z',
      // Silhouette 3: Object-like shape
      'M 50 5 L 40 12 L 30 22 L 25 35 L 20 50 L 18 65 L 22 80 L 30 95 L 45 105 L 60 108 L 75 100 L 82 85 L 85 70 L 83 55 L 78 40 L 70 25 L 60 15 Z',
      // Silhouette 4: Animal-like shape
      'M 45 8 L 35 18 L 28 30 L 22 45 L 18 60 L 20 75 L 28 90 L 40 102 L 55 110 L 70 108 L 80 98 L 85 85 L 88 70 L 86 55 L 80 40 L 70 28 L 58 18 Z',
    ];
    return paths[type] || paths[0];
  };

  // Helper function to create stick HTML
  const createStick = (height: number): string => {
    return `<div style='width: 4px; height: ${height}px; background: linear-gradient(180deg, ${stickColor} 0%, #6B5845 100%); position: absolute; bottom: -${height}px; left: 50%; transform: translateX(-50%); border-radius: 2px;'></div>`;
  };

  // Silhouette configurations (from different edges)
  const silhouettes = [
    {
      id: 'silhouette-1',
      width: 180,
      height: 200,
      stickHeight: 120,
      startPos: { bottom: '20%', left: '-200px' },
      endPos: { translateX: 'calc(100vw + 200px)', translateY: '0px' },
      delay: 0,
      pathType: 0,
    },
    {
      id: 'silhouette-2',
      width: 160,
      height: 180,
      stickHeight: 110,
      startPos: { top: '15%', right: '-200px' },
      endPos: { translateX: 'calc(-100vw - 200px)', translateY: '0px' },
      delay: staggerDelay,
      pathType: 1,
    },
    {
      id: 'silhouette-3',
      width: 140,
      height: 160,
      stickHeight: 100,
      startPos: { top: '-200px', left: '30%' },
      endPos: { translateX: '0px', translateY: 'calc(100vh + 200px)' },
      delay: staggerDelay * 2,
      pathType: 2,
    },
    {
      id: 'silhouette-4',
      width: 170,
      height: 190,
      stickHeight: 115,
      startPos: { bottom: '-200px', right: '25%' },
      endPos: { translateX: '0px', translateY: 'calc(-100vh - 200px)' },
      delay: staggerDelay * 3,
      pathType: 3,
    },
  ];

  // Create silhouette components
  const silhouetteComponents: RenderableComponentData[] = silhouettes.map(
    (config) => {
      const containerId = `${config.id}-container`;
      const stickId = `${config.id}-stick`;
      const shapeId = `${config.id}-shape`;

      return {
        id: containerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              ...config.startPos,
              width: `${config.width}px`,
              height: `${config.height}px`,
              zIndex: 30,
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
          // Slide animation with wobble
          {
            id: `${config.id}-slide`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: config.delay,
              duration: transitionDuration - config.delay,
              mode: 'provider',
              targetIds: [containerId],
              ranges: [
                { key: 'translateX', val: '0px', prog: 0 },
                { key: 'translateX', val: config.endPos.translateX, prog: 1 },
                { key: 'translateY', val: '0px', prog: 0 },
                { key: 'translateY', val: config.endPos.translateY, prog: 1 },
              ],
            },
          },
          // Wobble rotation with steps timing
          {
            id: `${config.id}-wobble`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: config.delay,
              duration: transitionDuration - config.delay,
              mode: 'provider',
              targetIds: [containerId],
              ranges: [
                { key: 'rotate', val: wobbleAmount, prog: 0 },
                { key: 'rotate', val: -wobbleAmount, prog: 0.2 },
                { key: 'rotate', val: wobbleAmount, prog: 0.4 },
                { key: 'rotate', val: -wobbleAmount, prog: 0.6 },
                { key: 'rotate', val: wobbleAmount, prog: 0.8 },
                { key: 'rotate', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          // Stick
          {
            id: stickId,
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: createStick(config.stickHeight),
              className: 'absolute inset-0',
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          } as RenderableComponentData,
          // Silhouette shape
          {
            id: shapeId,
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: `<svg viewBox='0 0 100 120' style='width: 100%; height: 100%;'><path d='${createSilhouettePath(config.pathType)}' fill='${silhouetteColor}' stroke='#0a0a0a' stroke-width='1.5'/></svg>`,
              className: 'absolute inset-0',
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Create paper grain texture (base64 encoded SVG)
  const grainTextureDataUrl =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii45IiBudW1PY3RhdmVzPSI0IiB0eXBlPSJmcmFjdGFsTm9pc2UiLz48ZmVDb2xvck1hdHJpeCB0eXBlPSJzYXR1cmF0ZSIgdmFsdWVzPSIwIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuNSIvPjwvc3ZnPg==';

  // Build complete composition
  const childrenData: RenderableComponentData[] = [
    // Outgoing video (fades out)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'absolute inset-0 w-full h-full',
        fit: 'cover',
        style: {
          objectFit: 'cover',
          zIndex: 10,
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
          id: 'outgoing-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video (background layer)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        className: 'absolute inset-0 w-full h-full',
        fit: 'cover',
        style: {
          objectFit: 'cover',
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Silhouette group container
    {
      id: 'silhouette-group',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 30,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: silhouetteComponents,
    } as RenderableComponentData,

    // Vignette overlay
    {
      id: 'vignette-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 40%, rgba(0,0,0,${vignetteIntensity * 0.4}) 80%, rgba(0,0,0,${vignetteIntensity}) 100%); pointer-events: none;'></div>`,
        className: 'absolute inset-0',
        style: {
          zIndex: 40,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Paper grain overlay
    {
      id: 'grain-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='position: absolute; inset: 0; background-image: url(${grainTextureDataUrl}); mix-blend-mode: screen; opacity: ${grainOpacity}; pointer-events: none;'></div>`,
        className: 'absolute inset-0',
        style: {
          zIndex: 50,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'paper-puppet-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
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

const presetMetadata: PresetMetadata = {
  id: 'paper-puppet-transition',
  title: 'Paper Cutout Puppet Show Transition',
  description:
    'A theatrical paper puppet theater transition where hand-cut silhouette characters on sticks sweep across the screen to wipe between videos. Features 4 character silhouettes with wobbly movement, visible sticks, rough hand-cut edges, vintage vignette, and paper grain texture for authentic puppet theater aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'puppet', 'theater', 'vintage', 'wipe', 'silhouette'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 2.5,
    silhouetteColor: '#1a1a1a',
    stickColor: '#8B7355',
    wobbleAmount: 2,
    staggerDelay: 0.4,
    vignetteIntensity: 0.7,
    grainOpacity: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const paperPuppetTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
