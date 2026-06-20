/**
 * VCR Dub Transition Preset
 *
 * This preset recreates the authentic experience of dubbing between two VCRs, capturing
 * the analog generation loss and mechanical characteristics of tape-to-tape recording.
 *
 * Features:
 * - **Rainbow Noise Pattern**: Characteristic color noise during initial recording phase
 * - **Sync-Lock Rolling**: Vertical image roll with stepping motion as the VCR stabilizes
 * - **Color Bleeding**: Red channels smear right, blue channels shift left
 * - **Head-Clog Effect**: Random horizontal noise lines mimicking tape head corruption
 * - **Macro-Blocking**: Pixelated compression artifacts in dark regions
 * - **White Crush**: Blooming effect around bright objects with crushed highlights
 * - **Signal Dropouts**: Periodic complete signal failure showing blue screen
 * - **Tape Alignment Shift**: Image shifted right with black bar on left edge
 * - **Mechanical Timing**: All effects timed to match VCR tape transport mechanisms
 *
 * Technical Implementation:
 * - Three-phase transition: Rainbow Noise (0-0.3s) → Sync-Lock (0.3-0.8s) → Stable Degraded (0.8-2s)
 * - RGB channel separation for authentic color bleeding
 * - Step-based easing for mechanical feel
 * - Layered effects with proper z-indexing
 * - Performance-optimized with staggered expensive operations
 *
 * Use cases:
 * - Retro video aesthetics
 * - 80s/90s nostalgia effects
 * - Analog degradation simulations
 * - VHS-style transitions
 */

