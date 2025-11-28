/**
 * Glitch Pixel Sort Transition Preset
 *
 * A glitch-style pixel sorting transition that creates vertical scan lines of corrupted data between videos.
 * The transition uses a 2-second overlap where the outgoing video breaks into vertical strips that sort and
 * displace randomly, simulating a digital malfunction. Multiple thin vertical slices animate independently
 * with different timing offsets, creating a cascading corruption effect.
 *
 * Features:
 * - **Vertical Slice Animation**: 10-15 vertical strips with independent timing and random displacement
 * - **Pixel Sorting Effect**: Strips shift vertically with random offsets (-50px to 50px)
 * - **Opacity Flickering**: Each slice flickers between 0.3 and 1 opacity
 * - **Digital Noise Overlay**: Semi-transparent CSS noise gradient for data corruption aesthetic
 * - **Color Inversion & Brightness Spikes**: Brief moments of color inversion and brightness changes
 * - **Inverse Animation Pattern**: Incoming video uses opposite animation (corrupted → normal)
 *
 * Use Cases:
 * - Creating glitch-style video transitions
 * - Digital malfunction effects between clips
 * - Tech/cyberpunk aesthetic videos
 * - Music videos with corrupted data themes
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of first video'),
    duration: z.number().describe('Duration of first video in seconds'),
  }).describe('First video (outgoing)'),
  
  video2: z.object({
    src: z.string().describe('Source URL of second video'),
    duration: z.number().describe('Duration of second video in seconds'),
  }).describe('Second video (incoming)'),
  
  transitionDuration: z.number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of transition overlap in seconds'),
  
  sliceCount: z.number()
    .int()
    .min(10)
    .max(15)
    .default(12)
    .describe('Number of vertical slices (10-15 recommended)'),
  
  maxDisplacement: z.number()
    .min(20)
    .max(100)
    .default(50)
    .describe('Maximum vertical displacement in pixels'),
  
  colorInversionChance: z.number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Probability of color inversion per slice (0-1)'),
  
  brightnessIntensity: z.number()
    .min(1)
    .max(2)
    .default(1.5)
    .describe('Maximum brightness spike intensity'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    sliceCount,
    maxDisplacement,
    colorInversionChance,
    brightnessIntensity,
  } = params;

  // Helper: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate random displacement
  const randomDisplacement = (): number => {
    return randomInRange(-maxDisplacement, maxDisplacement);
  };

  // Helper: Generate staggered delay for cascade effect
  const getStaggerDelay = (index: number): number => {
    return index * 0.05; // 50ms stagger between slices
  };

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Create vertical slices for video1 (outgoing)
  const video1Slices: RenderableComponentData[] = [];
  
  for (let i = 0; i < sliceCount; i++) {
    const sliceWidth = 100 / sliceCount;
    const leftPosition = i * sliceWidth;
    const sliceId = `video1-slice-${i}`;
    
    // Random parameters for this slice
    const displacement = randomDisplacement();
    const staggerDelay = getStaggerDelay(i);
    const hasColorInversion = Math.random() < colorInversionChance;
    const brightnessPeak = randomInRange(1, brightnessIntensity);
    
    // Create clip-path for vertical slice
    const clipPath = `polygon(${leftPosition}% 0%, ${leftPosition + sliceWidth}% 0%, ${leftPosition + sliceWidth}% 100%, ${leftPosition}% 100%)`;
    
    // Create slice container with clipping
    const sliceContainer: RenderableComponentData = {
      id: sliceId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      childrenData: [
        {
          id: `${sliceId}-video`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              transform: `translateX(-${leftPosition}%)`,
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
      effects: [
        // Vertical displacement during transition
        {
          id: `${sliceId}-displacement`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: video1.duration - transitionDuration + staggerDelay,
            duration: Math.min(transitionDuration - staggerDelay, transitionDuration * 0.8),
            mode: 'provider',
            targetIds: [sliceId],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: displacement, prog: 1 },
            ],
          },
        },
        // Opacity flickering
        {
          id: `${sliceId}-opacity-flicker`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: video1.duration - transitionDuration + staggerDelay,
            duration: Math.min(transitionDuration - staggerDelay, transitionDuration * 0.8),
            mode: 'provider',
            targetIds: [sliceId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.5, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Color inversion (if enabled for this slice)
        ...(hasColorInversion ? [{
          id: `${sliceId}-color-invert`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: video1.duration - transitionDuration + staggerDelay + 0.1,
            duration: 0.2,
            mode: 'provider',
            targetIds: [sliceId],
            ranges: [
              { key: 'filter', val: 'invert(0)', prog: 0 },
              { key: 'filter', val: 'invert(1)', prog: 0.5 },
              { key: 'filter', val: 'invert(0)', prog: 1 },
            ],
          },
        }] : []),
        // Brightness spike
        {
          id: `${sliceId}-brightness`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: video1.duration - transitionDuration + staggerDelay + 0.15,
            duration: 0.15,
            mode: 'provider',
            targetIds: [sliceId],
            ranges: [
              { key: 'filter', val: 'brightness(1)', prog: 0 },
              { key: 'filter', val: `brightness(${brightnessPeak})`, prog: 0.5 },
              { key: 'filter', val: 'brightness(1)', prog: 1 },
            ],
          },
        },
      ],
    };
    
    video1Slices.push(sliceContainer);
  }

  // Create vertical slices for video2 (incoming) - INVERSE animation
  const video2Slices: RenderableComponentData[] = [];
  
  for (let i = 0; i < sliceCount; i++) {
    const sliceWidth = 100 / sliceCount;
    const leftPosition = i * sliceWidth;
    const sliceId = `video2-slice-${i}`;
    
    // Random parameters (inverse pattern - start displaced, end normal)
    const displacement = randomDisplacement();
    const staggerDelay = getStaggerDelay(sliceCount - 1 - i); // Reverse stagger
    const hasColorInversion = Math.random() < colorInversionChance;
    const brightnessPeak = randomInRange(1, brightnessIntensity);
    
    // Create clip-path for vertical slice
    const clipPath = `polygon(${leftPosition}% 0%, ${leftPosition + sliceWidth}% 0%, ${leftPosition + sliceWidth}% 100%, ${leftPosition}% 100%)`;
    
    // Create slice container with clipping
    const sliceContainer: RenderableComponentData = {
      id: sliceId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath,
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: video2.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: `${sliceId}-video`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              transform: `translateX(-${leftPosition}%)`,
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
      effects: [
        // Vertical displacement (inverse: start displaced, end normal)
        {
          id: `${sliceId}-displacement`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: staggerDelay,
            duration: Math.min(transitionDuration - staggerDelay, transitionDuration * 0.8),
            mode: 'provider',
            targetIds: [sliceId],
            ranges: [
              { key: 'translateY', val: displacement, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
        // Opacity flickering (inverse: start low, end normal)
        {
          id: `${sliceId}-opacity-flicker`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: staggerDelay,
            duration: Math.min(transitionDuration - staggerDelay, transitionDuration * 0.8),
            mode: 'provider',
            targetIds: [sliceId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 0.4 },
              { key: 'opacity', val: 0.3, prog: 0.6 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Color inversion (if enabled for this slice)
        ...(hasColorInversion ? [{
          id: `${sliceId}-color-invert`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: staggerDelay + 0.1,
            duration: 0.2,
            mode: 'provider',
            targetIds: [sliceId],
            ranges: [
              { key: 'filter', val: 'invert(1)', prog: 0 },
              { key: 'filter', val: 'invert(0)', prog: 0.5 },
              { key: 'filter', val: 'invert(1)', prog: 1 },
            ],
          },
        }] : []),
        // Brightness spike
        {
          id: `${sliceId}-brightness`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: staggerDelay + 0.15,
            duration: 0.15,
            mode: 'provider',
            targetIds: [sliceId],
            ranges: [
              { key: 'filter', val: `brightness(${brightnessPeak})`, prog: 0 },
              { key: 'filter', val: 'brightness(1)', prog: 0.5 },
              { key: 'filter', val: `brightness(${brightnessPeak})`, prog: 1 },
            ],
          },
        },
      ],
    };
    
    video2Slices.push(sliceContainer);
  }

  // Create digital noise overlay
  const noiseOverlay: RenderableComponentData = {
    id: 'noise-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 2px, transparent 4px, rgba(255,255,255,0.03) 4px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, transparent 2px, transparent 4px, rgba(255,255,255,0.03) 4px);"></div>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        mixBlendMode: 'screen',
        opacity: 0.3,
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
  };

  // Assemble root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-pixel-sort-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      ...video1Slices,
      ...video2Slices,
      noiseOverlay,
    ] as RenderableComponentData[],
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
  id: 'glitch-pixel-sort-transition',
  title: 'Glitch Pixel Sort Transition',
  description: 'A glitch-style pixel sorting transition that creates vertical scan lines of corrupted data between videos. Features vertical strips with random displacement, opacity fluctuations, color inversion, and digital noise overlay for a data corruption aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'glitch', 'pixel-sort', 'video', 'corruption', 'digital', 'malfunction', 'cyberpunk', 'tech'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 2,
    sliceCount: 12,
    maxDisplacement: 50,
    colorInversionChance: 0.3,
    brightnessIntensity: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchPixelSortTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
