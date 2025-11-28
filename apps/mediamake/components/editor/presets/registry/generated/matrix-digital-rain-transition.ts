/**
 * Matrix Digital Rain Transition Preset
 *
 * This preset creates an iconic Matrix-style digital rain transition effect where cascading
 * green code characters dissolve the outgoing video and reveal the incoming video.
 *
 * Features:
 * - **Digital Rain Effect**: Grid of falling characters at varying speeds
 * - **Matrix Green Aesthetic**: Sepia/hue-rotate filter for authentic Matrix look
 * - **Scanline Overlay**: Horizontal scanlines for CRT monitor effect
 * - **Organic Animation**: Random delays and durations for natural falling motion
 * - **Smooth Transition**: 1.5s crossfade between outgoing and incoming videos
 * - **Screen Blend Mode**: Characters blend with video for integrated look
 *
 * Use cases:
 * - Tech-themed video transitions
 * - Cyberpunk/Matrix-style effects
 * - Digital/code reveal transitions
 * - Sci-fi video transitions
 * - Hacker/programming content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z
    .object({
      src: z.string().describe('Source URL of outgoing video'),
      startFrom: z.number().optional().describe('Start time of outgoing video in seconds'),
      endAt: z.number().optional().describe('End time of outgoing video in seconds'),
    })
    .describe('Outgoing video configuration'),
  incomingVideo: z
    .object({
      src: z.string().describe('Source URL of incoming video'),
      startFrom: z.number().optional().describe('Start time of incoming video in seconds'),
      endAt: z.number().optional().describe('End time of incoming video in seconds'),
    })
    .describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition effect in seconds'),
  gridCols: z
    .number()
    .default(20)
    .describe('Number of grid columns for falling characters'),
  gridRows: z
    .number()
    .default(30)
    .describe('Number of grid rows for falling characters'),
  characterSet: z
    .string()
    .default('01アイウエオカキクケコサシスセソタチツテト')
    .describe('Characters to use for the digital rain effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    gridCols,
    gridRows,
    characterSet,
  } = params;

  // Helper function to get random character from set
  const getRandomChar = (): string => {
    return characterSet[Math.floor(Math.random() * characterSet.length)];
  };

  // Helper function to generate random duration and delay
  const getRandomAnimation = () => {
    const duration = 0.5 + Math.random() * 1.5; // 0.5s - 2s
    const delay = Math.random() * 1.0; // 0s - 1s
    return { duration, delay };
  };

  // Generate grid cells
  const gridCells: RenderableComponentData[] = [];
  const totalCells = gridCols * gridRows;

  for (let i = 0; i < totalCells; i++) {
    const { duration, delay } = getRandomAnimation();
    const char = getRandomChar();

    const cellId = `matrix-cell-${i}`;

    gridCells.push({
      id: cellId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="font-family: monospace; color: #00ff00; font-size: 12px; display: flex; align-items: center; justify-content: center; height: 100%; width: 100%;">${char}</div>`,
        className: 'text-green-400 text-xs font-mono',
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `fall-${cellId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: delay,
            duration: duration,
            mode: 'provider',
            targetIds: [cellId],
            ranges: [
              { key: 'translateY', val: '-100%', prog: 0 },
              { key: 'translateY', val: '100vh', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create grid overlay container
  const matrixGridOverlay: RenderableComponentData = {
    id: 'matrix-grid-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gridTemplateRows: `repeat(${gridRows}, 1fr)`,
          gap: '0',
          mixBlendMode: 'screen',
          filter: 'sepia(100%) hue-rotate(90deg) saturate(200%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: gridCells,
  };

  // Create scanlines overlay
  const scanlinesOverlay: RenderableComponentData = {
    id: 'scanlines-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to bottom, rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%); background-size: 100% 4px; opacity: 0.3;"></div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Outgoing video with fade out
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom || 0,
      endAt: outgoingVideo.endAt,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video with fade in
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom || 0,
      endAt: incomingVideo.endAt,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
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
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      outgoingVideoNode,
      incomingVideoNode,
      matrixGridOverlay,
      scanlinesOverlay,
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
  id: 'matrix-digital-rain-transition',
  title: 'Matrix Digital Rain Transition',
  description:
    'An iconic Matrix-style digital rain transition effect where cascading green code characters dissolve the outgoing video and reveal the incoming video. Features authentic Matrix aesthetics with green tint, scanlines, random character falling speeds, and screen blend mode for an organic digital rain effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'matrix',
    'digital-rain',
    'code',
    'cyberpunk',
    'tech',
    'green',
    'scanline',
    'grid',
    'cascade',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    transitionDuration: 1.5,
    gridCols: 20,
    gridRows: 30,
    characterSet: '01アイウエオカキクケコサシスセソタチツテト',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const matrixDigitalRainTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
