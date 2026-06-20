/**
 * Magazine Page Peel Transition Preset
 *
 * Creates a premium magazine-style page peel transition where the corner of the current
 * image/scene peels up progressively to reveal the next content underneath. The peel starts
 * from the top-right corner with a satisfying curl effect, casting realistic shadows and
 * displaying paper-like highlights. As the peel progresses, it reveals more of the underlying
 * content in a triangular reveal pattern.
 *
 * Features:
 * - **3D Curl Effect**: Realistic page curl with rotateY/rotateX transforms and perspective
 * - **Triangular Reveal**: Progressive clip-path animation revealing next content
 * - **Paper-like Highlights**: Gradient overlay on curl with subtle highlights/shadows
 * - **Realistic Shadows**: Drop-shadow filter for depth and dimension
 * - **Shadow Overlay**: Dynamic shadow gradient that appears during peel
 * - **Optional Audio**: Paper crinkle sound effect synchronized with animation
 * - **Smooth Animation**: Cubic-bezier easing for premium, deliberate feel
 *
 * Use cases:
 * - High-end editorial presentations
 * - Portfolio showcases
 * - Magazine-style image transitions
 * - Premium video transitions
 * - Storybook page turns
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  currentImageSrc: z
    .string()
    .describe('Source URL of the current image (top layer that peels away)'),
  nextImageSrc: z
    .string()
    .describe('Source URL of the next image (bottom layer revealed by peel)'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the page peel transition in seconds'),
  peelCorner: z
    .enum(['top-right', 'bottom-right'])
    .default('top-right')
    .describe('Corner from which the page peel starts'),
  paperSoundSrc: z
    .string()
    .optional()
    .describe(
      'Optional source URL of paper crinkle sound effect (synchronized with peel timing)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    currentImageSrc,
    nextImageSrc,
    transitionDuration,
    peelCorner,
    paperSoundSrc,
  } = params;

  const isTopRight = peelCorner === 'top-right';

  // Calculate animation keyframes based on corner position
  const getClipPathKeyframes = () => {
    if (isTopRight) {
      return [
        { val: 'polygon(100% 0, 100% 100%, 0 100%, 0 0)', prog: 0 },
        { val: 'polygon(70% 0, 100% 30%, 100% 100%, 0 100%, 0 0)', prog: 0.3 },
        { val: 'polygon(40% 0, 100% 60%, 100% 100%, 0 100%, 0 0)', prog: 0.6 },
        { val: 'polygon(0% 0, 100% 100%, 100% 100%, 0 100%, 0 0)', prog: 1 },
      ];
    } else {
      // bottom-right
      return [
        { val: 'polygon(100% 0, 100% 100%, 0 100%, 0 0)', prog: 0 },
        {
          val: 'polygon(100% 0, 100% 30%, 70% 100%, 0 100%, 0 0)',
          prog: 0.3,
        },
        {
          val: 'polygon(100% 0, 100% 60%, 40% 100%, 0 100%, 0 0)',
          prog: 0.6,
        },
        { val: 'polygon(100% 0, 100% 100%, 0% 100%, 0 100%, 0 0)', prog: 1 },
      ];
    }
  };

  const getCurlClipPathKeyframes = () => {
    if (isTopRight) {
      return [
        { val: 'polygon(100% 0, 100% 0, 100% 0)', prog: 0 },
        { val: 'polygon(70% 0, 100% 30%, 100% 0)', prog: 0.3 },
        { val: 'polygon(40% 0, 100% 60%, 100% 0)', prog: 0.6 },
        { val: 'polygon(0% 0, 100% 100%, 100% 0)', prog: 1 },
      ];
    } else {
      // bottom-right
      return [
        { val: 'polygon(100% 100%, 100% 100%, 100% 100%)', prog: 0 },
        { val: 'polygon(100% 100%, 100% 70%, 70% 100%)', prog: 0.3 },
        { val: 'polygon(100% 100%, 100% 40%, 40% 100%)', prog: 0.6 },
        { val: 'polygon(100% 100%, 100% 0%, 0% 100%)', prog: 1 },
      ];
    }
  };

  const curlPositionStyle = isTopRight
    ? { top: '0', right: '0' }
    : { bottom: '0', right: '0' };

  const shadowGradient = isTopRight
    ? 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.3) 100%)'
    : 'linear-gradient(45deg, transparent 50%, rgba(0,0,0,0.3) 100%)';

  // Next content layer (bottom layer revealed by peel)
  const nextContentLayer: RenderableComponentData = {
    id: 'next-content-layer',
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
        duration: transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'next-content-image',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: nextImageSrc,
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Current content layer (top layer with clip-path animation)
  const currentContentLayer: RenderableComponentData = {
    id: 'current-content-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 2,
          clipPath: 'polygon(100% 0, 100% 100%, 0 100%, 0 0)',
          transformOrigin: isTopRight ? 'top right' : 'bottom right',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'peel-clip-path-effect',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['current-content-layer'],
          ranges: getClipPathKeyframes().map(({ val, prog }) => ({
            key: 'clipPath',
            val,
            prog,
          })),
        },
      },
    ],
    childrenData: [
      {
        id: 'current-content-image',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: currentImageSrc,
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Peel curl element (3D curl with gradient highlights)
  const peelCurlElement: RenderableComponentData = {
    id: 'peel-curl-element',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          zIndex: 3,
          ...curlPositionStyle,
          width: '40%',
          height: '40%',
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,240,240,0.8) 30%, rgba(200,200,200,0.6) 70%, rgba(180,180,180,0.4) 100%)',
          transformOrigin: isTopRight ? 'top right' : 'bottom right',
          filter: 'drop-shadow(-8px 8px 12px rgba(0,0,0,0.4))',
          opacity: 0,
          clipPath: isTopRight
            ? 'polygon(100% 0, 100% 0, 100% 0)'
            : 'polygon(100% 100%, 100% 100%, 100% 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'curl-reveal-effect',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['peel-curl-element'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.1 },
            { key: 'opacity', val: 1, prog: 0.9 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'curl-transform-effect',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['peel-curl-element'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -45, prog: 0.5 },
            { key: 'rotateY', val: -90, prog: 1 },
          ],
        },
      },
      {
        id: 'curl-scale-effect',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['peel-curl-element'],
          ranges: [
            { key: 'scale', val: 0.1, prog: 0 },
            { key: 'scale', val: 0.8, prog: 0.5 },
            { key: 'scale', val: 1.2, prog: 1 },
          ],
        },
      },
      {
        id: 'curl-clip-effect',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['peel-curl-element'],
          ranges: getCurlClipPathKeyframes().map(({ val, prog }) => ({
            key: 'clipPath',
            val,
            prog,
          })),
        },
      },
    ],
    childrenData: [],
  };

  // Peel shadow overlay (dynamic shadow gradient)
  const peelShadowOverlay: RenderableComponentData = {
    id: 'peel-shadow-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 4,
          background: shadowGradient,
          opacity: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'shadow-fade-effect',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['peel-shadow-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Optional paper sound effect
  const paperSound: RenderableComponentData | null = paperSoundSrc
    ? ({
        id: 'paper-sound',
        type: 'atom',
        componentId: 'AudioAtom',
        data: {
          src: paperSoundSrc,
          volume: 0.5,
          startFrom: 0,
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData)
    : null;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'magazine-page-peel-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '1500px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      nextContentLayer,
      currentContentLayer,
      peelCurlElement,
      peelShadowOverlay,
      ...(paperSound ? [paperSound] : []),
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
  id: 'magazine-page-peel-transition',
  title: 'Magazine Page Peel Transition',
  description:
    'A premium magazine-style page peel transition where the corner of the current image/scene peels up progressively to reveal the next content underneath. Features a 3D curl effect with realistic shadows, paper-like highlights, and optional paper crinkle sound. The peel starts from the top-right or bottom-right corner with a satisfying curl animation, revealing content in a triangular pattern. Perfect for high-end editorial presentations, portfolio showcases, and premium video transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'page-peel',
    'magazine',
    'editorial',
    '3d',
    'curl',
    'premium',
  ],
  defaultInputParams: {
    currentImageSrc: 'https://picsum.photos/seed/current/1920/1080',
    nextImageSrc: 'https://picsum.photos/seed/next/1920/1080',
    transitionDuration: 1.5,
    peelCorner: 'top-right',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const magazinePagePeelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
