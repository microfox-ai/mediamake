/**
 * Sliding Panel Mosaic Transition Preset
 *
 * Creates a venetian blind style transition effect where videos are divided into 8 vertical panels.
 * Odd panels slide up while even panels slide down during the transition period.
 * 
 * Features:
 * - 8 vertical strips with alternating slide directions (odd up, even down)
 * - Outgoing video panels accelerate as they leave (cubic-bezier(0.55, 0.055, 0.675, 0.19))
 * - Incoming video panels decelerate as they settle (cubic-bezier(0.215, 0.61, 0.355, 1))
 * - Staggered timing with 0.05s delays between adjacent panels for wave effect
 * - Subtle color shifts during motion (hue-rotate and brightness filters)
 * - 1.5-second overlap period with alternating z-index for composite moments
 * - Each panel shows a vertical strip of the video using calculated positioning
 *
 * Use cases:
 * - Creating dynamic transitions between video clips
 * - Adding cinematic venetian blind effects
 * - Building engaging video montages with stylized transitions
 * - Professional video editing with artistic panel animations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first video (outgoing)'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second video (incoming)'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration'),
  overlapDuration: z.number().default(1.5).describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate total composition duration (video1 + video2 - overlap)
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Transition starts at this time (relative to composition start)
  const transitionStart = video1.duration - overlapDuration;

  // Panel configuration
  const panelCount = 8;
  const panelWidth = 12.5; // 100% / 8 = 12.5%
  const staggerDelay = 0.05; // 0.05s delay between adjacent panels

  // Easing functions
  const accelerationEasing = [0.55, 0.055, 0.675, 0.19]; // Acceleration (ease-in-out-quad)
  const decelerationEasing = [0.215, 0.61, 0.355, 1]; // Deceleration (ease-out-cubic)

  const childrenData: RenderableComponentData[] = [];

  // Create 8 outgoing panels (video1)
  for (let i = 0; i < panelCount; i++) {
    const panelId = `outgoing-panel-${i}`;
    const videoId = `outgoing-video-${i}`;
    const leftPosition = i * panelWidth;
    const isOdd = i % 2 !== 0;
    const zIndex = isOdd ? 11 : 10; // Alternating z-index
    const slideDirection = isOdd ? '-100%' : '100%'; // Odd up, even down
    const panelDelay = i * staggerDelay;
    const effectDuration = overlapDuration - panelDelay;

    childrenData.push({
      id: panelId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute h-full overflow-hidden',
          style: {
            left: `${leftPosition}%`,
            width: `${panelWidth}%`,
            zIndex: zIndex,
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
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            srcDuration: video1.duration,
            fit: 'cover',
            muted: true,
            style: {
              position: 'absolute',
              width: `${panelCount * 100}%`,
              height: '100%',
              left: `${-i * 100}%`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Slide effect
        {
          id: `${panelId}-slide`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            bezier: accelerationEasing,
            start: transitionStart + panelDelay,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'translateY', val: '0%', prog: 0 },
              { key: 'translateY', val: slideDirection, prog: 1 },
            ],
          },
        },
        // Color shift effect
        {
          id: `${panelId}-color`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            bezier: accelerationEasing,
            start: transitionStart + panelDelay,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'hueRotate', val: 0, prog: 0 },
              { key: 'hueRotate', val: 15, prog: 0.5 },
              { key: 'hueRotate', val: 0, prog: 1 },
              { key: 'brightness', val: 1, prog: 0 },
              { key: 'brightness', val: 1.2, prog: 0.5 },
              { key: 'brightness', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create 8 incoming panels (video2)
  for (let i = 0; i < panelCount; i++) {
    const panelId = `incoming-panel-${i}`;
    const videoId = `incoming-video-${i}`;
    const leftPosition = i * panelWidth;
    const isOdd = i % 2 !== 0;
    const zIndex = isOdd ? 4 : 5; // Lower z-index than outgoing, alternating
    const slideDirection = isOdd ? '-100%' : '100%'; // Odd starts from top, even from bottom
    const panelDelay = i * staggerDelay;
    const effectDuration = overlapDuration - panelDelay;

    childrenData.push({
      id: panelId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute h-full overflow-hidden',
          style: {
            left: `${leftPosition}%`,
            width: `${panelWidth}%`,
            zIndex: zIndex,
          },
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: video2.duration + overlapDuration,
        },
      },
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            srcDuration: video2.duration,
            fit: 'cover',
            muted: true,
            style: {
              position: 'absolute',
              width: `${panelCount * 100}%`,
              height: '100%',
              left: `${-i * 100}%`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + overlapDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Slide effect
        {
          id: `${panelId}-slide`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            bezier: decelerationEasing,
            start: panelDelay,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'translateY', val: slideDirection, prog: 0 },
              { key: 'translateY', val: '0%', prog: 1 },
            ],
          },
        },
        // Color shift effect
        {
          id: `${panelId}-color`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            bezier: decelerationEasing,
            start: panelDelay,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [panelId],
            ranges: [
              { key: 'hueRotate', val: 0, prog: 0 },
              { key: 'hueRotate', val: 15, prog: 0.5 },
              { key: 'hueRotate', val: 0, prog: 1 },
              { key: 'brightness', val: 1, prog: 0 },
              { key: 'brightness', val: 1.2, prog: 0.5 },
              { key: 'brightness', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  const rootContainer: RenderableComponentData = {
    id: 'sliding-panel-mosaic-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-gray-900',
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
  id: 'sliding-panel-mosaic-transition',
  title: 'Sliding Panel Mosaic Transition',
  description: 'A venetian blind style video transition with 8 vertical panels. Odd panels slide up while even panels slide down. Outgoing video panels accelerate out, incoming panels decelerate in. Panels have staggered timing with 0.05s delays and subtle color shifts during motion.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'video', 'venetian-blind', 'panels', 'mosaic', 'sliding', 'cinematic'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const slidingPanelMosaicTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
