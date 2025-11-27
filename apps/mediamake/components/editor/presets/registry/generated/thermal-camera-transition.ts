/**
 * Thermal Camera Transition - F1 Telemetry Style
 * 
 * This preset simulates high-tech racing telemetry visualization with a thermal camera transition effect.
 * Perfect for editing footage from F1 onboard cameras that switch to thermal imaging during brake zone analysis.
 * 
 * Features:
 * - Thermal heat map color palette conversion (grayscale + gradient overlay)
 * - Digital scan effect with glowing scan line
 * - Temperature readout overlays with monospace font
 * - Grid overlay suggesting technical analysis
 * - Pulsing hot spots indicating areas of interest
 * - Digital artifacts (compression blocks, signal interference)
 * - Professional racing broadcast aesthetic
 * 
 * Technical Implementation:
 * - Uses CSS filters (grayscale, contrast) for thermal effect
 * - Gradient overlay with mix-blend-mode for heat mapping
 * - Repeating-linear-gradient for technical grid
 * - Animated scan line with translateY
 * - Pulsing hotspots with radial gradients
 * - Flickering artifacts for digital compression aesthetic
 * - Signal noise pattern with opacity variations
 * 
 * Use cases:
 * - F1 race footage transitions
 * - Technical analysis overlays
 * - High-tech broadcast effects
 * - Racing telemetry visualizations
 * - Brake zone analysis presentations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z.number().min(0.5).max(10).default(2).describe('Total transition duration in seconds'),
  transitionIntensity: z.number().min(0.1).max(3).default(1).describe('Overall transition intensity multiplier (affects timing and effects)'),
  thermalActivationTime: z.number().min(0).max(1).default(0.3).describe('Time (as fraction of duration) to activate thermal effect (0-1)'),
  scanSpeed: z.number().min(0.5).max(3).default(1).describe('Speed multiplier for scan line animation'),
  hotspotCount: z.number().min(0).max(10).default(3).describe('Number of pulsing hotspots to display'),
  artifactDensity: z.number().min(0).max(1).default(0.6).describe('Density of digital artifacts (0 = none, 1 = maximum)'),
  gridOpacity: z.number().min(0).max(1).default(0.1).describe('Opacity of technical grid overlay'),
  temperatureReadouts: z.boolean().default(true).describe('Show temperature readout overlays'),
  signalInterference: z.boolean().default(true).describe('Enable signal interference noise pattern'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    transitionIntensity,
    thermalActivationTime,
    scanSpeed,
    hotspotCount,
    artifactDensity,
    gridOpacity,
    temperatureReadouts,
    signalInterference,
  } = params;

  // Helper function: Generate random temperature values
  const generateTempValue = (min: number, max: number): string => {
    return Math.floor(Math.random() * (max - min) + min).toString();
  };

  // Helper function: Generate random position
  const randomPosition = (): { left: string; top: string } => {
    return {
      left: `${Math.random() * 80 + 10}%`,
      top: `${Math.random() * 80 + 10}%`,
    };
  };

  // Calculate timing phases (as fractions of total duration)
  const thermalStart = thermalActivationTime * duration;
  const thermalDuration = duration * 0.5 * transitionIntensity;
  const scanStart = thermalStart;
  const scanDuration = duration * 0.5 * transitionIntensity;
  const hotspotStart = duration * 0.25;
  const hotspotDuration = duration * 0.5;
  const fadeOutStart = duration * 0.6;
  const fadeOutDuration = duration * 0.4;

  const childrenData: RenderableComponentData[] = [];

  // === 1. Thermal Filter Layer ===
  const thermalFilterLayer: RenderableComponentData = {
    id: 'thermal-filter-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 2,
          filter: 'grayscale(100%) contrast(200%)',
          opacity: 0,
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
        id: 'thermal-filter-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: thermalStart,
          duration: thermalDuration,
          mode: 'provider',
          targetIds: ['thermal-filter-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };
  childrenData.push(thermalFilterLayer);

  // === 2. Heat Gradient Overlay ===
  const heatGradientOverlay: RenderableComponentData = {
    id: 'heat-gradient-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 3,
          background: 'linear-gradient(to bottom, rgba(128,0,128,0.3), rgba(0,0,255,0.3), rgba(0,128,0,0.3), rgba(255,255,0,0.3), rgba(255,0,0,0.3))',
          mixBlendMode: 'color',
          opacity: 0,
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
        id: 'heat-gradient-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: thermalStart,
          duration: thermalDuration,
          mode: 'provider',
          targetIds: ['heat-gradient-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };
  childrenData.push(heatGradientOverlay);

  // === 3. Grid Overlay Layer ===
  const gridOverlayLayer: RenderableComponentData = {
    id: 'grid-overlay-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 4,
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(0,255,0,${gridOpacity}) 19px, rgba(0,255,0,${gridOpacity}) 20px), repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(0,255,0,${gridOpacity}) 19px, rgba(0,255,0,${gridOpacity}) 20px)`,
          opacity: 0,
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
        id: 'grid-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: thermalStart,
          duration: thermalDuration * 0.8,
          mode: 'provider',
          targetIds: ['grid-overlay-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };
  childrenData.push(gridOverlayLayer);

  // === 4. Scan Line Bar ===
  const scanLineBar: RenderableComponentData = {
    id: 'scan-line-bar',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute left-0 right-0 pointer-events-none',
        style: {
          zIndex: 10,
          height: '4px',
          background: 'linear-gradient(to bottom, transparent, rgba(0,255,0,0.8), transparent)',
          boxShadow: '0 0 20px rgba(0,255,0,0.6)',
          top: '-10px',
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
        id: 'scan-line-animation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: scanStart,
          duration: scanDuration / scanSpeed,
          mode: 'provider',
          targetIds: ['scan-line-bar'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: '110vh', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };
  childrenData.push(scanLineBar);

  // === 5. Hotspot Container with Dynamic Hotspots ===
  const hotspots: RenderableComponentData[] = [];
  for (let i = 0; i < Math.min(hotspotCount, 10); i++) {
    const position = randomPosition();
    const size = Math.random() * 40 + 60; // 60-100px
    const delay = (i / hotspotCount) * hotspotDuration * 0.3;

    const hotspot: RenderableComponentData = {
      id: `hotspot-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute pointer-events-none',
          style: {
            width: `${size}px`,
            height: `${size}px`,
            left: position.left,
            top: position.top,
            background: 'radial-gradient(circle, rgba(255,0,0,0.8) 0%, rgba(255,165,0,0.4) 50%, transparent 70%)',
            borderRadius: '50%',
            opacity: 0,
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
          id: `hotspot-pulse-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: hotspotStart + delay,
            duration: hotspotDuration,
            mode: 'provider',
            targetIds: [`hotspot-${i}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.2 },
              { key: 'opacity', val: 0.6, prog: 0.5 },
              { key: 'opacity', val: 0.8, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    };
    hotspots.push(hotspot);
  }

  const hotspotContainer: RenderableComponentData = {
    id: 'hotspot-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 5,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: hotspots,
  };
  childrenData.push(hotspotContainer);

  // === 6. Artifact Container with Digital Blocks ===
  if (artifactDensity > 0) {
    const artifactCount = Math.floor(artifactDensity * 8);
    const artifacts: RenderableComponentData[] = [];

    for (let i = 0; i < artifactCount; i++) {
      const position = randomPosition();
      const width = Math.random() * 32 + 16; // 16-48px
      const height = Math.random() * 24 + 8; // 8-32px
      const flickerDelay = Math.random() * duration * 0.5;
      const flickerDuration = 0.1 + Math.random() * 0.2;

      const artifact: RenderableComponentData = {
        id: `artifact-block-${i}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute pointer-events-none',
            style: {
              width: `${width}px`,
              height: `${height}px`,
              left: position.left,
              top: position.top,
              backgroundColor: 'black',
              opacity: 0,
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
            id: `artifact-flicker-${i}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: thermalStart + flickerDelay,
              duration: flickerDuration,
              mode: 'provider',
              targetIds: [`artifact-block-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.5, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      };
      artifacts.push(artifact);
    }

    const artifactContainer: RenderableComponentData = {
      id: 'artifact-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 6,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: artifacts,
    };
    childrenData.push(artifactContainer);
  }

  // === 7. Signal Noise Layer ===
  if (signalInterference) {
    const signalNoiseLayer: RenderableComponentData = {
      id: 'signal-noise-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 7,
            opacity: 0,
            background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)',
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
          id: 'signal-noise-pulse',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: thermalStart,
            duration: duration - thermalStart,
            mode: 'provider',
            targetIds: ['signal-noise-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.15, prog: 0.1 },
              { key: 'opacity', val: 0, prog: 0.2 },
              { key: 'opacity', val: 0.15, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 0.4 },
              { key: 'opacity', val: 0.1, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    };
    childrenData.push(signalNoiseLayer);
  }

  // === 8. Temperature Readout Container ===
  if (temperatureReadouts) {
    const tempReadouts: RenderableComponentData[] = [
      {
        id: 'temp-readout-brake',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: `BRAKE TEMP: ${generateTempValue(800, 1200)}°C`,
          className: 'font-mono text-green-400',
          style: {
            fontSize: '12px',
            letterSpacing: '0.05em',
            textShadow: '0 0 10px rgba(0,255,0,0.5)',
          },
          font: {
            family: 'Roboto Mono',
            weights: ['400'],
            subsets: ['latin'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [],
      },
      {
        id: 'temp-readout-tire',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: `TIRE SURFACE: ${generateTempValue(80, 120)}°C`,
          className: 'font-mono text-green-400',
          style: {
            fontSize: '12px',
            letterSpacing: '0.05em',
            textShadow: '0 0 10px rgba(0,255,0,0.5)',
          },
          font: {
            family: 'Roboto Mono',
            weights: ['400'],
            subsets: ['latin'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [],
      },
      {
        id: 'temp-readout-engine',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: `ENGINE BAY: ${generateTempValue(90, 110)}°C`,
          className: 'font-mono text-green-400',
          style: {
            fontSize: '12px',
            letterSpacing: '0.05em',
            textShadow: '0 0 10px rgba(0,255,0,0.5)',
          },
          font: {
            family: 'Roboto Mono',
            weights: ['400'],
            subsets: ['latin'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [],
      },
    ];

    const temperatureReadoutContainer: RenderableComponentData = {
      id: 'temperature-readout-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute flex flex-col pointer-events-none',
          style: {
            zIndex: 8,
            top: '20px',
            right: '20px',
            gap: '8px',
            opacity: 0,
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
          id: 'temp-readouts-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: thermalStart + thermalDuration * 0.5,
            duration: thermalDuration * 0.5,
            mode: 'provider',
            targetIds: ['temperature-readout-container'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'temp-readouts-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: fadeOutStart,
            duration: fadeOutDuration,
            mode: 'provider',
            targetIds: ['temperature-readout-container'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: tempReadouts,
    };
    childrenData.push(temperatureReadoutContainer);
  }

  // === Root Container ===
  const rootContainer: RenderableComponentData = {
    id: 'thermal-camera-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData,
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
  id: 'thermal-camera-transition',
  title: 'Thermal Camera Transition - F1 Telemetry Style',
  description: 'A high-tech thermal camera transition effect that simulates professional racing broadcast telemetry visualization. Converts scenes to heat map color palette with digital scan effects, temperature readouts, grid overlays, pulsing hotspots, and digital compression artifacts. Perfect for F1 onboard camera style brake zone analysis transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'thermal', 'f1', 'racing', 'telemetry', 'technical', 'heatmap', 'broadcast', 'analysis', 'scan', 'grid', 'digital'],
  defaultInputParams: {
    duration: 2,
    transitionIntensity: 1,
    thermalActivationTime: 0.3,
    scanSpeed: 1,
    hotspotCount: 3,
    artifactDensity: 0.6,
    gridOpacity: 0.1,
    temperatureReadouts: true,
    signalInterference: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const thermalCameraTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
