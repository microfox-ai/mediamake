/**
 * Thermal Imaging Solarization Transition Preset
 *
 * This preset creates a dramatic thermal imaging transition effect that transforms the outgoing video
 * through heat-map color palettes (blues to reds) with progressive color inversion and hue rotation.
 * The transition features a white-hot flash moment at the midpoint, simulating thermal camera imagery,
 * and ghostly inverted afterimages that fade slowly as the incoming video emerges from the thermal state
 * back to normal colors.
 *
 * Features:
 * - Heat-map color transformation (blues → reds) via hue rotation and inversion
 * - Progressive color inversion and saturation adjustments creating thermal appearance
 * - White-hot flash moment at transition peak
 * - Sepia tone during flash for authentic thermal camera look
 * - Contrast enhancement during thermal phase
 * - Ghostly inverted afterimages with delayed fade-out
 * - Smooth transition from thermal back to normal colors
 * - 1.8-second overlap with complex filter chains
 *
 * Use cases:
 * - Sci-fi or technical video transitions
 * - Surveillance or security footage aesthetics
 * - Industrial or engineering content
 * - Action sequences with thermal vision effects
 * - Creative music videos with heat-map visuals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video'),
  outgoingDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Duration of the transition overlap in seconds'),
  flashIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Intensity of the white-hot flash (0-1)'),
  thermalIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity of thermal color transformation'),
  afterimageOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of the ghostly afterimage effect'),
  afterimageDuration: z
    .number()
    .default(2.3)
    .describe('Duration of the afterimage fade in seconds'),
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
    flashIntensity,
    thermalIntensity,
    afterimageOpacity,
    afterimageDuration,
  } = params;

  // Calculate total duration with overlap
  const totalDuration = outgoingDuration + incomingDuration - transitionDuration;

  // Transition midpoint for flash effect
  const transitionStart = outgoingDuration - transitionDuration;
  const flashStart = transitionStart + transitionDuration / 2;
  const flashDuration = 0.1;

  // Outgoing video container (z-index: 1)
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'thermal-outgoing-container',
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
        duration: outgoingDuration,
      },
    },
    childrenData: [
      {
        id: 'thermal-outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
        effects: [
          // Thermal transformation effect
          {
            id: 'thermal-transformation',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['thermal-outgoing-video'],
              ranges: [
                // Hue rotation (0deg → 240deg) for heat-map colors
                { key: 'hueRotate', val: 0, prog: 0 },
                { key: 'hueRotate', val: 240 * thermalIntensity, prog: 1 },
                // Inversion (0% → 100%)
                { key: 'invert', val: 0, prog: 0 },
                { key: 'invert', val: 1 * thermalIntensity, prog: 1 },
                // Saturation increase
                { key: 'saturate', val: 1, prog: 0 },
                { key: 'saturate', val: 1.5, prog: 0.5 },
                { key: 'saturate', val: 1.5, prog: 1 },
                // Contrast boost during thermal phase
                { key: 'contrast', val: 1, prog: 0 },
                { key: 'contrast', val: 1.5, prog: 0.5 },
                { key: 'contrast', val: 1.5, prog: 1 },
              ],
            },
          },
          // Sepia flash during white-hot moment
          {
            id: 'thermal-sepia-flash',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: flashStart - outgoingDuration + transitionDuration,
              duration: flashDuration * 2,
              mode: 'provider',
              targetIds: ['thermal-outgoing-video'],
              ranges: [
                { key: 'sepia', val: 0, prog: 0 },
                { key: 'sepia', val: 1, prog: 0.25 },
                { key: 'sepia', val: 1, prog: 0.75 },
                { key: 'sepia', val: 0, prog: 1 },
              ],
            },
          },
          // Fade out at the end
          {
            id: 'outgoing-fade-out',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: transitionDuration * 0.7,
              duration: transitionDuration * 0.3,
              mode: 'provider',
              targetIds: ['thermal-outgoing-video'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Incoming video container (z-index: 2)
  const incomingVideoContainer: RenderableComponentData = {
    id: 'thermal-incoming-container',
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
        start: transitionStart,
        duration: incomingDuration + transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'thermal-incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration + transitionDuration,
          },
        },
        effects: [
          // Reverse thermal transformation
          {
            id: 'incoming-thermal-reverse',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration * 0.85,
              mode: 'provider',
              targetIds: ['thermal-incoming-video'],
              ranges: [
                // Hue rotation (240deg → 0deg)
                { key: 'hueRotate', val: 240 * thermalIntensity, prog: 0 },
                { key: 'hueRotate', val: 0, prog: 1 },
                // Inversion (100% → 0%)
                { key: 'invert', val: 1 * thermalIntensity, prog: 0 },
                { key: 'invert', val: 0, prog: 1 },
                // Saturation decrease
                { key: 'saturate', val: 1.5, prog: 0 },
                { key: 'saturate', val: 1, prog: 1 },
                // Contrast decrease
                { key: 'contrast', val: 1.5, prog: 0 },
                { key: 'contrast', val: 1, prog: 1 },
              ],
            },
          },
          // Fade in
          {
            id: 'incoming-fade-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration * 0.3,
              mode: 'provider',
              targetIds: ['thermal-incoming-video'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Afterimage container (z-index: 3)
  const afterimageContainer: RenderableComponentData = {
    id: 'thermal-afterimage-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 3,
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: afterimageDuration,
      },
    },
    childrenData: [
      {
        id: 'thermal-afterimage-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: afterimageDuration,
          },
        },
        effects: [
          // Fade in to afterimage opacity
          {
            id: 'afterimage-fade-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.3,
              mode: 'provider',
              targetIds: ['thermal-afterimage-video'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: afterimageOpacity, prog: 1 },
              ],
            },
          },
          // Delayed thermal inversion effect (trailing by 500ms)
          {
            id: 'afterimage-thermal-invert',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0.5,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['thermal-afterimage-video'],
              ranges: [
                // Hue rotation with offset
                { key: 'hueRotate', val: 180, prog: 0 },
                { key: 'hueRotate', val: 0, prog: 1 },
                // Partial inversion
                { key: 'invert', val: 1, prog: 0 },
                { key: 'invert', val: 0.5, prog: 0.5 },
                { key: 'invert', val: 0, prog: 1 },
                // Saturation
                { key: 'saturate', val: 1.3, prog: 0 },
                { key: 'saturate', val: 1, prog: 1 },
              ],
            },
          },
          // Fade out slowly
          {
            id: 'afterimage-fade-out',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: afterimageDuration * 0.65,
              duration: afterimageDuration * 0.35,
              mode: 'provider',
              targetIds: ['thermal-afterimage-video'],
              ranges: [
                { key: 'opacity', val: afterimageOpacity, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // White-hot flash layer (z-index: 10)
  const whiteFlashLayer: RenderableComponentData = {
    id: 'thermal-white-flash',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
          backgroundColor: 'white',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: flashStart,
        duration: flashDuration,
      },
    },
    effects: [
      {
        id: 'white-flash-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: flashDuration,
          mode: 'provider',
          targetIds: ['thermal-white-flash'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: flashIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'thermal-solarization-transition-root',
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
      outgoingVideoContainer,
      incomingVideoContainer,
      afterimageContainer,
      whiteFlashLayer,
    ],
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
  id: 'thermal-solarization-transition',
  title: 'Thermal Imaging Solarization Transition',
  description:
    'Advanced thermal imaging transition effect that transforms outgoing video through heat-map color palettes (blues to reds) with progressive color inversion and hue rotation. Features white-hot flash moment at midpoint, thermal palette progression, and ghostly inverted afterimages that fade slowly as incoming video emerges from thermal state back to normal colors.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'thermal', 'solarization', 'heatmap', 'invert', 'sci-fi'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingDuration: 5,
    incomingDuration: 5,
    transitionDuration: 1.8,
    flashIntensity: 0.8,
    thermalIntensity: 1,
    afterimageOpacity: 0.3,
    afterimageDuration: 2.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const thermalSolarizationTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
