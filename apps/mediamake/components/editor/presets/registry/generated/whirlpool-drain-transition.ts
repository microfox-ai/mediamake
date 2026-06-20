/**
 * Whirlpool Drain Transition Preset
 *
 * Creates an aggressive whirlpool drain transition where the outgoing video appears to be sucked
 * down a drain with increasing rotational speed and distortion. Features a 1.2-second overlap
 * with accelerating rotation (ease-in-cubic from 0 to 1080 degrees) combined with a spiral path
 * animation following a logarithmic spiral inward.
 *
 * Technical Implementation:
 * - Outgoing video: Rotates 0→1080deg (ease-in-cubic), scales 1→0, follows spiral path inward
 * - Incoming video: Rotates 1080→0deg (ease-out-cubic), scales 0→1, follows reverse spiral path
 * - Logarithmic spiral: x = r*cos(θ)*e^(-θ/4), y = r*sin(θ)*e^(-θ/4)
 * - Box-shadow blur for depth (0→30px on outgoing, 30px→0 on incoming)
 * - Sepia filter (0→0.5) on outgoing video
 * - Transform-origin at center (50% 50%)
 * - Proper z-index layering (incoming on top)
 *
 * Features:
 * - Aggressive whirlpool drain effect with spiral path animation
 * - Accelerating and decelerating rotation (1080 degrees)
 * - Scale animations synchronized with rotation
 * - Logarithmic spiral path for authentic vortex motion
 * - Depth effects via box-shadow blur
 * - Sepia filter on outgoing for aged/drain aesthetic
 * - 1.2-second overlap duration
 * - Supports both video and image media types
 *
 * Use Cases:
 * - Dramatic scene transitions
 * - Time-travel or flashback effects
 * - Energy/power drain visual metaphors
 * - Dynamic video montages
 * - Creative storytelling transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video/image'),
    type: z
      .enum(['video', 'image'])
      .optional()
      .describe('Media type (auto-detected if not specified)'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video/image'),
    type: z
      .enum(['video', 'image'])
      .optional()
      .describe('Media type (auto-detected if not specified)'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the transition overlap in seconds'),
  spiralRotations: z
    .number()
    .default(2)
    .describe('Number of spiral rotations (controls spiral tightness)'),
  spiralRadius: z
    .number()
    .optional()
    .describe(
      'Maximum spiral radius in pixels (defaults to diagonal of viewport)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, overlapDuration } = params;

  // Helper function to determine media component type
  const getMediaComponentId = (
    src: string,
    type?: 'video' | 'image',
  ): 'VideoAtom' | 'ImageAtom' => {
    if (type === 'video') return 'VideoAtom';
    if (type === 'image') return 'ImageAtom';
    // Auto-detect from extension
    if (src.match(/\.(mp4|webm|mov|avi|mkv)$/i)) return 'VideoAtom';
    return 'ImageAtom';
  };

  // Calculate total duration (sum minus overlap)
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - overlapDuration;

  // Calculate spiral coordinates using logarithmic spiral formula
  // x = r * cos(θ) * e^(-θ/4)
  // y = r * sin(θ) * e^(-θ/4)
  const calculateSpiralEndpoint = () => {
    const viewportWidth = props.config?.width || 1920;
    const viewportHeight = props.config?.height || 1080;
    const diagonalRadius = Math.sqrt(
      viewportWidth * viewportWidth + viewportHeight * viewportHeight,
    );
    const radius = params.spiralRadius || diagonalRadius / 2;
    const spiralRotations = params.spiralRotations || 2;
    const theta = spiralRotations * 2 * Math.PI; // Convert rotations to radians

    const decayFactor = 4; // Controls spiral tightness
    const spiralEndX = radius * Math.cos(theta) * Math.exp(-theta / decayFactor);
    const spiralEndY = radius * Math.sin(theta) * Math.exp(-theta / decayFactor);

    return { x: spiralEndX, y: spiralEndY };
  };

  const spiralEnd = calculateSpiralEndpoint();

  // Determine component IDs
  const outgoingComponentId = getMediaComponentId(
    outgoingVideo.src,
    outgoingVideo.type,
  );
  const incomingComponentId = getMediaComponentId(
    incomingVideo.src,
    incomingVideo.type,
  );

  // Build outgoing video container with effects
  const outgoingContainer: RenderableComponentData = {
    id: 'whirlpool-outgoing-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 20,
          transformOrigin: '50% 50%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      // Rotation: 0→1080deg (ease-in-cubic)
      {
        id: 'outgoing-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-in-cubic',
          start: outgoingVideo.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['whirlpool-outgoing-container'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 1080, prog: 1 },
          ],
        },
      },
      // Scale: 1→0
      {
        id: 'outgoing-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-cubic',
          start: outgoingVideo.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['whirlpool-outgoing-container'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0, prog: 1 },
          ],
        },
      },
      // Spiral path (translateX)
      {
        id: 'outgoing-spiral-x',
        componentId: 'generic',
        data: {
          type: 'ease-in-cubic',
          start: outgoingVideo.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['whirlpool-outgoing-container'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: spiralEnd.x, prog: 1 },
          ],
        },
      },
      // Spiral path (translateY)
      {
        id: 'outgoing-spiral-y',
        componentId: 'generic',
        data: {
          type: 'ease-in-cubic',
          start: outgoingVideo.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['whirlpool-outgoing-container'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: spiralEnd.y, prog: 1 },
          ],
        },
      },
      // Box-shadow blur: 0→30px
      {
        id: 'outgoing-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in-cubic',
          start: outgoingVideo.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['whirlpool-outgoing-container'],
          ranges: [
            { key: 'boxShadow', val: '0 0 0px rgba(0,0,0,0)', prog: 0 },
            { key: 'boxShadow', val: '0 0 30px rgba(0,0,0,0.8)', prog: 1 },
          ],
        },
      },
      // Sepia filter: 0→0.5
      {
        id: 'outgoing-sepia',
        componentId: 'generic',
        data: {
          type: 'ease-in-cubic',
          start: outgoingVideo.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['whirlpool-outgoing-container'],
          ranges: [
            { key: 'sepia', val: 0, prog: 0 },
            { key: 'sepia', val: 0.5, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'whirlpool-outgoing-video',
        type: 'atom',
        componentId: outgoingComponentId,
        data: {
          src: outgoingVideo.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Build incoming video container with effects
  const incomingContainer: RenderableComponentData = {
    id: 'whirlpool-incoming-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 30,
          transformOrigin: '50% 50%',
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - overlapDuration,
        duration: incomingVideo.duration + overlapDuration,
      },
    },
    effects: [
      // Rotation: 1080→0deg (ease-out-cubic)
      {
        id: 'incoming-rotation',
        componentId: 'generic',
        data: {
          type: 'ease-out-cubic',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['whirlpool-incoming-container'],
          ranges: [
            { key: 'rotate', val: 1080, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
      // Scale: 0→1
      {
        id: 'incoming-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out-cubic',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['whirlpool-incoming-container'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Reverse spiral path (translateX)
      {
        id: 'incoming-spiral-x',
        componentId: 'generic',
        data: {
          type: 'ease-out-cubic',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['whirlpool-incoming-container'],
          ranges: [
            { key: 'translateX', val: spiralEnd.x, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      // Reverse spiral path (translateY)
      {
        id: 'incoming-spiral-y',
        componentId: 'generic',
        data: {
          type: 'ease-out-cubic',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['whirlpool-incoming-container'],
          ranges: [
            { key: 'translateY', val: spiralEnd.y, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
      // Box-shadow blur: 30px→0
      {
        id: 'incoming-blur',
        componentId: 'generic',
        data: {
          type: 'ease-out-cubic',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['whirlpool-incoming-container'],
          ranges: [
            { key: 'boxShadow', val: '0 0 30px rgba(0,0,0,0.8)', prog: 0 },
            { key: 'boxShadow', val: '0 0 0px rgba(0,0,0,0)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'whirlpool-incoming-video',
        type: 'atom',
        componentId: incomingComponentId,
        data: {
          src: incomingVideo.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideo.duration + overlapDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'whirlpool-drain-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
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
  id: 'whirlpool-drain-transition',
  title: 'Whirlpool Drain Transition',
  description:
    'Aggressive whirlpool drain transition with logarithmic spiral path, accelerating rotation (0→1080° ease-in-cubic), scale animations (1→0), and reverse emergence effect. Features box-shadow blur depth and sepia filter on outgoing video. 1.2s overlap duration with proper relative timing for video transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'whirlpool',
    'drain',
    'spiral',
    'rotation',
    'vortex',
    'dramatic',
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
    overlapDuration: 1.2,
    spiralRotations: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const whirlpoolDrainTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
