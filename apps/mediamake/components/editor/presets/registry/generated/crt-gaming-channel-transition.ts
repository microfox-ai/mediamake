/**
 * CRT Gaming Channel Glitch Transition Preset
 *
 * A retro-futuristic CRT monitor glitch transition that simulates switching between gaming channels
 * or broadcasts. Features RGB separation, static noise, rolling scan lines, VHS tracking distortion,
 * color bars, and neon gaming aesthetics with on-screen channel indicators and signal strength displays.
 *
 * Features:
 * - **RGB Separation Effect**: Three overlapping video layers with chromatic aberration
 * - **CRT Distortion**: 3D perspective transform for authentic CRT curve effect
 * - **Scan Lines**: Repeating horizontal lines that animate vertically
 * - **Static Noise**: Dynamic noise texture layers that pulse during transition
 * - **Color Bars**: Standard broadcast color bars that flash during channel change
 * - **VHS Tracking Lines**: Horizontal tracking distortion lines
 * - **Neon UI Elements**: Channel indicator and signal strength display with glow effects
 * - **Phosphor Bloom**: Subtle glow overlay simulating CRT phosphor bloom
 * - **5-Phase Transition**: Signal degradation → horizontal hold → static burst → tune-in → stabilization
 *
 * Use cases:
 * - Gaming content transitions
 * - Retro-themed video effects
 * - Broadcast-style channel switching
 * - 80s/90s aesthetic video production
 * - Livestream overlays and transitions
 */

import { z } from 'zod';
import type { RenderableComponentData } from '@microfox/datamotion';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';

