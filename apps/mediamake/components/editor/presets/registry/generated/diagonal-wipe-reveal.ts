/**
 * Diagonal Wipe Reveal Preset
 *
 * This preset creates a dynamic diagonal split-screen wipe transition where a colored bar
 * rotates across the frame like a windshield wiper blade or radar sweep. The wipe starts
 * from the top-left corner and sweeps diagonally to the bottom-right, revealing a second
 * image underneath with precise angular motion.
 *
 * Features:
 * - **Rotational Wipe Motion**: Thin bar rotates from -45deg to 135deg around center-left origin
 * - **Synchronized Image Reveal**: Second image clip-path animates in sync with wipe rotation
 * - **Gradient Wipe Bar**: Smooth gradient edges (transparent → solid → transparent) for professional look
 * - **Motion Blur Trail**: Optional secondary trailing bar with reduced opacity for dynamic effect
 * - **Customizable Appearance**: Adjustable wipe color, thickness, and transition duration
 * - **Linear Sweep Speed**: Consistent rotation speed using linear easing for predictable motion
 *
 * Use cases:
 * - Action movie-style scene transitions
 * - Dynamic image reveals with angular motion
 * - Radar/clock-hand style animations
 * - Modern split-screen effects with rotational dynamics
 * - Branded transitions with custom wipe colors
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  firstImageSrc: z
    .string()
    .describe('Source URL of the first (bottom) image to display'),
  secondImageSrc: z
    .string()
    .describe('Source URL of the second (top) image to reveal'),
  wipeColor: z
    .string()
    .default('rgba(255, 255, 255, 0.9)')
    .describe('Color of the wipe bar (CSS color value)'),
  wipeThickness: z
    .string()
    .default('8px')
    .describe('Thickness of the wipe bar (CSS size value, e.g., "8px", "12px")'),
  transitionDuration: z
    .number()
    .default(3)
    .describe('Duration of the wipe transition in seconds'),
  enableMotionBlur: z
    .boolean()
    .default(true)
    .describe('Enable motion blur trail effect behind the wipe bar'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    firstImageSrc,
    secondImageSrc,
    wipeColor,
    wipeThickness,
    transitionDuration,
    enableMotionBlur,
  } = params;

  // Create wipe bar with gradient background
  const wipeBar: RenderableComponentData = {
    id: 'wipe-bar',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute pointer-events-none',
        style: {
          width: '200%',
          height: wipeThickness,
          left: '0',
          top: '50%',
          transformOrigin: 'left center',
          background: `linear-gradient(90deg, transparent 0%, ${wipeColor} 20%, ${wipeColor} 80%, transparent 100%)`,
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [],
  };

  // Create optional motion blur trail
  const wipeBlurTrail: RenderableComponentData = {
    id: 'wipe-blur-trail',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute pointer-events-none',
        style: {
          width: '200%',
          height: wipeThickness,
          left: '0',
          top: '50%',
          transformOrigin: 'left center',
          background: `linear-gradient(90deg, transparent 0%, ${wipeColor} 40%, ${wipeColor} 60%, transparent 100%)`,
          opacity: 0.3,
          filter: 'blur(8px)',
          zIndex: 9,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [],
  };

  // Create rotation effect for wipe bar and blur trail
  const wipeRotationEffect = {
    id: 'wipe-rotation-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: enableMotionBlur
        ? ['wipe-bar', 'wipe-blur-trail']
        : ['wipe-bar'],
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      ranges: [
        { key: 'rotate', val: -45, prog: 0 },
        { key: 'rotate', val: 135, prog: 1 },
      ],
    },
  };

  // Create image reveal effect (clip-path animation)
  const imageRevealEffect = {
    id: 'image-reveal-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: ['second-image'],
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      ranges: [
        { key: 'clipPath', val: 'polygon(0 0, 0 0, 0 100%, 0 100%)', prog: 0 },
        {
          key: 'clipPath',
          val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
          prog: 1,
        },
      ],
    },
  };

  // First (bottom) image
  const firstImage: RenderableComponentData = {
    id: 'first-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: firstImageSrc,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Second (top) image with clip-path reveal
  const secondImage: RenderableComponentData = {
    id: 'second-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: secondImageSrc,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Build children array
  const childrenData: RenderableComponentData[] = [
    firstImage,
    secondImage,
    wipeBar,
  ];

  if (enableMotionBlur) {
    childrenData.push(wipeBlurTrail);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'diagonal-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [wipeRotationEffect, imageRevealEffect],
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
  id: 'diagonal-wipe-reveal',
  title: 'Diagonal Wipe Reveal',
  description:
    'Dynamic diagonal split-screen wipe transition where a rotating colored bar sweeps from top-left to bottom-right, revealing a second image underneath. Features rotational motion like a radar sweep or windshield wiper blade with gradient edges and optional motion blur trail.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'wipe', 'reveal', 'diagonal', 'rotation', 'angular'],
  defaultInputParams: {
    firstImageSrc:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    secondImageSrc:
      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
    wipeColor: 'rgba(255, 255, 255, 0.9)',
    wipeThickness: '8px',
    transitionDuration: 3,
    enableMotionBlur: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const diagonalWipeRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
