/**
 * Sports Photography Flash Transition Preset
 *
 * Creates a high-speed sports photography flash transition with dramatic freeze-frame effect.
 * Simulates motor drive burst mode with 2-3 rapid white flash strobes, incremental incoming
 * video reveal (33%→66%→100%), motion blur trails during flashes, and synchronized zoom punch
 * effects for kinetic energy.
 *
 * Features:
 * - Freeze-frame effect on outgoing video's last frame during transition
 * - 2-3 rapid white flash strobes (motor drive burst mode aesthetic)
 * - Incremental incoming video reveal: 33% → 66% → 100% opacity
 * - Motion blur trails during flash peaks (2px blur)
 * - Synchronized zoom punch effect (scale 1 → 1.05 → 1) with each flash
 * - 0.6s overlap period with precise timing control
 *
 * Use cases:
 * - Action sports video transitions
 * - High-energy montage sequences
 * - Decisive moment capture aesthetics
 * - Dynamic sports photography style videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(0.6)
    .describe('Duration of the flash transition overlap in seconds'),
  flashCount: z
    .number()
    .min(2)
    .max(3)
    .default(3)
    .describe('Number of flash strobes (2 or 3)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, flashCount } = params;

  // Calculate total composition duration
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Transition timing configuration
  const overlapStart = outgoingVideo.duration - transitionDuration;
  const flashDuration = 0.05; // Each flash is 0.05s

  // Calculate flash timings based on flash count
  const flashTimings: number[] = [];
  if (flashCount === 2) {
    flashTimings.push(0.15, 0.4); // 2 flashes
  } else {
    flashTimings.push(0.1, 0.25, 0.4); // 3 flashes (default)
  }

  // Opacity steps for incoming video
  const opacitySteps = flashCount === 2 ? [0, 0.5, 1] : [0, 0.33, 0.66, 1];

  // Helper: Create flash shape atom
  const createFlashAtom = (flashIndex: number): RenderableComponentData => {
    const flashTime = flashTimings[flashIndex];
    return {
      id: `flash-${flashIndex}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background-color: white;"></div>',
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: overlapStart + flashTime,
          duration: flashDuration,
        },
      },
      effects: [
        {
          id: `flash-opacity-${flashIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: flashDuration,
            mode: 'provider',
            targetIds: [`flash-${flashIndex}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.9, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };
  };

  // Helper: Create opacity keyframes for incoming video
  const createIncomingOpacityRanges = () => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    
    opacitySteps.forEach((opacity, index) => {
      const prog = index / (opacitySteps.length - 1);
      ranges.push({ key: 'opacity', val: opacity, prog });
    });

    return ranges;
  };

  // Helper: Create motion blur effect during flash peaks
  const createMotionBlurEffects = () => {
    return flashTimings.map((flashTime, index) => ({
      id: `blur-peak-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: overlapStart + flashTime,
        duration: flashDuration,
        mode: 'provider',
        targetIds: ['sports-flash-transition-root'],
        ranges: [
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: 'blur(2px)', prog: 0.5 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    }));
  };

  // Helper: Create zoom punch effects synchronized with flashes
  const createZoomPunchEffects = () => {
    return flashTimings.map((flashTime, index) => ({
      id: `zoom-punch-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: overlapStart + flashTime,
        duration: flashDuration * 2, // Slightly longer for punch effect
        mode: 'provider',
        targetIds: ['sports-flash-transition-root'],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.05, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    }));
  };

  // Build flash atoms
  const flashAtoms = flashTimings.map((_, index) => createFlashAtom(index));

  // Build child components
  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
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
          duration: outgoingVideo.duration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
            endAt: outgoingVideo.duration, // Freeze on last frame during overlap
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideo.duration,
            },
          },
        } as RenderableComponentData,
      ],
    },
    // Incoming video container
    {
      id: 'incoming-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: overlapStart,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-opacity-transition',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-container'],
            ranges: createIncomingOpacityRanges(),
          },
        },
      ],
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideo.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    },
    // Flash layer
    ...flashAtoms,
  ];

  // Root container with all effects
  const rootContainer: RenderableComponentData = {
    id: 'sports-flash-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      ...createMotionBlurEffects(),
      ...createZoomPunchEffects(),
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'sports-flash-transition',
  title: 'Sports Photography Flash Transition',
  description:
    'High-speed sports photography flash transition with dramatic freeze-frame effect. Creates motor drive burst mode aesthetic with 2-3 rapid white flash strobes, incremental incoming video reveal (33%→66%→100%), motion blur trails during flashes, and synchronized zoom punch effects for kinetic energy.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'sports', 'flash', 'freeze-frame', 'action'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/action-video-1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/action-video-2.mp4',
      duration: 5,
    },
    transitionDuration: 0.6,
    flashCount: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const sportsFlashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
