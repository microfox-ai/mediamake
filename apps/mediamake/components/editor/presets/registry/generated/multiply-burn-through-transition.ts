/**
 * Multiply Burn-Through Transition Preset
 *
 * A dramatic film burn effect transition between images. The outgoing image uses 'multiply'
 * blend mode and gradually 'burns away' with increasing brightness (filter: brightness 1 to 2.5)
 * and decreasing opacity over a 1.8-second overlap. The incoming image emerges from beneath with
 * 'screen' blend mode, starting overexposed (brightness: 1.8) and normalizing to 1.0 as it
 * reaches full opacity. A warm color overlay (orange/amber gradient) at 15% opacity with 'color'
 * blend mode peaks at the transition midpoint, creating a hot, energetic YouTube intro/outro
 * aesthetic. Both images use 'object-cover' with absolute positioning.
 *
 * Features:
 * - Outgoing image with 'multiply' blend mode burns away (opacity: 1→0, brightness: 1→2.5)
 * - Incoming image with 'screen' blend mode emerges (opacity: 0→1, brightness: 1.8→1)
 * - Warm overlay (orange/amber gradient) with 'color' blend mode peaks at midpoint (opacity: 0→0.15→0)
 * - 1.8-second overlap transition duration
 * - Easing: 'ease-in' for burn-out, 'ease-out' for emergence
 *
 * Use cases:
 * - YouTube video intros/outros with dramatic impact
 * - Energetic content transitions
 * - Film burn effects between scenes
 * - High-energy product reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingImage: z.object({
    src: z.string().describe('Source URL of the outgoing image that burns away'),
    duration: z.number().describe('Duration of the outgoing image in seconds'),
  }),
  incomingImage: z.object({
    src: z.string().describe('Source URL of the incoming image that emerges'),
    duration: z.number().describe('Duration of the incoming image in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(1.8)
    .describe('Duration of the burn-through transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingImage, incomingImage, overlapDuration } = params;

  // Calculate total duration (sum of images minus overlap)
  const totalDuration =
    outgoingImage.duration + incomingImage.duration - overlapDuration;

  // Create warm overlay gradient (orange/amber)
  const warmOverlayHtml = `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #FF6B00 0%, #FFA500 50%, #FFD700 100%);"></div>`;

  const childrenData: RenderableComponentData[] = [
    // Incoming image (bottom layer, z-index: 10, screen blend mode)
    {
      id: 'burn-in',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: incomingImage.src,
        className: 'absolute inset-0 object-cover',
        style: {
          zIndex: 10,
          mixBlendMode: 'screen',
        },
      },
      context: {
        timing: {
          start: outgoingImage.duration - overlapDuration,
          duration: incomingImage.duration + overlapDuration,
        },
      },
      effects: [
        // Opacity effect: 0 → 0.5 → 1
        {
          id: 'burn-in-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['burn-in'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Brightness effect: 1.8 → 1.2 → 1.0
        {
          id: 'burn-in-brightness',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['burn-in'],
            ranges: [
              { key: 'filter', val: 'brightness(1.8)', prog: 0 },
              { key: 'filter', val: 'brightness(1.2)', prog: 0.5 },
              { key: 'filter', val: 'brightness(1)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Outgoing image (middle layer, z-index: 20, multiply blend mode)
    {
      id: 'burn-out',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: outgoingImage.src,
        className: 'absolute inset-0 object-cover',
        style: {
          zIndex: 20,
          mixBlendMode: 'multiply',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingImage.duration,
        },
      },
      effects: [
        // Opacity effect: 1 → 0.8 → 0
        {
          id: 'burn-out-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingImage.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['burn-out'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Brightness effect: 1 → 1.5 → 2.5
        {
          id: 'burn-out-brightness',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingImage.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['burn-out'],
            ranges: [
              { key: 'filter', val: 'brightness(1)', prog: 0 },
              { key: 'filter', val: 'brightness(1.5)', prog: 0.5 },
              { key: 'filter', val: 'brightness(2.5)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Warm overlay (top layer, z-index: 25, color blend mode)
    {
      id: 'warm-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: warmOverlayHtml,
        className: 'absolute inset-0',
        style: {
          zIndex: 25,
          mixBlendMode: 'color',
        },
      },
      context: {
        timing: {
          start: outgoingImage.duration - overlapDuration,
          duration: overlapDuration,
        },
      },
      effects: [
        // Opacity effect: 0 → 0.15 → 0 (peaks at midpoint)
        {
          id: 'warm-overlay-opacity',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['warm-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.15, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'multiply-burn-through-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black',
      },
      fitDurationTo: 'scenes',
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
  id: 'multiply-burn-through-transition',
  title: 'Multiply Burn-Through Transition',
  description:
    'Dramatic film burn effect transition between images. Outgoing image uses "multiply" blend mode and "burns away" with increasing brightness (1→2.5) and decreasing opacity over 1.8s. Incoming image emerges from beneath with "screen" blend mode, starting overexposed (brightness: 1.8) and normalizing to 1.0. Includes warm orange/amber color overlay (15% opacity, "color" blend mode) peaking at transition midpoint. Creates hot, energetic YouTube intro/outro aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'burn',
    'film-burn',
    'multiply',
    'screen',
    'blend-mode',
    'energetic',
    'youtube',
    'dramatic',
    'color-overlay',
  ],
  defaultInputParams: {
    outgoingImage: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    incomingImage: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    overlapDuration: 1.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const multiplyBurnThroughTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
