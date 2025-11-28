/**
 * Exposure Ramp Wipe Transition Preset
 *
 * Simulates a camera sensor being overwhelmed by light, then recovering.
 * Features a progressive brightness ramp that sweeps from left to right,
 * increasing the outgoing image brightness dramatically before revealing
 * the incoming image as brightness normalizes.
 *
 * Technical Implementation:
 * - 0.5s overlap between outgoing and incoming images
 * - Outgoing image brightness ramps from 1 → 1.5 → 3 over first 60% of overlap
 * - Clip-path wipes left-to-right, revealing incoming image (70% of overlap)
 * - Incoming image brightness normalizes from 2.5 → 1 during reveal
 * - Lens flare effect (semi-transparent radial gradient) follows sweep direction
 * - 15% buildup, 70% sweep, 15% settle timing
 *
 * Use cases:
 * - Creating cinematic transitions between video clips or images
 * - Simulating camera exposure overload effects
 * - Adding energy to scene transitions
 * - Professional video editing transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingImageSrc: z
    .string()
    .describe('Source URL of the outgoing image or video'),
  outgoingType: z
    .enum(['image', 'video'])
    .default('image')
    .describe('Type of outgoing media'),
  incomingImageSrc: z
    .string()
    .describe('Source URL of the incoming image or video'),
  incomingType: z
    .enum(['image', 'video'])
    .default('image')
    .describe('Type of incoming media'),
  outgoingDuration: z
    .number()
    .default(5)
    .describe('Duration of outgoing media in seconds'),
  incomingDuration: z
    .number()
    .default(5)
    .describe('Duration of incoming media in seconds'),
  overlapDuration: z
    .number()
    .default(0.5)
    .describe('Duration of transition overlap in seconds'),
  trackName: z
    .string()
    .default('exposure-ramp-wipe')
    .describe('Name of the track (used for component IDs)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingImageSrc,
    outgoingType,
    incomingImageSrc,
    incomingType,
    outgoingDuration,
    incomingDuration,
    overlapDuration,
    trackName,
  } = params;

  // Calculate total duration (sum of durations minus overlap)
  const totalDuration = outgoingDuration + incomingDuration - overlapDuration;

  // Determine component IDs based on media type
  const outgoingComponentId = outgoingType === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingType === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Timing breakdown:
  // 15% buildup (0 → 0.15)
  // 70% sweep (0.15 → 0.85)
  // 15% settle (0.85 → 1.0)

  const childrenData: RenderableComponentData[] = [
    // Outgoing media
    {
      id: `${trackName}-outgoing-media`,
      type: 'atom',
      componentId: outgoingComponentId,
      data: {
        src: outgoingImageSrc,
        className: 'absolute inset-0 object-cover',
        style: {
          zIndex: 10,
          width: '100%',
          height: '100%',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingDuration,
        },
      },
      effects: [
        // Brightness ramp effect (1 → 1.5 → 3 over first 60% of overlap)
        {
          id: `${trackName}-outgoing-brightness-ramp`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`${trackName}-outgoing-media`],
            type: 'ease-in-out',
            start: outgoingDuration - overlapDuration,
            duration: overlapDuration,
            ranges: [
              { key: 'filter', val: 'brightness(1)', prog: 0 },
              { key: 'filter', val: 'brightness(1.5)', prog: 0.36 },
              { key: 'filter', val: 'brightness(3)', prog: 0.6 },
            ],
          },
        },
        // Clip-path wipe effect (left-to-right)
        {
          id: `${trackName}-outgoing-wipe-clip`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`${trackName}-outgoing-media`],
            type: 'ease-in-out',
            start: outgoingDuration - overlapDuration,
            duration: overlapDuration,
            ranges: [
              { key: 'clipPath', val: 'inset(0 0% 0 0)', prog: 0 },
              { key: 'clipPath', val: 'inset(0 50% 0 0)', prog: 0.425 },
              { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0.85 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Incoming media
    {
      id: `${trackName}-incoming-media`,
      type: 'atom',
      componentId: incomingComponentId,
      data: {
        src: incomingImageSrc,
        className: 'absolute inset-0 object-cover',
        style: {
          zIndex: 20,
          width: '100%',
          height: '100%',
        },
      },
      context: {
        timing: {
          start: outgoingDuration - overlapDuration,
          duration: incomingDuration + overlapDuration,
        },
      },
      effects: [
        // Brightness settle effect (2.5 → 1.5 → 1)
        {
          id: `${trackName}-incoming-brightness-settle`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`${trackName}-incoming-media`],
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            ranges: [
              { key: 'filter', val: 'brightness(2.5)', prog: 0 },
              { key: 'filter', val: 'brightness(1.5)', prog: 0.575 },
              { key: 'filter', val: 'brightness(1)', prog: 1 },
            ],
          },
        },
        // Clip-path reveal effect (left-to-right)
        {
          id: `${trackName}-incoming-reveal-clip`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`${trackName}-incoming-media`],
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            ranges: [
              { key: 'clipPath', val: 'inset(0 0 0 100%)', prog: 0 },
              { key: 'clipPath', val: 'inset(0 0 0 50%)', prog: 0.15 },
              { key: 'clipPath', val: 'inset(0 0 0 0%)', prog: 0.85 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Lens flare effect (semi-transparent radial gradient following sweep)
    {
      id: `${trackName}-lens-flare`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='width: 300px; height: 100%; background: radial-gradient(circle at center, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 30%, transparent 70%); pointer-events: none;'></div>",
        className: 'absolute inset-y-0',
        style: {
          zIndex: 30,
          left: 0,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
        },
      },
      effects: [
        // Flare sweep animation (translateX from -300 to 100vw)
        {
          id: `${trackName}-flare-sweep`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`${trackName}-lens-flare`],
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            ranges: [
              { key: 'translateX', val: -300, prog: 0 },
              { key: 'translateX', val: 0, prog: 0.15 },
              { key: 'translateX', val: '100vw', prog: 0.85 },
            ],
          },
        },
        // Flare opacity pulse (0 → 0.6 → 0)
        {
          id: `${trackName}-flare-opacity-pulse`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [`${trackName}-lens-flare`],
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.35 },
              { key: 'opacity', val: 0.6, prog: 0.65 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          position: 'relative',
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
  id: 'exposure-ramp-wipe',
  title: 'Exposure Ramp Wipe Transition',
  description:
    'Simulates a camera sensor being overwhelmed by light, then recovering. Features a progressive brightness ramp that sweeps from left to right with lens flare effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'exposure', 'wipe', 'lens-flare', 'brightness'],
  defaultInputParams: {
    outgoingImageSrc: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    outgoingType: 'image',
    incomingImageSrc: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    incomingType: 'image',
    outgoingDuration: 5,
    incomingDuration: 5,
    overlapDuration: 0.5,
    trackName: 'exposure-ramp-wipe',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const exposureRampWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
