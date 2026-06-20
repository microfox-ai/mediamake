/**
 * News Ticker Broadcast Graphics Preset
 *
 * This preset creates dynamic news ticker-style headlines with broadcast-quality graphics,
 * mimicking CNN/ESPN lower thirds. Headlines rotate in from the side with Y-axis rotation,
 * sliding in from the right while rotating from 45deg to 0deg with a slight overshoot to -5deg
 * for a bouncy, energetic feel. Combined with scale animation and quick fade-in for maximum impact.
 *
 * Features:
 * - **Y-axis rotation sweep**: Slides in from right with 45deg → -5deg → 0deg rotation
 * - **Scale animation**: 0.8 → 1.05 → 1.0 for added punch
 * - **Quick fade-in**: 0 to 100% in first 30% of animation
 * - **Lower-third positioning**: Absolute bottom positioning with gradient background
 * - **Broadcast aesthetic**: Black gradient backdrop with blur for professional look
 * - **Caption integration**: Processes caption words in groups of 3-4 for headline chunks
 * - **Sequential timing**: Headlines appear one after another with staggered timing
 *
 * Use cases:
 * - Breaking news tickers and lower thirds
 * - Sports broadcast graphics
 * - Live event overlays
 * - Social media news content
 * - Professional video overlays with momentum
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

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time'),
        absoluteStart: z.number().describe('Absolute start in caption timeline'),
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
      }),
    )
    .describe('Caption data for ticker headlines'),
  
  font: z
    .string()
    .optional()
    .default('Inter:900')
    .describe('Font family with weight (e.g., "Inter:900", "Bebas Neue:700")'),
  
  fontSize: z
    .number()
    .min(20)
    .max(80)
    .default(32)
    .describe('Font size in pixels for headline text'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color for headlines'),
  
  backgroundColor: z
    .string()
    .default('linear-gradient(to right, rgba(0, 0, 0, 0.8), transparent)')
    .describe('Background gradient for lower-third container'),
  
  animationDuration: z
    .number()
    .min(300)
    .max(1200)
    .default(600)
    .describe('Animation duration in milliseconds for sweep effect'),
  
  chunkSize: z
    .number()
    .min(2)
    .max(6)
    .default(4)
    .describe('Number of words to group into each headline chunk'),
  
  gapBetweenChunks: z
    .number()
    .min(0)
    .max(500)
    .default(100)
    .describe('Gap in milliseconds between successive headline chunks'),
  
  bottomPadding: z
    .number()
    .min(0)
    .max(100)
    .default(24)
    .describe('Padding from bottom of frame in pixels'),
  
  sidePadding: z
    .number()
    .min(0)
    .max(100)
    .default(24)
    .describe('Left and right padding in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:900';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  let fontWeight = 900;
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    fontWeight = parseInt(fontParts[1], 10) || 900;
  }

  // Process captions into headline chunks
  const headlineChunks: Array<{
    id: string;
    text: string;
    startTime: number;
    duration: number;
  }> = [];

  params.captions.forEach((caption, captionIndex) => {
    const words = caption.words;
    const chunkSize = params.chunkSize;

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkText = chunkWords.map((w) => w.text).join(' ');
      const chunkStart = chunkWords[0].absoluteStart;
      const chunkEnd = chunkWords[chunkWords.length - 1].absoluteEnd;
      const chunkDuration = chunkEnd - chunkStart;

      headlineChunks.push({
        id: `headline-chunk-${captionIndex}-${i}`,
        text: chunkText,
        startTime: chunkStart,
        duration: chunkDuration,
      });
    }
  });

  // Calculate total duration
  const lastChunk = headlineChunks[headlineChunks.length - 1];
  const totalDuration = lastChunk
    ? lastChunk.startTime + lastChunk.duration
    : 10;

  // Animation parameters
  const animDurationSec = params.animationDuration / 1000;
  const fadeInProgress = 0.3; // Fade in completes at 30% of animation

  // Create headline chunks
  const headlineComponents: RenderableComponentData[] = headlineChunks.map(
    (chunk, index) => {
      const headlineId = `headline-${index}`;

      // Create sweep effect (translateX + rotateY + scale + opacity)
      const sweepEffect: GenericEffectData = {
        type: 'spring',
        start: 0,
        duration: animDurationSec,
        mode: 'provider',
        targetIds: [headlineId],
        ranges: [
          // TranslateX: slide in from right (100% to 0)
          { key: 'translateX', val: 100, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },

          // RotateY: 45deg → -5deg (overshoot) → 0deg
          { key: 'rotateY', val: 45, prog: 0 },
          { key: 'rotateY', val: -5, prog: 0.7 },
          { key: 'rotateY', val: 0, prog: 1 },

          // Scale: 0.8 → 1.05 (overshoot) → 1.0
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1.05, prog: 0.7 },
          { key: 'scale', val: 1.0, prog: 1 },

          // Opacity: 0 to 1 in first 30%
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: fadeInProgress },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      const effect = {
        id: `sweep-effect-${index}`,
        componentId: 'generic',
        data: sweepEffect,
      };

      // Text atom
      const textAtomData: TextAtomData = {
        text: chunk.text,
        style: {
          fontSize: params.fontSize,
          fontWeight: fontWeight,
          color: params.textColor,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
      };

      return {
        id: headlineId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: textAtomData,
        context: {
          timing: {
            start: chunk.startTime,
            duration: chunk.duration + animDurationSec,
          },
        },
        effects: [effect],
      } as RenderableComponentData;
    },
  );

  // Container layout (lower-third positioning)
  const containerLayout: RenderableComponentData = {
    id: 'ticker-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute bottom-0 left-0 right-0`,
        style: {
          padding: `${params.bottomPadding}px ${params.sidePadding}px`,
          background: params.backgroundColor,
          backdropFilter: 'blur(4px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: headlineComponents,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [containerLayout] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Metadata
const presetMetadata: PresetMetadata = {
  id: 'NewsTicker',
  title: 'News Ticker Broadcast Graphics',
  description:
    'Dynamic news ticker-style preset with headlines rotating in from the side using Y-axis rotation (45deg to 0deg with overshoot to -5deg), mimicking CNN/ESPN lower thirds. Features slide-in from right with scale animation (0.8 to 1.0) and quick punchy fade-in. Supports caption-based headline chunks with sequential timing for continuous ticker effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'news',
    'ticker',
    'broadcast',
    'lower-third',
    'rotation',
    'sweep',
    'captions',
    'headlines',
    'cnn',
    'espn',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Breaking news: Market reaches new highs today',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Breaking',
            start: 0,
            absoluteStart: 0,
            end: 0.5,
            absoluteEnd: 0.5,
            duration: 0.5,
          },
          {
            id: 'word-2',
            text: 'news:',
            start: 0.5,
            absoluteStart: 0.5,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 0.5,
          },
          {
            id: 'word-3',
            text: 'Market',
            start: 1.0,
            absoluteStart: 1.0,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 0.5,
          },
          {
            id: 'word-4',
            text: 'reaches',
            start: 1.5,
            absoluteStart: 1.5,
            end: 2.0,
            absoluteEnd: 2.0,
            duration: 0.5,
          },
          {
            id: 'word-5',
            text: 'new',
            start: 2.0,
            absoluteStart: 2.0,
            end: 2.3,
            absoluteEnd: 2.3,
            duration: 0.3,
          },
          {
            id: 'word-6',
            text: 'highs',
            start: 2.3,
            absoluteStart: 2.3,
            end: 2.7,
            absoluteEnd: 2.7,
            duration: 0.4,
          },
          {
            id: 'word-7',
            text: 'today',
            start: 2.7,
            absoluteStart: 2.7,
            end: 3,
            absoluteEnd: 3,
            duration: 0.3,
          },
        ],
      },
    ],
    font: 'Inter:900',
    fontSize: 32,
    textColor: '#FFFFFF',
    backgroundColor:
      'linear-gradient(to right, rgba(0, 0, 0, 0.8), transparent)',
    animationDuration: 600,
    chunkSize: 4,
    gapBetweenChunks: 100,
    bottomPadding: 24,
    sidePadding: 24,
  },
};

// Export
export const NewsTickerPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
