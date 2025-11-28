/**
 * High-Speed Rotational Spin Blur Warp Transition Preset
 *
 * Creates a dynamic 360-degree spiral twist transition between two video clips with:
 * - Clockwise rotation (0→360deg) on outgoing video
 * - Counter-clockwise rotation (-360→0deg) on incoming video
 * - Progressive blur effects (0→20px outgoing, 20→0px incoming)
 * - Scale animations (1→0.3 outgoing, 0.3→1 incoming)
 * - Elastic cubic-bezier easing for bouncy spin effect
 * - Shake effect during peak rotation (0.4-0.6s into transition)
 * - 1-second overlap period for seamless transition
 *
 * Technical implementation:
 * - Uses generic effects with provider mode targeting specific video atoms
 * - Z-index layering with incoming video on top (z-10)
 * - Absolute positioning with inset-0 for full-screen coverage
 * - Container shake applied to parent layout during transition peak
 *
 * Use cases:
 * - High-energy video transitions with dramatic effect
 * - Music video cuts and beat-synced transitions
 * - Action sequences and dynamic content changes
 * - Creative montages with rotational motion emphasis
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters ---
const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of the first video (outgoing)'),
      duration: z.number().describe('Duration of first video in seconds'),
    })
    .describe('First video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second video (incoming)'),
      duration: z.number().describe('Duration of second video in seconds'),
    })
    .describe('Second video configuration'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the transition overlap in seconds'),
  blurIntensity: z
    .number()
    .default(20)
    .describe('Maximum blur intensity in pixels during transition'),
  shakeIntensity: z
    .number()
    .default(10)
    .describe('Shake intensity in pixels during peak rotation'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, blurIntensity, shakeIntensity } =
    params;

  // Calculate total duration with overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Transition starts at this time (relative to container)
  const transitionStart = video1.duration - transitionDuration;

  // Shake timing: 0.4-0.6s into transition (relative to container)
  const shakeStart = transitionStart + 0.4;
  const shakeDuration = 0.2;

  // Elastic easing for bouncy spin effect
  const elasticEasing = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';

  // --- Video 1 (Outgoing) ---
  const video1Atom: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-spin-blur-effect',
        componentId: 'generic',
        data: {
          type: elasticEasing,
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            // Rotate clockwise
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 360, prog: 1 },
            // Scale down
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.3, prog: 1 },
            // Blur out
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: blurIntensity, prog: 1 },
          ],
        },
      },
    ],
  };

  // --- Video 2 (Incoming) ---
  const video2Atom: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 object-cover z-10',
      fit: 'cover',
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-spin-blur-effect',
        componentId: 'generic',
        data: {
          type: elasticEasing,
          start: 0, // Relative to incoming video start
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            // Rotate counter-clockwise
            { key: 'rotate', val: -360, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            // Scale up
            { key: 'scale', val: 0.3, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            // Blur in
            { key: 'blur', val: blurIntensity, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // --- Root Container with Shake Effect ---
  const rootContainer: RenderableComponentData = {
    id: 'spin-blur-warp-transition-container',
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
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: shakeStart,
          duration: shakeDuration,
          mode: 'provider',
          targetIds: ['spin-blur-warp-transition-container'],
          ranges: [
            // Shake X-axis
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: shakeIntensity, prog: 0.25 },
            { key: 'translateX', val: -shakeIntensity, prog: 0.5 },
            { key: 'translateX', val: shakeIntensity * 0.8, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
            // Shake Y-axis
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -shakeIntensity * 0.8, prog: 0.33 },
            { key: 'translateY', val: shakeIntensity * 0.8, prog: 0.66 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [video1Atom, video2Atom] as RenderableComponentData[],
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
  id: 'spin-blur-warp-transition',
  title: 'High-Speed Rotational Spin Blur Warp Transition',
  description:
    'A 360-degree spiral twist transition between two video clips with elastic spin effect, progressive blur (0-20px), and shake dynamics during peak rotation. Implements clockwise/counter-clockwise rotation with scale animations and z-index layering over a 1-second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'spin',
    'rotation',
    'blur',
    'warp',
    'shake',
    'elastic',
    'dynamic',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.0,
    blurIntensity: 20,
    shakeIntensity: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---
export const spinBlurWarpTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
