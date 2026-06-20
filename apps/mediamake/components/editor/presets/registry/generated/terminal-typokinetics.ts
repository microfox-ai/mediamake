/**
 * Terminal Command Typokinetics Preset
 *
 * This preset simulates command-line terminal output with instant text appearances.
 * Like editing a screencast of terminal usage, each line of text appears instantly
 * as if executed by a command. No typing animation - just immediate full-line
 * appearances with hard cuts.
 *
 * Features:
 * - **Instant Line Appearance**: Each caption line appears instantly (hard cut)
 * - **Prompt Indicators**: Prompt symbols (>, $, #) appear instantly before each line
 * - **Multi-line Support**: Each line treated as separate command output
 * - **Error Text**: Red-colored text for simulating command failures/warnings
 * - **Sequential Display**: Lines appear one after another with small gaps
 * - **Terminal Styling**: Dark background with monospace font
 * - **Optional Cursor**: Blinking cursor with configurable display
 *
 * Use cases:
 * - Command-line tutorial videos
 * - Terminal session screencasts
 * - Code execution demonstrations
 * - Developer documentation videos
 * - Technical presentation overlays
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        text: z.string().describe('Caption text content'),
        start: z.number().describe('Relative start time'),
        absoluteStart: z.number().describe('Absolute start time in video'),
        end: z.number().describe('Relative end time'),
        absoluteEnd: z.number().describe('Absolute end time in video'),
        duration: z.number().describe('Duration of the caption'),
        words: z.array(z.any()).optional(),
        metadata: z
          .object({
            isError: z
              .boolean()
              .optional()
              .describe('Whether this line is an error message'),
            promptSymbol: z
              .string()
              .optional()
              .describe('Custom prompt symbol for this line'),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences to display as terminal lines'),

  promptSymbol: z
    .enum(['>', '$', '#'])
    .default('>')
    .describe('Default prompt symbol to display before each line'),

  errorColor: z
    .string()
    .default('#ef4444')
    .describe('Color for error text (CSS color value)'),

  normalColor: z
    .string()
    .default('#d1d5db')
    .describe('Color for normal text (CSS color value)'),

  promptColor: z
    .string()
    .default('#10b981')
    .describe('Color for prompt symbols (CSS color value)'),

  backgroundColor: z
    .string()
    .default('#111827')
    .describe('Background color for terminal (CSS color value)'),

  fontSize: z
    .number()
    .default(18)
    .describe('Font size in pixels for terminal text'),

  lineGap: z
    .number()
    .default(0.1)
    .describe('Gap between lines in seconds'),

  padding: z
    .number()
    .default(16)
    .describe('Padding around terminal content in pixels'),

  showCursor: z
    .boolean()
    .default(false)
    .describe('Whether to show blinking cursor at end of each line'),

  cursorBlinkSpeed: z
    .number()
    .default(0.5)
    .describe('Speed of cursor blink in seconds (one blink cycle)'),

  font: z
    .string()
    .default('RobotoMono')
    .describe(
      'Font family for terminal text (format: "FontName:weight:style" or "FontName")',
    ),
});

// --- Preset Execution Function ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    promptSymbol,
    errorColor,
    normalColor,
    promptColor,
    backgroundColor,
    fontSize,
    lineGap,
    padding,
    showCursor,
    cursorBlinkSpeed,
    font,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'RobotoMono';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Sort captions by absoluteStart to ensure correct order
  const sortedCaptions = [...captions].sort(
    (a, b) => a.absoluteStart - b.absoluteStart,
  );

  // Calculate total duration based on last caption's absoluteEnd + lineGap
  const lastCaption = sortedCaptions[sortedCaptions.length - 1];
  const totalDuration = lastCaption
    ? lastCaption.absoluteEnd + lineGap
    : lineGap;

  // Build terminal lines
  const terminalLines: RenderableComponentData[] = [];

  sortedCaptions.forEach((caption, index) => {
    const lineId = `terminal-line-${index}`;
    const isError = caption.metadata?.isError ?? false;
    const linePrompt = caption.metadata?.promptSymbol ?? promptSymbol;
    const textColor = isError ? errorColor : normalColor;

    // Create line container (appears instantly at caption's absoluteStart)
    const lineContainer: RenderableComponentData = {
      id: lineId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex items-start mb-1',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [
        // Prompt symbol
        {
          id: `${lineId}-prompt`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: linePrompt,
            className: 'mr-2',
            style: {
              color: promptColor,
              fontSize: fontSize,
              fontFamily: fontFamily,
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
              duration: caption.duration,
            },
          },
        },
        // Text content
        {
          id: `${lineId}-text`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: caption.text,
            className: 'flex-1',
            style: {
              color: textColor,
              fontSize: fontSize,
              fontFamily: fontFamily,
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
              duration: caption.duration,
            },
          },
        },
        // Optional cursor
        ...(showCursor
          ? [
              {
                id: `${lineId}-cursor`,
                type: 'atom',
                componentId: 'HTMLBlockAtom',
                data: {
                  html: `<div class="inline-block w-2 h-4 ml-1" style="background-color: ${promptColor};"></div>`,
                  className: '',
                },
                context: {
                  timing: {
                    start: 0,
                    duration: caption.duration,
                  },
                },
                effects: [
                  {
                    id: `${lineId}-cursor-blink`,
                    componentId: 'generic',
                    data: {
                      type: 'linear',
                      start: 0,
                      duration: caption.duration,
                      mode: 'provider',
                      targetIds: [`${lineId}-cursor`],
                      ranges: [
                        { key: 'opacity', val: 1, prog: 0 },
                        {
                          key: 'opacity',
                          val: 0,
                          prog: cursorBlinkSpeed / (caption.duration * 2),
                        },
                        {
                          key: 'opacity',
                          val: 1,
                          prog: cursorBlinkSpeed / caption.duration,
                        },
                        {
                          key: 'opacity',
                          val: 0,
                          prog:
                            (cursorBlinkSpeed * 1.5) / caption.duration >
                            0.75
                              ? 0.75
                              : (cursorBlinkSpeed * 1.5) / caption.duration,
                        },
                        { key: 'opacity', val: 1, prog: 1 },
                      ],
                    },
                  },
                ],
              } as RenderableComponentData,
            ]
          : []),
      ],
      effects: [
        // Instant opacity transition (0 -> 1 in 0.001s)
        {
          id: `${lineId}-instant-appear`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.001,
            mode: 'provider',
            targetIds: [lineId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };

    terminalLines.push(lineContainer);
  });

  // Build lines wrapper
  const linesWrapper: RenderableComponentData = {
    id: 'terminal-lines-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: terminalLines,
  };

  // Build root terminal container
  const rootContainer: RenderableComponentData = {
    id: 'terminal-typokinetics-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'font-mono overflow-auto h-full',
        style: {
          backgroundColor: backgroundColor,
          padding: `${padding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [linesWrapper],
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
  id: 'terminal-typokinetics',
  title: 'Terminal Command Typokinetics',
  description:
    'Simulates command-line terminal output with instant text appearances. Each caption line appears instantly as a separate command output with prompt indicators (>, $, #). Supports error text in red for simulating command failures. No typing animation - just hard cuts and immediate full-line appearances.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'terminal',
    'command-line',
    'typokinetics',
    'instant',
    'hard-cut',
    'captions',
    'monospace',
    'developer',
    'code',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        text: 'npm install @microfox/remotion',
        start: 0,
        absoluteStart: 0,
        end: 2,
        absoluteEnd: 2,
        duration: 2,
        metadata: {
          promptSymbol: '$',
        },
      },
      {
        text: 'added 142 packages in 3.2s',
        start: 0,
        absoluteStart: 2.1,
        end: 1.9,
        absoluteEnd: 4,
        duration: 1.9,
      },
      {
        text: 'npm run build',
        start: 0,
        absoluteStart: 4.1,
        end: 2.5,
        absoluteEnd: 6.6,
        duration: 2.5,
        metadata: {
          promptSymbol: '$',
        },
      },
      {
        text: 'ERROR: Build failed - missing dependencies',
        start: 0,
        absoluteStart: 6.7,
        end: 2.5,
        absoluteEnd: 9.2,
        duration: 2.5,
        metadata: {
          isError: true,
          promptSymbol: '#',
        },
      },
    ],
    promptSymbol: '>',
    errorColor: '#ef4444',
    normalColor: '#d1d5db',
    promptColor: '#10b981',
    backgroundColor: '#111827',
    fontSize: 18,
    lineGap: 0.1,
    padding: 16,
    showCursor: false,
    cursorBlinkSpeed: 0.5,
    font: 'RobotoMono',
  },
};

// --- Preset Export ---

export const terminalTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
