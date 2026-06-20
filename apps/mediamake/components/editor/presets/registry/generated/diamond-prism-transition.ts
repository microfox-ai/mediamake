/**
 * Diamond Prism Transition Preset
 *
 * This preset creates a stunning 3D diamond-shaped transition where videos appear
 * to pass through a multifaceted diamond prism, creating rainbow reflections and
 * refractions. The diamond rotates to reveal the incoming video while the outgoing
 * video fragments into prismatic reflections.
 *
 * Features:
 * - **3D Diamond Structure**: 8 video facets per video mapped to diamond faces
 * - **Prismatic Effects**: RGB separation and rainbow hue shifts on each facet
 * - **Diamond Rotation**: Smooth 360-degree Y-axis rotation with X-axis tilt
 * - **Sparkle Effects**: Animated light reflections simulating diamond edges
 * - **Staggered Reveals**: Facets fade in/out at different times during rotation
 * - **Blend Modes**: Screen blend mode creates additive rainbow effects
 *
 * Use cases:
 * - Creating luxurious video transitions with prismatic effects
 * - Building gem-themed video presentations
 * - Adding magical rainbow transition effects
 * - Creating high-impact video reveals
 *
 * Technical Details:
 * - Uses CSS 3D transforms with preserve-3d
 * - Diamond facets created with clip-path polygons
 * - Hue rotation creates rainbow spectrum across facets
 * - Sparkle effects use HTMLBlockAtom with animated stars
 * - Staggered timing creates sequential facet reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  transitionDuration: z
    .number()
    .default(1.6)
    .describe('Duration of the transition in seconds'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  diamondRotationDegrees: z
    .number()
    .default(360)
    .describe('Total Y-axis rotation in degrees'),
  diamondTiltDegrees: z
    .number()
    .default(45)
    .describe('X-axis tilt rotation in degrees'),
  perspective: z
    .number()
    .default(1200)
    .describe('Perspective distance in pixels'),
  sparkleCount: z
    .number()
    .default(10)
    .describe('Number of sparkle elements to render'),
  facetTranslateZ: z
    .number()
    .default(100)
    .describe('Z-axis translation distance for facets in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    outgoingVideoDuration,
    incomingVideoDuration,
    diamondRotationDegrees,
    diamondTiltDegrees,
    perspective,
    sparkleCount,
    facetTranslateZ,
  } = params;

  // Helper: Create sparkle HTML with star SVG
  const createSparkleHTML = (color: string) => `
    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
      <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.09 8.26L20 10L14.09 11.74L12 18L9.91 11.74L4 10L9.91 8.26L12 2Z" fill="${color}" stroke="${color}" stroke-width="2"/>
      </svg>
    </div>
  `;

  // Helper: Generate sparkle positions and colors
  const sparklePositions = Array.from({ length: sparkleCount }, (_, i) => ({
    top: `${Math.random() * 80 + 10}%`,
    left: `${Math.random() * 80 + 10}%`,
    color: [
      '#ffffff',
      '#ffd700',
      '#00ffff',
      '#ff69b4',
      '#7fff00',
      '#ff4500',
      '#da70d6',
      '#87ceeb',
    ][i % 8],
    size: Math.random() * 8 + 6,
    delay: i * 0.15,
    duration: Math.random() * 0.2 + 0.25,
  }));

  // Calculate total duration
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Diamond facet rotations (6 facets around Y-axis)
  const facetRotations = [0, 60, 120, 180, 240, 300];

  // Hue rotations for rainbow effect
  const hueRotations = [0, 60, 120, 180, 240, 300];

  // Create outgoing video facets
  const outgoingFacets: RenderableComponentData[] = facetRotations.map(
    (rotation, index) => ({
      id: `out-facet-${index + 1}`,
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        fit: 'cover' as const,
        className: 'w-full h-full',
        style: {
          position: 'absolute' as const,
          width: '100%',
          height: '100%',
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          transform: `rotateY(${rotation}deg) translateZ(${facetTranslateZ}px)`,
          filter: `hue-rotate(${hueRotations[index]}deg)`,
          mixBlendMode: 'screen' as const,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      effects: [
        {
          id: `out-facet-${index + 1}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: transitionDuration * 0.3 + index * 0.1,
            duration: transitionDuration * 0.4,
            mode: 'provider' as const,
            targetIds: [`out-facet-${index + 1}`],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  // Create incoming video facets
  const incomingFacets: RenderableComponentData[] = facetRotations.map(
    (rotation, index) => ({
      id: `in-facet-${index + 1}`,
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        fit: 'cover' as const,
        className: 'w-full h-full',
        style: {
          position: 'absolute' as const,
          width: '100%',
          height: '100%',
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
          transform: `rotateY(${rotation}deg) translateZ(${facetTranslateZ}px)`,
          filter: `hue-rotate(${hueRotations[index]}deg)`,
          mixBlendMode: 'screen' as const,
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - transitionDuration,
          duration: incomingVideoDuration + transitionDuration,
        },
      },
      effects: [
        {
          id: `in-facet-${index + 1}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: index * 0.1,
            duration: transitionDuration * 0.4,
            mode: 'provider' as const,
            targetIds: [`in-facet-${index + 1}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  // Create outgoing facets container
  const outgoingFacetsContainer: RenderableComponentData = {
    id: 'outgoing-facets-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    childrenData: outgoingFacets,
  };

  // Create incoming facets container
  const incomingFacetsContainer: RenderableComponentData = {
    id: 'incoming-facets-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideoDuration - transitionDuration,
        duration: incomingVideoDuration + transitionDuration,
      },
    },
    childrenData: incomingFacets,
  };

  // Create diamond container with rotation effect
  const diamondContainer: RenderableComponentData = {
    id: 'diamond-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          width: '400px',
          height: '400px',
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingFacetsContainer, incomingFacetsContainer],
    effects: [
      {
        id: 'diamond-rotation',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: outgoingVideoDuration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: ['diamond-container'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: diamondRotationDegrees, prog: 1 },
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: diamondTiltDegrees, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create sparkle effects
  const sparkles: RenderableComponentData[] = sparklePositions.map(
    (sparkle, index) => ({
      id: `sparkle-${index + 1}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: createSparkleHTML(sparkle.color),
        className: 'absolute',
        style: {
          width: `${sparkle.size}px`,
          height: `${sparkle.size}px`,
          top: sparkle.top,
          left: sparkle.left,
          filter: `brightness(2) drop-shadow(0 0 4px ${sparkle.color})`,
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - transitionDuration + sparkle.delay,
          duration: sparkle.duration,
        },
      },
      effects: [
        {
          id: `sparkle-${index + 1}-anim`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out' as const,
            start: 0,
            duration: sparkle.duration,
            mode: 'provider' as const,
            targetIds: [`sparkle-${index + 1}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 1, prog: 0.5 },
              { key: 'scale', val: 0.5, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  // Create sparkles container
  const sparklesContainer: RenderableComponentData = {
    id: 'sparkles-container',
    type: 'layout' as const,
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
        duration: totalDuration,
      },
    },
    childrenData: sparkles,
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'diamond-prism-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: `${perspective}px`,
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [diamondContainer, sparklesContainer],
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
  id: 'diamond-prism-transition',
  title: 'Diamond Prism Transition',
  description:
    'A 3D diamond-shaped transition where videos appear to pass through a multifaceted diamond prism, creating rainbow reflections and refractions. The diamond rotates to reveal the incoming video while the outgoing video fragments into prismatic reflections.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    '3d',
    'diamond',
    'prism',
    'rainbow',
    'refraction',
    'sparkle',
    'luxury',
    'magical',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    transitionDuration: 1.6,
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
    diamondRotationDegrees: 360,
    diamondTiltDegrees: 45,
    perspective: 1200,
    sparkleCount: 10,
    facetTranslateZ: 100,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const diamondPrismTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
