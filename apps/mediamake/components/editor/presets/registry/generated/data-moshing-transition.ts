/**
 * Data Moshing Pixel Corruption Transition Preset
 * 
 * This preset simulates codec errors and compression artifacts during a video transition.
 * It creates an authentic data moshing effect by progressively corrupting the outgoing video
 * through macro-blocking (pixelation), color channel separation, blur, and contrast distortion,
 * then reconstructs the incoming video from corrupted data blocks back to clear imagery.
 * 
 * Features:
 * - Progressive pixelation using transform scale down/up technique
 * - RGB color channel separation with translateX offsets and screen blend mode
 * - Blur and contrast/saturation filters for codec degradation
 * - Incoming video reverses the corruption process
 * - 1-second overlap period for smooth transition
 * - Frame freeze effect simulation through effect timing
 * 
 * Technical approach:
 * - Uses image-rendering: pixelated CSS property for crisp pixel edges
 * - Scale down (0.1x) then scale up (10x) creates macro-blocking effect
 * - Three duplicate video layers for RGB channel separation with slight offsets
 * - Screen blend mode for color channel additive mixing
 * - Effects timed relative to parent container timing
 * 
 * Use cases:
 * - Digital glitch aesthetics for tech/cyberpunk content
 * - Music videos with electronic/experimental themes
 * - Error/corruption visual metaphors
 * - Retro digital/VHS corruption effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z.number()
    .default(1.0)
    .describe('Duration of the overlap/transition period in seconds (default: 1.0)'),
  
  pixelationIntensity: z.number()
    .min(0.05)
    .max(0.2)
    .default(0.1)
    .optional()
    .describe('Scale factor for pixelation effect (lower = more pixelated, default: 0.1)'),
  
  channelSeparation: z.number()
    .min(2)
    .max(20)
    .default(8)
    .optional()
    .describe('Pixel offset for RGB channel separation (default: 8px)'),
  
  maxBlur: z.number()
    .min(1)
    .max(5)
    .default(2)
    .optional()
    .describe('Maximum blur radius in pixels (default: 2px)'),
  
  maxContrast: z.number()
    .min(1.2)
    .max(3)
    .default(2)
    .optional()
    .describe('Maximum contrast multiplier at peak corruption (default: 2)'),
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
    pixelationIntensity = 0.1,
    channelSeparation = 8,
    maxBlur = 2,
    maxContrast = 2,
  } = params;

  // Calculate total composition duration (overlap subtracted)
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Timing reference for outgoing video
  const outgoingVideoDuration = outgoingVideo.duration;
  const outgoingCorruptionStart = outgoingVideoDuration - transitionDuration;

  // Timing reference for incoming video
  const incomingVideoStart = outgoingVideoDuration - transitionDuration;

  // --- OUTGOING VIDEO MAIN LAYER ---
  const outgoingVideoMain: RenderableComponentData = {
    id: 'outgoing-video-main',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      className: 'w-full h-full object-cover',
      style: {
        imageRendering: 'pixelated',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    effects: [
      // Pixelation: scale down phase
      {
        id: 'outgoing-pixelation-scale-down',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingCorruptionStart,
          duration: 0.3,
          mode: 'provider',
          targetIds: ['outgoing-video-main'],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: pixelationIntensity, prog: 1 },
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: pixelationIntensity, prog: 1 },
          ],
        },
      },
      // Pixelation: scale up phase
      {
        id: 'outgoing-pixelation-scale-up',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: outgoingCorruptionStart + 0.3,
          duration: 0.3,
          mode: 'provider',
          targetIds: ['outgoing-video-main'],
          ranges: [
            { key: 'scaleX', val: pixelationIntensity, prog: 0 },
            { key: 'scaleX', val: 10, prog: 1 },
            { key: 'scaleY', val: pixelationIntensity, prog: 0 },
            { key: 'scaleY', val: 10, prog: 1 },
          ],
        },
      },
      // Blur + contrast + saturation corruption
      {
        id: 'outgoing-blur-contrast',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingCorruptionStart,
          duration: 0.8,
          mode: 'provider',
          targetIds: ['outgoing-video-main'],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: maxBlur, prog: 1 },
            { key: 'contrast', val: 1, prog: 0 },
            { key: 'contrast', val: maxContrast, prog: 1 },
            { key: 'saturate', val: 1, prog: 0 },
            { key: 'saturate', val: 0.5, prog: 1 },
          ],
        },
      },
      // Final fade out
      {
        id: 'outgoing-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: outgoingCorruptionStart + 0.6,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['outgoing-video-main'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // --- OUTGOING COLOR CHANNEL LAYERS (RGB separation) ---
  const outgoingChannelRed: RenderableComponentData = {
    id: 'outgoing-channel-red',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
      style: {
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-red-channel-shift',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingCorruptionStart + 0.2,
          duration: 0.6,
          mode: 'provider',
          targetIds: ['outgoing-channel-red'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -channelSeparation, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const outgoingChannelGreen: RenderableComponentData = {
    id: 'outgoing-channel-green',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
      style: {
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-green-channel-shift',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingCorruptionStart + 0.2,
          duration: 0.6,
          mode: 'provider',
          targetIds: ['outgoing-channel-green'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 4, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const outgoingChannelBlue: RenderableComponentData = {
    id: 'outgoing-channel-blue',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
      style: {
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideoDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-blue-channel-shift',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingCorruptionStart + 0.2,
          duration: 0.6,
          mode: 'provider',
          targetIds: ['outgoing-channel-blue'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: channelSeparation, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // --- OUTGOING VIDEO WRAPPER ---
  const outgoingVideoWrapper: RenderableComponentData = {
    id: 'outgoing-video-wrapper',
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
        duration: outgoingVideoDuration,
      },
    },
    childrenData: [
      outgoingVideoMain,
      outgoingChannelRed,
      outgoingChannelGreen,
      outgoingChannelBlue,
    ],
  };

  // --- INCOMING VIDEO MAIN LAYER ---
  const incomingVideoMain: RenderableComponentData = {
    id: 'incoming-video-main',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      style: {
        imageRendering: 'pixelated',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: incomingVideo.duration,
      },
    },
    effects: [
      // Start heavily pixelated (scale up)
      {
        id: 'incoming-pixelation-scale-down',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.3,
          mode: 'provider',
          targetIds: ['incoming-video-main'],
          ranges: [
            { key: 'scaleX', val: 10, prog: 0 },
            { key: 'scaleX', val: pixelationIntensity, prog: 1 },
            { key: 'scaleY', val: 10, prog: 0 },
            { key: 'scaleY', val: pixelationIntensity, prog: 1 },
          ],
        },
      },
      // Reconstruct to normal scale
      {
        id: 'incoming-pixelation-scale-up',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0.3,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['incoming-video-main'],
          ranges: [
            { key: 'scaleX', val: pixelationIntensity, prog: 0 },
            { key: 'scaleX', val: 1, prog: 1 },
            { key: 'scaleY', val: pixelationIntensity, prog: 0 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        },
      },
      // Blur + contrast + saturation reconstruction
      {
        id: 'incoming-blur-contrast',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.7,
          mode: 'provider',
          targetIds: ['incoming-video-main'],
          ranges: [
            { key: 'blur', val: maxBlur + 1, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
            { key: 'contrast', val: maxContrast, prog: 0 },
            { key: 'contrast', val: 1, prog: 1 },
            { key: 'saturate', val: 0.3, prog: 0 },
            { key: 'saturate', val: 1, prog: 1 },
          ],
        },
      },
      // Fade in from corrupted state
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: 0.5,
          mode: 'provider',
          targetIds: ['incoming-video-main'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // --- INCOMING VIDEO WRAPPER ---
  const incomingVideoWrapper: RenderableComponentData = {
    id: 'incoming-video-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: incomingVideoStart,
        duration: incomingVideo.duration,
      },
    },
    childrenData: [incomingVideoMain],
  };

  // --- ROOT CONTAINER ---
  const rootContainer: RenderableComponentData = {
    id: 'data-moshing-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideoWrapper, incomingVideoWrapper],
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
  id: 'data-moshing-transition',
  title: 'Data Moshing Pixel Corruption Transition',
  description:
    'Simulates codec errors and compression artifacts with progressive macro-blocking, color channel separation, and frame freezing effects during video transitions. Creates authentic data moshing aesthetics using transform-based pixelation and CSS filters during a 1-second overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'data-moshing',
    'corruption',
    'pixelation',
    'rgb-split',
    'codec-error',
    'video',
    'tech',
    'cyberpunk',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.0,
    pixelationIntensity: 0.1,
    channelSeparation: 8,
    maxBlur: 2,
    maxContrast: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const dataMoshingTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
