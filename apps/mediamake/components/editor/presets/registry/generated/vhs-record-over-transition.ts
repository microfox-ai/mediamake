/**
 * VHS Record-Over Transition Preset
 *
 * This preset recreates the authentic experience of recording over old VHS footage,
 * where you can briefly see the previous recording bleeding through before the new
 * recording mechanism kicks in. Features include:
 *
 * - **Print-Through Ghosting**: Magnetic fields from adjacent tape layers cause ghosting
 * - **Mechanical Clunk Effect**: Distinctive mechanical sound and visual disruption
 * - **Color Burst Errors**: Sudden shifts to incorrect hues (characteristic VHS issue)
 * - **Tape Stretch Artifacts**: Horizontal compression and expansion of the image
 * - **Dropout Specs**: Random white flashes across dark areas
 * - **60Hz Hum Bar**: Persistent rolling bar through the image
 * - **Coarse VHS Grain**: Clumpy grain structure especially visible in mid-tones
 *
 * Use cases:
 * - Creating nostalgic 90s home video aesthetics
 * - Simulating authentic VHS recording-over effects
 * - Adding retro tape artifacts to modern footage
 * - Building period-accurate video compositions
 *
 * Technical implementation:
 * - Duration: 2.5 seconds total
 * - Phase 1 (0-1s): Old footage visible with screen blend mode
 * - Phase 2 (0.8-1.2s): Mechanical transition with clunk effect
 * - Phase 3 (1.2-2.5s): Stabilization with diminishing artifacts
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define preset parameters
const presetParams = z.object({
  oldFootageSrc: z.string().describe('Source URL for the old footage video that bleeds through'),
  newFootageSrc: z.string().describe('Source URL for the new recording footage'),
  duration: z.number().default(2.5).describe('Total transition duration in seconds'),
  clunkAudioSrc: z.string().optional().describe('Optional audio source for mechanical clunk sound effect'),
  impact: z.number().default(1.0).describe('Overall effect intensity multiplier (0.5 = subtle, 2.0 = extreme)'),
  grainIntensity: z.number().default(0.3).describe('Coarse grain overlay opacity (0-1)'),
  dropoutFrequency: z.number().default(5).describe('Number of white dropout specs to display'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    oldFootageSrc,
    newFootageSrc,
    duration = 2.5,
    clunkAudioSrc,
    impact = 1.0,
    grainIntensity = 0.3,
    dropoutFrequency = 5,
  } = params;

  // Helper function to generate random position for dropout specs
  const generateRandomPosition = (index: number) => {
    // Use index as seed for pseudo-randomness
    const seed = index * 7919;
    const x = (seed % 89) + 5; // 5-94% range
    const y = ((seed * 13) % 89) + 5; // 5-94% range
    return { x: `${x}%`, y: `${y}%` };
  };

  // Helper function to generate random timing for dropout specs
  const generateRandomTiming = (index: number) => {
    const seed = index * 7919;
    const start = (seed % 2300) / 1000; // 0-2.3s range
    return start;
  };

  // ===== OLD FOOTAGE LAYER =====
  const oldFootageVideo: RenderableComponentData = {
    id: 'vhs-old-footage-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: oldFootageSrc,
      containerProps: {
        className: 'w-full h-full object-cover',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const oldFootageLayer: RenderableComponentData = {
    id: 'vhs-old-footage-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 mix-blend-screen',
        style: {
          willChange: 'opacity',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'vhs-old-footage-fade-out',
        componentId: 'BaseEffect',
        data: {
          type: 'linear',
          start: 0,
          duration: 1.0 * impact,
          mode: 'provider',
          targetIds: ['vhs-old-footage-layer'],
          ranges: [
            { key: 'opacity', val: 0.5, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [oldFootageVideo],
  };

  // ===== NEW FOOTAGE LAYER =====
  const newFootageVideo: RenderableComponentData = {
    id: 'vhs-new-footage-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: newFootageSrc,
      containerProps: {
        className: 'w-full h-full object-cover',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const newFootageLayer: RenderableComponentData = {
    id: 'vhs-new-footage-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          willChange: 'transform, filter',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Tape stretch effect - wave-like scaleX oscillation
      {
        id: 'vhs-tape-stretch',
        componentId: 'BaseEffect',
        data: {
          type: 'ease-in-out',
          start: 0.8,
          duration: 1.7,
          mode: 'provider',
          targetIds: ['vhs-new-footage-layer'],
          ranges: [
            { key: 'scaleX', val: 1.0, prog: 0 },
            { key: 'scaleX', val: 0.9 * (1 - (impact - 1) * 0.1), prog: 0.15 },
            { key: 'scaleX', val: 1.1 * (1 + (impact - 1) * 0.1), prog: 0.35 },
            { key: 'scaleX', val: 0.95 * (1 - (impact - 1) * 0.05), prog: 0.55 },
            { key: 'scaleX', val: 1.05 * (1 + (impact - 1) * 0.05), prog: 0.75 },
            { key: 'scaleX', val: 1.0, prog: 1 },
          ],
        },
      },
      // Color burst errors - sudden hue shifts
      {
        id: 'vhs-color-burst',
        componentId: 'BaseEffect',
        data: {
          type: 'linear',
          start: 1.0,
          duration: 1.5,
          mode: 'provider',
          targetIds: ['vhs-new-footage-layer'],
          ranges: [
            { key: 'hue-rotate', val: '0deg', prog: 0 },
            { key: 'hue-rotate', val: `${180 * impact}deg`, prog: 0.167 }, // ~1.25s
            { key: 'hue-rotate', val: `${180 * impact}deg`, prog: 0.333 }, // Hold
            { key: 'hue-rotate', val: `${90 * impact}deg`, prog: 0.5 }, // ~1.5s
            { key: 'hue-rotate', val: `${90 * impact}deg`, prog: 0.667 }, // Hold
            { key: 'hue-rotate', val: '0deg', prog: 0.833 }, // ~1.75s
            { key: 'hue-rotate', val: '0deg', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [newFootageVideo],
  };

  // ===== PRINT-THROUGH GHOST LAYER =====
  const printThroughGhostVideo: RenderableComponentData = {
    id: 'vhs-print-through-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: oldFootageSrc,
      containerProps: {
        className: 'w-full h-full object-cover',
        style: {
          transform: 'translateX(5px) scaleX(0.98)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const printThroughGhostLayer: RenderableComponentData = {
    id: 'vhs-print-through-ghost-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 opacity-20 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 1.0, // Only visible during old footage phase
      },
    },
    childrenData: [printThroughGhostVideo],
  };

  // ===== MECHANICAL CLUNK EFFECT =====
  const mechanicalClunkLayer: RenderableComponentData = {
    id: 'vhs-mechanical-clunk-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          willChange: 'transform, filter',
        },
      },
    },
    context: {
      timing: {
        start: 1.1, // 0.3s into mechanical transition phase
        duration: 0.1,
      },
    },
    effects: [
      {
        id: 'vhs-mechanical-clunk-effect',
        componentId: 'BaseEffect',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['vhs-new-footage-layer'],
          ranges: [
            { key: 'scale', val: 1.0, prog: 0 },
            { key: 'scale', val: 1.02 * (1 + (impact - 1) * 0.02), prog: 0.5 },
            { key: 'scale', val: 1.0, prog: 1 },
            { key: 'blur', val: '0px', prog: 0 },
            { key: 'blur', val: `${2 * impact}px`, prog: 0.5 },
            { key: 'blur', val: '0px', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // ===== 60Hz HUM BAR OVERLAY =====
  const humBarOverlay: RenderableComponentData = {
    id: 'vhs-hum-bar',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      containerProps: {
        className: 'absolute left-0 right-0 h-2 w-full opacity-20 pointer-events-none',
        style: {
          background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.8), transparent)',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'vhs-hum-bar-scroll',
        componentId: 'BaseEffect',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['vhs-hum-bar'],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '5000%', prog: 1 }, // Continuous scroll (loops visually)
          ],
        },
      },
    ],
  };

  // ===== DROPOUT SPECS CONTAINER =====
  const dropoutSpecs: RenderableComponentData[] = [];
  for (let i = 0; i < dropoutFrequency; i++) {
    const pos = generateRandomPosition(i);
    const startTime = generateRandomTiming(i);
    
    const spec: RenderableComponentData = {
      id: `vhs-dropout-spec-${i}`,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        containerProps: {
          className: 'absolute w-1 h-1 bg-white rounded-full',
          style: {
            left: pos.x,
            top: pos.y,
          },
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: 0.1,
        },
      },
      effects: [
        {
          id: `vhs-dropout-spec-flash-${i}`,
          componentId: 'BaseEffect',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 0.1,
            mode: 'provider',
            targetIds: [`vhs-dropout-spec-${i}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };
    dropoutSpecs.push(spec);
  }

  const dropoutSpecsContainer: RenderableComponentData = {
    id: 'vhs-dropout-specs-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: dropoutSpecs,
  };

  // ===== COARSE GRAIN OVERLAY =====
  const coarseGrainOverlay: RenderableComponentData = {
    id: 'vhs-coarse-grain-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none mix-blend-overlay',
        style: {
          opacity: grainIntensity,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  // ===== OPTIONAL CLUNK AUDIO =====
  const clunkAudio: RenderableComponentData | null = clunkAudioSrc
    ? {
        id: 'vhs-clunk-audio',
        type: 'atom',
        componentId: 'AudioAtom',
        data: {
          src: clunkAudioSrc,
          volume: 0.7 * impact,
        },
        context: {
          timing: {
            start: 1.1, // Same timing as mechanical clunk visual
            duration: 0.5,
          },
        },
      }
    : null;

  // ===== ROOT CONTAINER =====
  const rootContainer: RenderableComponentData = {
    id: 'vhs-record-over-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      oldFootageLayer,
      newFootageLayer,
      printThroughGhostLayer,
      mechanicalClunkLayer,
      humBarOverlay,
      dropoutSpecsContainer,
      coarseGrainOverlay,
      ...(clunkAudio ? [clunkAudio] : []),
    ].filter(Boolean) as RenderableComponentData[],
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
  id: 'vhs-record-over-transition',
  title: 'VHS Record-Over Transition',
  description: 'A nostalgic 90s home video transition effect that recreates the experience of recording over old footage on VHS tape. Features print-through ghosting, color burst errors, tape stretch artifacts, white dropout specs, 60Hz hum bar, and coarse VHS grain. The transition simulates the mechanical recording mechanism engaging with distinctive visual disruptions.',
  type: 'predefined',
  presetType: 'children',
  tags: ['vhs', 'retro', '90s', 'transition', 'tape', 'glitch', 'vintage', 'analog'],
  defaultInputParams: {
    oldFootageSrc: 'https://example.com/old-footage.mp4',
    newFootageSrc: 'https://example.com/new-footage.mp4',
    duration: 2.5,
    impact: 1.0,
    grainIntensity: 0.3,
    dropoutFrequency: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const vhsRecordOverTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
