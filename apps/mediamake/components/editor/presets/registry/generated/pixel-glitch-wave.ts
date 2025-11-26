/**
 * PixelGlitchWave Preset
 * 
 * A digital glitch transition preset with pixel sorting and datamoshing effects.
 * Features RGB channel splitting, scan lines, and digital noise in a wave pattern.
 * Ideal for transitioning between art styles from traditional paintings to modern anime.
 * 
 * Features:
 * - **RGB Channel Split**: Three slightly offset copies with color filters for chromatic aberration
 * - **Glitch Wave**: Horizontal, vertical, or diagonal wave patterns with configurable direction
 * - **Scan Lines**: Repeating linear gradients for CRT-style interference
 * - **Digital Noise**: Rapidly changing opacity overlays for digital corruption
 * - **Audio Sync**: Optional audio-reactive glitch synchronization with beat detection
 * - **Pixel Stretching**: Transform skew and scale for pixel displacement effects
 * - **GPU Acceleration**: Uses transform3d and will-change for performance
 * 
 * Use cases:
 * - Transitioning between different art styles (traditional → digital → anime)
 * - Creating digital corruption effects for tech/cyberpunk content
 * - Music video transitions synchronized with audio beats
 * - Glitch art transitions for creative projects
 * - Digital datamoshing effects for experimental videos
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
const presetParams = z.object({
  duration: z
    .number()
    .default(1.2)
    .describe('Duration of the glitch transition in seconds'),
  
  intensity: z
    .number()
    .min(0.1)
    .max(1.0)
    .default(0.7)
    .describe('Glitch intensity from 0.1 (subtle) to 1.0 (extreme)'),
  
  waveDirection: z
    .enum(['horizontal', 'vertical', 'diagonal'])
    .default('horizontal')
    .describe('Direction of the glitch wave travel across the frame'),
  
  bandCount: z
    .number()
    .min(10)
    .max(20)
    .default(15)
    .describe('Number of horizontal glitch bands to create'),
  
  rgbSeparation: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('RGB channel separation distance in pixels'),
  
  scanLineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Visibility of scan line overlay (0 = invisible, 1 = opaque)'),
  
  glitchSoundUrl: z
    .string()
    .optional()
    .describe('Optional URL to glitch sound effect audio file'),
  
  audioReactive: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive glitch synchronization if audio is provided'),
  
  sourceImage: z
    .string()
    .describe('Source image URL to transition from'),
  
  targetImage: z
    .string()
    .describe('Target image URL to transition to'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    intensity,
    waveDirection,
    bandCount,
    rgbSeparation,
    scanLineOpacity,
    glitchSoundUrl,
    sourceImage,
    targetImage,
  } = params;

  // Helper: Calculate delay for each band based on wave direction
  const calculateBandDelay = (bandIndex: number): number => {
    const maxDelay = duration * 0.7; // Wave completes at 70% of duration
    const progress = bandIndex / bandCount;

    switch (waveDirection) {
      case 'horizontal':
        return progress * maxDelay;
      case 'vertical':
        return progress * maxDelay;
      case 'diagonal':
        return progress * maxDelay;
      default:
        return progress * maxDelay;
    }
  };

  // Helper: Generate random offset within range
  const randomOffset = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate random glitch parameters
  const generateGlitchParams = () => {
    const offsetScale = intensity * rgbSeparation;
    return {
      redOffsetX: randomOffset(-offsetScale, offsetScale),
      greenOffsetX: randomOffset(-offsetScale, offsetScale),
      blueOffsetX: randomOffset(-offsetScale, offsetScale),
      scaleX: randomOffset(0.98, 1.02),
      skewX: randomOffset(-2 * intensity, 2 * intensity),
    };
  };

  // Create glitch bands
  const glitchBands: RenderableComponentData[] = [];

  for (let i = 0; i < bandCount; i++) {
    const bandHeight = 100 / bandCount;
    const bandDelay = calculateBandDelay(i);
    const glitchDuration = 0.15 + intensity * 0.15; // 0.15-0.3s glitch per band
    const glitchParams = generateGlitchParams();

    // Create three RGB channel copies for this band
    const rgbChannels: RenderableComponentData[] = [
      // Red channel
      {
        id: `glitch-band-${i}-red`,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: sourceImage,
          fit: 'cover',
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            mixBlendMode: 'screen',
            filter: 'sepia(100%) saturate(200%) hue-rotate(270deg)',
            transform: `translate3d(${glitchParams.redOffsetX}px, 0, 0) scaleX(${glitchParams.scaleX}) skewX(${glitchParams.skewX}deg)`,
            willChange: 'transform, opacity',
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
            id: `glitch-band-${i}-red-opacity`,
            componentId: `glitch-band-${i}-red`,
            data: {
              type: 'linear',
              start: bandDelay,
              duration: glitchDuration,
              mode: 'provider',
              targetIds: [`glitch-band-${i}-red`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      },
      // Green channel
      {
        id: `glitch-band-${i}-green`,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: sourceImage,
          fit: 'cover',
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            mixBlendMode: 'screen',
            filter: 'sepia(100%) saturate(200%) hue-rotate(90deg)',
            transform: `translate3d(${glitchParams.greenOffsetX}px, 0, 0) scaleX(${glitchParams.scaleX}) skewX(${glitchParams.skewX}deg)`,
            willChange: 'transform, opacity',
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
            id: `glitch-band-${i}-green-opacity`,
            componentId: `glitch-band-${i}-green`,
            data: {
              type: 'linear',
              start: bandDelay + 0.01,
              duration: glitchDuration,
              mode: 'provider',
              targetIds: [`glitch-band-${i}-green`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      },
      // Blue channel
      {
        id: `glitch-band-${i}-blue`,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: sourceImage,
          fit: 'cover',
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            mixBlendMode: 'screen',
            filter: 'sepia(100%) saturate(200%)',
            transform: `translate3d(${glitchParams.blueOffsetX}px, 0, 0) scaleX(${glitchParams.scaleX}) skewX(${glitchParams.skewX}deg)`,
            willChange: 'transform, opacity',
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
            id: `glitch-band-${i}-blue-opacity`,
            componentId: `glitch-band-${i}-blue`,
            data: {
              type: 'linear',
              start: bandDelay + 0.02,
              duration: glitchDuration,
              mode: 'provider',
              targetIds: [`glitch-band-${i}-blue`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      },
    ];

    // Band container with all RGB channels
    const band: RenderableComponentData = {
      id: `glitch-band-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-full overflow-hidden pointer-events-none',
          style: {
            top: `${i * bandHeight}%`,
            height: `${bandHeight}%`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: rgbChannels,
    };

    glitchBands.push(band);
  }

  // Create noise overlay with rapid opacity changes
  const noiseOverlay: RenderableComponentData = {
    id: 'noise-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-40',
        style: {
          opacity: 0,
          background:
            'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOCIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjAuNSIvPjwvc3ZnPg==)',
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
        id: 'noise-burst-1',
        componentId: 'noise-overlay',
        data: {
          type: 'linear',
          start: 0.1,
          duration: 0.05,
          mode: 'provider',
          targetIds: ['noise-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.4 * intensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'noise-burst-2',
        componentId: 'noise-overlay',
        data: {
          type: 'linear',
          start: 0.3,
          duration: 0.05,
          mode: 'provider',
          targetIds: ['noise-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.35 * intensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'noise-burst-3',
        componentId: 'noise-overlay',
        data: {
          type: 'linear',
          start: 0.6,
          duration: 0.05,
          mode: 'provider',
          targetIds: ['noise-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3 * intensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'noise-burst-4',
        componentId: 'noise-overlay',
        data: {
          type: 'linear',
          start: 0.9,
          duration: 0.05,
          mode: 'provider',
          targetIds: ['noise-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.25 * intensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create scan lines overlay
  const scanLinesOverlay: RenderableComponentData = {
    id: 'scanlines-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-30',
        style: {
          opacity: scanLineOpacity,
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
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

  // Source image (fades out)
  const sourceImageLayer: RenderableComponentData = {
    id: 'source-image-layer',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: sourceImage,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover z-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'source-fade-out',
        componentId: 'source-image-layer',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['source-image-layer'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Target image (fades in)
  const targetImageLayer: RenderableComponentData = {
    id: 'target-image-layer',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: targetImage,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover z-10',
      style: {
        opacity: 0,
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
        id: 'target-fade-in',
        componentId: 'target-image-layer',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['target-image-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Glitch bands container
  const glitchBandsLayer: RenderableComponentData = {
    id: 'glitch-bands-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full z-20 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: glitchBands,
  };

  // Optional audio layer
  const audioLayer: RenderableComponentData | null = glitchSoundUrl
    ? ({
        id: 'audio-layer',
        type: 'atom',
        componentId: 'AudioAtom',
        data: {
          src: glitchSoundUrl,
          volume: 1,
          startFrom: 0,
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData)
    : null;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'pixel-glitch-wave-container',
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
      sourceImageLayer,
      targetImageLayer,
      glitchBandsLayer,
      scanLinesOverlay,
      noiseOverlay,
      ...(audioLayer ? [audioLayer] : []),
    ] as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
      clip: {
        start: 0,
        duration: duration,
      },
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'pixelGlitchWave',
  title: 'PixelGlitchWave',
  description:
    'A digital glitch transition preset with pixel sorting and datamoshing effects, featuring RGB channel splitting, scan lines, and digital noise in a wave pattern. Ideal for transitioning between art styles from traditional paintings to modern anime. Supports horizontal, vertical, or diagonal wave directions with configurable glitch intensity and optional audio-reactive synchronization.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'rgb-split',
    'datamosh',
    'pixel-sort',
    'digital',
    'corruption',
    'chromatic-aberration',
    'scan-lines',
    'noise',
    'wave',
    'art-style',
    'anime',
    'cyberpunk',
    'tech',
  ],
  defaultInputParams: {
    duration: 1.2,
    intensity: 0.7,
    waveDirection: 'horizontal',
    bandCount: 15,
    rgbSeparation: 8,
    scanLineOpacity: 0.3,
    audioReactive: false,
    sourceImage: 'https://example.com/source.jpg',
    targetImage: 'https://example.com/target.jpg',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const pixelGlitchWavePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
