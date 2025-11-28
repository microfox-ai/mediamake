/**
 * News Ticker Typokinetics Preset
 *
 * This preset creates a broadcast-style news ticker with horizontal scrolling text
 * that features hard-cut visibility at edges and instant headline transitions.
 * Mimics professional lower-thirds and breaking news banners with smooth horizontal
 * motion but instant appearance/disappearance at the entry/exit points.
 *
 * Features:
 * - **Instant Headline Slam**: Headlines appear instantly with hard opacity cut
 * - **Horizontal Ticker Scroll**: Text scrolls smoothly from right to left
 * - **Hard-Cut Visibility**: Text cuts in/out at container edges using clipPath
 * - **Breaking News Aesthetic**: Red banner design with professional typography
 * - **Configurable Speed**: Adjust scroll speed and headline timing
 *
 * Use cases:
 * - Creating broadcast-style lower thirds for news content
 * - Building breaking news banners with scrolling updates
 * - Adding professional news ticker overlays to videos
 * - Implementing instant-cut text animations for impact
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  headlineText: z
    .string()
    .default('BREAKING NEWS')
    .describe('Main headline text that slams into view instantly'),
  tickerText: z
    .string()
    .default(
      'This is a breaking news update. The text scrolls continuously across the screen with hard cuts at the edges.',
    )
    .describe('Scrolling ticker text content'),
  scrollSpeed: z
    .number()
    .min(10)
    .max(200)
    .default(50)
    .describe('Scroll speed in pixels per second'),
  headlineDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('How long the headline stays visible before disappearing'),
  headlineDelay: z
    .number()
    .min(0)
    .max(5)
    .default(0.5)
    .describe('Delay before headline appears (seconds)'),
  tickerStartDelay: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .describe('Delay before ticker starts scrolling (seconds)'),
  totalDuration: z
    .number()
    .min(5)
    .max(120)
    .default(30)
    .describe('Total preset duration in seconds'),
  bannerColor: z
    .string()
    .default('rgb(220, 38, 38)')
    .describe('Background color of the ticker banner'),
  headlineColor: z
    .string()
    .default('rgb(220, 38, 38)')
    .describe('Background color of the headline box'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of all text elements'),
  font: z
    .string()
    .optional()
    .default('Roboto:700')
    .describe('Font family with optional weight (e.g., "Roboto:700")'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    headlineText,
    tickerText,
    scrollSpeed,
    headlineDuration,
    headlineDelay,
    tickerStartDelay,
    totalDuration,
    bannerColor,
    headlineColor,
    textColor,
    font,
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font || 'Roboto:700');

  // Calculate ticker scroll duration
  // Approximate character width (adjust based on font and size)
  const avgCharWidth = 14; // pixels per character for text-2xl
  const tickerWidth = tickerText.length * avgCharWidth;
  const scrollDuration = tickerWidth / scrollSpeed;

  // Create headline component with instant appearance
  const headlineComponent: RenderableComponentData = {
    id: 'news-ticker-headline',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-8 left-0 right-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: headlineDelay,
        duration: headlineDuration,
      },
    },
    childrenData: [
      {
        id: 'headline-text-atom',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: headlineText,
          className: 'text-white text-5xl font-bold uppercase tracking-wide px-8 py-4',
          style: {
            backgroundColor: headlineColor,
            color: textColor,
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: headlineDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      {
        id: 'headline-instant-appear',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.05, // Near-instant cut
          mode: 'provider',
          targetIds: ['news-ticker-headline'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'headline-instant-disappear',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: headlineDuration - 0.05,
          duration: 0.05, // Near-instant cut
          mode: 'provider',
          targetIds: ['news-ticker-headline'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create ticker container
  const tickerContainer: RenderableComponentData = {
    id: 'news-ticker-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute bottom-0 left-0 right-0 h-24 overflow-hidden',
        style: {
          backgroundColor: bannerColor,
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
      // "BREAKING" label
      {
        id: 'ticker-label',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: 'BREAKING',
          className: 'absolute left-0 top-0 bottom-0 flex items-center justify-center bg-black text-white text-2xl font-bold px-6 z-10',
          style: {
            color: textColor,
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData,
      // Scrolling ticker wrapper
      {
        id: 'ticker-scroll-wrapper',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute left-32 right-0 top-0 bottom-0 overflow-hidden',
            style: {
              clipPath: 'inset(0 0 0 0)',
            },
          },
        },
        context: {
          timing: {
            start: tickerStartDelay,
            duration: totalDuration - tickerStartDelay,
          },
        },
        childrenData: [
          {
            id: 'ticker-text-atom',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: tickerText,
              className: 'text-white text-2xl font-bold whitespace-nowrap absolute left-0 top-0 bottom-0 flex items-center',
              style: {
                color: textColor,
                willChange: 'transform',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration - tickerStartDelay,
              },
            },
            effects: [
              {
                id: 'ticker-scroll-effect',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: scrollDuration,
                  mode: 'provider',
                  targetIds: ['ticker-text-atom'],
                  ranges: [
                    { key: 'translateX', val: '100%', prog: 0 },
                    { key: 'translateX', val: '-100%', prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'news-ticker-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [headlineComponent, tickerContainer],
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
  id: 'NewsTickerTypokinetics',
  title: 'News Ticker Typokinetics',
  description:
    'Broadcast-style news ticker with horizontal scrolling text featuring hard-cut visibility at edges and instant headline transitions. Mimics professional lower-thirds and breaking news banners with smooth horizontal motion but instant appearance/disappearance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'news',
    'ticker',
    'broadcast',
    'lower-thirds',
    'breaking-news',
    'scrolling',
    'hard-cuts',
    'instant-transitions',
  ],
  defaultInputParams: {
    headlineText: 'BREAKING NEWS',
    tickerText:
      'This is a breaking news update scrolling across your screen. The text moves smoothly while cutting in and out at the edges. This creates a professional broadcast news aesthetic perfect for urgent updates and announcements.',
    scrollSpeed: 50,
    headlineDuration: 3,
    headlineDelay: 0.5,
    tickerStartDelay: 0,
    totalDuration: 30,
    bannerColor: 'rgb(220, 38, 38)',
    headlineColor: 'rgb(220, 38, 38)',
    textColor: '#FFFFFF',
    font: 'Roboto:700',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const NewsTickerTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
