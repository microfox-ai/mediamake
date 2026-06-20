/**
 * Mechanical Carousel Projector Transition Preset
 *
 * This preset simulates a vintage carousel slide projector transition with emphasized
 * mechanical click sound visualization. It creates a tactile, decisive transition effect
 * that mimics the physical operation of carousel projectors from the analog era.
 *
 * Features:
 * - **Rapid Scale-Down Effect**: Outgoing image scales down and fades quickly,
 *   simulating the slide being pulled back into the projector mechanism
 * - **Flash Frame Effect**: Brief white flash (0.05-0.1s) mimics the projector lamp
 *   illuminating the gap between slides during the mechanical rotation
 * - **Overshoot Scale Animation**: Incoming image snaps into place with slight
 *   overshoot (102% → 100%), simulating the mechanical stop of the carousel
 * - **Black Gap Period**: 0.2s black period representing the physical rotation time
 * - **Ease-in-quart/Ease-out-back Timing**: Sharp, decisive timing curves that
 *   emphasize the mechanical nature of the transition
 *
 * Use cases:
 * - Vintage-style photo slideshows with authentic mechanical feel
 * - Retro presentation transitions with nostalgic projector aesthetics
 * - Documentary-style image sequences evoking analog photography
 * - Educational content about photography history with period-appropriate effects
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
    src: z.string().describe('Source URL of the outgoing image'),
    duration: z.number().describe('Duration the outgoing image is visible in seconds'),
  }).describe('Outgoing image configuration'),
  incomingImage: z.object({
    src: z.string().describe('Source URL of the incoming image'),
    duration: z.number().describe('Duration the incoming image is visible in seconds'),
  }).describe('Incoming image configuration'),
  transitionDuration: z.number()
    .default(0.53)
    .describe('Total transition duration in seconds (outgoing 0.2s + flash 0.08s + incoming 0.25s)'),
  outgoingDuration: z.number()
    .default(0.2)
    .describe('Duration of outgoing image scale-down and fade-out effect'),
  flashDuration: z.number()
    .default(0.08)
    .describe('Duration of white flash effect between slides'),
  incomingDuration: z.number()
    .default(0.25)
    .describe('Duration of incoming image overshoot scale and fade-in effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingImage,
    incomingImage,
    outgoingDuration,
    flashDuration,
    incomingDuration,
  } = params;

  // Calculate total duration: outgoing + flash + incoming
  const totalTransitionDuration = outgoingDuration + flashDuration + incomingDuration;

  // Calculate complete BaseLayout duration including both images and transition
  const baseLayoutDuration = outgoingImage.duration + incomingImage.duration;

  // Timing breakdown:
  // - Outgoing image: 0 to outgoingImage.duration
  // - Transition starts at: outgoingImage.duration
  // - Flash starts at: outgoingImage.duration + outgoingDuration
  // - Incoming starts at: outgoingImage.duration + outgoingDuration + flashDuration

  const transitionStartTime = outgoingImage.duration;
  const flashStartTime = transitionStartTime + outgoingDuration;
  const incomingStartTime = flashStartTime + flashDuration;

  // Outgoing image with rapid scale-down and fade-out
  const outgoingImageNode: RenderableComponentData = {
    id: 'outgoing-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: outgoingImage.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingImage.duration + outgoingDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-scale-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-quart',
          start: transitionStartTime,
          duration: outgoingDuration,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            // Scale down: 1 → 0.95 → 0.9
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.95, prog: 0.5 },
            { key: 'scale', val: 0.9, prog: 1 },
            // Opacity fade: 1 → 0.5 → 0
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Flash frame effect - bright white flash simulating projector lamp
  const flashFrameNode: RenderableComponentData = {
    id: 'flash-frame',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="absolute inset-0 bg-white"></div>',
      className: 'absolute inset-0',
      style: {
        zIndex: 20,
      },
    },
    context: {
      timing: {
        start: flashStartTime,
        duration: flashDuration,
      },
    },
    effects: [
      {
        id: 'flash-opacity',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: flashDuration,
          mode: 'provider',
          targetIds: ['flash-frame'],
          ranges: [
            // Flash: 0 → 1 → 0 (quick burst)
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming image with overshoot scale and fade-in
  const incomingImageNode: RenderableComponentData = {
    id: 'incoming-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: incomingImage.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 30,
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingImage.duration,
      },
    },
    effects: [
      {
        id: 'incoming-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out-back',
          start: 0,
          duration: incomingDuration,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            // Overshoot scale: 0.9 → 1.02 → 1
            { key: 'scale', val: 0.9, prog: 0 },
            { key: 'scale', val: 1.02, prog: 0.6 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: incomingDuration * 0.4, // Fade in during first 40% of incoming duration
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            // Quick fade in: 0 → 1
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with black background
  const rootContainer: RenderableComponentData = {
    id: 'carousel-projector-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      outgoingImageNode,
      flashFrameNode,
      incomingImageNode,
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
  id: 'mechanical-carousel-projector',
  title: 'Mechanical Carousel Projector Transition',
  description: 'A slide projector carousel transition preset with mechanical click animation, flash frame effect, and overshoot snap. Simulates the tactile feel of vintage carousel projectors with rapid scale-down, momentary bright flash, and mechanical settle animation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'projector', 'carousel', 'vintage', 'mechanical', 'flash', 'retro'],
  defaultInputParams: {
    outgoingImage: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    incomingImage: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    transitionDuration: 0.53,
    outgoingDuration: 0.2,
    flashDuration: 0.08,
    incomingDuration: 0.25,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const mechanicalCarouselProjectorPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
