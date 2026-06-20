/**
 * Paper Shredder Transition Preset
 *
 * A creative video transition effect where the outgoing video appears to be fed through
 * a paper shredder. The video splits into 15 thin vertical strips that fall away with
 * physics-based gravity motion, rotation, opacity fade, and blur. The incoming video is
 * revealed behind with a reconstruction effect transitioning from pixelated/blurred to
 * clear focus.
 *
 * Features:
 * - **Vertical Strip Shredding**: Splits outgoing video into 15 vertical strips
 * - **Physics-Based Motion**: Each strip falls with gravity-like acceleration
 * - **Random Variation**: Strips rotate randomly and fall at varying speeds
 * - **Blur & Fade**: Strips fade out and blur as they fall
 * - **Reconstruction Effect**: Incoming video starts pixelated/blurred and comes into focus
 * - **GPU Acceleration**: Uses transform: translateZ(0) for performance
 *
 * Use Cases:
 * - Creative scene transitions
 * - Document/paper-themed videos
 * - Destruction/reveal effects
 * - Dramatic video cuts
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
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the shredder transition effect in seconds'),
  numStrips: z
    .number()
    .int()
    .min(10)
    .max(20)
    .default(15)
    .describe('Number of vertical strips to create (10-20)'),
  stripFallDuration: z
    .number()
    .default(1.5)
    .describe('Base duration for strip fall animation in seconds'),
  stripStaggerMax: z
    .number()
    .default(0.3)
    .describe('Maximum random stagger delay for strip animations in seconds'),
  reconstructionDuration: z
    .number()
    .default(2)
    .describe('Duration of incoming video reconstruction effect in seconds'),
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
    numStrips,
    stripFallDuration,
    stripStaggerMax,
    reconstructionDuration,
  } = params;

  // Helper: Generate random number between min and max
  const randomRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Helper: Generate random rotation between -15 and 15 degrees
  const randomRotation = (): number => {
    return randomRange(-15, 15);
  };

  // Helper: Generate random stagger delay between 0 and stripStaggerMax
  const randomStagger = (): number => {
    return randomRange(0, stripStaggerMax);
  };

  // Calculate timing
  const baseLayoutDuration = video1.duration + video2.duration - transitionDuration;
  const transitionStart = video1.duration - transitionDuration;

  // Calculate strip width percentage
  const stripWidthPercent = 100 / numStrips;

  // Create strip VideoAtoms
  const stripChildren: RenderableComponentData[] = [];

  for (let i = 0; i < numStrips; i++) {
    const leftPercent = i * stripWidthPercent;
    const rightPercent = (i + 1) * stripWidthPercent;

    const stripId = `strip-${i}`;
    const rotation = randomRotation();
    const stagger = randomStagger();
    const fallDuration = stripFallDuration + randomRange(-0.2, 0.2);

    stripChildren.push({
      id: stripId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        fit: 'cover',
        style: {
          position: 'absolute',
          top: 0,
          left: '0%',
          width: '100%',
          height: '100%',
          clipPath: `polygon(${leftPercent}% 0%, ${rightPercent}% 0%, ${rightPercent}% 100%, ${leftPercent}% 100%)`,
          transform: 'translateZ(0)',
          willChange: 'transform, opacity, filter',
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
          id: `strip-fall-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStart + stagger,
            duration: fallDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              // Fall down
              { key: 'translateY', val: '0%', prog: 0 },
              { key: 'translateY', val: '200%', prog: 1 },
              // Rotate
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotation, prog: 1 },
              // Fade out
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              // Blur
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(4px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create incoming video with reconstruction effect
  const incomingVideoId = 'incoming-video';
  const incomingVideo: RenderableComponentData = {
    id: incomingVideoId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      style: {
        width: '100%',
        height: '100%',
        filter: 'blur(20px)',
        transform: 'translateZ(0)',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'reconstruction-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: reconstructionDuration,
          mode: 'provider',
          targetIds: [incomingVideoId],
          ranges: [
            // Blur to clear
            { key: 'filter', val: 'blur(20px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Create containers
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [incomingVideo],
  };

  const outgoingStripsContainer: RenderableComponentData = {
    id: 'outgoing-strips-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: stripChildren,
  };

  const rootContainer: RenderableComponentData = {
    id: 'paper-shredder-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [incomingContainer, outgoingStripsContainer],
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
  id: 'paper-shredder-transition',
  title: 'Paper Shredder Transition',
  description:
    'A creative video transition effect where the outgoing video appears to be fed through a paper shredder. The video splits into thin vertical strips that fall away with physics-based motion, rotation, opacity fade, and blur. The incoming video is revealed behind with a reconstruction effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'shredder', 'strips', 'physics', 'creative', 'reveal'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 2,
    numStrips: 15,
    stripFallDuration: 1.5,
    stripStaggerMax: 0.3,
    reconstructionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const paperShredderTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
