/**
 * Torn and Taped Video Transition Preset
 *
 * This preset creates a dramatic "torn and taped" transition between two video sources.
 * The outgoing video tears diagonally from top-left to bottom-right, with the two torn
 * halves drifting apart while rotating and fading out. The incoming video is revealed
 * underneath with a brightness animation. Animated tape strips then slide in with a
 * bounce effect to "repair" the diagonal tear line. Paper fiber particles float away
 * during the tear for added realism.
 *
 * Features:
 * - **Diagonal Tear Effect**: Outgoing video splits into two pieces along a jagged diagonal
 * - **Drifting Torn Pieces**: Top piece moves up-left with rotation, bottom moves down-right
 * - **Incoming Video Reveal**: Revealed underneath with brightness animation
 * - **Tape Repair Animation**: 3-4 tape strips slide in with bounce easing along diagonal
 * - **Paper Fiber Particles**: 10-15 small particles float away from tear line with random trajectories
 * - **Blend Mode Tape**: Tape uses mix-blend-mode: multiply for realistic appearance
 *
 * Use cases:
 * - Creating dramatic transitions between video clips
 * - Adding paper-tear aesthetic to video sequences
 * - Building creative "repair" or "reconstruction" narratives
 * - Adding tactile, physical effects to digital video transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of outgoing video (tears apart)'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video that tears apart'),

  video2: z.object({
    src: z.string().describe('Source URL of incoming video (revealed underneath)'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video revealed underneath'),

  tapeImages: z.array(z.object({
    src: z.string().describe('Source URL of tape strip image'),
  })).min(3).max(4).default([
    { src: 'https://images.unsplash.com/photo-1594843310027-e41f48f3c5fa?w=200&h=80&fit=crop' },
    { src: 'https://images.unsplash.com/photo-1594843310027-e41f48f3c5fa?w=200&h=80&fit=crop' },
    { src: 'https://images.unsplash.com/photo-1594843310027-e41f48f3c5fa?w=200&h=80&fit=crop' },
  ]).describe('Array of tape strip images (3-4 strips)'),

  tearDuration: z.number().default(1.2).describe('Duration of tear animation in seconds'),
  tapeDuration: z.number().default(1.0).describe('Duration of tape repair animation in seconds'),
  transitionOverlap: z.number().default(2.2).describe('Total transition overlap duration (tear + tape)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    tapeImages,
    tearDuration,
    tapeDuration,
    transitionOverlap,
  } = params;

  // Calculate BaseLayout duration: video1 + video2 - overlap
  const baseLayoutDuration = video1.duration + video2.duration - transitionOverlap;

  // Helper function: Generate particle data
  const generateParticles = (count: number) => {
    const particles: RenderableComponentData[] = [];
    const particleColors = ['#faf8f5', '#f5f0e8', '#f0ebe0', '#faf8f5'];

    for (let i = 0; i < count; i++) {
      // Position along diagonal (top-left to bottom-right)
      const diagonalProgress = (i + 1) / (count + 1);
      const left = `${diagonalProgress * 100}%`;
      const top = `${diagonalProgress * 100}%`;

      // Random size (3-8px)
      const width = Math.floor(Math.random() * 6) + 3;
      const height = Math.floor(Math.random() * 6) + 3;

      // Random trajectory offsets
      const translateX = -(Math.random() * 50 + 30); // -30 to -80
      const translateY = -(Math.random() * 40 + 20); // -20 to -60

      particles.push({
        id: `particle-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${width}px; height: ${height}px; background-color: ${particleColors[i % particleColors.length]}; border-radius: 2px;"></div>`,
          className: 'absolute',
          style: {
            left,
            top,
            opacity: 1,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: tearDuration,
          },
        },
        effects: [
          {
            id: `particle-${i}-animation`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: tearDuration,
              mode: 'provider',
              targetIds: [`particle-${i}`],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: translateX, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: translateY, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // Helper function: Generate tape strips
  const generateTapeStrips = () => {
    const strips: RenderableComponentData[] = [];
    const tapeCount = Math.min(tapeImages.length, 4);
    const tapeStartTime = tearDuration;

    // Positions along the diagonal
    const positions = [
      { top: '20%', left: '20%', translateX: -200, translateY: -100 },
      { top: '45%', left: '45%', translateX: -180, translateY: -90 },
      { top: '70%', left: '70%', translateX: -160, translateY: -80 },
      { top: '85%', left: '85%', translateX: -140, translateY: -70 },
    ];

    for (let i = 0; i < tapeCount; i++) {
      const pos = positions[i];
      const delay = i * 0.1; // Slight stagger

      strips.push({
        id: `tape-${i}`,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: tapeImages[i].src,
          className: 'absolute',
          style: {
            top: pos.top,
            left: pos.left,
            width: '120px',
            height: '40px',
            transform: 'rotate(45deg)',
            mixBlendMode: 'multiply',
            opacity: 0,
          },
        },
        context: {
          timing: {
            start: tapeStartTime + delay,
            duration: tapeDuration,
          },
        },
        effects: [
          {
            id: `tape-${i}-slide-in`,
            componentId: 'generic',
            data: {
              type: 'spring',
              start: 0,
              duration: tapeDuration,
              mode: 'provider',
              targetIds: [`tape-${i}`],
              ranges: [
                { key: 'translateX', val: pos.translateX, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: pos.translateY, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return strips;
  };

  // Build child components
  const childrenData: RenderableComponentData[] = [
    // Incoming video (z-0, revealed underneath)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration + video2.duration - transitionOverlap,
        },
      },
      effects: [
        {
          id: 'incoming-brightness',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: tearDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'filter', val: 'brightness(0.8)', prog: 0 },
              { key: 'filter', val: 'brightness(1)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Torn top piece (upper half with jagged diagonal)
    {
      id: 'torn-top',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          zIndex: 1,
          clipPath: 'polygon(0 0, 100% 0, 100% 48%, 95% 49%, 90% 50%, 85% 49%, 80% 51%, 75% 50%, 70% 52%, 65% 50%, 60% 51%, 55% 49%, 50% 52%, 45% 50%, 40% 51%, 35% 49%, 30% 52%, 25% 50%, 20% 51%, 15% 49%, 10% 52%, 5% 50%, 0 52%)',
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
          id: 'torn-top-drift',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: tearDuration,
            mode: 'provider',
            targetIds: ['torn-top'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: '-10%', prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: '-10%', prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: -5, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Torn bottom piece (lower half with jagged diagonal)
    {
      id: 'torn-bottom',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        fit: 'cover',
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          inset: '0',
          zIndex: 1,
          clipPath: 'polygon(0 52%, 5% 50%, 10% 52%, 15% 49%, 20% 51%, 25% 50%, 30% 52%, 35% 49%, 40% 51%, 45% 50%, 50% 52%, 55% 49%, 60% 51%, 65% 50%, 70% 52%, 75% 50%, 80% 51%, 85% 49%, 90% 50%, 95% 49%, 100% 48%, 100% 100%, 0 100%)',
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
          id: 'torn-bottom-drift',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: tearDuration,
            mode: 'provider',
            targetIds: ['torn-bottom'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: '10%', prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: '10%', prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 5, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Particles container
    {
      id: 'particles-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 2,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: tearDuration,
        },
      },
      childrenData: generateParticles(12),
    } as RenderableComponentData,

    // Tape container
    {
      id: 'tape-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 3,
          },
        },
      },
      context: {
        timing: {
          start: tearDuration,
          duration: tapeDuration + 0.3,
        },
      },
      childrenData: generateTapeStrips(),
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'torn-tape-transition-container',
    type: 'layout',
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'torn-tape-transition',
  title: 'Torn and Taped Video Transition',
  description:
    'A creative video transition where the outgoing video tears diagonally from top-left to bottom-right, with the two torn halves drifting apart while rotating and fading. The incoming video is revealed underneath with a brightness animation. Animated tape strips slide in with bounce easing to "repair" the tear line. Paper fiber particles float away during the tear phase for added realism.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'video', 'torn', 'tape', 'creative', 'diagonal', 'particles'],
  defaultInputParams: {
    video1: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      duration: 5,
    },
    tapeImages: [
      { src: 'https://images.unsplash.com/photo-1594843310027-e41f48f3c5fa?w=200&h=80&fit=crop' },
      { src: 'https://images.unsplash.com/photo-1594843310027-e41f48f3c5fa?w=200&h=80&fit=crop' },
      { src: 'https://images.unsplash.com/photo-1594843310027-e41f48f3c5fa?w=200&h=80&fit=crop' },
    ],
    tearDuration: 1.2,
    tapeDuration: 1.0,
    transitionOverlap: 2.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const tornTapeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
