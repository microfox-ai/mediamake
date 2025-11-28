/**
 * Stroboscopic Flash Transition Preset
 *
 * This preset simulates multiple rapid projector flashes as slides advance quickly through a carousel,
 * creating a stuttering, stop-motion feel with multiple white flashes occurring in rapid succession.
 *
 * Features:
 * - 4 quick white flashes (0.05s each) during the 0.6s transition
 * - Flash timing: [0-0.05s, 0.15-0.2s, 0.35-0.4s, 0.55-0.6s]
 * - Gradual transition from outgoing to incoming video with stepped opacity changes
 * - Double-exposure effect between flashes with overlapping semi-transparent videos
 * - Synchronized opacity curves creating stuttered transitions
 *
 * Use cases:
 * - Creating projector-style slide carousel transitions
 * - Simulating vintage film projector effects
 * - Adding retro stop-motion feel to video transitions
 * - Creating dramatic, high-impact scene changes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video or image'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video or image'),
  transitionDuration: z
    .number()
    .default(0.6)
    .describe('Duration of the transition in seconds'),
  flashDuration: z
    .number()
    .default(0.05)
    .describe('Duration of each flash in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideoSrc, incomingVideoSrc, transitionDuration, flashDuration } = params;

  // Flash timing points (as fractions of total transition duration)
  const flashTimings = [
    { start: 0, end: flashDuration }, // Flash 1: 0-0.05s
    { start: 0.15, end: 0.2 }, // Flash 2: 0.15-0.2s
    { start: 0.35, end: 0.4 }, // Flash 3: 0.35-0.4s
    { start: 0.55, end: 0.6 }, // Flash 4: 0.55-0.6s
  ];

  // Outgoing video opacity keyframes (stepped decrements synchronized with flashes)
  const outgoingOpacityRanges = [
    { key: 'opacity', val: 1, prog: 0 },
    { key: 'opacity', val: 1, prog: 0.083 }, // After flash 1
    { key: 'opacity', val: 0.75, prog: 0.25 }, // Before flash 2
    { key: 'opacity', val: 0.75, prog: 0.333 }, // After flash 2
    { key: 'opacity', val: 0.5, prog: 0.583 }, // Before flash 3
    { key: 'opacity', val: 0.5, prog: 0.667 }, // After flash 3
    { key: 'opacity', val: 0.25, prog: 0.917 }, // Before flash 4
    { key: 'opacity', val: 0, prog: 1 }, // After flash 4
  ];

  // Incoming video opacity keyframes (stepped increments, opposite of outgoing)
  const incomingOpacityRanges = [
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 0, prog: 0.083 }, // After flash 1
    { key: 'opacity', val: 0.25, prog: 0.25 }, // Before flash 2
    { key: 'opacity', val: 0.25, prog: 0.333 }, // After flash 2
    { key: 'opacity', val: 0.5, prog: 0.583 }, // Before flash 3
    { key: 'opacity', val: 0.5, prog: 0.667 }, // After flash 3
    { key: 'opacity', val: 0.75, prog: 0.917 }, // Before flash 4
    { key: 'opacity', val: 1, prog: 1 }, // After flash 4
  ];

  // Determine component IDs based on file extensions
  const getComponentId = (src: string): 'VideoAtom' | 'ImageAtom' => {
    if (src.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i)) {
      return 'VideoAtom';
    }
    return 'ImageAtom';
  };

  const outgoingComponentId = getComponentId(outgoingVideoSrc);
  const incomingComponentId = getComponentId(incomingVideoSrc);

  // Create flash overlay effects
  const flashOverlays: RenderableComponentData[] = flashTimings.map(
    (timing, index) => {
      const flashStart = timing.start;
      const flashEnd = timing.end;
      const flashProg = flashEnd / transitionDuration;

      return {
        id: `flash-overlay-${index + 1}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              backgroundColor: '#FFFFFF',
              zIndex: 30,
            },
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
            id: `flash-effect-${index + 1}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [`flash-overlay-${index + 1}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0, prog: flashStart / transitionDuration },
                { key: 'opacity', val: 1, prog: flashStart / transitionDuration + 0.001 },
                { key: 'opacity', val: 1, prog: flashProg - 0.001 },
                { key: 'opacity', val: 0, prog: flashProg },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  const childrenData: RenderableComponentData[] = [
    // Outgoing video
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          position: 'absolute',
          inset: '0',
          zIndex: 10,
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
          id: 'outgoing-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: outgoingOpacityRanges,
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming video
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          position: 'absolute',
          inset: '0',
          zIndex: 15,
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
          id: 'incoming-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: incomingOpacityRanges,
          },
        },
      ],
    } as RenderableComponentData,
    // Flash overlays
    ...flashOverlays,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'stroboscopic-flash-transition-root',
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
        duration: transitionDuration,
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
  id: 'stroboscopic-flash-transition',
  title: 'Stroboscopic Flash Transition',
  description:
    'A projector-style slide carousel transition with rapid stroboscopic white flashes creating a stuttering stop-motion effect. Features 4 quick 0.05s white flash overlays at intervals throughout the 0.6s transition, with stepped opacity changes on both videos to create double-exposure glimpses between flashes.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'flash', 'projector', 'stroboscopic', 'vintage', 'stop-motion'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    incomingVideoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    transitionDuration: 0.6,
    flashDuration: 0.05,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const stroboscopicFlashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