// --- Parameter Schema ---
const presetParams = z.object({
  sourceVideoUrl: z
    .string()
    .describe('Source video URL for the outgoing/current scene'),
  destinationVideoUrl: z
    .string()
    .describe('Destination video URL for the incoming/new scene'),
  channelNumber: z
    .string()
    .default('02')
    .describe('Channel number to display in the channel indicator'),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Overall transition duration in seconds'),
  channelIndicatorColor: z
    .string()
    .default('#00FFFF')
    .describe('Neon color for channel indicator and UI elements'),
  staticIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of static noise during transition (0-1)'),
  rgbSeparation: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Maximum RGB channel separation in pixels'),
  scanLineSpeed: z
    .number()
    .default(1)
    .describe('Speed multiplier for scan line animation'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    sourceVideoUrl,
    destinationVideoUrl,
    channelNumber,
    transitionDuration,
    channelIndicatorColor,
    staticIntensity,
    rgbSeparation,
    scanLineSpeed,
  } = params;

  // Helper function to create base effect structure
  const createEffect = (
    id: string,
    componentId: string,
    start: number,
    duration: number,
    ranges: Array<{ key: string; val: any; prog: number }>,
    type: string = 'ease-in-out',
  ) => ({
    id,
    componentId,
    data: {
      type,
      start,
      duration,
      mode: 'provider' as const,
      targetIds: [componentId],
      ranges,
    },
  });

  // Calculate phase timings
  const phase1Duration = transitionDuration * 0.32; // 0-0.8s: degradation
  const phase2Start = phase1Duration;
  const phase2Duration = transitionDuration * 0.16; // 0.8-1.2s: horizontal hold
  const phase3Start = phase2Start + phase2Duration;
  const phase3Duration = transitionDuration * 0.16; // 1.2-1.6s: static burst
  const phase4Start = phase3Start + phase3Duration;
  const phase4Duration = transitionDuration * 0.24; // 1.6-2.2s: tune-in
  const phase5Start = phase4Start + phase4Duration;
  const phase5Duration = transitionDuration * 0.12; // 2.2-2.5s: stabilization

  // --- RGB Layer Creation Helper ---
  const createRGBLayers = (
    videoUrl: string,
    containerIdPrefix: string,
    isIncoming: boolean = false,
  ) => {
    return [
      {
        id: `${containerIdPrefix}-rgb-red`,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: videoUrl,
          volume: 0,
          className: 'absolute inset-0 mix-blend-screen',
          style: {
            filter: 'hue-rotate(0deg) saturate(2)',
            transform: `translateX(-${rgbSeparation}px)`,
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'source' as const,
          },
        },
      },
      {
        id: `${containerIdPrefix}-rgb-green`,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: videoUrl,
          volume: 0,
          className: 'absolute inset-0 mix-blend-screen',
          style: {
            filter: 'hue-rotate(120deg) saturate(2)',
            transform: 'translateX(0px)',
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'source' as const,
          },
        },
      },
      {
        id: `${containerIdPrefix}-rgb-blue`,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: videoUrl,
          volume: 0,
          className: 'absolute inset-0 mix-blend-screen',
          style: {
            filter: 'hue-rotate(240deg) saturate(2)',
            transform: `translateX(${rgbSeparation}px)`,
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'source' as const,
          },
        },
      },
    ];
  };

  // --- Create Component Tree ---

  const outgoingRGBLayers = createRGBLayers(
    sourceVideoUrl,
    'outgoing',
    false,
  );
  const incomingRGBLayers = createRGBLayers(
    destinationVideoUrl,
    'incoming',
    true,
  );

  // Outgoing scene container with RGB separation effects
  const outgoingSceneContainer = {
    id: 'outgoing-scene-container',
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
        duration: transitionDuration,
      },
    },
    effects: [
      // Phase 1: Increase RGB separation
      createEffect(
        'outgoing-separation-effect',
        'outgoing-scene-container',
        0,
        phase1Duration,
        [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 1 },
        ],
      ),
      // Phase 2-3: Further degradation and fade out
      createEffect(
        'outgoing-fadeout-effect',
        'outgoing-scene-container',
        phase2Start,
        phase3Duration + phase2Duration,
        [
          { key: 'opacity', val: 0.7, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
        'ease-in',
      ),
    ],
    childrenData: outgoingRGBLayers,
  };

  // Incoming scene container
  const incomingSceneContainer = {
    id: 'incoming-scene-container',
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
        duration: transitionDuration,
      },
    },
    effects: [
      // Phase 4: Fade in from static
      createEffect(
        'incoming-fadein-effect',
        'incoming-scene-container',
        phase4Start,
        phase4Duration,
        [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.5, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
        'ease-out',
      ),
    ],
    childrenData: incomingRGBLayers,
  };

  // Scan lines overlay
  const scanLinesOverlay = {
    id: 'scan-lines-overlay',
    type: 'atom' as const,
    componentId: 'ShapeAtom',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          backgroundSize: '100% 4px',
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
      // Slow vertical scroll
      createEffect(
        'scanline-scroll-effect',
        'scan-lines-overlay',
        0,
        transitionDuration,
        [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: 20 * scanLineSpeed, prog: 1 },
        ],
        'linear',
      ),
    ],
  };

  // VHS tracking line
  const vhsTrackingLine = {
    id: 'vhs-tracking-line',
    type: 'atom' as const,
    componentId: 'ShapeAtom',
    data: {
      containerProps: {
        className: 'absolute left-0 right-0 h-2',
        style: {
          backgroundColor: 'rgba(255, 255, 255, 0.3)',
          top: '30%',
        },
      },
    },
    context: {
      timing: {
        start: phase2Start,
        duration: phase2Duration,
      },
    },
    effects: [
      // Move down during phase 2
      createEffect(
        'tracking-line-move-effect',
        'vhs-tracking-line',
        0,
        phase2Duration,
        [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: 100, prog: 1 },
        ],
        'ease-in-out',
      ),
    ],
  };

  // CRT distortion container (holds all video content)
  const crtDistortionContainer = {
    id: 'crt-distortion-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transform: 'perspective(1000px) rotateY(2deg) rotateX(1deg)',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      outgoingSceneContainer,
      incomingSceneContainer,
      scanLinesOverlay,
      vhsTrackingLine,
    ],
  };

  // Static noise layers
  const staticNoise1 = {
    id: 'static-noise-1',
    type: 'atom' as const,
    componentId: 'ShapeAtom',
    data: {
      containerProps: {
        className:
          "absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiLz48L3N2Zz4=')]",
        style: {
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  const staticNoise2 = {
    id: 'static-noise-2',
    type: 'atom' as const,
    componentId: 'ShapeAtom',
    data: {
      containerProps: {
        className:
          "absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCI+PGZpbHRlciBpZD0ibm9pc2UyIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMS41IiBudW1PY3RhdmVzPSIzIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI25vaXNlMikiLz48L3N2Zz4=')]",
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  const staticNoiseLayer = {
    id: 'static-noise-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Phase 3: Static burst
      createEffect(
        'static-burst-effect',
        'static-noise-layer',
        phase3Start,
        phase3Duration,
        [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: staticIntensity, prog: 0.5 },
          { key: 'opacity', val: staticIntensity * 0.3, prog: 1 },
        ],
      ),
      // Phase 4: Reduce static
      createEffect(
        'static-fadeout-effect',
        'static-noise-layer',
        phase4Start,
        phase4Duration,
        [
          { key: 'opacity', val: staticIntensity * 0.3, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      ),
    ],
    childrenData: [staticNoise1, staticNoise2],
  };

  // Color bars
  const colorBars = [
    { id: 'color-bar-white', color: '#FFFFFF' },
    { id: 'color-bar-yellow', color: '#FFFF00' },
    { id: 'color-bar-cyan', color: '#00FFFF' },
    { id: 'color-bar-green', color: '#00FF00' },
    { id: 'color-bar-magenta', color: '#FF00FF' },
    { id: 'color-bar-red', color: '#FF0000' },
    { id: 'color-bar-blue', color: '#0000FF' },
    { id: 'color-bar-black', color: '#000000' },
  ].map((bar) => ({
    id: bar.id,
    type: 'atom' as const,
    componentId: 'ShapeAtom',
    data: {
      containerProps: {
        className: 'flex-1 h-full',
        style: {
          backgroundColor: bar.color,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  }));

  const colorBarsContainer = {
    id: 'color-bars-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-row',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Phase 3: Flash color bars
      createEffect(
        'colorbars-flash-effect',
        'color-bars-container',
        phase3Start,
        phase3Duration * 0.5,
        [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.8, prog: 0.3 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      ),
    ],
    childrenData: colorBars,
  };

  // Channel indicator
  const channelIndicator = {
    id: 'channel-indicator',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: `CHANNEL ${channelNumber}`,
      className: 'absolute top-4 right-4 font-mono text-xl z-50',
      style: {
        color: channelIndicatorColor,
        textShadow: `0 0 10px ${channelIndicatorColor}, 0 0 20px ${channelIndicatorColor}`,
      },
      font: {
        family: 'Orbitron',
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Phase 5: Typewriter animation
      createEffect(
        'channel-indicator-appear-effect',
        'channel-indicator',
        phase5Start,
        phase5Duration,
        [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      ),
    ],
  };

  // Signal strength bars
  const signalBars = [
    { id: 'signal-bar-1', height: 'h-2', opacity: 1 },
    { id: 'signal-bar-2', height: 'h-3', opacity: 1 },
    { id: 'signal-bar-3', height: 'h-4', opacity: 0.5 },
    { id: 'signal-bar-4', height: 'h-5', opacity: 0.3 },
  ].map((bar) => ({
    id: bar.id,
    type: 'atom' as const,
    componentId: 'ShapeAtom',
    data: {
      containerProps: {
        className: `w-2 ${bar.height}`,
        style: {
          backgroundColor: channelIndicatorColor,
          opacity: bar.opacity,
          boxShadow: `0 0 5px ${channelIndicatorColor}`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  }));

  const signalLabel = {
    id: 'signal-label',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: 'SIGNAL',
      className: 'ml-2 font-mono text-xs',
      style: {
        color: channelIndicatorColor,
        textShadow: `0 0 5px ${channelIndicatorColor}`,
      },
      font: {
        family: 'Orbitron',
        weights: ['400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  const signalStrengthIndicator = {
    id: 'signal-strength-indicator',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-4 left-4 flex flex-row gap-1 items-end z-50',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Phase 1-2: Signal degrades
      createEffect(
        'signal-degrade-effect',
        'signal-strength-indicator',
        0,
        phase2Start + phase2Duration,
        [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.3, prog: 1 },
        ],
      ),
      // Phase 4-5: Signal recovers
      createEffect(
        'signal-recover-effect',
        'signal-strength-indicator',
        phase4Start,
        phase4Duration + phase5Duration,
        [
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      ),
    ],
    childrenData: [...signalBars, signalLabel],
  };

  // Phosphor bloom overlay
  const phosphorBloomOverlay = {
    id: 'phosphor-bloom-overlay',
    type: 'atom' as const,
    componentId: 'ShapeAtom',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none rounded-lg',
        style: {
          boxShadow: `inset 0 0 100px rgba(0, 255, 255, 0.1)`,
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
      // Phase 1: Bloom intensifies
      createEffect(
        'bloom-intensify-effect',
        'phosphor-bloom-overlay',
        0,
        phase1Duration,
        [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 1.5, prog: 1 },
        ],
      ),
      // Phase 5: Bloom settles
      createEffect(
        'bloom-settle-effect',
        'phosphor-bloom-overlay',
        phase5Start,
        phase5Duration,
        [
          { key: 'opacity', val: 1.5, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      ),
    ],
  };

  // Root container
  const rootContainer = {
    id: 'crt-transition-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden rounded-lg',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      crtDistortionContainer,
      staticNoiseLayer,
      colorBarsContainer,
      channelIndicator,
      signalStrengthIndicator,
      phosphorBloomOverlay,
    ],
  } as RenderableComponentData;

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
  id: 'crt-gaming-channel-transition',
  title: 'CRT Gaming Channel Glitch Transition',
  description:
    'A retro-futuristic CRT monitor glitch transition that simulates switching between gaming channels or broadcasts. Features RGB separation, static noise, rolling scan lines, VHS tracking distortion, color bars, and neon gaming aesthetics with on-screen channel indicators and signal strength displays. Perfect for gaming content, retro-themed videos, and broadcast-style transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'crt',
    'glitch',
    'retro',
    'gaming',
    'broadcast',
    'vhs',
    'rgb-separation',
    'neon',
    'channel-switch',
    'static',
    'scanlines',
    'futuristic',
  ],
  defaultInputParams: {
    sourceVideoUrl: 'https://example.com/source.mp4',
    destinationVideoUrl: 'https://example.com/destination.mp4',
    channelNumber: '02',
    transitionDuration: 2.5,
    channelIndicatorColor: '#00FFFF',
    staticIntensity: 0.7,
    rgbSeparation: 3,
    scanLineSpeed: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---
export const crtGamingChannelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
