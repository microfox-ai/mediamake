/**
 * Cinematic Focus Pull Transition
 *
 * This preset creates a professional cinematography-style focus-pull transition between two videos.
 * It mimics real camera work with depth-based blur, Ken Burns zoom, chromatic aberration, and smooth
 * focus handoff during a 2-second overlap period.
 *
 * Features:
 * - **Depth-Based Blur**: Multiple masked layers (center sharp, midground 8px, background 18px) create realistic depth of field
 * - **Ken Burns Zoom**: Outgoing video scales 100%→115% over 3s, incoming video scales 125%→102%
 * - **Focus Handoff**: 2s overlap where focus transfers from outgoing to incoming video like a real camera
 * - **Chromatic Aberration**: Subtle RGB channel separation at blur edges for lens realism
 * - **Inverse Blur Pattern**: Incoming video starts with edges sharp and center blurred, then all becomes sharp
 *
 * Use cases:
 * - Professional video transitions mimicking cinema cameras
 * - Following subjects with dynamic depth of field
 * - Creating bokeh blur effects in post-production
 * - Smooth focus transfers between scenes
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
      src: z.string().describe('Source URL of first video'),
      duration: z.number().describe('Duration of first video in seconds'),
    })
    .describe('First video (outgoing)'),
  video2: z
    .object({
      src: z.string().describe('Source URL of second video'),
      duration: z.number().describe('Duration of second video in seconds'),
    })
    .describe('Second video (incoming)'),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of focus handoff overlap in seconds'),
  centerRadius: z
    .number()
    .default(30)
    .describe('Radius percentage for center sharp circle (0-100)'),
  midgroundRadius: z
    .number()
    .default(60)
    .describe('Radius percentage for midground ring (0-100)'),
  maxBlur: z
    .number()
    .default(18)
    .describe('Maximum blur amount in pixels for background'),
  midBlur: z
    .number()
    .default(8)
    .describe('Blur amount in pixels for midground layer'),
  chromaticIntensity: z
    .number()
    .default(1)
    .describe('Intensity of chromatic aberration effect (0-2)'),
  outgoingScale: z
    .object({
      start: z.number().default(1).describe('Starting scale for outgoing video'),
      end: z.number().default(1.15).describe('Ending scale for outgoing video'),
    })
    .optional()
    .describe('Scale animation range for outgoing video'),
  incomingScale: z
    .object({
      start: z.number().default(1.25).describe('Starting scale for incoming video'),
      end: z.number().default(1.02).describe('Ending scale for incoming video'),
    })
    .optional()
    .describe('Scale animation range for incoming video'),
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
    centerRadius,
    midgroundRadius,
    maxBlur,
    midBlur,
    chromaticIntensity,
    outgoingScale = { start: 1, end: 1.15 },
    incomingScale = { start: 1.25, end: 1.02 },
  } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Helper to create radial gradient clip-path
  const createCircleClip = (radius: number) =>
    `circle(${radius}% at 50% 50%)`;

  // Video 1 (Outgoing) - 5 layers with depth-based blur
  const video1BackgroundLayer: RenderableComponentData = {
    id: 'video1-background-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        clipPath: createCircleClip(100),
        zIndex: 1,
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
        id: 'video1-background-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video1.duration,
          mode: 'provider',
          targetIds: ['video1-background-layer'],
          ranges: [
            { key: 'scale', val: outgoingScale.start, prog: 0 },
            { key: 'scale', val: outgoingScale.end, prog: 1 },
          ],
        },
      },
      {
        id: 'video1-background-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video1.duration,
          mode: 'provider',
          targetIds: ['video1-background-layer'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${maxBlur}px)`, prog: 1 },
          ],
        },
      },
    ],
  };

  const video1MidgroundLayer: RenderableComponentData = {
    id: 'video1-midground-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        clipPath: createCircleClip(midgroundRadius),
        zIndex: 2,
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
        id: 'video1-midground-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video1.duration,
          mode: 'provider',
          targetIds: ['video1-midground-layer'],
          ranges: [
            { key: 'scale', val: outgoingScale.start, prog: 0 },
            { key: 'scale', val: outgoingScale.end, prog: 1 },
          ],
        },
      },
      {
        id: 'video1-midground-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video1.duration,
          mode: 'provider',
          targetIds: ['video1-midground-layer'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${midBlur}px)`, prog: 1 },
          ],
        },
      },
    ],
  };

  const video1CenterLayer: RenderableComponentData = {
    id: 'video1-center-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        clipPath: createCircleClip(centerRadius),
        zIndex: 3,
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
        id: 'video1-center-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video1.duration,
          mode: 'provider',
          targetIds: ['video1-center-layer'],
          ranges: [
            { key: 'scale', val: outgoingScale.start, prog: 0 },
            { key: 'scale', val: outgoingScale.end, prog: 1 },
          ],
        },
      },
    ],
  };

  // Chromatic aberration layers for video1
  const chromaticOffset = 1 * chromaticIntensity;
  const chromaticBlurMax = 12 * chromaticIntensity;

  const video1ChromaticRLayer: RenderableComponentData = {
    id: 'video1-chromatic-r-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        clipPath: createCircleClip(100),
        mixBlendMode: 'screen',
        opacity: 0.3,
        filter: 'sepia(1) hue-rotate(330deg) saturate(3)',
        zIndex: 4,
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
        id: 'video1-chromatic-r-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video1.duration,
          mode: 'provider',
          targetIds: ['video1-chromatic-r-layer'],
          ranges: [
            { key: 'scale', val: outgoingScale.start, prog: 0 },
            { key: 'scale', val: outgoingScale.end, prog: 1 },
          ],
        },
      },
      {
        id: 'video1-chromatic-r-offset',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: video1.duration,
          mode: 'provider',
          targetIds: ['video1-chromatic-r-layer'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: chromaticOffset, prog: 1 },
          ],
        },
      },
      {
        id: 'video1-chromatic-r-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video1.duration,
          mode: 'provider',
          targetIds: ['video1-chromatic-r-layer'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${chromaticBlurMax}px)`, prog: 1 },
          ],
        },
      },
    ],
  };

  const video1ChromaticBLayer: RenderableComponentData = {
    id: 'video1-chromatic-b-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        clipPath: createCircleClip(100),
        mixBlendMode: 'screen',
        opacity: 0.3,
        filter: 'sepia(1) hue-rotate(200deg) saturate(3)',
        zIndex: 5,
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
        id: 'video1-chromatic-b-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video1.duration,
          mode: 'provider',
          targetIds: ['video1-chromatic-b-layer'],
          ranges: [
            { key: 'scale', val: outgoingScale.start, prog: 0 },
            { key: 'scale', val: outgoingScale.end, prog: 1 },
          ],
        },
      },
      {
        id: 'video1-chromatic-b-offset',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: video1.duration,
          mode: 'provider',
          targetIds: ['video1-chromatic-b-layer'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -chromaticOffset, prog: 1 },
          ],
        },
      },
      {
        id: 'video1-chromatic-b-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video1.duration,
          mode: 'provider',
          targetIds: ['video1-chromatic-b-layer'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${chromaticBlurMax}px)`, prog: 1 },
          ],
        },
      },
    ],
  };

  const video1CompositeContainer: RenderableComponentData = {
    id: 'video1-composite-container',
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
        duration: video1.duration,
      },
    },
    childrenData: [
      video1BackgroundLayer,
      video1MidgroundLayer,
      video1CenterLayer,
      video1ChromaticRLayer,
      video1ChromaticBLayer,
    ],
  };

  // Video 2 (Incoming) - Starts at video1.duration - transitionDuration
  // Inverse blur pattern: starts with center blurred, edges less blurred, then all becomes sharp
  const video2StartTime = video1.duration - transitionDuration;

  const video2BackgroundLayer: RenderableComponentData = {
    id: 'video2-background-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        clipPath: createCircleClip(100),
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video2.duration,
      },
    },
    effects: [
      {
        id: 'video2-background-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video2.duration,
          mode: 'provider',
          targetIds: ['video2-background-layer'],
          ranges: [
            { key: 'scale', val: incomingScale.start, prog: 0 },
            { key: 'scale', val: incomingScale.end, prog: 1 },
          ],
        },
      },
      {
        id: 'video2-background-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video2.duration,
          mode: 'provider',
          targetIds: ['video2-background-layer'],
          ranges: [
            { key: 'filter', val: 'blur(6px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      {
        id: 'video2-background-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: 0.5,
          mode: 'provider',
          targetIds: ['video2-background-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const video2MidgroundLayer: RenderableComponentData = {
    id: 'video2-midground-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        clipPath: createCircleClip(midgroundRadius),
        zIndex: 2,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video2.duration,
      },
    },
    effects: [
      {
        id: 'video2-midground-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video2.duration,
          mode: 'provider',
          targetIds: ['video2-midground-layer'],
          ranges: [
            { key: 'scale', val: incomingScale.start, prog: 0 },
            { key: 'scale', val: incomingScale.end, prog: 1 },
          ],
        },
      },
      {
        id: 'video2-midground-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video2.duration,
          mode: 'provider',
          targetIds: ['video2-midground-layer'],
          ranges: [
            { key: 'filter', val: 'blur(3px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      {
        id: 'video2-midground-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: 0.5,
          mode: 'provider',
          targetIds: ['video2-midground-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const video2CenterLayer: RenderableComponentData = {
    id: 'video2-center-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        clipPath: createCircleClip(centerRadius),
        zIndex: 3,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video2.duration,
      },
    },
    effects: [
      {
        id: 'video2-center-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video2.duration,
          mode: 'provider',
          targetIds: ['video2-center-layer'],
          ranges: [
            { key: 'scale', val: incomingScale.start, prog: 0 },
            { key: 'scale', val: incomingScale.end, prog: 1 },
          ],
        },
      },
      {
        id: 'video2-center-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video2.duration,
          mode: 'provider',
          targetIds: ['video2-center-layer'],
          ranges: [
            { key: 'filter', val: 'blur(8px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      {
        id: 'video2-center-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: 0.5,
          mode: 'provider',
          targetIds: ['video2-center-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Chromatic aberration for video2
  const video2ChromaticOffset = 2 * chromaticIntensity;
  const video2ChromaticBlur = 12 * chromaticIntensity;

  const video2ChromaticRLayer: RenderableComponentData = {
    id: 'video2-chromatic-r-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        clipPath: createCircleClip(100),
        mixBlendMode: 'screen',
        opacity: 0.3,
        filter: 'sepia(1) hue-rotate(330deg) saturate(3)',
        zIndex: 4,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video2.duration,
      },
    },
    effects: [
      {
        id: 'video2-chromatic-r-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video2.duration,
          mode: 'provider',
          targetIds: ['video2-chromatic-r-layer'],
          ranges: [
            { key: 'scale', val: incomingScale.start, prog: 0 },
            { key: 'scale', val: incomingScale.end, prog: 1 },
          ],
        },
      },
      {
        id: 'video2-chromatic-r-offset',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video2.duration,
          mode: 'provider',
          targetIds: ['video2-chromatic-r-layer'],
          ranges: [
            { key: 'translateX', val: video2ChromaticOffset, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'video2-chromatic-r-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video2.duration,
          mode: 'provider',
          targetIds: ['video2-chromatic-r-layer'],
          ranges: [
            { key: 'filter', val: `blur(${video2ChromaticBlur}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      {
        id: 'video2-chromatic-r-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: 0.5,
          mode: 'provider',
          targetIds: ['video2-chromatic-r-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
  };

  const video2ChromaticBLayer: RenderableComponentData = {
    id: 'video2-chromatic-b-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        clipPath: createCircleClip(100),
        mixBlendMode: 'screen',
        opacity: 0.3,
        filter: 'sepia(1) hue-rotate(200deg) saturate(3)',
        zIndex: 5,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video2.duration,
      },
    },
    effects: [
      {
        id: 'video2-chromatic-b-zoom',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video2.duration,
          mode: 'provider',
          targetIds: ['video2-chromatic-b-layer'],
          ranges: [
            { key: 'scale', val: incomingScale.start, prog: 0 },
            { key: 'scale', val: incomingScale.end, prog: 1 },
          ],
        },
      },
      {
        id: 'video2-chromatic-b-offset',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video2.duration,
          mode: 'provider',
          targetIds: ['video2-chromatic-b-layer'],
          ranges: [
            { key: 'translateX', val: -video2ChromaticOffset, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'video2-chromatic-b-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: video2.duration,
          mode: 'provider',
          targetIds: ['video2-chromatic-b-layer'],
          ranges: [
            { key: 'filter', val: `blur(${video2ChromaticBlur}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      {
        id: 'video2-chromatic-b-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: 0.5,
          mode: 'provider',
          targetIds: ['video2-chromatic-b-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
  };

  const video2CompositeContainer: RenderableComponentData = {
    id: 'video2-composite-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 2,
        },
      },
    },
    context: {
      timing: {
        start: video2StartTime,
        duration: video2.duration,
      },
    },
    childrenData: [
      video2BackgroundLayer,
      video2MidgroundLayer,
      video2CenterLayer,
      video2ChromaticRLayer,
      video2ChromaticBLayer,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-focus-pull-container',
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
        duration: totalDuration,
      },
    },
    childrenData: [video1CompositeContainer, video2CompositeContainer],
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
  id: 'cinematic-focus-pull-transition',
  title: 'Cinematic Focus Pull Transition',
  description:
    'Professional cinematography-inspired focus-pull transition with Ken Burns zoom refinement, depth-based blur layers (0-18px), realistic lens characteristics including chromatic aberration, and smooth focus handoff between videos during 2s overlap. Mimics following a subject with dynamic depth of field.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'focus-pull',
    'cinematic',
    'depth-of-field',
    'ken-burns',
    'bokeh',
    'chromatic-aberration',
    'video',
  ],
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
    centerRadius: 30,
    midgroundRadius: 60,
    maxBlur: 18,
    midBlur: 8,
    chromaticIntensity: 1,
    outgoingScale: {
      start: 1,
      end: 1.15,
    },
    incomingScale: {
      start: 1.25,
      end: 1.02,
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicFocusPullTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
