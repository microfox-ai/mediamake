/**
 * Double-Click Shutter Burst Transition Preset
 *
 * Creates a dramatic camera shutter burst transition effect between two media items.
 * Features two distinct white flash pulses that mimic rapid-fire camera shots,
 * with shake effects on the outgoing image and a snap-in effect on the incoming image.
 *
 * Key Features:
 * - 0.6 second overlap period with controlled transitions
 * - First flash at 20% of overlap (quick brightness spike)
 * - Brief return to normal at 40%
 * - Second stronger flash at 60% (brighter spike)
 * - Outgoing image shake (2-3px random offset) during first flash
 * - Incoming image 'snap' into place on second flash with scale effect
 * - Uses both filter brightness and white overlay HTMLBlockAtoms for flash effects
 * - Sharp attack (easeOutQuart) and softer decay (easeInQuad) on flashes
 * - Photographer rapid-capture aesthetic
 *
 * Use cases:
 * - Photo gallery transitions
 * - Documentary-style cuts
 * - Action sequence transitions
 * - Dynamic slideshow presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of outgoing media (image or video)'),
    type: z.enum(['image', 'video']).describe('Type of outgoing media'),
    duration: z.number().describe('Duration of outgoing media in seconds'),
  }).describe('Outgoing media configuration'),
  
  media2: z.object({
    src: z.string().describe('Source URL of incoming media (image or video)'),
    type: z.enum(['image', 'video']).describe('Type of incoming media'),
    duration: z.number().describe('Duration of incoming media in seconds'),
  }).describe('Incoming media configuration'),
  
  overlapDuration: z
    .number()
    .default(0.6)
    .describe('Duration of transition overlap in seconds (default: 0.6s)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration } = params;

  // Calculate base layout duration (sum of media durations minus overlap)
  const baseLayoutDuration = media1.duration + media2.duration - overlapDuration;

  // Calculate key timing points within the overlap period
  const outgoingDuration = media1.duration;
  const incomingStart = media1.duration - overlapDuration;
  
  // Flash timing points (relative to overlap start)
  const firstFlashTime = overlapDuration * 0.2; // 20% into overlap (0.12s)
  const returnNormalTime = overlapDuration * 0.4; // 40% into overlap (0.24s)
  const secondFlashTime = overlapDuration * 0.6; // 60% into overlap (0.36s)
  
  // Flash durations
  const flashAttackDuration = 0.05; // 50ms sharp attack
  const flashDecayDuration = 0.05; // 50ms softer decay
  const flashTotalDuration = flashAttackDuration + flashDecayDuration; // 0.1s total

  // Determine component IDs based on media types
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Create outgoing image with shake and brightness effects
  const outgoingMedia: RenderableComponentData = {
    id: 'outgoing-image',
    type: 'atom',
    componentId: media1ComponentId,
    data: {
      src: media1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    effects: [
      // Shake effect during first flash (synchronized with first flash)
      {
        id: 'outgoing-shake',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: outgoingDuration - overlapDuration + firstFlashTime - flashAttackDuration,
          duration: flashTotalDuration,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateX', val: Math.random() * 6 - 3, prog: 0.2 },
            { key: 'translateY', val: Math.random() * 6 - 3, prog: 0.2 },
            { key: 'translateX', val: Math.random() * 6 - 3, prog: 0.4 },
            { key: 'translateY', val: Math.random() * 6 - 3, prog: 0.4 },
            { key: 'translateX', val: Math.random() * 6 - 3, prog: 0.6 },
            { key: 'translateY', val: Math.random() * 6 - 3, prog: 0.6 },
            { key: 'translateX', val: Math.random() * 6 - 3, prog: 0.8 },
            { key: 'translateY', val: Math.random() * 6 - 3, prog: 0.8 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
      // Brightness spike during first flash - attack (sharp)
      {
        id: 'outgoing-brightness-attack',
        componentId: 'generic',
        data: {
          type: 'easeOutQuart',
          start: outgoingDuration - overlapDuration + firstFlashTime - flashAttackDuration,
          duration: flashAttackDuration,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'filter:brightness', val: 1, prog: 0 },
            { key: 'filter:brightness', val: 2.5, prog: 1 },
          ],
        },
      },
      // Brightness spike during first flash - decay (softer)
      {
        id: 'outgoing-brightness-decay',
        componentId: 'generic',
        data: {
          type: 'easeInQuad',
          start: outgoingDuration - overlapDuration + firstFlashTime,
          duration: flashDecayDuration,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'filter:brightness', val: 2.5, prog: 0 },
            { key: 'filter:brightness', val: 1, prog: 1 },
          ],
        },
      },
      // Fade out from 50% to 100% of overlap
      {
        id: 'outgoing-fade-out',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: outgoingDuration - overlapDuration + (overlapDuration * 0.5),
          duration: overlapDuration * 0.5,
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming image with snap effect and brightness
  const incomingMedia: RenderableComponentData = {
    id: 'incoming-image',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 20,
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: media2.duration,
      },
    },
    effects: [
      // Fade in from 40% to 100% of overlap (relative to incoming start)
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: overlapDuration * 0.4,
          duration: overlapDuration * 0.6,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Scale snap effect at second flash
      {
        id: 'incoming-scale-snap',
        componentId: 'generic',
        data: {
          type: 'easeOutQuart',
          start: secondFlashTime - flashAttackDuration,
          duration: flashTotalDuration,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'scale', val: 1.02, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Brightness spike during second flash - attack (stronger, sharper)
      {
        id: 'incoming-brightness-attack',
        componentId: 'generic',
        data: {
          type: 'easeOutQuart',
          start: secondFlashTime - flashAttackDuration,
          duration: flashAttackDuration,
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'filter:brightness', val: 2.5, prog: 0 },
            { key: 'filter:brightness', val: 1.5, prog: 1 },
          ],
        },
      },
      // Brightness spike during second flash - decay (softer, longer)
      {
        id: 'incoming-brightness-decay',
        componentId: 'generic',
        data: {
          type: 'easeInQuad',
          start: secondFlashTime,
          duration: overlapDuration * 0.4, // Decay over remaining overlap time
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'filter:brightness', val: 1.5, prog: 0 },
            { key: 'filter:brightness', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // First white flash overlay at 20% overlap
  const flashOverlay1: RenderableComponentData = {
    id: 'flash-overlay-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 100%; height: 100%; background-color: white;'></div>",
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 30,
      },
    },
    context: {
      timing: {
        start: incomingStart + firstFlashTime - flashAttackDuration,
        duration: flashTotalDuration,
      },
    },
    effects: [
      // Flash attack (sharp rise to 0.8 opacity)
      {
        id: 'flash-1-attack',
        componentId: 'generic',
        data: {
          type: 'easeOutQuart',
          start: 0,
          duration: flashAttackDuration,
          mode: 'provider',
          targetIds: ['flash-overlay-1'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 1 },
          ],
        },
      },
      // Flash decay (softer fall to 0)
      {
        id: 'flash-1-decay',
        componentId: 'generic',
        data: {
          type: 'easeInQuad',
          start: flashAttackDuration,
          duration: flashDecayDuration,
          mode: 'provider',
          targetIds: ['flash-overlay-1'],
          ranges: [
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Second white flash overlay at 60% overlap (stronger)
  const flashOverlay2: RenderableComponentData = {
    id: 'flash-overlay-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 100%; height: 100%; background-color: white;'></div>",
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 40,
      },
    },
    context: {
      timing: {
        start: incomingStart + secondFlashTime - flashAttackDuration,
        duration: flashTotalDuration,
      },
    },
    effects: [
      // Flash attack (sharp rise to full opacity)
      {
        id: 'flash-2-attack',
        componentId: 'generic',
        data: {
          type: 'easeOutQuart',
          start: 0,
          duration: flashAttackDuration,
          mode: 'provider',
          targetIds: ['flash-overlay-2'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Flash decay (softer fall to 0)
      {
        id: 'flash-2-decay',
        componentId: 'generic',
        data: {
          type: 'easeInQuad',
          start: flashAttackDuration,
          duration: flashDecayDuration,
          mode: 'provider',
          targetIds: ['flash-overlay-2'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container holding all elements
  const rootContainer: RenderableComponentData = {
    id: 'double-click-shutter-burst-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      outgoingMedia,
      incomingMedia,
      flashOverlay1,
      flashOverlay2,
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
  id: 'double-click-shutter-burst',
  title: 'Double-Click Shutter Burst Transition',
  description: 'Rapid-fire camera shutter transition with two white flash pulses, shake effects, and snap-in animation mimicking a photographer capturing moments. Features 0.6s overlap with brightness spikes, random shake offsets, and snap positioning.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'flash', 'camera', 'shutter', 'burst', 'photography', 'shake', 'snap'],
  defaultInputParams: {
    media1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 5,
    },
    media2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      type: 'image',
      duration: 5,
    },
    overlapDuration: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const doubleClickShutterBurstPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