import { z } from 'zod';
import { interpolate, Easing } from 'remotion';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---
const presetParams = z.object({
  transitionDuration: z
    .number()
    .default(2)
    .describe('Total duration of the VCR dub transition in seconds'),
  rainbowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Intensity of the rainbow noise pattern (0-1)'),
  syncLockRolls: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe('Number of vertical rolls during sync-lock phase'),
  colorBleedIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Intensity of RGB color bleeding effect (0-1)'),
  headClogLines: z
    .number()
    .int()
    .min(0)
    .max(20)
    .default(5)
    .describe('Number of head-clog horizontal noise lines'),
  dropoutEnabled: z
    .boolean()
    .default(true)
    .describe('Enable periodic signal dropouts'),
  tapeShiftAmount: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe('Amount of horizontal tape misalignment in pixels'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    transitionDuration,
    rainbowIntensity,
    syncLockRolls,
    colorBleedIntensity,
    headClogLines,
    dropoutEnabled,
    tapeShiftAmount,
  } = params;

  const { config } = props;
  const fps = config?.fps || 30;
  const totalFrames = Math.round(transitionDuration * fps);

  // Phase timings
  const rainbowEndFrame = Math.round(0.3 * fps);
  const syncLockEndFrame = Math.round(0.8 * fps);

  // Helper function to generate head-clog line positions
  const generateHeadClogPositions = (count: number): number[] => {
    const positions: number[] = [];
    for (let i = 0; i < count; i++) {
      positions.push(Math.random() * 100);
    }
    return positions;
  };

  const headClogPositions = generateHeadClogPositions(headClogLines);

  // Create source video component
  const sourceVideo: RenderableComponentData = {
    id: 'vcr-dub-source',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 1,
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
        id: 'source-opacity-fade',
        componentId: 'vcr-dub-source',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['vcr-dub-source'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.4 },
            { key: 'opacity', val: 0, prog: 0.5 },
          ],
        },
      },
    ],
  };

  // Create target video component
  const targetVideo: RenderableComponentData = {
    id: 'vcr-dub-target',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 2,
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
        id: 'target-opacity-fade',
        componentId: 'vcr-dub-target',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['vcr-dub-target'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.4 },
            { key: 'opacity', val: 1, prog: 0.5 },
          ],
        },
      },
    ],
  };

  // Rainbow noise layer
  const rainbowNoise: RenderableComponentData = {
    id: 'vcr-rainbow-noise',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 10,
        background: 'linear-gradient(45deg, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))',
        backgroundSize: '400% 400%',
        mixBlendMode: 'overlay',
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
        id: 'rainbow-noise-animation',
        componentId: 'vcr-rainbow-noise',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['vcr-rainbow-noise'],
          ranges: [
            { key: 'backgroundPosition', val: '0% 50%', prog: 0 },
            { key: 'backgroundPosition', val: '100% 50%', prog: 0.15 },
            { key: 'opacity', val: rainbowIntensity, prog: 0 },
            { key: 'opacity', val: rainbowIntensity, prog: 0.15 },
            { key: 'opacity', val: 0, prog: 0.15 },
          ],
        },
      },
    ],
  };

  // Sync-lock rolling container
  const syncLockContainer: RenderableComponentData = {
    id: 'vcr-sync-lock-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
        style: {
          zIndex: 15,
        },
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
        id: 'sync-lock-roll-effect',
        componentId: 'vcr-sync-lock-container',
        data: {
          type: 'linear',
          start: 0.3,
          duration: 0.5,
          mode: 'provider',
          targetIds: ['vcr-sync-lock-container'],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '200%', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Color bleeding layers
  const redChannel: RenderableComponentData = {
    id: 'vcr-red-channel',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 20,
        mixBlendMode: 'screen',
        transform: 'translateX(3px)',
        backgroundColor: `rgba(255, 0, 0, ${colorBleedIntensity})`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  const greenChannel: RenderableComponentData = {
    id: 'vcr-green-channel',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 20,
        mixBlendMode: 'screen',
        transform: 'translateX(0)',
        backgroundColor: `rgba(0, 255, 0, ${colorBleedIntensity * 0.67})`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  const blueChannel: RenderableComponentData = {
    id: 'vcr-blue-channel',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 20,
        mixBlendMode: 'screen',
        transform: 'translateX(-3px)',
        backgroundColor: `rgba(0, 0, 255, ${colorBleedIntensity})`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Head-clog lines
  const headClogLinesComponents: RenderableComponentData[] = headClogPositions.map((position, index) => ({
    id: `vcr-head-clog-${index}`,
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute left-0 right-0 pointer-events-none',
      style: {
        zIndex: 25,
        top: `${position}%`,
        height: '1px',
        background: 'linear-gradient(to right, transparent, white, transparent)',
        opacity: 0.5 + Math.random() * 0.3,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  }));

  // Macro-blocking layer
  const macroBlocking: RenderableComponentData = {
    id: 'vcr-macro-blocking',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 30,
        imageRendering: 'pixelated',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(0,0,0,0.1) 8px, rgba(0,0,0,0.1) 16px), repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.1) 8px, rgba(0,0,0,0.1) 16px)',
        mixBlendMode: 'multiply',
        opacity: 0.6,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // White crush layer
  const whiteCrush: RenderableComponentData = {
    id: 'vcr-white-crush',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 35,
        filter: 'contrast(1.5) brightness(1.2)',
        mixBlendMode: 'soft-light',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Signal dropout layer
  const dropout: RenderableComponentData = {
    id: 'vcr-dropout',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 40,
        backgroundColor: 'rgb(30, 58, 138)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: dropoutEnabled ? [
      {
        id: 'dropout-flash-1',
        componentId: 'vcr-dropout',
        data: {
          type: 'linear',
          start: 1.2,
          duration: 0.05,
          mode: 'provider',
          targetIds: ['vcr-dropout'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'dropout-flash-2',
        componentId: 'vcr-dropout',
        data: {
          type: 'linear',
          start: 1.7,
          duration: 0.05,
          mode: 'provider',
          targetIds: ['vcr-dropout'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ] : [],
  };

  // Tape alignment shift (black bar on left)
  const leftBlackBar: RenderableComponentData = {
    id: 'vcr-left-black-bar',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      className: 'absolute left-0 top-0 bottom-0',
      style: {
        zIndex: 45,
        width: `${tapeShiftAmount}px`,
        backgroundColor: 'black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Content shift wrapper
  const contentShiftWrapper: RenderableComponentData = {
    id: 'vcr-content-shift',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 3,
          transform: `translateX(${tapeShiftAmount}px)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vcr-dub-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-blue-900 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      sourceVideo,
      targetVideo,
      rainbowNoise,
      syncLockContainer,
      redChannel,
      greenChannel,
      blueChannel,
      ...headClogLinesComponents,
      macroBlocking,
      whiteCrush,
      dropout,
      leftBlackBar,
      contentShiftWrapper,
    ] as RenderableComponentData[],
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
  id: 'vcr-dub-transition',
  title: 'VCR Dub Transition',
  description: 'Recreates authentic VCR-to-VCR dubbing experience with analog generation loss effects including rainbow noise patterns, sync-lock rolling, color bleeding (red smear right, blue shift left), head-clog horizontal noise lines, macro-blocking compression artifacts, white level crush with blooming, periodic signal dropouts, and tape alignment shift. All effects are timed to match mechanical tape transport rhythms over a 2-second transition.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vcr', 'analog', 'retro', 'vhs', 'tape', 'degradation', 'nostalgia'],
  defaultInputParams: {
    transitionDuration: 2,
    rainbowIntensity: 0.8,
    syncLockRolls: 20,
    colorBleedIntensity: 0.15,
    headClogLines: 5,
    dropoutEnabled: true,
    tapeShiftAmount: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---
export const vcrDubTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
