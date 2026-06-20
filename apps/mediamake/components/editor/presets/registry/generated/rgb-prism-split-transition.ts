/**
 * RGB Prism Split Transition Preset
 *
 * This preset creates a cinematic RGB prism split transition effect where light appears to
 * refract through a prism during the image change. The outgoing image splits into RGB components
 * that fan outward diagonally (red upper-left, blue lower-right, green center), while the
 * incoming image's components converge from opposite directions. The effect suggests light
 * passing through crystal, with soft rainbow gradients at edges where colors overlap.
 *
 * Features:
 * - **RGB Splitting**: Outgoing image splits into red, green, blue color channels
 * - **Prismatic Movement**: RGB components fan diagonally with independent motion paths
 * - **Convergence Effect**: Incoming RGB components converge from opposite directions
 * - **Lens Flare Pulse**: Subtle lens flare pulse at transition midpoint
 * - **Soft Rainbow Gradients**: Color overlap creates natural rainbow effect
 * - **Screen Blend Mode**: RGB components blend additively for realistic prism effect
 * - **Smooth Cubic Easing**: Elegant easeInOutCubic motion for all animations
 *
 * Use cases:
 * - Creative/artistic YouTube channel transitions
 * - Music video visual effects
 * - Fashion/lifestyle content transitions
 * - High-end product reveal transitions
 * - Abstract visual storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  image1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) image'),
    duration: z.number().describe('Duration of first image in seconds'),
  }),
  image2: z.object({
    src: z.string().describe('Source URL of the second (incoming) image'),
    duration: z.number().describe('Duration of second image in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(0.7)
    .describe('Duration of transition overlap in seconds (default: 0.7s)'),
  prismIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for RGB split distance (0.5-2)'),
  lensFlareIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Opacity of lens flare pulse at midpoint (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image1, image2, overlapDuration, prismIntensity, lensFlareIntensity } = params;

  // Calculate container duration
  const baseLayoutDuration = image1.duration + image2.duration - overlapDuration;

  // Calculate RGB split distances
  const splitDistance = 20 * prismIntensity;

  // Transition start and midpoint timing
  const transitionStart = image1.duration - overlapDuration;
  const transitionMidpoint = transitionStart + overlapDuration / 2;

  // Color channel isolation filters
  // Red channel: hue-rotate to red tones
  const redFilter = 'sepia(1) saturate(10) hue-rotate(-60deg)';
  // Green channel: hue-rotate to green tones
  const greenFilter = 'sepia(1) saturate(10) hue-rotate(60deg)';
  // Blue channel: hue-rotate to blue tones
  const blueFilter = 'sepia(1) saturate(10) hue-rotate(180deg)';

  const childrenData: RenderableComponentData[] = [
    // === OUTGOING IMAGE RGB LAYERS ===
    // Red layer - upper-left movement
    {
      id: 'outgoing-image-red',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image1.src,
        className: 'w-full h-full object-cover absolute inset-0',
        style: {
          mixBlendMode: 'screen',
          filter: redFilter,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: image1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-red-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-image-red'],
            ranges: [
              // Opacity fade
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              // Translate upper-left
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -splitDistance, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -splitDistance, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Green layer - center (minimal movement)
    {
      id: 'outgoing-image-green',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image1.src,
        className: 'w-full h-full object-cover absolute inset-0',
        style: {
          mixBlendMode: 'screen',
          filter: greenFilter,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: image1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-green-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-image-green'],
            ranges: [
              // Opacity fade
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              // Minimal movement (stays centered)
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Blue layer - lower-right movement
    {
      id: 'outgoing-image-blue',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image1.src,
        className: 'w-full h-full object-cover absolute inset-0',
        style: {
          mixBlendMode: 'screen',
          filter: blueFilter,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: image1.duration,
        },
      },
      effects: [
        {
          id: 'outgoing-blue-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-image-blue'],
            ranges: [
              // Opacity fade
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              // Translate lower-right
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: splitDistance, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: splitDistance, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // === INCOMING IMAGE RGB LAYERS ===
    // Red layer - converges from lower-right to center
    {
      id: 'incoming-image-red',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image2.src,
        className: 'w-full h-full object-cover absolute inset-0',
        style: {
          mixBlendMode: 'screen',
          filter: redFilter,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: image2.duration + overlapDuration,
        },
      },
      effects: [
        {
          id: 'incoming-red-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-image-red'],
            ranges: [
              // Opacity fade in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
              // Converge from lower-right
              { key: 'translateX', val: splitDistance, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: splitDistance, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Green layer - converges from center (minimal movement)
    {
      id: 'incoming-image-green',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image2.src,
        className: 'w-full h-full object-cover absolute inset-0',
        style: {
          mixBlendMode: 'screen',
          filter: greenFilter,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: image2.duration + overlapDuration,
        },
      },
      effects: [
        {
          id: 'incoming-green-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-image-green'],
            ranges: [
              // Opacity fade in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
              // Minimal movement
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Blue layer - converges from upper-left to center
    {
      id: 'incoming-image-blue',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image2.src,
        className: 'w-full h-full object-cover absolute inset-0',
        style: {
          mixBlendMode: 'screen',
          filter: blueFilter,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: image2.duration + overlapDuration,
        },
      },
      effects: [
        {
          id: 'incoming-blue-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-image-blue'],
            ranges: [
              // Opacity fade in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
              // Converge from upper-left
              { key: 'translateX', val: -splitDistance, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: -splitDistance, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // === LENS FLARE PULSE ===
    {
      id: 'lens-flare',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,200,255,0.4) 30%, transparent 70%); filter: blur(40px);"></div>`,
        className: 'absolute',
        style: {
          top: '50%',
          left: '50%',
          width: '300px',
          height: '300px',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: transitionMidpoint - 0.1, // Start slightly before midpoint
          duration: 0.2, // 0.2s pulse
        },
      },
      effects: [
        {
          id: 'lens-flare-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 0.2,
            mode: 'provider',
            targetIds: ['lens-flare'],
            ranges: [
              // Scale pulse
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 1.5, prog: 0.5 },
              { key: 'scale', val: 0.5, prog: 1 },
              // Opacity pulse
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: lensFlareIntensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'rgb-prism-split-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000', // Black background for prism effect
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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
  id: 'rgb-prism-split-transition',
  title: 'RGB Prism Split Transition',
  description:
    'Cinematic RGB prism split transition where light refracts through a prism during image change. Outgoing image splits into RGB components that fan diagonally, while incoming components converge from opposite directions. Features lens flare pulse and soft rainbow gradients.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'rgb',
    'prism',
    'split',
    'cinematic',
    'artistic',
    'creative',
    'visual-effects',
    'light-refraction',
    'lens-flare',
  ],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    overlapDuration: 0.7,
    prismIntensity: 1,
    lensFlareIntensity: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const rgbPrismSplitTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
