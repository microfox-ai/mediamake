/**
 * UI Window Minimize Transition Preset
 *
 * This preset creates a desktop application window minimize transition effect with a loading bar.
 * The outgoing video scales down and slides towards the bottom-right corner (simulating minimize to taskbar)
 * while fading out. During the transition, a horizontal loading bar fills from left to right at the bottom
 * of the screen. The incoming video then fades in with a subtle scale-up effect, creating a smooth
 * application launch feel.
 *
 * Features:
 * - **Window Minimize Effect**: Outgoing video scales down and slides to bottom-right
 * - **Loading Bar Animation**: Thin horizontal bar fills during transition
 * - **Launch Animation**: Incoming video fades in with scale-up effect
 * - **Smooth Transitions**: All effects use easing for natural movement
 * - **Customizable Timing**: Adjustable transition duration (default 0.8s)
 *
 * Use cases:
 * - Creating desktop-style application transitions
 * - Simulating window minimize/maximize effects
 * - Adding loading bar progress indicators to transitions
 * - Building UI-inspired video transitions
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
      src: z.string().describe('Source URL of the first video (outgoing)'),
      duration: z.number().describe('Duration of the first video in seconds'),
    })
    .describe('First video to transition from'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second video (incoming)'),
      duration: z.number().describe('Duration of the second video in seconds'),
    })
    .describe('Second video to transition to'),
  transitionDuration: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.8)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate BaseLayout duration (sum of videos minus overlap)
  const baseLayoutDuration =
    video1.duration + video2.duration - transitionDuration;

  // Calculate timing values
  const outgoingVideoStart = 0;
  const outgoingVideoDuration = video1.duration;
  const minimizeEffectStart = video1.duration - transitionDuration;

  const incomingVideoStart = video1.duration - transitionDuration;
  const incomingVideoDuration = video2.duration + transitionDuration;

  const loadingBarStart = video1.duration - transitionDuration;
  const loadingBarDuration = transitionDuration;

  // Create outgoing video atom
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: outgoingVideoStart,
        duration: outgoingVideoDuration,
      },
    },
    effects: [
      {
        id: 'minimize-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: minimizeEffectStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            // Scale down to 0.3
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.3, prog: 1 },
            // Translate to bottom-right corner
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 40, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 40, prog: 1 },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create loading bar atom (using HTMLBlockAtom instead of deprecated ShapeAtom)
  const loadingBar: RenderableComponentData = {
    id: 'loading-bar',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="w-full h-full bg-blue-500"></div>',
      className: 'absolute bottom-4 left-0 right-0 h-1 z-50',
      style: {
        transformOrigin: 'left center',
      },
    },
    context: {
      timing: {
        start: loadingBarStart,
        duration: loadingBarDuration,
      },
    },
    effects: [
      {
        id: 'loading-bar-fill',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['loading-bar'],
          ranges: [
            { key: 'scaleX', val: 0, prog: 0 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video atom
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        zIndex: 20,
      },
    },
    context: {
      timing: {
        start: incomingVideoStart,
        duration: incomingVideoDuration,
      },
    },
    effects: [
      {
        id: 'launch-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            // Scale up from 0.95 to 1
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'ui-window-minimize-container',
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
        duration: baseLayoutDuration,
      },
    },
    childrenData: [outgoingVideo, loadingBar, incomingVideo],
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
  id: 'ui-window-minimize-transition',
  title: 'UI Window Minimize Transition',
  description:
    'Simulates a desktop application window minimizing with a loading bar progress indicator. The outgoing video scales down and slides to bottom-right corner while fading out, a horizontal loading bar fills from left to right at the bottom, and the incoming video fades in with a subtle scale-up effect, creating a smooth application launch feel.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'ui', 'window', 'minimize', 'loading', 'desktop'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const uiWindowMinimizeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
