/**
 * Ken Burns Focus Rack Transition Preset
 *
 * Creates a cinematic Ken Burns zoom-and-blur transition effect between two video sources.
 * The outgoing video zooms from 100% to 140% scale while gradually blurring from 0 to 8px.
 * During the final 0.5 seconds, the incoming video cross-fades in, starting at 160% scale
 * with 8px blur, then reverse-animating to 100% scale and 0px blur over 2 seconds.
 *
 * Features:
 * - **Ken Burns Effect**: Smooth scale animations (100%→140% outgoing, 160%→100% incoming)
 * - **Focus Rack**: Blur transitions (0→8px outgoing, 8px→0 incoming)
 * - **Cross-fade Overlap**: 1-second overlap period with opacity transitions
 * - **Cinematic Easing**: Ease-in-out curves for professional look
 * - **Absolute Positioning**: Both videos positioned with 'inset-0 object-cover'
 *
 * Use cases:
 * - Professional video transitions with cinematic depth
 * - Creating focus rack effects between footage
 * - Ken Burns style documentary transitions
 * - Smooth video montages with depth perception
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
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the cross-fade overlap in seconds'),
  zoomDuration: z
    .number()
    .default(2.0)
    .describe('Duration of the Ken Burns zoom effect in seconds'),
  outgoingMaxScale: z
    .number()
    .default(1.4)
    .describe('Maximum scale for outgoing video (default: 1.4 = 140%)'),
  incomingStartScale: z
    .number()
    .default(1.6)
    .describe('Starting scale for incoming video (default: 1.6 = 160%)'),
  maxBlur: z
    .number()
    .default(8)
    .describe('Maximum blur amount in pixels (default: 8)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    overlapDuration,
    zoomDuration,
    outgoingMaxScale,
    incomingStartScale,
    maxBlur,
  } = params;

  // Calculate BaseLayout duration
  // Total duration = video1.duration + video2.duration - overlap
  const baseLayoutDuration = video1.duration + video2.duration - overlapDuration;

  // Outgoing video timing calculations
  // The zoom/blur effects start 2 seconds before the video ends
  // The opacity fade starts 1 second before the video ends
  const outgoingZoomStart = video1.duration - zoomDuration;
  const outgoingOpacityStart = video1.duration - overlapDuration;

  // Incoming video timing calculations
  // The incoming video starts 1 second before the outgoing video ends
  // All its effects start at 0 relative to its own timeline
  const incomingStart = video1.duration - overlapDuration;

  const childrenData: RenderableComponentData[] = [
    // Outgoing video (video1)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        // Opacity fade out during last 1 second
        {
          id: 'outgoing-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingOpacityStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Scale from 100% to 140% over last 2 seconds
        {
          id: 'outgoing-scale-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingZoomStart,
            duration: zoomDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: outgoingMaxScale, prog: 1 },
            ],
          },
        },
        // Blur from 0 to 8px over last 2 seconds
        {
          id: 'outgoing-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: outgoingZoomStart,
            duration: zoomDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: `blur(${maxBlur}px)`, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming video (video2)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: incomingStart, // Starts 1 second before outgoing video ends
          duration: video2.duration, // Full duration of incoming video
        },
      },
      effects: [
        // Opacity fade in during first 1 second
        {
          id: 'incoming-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to incoming video start
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Scale from 160% to 100% over first 2 seconds
        {
          id: 'incoming-scale-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to incoming video start
            duration: zoomDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'scale', val: incomingStartScale, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Blur from 8px to 0 over first 2 seconds
        {
          id: 'incoming-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0, // Relative to incoming video start
            duration: zoomDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'ken-burns-focus-rack-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
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

const presetMetadata: PresetMetadata = {
  id: 'ken-burns-focus-rack',
  title: 'Ken Burns Focus Rack Transition',
  description:
    'Cinematic Ken Burns zoom transition with focus rack blur effect between two video sources. Features scale animation from 100% to 140% on outgoing video and 160% to 100% on incoming video, combined with blur transitions from 0-8px and back to 0px. Uses 1-second cross-fade overlap for smooth professional transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'ken-burns', 'focus-rack', 'zoom', 'blur', 'cinematic'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 1.0,
    zoomDuration: 2.0,
    outgoingMaxScale: 1.4,
    incomingStartScale: 1.6,
    maxBlur: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const kenBurnsFocusRackPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
