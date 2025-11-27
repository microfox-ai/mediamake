/**
 * Motorsport Split-Screen Transition Preset
 *
 * A premium broadcast-quality multi-panel split-screen transition effect inspired by professional
 * motorsport graphics. Features 9 angular panels with carbon-fiber-like fragmented shapes using
 * clip-path polygons. Each panel reveals different racing angles with staggered scale/rotate/translate
 * animations creating complex choreography.
 *
 * Key Features:
 * - 9-panel grid layout with angular clip-path shapes (shattered glass effect)
 * - Staggered entrance animations (scale, rotate, translateZ) with index-based delays
 * - Depth effects via translateZ and box-shadows for floating panel appearance
 * - Subtle parallax movement based on panel grid position
 * - Animated lens flare sweep across panels
 * - Hardware-accelerated transforms (transform3d)
 * - Broadcast-ready quality suitable for high-end racing content
 *
 * Use Cases:
 * - High-end racing video transitions
 * - Professional motorsport broadcast graphics
 * - Multi-angle action reveal sequences
 * - Premium sports content production
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  panelMedia: z.array(
    z.object({
      src: z.string().describe('Source URL for panel media (video or image)'),
      type: z.enum(['video', 'image']).describe('Media type'),
    })
  ).length(9).describe('Array of exactly 9 media sources for the panel grid'),
  
  transitionDuration: z.number()
    .default(2.0)
    .describe('Duration of the full transition animation in seconds'),
  
  staggerDelay: z.number()
    .default(0.05)
    .describe('Delay between each panel animation in seconds (index * staggerDelay)'),
  
  enableLensFlare: z.boolean()
    .default(true)
    .describe('Enable animated lens flare sweep across panels'),
  
  enableParallax: z.boolean()
    .default(true)
    .describe('Enable subtle parallax movement based on panel position'),
  
  rotationRange: z.number()
    .default(15)
    .describe('Maximum rotation angle range for panel entrance (degrees)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    panelMedia,
    transitionDuration,
    staggerDelay,
    enableLensFlare,
    enableParallax,
    rotationRange,
  } = params;

  // Helper: Generate random rotation within range
  const randomRotation = (index: number): number => {
    const seed = index * 123.456; // Deterministic pseudo-random
    const normalized = (Math.sin(seed) + 1) / 2; // 0-1 range
    return (normalized - 0.5) * 2 * rotationRange; // -range to +range
  };

  // Helper: Calculate parallax offset based on grid position
  const getParallaxOffset = (index: number): { x: number; y: number } => {
    if (!enableParallax) return { x: 0, y: 0 };
    
    const col = index % 3;
    const row = Math.floor(index / 3);
    
    // Center panel (index 4) moves fastest, corners move slowest
    const distanceFromCenter = Math.sqrt(
      Math.pow(col - 1, 2) + Math.pow(row - 1, 2)
    );
    const speed = 1 / (1 + distanceFromCenter * 0.5);
    
    // Slight directional offset based on position
    const xOffset = (col - 1) * 5 * speed;
    const yOffset = (row - 1) * 5 * speed;
    
    return { x: xOffset, y: yOffset };
  };

  // Angular clip-path shapes for each panel
  const clipPaths = [
    'polygon(0% 0%, 95% 0%, 100% 100%, 5% 100%)',
    'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)',
    'polygon(0% 5%, 100% 0%, 100% 95%, 0% 100%)',
    'polygon(10% 0%, 100% 5%, 90% 100%, 0% 95%)',
    'polygon(5% 5%, 95% 0%, 100% 95%, 0% 100%)',
    'polygon(0% 0%, 90% 10%, 100% 100%, 10% 90%)',
    'polygon(5% 0%, 100% 10%, 95% 100%, 0% 90%)',
    'polygon(0% 5%, 95% 0%, 100% 100%, 5% 95%)',
    'polygon(10% 5%, 100% 0%, 90% 95%, 0% 100%)',
  ];

  // Z-depth values for floating effect
  const zDepths = [0, 20, 10, 30, 40, 15, 25, 5, 8];

  // Box shadow depths
  const boxShadows = [
    '0 10px 30px rgba(0,0,0,0.5)',
    '0 15px 40px rgba(0,0,0,0.6)',
    '0 12px 35px rgba(0,0,0,0.55)',
    '0 18px 45px rgba(0,0,0,0.65)',
    '0 20px 50px rgba(0,0,0,0.7)',
    '0 14px 38px rgba(0,0,0,0.58)',
    '0 16px 42px rgba(0,0,0,0.62)',
    '0 11px 32px rgba(0,0,0,0.52)',
    '0 13px 36px rgba(0,0,0,0.56)',
  ];

  // Create panel children
  const panelChildren: RenderableComponentData[] = panelMedia.map((media, index) => {
    const rotation = randomRotation(index);
    const delay = index * staggerDelay;
    const parallax = getParallaxOffset(index);
    const zDepth = zDepths[index];
    const effectDuration = transitionDuration - delay;

    return {
      id: `motorsport-panel-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'overflow-hidden relative',
          style: {
            clipPath: clipPaths[index],
            boxShadow: boxShadows[index],
            transformStyle: 'preserve-3d',
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
          id: `panel-entrance-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: delay,
            duration: effectDuration,
            mode: 'provider',
            targetIds: [`motorsport-panel-${index}`],
            ranges: [
              // Scale from 0 to 1
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              // Rotate from random angle to 0
              { key: 'rotate', val: rotation, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              // TranslateZ for depth
              { key: 'translateZ', val: -100, prog: 0 },
              { key: 'translateZ', val: zDepth, prog: 1 },
              // Parallax movement
              { key: 'translateX', val: parallax.x * 2, prog: 0 },
              { key: 'translateX', val: parallax.x, prog: 1 },
              { key: 'translateY', val: parallax.y * 2, prog: 0 },
              { key: 'translateY', val: parallax.y, prog: 1 },
              // Opacity fade in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: `motorsport-media-${index}`,
          type: 'atom',
          componentId: media.type === 'video' ? 'VideoAtom' : 'ImageAtom',
          data: {
            src: media.src,
            fit: 'cover',
            ...(media.type === 'video' && {
              muted: true,
              loop: true,
              playbackRate: 1,
            }),
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Lens flare overlay
  const lensFlareChildren: RenderableComponentData[] = enableLensFlare
    ? [
        {
          id: 'motorsport-lens-flare',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute pointer-events-none',
              style: {
                width: '300px',
                height: '300px',
                top: '50%',
                left: '-150px',
                marginTop: '-150px',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)',
                opacity: 0.5,
                filter: 'blur(20px)',
                mixBlendMode: 'screen',
                zIndex: 100,
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
              id: 'lens-flare-sweep',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['motorsport-lens-flare'],
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  { key: 'translateX', val: 1920 + 300, prog: 1 }, // Sweep across full width + flare size
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.5, prog: 0.1 },
                  { key: 'opacity', val: 0.5, prog: 0.9 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [],
        } as RenderableComponentData,
      ]
    : [];

  // Panel grid container
  const panelGrid: RenderableComponentData = {
    id: 'motorsport-panel-grid',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-cols-3 grid-rows-3 gap-1',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: panelChildren,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'motorsport-split-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
        style: {
          perspective: '1000px',
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
    childrenData: [panelGrid, ...lensFlareChildren],
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
  id: 'motorsport-split-transition',
  title: 'Motorsport Split-Screen Transition',
  description:
    'A premium broadcast-quality multi-panel split-screen transition effect inspired by professional motorsport graphics. Features 9 angular panels with carbon-fiber-like fragmented shapes using clip-path polygons. Each panel reveals different racing angles with staggered scale/rotate/translate animations creating complex choreography. Includes depth effects via translateZ and box-shadows for floating panel appearance, subtle parallax based on grid position, and an animated lens flare sweep across panels. Designed for high-end racing content production with hardware-accelerated transforms.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'motorsport',
    'split-screen',
    'multi-panel',
    'racing',
    'broadcast',
    'premium',
    'angular',
    'shattered',
    'lens-flare',
    'parallax',
    'depth',
  ],
  defaultInputParams: {
    panelMedia: [
      { src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', type: 'video' as const },
      { src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', type: 'video' as const },
      { src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', type: 'video' as const },
      { src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', type: 'video' as const },
      { src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', type: 'video' as const },
      { src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', type: 'video' as const },
      { src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', type: 'video' as const },
      { src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', type: 'video' as const },
      { src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4', type: 'video' as const },
    ],
    transitionDuration: 2.0,
    staggerDelay: 0.05,
    enableLensFlare: true,
    enableParallax: true,
    rotationRange: 15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const motorsportSplitTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
