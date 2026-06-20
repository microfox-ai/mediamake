/**
 * Scrapbook Paste-Over Transition Preset
 *
 * This preset creates a scrapbook-style transition where the incoming video appears to be
 * pasted on top of the outgoing video with a glue stick effect. Features include:
 * 
 * - Incoming video starts at 70% scale, rotated 3deg, with white paper backing
 * - Animates "pressing down": scale grows to 100%, rotation normalizes to 0deg
 * - Subtle shadow animation (shadow-sm → shadow-2xl → shadow-lg)
 * - Glue squeeze-out effect: semi-transparent white shapes animate from edges
 * - Outgoing video fades to 60% opacity to become background layer
 * - Paper texture overlay and aged photo filters (sepia 20%, contrast 0.9)
 * 
 * Technical details:
 * - BaseLayout duration = video1.duration + video2.duration - 1.5s overlap
 * - Incoming video starts at (video1.duration - 1.5s) for smooth transition
 * - 8 glue shapes positioned around edges with staggered animations
 * - All effects use provider mode with targetIds for clean structure
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  paperTexture: z.object({
    src: z.string().describe('Source URL of paper texture overlay image'),
  }).optional().describe('Optional paper texture overlay'),
  
  transitionDuration: z.number().default(1.5).describe('Duration of transition overlap in seconds'),
  pressDuration: z.number().default(1.0).describe('Duration of press-down animation in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, paperTexture, transitionDuration, pressDuration } = params;
  
  // Calculate BaseLayout duration with overlap
  const baseLayoutDuration = video1.duration + video2.duration - transitionDuration;
  
  // Incoming video starts before video1 ends to create overlap
  const incomingStart = video1.duration - transitionDuration;
  
  // Glue shapes configuration (8 shapes around edges)
  const glueShapes = [
    { id: 'glue-1', top: '10%', left: '48%', size: 24, delay: 0 },
    { id: 'glue-2', top: '48%', right: '10%', size: 20, delay: 0.05 },
    { id: 'glue-3', bottom: '10%', left: '48%', size: 28, delay: 0.1 },
    { id: 'glue-4', top: '48%', left: '10%', size: 20, delay: 0.15 },
    { id: 'glue-5', top: '15%', left: '15%', size: 16, delay: 0.2 },
    { id: 'glue-6', top: '15%', right: '15%', size: 16, delay: 0.25 },
    { id: 'glue-7', bottom: '15%', left: '15%', size: 20, delay: 0.3 },
    { id: 'glue-8', bottom: '15%', right: '15%', size: 16, delay: 0.35 },
  ];
  
  // Build child components
  const childrenData: RenderableComponentData[] = [];
  
  // 1. Outgoing video layer (background, fades to 60% opacity)
  childrenData.push({
    id: 'outgoing-video-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          style: {
            filter: 'sepia(20%) contrast(0.9)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
      } as RenderableComponentData,
    ],
  } as RenderableComponentData);
  
  // 2. Glue effects layer (z-index 15, between videos)
  const glueShapeComponents: RenderableComponentData[] = glueShapes.map((shape) => {
    const positionStyle: Record<string, string> = {
      position: 'absolute',
      width: `${shape.size}px`,
      height: `${shape.size}px`,
    };
    
    if ('top' in shape) positionStyle.top = shape.top;
    if ('bottom' in shape) positionStyle.bottom = shape.bottom;
    if ('left' in shape) positionStyle.left = shape.left;
    if ('right' in shape) positionStyle.right = shape.right;
    
    return {
      id: shape.id,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; border-radius: 50%; background: rgba(255, 255, 255, 0.7);"></div>`,
        style: positionStyle,
      },
      context: {
        timing: {
          start: 0,
          duration: pressDuration,
        },
      },
      effects: [
        {
          id: `${shape.id}-squeeze`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: shape.delay,
            duration: pressDuration - shape.delay,
            mode: 'provider',
            targetIds: [shape.id],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });
  
  childrenData.push({
    id: 'glue-effects-layer',
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
        start: incomingStart,
        duration: pressDuration,
      },
    },
    childrenData: glueShapeComponents,
  } as RenderableComponentData);
  
  // 3. Incoming video layer (z-index 20, animates press-down)
  childrenData.push({
    id: 'incoming-video-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: video2.duration + transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video-wrapper',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'p-2 bg-white shadow-sm',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
        effects: [
          // Scale animation (70% → 100%)
          {
            id: 'press-scale',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: pressDuration,
              mode: 'provider',
              targetIds: ['incoming-video-wrapper'],
              ranges: [
                { key: 'scale', val: 0.7, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
          // Rotation animation (3deg → 0deg)
          {
            id: 'press-rotate',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: pressDuration,
              mode: 'provider',
              targetIds: ['incoming-video-wrapper'],
              ranges: [
                { key: 'rotate', val: 3, prog: 0 },
                { key: 'rotate', val: 0, prog: 1 },
              ],
            },
          },
          // Shadow animation (shadow-sm → shadow-2xl → shadow-lg)
          {
            id: 'press-shadow',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: pressDuration,
              mode: 'provider',
              targetIds: ['incoming-video-wrapper'],
              ranges: [
                { key: 'filter', val: 'drop-shadow(0 1px 2px rgba(0,0,0,0.05))', prog: 0 },
                { key: 'filter', val: 'drop-shadow(0 25px 50px rgba(0,0,0,0.25))', prog: 0.5 },
                { key: 'filter', val: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))', prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: 'incoming-video',
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video2.src,
              className: 'w-full h-full object-cover',
              fit: 'cover',
              style: {
                filter: 'sepia(20%) contrast(0.9)',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: video2.duration + transitionDuration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    ],
  } as RenderableComponentData);
  
  // 4. Paper texture overlay (z-index 50, optional)
  if (paperTexture) {
    childrenData.push({
      id: 'paper-texture-overlay',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: paperTexture.src,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 50,
          opacity: 0.2,
          mixBlendMode: 'overlay',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
    } as RenderableComponentData);
  }
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'scrapbook-paste-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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
  id: 'scrapbook-paste-transition',
  title: 'Scrapbook Paste-Over Transition',
  description: 'A scrapbook-style transition where the incoming video appears to be pasted on top of the outgoing video with a glue stick effect. Features scale/rotate animation, shadow depth changes, glue squeeze-out shapes, paper texture overlay, and aged photo filters.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'scrapbook', 'paste', 'glue', 'paper', 'vintage', 'creative'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    paperTexture: {
      src: 'https://example.com/paper-texture.jpg',
    },
    transitionDuration: 1.5,
    pressDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const scrapbookPasteTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};