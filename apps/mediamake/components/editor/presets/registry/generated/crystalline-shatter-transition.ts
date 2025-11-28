/**
 * Crystalline Shatter Transition Preset
 *
 * A dreamy bokeh transition where the outgoing video fragments into soft, glowing hexagonal
 * crystal shards that drift apart in 3D space, revealing the incoming video beneath.
 * Each shard catches light differently with prismatic reflections and soft bokeh circles.
 *
 * Features:
 * - **Hexagonal Fragmentation**: 6 cloned VideoAtom elements with different clip-path polygons
 * - **3D Movement**: Transform3d animations with translateZ, rotateY, rotateX, rotateZ
 * - **Individual Blur & Glow**: Each shard has unique blur and drop-shadow effects
 * - **Prismatic Reflections**: Colored drop-shadows creating crystal-like reflections
 * - **Soft Focus Reveal**: Incoming video starts blurred and sharpens as shards disperse
 * - **2-Second Overlap**: Synchronized transition during overlap period
 *
 * Use cases:
 * - Creating dreamy, ethereal transitions between videos
 * - Building prism-like visual effects
 * - Adding bokeh-style transitions to video montages
 * - Creating crystal shatter effects for transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of the outgoing video (fragmenting)'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of the incoming video (revealed beneath)'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition overlap in seconds (default: 2)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate BaseLayout duration (total - overlap)
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Shard configurations: clip-path polygons for hexagonal shapes
  const shardConfigs = [
    {
      id: 'shard-1',
      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
      translateX: -150,
      translateY: -100,
      translateZ: -100,
      rotateY: -45,
      rotateX: 20,
      rotateZ: 0,
      blur: 30,
      dropShadow: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))',
    },
    {
      id: 'shard-2',
      clipPath: 'polygon(50% 15%, 85% 35%, 70% 70%, 30% 70%, 15% 35%)',
      translateX: 200,
      translateY: -80,
      translateZ: 100,
      rotateY: 45,
      rotateX: -15,
      rotateZ: 0,
      blur: 25,
      dropShadow: 'drop-shadow(0 0 20px rgba(255,200,150,0.6))',
    },
    {
      id: 'shard-3',
      clipPath: 'polygon(25% 20%, 55% 15%, 65% 45%, 40% 55%, 15% 45%)',
      translateX: -100,
      translateY: 120,
      translateZ: 50,
      rotateY: 30,
      rotateX: 0,
      rotateZ: -25,
      blur: 28,
      dropShadow: 'drop-shadow(0 0 20px rgba(200,150,255,0.6))',
    },
    {
      id: 'shard-4',
      clipPath: 'polygon(60% 30%, 90% 40%, 80% 75%, 55% 70%, 50% 45%)',
      translateX: 180,
      translateY: 100,
      translateZ: -50,
      rotateY: -35,
      rotateX: 25,
      rotateZ: 0,
      blur: 22,
      dropShadow: 'drop-shadow(0 0 20px rgba(150,200,255,0.5))',
    },
    {
      id: 'shard-5',
      clipPath: 'polygon(20% 55%, 45% 50%, 50% 80%, 30% 90%, 10% 75%)',
      translateX: -120,
      translateY: 150,
      translateZ: 80,
      rotateY: 40,
      rotateX: 0,
      rotateZ: 30,
      blur: 26,
      dropShadow: 'drop-shadow(0 0 20px rgba(255,200,150,0.5))',
    },
    {
      id: 'shard-6',
      clipPath: 'polygon(55% 55%, 80% 60%, 75% 90%, 50% 95%, 45% 75%)',
      translateX: 140,
      translateY: 130,
      translateZ: -80,
      rotateY: -40,
      rotateX: -20,
      rotateZ: 0,
      blur: 24,
      dropShadow: 'drop-shadow(0 0 20px rgba(255,255,255,0.6))',
    },
  ];

  // Create shard VideoAtoms with effects
  const shards = shardConfigs.map((config) => ({
    id: config.id,
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: media1.src,
      className: 'w-full h-full object-cover',
      style: {
        clipPath: config.clipPath,
        position: 'absolute',
        top: 0,
        left: 0,
        filter: config.dropShadow,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    effects: [
      {
        id: `${config.id}-shatter`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [config.id],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: config.translateX, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: config.translateY, prog: 1 },
            { key: 'translateZ', val: 0, prog: 0 },
            { key: 'translateZ', val: config.translateZ, prog: 1 },
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: config.rotateY, prog: 1 },
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: config.rotateX, prog: 1 },
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: config.rotateZ, prog: 1 },
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: config.blur, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  })) as RenderableComponentData[];

  // Incoming video (starts blurred, sharpens as shards disperse)
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: media2.src,
      className: 'w-full h-full object-cover',
      style: {
        zIndex: -1,
      },
    },
    context: {
      timing: {
        start: media1.duration - transitionDuration,
        duration: media2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-blur-sharpen',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'blur', val: 40, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with 3D perspective
  const rootContainer: RenderableComponentData = {
    id: 'crystalline-shatter-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          transformStyle: 'preserve-3d',
          perspective: '1000px',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [incomingVideo, ...shards],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'crystalline-shatter-transition',
  title: 'Crystalline Shatter Transition',
  description:
    'A dreamy bokeh transition where the outgoing video fragments into soft, glowing hexagonal crystal shards that drift apart in 3D space, revealing the incoming video beneath which starts as a soft, out-of-focus background that sharpens as the shards disperse. Each shard catches light differently with prismatic reflections and soft bokeh circles.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'crystalline', 'shatter', 'bokeh', '3d', 'prism', 'hexagonal'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/outgoing-video.mp4',
      duration: 10,
    },
    media2: {
      src: 'https://example.com/incoming-video.mp4',
      duration: 10,
    },
    transitionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const crystallineShatterTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
