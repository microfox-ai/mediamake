/**
 * Rectangular Scanner Effect Preset
 *
 * Creates an expanding rectangular scanner effect that sweeps across content like a security scan
 * or data analysis visualization. The effect features:
 * - Expanding rectangular boundaries with glowing edges
 * - Animated scan line that sweeps vertically
 * - Data-grid overlay with configurable density
 * - Flickering highlight layer for dynamic visual interest
 *
 * Use cases:
 * - Tech-themed presentations and cyberpunk aesthetics
 * - Security scan visualizations
 * - Data analysis overlays
 * - Futuristic UI animations
 * - Sci-fi video effects
 *
 * Technical Implementation:
 * - Primary: Border expansion with animated box-shadow glow
 * - Secondary: Scan line using translateY animation
 * - Tertiary: Grid overlay with repeating-linear-gradient
 * - Quaternary: Flicker effect using opacity animation
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with comprehensive descriptions
const presetParams = z.object({
  scanColor: z
    .string()
    .default('#00ffff')
    .describe('Hex color for scan lines, borders, and grid (e.g., #00ffff for cyan)'),
  glowIntensity: z
    .number()
    .min(0.5)
    .max(2.0)
    .default(1.0)
    .describe('Intensity of the glow effect (0.5 = subtle, 2.0 = intense)'),
  gridSize: z
    .number()
    .min(10)
    .max(50)
    .default(30)
    .describe('Size of grid cells in pixels (10 = dense grid, 50 = sparse grid)'),
  scanSpeed: z
    .number()
    .min(1000)
    .max(3000)
    .default(2000)
    .describe('Duration of one complete scan cycle in milliseconds'),
  flickerRate: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe('Frequency of flicker effect in Hz (0 = no flicker, 10 = rapid flicker)'),
  scanLineThickness: z
    .number()
    .min(2)
    .max(8)
    .default(4)
    .describe('Thickness of scan lines and borders in pixels'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(3)
    .describe('Total duration of the scanner effect in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Extract parameters
  const {
    scanColor,
    glowIntensity,
    gridSize,
    scanSpeed,
    flickerRate,
    scanLineThickness,
    duration,
  } = params;

  // Convert scan speed from ms to seconds
  const scanSpeedSeconds = scanSpeed / 1000;

  // Calculate glow values based on intensity
  const outerGlowSize = Math.round(20 * glowIntensity);
  const innerGlowSize = Math.round(10 * glowIntensity);
  const scanLineGlowSize = Math.round(15 * glowIntensity);

  // Calculate flicker duration (if flickerRate > 0)
  const flickerDuration = flickerRate > 0 ? 1 / flickerRate : duration;

  // Build box-shadow for glowing border
  const borderBoxShadow = `0 0 ${outerGlowSize}px ${hexToRgba(scanColor, 0.8 * glowIntensity)}, inset 0 0 ${innerGlowSize}px ${hexToRgba(scanColor, 0.5 * glowIntensity)}`;

  // Build box-shadow for scan line
  const scanLineBoxShadow = `0 0 ${scanLineGlowSize}px ${hexToRgba(scanColor, 0.9 * glowIntensity)}`;

  // Build grid background image
  const gridBackground = `repeating-linear-gradient(0deg, transparent, transparent ${gridSize - 1}px, ${hexToRgba(scanColor, 0.3)} ${gridSize - 1}px, ${hexToRgba(scanColor, 0.3)} ${gridSize}px), repeating-linear-gradient(90deg, transparent, transparent ${gridSize - 1}px, ${hexToRgba(scanColor, 0.3)} ${gridSize - 1}px, ${hexToRgba(scanColor, 0.3)} ${gridSize}px)`;

  // === LAYER 1: SCANNER BORDER LAYER ===
  // Expanding border with glowing edges using scale effect
  const borderScaleEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: ['scanner-border-layer'],
    ranges: [
      { key: 'scale', val: 0.3, prog: 0 },
      { key: 'scale', val: 1.0, prog: 0.4 },
      { key: 'scale', val: 1.0, prog: 1 },
    ],
  };

  const scannerBorderLayer: RenderableComponentData = {
    id: 'scanner-border-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          border: `${scanLineThickness}px solid ${scanColor}`,
          boxShadow: borderBoxShadow,
          pointerEvents: 'none' as const,
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
        id: 'border-scale-effect',
        componentId: 'generic',
        data: borderScaleEffect,
      },
    ],
    childrenData: [],
  };

  // === LAYER 2: SCAN LINE LAYER ===
  // Horizontal scan line that sweeps vertically
  const scanLineTranslateEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: scanSpeedSeconds,
    mode: 'provider',
    targetIds: ['scan-line-element'],
    ranges: [
      { key: 'translateY', val: -100, prog: 0 },
      { key: 'translateY', val: 100, prog: 1 },
    ],
  };

  const scanLineElement: RenderableComponentData = {
    id: 'scan-line-element',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      style: {
        width: '100%',
        height: `${scanLineThickness}px`,
        backgroundColor: scanColor,
        boxShadow: scanLineBoxShadow,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: scanSpeedSeconds,
      },
    },
    effects: [
      {
        id: 'scan-line-translate-effect',
        componentId: 'generic',
        data: scanLineTranslateEffect,
      },
    ],
  };

  const scanLineLayer: RenderableComponentData = {
    id: 'scan-line-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none' as const,
          opacity: 0.6,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [scanLineElement],
  };

  // === LAYER 3: GRID OVERLAY LAYER ===
  // Data grid overlay using CSS background gradients
  const gridOverlayLayer: RenderableComponentData = {
    id: 'grid-overlay-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none' as const,
          opacity: 0.15,
          backgroundImage: gridBackground,
          backgroundSize: `${gridSize}px ${gridSize}px`,
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

  // === LAYER 4: FLICKER HIGHLIGHT LAYER ===
  // Subtle flicker overlay using opacity animation
  let flickerEffect: GenericEffectData | null = null;

  if (flickerRate > 0) {
    flickerEffect = {
      type: 'linear',
      start: 0,
      duration: flickerDuration,
      mode: 'provider',
      targetIds: ['flicker-highlight-layer'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.15, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };
  }

  const flickerHighlightLayer: RenderableComponentData = {
    id: 'flicker-highlight-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none' as const,
          backgroundColor: hexToRgba(scanColor, 0.05),
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: flickerEffect
      ? [
          {
            id: 'flicker-opacity-effect',
            componentId: 'generic',
            data: flickerEffect,
          },
        ]
      : [],
    childrenData: [],
  };

  // === ROOT CONTAINER ===
  const rootContainer: RenderableComponentData = {
    id: 'rectangular-scanner-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      scannerBorderLayer,
      scanLineLayer,
      gridOverlayLayer,
      flickerHighlightLayer,
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

const presetMetadata: PresetMetadata = {
  id: 'rectangular-scanner-effect',
  title: 'Rectangular Scanner Effect',
  description:
    'An expanding rectangular scanner effect that sweeps across content like a security scan or data analysis visualization. Features expanding rectangular boundaries with glowing edges, data-grid overlays, and flickering highlights. Perfect for tech-themed presentations or cyberpunk aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'effects',
    'scanner',
    'tech',
    'cyberpunk',
    'security',
    'data-visualization',
    'overlay',
    'glow',
    'grid',
    'scan-line',
  ],
  dependencies: {},
  defaultInputParams: {
    scanColor: '#00ffff',
    glowIntensity: 1.0,
    gridSize: 30,
    scanSpeed: 2000,
    flickerRate: 5,
    scanLineThickness: 4,
    duration: 3,
  },
};

export const rectangularScannerEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
