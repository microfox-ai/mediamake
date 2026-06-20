/**
 * Corner Peel Transition Preset
 *
 * A realistic sticker peel transition where the outgoing video appears printed on a sticker
 * that peels away from the bottom-left corner diagonally toward the top-right. Features:
 * - Two-stage animation: corner lift with bounce, then full peel acceleration
 * - White paper backing texture briefly visible during peel
 * - Dynamic shadow that changes angle as video lifts
 * - Subtle warping effect simulating flexible material
 * - Incoming video revealed underneath with spring scale animation
 *
 * Technical implementation:
 * - Single BaseLayout container with absolute positioning and overflow-hidden
 * - Outgoing VideoAtom with complex transform animation using multiple keyframes
 * - Clip-path animation to create diagonal peel shape
 * - Drop-shadow filter with increasing blur for realistic shadow
 * - Paper backing layer with gradient texture
 * - Incoming video with scale animation from 0.95 to 1.0
 * - Overlap duration: 1.2 seconds with staggered effect timing
 *
 * Use cases:
 * - Video transitions with tactile, physical feel
 * - Creative page-turn effects
 * - Revealing content with realistic peeling motion
 * - Social media content with unique transitions
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
    src: z.string().describe('Source URL of outgoing video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.2)
    .describe('Duration of transition overlap in seconds'),
  cornerLiftDuration: z
    .number()
    .default(0.3)
    .describe('Duration of initial corner lift phase in seconds'),
  peelIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for peel animation'),
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
    cornerLiftDuration,
    peelIntensity,
  } = params;

  // Calculate timing
  const baseLayoutDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;
  const peelStartTime = outgoingVideo.duration - transitionDuration;
  const fullPeelDuration = transitionDuration - cornerLiftDuration;

  // Determine component IDs for media
  const outgoingComponentId =
    outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId =
    incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Helper: Create clip-path keyframes for diagonal peel
  const createClipPathRanges = () => {
    return [
      // Initial state - full rectangle
      {
        key: 'clipPath',
        val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
        prog: 0,
      },
      // After corner lift - small triangle missing from bottom-left
      {
        key: 'clipPath',
        val: 'polygon(0% 0%, 100% 0%, 100% 100%, 8% 100%, 0% 92%)',
        prog: cornerLiftDuration / transitionDuration,
      },
      // Mid peel - diagonal peel shape
      {
        key: 'clipPath',
        val: 'polygon(0% 0%, 100% 0%, 70% 30%, 30% 70%, 0% 40%)',
        prog: 0.5,
      },
      // Final peel - almost gone
      {
        key: 'clipPath',
        val: 'polygon(0% 0%, 30% 0%, 20% 10%, 10% 20%, 0% 10%)',
        prog: 1,
      },
    ];
  };

  // Incoming video (revealed underneath)
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: incomingComponentId,
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: peelStartTime,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-scale-animation',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: Math.min(0.8, transitionDuration * 0.67),
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Paper backing layer (briefly visible)
  const paperBackingNode: RenderableComponentData = {
    id: 'paper-backing',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 2,
          backgroundColor: '#f5f5f0',
          backgroundImage:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
        },
      },
    },
    context: {
      timing: {
        start: peelStartTime + 0.15,
        duration: 0.35,
      },
    },
    effects: [
      {
        id: 'paper-fade-in-out',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 0.35,
          mode: 'provider',
          targetIds: ['paper-backing'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 0.5, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Adhesive edge effect (at peeling edge)
  const adhesiveEdgeNode: RenderableComponentData = {
    id: 'adhesive-edge',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          bottom: '0',
          left: '0',
          width: '150px',
          height: '150px',
          background:
            'linear-gradient(45deg, rgba(255,255,255,0.9) 0%, rgba(240,240,230,0.7) 50%, transparent 100%)',
          transformOrigin: 'bottom left',
          pointerEvents: 'none',
          zIndex: 5,
        },
      },
    },
    context: {
      timing: {
        start: peelStartTime,
        duration: cornerLiftDuration + 0.2,
      },
    },
    effects: [
      {
        id: 'adhesive-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: cornerLiftDuration + 0.2,
          mode: 'provider',
          targetIds: ['adhesive-edge'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing video (peeling away)
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
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
  };

  // Outgoing video container (with transform and effects)
  const outgoingContainerNode: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 3,
          transformOrigin: 'bottom left',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    childrenData: [outgoingVideoNode, adhesiveEdgeNode],
    effects: [
      // Stage 1: Corner lift with subtle bounce
      {
        id: 'corner-lift',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: peelStartTime,
          duration: cornerLiftDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.98, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: -2 * peelIntensity, prog: 1 },
          ],
        },
      },
      // Stage 2: Full peel motion (accelerating)
      {
        id: 'full-peel',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: peelStartTime + cornerLiftDuration,
          duration: fullPeelDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: `${150 * peelIntensity}%`, prog: 1 },
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: `${-150 * peelIntensity}%`, prog: 1 },
            { key: 'rotate', val: -2 * peelIntensity, prog: 0 },
            { key: 'rotate', val: -45 * peelIntensity, prog: 1 },
            { key: 'scale', val: 0.98, prog: 0 },
            { key: 'scale', val: 0.7, prog: 1 },
          ],
        },
      },
      // Clip-path animation for peel shape
      {
        id: 'peel-clip-path',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: peelStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: createClipPathRanges(),
        },
      },
      // Shadow animation (increasing blur as it lifts)
      {
        id: 'peel-shadow',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: peelStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            {
              key: 'filter',
              val: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
              prog: 0,
            },
            {
              key: 'filter',
              val: 'drop-shadow(8px 8px 12px rgba(0,0,0,0.4))',
              prog: 0.3,
            },
            {
              key: 'filter',
              val: 'drop-shadow(20px 20px 30px rgba(0,0,0,0.5))',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'corner-peel-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1500px',
          perspectiveOrigin: 'bottom left',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      incomingVideoNode,
      paperBackingNode,
      outgoingContainerNode,
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
  id: 'corner-peel-transition',
  title: 'Corner Peel Transition',
  description:
    'A realistic sticker peel transition where the outgoing video appears printed on a sticker that peels away from the bottom-left corner diagonally toward the top-right. Features two-stage animation (corner lift with bounce, then accelerating peel), white paper backing texture, dynamic shadow that changes angle, and subtle warping effect on the peeling portion. The incoming video is revealed underneath with a spring scale animation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'peel',
    'sticker',
    'corner',
    'diagonal',
    'realistic',
    'physical',
    'paper',
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
    transitionDuration: 1.2,
    cornerLiftDuration: 0.3,
    peelIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cornerPeelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
