/**
 * Mosaic Tile Flip Transition Preset
 *
 * Creates a 3x2 grid (6 panels) of video tiles that flip in 3D space to reveal new content.
 * Each panel rotates 180 degrees on the Y-axis with staggered timing to create a wave effect.
 * Features golden glow borders on active panels, desaturated inactive panels, and dynamic shadows
 * during rotation for enhanced depth perception.
 *
 * Features:
 * - **3D Card Flip Animation**: Panels rotate 180° on Y-axis with perspective depth
 * - **Staggered Wave Effect**: Each panel starts flipping 0.1s after the previous
 * - **Active Panel Glow**: Golden glow border on the currently flipping/active panel
 * - **Desaturation Effect**: Inactive panels are slightly desaturated until they flip
 * - **Dynamic Shadows**: Shadows appear and intensify during rotation for depth
 * - **Backface Visibility**: Hidden backfaces ensure clean transitions
 *
 * Use cases:
 * - Creating dynamic video mosaic transitions
 * - Building engaging multi-panel reveal effects
 * - Adding professional 3D transitions to video content
 * - Creating wave-pattern visual effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- PARAMS SCHEMA ---
const presetParams = z.object({
  videos: z
    .array(z.string())
    .length(7)
    .describe(
      'Array of 7 video URLs for the mosaic grid. First 6 are front faces, 7th appears on back faces during transition.',
    ),
  flipDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .describe('Duration of each flip animation in seconds'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Delay between each panel flip start in seconds'),
  displayDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Duration each video displays before transitioning in seconds'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of golden glow on active panels (0-1)'),
  desaturationAmount: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Saturation level for inactive panels (0=grayscale, 1=full color)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- EXECUTION ---
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videos,
    flipDuration,
    staggerDelay,
    displayDuration,
    glowIntensity,
    desaturationAmount,
  } = params;

  // Grid configuration: 3 columns x 2 rows
  const gridCols = 3;
  const gridRows = 2;
  const totalPanels = gridCols * gridRows;

  // Calculate timing
  // Total duration = (panels * display) - (transitions * duration)
  // 6 panels * 2s = 12s, 5 transitions * 0.6s = 3s, total = 9s
  const totalTransitionTime = (totalPanels - 1) * flipDuration;
  const totalDuration =
    totalPanels * displayDuration - totalTransitionTime + flipDuration;

  // Calculate flip start times (staggered)
  const flipStartTimes = Array.from(
    { length: totalPanels },
    (_, i) => displayDuration + i * staggerDelay,
  );

  // Helper: Create panel structure
  const createPanel = (
    index: number,
    row: number,
    col: number,
  ): RenderableComponentData => {
    const panelId = `panel-${index}`;
    const frontId = `panel-${index}-front`;
    const backId = `panel-${index}-back`;

    const flipStartTime = flipStartTimes[index];
    const glowStartTime = flipStartTime + flipDuration;
    const glowDuration = displayDuration - flipDuration * 2;

    // Position in grid
    const leftPercent = (col / gridCols) * 100;
    const topPercent = (row / gridRows) * 100;

    // Front face (initial video)
    const frontFace: RenderableComponentData = {
      id: frontId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: videos[index],
        fit: 'cover',
        className: 'absolute inset-0',
        style: {
          backfaceVisibility: 'hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        // Flip front face (0 → 180deg)
        {
          id: `${frontId}-flip`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            cubicBezier: [0.4, 0, 0.2, 1],
            start: flipStartTime,
            duration: flipDuration,
            mode: 'provider',
            targetIds: [frontId],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: 180, prog: 1 },
            ],
          },
        },
        // Shadow during flip (intensifies at midpoint)
        {
          id: `${frontId}-shadow`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            cubicBezier: [0.4, 0, 0.2, 1],
            start: flipStartTime,
            duration: flipDuration / 2,
            mode: 'provider',
            targetIds: [frontId],
            ranges: [
              { key: 'boxShadow', val: '0px 0px 0px rgba(0,0,0,0)', prog: 0 },
              {
                key: 'boxShadow',
                val: '10px 10px 30px rgba(0,0,0,0.5)',
                prog: 1,
              },
            ],
          },
        },
        // Desaturation before flip
        {
          id: `${frontId}-desaturate`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: flipStartTime,
            mode: 'provider',
            targetIds: [frontId],
            ranges: [
              {
                key: 'filter',
                val: `saturate(${desaturationAmount})`,
                prog: 0,
              },
              {
                key: 'filter',
                val: `saturate(${desaturationAmount})`,
                prog: 1,
              },
            ],
          },
        },
      ],
    };

    // Back face (new video revealed)
    const backFace: RenderableComponentData = {
      id: backId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: videos[6], // 7th video for all back faces
        fit: 'cover',
        className: 'absolute inset-0',
        style: {
          backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        // Flip back face (180 → 360deg)
        {
          id: `${backId}-flip`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            cubicBezier: [0.4, 0, 0.2, 1],
            start: flipStartTime,
            duration: flipDuration,
            mode: 'provider',
            targetIds: [backId],
            ranges: [
              { key: 'rotateY', val: 180, prog: 0 },
              { key: 'rotateY', val: 360, prog: 1 },
            ],
          },
        },
        // Golden glow after flip
        {
          id: `${backId}-glow`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: glowStartTime,
            duration: glowDuration,
            mode: 'provider',
            targetIds: [backId],
            ranges: [
              {
                key: 'boxShadow',
                val: `0 0 20px 5px rgba(255,215,0,${glowIntensity})`,
                prog: 0,
              },
              {
                key: 'boxShadow',
                val: `0 0 20px 5px rgba(255,215,0,${glowIntensity})`,
                prog: 0.9,
              },
              {
                key: 'boxShadow',
                val: '0 0 0px 0px rgba(255,215,0,0)',
                prog: 1,
              },
            ],
          },
        },
      ],
    };

    // Panel container with 3D transform style
    return {
      id: panelId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: `${100 / gridCols}%`,
            height: `${100 / gridRows}%`,
            top: `${topPercent}%`,
            left: `${leftPercent}%`,
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [frontFace, backFace],
    };
  };

  // Create all panels
  const panels: RenderableComponentData[] = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const index = row * gridCols + col;
      panels.push(createPanel(index, row, col));
    }
  }

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'mosaic-tile-flip-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-slate-800',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: panels,
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- METADATA ---
const presetMetadata: PresetMetadata = {
  id: 'mosaic-tile-flip-transition',
  title: 'Mosaic Tile Flip Transition',
  description:
    'A 3x2 grid of video panels that flip in 3D space with a staggered wave effect, revealing new content on the backface. Features golden glow borders on active panels, desaturated inactive panels, and dynamic shadows during rotation for enhanced depth perception.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'video',
    'mosaic',
    'grid',
    'transition',
    '3d',
    'flip',
    'card-flip',
    'staggered',
    'wave',
    'panels',
  ],
  defaultInputParams: {
    videos: [
      'https://example.com/video1.mp4',
      'https://example.com/video2.mp4',
      'https://example.com/video3.mp4',
      'https://example.com/video4.mp4',
      'https://example.com/video5.mp4',
      'https://example.com/video6.mp4',
      'https://example.com/video7.mp4', // Back face video
    ],
    flipDuration: 0.6,
    staggerDelay: 0.1,
    displayDuration: 2,
    glowIntensity: 0.7,
    desaturationAmount: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- EXPORT ---
export const mosaicTileFlipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
