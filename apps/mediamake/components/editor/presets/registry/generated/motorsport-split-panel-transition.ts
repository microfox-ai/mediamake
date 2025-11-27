/**
 * Motorsport Multi-Panel Split Screen Transition Preset
 *
 * Creates a professional broadcast-quality split-screen transition effect with 9 angular panels
 * that animate in with staggered timing, depth effects, parallax movement, and lens flare sweeps.
 * Each panel features angular clip-paths (carbon fiber/shattered glass aesthetic), box shadows for
 * depth perception, and coordinated entrance/exit animations. Perfect for high-end racing content.
 *
 * Features:
 * - 9-panel grid layout with angular geometric shapes
 * - Staggered panel entrance animations (scale, rotate, translateZ)
 * - Depth effects with floating shadows at different Z-levels
 * - Lens flare sweep across the composition
 * - Parallax movement based on panel position
 * - Hardware-accelerated 3D transforms
 * - Broadcast-ready premium aesthetic
 *
 * Use cases:
 * - Racing broadcast transitions between camera angles
 * - High-energy motorsport content production
 * - Premium sports video editing
 * - Dynamic multi-angle reveal sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  mediaSources: z
    .array(
      z.object({
        src: z.string().describe('Media source URL'),
        type: z
          .enum(['video', 'image'])
          .default('video')
          .describe('Type of media'),
      }),
    )
    .length(9)
    .describe(
      'Array of 9 media sources (videos or images) for each panel - one per grid cell',
    ),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe(
      'Duration of the main transition effect in seconds (panel entrance)',
    ),
  staggerDelay: z
    .number()
    .min(0.02)
    .max(0.15)
    .default(0.05)
    .describe('Delay between each panel animation in seconds'),
  panelDepth: z
    .number()
    .min(10)
    .max(100)
    .default(50)
    .describe('Depth of translateZ effect for panels (in pixels)'),
  lensFlareEnabled: z
    .boolean()
    .default(true)
    .describe('Enable lens flare sweep effect'),
  lensFlareDuration: z
    .number()
    .min(0.8)
    .max(2.5)
    .default(1.2)
    .describe('Duration of lens flare sweep in seconds'),
  parallaxIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for parallax movement (0 = none)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    mediaSources,
    transitionDuration,
    staggerDelay,
    panelDepth,
    lensFlareEnabled,
    lensFlareDuration,
    parallaxIntensity,
  } = params;

  // Helper: Generate random rotation angle
  const getRandomRotation = (index: number): number => {
    const seed = index * 123.456;
    const random = (Math.sin(seed) * 10000) % 1;
    return -15 + random * 30; // Range: -15 to 15 degrees
  };

  // Helper: Calculate parallax offset based on grid position
  const getParallaxOffset = (index: number): number => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    // Center panel (index 4) moves least, corners move most
    const distanceFromCenter = Math.sqrt(
      Math.pow(col - 1, 2) + Math.pow(row - 1, 2),
    );
    return distanceFromCenter * 10 * parallaxIntensity;
  };

  // Angular clip-path definitions for each panel
  const clipPaths = [
    'polygon(0% 0%, 95% 0%, 100% 100%, 5% 100%)', // Panel 0
    'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)', // Panel 1
    'polygon(0% 0%, 100% 5%, 95% 100%, 5% 95%)', // Panel 2
    'polygon(5% 5%, 100% 0%, 100% 95%, 0% 100%)', // Panel 3
    'polygon(3% 0%, 97% 3%, 100% 97%, 0% 100%)', // Panel 4 (center, emphasized)
    'polygon(0% 5%, 95% 0%, 100% 100%, 5% 95%)', // Panel 5
    'polygon(5% 0%, 100% 5%, 95% 100%, 0% 95%)', // Panel 6
    'polygon(0% 0%, 97% 5%, 100% 100%, 3% 97%)', // Panel 7
    'polygon(5% 3%, 100% 0%, 97% 100%, 0% 97%)', // Panel 8
  ];

  // Shadow depths - center panel has stronger shadow
  const shadowDepths = [
    '0 10px 30px rgba(0,0,0,0.5)',
    '0 10px 30px rgba(0,0,0,0.5)',
    '0 10px 30px rgba(0,0,0,0.5)',
    '0 10px 30px rgba(0,0,0,0.5)',
    '0 15px 40px rgba(0,0,0,0.6)', // Center panel
    '0 10px 30px rgba(0,0,0,0.5)',
    '0 10px 30px rgba(0,0,0,0.5)',
    '0 10px 30px rgba(0,0,0,0.5)',
    '0 10px 30px rgba(0,0,0,0.5)',
  ];

  // Create panel components
  const panelChildren: RenderableComponentData[] = mediaSources.map(
    (media, index) => {
      const panelId = `motorsport-panel-${index}`;
      const mediaId = `${panelId}-media`;
      const delay = index * staggerDelay;
      const rotation = getRandomRotation(index);
      const parallaxOffset = getParallaxOffset(index);

      return {
        id: panelId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'overflow-hidden relative',
            style: {
              clipPath: clipPaths[index],
              boxShadow: shadowDepths[index],
              transformStyle: 'preserve-3d' as const,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration + delay + 1, // Extended to cover full transition
          },
        },
        effects: [
          {
            id: `${panelId}-entrance`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: delay,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [panelId],
              ranges: [
                // Scale from 0 to 1
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
                // Rotate from random angle to 0
                { key: 'rotate', val: rotation, prog: 0 },
                { key: 'rotate', val: 0, prog: 1 },
                // TranslateZ for depth effect
                { key: 'translateZ', val: panelDepth, prog: 0 },
                { key: 'translateZ', val: 0, prog: 1 },
                // Opacity fade in
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
              ],
            },
          },
          // Parallax effect (subtle continuous movement)
          {
            id: `${panelId}-parallax`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: delay + transitionDuration * 0.5,
              duration: transitionDuration * 0.5,
              mode: 'provider',
              targetIds: [panelId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: parallaxOffset, prog: 0.5 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -parallaxOffset * 0.5, prog: 0.5 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: mediaId,
            type: 'atom',
            componentId: media.type === 'video' ? 'VideoAtom' : 'ImageAtom',
            data: {
              src: media.src,
              fit: 'cover',
              className: 'absolute inset-0 w-full h-full',
              ...(media.type === 'video' ? { muted: true, loop: true } : {}),
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration + delay + 1,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Panel grid container
  const panelGrid: RenderableComponentData = {
    id: 'motorsport-panel-grid',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'grid grid-cols-3 grid-rows-3 gap-1 absolute inset-0',
        style: {
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration + panelChildren.length * staggerDelay + 1,
      },
    },
    childrenData: panelChildren,
  };

  // Lens flare overlay
  const lensFlareChildren: RenderableComponentData[] = [];
  if (lensFlareEnabled) {
    const flareElement: RenderableComponentData = {
      id: 'motorsport-lens-flare',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)',
            filter: 'blur(20px)',
            top: '50%',
            marginTop: '-150px',
            pointerEvents: 'none' as const,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: lensFlareDuration,
        },
      },
      effects: [
        {
          id: 'lens-flare-sweep',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: lensFlareDuration,
            mode: 'provider',
            targetIds: ['motorsport-lens-flare'],
            ranges: [
              { key: 'translateX', val: '-150%', prog: 0 },
              { key: 'translateX', val: '250%', prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.3 },
              { key: 'opacity', val: 0.5, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    };

    lensFlareChildren.push(flareElement);
  }

  const lensFlareOverlay: RenderableComponentData = {
    id: 'motorsport-lens-flare-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 100,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: lensFlareEnabled ? lensFlareDuration : 0.1,
      },
    },
    childrenData: lensFlareChildren,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'motorsport-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1200px',
          perspectiveOrigin: 'center center',
          backgroundColor: '#000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          transitionDuration +
          panelChildren.length * staggerDelay +
          (lensFlareEnabled ? lensFlareDuration : 0),
      },
    },
    childrenData: [panelGrid, lensFlareOverlay],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'motorsport-split-panel-transition',
  title: 'Motorsport Multi-Panel Split Screen Transition',
  description:
    'Professional broadcast-quality split-screen transition effect featuring 9 angular panels with carbon fiber/shattered glass aesthetic. Panels slide, rotate, and scale with staggered choreography, depth shadows, parallax movement, and lens flare sweeps. Designed for high-end racing content production with hardware-accelerated 3D transforms.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'motorsport',
    'racing',
    'split-screen',
    'broadcast',
    'premium',
    'multi-panel',
    '3d',
    'depth',
    'parallax',
    'lens-flare',
  ],
  defaultInputParams: {
    mediaSources: [
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        type: 'video',
      },
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        type: 'video',
      },
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        type: 'video',
      },
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        type: 'video',
      },
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
        type: 'video',
      },
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        type: 'video',
      },
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
        type: 'video',
      },
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        type: 'video',
      },
      {
        src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
        type: 'video',
      },
    ],
    transitionDuration: 1.5,
    staggerDelay: 0.05,
    panelDepth: 50,
    lensFlareEnabled: true,
    lensFlareDuration: 1.2,
    parallaxIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const motorsportSplitPanelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
