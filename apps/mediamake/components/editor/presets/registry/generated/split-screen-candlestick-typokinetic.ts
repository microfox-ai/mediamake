/**
 * Split-Screen Candlestick Typokinetic Preset
 *
 * This preset creates a dramatic split-screen financial visualization with:
 * - Left half: Scrolling ticker displaying financial numbers (prices, percentages, timestamps)
 * - Right half: Dynamic candlestick chart bars that resize based on caption word intensity
 * - Center divider: Vertical green line separating the two panels
 * - Overlay narration: Caption words ('SURGE', 'DIP', 'RECOVERY', 'VICTORY') that pulse with market rhythm
 *
 * Features:
 * - **Continuous Scrolling Ticker**: Financial data scrolls vertically using translateY animation
 * - **Dynamic Candlesticks**: Bar heights animate with scaleY effects based on caption intensity metadata
 * - **Narration Overlay**: Market action words appear with pulsing glow effects
 * - **Split-Screen Layout**: Left (ticker) and right (candlesticks) panels with centered divider
 * - **GPU-Accelerated**: Uses transform properties for smooth performance
 *
 * Use cases:
 * - Financial market visualization videos
 * - Trading recap content
 * - Stock market analysis presentations
 * - Cryptocurrency price action narratives
 * - Economic news content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// ==================== PARAMS SCHEMA ====================

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
          }),
        ),
        metadata: z
          .object({
            impact: z
              .number()
              .min(0.1)
              .max(3.0)
              .optional()
              .describe('Intensity multiplier for effects (0.1-3.0)'),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with intensity metadata'),

  tickerItems: z
    .array(
      z.object({
        text: z.string().describe('Ticker text (e.g., "$45,234.12 ↑ +2.34%")'),
        color: z
          .string()
          .default('#10B981')
          .describe('Text color (e.g., "#10B981" for green, "#EF4444" for red)'),
      }),
    )
    .default([
      { text: '$45,234.12 ↑ +2.34%', color: '#10B981' },
      { text: '$12,987.56 ↓ -1.23%', color: '#EF4444' },
      { text: '$33,456.78 ↑ +5.67%', color: '#10B981' },
      { text: '14:23:45 GMT', color: '#9CA3AF' },
      { text: '$8,765.43 ↓ -3.21%', color: '#EF4444' },
    ])
    .describe('Array of ticker items to display in scrolling ticker'),

  candlesticks: z
    .array(
      z.object({
        height: z
          .number()
          .min(50)
          .max(400)
          .describe('Base height of candlestick in pixels'),
        color: z
          .enum(['green', 'red'])
          .describe('Candlestick color (green for gain, red for loss)'),
      }),
    )
    .default([
      { height: 200, color: 'green' },
      { height: 120, color: 'red' },
      { height: 280, color: 'green' },
      { height: 160, color: 'green' },
      { height: 240, color: 'red' },
    ])
    .describe('Array of candlestick configurations'),

  tickerScrollSpeed: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Ticker scroll speed in seconds for one full cycle'),

  candlestickAnimDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.5)
    .describe('Duration of candlestick resize animation in seconds'),

  candlestickStagger: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .describe('Stagger delay between candlestick animations in seconds'),

  narrationFont: z
    .string()
    .default('Inter:900')
    .describe(
      'Font family for narration words (e.g., "Inter:900", "Roboto:700")',
    ),

  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the preset in seconds'),
});

// ==================== PRESET EXECUTION ====================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    tickerItems,
    candlesticks,
    tickerScrollSpeed,
    candlestickAnimDuration,
    candlestickStagger,
    narrationFont,
    duration,
  } = params;

  // Parse narration font
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: { fontWeight?: number; fontStyle?: string } = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily: narrationFontFamily, fontStyle: narrationFontStyle } =
    parseFontString(narrationFont);

  // ==================== TICKER ITEMS ====================

  const tickerItemHeight = 60; // Approximate height per ticker item
  const tickerTotalHeight = tickerItems.length * tickerItemHeight;

  const tickerTextComponents = tickerItems.map((item, index) => {
    const tickerId = `ticker-text-${index}`;

    return {
      id: tickerId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: item.text,
        className: 'text-2xl font-mono px-6',
        style: {
          color: item.color,
          fontWeight: 600,
        },
        font: {
          family: 'JetBrains Mono',
          weights: ['600'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData;
  });

  // Ticker container with continuous scroll effect
  const tickerContainerId = 'ticker-container';
  const tickerScrollEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: tickerScrollSpeed,
    mode: 'provider',
    targetIds: [tickerContainerId],
    ranges: [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -tickerTotalHeight, prog: 1 },
    ],
  };

  const tickerContainer = {
    id: tickerContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col gap-2 py-4',
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
        id: 'ticker-scroll-effect',
        componentId: 'generic',
        data: tickerScrollEffect,
      },
    ],
    childrenData: tickerTextComponents,
  } as RenderableComponentData;

  // ==================== CANDLESTICKS ====================

  const candlestickComponents = candlesticks.map((candle, index) => {
    const candleId = `candlestick-${index}`;
    const colorGradient =
      candle.color === 'green'
        ? 'linear-gradient(180deg, rgba(34,197,94,0.8) 0%, rgba(34,197,94,0.4) 100%)'
        : 'linear-gradient(180deg, rgba(239,68,68,0.8) 0%, rgba(239,68,68,0.4) 100%)';

    // Find corresponding caption for intensity
    const captionIndex = Math.min(index, captions.length - 1);
    const caption = captions[captionIndex];
    const impact = caption?.metadata?.impact ?? 1.0;

    // Calculate scale based on impact
    const scaleMultiplier = 0.8 + impact * 0.4; // Range: 0.8 to 2.2 (for impact 0.1 to 3.0)

    const candleEffect: GenericEffectData = {
      type: 'ease-out',
      start: index * candlestickStagger,
      duration: candlestickAnimDuration,
      mode: 'provider',
      targetIds: [candleId],
      ranges: [
        { key: 'scaleY', val: 0, prog: 0 },
        { key: 'scaleY', val: scaleMultiplier, prog: 1 },
      ],
    };

    return {
      id: candleId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 40px; height: ${candle.height}px; background: ${colorGradient}; border-radius: 4px 4px 0 0;"></div>`,
        className: 'flex-shrink-0',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `candle-effect-${index}`,
          componentId: 'generic',
          data: candleEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // ==================== NARRATION OVERLAY ====================

  const narrationWords = captions.slice(0, 4).map((caption, index) => {
    const wordId = `narration-word-${index}`;
    const word = caption.text;

    // Determine color based on index pattern
    let wordColor = '#10B981'; // green
    let shadowColor = 'rgba(34, 197, 94, 0.8)';

    if (index === 1) {
      wordColor = '#EF4444'; // red for "DIP"
      shadowColor = 'rgba(239, 68, 68, 0.8)';
    } else if (index === 3) {
      wordColor = '#FBBF24'; // yellow for "VICTORY"
      shadowColor = 'rgba(251, 191, 36, 0.8)';
    }

    const wordEffect: GenericEffectData = {
      type: 'ease-out',
      start: 0,
      duration: caption.duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Scale pulse
        { key: 'scale', val: 0.8, prog: 0 },
        { key: 'scale', val: 1.1, prog: 0.3 },
        { key: 'scale', val: 1, prog: 0.5 },
        { key: 'scale', val: 1.05, prog: 0.8 },
        { key: 'scale', val: 1, prog: 1 },
        // Opacity
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },
        { key: 'opacity', val: 1, prog: 0.8 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        className: 'text-6xl font-black',
        style: {
          color: wordColor,
          textShadow: `0 0 20px ${shadowColor}, 0 0 40px ${shadowColor}`,
          ...narrationFontStyle,
        },
        font: {
          family: narrationFontFamily,
          weights: narrationFontStyle.fontWeight
            ? [narrationFontStyle.fontWeight.toString()]
            : ['900'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      effects: [
        {
          id: `narration-effect-${index}`,
          componentId: 'generic',
          data: wordEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // ==================== LEFT PANEL ====================

  const leftPanel = {
    id: 'left-panel',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'w-1/2 overflow-hidden bg-slate-950 flex flex-col relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [tickerContainer],
  } as RenderableComponentData;

  // ==================== RIGHT PANEL ====================

  const rightPanel = {
    id: 'right-panel',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'w-1/2 bg-slate-900 flex items-end justify-center gap-3 p-6',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: candlestickComponents,
  } as RenderableComponentData;

  // ==================== DIVIDER ====================

  const divider = {
    id: 'divider',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 1px; height: 100%; background: rgba(34, 197, 94, 0.5);'></div>",
      className: 'absolute left-1/2 top-0 transform -translate-x-1/2',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData;

  // ==================== NARRATION OVERLAY CONTAINER ====================

  const narrationOverlay = {
    id: 'narration-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 flex items-center justify-center pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: narrationWords,
  } as RenderableComponentData;

  // ==================== ROOT CONTAINER ====================

  const rootContainer = {
    id: 'split-screen-candlestick-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex w-full h-full relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [leftPanel, divider, rightPanel, narrationOverlay],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ==================== METADATA ====================

const presetMetadata: PresetMetadata = {
  id: 'split-screen-candlestick-typokinetic',
  title: 'Split-Screen Candlestick Typokinetic',
  description:
    'Dramatic split-screen financial visualization with scrolling ticker numbers on the left and dynamic candlestick charts on the right. Caption words ("SURGE", "DIP", "RECOVERY", "VICTORY") appear as overlay narration text that pulses with market rhythm. Candlesticks resize dynamically based on caption word intensity metadata, creating a visual symphony of market data.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typokinetic',
    'split-screen',
    'candlestick',
    'financial',
    'ticker',
    'market',
    'data-visualization',
    'dramatic',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'SURGE',
        start: 0,
        absoluteStart: 0,
        end: 2,
        absoluteEnd: 2,
        duration: 2,
        words: [],
        metadata: { impact: 1.5 },
      },
      {
        id: 'caption-2',
        text: 'DIP',
        start: 0,
        absoluteStart: 2.5,
        end: 1.5,
        absoluteEnd: 4,
        duration: 1.5,
        words: [],
        metadata: { impact: 0.8 },
      },
      {
        id: 'caption-3',
        text: 'RECOVERY',
        start: 0,
        absoluteStart: 5,
        end: 2,
        absoluteEnd: 7,
        duration: 2,
        words: [],
        metadata: { impact: 2.0 },
      },
      {
        id: 'caption-4',
        text: 'VICTORY',
        start: 0,
        absoluteStart: 8,
        end: 2,
        absoluteEnd: 10,
        duration: 2,
        words: [],
        metadata: { impact: 2.5 },
      },
    ],
    tickerItems: [
      { text: '$45,234.12 ↑ +2.34%', color: '#10B981' },
      { text: '$12,987.56 ↓ -1.23%', color: '#EF4444' },
      { text: '$33,456.78 ↑ +5.67%', color: '#10B981' },
      { text: '14:23:45 GMT', color: '#9CA3AF' },
      { text: '$8,765.43 ↓ -3.21%', color: '#EF4444' },
    ],
    candlesticks: [
      { height: 200, color: 'green' },
      { height: 120, color: 'red' },
      { height: 280, color: 'green' },
      { height: 160, color: 'green' },
      { height: 240, color: 'red' },
    ],
    tickerScrollSpeed: 15,
    candlestickAnimDuration: 0.5,
    candlestickStagger: 0.15,
    narrationFont: 'Inter:900',
    duration: 10,
  },
};

// ==================== EXPORT ====================

export const splitScreenCandlestickTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
