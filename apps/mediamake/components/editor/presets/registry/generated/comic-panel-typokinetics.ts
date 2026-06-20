/**
 * Comic Panel Typokinetics Preset
 *
 * This preset creates a split-screen typography system inspired by comic book panels
 * and split-screen editing techniques. Text appears in distinct rectangular zones that
 * cut in and out instantly, creating dynamic multi-panel compositions with hard-edged
 * boundaries and pure cuts (no transitions).
 *
 * Features:
 * - **Instant Cut Transitions**: Panels appear and disappear with no fade/ease (0 to 1 opacity in 0.001s)
 * - **Grid-Based Layouts**: Multiple panel configurations (2x2 grid, vertical strips, horizontal bands, diagonal)
 * - **Word Distribution**: Automatically distributes words across panels using modulo operation
 * - **Dynamic Layout Switching**: Instant switches between different grid configurations
 * - **Comic Book Aesthetic**: Hard borders, black backgrounds, white panel frames
 * - **Sequential and Simultaneous Modes**: Panels can appear one at a time or all together
 *
 * Use cases:
 * - Creating comic book style captions
 * - Building dynamic split-screen text compositions
 * - Designing instant-cut typography animations
 * - Creating multi-panel video edits with text
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  captionData: z
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
      }),
    )
    .describe('Array of caption sentences with word-level timing'),
  layoutMode: z
    .enum(['2x2-grid', 'vertical-strips', 'horizontal-bands', 'diagonal'])
    .default('2x2-grid')
    .describe(
      'Grid layout configuration: 2x2 grid, vertical strips (3 columns), horizontal bands (3 rows), or diagonal arrangement',
    ),
  panelMode: z
    .enum(['sequential', 'simultaneous'])
    .default('sequential')
    .describe(
      'Panel appearance mode: sequential (panels appear one by one) or simultaneous (all panels appear together)',
    ),
  font: z
    .string()
    .optional()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:700", "Inter:900")',
    ),
  fontSize: z
    .number()
    .default(48)
    .describe('Font size for text in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color'),
  borderColor: z.string().default('#FFFFFF').describe('Panel border color'),
  borderWidth: z.number().default(2).describe('Panel border width in pixels'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color behind panels'),
  gapSize: z.number().default(4).describe('Gap between panels in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captionData,
    layoutMode,
    panelMode,
    font,
    fontSize,
    textColor,
    borderColor,
    borderWidth,
    backgroundColor,
    gapSize,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
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

  // Get layout configuration
  const getLayoutConfig = (
    mode: PresetParams['layoutMode'],
  ): {
    gridCols: number;
    gridRows: number;
    panelCount: number;
    gridClassName: string;
  } => {
    switch (mode) {
      case '2x2-grid':
        return {
          gridCols: 2,
          gridRows: 2,
          panelCount: 4,
          gridClassName: 'grid grid-cols-2 grid-rows-2',
        };
      case 'vertical-strips':
        return {
          gridCols: 3,
          gridRows: 1,
          panelCount: 3,
          gridClassName: 'grid grid-cols-3 grid-rows-1',
        };
      case 'horizontal-bands':
        return {
          gridCols: 1,
          gridRows: 3,
          panelCount: 3,
          gridClassName: 'grid grid-cols-1 grid-rows-3',
        };
      case 'diagonal':
        return {
          gridCols: 2,
          gridRows: 2,
          panelCount: 4,
          gridClassName: 'grid grid-cols-2 grid-rows-2',
        };
      default:
        return {
          gridCols: 2,
          gridRows: 2,
          panelCount: 4,
          gridClassName: 'grid grid-cols-2 grid-rows-2',
        };
    }
  };

  const layoutConfig = getLayoutConfig(layoutMode);

  // Create panels for each caption
  const captionContainers: RenderableComponentData[] = [];

  captionData.forEach((caption, captionIndex) => {
    const { words, absoluteStart, duration } = caption;

    // Distribute words across panels using modulo operation
    const wordsByPanel: string[][] = Array.from(
      { length: layoutConfig.panelCount },
      () => [],
    );

    words.forEach((word, wordIndex) => {
      const panelIndex = wordIndex % layoutConfig.panelCount;
      wordsByPanel[panelIndex].push(word.text);
    });

    // Create panel components
    const panels: RenderableComponentData[] = wordsByPanel.map(
      (panelWords, panelIndex) => {
        const panelId = `comic-panel-caption-${captionIndex}-panel-${panelIndex}`;
        const textId = `comic-text-caption-${captionIndex}-panel-${panelIndex}`;

        // Calculate panel timing based on mode
        let panelStart = 0;
        let panelDuration = duration;

        if (panelMode === 'sequential') {
          // Sequential: each panel appears one after another
          const panelDelay = duration / layoutConfig.panelCount;
          panelStart = panelDelay * panelIndex;
          panelDuration = duration - panelStart;
        } else {
          // Simultaneous: all panels appear together
          panelStart = 0;
          panelDuration = duration;
        }

        // Instant cut effect (0 to 1 in 0.001s)
        const instantCutEffect = {
          id: `instant-cut-effect-${panelId}`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: panelStart,
            duration: 0.001,
            mode: 'provider' as const,
            targetIds: [panelId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        };

        return {
          id: panelId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative overflow-hidden bg-black',
              style: {
                borderWidth: `${borderWidth}px`,
                borderStyle: 'solid',
                borderColor: borderColor,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          effects: [instantCutEffect],
          childrenData: [
            {
              id: textId,
              type: 'atom' as const,
              componentId: 'TextAtom',
              data: {
                text: panelWords.join(' '),
                className: 'flex items-center justify-center h-full p-4',
                style: {
                  fontSize: `${fontSize}px`,
                  color: textColor,
                  fontWeight: fontStyle.fontWeight || 700,
                  textAlign: 'center' as const,
                },
                font: {
                  family: fontFamily,
                  weights: fontStyle.fontWeight
                    ? [fontStyle.fontWeight.toString()]
                    : ['700', '900'],
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: duration,
                },
              },
            } as RenderableComponentData,
          ],
        } as RenderableComponentData;
      },
    );

    // Create grid container for this caption
    const captionContainerId = `comic-panel-container-${captionIndex}`;

    const captionContainer: RenderableComponentData = {
      id: captionContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `${layoutConfig.gridClassName} w-full h-full p-1`,
          style: {
            gap: `${gapSize}px`,
            backgroundColor: backgroundColor,
          },
        },
      },
      context: {
        timing: {
          start: absoluteStart,
          duration: duration,
        },
      },
      childrenData: panels,
    };

    captionContainers.push(captionContainer);
  });

  const rootContainer: RenderableComponentData = {
    id: 'comic-panel-typokinetics-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          captionData.length > 0
            ? Math.max(
                ...captionData.map((c) => c.absoluteStart + c.duration),
              )
            : 10,
      },
    },
    childrenData: captionContainers,
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

const presetMetadata: PresetMetadata = {
  id: 'comic-panel-typokinetics',
  title: 'Comic Panel Typokinetics',
  description:
    'Split-screen typography inspired by comic book panels. Text appears in distinct rectangular zones that cut in and out instantly with hard-edged boundaries and pure cuts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'comic',
    'split-screen',
    'panels',
    'grid',
    'instant-cut',
    'captions',
  ],
  defaultInputParams: {
    captionData: [
      {
        id: 'caption-1',
        text: 'This is a comic panel style caption',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'This',
            start: 0,
            absoluteStart: 0,
            end: 0.5,
            absoluteEnd: 0.5,
            duration: 0.5,
          },
          {
            id: 'word-2',
            text: 'is',
            start: 0.5,
            absoluteStart: 0.5,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.3,
          },
          {
            id: 'word-3',
            text: 'a',
            start: 0.8,
            absoluteStart: 0.8,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 0.2,
          },
          {
            id: 'word-4',
            text: 'comic',
            start: 1.0,
            absoluteStart: 1.0,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 0.5,
          },
          {
            id: 'word-5',
            text: 'panel',
            start: 1.5,
            absoluteStart: 1.5,
            end: 2.0,
            absoluteEnd: 2.0,
            duration: 0.5,
          },
          {
            id: 'word-6',
            text: 'style',
            start: 2.0,
            absoluteStart: 2.0,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 0.5,
          },
          {
            id: 'word-7',
            text: 'caption',
            start: 2.5,
            absoluteStart: 2.5,
            end: 3.0,
            absoluteEnd: 3.0,
            duration: 0.5,
          },
        ],
      },
    ],
    layoutMode: '2x2-grid',
    panelMode: 'sequential',
    font: 'Inter:900',
    fontSize: 48,
    textColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    borderWidth: 2,
    backgroundColor: '#000000',
    gapSize: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const comicPanelTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
