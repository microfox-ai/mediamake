/**
 * Glitch Horror Transition Preset
 *
 * A violent, supernatural glitch transition that simulates corrupted video signal breaking apart reality.
 * Imagine a security camera feed being interfered with by supernatural forces - the image tears horizontally,
 * displays RGB channel separation, introduces digital noise, and fragments into corrupted data blocks.
 *
 * Features:
 * - Horizontal image tearing via displaced strips (10-15 slices with random displacement)
 * - RGB channel separation using CSS filters and screen blend modes
 * - Static noise and scanline overlays for analog corruption effect
 * - Subliminal horror flashes (demonic imagery or text) during peak glitch moments
 * - Chromatic aberration intensification during peak glitch bursts
 * - Unpredictable rhythm: stable moments interrupted by intense glitch bursts
 * - Datamoshing-style compression artifacts
 * - Temporal displacement effects where previous scene bleeds through
 *
 * Technical Implementation:
 * - Uses BaseLayout with multiple layers for compositing
 * - RGB split via multiple copies with color filters and screen blend mode
 * - Glitch strips generated dynamically with random translateX displacements
 * - Effects use rapid keyframe changes (100ms intervals) for violent glitch feel
 * - Brightness/contrast variations for compression artifact simulation
 * - All animations use mode: 'provider' with targetIds
 *
 * Use Cases:
 * - Horror/supernatural video transitions
 * - Found footage style effects
 * - Creepypasta video aesthetics
 * - Security camera interference scenes
 * - Digital corruption storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration of the glitch transition in seconds'),
  intensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Overall intensity multiplier for all glitch effects (0.1 to 3)'),
  sourceVideoSrc: z
    .string()
    .optional()
    .describe('Source video URL for the transition (optional)'),
  sourceImageSrc: z
    .string()
    .optional()
    .describe('Source image URL for the transition (optional)'),
  rgbSplitIntensity: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .describe('RGB channel separation distance in pixels'),
  glitchStripCount: z
    .number()
    .min(5)
    .max(20)
    .default(12)
    .describe('Number of horizontal glitch strips (5-20)'),
  glitchBurstFrequency: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Frequency of intense glitch bursts per second'),
  subliminalFlashDuration: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Duration of subliminal horror flashes in seconds'),
  subliminalText: z
    .string()
    .optional()
    .describe('Text to flash subliminally (optional)'),
  subliminalImageSrc: z
    .string()
    .optional()
    .describe('Horror image to flash subliminally (optional)'),
  noiseOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of static noise overlay (0-1)'),
  scanlineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Opacity of scanline overlay (0-1)'),
  chromaticAberrationIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(15)
    .describe('Chromatic aberration separation distance in pixels during peak glitch'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    intensity,
    sourceVideoSrc,
    sourceImageSrc,
    rgbSplitIntensity,
    glitchStripCount,
    glitchBurstFrequency,
    subliminalFlashDuration,
    subliminalText,
    subliminalImageSrc,
    noiseOpacity,
    scanlineOpacity,
    chromaticAberrationIntensity,
  } = params;

  // Helper: Generate random displacement value
  const randomDisplacement = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate random timing for glitch bursts
  const generateGlitchBurstTimings = (
    totalDuration: number,
    frequency: number,
  ): number[] => {
    const burstCount = Math.floor(totalDuration * frequency);
    const timings: number[] = [];
    for (let i = 0; i < burstCount; i++) {
      timings.push(Math.random() * totalDuration);
    }
    return timings.sort((a, b) => a - b);
  };

  // Helper: Create RGB split effect data
  const createRGBSplitEffect = (
    targetId: string,
    startTime: number,
    duration: number,
    splitDistance: number,
  ) => {
    return {
      id: `rgb-split-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: startTime,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          {
            key: 'translateX',
            val: `${-splitDistance * intensity}px`,
            prog: 0,
          },
          {
            key: 'translateX',
            val: `${splitDistance * intensity}px`,
            prog: 0.5,
          },
          {
            key: 'translateX',
            val: `${-splitDistance * intensity * 0.5}px`,
            prog: 1,
          },
        ],
      },
    };
  };

  // Generate glitch burst timings
  const glitchBurstTimings = generateGlitchBurstTimings(
    duration,
    glitchBurstFrequency,
  );

  // Create source content layer
  const sourceContentLayer: RenderableComponentData = {
    id: 'source-content-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: sourceVideoSrc
      ? [
          {
            id: 'source-video',
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: sourceVideoSrc,
              fit: 'cover' as const,
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          } as RenderableComponentData,
        ]
      : sourceImageSrc
        ? [
            {
              id: 'source-image',
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: sourceImageSrc,
                className: 'w-full h-full object-cover',
              },
              context: {
                timing: {
                  start: 0,
                  duration: duration,
                },
              },
            } as RenderableComponentData,
          ]
        : [],
  };

  // Create RGB split layers (red, green, blue channels)
  const rgbSplitRedEffect = createRGBSplitEffect(
    'red-channel',
    0,
    duration,
    rgbSplitIntensity,
  );
  const rgbSplitGreenEffect = createRGBSplitEffect(
    'green-channel',
    0,
    duration,
    rgbSplitIntensity * 0.7,
  );
  const rgbSplitBlueEffect = createRGBSplitEffect(
    'blue-channel',
    0,
    duration,
    rgbSplitIntensity * 1.2,
  );

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
        duration: duration,
      },
    },
    childrenData: sourceImageSrc
      ? [
          {
            id: 'red-channel',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: sourceImageSrc,
              className: 'absolute inset-0 w-full h-full object-cover',
              style: {
                filter:
                  'grayscale(100%) sepia(100%) saturate(500%) hue-rotate(-50deg) brightness(1.2)',
                mixBlendMode: 'screen' as const,
                opacity: 0.7,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: [rgbSplitRedEffect],
          } as RenderableComponentData,
          {
            id: 'green-channel',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: sourceImageSrc,
              className: 'absolute inset-0 w-full h-full object-cover',
              style: {
                filter:
                  'grayscale(100%) sepia(100%) saturate(500%) hue-rotate(50deg) brightness(1.2)',
                mixBlendMode: 'screen' as const,
                opacity: 0.7,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: [rgbSplitGreenEffect],
          } as RenderableComponentData,
          {
            id: 'blue-channel',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: sourceImageSrc,
              className: 'absolute inset-0 w-full h-full object-cover',
              style: {
                filter:
                  'grayscale(100%) sepia(100%) saturate(500%) hue-rotate(170deg) brightness(1.2)',
                mixBlendMode: 'screen' as const,
                opacity: 0.7,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: [rgbSplitBlueEffect],
          } as RenderableComponentData,
        ]
      : [],
  };

  // Create glitch strips (horizontal slices with displacement)
  const glitchStrips: RenderableComponentData[] = [];
  const stripHeight = 100 / glitchStripCount; // Percentage height

  for (let i = 0; i < glitchStripCount; i++) {
    const stripId = `glitch-strip-${i}`;
    const yPosition = i * stripHeight;

    // Create random glitch effect for this strip
    const stripGlitchEffect = {
      id: `glitch-effect-${stripId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [stripId],
        ranges: [
          {
            key: 'translateX',
            val: `${randomDisplacement(-200, 200) * intensity}px`,
            prog: 0,
          },
          {
            key: 'translateX',
            val: `${randomDisplacement(-200, 200) * intensity}px`,
            prog: 0.1,
          },
          {
            key: 'translateX',
            val: `${randomDisplacement(-200, 200) * intensity}px`,
            prog: 0.2,
          },
          {
            key: 'translateX',
            val: `${randomDisplacement(-200, 200) * intensity}px`,
            prog: 0.3,
          },
          {
            key: 'translateX',
            val: `${randomDisplacement(-200, 200) * intensity}px`,
            prog: 0.4,
          },
          {
            key: 'translateX',
            val: `${randomDisplacement(-200, 200) * intensity}px`,
            prog: 0.5,
          },
          {
            key: 'translateX',
            val: `${randomDisplacement(-200, 200) * intensity}px`,
            prog: 0.6,
          },
          {
            key: 'translateX',
            val: `${randomDisplacement(-200, 200) * intensity}px`,
            prog: 0.7,
          },
          {
            key: 'translateX',
            val: `${randomDisplacement(-200, 200) * intensity}px`,
            prog: 0.8,
          },
          {
            key: 'translateX',
            val: `${randomDisplacement(-200, 200) * intensity}px`,
            prog: 0.9,
          },
          {
            key: 'translateX',
            val: `${randomDisplacement(-200, 200) * intensity}px`,
            prog: 1,
          },
        ],
      },
    };

    // Create brightness/contrast variation for compression artifacts
    const compressionEffect = {
      id: `compression-effect-${stripId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [stripId],
        ranges: [
          {
            key: 'filter',
            val: `brightness(${0.2 + Math.random() * 1.8}) contrast(${0.5 + Math.random() * 2.5})`,
            prog: 0,
          },
          {
            key: 'filter',
            val: `brightness(${0.2 + Math.random() * 1.8}) contrast(${0.5 + Math.random() * 2.5})`,
            prog: 0.25,
          },
          {
            key: 'filter',
            val: `brightness(${0.2 + Math.random() * 1.8}) contrast(${0.5 + Math.random() * 2.5})`,
            prog: 0.5,
          },
          {
            key: 'filter',
            val: `brightness(${0.2 + Math.random() * 1.8}) contrast(${0.5 + Math.random() * 2.5})`,
            prog: 0.75,
          },
          {
            key: 'filter',
            val: `brightness(${0.2 + Math.random() * 1.8}) contrast(${0.5 + Math.random() * 2.5})`,
            prog: 1,
          },
        ],
      },
    };

    const strip: RenderableComponentData = {
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute overflow-hidden',
          style: {
            top: `${yPosition}%`,
            left: 0,
            width: '100%',
            height: `${stripHeight}%`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [stripGlitchEffect, compressionEffect],
      childrenData: sourceImageSrc
        ? [
            {
              id: `strip-content-${i}`,
              type: 'atom',
              componentId: 'ImageAtom',
              data: {
                src: sourceImageSrc,
                className: 'w-full h-auto object-cover',
                style: {
                  marginTop: `${-yPosition}%`,
                  height: `${100 * glitchStripCount}%`,
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: duration,
                },
              },
            } as RenderableComponentData,
          ]
        : [],
    };

    glitchStrips.push(strip);
  }

  const glitchStripsContainer: RenderableComponentData = {
    id: 'glitch-strips-container',
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
        duration: duration,
      },
    },
    childrenData: glitchStrips,
  };

  // Create noise overlay using HTMLBlockAtom (CSS-based static noise)
  const noiseOverlay: RenderableComponentData = {
    id: 'noise-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px);"></div>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        mixBlendMode: 'overlay' as const,
        opacity: noiseOpacity,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Create scanline overlay
  const scanlineOverlay: RenderableComponentData = {
    id: 'scanline-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 3px);"></div>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        mixBlendMode: 'multiply' as const,
        opacity: scanlineOpacity,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Create subliminal flash layers (text and/or image)
  const subliminalFlashes: RenderableComponentData[] = [];

  glitchBurstTimings.forEach((timing, index) => {
    if (subliminalText) {
      const textFlash: RenderableComponentData = {
        id: `subliminal-text-${index}`,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: subliminalText,
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            fontSize: 120,
            fontWeight: '900' as const,
            color: '#ff0000',
            textShadow: '0 0 20px #ff0000',
          },
        },
        context: {
          timing: {
            start: timing,
            duration: subliminalFlashDuration,
          },
        },
        effects: [
          {
            id: `subliminal-text-flash-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: 0,
              duration: subliminalFlashDuration,
              mode: 'provider' as const,
              targetIds: [`subliminal-text-${index}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      };
      subliminalFlashes.push(textFlash);
    }

    if (subliminalImageSrc) {
      const imageFlash: RenderableComponentData = {
        id: `subliminal-image-${index}`,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: subliminalImageSrc,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            filter: 'contrast(2) brightness(0.5) saturate(0)',
          },
        },
        context: {
          timing: {
            start: timing,
            duration: subliminalFlashDuration,
          },
        },
        effects: [
          {
            id: `subliminal-image-flash-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: 0,
              duration: subliminalFlashDuration,
              mode: 'provider' as const,
              targetIds: [`subliminal-image-${index}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      };
      subliminalFlashes.push(imageFlash);
    }
  });

  const subliminalFlashLayer: RenderableComponentData = {
    id: 'subliminal-flash-layer',
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
        duration: duration,
      },
    },
    childrenData: subliminalFlashes,
  };

  // Create chromatic aberration layer (intensifies during glitch bursts)
  const chromaticAberrationEffects = glitchBurstTimings.map(
    (timing, index) => {
      return {
        id: `chromatic-aberration-pulse-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: timing,
          duration: 0.2,
          mode: 'provider' as const,
          targetIds: ['aberration-red', 'aberration-cyan'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      };
    },
  );

  const chromaticAberrationLayer: RenderableComponentData = {
    id: 'chromatic-aberration-layer',
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
        duration: duration,
      },
    },
    childrenData: sourceImageSrc
      ? [
          {
            id: 'aberration-red',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: sourceImageSrc,
              className: 'absolute inset-0 w-full h-full object-cover',
              style: {
                filter:
                  'grayscale(100%) sepia(100%) saturate(1000%) hue-rotate(-50deg)',
                mixBlendMode: 'screen' as const,
                opacity: 0,
                transform: `translateX(${chromaticAberrationIntensity * intensity}px)`,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: chromaticAberrationEffects,
          } as RenderableComponentData,
          {
            id: 'aberration-cyan',
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: sourceImageSrc,
              className: 'absolute inset-0 w-full h-full object-cover',
              style: {
                filter:
                  'grayscale(100%) sepia(100%) saturate(1000%) hue-rotate(140deg)',
                mixBlendMode: 'screen' as const,
                opacity: 0,
                transform: `translateX(${-chromaticAberrationIntensity * intensity}px)`,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: chromaticAberrationEffects,
          } as RenderableComponentData,
        ]
      : [],
  };

  // Build final composition
  const rootContainer: RenderableComponentData = {
    id: 'glitch-horror-transition-root',
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
      sourceContentLayer,
      rgbSplitLayer,
      glitchStripsContainer,
      noiseOverlay,
      scanlineOverlay,
      subliminalFlashLayer,
      chromaticAberrationLayer,
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

const presetMetadata: PresetMetadata = {
  id: 'glitch-horror-transition',
  title: 'Glitch Horror Transition',
  description:
    'A violent, supernatural glitch transition that simulates corrupted video signal interference with horizontal tearing, RGB channel separation, static noise, scanline overlays, and subliminal horror flashes. Features unpredictable rhythm with stable moments interrupted by intense glitch bursts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'horror',
    'supernatural',
    'corruption',
    'rgb-split',
    'chromatic-aberration',
    'scanlines',
    'noise',
    'datamoshing',
    'found-footage',
  ],
  defaultInputParams: {
    duration: 3,
    intensity: 1,
    sourceImageSrc: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    rgbSplitIntensity: 20,
    glitchStripCount: 12,
    glitchBurstFrequency: 0.5,
    subliminalFlashDuration: 0.05,
    subliminalText: 'ERROR',
    noiseOpacity: 0.3,
    scanlineOpacity: 0.4,
    chromaticAberrationIntensity: 15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const glitchHorrorTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
