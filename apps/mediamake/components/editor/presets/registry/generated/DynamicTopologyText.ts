/**
 * Dynamic Topology Text Network Preset
 *
 * This preset creates a mesmerizing network visualization where words act as nodes
 * in a constantly reorganizing topology. Words drift along elliptical orbital paths
 * with fade-float entry animations. Connection lines dynamically stretch and contract
 * with distance-based opacity, creating an organic fluid simulation feel.
 *
 * Features:
 * - **Words as Nodes**: Each word is positioned as a node in the network topology
 * - **Elliptical Drift**: Words drift along subtle elliptical paths with varying phase offsets
 * - **Dynamic Connections**: Lines between words with distance-based opacity
 * - **Keyword Anchors**: Keywords drift less (0.3x amplitude) and act as anchors
 * - **Entry Animation**: Fade-and-float effect (opacity 0→1, translateY 30px→0)
 * - **Organic Motion**: Mesmerizing particle-like movement creates fluid simulation feel
 *
 * Use cases:
 * - Creating dynamic network visualizations for keywords
 * - Building organic text animations with interconnected words
 * - Showcasing relationships between concepts in a visual way
 * - Adding mesmerizing motion graphics to text content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
  RenderableComponentData,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PRESET PARAMETERS
// ============================================================================

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
    .describe('Array of caption sentences with words and optional metadata'),

  fontSize: z
    .number()
    .min(12)
    .max(48)
    .default(18)
    .optional()
    .describe('Base font size for words in pixels'),

  keywordFontSize: z
    .number()
    .min(16)
    .max(64)
    .default(24)
    .optional()
    .describe('Font size for keyword words in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Color for regular words'),

  keywordColor: z
    .string()
    .default('#00ffff')
    .optional()
    .describe('Color for keyword words'),

  backgroundColor: z
    .string()
    .default('transparent')
    .optional()
    .describe('Background color for the topology container'),

  font: z
    .string()
    .default('Inter')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:400")',
    ),

  driftIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .optional()
    .describe('Multiplier for drift amplitude (higher = more movement)'),

  driftSpeed: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .optional()
    .describe('Duration of each drift cycle in seconds (4-6 recommended)'),

  keywordDriftScale: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Scale factor for keyword drift amplitude (0.3 = 30% of normal)'),

  maxConnections: z
    .number()
    .min(5)
    .max(30)
    .default(20)
    .optional()
    .describe('Maximum number of visible connection lines (performance limit)'),

  lineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Base opacity for connection lines'),

  entryDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.4)
    .optional()
    .describe('Duration of entry fade-float animation in seconds'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize = 18,
    keywordFontSize = 24,
    textColor = '#ffffff',
    keywordColor = '#00ffff',
    backgroundColor = 'transparent',
    font = 'Inter',
    driftIntensity = 1,
    driftSpeed = 5,
    keywordDriftScale = 0.3,
    maxConnections = 20,
    lineOpacity = 0.3,
    entryDuration = 0.4,
  } = params;

  // Parse font string
  const fontString = font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Calculate initial positions for words in a network layout
  const calculateNetworkPositions = (wordCount: number) => {
    const positions: Array<{ x: number; y: number }> = [];
    const centerX = 50; // Percentage
    const centerY = 50; // Percentage
    const radiusX = 35; // Horizontal spread
    const radiusY = 30; // Vertical spread

    for (let i = 0; i < wordCount; i++) {
      const angle = (i / wordCount) * Math.PI * 2;
      const variance = (Math.random() - 0.5) * 0.3; // Add randomness
      const x = centerX + Math.cos(angle + variance) * radiusX;
      const y = centerY + Math.sin(angle + variance) * radiusY;
      positions.push({ x, y });
    }

    return positions;
  };

  // Helper: Create elliptical drift effect
  const createDriftEffect = (
    wordId: string,
    wordStart: number,
    wordDuration: number,
    phaseOffset: number,
    isKeyword: boolean,
  ): GenericEffectData => {
    const baseDriftX = 15 * driftIntensity;
    const baseDriftY = 10 * driftIntensity;
    const driftX = isKeyword ? baseDriftX * keywordDriftScale : baseDriftX;
    const driftY = isKeyword ? baseDriftY * keywordDriftScale : baseDriftY;

    return {
      type: 'ease-in-out',
      start: wordStart + entryDuration, // Start after entry animation
      duration: wordDuration - entryDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Elliptical path keyframes with phase offset
        {
          key: 'translateX',
          val: Math.cos(phaseOffset) * driftX,
          prog: 0,
        },
        {
          key: 'translateY',
          val: Math.sin(phaseOffset) * driftY,
          prog: 0,
        },
        {
          key: 'translateX',
          val: Math.cos(phaseOffset + Math.PI / 2) * driftX,
          prog: 0.25,
        },
        {
          key: 'translateY',
          val: Math.sin(phaseOffset + Math.PI / 2) * driftY,
          prog: 0.25,
        },
        {
          key: 'translateX',
          val: Math.cos(phaseOffset + Math.PI) * driftX,
          prog: 0.5,
        },
        {
          key: 'translateY',
          val: Math.sin(phaseOffset + Math.PI) * driftY,
          prog: 0.5,
        },
        {
          key: 'translateX',
          val: Math.cos(phaseOffset + (Math.PI * 3) / 2) * driftX,
          prog: 0.75,
        },
        {
          key: 'translateY',
          val: Math.sin(phaseOffset + (Math.PI * 3) / 2) * driftY,
          prog: 0.75,
        },
        {
          key: 'translateX',
          val: Math.cos(phaseOffset + Math.PI * 2) * driftX,
          prog: 1,
        },
        {
          key: 'translateY',
          val: Math.sin(phaseOffset + Math.PI * 2) * driftY,
          prog: 1,
        },
      ],
    };
  };

  // Helper: Create entry fade-float effect
  const createEntryEffect = (
    wordId: string,
    wordStart: number,
  ): GenericEffectData => {
    return {
      type: 'ease-out',
      start: wordStart,
      duration: entryDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'translateY', val: 30, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };
  };

  // Build word nodes with effects
  const wordNodesData: RenderableComponentData[] = [];
  const allWords: Array<{
    id: string;
    text: string;
    isKeyword: boolean;
    position: { x: number; y: number };
  }> = [];

  let wordIndex = 0;

  captions.forEach((caption, captionIndex) => {
    const keyword = caption.metadata?.keyword;

    caption.words.forEach((word, wIndex) => {
      const wordId = `word-${captionIndex}-${wIndex}`;
      const isKeyword = keyword
        ? word.text.toLowerCase() === keyword.toLowerCase()
        : false;

      wordNodesData.push({
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: isKeyword ? keywordFontSize : fontSize,
            fontWeight: isKeyword ? 700 : 400,
            color: isKeyword ? keywordColor : textColor,
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            transform: 'translate(-50%, -50%)',
            willChange: 'transform, opacity',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: isKeyword ? ['700'] : ['400'],
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        effects: [],
      });

      allWords.push({
        id: wordId,
        text: word.text,
        isKeyword,
        position: { x: 0, y: 0 }, // Will be calculated
      });

      wordIndex++;
    });
  });

  // Calculate positions for all words
  const positions = calculateNetworkPositions(allWords.length);
  allWords.forEach((word, index) => {
    word.position = positions[index];
  });

  // Apply positions and effects to word nodes
  wordNodesData.forEach((wordNode, index) => {
    const word = allWords[index];
    const phaseOffset = (index / allWords.length) * Math.PI * 2;

    // Set initial position
    (wordNode.data as any).style.left = `${word.position.x}%`;
    (wordNode.data as any).style.top = `${word.position.y}%`;

    // Add entry effect
    const entryEffect = {
      id: `entry-${wordNode.id}`,
      componentId: 'generic',
      data: createEntryEffect(wordNode.id, 0), // Relative to caption start
    };

    // Add drift effect
    const caption = captions[Math.floor(index / 10)]; // Approximate caption
    const driftEffect = {
      id: `drift-${wordNode.id}`,
      componentId: 'generic',
      data: createDriftEffect(
        wordNode.id,
        0,
        caption?.duration || 5,
        phaseOffset,
        word.isKeyword,
      ),
    };

    wordNode.effects = [entryEffect, driftEffect];
  });

  // Create connection lines using HTMLBlockAtom (SVG)
  const connectionLinesData: RenderableComponentData[] = [];

  // Select random word pairs for connections (limit to maxConnections)
  const connectionCount = Math.min(maxConnections, Math.floor(allWords.length / 2));
  const selectedConnections: Array<[number, number]> = [];

  for (let i = 0; i < connectionCount; i++) {
    const idx1 = Math.floor(Math.random() * allWords.length);
    let idx2 = Math.floor(Math.random() * allWords.length);
    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * allWords.length);
    }
    selectedConnections.push([idx1, idx2]);
  }

  selectedConnections.forEach(([idx1, idx2], lineIndex) => {
    const word1 = allWords[idx1];
    const word2 = allWords[idx2];

    // Calculate line SVG
    const x1 = word1.position.x;
    const y1 = word1.position.y;
    const x2 = word2.position.x;
    const y2 = word2.position.y;

    const lineSvg = `
      <svg style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; pointer-events: none;">
        <line 
          x1="${x1}%" 
          y1="${y1}%" 
          x2="${x2}%" 
          y2="${y2}%" 
          stroke="${textColor}" 
          stroke-width="1" 
          opacity="${lineOpacity}" 
          style="transition: opacity 0.3s ease;"
        />
      </svg>
    `;

    connectionLinesData.push({
      id: `line-${lineIndex}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: lineSvg,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 1,
        },
      },
      context: {
        timing: {
          start: captions[0].absoluteStart,
          duration: captions[captions.length - 1].absoluteEnd - captions[0].absoluteStart,
        },
      },
    } as RenderableComponentData);
  });

  // Create word nodes container
  const wordNodesContainer: RenderableComponentData = {
    id: 'topology-word-nodes-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 2,
          transform: 'translateZ(0)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions[captions.length - 1].absoluteEnd,
      },
    },
    childrenData: wordNodesData as RenderableComponentData[],
  };

  // Create connection canvas container
  const connectionCanvasContainer: RenderableComponentData = {
    id: 'topology-connection-canvas',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 1,
          transform: 'translateZ(0)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions[captions.length - 1].absoluteEnd,
      },
    },
    childrenData: connectionLinesData as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'topology-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions[captions.length - 1].absoluteEnd,
      },
    },
    childrenData: [connectionCanvasContainer, wordNodesContainer] as RenderableComponentData[],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'DynamicTopologyText',
  title: 'Dynamic Topology Text Network',
  description:
    'Mesmerizing network visualization where words act as nodes in a constantly reorganizing topology. Words drift along elliptical orbital paths with fade-float entry animations. Connection lines dynamically stretch and contract with distance-based opacity, creating an organic fluid simulation feel. Keywords act as stable anchors while other words orbit around them.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'network',
    'topology',
    'dynamic',
    'drift',
    'elliptical',
    'connections',
    'organic',
    'fluid',
    'particles',
    'keywords',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Dynamic topology networks',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'Dynamic',
            start: 0,
            absoluteStart: 0,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.8,
          },
          {
            id: 'word-2',
            text: 'topology',
            start: 0.8,
            absoluteStart: 0.8,
            end: 1.6,
            absoluteEnd: 1.6,
            duration: 0.8,
          },
          {
            id: 'word-3',
            text: 'networks',
            start: 1.6,
            absoluteStart: 1.6,
            end: 3,
            absoluteEnd: 3,
            duration: 1.4,
          },
        ],
        metadata: {
          keyword: 'topology',
        },
      },
    ],
    fontSize: 18,
    keywordFontSize: 24,
    textColor: '#ffffff',
    keywordColor: '#00ffff',
    backgroundColor: 'transparent',
    font: 'Inter:400',
    driftIntensity: 1,
    driftSpeed: 5,
    keywordDriftScale: 0.3,
    maxConnections: 20,
    lineOpacity: 0.3,
    entryDuration: 0.4,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const DynamicTopologyTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
