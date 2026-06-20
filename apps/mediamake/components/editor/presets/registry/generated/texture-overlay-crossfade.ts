/**
 * Texture Overlay Crossfade Transition Preset
 *
 * Creates a gritty, textured mashup transition between two YouTube images using a persistent
 * film grain/noise texture layer. Features:
 *
 * - Persistent texture overlay (grain/noise) at 30% opacity with 'overlay' blend mode
 * - Outgoing image fades out with 'overlay' blend mode
 * - Incoming image fades in with 'soft-light' blend mode
 * - Dynamic vignette effect that intensifies at transition midpoint
 * - Grayscale desaturation filter (0.2) applied at transition peak for dramatic effect
 * - 2-second overlap period with smooth crossfade
 * - Object-cover fit for both main images
 * - Unified analog film aesthetic
 *
 * Use cases:
 * - Creating cinematic transitions between video frames or images
 * - Building retro/analog-style video montages
 * - Adding texture and atmosphere to image sequences
 * - Crafting dramatic crossfades with vintage aesthetics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  outgoingImage: z.string().describe('Source URL of the outgoing image'),
  incomingImage: z.string().describe('Source URL of the incoming image'),
  textureImage: z
    .string()
    .describe(
      'Source URL of the film grain/noise texture image (persists throughout)',
    ),
  outgoingDuration: z
    .number()
    .default(3)
    .describe('Duration of outgoing image display in seconds (before overlap)'),
  incomingDuration: z
    .number()
    .default(3)
    .describe('Duration of incoming image display in seconds (after overlap)'),
  overlapDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingImage,
    incomingImage,
    textureImage,
    outgoingDuration,
    incomingDuration,
    overlapDuration,
  } = params;

  // Calculate total duration: outgoing + incoming - overlap
  const totalDuration = outgoingDuration + incomingDuration;

  // Outgoing image: full duration including overlap
  const outgoingImageNode: RenderableComponentData = {
    id: 'outgoing-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: outgoingImage,
      className: 'absolute inset-0 object-cover',
      style: {
        zIndex: 20,
        mixBlendMode: 'overlay',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration + overlapDuration,
      },
    },
    effects: [
      // Opacity fade out during overlap
      {
        id: 'outgoing-opacity-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingDuration, // Start fade at overlap
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Grayscale effect: 0 -> 0.2 -> 0
      {
        id: 'outgoing-grayscale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingDuration, // Start at overlap
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'filter', val: 'grayscale(0)', prog: 0 },
            { key: 'filter', val: 'grayscale(0.2)', prog: 0.5 }, // Peak at midpoint
            { key: 'filter', val: 'grayscale(0)', prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Incoming image: starts at overlap, lasts through incoming duration
  const incomingImageNode: RenderableComponentData = {
    id: 'incoming-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: incomingImage,
      className: 'absolute inset-0 object-cover',
      style: {
        zIndex: 10,
        mixBlendMode: 'soft-light',
      },
    },
    context: {
      timing: {
        start: outgoingDuration, // Start at overlap beginning
        duration: overlapDuration + incomingDuration,
      },
    },
    effects: [
      // Opacity fade in during overlap
      {
        id: 'incoming-opacity-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0, // Start immediately when component appears
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Grayscale effect: 0.2 -> 0.2 -> 0
      {
        id: 'incoming-grayscale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0, // Start immediately
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'filter', val: 'grayscale(0.2)', prog: 0 },
            { key: 'filter', val: 'grayscale(0.2)', prog: 0.5 }, // Peak at midpoint
            { key: 'filter', val: 'grayscale(0)', prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Texture overlay: persistent throughout entire duration
  const textureOverlayNode: RenderableComponentData = {
    id: 'texture-overlay',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: textureImage,
      className: 'absolute inset-0 object-cover pointer-events-none',
      style: {
        zIndex: 30,
        mixBlendMode: 'overlay',
        opacity: 0.3,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Vignette overlay: radial gradient that intensifies during transition
  const vignetteOverlayNode: RenderableComponentData = {
    id: 'vignette-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 25,
        background:
          'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 100%)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Vignette intensity: 0.5 -> 1 -> 0.5
      {
        id: 'vignette-intensity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingDuration, // Start at overlap
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['vignette-overlay'],
          ranges: [
            { key: 'opacity', val: 0.5, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 }, // Peak at midpoint
            { key: 'opacity', val: 0.5, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'texture-overlay-crossfade-container',
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
      outgoingImageNode,
      incomingImageNode,
      vignetteOverlayNode,
      textureOverlayNode,
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
  id: 'texture-overlay-crossfade',
  title: 'Texture Overlay Crossfade Transition',
  description:
    'Creates a gritty, textured crossfade transition between YouTube images with film grain overlay, dynamic vignette, and grayscale effects. Features persistent texture layer, blend mode variations (overlay/soft-light), and dramatic desaturation at transition midpoint for an analog film aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'crossfade',
    'texture',
    'film-grain',
    'vignette',
    'grayscale',
    'analog',
    'vintage',
    'gritty',
  ],
  defaultInputParams: {
    outgoingImage: 'https://picsum.photos/1920/1080?random=1',
    incomingImage: 'https://picsum.photos/1920/1080?random=2',
    textureImage: 'https://picsum.photos/1920/1080?random=3&grayscale&blur=2',
    outgoingDuration: 3,
    incomingDuration: 3,
    overlapDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const textureOverlayCrossfadePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
