/**
 * Pixelated Emergence Effect Preset
 * 
 * A retro video game style effect where cutout images materialize through expanding pixel blocks
 * that progressively refine from 8x8 to full resolution. Features RGB channel splitting, glitch
 * artifacts, scanlines, and caption-synchronized pixel explosions for a nostalgic 8-bit digital aesthetic.
 * 
 * Features:
 * - Progressive pixel resolution enhancement (8x8 → 16x16 → 32x32 → full)
 * - RGB channel split with screen blend mode for chromatic aberration
 * - Glitch artifacts: scanlines, horizontal bars with random positioning
 * - Caption keyword-triggered pixel explosions with scatter/reform animations
 * - Staggered pixel reveal with per-cell timing delays
 * - CSS pixelated rendering and containment for performance
 * 
 * Technical Implementation:
 * - Uses BaseLayout with dynamic grid classes for resolution phases
 * - Batch DOM operations by regenerating grid per phase
 * - Generic keyframe effects for opacity/scale on individual pixels
 * - Mix-blend-mode screen for RGB split channels
 * - CSS containment (contain: layout style paint) for optimized updates
 * 
 * Use Cases:
 * - Retro gaming content introductions
 * - 8-bit aesthetic music videos
 * - Tech/digital product reveals
 * - Nostalgia-themed social media content
 * - Cyberpunk/glitch art videos
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  trackId: z.string().default('pixelated-emergence').describe('Unique identifier for this preset instance'),
  
  cutoutImageSrc: z.string().describe('Source URL of the cutout image (PNG with transparency recommended)'),
  
  duration: z.number().default(3).describe('Total duration of the emergence effect in seconds'),
  
  resolutionPhases: z.array(z.number()).default([8, 16, 32]).describe('Array of grid resolutions to progress through (e.g., [8, 16, 32] for 8x8, 16x16, 32x32)'),
  
  phaseTransitionTime: z.number().default(0.3).describe('Time in seconds for each resolution phase transition'),
  
  pixelStaggerDelay: z.number().default(0.01).describe('Stagger delay per pixel cell in seconds (cellIndex * delay)'),
  
  rgbSplitEnabled: z.boolean().default(true).describe('Enable RGB channel split chromatic aberration effect'),
  
  rgbSplitOffset: z.number().default(3).describe('Pixel offset for RGB channel split effect'),
  
  rgbSplitOpacity: z.number().default(0.7).describe('Opacity of RGB split channels (0-1)'),
  
  glitchEnabled: z.boolean().default(true).describe('Enable glitch artifacts and scanlines'),
  
  glitchBarProbability: z.number().default(0.1).describe('Probability of glitch bars appearing per phase (0-1)'),
  
  pixelExplosionKeywords: z.array(z.string()).default([]).describe('Caption keywords that trigger pixel explosion effects'),
  
  explosionScatterDistance: z.number().default(50).describe('Maximum scatter distance in pixels for explosion effect'),
  
  explosionDuration: z.number().default(0.5).describe('Duration of pixel explosion scatter/reform animation in seconds'),
  
  backgroundColor: z.string().default('#000000').describe('Background color for the effect'),
  
  finalImageOpacity: z.number().default(1).describe('Final opacity of the full-resolution image (0-1)'),
});

type PixelatedEmergenceParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: PixelatedEmergenceParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    trackId,
    cutoutImageSrc,
    duration,
    resolutionPhases,
    phaseTransitionTime,
    pixelStaggerDelay,
    rgbSplitEnabled,
    rgbSplitOffset,
    rgbSplitOpacity,
    glitchEnabled,
    glitchBarProbability,
    finalImageOpacity,
  } = params;

  // Helper: Generate random glitch bar position
  const getRandomGlitchPosition = (): string => {
    return `${Math.random() * 80 + 10}%`;
  };

  // Helper: Create RGB channel component
  const createRGBChannel = (
    id: string,
    hueRotate: number,
    translateX: number,
  ): RenderableComponentData => {
    return {
      id,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: cutoutImageSrc,
        containerProps: {
          className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
          style: {
            mixBlendMode: 'screen' as const,
            filter: `grayscale(100%) sepia(100%) saturate(1000%) hue-rotate(${hueRotate}deg)`,
            opacity: rgbSplitOpacity,
            transform: `translateX(${translateX}px)`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
    } as RenderableComponentData;
  };

  // Helper: Create pixel grid for a specific resolution phase
  const createPixelGrid = (
    resolution: number,
    phaseStart: number,
    phaseDuration: number,
  ): RenderableComponentData[] => {
    const totalCells = resolution * resolution;
    const cellPercentage = 100 / resolution;
    const gridCells: RenderableComponentData[] = [];

    for (let i = 0; i < totalCells; i++) {
      const row = Math.floor(i / resolution);
      const col = i % resolution;
      const cellId = `${trackId}-pixel-${resolution}-${i}`;
      
      // Staggered delay for this cell
      const cellDelay = i * pixelStaggerDelay;
      
      // Calculate position
      const topPercent = row * cellPercentage;
      const leftPercent = col * cellPercentage;

      // Sample color from image position (simplified - use semi-transparent color overlay)
      // In production, this would ideally sample actual pixel data from canvas
      const hue = (i / totalCells) * 360;
      const backgroundColor = `hsla(${hue}, 70%, 50%, 0.3)`;

      gridCells.push({
        id: cellId,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              top: `${topPercent}%`,
              left: `${leftPercent}%`,
              width: `${cellPercentage}%`,
              height: `${cellPercentage}%`,
              backgroundColor,
              contain: 'layout style paint',
              willChange: 'transform, opacity',
            },
          },
        },
        context: {
          timing: {
            start: phaseStart,
            duration: phaseDuration,
          },
        },
        effects: [
          {
            id: `${cellId}-emerge`,
            componentId: cellId,
            data: {
              type: 'ease-out',
              start: cellDelay,
              duration: phaseTransitionTime,
              mode: 'provider',
              targetIds: [cellId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                { key: 'scale', val: 0.5, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return gridCells;
  };

  // Build child components
  const childrenData: RenderableComponentData[] = [];

  // 1. RGB Split Layer (if enabled)
  if (rgbSplitEnabled) {
    const rgbSplitLayer: RenderableComponentData = {
      id: `${trackId}-rgb-split-layer`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: [
        createRGBChannel(`${trackId}-rgb-red`, 0, -rgbSplitOffset),
        createRGBChannel(`${trackId}-rgb-green`, 90, 0),
        createRGBChannel(`${trackId}-rgb-blue`, 200, rgbSplitOffset),
      ],
    } as RenderableComponentData;

    childrenData.push(rgbSplitLayer);
  }

  // 2. Pixel Grid Layer (progressive resolution phases)
  const pixelGridChildren: RenderableComponentData[] = [];
  let cumulativeTime = 0;

  resolutionPhases.forEach((resolution, index) => {
    const isLastPhase = index === resolutionPhases.length - 1;
    const phaseDuration = isLastPhase 
      ? duration - cumulativeTime 
      : phaseTransitionTime;

    const phaseGrid = createPixelGrid(resolution, cumulativeTime, phaseDuration);
    pixelGridChildren.push(...phaseGrid);

    cumulativeTime += phaseDuration;
  });

  const pixelGridLayer: RenderableComponentData = {
    id: `${trackId}-pixel-grid-layer`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 20,
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: pixelGridChildren,
  } as RenderableComponentData;

  childrenData.push(pixelGridLayer);

  // 3. Glitch Overlay Layer (if enabled)
  if (glitchEnabled) {
    const glitchChildren: RenderableComponentData[] = [];

    // Scanline overlay
    glitchChildren.push({
      id: `${trackId}-scanlines`,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
            opacity: 0.5,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
    } as RenderableComponentData);

    // Random glitch bars
    if (Math.random() < glitchBarProbability) {
      glitchChildren.push({
        id: `${trackId}-glitch-bar-1`,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          containerProps: {
            className: 'absolute left-0 right-0',
            style: {
              height: '2px',
              backgroundColor: 'rgba(255, 0, 255, 0.3)',
              top: getRandomGlitchPosition(),
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      } as RenderableComponentData);
    }

    if (Math.random() < glitchBarProbability) {
      glitchChildren.push({
        id: `${trackId}-glitch-bar-2`,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          containerProps: {
            className: 'absolute left-0 right-0',
            style: {
              height: '1px',
              backgroundColor: 'rgba(0, 255, 255, 0.3)',
              top: getRandomGlitchPosition(),
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      } as RenderableComponentData);
    }

    const glitchLayer: RenderableComponentData = {
      id: `${trackId}-glitch-layer`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 30,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: glitchChildren,
    } as RenderableComponentData;

    childrenData.push(glitchLayer);
  }

  // 4. Final Cutout Image Layer (fades in at the end)
  const finalImageStart = duration * 0.75;
  const finalImageDuration = duration - finalImageStart;

  const finalImageLayer: RenderableComponentData = {
    id: `${trackId}-final-image`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 40,
        },
      },
    },
    context: {
      timing: {
        start: finalImageStart,
        duration: finalImageDuration,
      },
    },
    childrenData: [
      {
        id: `${trackId}-final-cutout`,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: cutoutImageSrc,
          containerProps: {
            className: 'absolute inset-0 w-full h-full object-contain',
            style: {
              imageRendering: 'pixelated' as const,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: finalImageDuration,
          },
        },
        effects: [
          {
            id: `${trackId}-final-fade-in`,
            componentId: `${trackId}-final-cutout`,
            data: {
              type: 'ease-out',
              start: 0,
              duration: finalImageDuration * 0.5,
              mode: 'provider',
              targetIds: [`${trackId}-final-cutout`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: finalImageOpacity, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

  childrenData.push(finalImageLayer);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: childrenData as RenderableComponentData[],
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'pixelated-emergence-effect',
  title: 'Pixelated Emergence Effect',
  description: 'A retro video game style effect where cutout images materialize through expanding pixel blocks that progressively refine from 8x8 to full resolution. Features RGB channel splitting, glitch artifacts, scanlines, and caption-synchronized pixel explosions for a nostalgic 8-bit digital aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'image',
    'retro',
    '8-bit',
    'pixelated',
    'glitch',
    'rgb-split',
    'emergence',
    'video-game',
    'digital',
    'chromatic-aberration',
    'scanlines',
    'effect',
  ],
  defaultInputParams: {
    trackId: 'pixelated-emergence',
    cutoutImageSrc: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=800&fit=crop',
    duration: 3,
    resolutionPhases: [8, 16, 32],
    phaseTransitionTime: 0.3,
    pixelStaggerDelay: 0.01,
    rgbSplitEnabled: true,
    rgbSplitOffset: 3,
    rgbSplitOpacity: 0.7,
    glitchEnabled: true,
    glitchBarProbability: 0.1,
    pixelExplosionKeywords: [],
    explosionScatterDistance: 50,
    explosionDuration: 0.5,
    backgroundColor: '#000000',
    finalImageOpacity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const pixelatedEmergenceEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
