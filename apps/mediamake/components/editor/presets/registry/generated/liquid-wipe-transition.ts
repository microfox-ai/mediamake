/**
 * Liquid Wipe Transition Preset
 *
 * Creates an organic liquid wipe transition where colored divs flow across the screen
 * like spilled paint or water. Features blob-like shapes with morphing edges that create
 * a fluid, artistic transition effect.
 *
 * Features:
 * - Organic blob-like shapes using CSS border-radius variations
 * - Multiple overlapping divs with staggered animations for flowing effect
 * - CSS filters (blur, contrast) to create liquid edge effects
 * - Smooth spring easing for natural fluid motion
 * - Customizable liquid color
 * - Two-image transition with wipe reveal effect
 *
 * Use cases:
 * - Artistic transitions between images or videos
 * - Creative scene changes with organic feel
 * - Paint/water splash transition effects
 * - Smooth reveals with natural motion
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  backgroundImage: z.object({
    src: z.string().describe('Source URL of the background image'),
  }).describe('Background image that is revealed first'),
  foregroundImage: z.object({
    src: z.string().describe('Source URL of the foreground image'),
  }).describe('Foreground image that is revealed by the liquid wipe'),
  liquidColor: z
    .string()
    .default('#FF6B6B')
    .optional()
    .describe('Color of the liquid wipe effect (hex color)'),
  transitionDuration: z
    .number()
    .default(2.5)
    .optional()
    .describe('Duration of the wipe transition in seconds'),
  trackName: z
    .string()
    .default('liquid-wipe')
    .optional()
    .describe('Name for the transition track (used for IDs)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    backgroundImage,
    foregroundImage,
    liquidColor,
    transitionDuration,
    trackName,
  } = params;

  const duration = transitionDuration ?? 2.5;
  const color = liquidColor ?? '#FF6B6B';
  const trackId = trackName ?? 'liquid-wipe';

  // Create blob shapes with varying sizes and border-radius values
  const blob1: RenderableComponentData = {
    id: `${trackId}-blob-1`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute w-full h-32',
      style: {
        top: '10%',
        left: '0',
        backgroundColor: color,
        borderRadius: '50% 40% 60% 50%',
        opacity: 0.9,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const blob2: RenderableComponentData = {
    id: `${trackId}-blob-2`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute w-full h-40',
      style: {
        top: '35%',
        left: '0',
        backgroundColor: color,
        borderRadius: '60% 50% 40% 50%',
        opacity: 0.85,
      },
    },
    context: {
      timing: {
        start: 0.1, // Slight delay for staggered effect
        duration: duration,
      },
    },
  };

  const blob3: RenderableComponentData = {
    id: `${trackId}-blob-3`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute w-full h-36',
      style: {
        top: '60%',
        left: '0',
        backgroundColor: color,
        borderRadius: '40% 60% 50% 60%',
        opacity: 0.8,
      },
    },
    context: {
      timing: {
        start: 0.2, // More stagger
        duration: duration,
      },
    },
  };

  const blob4: RenderableComponentData = {
    id: `${trackId}-blob-4`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute w-full h-28',
      style: {
        top: '85%',
        left: '0',
        backgroundColor: color,
        borderRadius: '50% 50% 60% 40%',
        opacity: 0.75,
      },
    },
    context: {
      timing: {
        start: 0.3, // Even more stagger
        duration: duration,
      },
    },
  };

  // Wipe container with filter effects for liquid edge
  const wipeContainer: RenderableComponentData = {
    id: `${trackId}-wipe-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-y-0 w-full',
        style: {
          backgroundColor: color,
          filter: 'blur(8px) contrast(20)',
          mixBlendMode: 'normal',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: `${trackId}-wipe-animation`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [`${trackId}-wipe-container`],
          ranges: [
            { key: 'translateX', val: '-100%', prog: 0 },
            { key: 'translateX', val: '100%', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [blob1, blob2, blob3, blob4],
  };

  // Background image (visible throughout)
  const backgroundImageNode: RenderableComponentData = {
    id: `${trackId}-background-image`,
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: backgroundImage.src,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Foreground image (revealed progressively)
  const foregroundImageNode: RenderableComponentData = {
    id: `${trackId}-foreground-image`,
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: foregroundImage.src,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: `${trackId}-foreground-reveal`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [`${trackId}-foreground-image`],
          ranges: [
            { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
            { key: 'clipPath', val: 'inset(0 0 0 0)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [backgroundImageNode, wipeContainer, foregroundImageNode],
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
  id: 'liquid-wipe-transition',
  title: 'Liquid Wipe Transition',
  description:
    'An organic liquid wipe transition where colored divs flow across the screen like spilled paint or water, featuring blob-like shapes with morphing edges that create a fluid, artistic transition effect',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'wipe', 'liquid', 'organic', 'artistic', 'fluid'],
  defaultInputParams: {
    backgroundImage: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    },
    foregroundImage: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    },
    liquidColor: '#FF6B6B',
    transitionDuration: 2.5,
    trackName: 'liquid-wipe',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const liquidWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
