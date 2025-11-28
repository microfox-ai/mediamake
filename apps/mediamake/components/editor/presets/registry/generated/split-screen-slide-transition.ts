/**
 * Split-Screen Slide Transition Preset
 *
 * This preset creates an editorial-style split-screen transition where the outgoing video
 * splits at the center - left half slides left, right half slides right, both fading out -
 * revealing the incoming video underneath which scales up from 0.9 to 1. A 2px white glowing
 * line at the split point adds polish. Ideal for comparison or before/after scenarios.
 *
 * Features:
 * - **Split-Screen Effect**: Outgoing video splits into left/right halves that slide apart
 * - **Dual Slide Animation**: Left half slides left (-50%), right half slides right (+50%)
 * - **Synchronized Fade**: Both halves fade out during the transition
 * - **Incoming Scale**: New video scales from 0.9 to 1.0 as it's revealed
 * - **Glowing Split Line**: 2px white line at center with glow effect that fades in/out
 * - **Customizable Overlap**: Configurable transition duration (default 1.2s)
 *
 * Use cases:
 * - Editorial-style transitions for professional videos
 * - Before/after comparison reveals
 * - Product showcase transitions
 * - Story-driven content with dramatic reveals
 * - Comparison or versus scenarios
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
  overlapDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the transition overlap in seconds'),
  outgoingFit: z
    .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
    .default('cover')
    .optional()
    .describe('Object fit for outgoing video'),
  incomingFit: z
    .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
    .default('cover')
    .optional()
    .describe('Object fit for incoming video'),
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
    overlapDuration,
    outgoingFit = 'cover',
    incomingFit = 'cover',
  } = params;

  // Calculate total duration: outgoing + incoming - overlap
  const totalDuration = outgoingDuration + incomingDuration - overlapDuration;

  // Incoming video starts before outgoing ends (overlap)
  const incomingStartTime = outgoingDuration - overlapDuration;

  // Build incoming video container (underneath, scales up)
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingDuration + overlapDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: incomingFit,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration + overlapDuration,
          },
        },
        effects: [
          {
            id: 'incoming-scale-effect',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: overlapDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'scale', val: 0.9, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Build left half of outgoing video (slides left, fades out)
  const outgoingLeftHalf: RenderableComponentData = {
    id: 'outgoing-left-half',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
          clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video-left',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: outgoingFit,
          className: 'w-full h-full object-cover',
          style: {
            width: '200%',
            height: '100%',
            position: 'absolute',
            left: '0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      {
        id: 'left-slide-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-left-half'],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '-50%', prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Build right half of outgoing video (slides right, fades out)
  const outgoingRightHalf: RenderableComponentData = {
    id: 'outgoing-right-half',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
          clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video-right',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: outgoingFit,
          className: 'w-full h-full object-cover',
          style: {
            width: '200%',
            height: '100%',
            position: 'absolute',
            right: '0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      {
        id: 'right-slide-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-right-half'],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '50%', prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Build glowing split line (2px white, fades in/out with glow)
  const splitLine: RenderableComponentData = {
    id: 'split-line',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute',
      style: {
        left: '50%',
        top: '0',
        transform: 'translateX(-50%)',
        width: '2px',
        height: '100%',
        backgroundColor: 'white',
        zIndex: 2,
      },
    },
    context: {
      timing: {
        start: outgoingDuration - overlapDuration,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: 'split-line-glow-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['split-line'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
            {
              key: 'filter',
              val: 'drop-shadow(0 0 0px rgba(255,255,255,0))',
              prog: 0,
            },
            {
              key: 'filter',
              val: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))',
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'drop-shadow(0 0 0px rgba(255,255,255,0))',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Assemble root container
  const rootContainer: RenderableComponentData = {
    id: 'split-screen-transition-root',
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
    childrenData: [
      incomingVideoContainer,
      outgoingLeftHalf,
      outgoingRightHalf,
      splitLine,
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
  id: 'split-screen-slide-transition',
  title: 'Split-Screen Slide Transition',
  description:
    "An editorial-style split-screen transition where the outgoing video splits at the center - left half slides left, right half slides right, both fading out - revealing the incoming video underneath which scales up from 0.9 to 1. A 2px white glowing line at the split point adds polish. Ideal for comparison or before/after scenarios with 1.2-second overlap duration.",
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'split-screen', 'slide', 'editorial', 'comparison'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingDuration: 5,
    incomingDuration: 5,
    overlapDuration: 1.2,
    outgoingFit: 'cover',
    incomingFit: 'cover',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const splitScreenSlideTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
