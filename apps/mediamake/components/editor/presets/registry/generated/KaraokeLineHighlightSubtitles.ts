/**
 * Karaoke Line Highlight Subtitles Preset
 *
 * This preset creates karaoke-style subtitles that highlight entire lines as they are spoken,
 * with a smooth progress bar animating underneath. Perfect for sing-along content, language
 * learning, or engaging subtitle experiences.
 *
 * Features:
 * - **Line-Level Highlighting**: Displays one full sentence at a time with a semi-transparent backdrop
 * - **Progress Bar Animation**: Visual indicator showing playback progress through the current line
 * - **Smooth Transitions**: Fade-in/fade-out effects between lines for professional appearance
 * - **Customizable Styling**: Font family, size, colors, and positioning options
 * - **Backdrop Effects**: Optional blur and transparency for better readability
 *
 * Use Cases:
 * - Karaoke videos with lyric highlighting
 * - Educational content with line-by-line narration tracking
 * - Podcast episodes with visual speech progress indicators
 * - Music videos with synchronized lyric display
 *
 * The preset reads transcription data with word-level timing and groups words into sentences,
 * displaying each sentence with a progress bar that fills from left to right as the line is spoken.
 */

import { z } from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';

// ============================
// PARAMS SCHEMA
// ============================

const presetParams = z.object({
  // Caption data
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(
          z.object({
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
          }),
        ),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .describe('Array of caption objects with word-level timing'),

  // Styling options
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the subtitle text'),
  fontSize: z
    .number()
    .default(48)
    .describe('Font size in pixels for the subtitle text'),
  fontWeight: z
    .string()
    .default('bold')
    .describe('Font weight (normal, bold, etc.)'),
  textColor: z.string().default('#FFFFFF').describe('Text color (hex format)'),

  // Layout options
  position: z
    .enum(['bottom', 'top', 'center'])
    .default('bottom')
    .describe('Vertical position of subtitles on screen'),
  bottomOffset: z
    .number()
    .default(80)
    .describe('Offset from bottom edge in pixels (when position is bottom)'),
  topOffset: z
    .number()
    .default(80)
    .describe('Offset from top edge in pixels (when position is top)'),

  // Background styling
  showBackdrop: z
    .boolean()
    .default(true)
    .describe('Show semi-transparent backdrop behind text'),
  backdropColor: z
    .string()
    .default('rgba(0, 0, 0, 0.6)')
    .describe('Backdrop background color with alpha'),
  backdropBlur: z
    .boolean()
    .default(true)
    .describe('Apply backdrop blur effect'),
  backdropPadding: z
    .number()
    .default(24)
    .describe('Padding around text inside backdrop (pixels)'),
  backdropRadius: z
    .number()
    .default(12)
    .describe('Border radius of backdrop container (pixels)'),

  // Progress bar styling
  progressBarHeight: z
    .number()
    .default(8)
    .describe('Height of progress bar in pixels'),
  progressBarBackground: z
    .string()
    .default('rgba(255, 255, 255, 0.2)')
    .describe('Background color of progress bar track'),
  progressBarFillStart: z
    .string()
    .default('#60A5FA')
    .describe('Start color of progress bar gradient'),
  progressBarFillEnd: z
    .string()
    .default('#A855F7')
    .describe('End color of progress bar gradient'),
  progressBarRadius: z
    .number()
    .default(999)
    .describe('Border radius of progress bar (use 999 for fully rounded)'),

  // Animation options
  transitionDuration: z
    .number()
    .default(0.2)
    .describe('Duration of fade-in/fade-out transitions in seconds'),
  gapBetweenTextAndBar: z
    .number()
    .default(12)
    .describe('Vertical gap between text and progress bar (pixels)'),

  // Advanced options
  maxWidth: z
    .number()
    .default(1024)
    .describe('Maximum width of subtitle container (pixels)'),
});

