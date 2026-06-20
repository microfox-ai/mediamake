/**
 * Hydrokinetic Vortex Transition Preset
 *
 * Creates a liquid whirlpool transition effect where outgoing video spirals into a vortex center
 * while incoming video emerges from the same point with reverse spiral motion. Features include:
 * - Outgoing video: decreasing radius spiral inward (0→1080deg rotation, accelerating)
 * - Incoming video: expanding radius spiral outward (-1080deg→0deg rotation)
 * - Centrifugal blur effect increasing toward the center using radial gradient masks
 * - Water droplet effects with border-radius deformation and opacity flickers
 * - Combined rotation and circular path animation using translateX/Y with cos/sin calculations
 *
 * Technical approach:
 * - Uses generic effects with provider mode targeting wrapper containers
 * - Circular path animation via calculated translateX/Y based on angle and radius
 * - Radial blur effect simulated through multiple keyframes increasing blur toward center
 * - Water droplets implemented as HTMLBlockAtom with organic border-radius shapes
 * - All timings relative to 2-second transition duration (overlap period)
 *
 * Use cases:
 * - Dramatic video transitions with liquid/water theme
 * - Music video transitions synced to intense beats
 * - Action sequence transitions
 * - Dynamic social media content transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),

  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),

  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of vortex transition overlap in seconds'),

  vortexIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for vortex spiral effect (0.5-2)'),

  blurIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .optional()
    .describe('Maximum blur amount in pixels at vortex center'),

  dropletCount: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .optional()
    .describe('Number of water droplet effects to display'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    vortexIntensity = 1,
    blurIntensity = 10,
    dropletCount = 5,
  } = params;

  // Calculate total duration (overlap transition)
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Helper function to generate spiral path keyframes
  const generateSpiralKeyframes = (
    isOutgoing: boolean,
    intensity: number,
  ): Array<{ key: string; val: any; prog: number }> => {
    const frames: Array<{ key: string; val: any; prog: number }> = [];
    const steps = 20; // Number of keyframe steps for smooth spiral

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      
      // Calculate radius (decreasing for outgoing, increasing for incoming)
      const radius = isOutgoing
        ? (1 - prog) * 100 * intensity // Start at 100%, end at 0%
        : prog * 100 * intensity; // Start at 0%, end at 100%

      // Calculate angle (multiple rotations)
      const rotations = isOutgoing ? 3 : -3; // 1080deg = 3 full rotations
      const angle = prog * rotations * 2 * Math.PI; // Convert to radians

      // Calculate circular path using cos/sin
      const translateX = Math.cos(angle) * radius;
      const translateY = Math.sin(angle) * radius;

      // Calculate rotation (accelerating for outgoing, decelerating for incoming)
      const rotation = isOutgoing
        ? prog * 1080 // 0 → 1080deg
        : (prog - 1) * 1080; // -1080deg → 0deg

      // Add translation keyframes
      frames.push(
        { key: 'translateX', val: translateX, prog },
        { key: 'translateY', val: translateY, prog },
        { key: 'rotate', val: rotation, prog },
      );
    }

    return frames;
  };

  // Helper function to generate radial blur keyframes
  const generateBlurKeyframes = (
    isOutgoing: boolean,
    maxBlur: number,
  ): Array<{ key: string; val: any; prog: number }> => {
    const frames: Array<{ key: string; val: any; prog: number }> = [];
    const steps = 10;

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      
      // Blur increases toward center (end for outgoing, start for incoming)
      const blurAmount = isOutgoing
        ? prog * maxBlur // Increase blur as spiraling in
        : (1 - prog) * maxBlur; // Decrease blur as spiraling out

      frames.push({
        key: 'filter',
        val: `blur(${blurAmount}px)`,
        prog,
      });
    }

    return frames;
  };

  // Helper function to generate droplet elements
  const generateDroplets = (count: number): RenderableComponentData[] => {
    const droplets: RenderableComponentData[] = [];
    const positions = [
      { top: '20%', left: '30%' },
      { top: '60%', left: '70%' },
      { top: '40%', left: '80%' },
      { top: '75%', left: '25%' },
      { top: '15%', left: '65%' },
      { top: '50%', left: '15%' },
      { top: '85%', left: '50%' },
      { top: '30%', left: '90%' },
      { top: '70%', left: '40%' },
      { top: '10%', left: '45%' },
    ];

    const shapes = [
      'border-radius: 40% 60% 50% 50%;',
      'border-radius: 60% 40% 60% 40%;',
      'border-radius: 50% 50% 40% 60%;',
      'border-radius: 45% 55% 50% 50%;',
      'border-radius: 55% 45% 60% 40%;',
    ];

    for (let i = 0; i < Math.min(count, 10); i++) {
      const size = 14 + Math.floor(Math.random() * 8); // 14-22px
      const opacity = 0.4 + Math.random() * 0.3; // 0.4-0.7
      const startTime = (i / count) * transitionDuration * 0.6; // Stagger appearance
      const duration = transitionDuration - startTime;
      const shape = shapes[i % shapes.length];
      const position = positions[i % positions.length];

      droplets.push({
        id: `droplet-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; background: rgba(255,255,255,${opacity}); ${shape}"></div>`,
          className: 'absolute',
          style: {
            top: position.top,
            left: position.left,
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: duration,
          },
        },
        effects: [
          {
            id: `droplet-flicker-${i}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [`droplet-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.7, prog: 0.2 },
                { key: 'opacity', val: 0.3, prog: 0.5 },
                { key: 'opacity', val: 0.6, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData);
    }

    return droplets;
  };

  // Determine component IDs based on media type
  const outgoingComponentId =
    outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Build outgoing video with spiral effect
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: outgoingComponentId,
    data: {
      src: outgoingVideo.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
  };

  // Wrapper for outgoing video (target for spiral effect)
  const outgoingWrapper: RenderableComponentData = {
    id: 'outgoing-video-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    childrenData: [outgoingVideoNode],
    effects: [
      {
        id: 'outgoing-spiral-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-wrapper'],
          ranges: [
            ...generateSpiralKeyframes(true, vortexIntensity),
            ...generateBlurKeyframes(true, blurIntensity),
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.9 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.3, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Build incoming video with reverse spiral effect
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: incomingComponentId,
    data: {
      src: incomingVideo.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
  };

  // Wrapper for incoming video (target for reverse spiral effect)
  const incomingWrapper: RenderableComponentData = {
    id: 'incoming-video-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    childrenData: [incomingVideoNode],
    effects: [
      {
        id: 'incoming-spiral-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-wrapper'],
          ranges: [
            ...generateSpiralKeyframes(false, vortexIntensity),
            ...generateBlurKeyframes(false, blurIntensity),
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'scale', val: 0.3, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };

  // Droplets container
  const dropletsContainer: RenderableComponentData = {
    id: 'droplets-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    childrenData: generateDroplets(dropletCount),
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'hydrokinetic-vortex-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative rounded-full aspect-square mx-auto overflow-hidden',
        style: {
          width: '100%',
          maxWidth: '800px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingWrapper, incomingWrapper, dropletsContainer],
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
  id: 'hydrokinetic-vortex-transition',
  title: 'Hydrokinetic Vortex Transition',
  description:
    'A liquid whirlpool transition effect that spirals outgoing video into a vortex center while incoming video emerges from the same point with reverse spiral motion, featuring centrifugal blur and water droplet effects',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vortex',
    'whirlpool',
    'liquid',
    'water',
    'spiral',
    'kinetic',
    'dynamic',
    'video',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 2,
    vortexIntensity: 1,
    blurIntensity: 10,
    dropletCount: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const hydrokineticVortexTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
