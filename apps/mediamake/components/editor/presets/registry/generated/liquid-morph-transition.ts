/**
 * Liquid Morph Transition Preset
 *
 * This preset creates a fluid dynamics-inspired transition effect that simulates liquid morphing
 * between video clips. The outgoing video warps and liquifies using wave distortions while the
 * incoming video emerges through the distortion.
 *
 * Features:
 * - **Wave-based distortion effects**: Multiple layers with different wave patterns
 * - **Layered composition**: Main videos plus 2-3 semi-transparent overlay copies
 * - **Blend modes**: Overlay, soft-light, and screen blend modes for depth
 * - **CSS transform animations**: ScaleX, skewY oscillations simulating wave motion
 * - **Backdrop blur overlay**: Fades out to reveal clean incoming video
 * - **Midpoint peak**: Distortion peaks at the midpoint then settles
 *
 * Use cases:
 * - Creating smooth liquid-like transitions between video clips
 * - Building fluid motion effects for video montages
 * - Adding artistic warping effects to video sequences
 * - Creating dynamic transitions with layered distortion
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    startFrom: z.number().optional().default(0).describe('Start time in seconds for incoming video'),
  }).describe('Incoming video configuration'),
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    startFrom: z.number().optional().default(0).describe('Start time in seconds for outgoing video'),
  }).describe('Outgoing video configuration'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Duration of transition in seconds'),
  waveAmplitude: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Amplitude of wave distortion in pixels'),
  waveFrequency: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Frequency of wave oscillations'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    incomingVideo,
    outgoingVideo,
    transitionDuration,
    waveAmplitude,
    waveFrequency,
  } = params;

  const duration = transitionDuration;
  const midpoint = duration / 2;

  // Calculate wave keyframe progress values
  const peakProg = 0.5; // Midpoint

  // Incoming video base layer - scales from 0.9 to 1
  const incomingVideoBase: RenderableComponentData = {
    id: 'incoming-video-base',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom || 0,
      fit: 'cover',
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'incoming-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['incoming-video-base'],
          ranges: [
            { key: 'scale', val: 0.9, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing video base layer - fades from 1 to 0
  const outgoingVideoBase: RenderableComponentData = {
    id: 'outgoing-video-base',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom || 0,
      fit: 'cover',
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'outgoing-fade-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['outgoing-video-base'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Distortion layer 1: Overlay blend mode with wave motion
  const distortionLayer1: RenderableComponentData = {
    id: 'distortion-layer-1',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom || 0,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        opacity: 0.6,
        mixBlendMode: 'overlay',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // ScaleX wave motion (1 -> 1.1 -> 1)
      {
        id: 'distortion-1-scaleX',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-sine',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['distortion-layer-1'],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 1.1, prog: peakProg },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      },
      // SkewY wave motion (0 -> 5deg -> 0deg)
      {
        id: 'distortion-1-skewY',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-sine',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['distortion-layer-1'],
          ranges: [
            { key: 'skewY', val: '0deg', prog: 0 },
            { key: 'skewY', val: '5deg', prog: peakProg },
            { key: 'skewY', val: '0deg', prog: 1 },
          ],
        },
      },
      // TranslateY oscillation
      {
        id: 'distortion-1-translateY',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-sine',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['distortion-layer-1'],
          ranges: [
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: `${waveAmplitude}px`, prog: peakProg },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      },
    ],
  };

  // Distortion layer 2: Soft-light blend mode with different wave pattern
  const distortionLayer2: RenderableComponentData = {
    id: 'distortion-layer-2',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom || 0,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        opacity: 0.4,
        mixBlendMode: 'soft-light',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // ScaleY wave motion (1 -> 1.15 -> 1)
      {
        id: 'distortion-2-scaleY',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-sine',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['distortion-layer-2'],
          ranges: [
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 1.15, prog: peakProg },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        },
      },
      // SkewX wave motion (0 -> -3deg -> 0deg)
      {
        id: 'distortion-2-skewX',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-sine',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['distortion-layer-2'],
          ranges: [
            { key: 'skewX', val: '0deg', prog: 0 },
            { key: 'skewX', val: '-3deg', prog: peakProg },
            { key: 'skewX', val: '0deg', prog: 1 },
          ],
        },
      },
      // TranslateX oscillation
      {
        id: 'distortion-2-translateX',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-sine',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['distortion-layer-2'],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: `${-waveAmplitude * 0.8}px`, prog: peakProg },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        },
      },
    ],
  };

  // Distortion layer 3: Screen blend mode with rotate wave
  const distortionLayer3: RenderableComponentData = {
    id: 'distortion-layer-3',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom || 0,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        opacity: 0.3,
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Scale wave motion (1 -> 1.08 -> 1)
      {
        id: 'distortion-3-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-sine',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['distortion-layer-3'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.08, prog: peakProg },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Rotate wave motion (0 -> 2deg -> 0deg)
      {
        id: 'distortion-3-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out-sine',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['distortion-layer-3'],
          ranges: [
            { key: 'rotate', val: '0deg', prog: 0 },
            { key: 'rotate', val: '2deg', prog: peakProg },
            { key: 'rotate', val: '0deg', prog: 1 },
          ],
        },
      },
    ],
  };

  // Backdrop blur overlay that fades out
  const backdropBlurOverlay: RenderableComponentData = {
    id: 'backdrop-blur-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backdropFilter: 'blur(2px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'backdrop-blur-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['backdrop-blur-overlay'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-morph-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'normal',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      incomingVideoBase,
      outgoingVideoBase,
      distortionLayer1,
      distortionLayer2,
      distortionLayer3,
      backdropBlurOverlay,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'liquid-morph-transition',
  title: 'Liquid Morph Transition',
  description:
    'A fluid dynamics-inspired transition effect that warps and liquifies video clips using wave distortions, multiple semi-transparent overlay layers with varying blend modes, and CSS transforms. The outgoing video distorts while the incoming video emerges through the distortion, peaking at the midpoint before settling to a clean reveal.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'liquid', 'morph', 'wave', 'distortion', 'fluid'],
  defaultInputParams: {
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    transitionDuration: 1.5,
    waveAmplitude: 20,
    waveFrequency: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const liquidMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
