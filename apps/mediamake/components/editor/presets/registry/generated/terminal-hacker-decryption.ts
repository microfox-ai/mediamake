/**
 * Terminal Hacker Decryption Typography Preset
 *
 * A retro terminal-inspired typography preset featuring phosphor green/amber monochrome aesthetics,
 * matrix rain background, decryption text reveal effects where characters scramble before resolving,
 * blinking cursor, scan lines, phosphor bloom glow, system alert boxes with ASCII box-drawing characters,
 * and authentic buffer overflow corruption effects. Includes lag spike simulation for vintage hardware feel.
 *
 * Features:
 * - Phosphor green/amber monochrome terminal aesthetic
 * - Matrix rain background with falling ASCII characters
 * - Decryption text reveal where characters scramble then resolve
 * - Blinking terminal cursor
 * - CRT scan lines overlay
 * - Phosphor bloom glow on text
 * - System alert boxes with ASCII box-drawing characters
 * - Buffer overflow corruption effects
 * - Lag spike simulation for authentic vintage hardware feel
 *
 * Use cases:
 * - Tech/hacker themed videos
 * - Cybersecurity content
 * - Retro computing aesthetics
 * - Dramatic text reveals with technical flair
 * - Gaming/esports titles with hacker aesthetic
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

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        text: z.string().describe('Caption text to display'),
        absoluteStart: z.number().describe('Absolute start time in seconds'),
        duration: z.number().describe('Duration in seconds'),
        absoluteEnd: z.number().describe('Absolute end time in seconds'),
        words: z
          .array(
            z.object({
              text: z.string(),
              start: z.number(),
              absoluteStart: z.number(),
              end: z.number(),
              absoluteEnd: z.number(),
              duration: z.number(),
            }),
          )
          .optional(),
      }),
    )
    .describe('Array of captions to display with decryption effect'),
  terminalColor: z
    .enum(['green', 'amber'])
    .default('green')
    .optional()
    .describe('Terminal phosphor color (green or amber)'),
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .optional()
    .describe('Font size for text in pixels'),
  fontFamily: z
    .string()
    .default('IBM Plex Mono')
    .optional()
    .describe(
      'Monospace font family (e.g., "IBM Plex Mono", "Fira Code", "Courier New")',
    ),
  decryptionSpeed: z
    .number()
    .min(20)
    .max(200)
    .default(50)
    .optional()
    .describe('Speed of character swapping in milliseconds (lower = faster)'),
  glowIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .optional()
    .describe('Intensity of phosphor glow effect (0-3)'),
  showMatrixRain: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable matrix rain background effect'),
  showScanlines: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable CRT scanline overlay'),
  showCursor: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable blinking terminal cursor'),
  showSystemAlerts: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable random system alert animations'),
  showBufferOverflow: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable buffer overflow corruption effects'),
  lagSpikeFrequency: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .optional()
    .describe('Frequency of lag spikes (0 = none, 1 = frequent)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    terminalColor = 'green',
    fontSize = 48,
    fontFamily = 'IBM Plex Mono',
    decryptionSpeed = 50,
    glowIntensity = 1,
    showMatrixRain = true,
    showScanlines = true,
    showCursor = true,
    showSystemAlerts = true,
    showBufferOverflow = true,
    lagSpikeFrequency = 0.1,
  } = params;

  // Color palette based on terminal type
  const colorPalette =
    terminalColor === 'green'
      ? {
          primary: '#00ff00',
          secondary: '#00cc00',
          tertiary: '#00ff00',
          glow: '#00ff00',
        }
      : {
          primary: '#ffb000',
          secondary: '#ff9900',
          tertiary: '#ffcc00',
          glow: '#ffb000',
        };

  // Helper: Generate random ASCII character
  const getRandomChar = (): string => {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
    return chars[Math.floor(Math.random() * chars.length)];
  };

  // Helper: Generate matrix rain stream text
  const generateMatrixStream = (length: number): string => {
    let stream = '';
    for (let i = 0; i < length; i++) {
      stream += getRandomChar();
    }
    return stream;
  };

  // Helper: Generate ASCII box border
  const generateBoxBorder = (width: number, char: string): string => {
    return char.repeat(width);
  };

  // Create matrix rain columns (if enabled)
  const matrixColumns: RenderableComponentData[] = [];
  if (showMatrixRain) {
    const columnCount = 12;
    for (let i = 0; i < columnCount; i++) {
      const columnId = `matrix-column-${i}`;
      const streamText = generateMatrixStream(30);
      const leftPosition = (i / columnCount) * 100;

      matrixColumns.push({
        id: columnId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute top-0',
            style: {
              left: `${leftPosition}%`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 999, // Long duration for entire video
          },
        },
        childrenData: [
          {
            id: `${columnId}-text`,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: streamText,
              className: 'text-green-400',
              style: {
                fontSize: 14,
                textShadow: `0 0 ${8 * glowIntensity}px ${colorPalette.glow}`,
                writingMode: 'vertical-rl' as any,
                opacity: 0.5,
                fontFamily: fontFamily,
              },
              font: {
                family: fontFamily,
                weights: ['400'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: 999,
              },
            },
            effects: [
              {
                id: `${columnId}-fall`,
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: 10 + Math.random() * 5,
                  mode: 'provider',
                  targetIds: [`${columnId}-text`],
                  ranges: [
                    { key: 'translateY', val: -200, prog: 0 },
                    { key: 'translateY', val: 1200, prog: 1 },
                  ],
                } as GenericEffectData,
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData);
    }
  }

  // Create scanline overlay (if enabled)
  const scanlineOverlay: RenderableComponentData | null = showScanlines
    ? ({
        id: 'scanline-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none z-50',
            style: {
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.3) 2px, rgba(0, 0, 0, 0.3) 4px)',
              backgroundSize: '100% 4px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 999,
          },
        },
        childrenData: [],
      } as RenderableComponentData)
    : null;

  // Create caption components with decryption effects
  const captionComponents: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionId = `caption-${captionIndex}`;
    const words = caption.words || [
      {
        text: caption.text,
        start: 0,
        absoluteStart: caption.absoluteStart,
        end: caption.duration,
        absoluteEnd: caption.absoluteEnd,
        duration: caption.duration,
      },
    ];

    const wordComponents: RenderableComponentData[] = [];

    words.forEach((word, wordIndex) => {
      const wordId = `${captionId}-word-${wordIndex}`;
      const decryptDuration = Math.min(
        word.duration * 0.5,
        decryptionSpeed / 1000,
      );

      // Create decryption effect: start with random chars, resolve to final text
      const decryptEffect: GenericEffectData = {
        type: 'linear',
        start: word.start,
        duration: decryptDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.2 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      wordComponents.push({
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: fontSize,
            color: colorPalette.primary,
            fontWeight: 'bold',
            textShadow: `0 0 ${10 * glowIntensity}px ${colorPalette.glow}, 0 0 ${20 * glowIntensity}px ${colorPalette.glow}, 0 0 ${30 * glowIntensity}px ${colorPalette.glow}`,
            marginRight: '0.5em',
            fontFamily: fontFamily,
          },
          font: {
            family: fontFamily,
            weights: ['400', '700'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `${wordId}-decrypt`,
            componentId: 'generic',
            data: decryptEffect,
          },
        ],
      } as RenderableComponentData);
    });

    // Caption container
    captionComponents.push({
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative z-10 flex flex-wrap justify-center items-center',
          style: {
            gap: '0.3em',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData);
  });

  // Create blinking cursor (if enabled)
  const cursorComponent: RenderableComponentData | null = showCursor
    ? ({
        id: 'terminal-cursor',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute z-20',
            style: {
              width: '12px',
              height: '24px',
              backgroundColor: colorPalette.primary,
              bottom: '20%',
              right: '10%',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 999,
          },
        },
        childrenData: [],
        effects: [
          {
            id: 'cursor-blink',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: 1,
              mode: 'provider',
              targetIds: ['terminal-cursor'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 0.5 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData)
    : null;

  // Create system alert box (if enabled) - appears randomly
  const systemAlertComponent: RenderableComponentData | null = showSystemAlerts
    ? ({
        id: 'system-alert-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'absolute inset-0 z-30 pointer-events-none flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 999,
          },
        },
        childrenData: [
          {
            id: 'alert-box',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative',
                style: {
                  border: `2px solid ${colorPalette.primary}`,
                  padding: '20px 40px',
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: 999,
              },
            },
            childrenData: [
              {
                id: 'alert-text',
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: '⚠ SYSTEM ALERT ⚠',
                  style: {
                    fontSize: 24,
                    color: '#ff0000',
                    fontWeight: 'bold',
                    textShadow: '0 0 15px #ff0000',
                    fontFamily: fontFamily,
                  },
                  font: {
                    family: fontFamily,
                    weights: ['700'],
                  },
                } as TextAtomData,
                context: {
                  timing: {
                    start: 0,
                    duration: 999,
                  },
                },
              } as RenderableComponentData,
            ],
            effects: [
              {
                id: 'alert-flash',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 5,
                  duration: 0.5,
                  mode: 'provider',
                  targetIds: ['alert-box'],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 0.1 },
                    { key: 'opacity', val: 0, prog: 0.9 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                } as GenericEffectData,
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData)
    : null;

  // Create buffer overflow overlay (if enabled)
  const bufferOverflowComponent: RenderableComponentData | null =
    showBufferOverflow
      ? ({
          id: 'buffer-overflow-overlay',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className:
                'absolute inset-0 z-40 pointer-events-none flex items-center justify-center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: 999,
            },
          },
          childrenData: [
            {
              id: 'corruption-text',
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: '█▓▒░ BUFFER OVERFLOW ░▒▓█',
                style: {
                  fontSize: 32,
                  color: colorPalette.secondary,
                  textShadow: `0 0 ${20 * glowIntensity}px ${colorPalette.glow}`,
                  fontFamily: fontFamily,
                },
                font: {
                  family: fontFamily,
                  weights: ['400'],
                },
              } as TextAtomData,
              context: {
                timing: {
                  start: 0,
                  duration: 999,
                },
              },
              effects: [
                {
                  id: 'corruption-glitch',
                  componentId: 'generic',
                  data: {
                    type: 'linear',
                    start: 8,
                    duration: 0.3,
                    mode: 'provider',
                    targetIds: ['corruption-text'],
                    ranges: [
                      { key: 'opacity', val: 0, prog: 0 },
                      { key: 'opacity', val: 1, prog: 0.1 },
                      { key: 'opacity', val: 0, prog: 0.9 },
                      { key: 'opacity', val: 0, prog: 1 },
                    ],
                  } as GenericEffectData,
                },
              ],
            } as RenderableComponentData,
          ],
        } as RenderableComponentData)
      : null;

  // Main content container
  const mainContentContainer: RenderableComponentData = {
    id: 'terminal-main-content',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative z-10 flex flex-col justify-center items-center h-full p-8',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 999,
      },
    },
    childrenData: captionComponents,
  } as RenderableComponentData;

  // Matrix rain container
  const matrixRainContainer: RenderableComponentData | null = showMatrixRain
    ? ({
        id: 'matrix-rain-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 opacity-30 z-0',
            style: {
              contain: 'layout style paint',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 999,
          },
        },
        childrenData: matrixColumns,
      } as RenderableComponentData)
    : null;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'terminal-hacker-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'bg-black relative font-mono overflow-hidden',
        style: {
          fontFamily: `'${fontFamily}', 'Courier New', monospace`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 999,
      },
    },
    childrenData: [
      scanlineOverlay,
      matrixRainContainer,
      mainContentContainer,
      cursorComponent,
      systemAlertComponent,
      bufferOverflowComponent,
    ].filter((c) => c !== null) as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'terminal-hacker-decryption',
  title: 'Terminal Hacker Decryption Typography',
  description:
    'A retro terminal-inspired typography preset featuring phosphor green/amber monochrome aesthetics, matrix rain background, decryption text reveal effects where characters scramble before resolving, blinking cursor, scan lines, phosphor bloom glow, system alert boxes with ASCII box-drawing characters, and authentic buffer overflow corruption effects. Includes lag spike simulation for vintage hardware feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'terminal',
    'hacker',
    'retro',
    'decryption',
    'matrix',
    'crt',
    'phosphor',
    'monochrome',
    'ascii',
    'cyberpunk',
    'tech',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        text: 'INITIALIZING SYSTEM',
        absoluteStart: 0,
        duration: 3,
        absoluteEnd: 3,
        words: [
          {
            text: 'INITIALIZING',
            start: 0,
            absoluteStart: 0,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 1.5,
          },
          {
            text: 'SYSTEM',
            start: 1.5,
            absoluteStart: 1.5,
            end: 3,
            absoluteEnd: 3,
            duration: 1.5,
          },
        ],
      },
      {
        text: 'ACCESS GRANTED',
        absoluteStart: 3.5,
        duration: 2.5,
        absoluteEnd: 6,
        words: [
          {
            text: 'ACCESS',
            start: 0,
            absoluteStart: 3.5,
            end: 1.2,
            absoluteEnd: 4.7,
            duration: 1.2,
          },
          {
            text: 'GRANTED',
            start: 1.2,
            absoluteStart: 4.7,
            end: 2.5,
            absoluteEnd: 6,
            duration: 1.3,
          },
        ],
      },
    ],
    terminalColor: 'green',
    fontSize: 48,
    fontFamily: 'IBM Plex Mono',
    decryptionSpeed: 50,
    glowIntensity: 1,
    showMatrixRain: true,
    showScanlines: true,
    showCursor: true,
    showSystemAlerts: true,
    showBufferOverflow: true,
    lagSpikeFrequency: 0.1,
  },
};

export const terminalHackerDecryptionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