// ============================
// PRESET EXECUTION
// ============================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontFamily,
    fontSize,
    fontWeight,
    textColor,
    position,
    bottomOffset,
    topOffset,
    showBackdrop,
    backdropColor,
    backdropBlur,
    backdropPadding,
    backdropRadius,
    progressBarHeight,
    progressBarBackground,
    progressBarFillStart,
    progressBarFillEnd,
    progressBarRadius,
    transitionDuration,
    gapBetweenTextAndBar,
    maxWidth,
  } = params;

  // Helper: Create position classes based on position parameter
  const getPositionClasses = (): string => {
    if (position === 'bottom') {
      return 'absolute inset-x-0 bottom-0 flex items-end justify-center';
    } else if (position === 'top') {
      return 'absolute inset-x-0 top-0 flex items-start justify-center';
    } else {
      return 'absolute inset-0 flex items-center justify-center';
    }
  };

  const getPositionStyle = (): Record<string, any> => {
    if (position === 'bottom') {
      return { paddingBottom: `${bottomOffset}px` };
    } else if (position === 'top') {
      return { paddingTop: `${topOffset}px` };
    }
    return {};
  };

  // Build line components for each caption
  const lineComponents = captions.map((caption) => {
    const lineId = `karaoke-line-${caption.id}`;
    const textId = `${lineId}-text`;
    const progressContainerId = `${lineId}-progress-container`;
    const progressFillId = `${lineId}-progress-fill`;

    // Create text component
    const textComponent = {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: caption.text,
        font: {
          family: fontFamily,
          weight: fontWeight,
        },
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
          textAlign: 'center',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
    };

    // Text container (with optional backdrop)
    const textContainerData: any = {
      containerProps: {
        className: showBackdrop
          ? `relative rounded-lg ${backdropBlur ? 'backdrop-blur-sm' : ''}`
          : 'relative',
        style: {
          padding: showBackdrop ? `${backdropPadding}px` : undefined,
          backgroundColor: showBackdrop ? backdropColor : undefined,
          borderRadius: showBackdrop ? `${backdropRadius}px` : undefined,
        },
      },
    };

    const textContainer = {
      id: `${lineId}-text-container`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: textContainerData,
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      childrenData: [textComponent],
    };

    // Progress bar fill component (ShapeAtom)
    const progressFill = {
      id: progressFillId,
      type: 'atom' as const,
      componentId: 'ShapeAtom',
      data: {
        shapeType: 'rectangle',
        width: '100%',
        height: '100%',
        fill: `linear-gradient(90deg, ${progressBarFillStart} 0%, ${progressBarFillEnd} 100%)`,
        style: {
          borderRadius: `${progressBarRadius}px`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      effects: [
        {
          id: `${progressFillId}-effect`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: caption.duration,
            mode: 'provider',
            targetIds: [progressFillId],
            ranges: [
              { key: 'width', val: '0%', prog: 0 },
              { key: 'width', val: '100%', prog: 1 },
            ],
          },
        },
      ],
    };

    // Progress bar container
    const progressBarContainer = {
      id: progressContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative overflow-hidden',
          style: {
            width: '100%',
            height: `${progressBarHeight}px`,
            backgroundColor: progressBarBackground,
            borderRadius: `${progressBarRadius}px`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      childrenData: [progressFill],
    };

    // Subtitle container (text + progress bar)
    const subtitleContainer = {
      id: `${lineId}-subtitle-container`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-col items-center',
          style: {
            gap: `${gapBetweenTextAndBar}px`,
            maxWidth: `${maxWidth}px`,
            width: '100%',
            paddingLeft: '32px',
            paddingRight: '32px',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      childrenData: [textContainer, progressBarContainer],
      effects: [
        // Fade-in at start
        {
          id: `${lineId}-fade-in`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`${lineId}-subtitle-container`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Fade-out at end
        {
          id: `${lineId}-fade-out`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: caption.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`${lineId}-subtitle-container`],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    // Line wrapper (positioned at absoluteStart)
    const lineWrapper = {
      id: lineId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex items-center justify-center',
          style: {
            width: '100%',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [subtitleContainer],
    };

    return lineWrapper;
  });

  // Root container
  const rootContainer = {
    id: 'karaoke-line-highlight-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: getPositionClasses(),
        style: getPositionStyle(),
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          captions.length > 0
            ? Math.max(...captions.map((c) => c.absoluteEnd))
            : 10,
      },
    },
    childrenData: lineComponents,
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

// ============================
// PRESET METADATA
// ============================

const presetMetadata: PresetMetadata = {
  id: 'KaraokeLineHighlightSubtitles',
  title: 'Karaoke Line Highlight Subtitles',
  description:
    'Highlights the entire line as it is spoken with a trailing progress bar under the text. Perfect for karaoke-style subtitles that show which line is currently being sung with visual progress indication.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'karaoke',
    'line-highlight',
    'progress-bar',
    'lyrics',
    'synchronized',
    'animated',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Welcome to karaoke style subtitles',
        start: 0,
        end: 3.0,
        duration: 3.0,
        absoluteStart: 0,
        absoluteEnd: 3.0,
        words: [
          {
            text: 'Welcome',
            start: 0,
            end: 0.5,
            duration: 0.5,
            absoluteStart: 0,
            absoluteEnd: 0.5,
          },
          {
            text: 'to',
            start: 0.5,
            end: 0.7,
            duration: 0.2,
            absoluteStart: 0.5,
            absoluteEnd: 0.7,
          },
          {
            text: 'karaoke',
            start: 0.7,
            end: 1.3,
            duration: 0.6,
            absoluteStart: 0.7,
            absoluteEnd: 1.3,
          },
          {
            text: 'style',
            start: 1.3,
            end: 1.8,
            duration: 0.5,
            absoluteStart: 1.3,
            absoluteEnd: 1.8,
          },
          {
            text: 'subtitles',
            start: 1.8,
            end: 3.0,
            duration: 1.2,
            absoluteStart: 1.8,
            absoluteEnd: 3.0,
          },
        ],
      },
      {
        id: 'caption-2',
        text: 'Watch the progress bar fill as the line plays',
        start: 0,
        end: 3.5,
        duration: 3.5,
        absoluteStart: 3.5,
        absoluteEnd: 7.0,
        words: [
          {
            text: 'Watch',
            start: 0,
            end: 0.4,
            duration: 0.4,
            absoluteStart: 3.5,
            absoluteEnd: 3.9,
          },
          {
            text: 'the',
            start: 0.4,
            end: 0.6,
            duration: 0.2,
            absoluteStart: 3.9,
            absoluteEnd: 4.1,
          },
          {
            text: 'progress',
            start: 0.6,
            end: 1.3,
            duration: 0.7,
            absoluteStart: 4.1,
            absoluteEnd: 4.8,
          },
          {
            text: 'bar',
            start: 1.3,
            end: 1.7,
            duration: 0.4,
            absoluteStart: 4.8,
            absoluteEnd: 5.2,
          },
          {
            text: 'fill',
            start: 1.7,
            end: 2.1,
            duration: 0.4,
            absoluteStart: 5.2,
            absoluteEnd: 5.6,
          },
          {
            text: 'as',
            start: 2.1,
            end: 2.3,
            duration: 0.2,
            absoluteStart: 5.6,
            absoluteEnd: 5.8,
          },
          {
            text: 'the',
            start: 2.3,
            end: 2.5,
            duration: 0.2,
            absoluteStart: 5.8,
            absoluteEnd: 6.0,
          },
          {
            text: 'line',
            start: 2.5,
            end: 2.9,
            duration: 0.4,
            absoluteStart: 6.0,
            absoluteEnd: 6.4,
          },
          {
            text: 'plays',
            start: 2.9,
            end: 3.5,
            duration: 0.6,
            absoluteStart: 6.4,
            absoluteEnd: 7.0,
          },
        ],
      },
    ],
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: 'bold',
    textColor: '#FFFFFF',
    position: 'bottom',
    bottomOffset: 80,
    topOffset: 80,
    showBackdrop: true,
    backdropColor: 'rgba(0, 0, 0, 0.6)',
    backdropBlur: true,
    backdropPadding: 24,
    backdropRadius: 12,
    progressBarHeight: 8,
    progressBarBackground: 'rgba(255, 255, 255, 0.2)',
    progressBarFillStart: '#60A5FA',
    progressBarFillEnd: '#A855F7',
    progressBarRadius: 999,
    transitionDuration: 0.2,
    gapBetweenTextAndBar: 12,
    maxWidth: 1024,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================
// EXPORT
// ============================

export const KaraokeLineHighlightSubtitlesPreset = {
  id: presetMetadata.id,
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
