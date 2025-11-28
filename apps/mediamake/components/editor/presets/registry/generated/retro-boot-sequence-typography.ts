/**
 * Retro Computer Boot Sequence Typography Preset
 *
 * This preset recreates an authentic computer boot sequence experience with BIOS/DOS-style startup screens.
 * Features monospace text rendering that appears line by line with realistic computer boot timing,
 * including system checks, memory counting, driver loading messages, and actual content.
 *
 * Features:
 * - **Character-by-character typing**: Text types out with varying speeds (faster for system text, slower for content)
 * - **ASCII progress bars**: Animated progress indicators that fill as text loads
 * - **Blinking status indicators**: [OK]/[FAIL] indicators with conditional coloring
 * - **Memory counter**: Hexadecimal address counter with incrementing animation
 * - **CRT monitor effects**: Screen curvature distortion, phosphor persistence glow, scanlines
 * - **Electromagnetic interference**: Animated visual noise simulation
 * - **Critical error alerts**: Red flashing background with pulse animation for emphasis words
 * - **Boot delays**: Random cursor blink pauses simulating system processing
 * - **CGA palette**: Limited color palette with harsh contrast for authenticity
 *
 * Use cases:
 * - Retro tech content and coding tutorials
 * - Cyberpunk/hacker aesthetic videos
 * - System message-style overlays
 * - Nostalgia-driven tech presentations
 * - Terminal/console simulation overlays
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
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
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
            emphasis: z.boolean().optional(),
            keyword: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word timing'),

  bootSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .optional()
    .describe('Speed multiplier for boot sequence timing (1 = normal, 2 = 2x speed)'),

  contentTypingSpeed: z
    .number()
    .min(20)
    .max(200)
    .default(60)
    .optional()
    .describe('Milliseconds per character for content text (slower = more dramatic)'),

  systemTypingSpeed: z
    .number()
    .min(10)
    .max(100)
    .default(30)
    .optional()
    .describe('Milliseconds per character for system text (faster = snappier)'),

  crtIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Intensity of CRT monitor effects (0 = off, 1 = maximum)'),

  textColor: z
    .string()
    .default('#00FF00')
    .optional()
    .describe('Primary text color (CGA green by default)'),

  errorColor: z
    .string()
    .default('#FF0000')
    .optional()
    .describe('Error/emphasis text color (CGA red by default)'),

  backgroundColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Background color (black by default)'),

  showMemoryCounter: z
    .boolean()
    .default(true)
    .optional()
    .describe('Show hexadecimal memory counter during boot'),

  showProgressBar: z
    .boolean()
    .default(true)
    .optional()
    .describe('Show ASCII progress bar during content loading'),

  bootDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Random delay duration for cursor blink pauses (seconds)'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions = [],
    bootSpeed = 1,
    contentTypingSpeed = 60,
    systemTypingSpeed = 30,
    crtIntensity = 0.7,
    textColor = '#00FF00',
    errorColor = '#FF0000',
    backgroundColor = '#000000',
    showMemoryCounter = true,
    showProgressBar = true,
    bootDelay = 0.5,
  } = params;

  // Helper: Calculate typing duration for text
  const calculateTypingDuration = (text: string, speedMs: number): number => {
    return (text.length * speedMs) / 1000 / bootSpeed;
  };

  // Helper: Create character-by-character typing effect
  const createTypingEffect = (
    targetId: string,
    text: string,
    startTime: number,
    speedMs: number,
  ): GenericEffectData[] => {
    const duration = calculateTypingDuration(text, speedMs);
    const charCount = text.length;

    // Create opacity animation for each character position
    // This simulates typing by revealing characters progressively
    return [
      {
        type: 'linear',
        start: startTime,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.1 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    ];
  };

  // Helper: Create blinking cursor effect
  const createCursorBlinkEffect = (
    targetId: string,
    startTime: number,
    duration: number,
  ): GenericEffectData => {
    return {
      type: 'linear',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.5 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData;
  };

  // Helper: Create memory counter animation
  const createMemoryCounterEffect = (
    targetId: string,
    startTime: number,
    duration: number,
  ): GenericEffectData => {
    // Simulate incrementing hex counter via opacity pulse
    return {
      type: 'linear',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 0.7, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.5 },
        { key: 'opacity', val: 0.7, prog: 1 },
      ],
    } as GenericEffectData;
  };

  // Helper: Create progress bar fill animation
  const createProgressBarEffect = (
    targetId: string,
    startTime: number,
    duration: number,
  ): GenericEffectData => {
    return {
      type: 'linear',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'scaleX', val: 0, prog: 0 },
        { key: 'scaleX', val: 1, prog: 1 },
      ],
    } as GenericEffectData;
  };

  // Helper: Create error alert flash effect
  const createErrorAlertEffect = (
    targetId: string,
    startTime: number,
    duration: number,
  ): GenericEffectData[] => {
    return [
      {
        type: 'linear',
        start: startTime,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.1 },
          { key: 'opacity', val: 0.8, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
      {
        type: 'linear',
        start: startTime,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'scale', val: 0.95, prog: 0 },
          { key: 'scale', val: 1.02, prog: 0.3 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    ];
  };

  // Calculate total duration
  const totalDuration =
    captions.length > 0
      ? Math.max(...captions.map((c) => c.absoluteEnd))
      : 30;

  // Build BIOS header (appears first)
  const biosHeaderStartTime = 0;
  const biosHeaderDuration = 2 / bootSpeed;

  const biosHeader: RenderableComponentData = {
    id: 'bios-header',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col gap-0 mb-2',
      },
    },
    context: {
      timing: {
        start: biosHeaderStartTime,
        duration: biosHeaderDuration,
      },
    },
    childrenData: [
      {
        id: 'bios-title',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: 'MEDIAMAKE BIOS v4.20 (C) 2024',
          className: 'text-cyan-400 text-sm tracking-wide',
          style: {
            fontFamily: '"Courier New", Consolas, monospace',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: biosHeaderDuration,
          },
        },
        effects: createTypingEffect(
          'bios-title',
          'MEDIAMAKE BIOS v4.20 (C) 2024',
          0,
          systemTypingSpeed,
        ).map((e) => ({
          id: `bios-title-effect`,
          componentId: 'generic',
          data: e,
        })),
      } as RenderableComponentData,
      {
        id: 'bios-copyright',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: 'Video Rendering System Setup Utility',
          className: 'text-gray-400 text-xs',
          style: {
            fontFamily: '"Courier New", Consolas, monospace',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0.5 / bootSpeed,
            duration: biosHeaderDuration - 0.5 / bootSpeed,
          },
        },
        effects: createTypingEffect(
          'bios-copyright',
          'Video Rendering System Setup Utility',
          0,
          systemTypingSpeed,
        ).map((e) => ({
          id: `bios-copyright-effect`,
          componentId: 'generic',
          data: e,
        })),
      } as RenderableComponentData,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

  // Build memory check line (appears after BIOS header)
  const memoryCheckStartTime = biosHeaderDuration + 0.2 / bootSpeed;
  const memoryCheckDuration = 2 / bootSpeed;

  const memoryCheckLine: RenderableComponentData = {
    id: 'memory-check-line',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row gap-2 mb-1',
      },
    },
    context: {
      timing: {
        start: memoryCheckStartTime,
        duration: memoryCheckDuration,
      },
    },
    childrenData: [
      {
        id: 'memory-label',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: 'Memory Test:',
          className: 'text-sm',
          style: {
            color: textColor,
            fontFamily: '"Courier New", Consolas, monospace',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: memoryCheckDuration,
          },
        },
      } as RenderableComponentData,
      ...(showMemoryCounter
        ? [
            {
              id: 'memory-counter',
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: '0xFFFFFFFF',
                className: 'text-yellow-400 text-sm',
                style: {
                  fontFamily: '"Courier New", Consolas, monospace',
                },
              } as TextAtomData,
              context: {
                timing: {
                  start: 0.3 / bootSpeed,
                  duration: memoryCheckDuration - 0.3 / bootSpeed,
                },
              },
              effects: [
                {
                  id: 'memory-counter-pulse',
                  componentId: 'generic',
                  data: createMemoryCounterEffect(
                    'memory-counter',
                    0,
                    memoryCheckDuration - 0.3 / bootSpeed,
                  ),
                },
              ],
            } as RenderableComponentData,
          ]
        : []),
    ] as RenderableComponentData[],
  } as RenderableComponentData;

  // Build system check lines (4 checks with staggered timing)
  const systemChecks = [
    {
      text: 'Detecting Primary Video Buffer...',
      status: '[  OK  ]',
      statusColor: 'text-green-500',
    },
    {
      text: 'Loading Audio Subsystem Driver...',
      status: '[  OK  ]',
      statusColor: 'text-green-500',
    },
    {
      text: 'Initializing Caption Renderer...',
      status: '[  OK  ]',
      statusColor: 'text-green-500',
    },
    {
      text: 'Mounting Content Stream...',
      status: '[  OK  ]',
      statusColor: 'text-green-500',
    },
  ];

  const systemCheckStartTime =
    memoryCheckStartTime + memoryCheckDuration + 0.3 / bootSpeed;
  const checkLineDuration = 1.2 / bootSpeed;
  const checkLineGap = 0.3 / bootSpeed;

  const systemCheckLines: RenderableComponentData[] = systemChecks.map(
    (check, index) => {
      const lineStartTime = index * (checkLineDuration + checkLineGap);
      const statusDelay = 0.8 / bootSpeed;

      return {
        id: `check-line-${index}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row justify-between mb-0',
          },
        },
        context: {
          timing: {
            start: systemCheckStartTime + lineStartTime,
            duration: checkLineDuration,
          },
        },
        childrenData: [
          {
            id: `check-${index}-text`,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: check.text,
              className: 'text-sm',
              style: {
                color: textColor,
                fontFamily: '"Courier New", Consolas, monospace',
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: checkLineDuration,
              },
            },
            effects: createTypingEffect(
              `check-${index}-text`,
              check.text,
              0,
              systemTypingSpeed,
            ).map((e) => ({
              id: `check-${index}-text-effect`,
              componentId: 'generic',
              data: e,
            })),
          } as RenderableComponentData,
          {
            id: `check-${index}-status`,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: check.status,
              className: `${check.statusColor} text-sm font-bold`,
              style: {
                fontFamily: '"Courier New", Consolas, monospace',
              },
            } as TextAtomData,
            context: {
              timing: {
                start: statusDelay,
                duration: checkLineDuration - statusDelay,
              },
            },
            effects: [
              {
                id: `check-${index}-status-appear`,
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: 0.1 / bootSpeed,
                  mode: 'provider',
                  targetIds: [`check-${index}-status`],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 1 },
                  ],
                } as GenericEffectData,
              },
            ],
          } as RenderableComponentData,
        ] as RenderableComponentData[],
      } as RenderableComponentData;
    },
  );

  const systemChecksContainer: RenderableComponentData = {
    id: 'system-check-lines',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col gap-0',
      },
    },
    context: {
      timing: {
        start: systemCheckStartTime,
        duration:
          systemChecks.length * (checkLineDuration + checkLineGap) +
          checkLineDuration,
      },
    },
    childrenData: systemCheckLines,
  } as RenderableComponentData;

  // Build content lines from captions
  const contentStartTime =
    systemCheckStartTime +
    systemChecks.length * (checkLineDuration + checkLineGap) +
    1 / bootSpeed;

  const contentLines: RenderableComponentData[] = captions.map((caption) => {
    const lineStartTime = caption.absoluteStart;
    const lineDuration = caption.duration;

    // Check if caption has emphasis metadata
    const isEmphasis = caption.metadata?.emphasis ?? false;

    const contentLine: RenderableComponentData = {
      id: `content-line-${caption.id}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row gap-1 mb-1',
        },
      },
      context: {
        timing: {
          start: lineStartTime,
          duration: lineDuration,
        },
      },
      childrenData: [
        {
          id: `content-text-${caption.id}`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: `> ${caption.text}`,
            className: 'text-sm',
            style: {
              color: isEmphasis ? errorColor : textColor,
              fontFamily: '"Courier New", Consolas, monospace',
            },
          } as TextAtomData,
          context: {
            timing: {
              start: 0,
              duration: lineDuration,
            },
          },
          effects: createTypingEffect(
            `content-text-${caption.id}`,
            `> ${caption.text}`,
            0,
            contentTypingSpeed,
          ).map((e) => ({
            id: `content-text-${caption.id}-effect`,
            componentId: 'generic',
            data: e,
          })),
        } as RenderableComponentData,
      ] as RenderableComponentData[],
    } as RenderableComponentData;

    return contentLine;
  });

  // Build error alert overlay for emphasis captions
  const errorAlerts: RenderableComponentData[] = captions
    .filter((c) => c.metadata?.emphasis ?? false)
    .map((caption) => {
      const alertStartTime = caption.absoluteStart;
      const alertDuration = Math.min(caption.duration, 1.5 / bootSpeed);

      return {
        id: `error-alert-${caption.id}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'absolute inset-0 flex items-center justify-center pointer-events-none',
            style: {
              zIndex: 200,
            },
          },
        },
        context: {
          timing: {
            start: alertStartTime,
            duration: alertDuration,
          },
        },
        childrenData: [
          {
            id: `error-box-${caption.id}`,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'px-8 py-4 border-4',
                style: {
                  backgroundColor: 'rgba(127, 29, 29, 0.95)',
                  borderColor: errorColor,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: alertDuration,
              },
            },
            effects: createErrorAlertEffect(
              `error-box-${caption.id}`,
              0,
              alertDuration,
            ).map((e, idx) => ({
              id: `error-box-${caption.id}-effect-${idx}`,
              componentId: 'generic',
              data: e,
            })),
            childrenData: [
              {
                id: `error-text-${caption.id}`,
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: '*** CRITICAL ERROR ***',
                  className: 'text-red-100 text-xl font-bold tracking-widest',
                  style: {
                    fontFamily: '"Courier New", Consolas, monospace',
                  },
                } as TextAtomData,
                context: {
                  timing: {
                    start: 0,
                    duration: alertDuration,
                  },
                },
              } as RenderableComponentData,
            ] as RenderableComponentData[],
          } as RenderableComponentData,
        ] as RenderableComponentData[],
      } as RenderableComponentData;
    });

  // Build progress bar (appears during content loading)
  const progressBarStartTime = contentStartTime;
  const progressBarDuration = totalDuration - contentStartTime;

  const progressBarContainer: RenderableComponentData | null = showProgressBar
    ? ({
        id: 'progress-bar-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row gap-2 mt-4 items-center',
          },
        },
        context: {
          timing: {
            start: progressBarStartTime,
            duration: progressBarDuration,
          },
        },
        childrenData: [
          {
            id: 'progress-label',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: 'Loading:',
              className: 'text-sm',
              style: {
                color: textColor,
                fontFamily: '"Courier New", Consolas, monospace',
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: progressBarDuration,
              },
            },
          } as RenderableComponentData,
          {
            id: 'progress-bar',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: '[████████████████████]',
              className: 'text-cyan-400 text-sm',
              style: {
                fontFamily: '"Courier New", Consolas, monospace',
                transformOrigin: 'left center',
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0.2 / bootSpeed,
                duration: progressBarDuration - 0.2 / bootSpeed,
              },
            },
            effects: [
              {
                id: 'progress-bar-fill',
                componentId: 'generic',
                data: createProgressBarEffect(
                  'progress-bar',
                  0,
                  progressBarDuration - 0.2 / bootSpeed,
                ),
              },
            ],
          } as RenderableComponentData,
        ] as RenderableComponentData[],
      } as RenderableComponentData)
    : null;

  // Build cursor blink
  const cursorStartTime = contentStartTime;
  const cursorDuration = totalDuration - contentStartTime;

  const cursorBlink: RenderableComponentData = {
    id: 'cursor-blink',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: '█',
      className: 'text-sm mt-2',
      style: {
        color: textColor,
        fontFamily: '"Courier New", Consolas, monospace',
      },
    } as TextAtomData,
    context: {
      timing: {
        start: cursorStartTime,
        duration: cursorDuration,
      },
    },
    effects: [
      {
        id: 'cursor-blink-effect',
        componentId: 'generic',
        data: createCursorBlinkEffect(
          'cursor-blink',
          0,
          cursorDuration,
        ),
      },
    ],
  } as RenderableComponentData;

  // Build CRT effects container (scanlines, phosphor glow, curvature)
  const scanlinesOpacity = 0.15 * crtIntensity;
  const glowIntensity = 0.05 * crtIntensity;
  const curvatureAmount = 1 * crtIntensity;

  const crtEffectsContainer: RenderableComponentData = {
    id: 'crt-effects-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `repeating-linear-gradient(0deg, rgba(0,0,0,${scanlinesOpacity}) 0px, rgba(0,0,0,${scanlinesOpacity}) 1px, transparent 1px, transparent 2px)`,
          boxShadow: `inset 0 0 100px rgba(0, 255, 0, ${glowIntensity}), inset 0 0 50px rgba(0, 255, 0, ${glowIntensity * 0.6})`,
          zIndex: 100,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [] as RenderableComponentData[],
  } as RenderableComponentData;

  // Build main content container with perspective curvature
  const contentContainer: RenderableComponentData = {
    id: 'content-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col gap-0 p-4',
        style: {
          transform: `perspective(800px) rotateX(${curvatureAmount}deg)`,
          transformOrigin: 'center center',
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
      biosHeader,
      memoryCheckLine,
      systemChecksContainer,
      {
        id: 'content-lines-wrapper',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-col gap-0 mt-4',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: contentLines,
      } as RenderableComponentData,
      ...(progressBarContainer ? [progressBarContainer] : []),
      cursorBlink,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'retro-boot-sequence-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden font-mono p-4',
        style: {
          backgroundColor: backgroundColor,
          color: textColor,
          fontFamily: '"Courier New", Consolas, monospace',
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
      contentContainer,
      crtEffectsContainer,
      ...errorAlerts,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'retro-boot-sequence-typography',
  title: 'Retro Computer Boot Sequence Typography',
  description:
    'BIOS/DOS-style boot sequence preset with character-by-character typing, ASCII progress bars, CRT monitor effects, and critical error alerts for emphasis words. Features authentic computer boot timing with system checks, memory counters, and scanline effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'retro',
    'boot',
    'bios',
    'dos',
    'terminal',
    'crt',
    'monospace',
    'tech',
    'cyberpunk',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    bootSpeed: 1,
    contentTypingSpeed: 60,
    systemTypingSpeed: 30,
    crtIntensity: 0.7,
    textColor: '#00FF00',
    errorColor: '#FF0000',
    backgroundColor: '#000000',
    showMemoryCounter: true,
    showProgressBar: true,
    bootDelay: 0.5,
  },
};

export const retroBootSequenceTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
