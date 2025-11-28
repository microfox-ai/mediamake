/**
 * Documentary Interview Lower Third Preset
 *
 * This preset creates a sophisticated documentary-style lower third system with material design
 * elevation, speaker identification, contextual information, timeline indicator, and keyword emphasis.
 * 
 * Features:
 * - **Material Design Elevation**: Card container lifts off background with realistic shadow progression
 * - **Speaker Information**: Displays speaker name, title, and contextual details with serif typography
 * - **Timeline Indicator**: Progress bar showing speaking duration with time display
 * - **Keyword Emphasis**: Subtle animations for keywords extracted from caption data
 * - **Editorial Pacing**: Smooth entrance animation settling into locked position for frame stability
 * - **Journalistic Design**: Clean, professional aesthetic suitable for Ken Burns documentaries or true crime series
 *
 * Use cases:
 * - Documentary interview segments with speaker identification
 * - True crime series with witness testimonials
 * - Educational content with expert commentary
 * - Professional video interviews
 * - News segments and investigative journalism
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

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
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            keyword: z.string().optional(),
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  speakerName: z.string().describe('Name of the speaker (e.g., "Dr. Jane Smith")'),

  speakerTitle: z
    .string()
    .optional()
    .describe('Professional title or credential (e.g., "Professor of History")'),

  contextInfo: z
    .string()
    .optional()
    .describe('Additional context (e.g., "Interviewed June 2024" or "New York City")'),

  position: z
    .enum(['bottom', 'top'])
    .default('bottom')
    .optional()
    .describe('Position of the lower third container'),

  fontSize: z
    .number()
    .min(12)
    .max(48)
    .default(16)
    .optional()
    .describe('Base font size for caption text in pixels'),

  textColor: z
    .string()
    .default('#1F2937')
    .optional()
    .describe('Color for caption text (default: gray-900)'),

  keywordColor: z
    .string()
    .default('#DC2626')
    .optional()
    .describe('Color for emphasized keywords (default: red-600)'),

  primaryFont: z
    .string()
    .default('Playfair Display:700')
    .optional()
    .describe('Font for speaker name (format: "FontFamily:weight:style")'),

  secondaryFont: z
    .string()
    .default('Inter:400')
    .optional()
    .describe('Font for title and context (format: "FontFamily:weight:style")'),

  showTimeline: z
    .boolean()
    .default(true)
    .optional()
    .describe('Whether to show the timeline progress indicator'),

  entranceDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0)
    .optional()
    .describe('Delay before entrance animation starts (seconds)'),

  entranceDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.7)
    .optional()
    .describe('Duration of entrance animation (seconds)'),

  negativeOffset: z
    .number()
    .min(0)
    .max(2)
    .default(0)
    .optional()
    .describe('Start lower third slightly before caption timing (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    speakerName,
    speakerTitle,
    contextInfo,
    position = 'bottom',
    fontSize = 16,
    textColor = '#1F2937',
    keywordColor = '#DC2626',
    primaryFont = 'Playfair Display:700',
    secondaryFont = 'Inter:400',
    showTimeline = true,
    entranceDelay = 0,
    entranceDuration = 0.7,
    negativeOffset = 0,
  } = params;

  // Parse font strings
  const parseFontString = (fontString: string) => {
    const [family, weight, style] = fontString.split(':');
    return {
      family: family || 'Inter',
      weight: weight || '400',
      style: style || 'normal',
    };
  };

  const primaryFontParsed = parseFontString(primaryFont);
  const secondaryFontParsed = parseFontString(secondaryFont);

  // Calculate total duration across all captions
  const firstCaption = captions[0];
  const lastCaption = captions[captions.length - 1];
  const totalStartTime = firstCaption.absoluteStart - negativeOffset;
  const totalEndTime = lastCaption.absoluteEnd;
  const totalDuration = totalEndTime - totalStartTime;

  // Create speaker information section
  const speakerInfoChildren: RenderableComponentData[] = [
    // Speaker name
    {
      id: 'speaker-name-text',
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: speakerName,
        className: 'text-3xl font-serif text-gray-900',
        style: {
          fontWeight: primaryFontParsed.weight,
          fontStyle: primaryFontParsed.style,
        },
        font: {
          family: primaryFontParsed.family,
          weights: [primaryFontParsed.weight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    },
  ];

  // Add speaker title if provided
  if (speakerTitle) {
    speakerInfoChildren.push({
      id: 'speaker-title-text',
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: speakerTitle,
        className: 'text-lg text-gray-600',
        style: {
          fontWeight: secondaryFontParsed.weight,
          fontStyle: secondaryFontParsed.style,
        },
        font: {
          family: secondaryFontParsed.family,
          weights: [secondaryFontParsed.weight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    });
  }

  // Add context info if provided
  if (contextInfo) {
    speakerInfoChildren.push({
      id: 'context-info-text',
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: contextInfo,
        className: 'text-sm text-gray-500 italic',
        style: {
          fontWeight: secondaryFontParsed.weight,
          fontStyle: 'italic',
        },
        font: {
          family: secondaryFontParsed.family,
          weights: [secondaryFontParsed.weight],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    });
  }

  // Speaker info container
  const speakerInfoContainer: RenderableComponentData = {
    id: 'speaker-info-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col gap-2 mb-4',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: speakerInfoChildren,
  };

  // Create caption words with keyword emphasis
  const captionWordsChildren: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const keyword = caption.metadata?.keyword?.toLowerCase();

    caption.words.forEach((word, wordIndex) => {
      const wordId = `caption-word-${captionIndex}-${wordIndex}`;
      const isKeyword =
        keyword && word.text.toLowerCase().includes(keyword);

      // Base word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'text-base',
          style: {
            fontSize: `${fontSize}px`,
            color: isKeyword ? keywordColor : textColor,
            fontWeight: isKeyword ? '600' : '400',
            marginRight: '0.3em',
          },
          font: {
            family: secondaryFontParsed.family,
            weights: isKeyword ? ['600', '400'] : ['400'],
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart - totalStartTime,
            duration: caption.duration,
          },
        },
      };

      // Add keyword emphasis effect
      if (isKeyword) {
        const keywordEffect = {
          id: `keyword-emphasis-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: word.start,
            duration: 0.3,
            mode: 'provider' as const,
            targetIds: [wordId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.05, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        };
        wordComponent.effects = [keywordEffect];
      }

      captionWordsChildren.push(wordComponent);
    });
  });

  // Caption words container
  const captionWordsContainer: RenderableComponentData = {
    id: 'caption-words-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-wrap gap-1 mt-4',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: captionWordsChildren,
  };

  // Timeline indicator components
  const timelineChildren: RenderableComponentData[] = [];

  if (showTimeline) {
    // Timeline progress bar
    const progressBarId = 'timeline-progress-bar';
    const progressBar: RenderableComponentData = {
      id: progressBarId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'h-full bg-gray-900 rounded-full',
          style: {
            transformOrigin: 'left center',
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
          id: 'timeline-progress-effect',
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: 0,
            duration: totalDuration,
            mode: 'provider' as const,
            targetIds: [progressBarId],
            ranges: [
              { key: 'scaleX', val: 0, prog: 0 },
              { key: 'scaleX', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };

    // Timeline track
    const timelineTrack: RenderableComponentData = {
      id: 'timeline-track',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'h-1 bg-gray-200 rounded-full overflow-hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [progressBar],
    };

    timelineChildren.push(timelineTrack);

    // Timeline time indicator
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const timeIndicator: RenderableComponentData = {
      id: 'timeline-progress-indicator',
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: `0:00 / ${formatTime(totalDuration)}`,
        className: 'text-xs text-gray-400 mt-1 text-right',
        font: {
          family: secondaryFontParsed.family,
          weights: ['400'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    };

    timelineChildren.push(timeIndicator);
  }

  // Timeline container
  const timelineContainer: RenderableComponentData = {
    id: 'timeline-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'mt-4',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: timelineChildren,
  };

  // Elevated card container
  const elevatedCardId = 'elevated-card-container';
  const elevatedCardContainer: RenderableComponentData = {
    id: elevatedCardId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'bg-white/95 backdrop-blur-md rounded-t-2xl p-6',
        style: {
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
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
      speakerInfoContainer,
      captionWordsContainer,
      ...(showTimeline ? [timelineContainer] : []),
    ],
    effects: [
      // Entrance animation - translateY
      {
        id: 'entrance-slide-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: entranceDelay,
          duration: entranceDuration,
          mode: 'provider' as const,
          targetIds: [elevatedCardId],
          ranges: [
            { key: 'translateY', val: '100%', prog: 0 },
            { key: 'translateY', val: '0%', prog: 1 },
          ],
        },
      },
      // Shadow progression
      {
        id: 'entrance-shadow-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: entranceDelay,
          duration: entranceDuration,
          mode: 'provider' as const,
          targetIds: [elevatedCardId],
          ranges: [
            {
              key: 'filter',
              val: 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))',
              prog: 0,
            },
            {
              key: 'filter',
              val: 'drop-shadow(0 10px 15px rgb(0 0 0 / 0.1))',
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'drop-shadow(0 20px 25px rgb(0 0 0 / 0.15))',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'documentary-lower-third-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute ${position === 'bottom' ? 'bottom-0' : 'top-0'} left-0 right-0 p-8`,
      },
    },
    context: {
      timing: {
        start: totalStartTime,
        duration: totalDuration,
      },
    },
    childrenData: [elevatedCardContainer],
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
  id: 'documentaryInterviewLowerThird',
  title: 'Documentary Interview Lower Third',
  description:
    'A sophisticated documentary-style lower third system with material design elevation, speaker identification, contextual information, timeline indicator, and keyword emphasis. Features entrance animation with shadow progression, locked frame stability after reveal, and editorial pacing suitable for Ken Burns documentaries or true crime series. Text provides essential information without disrupting the visual narrative.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'documentary',
    'interview',
    'lower-third',
    'captions',
    'speaker',
    'timeline',
    'editorial',
    'journalism',
    'material-design',
    'elevation',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'This is a documentary interview caption.',
        start: 0,
        absoluteStart: 5,
        end: 3,
        absoluteEnd: 8,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'This',
            start: 0,
            absoluteStart: 5,
            end: 0.3,
            absoluteEnd: 5.3,
            duration: 0.3,
          },
          {
            id: 'word-2',
            text: 'is',
            start: 0.3,
            absoluteStart: 5.3,
            end: 0.5,
            absoluteEnd: 5.5,
            duration: 0.2,
          },
          {
            id: 'word-3',
            text: 'a',
            start: 0.5,
            absoluteStart: 5.5,
            end: 0.7,
            absoluteEnd: 5.7,
            duration: 0.2,
          },
          {
            id: 'word-4',
            text: 'documentary',
            start: 0.7,
            absoluteStart: 5.7,
            end: 1.5,
            absoluteEnd: 6.5,
            duration: 0.8,
          },
          {
            id: 'word-5',
            text: 'interview',
            start: 1.5,
            absoluteStart: 6.5,
            end: 2.2,
            absoluteEnd: 7.2,
            duration: 0.7,
          },
          {
            id: 'word-6',
            text: 'caption.',
            start: 2.2,
            absoluteStart: 7.2,
            end: 3,
            absoluteEnd: 8,
            duration: 0.8,
          },
        ],
        metadata: {
          keyword: 'documentary',
        },
      },
    ],
    speakerName: 'Dr. Jane Smith',
    speakerTitle: 'Professor of History',
    contextInfo: 'Interviewed June 2024',
    position: 'bottom',
    fontSize: 16,
    textColor: '#1F2937',
    keywordColor: '#DC2626',
    primaryFont: 'Playfair Display:700',
    secondaryFont: 'Inter:400',
    showTimeline: true,
    entranceDelay: 0,
    entranceDuration: 0.7,
    negativeOffset: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const documentaryInterviewLowerThirdPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
