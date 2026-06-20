/**
 * Typokinetic Candlestick Chart Preset
 *
 * Creates a character-based candlestick chart where each candle is constructed from animated text characters.
 * Bodies use stacked dollar signs ($) or price digits, wicks use vertical pipes (|), creating a retro 
 * terminal/Bloomberg aesthetic. Characters type in from top to bottom with typewriter timing. Victory moment 
 * features glitch-effect text expansion showing 'WINNER' or 'BULL RUN' in the same character-based style.
 *
 * Features:
 * - **Character-Based Candles**: Dollar signs ($) for bodies, pipes (|) for wicks
 * - **Typewriter Animation**: Characters appear instantly with step-easing (steps(1))
 * - **Sequential Reveal**: Candlesticks animate one by one with gaps
 * - **Victory Glitch Effect**: Final candle features glitch effect on victory text
 * - **Retro Terminal Aesthetic**: Monospace font, green/red colors, black background
 * - **Performance Optimized**: CSS containment for layout paint
 *
 * Use cases:
 * - Financial data visualization with retro aesthetic
 * - Stock market animations
 * - Trading dashboard displays
 * - Terminal-style data presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        text: z.string(),
        start: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
      }),
    )
    .describe('Caption data providing price numbers for candlesticks'),
  numberOfCandles: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Number of candlesticks to display'),
  typewriterSpeed: z
    .number()
    .min(10)
    .max(100)
    .default(30)
    .describe('Character typing speed in milliseconds'),
  candleGap: z
    .number()
    .min(0)
    .max(500)
    .default(200)
    .describe('Gap between candlestick animations in milliseconds'),
  candleDuration: z
    .number()
    .min(300)
    .max(2000)
    .default(800)
    .describe('Duration of each candlestick animation in milliseconds'),
  victoryText: z
    .string()
    .default('BULL RUN')
    .describe('Victory text to display on final candle (WINNER or BULL RUN)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Parse caption text as price number
  const parsePrice = (text: string): number => {
    const match = text.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 150.0;
  };

  // Helper function: Generate candlestick data
  const generateCandleData = (index: number) => {
    const basePrice = 150;
    const variation = (index - 2) * 2.5;
    const price = basePrice + variation;
    
    // Determine bullish (green) vs bearish (red)
    const isBullish = index !== 1; // Candle 2 is bearish (red)
    
    // Candle dimensions (character counts)
    const wickTopHeight = index === 2 ? 4 : index === 0 ? 3 : 2;
    const bodyHeight = index === 4 ? 7 : index === 2 ? 6 : index === 0 ? 5 : index === 3 ? 4 : 3;
    const wickBottomHeight = index === 0 ? 2 : 1;
    
    return {
      price: price.toFixed(2),
      isBullish,
      wickTopHeight,
      bodyHeight,
      wickBottomHeight,
    };
  };

  // Helper function: Create text character component
  const createCharComponent = (
    id: string,
    text: string,
    color: string,
    charIndex: number,
  ) => {
    const typewriterSpeed = params.typewriterSpeed;
    const effectStart = charIndex * (typewriterSpeed / 1000);

    return {
      id,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text,
        className: `text-xs ${color}`,
        style: {
          lineHeight: '0.8',
        },
        font: {
          family: 'Fira Code',
          weights: ['400'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.candleDuration / 1000,
        },
      },
      effects: [
        {
          id: `${id}-typewriter`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: effectStart,
            duration: typewriterSpeed / 1000,
            mode: 'provider',
            targetIds: [id],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };
  };

  // Create candlestick columns
  const candleColumns: RenderableComponentData[] = [];

  for (let i = 0; i < params.numberOfCandles; i++) {
    const candleData = generateCandleData(i);
    const color = candleData.isBullish ? 'text-green-500' : 'text-red-500';
    const candleStartTime = i * ((params.candleDuration + params.candleGap) / 1000);
    
    let charIndex = 0;

    // Top wick characters
    const topWickChars: RenderableComponentData[] = [];
    for (let j = 0; j < candleData.wickTopHeight; j++) {
      topWickChars.push(
        createCharComponent(
          `candle-${i}-wick-top-char-${j}`,
          '|',
          color,
          charIndex++,
        ),
      );
    }

    // Body characters
    const bodyChars: RenderableComponentData[] = [];
    for (let j = 0; j < candleData.bodyHeight; j++) {
      bodyChars.push(
        createCharComponent(
          `candle-${i}-body-char-${j}`,
          '$',
          color,
          charIndex++,
        ),
      );
    }

    // Bottom wick characters
    const bottomWickChars: RenderableComponentData[] = [];
    for (let j = 0; j < candleData.wickBottomHeight; j++) {
      bottomWickChars.push(
        createCharComponent(
          `candle-${i}-wick-bottom-char-${j}`,
          '|',
          color,
          charIndex++,
        ),
      );
    }

    // Price label
    const labelStartTime = charIndex * (params.typewriterSpeed / 1000);
    const priceLabel: RenderableComponentData = {
      id: `candle-${i}-label`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: candleData.price,
        className: `text-lg ${color} mt-2`,
        font: {
          family: 'Fira Code',
          weights: ['400'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.candleDuration / 1000,
        },
      },
      effects: [
        {
          id: `candle-${i}-label-typewriter`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: labelStartTime,
            duration: params.typewriterSpeed / 1000,
            mode: 'provider',
            targetIds: [`candle-${i}-label`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };

    // Victory text for final candle
    const victoryTextComponent: RenderableComponentData | null =
      i === params.numberOfCandles - 1
        ? {
            id: `candle-${i}-victory`,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: params.victoryText,
              className: 'text-2xl text-green-500 font-bold mt-4',
              style: {
                letterSpacing: '0.1em',
              },
              font: {
                family: 'Fira Code',
                weights: ['700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.candleDuration / 1000,
              },
            },
            effects: [
              {
                id: `candle-${i}-victory-glitch`,
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: (charIndex + 3) * (params.typewriterSpeed / 1000),
                  duration: 0.5,
                  mode: 'provider',
                  targetIds: [`candle-${i}-victory`],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 0.3 },
                    { key: 'translateX', val: -2, prog: 0.3 },
                    { key: 'translateX', val: 2, prog: 0.4 },
                    { key: 'translateX', val: -2, prog: 0.5 },
                    { key: 'translateX', val: 0, prog: 0.6 },
                    { key: 'scale', val: 1, prog: 0.3 },
                    { key: 'scale', val: 1.2, prog: 0.5 },
                    { key: 'scale', val: 1, prog: 1 },
                  ],
                },
              },
            ],
          }
        : null;

    // Assemble candlestick column
    const candleColumn: RenderableComponentData = {
      id: `candle-${i}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-col items-center justify-end relative',
        },
      },
      context: {
        timing: {
          start: candleStartTime,
          duration: params.candleDuration / 1000,
        },
      },
      childrenData: [
        // Top wick
        {
          id: `candle-${i}-wick-top`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-col items-center',
            },
          },
          childrenData: topWickChars as RenderableComponentData[],
        },
        // Body
        {
          id: `candle-${i}-body`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-col items-center',
            },
          },
          childrenData: bodyChars as RenderableComponentData[],
        },
        // Bottom wick
        {
          id: `candle-${i}-wick-bottom`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-col items-center',
            },
          },
          childrenData: bottomWickChars as RenderableComponentData[],
        },
        priceLabel,
        ...(victoryTextComponent ? [victoryTextComponent] : []),
      ],
    };

    candleColumns.push(candleColumn);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetic-candlestick-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'grid grid-cols-5 gap-1 h-full w-full bg-black p-4 font-mono',
        style: {
          contain: 'layout paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: candleColumns as RenderableComponentData[],
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
  id: 'typokineticCandlestickChart',
  title: 'Typokinetic Candlestick Chart',
  description:
    'A character-based candlestick chart where each candle is constructed from animated text characters. Bodies use stacked dollar signs ($) or price digits, wicks use vertical pipes (|), creating a retro terminal/Bloomberg aesthetic. Characters type in from top to bottom with typewriter timing. Victory moment features glitch-effect text expansion showing \'WINNER\' or \'BULL RUN\' in the same character-based style.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'candlestick',
    'chart',
    'typography',
    'kinetic',
    'retro',
    'terminal',
    'bloomberg',
    'financial',
    'typewriter',
    'glitch',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      { text: '150.25', start: 0, duration: 1, absoluteStart: 0 },
      { text: '148.50', start: 1, duration: 1, absoluteStart: 1 },
      { text: '152.75', start: 2, duration: 1, absoluteStart: 2 },
      { text: '154.00', start: 3, duration: 1, absoluteStart: 3 },
      { text: '157.50', start: 4, duration: 1, absoluteStart: 4 },
    ],
    numberOfCandles: 5,
    typewriterSpeed: 30,
    candleGap: 200,
    candleDuration: 800,
    victoryText: 'BULL RUN',
  },
};

// Export preset
export const typokineticCandlestickChartPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
