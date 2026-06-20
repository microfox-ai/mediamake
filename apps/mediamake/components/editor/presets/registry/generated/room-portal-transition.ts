/**
 * 3D Room Portal Transition Preset
 *
 * This preset creates a cinematic 3D room perspective push transition where the camera
 * appears to move through a doorway from one video scene to another. The transition
 * simulates depth by scaling the outgoing video down while revealing the incoming video
 * behind it, as if passing through a portal.
 *
 * Features:
 * - **3D Perspective Transform**: CSS 3D transforms with perspective (1000px) for depth illusion
 * - **Dual Video Scaling**: Outgoing video scales from 100% to 0%, incoming from 120% to 100%
 * - **Custom Easing**: Ease-out curve for smooth, natural motion
 * - **Vignette Effect**: Subtle edge darkening during transition for cinematic feel
 * - **Shake Effect**: Physical movement simulation during threshold crossing (0.5s-1s)
 * - **Rotation Effects**: Slight Y-axis rotation for enhanced depth perception
 * - **1.5-Second Overlap**: Precise timing for seamless portal illusion
 *
 * Use Cases:
 * - Scene transitions with depth and dimension
 * - Portal/doorway effects between video clips
 * - Immersive camera movement simulations
 * - Cinematic video montages with 3D flair
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition overlap in seconds (default: 1.5s)'),
    
  shakeIntensity: z
    .number()
    .default(5)
    .describe('Intensity of the shake effect in pixels (default: 5)'),
    
  vignetteStrength: z
    .number()
    .default(0.6)
    .describe('Strength of the vignette darkening effect (0-1, default: 0.6)'),
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
    shakeIntensity,
    vignetteStrength,
  } = params;

  // Calculate BaseLayout duration: sum of videos minus overlap
  const baseLayoutDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate transition timing points
  const transitionStart = video1.duration - transitionDuration;
  const shakeStart = transitionDuration * 0.333; // Start at 0.5s into transition (relative to incoming)
  const shakeDuration = transitionDuration * 0.333; // 0.5s shake duration
  const vignetteHalfway = transitionDuration / 2;

  // Random shake values (fixed for consistency)
  const generateShakeRanges = () => {
    const numShakes = 8;
    const ranges = [];
    for (let i = 0; i <= numShakes; i++) {
      const progress = i / numShakes;
      const randomX = (Math.random() - 0.5) * shakeIntensity * 2;
      const randomY = (Math.random() - 0.5) * shakeIntensity * 2;
      ranges.push(
        { key: 'translateX', val: `${randomX}px`, prog: progress },
        { key: 'translateY', val: `${randomY}px`, prog: progress }
      );
    }
    return ranges;
  };

  // Outgoing video with scale-down and rotate effect
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        transformStyle: 'preserve-3d',
        transformOrigin: 'center center',
        zIndex: 2,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-transform',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0, prog: 1 },
            { key: 'rotateY', val: '0deg', prog: 0 },
            { key: 'rotateY', val: '-5deg', prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video with scale-in and rotate effect
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        transformStyle: 'preserve-3d',
        transformOrigin: 'center center',
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-transform',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'scale', val: 1.2, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'rotateY', val: '5deg', prog: 0 },
            { key: 'rotateY', val: '0deg', prog: 1 },
            { key: 'translateZ', val: '100px', prog: 0 },
            { key: 'translateZ', val: '0px', prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-shake',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: shakeStart,
          duration: shakeDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: generateShakeRanges(),
        },
      },
    ],
  };

  // Vignette overlay effect
  const vignetteOverlay: RenderableComponentData = {
    id: 'vignette-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="w-full h-full"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 3,
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteStrength}) 100%)`,
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'vignette-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['vignette-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'room-portal-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [outgoingVideo, incomingVideo, vignetteOverlay],
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
  id: 'room-portal-transition',
  title: '3D Room Portal Transition',
  description:
    'A cinematic 3D room perspective push transition where the camera appears to move through a doorway from one video scene to another. Features CSS 3D transforms with perspective, scale animations with custom easing, vignette darkening effect, and a subtle shake during the threshold crossing. Creates the illusion of physically pushing through a portal into a new space.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'portal', 'doorway', 'perspective', 'cinematic', 'depth'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.5,
    shakeIntensity: 5,
    vignetteStrength: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const roomPortalTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
