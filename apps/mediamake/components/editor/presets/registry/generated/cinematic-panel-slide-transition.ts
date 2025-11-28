/**
 * Cinematic Panel-Slide Transition Preset
 *
 * This preset creates a cinematic film strip style transition with 3 video panels
 * that slide horizontally across the screen. Each panel occupies 1/3 of the screen width
 * and slides from right to left during transitions with motion blur effects, skew animations,
 * and film grain overlay. Includes letterbox bars for authentic cinematic framing.
 *
 * Features:
 * - 3-panel layout with 1/3 screen width each
 * - Horizontal slide transitions (right to left)
 * - 0.8 second transition duration with overlapping panels
 * - Motion blur effect (blur 0-2px-0) during transitions
 * - Subtle skewY animation (-2deg to 0deg) for dynamic motion
 * - Opacity fade during transitions (70% to 100%)
 * - Letterbox bars (10% top/bottom) for cinematic feel
 * - Film grain overlay for authentic film aesthetic
 * - Total duration: 10.4s (3 videos × 4s - 2 transitions × 0.8s)
 *
 * Use cases:
 * - Creating cinematic video montages
 * - Film strip style presentations
 * - Dynamic panel-based storytelling
 * - Professional video transitions with film aesthetic
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
  video1: z
    .object({
      src: z.string().describe('Video source URL for first panel'),
      duration: z.number().describe('Duration of first video in seconds'),
    })
    .describe('First video panel configuration'),
  video2: z
    .object({
      src: z.string().describe('Video source URL for second panel'),
      duration: z.number().describe('Duration of second video in seconds'),
    })
    .describe('Second video panel configuration'),
  video3: z
    .object({
      src: z.string().describe('Video source URL for third panel'),
      duration: z.number().describe('Duration of third video in seconds'),
    })
    .describe('Third video panel configuration'),
  transitionDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.8)
    .describe('Duration of slide transition overlap in seconds'),
  filmGrainOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Opacity of film grain overlay (0-1)'),
  letterboxHeight: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .describe('Height of letterbox bars as percentage (0-20)'),
});

type PresetParams = z.infer&lt;typeof presetParams&gt;;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput =&gt; {
  const {
    video1,
    video2,
    video3,
    transitionDuration,
    filmGrainOpacity,
    letterboxHeight,
  } = params;

  // Calculate total duration: sum of video durations minus transition overlaps
  const totalDuration =
    video1.duration + video2.duration + video3.duration - 2 * transitionDuration;

  // Calculate start times for each panel (relative to root container)
  const panel1Start = 0;
  const panel2Start = video1.duration - transitionDuration;
  const panel3Start =
    video1.duration + video2.duration - 2 * transitionDuration;

  // Panel 1 - First video with exit transition
  const panel1: RenderableComponentData = {
    id: 'video-panel-1',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-y-0 w-1/3 object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: panel1Start,
        duration: video1.duration,
      },
    },
    effects: [
      {
        id: 'panel-1-exit',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['video-panel-1'],
          ranges: [
            // Slide out to left
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '-100%', prog: 1 },
            // Fade to 70% opacity
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 1 },
            // Skew animation for dynamic motion
            { key: 'skewY', val: '0deg', prog: 0 },
            { key: 'skewY', val: '-2deg', prog: 0.5 },
            { key: 'skewY', val: '0deg', prog: 1 },
            // Motion blur during transition
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(2px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Panel 2 - Second video with enter and exit transitions
  const panel2: RenderableComponentData = {
    id: 'video-panel-2',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-y-0 w-1/3 object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: panel2Start,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      // Enter transition
      {
        id: 'panel-2-enter',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['video-panel-2'],
          ranges: [
            // Slide in from right
            { key: 'translateX', val: '100%', prog: 0 },
            { key: 'translateX', val: '0%', prog: 1 },
            // Fade from 70% to 100% opacity
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            // Skew animation
            { key: 'skewY', val: '-2deg', prog: 0 },
            { key: 'skewY', val: '0deg', prog: 1 },
            // Motion blur during transition
            { key: 'filter', val: 'blur(2px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Exit transition
      {
        id: 'panel-2-exit',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video2.duration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['video-panel-2'],
          ranges: [
            // Slide out to left
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '-100%', prog: 1 },
            // Fade to 70% opacity
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 1 },
            // Skew animation for dynamic motion
            { key: 'skewY', val: '0deg', prog: 0 },
            { key: 'skewY', val: '-2deg', prog: 0.5 },
            { key: 'skewY', val: '0deg', prog: 1 },
            // Motion blur during transition
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(2px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Panel 3 - Third video with enter transition only
  const panel3: RenderableComponentData = {
    id: 'video-panel-3',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video3.src,
      className: 'absolute inset-y-0 w-1/3 object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: panel3Start,
        duration: video3.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'panel-3-enter',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['video-panel-3'],
          ranges: [
            // Slide in from right
            { key: 'translateX', val: '100%', prog: 0 },
            { key: 'translateX', val: '0%', prog: 1 },
            // Fade from 70% to 100% opacity
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            // Skew animation
            { key: 'skewY', val: '-2deg', prog: 0 },
            { key: 'skewY', val: '0deg', prog: 1 },
            // Motion blur during transition
            { key: 'filter', val: 'blur(2px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Film strip container with video panels
  const filmStripContainer: RenderableComponentData = {
    id: 'film-strip-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [panel1, panel2, panel3] as RenderableComponentData[],
  };

  // Letterbox bars
  const letterboxTop: RenderableComponentData = {
    id: 'letterbox-top',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-x-0 top-0 bg-black z-50',
        style: {
          height: `${letterboxHeight}%`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  };

  const letterboxBottom: RenderableComponentData = {
    id: 'letterbox-bottom',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-x-0 bottom-0 bg-black z-50',
        style: {
          height: `${letterboxHeight}%`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  };

  // Film grain overlay
  const filmGrainOverlay: RenderableComponentData = {
    id: 'film-grain-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <div style="
          width: 100%;
          height: 100%;
          background-image: 
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.03) 2px,
              rgba(255, 255, 255, 0.03) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.03) 2px,
              rgba(255, 255, 255, 0.03) 4px
            );
          pointer-events: none;
        "></div>
      `,
      className: 'absolute inset-0 z-40 pointer-events-none mix-blend-overlay',
      style: {
        opacity: filmGrainOpacity,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-panel-slide-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      filmStripContainer,
      letterboxTop,
      letterboxBottom,
      filmGrainOverlay,
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
  id: 'cinematic-panel-slide-transition',
  title: 'Cinematic Panel-Slide Transition',
  description:
    'A cinematic film strip style transition preset featuring 3 video panels that slide horizontally across the screen with motion blur effects, skew animations, and film grain overlay. Panels occupy 1/3 screen width each and transition with 0.8s overlapping slides from right to left, creating a dynamic camera pan feel with letterbox bars for cinematic framing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'cinematic',
    'panel',
    'slide',
    'film-strip',
    'motion-blur',
    'letterbox',
    'film-grain',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 4,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 4,
    },
    video3: {
      src: 'https://example.com/video3.mp4',
      duration: 4,
    },
    transitionDuration: 0.8,
    filmGrainOpacity: 0.2,
    letterboxHeight: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicPanelSlideTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
