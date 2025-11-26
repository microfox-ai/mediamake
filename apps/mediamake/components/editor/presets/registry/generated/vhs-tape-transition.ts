/**
 * VHS Tape Transition Effect Preset
 *
 * A nostalgic VHS-style transition effect simulating 90s home video recordings with authentic analog artifacts.
 * This preset creates a transition that mimics the experience of pressing play on a worn VHS tape.
 *
 * Features:
 * - **Horizontal Scan Lines**: Characteristic CRT display scan lines with vertical scrolling animation
 * - **RGB Channel Separation**: Authentic color bleeding and chromatic aberration on edges
 * - **Static Noise**: Heavy static at start that gradually clears to reveal content
 * - **Tracking Errors**: Horizontal bars that randomly distort and shift, like adjusting VCR tracking
 * - **Vertical Hold Glitches**: Image rolling and jumping effects common in analog video
 * - **Animated Film Grain**: Organic, dancing grain texture that shifts naturally, not static overlay
 * - **Peak Distortion**: Most intense effects at the midpoint (50%) of the transition
 * - **Organic Timing**: Cubic-bezier easing for tape-like, analog motion feel
 *
 * Technical Implementation:
 * - Multiple layered effects with GPU acceleration (transform3d, will-change)
 * - CSS filter chains for authentic VHS color grading (contrast, brightness, saturation)
 * - Blend modes for RGB channel separation (screen mode with color filters)
 * - Animated noise textures with rapid position shifts
 * - Randomized glitch timing for organic, purposeful degradation feel
 *
 * Use cases:
 * - Creating nostalgic intro/outro transitions
 * - Retro-themed video content
 * - 90s aesthetic edits
 * - Analog distortion effects for music videos
 * - Vintage home video simulations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  duration: z
    .number()
    .default(1.5)
    .describe('Duration of the VHS transition effect in seconds (1-2 seconds recommended)'),
  intensity: z
    .number()
    .min(0.1)
    .max(3.0)
    .default(1.0)
    .describe('Overall intensity multiplier for all effects (0.1 = subtle, 3.0 = extreme)'),
  peakDistortionPoint: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Progress point (0-1) where distortion is most intense, default 0.5 (midpoint)'),
  rgbSeparation: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Maximum RGB channel separation distance in pixels at peak distortion'),
  scanlineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of horizontal scan lines (0-1)'),
  staticIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.9)
    .describe('Initial static noise intensity (0-1), gradually clears during transition'),
  grainAmount: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.15)
    .describe('Amount of animated film grain overlay (0-0.5)'),
  colorGrading: z
    .boolean()
    .default(true)
    .describe('Apply VHS-style color grading (reduced saturation, adjusted contrast/brightness)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    intensity,
    peakDistortionPoint,
    rgbSeparation,
    scanlineOpacity,
    staticIntensity,
    grainAmount,
    colorGrading,
  } = params;

  // Helper functions
  const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(max, value));
  };

  const easeInOutCubic = (t: number) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Calculate effect timings and values based on intensity
  const effectDuration = duration;
  const peakPoint = clamp(peakDistortionPoint, 0, 1);
  const maxRgbOffset = rgbSeparation * intensity;
  const maxStaticOpacity = staticIntensity * intensity;
  const grainOpacity = clamp(grainAmount * intensity, 0, 0.5);

  // Generate noise texture data URL for static effect
  const generateNoiseDataUrl = () => {
    // Simple SVG noise pattern
    const svgNoise = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" opacity="0.5"/>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svgNoise)}`;
  };

  // Generate grain texture data URL
  const generateGrainDataUrl = () => {
    // Simple repeating grain pattern
    const svgGrain = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="3" />
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)"/>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svgGrain)}`;
  };

  const noiseDataUrl = generateNoiseDataUrl();
  const grainDataUrl = generateGrainDataUrl();

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'vhs-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
        style: {
          willChange: 'transform, opacity, filter',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    childrenData: [],
  };

  // ============================================================================
  // CONTENT LAYER (with VHS color grading)
  // ============================================================================

  const contentLayer: RenderableComponentData = {
    id: 'vhs-content-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-10',
        style: {
          ...(colorGrading && {
            filter: 'contrast(1.1) brightness(0.95) saturate(0.85)',
          }),
          willChange: 'transform, filter, opacity',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: [
      // Main reveal effect - opacity fade in
      {
        id: 'content-reveal-effect',
        componentId: 'vhs-content-layer',
        data: {
          type: 'linear',
          start: 0,
          duration: effectDuration,
          mode: 'provider',
          targetIds: ['vhs-content-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: peakPoint },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Vertical hold glitch - random jumps
      {
        id: 'vertical-hold-glitch-effect',
        componentId: 'vhs-content-layer',
        data: {
          type: 'linear',
          start: 0,
          duration: effectDuration,
          mode: 'provider',
          targetIds: ['vhs-content-layer'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -20 * intensity, prog: 0.3 },
            { key: 'translateY', val: 15 * intensity, prog: peakPoint - 0.1 },
            { key: 'translateY', val: -10 * intensity, prog: peakPoint },
            { key: 'translateY', val: 8 * intensity, prog: peakPoint + 0.15 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // ============================================================================
  // SCAN LINES LAYER
  // ============================================================================

  const scanlinesLayer: RenderableComponentData = {
    id: 'vhs-scanlines-layer',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      atomType: 'shape',
      shapeType: 'rectangle',
      width: '100%',
      height: '100%',
      style: {
        position: 'absolute',
        inset: '0',
        zIndex: '20',
        pointerEvents: 'none',
        background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,${scanlineOpacity}) 2px, rgba(0,0,0,${scanlineOpacity}) 4px)`,
        willChange: 'transform',
        transform: 'translateZ(0)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: [
      // Scanline scrolling animation
      {
        id: 'scanlines-scroll-effect',
        componentId: 'vhs-scanlines-layer',
        data: {
          type: 'linear',
          start: 0,
          duration: effectDuration,
          mode: 'provider',
          targetIds: ['vhs-scanlines-layer'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -4, prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // RGB SPLIT LAYERS (Chromatic Aberration)
  // ============================================================================

  // Red channel
  const rgbRedChannel: RenderableComponentData = {
    id: 'vhs-rgb-red-channel',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      atomType: 'shape',
      shapeType: 'rectangle',
      width: '100%',
      height: '100%',
      style: {
        position: 'absolute',
        inset: '0',
        zIndex: '30',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: [
      {
        id: 'rgb-red-effect',
        componentId: 'vhs-rgb-red-channel',
        data: {
          type: 'linear',
          start: 0,
          duration: effectDuration,
          mode: 'provider',
          targetIds: ['vhs-rgb-red-channel'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -maxRgbOffset, prog: peakPoint },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: peakPoint },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Green channel
  const rgbGreenChannel: RenderableComponentData = {
    id: 'vhs-rgb-green-channel',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      atomType: 'shape',
      shapeType: 'rectangle',
      width: '100%',
      height: '100%',
      style: {
        position: 'absolute',
        inset: '0',
        zIndex: '31',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        backgroundColor: 'rgba(0, 255, 0, 0.5)',
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: [
      {
        id: 'rgb-green-effect',
        componentId: 'vhs-rgb-green-channel',
        data: {
          type: 'linear',
          start: 0,
          duration: effectDuration,
          mode: 'provider',
          targetIds: ['vhs-rgb-green-channel'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: maxRgbOffset * 0.5, prog: peakPoint },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: peakPoint },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Blue channel
  const rgbBlueChannel: RenderableComponentData = {
    id: 'vhs-rgb-blue-channel',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      atomType: 'shape',
      shapeType: 'rectangle',
      width: '100%',
      height: '100%',
      style: {
        position: 'absolute',
        inset: '0',
        zIndex: '32',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        backgroundColor: 'rgba(0, 0, 255, 0.5)',
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: [
      {
        id: 'rgb-blue-effect',
        componentId: 'vhs-rgb-blue-channel',
        data: {
          type: 'linear',
          start: 0,
          duration: effectDuration,
          mode: 'provider',
          targetIds: ['vhs-rgb-blue-channel'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: maxRgbOffset, prog: peakPoint },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: peakPoint },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // STATIC NOISE LAYER
  // ============================================================================

  const staticNoiseLayer: RenderableComponentData = {
    id: 'vhs-static-noise-layer',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      atomType: 'shape',
      shapeType: 'rectangle',
      width: '100%',
      height: '100%',
      style: {
        position: 'absolute',
        inset: '0',
        zIndex: '40',
        pointerEvents: 'none',
        backgroundImage: `url(${noiseDataUrl})`,
        backgroundSize: '100px 100px',
        willChange: 'opacity, background-position',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: [
      // Static fade out and position shift
      {
        id: 'static-noise-effect',
        componentId: 'vhs-static-noise-layer',
        data: {
          type: 'linear',
          start: 0,
          duration: effectDuration,
          mode: 'provider',
          targetIds: ['vhs-static-noise-layer'],
          ranges: [
            { key: 'opacity', val: maxStaticOpacity, prog: 0 },
            { key: 'opacity', val: maxStaticOpacity * 1.2, prog: peakPoint },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // TRACKING ERROR BAR
  // ============================================================================

  const trackingErrorBar: RenderableComponentData = {
    id: 'vhs-tracking-error-bar',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      atomType: 'shape',
      shapeType: 'rectangle',
      width: '100%',
      height: '8px',
      style: {
        position: 'absolute',
        left: '0',
        right: '0',
        top: '40%',
        zIndex: '50',
        pointerEvents: 'none',
        background:
          'linear-gradient(90deg, transparent 0%, white 20%, transparent 40%, white 60%, transparent 80%)',
        willChange: 'transform, opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: [
      {
        id: 'tracking-error-effect',
        componentId: 'vhs-tracking-error-bar',
        data: {
          type: 'linear',
          start: 0,
          duration: effectDuration,
          mode: 'provider',
          targetIds: ['vhs-tracking-error-bar'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3 * intensity, prog: 0.2 },
            { key: 'opacity', val: 0.8 * intensity, prog: peakPoint },
            { key: 'opacity', val: 0.2 * intensity, prog: peakPoint + 0.2 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'translateY', val: -100, prog: 0 },
            { key: 'translateY', val: 50, prog: 0.3 },
            { key: 'translateY', val: 0, prog: peakPoint },
            { key: 'translateY', val: -30, prog: peakPoint + 0.15 },
            { key: 'translateY', val: 200, prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // GRAIN OVERLAY
  // ============================================================================

  const grainOverlay: RenderableComponentData = {
    id: 'vhs-grain-overlay',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      atomType: 'shape',
      shapeType: 'rectangle',
      width: '100%',
      height: '100%',
      style: {
        position: 'absolute',
        inset: '0',
        zIndex: '50',
        pointerEvents: 'none',
        backgroundImage: `url(${grainDataUrl})`,
        backgroundSize: '256px 256px',
        opacity: grainOpacity,
        mixBlendMode: 'overlay',
        willChange: 'background-position',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: [
      // Animated grain position shift
      {
        id: 'grain-animation-effect',
        componentId: 'vhs-grain-overlay',
        data: {
          type: 'linear',
          start: 0,
          duration: effectDuration,
          mode: 'provider',
          targetIds: ['vhs-grain-overlay'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -10, prog: 0.33 },
            { key: 'translateX', val: 5, prog: 0.66 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 8, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // ASSEMBLE CHILDREN
  // ============================================================================

  rootContainer.childrenData = [
    contentLayer,
    scanlinesLayer,
    rgbRedChannel,
    rgbGreenChannel,
    rgbBlueChannel,
    staticNoiseLayer,
    trackingErrorBar,
    grainOverlay,
  ] as RenderableComponentData[];

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'vhs-tape-transition',
  title: 'VHS Tape Transition Effect',
  description:
    'A nostalgic VHS-style transition effect simulating 90s home video recordings with authentic analog artifacts. Features horizontal scan lines, RGB channel separation with color bleeding, static noise that gradually clears, tracking error bars, vertical hold glitches, and animated organic film grain. The transition peaks at the midpoint with maximum distortion before revealing clean content, mimicking the experience of pressing play on a worn VHS tape.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vhs',
    'retro',
    '90s',
    'analog',
    'glitch',
    'distortion',
    'nostalgia',
    'tape',
    'scanlines',
    'rgb-split',
    'chromatic-aberration',
    'static',
    'grain',
    'tracking-error',
    'vintage',
  ],
  defaultInputParams: {
    duration: 1.5,
    intensity: 1.0,
    peakDistortionPoint: 0.5,
    rgbSeparation: 8,
    scanlineOpacity: 0.3,
    staticIntensity: 0.9,
    grainAmount: 0.15,
    colorGrading: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const vhsTapeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
