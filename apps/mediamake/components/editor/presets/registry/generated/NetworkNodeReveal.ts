/**
 * Network Node Reveal Typokinetics Preset
 *
 * This preset visualizes text as an expanding network graph where each word becomes a 'node'
 * with spring-physics-inspired bounce effects. Sequential words are connected by animated lines
 * that grow between positions. The composition starts from center and expands radially,
 * creating an organic yet structured topology that builds in real-time.
 *
 * Features:
 * - **Network Graph Visualization**: Words positioned as nodes in radial distribution
 * - **Spring Physics Animation**: Elastic overshoot easing for node appearance
 * - **Connecting Lines**: Dynamic lines that stretch between sequential words
 * - **Keyword Enhancement**: Larger nodes with glow effects for keyword words
 * - **Impact Pulse**: Subtle pulsing for impact words
 * - **Radial Expansion**: Organic topology growing from center outward
 * - **GPU-Optimized**: Transform-based animations only
 *
 * Use cases:
 * - Creating mind-map style text visualizations
 * - Building network graph presentations
 * - Dynamic knowledge graph animations
 * - Conceptual relationship visualizations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
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
    .describe('Caption data with word-level timing'),
  fontSize: z
    .number()
    .min(12)
    .max(72)
    .default(32)
    .describe('Base font size in pixels'),
  keywordScale: z
    .number()
    .min(1)
    .max(2)
    .default(1.4)
    .describe('Scale multiplier for keyword words'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color for nodes'),
  lineColor: z
    .string()
    .default('rgba(255, 255, 255, 0.3)')
    .describe('Color for connecting lines'),
  lineThickness: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Thickness of connecting lines in pixels'),
  animationDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.35)
    .describe('Duration of node appearance animation in seconds'),
  lineDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Delay before line animation starts (seconds)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600", "Roboto:700")',
    ),
  radialSpacing: z
    .number()
    .min(50)
    .max(300)
    .default(150)
    .describe('Radial spacing between node layers in pixels'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { config } = props;
  const {
    captions,
    fontSize,
    keywordScale,
    textColor,
    lineColor,
    lineThickness,
    animationDuration,
    lineDelay,
    font,
    radialSpacing,
  } = params;

  const width = config?.width || 1920;
  const height = config?.height || 1080;
  const centerX = width / 2;
  const centerY = height / 2;

  // Parse font string
  const parseFontString = (fontString: string | undefined) => {
    if (!fontString) return { family: 'Inter', style: {} };

    const family = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const style: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const parts = fontString.split(':');
      if (parts.length > 2) {
        style.fontStyle = parts[2] as any;
        style.fontWeight = parseInt(parts[1], 10);
      } else if (parts.length > 1) {
        style.fontWeight = parseInt(parts[1], 10);
      }
    }

    return { family, style };
  };

  const { family: fontFamily, style: fontStyle } = parseFontString(font);

  // Calculate radial positions for words
  const calculateRadialPosition = (
    index: number,
    total: number,
  ): { x: number; y: number } => {
    // Distribute in spiral pattern
    const angle = (index / total) * Math.PI * 4; // 2 full rotations
    const radius = radialSpacing * Math.sqrt(index / total);

    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    return { x, y };
  };

  // Collect all words from all captions
  const allWords: Array<{
    text: string;
    start: number;
    duration: number;
    captionStart: number;
    isKeyword: boolean;
    hasImpact: boolean;
    index: number;
  }> = [];

  let wordIndex = 0;
  captions.forEach((caption) => {
    caption.words.forEach((word) => {
      const isKeyword =
        caption.metadata?.keyword?.toLowerCase() ===
        word.text.toLowerCase().trim();
      const hasImpact = (caption.metadata?.impact || 0) > 1;

      allWords.push({
        text: word.text,
        start: word.start,
        duration: word.duration,
        captionStart: caption.absoluteStart,
        isKeyword,
        hasImpact,
        index: wordIndex++,
      });
    });
  });

  const totalWords = allWords.length;

  // Create word nodes and connecting lines
  const nodeComponents: RenderableComponentData[] = [];
  const lineComponents: RenderableComponentData[] = [];

  allWords.forEach((word, idx) => {
    const position = calculateRadialPosition(idx, totalWords);
    const wordId = `network-node-${idx}`;
    const wordFontSize = word.isKeyword ? fontSize * keywordScale : fontSize;

    // Create spring-like scale animation effect
    const nodeScaleEffect: GenericEffectData = {
      type: 'ease-out',
      start: word.start,
      duration: animationDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: 0.3, prog: 0 },
        { key: 'scale', val: 1.15, prog: 0.4 },
        { key: 'scale', val: 0.95, prog: 0.6 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };

    // Add keyword glow effect
    const glowEffect: GenericEffectData | null = word.isKeyword
      ? {
          type: 'linear',
          start: word.start,
          duration: word.duration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            {
              key: 'textShadow',
              val: '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.5)',
              prog: 0,
            },
            {
              key: 'textShadow',
              val: '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.5)',
              prog: 1,
            },
          ],
        }
      : null;

    // Add impact pulse effect
    const pulseEffect: GenericEffectData | null = word.hasImpact
      ? {
          type: 'ease-in-out',
          start: word.start,
          duration: word.duration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.05, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        }
      : null;

    // Collect effects for this word
    const wordEffects = [
      {
        id: `scale-${wordId}`,
        componentId: 'generic',
        data: nodeScaleEffect,
      },
    ];

    if (glowEffect) {
      wordEffects.push({
        id: `glow-${wordId}`,
        componentId: 'generic',
        data: glowEffect,
      });
    }

    if (pulseEffect) {
      wordEffects.push({
        id: `pulse-${wordId}`,
        componentId: 'generic',
        data: pulseEffect,
      });
    }

    // Create word node container
    const wordNode: RenderableComponentData = {
      id: `${wordId}-container`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: 'translate(-50%, -50%)',
          },
        },
      },
      context: {
        timing: {
          start: word.captionStart,
          duration: word.duration + animationDuration,
        },
      },
      childrenData: [
        {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: wordFontSize,
              color: textColor,
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['400'],
            },
          },
          effects: wordEffects,
          context: {
            timing: {
              start: 0,
              duration: word.duration + animationDuration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    nodeComponents.push(wordNode);

    // Create connecting line to next word
    if (idx < totalWords - 1) {
      const nextPosition = calculateRadialPosition(idx + 1, totalWords);
      const lineId = `network-line-${idx}`;

      // Calculate line angle and length
      const deltaX = nextPosition.x - position.x;
      const deltaY = nextPosition.y - position.y;
      const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      // Create line growth animation
      const lineGrowEffect: GenericEffectData = {
        type: 'ease-out',
        start: word.start + lineDelay,
        duration: animationDuration,
        mode: 'provider',
        targetIds: [lineId],
        ranges: [
          { key: 'scaleX', val: 0, prog: 0 },
          { key: 'scaleX', val: 1, prog: 1 },
        ],
      };

      // Create line using HTMLBlockAtom
      const lineComponent: RenderableComponentData = {
        id: `${lineId}-container`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              left: `${position.x}px`,
              top: `${position.y}px`,
            },
          },
        },
        context: {
          timing: {
            start: word.captionStart,
            duration: word.duration + animationDuration + lineDelay,
          },
        },
        childrenData: [
          {
            id: lineId,
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: `<div style="
                width: ${length}px;
                height: ${lineThickness}px;
                background-color: ${lineColor};
                transform-origin: left center;
                transform: rotate(${angle}deg);
              "></div>`,
              style: {
                position: 'absolute',
                transformOrigin: 'left center',
              },
            },
            effects: [
              {
                id: `grow-${lineId}`,
                componentId: 'generic',
                data: lineGrowEffect,
              },
            ],
            context: {
              timing: {
                start: 0,
                duration: word.duration + animationDuration + lineDelay,
              },
            },
          } as RenderableComponentData,
        ],
      };

      lineComponents.push(lineComponent);
    }
  });

  // Find total duration across all captions
  const totalDuration =
    captions.length > 0
      ? Math.max(
          ...captions.map((c) => c.absoluteStart + c.duration + animationDuration),
        )
      : 10;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'network-node-reveal-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [...lineComponents, ...nodeComponents] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'NetworkNodeReveal',
  title: 'Network Node Reveal Typokinetics',
  description:
    'Visualizes caption text as an expanding network graph where each word becomes a node with spring-physics bounce effects. Words emerge from center in a radial pattern with elastic overshoot, connected by animated lines. Keywords become larger nodes with glow effects, impact words pulse subtly. Creates an organic yet structured mind-map topology that builds in real-time.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typokinetics',
    'network',
    'graph',
    'nodes',
    'spring-physics',
    'radial',
    'mind-map',
    'topology',
    'kinetic',
    'animated',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Network graph visualization',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Network',
            start: 0,
            absoluteStart: 0,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.8,
          },
          {
            id: 'word-2',
            text: 'graph',
            start: 0.8,
            absoluteStart: 0.8,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 0.7,
          },
          {
            id: 'word-3',
            text: 'visualization',
            start: 1.5,
            absoluteStart: 1.5,
            end: 3,
            absoluteEnd: 3,
            duration: 1.5,
          },
        ],
        metadata: {
          keyword: 'Network',
          impact: 1.2,
        },
      },
    ],
    fontSize: 32,
    keywordScale: 1.4,
    textColor: '#FFFFFF',
    lineColor: 'rgba(255, 255, 255, 0.3)',
    lineThickness: 2,
    animationDuration: 0.35,
    lineDelay: 0.1,
    font: 'Inter:600',
    radialSpacing: 150,
  },
};

// Export preset
export const NetworkNodeRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};