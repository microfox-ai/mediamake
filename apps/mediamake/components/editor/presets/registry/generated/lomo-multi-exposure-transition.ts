/**
 * Lomography Multi-Exposure Transition Preset
 *
 * Creates a Lomography-inspired multi-exposure transition effect where multiple shifted versions
 * of the frames overlap briefly. During the transition, the outgoing video disperses into 3 ghost
 * copies that fade out with different offsets, rotations, and opacities. The incoming video starts
 * with 3 dispersed ghost copies that converge into a single frame. Color channel shifts (chromatic
 * aberration) and increased contrast/saturation are applied during the overlap to mimic the
 * unpredictable multiple exposure effect of toy cameras.
 *
 * Features:
 * - 3 ghost copies of outgoing video, each with different transforms and opacities
 * - 3 ghost copies of incoming video that converge to center
 * - Chromatic aberration using CSS drop-shadow filters (red +2px, blue -2px)
 * - Contrast and saturation boost during overlap (1.0 → 1.3 contrast, 1.0 → 1.2 saturation)
 * - 0.7s transition duration
 * - All ghost copies fade to opacity 0 at the end
 *
 * Use cases:
 * - Creative video transitions with analog film aesthetic
 * - Lomography-style multi-exposure effects
 * - Artistic transitions between video clips
 * - Retro/vintage video editing styles
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  outgoingDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(0.7)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingDuration,
    incomingDuration,
    transitionDuration,
  } = params;

  // Calculate total duration: sum of both videos minus the overlap
  const totalDuration =
    outgoingDuration + incomingDuration - transitionDuration;

  // Timing calculations
  const outgoingStart = 0;
  const outgoingEnd = outgoingDuration;
  const incomingStart = outgoingDuration - transitionDuration;
  const incomingEnd = totalDuration;

  // Transition effects start time for outgoing (relative to outgoing start)
  const outgoingTransitionStart = outgoingDuration - transitionDuration;

  // Chromatic aberration filter (red/blue channel shift)
  const chromaticFilter =
    'drop-shadow(-2px 0 0 rgba(255,0,0,0.5)) drop-shadow(2px 0 0 rgba(0,0,255,0.5))';

  // Outgoing video layer with 3 ghost copies
  const outgoingLayer: RenderableComponentData = {
    id: 'outgoing-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingDuration,
      },
    },
    childrenData: [
      // Main outgoing video
      {
        id: 'outgoing-main',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
        effects: [
          // Fade out main video
          {
            id: 'outgoing-main-fade',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: outgoingTransitionStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-main'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          // Contrast and saturation boost during transition
          {
            id: 'outgoing-main-filter',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: outgoingTransitionStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-main'],
              ranges: [
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 0,
                },
                {
                  key: 'filter',
                  val: `contrast(1.3) saturate(1.2) ${chromaticFilter}`,
                  prog: 0.5,
                },
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Ghost copy 1 (5px, 1deg, 0.6 opacity)
      {
        id: 'outgoing-ghost-1',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
        effects: [
          {
            id: 'outgoing-ghost-1-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: outgoingTransitionStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-ghost-1'],
              ranges: [
                { key: 'translateX', val: '5px', prog: 0 },
                { key: 'translateX', val: '15px', prog: 1 },
                { key: 'rotate', val: 1, prog: 0 },
                { key: 'rotate', val: 3, prog: 1 },
                { key: 'opacity', val: 0.6, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          {
            id: 'outgoing-ghost-1-filter',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: outgoingTransitionStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-ghost-1'],
              ranges: [
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 0,
                },
                {
                  key: 'filter',
                  val: `contrast(1.3) saturate(1.2) ${chromaticFilter}`,
                  prog: 0.5,
                },
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Ghost copy 2 (10px, 5px, 2deg, 0.4 opacity)
      {
        id: 'outgoing-ghost-2',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
        effects: [
          {
            id: 'outgoing-ghost-2-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: outgoingTransitionStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-ghost-2'],
              ranges: [
                { key: 'translateX', val: '10px', prog: 0 },
                { key: 'translateX', val: '25px', prog: 1 },
                { key: 'translateY', val: '5px', prog: 0 },
                { key: 'translateY', val: '15px', prog: 1 },
                { key: 'rotate', val: 2, prog: 0 },
                { key: 'rotate', val: 5, prog: 1 },
                { key: 'opacity', val: 0.4, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          {
            id: 'outgoing-ghost-2-filter',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: outgoingTransitionStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-ghost-2'],
              ranges: [
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 0,
                },
                {
                  key: 'filter',
                  val: `contrast(1.3) saturate(1.2) ${chromaticFilter}`,
                  prog: 0.5,
                },
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Ghost copy 3 (15px, 10px, 3deg, 0.2 opacity)
      {
        id: 'outgoing-ghost-3',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
        effects: [
          {
            id: 'outgoing-ghost-3-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: outgoingTransitionStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-ghost-3'],
              ranges: [
                { key: 'translateX', val: '15px', prog: 0 },
                { key: 'translateX', val: '35px', prog: 1 },
                { key: 'translateY', val: '10px', prog: 0 },
                { key: 'translateY', val: '25px', prog: 1 },
                { key: 'rotate', val: 3, prog: 0 },
                { key: 'rotate', val: 7, prog: 1 },
                { key: 'opacity', val: 0.2, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          {
            id: 'outgoing-ghost-3-filter',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: outgoingTransitionStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-ghost-3'],
              ranges: [
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 0,
                },
                {
                  key: 'filter',
                  val: `contrast(1.3) saturate(1.2) ${chromaticFilter}`,
                  prog: 0.5,
                },
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Incoming video layer with 3 ghost copies converging
  const incomingLayer: RenderableComponentData = {
    id: 'incoming-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingDuration + transitionDuration,
      },
    },
    childrenData: [
      // Main incoming video
      {
        id: 'incoming-main',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration + transitionDuration,
          },
        },
        effects: [
          // Fade in main video
          {
            id: 'incoming-main-fade',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-main'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          // Contrast and saturation boost during transition
          {
            id: 'incoming-main-filter',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-main'],
              ranges: [
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 0,
                },
                {
                  key: 'filter',
                  val: `contrast(1.3) saturate(1.2) ${chromaticFilter}`,
                  prog: 0.5,
                },
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Ghost copy 1 converging (starts at -15px, -3deg)
      {
        id: 'incoming-ghost-1',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'incoming-ghost-1-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-ghost-1'],
              ranges: [
                { key: 'translateX', val: '-15px', prog: 0 },
                { key: 'translateX', val: '0px', prog: 0.7 },
                { key: 'rotate', val: -3, prog: 0 },
                { key: 'rotate', val: 0, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.6, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          {
            id: 'incoming-ghost-1-filter',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-ghost-1'],
              ranges: [
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 0,
                },
                {
                  key: 'filter',
                  val: `contrast(1.3) saturate(1.2) ${chromaticFilter}`,
                  prog: 0.5,
                },
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Ghost copy 2 converging (starts at -25px, -15px, -5deg)
      {
        id: 'incoming-ghost-2',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'incoming-ghost-2-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-ghost-2'],
              ranges: [
                { key: 'translateX', val: '-25px', prog: 0 },
                { key: 'translateX', val: '0px', prog: 0.7 },
                { key: 'translateY', val: '-15px', prog: 0 },
                { key: 'translateY', val: '0px', prog: 0.7 },
                { key: 'rotate', val: -5, prog: 0 },
                { key: 'rotate', val: 0, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.4, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          {
            id: 'incoming-ghost-2-filter',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-ghost-2'],
              ranges: [
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 0,
                },
                {
                  key: 'filter',
                  val: `contrast(1.3) saturate(1.2) ${chromaticFilter}`,
                  prog: 0.5,
                },
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Ghost copy 3 converging (starts at -35px, -25px, -7deg)
      {
        id: 'incoming-ghost-3',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full object-cover absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'incoming-ghost-3-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-ghost-3'],
              ranges: [
                { key: 'translateX', val: '-35px', prog: 0 },
                { key: 'translateX', val: '0px', prog: 0.7 },
                { key: 'translateY', val: '-25px', prog: 0 },
                { key: 'translateY', val: '0px', prog: 0.7 },
                { key: 'rotate', val: -7, prog: 0 },
                { key: 'rotate', val: 0, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.2, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          {
            id: 'incoming-ghost-3-filter',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-ghost-3'],
              ranges: [
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 0,
                },
                {
                  key: 'filter',
                  val: `contrast(1.3) saturate(1.2) ${chromaticFilter}`,
                  prog: 0.5,
                },
                {
                  key: 'filter',
                  val: `contrast(1) saturate(1) ${chromaticFilter}`,
                  prog: 1,
                },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'lomo-multi-exposure-container',
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
    childrenData: [outgoingLayer, incomingLayer],
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
  id: 'lomo-multi-exposure-transition',
  title: 'Lomography Multi-Exposure Transition',
  description:
    'A Lomography-inspired multi-exposure transition effect where multiple shifted and rotated ghost copies of the outgoing and incoming videos overlap during a 0.7s transition. Includes chromatic aberration (color channel shifts) and contrast/saturation boost to mimic the unpredictable multi-exposure effect of toy cameras. Ghost copies disperse from the outgoing video and converge into the incoming video.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'lomography', 'multi-exposure', 'analog', 'vintage'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingDuration: 5,
    incomingDuration: 5,
    transitionDuration: 0.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const lomoMultiExposureTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
