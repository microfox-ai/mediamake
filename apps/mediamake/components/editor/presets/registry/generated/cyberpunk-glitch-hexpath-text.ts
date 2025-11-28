/**
 * Cyberpunk Glitch Hexagonal Path Text Animation Preset
 *
 * This preset creates a glitchy, cyberpunk text animation where words teleport along
 * a hexagonal curved path with digital distortion effects. Text travels through a
 * corrupted data stream, following a path that occasionally breaks and reconstructs.
 *
 * Features:
 * - Hexagonal path navigation (6-point polygon approximation)
 * - RGB channel split effects (red, green, blue layers)
 * - Digital noise and data moshing effects
 * - Glitch jumps and position teleportation
 * - Holographic shimmer and scan lines
 * - Intentional errors: position jumps, duplications, pixel sorting
 * - GPU-accelerated transforms for performance
 *
 * Use cases:
 * - Cyberpunk-themed video intros
 * - Tech/gaming content overlays
 * - Futuristic title sequences
 * - Digital corruption aesthetic
 * - Music video visualizations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  text: z.string().describe('Text to display with glitch effects'),
  fontSize: z.string().default('48px').describe('Font size (e.g., "48px", "3rem")'),
  fontFamily: z.string().default('Orbitron').describe('Font family (cyberpunk fonts work best: Orbitron, Rajdhani, Share Tech Mono)'),
  duration: z.number().default(10).describe('Total animation duration in seconds'),
  hexagonRadius: z.number().default(200).describe('Radius of hexagonal path in pixels'),
  glitchIntensity: z.number().min(0.1).max(3).default(1).describe('Intensity multiplier for glitch effects (0.1 = subtle, 3 = extreme)'),
  rgbSplitAmount: z.number().min(1).max(10).default(3).describe('RGB channel split offset in pixels (2-4 recommended)'),
  dataМoshIntensity: z.number().min(0.5).max(2).default(1.5).describe('Data mosh scaleX distortion intensity'),
  scanLineOpacity: z.number().min(0).max(1).default(0.6).describe('Scan line overlay opacity'),
  holographicIntensity: z.number().min(0).max(1).default(0.4).describe('Holographic shimmer intensity'),
  noiseOpacity: z.number().min(0).max(0.5).default(0.15).describe('Digital noise layer opacity'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    duration,
    hexagonRadius,
    glitchIntensity,
    rgbSplitAmount,
    dataМoshIntensity,
    scanLineOpacity,
    holographicIntensity,
    noiseOpacity,
  } = params;

  // Calculate hexagonal path positions (6 vertices)
  const calculateHexPath = (radius: number) => {
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2; // Start from top
      positions.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    return positions;
  };

  const hexPositions = calculateHexPath(hexagonRadius);

  // Generate keyframe timing for hexagonal path (with glitch jumps)
  const generatePathKeyframes = () => {
    return [
      { prog: 0, pos: hexPositions[0] },
      { prog: 0.16, pos: hexPositions[1] },
      { prog: 0.17, pos: hexPositions[2] }, // Glitch jump
      { prog: 0.33, pos: hexPositions[2] },
      { prog: 0.5, pos: hexPositions[3] },
      { prog: 0.66, pos: hexPositions[4] },
      { prog: 0.83, pos: hexPositions[5] },
      { prog: 1, pos: hexPositions[0] }, // Complete cycle
    ];
  };

  const pathKeyframes = generatePathKeyframes();

  // Scan lines layer
  const scanLinesLayer: RenderableComponentData = {
    id: 'scan-lines-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none mix-blend-screen',
        style: {
          background:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
          opacity: scanLineOpacity,
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

  // Holographic shimmer layer
  const holographicShimmerLayer: RenderableComponentData = {
    id: 'holographic-shimmer-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none mix-blend-screen',
        style: {
          background:
            'linear-gradient(90deg, transparent 0%, rgba(0,255,255,0.1) 25%, rgba(255,0,255,0.1) 50%, rgba(255,255,0,0.1) 75%, transparent 100%)',
          backgroundSize: '200% 100%',
          opacity: holographicIntensity,
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
        id: 'shimmer-sweep',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['holographic-shimmer-layer'],
          ranges: [
            { key: 'backgroundPositionX', val: '0%', prog: 0 },
            { key: 'backgroundPositionX', val: '100%', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Noise layer (using HTMLBlockAtom for digital noise texture)
  const noiseLayer: RenderableComponentData = {
    id: 'noise-layer',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4='); background-size: 100px 100px;"></div>`,
      className: 'absolute inset-0 mix-blend-overlay pointer-events-none',
      style: {
        opacity: noiseOpacity,
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
        id: 'noise-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['noise-layer'],
          ranges: [
            { key: 'opacity', val: noiseOpacity * 0.7, prog: 0 },
            { key: 'opacity', val: noiseOpacity * 1.3, prog: 0.05 },
            { key: 'opacity', val: noiseOpacity, prog: 0.1 },
            { key: 'opacity', val: noiseOpacity * 1.2, prog: 0.15 },
            { key: 'opacity', val: noiseOpacity * 0.8, prog: 0.2 },
            { key: 'opacity', val: noiseOpacity * 1.3, prog: 0.25 },
            { key: 'opacity', val: noiseOpacity * 0.7, prog: 0.3 },
            { key: 'opacity', val: noiseOpacity, prog: 1 },
          ],
        },
      },
    ],
  };

  // RGB Red Channel
  const rgbRedChannel: RenderableComponentData = {
    id: 'rgb-red-channel',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'absolute mix-blend-screen',
      style: {
        color: '#ff0000',
        fontSize: fontSize,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Hexagonal path animation
      {
        id: 'red-hex-path',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['rgb-red-channel'],
          ranges: pathKeyframes.flatMap((kf) => [
            { key: 'translateX', val: kf.pos.x, prog: kf.prog },
            { key: 'translateY', val: kf.pos.y, prog: kf.prog },
          ]),
        },
      },
      // RGB split offset
      {
        id: 'red-glitch-offset',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['rgb-red-channel'],
          ranges: [
            { key: 'translateX', val: rgbSplitAmount, prog: 0 },
            { key: 'translateX', val: -rgbSplitAmount * 1.5 * glitchIntensity, prog: 0.17 },
            { key: 'translateX', val: rgbSplitAmount, prog: 0.18 },
            { key: 'translateX', val: rgbSplitAmount * 2 * glitchIntensity, prog: 0.34 },
            { key: 'translateX', val: rgbSplitAmount, prog: 0.35 },
            { key: 'translateX', val: -rgbSplitAmount * glitchIntensity, prog: 0.51 },
            { key: 'translateX', val: rgbSplitAmount, prog: 0.52 },
            { key: 'translateX', val: rgbSplitAmount * 1.5 * glitchIntensity, prog: 0.67 },
            { key: 'translateX', val: rgbSplitAmount, prog: 0.68 },
            { key: 'translateX', val: -rgbSplitAmount * 2 * glitchIntensity, prog: 0.84 },
            { key: 'translateX', val: rgbSplitAmount, prog: 0.85 },
          ],
        },
      },
      // Data mosh effect
      {
        id: 'red-data-mosh',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['rgb-red-channel'],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 1.5 * dataМoshIntensity, prog: 0.16 },
            { key: 'scaleX', val: 0.8 / dataМoshIntensity, prog: 0.17 },
            { key: 'scaleX', val: 1, prog: 0.18 },
            { key: 'scaleX', val: 1.3 * dataМoshIntensity, prog: 0.33 },
            { key: 'scaleX', val: 0.9 / dataМoshIntensity, prog: 0.34 },
            { key: 'scaleX', val: 1, prog: 0.35 },
            { key: 'scaleX', val: 1.4 * dataМoshIntensity, prog: 0.5 },
            { key: 'scaleX', val: 0.85 / dataМoshIntensity, prog: 0.51 },
            { key: 'scaleX', val: 1, prog: 0.52 },
          ],
        },
      },
    ],
  };

  // RGB Green Channel
  const rgbGreenChannel: RenderableComponentData = {
    id: 'rgb-green-channel',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'absolute mix-blend-screen',
      style: {
        color: '#00ff00',
        fontSize: fontSize,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Hexagonal path animation (same as red)
      {
        id: 'green-hex-path',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['rgb-green-channel'],
          ranges: pathKeyframes.flatMap((kf) => [
            { key: 'translateX', val: kf.pos.x, prog: kf.prog },
            { key: 'translateY', val: kf.pos.y, prog: kf.prog },
          ]),
        },
      },
      // RGB split offset (different pattern)
      {
        id: 'green-glitch-offset',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['rgb-green-channel'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateX', val: rgbSplitAmount * glitchIntensity, prog: 0.17 },
            { key: 'translateY', val: -rgbSplitAmount * glitchIntensity, prog: 0.17 },
            { key: 'translateX', val: 0, prog: 0.18 },
            { key: 'translateY', val: 0, prog: 0.18 },
            { key: 'translateX', val: -rgbSplitAmount * 1.5 * glitchIntensity, prog: 0.34 },
            { key: 'translateY', val: rgbSplitAmount * 1.5 * glitchIntensity, prog: 0.34 },
            { key: 'translateX', val: 0, prog: 0.35 },
            { key: 'translateY', val: 0, prog: 0.35 },
          ],
        },
      },
    ],
  };

  // RGB Blue Channel
  const rgbBlueChannel: RenderableComponentData = {
    id: 'rgb-blue-channel',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'absolute mix-blend-screen',
      style: {
        color: '#0000ff',
        fontSize: fontSize,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Hexagonal path animation (same as others)
      {
        id: 'blue-hex-path',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['rgb-blue-channel'],
          ranges: pathKeyframes.flatMap((kf) => [
            { key: 'translateX', val: kf.pos.x, prog: kf.prog },
            { key: 'translateY', val: kf.pos.y, prog: kf.prog },
          ]),
        },
      },
      // RGB split offset (opposite direction)
      {
        id: 'blue-glitch-offset',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['rgb-blue-channel'],
          ranges: [
            { key: 'translateX', val: -rgbSplitAmount, prog: 0 },
            { key: 'translateY', val: rgbSplitAmount, prog: 0 },
            { key: 'translateX', val: rgbSplitAmount * 1.5 * glitchIntensity, prog: 0.17 },
            { key: 'translateY', val: -rgbSplitAmount * 1.5 * glitchIntensity, prog: 0.17 },
            { key: 'translateX', val: -rgbSplitAmount, prog: 0.18 },
            { key: 'translateY', val: rgbSplitAmount, prog: 0.18 },
            { key: 'translateX', val: rgbSplitAmount * 2 * glitchIntensity, prog: 0.34 },
            { key: 'translateY', val: -rgbSplitAmount * glitchIntensity, prog: 0.34 },
            { key: 'translateX', val: -rgbSplitAmount, prog: 0.35 },
            { key: 'translateY', val: rgbSplitAmount, prog: 0.35 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cyberpunk-glitch-hexpath-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      scanLinesLayer,
      holographicShimmerLayer,
      noiseLayer,
      rgbRedChannel,
      rgbGreenChannel,
      rgbBlueChannel,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'cyberpunk-glitch-hexpath-text',
  title: 'Cyberpunk Glitch Hexagonal Path Text',
  description:
    'Glitchy cyberpunk text animation with hexagonal curved path navigation, RGB channel splits, digital distortion, holographic shimmer, scan lines, and data corruption effects. Text teleports through a geometric hexagonal pattern with intentional glitches, position jumps, and pixel sorting effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'cyberpunk',
    'glitch',
    'rgb-split',
    'hexagonal',
    'path-animation',
    'distortion',
    'holographic',
    'scan-lines',
    'data-corruption',
    'digital-noise',
    'futuristic',
    'tech',
  ],
  defaultInputParams: {
    text: 'CYBER GLITCH',
    fontSize: '48px',
    fontFamily: 'Orbitron',
    duration: 10,
    hexagonRadius: 200,
    glitchIntensity: 1,
    rgbSplitAmount: 3,
    dataМoshIntensity: 1.5,
    scanLineOpacity: 0.6,
    holographicIntensity: 0.4,
    noiseOpacity: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const cyberpunkGlitchHexpathTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
