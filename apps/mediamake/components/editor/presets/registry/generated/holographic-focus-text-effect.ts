/**
 * Holographic Focus Text Effect Preset
 * 
 * A futuristic holographic text effect that materializes from scattered light particles into solid form.
 * Features Star Wars-style hologram stabilization with:
 * - Flickering opacity transitions (transparent blur → opaque sharpness)
 * - Progressive blur reduction (30px → 0px)
 * - RGB chromatic aberration splitting at edges that tightens as focus improves
 * - Vertical scan line interference patterns
 * - Pulsating glow effects during focusing process
 * - Digital noise and compression artifacts in blur phase that clean up as signal strengthens
 * - Glitch moments at precise intervals (0.3s, 0.8s, 1.2s)
 * 
 * The overall effect feels futuristic and technical, as if the text is being transmitted
 * and reconstructed in real-time from a distant holographic projection.
 * 
 * Use cases:
 * - Sci-fi video intros and titles
 * - Tech product launches
 * - Futuristic UI mockups
 * - Cyberpunk aesthetics
 * - Transmission/signal effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text content to display with holographic effect'),
  fontSize: z.number().default(64).describe('Font size in pixels'),
  duration: z.number().default(2.5).describe('Duration of the holographic materialization effect in seconds'),
  textColor: z.string().default('#00ffff').describe('Primary hologram color (cyan default for sci-fi aesthetic)'),
  glowIntensity: z.number().min(0).max(2).default(1).describe('Glow intensity multiplier (0 = no glow, 2 = very intense)'),
  flickerSpeed: z.number().min(0.5).max(2).default(1).describe('Speed multiplier for opacity flicker (1 = default)'),
  chromaticIntensity: z.number().min(0).max(1).default(1).describe('Chromatic aberration intensity (0 = no split, 1 = full split)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    duration,
    textColor,
    glowIntensity,
    flickerSpeed,
    chromaticIntensity,
  } = params;

  // Calculate timing offsets based on flicker speed
  const flickerDuration = duration / flickerSpeed;

  // Helper function to create noise texture SVG
  const createNoiseTexture = (): string => {
    // Base64 encoded SVG for noise texture
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=';
  };

  // IDs for targeting
  const baseTextId = 'hologram-base-text';
  const glowTextId = 'hologram-glow-text';
  const rgbRedId = 'hologram-rgb-red';
  const rgbGreenId = 'hologram-rgb-green';
  const rgbBlueId = 'hologram-rgb-blue';
  const scanlineId = 'hologram-scanline';
  const noiseId = 'hologram-noise';

  // Create child components
  const childrenData: RenderableComponentData[] = [
    // Noise overlay (background layer)
    {
      id: noiseId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background-image: url('${createNoiseTexture()}'); background-repeat: repeat; pointer-events: none;"></div>`,
        className: 'absolute inset-0 pointer-events-none mix-blend-overlay',
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'noise-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [noiseId],
            ranges: [
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 0.4, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Base text layer
    {
      id: baseTextId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text,
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 'bold',
          color: textColor,
          textAlign: 'center',
          textShadow: `0 0 ${20 * glowIntensity}px ${textColor}80`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        // Opacity flicker
        {
          id: 'base-opacity-flicker',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: flickerDuration,
            mode: 'provider',
            targetIds: [baseTextId],
            ranges: [
              { key: 'opacity', val: 0.3, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.12 },
              { key: 'opacity', val: 0.4, prog: 0.32 },
              { key: 'opacity', val: 0.9, prog: 0.48 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Blur reduction
        {
          id: 'base-blur-reduction',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [baseTextId],
            ranges: [
              { key: 'filter', val: 'blur(30px)', prog: 0 },
              { key: 'filter', val: 'blur(10px)', prog: 0.4 },
              { key: 'filter', val: 'blur(5px)', prog: 0.7 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
        // Glitch moment 1
        {
          id: 'base-glitch-1',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0.3,
            duration: 0.1,
            mode: 'provider',
            targetIds: [baseTextId],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: '-5px', prog: 0.5 },
              { key: 'translateX', val: '0px', prog: 1 },
            ],
          },
        },
        // Glitch moment 2
        {
          id: 'base-glitch-2',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0.8,
            duration: 0.1,
            mode: 'provider',
            targetIds: [baseTextId],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: '8px', prog: 0.5 },
              { key: 'translateX', val: '0px', prog: 1 },
            ],
          },
        },
        // Glitch moment 3
        {
          id: 'base-glitch-3',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 1.2,
            duration: 0.1,
            mode: 'provider',
            targetIds: [baseTextId],
            ranges: [
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: '-6px', prog: 0.5 },
              { key: 'translateY', val: '0px', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Glow text layer
    {
      id: glowTextId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text,
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 'bold',
          color: textColor,
          textAlign: 'center',
          mixBlendMode: 'add',
          filter: `blur(${4 * glowIntensity}px)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        // Opacity flicker
        {
          id: 'glow-opacity-flicker',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: flickerDuration,
            mode: 'provider',
            targetIds: [glowTextId],
            ranges: [
              { key: 'opacity', val: 0.3, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.12 },
              { key: 'opacity', val: 0.4, prog: 0.32 },
              { key: 'opacity', val: 0.9, prog: 0.48 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Glow blur pulsate
        {
          id: 'glow-blur-pulsate',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [glowTextId],
            ranges: [
              { key: 'filter', val: `blur(${8 * glowIntensity}px)`, prog: 0 },
              { key: 'filter', val: `blur(${12 * glowIntensity}px)`, prog: 0.3 },
              { key: 'filter', val: `blur(${6 * glowIntensity}px)`, prog: 0.6 },
              { key: 'filter', val: `blur(${10 * glowIntensity}px)`, prog: 0.8 },
              { key: 'filter', val: `blur(${4 * glowIntensity}px)`, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // RGB chromatic aberration - Red layer
    {
      id: rgbRedId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text,
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 'bold',
          color: '#ff0000',
          textAlign: 'center',
          mixBlendMode: 'screen',
          opacity: 0.6 * chromaticIntensity,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'rgb-red-chromatic',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [rgbRedId],
            ranges: [
              { key: 'translateX', val: `${-8 * chromaticIntensity}px`, prog: 0 },
              { key: 'translateX', val: `${-4 * chromaticIntensity}px`, prog: 0.5 },
              { key: 'translateX', val: '0px', prog: 1 },
              { key: 'opacity', val: 0.6 * chromaticIntensity, prog: 0 },
              { key: 'opacity', val: 0.3 * chromaticIntensity, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // RGB chromatic aberration - Green layer
    {
      id: rgbGreenId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text,
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 'bold',
          color: '#00ff00',
          textAlign: 'center',
          mixBlendMode: 'screen',
          opacity: 0.6 * chromaticIntensity,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'rgb-green-chromatic',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [rgbGreenId],
            ranges: [
              { key: 'translateY', val: `${-6 * chromaticIntensity}px`, prog: 0 },
              { key: 'translateY', val: `${-3 * chromaticIntensity}px`, prog: 0.5 },
              { key: 'translateY', val: '0px', prog: 1 },
              { key: 'opacity', val: 0.6 * chromaticIntensity, prog: 0 },
              { key: 'opacity', val: 0.3 * chromaticIntensity, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // RGB chromatic aberration - Blue layer
    {
      id: rgbBlueId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text,
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 'bold',
          color: '#0000ff',
          textAlign: 'center',
          mixBlendMode: 'screen',
          opacity: 0.6 * chromaticIntensity,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'rgb-blue-chromatic',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [rgbBlueId],
            ranges: [
              { key: 'translateX', val: `${8 * chromaticIntensity}px`, prog: 0 },
              { key: 'translateX', val: `${4 * chromaticIntensity}px`, prog: 0.5 },
              { key: 'translateX', val: '0px', prog: 1 },
              { key: 'opacity', val: 0.6 * chromaticIntensity, prog: 0 },
              { key: 'opacity', val: 0.3 * chromaticIntensity, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Scan line overlay
    {
      id: scanlineId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, transparent 0px, transparent 2px, ${textColor}08 2px, ${textColor}08 4px); pointer-events: none;"></div>`,
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
          id: 'scanline-movement',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: [scanlineId],
            ranges: [
              { key: 'translateY', val: '-100%', prog: 0 },
              { key: 'translateY', val: '0%', prog: 0.5 },
              { key: 'translateY', val: '100%', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'holographic-focus-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
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
  id: 'holographic-focus-text-effect',
  title: 'Holographic Focus Text Effect',
  description: 'A futuristic holographic text effect that materializes from scattered light particles into solid form. Features Star Wars-style hologram stabilization with flickering opacity, progressive blur reduction, RGB chromatic splitting, vertical scan lines, pulsating glow, and digital noise artifacts that clean up as the signal strengthens.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'hologram', 'sci-fi', 'futuristic', 'glitch', 'chromatic', 'glow', 'technical', 'transmission', 'materialization'],
  defaultInputParams: {
    text: 'HOLOGRAM',
    fontSize: 64,
    duration: 2.5,
    textColor: '#00ffff',
    glowIntensity: 1,
    flickerSpeed: 1,
    chromaticIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const holographicFocusTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
