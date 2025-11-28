/**
 * Double-Sided Vintage Poster Flip Transition
 * 
 * Creates a vintage cinema-style poster flip transition between two images/videos,
 * treating them as the front and back of a flexible movie poster. Features include:
 * - 3D rotation with flutter/wave distortion during flip
 * - Paper backing reveal at the flip midpoint
 * - Paper texture overlay for vintage aesthetic
 * - Film grain overlay during transition
 * - Worn edges via vignette effect
 * - Subtle wave animation to simulate paper flexibility
 * 
 * Use cases:
 * - Vintage cinema-style transitions
 * - Retro movie poster effects
 * - Film reel aesthetic for video projects
 * - Creative storytelling transitions
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of the first image/video (outgoing)'),
    type: z.enum(['image', 'video']).describe('Type of media for first item'),
    duration: z.number().describe('Duration of first media in seconds'),
  }).describe('First media item (front of poster)'),
  
  media2: z.object({
    src: z.string().describe('Source URL of the second image/video (incoming)'),
    type: z.enum(['image', 'video']).describe('Type of media for second item'),
    duration: z.number().describe('Duration of second media in seconds'),
  }).describe('Second media item (back of poster)'),
  
  transitionDuration: z.number()
    .default(0.9)
    .describe('Duration of the flip transition in seconds'),
  
  paperBackingColor: z.string()
    .default('#fef3c7')
    .describe('Color of the paper backing (kraft paper / off-white)'),
  
  backgroundColor: z.string()
    .default('#1c1917')
    .describe('Background color (stone-800 equivalent)'),
  
  perspective: z.number()
    .default(1200)
    .describe('3D perspective value in pixels'),
  
  flutterIntensity: z.number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Intensity of the flutter/wave distortion during rotation'),
  
  textureOpacity: z.number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Opacity of paper texture overlay'),
  
  filmGrainIntensity: z.number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Intensity of film grain effect during transition'),
  
  vignetteIntensity: z.number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of vignette effect for worn edges'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    transitionDuration,
    paperBackingColor,
    backgroundColor,
    perspective,
    flutterIntensity,
    textureOpacity,
    filmGrainIntensity,
    vignetteIntensity,
  } = params;

  // Calculate base layout duration (sum of media durations minus overlap)
  const baseLayoutDuration = media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media types
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Timing constants
  const flipStart = media1.duration - transitionDuration;
  const flutterDuration = transitionDuration;

  // Create paper texture SVG data URL
  const paperTextureSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.1'/%3E%3C/svg%3E`;

  // Create film grain SVG data URL
  const filmGrainSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E`;

  // Helper function to create paper backing gradient
  const createPaperBackingHtml = () => {
    return `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, ${paperBackingColor} 0%, #f5e6c8 50%, #e8d5b5 100%); box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.1);"></div>`;
  };

  const childrenData: RenderableComponentData[] = [
    // Outgoing media (front of poster)
    {
      id: 'outgoing-media',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          backfaceVisibility: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        // Main rotation effect (0 → 95deg)
        {
          id: 'outgoing-rotate',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: flipStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: 95, prog: 1 },
            ],
          },
        },
        // Flutter effect (wave distortion)
        {
          id: 'outgoing-flutter',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: flipStart,
            duration: flutterDuration,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: -flutterIntensity, prog: 0.25 },
              { key: 'rotateX', val: flutterIntensity, prog: 0.5 },
              { key: 'rotateX', val: -flutterIntensity * 0.5, prog: 0.75 },
              { key: 'rotateX', val: 0, prog: 1 },
            ],
          },
        },
        // Opacity fade (48-52% range)
        {
          id: 'outgoing-fade',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: flipStart + transitionDuration * 0.48,
            duration: transitionDuration * 0.04,
            mode: 'provider',
            targetIds: ['outgoing-media'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Paper backing (visible at 85-95deg range)
    {
      id: 'paper-backing',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: createPaperBackingHtml(),
        className: 'absolute inset-0',
        style: {
          backfaceVisibility: 'hidden',
          zIndex: 15,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
      effects: [
        // Sync rotation with outgoing media
        {
          id: 'backing-rotate',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: flipStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['paper-backing'],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: 95, prog: 1 },
            ],
          },
        },
        // Opacity fade (narrow window at 85-95deg range)
        {
          id: 'backing-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: flipStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['paper-backing'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.85 },
              { key: 'opacity', val: 1, prog: 0.9 },
              { key: 'opacity', val: 0, prog: 0.95 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming media (back of poster)
    {
      id: 'incoming-media',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          backfaceVisibility: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        },
      },
      context: {
        timing: {
          start: flipStart,
          duration: media2.duration + transitionDuration,
        },
      },
      effects: [
        // Reverse rotation (-85deg → 0deg)
        {
          id: 'incoming-rotate',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'rotateY', val: -85, prog: 0 },
              { key: 'rotateY', val: 0, prog: 1 },
            ],
          },
        },
        // Flutter effect (reversed)
        {
          id: 'incoming-flutter',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: flutterDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: flutterIntensity * 0.5, prog: 0.25 },
              { key: 'rotateX', val: -flutterIntensity, prog: 0.5 },
              { key: 'rotateX', val: flutterIntensity, prog: 0.75 },
              { key: 'rotateX', val: 0, prog: 1 },
            ],
          },
        },
        // Opacity fade in
        {
          id: 'incoming-fade',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionDuration * 0.48,
            duration: transitionDuration * 0.04,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Paper texture overlay (constant throughout)
    {
      id: 'texture-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background-image: url('${paperTextureSvg}'); opacity: ${textureOpacity}; mix-blend-mode: multiply; pointer-events: none;"></div>`,
        className: 'absolute inset-0',
        style: {
          zIndex: 20,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
    } as RenderableComponentData,

    // Film grain overlay (animated during transition)
    {
      id: 'film-grain-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background-image: url('${filmGrainSvg}'); mix-blend-mode: overlay; pointer-events: none;"></div>`,
        className: 'absolute inset-0',
        style: {
          zIndex: 25,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
      effects: [
        {
          id: 'grain-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: flipStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['film-grain-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: filmGrainIntensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Vignette overlay (worn edges effect)
    {
      id: 'vignette-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, ${vignetteIntensity}) 100%); pointer-events: none;"></div>`,
        className: 'absolute inset-0',
        style: {
          zIndex: 30,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'double-sided-poster-flip-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor,
          perspective: `${perspective}px`,
          perspectiveOrigin: '50% 50%',
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
      {
        id: 'flip-container',
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
            duration: baseLayoutDuration,
          },
        },
        childrenData: childrenData.slice(0, 3), // outgoing, backing, incoming
      } as RenderableComponentData,
      ...childrenData.slice(3), // overlays (texture, grain, vignette)
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
  id: 'double-sided-poster-flip',
  title: 'Double-Sided Vintage Poster Flip Transition',
  description: 'A vintage cinema-style poster flip transition that treats two images as front and back of a flexible movie poster. Features 3D rotation with flutter/wave distortion, paper backing reveal, paper texture overlay, film grain, and worn edges for an authentic vintage aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vintage', 'poster', 'flip', '3d', 'retro', 'cinema', 'paper', 'film-grain'],
  defaultInputParams: {
    media1: {
      src: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 5,
    },
    media2: {
      src: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 5,
    },
    transitionDuration: 0.9,
    paperBackingColor: '#fef3c7',
    backgroundColor: '#1c1917',
    perspective: 1200,
    flutterIntensity: 2,
    textureOpacity: 0.15,
    filmGrainIntensity: 0.1,
    vignetteIntensity: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const doubleSidedPosterFlipPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};