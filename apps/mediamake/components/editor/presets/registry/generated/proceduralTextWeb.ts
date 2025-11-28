/**
 * Procedural Text Web Preset
 *
 * This preset treats the entire caption as a procedural network visualization. Words are nodes
 * arranged in a force-directed graph layout simulation. The preset calculates positions based on
 * word relationships - words appearing close in time cluster together, while the overall structure
 * expands outward like a growing organism.
 *
 * Features:
 * - **Force-Directed Layout**: Words positioned using force simulation (attraction/repulsion)
 * - **Depth Effects**: Opacity and blur based on distance from center (3D illusion)
 * - **Animated Connections**: Lines between words with drawing effects (scaleX transforms)
 * - **Breathing Animation**: Continuous scale oscillation on all elements (living topology)
 * - **Temporal Clustering**: Words appearing close in time cluster together
 * - **Organic Expansion**: Structure expands outward like a growing organism
 *
 * Use cases:
 * - Creating network visualizations from captions
 * - Building organic, living typography systems
 * - Visualizing word relationships and temporal connections
 * - Creating abstract, procedural text animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

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
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe('Font family with optional weight (e.g., "Inter:600", "Roboto:700")'),

  fontSize: z
    .number()
    .min(12)
    .max(120)
    .optional()
    .default(32)
    .describe('Base font size for words in pixels'),

  textColor: z
    .string()
    .optional()
    .default('#FFFFFF')
    .describe('Text color for words (CSS color value)'),

  lineColor: z
    .string()
    .optional()
    .default('#FFFFFF')
    .describe('Color for connection lines (CSS color value)'),

  lineOpacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.3)
    .describe('Opacity for connection lines'),

  forceStrength: z
    .number()
    .min(0.1)
    .max(3)
    .optional()
    .default(1)
    .describe('Strength of force-directed layout (higher = more spread)'),

  clusterTightness: z
    .number()
    .min(0.1)
    .max(2)
    .optional()
    .default(0.7)
    .describe('How tightly words cluster by time proximity (lower = tighter)'),

  breathingSpeed: z
    .number()
    .min(0.5)
    .max(5)
    .optional()
    .default(2)
    .describe('Duration of breathing cycle in seconds'),

  breathingIntensity: z
    .number()
    .min(0)
    .max(0.1)
    .optional()
    .default(0.02)
    .describe('Scale intensity of breathing animation (0.02 = 2% scale change)'),

  maxBlur: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .default(2)
    .describe('Maximum blur in pixels for distant words (depth effect)'),

  minOpacity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.3)
    .describe('Minimum opacity for distant words (depth effect)'),

  showLines: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to show connection lines between words'),

  maxConnections: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .default(3)
    .describe('Maximum number of connections per word'),

  connectionDistance: z
    .number()
    .min(50)
    .max(500)
    .optional()
    .default(200)
    .describe('Maximum distance for connections in pixels'),
});

// --- Preset Execution ---

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { config } = props;
  const fps = config?.fps || 30;

  // Parse font
  const fontString = params.font || 'Inter:600';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate scene duration (all captions)
  const sceneDuration =
    params.captions.length > 0
      ? Math.max(...params.captions.map((c) => c.absoluteEnd))
      : 10;

  // Extract all words with global timing
  interface WordNode {
    id: string;
    text: string;
    absoluteStart: number;
    absoluteEnd: number;
    duration: number;
    captionIndex: number;
    wordIndex: number;
  }

  const allWords: WordNode[] = [];
  params.captions.forEach((caption, captionIndex) => {
    caption.words.forEach((word, wordIndex) => {
      allWords.push({
        id: word.id || `word-${captionIndex}-${wordIndex}`,
        text: word.text,
        absoluteStart: word.absoluteStart,
        absoluteEnd: word.absoluteEnd,
        duration: word.duration,
        captionIndex,
        wordIndex,
      });
    });
  });

  if (allWords.length === 0) {
    // No words, return empty
    return {
      output: {
        childrenData: [],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  // --- Force-Directed Layout Simulation ---

  interface Position {
    x: number;
    y: number;
  }

  // Initialize positions randomly within viewport
  const viewportWidth = config?.width || 1920;
  const viewportHeight = config?.height || 1080;
  const centerX = viewportWidth / 2;
  const centerY = viewportHeight / 2;

  const positions: Position[] = allWords.map((word, index) => {
    // Start from center with small random offset
    const angle = (index / allWords.length) * Math.PI * 2;
    const radius = 50 + Math.random() * 50;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });

  // Simple force simulation
  const iterations = 50;
  const forceMultiplier = params.forceStrength ?? 1;
  const clusterFactor = params.clusterTightness ?? 0.7;

  for (let iter = 0; iter < iterations; iter++) {
    const forces: Position[] = positions.map(() => ({ x: 0, y: 0 }));

    // Repulsion between all nodes
    for (let i = 0; i < allWords.length; i++) {
      for (let j = i + 1; j < allWords.length; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;
        const repulsion = (1000 * forceMultiplier) / (dist * dist);
        const fx = (dx / dist) * repulsion;
        const fy = (dy / dist) * repulsion;
        forces[i].x -= fx;
        forces[i].y -= fy;
        forces[j].x += fx;
        forces[j].y += fy;
      }
    }

    // Attraction based on temporal proximity (clustering)
    for (let i = 0; i < allWords.length; i++) {
      for (let j = i + 1; j < allWords.length; j++) {
        const timeDiff = Math.abs(
          allWords[i].absoluteStart - allWords[j].absoluteStart,
        );
        // Words close in time attract each other
        if (timeDiff < 3) {
          // Within 3 seconds
          const dx = positions[j].x - positions[i].x;
          const dy = positions[j].y - positions[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 1;
          const attraction =
            ((3 - timeDiff) * 20 * clusterFactor * forceMultiplier) / dist;
          const fx = (dx / dist) * attraction;
          const fy = (dy / dist) * attraction;
          forces[i].x += fx;
          forces[i].y += fy;
          forces[j].x -= fx;
          forces[j].y -= fy;
        }
      }
    }

    // Center gravity (weak pull to center)
    for (let i = 0; i < allWords.length; i++) {
      const dx = centerX - positions[i].x;
      const dy = centerY - positions[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 1;
      const gravity = 0.5 * forceMultiplier;
      forces[i].x += (dx / dist) * gravity;
      forces[i].y += (dy / dist) * gravity;
    }

    // Apply forces
    const damping = 0.5;
    for (let i = 0; i < allWords.length; i++) {
      positions[i].x += forces[i].x * damping;
      positions[i].y += forces[i].y * damping;
    }
  }

  // Calculate distance from center for depth effects
  const distances = positions.map((pos) => {
    const dx = pos.x - centerX;
    const dy = pos.y - centerY;
    return Math.sqrt(dx * dx + dy * dy);
  });
  const maxDistance = Math.max(...distances, 1);

  // --- Create Connection Lines ---

  interface Connection {
    fromIndex: number;
    toIndex: number;
    distance: number;
  }

  const connections: Connection[] = [];

  if (params.showLines) {
    for (let i = 0; i < allWords.length; i++) {
      const candidates: Connection[] = [];
      for (let j = 0; j < allWords.length; j++) {
        if (i === j) continue;
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (params.connectionDistance ?? 200)) {
          candidates.push({ fromIndex: i, toIndex: j, distance: dist });
        }
      }
      // Sort by distance and take closest N
      candidates.sort((a, b) => a.distance - b.distance);
      const maxConn = params.maxConnections ?? 3;
      connections.push(...candidates.slice(0, maxConn));
    }
  }

  // --- Create Word Nodes ---

  const wordNodes: RenderableComponentData[] = allWords.map((word, index) => {
    const pos = positions[index];
    const dist = distances[index];
    const normalizedDist = dist / maxDistance; // 0 to 1

    // Depth effects
    const opacity =
      1 - normalizedDist * (1 - (params.minOpacity ?? 0.3)) * 0.7;
    const blur = normalizedDist * (params.maxBlur ?? 2);

    const wordId = `word-node-${word.id}`;

    // Breathing effect (continuous scale oscillation)
    const breathingDuration = params.breathingSpeed ?? 2;
    const breathingIntensity = params.breathingIntensity ?? 0.02;

    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word.text,
        style: {
          fontSize: params.fontSize ?? 32,
          color: params.textColor ?? '#FFFFFF',
          ...fontStyle,
          willChange: 'transform, opacity, filter',
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['600'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: sceneDuration,
        },
      },
      effects: [
        // Appearance animation (fade + translate)
        {
          id: `appear-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: word.absoluteStart,
            duration: 0.5,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: opacity, prog: 1 },
              { key: 'translateY', val: 20, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
        // Depth blur effect
        {
          id: `depth-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: word.absoluteStart,
            duration: sceneDuration - word.absoluteStart,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              {
                key: 'filter',
                val: `blur(${blur}px)`,
                prog: 0,
              },
              {
                key: 'filter',
                val: `blur(${blur}px)`,
                prog: 1,
              },
            ],
          },
        },
        // Continuous breathing animation
        {
          id: `breathing-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: word.absoluteStart,
            duration: breathingDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1 + breathingIntensity, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Create wrapper containers for word positioning
  const wordContainers: RenderableComponentData[] = wordNodes.map(
    (wordNode, index) => {
      const pos = positions[index];
      return {
        id: `word-container-${allWords[index].id}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute transform-gpu',
            style: {
              transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: sceneDuration,
          },
        },
        childrenData: [wordNode],
      } as RenderableComponentData;
    },
  );

  // --- Create Connection Lines ---

  const lineNodes: RenderableComponentData[] = connections.map(
    (conn, connIndex) => {
      const fromPos = positions[conn.fromIndex];
      const toPos = positions[conn.toIndex];
      const fromWord = allWords[conn.fromIndex];
      const toWord = allWords[conn.toIndex];

      // Calculate line properties
      const dx = toPos.x - fromPos.x;
      const dy = toPos.y - fromPos.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      // Line appears when both words are visible
      const lineStart = Math.max(fromWord.absoluteStart, toWord.absoluteStart);
      const lineEnd = Math.min(fromWord.absoluteEnd, toWord.absoluteEnd);
      const lineDuration = lineEnd - lineStart;

      if (lineDuration <= 0) return null; // Skip if no overlap

      const lineId = `connection-line-${connIndex}`;

      // Calculate average distance from center for opacity
      const avgDist =
        (distances[conn.fromIndex] + distances[conn.toIndex]) / 2;
      const normalizedDist = avgDist / maxDistance;
      const lineOpacity =
        (params.lineOpacity ?? 0.3) * (1 - normalizedDist * 0.5);

      return {
        id: lineId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute transform-gpu',
          style: {
            width: `${length}px`,
            height: '2px',
            backgroundColor: params.lineColor ?? '#FFFFFF',
            opacity: lineOpacity,
            transformOrigin: 'left center',
            willChange: 'transform, opacity',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: sceneDuration,
          },
        },
        effects: [
          // Drawing animation (scaleX from 0 to 1)
          {
            id: `draw-${lineId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: lineStart,
              duration: 0.5,
              mode: 'provider',
              targetIds: [lineId],
              ranges: [
                { key: 'scaleX', val: 0, prog: 0 },
                { key: 'scaleX', val: 1, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: lineOpacity, prog: 1 },
              ],
            },
          },
          // Breathing animation for lines
          {
            id: `breathing-line-${lineId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: lineStart,
              duration: params.breathingSpeed ?? 2,
              mode: 'provider',
              targetIds: [lineId],
              ranges: [
                { key: 'scaleY', val: 1, prog: 0 },
                {
                  key: 'scaleY',
                  val: 1 + (params.breathingIntensity ?? 0.02),
                  prog: 0.5,
                },
                { key: 'scaleY', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  ).filter((node) => node !== null) as RenderableComponentData[];

  // Create wrapper containers for line positioning
  const lineContainers: RenderableComponentData[] = lineNodes.map(
    (lineNode, index) => {
      const conn = connections[index];
      const fromPos = positions[conn.fromIndex];
      const toPos = positions[conn.toIndex];
      const dx = toPos.x - fromPos.x;
      const dy = toPos.y - fromPos.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      return {
        id: `line-container-${index}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute transform-gpu',
            style: {
              transform: `translate3d(${fromPos.x}px, ${fromPos.y}px, 0) rotate(${angle}deg)`,
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: sceneDuration,
          },
        },
        childrenData: [lineNode],
      } as RenderableComponentData;
    },
  );

  // --- Root Container ---

  const rootContainer: RenderableComponentData = {
    id: 'procedural-text-web-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: sceneDuration,
      },
    },
    childrenData: [
      // Network layout container
      {
        id: 'procedural-text-web-network',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              willChange: 'transform, opacity',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: sceneDuration,
          },
        },
        childrenData: [
          ...lineContainers, // Lines first (behind words)
          ...wordContainers, // Words on top
        ],
      } as RenderableComponentData,
    ],
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
  id: 'proceduralTextWeb',
  title: 'Procedural Text Web',
  description:
    'Typokinetic preset that treats captions as a procedural network visualization with force-directed graph layout. Words are nodes positioned based on temporal relationships, with depth effects (opacity/blur), animated connecting lines, and continuous breathing animation creating a living, organic network topology.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'typography',
    'network',
    'procedural',
    'force-directed',
    'graph',
    'visualization',
    'organic',
    'breathing',
    'depth',
    'connections',
    'animated',
  ],
  dependencies: {},
  defaultInputParams: {
    font: 'Inter:600',
    fontSize: 32,
    textColor: '#FFFFFF',
    lineColor: '#FFFFFF',
    lineOpacity: 0.3,
    forceStrength: 1,
    clusterTightness: 0.7,
    breathingSpeed: 2,
    breathingIntensity: 0.02,
    maxBlur: 2,
    minOpacity: 0.3,
    showLines: true,
    maxConnections: 3,
    connectionDistance: 200,
  },
};

// --- Export ---

export const proceduralTextWebPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
