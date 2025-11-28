/**
 * Scanning Light Leak Transition Preset
 *
 * A tight 1-second transition that simulates a linear scanner passing over film.
 * Features a bright horizontal band with gradient that reveals incoming video,
 * extreme exposure effect on outgoing video, and RGB channel separation during scan.
 *
 * Technical Implementation:
 * - Creates a scanning band that moves from top to bottom over 1 second
 * - Reveals incoming video progressively as the scanner passes
 * - Applies extreme brightness (brightness(4)) to scanned areas of outgoing video
 * - Adds RGB channel separation effect with three offset colored lines
 * - Uses clip-path for progressive reveal of incoming video
 * - All effects synchronized to scanner position
 *
 * Use cases:
 * - Film-style transitions between video clips
 * - Artistic transitions with light leak aesthetic
 * - Technical/glitch style video transitions
 * - Creative reveals with scanning effect
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
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of scanner transition in seconds'),
  scannerHeight: z
    .number()
    .default(48)
    .describe('Height of scanning band in pixels'),
  brightnessIntensity: z
    .number()
    .default(4)
    .describe('Brightness intensity for exposed areas (1-5)'),
  rgbSeparation: z
    .number()
    .default(2)
    .describe('Vertical offset for RGB separation in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    scannerHeight,
    brightnessIntensity,
    rgbSeparation,
  } = params;

  // Calculate total duration (outgoing + incoming - overlap)
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Calculate incoming video start time (overlaps with outgoing)
  const incomingStartTime = outgoingVideo.duration - transitionDuration;

  // Create children data
  const childrenData: RenderableComponentData[] = [
    // Outgoing video with brightness effect
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        // Brightness spike effect following scanner
        {
          id: 'brightness-spike',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'filter', val: 'brightness(1)', prog: 0 },
              { key: 'filter', val: `brightness(${brightnessIntensity})`, prog: 0.5 },
              { key: 'filter', val: 'brightness(1.2)', prog: 1 },
            ],
          },
        },
        // Fade out at the end
        {
          id: 'fade-out',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: outgoingVideo.duration - transitionDuration * 0.3,
            duration: transitionDuration * 0.3,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video with clip-path reveal
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: incomingStartTime,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        // Clip-path reveal from top to bottom
        {
          id: 'clip-reveal',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'clipPath', val: 'inset(100% 0 0 0)', prog: 0 },
              { key: 'clipPath', val: 'inset(0 0 0 0)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Scanner band (bright horizontal gradient)
    {
      id: 'scanner-band',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: ${scannerHeight}px; background: linear-gradient(to bottom, transparent 0%, white 50%, transparent 100%); pointer-events: none;"></div>`,
        className: 'absolute left-0',
        style: {
          zIndex: 20,
          top: 0,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: incomingStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        // Move scanner from top to bottom
        {
          id: 'scanner-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['scanner-band'],
            ranges: [
              { key: 'translateY', val: '-100%', prog: 0 },
              { key: 'translateY', val: '100vh', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // RGB separation - Red line
    {
      id: 'rgb-red',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 1px; background: red; mix-blend-mode: multiply;"></div>`,
        className: 'absolute left-0',
        style: {
          zIndex: 15,
          top: 0,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: incomingStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'rgb-red-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['rgb-red'],
            ranges: [
              { key: 'translateY', val: '-100%', prog: 0 },
              { key: 'translateY', val: '100vh', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // RGB separation - Green line (offset by rgbSeparation)
    {
      id: 'rgb-green',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 1px; background: green; mix-blend-mode: multiply;"></div>`,
        className: 'absolute left-0',
        style: {
          zIndex: 15,
          top: `${rgbSeparation}px`,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: incomingStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'rgb-green-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['rgb-green'],
            ranges: [
              { key: 'translateY', val: '-100%', prog: 0 },
              { key: 'translateY', val: '100vh', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // RGB separation - Blue line (offset by rgbSeparation * 2)
    {
      id: 'rgb-blue',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 1px; background: blue; mix-blend-mode: multiply;"></div>`,
        className: 'absolute left-0',
        style: {
          zIndex: 15,
          top: `${rgbSeparation * 2}px`,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: incomingStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'rgb-blue-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['rgb-blue'],
            ranges: [
              { key: 'translateY', val: '-100%', prog: 0 },
              { key: 'translateY', val: '100vh', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'scanner-light-leak-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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
  id: 'scanner-light-leak-transition',
  title: 'Scanning Light Leak Transition',
  description:
    'A tight 1-second transition that simulates a linear scanner passing over film. Features a bright horizontal band with gradient that reveals incoming video, extreme exposure effect on outgoing video, and RGB channel separation during scan.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'scanner', 'light-leak', 'film', 'glitch', 'rgb-separation'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.0,
    scannerHeight: 48,
    brightnessIntensity: 4,
    rgbSeparation: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const scannerLightLeakTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
