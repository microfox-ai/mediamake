/**
 * Hexagonal Honeycomb Wipe Transition
 * 
 * A high-tech transition effect where hexagonal shapes flip in a radial chain reaction pattern
 * from center outward, revealing the incoming video. Features metallic silver borders, 3D rotateX
 * flip animations, and chromatic aberration during the transition for a prismatic, futuristic feel.
 * 
 * Features:
 * - Hexagonal grid generated dynamically based on screen size
 * - Center-outward radial spread pattern with distance-based delays
 * - 3D flip animation (rotateX) for each hexagon
 * - Metallic silver borders on hexagons
 * - Chromatic aberration effect during transition
 * - Configurable transition duration and hexagon flip duration
 * 
 * Use Cases:
 * - High-tech video transitions
 * - Futuristic content reveals
 * - Tech product launches
 * - Science fiction themed videos
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define parameters schema
const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z.number().default(1.8).describe('Total duration of the hexagon spread transition in seconds'),
  hexagonFlipDuration: z.number().default(0.4).describe('Duration for each individual hexagon flip animation in seconds'),
  hexagonSize: z.number().default(80).describe('Size of each hexagon in pixels'),
  hexagonGap: z.number().default(4).describe('Gap between hexagons in pixels'),
  chromaticIntensity: z.number().default(2).describe('Intensity of chromatic aberration effect in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    hexagonFlipDuration,
    hexagonSize,
    hexagonGap,
    chromaticIntensity,
  } = params;

  // Calculate total composition duration (overlap by transition duration)
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Helper function to generate hexagon grid coordinates
  const generateHexagonGrid = (
    width: number,
    height: number,
    hexSize: number,
    gap: number,
  ): Array<{ x: number; y: number; distance: number }> => {
    const hexagons: Array<{ x: number; y: number; distance: number }> = [];
    
    // Hexagon dimensions
    const hexWidth = hexSize * Math.sqrt(3);
    const hexHeight = hexSize * 2;
    const vertSpacing = hexHeight * 0.75 + gap;
    const horizSpacing = hexWidth + gap;

    // Calculate grid dimensions
    const cols = Math.ceil(width / horizSpacing) + 2;
    const rows = Math.ceil(height / vertSpacing) + 2;

    // Center point for distance calculation
    const centerX = width / 2;
    const centerY = height / 2;

    // Generate hexagon positions
    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        const x = col * horizSpacing + (row % 2 === 1 ? horizSpacing / 2 : 0);
        const y = row * vertSpacing;

        // Calculate distance from center
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        hexagons.push({ x, y, distance });
      }
    }

    return hexagons;
  };

  // Helper function to create hexagon SVG path
  const createHexagonPath = (size: number): string => {
    const points: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);
      points.push([x, y]);
    }
    return `M ${points.map(p => `${p[0]},${p[1]}`).join(' L ')} Z`;
  };

  // Get viewport dimensions from config
  const viewportWidth = props.config?.width || 1920;
  const viewportHeight = props.config?.height || 1080;

  // Generate hexagon grid
  const hexagons = generateHexagonGrid(
    viewportWidth,
    viewportHeight,
    hexagonSize,
    hexagonGap,
  );

  // Normalize distances for delay calculation
  const maxDistance = Math.max(...hexagons.map(h => h.distance));
  const delaySpread = transitionDuration - hexagonFlipDuration;

  // Create hexagon elements
  const hexagonElements: RenderableComponentData[] = hexagons.map((hex, index) => {
    const normalizedDistance = hex.distance / maxDistance;
    const delay = normalizedDistance * delaySpread;

    return {
      id: `hexagon-${index}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `
          <svg 
            width="${hexagonSize * 2.5}" 
            height="${hexagonSize * 2.5}" 
            viewBox="${-hexagonSize * 1.25} ${-hexagonSize * 1.25} ${hexagonSize * 2.5} ${hexagonSize * 2.5}"
            style="position: absolute; left: ${hex.x - hexagonSize * 1.25}px; top: ${hex.y - hexagonSize * 1.25}px; overflow: visible;"
          >
            <path 
              d="${createHexagonPath(hexagonSize)}" 
              fill="none" 
              stroke="#C0C0C0" 
              stroke-width="3" 
              style="filter: drop-shadow(0 0 4px rgba(192, 192, 192, 0.6));"
            />
          </svg>
        `,
        className: 'absolute',
        style: {
          pointerEvents: 'none',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `hexagon-flip-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: delay,
            duration: hexagonFlipDuration,
            mode: 'provider',
            targetIds: [`hexagon-${index}`],
            ranges: [
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: 180, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Create chromatic aberration effect timing
  const chromaticStartDelay = delaySpread * 0.3;
  const chromaticDuration = delaySpread * 0.4;

  // Build the composition structure
  const rootContainer: RenderableComponentData = {
    id: 'hexagon-honeycomb-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          '--hex-size': `${hexagonSize}px`,
          '--hex-gap': `${hexagonGap}px`,
        } as any,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Outgoing video layer
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
          style: {
            position: 'absolute',
            inset: '0',
            zIndex: 10,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
      } as RenderableComponentData,
      
      // Incoming video layer
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full object-cover',
          style: {
            position: 'absolute',
            inset: '0',
            zIndex: 20,
            backfaceVisibility: 'hidden',
          },
        },
        context: {
          timing: {
            start: video1.duration - transitionDuration,
            duration: video2.duration + transitionDuration,
          },
        },
        effects: [
          {
            id: 'incoming-fade-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      
      // Hexagon container
      {
        id: 'hexagon-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 30,
              perspective: '1000px',
              perspectiveOrigin: 'center center',
              pointerEvents: 'none',
            },
          },
        },
        context: {
          timing: {
            start: video1.duration - transitionDuration,
            duration: transitionDuration,
          },
        },
        childrenData: hexagonElements,
      } as RenderableComponentData,
      
      // Chromatic aberration layer
      {
        id: 'chromatic-layer',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              zIndex: 40,
              mixBlendMode: 'screen',
            },
          },
        },
        context: {
          timing: {
            start: video1.duration - transitionDuration,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'chromatic-fade',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: chromaticStartDelay,
              duration: chromaticDuration,
              mode: 'provider',
              targetIds: ['chromatic-layer'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.3, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          // Red channel
          {
            id: 'chromatic-r',
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video2.src,
              fit: 'cover',
              className: 'w-full h-full object-cover',
              style: {
                position: 'absolute',
                inset: '0',
                mixBlendMode: 'screen',
                filter: 'grayscale(1) brightness(1.5) contrast(2)',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
            effects: [
              {
                id: 'chromatic-r-shift',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: ['chromatic-r'],
                  ranges: [
                    { key: 'translateX', val: -chromaticIntensity, prog: 0 },
                    { key: 'translateX', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
          
          // Green channel
          {
            id: 'chromatic-g',
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video2.src,
              fit: 'cover',
              className: 'w-full h-full object-cover',
              style: {
                position: 'absolute',
                inset: '0',
                mixBlendMode: 'screen',
                filter: 'grayscale(1) brightness(1) contrast(1.5)',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          } as RenderableComponentData,
          
          // Blue channel
          {
            id: 'chromatic-b',
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video2.src,
              fit: 'cover',
              className: 'w-full h-full object-cover',
              style: {
                position: 'absolute',
                inset: '0',
                mixBlendMode: 'screen',
                filter: 'grayscale(1) brightness(0.8) contrast(2)',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
            effects: [
              {
                id: 'chromatic-b-shift',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: ['chromatic-b'],
                  ranges: [
                    { key: 'translateX', val: chromaticIntensity, prog: 0 },
                    { key: 'translateX', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
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

// Define preset metadata
const presetMetadata: PresetMetadata = {
  id: 'hexagon-honeycomb-wipe',
  title: 'Hexagonal Honeycomb Wipe Transition',
  description: 'A high-tech transition effect where hexagonal shapes flip in a radial chain reaction pattern from center outward, revealing the incoming video. Features metallic silver borders, 3D rotateX flip animations, and chromatic aberration during the transition for a prismatic, futuristic feel.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'hexagon', 'honeycomb', 'wipe', '3d', 'chromatic', 'futuristic', 'high-tech'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.8,
    hexagonFlipDuration: 0.4,
    hexagonSize: 80,
    hexagonGap: 4,
    chromaticIntensity: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export the preset
export const hexagonHoneycombWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
