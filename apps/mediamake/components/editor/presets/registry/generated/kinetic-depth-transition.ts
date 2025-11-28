/**
 * Kinetic Depth Transition Preset
 *
 * Simulates camera movement through 3D space between video scenes. Creates a cinematic dolly effect
 * where the camera pushes through the outgoing video (scales up beyond viewport while fading) and
 * pulls into the incoming video (scales from tiny point to full size). Features multi-axis rotation,
 * dynamic motion blur based on distance from camera, and impact shake at transition midpoint.
 *
 * Features:
 * - **3D Perspective Camera**: 2000px perspective for depth simulation
 * - **Camera Dolly Effect**: Push through outgoing, pull into incoming video
 * - **Multi-Axis Rotation**: Y-axis rotation simulates camera roll during movement
 * - **Dynamic Motion Blur**: Velocity-based blur (0-12px) peaking at midpoint
 * - **Impact Shake**: Brief shake effect at transition midpoint for dynamic impact
 * - **Z-Space Movement**: translateZ creates depth illusion (outgoing: 0→500px, incoming: -1000px→0)
 * - **Clean 3D Rendering**: Uses transform-style preserve-3d and backface-visibility hidden
 *
 * Use cases:
 * - Cinematic video transitions with depth
 * - Scene changes with camera movement simulation
 * - High-impact video cuts with 3D effects
 * - Professional video editing with spatial transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video (video transitioning out)'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video (video transitioning in)'),
  transitionDuration: z
    .number()
    .default(1.6)
    .describe('Duration of the transition effect in seconds'),
  outgoingVideoDuration: z
    .number()
    .describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z
    .number()
    .describe('Duration of the incoming video in seconds'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .optional()
    .describe('Intensity of the shake effect at midpoint in pixels'),
  maxBlur: z
    .number()
    .min(0)
    .max(20)
    .default(12)
    .optional()
    .describe('Maximum blur amount during fast movement in pixels'),
  perspectiveDepth: z
    .number()
    .min(500)
    .max(5000)
    .default(2000)
    .optional()
    .describe('Perspective depth for 3D space simulation in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

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
    shakeIntensity = 10,
    maxBlur = 12,
    perspectiveDepth = 2000,
  } = params;

  // Calculate overlap timing
  const totalDuration =
    outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Shake timing (at midpoint of transition)
  const shakeDuration = 0.2;
  const shakeStart = transitionDuration / 2 - shakeDuration / 2;

  // Helper: Create shake oscillation keyframes
  const createShakeRanges = (axis: 'translateX' | 'translateY') => {
    const oscillations = 4; // Number of shake oscillations
    const ranges = [];
    for (let i = 0; i <= oscillations; i++) {
      const prog = i / oscillations;
      const direction = i % 2 === 0 ? 1 : -1;
      const decay = 1 - prog * 0.5; // Decay shake over time
      ranges.push({
        key: axis,
        val: `${direction * shakeIntensity * decay}px`,
        prog: prog,
      });
    }
    return ranges;
  };

  // ============================================================================
  // OUTGOING VIDEO (Push through - scales up, fades out, rotates)
  // ============================================================================

  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full',
          style: {
            width: '100%',
            height: '100%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideoDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Main transition effect: scale, translateZ, rotate, opacity
      {
        id: 'outgoing-transition-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingVideoDuration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            // Scale from 1 to 3 (push through)
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 3, prog: 1 },
            // TranslateZ from 0 to 500px (move toward camera)
            { key: 'translateZ', val: '0px', prog: 0 },
            { key: 'translateZ', val: '500px', prog: 1 },
            // RotateY from 0 to -45deg
            { key: 'rotateY', val: '0deg', prog: 0 },
            { key: 'rotateY', val: '-45deg', prog: 1 },
            // Opacity from 1 to 0
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Motion blur effect (velocity curve)
      {
        id: 'outgoing-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideoDuration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Shake effect at midpoint
      {
        id: 'outgoing-shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: outgoingVideoDuration - transitionDuration + shakeStart,
          duration: shakeDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [...createShakeRanges('translateX')],
        },
      },
    ],
  };

  // ============================================================================
  // INCOMING VIDEO (Pull into - scales from tiny to full, fades in, rotates)
  // ============================================================================

  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideoDuration - transitionDuration,
        duration: incomingVideoDuration + transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          className: 'w-full h-full',
          style: {
            width: '100%',
            height: '100%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideoDuration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Main transition effect: scale, translateZ, rotate, opacity
      {
        id: 'incoming-transition-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            // Scale from 0.1 to 1 (pull into)
            { key: 'scale', val: 0.1, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // TranslateZ from -1000px to 0 (move away from camera to normal)
            { key: 'translateZ', val: '-1000px', prog: 0 },
            { key: 'translateZ', val: '0px', prog: 1 },
            // RotateY from 45deg to 0
            { key: 'rotateY', val: '45deg', prog: 0 },
            { key: 'rotateY', val: '0deg', prog: 1 },
            // Opacity from 0 to 1
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Motion blur effect (velocity curve)
      {
        id: 'incoming-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0 },
            { key: 'filter', val: `blur(${maxBlur}px)`, prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Shake effect at midpoint
      {
        id: 'incoming-shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: shakeStart,
          duration: shakeDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [...createShakeRanges('translateY')],
        },
      },
    ],
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'kinetic-depth-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: `${perspectiveDepth}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideoContainer, incomingVideoContainer],
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'kinetic-depth-transition',
  title: 'Kinetic Depth Transition',
  description:
    'A cinematic 3D camera dolly transition effect that simulates movement through 3D space between video scenes. Features perspective-based video planes, multi-axis rotation, velocity-based motion blur, and impact shake at the transition midpoint. Uses CSS 3D transforms with preserve-3d and backface-visibility for clean rendering.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    '3d',
    'camera',
    'dolly',
    'kinetic',
    'depth',
    'blur',
    'shake',
    'cinematic',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    transitionDuration: 1.6,
    outgoingVideoDuration: 10,
    incomingVideoDuration: 10,
    shakeIntensity: 10,
    maxBlur: 12,
    perspectiveDepth: 2000,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const kineticDepthTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
