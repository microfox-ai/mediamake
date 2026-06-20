/**
 * Spring Connected Typography Preset
 *
 * This preset creates a dynamic typography system where words bounce into position
 * with realistic spring physics. Each word is connected by elastic lines that stretch
 * and contract, creating an interconnected text constellation held together by
 * invisible rubber bands.
 *
 * Features:
 * - **Spring Physics Animation**: Words bounce with physics-based overshooting and settling
 * - **Elastic Connection Lines**: Visual representation of spring connections between words
 * - **Reactive Tug Effects**: New words "tug" on connected words causing subtle shifts
 * - **Sentence Clustering**: Words grouped by sentence with differentiated connection strengths
 * - **Grid-Based Positioning**: Words arranged in calculated grid-like positions
 * - **Dynamic Connection Rendering**: Lines adapt to word positions with variable thickness
 *
 * Use cases:
 * - Creating dynamic text constellations with physics simulation
 * - Building interconnected typography networks
 * - Adding responsive text systems with spring effects
 * - Creating engaging animated text presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption sentences with words'),
  gridColumns: z.number().min(2).max(8).default(4).describe('Number of columns in grid layout'),
  gridGap: z.number().min(20).max(200).default(80).describe('Gap between grid cells in pixels'),
  fontSize: z.number().min(24).max(120).default(48).describe('Font size for words'),
  textColor: z.string().default('#ffffff').describe('Text color for words'),
  font: z.string().optional().default('Inter:700').describe('Font family with optional weight (e.g., "Inter:700", "Roboto:600")'),
  springDuration: z.number().min(0.2).max(2).default(0.5).describe('Duration of spring bounce animation in seconds'),
  tugDuration: z.number().min(0.05).max(0.5).default(0.1).describe('Duration of tug effect when new word appears in seconds'),
  tugIntensity: z.number().min(0.1).max(2).default(1).0).describe('Intensity multiplier for tug effect offset'),
  lineOpacity: z.number().min(0.1).max(1).default(0.4).describe('Opacity of connection lines'),
  intraSentenceLineWidth: z.number().min(1).max(10).default(2).describe('Stroke width for connections within same sentence'),
  interSentenceLineWidth: z.number().min(1).max(10).default(4).describe('Stroke width for connections between sentences'),
  wordOverlap: z.number().min(0).max(200).default(50).describe('Timing overlap between word animations in milliseconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];
  
  // Parse font string
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate grid layout positions
  const calculateGridPosition = (wordIndex: number): { x: number; y: number } => {
    const col = wordIndex % params.gridColumns;
    const row = Math.floor(wordIndex / params.gridColumns);
    const centerOffsetX = (1920 - (params.gridColumns * params.gridGap)) / 2;
    const centerOffsetY = (1080 - (Math.ceil(captions.reduce((acc, s) => acc + s.words.length, 0) / params.gridColumns) * params.gridGap)) / 2;
    
    return {
      x: centerOffsetX + (col * params.gridGap),
      y: centerOffsetY + (row * params.gridGap),
    };
  };

  // Calculate tug offset based on connection
  const calculateTugOffset = (fromIndex: number, toIndex: number): { x: number; y: number } => {
    const fromPos = calculateGridPosition(fromIndex);
    const toPos = calculateGridPosition(toIndex);
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const normalizedX = (dx / distance) * 5 * params.tugIntensity;
    const normalizedY = (dy / distance) * 5 * params.tugIntensity;
    return { x: normalizedX, y: normalizedY };
  };

  // Build word components with spring physics
  const wordComponents: RenderableComponentData[] = [];
  const connectionLines: RenderableComponentData[] = [];
  let globalWordIndex = 0;

  captions.forEach((caption, sentenceIndex) => {
    const sentenceStartIndex = globalWordIndex;
    
    caption.words.forEach((word, wordIndexInSentence) => {
      const wordId = `spring-word-${sentenceIndex}-${wordIndexInSentence}`;
      const position = calculateGridPosition(globalWordIndex);
      
      // Create spring bounce effect
      const springEffect = {
        id: `spring-bounce-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: word.start,
          duration: params.springDuration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            { key: 'translateY', val: -50, prog: 0 },
            { key: 'scale', val: 0, prog: 0 },
            { key: 'translateY', val: 10, prog: 0.3 },
            { key: 'scale', val: 1.1, prog: 0.3 },
            { key: 'translateY', val: -5, prog: 0.5 },
            { key: 'scale', val: 0.98, prog: 0.5 },
            { key: 'translateY', val: 2, prog: 0.7 },
            { key: 'scale', val: 1.01, prog: 0.7 },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      };

      // Create tug effect for connected words (triggered when next word appears)
      const tugEffects: any[] = [];
      if (wordIndexInSentence < caption.words.length - 1) {
        const nextWord = caption.words[wordIndexInSentence + 1];
        const tugOffset = calculateTugOffset(globalWordIndex, globalWordIndex + 1);
        
        tugEffects.push({
          id: `tug-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: nextWord.start - 0.05,
            duration: params.tugDuration,
            mode: 'provider' as const,
            targetIds: [wordId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateX', val: tugOffset.x, prog: 0.5 },
              { key: 'translateY', val: tugOffset.y, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        });
      }

      wordComponents.push({
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: params.fontSize,
            fontWeight: fontStyle.fontWeight || 700,
            color: params.textColor,
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          },
          font: {
            family: fontFamily,
            weights: [fontStyle.fontWeight?.toString() || '700'],
          },
        },
        context: {
          timing: {
            start: word.start,
            duration: word.duration,
          },
        },
        effects: [springEffect, ...tugEffects],
      } as RenderableComponentData);

      // Create connection line to next word in same sentence (intra-sentence)
      if (wordIndexInSentence < caption.words.length - 1) {
        const nextWord = caption.words[wordIndexInSentence + 1];
        const nextPosition = calculateGridPosition(globalWordIndex + 1);
        const lineId = `line-intra-${sentenceIndex}-${wordIndexInSentence}`;

        connectionLines.push({
          id: lineId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<svg width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none;">
              <line 
                x1="${position.x}" 
                y1="${position.y}" 
                x2="${nextPosition.x}" 
                y2="${nextPosition.y}" 
                stroke="rgba(255,255,255,${params.lineOpacity})" 
                stroke-width="${params.intraSentenceLineWidth}" 
              />
            </svg>`,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: word.start,
              duration: nextWord.end - word.start,
            },
          },
          effects: [
            {
              id: `elastic-${lineId}`,
              componentId: 'generic',
              data: {
                type: 'ease-out' as const,
                start: 0,
                duration: params.springDuration,
                mode: 'provider' as const,
                targetIds: [lineId],
                ranges: [
                  { key: 'scaleX', val: 0, prog: 0 },
                  { key: 'scaleX', val: 1.2, prog: 0.3 },
                  { key: 'scaleX', val: 0.95, prog: 0.6 },
                  { key: 'scaleX', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData);
      }

      globalWordIndex++;
    });

    // Create inter-sentence connections (thicker lines)
    if (sentenceIndex < captions.length - 1) {
      const nextSentence = captions[sentenceIndex + 1];
      const lastWordInSentence = caption.words[caption.words.length - 1];
      const firstWordInNextSentence = nextSentence.words[0];
      
      const currentPos = calculateGridPosition(globalWordIndex - 1);
      const nextPos = calculateGridPosition(globalWordIndex);
      const lineId = `line-inter-${sentenceIndex}`;

      connectionLines.push({
        id: lineId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<svg width="100%" height="100%" style="position: absolute; top: 0; left: 0; pointer-events: none;">
            <line 
              x1="${currentPos.x}" 
              y1="${currentPos.y}" 
              x2="${nextPos.x}" 
              y2="${nextPos.y}" 
              stroke="rgba(255,255,255,${params.lineOpacity * 1.5})" 
              stroke-width="${params.interSentenceLineWidth}" 
            />
          </svg>`,
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: lastWordInSentence.start,
            duration: firstWordInNextSentence.end - lastWordInSentence.start,
          },
        },
        effects: [
          {
            id: `elastic-${lineId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out' as const,
              start: 0,
              duration: params.springDuration,
              mode: 'provider' as const,
              targetIds: [lineId],
              ranges: [
                { key: 'scaleX', val: 0, prog: 0 },
                { key: 'scaleX', val: 1.2, prog: 0.3 },
                { key: 'scaleX', val: 0.95, prog: 0.6 },
                { key: 'scaleX', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  });

  // Calculate total duration from captions
  const totalDuration = captions.reduce(
    (max, caption) => Math.max(max, caption.absoluteEnd),
    0,
  );

  // Build container for word positions
  const wordsContainer: RenderableComponentData = {
    id: 'spring-words-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
      childrenProps: wordComponents.map((_, index) => {
        const position = calculateGridPosition(index);
        return {
          className: 'absolute',
          style: {
            left: `${position.x}px`,
            top: `${position.y}px`,
            transformOrigin: 'center center',
          },
        };
      }),
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordComponents,
  };

  // Build container for connection lines
  const connectionsContainer: RenderableComponentData = {
    id: 'spring-connections-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: connectionLines,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'spring-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [connectionsContainer, wordsContainer],
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
  id: 'SpringConnectedTypography',
  title: 'Spring Connected Typography',
  description:
    'Typokinetic preset featuring realistic spring physics for text connections. Words bounce into position with physics-based overshooting, connected by elastic lines that stretch and contract. New words create tug effects on connected words, simulating an interconnected text constellation held by invisible rubber bands. Sentence-level clustering with thickness-differentiated connection lines.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'spring',
    'physics',
    'connections',
    'elastic',
    'constellation',
    'network',
    'interactive',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    gridColumns: 4,
    gridGap: 80,
    fontSize: 48,
    textColor: '#ffffff',
    font: 'Inter:700',
    springDuration: 0.5,
    tugDuration: 0.1,
    tugIntensity: 1.0,
    lineOpacity: 0.4,
    intraSentenceLineWidth: 2,
    interSentenceLineWidth: 4,
    wordOverlap: 50,
  },
};

export const SpringConnectedTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
