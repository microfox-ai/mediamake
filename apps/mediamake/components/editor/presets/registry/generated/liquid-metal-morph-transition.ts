/**
 * Liquid Metal Morphing Transition Preset
 *
 * A T-1000 inspired liquid metal transition effect featuring mercury-like morphing between scenes.
 * This preset creates a futuristic organic transformation effect with:
 * - SVG turbulence filters for liquid distortion
 * - Animated metallic shine sweep across the surface
 * - Chrome hue-rotate effects for color shifting
 * - Edge liquefaction with organic surface tension simulation
 *
 * Perfect for fitness transformation content showcasing body adaptation during training.
 * The effect progresses through three phases:
 * 1. Edge liquefaction (0-0.4s): Content begins to dissolve at edges
 * 2. Center morph (0.4-0.8s): Full liquid metal crossfade between scenes
 * 3. Solidification (0.8-1.2s): New content crystallizes into place
 *
 * Features:
 * - Organic flow timing with custom cubic-bezier easing
 * - Metallic shine highlights moving across the surface
 * - Surface tension effects at edges
 * - Chrome-like color shifts during transformation
 * - Optimized performance with CSS containment
 *
 * Use cases:
 * - Fitness transformation showcases
 * - Before/after reveals
 * - Training progress montages
 * - Body adaptation visualizations
 * - High-tech product transitions
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL or path for the outgoing video scene'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL or path for the incoming video scene'),
  duration: z
    .number()
    .default(1.2)
    .describe('Total duration of the transition in seconds'),
  intensity: z
    .number()
    .default(1.0)
    .describe('Intensity multiplier for the liquid metal effect (0.5 - 2.0)'),
  chromeShift: z
    .number()
    .default(30)
    .describe('Maximum hue rotation in degrees for chrome color shift effect'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    duration = 1.2,
    intensity = 1.0,
    chromeShift = 30,
  } = params;

  // Calculate phase durations based on intensity
  const phaseDuration = duration / 3;
  const liquidStartPhase = phaseDuration * intensity;
  const morphPhase = phaseDuration * intensity;
  const solidifyPhase = phaseDuration * intensity;

  // Adjust total duration if intensity changes timing
  const totalDuration = liquidStartPhase + morphPhase + solidifyPhase;

  // Helper: Calculate blur values based on intensity
  const calculateBlur = (base: number): number => {
    return Math.round(base * intensity * 10) / 10;
  };

  // SVG Filters Container - Define liquid metal distortion filters
  const svgFiltersContainer: RenderableComponentData = {
    id: 'liquid-metal-svg-filters',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      htmlContent: `<svg xmlns='http://www.w3.org/2000/svg' style='position: absolute; width: 0; height: 0;'>
        <defs>
          <filter id='liquid-filter'>
            <feTurbulence 
              type='fractalNoise' 
              baseFrequency='0.01' 
              numOctaves='3' 
              result='turbulence' 
              seed='5'
            />
            <feDisplacementMap 
              in='SourceGraphic' 
              in2='turbulence' 
              scale='${30 * intensity}' 
              xChannelSelector='R' 
              yChannelSelector='G'
            />
          </filter>
        </defs>
      </svg>`,
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Outgoing Scene Layer - Video that transitions out with liquid effect
  const outgoingSceneLayer: RenderableComponentData = {
    id: 'outgoing-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      style: {
        filter: 'url(#liquid-filter)',
        willChange: 'filter, opacity',
      },
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [],
  };

  // Incoming Scene Layer - Video that transitions in with liquid effect
  const incomingSceneLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      style: {
        filter: 'url(#liquid-filter)',
        willChange: 'filter, opacity',
      },
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [],
  };

  // Metallic Shine Overlay - Moving highlight sweep across surface
  const metallicShineOverlay: RenderableComponentData = {
    id: 'metallic-shine-sweep',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle',
      style: {
        background:
          'linear-gradient(105deg, transparent 0%, transparent 35%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 55%, transparent 65%, transparent 100%)',
        mixBlendMode: 'overlay',
        willChange: 'transform, opacity',
      },
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [],
  };

  // Edge Liquefaction Layer - Surface tension effect at edges
  const edgeLiquefactionLayer: RenderableComponentData = {
    id: 'edge-liquefaction-overlay',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle',
      style: {
        background:
          'radial-gradient(ellipse at center, transparent 30%, rgba(200,200,220,0.15) 60%, rgba(180,180,200,0.3) 100%)',
        mixBlendMode: 'screen',
      },
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [],
  };

  // ============================================================================
  // EFFECTS - Liquid Metal Animation Phases
  // ============================================================================

  // Phase 1: Outgoing Edge Liquefaction (0 - liquidStartPhase)
  const outgoingLiquefactionEffect = {
    id: 'effect-outgoing-liquefaction',
    componentId: 'generic',
    data: {
      type: 'css-animation',
      start: 0,
      duration: liquidStartPhase,
      mode: 'spring',
      targetIds: ['outgoing-video-layer'],
      ranges: [
        {
          key: 'opacity',
          val: 1,
          prog: 0,
        },
        {
          key: 'opacity',
          val: 0.85,
          prog: 1,
        },
        {
          key: 'filter',
          val: 'url(#liquid-filter) hue-rotate(0deg)',
          prog: 0,
        },
        {
          key: 'filter',
          val: `url(#liquid-filter) hue-rotate(${chromeShift * 0.5}deg)`,
          prog: 1,
        },
      ],
    },
  };

  // Phase 2: Outgoing Center Morph (liquidStartPhase - liquidStartPhase + morphPhase)
  const outgoingMorphEffect = {
    id: 'effect-outgoing-morph',
    componentId: 'generic',
    data: {
      type: 'css-animation',
      start: liquidStartPhase,
      duration: morphPhase,
      mode: 'spring',
      targetIds: ['outgoing-video-layer'],
      ranges: [
        {
          key: 'opacity',
          val: 0.85,
          prog: 0,
        },
        {
          key: 'opacity',
          val: 0,
          prog: 1,
        },
        {
          key: 'filter',
          val: `url(#liquid-filter) hue-rotate(${chromeShift * 0.5}deg) blur(${calculateBlur(2)}px)`,
          prog: 0,
        },
        {
          key: 'filter',
          val: `url(#liquid-filter) hue-rotate(${chromeShift}deg) blur(${calculateBlur(8)}px)`,
          prog: 1,
        },
      ],
    },
  };

  // Phase 2: Incoming Reveal (liquidStartPhase - liquidStartPhase + morphPhase)
  const incomingRevealEffect = {
    id: 'effect-incoming-reveal',
    componentId: 'generic',
    data: {
      type: 'css-animation',
      start: liquidStartPhase,
      duration: morphPhase,
      mode: 'spring',
      targetIds: ['incoming-video-layer'],
      ranges: [
        {
          key: 'opacity',
          val: 0,
          prog: 0,
        },
        {
          key: 'opacity',
          val: 0.85,
          prog: 1,
        },
        {
          key: 'filter',
          val: `url(#liquid-filter) hue-rotate(-${chromeShift}deg) blur(${calculateBlur(8)}px)`,
          prog: 0,
        },
        {
          key: 'filter',
          val: `url(#liquid-filter) hue-rotate(-${chromeShift * 0.5}deg) blur(${calculateBlur(2)}px)`,
          prog: 1,
        },
      ],
    },
  };

  // Phase 3: Incoming Solidify (liquidStartPhase + morphPhase - totalDuration)
  const incomingSolidifyEffect = {
    id: 'effect-incoming-solidify',
    componentId: 'generic',
    data: {
      type: 'css-animation',
      start: liquidStartPhase + morphPhase,
      duration: solidifyPhase,
      mode: 'spring',
      targetIds: ['incoming-video-layer'],
      ranges: [
        {
          key: 'opacity',
          val: 0.85,
          prog: 0,
        },
        {
          key: 'opacity',
          val: 1,
          prog: 1,
        },
        {
          key: 'filter',
          val: `url(#liquid-filter) hue-rotate(-${chromeShift * 0.5}deg)`,
          prog: 0,
        },
        {
          key: 'filter',
          val: 'none',
          prog: 1,
        },
      ],
    },
  };

  // Metallic Shine Sweep Effect (starts slightly after beginning, sweeps across)
  const shineSweepStart = liquidStartPhase * 0.5;
  const shineSweepDuration = morphPhase + solidifyPhase * 0.5;

  const shineSweepEffect = {
    id: 'effect-shine-sweep',
    componentId: 'generic',
    data: {
      type: 'css-animation',
      start: shineSweepStart,
      duration: shineSweepDuration,
      mode: 'linear',
      easing: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
      targetIds: ['metallic-shine-sweep'],
      ranges: [
        {
          key: 'transform',
          val: 'translateX(-120%)',
          prog: 0,
        },
        {
          key: 'transform',
          val: 'translateX(120%)',
          prog: 1,
        },
        {
          key: 'opacity',
          val: 0,
          prog: 0,
        },
        {
          key: 'opacity',
          val: 1,
          prog: 0.2,
        },
        {
          key: 'opacity',
          val: 1,
          prog: 0.8,
        },
        {
          key: 'opacity',
          val: 0,
          prog: 1,
        },
      ],
    },
  };

  // Edge Liquefaction Pulse Effect (pulses throughout transition)
  const edgePulseEffect = {
    id: 'effect-edge-pulse',
    componentId: 'generic',
    data: {
      type: 'css-animation',
      start: 0,
      duration: totalDuration,
      mode: 'linear',
      targetIds: ['edge-liquefaction-overlay'],
      ranges: [
        {
          key: 'opacity',
          val: 0,
          prog: 0,
        },
        {
          key: 'opacity',
          val: 0.8 * intensity,
          prog: 0.33,
        },
        {
          key: 'opacity',
          val: 1 * intensity,
          prog: 0.5,
        },
        {
          key: 'opacity',
          val: 0.8 * intensity,
          prog: 0.67,
        },
        {
          key: 'opacity',
          val: 0,
          prog: 1,
        },
      ],
    },
  };

  // Attach effects to components
  outgoingSceneLayer.effects = [outgoingLiquefactionEffect, outgoingMorphEffect];
  incomingSceneLayer.effects = [incomingRevealEffect, incomingSolidifyEffect];
  metallicShineOverlay.effects = [shineSweepEffect];
  edgeLiquefactionLayer.effects = [edgePulseEffect];

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'liquid-metal-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      svgFiltersContainer,
      outgoingSceneLayer,
      incomingSceneLayer,
      metallicShineOverlay,
      edgeLiquefactionLayer,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'liquid-metal-morph-transition',
  title: 'Liquid Metal Morphing Transition',
  description:
    'A T-1000 inspired liquid metal transition effect featuring mercury-like morphing between scenes. Includes SVG turbulence filters for liquid distortion, animated metallic shine sweep, chrome hue-rotate effects, and edge liquefaction with organic surface tension simulation. Perfect for fitness transformation content showcasing body adaptation during training.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'liquid-metal',
    't-1000',
    'mercury',
    'morph',
    'fitness',
    'transformation',
    'chrome',
    'metallic',
    'futuristic',
    'organic',
    'svg-filter',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    duration: 1.2,
    intensity: 1.0,
    chromeShift: 30,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const liquidMetalMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: (z as any).toJSONSchema(presetParams),
};
