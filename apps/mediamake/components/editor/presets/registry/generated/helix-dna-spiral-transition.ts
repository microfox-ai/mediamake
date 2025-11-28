/**
 * 3D Helix DNA Spiral Transition Preset
 *
 * Creates a futuristic bio-digital interface transition where videos wrap around a DNA-like
 * double helix structure. Videos are segmented into strips that follow a helical path with
 * wave-like undulation, holographic shimmer effects, and particle trails.
 *
 * Features:
 * - DNA-like double helix structure with 12 video strips
 * - Videos segmented into strips that follow the helical path
 * - Wave-like undulation animation on each strip
 * - Full 360-degree helix rotation during transition
 * - Holographic iridescent shimmer overlay
 * - Animated particle trails following the helix rotation
 * - 3D transforms with preserve-3d and perspective
 * - Smooth organic motion with sine wave easing
 *
 * Use cases:
 * - Futuristic video transitions
 * - Bio-digital interface effects
 * - Science/technology themed videos
 * - Dynamic 3D video presentations
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
    src: z.string().describe('Source URL of first video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }).describe('First video in the transition'),
  video2: z.object({
    src: z.string().describe('Source URL of second video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }).describe('Second video in the transition'),
  transitionDuration: z.number().default(2.2).describe('Duration of the helix transition in seconds'),
  stripCount: z.number().default(12).describe('Number of video strips in the helix (must be even)'),
  helixRadius: z.number().default(200).describe('Radius of the helix in pixels'),
  stripWidth: z.number().default(120).describe('Width of each video strip in pixels'),
  stripHeight: z.number().default(80).describe('Height of each video strip in pixels'),
  stripSpacing: z.number().default(20).describe('Vertical spacing between strips in pixels'),
  undulationAmplitude: z.number().default(15).describe('Amplitude of wave undulation in pixels'),
  particleCount: z.number().default(5).describe('Number of particle trail elements'),
  backgroundColor: z.string().default('#000000').describe('Background color for the transition'),
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
    stripCount,
    helixRadius,
    stripWidth,
    stripHeight,
    stripSpacing,
    undulationAmplitude,
    particleCount,
    backgroundColor,
  } = params;

  // Create video strip components
  const createVideoStrip = (
    index: number,
    video: { src: string; type: 'video' | 'image' },
    totalStrips: number,
  ): RenderableComponentData => {
    const stripId = `strip-${index}`;
    const videoId = `video-strip-${index}`;
    const componentId = video.type === 'video' ? 'VideoAtom' : 'ImageAtom';
    
    // Calculate position in helix
    const rotateY = (index * 360) / totalStrips;
    const translateY = index * stripSpacing;
    
    // Calculate video segment offset (evenly distribute video content across strips)
    const startFrom = index / totalStrips;
    
    // Calculate undulation offset based on strip index
    const undulationPhase = (index / totalStrips) * Math.PI * 2;
    const undulationOffset = Math.sin(undulationPhase) * undulationAmplitude;

    return {
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: `${stripWidth}px`,
            height: `${stripHeight}px`,
            overflow: 'hidden',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            left: '50%',
            top: '50%',
            marginLeft: `-${stripWidth / 2}px`,
            marginTop: `-${stripHeight / 2}px`,
          },
        },
      },
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: componentId as any,
          data: {
            src: video.src,
            fit: 'cover',
            startFrom: startFrom,
            muted: true,
            style: {
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Position effect - maintains static 3D position
        {
          id: `${stripId}-position`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'rotateY', val: rotateY, prog: 0 },
              { key: 'rotateY', val: rotateY, prog: 1 },
              { key: 'translateZ', val: helixRadius, prog: 0 },
              { key: 'translateZ', val: helixRadius, prog: 1 },
              { key: 'translateY', val: translateY, prog: 0 },
              { key: 'translateY', val: translateY, prog: 1 },
            ],
          },
        },
        // Undulation effect - creates wave-like horizontal movement
        {
          id: `${stripId}-undulation`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'translateX', val: undulationOffset, prog: 0 },
              { key: 'translateX', val: undulationOffset + undulationAmplitude, prog: 0.25 },
              { key: 'translateX', val: undulationOffset, prog: 0.5 },
              { key: 'translateX', val: undulationOffset - undulationAmplitude, prog: 0.75 },
              { key: 'translateX', val: undulationOffset, prog: 1 },
            ],
          },
        },
      ],
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData;
  };

  // Create particle trail components
  const createParticle = (index: number): RenderableComponentData => {
    const particleId = `particle-${index}`;
    const phase = (index / particleCount) * Math.PI * 2;
    const baseLeft = 50 + Math.cos(phase) * 10;
    const baseTop = 50 + Math.sin(phase) * 10;
    
    return {
      id: particleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 4px; height: 4px; background: ${index % 2 === 0 ? 'rgba(0,255,255,0.8)' : 'rgba(255,0,255,0.8)'}; border-radius: 50%; box-shadow: 0 0 10px ${index % 2 === 0 ? 'rgba(0,255,255,0.5)' : 'rgba(255,0,255,0.5)'};"></div>`,
        className: 'absolute',
      },
      effects: [
        {
          id: `${particleId}-movement`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'left', val: `${baseLeft}%`, prog: 0 },
              { key: 'left', val: `${baseLeft + 10}%`, prog: 0.5 },
              { key: 'left', val: `${baseLeft}%`, prog: 1 },
              { key: 'top', val: `${baseTop}%`, prog: 0 },
              { key: 'top', val: `${baseTop + 10}%`, prog: 0.5 },
              { key: 'top', val: `${baseTop}%`, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData;
  };

  // Generate video strips (half from video1, half from video2)
  const stripsPerVideo = stripCount / 2;
  const videoStrips: RenderableComponentData[] = [];
  
  for (let i = 0; i < stripsPerVideo; i++) {
    videoStrips.push(createVideoStrip(i, video1, stripCount));
  }
  for (let i = stripsPerVideo; i < stripCount; i++) {
    videoStrips.push(createVideoStrip(i, video2, stripCount));
  }

  // Generate particles
  const particles: RenderableComponentData[] = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(createParticle(i));
  }

  // Helix container with rotation
  const helixContainer: RenderableComponentData = {
    id: 'helix-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          transformStyle: 'preserve-3d',
          width: '100%',
          height: '100%',
        },
      },
    },
    childrenData: videoStrips,
    effects: [
      {
        id: 'helix-rotation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['helix-container'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 360, prog: 1 },
          ],
        },
      },
    ],
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Shimmer overlay
  const shimmerOverlay: RenderableComponentData = {
    id: 'shimmer-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,255,255,0.1) 0%, rgba(255,0,255,0.1) 50%, rgba(0,255,255,0.1) 100%); mix-blend-mode: screen; pointer-events: none;"></div>',
    },
    effects: [
      {
        id: 'shimmer-pulse',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['shimmer-overlay'],
          ranges: [
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Particle container
  const particleContainer: RenderableComponentData = {
    id: 'particle-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    childrenData: particles,
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'helix-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
          backgroundColor: backgroundColor,
        },
      },
    },
    childrenData: [helixContainer, shimmerOverlay, particleContainer],
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
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
  id: 'helix-dna-spiral-transition',
  title: '3D Helix DNA Spiral Transition',
  description: 'A futuristic 3D helix spiral transition where videos wrap around a DNA-like double helix structure. Videos are segmented into strips that follow the helical path with wave-like undulation, holographic shimmer effects, and particle trails. Creates a bio-digital interface feel with smooth rotation and organic motion.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'helix', 'dna', 'spiral', 'futuristic', 'bio-digital', 'holographic', 'particles'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
    },
    transitionDuration: 2.2,
    stripCount: 12,
    helixRadius: 200,
    stripWidth: 120,
    stripHeight: 80,
    stripSpacing: 20,
    undulationAmplitude: 15,
    particleCount: 5,
    backgroundColor: '#000000',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const helixDnaSpiralTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
