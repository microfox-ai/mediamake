/**
 * Artistic Ink Pool Transition Preset
 *
 * Creates an artistic ink pool transition effect where videos blend through a central ink pool
 * that expands and contracts. The outgoing video shrinks into a circular ink droplet at center
 * while rotating slowly, then the ink pool expands outward revealing the incoming video with a
 * radial wipe effect.
 *
 * Features:
 * - Three distinct phases: contraction (0.8s), pool state (0.9s), and expansion (0.8s)
 * - Heavy color grading during pool state to simulate ink mixing (desaturate + blue/black tinting)
 * - Outgoing video contracts into circular droplet with rotation
 * - Incoming video emerges with radial gradient mask and displacement effect
 * - Coordinated timing using CSS custom properties
 * - Dark slate background simulating ink
 *
 * Use cases:
 * - Creating artistic transitions between video clips
 * - Building fluid, organic video sequences
 * - Adding creative flair to video montages
 * - Simulating liquid/ink-based transitions
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
      src: z.string().describe('Source URL of the first video'),
      duration: z.number().describe('Duration of the first video in seconds'),
    })
    .describe('First video (outgoing) configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second video'),
      duration: z.number().describe('Duration of the second video in seconds'),
    })
    .describe('Second video (incoming) configuration'),
  overlapDuration: z
    .number()
    .default(2.5)
    .describe('Total overlap period for the transition in seconds'),
  contractionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of contraction phase in seconds'),
  poolDuration: z
    .number()
    .default(0.9)
    .describe('Duration of pool state phase in seconds'),
  expansionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of expansion phase in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration, contractionDuration, poolDuration, expansionDuration } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate phase timings (relative to overlap period)
  const contractionEnd = contractionDuration;
  const poolEnd = contractionEnd + poolDuration;
  const expansionStart = poolEnd;

  // Calculate when incoming video starts (relative to root container)
  const incomingVideoStart = video1.duration - overlapDuration;

  // Outgoing video container (starts at 0, lasts for video1.duration)
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'ink-transition-outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
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
        id: 'ink-transition-outgoing-video',
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
      // Contraction phase: scale down to 0.2, rotate 180deg, border-radius to 50%
      {
        id: 'outgoing-contraction',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1.duration - overlapDuration, // Start of overlap
          duration: contractionDuration,
          mode: 'provider',
          targetIds: ['ink-transition-outgoing-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.2, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 180, prog: 1 },
            { key: 'borderRadius', val: '0%', prog: 0 },
            { key: 'borderRadius', val: '50%', prog: 1 },
          ],
        },
      },
      // Pool phase: apply sepia and saturate filters
      {
        id: 'outgoing-pool-state',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: video1.duration - overlapDuration + contractionDuration,
          duration: poolDuration,
          mode: 'provider',
          targetIds: ['ink-transition-outgoing-video'],
          ranges: [
            { key: 'filter', val: 'sepia(0.6) saturate(0.4) brightness(0.8)', prog: 0 },
            { key: 'filter', val: 'sepia(0.8) saturate(0.3) brightness(0.7)', prog: 0.5 },
            { key: 'filter', val: 'sepia(0.6) saturate(0.4) brightness(0.8)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video container (starts at overlap beginning, lasts for video2.duration + overlap)
  const incomingVideoContainer: RenderableComponentData = {
    id: 'ink-transition-incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          clipPath: 'circle(0% at 50% 50%)', // Start invisible
        },
      },
    },
    context: {
      timing: {
        start: incomingVideoStart,
        duration: video2.duration + overlapDuration,
      },
    },
    childrenData: [
      {
        id: 'ink-transition-incoming-video',
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
            duration: video2.duration + overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Initially scaled down during pool state
      {
        id: 'incoming-initial-scale',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: poolEnd, // Stays at 0.2 until expansion starts
          mode: 'provider',
          targetIds: ['ink-transition-incoming-video'],
          ranges: [
            { key: 'scale', val: 0.2, prog: 0 },
            { key: 'scale', val: 0.2, prog: 1 },
          ],
        },
      },
      // Expansion phase: scale up from 0.2 to 1
      {
        id: 'incoming-expansion-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: poolEnd, // Start of expansion phase
          duration: expansionDuration,
          mode: 'provider',
          targetIds: ['ink-transition-incoming-video'],
          ranges: [
            { key: 'scale', val: 0.2, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Radial mask expansion (on container)
      {
        id: 'incoming-radial-mask',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: poolEnd, // Start of expansion phase
          duration: expansionDuration,
          mode: 'provider',
          targetIds: ['ink-transition-incoming-container'],
          ranges: [
            { key: 'clipPath', val: 'circle(10% at 50% 50%)', prog: 0 },
            { key: 'clipPath', val: 'circle(150% at 50% 50%)', prog: 1 },
          ],
        },
      },
      // Brightness oscillation during pool state (liquid surface effect)
      {
        id: 'incoming-pool-brightness',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: contractionEnd, // Start of pool state
          duration: poolDuration,
          mode: 'provider',
          targetIds: ['ink-transition-incoming-video'],
          ranges: [
            { key: 'brightness', val: 0.9, prog: 0 },
            { key: 'brightness', val: 1.1, prog: 0.25 },
            { key: 'brightness', val: 0.95, prog: 0.5 },
            { key: 'brightness', val: 1.05, prog: 0.75 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        },
      },
      // Color grading during pool state (desaturate + blue/black tint)
      {
        id: 'incoming-pool-color',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: contractionEnd,
          duration: poolDuration,
          mode: 'provider',
          targetIds: ['ink-transition-incoming-video'],
          ranges: [
            { key: 'filter', val: 'saturate(0.6) hue-rotate(200deg) brightness(0.8)', prog: 0 },
            { key: 'filter', val: 'saturate(0.5) hue-rotate(210deg) brightness(0.75)', prog: 0.5 },
            { key: 'filter', val: 'saturate(0.6) hue-rotate(200deg) brightness(0.8)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with dark slate background
  const rootContainer: RenderableComponentData = {
    id: 'ink-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-slate-900 w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideoContainer, incomingVideoContainer],
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
  id: 'ink-pool-transition',
  title: 'Artistic Ink Pool Transition',
  description:
    'Creates an artistic ink pool transition where videos blend through a central ink droplet that expands and contracts with three distinct phases: contraction, pool state, and expansion. Features heavy color grading, rotation, and radial wipe effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'artistic',
    'ink',
    'pool',
    'liquid',
    'radial',
    'rotation',
    'video',
    'creative',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    overlapDuration: 2.5,
    contractionDuration: 0.8,
    poolDuration: 0.9,
    expansionDuration: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const inkPoolTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams) as any,
};
