/**
 * Quantum Glitch Transition Preset
 *
 * Creates a dimensional rift transition effect where videos shatter into geometric fragments
 * that rotate in 3D space while transitioning between clips. Features reality-warping visuals
 * with triangular mesh patterns, independent fragment animations, and particle effects.
 *
 * Features:
 * - **Geometric Fragmentation**: Creates 20-30 triangular fragments using clip-path polygons
 * - **3D Rotations**: Each fragment rotates independently using rotate3d() transformations
 * - **Particle Effects**: Small divs emanate from fragment edges with trajectory animations
 * - **Reality Warping**: Backdrop blur, glow effects, and dimensional shifting
 * - **Configurable Fragments**: Adjustable fragment count and animation parameters
 * - **Smooth Transitions**: 1.1s overlap period with staggered fragment animations
 *
 * Use cases:
 * - Creating sci-fi or cyberpunk video transitions
 * - Building reality-bending visual effects
 * - Adding dramatic scene changes with geometric shatter
 * - Creating futuristic video montages
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of first video'),
      duration: z.number().describe('Duration of first video in seconds'),
    })
    .describe('First video source and duration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of second video'),
      duration: z.number().describe('Duration of second video in seconds'),
    })
    .describe('Second video source and duration'),
  transitionDuration: z
    .number()
    .default(1.1)
    .describe('Duration of transition overlap in seconds'),
  fragmentCount: z
    .number()
    .min(20)
    .max(30)
    .default(25)
    .describe('Number of triangular fragments to create'),
  maxDelayOffset: z
    .number()
    .default(0.8)
    .describe('Maximum random delay offset for fragment animations in seconds'),
  particleCount: z
    .number()
    .default(50)
    .describe('Number of particle effects to generate'),
  glowColor: z
    .string()
    .default('rgba(0,255,255,0.5)')
    .describe('Color for fragment glow effects'),
  backgroundColor: z
    .string()
    .default('#1a0033')
    .describe('Background color (purple-950)'),
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
    fragmentCount,
    maxDelayOffset,
    particleCount,
    glowColor,
    backgroundColor,
  } = params;

  // Helper: Generate triangular clip-path polygons using Voronoi-like grid
  const generateFragmentClipPaths = (
    count: number,
  ): Array<{ clipPath: string; centroidX: number; centroidY: number }> => {
    const fragments: Array<{
      clipPath: string;
      centroidX: number;
      centroidY: number;
    }> = [];
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      // Calculate cell bounds
      const x1 = (col / cols) * 100;
      const y1 = (row / rows) * 100;
      const x2 = ((col + 1) / cols) * 100;
      const y2 = ((row + 1) / rows) * 100;

      // Add random variation
      const offsetX = (Math.random() - 0.5) * 5;
      const offsetY = (Math.random() - 0.5) * 5;

      // Create two triangles per cell for variety
      const isFirstTriangle = Math.random() > 0.5;

      let clipPath: string;
      let centroidX: number;
      let centroidY: number;

      if (isFirstTriangle) {
        // Top-left triangle
        const px1 = x1 + offsetX;
        const py1 = y1 + offsetY;
        const px2 = x2 + offsetX;
        const py2 = y1 + offsetY;
        const px3 = x1 + offsetX;
        const py3 = y2 + offsetY;

        clipPath = `polygon(${px1}% ${py1}%, ${px2}% ${py2}%, ${px3}% ${py3}%)`;
        centroidX = (px1 + px2 + px3) / 3;
        centroidY = (py1 + py2 + py3) / 3;
      } else {
        // Bottom-right triangle
        const px1 = x2 + offsetX;
        const py1 = y1 + offsetY;
        const px2 = x2 + offsetX;
        const py2 = y2 + offsetY;
        const px3 = x1 + offsetX;
        const py3 = y2 + offsetY;

        clipPath = `polygon(${px1}% ${py1}%, ${px2}% ${py2}%, ${px3}% ${py3}%)`;
        centroidX = (px1 + px2 + px3) / 3;
        centroidY = (py1 + py2 + py3) / 3;
      }

      fragments.push({ clipPath, centroidX, centroidY });
    }

    return fragments;
  };

  // Helper: Generate random 3D rotation axis
  const generateRotationAxis = (): [number, number, number] => {
    return [Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5].map(
      (v) => v * 2,
    ) as [number, number, number];
  };

  // Generate fragments
  const fragmentClipPaths = generateFragmentClipPaths(fragmentCount);

  // Calculate base layout duration
  const baseLayoutDuration =
    video1.duration + video2.duration - transitionDuration;

  // Create video1 fragments (outgoing)
  const video1Fragments: RenderableComponentData[] = fragmentClipPaths.map(
    (fragment, index) => {
      const fragmentId = `video1-fragment-${index}`;
      const randomDelay = Math.random() * maxDelayOffset;
      const rotationAxis = generateRotationAxis();

      return {
        id: fragmentId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              clipPath: fragment.clipPath,
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
            id: `${fragmentId}-video`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video1.src,
              className: 'absolute inset-0 w-full h-full object-cover',
              fit: 'cover',
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
          // Break-apart animation
          {
            id: `${fragmentId}-break`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: video1.duration - transitionDuration + randomDelay,
              duration: transitionDuration - randomDelay,
              mode: 'provider',
              targetIds: [fragmentId],
              ranges: [
                {
                  key: 'rotate3d',
                  val: [rotationAxis[0], rotationAxis[1], rotationAxis[2], 0],
                  prog: 0,
                },
                {
                  key: 'rotate3d',
                  val: [
                    rotationAxis[0],
                    rotationAxis[1],
                    rotationAxis[2],
                    180,
                  ],
                  prog: 1,
                },
                { key: 'translateZ', val: 0, prog: 0 },
                { key: 'translateZ', val: -100, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          // Backdrop blur
          {
            id: `${fragmentId}-blur`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: video1.duration - transitionDuration + randomDelay,
              duration: 0.3,
              mode: 'provider',
              targetIds: [fragmentId],
              ranges: [
                { key: 'backdropFilter', val: 'blur(0px)', prog: 0 },
                { key: 'backdropFilter', val: 'blur(5px)', prog: 1 },
              ],
            },
          },
          // Glow effect
          {
            id: `${fragmentId}-glow`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: video1.duration - transitionDuration + randomDelay,
              duration: 0.5,
              mode: 'provider',
              targetIds: [fragmentId],
              ranges: [
                { key: 'boxShadow', val: `0 0 0 rgba(0,0,0,0)`, prog: 0 },
                { key: 'boxShadow', val: `0 0 20px ${glowColor}`, prog: 0.5 },
                { key: 'boxShadow', val: `0 0 0 rgba(0,0,0,0)`, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create video2 fragments (incoming)
  const video2Fragments: RenderableComponentData[] = fragmentClipPaths.map(
    (fragment, index) => {
      const fragmentId = `video2-fragment-${index}`;
      const randomDelay = Math.random() * maxDelayOffset;
      const rotationAxis = generateRotationAxis();

      return {
        id: fragmentId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              clipPath: fragment.clipPath,
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
            id: `${fragmentId}-video`,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video2.src,
              className: 'absolute inset-0 w-full h-full object-cover',
              fit: 'cover',
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
          // Assemble animation (inverse of break-apart)
          {
            id: `${fragmentId}-assemble`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: randomDelay,
              duration: transitionDuration - randomDelay,
              mode: 'provider',
              targetIds: [fragmentId],
              ranges: [
                {
                  key: 'rotate3d',
                  val: [
                    rotationAxis[0],
                    rotationAxis[1],
                    rotationAxis[2],
                    180,
                  ],
                  prog: 0,
                },
                {
                  key: 'rotate3d',
                  val: [rotationAxis[0], rotationAxis[1], rotationAxis[2], 0],
                  prog: 1,
                },
                { key: 'translateZ', val: -100, prog: 0 },
                { key: 'translateZ', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create particle effects
  const particles: RenderableComponentData[] = [];
  for (let i = 0; i < particleCount; i++) {
    const particleId = `particle-${i}`;
    const randomFragment =
      fragmentClipPaths[Math.floor(Math.random() * fragmentClipPaths.length)];
    const randomDelay = Math.random() * 0.5;
    const randomTrajectoryX = (Math.random() - 0.5) * 200;
    const randomTrajectoryY = (Math.random() - 0.5) * 200;

    particles.push({
      id: particleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute w-1 h-1 bg-cyan-400 rounded-full',
        style: {
          left: `${randomFragment.centroidX}%`,
          top: `${randomFragment.centroidY}%`,
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `${particleId}-trajectory`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: randomDelay,
            duration: 0.8,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: randomTrajectoryX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: randomTrajectoryY, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'quantum-glitch-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [...video1Fragments, ...video2Fragments, ...particles],
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
  id: 'quantum-glitch-transition',
  title: 'Quantum Glitch Transition',
  description:
    'A dimensional rift transition effect that shatters videos into geometric fragments with 3D rotations, glitch effects, and particle trails. Creates reality-warping transitions between video clips using triangular mesh patterns, independent fragment animations, and cyberpunk-style visual effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'quantum',
    'dimensional',
    '3d',
    'fragments',
    'particles',
    'cyberpunk',
    'reality-warp',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.1,
    fragmentCount: 25,
    maxDelayOffset: 0.8,
    particleCount: 50,
    glowColor: 'rgba(0,255,255,0.5)',
    backgroundColor: '#1a0033',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const quantumGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
