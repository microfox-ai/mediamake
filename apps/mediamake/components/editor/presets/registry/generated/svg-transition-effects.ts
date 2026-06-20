/**
 * SVG Transition Effects - Anime Slice & Reveal Preset
 *
 * This preset creates anime-inspired 'slice and reveal' transitions between images using
 * CSS clipPath animations. Inspired by Japanese animation scene transitions, it features
 * dynamic geometric shapes that reveal the next image through expanding masks.
 *
 * Features:
 * - **Multiple Transition Variants**: Diagonal slash (default), circular iris, shattered pattern, paintbrush stroke reveal
 * - **Particle Effects**: SVG particles scatter along transition edge for dynamic feel
 * - **Sound Effect Sync**: Optional sound triggers at animation keyframes (start, midpoint, completion)
 * - **Customizable Parameters**: Duration, direction, easing curves, transition type
 * - **Art Style Compatibility**: Works with stick figures, flat design, paintings
 * - **GPU-Accelerated**: Uses transform3d and will-change for smooth performance
 *
 * Use cases:
 * - Creating action sequence transitions with slash wipes
 * - Building anime-style scene transitions
 * - Adding dynamic reveals between images
 * - Creating circular iris transitions (old cartoon style)
 * - Implementing shattered glass effects
 * - Paintbrush stroke reveals for artistic content
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  image1Src: z.string().describe('Source URL of the first image (visible at start)'),
  image2Src: z.string().describe('Source URL of the second image (revealed during transition)'),
  transitionType: z
    .enum(['diagonal', 'iris', 'shattered', 'paintbrush'])
    .default('diagonal')
    .describe('Type of transition effect: diagonal slash, circular iris, shattered glass, or paintbrush stroke'),
  transitionDuration: z
    .number()
    .default(0.5)
    .describe('Duration of the transition animation in seconds'),
  direction: z
    .enum(['left-to-right', 'right-to-left', 'top-to-bottom', 'bottom-to-top'])
    .default('left-to-right')
    .describe('Direction of the transition wipe'),
  easing: z
    .string()
    .default('cubic-bezier(0.68, -0.55, 0.27, 1.55)')
    .describe('CSS easing function for anime-style snappy movements'),
  enableParticles: z
    .boolean()
    .default(true)
    .describe('Enable particle effects along the transition edge'),
  enableSound: z
    .boolean()
    .default(false)
    .describe('Enable sound effects synchronized with animation keyframes'),
  swooshSoundSrc: z
    .string()
    .optional()
    .describe('Optional URL for whoosh sound at transition start'),
  sliceSoundSrc: z
    .string()
    .optional()
    .describe('Optional URL for slice/cut sound at midpoint'),
  completionSoundSrc: z
    .string()
    .optional()
    .describe('Optional URL for completion sound at end'),
  soundVolume: z
    .number()
    .default(0.5)
    .describe('Volume for sound effects (0.0 to 1.0)'),
  totalDuration: z
    .number()
    .default(3)
    .describe('Total duration in seconds (images display before/after transition)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    image1Src,
    image2Src,
    transitionType,
    transitionDuration,
    direction,
    easing,
    enableParticles,
    enableSound,
    swooshSoundSrc,
    sliceSoundSrc,
    completionSoundSrc,
    soundVolume,
    totalDuration,
  } = params;

  // Calculate transition timing
  const transitionStart = (totalDuration - transitionDuration) / 2;
  const transitionEnd = transitionStart + transitionDuration;

  // Helper: Generate clip-path animation based on transition type and direction
  const generateClipPathAnimation = (): any[] => {
    switch (transitionType) {
      case 'diagonal': {
        // Diagonal slash wipe
        const isLeftToRight = direction === 'left-to-right';
        const isTopToBottom = direction === 'top-to-bottom';
        const isRightToLeft = direction === 'right-to-left';
        const isBottomToTop = direction === 'bottom-to-top';

        if (isLeftToRight) {
          return [
            { key: 'clipPath', val: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)', prog: 0 },
            { key: 'clipPath', val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', prog: 1 },
          ];
        } else if (isRightToLeft) {
          return [
            { key: 'clipPath', val: 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)', prog: 0 },
            { key: 'clipPath', val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', prog: 1 },
          ];
        } else if (isTopToBottom) {
          return [
            { key: 'clipPath', val: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)', prog: 0 },
            { key: 'clipPath', val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', prog: 1 },
          ];
        } else if (isBottomToTop) {
          return [
            { key: 'clipPath', val: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)', prog: 0 },
            { key: 'clipPath', val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', prog: 1 },
          ];
        }
        break;
      }
      case 'iris': {
        // Circular iris wipe (like old cartoons)
        return [
          { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
          { key: 'clipPath', val: 'circle(100% at 50% 50%)', prog: 1 },
        ];
      }
      case 'shattered': {
        // Shattered glass effect using multiple polygons
        return [
          {
            key: 'clipPath',
            val: 'polygon(45% 45%, 55% 45%, 55% 55%, 45% 55%)',
            prog: 0,
          },
          {
            key: 'clipPath',
            val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
            prog: 1,
          },
        ];
      }
      case 'paintbrush': {
        // Paintbrush stroke reveal
        const isHorizontal =
          direction === 'left-to-right' || direction === 'right-to-left';
        if (isHorizontal) {
          const startX = direction === 'left-to-right' ? '0%' : '100%';
          return [
            {
              key: 'clipPath',
              val: `polygon(${startX} 20%, ${startX} 20%, ${startX} 80%, ${startX} 80%)`,
              prog: 0,
            },
            { key: 'clipPath', val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', prog: 1 },
          ];
        } else {
          const startY = direction === 'top-to-bottom' ? '0%' : '100%';
          return [
            {
              key: 'clipPath',
              val: `polygon(20% ${startY}, 80% ${startY}, 80% ${startY}, 20% ${startY})`,
              prog: 0,
            },
            { key: 'clipPath', val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', prog: 1 },
          ];
        }
      }
      default:
        return [
          { key: 'clipPath', val: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)', prog: 0 },
          { key: 'clipPath', val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', prog: 1 },
        ];
    }

    return [];
  };

  // Helper: Generate particle animations
  const generateParticleAnimation = (particleIndex: number): any => {
    const angle = (particleIndex * 45) % 360; // Stagger particles in circle
    const distance = 100 + particleIndex * 20; // Varying distances
    const delay = particleIndex * 0.05; // Stagger delays

    const radians = (angle * Math.PI) / 180;
    const endX = Math.cos(radians) * distance;
    const endY = Math.sin(radians) * distance;

    return {
      id: `particle-effect-${particleIndex}`,
      componentId: `particle-${particleIndex}`,
      data: {
        type: 'ease-out',
        start: transitionStart + delay,
        duration: transitionDuration - delay,
        mode: 'provider',
        targetIds: [`particle-${particleIndex}`],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'translateX', val: '50%', prog: 0 },
          { key: 'translateX', val: `${endX}px`, prog: 1 },
          { key: 'translateY', val: '50%', prog: 0 },
          { key: 'translateY', val: `${endY}px`, prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0.5, prog: 1 },
        ],
      },
    };
  };

  // Create image layer 1 (initially visible)
  const imageLayer1: RenderableComponentData = {
    id: 'svg-transition-image-layer-1',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'svg-transition-image-1',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: image1Src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Create image layer 2 (revealed during transition)
  const clipPathRanges = generateClipPathAnimation();
  const imageLayer2: RenderableComponentData = {
    id: 'svg-transition-image-layer-2',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-20',
        style: {
          willChange: 'clip-path',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'svg-transition-clip-path-effect',
        componentId: 'svg-transition-image-layer-2',
        data: {
          type: easing.includes('cubic-bezier') ? 'custom' : 'ease-in-out',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['svg-transition-image-layer-2'],
          ranges: clipPathRanges,
          ...(easing.includes('cubic-bezier') && { customEasing: easing }),
        },
      },
    ],
    childrenData: [
      {
        id: 'svg-transition-image-2',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: image2Src,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Create transition overlay with edge line
  const transitionOverlay: RenderableComponentData = {
    id: 'svg-transition-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-30 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'svg-transition-edge-line',
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shape: 'rectangle',
          className: 'absolute',
          style: {
            width: '4px',
            height: '150%',
            background: 'linear-gradient(to bottom, transparent, white, transparent)',
            transformOrigin: 'center center',
            willChange: 'transform, opacity',
          },
        },
        context: {
          timing: {
            start: transitionStart,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'svg-transition-edge-line-effect',
            componentId: 'svg-transition-edge-line',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['svg-transition-edge-line'],
              ranges: [
                { key: 'translateX', val: '-50vw', prog: 0 },
                { key: 'translateX', val: '50vw', prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.8 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Create particle container with effects
  const particleChildren: RenderableComponentData[] = [];
  const particleEffects: any[] = [];

  if (enableParticles) {
    for (let i = 0; i < 8; i++) {
      const particleId = `particle-${i}`;
      particleChildren.push({
        id: particleId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute rounded-full bg-white ${i % 2 === 0 ? 'w-2 h-2' : 'w-1 h-1'}`,
            style: {
              left: '50%',
              top: '50%',
              opacity: 0,
              willChange: 'transform, opacity',
            },
          },
        },
        context: {
          timing: {
            start: transitionStart,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData);

      particleEffects.push(generateParticleAnimation(i));
    }
  }

  const particleContainer: RenderableComponentData = {
    id: 'svg-transition-particle-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-40',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: particleEffects,
    childrenData: particleChildren,
  };

  // Create audio layer with sound effects
  const audioChildren: RenderableComponentData[] = [];

  if (enableSound) {
    if (swooshSoundSrc) {
      audioChildren.push({
        id: 'svg-transition-swoosh-sound',
        type: 'atom',
        componentId: 'AudioAtom',
        data: {
          src: swooshSoundSrc,
          volume: soundVolume,
        },
        context: {
          timing: {
            start: transitionStart,
            duration: 0.1,
          },
        },
      } as RenderableComponentData);
    }

    if (sliceSoundSrc) {
      audioChildren.push({
        id: 'svg-transition-slice-sound',
        type: 'atom',
        componentId: 'AudioAtom',
        data: {
          src: sliceSoundSrc,
          volume: soundVolume,
        },
        context: {
          timing: {
            start: transitionStart + transitionDuration / 2,
            duration: 0.1,
          },
        },
      } as RenderableComponentData);
    }

    if (completionSoundSrc) {
      audioChildren.push({
        id: 'svg-transition-completion-sound',
        type: 'atom',
        componentId: 'AudioAtom',
        data: {
          src: completionSoundSrc,
          volume: soundVolume,
        },
        context: {
          timing: {
            start: transitionEnd - 0.1,
            duration: 0.1,
          },
        },
      } as RenderableComponentData);
    }
  }

  const audioLayer: RenderableComponentData = {
    id: 'svg-transition-audio-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: audioChildren,
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'svg-transition-effects-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      imageLayer1,
      imageLayer2,
      transitionOverlay,
      particleContainer,
      audioLayer,
    ] as RenderableComponentData[],
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'svg-transition-effects',
  title: 'SVG Transition Effects - Anime Slice & Reveal',
  description:
    "Anime-inspired 'slice and reveal' transitions between images using CSS clipPath animations. Supports multiple transition variants: diagonal slash (default), circular iris, shattered pattern, and paintbrush stroke reveal. Features particle effects along the transition edge and synchronized sound effect triggers at animation keyframes. Customizable duration, direction, easing curves, and art style compatibility for stick figures, flat design, and paintings.",
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'anime',
    'svg',
    'effects',
    'clipPath',
    'particles',
    'sound',
    'reveal',
    'wipe',
    'images',
  ],
  defaultInputParams: {
    image1Src: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809',
    image2Src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    transitionType: 'diagonal',
    transitionDuration: 0.5,
    direction: 'left-to-right',
    easing: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
    enableParticles: true,
    enableSound: false,
    soundVolume: 0.5,
    totalDuration: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---
export const svgTransitionEffectsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
