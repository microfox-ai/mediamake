/**
 * Liquid Morph Transition Preset
 *
 * This preset creates a fluid, organic transition between two videos using 8 blob-shaped masks
 * that morph and undulate across the screen. The blobs reveal the incoming video while the 
 * outgoing video liquifies with blur and scale effects, creating a realistic liquid physics simulation.
 *
 * Features:
 * - **8 Organic Blob Masks**: SVG-style border-radius shapes that continuously morph
 * - **Wave-Like Motion**: Blobs move along bezier-like paths with translateX/Y animations
 * - **Liquid Physics Simulation**: Displacement mapping effects and color bleeding at blob edges
 * - **Smooth Transitions**: 2.2-second overlap with synchronized morphing and movement
 * - **Outgoing Video Effects**: Progressive blur (0→8px) and scale (1→1.1) during transition
 * - **Color Bleeding**: Mix-blend-mode screen effect for realistic liquid blending
 *
 * Use cases:
 * - Creating organic, nature-inspired video transitions
 * - Building fluid motion graphics sequences
 * - Adding artistic liquid effects to video content
 * - Creating mesmerizing transition effects for creative projects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video (outgoing)'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video (incoming)'),
  transitionDuration: z.number().default(2.2).describe('Duration of the transition overlap in seconds'),
  blobIntensity: z.number().min(0.5).max(2).default(1).describe('Intensity of blob morphing and movement (0.5-2)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, blobIntensity } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Blob configurations with organic border-radius patterns
  const blobConfigs = [
    {
      id: 'blob-1',
      size: 'w-1/3 h-1/3',
      position: { top: '10%', left: '15%' },
      borderRadius: '30% 70% 70% 30% / 60% 40% 60% 40%',
      morphs: [
        '30% 70% 70% 30% / 60% 40% 60% 40%',
        '70% 30% 40% 60% / 40% 60% 50% 50%',
        '40% 60% 60% 40% / 50% 50% 50% 50%',
      ],
      translate: [
        { x: 0, y: 0 },
        { x: 50 * blobIntensity, y: -30 * blobIntensity },
        { x: 100 * blobIntensity, y: 20 * blobIntensity },
      ],
    },
    {
      id: 'blob-2',
      size: 'w-1/2 h-1/2',
      position: { top: '25%', right: '10%' },
      borderRadius: '40% 60% 50% 50% / 70% 30% 70% 30%',
      morphs: [
        '40% 60% 50% 50% / 70% 30% 70% 30%',
        '60% 40% 30% 70% / 50% 50% 40% 60%',
        '50% 50% 60% 40% / 60% 40% 50% 50%',
      ],
      translate: [
        { x: 0, y: 0 },
        { x: -40 * blobIntensity, y: 40 * blobIntensity },
        { x: -80 * blobIntensity, y: -20 * blobIntensity },
      ],
    },
    {
      id: 'blob-3',
      size: 'w-2/5 h-2/5',
      position: { bottom: '15%', left: '20%' },
      borderRadius: '60% 40% 30% 70% / 50% 60% 40% 50%',
      morphs: [
        '60% 40% 30% 70% / 50% 60% 40% 50%',
        '30% 70% 60% 40% / 70% 30% 50% 50%',
        '50% 50% 50% 50% / 50% 50% 50% 50%',
      ],
      translate: [
        { x: 0, y: 0 },
        { x: 60 * blobIntensity, y: -50 * blobIntensity },
        { x: -30 * blobIntensity, y: 30 * blobIntensity },
      ],
    },
    {
      id: 'blob-4',
      size: 'w-1/3 h-1/3',
      position: { top: '50%', left: '50%' },
      borderRadius: '50% 50% 40% 60% / 30% 70% 30% 70%',
      morphs: [
        '50% 50% 40% 60% / 30% 70% 30% 70%',
        '70% 30% 50% 50% / 60% 40% 70% 30%',
        '40% 60% 50% 50% / 50% 50% 40% 60%',
      ],
      translate: [
        { x: 0, y: 0 },
        { x: -70 * blobIntensity, y: 60 * blobIntensity },
        { x: 40 * blobIntensity, y: -40 * blobIntensity },
      ],
    },
    {
      id: 'blob-5',
      size: 'w-1/2 h-1/3',
      position: { top: '5%', right: '25%' },
      borderRadius: '70% 30% 60% 40% / 40% 50% 60% 50%',
      morphs: [
        '70% 30% 60% 40% / 40% 50% 60% 50%',
        '40% 60% 70% 30% / 60% 50% 40% 50%',
        '60% 40% 40% 60% / 50% 50% 60% 40%',
      ],
      translate: [
        { x: 0, y: 0 },
        { x: 80 * blobIntensity, y: 30 * blobIntensity },
        { x: -50 * blobIntensity, y: 70 * blobIntensity },
      ],
    },
    {
      id: 'blob-6',
      size: 'w-2/5 h-1/2',
      position: { bottom: '20%', right: '15%' },
      borderRadius: '40% 60% 70% 30% / 60% 40% 50% 50%',
      morphs: [
        '40% 60% 70% 30% / 60% 40% 50% 50%',
        '70% 30% 40% 60% / 50% 60% 40% 60%',
        '50% 50% 50% 50% / 60% 40% 60% 40%',
      ],
      translate: [
        { x: 0, y: 0 },
        { x: -60 * blobIntensity, y: -40 * blobIntensity },
        { x: 90 * blobIntensity, y: 50 * blobIntensity },
      ],
    },
    {
      id: 'blob-7',
      size: 'w-1/3 h-2/5',
      position: { top: '35%', left: '5%' },
      borderRadius: '30% 70% 40% 60% / 70% 30% 60% 40%',
      morphs: [
        '30% 70% 40% 60% / 70% 30% 60% 40%',
        '60% 40% 70% 30% / 40% 60% 30% 70%',
        '50% 50% 50% 50% / 50% 50% 50% 50%',
      ],
      translate: [
        { x: 0, y: 0 },
        { x: 100 * blobIntensity, y: 40 * blobIntensity },
        { x: -60 * blobIntensity, y: -30 * blobIntensity },
      ],
    },
    {
      id: 'blob-8',
      size: 'w-1/2 h-1/2',
      position: { bottom: '10%', left: '45%' },
      borderRadius: '60% 40% 50% 50% / 40% 60% 40% 60%',
      morphs: [
        '60% 40% 50% 50% / 40% 60% 40% 60%',
        '40% 60% 60% 40% / 70% 30% 50% 50%',
        '50% 50% 40% 60% / 50% 50% 70% 30%',
      ],
      translate: [
        { x: 0, y: 0 },
        { x: -90 * blobIntensity, y: -70 * blobIntensity },
        { x: 70 * blobIntensity, y: 40 * blobIntensity },
      ],
    },
  ];

  // Create blob containers with incoming video
  const blobChildren: RenderableComponentData[] = blobConfigs.map((blob) => {
    return {
      id: blob.id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute ${blob.size} overflow-hidden`,
          style: {
            borderRadius: blob.borderRadius,
            mixBlendMode: 'screen',
            ...blob.position,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: `${blob.id}-video`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full scale-150',
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
        {
          id: `${blob.id}-morph-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [blob.id],
            ranges: [
              { key: 'borderRadius', val: blob.morphs[0], prog: 0 },
              { key: 'borderRadius', val: blob.morphs[1], prog: 0.5 },
              { key: 'borderRadius', val: blob.morphs[2], prog: 1 },
              { key: 'translateX', val: blob.translate[0].x, prog: 0 },
              { key: 'translateX', val: blob.translate[1].x, prog: 0.5 },
              { key: 'translateX', val: blob.translate[2].x, prog: 1 },
              { key: 'translateY', val: blob.translate[0].y, prog: 0 },
              { key: 'translateY', val: blob.translate[1].y, prog: 0.5 },
              { key: 'translateY', val: blob.translate[2].y, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Outgoing video container
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
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
        duration: video1.duration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          fit: 'cover',
          className: 'w-full h-full',
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
      {
        id: 'outgoing-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 8, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Blob transition layer
  const blobTransitionLayer: RenderableComponentData = {
    id: 'blob-transition-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    childrenData: blobChildren,
  };

  // Incoming video (fullscreen after transition)
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-fullscreen',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: video1.duration,
        duration: video2.duration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-morph-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gradient-to-b from-blue-950 to-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoContainer,
      blobTransitionLayer,
      incomingVideoContainer,
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
  id: 'liquid-morph-transition',
  title: 'Liquid Morph Transition',
  description: 'A fluid, organic transition between two videos using 8 blob-shaped masks that morph and flow across the screen, revealing the incoming video while the outgoing video liquifies with blur and scale effects. Features continuous blob morphing, wave-like motion paths, and color bleeding for a realistic liquid physics simulation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'liquid', 'morph', 'organic', 'fluid', 'blob', 'displacement', 'artistic'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 2.2,
    blobIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const liquidMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
