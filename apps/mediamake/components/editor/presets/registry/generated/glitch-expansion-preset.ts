/**
 * Glitch Expansion Preset
 * 
 * A digital corruption effect preset featuring RGB channel splits, chromatic aberration,
 * scan lines, and data moshing. HTML divs appear to malfunction and glitch from the center
 * before stabilizing to reveal content.
 * 
 * Features:
 * - Multiple overlapping RGB channel layers with random shifts and distortions
 * - Chromatic aberration effects via translateX offsets
 * - Scan line overlays with animated offset
 * - Noise patterns for digital distortion aesthetic
 * - Random opacity flickers using stepped keyframes
 * - Data moshing effects where segments briefly show incorrect positions/scales
 * - Glitch intensity highest at beginning (0-1s), gradually stabilizing (1-2s), final settle (2-2.5s)
 * 
 * Use cases:
 * - Digital corruption/glitch intros for tech content
 * - Video editing transition effects
 * - Cyberpunk/tech aesthetic overlays
 * - Distorted reveal animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .describe('Total duration of the glitch expansion effect in seconds'),
  rgbSplitIntensity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Intensity multiplier for RGB channel separation (higher = more split)'),
  flickerFrequency: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Number of opacity flicker events during glitch phase'),
  glitchIntensityPhase1: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.4)
    .describe('Duration of intense glitch phase (0-1s by default) as fraction of total duration'),
  stabilizationPhase: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.4)
    .describe('Duration of stabilization phase (1-2s by default) as fraction of total duration'),
  dataMoshCount: z
    .number()
    .int()
    .min(0)
    .max(10)
    .default(2)
    .describe('Number of data mosh jump effects during expansion'),
  scanlineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Opacity of scan line overlay (0-1)'),
  noiseOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Opacity of noise layer (0-1)'),
  contentScale: z
    .object({
      start: z.number().default(0.5).describe('Initial scale of content (0.5 = 50%)'),
      end: z.number().default(1).describe('Final scale of content (1 = 100%)'),
    })
    .default({ start: 0.5, end: 1 })
    .describe('Content scaling range from start to end'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const duration = params.duration;
  const rgbIntensity = params.rgbSplitIntensity;
  const phase1Duration = duration * params.glitchIntensityPhase1;
  const phase2Duration = duration * params.stabilizationPhase;
  const phase3Start = phase1Duration + phase2Duration;

  // Helper: Create RGB glitch effect
  const createRGBGlitchEffect = (
    targetId: string,
    channelOffset: number,
    baseOpacity: number,
  ): GenericEffectData => {
    const maxOffset = channelOffset * rgbIntensity;
    return {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Intense glitch phase (0 - phase1)
        { key: 'translateX', val: maxOffset * 2, prog: 0 },
        { key: 'translateX', val: maxOffset * 1.5, prog: phase1Duration / duration * 0.3 },
        { key: 'translateX', val: maxOffset, prog: phase1Duration / duration * 0.6 },
        // Stabilization phase (phase1 - phase2)
        { key: 'translateX', val: maxOffset * 0.5, prog: (phase1Duration + phase2Duration * 0.5) / duration },
        // Final settle (phase2 - end)
        { key: 'translateX', val: 0, prog: 1 },
        // Scale variations
        { key: 'scale', val: 1.02, prog: 0 },
        { key: 'scale', val: 1.01, prog: phase1Duration / duration },
        { key: 'scale', val: 1, prog: 1 },
        // Opacity
        { key: 'opacity', val: baseOpacity * 0.8, prog: 0 },
        { key: 'opacity', val: baseOpacity * 0.6, prog: 1 },
      ],
    };
  };

  // Helper: Create flicker effect
  const createFlickerEffect = (
    targetId: string,
    startTime: number,
    baseOpacity: number,
  ): GenericEffectData => {
    return {
      type: 'linear',
      start: startTime,
      duration: 0.1,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: baseOpacity, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.5 },
        { key: 'opacity', val: baseOpacity, prog: 1 },
      ],
    };
  };

  // Helper: Create data mosh effect
  const createDataMoshEffect = (
    targetId: string,
    startTime: number,
    axis: 'x' | 'y',
    distance: number,
  ): GenericEffectData => {
    const key = axis === 'x' ? 'translateX' : 'translateY';
    return {
      type: 'linear',
      start: startTime,
      duration: 0.05,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key, val: 0, prog: 0 },
        { key, val: distance, prog: 0.5 },
        { key, val: 0, prog: 1 },
      ],
    };
  };

  // Helper: Create content expansion effect
  const createContentExpansionEffect = (targetId: string): GenericEffectData => {
    return {
      type: 'ease-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Scale animation
        { key: 'scale', val: params.contentScale.start, prog: 0 },
        { key: 'scale', val: 0.95, prog: phase1Duration / duration },
        { key: 'scale', val: params.contentScale.end, prog: 1 },
        // Opacity animation
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.5, prog: phase1Duration / duration },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
  };

  // Helper: Create scanline animation effect
  const createScanlineEffect = (targetId: string): GenericEffectData => {
    return {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: 4, prog: 1 },
      ],
    };
  };

  // Build RGB layer effects
  const rgbRedEffect = createRGBGlitchEffect('rgb-red-layer', -4, 0.8);
  const rgbGreenEffect = createRGBGlitchEffect('rgb-green-layer', 0, 0.8);
  const rgbBlueEffect = createRGBGlitchEffect('rgb-blue-layer', 4, 0.8);

  // Build flicker effects (distributed during phase 1)
  const flickerEffects: GenericEffectData[] = [];
  for (let i = 0; i < params.flickerFrequency; i++) {
    const flickerTime = (phase1Duration / (params.flickerFrequency + 1)) * (i + 1);
    const targetLayer = i % 2 === 0 ? 'rgb-red-layer' : 'rgb-blue-layer';
    flickerEffects.push(createFlickerEffect(targetLayer, flickerTime, 0.6));
  }

  // Build data mosh effects
  const dataMoshEffects: GenericEffectData[] = [];
  for (let i = 0; i < params.dataMoshCount; i++) {
    const moshTime = (phase1Duration + phase2Duration) * (i + 1) / (params.dataMoshCount + 1);
    const axis = i % 2 === 0 ? 'y' : 'x';
    const distance = axis === 'y' ? -20 : 15;
    dataMoshEffects.push(
      createDataMoshEffect('content-container', moshTime, axis, distance)
    );
  }

  // Content expansion effect
  const contentExpansionEffect = createContentExpansionEffect('content-container');

  // Scanline animation effect
  const scanlineEffect = createScanlineEffect('scanline-overlay');

  // RGB layer components
  const rgbRedLayer: RenderableComponentData = {
    id: 'rgb-red-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 mix-blend-screen',
        style: {
          backgroundColor: 'rgba(255, 0, 0, 0.6)',
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
      { id: 'rgb-red-glitch', componentId: 'generic', data: rgbRedEffect },
      ...flickerEffects
        .filter((_, i) => i % 2 === 0)
        .map((effect, i) => ({
          id: `rgb-red-flicker-${i}`,
          componentId: 'generic',
          data: effect,
        })),
    ],
    childrenData: [],
  };

  const rgbGreenLayer: RenderableComponentData = {
    id: 'rgb-green-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 mix-blend-screen',
        style: {
          backgroundColor: 'rgba(0, 255, 0, 0.6)',
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
      { id: 'rgb-green-glitch', componentId: 'generic', data: rgbGreenEffect },
    ],
    childrenData: [],
  };

  const rgbBlueLayer: RenderableComponentData = {
    id: 'rgb-blue-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 mix-blend-screen',
        style: {
          backgroundColor: 'rgba(0, 0, 255, 0.6)',
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
      { id: 'rgb-blue-glitch', componentId: 'generic', data: rgbBlueEffect },
      ...flickerEffects
        .filter((_, i) => i % 2 === 1)
        .map((effect, i) => ({
          id: `rgb-blue-flicker-${i}`,
          componentId: 'generic',
          data: effect,
        })),
    ],
    childrenData: [],
  };

  // Scanline overlay
  const scanlineOverlay: RenderableComponentData = {
    id: 'scanline-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundImage: `repeating-linear-gradient(0deg, rgba(0, 0, 0, ${params.scanlineOpacity}) 0px, rgba(0, 0, 0, ${params.scanlineOpacity}) 1px, transparent 1px, transparent 2px)`,
          backgroundSize: '100% 4px',
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
      { id: 'scanline-anim', componentId: 'generic', data: scanlineEffect },
    ],
    childrenData: [],
  };

  // Noise layer using HTMLBlockAtom
  const noiseLayer: RenderableComponentData = {
    id: 'noise-layer',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg=='); opacity: ${params.noiseOpacity}; mix-blend-mode: overlay;"></div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Content container
  const contentContainer: RenderableComponentData = {
    id: 'content-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      { id: 'content-expansion', componentId: 'generic', data: contentExpansionEffect },
      ...dataMoshEffects.map((effect, i) => ({
        id: `data-mosh-${i}`,
        componentId: 'generic',
        data: effect,
      })),
    ],
    childrenData: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-expansion-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      contentContainer,
      rgbRedLayer,
      rgbGreenLayer,
      rgbBlueLayer,
      scanlineOverlay,
      noiseLayer,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'glitch-expansion-preset',
  title: 'Glitch Expansion Preset',
  description:
    'A digital corruption effect preset featuring RGB channel splits, chromatic aberration, scan lines, and data moshing. HTML divs appear to malfunction and glitch from the center before stabilizing to reveal content. Multiple overlapping layers create intense digital distortion that gradually stabilizes over 2.5 seconds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'glitch',
    'expansion',
    'rgb-split',
    'chromatic-aberration',
    'scanline',
    'noise',
    'data-mosh',
    'digital-corruption',
    'distortion',
    'tech',
    'cyberpunk',
  ],
  dependencies: {},
  defaultInputParams: {
    duration: 2.5,
    rgbSplitIntensity: 1,
    flickerFrequency: 2,
    glitchIntensityPhase1: 0.4,
    stabilizationPhase: 0.4,
    dataMoshCount: 2,
    scanlineOpacity: 0.15,
    noiseOpacity: 0.2,
    contentScale: {
      start: 0.5,
      end: 1,
    },
  },
};

// Export preset
export const glitchExpansionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
