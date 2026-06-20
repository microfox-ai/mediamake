/**
 * DNA Helix Spiral Transition Preset
 *
 * Creates a 3D DNA double helix transition effect where video strips spiral and twist between clips.
 * The frame is split into 10 horizontal strips that rotate around a central axis while transitioning.
 * Outgoing video strips spiral outward (increasing radius) while fading, as incoming video strips
 * spiral inward from the edges.
 *
 * Features:
 * - 10 horizontal strips per video (20 total) following helical paths
 * - 3D transforms: translateX(sin(t)*radius), translateZ(cos(t)*radius), rotateY(t*360deg)
 * - Radius expands from 0 to 200px for outgoing, contracts from 200px to 0 for incoming
 * - Hue-rotate filter animation (0 to 30deg) for organic color shift
 * - Gaussian blur effect (0 to 2px to 0) at midpoint for depth
 * - Staggered animations by 50ms top-to-bottom
 * - Alternating z-index for proper helix overlap
 * - Perspective 800px for 3D depth
 *
 * Use cases:
 * - Creating organic, biological-feeling transitions
 * - DNA/molecular themed video content
 * - Scientific or medical video presentations
 * - Unique spiral transition effects
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
    .default(2.0)
    .describe('Duration of the transition in seconds'),
  stripCount: z
    .number()
    .default(10)
    .describe('Number of horizontal strips (default: 10)'),
  maxRadius: z
    .number()
    .default(200)
    .describe('Maximum spiral radius in pixels (default: 200)'),
  hueRotateDeg: z
    .number()
    .default(30)
    .describe('Maximum hue rotation in degrees (default: 30)'),
  maxBlur: z
    .number()
    .default(2)
    .describe('Maximum blur amount in pixels (default: 2)'),
  staggerMs: z
    .number()
    .default(50)
    .describe('Stagger delay between strips in milliseconds (default: 50)'),
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
    stripCount,
    maxRadius,
    hueRotateDeg,
    maxBlur,
    staggerMs,
  } = params;

  // Helper function to create helix keyframe values
  const createHelixKeyframes = (
    t: number,
    radius: number,
    rotations: number,
  ) => {
    const angle = t * Math.PI * 2 * rotations;
    return {
      translateX: Math.sin(angle) * radius,
      translateZ: Math.cos(angle) * radius,
      rotateY: t * 360 * rotations,
    };
  };

  // Helper function to create strip components
  const createStrip = (
    stripIndex: number,
    isOutgoing: boolean,
  ): RenderableComponentData => {
    const stripId = `${isOutgoing ? 'outgoing' : 'incoming'}-strip-${stripIndex}`;
    const videoSrc = isOutgoing ? outgoingVideoSrc : incomingVideoSrc;
    const topPercent = (stripIndex / stripCount) * 100;
    const heightPercent = 100 / stripCount;
    const clipPathInset = `${topPercent}% 0% ${100 - topPercent - heightPercent}% 0%`;
    const zIndex = stripIndex % 2 === 0 ? (isOutgoing ? 10 : 5) : (isOutgoing ? 9 : 4);
    const staggerDelay = (stripIndex * staggerMs) / 1000; // Convert to seconds

    // Create helix animation ranges
    const helixRanges = [];
    const opacityRanges = [];
    const filterRanges = [];

    // Generate keyframes for helix motion
    for (let prog = 0; prog <= 1; prog += 0.1) {
      const radiusStart = isOutgoing ? 0 : maxRadius;
      const radiusEnd = isOutgoing ? maxRadius : 0;
      const currentRadius = radiusStart + (radiusEnd - radiusStart) * prog;
      const helix = createHelixKeyframes(prog, currentRadius, 1);

      helixRanges.push(
        { key: 'translateX', val: `${helix.translateX}px`, prog },
        { key: 'translateZ', val: `${helix.translateZ}px`, prog },
        { key: 'rotateY', val: helix.rotateY, prog },
      );

      // Opacity: fade out for outgoing, fade in for incoming
      const opacity = isOutgoing ? 1 - prog : prog;
      opacityRanges.push({ key: 'opacity', val: opacity, prog });

      // Hue rotate and blur (peaks at midpoint)
      const midpointFactor = 1 - Math.abs(prog - 0.5) * 2; // 0 at start/end, 1 at midpoint
      const hueRotate = hueRotateDeg * midpointFactor;
      const blur = maxBlur * midpointFactor;
      filterRanges.push({
        key: 'filter',
        val: `hue-rotate(${hueRotate}deg) blur(${blur}px)`,
        prog,
      });
    }

    return {
      id: stripId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: videoSrc,
        className: 'absolute left-0 w-full',
        style: {
          height: `${heightPercent}%`,
          top: `${topPercent}%`,
          clipPath: clipPathInset,
          objectFit: 'cover',
          zIndex,
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
          id: `${stripId}-helix-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out-quad',
            start: staggerDelay,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [...helixRanges, ...opacityRanges, ...filterRanges],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Create all outgoing strips
  const outgoingStrips: RenderableComponentData[] = [];
  for (let i = 0; i < stripCount; i++) {
    outgoingStrips.push(createStrip(i, true));
  }

  // Create all incoming strips
  const incomingStrips: RenderableComponentData[] = [];
  for (let i = 0; i < stripCount; i++) {
    incomingStrips.push(createStrip(i, false));
  }

  // Outgoing strips container
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-strips-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: outgoingStrips,
  };

  // Incoming strips container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-strips-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: incomingStrips,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'dna-helix-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '800px',
          transformStyle: 'preserve-3d',
          overflow: 'hidden',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [outgoingContainer, incomingContainer],
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
  id: 'dna-helix-spiral-transition',
  title: 'DNA Helix Spiral Transition',
  description:
    'A 3D DNA double helix transition where video strips spiral outward/inward along helical paths with rotation, color shifts, and blur effects. Splits the frame into horizontal strips that follow mathematical helix trajectories.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'helix', 'dna', 'spiral', 'organic', 'biological'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 2.0,
    stripCount: 10,
    maxRadius: 200,
    hueRotateDeg: 30,
    maxBlur: 2,
    staggerMs: 50,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const dnaHelixSpiralTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
