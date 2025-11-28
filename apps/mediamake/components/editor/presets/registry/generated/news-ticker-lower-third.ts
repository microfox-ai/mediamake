/**
 * Modern News Ticker Lower-Third Preset
 *
 * This preset creates a professional broadcast-style news ticker with a blurred, slowly panning
 * background image and crisp scrolling text in a contained lower-third banner. The background
 * image remains out of focus with a strong blur filter and slow pan effect, while the text
 * scrolls smoothly in a solid color banner with a subtle slide-up entrance animation.
 *
 * Features:
 * - **Blurred Background**: Strong blur filter (20-30px) on the background image with slow pan effect
 * - **Lower-Third Banner**: Solid gradient background banner positioned at the bottom
 * - **Scrolling Text**: Smooth horizontal text scroll with configurable timing
 * - **Entrance Animation**: Subtle slide-up animation for the banner entrance
 * - **Professional Styling**: Drop shadow, backdrop blur, and gradient effects for depth
 * - **Customizable**: Configurable colors, text, fonts, and animation timings
 *
 * Use cases:
 * - Broadcasting news tickers with contextual background imagery
 * - Live event announcements with background context
 * - Sports scores and updates with dynamic backgrounds
 * - Financial news tickers with market imagery
 * - Weather updates with location backgrounds
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  backgroundImage: z.object({
    src: z.string().describe('Background image source URL'),
  }),
  tickerText: z
    .string()
    .describe('Text to display in the scrolling ticker'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600", "Roboto:700:italic")',
    ),
  bannerGradientStart: z
    .string()
    .default('rgba(30, 58, 138, 0.95)')
    .optional()
    .describe('Starting color for banner gradient (default: blue-900/95)'),
  bannerGradientEnd: z
    .string()
    .default('rgba(29, 78, 216, 0.95)')
    .optional()
    .describe('Ending color for banner gradient (default: blue-700/95)'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Color of the ticker text (default: white)'),
  textSize: z
    .number()
    .default(20)
    .optional()
    .describe('Font size of the ticker text in pixels (default: 20)'),
  blurIntensity: z
    .number()
    .min(10)
    .max(50)
    .default(30)
    .optional()
    .describe('Blur intensity for background image in pixels (default: 30)'),
  panDuration: z
    .number()
    .default(15)
    .optional()
    .describe('Duration of the background pan effect in seconds (default: 15)'),
  bannerEntranceDuration: z
    .number()
    .default(0.5)
    .optional()
    .describe(
      'Duration of the banner slide-up entrance animation in seconds (default: 0.5)',
    ),
  textScrollDelay: z
    .number()
    .default(0.5)
    .optional()
    .describe(
      'Delay before text starts scrolling in seconds (default: 0.5)',
    ),
  textScrollDuration: z
    .number()
    .optional()
    .describe(
      'Duration of the text scroll animation in seconds (default: panDuration - textScrollDelay)',
    ),
  duration: z
    .number()
    .default(15)
    .optional()
    .describe('Total duration of the preset in seconds (default: 15)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:600';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 600; // Default weight
  }

  // Extract parameters with defaults
  const blurIntensity = params.blurIntensity ?? 30;
  const panDuration = params.panDuration ?? 15;
  const bannerEntranceDuration = params.bannerEntranceDuration ?? 0.5;
  const textScrollDelay = params.textScrollDelay ?? 0.5;
  const totalDuration = params.duration ?? 15;
  const textScrollDuration =
    params.textScrollDuration ?? totalDuration - textScrollDelay;
  const bannerGradientStart =
    params.bannerGradientStart ?? 'rgba(30, 58, 138, 0.95)';
  const bannerGradientEnd =
    params.bannerGradientEnd ?? 'rgba(29, 78, 216, 0.95)';
  const textColor = params.textColor ?? '#FFFFFF';
  const textSize = params.textSize ?? 20;

  // IDs for components
  const containerId = 'news-ticker-container';
  const backgroundImageId = 'news-ticker-background-image';
  const lowerThirdContainerId = 'news-ticker-lower-third-container';
  const tickerTextId = 'news-ticker-text';

  // Background image pan effect
  const backgroundPanEffect = {
    id: 'background-pan-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: [backgroundImageId],
      type: 'ease-in-out',
      start: 0,
      duration: panDuration,
      ranges: [
        { key: 'translateX', val: '-5%', prog: 0 },
        { key: 'translateX', val: '5%', prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Banner entrance effect (slide up)
  const bannerEntranceEffect = {
    id: 'banner-entrance-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: [lowerThirdContainerId],
      type: 'ease-out',
      start: 0,
      duration: bannerEntranceDuration,
      ranges: [
        { key: 'translateY', val: '100%', prog: 0 },
        { key: 'translateY', val: '0%', prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Text scroll effect (horizontal scroll)
  const textScrollEffect = {
    id: 'text-scroll-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      targetIds: [tickerTextId],
      type: 'linear',
      start: textScrollDelay,
      duration: textScrollDuration,
      ranges: [
        { key: 'translateX', val: '100%', prog: 0 },
        { key: 'translateX', val: '-100%', prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Background image component
  const backgroundImage: RenderableComponentData = {
    id: backgroundImageId,
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: params.backgroundImage.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        filter: `blur(${blurIntensity}px)`,
        transform: 'scale(1.1)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [backgroundPanEffect],
  };

  // Ticker text component
  const tickerText: RenderableComponentData = {
    id: tickerTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.tickerText,
      className: 'absolute whitespace-nowrap',
      style: {
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: `${textSize}px`,
        color: textColor,
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [textScrollEffect],
  };

  // Lower-third banner container
  const lowerThirdContainer: RenderableComponentData = {
    id: lowerThirdContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute bottom-0 left-0 right-0 overflow-hidden',
        style: {
          height: '96px', // h-24 = 96px
          background: `linear-gradient(to right, ${bannerGradientStart}, ${bannerGradientEnd})`,
          backdropFilter: 'blur(4px)',
          boxShadow:
            '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [bannerEntranceEffect],
    childrenData: [tickerText],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [backgroundImage, lowerThirdContainer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'news-ticker-lower-third',
  title: 'Modern News Ticker Lower-Third',
  description:
    'Professional broadcast-style news ticker with blurred panning background image and scrolling text in a contained lower-third banner. Features smooth entrance animation and continuous text scroll.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'news',
    'ticker',
    'lower-third',
    'broadcast',
    'scrolling-text',
    'banner',
    'background',
    'blur',
    'pan',
    'gradient',
  ],
  defaultInputParams: {
    backgroundImage: {
      src: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1920&h=1080&fit=crop',
    },
    tickerText:
      'Breaking News: Latest updates on global markets and technology trends',
    font: 'Inter:600',
    bannerGradientStart: 'rgba(30, 58, 138, 0.95)',
    bannerGradientEnd: 'rgba(29, 78, 216, 0.95)',
    textColor: '#FFFFFF',
    textSize: 20,
    blurIntensity: 30,
    panDuration: 15,
    bannerEntranceDuration: 0.5,
    textScrollDelay: 0.5,
    duration: 15,
  },
  dependencies: {},
};

// Export preset
export const newsTickerLowerThirdPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z
    .object(presetParams.shape)
    .transform((v) => v as any)
    .pipe(z.record(z.any())),
};
