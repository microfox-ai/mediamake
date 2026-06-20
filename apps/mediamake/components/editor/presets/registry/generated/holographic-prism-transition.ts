/**
 * Holographic Prism Transition Preset
 *
 * This preset creates a sophisticated holographic prism transition effect between two videos.
 * It simulates light passing through a holographic prism with rainbow interference patterns.
 *
 * Features:
 * - **40+ Video Slices**: 20+ horizontal slices per video (5% height each)
 * - **Rainbow Interference**: Animated hue-rotate filters cycling at different rates per band
 * - **Wave-like Phase Shifts**: Staggered animations by slice index * 25ms
 * - **Holographic Shimmer**: Opacity oscillation (0.7-1.0) with brightness shimmer
 * - **Depth Illusion**: Subtle scaleX stretching (0.98-1.02) and translateX offsets
 * - **1s Overlap Transition**: BaseLayout with 1s overlap period for seamless transition
 *
 * Use cases:
 * - Creating futuristic video transitions with rainbow effects
 * - Building holographic light interference animations
 * - Adding prismatic wave patterns to video sequences
 * - Creating sci-fi style video transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  overlapDuration: z.number().default(1).describe('Duration of transition overlap in seconds'),
  
  slicesPerVideo: z.number().default(20).min(10).max(50).describe('Number of horizontal slices per video (20+ recommended)'),
  
  hueRotateMinDuration: z.number().default(0.5).describe('Minimum hue-rotate animation duration in seconds'),
  
  hueRotateMaxDuration: z.number().default(2).describe('Maximum hue-rotate animation duration in seconds'),
  
  opacityMin: z.number().default(0.7).min(0).max(1).describe('Minimum opacity for sine wave oscillation'),
  
  opacityMax: z.number().default(1).min(0).max(1).describe('Maximum opacity for sine wave oscillation'),
  
  scaleXMin: z.number().default(0.98).describe('Minimum scaleX for stretching effect'),
  
  scaleXMax: z.number().default(1.02).describe('Maximum scaleX for stretching effect'),
  
  translateXRange: z.number().default(5).describe('Maximum translateX offset in pixels (±range)'),
  
  staggerDelay: z.number().default(0.025).describe('Stagger delay per slice in seconds (default: 25ms)'),
  
  brightnessMin: z.number().default(0.9).describe('Minimum brightness for shimmer effect'),
  
  brightnessMax: z.number().default(1.2).describe('Maximum brightness for shimmer effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    overlapDuration,
    slicesPerVideo,
    hueRotateMinDuration,
    hueRotateMaxDuration,
    opacityMin,
    opacityMax,
    scaleXMin,
    scaleXMax,
    translateXRange,
    staggerDelay,
    brightnessMin,
    brightnessMax,
  } = params;

  // Helper: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Helper: Create slice effects with holographic interference patterns
  const createSliceEffects = (
    sliceId: string,
    sliceIndex: number,
    isOutgoing: boolean,
    totalSlices: number,
  ) => {
    const stagger = sliceIndex * staggerDelay;
    const effectDuration = overlapDuration;
    
    // Hue-rotate duration varies per slice (creates rainbow interference)
    const hueRotateDuration = randomInRange(hueRotateMinDuration, hueRotateMaxDuration);
    
    // Random translateX offset for each slice
    const translateXOffset = randomInRange(-translateXRange, translateXRange);
    
    // Calculate phase for sine wave patterns (varies by slice)
    const phase = (sliceIndex / totalSlices) * Math.PI * 2;
    
    const effects = [];
    
    // Effect 1: Hue-rotate (rainbow cycling) - different rates per band
    effects.push({
      id: `${sliceId}-hue-rotate`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: stagger,
        duration: effectDuration,
        mode: 'provider' as const,
        targetIds: [sliceId],
        ranges: [
          { key: 'filter', val: `hue-rotate(0deg) brightness(${brightnessMin})`, prog: 0 },
          { key: 'filter', val: `hue-rotate(180deg) brightness(${brightnessMax})`, prog: 0.25 },
          { key: 'filter', val: `hue-rotate(360deg) brightness(${brightnessMin})`, prog: 0.5 },
          { key: 'filter', val: `hue-rotate(540deg) brightness(${brightnessMax})`, prog: 0.75 },
          { key: 'filter', val: `hue-rotate(720deg) brightness(${brightnessMin})`, prog: 1 },
        ],
      },
    });
    
    // Effect 2: Opacity sine wave oscillation (0.7-1.0)
    const opacityMid = (opacityMin + opacityMax) / 2;
    const opacityAmplitude = (opacityMax - opacityMin) / 2;
    
    effects.push({
      id: `${sliceId}-opacity-wave`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: stagger,
        duration: effectDuration,
        mode: 'provider' as const,
        targetIds: [sliceId],
        ranges: [
          { key: 'opacity', val: opacityMid + Math.sin(phase) * opacityAmplitude, prog: 0 },
          { key: 'opacity', val: opacityMid + Math.sin(phase + Math.PI / 2) * opacityAmplitude, prog: 0.25 },
          { key: 'opacity', val: opacityMid + Math.sin(phase + Math.PI) * opacityAmplitude, prog: 0.5 },
          { key: 'opacity', val: opacityMid + Math.sin(phase + Math.PI * 1.5) * opacityAmplitude, prog: 0.75 },
          { key: 'opacity', val: opacityMid + Math.sin(phase + Math.PI * 2) * opacityAmplitude, prog: 1 },
        ],
      },
    });
    
    // Effect 3: ScaleX oscillation (0.98-1.02) for depth illusion
    const scaleXMid = (scaleXMin + scaleXMax) / 2;
    const scaleXAmplitude = (scaleXMax - scaleXMin) / 2;
    
    effects.push({
      id: `${sliceId}-scaleX-wave`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: stagger,
        duration: effectDuration,
        mode: 'provider' as const,
        targetIds: [sliceId],
        ranges: [
          { key: 'scaleX', val: scaleXMid + Math.cos(phase) * scaleXAmplitude, prog: 0 },
          { key: 'scaleX', val: scaleXMid + Math.cos(phase + Math.PI / 2) * scaleXAmplitude, prog: 0.25 },
          { key: 'scaleX', val: scaleXMid + Math.cos(phase + Math.PI) * scaleXAmplitude, prog: 0.5 },
          { key: 'scaleX', val: scaleXMid + Math.cos(phase + Math.PI * 1.5) * scaleXAmplitude, prog: 0.75 },
          { key: 'scaleX', val: scaleXMid + Math.cos(phase + Math.PI * 2) * scaleXAmplitude, prog: 1 },
        ],
      },
    });
    
    // Effect 4: TranslateX with small random offsets
    effects.push({
      id: `${sliceId}-translateX`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: stagger,
        duration: effectDuration,
        mode: 'provider' as const,
        targetIds: [sliceId],
        ranges: [
          { key: 'translateX', val: `${translateXOffset}px`, prog: 0 },
          { key: 'translateX', val: `${-translateXOffset}px`, prog: 0.5 },
          { key: 'translateX', val: `${translateXOffset}px`, prog: 1 },
        ],
      },
    });
    
    return effects;
  };

  // Helper: Create video slices
  const createVideoSlices = (
    video: { src: string; duration: number },
    isOutgoing: boolean,
    startTime: number,
  ): RenderableComponentData[] => {
    const slices: RenderableComponentData[] = [];
    const sliceHeight = 100 / slicesPerVideo; // Percentage height per slice
    
    for (let i = 0; i < slicesPerVideo; i++) {
      const sliceId = `${isOutgoing ? 'outgoing' : 'incoming'}-slice-${i}`;
      const topPosition = i * sliceHeight;
      
      // Calculate objectPosition to sample correct vertical section
      const objectPositionY = (i / (slicesPerVideo - 1)) * 100;
      
      const allEffects = createSliceEffects(sliceId, i, isOutgoing, slicesPerVideo);
      
      slices.push({
        id: sliceId,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: video.src,
          className: 'absolute w-full object-cover',
          style: {
            height: `${sliceHeight}%`,
            top: `${topPosition}%`,
            left: '0%',
            objectFit: 'cover',
            objectPosition: `center ${objectPositionY}%`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video.duration,
          },
        },
        effects: allEffects,
      });
    }
    
    return slices;
  };

  // Calculate timing
  const outgoingStart = 0;
  const incomingStart = outgoingVideo.duration - overlapDuration;
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - overlapDuration;

  // Create outgoing video slices
  const outgoingSlices = createVideoSlices(outgoingVideo, true, outgoingStart);

  // Create incoming video slices
  const incomingSlices = createVideoSlices(incomingVideo, false, incomingStart);

  // Outgoing video container
  const outgoingContainer: RenderableComponentData = {
    id: 'holographic-prism-outgoing-container',
    type: 'layout' as const,
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
        start: outgoingStart,
        duration: outgoingVideo.duration,
      },
    },
    childrenData: outgoingSlices,
  };

  // Incoming video container
  const incomingContainer: RenderableComponentData = {
    id: 'holographic-prism-incoming-container',
    type: 'layout' as const,
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
        start: incomingStart,
        duration: incomingVideo.duration,
      },
    },
    childrenData: incomingSlices,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'holographic-prism-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingContainer, incomingContainer],
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
  id: 'holographic-prism-transition',
  title: 'Holographic Prism Transition',
  description: 'A sophisticated video transition effect that simulates light passing through a holographic prism. Creates 40+ horizontal video slices (20+ per video) that phase shift with rainbow interference patterns. Features hue-rotate cycling at different rates per band, opacity sine wave oscillation (0.7-1), subtle scaleX stretching (0.98-1.02), small translateX offsets, and brightness shimmer effects. All animations are staggered by slice index * 25ms for wave-like interference simulation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'holographic', 'prism', 'rainbow', 'interference', 'video', 'advanced'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 1,
    slicesPerVideo: 20,
    hueRotateMinDuration: 0.5,
    hueRotateMaxDuration: 2,
    opacityMin: 0.7,
    opacityMax: 1,
    scaleXMin: 0.98,
    scaleXMax: 1.02,
    translateXRange: 5,
    staggerDelay: 0.025,
    brightnessMin: 0.9,
    brightnessMax: 1.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const holographicPrismTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
