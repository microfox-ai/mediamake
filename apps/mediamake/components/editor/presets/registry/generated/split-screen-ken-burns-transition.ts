/**
 * Split-Screen Ken Burns Transition Preset
 *
 * This preset creates an advanced split-screen transition where videos divide and recombine
 * with differential zoom rates, creating a cinematic Ken Burns-style effect.
 *
 * Features:
 * - Outgoing video splits into left and right halves with independent zoom rates
 * - Left half: zooms to 110% while sliding left and rotating -3deg
 * - Right half: zooms to 130% while sliding right and rotating 3deg
 * - Both halves blur to 6px during exit
 * - Incoming video enters as two halves from opposite edges
 * - Left half: enters from right edge at 140% scale, converges to center
 * - Right half: enters from left edge at 120% scale, converges to center
 * - Both incoming halves start with 6px blur and clear as they converge
 * - Halves settle to 100% scale at center with subtle rotation effects
 * - 1.8s overlap for complete split-and-merge sequence
 * - Proper z-index layering for crossover visibility
 *
 * Use cases:
 * - Creating dramatic video transitions
 * - Building cinematic split-screen effects
 * - Adding dynamic visual interest to video sequences
 * - Professional video editing with complex transitions
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
    startFrom: z.number().optional().describe('Start time in seconds'),
    playbackRate: z.number().default(1).optional().describe('Playback rate'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    startFrom: z.number().optional().describe('Start time in seconds'),
    playbackRate: z.number().default(1).optional().describe('Playback rate'),
  }).describe('Incoming video configuration'),
  
  outgoingVideoDuration: z.number().describe('Duration of outgoing video in seconds'),
  incomingVideoDuration: z.number().describe('Duration of incoming video in seconds'),
  
  transitionDuration: z.number().default(1.8).describe('Duration of the split-and-merge transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, outgoingVideoDuration, incomingVideoDuration, transitionDuration } = params;

  // Calculate container duration: sum of videos minus overlap
  const containerDuration = outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Transition starts at this point in the container timeline
  const transitionStartTime = outgoingVideoDuration - transitionDuration;

  const childrenData: RenderableComponentData[] = [
    // === OUTGOING VIDEO - LEFT HALF ===
    {
      id: 'outgoing-left-half',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover' as const,
        className: 'absolute inset-0',
        style: {
          clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)',
          zIndex: 10,
        },
        startFrom: outgoingVideo.startFrom || 0,
        playbackRate: outgoingVideo.playbackRate || 1,
        volume: 0,
        muted: true,
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      effects: [
        {
          id: 'outgoing-left-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStartTime,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-left-half'],
            ranges: [
              // Scale: 100% -> 110%
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.1, prog: 1 },
              // TranslateX: 0 -> -50%
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '-50%', prog: 1 },
              // Rotate: 0 -> -3deg
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: -3, prog: 1 },
              // Blur: 0 -> 6px
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(6px)', prog: 1 },
            ],
          },
        },
      ],
    },

    // === OUTGOING VIDEO - RIGHT HALF ===
    {
      id: 'outgoing-right-half',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover' as const,
        className: 'absolute inset-0',
        style: {
          clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)',
          zIndex: 10,
        },
        startFrom: outgoingVideo.startFrom || 0,
        playbackRate: outgoingVideo.playbackRate || 1,
        volume: 0,
        muted: true,
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      effects: [
        {
          id: 'outgoing-right-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStartTime,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-right-half'],
            ranges: [
              // Scale: 100% -> 130%
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.3, prog: 1 },
              // TranslateX: 0 -> 50%
              { key: 'translateX', val: '0%', prog: 0 },
              { key: 'translateX', val: '50%', prog: 1 },
              // Rotate: 0 -> 3deg
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 3, prog: 1 },
              // Blur: 0 -> 6px
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(6px)', prog: 1 },
            ],
          },
        },
      ],
    },

    // === INCOMING VIDEO - LEFT HALF ===
    {
      id: 'incoming-left-half',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        fit: 'cover' as const,
        className: 'absolute inset-0',
        style: {
          clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)',
          zIndex: 20,
        },
        startFrom: incomingVideo.startFrom || 0,
        playbackRate: incomingVideo.playbackRate || 1,
        volume: 0,
        muted: true,
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: incomingVideoDuration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-left-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-left-half'],
            ranges: [
              // Scale: 140% -> 100%
              { key: 'scale', val: 1.4, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              // TranslateX: 100% (from right) -> 0
              { key: 'translateX', val: '100%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
              // Rotate: 5deg -> 0deg
              { key: 'rotate', val: 5, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              // Blur: 6px -> 0px
              { key: 'filter', val: 'blur(6px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    },

    // === INCOMING VIDEO - RIGHT HALF ===
    {
      id: 'incoming-right-half',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        fit: 'cover' as const,
        className: 'absolute inset-0',
        style: {
          clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)',
          zIndex: 20,
        },
        startFrom: incomingVideo.startFrom || 0,
        playbackRate: incomingVideo.playbackRate || 1,
        volume: 0,
        muted: true,
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: incomingVideoDuration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-right-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-right-half'],
            ranges: [
              // Scale: 120% -> 100%
              { key: 'scale', val: 1.2, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              // TranslateX: -100% (from left) -> 0
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '0%', prog: 1 },
              // Rotate: -5deg -> 0deg
              { key: 'rotate', val: -5, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              // Blur: 6px -> 0px
              { key: 'filter', val: 'blur(6px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: 'split-screen-ken-burns-container',
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
        start: 0,
        duration: containerDuration,
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

const presetMetadata: PresetMetadata = {
  id: 'split-screen-ken-burns-transition',
  title: 'Split-Screen Ken Burns Transition',
  description: 'Advanced split-screen transition where videos divide and recombine with differential zoom rates. Outgoing video splits into two halves with independent zoom and slide effects while incoming video converges from opposite edges. Features blur transitions, subtle rotation, and precise timing control for cinematic split-and-merge sequences.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'ken-burns', 'split-screen', 'video', 'cinematic', 'zoom', 'rotation', 'blur'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
      playbackRate: 1,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
      playbackRate: 1,
    },
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    transitionDuration: 1.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const splitScreenKenBurnsTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
