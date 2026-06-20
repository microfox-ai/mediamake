/**
 * Slide Projector Carousel Transition Preset
 *
 * Creates a physical slide projector carousel transition where videos appear as slides
 * that rotate and shift position as if advancing through a circular carousel. Features
 * counter-clockwise rotation with left slide for outgoing video, clockwise rotation with
 * right slide for incoming video, mechanical click sound effect at transition midpoint,
 * and brightness flash simulating projector light between slides.
 *
 * Features:
 * - **Carousel Rotation**: Outgoing video rotates counter-clockwise (-15deg) while incoming rotates clockwise (15deg to 0)
 * - **Sliding Motion**: Videos slide horizontally during transition (left for outgoing, right for incoming)
 * - **Scale Animation**: Videos scale down/up during transition for depth effect (0.9 to 1 scale range)
 * - **Mechanical Click**: Audio click sound effect timed at transition midpoint
 * - **Brightness Flash**: White flash overlay at transition midpoint simulating projector light
 * - **1-second Overlap**: Configurable overlap period for smooth transitions
 *
 * Use cases:
 * - Creating nostalgic slide projector transitions between video clips
 * - Building retro-style video presentations
 * - Adding mechanical/analog feel to video transitions
 * - Creating educational or documentary-style content with classic transitions
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
  }).describe('First video (outgoing) configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video (incoming) configuration'),
  clickSound: z.object({
    src: z.string().describe('Source URL of mechanical click sound effect'),
  }).describe('Mechanical click sound effect configuration'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of transition overlap in seconds (default: 1s)'),
  trackName: z
    .string()
    .default('projector-carousel')
    .describe('Name of the track (used for component IDs)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, clickSound, transitionDuration, trackName } = params;

  // Calculate timing
  const overlapDuration = transitionDuration;
  const totalDuration = video1.duration + video2.duration - overlapDuration;
  const transitionStartTime = video1.duration - overlapDuration;
  const flashMidpointTime = transitionStartTime + overlapDuration / 2;

  // Component IDs
  const outgoingVideoId = `${trackName}-outgoing-video`;
  const incomingVideoId = `${trackName}-incoming-video`;
  const brightnessFlashId = `${trackName}-brightness-flash`;
  const clickSoundId = `${trackName}-click-sound`;

  // Outgoing video (rotates counter-clockwise, slides left, scales down)
  const outgoingVideo: RenderableComponentData = {
    id: outgoingVideoId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        transformOrigin: 'center center',
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
        id: `${outgoingVideoId}-carousel-exit`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStartTime,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [outgoingVideoId],
          ranges: [
            // Rotate counter-clockwise
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: -15, prog: 1 },
            // Slide left
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '-150px', prog: 1 },
            // Scale down
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.9, prog: 1 },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video (rotates clockwise, slides from right, scales up)
  const incomingVideo: RenderableComponentData = {
    id: incomingVideoId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: video2.duration + overlapDuration,
      },
    },
    effects: [
      {
        id: `${incomingVideoId}-carousel-entry`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming video start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [incomingVideoId],
          ranges: [
            // Rotate clockwise to neutral
            { key: 'rotate', val: 15, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            // Slide from right to center
            { key: 'translateX', val: '150px', prog: 0 },
            { key: 'translateX', val: '0px', prog: 1 },
            // Scale up
            { key: 'scale', val: 0.9, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Brightness flash at transition midpoint
  const brightnessFlash: RenderableComponentData = {
    id: brightnessFlashId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 bg-white pointer-events-none',
      style: {
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: flashMidpointTime,
        duration: 0.2,
      },
    },
    effects: [
      {
        id: `${brightnessFlashId}-flash`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.2,
          mode: 'provider',
          targetIds: [brightnessFlashId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Mechanical click sound at transition midpoint
  const clickSoundEffect: RenderableComponentData = {
    id: clickSoundId,
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: clickSound.src,
      volume: 1,
    },
    context: {
      timing: {
        start: flashMidpointTime,
        duration: 0.2, // Short duration for click sound
      },
    },
  };

  // Root container with gradient background
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-carousel-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          background: 'radial-gradient(circle, #4a5568 0%, #1a202c 100%)',
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
    childrenData: [
      outgoingVideo,
      incomingVideo,
      brightnessFlash,
      clickSoundEffect,
    ] as RenderableComponentData[],
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
  id: 'slide-projector-carousel-transition',
  title: 'Slide Projector Carousel Transition',
  description:
    'Physical slide projector carousel transition where videos appear as slides rotating through a circular carousel mechanism. Features counter-clockwise rotation with left slide and scale-down for outgoing video, clockwise rotation with right slide and scale-up for incoming video, brightness flash simulating projector light between slides, and mechanical click sound effect at transition midpoint.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'carousel', 'projector', 'mechanical', 'vintage', 'retro'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    clickSound: {
      src: 'https://example.com/click.mp3',
    },
    transitionDuration: 1.0,
    trackName: 'projector-carousel',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const slideProjectorCarouselTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};