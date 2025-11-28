/**
 * CRT Monitor Turn-Off Transition Preset
 *
 * This preset simulates the classic CRT television shutdown effect when transitioning
 * between two videos. The outgoing video collapses horizontally into a thin line with
 * a bright flash, while heavy VHS static noise overlays the transition. The incoming
 * video then expands from the line in reverse.
 *
 * Features:
 * - **Horizontal Collapse**: Outgoing video scaleY animation from 1 to 0.01
 * - **Brightness Flash**: Outgoing video brightness spikes to 200% at midpoint
 * - **VHS Static Overlay**: Looping static noise with opacity fade during transition
 * - **Phosphor Line**: White glowing line appears at the collapse moment
 * - **Chromatic Aberration**: Hue-rotate and blur filters for analog distortion
 * - **Reverse Power-On**: Incoming video expands from line with reverse effect
 * - **Configurable Timing**: 0.8s overlap period with customizable parameters
 *
 * Use cases:
 * - Creating retro/nostalgic video transitions
 * - Simulating vintage TV effects
 * - Adding analog feel to digital content
 * - Building 80s/90s aesthetic videos
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
  }).describe('First video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration'),
  overlapDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the transition overlap in seconds'),
  staticVideoSrc: z
    .string()
    .optional()
    .describe('Optional VHS static noise video source URL (must be uploaded through platform)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration, staticVideoSrc } = params;

  // Calculate timing
  const transitionStart = video1.duration - overlapDuration;
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Helper function to create phosphor line HTML
  const createPhosphorLineHTML = (): string => {
    return `<div style="width:100%;height:2px;background:white;box-shadow:0 0 20px 10px rgba(255,255,255,0.8),0 0 40px 20px rgba(255,255,255,0.4);"></div>`;
  };

  const childrenData: RenderableComponentData[] = [];

  // Outgoing video (video1)
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // ScaleY collapse effect
      {
        id: 'outgoing-scaleY-collapse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 0.01, prog: 1 },
          ],
        },
      },
      // Brightness spike effect
      {
        id: 'outgoing-brightness-spike',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter.brightness', val: 1, prog: 0 },
            { key: 'filter.brightness', val: 2, prog: 0.5 },
            { key: 'filter.brightness', val: 1, prog: 1 },
          ],
        },
      },
      // Chromatic aberration (hue-rotate + blur)
      {
        id: 'outgoing-chromatic',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter.hueRotate', val: 0, prog: 0 },
            { key: 'filter.hueRotate', val: 5, prog: 0.5 },
            { key: 'filter.hueRotate', val: 0, prog: 1 },
            { key: 'filter.blur', val: 0, prog: 0 },
            { key: 'filter.blur', val: 2, prog: 0.5 },
            { key: 'filter.blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(outgoingVideo);

  // Incoming video (video2)
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        zIndex: 15,
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + overlapDuration,
      },
    },
    effects: [
      // ScaleY expand effect (reverse)
      {
        id: 'incoming-scaleY-expand',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0.4, // Start after collapse finishes
          duration: 0.4,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scaleY', val: 0.01, prog: 0 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        },
      },
      // Initial scaleY (hidden state before expand)
      {
        id: 'incoming-initial-scale',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scaleY', val: 0.01, prog: 0 },
            { key: 'scaleY', val: 0.01, prog: 1 },
          ],
        },
      },
      // Chromatic aberration (reverse)
      {
        id: 'incoming-chromatic',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0.4,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter.hueRotate', val: 5, prog: 0 },
            { key: 'filter.hueRotate', val: 0, prog: 1 },
            { key: 'filter.blur', val: 2, prog: 0 },
            { key: 'filter.blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(incomingVideo);

  // Static overlay (if provided)
  if (staticVideoSrc) {
    const staticOverlay: RenderableComponentData = {
      id: 'static-overlay',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: staticVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        loop: true,
        muted: true,
        style: {
          zIndex: 20,
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: 'static-opacity',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['static-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    childrenData.push(staticOverlay);
  }

  // Phosphor line
  const phosphorLine: RenderableComponentData = {
    id: 'phosphor-line',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: createPhosphorLineHTML(),
      className: 'absolute left-0 right-0',
      style: {
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 30,
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: 'phosphor-line-opacity',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['phosphor-line'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.4 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 0.6 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(phosphorLine);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'crt-transition-root',
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
  id: 'crt-turnoff-transition',
  title: 'CRT Monitor Turn-Off Transition',
  description:
    'A retro CRT television shutdown transition effect that simulates the classic TV turn-off animation. Features horizontal scaleY collapse of the outgoing video into a thin phosphor line with brightness spike, VHS static noise overlay during the 0.8s overlap, chromatic aberration filters for analog distortion, and reverse power-on expansion for the incoming video.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'retro', 'crt', 'tv', 'vintage', 'analog', 'vhs'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crtTurnoffTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
