/**
 * Temporal Displacement Glitch Transition Preset
 *
 * Creates a time-shifted pixel corruption effect between videos with multiple temporal layers.
 * The outgoing video displays multiple time-offset versions layered with varying opacity,
 * creating motion trail corruption. The incoming video emerges through temporal reconstruction
 * where future frames preview before resolving to present. Includes scan line refreshing
 * effects and temporal color bleeding between frames.
 *
 * Features:
 * - Multiple time-offset layers (5-7) of outgoing video with past frames bleeding into present
 * - Incoming video with future frame previews resolving to present
 * - Decreasing opacity and increasing blur on time-displaced layers
 * - Transform displacement (translateX/Y) based on time offsets
 * - Scan line effects with animated top position
 * - Chromatic aberration on time-displaced layers
 * - Mix blend modes (screen, multiply, overlay) for ghost frame effects
 * - 1.4-second transition duration
 *
 * Technical Implementation:
 * - 5 VideoAtom copies of outgoing video with different startFrom offsets (-0.5s to +0.5s)
 * - 5 VideoAtom copies of incoming video with inverse time offsets
 * - Stack with absolute positioning, decreasing opacity (1, 0.7, 0.5, 0.3, 0.1)
 * - Increasing blur (0px, 2px, 4px, 6px, 8px)
 * - Time-based translateX and translateY offsets
 * - 5 scan line divs with animated top position
 * - Mix-blend-mode variations for ghost effects
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
  transitionDuration: z
    .number()
    .default(1.4)
    .describe('Total transition duration in seconds'),
  outgoingDuration: z
    .number()
    .default(3)
    .describe('Duration of outgoing video visibility in seconds'),
  incomingDuration: z
    .number()
    .default(3)
    .describe('Duration of incoming video after transition in seconds'),
  maxTimeOffset: z
    .number()
    .default(0.5)
    .describe('Maximum time offset for temporal layers in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    outgoingDuration,
    incomingDuration,
    maxTimeOffset,
  } = params;

  // Calculate timing
  const outgoingTransitionStart = outgoingDuration * 0.5;
  const outgoingTransitionDuration = transitionDuration * 0.5;
  const incomingTransitionStart = outgoingTransitionStart + outgoingTransitionDuration;
  const incomingTransitionDuration = transitionDuration * 0.5;
  const totalDuration = outgoingDuration + incomingDuration;

  // Time offsets for 5 layers
  const timeOffsets = [0, -0.25, 0.25, -0.5, 0.5];

  // Opacity values for layers
  const opacities = [1, 0.7, 0.5, 0.3, 0.1];

  // Blur values for layers
  const blurs = [0, 2, 4, 6, 8];

  // Displacement values (px)
  const displacementsX = [0, 15, -30, 40, -50];
  const displacementsY = [0, -10, 15, -20, 30];

  // Mix blend modes
  const blendModes = ['screen', 'multiply', 'overlay', 'screen', 'multiply'];

  // Hue rotation for chromatic aberration
  const hueRotations = [0, 30, 0, 0, 0];

  // Create outgoing video layers
  const outgoingLayers: RenderableComponentData[] = timeOffsets.map(
    (offset, index) => {
      const layerId = `outgoing-layer-${index + 1}`;

      return {
        id: layerId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          startFrom: offset,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            mixBlendMode: blendModes[index],
            filter: `blur(${blurs[index]}px)`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
        effects: [
          {
            id: `${layerId}-opacity`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: outgoingTransitionStart,
              duration: outgoingTransitionDuration,
              mode: 'provider',
              targetIds: [layerId],
              ranges: [
                { key: 'opacity', val: opacities[index], prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          {
            id: `${layerId}-displace`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: outgoingTransitionStart,
              duration: outgoingTransitionDuration,
              mode: 'provider',
              targetIds: [layerId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: displacementsX[index], prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: displacementsY[index], prog: 1 },
              ],
            },
          },
          ...(hueRotations[index] !== 0
            ? [
                {
                  id: `${layerId}-chroma`,
                  componentId: 'generic',
                  data: {
                    type: 'linear',
                    start: outgoingTransitionStart,
                    duration: outgoingTransitionDuration,
                    mode: 'provider',
                    targetIds: [layerId],
                    ranges: [
                      { key: 'filter:hue-rotate', val: 0, prog: 0 },
                      {
                        key: 'filter:hue-rotate',
                        val: hueRotations[index],
                        prog: 1,
                      },
                    ],
                  },
                },
              ]
            : []),
        ],
      } as RenderableComponentData;
    },
  );

  // Create incoming video layers (inverse time offsets - future to present)
  const incomingTimeOffsets = [0.5, 0.25, 0, -0.25, -0.5];
  const incomingOpacitiesStart = [0, 0, 0, 0, 0];
  const incomingOpacitiesEnd = [1, 0.6, 0.4, 0.2, 0.1];
  const incomingBlendModes = ['normal', 'screen', 'overlay', 'multiply', 'screen'];
  const incomingDisplacementsX = [30, -25, 40, -35, 50];
  const incomingDisplacementsY = [0, 15, -20, 25, -30];
  const incomingHueRotations = [0, -30, 0, 0, 0];

  const incomingLayers: RenderableComponentData[] = incomingTimeOffsets.map(
    (offset, index) => {
      const layerId = `incoming-layer-${index + 1}`;

      return {
        id: layerId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          startFrom: offset > 0 ? 0 : Math.abs(offset),
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            mixBlendMode: incomingBlendModes[index],
            filter: `blur(${blurs[index]}px)`,
          },
        },
        context: {
          timing: {
            start: incomingTransitionStart,
            duration: incomingTransitionDuration + incomingDuration,
          },
        },
        effects: [
          {
            id: `${layerId}-opacity`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: incomingTransitionDuration,
              mode: 'provider',
              targetIds: [layerId],
              ranges: [
                { key: 'opacity', val: incomingOpacitiesStart[index], prog: 0 },
                { key: 'opacity', val: incomingOpacitiesEnd[index], prog: 1 },
              ],
            },
          },
          {
            id: `${layerId}-displace`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: incomingTransitionDuration,
              mode: 'provider',
              targetIds: [layerId],
              ranges: [
                { key: 'translateX', val: incomingDisplacementsX[index], prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: incomingDisplacementsY[index], prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
          ...(incomingHueRotations[index] !== 0
            ? [
                {
                  id: `${layerId}-chroma`,
                  componentId: 'generic',
                  data: {
                    type: 'linear',
                    start: 0,
                    duration: incomingTransitionDuration,
                    mode: 'provider',
                    targetIds: [layerId],
                    ranges: [
                      {
                        key: 'filter:hue-rotate',
                        val: incomingHueRotations[index],
                        prog: 0,
                      },
                      { key: 'filter:hue-rotate', val: 0, prog: 1 },
                    ],
                  },
                },
              ]
            : []),
        ],
      } as RenderableComponentData;
    },
  );

  // Create scan lines (5 lines, staggered timing)
  const scanlineStarts = [0, 0.2, 0.4, 0.6, 0.8];
  const scanlineDurations = [1.4, 1.2, 1.0, 0.8, 0.6];

  const scanlines: RenderableComponentData[] = scanlineStarts.map(
    (start, index) => {
      const scanlineId = `scanline-${index + 1}`;

      return {
        id: scanlineId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div class='h-px bg-white'></div>",
          className: 'absolute left-0 right-0 opacity-20',
        },
        context: {
          timing: {
            start: start,
            duration: scanlineDurations[index],
          },
        },
        effects: [
          {
            id: `${scanlineId}-move`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: scanlineDurations[index],
              mode: 'provider',
              targetIds: [scanlineId],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: 1080, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Outgoing container
  const outgoingContainer: RenderableComponentData = {
    id: 'temporal-glitch-outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    childrenData: outgoingLayers,
  };

  // Incoming container
  const incomingContainer: RenderableComponentData = {
    id: 'temporal-glitch-incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: incomingTransitionStart,
        duration: incomingTransitionDuration + incomingDuration,
      },
    },
    childrenData: incomingLayers,
  };

  // Scanlines container
  const scanlinesContainer: RenderableComponentData = {
    id: 'temporal-glitch-scanlines-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: scanlines,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'temporal-glitch-transition-root',
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
    childrenData: [outgoingContainer, incomingContainer, scanlinesContainer],
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
  id: 'temporal-displacement-glitch',
  title: 'Temporal Displacement Glitch Transition',
  description:
    'Creates time-shifted pixel corruption between videos with multiple temporal layers, motion trails, scan line effects, and chromatic aberration. 1.4-second transition with ghost frame blending and temporal reconstruction.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'temporal',
    'displacement',
    'video',
    'time-shift',
    'corruption',
    'scan-lines',
    'chromatic-aberration',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    transitionDuration: 1.4,
    outgoingDuration: 3,
    incomingDuration: 3,
    maxTimeOffset: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const temporalDisplacementGlitchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
