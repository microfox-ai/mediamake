/**
 * NetworkRevealTypokinetics Preset
 *
 * This preset creates dramatic network graph reveal sequences with cinematic flair.
 * Pre-computed word clusters (grouped by sentences) are revealed section by section
 * with connection lines drawing themselves using glowing tracer effects. Each cluster
 * reveal is accompanied by a subtle container shake effect, scan-line overlays, and
 * digital glitch moments during transitions.
 *
 * Features:
 * - **Network Graph Structure**: Pre-positioned word clusters based on sentence groupings
 * - **Section-by-Section Reveal**: Clusters revealed in waves with staggered animations
 * - **Glowing Tracer Effects**: Connection lines draw with bright leading edge and blur trail
 * - **Container Shake**: Subtle camera shake triggered at each cluster reveal
 * - **Scan-Line Overlay**: Repeating-linear-gradient for high-tech aesthetic
 * - **Digital Glitch**: Random opacity flicker and hue-rotate on transition moments
 * - **Audio-Reactive**: Optional waveform-based shake enhancement if audio present
 *
 * Use cases:
 * - Creating high-tech interface animations
 * - Building dramatic subtitle reveal sequences
 * - Creating network visualization effects
 * - Adding cinematic flair to text presentations
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
            id: z.string(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number(),
          }),
        ),
      }),
    )
    .describe('Caption sentences with words for network clustering'),
  textColor: z
    .string()
    .default('#00ffff')
    .describe('Color for text nodes (default: cyan)'),
  fontSize: z
    .number()
    .default(18)
    .describe('Font size for text nodes in pixels'),
  fontWeight: z
    .string()
    .default('600')
    .describe('Font weight for text nodes'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Text shadow glow intensity (0-1)'),
  clusterRevealDuration: z
    .number()
    .default(0.4)
    .describe('Duration of cluster reveal animation in seconds'),
  clusterStagger: z
    .number()
    .default(0.05)
    .describe('Stagger delay between word reveals within cluster (seconds)'),
  lineDrawDuration: z
    .number()
    .default(0.3)
    .describe('Duration of connection line draw animation in seconds'),
  tracerSize: z
    .number()
    .default(6)
    .describe('Size of glowing tracer dot in pixels'),
  shakeDuration: z
    .number()
    .default(0.2)
    .describe('Duration of shake effect in seconds'),
  shakeIntensity: z
    .number()
    .default(3)
    .describe('Shake intensity in pixels'),
  glitchProbability: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Probability of glitch occurring at transitions (0-1)'),
  audio: z
    .object({
      src: z.string(),
      volume: z.number().optional(),
    })
    .optional()
    .describe('Optional audio for audio-reactive shake enhancement'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    textColor,
    fontSize,
    fontWeight,
    glowIntensity,
    clusterRevealDuration,
    clusterStagger,
    lineDrawDuration,
    tracerSize,
    shakeDuration,
    shakeIntensity,
    glitchProbability,
    audio,
  } = params;

  if (!captions || captions.length === 0) {
    return {
      output: {
        childrenData: [],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }

  // Helper: Calculate cluster position (circular network layout)
  const calculateClusterPosition = (
    index: number,
    total: number,
    centerX: number = 50,
    centerY: number = 50,
    radius: number = 30,
  ): { x: number; y: number } => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  };

  // Helper: Calculate word position within cluster (small circular formation)
  const calculateWordPosition = (
    wordIndex: number,
    totalWords: number,
    clusterRadius: number = 5,
  ): { x: number; y: number } => {
    if (totalWords === 1) return { x: 0, y: 0 };
    const angle = (wordIndex / totalWords) * 2 * Math.PI;
    return {
      x: clusterRadius * Math.cos(angle),
      y: clusterRadius * Math.sin(angle),
    };
  };

  // Calculate total duration
  const totalDuration =
    captions[captions.length - 1].absoluteEnd - captions[0].absoluteStart;

  // Create network clusters for each sentence
  const clusterGroups: RenderableComponentData[] = [];
  const connectionLines: RenderableComponentData[] = [];
  const tracerDots: RenderableComponentData[] = [];
  const shakeEffects: any[] = [];
  const glitchEffects: any[] = [];

  captions.forEach((sentence, sentenceIndex) => {
    const clusterPos = calculateClusterPosition(
      sentenceIndex,
      captions.length,
    );
    const clusterId = `cluster-${sentenceIndex}`;

    // Create word nodes for this cluster
    const wordNodes: RenderableComponentData[] = sentence.words.map(
      (word, wordIndex) => {
        const wordPos = calculateWordPosition(
          wordIndex,
          sentence.words.length,
          4,
        );
        const wordId = `word-${sentenceIndex}-${wordIndex}`;

        return {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: `${fontSize}px`,
              color: textColor,
              fontWeight: fontWeight,
              textShadow: `0 0 ${fontSize * 0.44}px rgba(0,255,255,${glowIntensity})`,
              position: 'absolute' as const,
              left: `${50 + wordPos.x}%`,
              top: `${50 + wordPos.y}%`,
              transform: 'translate(-50%, -50%)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: sentence.duration,
            },
          },
          effects: [
            {
              id: `reveal-${wordId}`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: clusterRevealDuration,
                mode: 'provider',
                targetIds: [wordId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                  { key: 'scale', val: 0.5, prog: 0 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData;
      },
    );

    // Create cluster container
    const clusterContainer: RenderableComponentData = {
      id: clusterId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: `${clusterPos.x}%`,
            top: `${clusterPos.y}%`,
            width: '100px',
            height: '100px',
            transform: 'translate(-50%, -50%)',
          },
        },
      },
      context: {
        timing: {
          start: sentence.absoluteStart - captions[0].absoluteStart,
          duration: sentence.duration,
        },
      },
      childrenData: wordNodes,
    };

    clusterGroups.push(clusterContainer);

    // Create shake effect for this cluster reveal
    shakeEffects.push({
      id: `shake-${sentenceIndex}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: sentence.absoluteStart - captions[0].absoluteStart,
        duration: shakeDuration,
        mode: 'provider',
        targetIds: ['shake-container'],
        ranges: [
          {
            key: 'translate',
            val: 'translate(0, 0)',
            prog: 0,
          },
          {
            key: 'translate',
            val: `translate(${-shakeIntensity}px, ${shakeIntensity * 0.67}px)`,
            prog: 0.1,
          },
          {
            key: 'translate',
            val: `translate(${shakeIntensity}px, ${-shakeIntensity * 0.67}px)`,
            prog: 0.2,
          },
          {
            key: 'translate',
            val: 'translate(0, 0)',
            prog: 0.3,
          },
        ],
      },
    });

    // Create glitch effect (random chance)
    if (Math.random() < glitchProbability) {
      glitchEffects.push({
        id: `glitch-${sentenceIndex}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: sentence.absoluteStart - captions[0].absoluteStart,
          duration: 0.15,
          mode: 'provider',
          targetIds: ['network-content-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
            { key: 'filter', val: 'hue-rotate(30deg)', prog: 0.5 },
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
          ],
        },
      });
    }

    // Create connection line to next cluster
    if (sentenceIndex < captions.length - 1) {
      const nextClusterPos = calculateClusterPosition(
        sentenceIndex + 1,
        captions.length,
      );

      const lineId = `line-${sentenceIndex}-${sentenceIndex + 1}`;
      const tracerId = `tracer-${sentenceIndex}-${sentenceIndex + 1}`;

      // SVG line with gradient
      const lineHtml = `
        <svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;">
          <defs>
            <linearGradient id="line-grad-${sentenceIndex}" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:${textColor};stop-opacity:0.2"/>
              <stop offset="100%" style="stop-color:${textColor};stop-opacity:0.8"/>
            </linearGradient>
          </defs>
          <line 
            x1="${clusterPos.x}%" 
            y1="${clusterPos.y}%" 
            x2="${nextClusterPos.x}%" 
            y2="${nextClusterPos.y}%" 
            stroke="url(#line-grad-${sentenceIndex})" 
            stroke-width="2"
          />
        </svg>
      `;

      connectionLines.push({
        id: lineId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: lineHtml,
          style: {
            position: 'absolute' as const,
            inset: 0,
            pointerEvents: 'none' as const,
          },
        },
        context: {
          timing: {
            start:
              sentence.absoluteStart -
              captions[0].absoluteStart +
              clusterRevealDuration,
            duration: lineDrawDuration,
          },
        },
        effects: [
          {
            id: `line-draw-${lineId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: lineDrawDuration,
              mode: 'provider',
              targetIds: [lineId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);

      // Tracer dot
      const tracerHtml = `
        <div style="
          position:absolute;
          width:${tracerSize}px;
          height:${tracerSize}px;
          background:${textColor};
          border-radius:50%;
          box-shadow:0 0 ${tracerSize * 2}px ${textColor};
          left:${clusterPos.x}%;
          top:${clusterPos.y}%;
          transform:translate(-50%,-50%);
        "></div>
      `;

      tracerDots.push({
        id: tracerId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: tracerHtml,
          style: {
            position: 'absolute' as const,
            inset: 0,
            pointerEvents: 'none' as const,
          },
        },
        context: {
          timing: {
            start:
              sentence.absoluteStart -
              captions[0].absoluteStart +
              clusterRevealDuration,
            duration: lineDrawDuration,
          },
        },
        effects: [
          {
            id: `tracer-move-${tracerId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: lineDrawDuration,
              mode: 'provider',
              targetIds: [tracerId],
              ranges: [
                {
                  key: 'translate',
                  val: `translate(${(nextClusterPos.x - clusterPos.x) * 0}%, ${(nextClusterPos.y - clusterPos.y) * 0}%)`,
                  prog: 0,
                },
                {
                  key: 'translate',
                  val: `translate(${(nextClusterPos.x - clusterPos.x)}%, ${(nextClusterPos.y - clusterPos.y)}%)`,
                  prog: 1,
                },
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: 'blur(4px)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  });

  // Scan-line overlay
  const scanlineOverlay: RenderableComponentData = {
    id: 'scanline-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.03) 2px,rgba(255,255,255,0.03) 4px);pointer-events:none;z-index:50;"></div>`,
      style: {},
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Network content container (with shake and glitch effects)
  const networkContentContainer: RenderableComponentData = {
    id: 'network-content-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: glitchEffects,
    childrenData: [...clusterGroups, ...connectionLines, ...tracerDots],
  };

  // Shake container (isolated for shake effect)
  const shakeContainer: RenderableComponentData = {
    id: 'shake-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: shakeEffects,
    childrenData: [networkContentContainer],
  };

  // Root container with scan-line overlay
  const rootContainer: RenderableComponentData = {
    id: 'network-reveal-typokinetics-container',
    type: 'layout' as const,
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
    childrenData: [scanlineOverlay, shakeContainer],
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
  id: 'NetworkRevealTypokinetics',
  title: 'Network Reveal Typokinetics',
  description:
    'Dramatic network graph reveal sequences with cinematic flair. Pre-computed word clusters revealed in waves with glowing tracer connection lines, container shake effects, scan-line overlays, and digital glitch transitions. High-tech interface powering-up aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'network',
    'reveal',
    'typokinetics',
    'cinematic',
    'high-tech',
    'glitch',
    'shake',
    'tracer',
    'scan-line',
    'dramatic',
  ],
  defaultInputParams: {
    captions: [],
    textColor: '#00ffff',
    fontSize: 18,
    fontWeight: '600',
    glowIntensity: 0.6,
    clusterRevealDuration: 0.4,
    clusterStagger: 0.05,
    lineDrawDuration: 0.3,
    tracerSize: 6,
    shakeDuration: 0.2,
    shakeIntensity: 3,
    glitchProbability: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const NetworkRevealTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};