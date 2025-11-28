/**
 * Film Grain Typokinetics Preset
 *
 * A vintage film-inspired typography preset featuring thin elegant text that drifts
 * horizontally with analog imperfections. Simulates old film stock with text overlaid,
 * creating that classic movie title card aesthetic.
 *
 * Features:
 * - **Horizontal Drift**: Text moves from right to left with speed variations
 * - **Film Grain Overlay**: Texture layer creates authentic film stock appearance
 * - **Vintage Projection Flicker**: Opacity variations simulate projector inconsistencies
 * - **Gate Weave Effect**: Micro vertical movements simulate mechanical imperfections
 * - **Splice Jump Effects**: Sudden position jumps at 25% and 75% marks
 * - **Bodoni Moda Typography**: Classic thin italic font for elegant movie titles
 * - **Vintage Color Grading**: Contrast and brightness adjustments for aged film look
 *
 * Use cases:
 * - Classic movie title cards and opening credits
 * - Vintage documentary text overlays
 * - Film noir style typography
 * - Retro cinema aesthetic content
 * - Art house film credits and titles
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type {
  GenericEffectData,
  BaseEffect,
  TextAtomData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display with film grain effect'),
  duration: z
    .number()
    .default(8)
    .describe('Duration of the text display in seconds'),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size in pixels for the text'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of fade in/out transitions in seconds'),
  driftDistance: z
    .number()
    .default(50)
    .describe('Distance in pixels for horizontal drift (total range)'),
  flickerIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Intensity of opacity flicker effect (0.1 = subtle, 1 = intense)'),
  gateWeaveIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Intensity of vertical gate weave micro-movements'),
  spliceJumpIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.0)
    .describe('Intensity of splice jump position shifts'),
  grainOpacity: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.2)
    .describe('Opacity of film grain overlay (0 = none, 0.5 = heavy)'),
  textColor: z
    .string()
    .default('#F5F5F0')
    .describe('Color of the text (default: off-white for vintage look)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    transitionDuration,
    driftDistance,
    flickerIntensity,
    gateWeaveIntensity,
    spliceJumpIntensity,
    grainOpacity,
    textColor,
  } = params;

  // Calculate drift range (centered)
  const driftStart = driftDistance / 2;
  const driftEnd = -driftDistance / 2;

  // Calculate flicker opacity range
  const baseOpacity = 0.9;
  const minOpacity = Math.max(0.5, baseOpacity - flickerIntensity * 0.4);

  // Calculate gate weave range
  const gateWeaveRange = 1.5 * gateWeaveIntensity;

  // Calculate splice jump distances
  const spliceJump1 = 4 * spliceJumpIntensity;
  const spliceJump2 = -5 * spliceJumpIntensity;

  // Generate unique IDs
  const containerId = 'film-grain-container';
  const grainLayerId = 'film-grain-layer';
  const textContainerId = 'film-text-container';
  const textAtomId = 'film-text-atom';

  // Create film grain layer (using HTMLBlockAtom for visual representation)
  const grainLayer: RenderableComponentData = {
    id: grainLayerId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.03) 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.03) 3px);"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        opacity: grainOpacity,
        mixBlendMode: 'overlay' as const,
        filter: 'contrast(1.2)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Grain animation - subtle movement
      {
        id: 'grain-animation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [grainLayerId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -10, prog: 0.25 },
            { key: 'translateX', val: 5, prog: 0.5 },
            { key: 'translateX', val: -5, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 3, prog: 0.33 },
            { key: 'translateY', val: -2, prog: 0.66 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      } as BaseEffect,
    ],
  };

  // Create text atom
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'relative',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        fontStyle: 'italic',
        letterSpacing: '0.05em',
        textTransform: 'uppercase' as const,
        mixBlendMode: 'screen' as const,
        textShadow: '0 0 20px rgba(0,0,0,0.3)',
      },
      font: {
        family: 'Bodoni Moda',
        weights: ['200'],
        subsets: ['latin'],
        display: 'swap' as const,
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Primary drift effect - horizontal movement with speed variations
      {
        id: 'drift-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'translateX', val: driftStart, prog: 0 },
            { key: 'translateX', val: driftStart * 0.6, prog: 0.2 },
            { key: 'translateX', val: driftStart * 0.2, prog: 0.4 },
            { key: 'translateX', val: driftEnd * 0.2, prog: 0.6 },
            { key: 'translateX', val: driftEnd * 0.6, prog: 0.8 },
            { key: 'translateX', val: driftEnd, prog: 1 },
          ],
        } as GenericEffectData,
      } as BaseEffect,

      // Gate weave effect - micro vertical movements
      {
        id: 'gate-weave',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'translateY', val: -gateWeaveRange, prog: 0 },
            { key: 'translateY', val: gateWeaveRange, prog: 0.1 },
            { key: 'translateY', val: -gateWeaveRange * 0.5, prog: 0.2 },
            { key: 'translateY', val: gateWeaveRange * 0.8, prog: 0.3 },
            { key: 'translateY', val: -gateWeaveRange, prog: 0.4 },
            { key: 'translateY', val: gateWeaveRange * 0.5, prog: 0.5 },
            { key: 'translateY', val: -gateWeaveRange * 0.8, prog: 0.6 },
            { key: 'translateY', val: gateWeaveRange, prog: 0.7 },
            { key: 'translateY', val: -gateWeaveRange * 0.5, prog: 0.8 },
            { key: 'translateY', val: gateWeaveRange * 0.8, prog: 0.9 },
            { key: 'translateY', val: -gateWeaveRange, prog: 1 },
          ],
        } as GenericEffectData,
      } as BaseEffect,

      // Flicker effect - opacity variations
      {
        id: 'flicker-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'opacity', val: baseOpacity, prog: 0 },
            { key: 'opacity', val: baseOpacity - flickerIntensity * 0.15, prog: 0.05 },
            { key: 'opacity', val: baseOpacity, prog: 0.1 },
            { key: 'opacity', val: minOpacity, prog: 0.15 },
            { key: 'opacity', val: baseOpacity, prog: 0.18 },
            { key: 'opacity', val: baseOpacity - flickerIntensity * 0.2, prog: 0.35 },
            { key: 'opacity', val: baseOpacity, prog: 0.4 },
            { key: 'opacity', val: baseOpacity - flickerIntensity * 0.1, prog: 0.55 },
            { key: 'opacity', val: minOpacity + flickerIntensity * 0.1, prog: 0.6 },
            { key: 'opacity', val: baseOpacity, prog: 0.65 },
            { key: 'opacity', val: baseOpacity - flickerIntensity * 0.15, prog: 0.8 },
            { key: 'opacity', val: baseOpacity, prog: 0.85 },
            { key: 'opacity', val: baseOpacity - flickerIntensity * 0.05, prog: 1 },
          ],
        } as GenericEffectData,
      } as BaseEffect,

      // Splice jump effect - sudden position shifts at 25% and 75%
      {
        id: 'splice-jumps',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            // Normal until 24%
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 0, prog: 0.24 },
            // Jump at 25%
            { key: 'translateX', val: spliceJump1, prog: 0.25 },
            { key: 'translateX', val: 0, prog: 0.26 },
            // Normal until 74%
            { key: 'translateX', val: 0, prog: 0.74 },
            // Jump at 75%
            { key: 'translateX', val: spliceJump2, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 0.76 },
            // Normal until end
            { key: 'translateX', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      } as BaseEffect,

      // Fade in at start
      {
        id: 'fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: baseOpacity, prog: 1 },
          ],
        } as GenericEffectData,
      } as BaseEffect,

      // Fade out at end
      {
        id: 'fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: [
            { key: 'opacity', val: baseOpacity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      } as BaseEffect,
    ],
  };

  // Create text container with vintage color grading
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          filter: 'contrast(1.1) brightness(0.95)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textAtom],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#0a0a0a',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [grainLayer, textContainer],
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
  id: 'film-grain-typokinetics',
  title: 'Film Grain Typokinetics',
  description:
    'A vintage film-inspired typography preset featuring thin elegant text that drifts horizontally with analog imperfections. Includes film grain texture overlay, opacity flicker simulating projection variations, micro gate-weave movements, and splice jump effects at keyframe points. Uses Bodoni Moda italic for classic movie title card aesthetics with mix-blend-screen for authentic projection feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'film',
    'vintage',
    'retro',
    'cinema',
    'title-card',
    'kinetic',
    'drift',
    'grain',
    'analog',
    'projector',
  ],
  defaultInputParams: {
    text: 'CLASSIC CINEMA',
    duration: 8,
    fontSize: 72,
    transitionDuration: 1.0,
    driftDistance: 50,
    flickerIntensity: 0.3,
    gateWeaveIntensity: 1.5,
    spliceJumpIntensity: 1.0,
    grainOpacity: 0.2,
    textColor: '#F5F5F0',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const filmGrainTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
