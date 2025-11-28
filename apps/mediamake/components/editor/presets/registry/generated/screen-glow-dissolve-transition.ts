/**
 * Screen Glow Dissolve Transition
 *
 * Ethereal dreamy transition with screen blend mode creating an overexposed, glowing intersection.
 * Features dual-blur dissolve, gentle scale emergence, and a white overlay pulse for heavenly aesthetics.
 * Perfect for lifestyle/beauty YouTube content requiring soft, luminous transitions.
 *
 * Technical Features:
 * - Screen blend mode on both images for glowing intersection
 * - Outgoing image: opacity 1→0 + blur 0→8px during 2.2s overlap
 * - Incoming image: opacity 0→1 + blur 6→0px + scale 1.05→1.0 during 2.2s overlap
 * - White overlay layer: fades in to 20% opacity at midpoint, then fades out
 * - Custom cubic-bezier(0.4, 0, 0.2, 1) easing for smooth, organic motion
 *
 * Use cases:
 * - Beauty and lifestyle content transitions
 * - Soft, dreamy video sequences
 * - Overexposed, ethereal visual aesthetics
 * - Premium YouTube content with elegant transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingImageUrl: z
    .string()
    .describe('URL of the outgoing image (fading out with blur increase)'),
  incomingImageUrl: z
    .string()
    .describe('URL of the incoming image (fading in with blur decrease and scale)'),
  overlapDuration: z
    .number()
    .default(2.2)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingImageUrl, incomingImageUrl, overlapDuration } = params;

  // Custom easing for smooth organic motion
  const customEasing = 'cubic-bezier(0.4, 0, 0.2, 1)';

  // Outgoing image: fades out with increasing blur (0→8px)
  const outgoingImage: RenderableComponentData = {
    id: 'glow-outgoing',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: outgoingImageUrl,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 20,
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: 'glow-out-opacity',
        componentId: 'generic',
        data: {
          type: customEasing as any,
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['glow-outgoing'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'glow-out-blur',
        componentId: 'generic',
        data: {
          type: customEasing as any,
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['glow-outgoing'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(4px)', prog: 0.5 },
            { key: 'filter', val: 'blur(8px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming image: fades in with decreasing blur (6→0px) and scale (1.05→1.0)
  const incomingImage: RenderableComponentData = {
    id: 'glow-incoming',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: incomingImageUrl,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 10,
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: 'glow-in-opacity',
        componentId: 'generic',
        data: {
          type: customEasing as any,
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['glow-incoming'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'glow-in-blur',
        componentId: 'generic',
        data: {
          type: customEasing as any,
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['glow-incoming'],
          ranges: [
            { key: 'filter', val: 'blur(6px)', prog: 0 },
            { key: 'filter', val: 'blur(2px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      {
        id: 'glow-in-scale',
        componentId: 'generic',
        data: {
          type: customEasing as any,
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['glow-incoming'],
          ranges: [
            { key: 'scale', val: 1.05, prog: 0 },
            { key: 'scale', val: 1.02, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // White overlay layer: fades in to 20% opacity at midpoint, then fades out
  const whiteOverlay: RenderableComponentData = {
    id: 'white-glow-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: white;"></div>',
      className: 'absolute inset-0',
      style: {
        zIndex: 15,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: 'white-glow-fade',
        componentId: 'generic',
        data: {
          type: customEasing as any,
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['white-glow-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.2, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'screen-glow-dissolve-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
      },
    },
    childrenData: [incomingImage, whiteOverlay, outgoingImage],
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
  id: 'screen-glow-dissolve-transition',
  title: 'Screen Glow Dissolve Transition',
  description:
    'Ethereal dreamy transition with screen blend mode, creating overexposed glowing intersection. Features dual-blur dissolve, gentle scale emergence, and white overlay pulse for heavenly aesthetics. Perfect for lifestyle/beauty YouTube content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glow',
    'dissolve',
    'screen-blend',
    'blur',
    'scale',
    'ethereal',
    'dreamy',
    'lifestyle',
    'beauty',
    'youtube',
  ],
  defaultInputParams: {
    outgoingImageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    incomingImageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e',
    overlapDuration: 2.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const screenGlowDissolveTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
