/**
 * Tilt-Shift Stop Motion Transition Preset
 *
 * This preset creates a tilt-shift stop-motion transition effect that simulates miniature photography
 * with selective focus shifts and micro position adjustments. The outgoing video gradually blurs from
 * sharp to heavily blurred while shifting upward, and the incoming video starts heavily blurred and
 * shifts into focus while moving down into position. A gradient mask enhances the tilt-shift effect
 * by making edges blur more dramatically while the center stays relatively sharp. Subtle saturation
 * boost during the transition enhances the miniature effect.
 *
 * Features:
 * - Progressive blur transition (0px to 8px) simulating focus shift
 * - Micro position adjustments (translateY movements) for stop-motion feel
 * - Gradient mask overlay for enhanced tilt-shift effect
 * - Saturation boost during transition for miniature photography aesthetic
 * - Brightness adjustment for depth perception
 * - 0.6s overlap duration for smooth transition
 *
 * Use cases:
 * - Creating miniature photography effects between video clips
 * - Stop-motion style transitions for creative projects
 * - Artistic video transitions with selective focus aesthetics
 * - Enhancing video storytelling with unique visual transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of the first (outgoing) video'),
      duration: z.number().describe('Duration of the first video in seconds'),
    })
    .describe('First video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second (incoming) video'),
      duration: z.number().describe('Duration of the second video in seconds'),
    })
    .describe('Second video configuration'),
  transitionDuration: z
    .number()
    .default(0.6)
    .describe('Duration of the transition overlap in seconds'),
  upwardShift: z
    .number()
    .default(15)
    .describe('Upward shift distance in pixels for outgoing video'),
  downwardShift: z
    .number()
    .default(15)
    .describe('Downward shift distance in pixels for incoming video'),
  maxBlur: z
    .number()
    .default(8)
    .describe('Maximum blur amount in pixels during transition'),
  saturationBoost: z
    .number()
    .default(1.3)
    .describe('Saturation multiplier during transition'),
  brightnessAdjustment: z
    .number()
    .default(0.9)
    .describe('Brightness multiplier during transition'),
  maskOpacity: z
    .number()
    .default(0.3)
    .describe('Opacity of the tilt-shift gradient mask'),
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
    upwardShift,
    downwardShift,
    maxBlur,
    saturationBoost,
    brightnessAdjustment,
    maskOpacity,
  } = params;

  // Calculate total duration (sum of both videos minus the overlap)
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Create outgoing video with transition effects
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-tilt-shift-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            // Blur from 0 to max
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: maxBlur, prog: 1 },
            // Brightness adjustment
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: brightnessAdjustment, prog: 1 },
            // Saturation boost
            { key: 'saturate', val: 1, prog: 0 },
            { key: 'saturate', val: saturationBoost, prog: 1 },
            // Upward shift
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -upwardShift, prog: 1 },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video with transition effects
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-tilt-shift-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            // Blur from max to 0
            { key: 'blur', val: maxBlur, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
            // Brightness adjustment
            { key: 'brightness', val: brightnessAdjustment, prog: 0 },
            { key: 'brightness', val: 1, prog: 1 },
            // Saturation boost
            { key: 'saturate', val: saturationBoost, prog: 0 },
            { key: 'saturate', val: 1, prog: 1 },
            // Downward shift
            { key: 'translateY', val: downwardShift, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create tilt-shift gradient mask
  const tiltShiftMask: RenderableComponentData = {
    id: 'tilt-shift-mask',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30 mix-blend-multiply pointer-events-none" style="opacity: ${maskOpacity};"></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'tilt-shift-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideo, incomingVideo, tiltShiftMask],
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
  id: 'tilt-shift-stop-motion-transition',
  title: 'Tilt-Shift Stop Motion Transition',
  description:
    'A video transition preset that simulates miniature photography with selective focus shifts and micro position adjustments. Creates a tilt-shift stop motion effect where the outgoing video blurs and shifts upward while the incoming video emerges from blur and shifts downward into position. Features a gradient mask overlay to enhance the miniature photography aesthetic with edge blur and center sharpness, plus saturation boost during the transition.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'tilt-shift', 'stop-motion', 'miniature', 'blur'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 0.6,
    upwardShift: 15,
    downwardShift: 15,
    maxBlur: 8,
    saturationBoost: 1.3,
    brightnessAdjustment: 0.9,
    maskOpacity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const tiltShiftStopMotionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
