/**
 * Kaleidoscope Shatter Transition Preset
 *
 * Creates a prismatic transition effect where the outgoing video fractures into 16 triangular 
 * fragments that spin outward while the incoming video assembles from matching triangular pieces 
 * spinning inward. Features chromatic aberration edges and rainbow light refractions during the 
 * 2-second overlap for a crystal-like kaleidoscope appearance.
 *
 * Features:
 * - **16 Triangular Fragments**: Pie-slice shaped fragments radiating from center
 * - **Bidirectional Animation**: Outgoing fragments spin out while incoming spin in
 * - **Chromatic Aberration**: RGB split effect on fragment edges during transition
 * - **Rainbow Refraction**: Conic gradient overlay for prism-like light effects
 * - **2-Second Overlap**: Both videos visible simultaneously through fragments
 *
 * Use cases:
 * - Creating dramatic video transitions with crystal/prism effects
 * - Building kaleidoscope-style scene changes
 * - Adding prismatic visual effects to video sequences
 * - Creating unique shatter/assembly transitions
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first video (outgoing)'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second video (incoming)'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video configuration'),
  transitionDuration: z.number().default(2).describe('Duration of the transition overlap in seconds'),
  fragmentCount: z.number().default(16).describe('Number of triangular fragments (12-16 recommended)'),
  rotationDegrees: z.number().default(720).describe('Degrees of rotation during transition'),
  expansionDistance: z.number().default(150).describe('Distance fragments move outward in pixels'),
  chromaticIntensity: z.number().default(4).describe('Chromatic aberration intensity (0-10)'),
  refractionOpacity: z.number().default(0.3).describe('Rainbow refraction overlay opacity (0-1)'),
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
    fragmentCount,
    rotationDegrees,
    expansionDistance,
    chromaticIntensity,
    refractionOpacity,
  } = params;

  // Calculate total duration
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Helper: Calculate polygon points for triangular pie slice
  const calculateTrianglePolygon = (index: number, total: number): string => {
    const angleStep = (360 / total) * (Math.PI / 180);
    const startAngle = index * angleStep;
    const endAngle = (index + 1) * angleStep;

    // Center point (0, 0) and two edge points forming a pie slice
    const x1 = Math.cos(startAngle) * 100;
    const y1 = Math.sin(startAngle) * 100;
    const x2 = Math.cos(endAngle) * 100;
    const y2 = Math.sin(endAngle) * 100;

    return `polygon(0% 0%, ${x1}% ${y1}%, ${x2}% ${y2}%)`;
  };

  // Helper: Calculate translation values based on fragment angle
  const calculateTranslation = (index: number, total: number, distance: number): { x: number; y: number } => {
    const angleStep = (360 / total) * (Math.PI / 180);
    const midAngle = (index + 0.5) * angleStep;

    return {
      x: Math.cos(midAngle) * distance,
      y: Math.sin(midAngle) * distance,
    };
  };

  // Create outgoing video fragments
  const outgoingFragments: RenderableComponentData[] = [];
  const outgoingFragmentIds: string[] = [];

  for (let i = 0; i < fragmentCount; i++) {
    const fragmentId = `outgoing-fragment-${i}`;
    outgoingFragmentIds.push(fragmentId);

    const clipPath = calculateTrianglePolygon(i, fragmentCount);
    const translation = calculateTranslation(i, fragmentCount, expansionDistance);

    outgoingFragments.push({
      id: fragmentId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: '50%',
            left: '50%',
            width: '200%',
            height: '200%',
            transformOrigin: '0 0',
            clipPath: clipPath,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      childrenData: [
        {
          id: `outgoing-video-${i}`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            startFrom: 0,
            fit: 'cover',
            className: 'w-full h-full object-cover',
            style: {
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '100%',
              height: '100%',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData);
  }

  // Create incoming video fragments
  const incomingFragments: RenderableComponentData[] = [];
  const incomingFragmentIds: string[] = [];

  for (let i = 0; i < fragmentCount; i++) {
    const fragmentId = `incoming-fragment-${i}`;
    incomingFragmentIds.push(fragmentId);

    const clipPath = calculateTrianglePolygon(i, fragmentCount);

    incomingFragments.push({
      id: fragmentId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            top: '50%',
            left: '50%',
            width: '200%',
            height: '200%',
            transformOrigin: '0 0',
            clipPath: clipPath,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video2.duration,
        },
      },
      childrenData: [
        {
          id: `incoming-video-${i}`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            startFrom: 0,
            fit: 'cover',
            className: 'w-full h-full object-cover',
            style: {
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '100%',
              height: '100%',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData);
  }

  // Create outgoing fragment effects (spin out)
  const outgoingEffects: any[] = [];
  for (let i = 0; i < fragmentCount; i++) {
    const translation = calculateTranslation(i, fragmentCount, expansionDistance);

    outgoingEffects.push({
      id: `outgoing-spin-${i}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: video1.duration - transitionDuration,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [`outgoing-fragment-${i}`],
        ranges: [
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: rotationDegrees, prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0, prog: 1 },
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: `${translation.x}px`, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: `${translation.y}px`, prog: 1 },
        ],
      },
    });

    // Chromatic aberration effect
    outgoingEffects.push({
      id: `outgoing-chromatic-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: video1.duration - transitionDuration,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [`outgoing-fragment-${i}`],
        ranges: [
          { 
            key: 'filter', 
            val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan)', 
            prog: 0 
          },
          { 
            key: 'filter', 
            val: `drop-shadow(${chromaticIntensity}px 0 0 red) drop-shadow(-${chromaticIntensity}px 0 0 cyan)`, 
            prog: 0.5 
          },
          { 
            key: 'filter', 
            val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan)', 
            prog: 1 
          },
        ],
      },
    });
  }

  // Create incoming fragment effects (spin in)
  const incomingEffects: any[] = [];
  for (let i = 0; i < fragmentCount; i++) {
    const translation = calculateTranslation(i, fragmentCount, expansionDistance);

    incomingEffects.push({
      id: `incoming-spin-${i}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [`incoming-fragment-${i}`],
        ranges: [
          { key: 'rotate', val: -rotationDegrees, prog: 0 },
          { key: 'rotate', val: 0, prog: 1 },
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'translateX', val: `${translation.x}px`, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: `${translation.y}px`, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    });

    // Chromatic aberration effect
    incomingEffects.push({
      id: `incoming-chromatic-${i}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [`incoming-fragment-${i}`],
        ranges: [
          { 
            key: 'filter', 
            val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan)', 
            prog: 0 
          },
          { 
            key: 'filter', 
            val: `drop-shadow(${chromaticIntensity}px 0 0 red) drop-shadow(-${chromaticIntensity}px 0 0 cyan)`, 
            prog: 0.5 
          },
          { 
            key: 'filter', 
            val: 'drop-shadow(0px 0 0 red) drop-shadow(0px 0 0 cyan)', 
            prog: 1 
          },
        ],
      },
    });
  }

  // Create outgoing fragments container
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-fragments-container',
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
        duration: video1.duration,
      },
    },
    effects: outgoingEffects,
    childrenData: outgoingFragments,
  };

  // Create incoming fragments container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-fragments-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration,
      },
    },
    effects: incomingEffects,
    childrenData: incomingFragments,
  };

  // Create rainbow refraction overlay
  const refractionOverlay: RenderableComponentData = {
    id: 'rainbow-refraction-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: 'conic-gradient(from 0deg, red, orange, yellow, green, cyan, blue, violet, red)',
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
        id: 'rainbow-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['rainbow-refraction-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: refractionOpacity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'kaleidoscope-shatter-container',
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
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingContainer,
      incomingContainer,
      refractionOverlay,
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
  id: 'kaleidoscope-shatter-transition',
  title: 'Kaleidoscope Shatter Transition',
  description: 'A prismatic transition effect where the outgoing video shatters into 16 triangular fragments spinning outward while the incoming video assembles from matching fragments spinning inward. Features chromatic aberration edges and rainbow refractions during the 2-second overlap for a crystal-like kaleidoscope appearance.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'kaleidoscope', 'shatter', 'prismatic', 'crystal', 'chromatic-aberration', 'rainbow', 'fragments', 'spin'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    transitionDuration: 2,
    fragmentCount: 16,
    rotationDegrees: 720,
    expansionDistance: 150,
    chromaticIntensity: 4,
    refractionOpacity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const kaleidoscopeShatterTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};