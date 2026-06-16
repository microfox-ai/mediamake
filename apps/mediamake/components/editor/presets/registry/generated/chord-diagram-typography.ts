/**
 * Chord Diagram Typography Preset
 *
 * Creates a minimalist chord diagram visualization with words arranged as arc labels
 * around a thin circular outline, connected by delicate hairline ribbons. The ribbons
 * have varying opacity (0.1 to 0.4) based on connection strength, creating a sophisticated
 * data visualization aesthetic.
 *
 * Features:
 * - **Circular Arc Layout**: Words positioned around a circular perimeter with upright text orientation
 * - **Ribbon Connections**: Hairline lines (1px) connecting related words with opacity based on connection strength
 * - **Synchronized Animations**: Words and ribbons fade in together (400ms ease-out for words, linear for ribbons)
 * - **Monochromatic Palette**: Clean white/gray text on dark background with accent-colored ribbons
 * - **Technical Aesthetic**: IBM Plex Mono font at 0.75rem for professional/infographic style
 * - **Data-Driven Opacity**: Connection strength (0-1) determines final ribbon opacity (0.1-0.4 range)
 *
 * Use cases:
 * - Data visualization presentations
 * - Technical content with relationship mapping
 * - Professional infographics
 * - Academic or scientific content
 * - Network and connection diagrams
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionWord,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Zod schema for preset parameters
const presetParams = z.object({
  words: z
    .array(
      z.object({
        text: z.string().describe('The word text to display'),
        start: z.number().describe('Relative start time for the word'),
        duration: z.number().describe('Duration the word is visible'),
        absoluteStart: z
          .number()
          .describe('Absolute start time in caption timeline'),
      }),
    )
    .describe('Array of words to display on the circular perimeter'),
  connections: z
    .array(
      z.object({
        from: z.number().describe('Index of the source word'),
        to: z.number().describe('Index of the target word'),
        strength: z
          .number()
          .min(0)
          .max(1)
          .describe('Connection strength (0-1) determining ribbon opacity'),
      }),
    )
    .optional()
    .describe(
      'Array of connections between words with strength values (0-1)',
    ),
  containerSize: z
    .number()
    .default(640)
    .optional()
    .describe('Width and height of the circular container in pixels'),
  fontSize: z
    .number()
    .default(12)
    .optional()
    .describe('Font size for words in pixels (0.75rem default = 12px)'),
  textColor: z
    .string()
    .default('#e5e5e5')
    .optional()
    .describe('Color for word text (white/gray)'),
  circleColor: z
    .string()
    .default('#3f3f46')
    .optional()
    .describe('Color for the circular outline (zinc-700)'),
  accentColor: z
    .string()
    .default('#60a5fa')
    .optional()
    .describe('Accent color for ribbon connections'),
  wordFadeDuration: z
    .number()
    .default(0.4)
    .optional()
    .describe('Duration of word fade-in animation in seconds'),
  ribbonFadeDuration: z
    .number()
    .default(0.3)
    .optional()
    .describe('Duration of ribbon fade-in animation in seconds'),
  minRibbonOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .optional()
    .describe('Minimum ribbon opacity for weakest connections'),
  maxRibbonOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .optional()
    .describe('Maximum ribbon opacity for strongest connections'),
  captionAbsoluteStart: z
    .number()
    .default(0)
    .optional()
    .describe('Absolute start time of the caption in the video timeline'),
  totalDuration: z
    .number()
    .optional()
    .describe('Total duration of the visualization'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { presets } = props;

  // Validate dependencies
  if (!presets || !presets.genericOpacityEffect) {
    throw new Error('Preset dependency "genericOpacityEffect" not found');
  }

  // Helper function to calculate position on circle perimeter
  const calculateArcPosition = (
    index: number,
    total: number,
    radius: number,
  ): { x: number; y: number; angle: number } => {
    const angle = (index / total) * 360;
    const radians = (angle - 90) * (Math.PI / 180);
    const x = radius + radius * Math.cos(radians);
    const y = radius + radius * Math.sin(radians);
    return { x, y, angle };
  };

  // Helper function to create ribbon connection
  const createRibbon = (
    fromPos: { x: number; y: number },
    toPos: { x: number; y: number },
    strength: number,
    index: number,
    timing: { start: number; duration: number },
  ): RenderableComponentData => {
    const { minRibbonOpacity, maxRibbonOpacity, accentColor, ribbonFadeDuration } = params;

    // Calculate target opacity based on strength
    const targetOpacity =
      minRibbonOpacity + strength * (maxRibbonOpacity - minRibbonOpacity);

    // Calculate line properties
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    const ribbonId = `ribbon-${index}`;

    return {
      id: ribbonId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: `${fromPos.x}px`,
            top: `${fromPos.y}px`,
            width: `${length}px`,
            height: '1px',
            backgroundColor: accentColor,
            transform: `rotate(${angleDeg}deg)`,
            transformOrigin: '0 0',
            opacity: 0,
            zIndex: 5,
          },
        },
      },
      context: {
        timing: {
          start: timing.start,
          duration: timing.duration,
        },
      },
      effects: [
        {
          id: `ribbon-fade-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: ribbonFadeDuration,
            mode: 'provider',
            targetIds: [ribbonId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: targetOpacity, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData;
  };

  const {
    words,
    connections,
    containerSize,
    fontSize,
    textColor,
    circleColor,
    wordFadeDuration,
    captionAbsoluteStart,
    totalDuration,
  } = params;

  const radius = containerSize / 2;
  const wordRadius = radius - 40; // Position words 40px from edge

  // Calculate total duration if not provided
  const calculatedDuration =
    totalDuration ||
    Math.max(...words.map((w) => w.start + w.duration), 5);

  // Create word components positioned on arc
  const wordComponents: RenderableComponentData[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const position = calculateArcPosition(i, words.length, wordRadius);

    const wordId = `chord-word-${i}`;

    // Call genericOpacityEffect for word fade-in
    const effectResult = await presets.genericOpacityEffect(
      {
        targetId: wordId,
        effectStart: word.start,
        effectDuration: wordFadeDuration,
        fadeInProgress: 1.0,
        impact: 1.0,
        effectId: `word-fade-${i}`,
      },
      props,
    );

    const wordEffect =
      effectResult?.output?._extractedEffects?.[0] ||
      effectResult?.output?.childrenData?.[0]?.effects?.[0];

    wordComponents.push({
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word.text,
        style: {
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          fontSize: `${fontSize}px`,
          color: textColor,
          fontWeight: '400',
          transform: `translate(-50%, -50%) rotate(${position.angle}deg) translateY(-${wordRadius}px) rotate(-${position.angle}deg)`,
          transformOrigin: 'center',
          whiteSpace: 'nowrap',
          zIndex: 10,
        },
        font: {
          family: 'IBM Plex Mono',
          weights: ['400'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: calculatedDuration,
        },
      },
      effects: wordEffect ? [wordEffect] : [],
    } as RenderableComponentData);
  }

  // Create ribbon connections
  const ribbonComponents: RenderableComponentData[] = [];

  if (connections && connections.length > 0) {
    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];
      const fromWord = words[connection.from];
      const toWord = words[connection.to];

      if (!fromWord || !toWord) continue;

      const fromPos = calculateArcPosition(
        connection.from,
        words.length,
        wordRadius,
      );
      const toPos = calculateArcPosition(
        connection.to,
        words.length,
        wordRadius,
      );

      // Ribbon should appear synchronized with the later of the two connected words
      const ribbonStart = Math.max(fromWord.start, toWord.start);
      const ribbonDuration = calculatedDuration - ribbonStart;

      const ribbon = createRibbon(fromPos, toPos, connection.strength, i, {
        start: ribbonStart,
        duration: ribbonDuration,
      });

      ribbonComponents.push(ribbon);
    }
  }

  // Create circular outline container
  const circularContainer: RenderableComponentData = {
    id: 'chord-circular-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative border-2 rounded-full',
        style: {
          width: `${containerSize}px`,
          height: `${containerSize}px`,
          borderColor: circleColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: calculatedDuration,
      },
    },
    childrenData: [...ribbonComponents, ...wordComponents],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'chord-diagram-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-zinc-950 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: captionAbsoluteStart,
        duration: calculatedDuration,
      },
    },
    childrenData: [circularContainer],
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
  id: 'chord-diagram-typography',
  title: 'Chord Diagram Typography',
  description:
    'Minimalist chord diagram visualization with words arranged as arc labels around a thin circular outline, connected by delicate hairline ribbons with varying opacity based on connection strength. Features synchronized fade-in animations for words and ribbons, creating a sophisticated data visualization aesthetic with monochromatic palette suitable for professional and technical content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'diagram',
    'chord',
    'visualization',
    'data',
    'circular',
    'network',
    'relationships',
    'minimalist',
    'professional',
    'infographic',
  ],
  dependencies: {
    presets: ['genericOpacityEffect'],
  },
  defaultInputParams: {
    words: [
      { text: 'Innovation', start: 0, duration: 5, absoluteStart: 0 },
      { text: 'Design', start: 0.2, duration: 5, absoluteStart: 0.2 },
      { text: 'Technology', start: 0.4, duration: 5, absoluteStart: 0.4 },
      { text: 'Strategy', start: 0.6, duration: 5, absoluteStart: 0.6 },
      { text: 'Analysis', start: 0.8, duration: 5, absoluteStart: 0.8 },
      { text: 'Research', start: 1.0, duration: 5, absoluteStart: 1.0 },
      { text: 'Development', start: 1.2, duration: 5, absoluteStart: 1.2 },
      { text: 'Execution', start: 1.4, duration: 5, absoluteStart: 1.4 },
    ],
    connections: [
      { from: 0, to: 1, strength: 0.8 },
      { from: 1, to: 2, strength: 0.6 },
      { from: 2, to: 3, strength: 0.9 },
      { from: 3, to: 4, strength: 0.5 },
      { from: 4, to: 5, strength: 0.7 },
      { from: 5, to: 6, strength: 0.85 },
      { from: 6, to: 7, strength: 0.65 },
      { from: 7, to: 0, strength: 0.75 },
      { from: 0, to: 4, strength: 0.4 },
      { from: 2, to: 6, strength: 0.55 },
    ],
    containerSize: 640,
    fontSize: 12,
    textColor: '#e5e5e5',
    circleColor: '#3f3f46',
    accentColor: '#60a5fa',
    wordFadeDuration: 0.4,
    ribbonFadeDuration: 0.3,
    minRibbonOpacity: 0.1,
    maxRibbonOpacity: 0.4,
    captionAbsoluteStart: 0,
    totalDuration: 5,
  },
};

// Export preset
export const chordDiagramTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
