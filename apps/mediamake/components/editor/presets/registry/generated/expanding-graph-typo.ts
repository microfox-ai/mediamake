/**
 * ExpandingGraphTypo Preset
 *
 * A typokinetics preset where text forms an ever-expanding graph structure using golden angle spiral positioning.
 * Words appear sequentially from center, each connected by nerve impulse lines that pulse with energy.
 *
 * Features:
 * - Golden angle spiral positioning (137.5° increments) for organic node distribution
 * - Neural network-style connection lines between sequential words
 * - "Nerve impulse" pulse effect traveling along connection lines
 * - Elastic pop-in animation for words (scale 0 → 1.2 → 1)
 * - Impact words become larger hub nodes with enhanced styling
 * - Growing connection lines with pulsing bright particles
 * - Tree-like or mycelium growth pattern visualization
 *
 * Use cases:
 * - Visualizing concept relationships and idea networks
 * - Creating dynamic knowledge graph animations
 * - Building neural network-style text visualizations
 * - Organic growth pattern storytelling
 * - Scientific or educational content showing connections
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
        text: z.string().describe('Full sentence text'),
        start: z.number().describe('Relative start time of caption'),
        duration: z.number().describe('Caption duration in seconds'),
        absoluteStart: z
          .number()
          .describe('Absolute start time in caption timeline'),
        words: z
          .array(
            z.object({
              text: z.string().describe('Word text'),
              start: z.number().describe('Relative start time of word'),
              duration: z.number().describe('Word duration'),
              absoluteStart: z
                .number()
                .describe('Absolute start time in caption timeline'),
            }),
          )
          .describe('Array of word objects with timing'),
        metadata: z
          .object({
            impact: z
              .number()
              .optional()
              .describe('Impact multiplier for this caption (default: 1.0)'),
          })
          .optional()
          .describe('Optional metadata for caption customization'),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  baseRadius: z
    .number()
    .min(10)
    .max(200)
    .default(80)
    .describe('Base radius for spiral growth calculation (pixels)'),

  fontSize: z
    .number()
    .min(12)
    .max(72)
    .default(24)
    .describe('Base font size for regular words (pixels)'),

  impactFontScale: z
    .number()
    .min(1)
    .max(3)
    .default(1.5)
    .describe('Font size multiplier for impact words'),

  font: z
    .string()
    .optional()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600", "Roboto:700:italic")',
    ),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color for words'),

  glowColor: z
    .string()
    .default('rgba(59, 130, 246, 0.8)')
    .describe('Glow/shadow color for text'),

  lineColor: z
    .string()
    .default('rgba(59, 130, 246, 0.6)')
    .describe('Connection line base color'),

  pulseColor: z
    .string()
    .default('rgba(96, 165, 250, 1)')
    .describe('Pulse particle color'),

  popDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.4)
    .describe('Duration of word pop-in animation (seconds)'),

  lineGrowDuration: z
    .number()
    .min(0.05)
    .max(1)
    .default(0.2)
    .describe('Duration of line growth animation (seconds)'),

  pulseDuration: z
    .number()
    .min(0.05)
    .max(1)
    .default(0.15)
    .describe('Duration of pulse travel animation (seconds)'),

  impactThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe(
      'Threshold for considering a word as "impact" based on metadata (0-1)',
    ),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const parseFontConfig = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: {
      fontWeight?: number;
      fontStyle?: 'normal' | 'italic';
    } = {};
    if (fontString.includes(':')) {
      const parts = fontString.split(':');
      if (parts.length > 2) {
        fontStyle.fontStyle = parts[2] as 'normal' | 'italic';
        fontStyle.fontWeight = parseInt(parts[1], 10);
      } else if (parts.length > 1) {
        fontStyle.fontWeight = parseInt(parts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontConfig(params.font || 'Inter');

  // Calculate golden angle position for a word index
  const calculatePosition = (
    index: number,
    baseRadius: number,
    canvasWidth: number,
    canvasHeight: number,
  ) => {
    const goldenAngle = 137.5; // degrees
    const angle = (index * goldenAngle * Math.PI) / 180; // convert to radians
    const distance = Math.sqrt(index + 1) * baseRadius;

    // Calculate position from center
    const x = canvasWidth / 2 + distance * Math.cos(angle);
    const y = canvasHeight / 2 + distance * Math.sin(angle);

    return { x, y, angle, distance };
  };

  // Calculate line angle and length between two points
  const calculateLine = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return { length, angle };
  };

  // Get video dimensions from config
  const canvasWidth = props.config?.width || 1920;
  const canvasHeight = props.config?.height || 1080;

  // Collect all words with their absolute timing and positions
  interface WordNode {
    text: string;
    absoluteStart: number;
    duration: number;
    position: { x: number; y: number; angle: number; distance: number };
    isImpact: boolean;
    captionImpact: number;
  }

  const allWords: WordNode[] = [];
  let wordIndex = 0;

  params.captions.forEach((caption) => {
    const captionImpact = caption.metadata?.impact ?? 1.0;
    caption.words.forEach((word) => {
      const position = calculatePosition(
        wordIndex,
        params.baseRadius,
        canvasWidth,
        canvasHeight,
      );
      const isImpact = captionImpact >= params.impactThreshold;
      allWords.push({
        text: word.text,
        absoluteStart: word.absoluteStart,
        duration: word.duration,
        position,
        isImpact,
        captionImpact,
      });
      wordIndex++;
    });
  });

  // Build word nodes and connection lines
  const wordNodes: RenderableComponentData[] = [];
  const connectionLines: RenderableComponentData[] = [];

  allWords.forEach((word, index) => {
    const wordId = `word-node-${index}`;
    const fontSize = word.isImpact
      ? params.fontSize * params.impactFontScale
      : params.fontSize;
    const fontWeight = word.isImpact
      ? (fontStyle.fontWeight || 600) + 100
      : fontStyle.fontWeight || 600;

    // Word node container (absolute positioned at calculated coordinates)
    const wordNode: RenderableComponentData = {
      id: wordId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute pointer-events-none',
          style: {
            left: `${word.position.x}px`,
            top: `${word.position.y}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: word.absoluteStart,
          duration: word.duration,
        },
      },
      childrenData: [
        {
          id: `word-text-${index}`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: `${fontSize}px`,
              color: params.textColor,
              fontWeight: fontWeight,
              textShadow: `0 0 10px ${params.glowColor}`,
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: [fontWeight.toString()],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: word.duration,
            },
          },
          effects: [
            {
              id: `word-pop-${index}`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: params.popDuration,
                mode: 'provider',
                targetIds: [`word-text-${index}`],
                ranges: [
                  { key: 'scale', val: 0, prog: 0 },
                  { key: 'scale', val: 1.2, prog: 0.6 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
          ],
        },
      ],
    };

    wordNodes.push(wordNode);

    // Create connection line to previous word
    if (index > 0) {
      const prevWord = allWords[index - 1];
      const { length, angle } = calculateLine(
        prevWord.position.x,
        prevWord.position.y,
        word.position.x,
        word.position.y,
      );

      const lineId = `connection-line-${index}`;
      const lineBaseId = `line-base-${index}`;
      const linePulseId = `line-pulse-${index}`;

      // Connection line container
      const connectionLine: RenderableComponentData = {
        id: lineId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute pointer-events-none',
            style: {
              left: `${prevWord.position.x}px`,
              top: `${prevWord.position.y}px`,
              width: `${length}px`,
              height: '2px',
              transformOrigin: 'left center',
              transform: `rotate(${angle}deg)`,
              zIndex: 5,
            },
          },
        },
        context: {
          timing: {
            start: word.absoluteStart,
            duration: params.lineGrowDuration + params.pulseDuration,
          },
        },
        childrenData: [
          // Line base (gradient background)
          {
            id: lineBaseId,
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: `<div style="width: 100%; height: 100%; background: linear-gradient(90deg, rgba(59, 130, 246, 0.3) 0%, ${params.lineColor} 100%);"></div>`,
              className: 'absolute inset-0',
              style: {
                transformOrigin: 'left center',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.lineGrowDuration,
              },
            },
            effects: [
              {
                id: `line-grow-${index}`,
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: params.lineGrowDuration,
                  mode: 'provider',
                  targetIds: [lineBaseId],
                  ranges: [
                    { key: 'scaleX', val: 0, prog: 0 },
                    { key: 'scaleX', val: 1, prog: 1 },
                  ],
                },
              },
            ],
          },
          // Pulse particle (travels along line after growth)
          {
            id: linePulseId,
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: `<div style="width: 8px; height: 4px; background: ${params.pulseColor}; box-shadow: 0 0 8px ${params.pulseColor};"></div>`,
              className: 'absolute left-0 top-1/2 -translate-y-1/2',
            },
            context: {
              timing: {
                start: params.lineGrowDuration,
                duration: params.pulseDuration,
              },
            },
            effects: [
              {
                id: `pulse-travel-${index}`,
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: params.pulseDuration,
                  mode: 'provider',
                  targetIds: [linePulseId],
                  ranges: [
                    { key: 'translateX', val: 0, prog: 0 },
                    { key: 'translateX', val: length, prog: 1 },
                    { key: 'opacity', val: 1, prog: 0 },
                    { key: 'opacity', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          },
        ],
      };

      connectionLines.push(connectionLine);
    }
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'expanding-graph-typo-canvas',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-gradient-to-br from-slate-900 to-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.captions.length > 0
          ? Math.max(
              ...params.captions.map((c) => c.absoluteStart + c.duration),
            )
          : 10,
      },
    },
    childrenData: [
      {
        id: 'graph-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.captions.length > 0
              ? Math.max(
                  ...params.captions.map((c) => c.absoluteStart + c.duration),
                )
              : 10,
          },
        },
        childrenData: [...connectionLines, ...wordNodes] as RenderableComponentData[],
      },
    ],
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
  id: 'expanding-graph-typo',
  title: 'ExpandingGraphTypo - Neural Network Growth Animation',
  description:
    'A typokinetics preset where text forms an ever-expanding graph structure using golden angle spiral positioning. Words appear sequentially from center, each connected by nerve impulse lines. Features elastic pop-in animations for words, pulsing line growth effects, and impact word sizing based on metadata. Creates a neural network or mycelium growth visualization perfect for dynamic storytelling or concept mapping.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'graph',
    'neural-network',
    'golden-angle',
    'spiral',
    'connections',
    'animated',
    'node-graph',
    'mycelium',
    'growth',
    'impact-words',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        text: 'Welcome to the neural network',
        start: 0,
        duration: 3,
        absoluteStart: 0,
        words: [
          { text: 'Welcome', start: 0, duration: 0.5, absoluteStart: 0 },
          { text: 'to', start: 0.5, duration: 0.3, absoluteStart: 0.5 },
          { text: 'the', start: 0.8, duration: 0.3, absoluteStart: 0.8 },
          { text: 'neural', start: 1.1, duration: 0.7, absoluteStart: 1.1 },
          { text: 'network', start: 1.8, duration: 0.7, absoluteStart: 1.8 },
        ],
        metadata: { impact: 1.2 },
      },
      {
        text: 'Ideas connecting like synapses',
        start: 3,
        duration: 3,
        absoluteStart: 3,
        words: [
          { text: 'Ideas', start: 0, duration: 0.6, absoluteStart: 3 },
          {
            text: 'connecting',
            start: 0.6,
            duration: 0.9,
            absoluteStart: 3.6,
          },
          { text: 'like', start: 1.5, duration: 0.4, absoluteStart: 4.5 },
          { text: 'synapses', start: 1.9, duration: 0.8, absoluteStart: 4.9 },
        ],
        metadata: { impact: 0.8 },
      },
    ],
    baseRadius: 80,
    fontSize: 24,
    impactFontScale: 1.5,
    font: 'Inter:600',
    textColor: '#ffffff',
    glowColor: 'rgba(59, 130, 246, 0.8)',
    lineColor: 'rgba(59, 130, 246, 0.6)',
    pulseColor: 'rgba(96, 165, 250, 1)',
    popDuration: 0.4,
    lineGrowDuration: 0.2,
    pulseDuration: 0.15,
    impactThreshold: 0.7,
  },
};

// --- Export Preset ---
export const expandingGraphTypoPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
