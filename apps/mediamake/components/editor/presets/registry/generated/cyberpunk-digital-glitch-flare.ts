/**
 * Cyberpunk Digital Glitch Flare Preset
 *
 * A futuristic lens flare effect combining holographic properties with data corruption aesthetics.
 * Features geometric hexagonal and angular flares with RGB splitting, scan lines, digital noise,
 * and strobe effects. Designed for cyberpunk-style transitions with neon colors (cyan, magenta, yellow)
 * and glitch animations synchronized to a digital heartbeat rhythm.
 *
 * Key Features:
 * - Geometric flares (hexagonal, triangular, angular shapes) with clip-path
 * - RGB channel splitting with chromatic aberration
 * - Scan lines overlay with vertical movement
 * - Digital noise bursts for static effect
 * - Strobe flashes synchronized to digital heartbeat
 * - Glitch animations with rapid position changes and skew transforms
 *
 * Use Cases:
 * - Cyberpunk-themed video transitions
 * - Futuristic UI overlays
 * - Tech/gaming content intros
 * - Digital glitch aesthetic effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  duration: z
    .number()
    .default(3)
    .describe('Duration of the entire flare effect in seconds'),
  intensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for all effects (0.1-3.0)'),
  neonColors: z
    .object({
      cyan: z.string().default('rgba(0,255,255,0.6)').describe('Cyan color'),
      magenta: z
        .string()
        .default('rgba(255,0,255,0.6)')
        .describe('Magenta color'),
      yellow: z
        .string()
        .default('rgba(255,255,0,0.5)')
        .describe('Yellow color'),
    })
    .optional()
    .describe('Neon color configuration for cyberpunk aesthetic'),
  glitchBursts: z
    .array(
      z.object({
        start: z.number().describe('Start time of glitch burst (seconds)'),
        duration: z
          .number()
          .default(0.2)
          .describe('Duration of glitch burst (seconds)'),
      }),
    )
    .default([
      { start: 0.5, duration: 0.2 },
      { start: 1.5, duration: 0.2 },
      { start: 2.5, duration: 0.2 },
    ])
    .describe('Timing for glitch burst effects'),
  rgbSplitIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(4)
    .describe('RGB channel split intensity in pixels'),
  scanLineSpeed: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Scan line movement speed multiplier'),
  strobeFlashes: z
    .boolean()
    .default(true)
    .describe('Enable strobe flash effects'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    intensity,
    neonColors,
    glitchBursts,
    rgbSplitIntensity,
    scanLineSpeed,
    strobeFlashes,
  } = params;

  const colors = neonColors || {
    cyan: 'rgba(0,255,255,0.6)',
    magenta: 'rgba(255,0,255,0.6)',
    yellow: 'rgba(255,255,0,0.5)',
  };

  // Helper: Create glitch effect ranges
  const createGlitchEffect = (
    targetId: string,
    burstStart: number,
    burstDuration: number,
  ) => {
    const glitchIntensity = 20 * intensity;
    return {
      id: `glitch-${targetId}-${burstStart}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: burstStart,
        duration: burstDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: glitchIntensity, prog: 0.2 },
          { key: 'translateX', val: -glitchIntensity, prog: 0.4 },
          { key: 'translateX', val: glitchIntensity * 0.5, prog: 0.6 },
          { key: 'translateX', val: -glitchIntensity * 0.5, prog: 0.8 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'skewX', val: 0, prog: 0 },
          { key: 'skewX', val: 5, prog: 0.25 },
          { key: 'skewX', val: -5, prog: 0.5 },
          { key: 'skewX', val: 3, prog: 0.75 },
          { key: 'skewX', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create pulsing scale effect
  const createPulseEffect = (
    targetId: string,
    startTime: number,
    pulseDuration: number,
  ) => {
    const scaleAmount = 1 + 0.15 * intensity;
    return {
      id: `pulse-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: startTime,
        duration: pulseDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: scaleAmount, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Geometric flare components
  const hexFlare1: RenderableComponentData = {
    id: 'hex-flare-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 200px; height: 200px; background: linear-gradient(135deg, ${colors.cyan} 0%, ${colors.magenta} 50%, transparent 100%); clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); mix-blend-mode: screen; filter: blur(2px);"></div>`,
      className: 'absolute',
      style: {
        top: '20%',
        left: '30%',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      createPulseEffect('hex-flare-1', 0, 0.5),
      createPulseEffect('hex-flare-1', 1, 0.5),
      ...glitchBursts.map((burst) =>
        createGlitchEffect('hex-flare-1', burst.start, burst.duration),
      ),
    ],
  };

  const hexFlare2: RenderableComponentData = {
    id: 'hex-flare-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 150px; height: 150px; background: linear-gradient(45deg, ${colors.yellow} 0%, ${colors.cyan} 100%); clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); mix-blend-mode: screen; filter: blur(1px);"></div>`,
      className: 'absolute',
      style: {
        top: '60%',
        right: '20%',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      createPulseEffect('hex-flare-2', 0.3, 0.5),
      createPulseEffect('hex-flare-2', 1.3, 0.5),
      ...glitchBursts.map((burst) =>
        createGlitchEffect('hex-flare-2', burst.start, burst.duration),
      ),
    ],
  };

  const triFlare1: RenderableComponentData = {
    id: 'tri-flare-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 120px; height: 120px; background: linear-gradient(180deg, ${colors.magenta} 0%, transparent 100%); clip-path: polygon(50% 0%, 0% 100%, 100% 100%); mix-blend-mode: screen;"></div>`,
      className: 'absolute',
      style: {
        top: '40%',
        left: '60%',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      createPulseEffect('tri-flare-1', 0.6, 0.5),
      createPulseEffect('tri-flare-1', 1.6, 0.5),
      ...glitchBursts.map((burst) =>
        createGlitchEffect('tri-flare-1', burst.start, burst.duration),
      ),
    ],
  };

  const angularFlare1: RenderableComponentData = {
    id: 'angular-flare-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 300px; height: 80px; background: linear-gradient(90deg, ${colors.cyan} 0%, ${colors.magenta} 50%, transparent 100%); clip-path: polygon(0 50%, 10% 0, 100% 0, 90% 50%, 100% 100%, 10% 100%); mix-blend-mode: screen; transform: skewX(-15deg);"></div>`,
      className: 'absolute',
      style: {
        top: '50%',
        left: '10%',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      createPulseEffect('angular-flare-1', 0.9, 0.5),
      createPulseEffect('angular-flare-1', 1.9, 0.5),
      ...glitchBursts.map((burst) =>
        createGlitchEffect('angular-flare-1', burst.start, burst.duration),
      ),
    ],
  };

  const geometricFlaresContainer: RenderableComponentData = {
    id: 'geometric-flares-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [hexFlare1, hexFlare2, triFlare1, angularFlare1],
  };

  // RGB split layer
  const rgbRedChannel: RenderableComponentData = {
    id: 'rgb-red-channel',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at 50% 50%, rgba(255,0,0,${0.3 * intensity}) 0%, transparent 70%); mix-blend-mode: screen;"></div>`,
      className: 'absolute inset-0',
      style: {
        transform: `translateX(-${rgbSplitIntensity}px)`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: glitchBursts.map((burst) => ({
      id: `rgb-red-jitter-${burst.start}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: burst.start,
        duration: burst.duration,
        mode: 'provider' as const,
        targetIds: ['rgb-red-channel'],
        ranges: [
          {
            key: 'translateX',
            val: `-${rgbSplitIntensity}px`,
            prog: 0,
          },
          {
            key: 'translateX',
            val: `-${rgbSplitIntensity * 1.5}px`,
            prog: 0.5,
          },
          {
            key: 'translateX',
            val: `-${rgbSplitIntensity}px`,
            prog: 1,
          },
        ],
      },
    })),
  };

  const rgbGreenChannel: RenderableComponentData = {
    id: 'rgb-green-channel',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at 50% 50%, rgba(0,255,0,${0.3 * intensity}) 0%, transparent 70%); mix-blend-mode: screen;"></div>`,
      className: 'absolute inset-0',
      style: {
        transform: 'translateX(0px)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const rgbBlueChannel: RenderableComponentData = {
    id: 'rgb-blue-channel',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at 50% 50%, rgba(0,0,255,${0.3 * intensity}) 0%, transparent 70%); mix-blend-mode: screen;"></div>`,
      className: 'absolute inset-0',
      style: {
        transform: `translateX(${rgbSplitIntensity}px)`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: glitchBursts.map((burst) => ({
      id: `rgb-blue-jitter-${burst.start}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: burst.start,
        duration: burst.duration,
        mode: 'provider' as const,
        targetIds: ['rgb-blue-channel'],
        ranges: [
          {
            key: 'translateX',
            val: `${rgbSplitIntensity}px`,
            prog: 0,
          },
          {
            key: 'translateX',
            val: `${rgbSplitIntensity * 1.5}px`,
            prog: 0.5,
          },
          {
            key: 'translateX',
            val: `${rgbSplitIntensity}px`,
            prog: 1,
          },
        ],
      },
    })),
  };

  const rgbSplitLayer: RenderableComponentData = {
    id: 'rgb-split-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [rgbRedChannel, rgbGreenChannel, rgbBlueChannel],
  };

  // Scan lines overlay
  const scanLinesOverlay: RenderableComponentData = {
    id: 'scan-lines-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, transparent 0px, transparent 2px, ${colors.cyan.replace('0.6', '0.1')} 2px, ${colors.cyan.replace('0.6', '0.1')} 4px); opacity: 0.6;"></div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'scan-lines-move',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: duration / scanLineSpeed,
          mode: 'provider' as const,
          targetIds: ['scan-lines-overlay'],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '100%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Digital noise overlay
  const digitalNoiseOverlay: RenderableComponentData = {
    id: 'digital-noise-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background-image: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzPSI0IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjMiLz48L3N2Zz4=); opacity: 0; mix-blend-mode: overlay;"></div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: glitchBursts.map((burst) => ({
      id: `noise-burst-${burst.start}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: burst.start,
        duration: burst.duration,
        mode: 'provider' as const,
        targetIds: ['digital-noise-overlay'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.3 * intensity, prog: 0.3 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    })),
  };

  // Strobe overlay
  const strobeOverlay: RenderableComponentData = {
    id: 'strobe-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background-color: rgba(255,255,255,0.9); opacity: 0; mix-blend-mode: overlay;"></div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: strobeFlashes
      ? glitchBursts.map((burst, index) => ({
          id: `strobe-flash-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: burst.start,
            duration: burst.duration,
            mode: 'provider' as const,
            targetIds: ['strobe-overlay'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8 * intensity, prog: 0.1 },
              { key: 'opacity', val: 0, prog: 0.2 },
              { key: 'opacity', val: 0.6 * intensity, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 0.4 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        }))
      : [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cyberpunk-flare-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black/10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      geometricFlaresContainer,
      rgbSplitLayer,
      scanLinesOverlay,
      digitalNoiseOverlay,
      strobeOverlay,
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
  id: 'cyberpunk-digital-glitch-flare',
  title: 'Cyberpunk Digital Glitch Flare',
  description:
    'A futuristic lens flare effect combining holographic properties with data corruption aesthetics. Features geometric hexagonal and angular flares with RGB splitting, scan lines, digital noise, and strobe effects. Designed for cyberpunk-style transitions with neon colors (cyan, magenta, yellow) and glitch animations synchronized to a digital heartbeat rhythm.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'flare',
    'cyberpunk',
    'glitch',
    'futuristic',
    'rgb-split',
    'geometric',
    'neon',
    'tech',
    'strobe',
    'scan-lines',
    'digital',
    'holographic',
  ],
  defaultInputParams: {
    duration: 3,
    intensity: 1,
    neonColors: {
      cyan: 'rgba(0,255,255,0.6)',
      magenta: 'rgba(255,0,255,0.6)',
      yellow: 'rgba(255,255,0,0.5)',
    },
    glitchBursts: [
      { start: 0.5, duration: 0.2 },
      { start: 1.5, duration: 0.2 },
      { start: 2.5, duration: 0.2 },
    ],
    rgbSplitIntensity: 4,
    scanLineSpeed: 2,
    strobeFlashes: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const cyberpunkDigitalGlitchFlarePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
