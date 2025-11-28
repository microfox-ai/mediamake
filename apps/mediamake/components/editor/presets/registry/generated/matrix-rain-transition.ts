/**
 * Matrix Rain Code Transition Preset
 *
 * Creates a cinematic Matrix-style transition where the outgoing video dissolves into
 * falling green digital characters that cascade down the screen, gradually revealing
 * the incoming video beneath. Features 40 vertical code columns with 30 characters each,
 * variable fall speeds, brightness flickering, horizontal scan lines, and periodic glitch
 * effects for an authentic digital aesthetic.
 *
 * Features:
 * - 40 vertical columns of falling Matrix-style characters
 * - Variable fall speeds (2-4s) for organic cascading effect
 * - Character brightness variations and glow effects
 * - Horizontal scanning lines that sweep across the screen
 * - Glitch effects with opacity flicker and horizontal shift
 * - Crossfade transition between outgoing and incoming videos
 * - Screen blend mode for authentic Matrix overlay effect
 *
 * Use Cases:
 * - Sci-fi video transitions
 * - Tech/digital content scene changes
 * - Cyberpunk aesthetic videos
 * - Matrix-inspired intro/outro sequences
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Matrix character set (katakana, numbers, symbols)
const MATRIX_CHARS =
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video that fades out'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video that fades in'),
  transitionDuration: z
    .number()
    .default(1.6)
    .describe(
      'Duration of the transition overlap in seconds (default: 1.6s)',
    ),
  columnCount: z
    .number()
    .default(40)
    .describe('Number of vertical code columns (default: 40)'),
  charactersPerColumn: z
    .number()
    .default(30)
    .describe('Number of characters in each column (default: 30)'),
  matrixColor: z
    .string()
    .default('#4ade80')
    .describe('Color of the Matrix characters (default: green-400)'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Intensity of the character glow effect (0-1, default: 0.8)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    columnCount,
    charactersPerColumn,
    matrixColor,
    glowIntensity,
  } = params;

  // Helper: Generate random Matrix character
  const getRandomChar = () => {
    return MATRIX_CHARS.charAt(Math.floor(Math.random() * MATRIX_CHARS.length));
  };

  // Helper: Generate random value in range
  const random = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  // Create Matrix columns
  const matrixColumns: RenderableComponentData[] = [];

  for (let col = 0; col < columnCount; col++) {
    const columnId = `matrix-column-${col}`;
    const fallDuration = random(2, 4); // Random fall speed (2-4s)
    const fallDelay = random(0, 1); // Random start delay (0-1s)

    // Create character spans for this column
    const characterSpans: RenderableComponentData[] = [];

    for (let char = 0; char < charactersPerColumn; char++) {
      const charId = `${columnId}-char-${char}`;
      const randomChar = getRandomChar();
      const flickerDuration = random(0.2, 0.5);
      const flickerDelay = random(0, 2);

      characterSpans.push({
        id: charId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<span style="font-family: monospace; font-size: 12px; color: ${matrixColor}; text-shadow: 0 0 10px rgba(0, 255, 0, ${glowIntensity}), 0 0 20px rgba(0, 255, 0, ${glowIntensity * 0.5}); display: block; text-align: center; height: ${100 / charactersPerColumn}%;">${randomChar}</span>`,
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'matrix-transition-root',
          },
        },
        effects: [
          {
            id: `${charId}-flicker`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: flickerDelay,
              duration: flickerDuration,
              mode: 'provider' as const,
              targetIds: [charId],
              ranges: [
                { key: 'opacity', val: 0.6, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0.6, prog: 1 },
              ],
              loop: true,
            },
          },
        ],
      } as RenderableComponentData);
    }

    // Create column container
    matrixColumns.push({
      id: columnId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute flex flex-col',
          style: {
            width: `${100 / columnCount}%`,
            height: '200%',
            top: '-100%',
            left: `${(col * 100) / columnCount}%`,
            maskImage:
              'linear-gradient(to bottom, transparent 0%, white 20%, white 80%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, white 20%, white 80%, transparent 100%)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'matrix-transition-root',
        },
      },
      childrenData: characterSpans,
      effects: [
        {
          id: `${columnId}-fall`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: fallDelay,
            duration: fallDuration,
            mode: 'provider' as const,
            targetIds: [columnId],
            ranges: [
              { key: 'translateY', val: 0, prog: 0, unit: '%' },
              { key: 'translateY', val: 200, prog: 1, unit: '%' },
            ],
            loop: true,
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create Matrix rain container
  const matrixRainContainer: RenderableComponentData = {
    id: 'matrix-rain-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'matrix-transition-root',
      },
    },
    childrenData: matrixColumns,
  };

  // Create scan line overlay
  const scanLineOverlay: RenderableComponentData = {
    id: 'scan-line-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute w-full pointer-events-none',
        style: {
          height: '2px',
          backgroundColor: `rgba(0, 255, 0, ${glowIntensity * 0.3})`,
          boxShadow: `0 0 20px rgba(0, 255, 0, ${glowIntensity * 0.6}), 0 0 40px rgba(0, 255, 0, ${glowIntensity * 0.3})`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'matrix-transition-root',
      },
    },
    effects: [
      {
        id: 'scan-line-sweep',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: 2,
          mode: 'provider' as const,
          targetIds: ['scan-line-overlay'],
          ranges: [
            { key: 'translateY', val: -50, prog: 0, unit: 'vh' },
            { key: 'translateY', val: 150, prog: 1, unit: 'vh' },
          ],
          loop: true,
        },
      },
    ],
  };

  // Create glitch overlay with bars
  const glitchBars: RenderableComponentData[] = [
    {
      id: 'glitch-bar-1',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 3px; background: linear-gradient(90deg, transparent, rgba(0, 255, 0, ${glowIntensity * 0.5}), transparent);"></div>`,
        style: {
          position: 'absolute' as const,
          top: '30%',
          left: '0',
          right: '0',
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'matrix-transition-root',
        },
      },
    },
    {
      id: 'glitch-bar-2',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 2px; background: linear-gradient(90deg, transparent, rgba(0, 255, 0, ${glowIntensity * 0.4}), transparent);"></div>`,
        style: {
          position: 'absolute' as const,
          top: '55%',
          left: '0',
          right: '0',
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'matrix-transition-root',
        },
      },
    },
    {
      id: 'glitch-bar-3',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 4px; background: linear-gradient(90deg, transparent, rgba(0, 255, 0, ${glowIntensity * 0.6}), transparent);"></div>`,
        style: {
          position: 'absolute' as const,
          top: '80%',
          left: '0',
          right: '0',
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'matrix-transition-root',
        },
      },
    },
  ];

  const glitchOverlay: RenderableComponentData = {
    id: 'glitch-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'matrix-transition-root',
      },
    },
    childrenData: glitchBars,
    effects: [
      {
        id: 'glitch-flicker',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: 0.15,
          mode: 'provider' as const,
          targetIds: ['glitch-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 0.5 },
            { key: 'opacity', val: 0.2, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
          loop: true,
        },
      },
      {
        id: 'glitch-shift',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: 0.1,
          mode: 'provider' as const,
          targetIds: ['glitch-overlay'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 5, prog: 0.25 },
            { key: 'translateX', val: -3, prog: 0.5 },
            { key: 'translateX', val: 2, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
          loop: true,
        },
      },
    ],
  };

  // Create video layers
  const outgoingVideoLayer: RenderableComponentData = {
    id: 'outgoing-video-layer',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      fit: 'cover' as const,
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'outgoing-video-layer',
      },
    },
    effects: [
      {
        id: 'outgoing-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: transitionDuration * 0.5,
          mode: 'provider' as const,
          targetIds: ['outgoing-video-layer'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      fit: 'cover' as const,
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: transitionDuration * 0.3,
        fitDurationTo: 'incoming-video-layer',
      },
    },
    effects: [
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: transitionDuration * 0.5,
          mode: 'provider' as const,
          targetIds: ['incoming-video-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'matrix-transition-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10, // Default duration, will be adjusted by fitDurationTo in video layers
      },
    },
    childrenData: [
      outgoingVideoLayer,
      incomingVideoLayer,
      matrixRainContainer,
      scanLineOverlay,
      glitchOverlay,
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

const presetMetadata: PresetMetadata = {
  id: 'matrix-rain-transition',
  title: 'Matrix Rain Code Transition',
  description:
    'A cinematic transition effect inspired by The Matrix movie where the outgoing video dissolves into falling green digital characters that cascade down the screen, gradually morphing to reveal the incoming video. Features 40 vertical code columns with 30 characters each, variable fall speeds, brightness flickering, horizontal scan lines, and periodic glitch effects for an authentic digital aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'matrix',
    'code-rain',
    'digital',
    'sci-fi',
    'glitch',
    'cinematic',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 1.6,
    columnCount: 40,
    charactersPerColumn: 30,
    matrixColor: '#4ade80',
    glowIntensity: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const matrixRainTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
