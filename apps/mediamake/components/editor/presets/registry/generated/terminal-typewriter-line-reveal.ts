/**
 * Terminal Typewriter Line Reveal Preset
 *
 * This preset creates a terminal-style typewriter effect where entire lines of text
 * are revealed from left to right, mimicking old terminal outputs or teleprompters.
 * Each line appears instantly at full opacity but is masked/clipped initially, then
 * reveals horizontally like a wipe transition. A blinking cursor is displayed at the
 * end of each revealing line for authenticity.
 *
 * Features:
 * - **Line-by-Line Reveal**: Each line reveals left-to-right with horizontal wipe
 * - **Instant Opacity**: Lines appear at full opacity (not character-by-character fade)
 * - **Mechanical Precision**: Linear timing function (0.7s per line by default)
 * - **Blinking Cursor**: Authentic cursor animation at the end of each revealing line
 * - **Terminal Aesthetic**: Monospace font on black background with green text
 * - **Configurable Lines**: Support for any number of text lines
 *
 * Use cases:
 * - Tech-themed video content with terminal aesthetics
 * - Code demonstration or developer content
 * - Retro computing or hacker-style presentations
 * - Step-by-step instruction videos with terminal feel
 * - Command-line tutorial overlays
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  lines: z
    .array(z.string())
    .describe('Array of text lines to reveal in terminal style'),
  revealDuration: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.7)
    .describe('Duration for each line reveal in seconds (linear timing)'),
  fontSize: z
    .number()
    .min(12)
    .max(72)
    .default(18)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#00ff00')
    .describe('Text color (default: terminal green #00ff00)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (default: black #000000)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "RobotoMono:400", "CourierPrime")',
    ),
  cursorWidth: z
    .number()
    .min(2)
    .max(20)
    .default(12)
    .describe('Width of the blinking cursor in pixels'),
  cursorBlinkDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(1.2)
    .describe('Duration of cursor blink cycle in seconds'),
  lineSpacing: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .describe('Vertical spacing between lines in pixels'),
  startDelay: z
    .number()
    .min(0)
    .default(0)
    .describe('Delay before first line starts revealing (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    lines,
    revealDuration,
    fontSize,
    textColor,
    backgroundColor,
    font,
    cursorWidth,
    cursorBlinkDuration,
    lineSpacing,
    startDelay,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'CourierPrime';
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

  // Calculate total duration
  const totalDuration = startDelay + lines.length * revealDuration;

  // Build line components
  const lineComponents: RenderableComponentData[] = [];

  lines.forEach((lineText, index) => {
    const lineStartTime = startDelay + index * revealDuration;
    const lineId = `terminal-line-${index}`;
    const textId = `terminal-text-${index}`;
    const cursorId = `terminal-cursor-${index}`;

    // Line wrapper with overflow hidden for reveal effect
    const lineWrapper: RenderableComponentData = {
      id: lineId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative overflow-hidden',
          style: {
            marginBottom: index < lines.length - 1 ? `${lineSpacing}px` : '0px',
          },
        },
      },
      context: {
        timing: {
          start: lineStartTime,
          duration: revealDuration,
        },
      },
      childrenData: [
        // Text content
        {
          id: textId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: lineText,
            className: 'whitespace-nowrap',
            style: {
              fontSize: `${fontSize}px`,
              lineHeight: '1.5',
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
              duration: revealDuration,
            },
          },
          effects: [
            {
              id: `line-${index}-reveal-effect`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: revealDuration,
                mode: 'provider',
                targetIds: [textId],
                ranges: [
                  { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
                  { key: 'clipPath', val: 'inset(0 0 0 0)', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        // Blinking cursor
        {
          id: cursorId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: ${cursorWidth}px; height: ${fontSize * 1.5}px; background-color: ${textColor};"></div>`,
            className: 'absolute',
            style: {
              right: '0',
              top: '0',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: revealDuration,
            },
          },
          effects: [
            {
              id: `cursor-${index}-blink-effect`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: cursorBlinkDuration,
                loop: true,
                mode: 'provider',
                targetIds: [cursorId],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 0.5 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    };

    lineComponents.push(lineWrapper);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'terminal-typewriter-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'font-mono p-8 min-h-screen flex flex-col justify-center',
        style: {
          backgroundColor: backgroundColor,
          color: textColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: lineComponents,
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
  id: 'terminal-typewriter-line-reveal',
  title: 'Terminal Typewriter Line Reveal',
  description:
    'Line-by-line typewriter reveal effect mimicking old terminal outputs. Each line appears instantly at full opacity but is revealed left-to-right with a horizontal wipe transition (0.7s per line, linear timing). Includes a blinking cursor at the end of each revealing line for authenticity.',
  type: 'predefined',
  presetType: 'children',
  tags: ['terminal', 'typewriter', 'reveal', 'tech', 'retro', 'coding'],
  defaultInputParams: {
    lines: [
      '> Initializing system...',
      '> Loading modules...',
      '> Ready for input.',
    ],
    revealDuration: 0.7,
    fontSize: 18,
    textColor: '#00ff00',
    backgroundColor: '#000000',
    font: 'CourierPrime:400',
    cursorWidth: 12,
    cursorBlinkDuration: 1.2,
    lineSpacing: 8,
    startDelay: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const terminalTypewriterLineRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};