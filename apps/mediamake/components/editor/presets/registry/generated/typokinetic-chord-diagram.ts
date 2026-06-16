/**
 * Typokinetic Chord Diagram Preset
 *
 * This preset creates a D3.js-inspired chord diagram that visualizes text as interconnected arcs
 * around a circular perimeter. Words from caption data appear as arc segments positioned along
 * the circle's edge, with ribbon-like bezier-curved connections flowing between related words
 * based on temporal adjacency. Ribbons animate with opacity blending as they flow between arcs.
 *
 * Features:
 * - **Circular Word Layout**: Words positioned as arc segments along circle perimeter using CSS transforms
 * - **Temporal Ribbon Connections**: Bezier-curved ribbons connect temporally adjacent words (word N → word N+1)
 * - **Sequential Word Animation**: Words fade in sequentially using word-level timing with scale effects (0.8→1.0)
 * - **Staggered Ribbon Animation**: Ribbons appear 100ms after their connected words with opacity blending
 * - **Opacity Blending**: Ribbons use mix-blend-mode: overlay for visual richness
 * - **GPU-Accelerated**: All animations use transforms, scale, and opacity for performance
 * - **Dark Background**: Uses bg-slate-900 with light-colored words and semi-transparent gradient ribbons
 *
 * Use cases:
 * - Creating network visualization effects for spoken content
 * - Building interconnected word relationship diagrams
 * - Visualizing temporal flow of speech with animated connections
 * - Creating dynamic circular typography layouts
 * - Adding D3.js-style data visualization aesthetics
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

// --- Preset Parameters Schema ---
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
      }),
    )
    .describe('Caption data with word-level timing for chord diagram visualization'),
  font: z
    .string()
    .default('Inter:600')
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:600", "Roboto:700")'),
  wordColor: z
    .string()
    .default('#E2E8F0')
    .optional()
    .describe('Color for word text (light colors recommended for dark background)'),
  ribbonGradientStart: z
    .string()
    .default('#6366F1')
    .optional()
    .describe('Starting color for ribbon gradients'),
  ribbonGradientEnd: z
    .string()
    .default('#EC4899')
    .optional()
    .describe('Ending color for ribbon gradients'),
  circleRadius: z
    .number()
    .min(200)
    .max(600)
    .default(350)
    .optional()
    .describe('Radius of the circular arrangement in pixels'),
  wordFontSize: z
    .number()
    .min(12)
    .max(48)
    .default(18)
    .optional()
    .describe('Font size for word text in pixels'),
  ribbonOpacity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Maximum opacity for ribbons (0-1)'),
  ribbonDelay: z
    .number()
    .min(0)
    .max(500)
    .default(100)
    .optional()
    .describe('Delay in milliseconds before ribbons appear after their connected words'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:600';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 600;

  // Extract all words from captions
  const allWords: Array<{
    text: string;
    start: number;
    absoluteStart: number;
    duration: number;
    captionIndex: number;
    wordIndex: number;
  }> = [];

  params.captions.forEach((caption, captionIndex) => {
    caption.words.forEach((word, wordIndex) => {
      allWords.push({
        text: word.text,
        start: word.start,
        absoluteStart: word.absoluteStart,
        duration: word.duration,
        captionIndex,
        wordIndex,
      });
    });
  });

  const wordCount = allWords.length;
  if (wordCount === 0) {
    throw new Error('No words found in caption data');
  }

  // Calculate positions for words around circle
  const circleRadius = params.circleRadius || 350;
  const angleStep = 360 / wordCount;

  // Helper function to create word arc component
  const createWordArc = (
    word: (typeof allWords)[0],
    globalIndex: number,
  ): RenderableComponentData => {
    const angle = angleStep * globalIndex;
    const wordId = `word-arc-${globalIndex}`;

    // Calculate rotation and position
    // Words rotate to face outward from circle center
    const rotationAngle = angle - 90; // -90 to start from top

    // Position using transform
    const transform = `rotate(${angle}deg) translateY(-${circleRadius}px) rotate(${-angle}deg)`;

    // Word fade-in and scale effect (first 20% of word duration)
    const effectDuration = word.duration * 0.2;
    const wordEffect: GenericEffectData = {
      type: 'ease-out',
      start: word.absoluteStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'scale', val: 0.8, prog: 0 },
        { key: 'scale', val: 1.0, prog: 1 },
      ],
    };

    return {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word.text,
        style: {
          fontSize: params.wordFontSize || 18,
          color: params.wordColor || '#E2E8F0',
          fontWeight: fontWeight,
          textAlign: 'center',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
      },
      context: {
        timing: {
          start: word.absoluteStart,
          duration: word.duration,
        },
      },
      effects: [
        {
          id: `word-effect-${globalIndex}`,
          componentId: 'generic',
          data: wordEffect,
        },
      ],
    } as RenderableComponentData;
  };

  // Helper function to create ribbon connection between two words
  const createRibbon = (
    wordIndex1: number,
    wordIndex2: number,
  ): RenderableComponentData | null => {
    const word1 = allWords[wordIndex1];
    const word2 = allWords[wordIndex2];

    const ribbonId = `ribbon-${wordIndex1}-${wordIndex2}`;

    // Calculate angles for both words
    const angle1 = angleStep * wordIndex1;
    const angle2 = angleStep * wordIndex2;

    // Calculate positions
    const rad1 = (angle1 * Math.PI) / 180;
    const rad2 = (angle2 * Math.PI) / 180;

    const x1 = Math.cos(rad1) * circleRadius;
    const y1 = Math.sin(rad1) * circleRadius;
    const x2 = Math.cos(rad2) * circleRadius;
    const y2 = Math.sin(rad2) * circleRadius;

    // Center point for bezier curve control
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2;

    // Calculate bezier control points (pulled toward center for curved appearance)
    const controlOffset = 0.3; // Pull control points 30% toward center
    const cp1x = x1 + (cx - x1) * controlOffset;
    const cp1y = y1 + (cy - y1) * controlOffset;
    const cp2x = x2 + (cx - x2) * controlOffset;
    const cp2y = y2 + (cy - y2) * controlOffset;

    // Create SVG path for ribbon
    const svgPath = `
      <svg style="position: absolute; width: 100%; height: 100%; pointer-events: none;">
        <defs>
          <linearGradient id="ribbon-gradient-${wordIndex1}-${wordIndex2}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${params.ribbonGradientStart || '#6366F1'}" stop-opacity="${params.ribbonOpacity || 0.6}" />
            <stop offset="100%" stop-color="${params.ribbonGradientEnd || '#EC4899'}" stop-opacity="${params.ribbonOpacity || 0.6}" />
          </linearGradient>
        </defs>
        <path
          d="M ${x1 + circleRadius},${y1 + circleRadius} C ${cp1x + circleRadius},${cp1y + circleRadius} ${cp2x + circleRadius},${cp2y + circleRadius} ${x2 + circleRadius},${y2 + circleRadius}"
          stroke="url(#ribbon-gradient-${wordIndex1}-${wordIndex2})"
          stroke-width="2"
          fill="none"
          style="mix-blend-mode: overlay;"
        />
      </svg>
    `;

    // Ribbon appears after both connected words, with stagger delay
    const ribbonStart = Math.max(word1.absoluteStart, word2.absoluteStart);
    const ribbonDelay = (params.ribbonDelay || 100) / 1000; // Convert ms to seconds
    const ribbonEffectStart = ribbonStart + ribbonDelay;
    const ribbonDuration = 0.5; // Ribbon fade-in duration

    // Calculate ribbon lifetime (until second word ends)
    const ribbonLifetime = word2.absoluteStart + word2.duration - ribbonEffectStart;

    if (ribbonLifetime <= 0) {
      return null; // Skip if timing doesn't work out
    }

    const ribbonEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: ribbonEffectStart,
      duration: ribbonDuration,
      mode: 'provider',
      targetIds: [ribbonId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: params.ribbonOpacity || 0.6, prog: 1 },
      ],
    };

    return {
      id: ribbonId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: svgPath,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: ribbonEffectStart,
          duration: ribbonLifetime,
        },
      },
      effects: [
        {
          id: `ribbon-effect-${wordIndex1}-${wordIndex2}`,
          componentId: 'generic',
          data: ribbonEffect,
        },
      ],
    } as RenderableComponentData;
  };

  // Create all word arc components
  const wordArcs: RenderableComponentData[] = allWords.map((word, index) =>
    createWordArc(word, index),
  );

  // Create ribbon connections (connect each word to next word)
  const ribbons: RenderableComponentData[] = [];
  for (let i = 0; i < wordCount - 1; i++) {
    const ribbon = createRibbon(i, i + 1);
    if (ribbon) {
      ribbons.push(ribbon);
    }
  }

  // Calculate total duration (last word end time)
  const totalDuration =
    allWords[allWords.length - 1].absoluteStart + allWords[allWords.length - 1].duration;

  // Build composition structure
  const wordArcsContainer: RenderableComponentData = {
    id: 'word-arcs-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordArcs.map((wordArc, index) => {
      const angle = angleStep * index;
      const transform = `rotate(${angle}deg) translateY(-${circleRadius}px)`;

      return {
        id: `word-arc-wrapper-${index}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              transform: transform,
              transformOrigin: 'center',
              left: '50%',
              top: '50%',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [wordArc],
      } as RenderableComponentData;
    }),
  } as RenderableComponentData;

  const ribbonsContainer: RenderableComponentData = {
    id: 'ribbons-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: ribbons,
  } as RenderableComponentData;

  const circularStage: RenderableComponentData = {
    id: 'circular-stage',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          width: '80%',
          height: '80%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [wordArcsContainer, ribbonsContainer],
  } as RenderableComponentData;

  const rootContainer: RenderableComponentData = {
    id: 'typokinetic-chord-diagram-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-slate-900 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [circularStage],
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'typokinetic-chord-diagram',
  title: 'Typokinetic Chord Diagram',
  description:
    'D3.js-inspired chord diagram that visualizes text as interconnected arcs around a circular perimeter. Words from caption data appear as arc segments positioned along the circle\'s edge, with ribbon-like bezier-curved connections flowing between related words based on temporal adjacency. Ribbons animate with opacity blending (mix-blend-mode: overlay) as they flow between source and destination arcs. Words fade in sequentially using word-level timing with scale animations. GPU-accelerated transforms only.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'chord-diagram',
    'd3js',
    'circular',
    'network',
    'visualization',
    'interconnected',
    'ribbons',
    'temporal',
    'bezier',
    'opacity-blending',
    'captions',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Visualizing the interconnected nature of words',
        start: 0,
        absoluteStart: 0,
        end: 3.5,
        absoluteEnd: 3.5,
        duration: 3.5,
        words: [
          {
            id: 'word-1',
            text: 'Visualizing',
            start: 0,
            absoluteStart: 0,
            end: 0.6,
            absoluteEnd: 0.6,
            duration: 0.6,
            confidence: 0.98,
          },
          {
            id: 'word-2',
            text: 'the',
            start: 0.6,
            absoluteStart: 0.6,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.2,
            confidence: 0.99,
          },
          {
            id: 'word-3',
            text: 'interconnected',
            start: 0.8,
            absoluteStart: 0.8,
            end: 1.8,
            absoluteEnd: 1.8,
            duration: 1.0,
            confidence: 0.97,
          },
          {
            id: 'word-4',
            text: 'nature',
            start: 1.8,
            absoluteStart: 1.8,
            end: 2.3,
            absoluteEnd: 2.3,
            duration: 0.5,
            confidence: 0.98,
          },
          {
            id: 'word-5',
            text: 'of',
            start: 2.3,
            absoluteStart: 2.3,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 0.2,
            confidence: 0.99,
          },
          {
            id: 'word-6',
            text: 'words',
            start: 2.5,
            absoluteStart: 2.5,
            end: 3.5,
            absoluteEnd: 3.5,
            duration: 1.0,
            confidence: 0.98,
          },
        ],
      },
    ],
    font: 'Inter:600',
    wordColor: '#E2E8F0',
    ribbonGradientStart: '#6366F1',
    ribbonGradientEnd: '#EC4899',
    circleRadius: 350,
    wordFontSize: 18,
    ribbonOpacity: 0.6,
    ribbonDelay: 100,
  },
};

// --- Export Preset ---
export const typokineticChordDiagramPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
