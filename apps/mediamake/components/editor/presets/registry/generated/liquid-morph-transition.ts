/**
 * Liquid Morph Transition Preset
 *
 * This preset creates a fluid, organic transition between two video panels using
 * SVG clip-path animations that morph from circles to irregular blob shapes.
 * During the 1-second transition overlap, the outgoing video's clip-path contracts
 * inward while the incoming video's clip-path expands outward from the center.
 *
 * Features:
 * - **Organic Morphing**: Clip-path animations transition from circles to complex polygons
 * - **Dual Video Panels**: Supports 2 video inputs with independent timing
 * - **Particle Effects**: 12 animated circular particles appear during transition boundaries
 * - **Liquid Distortion**: Subtle blur effects simulate wave distortion
 * - **Optimized Performance**: Uses will-change: clip-path for smooth animations
 *
 * Technical Details:
 * - Total duration: (2 videos * 5s) - (1 transition * 1s) = 9s
 * - Transition window: 4s-5s relative to root (1-second overlap)
 * - Video 1: 0s-5s, Video 2: 4s-9s
 * - Particle animations: Active only during 4s-5s transition period
 *
 * Use cases:
 * - Creating smooth video transitions with organic flowing effects
 * - Building dynamic video compositions with liquid aesthetics
 * - Adding professional morphing transitions between clips
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1Src: z.string().describe('Source URL of the first video'),
  video2Src: z.string().describe('Source URL of the second video'),
  video1Duration: z
    .number()
    .default(5)
    .describe('Duration of the first video in seconds'),
  video2Duration: z
    .number()
    .default(5)
    .describe('Duration of the second video in seconds'),
  transitionDuration: z
    .number()
    .default(1)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1Src,
    video2Src,
    video1Duration,
    video2Duration,
    transitionDuration,
  } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1Duration + video2Duration - transitionDuration;
  const transitionStart = video1Duration - transitionDuration;

  // Helper function to generate random particle positions
  const generateParticlePosition = (index: number) => {
    const angle = (index / 12) * 2 * Math.PI;
    const radius = 45; // percentage from center
    const centerX = 50;
    const centerY = 50;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    return { x, y };
  };

  // Helper function to generate particle trajectory
  const generateParticleTrajectory = (index: number) => {
    const angle = (index / 12) * 2 * Math.PI;
    const distance = 30 + (index % 3) * 10; // Vary distance
    const dx = distance * Math.cos(angle);
    const dy = distance * Math.sin(angle);
    return { dx, dy };
  };

  // Create particle components
  const particles: RenderableComponentData[] = Array.from(
    { length: 12 },
    (_, index) => {
      const { x, y } = generateParticlePosition(index);
      const { dx, dy } = generateParticleTrajectory(index);
      const size = 6 + (index % 3) * 2; // Vary size between 6-10px
      const colors = [
        'rgba(147, 197, 253, 0.7)', // blue
        'rgba(196, 181, 253, 0.7)', // purple
        'rgba(255, 255, 255, 0.6)', // white
      ];
      const color = colors[index % 3];

      return {
        id: `particle-${index + 1}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; background: ${color}; border-radius: 50%;"></div>`,
          className: 'absolute',
          style: {
            left: `${x}%`,
            top: `${y}%`,
            transform: 'translate(-50%, -50%)',
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
            id: `particle-move-${index + 1}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [`particle-${index + 1}`],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: dx, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: dy, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 1, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Particle container (only visible during transition)
  const particleContainer: RenderableComponentData = {
    id: 'particle-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    childrenData: particles,
  };

  // Video 1 (outgoing) - plays from 0s to video1Duration
  const video1: RenderableComponentData = {
    id: 'video-panel-1',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1Src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      style: {
        willChange: 'clip-path',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1Duration,
      },
    },
    effects: [
      // Contract inward during transition
      {
        id: 'video1-contract',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['video-panel-1'],
          ranges: [
            {
              key: 'clipPath',
              val: 'circle(100% at 50% 50%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(30% 20%, 70% 25%, 80% 60%, 65% 85%, 35% 80%, 20% 55%)',
              prog: 0.5,
            },
            {
              key: 'clipPath',
              val: 'circle(0% at 50% 50%)',
              prog: 1,
            },
          ],
        },
      },
      // Subtle blur for liquid effect
      {
        id: 'video1-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['video-panel-1'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(3px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Video 2 (incoming) - starts at transitionStart, plays for video2Duration + transitionDuration
  const video2: RenderableComponentData = {
    id: 'video-panel-2',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2Src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      style: {
        willChange: 'clip-path',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2Duration + transitionDuration,
      },
    },
    effects: [
      // Expand outward during transition
      {
        id: 'video2-expand',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to video2 start
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['video-panel-2'],
          ranges: [
            {
              key: 'clipPath',
              val: 'circle(0% at 50% 50%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(25% 15%, 75% 20%, 85% 65%, 70% 90%, 30% 85%, 15% 50%)',
              prog: 0.5,
            },
            {
              key: 'clipPath',
              val: 'circle(100% at 50% 50%)',
              prog: 1,
            },
          ],
        },
      },
      // Subtle blur for liquid effect
      {
        id: 'video2-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['video-panel-2'],
          ranges: [
            { key: 'filter', val: 'blur(3px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-morph-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gradient-to-br from-blue-900 to-purple-900',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [video1, video2, particleContainer],
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
  id: 'liquid-morph-transition',
  title: 'Liquid Morph Transition',
  description:
    'A fluid 2-panel video transition where videos flow into each other using animated clip-path morphing. Creates organic liquid-like transitions with expanding/contracting circular masks, particle effects at transition boundaries, and subtle blur distortion during the 1-second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'liquid',
    'morph',
    'clip-path',
    'organic',
    'fluid',
    'particles',
  ],
  defaultInputParams: {
    video1Src: 'https://example.com/video1.mp4',
    video2Src: 'https://example.com/video2.mp4',
    video1Duration: 5,
    video2Duration: 5,
    transitionDuration: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
