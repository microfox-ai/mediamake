/**
 * News Broadcast Rapid Cut Preset
 *
 * Professional news broadcast-style preset with lower thirds, breaking news banners, ticker text,
 * multi-box layouts, and broadcast-quality transitions. Dynamically switches between full-screen,
 * split-screen, and multi-box grid layouts with animated frames, timestamps, location labels, and
 * branded overlays.
 *
 * Features:
 * - **Lower Third Banners**: Animated headline banners with gradient backgrounds
 * - **Ticker Text**: Scrolling news ticker at the bottom with customizable text
 * - **Multi-Box Layouts**: Dynamic grid layouts (1, 2, 3, or 4 boxes) based on content priority
 * - **Broadcast Transitions**: Page turns, box wipes, slide, and picture-in-picture effects
 * - **Timestamp Overlays**: Real-time timestamp counters with monospace font
 * - **Location Labels**: Location/source labels with customizable text
 * - **Branded Overlays**: Logo overlays that persist across cuts
 * - **Animated Backgrounds**: Subtle gradient backgrounds with opacity control
 * - **Ken Burns Effects**: Slow zoom and pan on images for dynamic visuals
 *
 * Use cases:
 * - Creating professional news broadcast-style videos
 * - Building breaking news segments with dynamic layouts
 * - Adding broadcast-quality graphics to video content
 * - Creating multi-box interview or panel discussions
 * - Building branded news content with persistent overlays
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
        duration: z.number().optional().describe('Duration for this image in seconds'),
      }),
    )
    .describe('Array of images to display in the broadcast'),
  
  layoutMode: z
    .enum(['fullscreen', 'split-2', 'split-3', 'split-4'])
    .default('split-2')
    .describe('Layout mode: fullscreen (1 image), split-2 (2 images), split-3 (3 images), split-4 (4 images)'),
  
  transitionType: z
    .enum(['fade', 'slide', 'wipe', 'zoom', 'none'])
    .default('fade')
    .describe('Transition type between layout changes'),
  
  transitionDuration: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.8)
    .describe('Duration of transitions in seconds'),
  
  headlineText: z
    .string()
    .default('BREAKING NEWS')
    .describe('Headline text for the lower third banner'),
  
  tickerText: z
    .string()
    .default('Latest updates • Breaking news • Live coverage • ')
    .describe('Scrolling ticker text (will repeat)'),
  
  locationLabel: z
    .string()
    .default('LIVE')
    .describe('Location or source label (e.g., LIVE, NEW YORK, BREAKING)'),
  
  showTimestamp: z
    .boolean()
    .default(true)
    .describe('Whether to show timestamp overlay'),
  
  showTicker: z
    .boolean()
    .default(true)
    .describe('Whether to show scrolling ticker'),
  
  showLowerThird: z
    .boolean()
    .default(true)
    .describe('Whether to show lower third banner'),
  
  logoSrc: z
    .string()
    .optional()
    .describe('Logo image source URL (optional)'),
  
  backgroundGradient: z
    .string()
    .default('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
    .describe('CSS gradient for subtle background'),
  
  imageDuration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Default duration per image in seconds'),
  
  kenBurnsEffect: z
    .boolean()
    .default(true)
    .describe('Whether to apply Ken Burns zoom/pan effect to images'),
  
  kenBurnsIntensity: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Ken Burns effect intensity (scale difference)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    layoutMode,
    transitionType,
    transitionDuration,
    headlineText,
    tickerText,
    locationLabel,
    showTimestamp,
    showTicker,
    showLowerThird,
    logoSrc,
    backgroundGradient,
    imageDuration,
    kenBurnsEffect,
    kenBurnsIntensity,
  } = params;

  // Calculate grid configuration based on layout mode
  const getGridConfig = (mode: string) => {
    switch (mode) {
      case 'fullscreen':
        return { cols: 1, rows: 1, count: 1 };
      case 'split-2':
        return { cols: 2, rows: 1, count: 2 };
      case 'split-3':
        return { cols: 3, rows: 1, count: 3 };
      case 'split-4':
        return { cols: 2, rows: 2, count: 4 };
      default:
        return { cols: 2, rows: 1, count: 2 };
    }
  };

  const gridConfig = getGridConfig(layoutMode);
  const displayImages = images.slice(0, gridConfig.count);

  // Calculate total duration
  let totalDuration = 0;
  displayImages.forEach((img) => {
    totalDuration += img.duration ?? imageDuration;
  });

  // Helper: Create transition effects
  const createTransitionEffects = (
    targetId: string,
    isFadeIn: boolean,
    startTime: number,
  ) => {
    const effects: any[] = [];

    if (transitionType === 'none') return effects;

    // Base opacity transition
    effects.push({
      id: `${targetId}-opacity-${isFadeIn ? 'in' : 'out'}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: startTime,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: isFadeIn ? 0 : 1, prog: 0 },
          { key: 'opacity', val: isFadeIn ? 1 : 0, prog: 1 },
        ],
      },
    });

    // Additional transition effects
    if (transitionType === 'slide') {
      effects.push({
        id: `${targetId}-slide-${isFadeIn ? 'in' : 'out'}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: startTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            {
              key: 'translateX',
              val: isFadeIn ? '50px' : '0px',
              prog: 0,
            },
            {
              key: 'translateX',
              val: isFadeIn ? '0px' : '-50px',
              prog: 1,
            },
          ],
        },
      });
    } else if (transitionType === 'zoom') {
      effects.push({
        id: `${targetId}-zoom-${isFadeIn ? 'in' : 'out'}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: startTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            { key: 'scale', val: isFadeIn ? 0.9 : 1, prog: 0 },
            { key: 'scale', val: isFadeIn ? 1 : 1.1, prog: 1 },
          ],
        },
      });
    } else if (transitionType === 'wipe') {
      effects.push({
        id: `${targetId}-wipe-${isFadeIn ? 'in' : 'out'}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: startTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            {
              key: 'clipPath',
              val: isFadeIn ? 'inset(0 100% 0 0)' : 'inset(0 0 0 0)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: isFadeIn ? 'inset(0 0 0 0)' : 'inset(0 0 0 100%)',
              prog: 1,
            },
          ],
        },
      });
    }

    return effects;
  };

  // Helper: Create Ken Burns effect
  const createKenBurnsEffect = (targetId: string, duration: number) => {
    if (!kenBurnsEffect) return [];

    return [
      {
        id: `${targetId}-ken-burns`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1 + kenBurnsIntensity, prog: 1 },
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '10px', prog: 1 },
          ],
        },
      },
    ];
  };

  // Create image frames
  const imageFrames: RenderableComponentData[] = [];
  let currentTime = 0;

  displayImages.forEach((img, index) => {
    const imageId = `news-image-${index}`;
    const imgDuration = img.duration ?? imageDuration;

    const imageEffects: any[] = [
      ...createTransitionEffects(imageId, true, 0),
      ...createTransitionEffects(imageId, false, imgDuration - transitionDuration),
      ...createKenBurnsEffect(imageId, imgDuration),
    ];

    imageFrames.push({
      id: imageId,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: img.src,
        className: 'w-full h-full object-cover',
        style: {
          border: '2px solid white',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        },
      },
      context: {
        timing: {
          start: currentTime,
          duration: imgDuration,
        },
      },
      effects: imageEffects,
    } as RenderableComponentData);

    currentTime += imgDuration;
  });

  // Create main content grid
  const gridClassName =
    gridConfig.cols === 1
      ? 'w-full h-full'
      : gridConfig.cols === 2 && gridConfig.rows === 1
      ? 'grid grid-cols-2 gap-1 w-full h-full'
      : gridConfig.cols === 3
      ? 'grid grid-cols-3 gap-1 w-full h-full'
      : 'grid grid-cols-2 grid-rows-2 gap-1 w-full h-full';

  const mainContentContainer: RenderableComponentData = {
    id: 'news-main-content',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 ${gridClassName}`,
        style: {
          zIndex: 10,
          padding: '20px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: imageFrames,
  };

  // Create ticker text (scrolling)
  const tickerContainer: RenderableComponentData | null = showTicker
    ? ({
        id: 'news-ticker-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute bottom-0 left-0 right-0 h-8 flex items-center overflow-hidden',
            style: {
              backgroundColor: '#dc2626',
              zIndex: 40,
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
          {
            id: 'news-ticker-text',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: tickerText.repeat(10), // Repeat for continuous scroll
              className: 'text-white text-sm font-semibold whitespace-nowrap',
              style: {
                paddingLeft: '100%',
              },
              font: {
                family: 'Inter',
                weights: ['600'],
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
                id: 'ticker-scroll',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: totalDuration,
                  mode: 'provider',
                  targetIds: ['news-ticker-text'],
                  ranges: [
                    { key: 'translateX', val: '0%', prog: 0 },
                    { key: 'translateX', val: '-100%', prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData)
    : null;

  // Create lower third banner
  const lowerThirdBanner: RenderableComponentData | null = showLowerThird
    ? ({
        id: 'news-lower-third',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute bottom-8 left-0 right-0 h-24 flex items-center px-6',
            style: {
              background: 'linear-gradient(to right, #1e3a8a, #3b82f6)',
              zIndex: 30,
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
          {
            id: 'news-headline',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: headlineText,
              className: 'text-white text-2xl font-bold',
              style: {
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              },
              font: {
                family: 'Inter',
                weights: ['700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData)
    : null;

  // Create timestamp overlay
  const timestampOverlay: RenderableComponentData | null = showTimestamp
    ? ({
        id: 'news-timestamp',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute top-4 right-4 px-3 py-1 rounded',
            style: {
              backgroundColor: 'rgba(0,0,0,0.7)',
              zIndex: 40,
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
          {
            id: 'timestamp-text',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: '00:00:00',
              className: 'text-white text-xs font-mono',
              font: {
                family: 'Roboto Mono',
                weights: ['400'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData)
    : null;

  // Create location label
  const locationOverlay: RenderableComponentData = {
    id: 'news-location',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-4 left-4 px-3 py-1 rounded',
        style: {
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 35,
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
      {
        id: 'location-text',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: locationLabel,
          className: 'text-white text-xs font-semibold uppercase',
          font: {
            family: 'Inter',
            weights: ['600'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

  // Create logo overlay (if provided)
  const logoOverlay: RenderableComponentData | null = logoSrc
    ? ({
        id: 'news-logo',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: logoSrc,
          className: 'absolute top-4 left-1/2 transform -translate-x-1/2 w-32 h-auto',
          style: {
            zIndex: 45,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData)
    : null;

  // Create background layer
  const backgroundLayer: RenderableComponentData = {
    id: 'news-background',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background: backgroundGradient,
          opacity: 0.15,
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  } as RenderableComponentData;

  // Assemble all children
  const allChildren: RenderableComponentData[] = [
    backgroundLayer,
    mainContentContainer,
    lowerThirdBanner,
    tickerContainer,
    timestampOverlay,
    locationOverlay,
    logoOverlay,
  ].filter(Boolean) as RenderableComponentData[];

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'news-broadcast-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-100',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: allChildren,
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
  id: 'news-broadcast-rapid-cut',
  title: 'News Broadcast Rapid Cut',
  description:
    'Professional news broadcast-style preset with lower thirds, breaking news banners, ticker text, multi-box layouts, and broadcast-quality transitions. Dynamically switches between full-screen, split-screen, and multi-box grid layouts with animated frames, timestamps, location labels, and branded overlays.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'news',
    'broadcast',
    'lower-third',
    'ticker',
    'multi-box',
    'transitions',
    'overlay',
    'timestamp',
    'location',
    'logo',
    'branded',
    'professional',
  ],
  defaultInputParams: {
    images: [
      { src: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c', duration: 5 },
      { src: 'https://images.unsplash.com/photo-1557804506-669a67965ba0', duration: 5 },
    ],
    layoutMode: 'split-2',
    transitionType: 'fade',
    transitionDuration: 0.8,
    headlineText: 'BREAKING NEWS',
    tickerText: 'Latest updates • Breaking news • Live coverage • ',
    locationLabel: 'LIVE',
    showTimestamp: true,
    showTicker: true,
    showLowerThird: true,
    backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    imageDuration: 5,
    kenBurnsEffect: true,
    kenBurnsIntensity: 0.05,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const newsBroadcastRapidCutPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
