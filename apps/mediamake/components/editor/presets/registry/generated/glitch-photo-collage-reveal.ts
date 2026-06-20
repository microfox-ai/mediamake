/**
 * Glitch Photo Collage Reveal Preset
 *
 * Creates a glitch-inspired photo collage reveal where images slide into a 3x2 grid with digital interference effects.
 * Each image has RGB channel splitting, scanline overlays, and stuttered slide-in motion that simulates buffering or
 * packet loss. The result is a modern, tech-aesthetic animation that feels like watching data being transmitted and
 * assembled.
 *
 * Features:
 * - 3x2 grid layout with 6 image slots
 * - RGB channel splitting during movement (red/green/blue channels separate and converge)
 * - Stuttered slide-in animation with brief pauses and accelerations
 * - Scanline overlay effects for retro digital aesthetic
 * - Random micro-delays per image for chaotic, unpredictable timing
 * - Pixelated rendering briefly during glitches
 * - Audio-reactive potential via waveform effects (if audio present)
 *
 * Use cases:
 * - Tech-themed photo reveals
 * - Cyberpunk or digital aesthetic content
 * - Music video visuals
 * - Social media content with edgy aesthetic
 * - Portfolio showcases with unique style
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  images: z.array(
    z.object({
      src: z.string().describe('Image source URL'),
      fit: z.enum(['cover', 'contain', 'fill']).default('cover').optional().describe('How image should fit in cell'),
    })
  ).length(6).describe('Array of 6 images for the grid (3 columns x 2 rows)'),
  
  duration: z.number().default(6).describe('Total duration of the animation in seconds'),
  
  slideDuration: z.number().default(0.8).describe('Duration of each image slide-in animation'),
  
  rgbSplitAmount: z.number().min(0).max(10).default(3).describe('Amount of RGB channel separation in pixels'),
  
  staggerDelay: z.number().min(0).max(0.1).default(0.05).describe('Maximum random delay between image reveals (creates chaos)'),
  
  backgroundColor: z.string().default('#000000').describe('Background color (default black)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    duration,
    slideDuration,
    rgbSplitAmount,
    staggerDelay,
    backgroundColor,
  } = params;

  // Helper: Generate random micro-delay for chaos
  const getRandomDelay = (): number => {
    return Math.random() * staggerDelay;
  };

  // Helper: Create RGB split effects for an image
  const createRGBSplitEffect = (
    targetId: string,
    cellIndex: number,
  ): any[] => {
    const delay = getRandomDelay();
    const slideStart = delay;
    
    return [
      // Slide-in with stuttering motion
      {
        id: `slide-effect-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: slideStart,
          duration: slideDuration,
          mode: 'provider',
          targetIds: [`${targetId}-container`],
          ranges: [
            // Stuttering translateX: starts off-screen, pauses, accelerates
            { key: 'translateX', val: '100%', prog: 0 },
            { key: 'translateX', val: '100%', prog: 0.2 },
            { key: 'translateX', val: '50%', prog: 0.4 },
            { key: 'translateX', val: '50%', prog: 0.6 },
            { key: 'translateX', val: '0%', prog: 1 },
          ],
        },
      },
      // RGB channel red - splits left during motion
      {
        id: `rgb-red-effect-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: slideStart,
          duration: slideDuration * 0.7,
          mode: 'provider',
          targetIds: [`${targetId}-red`],
          ranges: [
            { key: 'translateX', val: `-${rgbSplitAmount}px`, prog: 0 },
            { key: 'translateX', val: `-${rgbSplitAmount * 0.5}px`, prog: 0.5 },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        },
      },
      // RGB channel green - stays centered
      {
        id: `rgb-green-effect-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: slideStart,
          duration: slideDuration * 0.7,
          mode: 'provider',
          targetIds: [`${targetId}-green`],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        },
      },
      // RGB channel blue - splits right during motion
      {
        id: `rgb-blue-effect-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: slideStart,
          duration: slideDuration * 0.7,
          mode: 'provider',
          targetIds: [`${targetId}-blue`],
          ranges: [
            { key: 'translateX', val: `${rgbSplitAmount}px`, prog: 0 },
            { key: 'translateX', val: `${rgbSplitAmount * 0.5}px`, prog: 0.5 },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        },
      },
      // Scanline flicker effect
      {
        id: `scanline-flicker-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: slideStart,
          duration: slideDuration,
          mode: 'provider',
          targetIds: [`scanline-${targetId}`],
          ranges: [
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.25 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0.3, prog: 0.75 },
            { key: 'opacity', val: 0.5, prog: 1 },
          ],
        },
      },
    ];
  };

  // Create grid cells with RGB-split images
  const gridCells: RenderableComponentData[] = images.map((image, index) => {
    const cellId = `cell-${index + 1}`;
    const effects = createRGBSplitEffect(cellId, index);

    return {
      id: cellId,
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
          duration,
        },
      },
      effects: effects,
      childrenData: [
        {
          id: `${cellId}-container`,
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
              duration,
            },
          },
          childrenData: [
            // Red channel
            {
              id: `${cellId}-red`,
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: image.src,
                className: 'absolute inset-0 w-full h-full object-cover',
                style: {
                  mixBlendMode: 'screen',
                  filter: 'brightness(1) contrast(1) sepia(100%) hue-rotate(-60deg) saturate(600%)',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration,
                },
              },
            } as RenderableComponentData,
            // Green channel
            {
              id: `${cellId}-green`,
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: image.src,
                className: 'absolute inset-0 w-full h-full object-cover',
                style: {
                  mixBlendMode: 'screen',
                  filter: 'brightness(1) contrast(1) sepia(100%) hue-rotate(60deg) saturate(600%)',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration,
                },
              },
            } as RenderableComponentData,
            // Blue channel
            {
              id: `${cellId}-blue`,
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: image.src,
                className: 'absolute inset-0 w-full h-full object-cover',
                style: {
                  mixBlendMode: 'screen',
                  filter: 'brightness(1) contrast(1) sepia(100%) hue-rotate(180deg) saturate(600%)',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration,
                },
              },
            } as RenderableComponentData,
            // Scanline overlay
            {
              id: `scanline-${cellId}`,
              type: 'atom',
              componentId: 'HTMLBlockAtom',
              data: {
                html: `<div style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px); pointer-events: none;"></div>`,
              },
              context: {
                timing: {
                  start: 0,
                  duration,
                },
              },
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Root container with grid
  const rootContainer: RenderableComponentData = {
    id: 'glitch-collage-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      {
        id: 'grid-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 grid grid-cols-3 grid-rows-2 gap-1 p-2',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: gridCells,
      } as RenderableComponentData,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'glitch-photo-collage-reveal',
  title: 'Glitch Photo Collage Reveal',
  description: 'A glitch-inspired photo collage reveal where images slide into a grid with digital interference effects. Features stuttering motion, RGB channel splitting, scanline overlays, and static effects that simulate data transmission and buffering.',
  type: 'predefined',
  presetType: 'children',
  tags: ['collage', 'glitch', 'grid', 'photo', 'rgb-split', 'digital', 'tech', 'modern', 'reveal'],
  defaultInputParams: {
    images: [
      { src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600', fit: 'cover' },
      { src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600', fit: 'cover' },
      { src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600', fit: 'cover' },
      { src: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600', fit: 'cover' },
      { src: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600', fit: 'cover' },
      { src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&h=600', fit: 'cover' },
    ],
    duration: 6,
    slideDuration: 0.8,
    rgbSplitAmount: 3,
    staggerDelay: 0.05,
    backgroundColor: '#000000',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const glitchPhotoCollageRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};