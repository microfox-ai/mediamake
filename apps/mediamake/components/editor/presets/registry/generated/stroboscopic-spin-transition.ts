/**
 * Stroboscopic Spin Transition Preset
 *
 * This preset creates a rapid-fire stroboscopic spin transition that alternates between
 * showing fragments of outgoing and incoming videos during a 0.8-second overlap, creating
 * a disorienting twist effect.
 *
 * Features:
 * - **Strobing Visibility**: 8 rapid intervals (0.1s each) with step-based opacity alternation
 * - **360-Degree Rotation**: Both videos rotate 0→360 degrees in 45-degree increments
 * - **Radial Blur Pulses**: Blur cycles 0→15px in sync with strobes (8 pulses total)
 * - **Dynamic Scaling**: Incoming scales from 1.5x→1x, outgoing scales from 1x→0.5x
 * - **RGB Color Split**: Glitchy red/blue channel separation with translateX offsets
 * - **Synchronized Timing**: All effects precisely timed to create cohesive strobe/spin effect
 *
 * Use cases:
 * - High-energy music video transitions
 * - Action sequence cuts
 * - Glitch/cyberpunk aesthetic videos
 * - Disorienting scene changes for dramatic effect
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    startFrom: z.number().optional().describe('Start time in outgoing video (seconds)'),
    endAt: z.number().optional().describe('End time in outgoing video (seconds)'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    startFrom: z.number().optional().describe('Start time in incoming video (seconds)'),
    endAt: z.number().optional().describe('End time in incoming video (seconds)'),
  }).describe('Incoming video configuration'),
  transitionDuration: z.number().default(0.8).describe('Duration of the stroboscopic transition (seconds)'),
  rgbSplitOffset: z.number().default(2).describe('Offset for RGB color channel split in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, rgbSplitOffset } = params;

  // Helper function to create step-based opacity ranges for strobing effect
  const createStrobeOpacityRanges = (startVisible: boolean) => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    const numSteps = 8; // 8 intervals of 0.1s each
    
    for (let i = 0; i <= numSteps; i++) {
      const prog = i / numSteps;
      const isVisible = startVisible ? (i % 2 === 0) : (i % 2 === 1);
      ranges.push({ key: 'opacity', val: isVisible ? 1 : 0, prog });
    }
    
    return ranges;
  };

  // Helper function to create blur pulse ranges (0→15px→0 every 0.1s)
  const createBlurPulseRanges = () => {
    const ranges: Array<{ key: string; val: string; prog: number }> = [];
    const numPulses = 8;
    
    for (let i = 0; i <= numPulses; i++) {
      const baseProgress = i / numPulses;
      
      // At each strobe interval, pulse blur 0→15px→0
      ranges.push({ key: 'filter', val: 'blur(0px)', prog: baseProgress });
      
      if (i < numPulses) {
        // Peak blur at midpoint of each interval
        const midProgress = (i + 0.5) / numPulses;
        ranges.push({ key: 'filter', val: 'blur(15px)', prog: midProgress });
      }
    }
    
    return ranges;
  };

  // Outgoing layer container
  const outgoingLayerContainer: RenderableComponentData = {
    id: 'stroboscopic-spin-outgoing-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      // Outgoing video - red channel (left offset)
      {
        id: 'outgoing-video-red',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          startFrom: outgoingVideo.startFrom,
          endAt: outgoingVideo.endAt,
          fit: 'cover',
          className: 'w-full h-full',
          style: {
            position: 'absolute',
            inset: 0,
            filter: 'sepia(100%) hue-rotate(-50deg) saturate(600%) brightness(0.8)',
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
      // Outgoing video - center (original)
      {
        id: 'outgoing-video-center',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          startFrom: outgoingVideo.startFrom,
          endAt: outgoingVideo.endAt,
          fit: 'cover',
          className: 'w-full h-full',
          style: {
            position: 'absolute',
            inset: 0,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
      // Outgoing video - blue channel (right offset)
      {
        id: 'outgoing-video-blue',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          startFrom: outgoingVideo.startFrom,
          endAt: outgoingVideo.endAt,
          fit: 'cover',
          className: 'w-full h-full',
          style: {
            position: 'absolute',
            inset: 0,
            filter: 'sepia(100%) hue-rotate(180deg) saturate(600%) brightness(0.8)',
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Incoming layer container
  const incomingLayerContainer: RenderableComponentData = {
    id: 'stroboscopic-spin-incoming-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      // Incoming video - red channel (left offset)
      {
        id: 'incoming-video-red',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          startFrom: incomingVideo.startFrom,
          endAt: incomingVideo.endAt,
          fit: 'cover',
          className: 'w-full h-full',
          style: {
            position: 'absolute',
            inset: 0,
            filter: 'sepia(100%) hue-rotate(-50deg) saturate(600%) brightness(0.8)',
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
      // Incoming video - center (original)
      {
        id: 'incoming-video-center',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          startFrom: incomingVideo.startFrom,
          endAt: incomingVideo.endAt,
          fit: 'cover',
          className: 'w-full h-full',
          style: {
            position: 'absolute',
            inset: 0,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
      // Incoming video - blue channel (right offset)
      {
        id: 'incoming-video-blue',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          startFrom: incomingVideo.startFrom,
          endAt: incomingVideo.endAt,
          fit: 'cover',
          className: 'w-full h-full',
          style: {
            position: 'absolute',
            inset: 0,
            filter: 'sepia(100%) hue-rotate(180deg) saturate(600%) brightness(0.8)',
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Create all effects
  const outgoingOpacityStrobeEffect = {
    id: 'effect-outgoing-opacity-strobe',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['stroboscopic-spin-outgoing-layer'],
      ranges: createStrobeOpacityRanges(true), // Start visible (1,0,1,0,1,0,1,0)
    } as GenericEffectData,
  };

  const incomingOpacityStrobeEffect = {
    id: 'effect-incoming-opacity-strobe',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['stroboscopic-spin-incoming-layer'],
      ranges: createStrobeOpacityRanges(false), // Start hidden (0,1,0,1,0,1,0,1)
    } as GenericEffectData,
  };

  const outgoingRotationEffect = {
    id: 'effect-outgoing-rotation',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['stroboscopic-spin-outgoing-layer'],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: 360, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const incomingRotationEffect = {
    id: 'effect-incoming-rotation',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['stroboscopic-spin-incoming-layer'],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: 360, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const outgoingScaleEffect = {
    id: 'effect-outgoing-scale',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['stroboscopic-spin-outgoing-layer'],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 0.5, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const incomingScaleEffect = {
    id: 'effect-incoming-scale',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['stroboscopic-spin-incoming-layer'],
      ranges: [
        { key: 'scale', val: 1.5, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const outgoingBlurPulseEffect = {
    id: 'effect-outgoing-blur-pulse',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['stroboscopic-spin-outgoing-layer'],
      ranges: createBlurPulseRanges(),
    } as GenericEffectData,
  };

  const incomingBlurPulseEffect = {
    id: 'effect-incoming-blur-pulse',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['stroboscopic-spin-incoming-layer'],
      ranges: createBlurPulseRanges(),
    } as GenericEffectData,
  };

  // RGB split effects (static translateX offsets)
  const outgoingRedTranslateEffect = {
    id: 'effect-outgoing-red-translateX',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['outgoing-video-red'],
      ranges: [
        { key: 'translateX', val: -rgbSplitOffset, prog: 0 },
        { key: 'translateX', val: -rgbSplitOffset, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const outgoingBlueTranslateEffect = {
    id: 'effect-outgoing-blue-translateX',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['outgoing-video-blue'],
      ranges: [
        { key: 'translateX', val: rgbSplitOffset, prog: 0 },
        { key: 'translateX', val: rgbSplitOffset, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const incomingRedTranslateEffect = {
    id: 'effect-incoming-red-translateX',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['incoming-video-red'],
      ranges: [
        { key: 'translateX', val: -rgbSplitOffset, prog: 0 },
        { key: 'translateX', val: -rgbSplitOffset, prog: 1 },
      ],
    } as GenericEffectData,
  };

  const incomingBlueTranslateEffect = {
    id: 'effect-incoming-blue-translateX',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['incoming-video-blue'],
      ranges: [
        { key: 'translateX', val: rgbSplitOffset, prog: 0 },
        { key: 'translateX', val: rgbSplitOffset, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'stroboscopic-spin-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [outgoingLayerContainer, incomingLayerContainer],
    effects: [
      outgoingOpacityStrobeEffect,
      incomingOpacityStrobeEffect,
      outgoingRotationEffect,
      incomingRotationEffect,
      outgoingScaleEffect,
      incomingScaleEffect,
      outgoingBlurPulseEffect,
      incomingBlurPulseEffect,
      outgoingRedTranslateEffect,
      outgoingBlueTranslateEffect,
      incomingRedTranslateEffect,
      incomingBlueTranslateEffect,
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
  id: 'stroboscopic-spin-transition',
  title: 'Stroboscopic Spin Transition',
  description:
    'A rapid-fire stroboscopic spin transition that alternates between outgoing and incoming videos during a 0.8-second overlap with 8 rapid intervals, 360-degree rotation, pulsing radial blur, and RGB channel split glitch effect',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'strobe', 'spin', 'glitch', 'rgb-split', 'high-energy'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      startFrom: 0,
      endAt: 5,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      startFrom: 0,
      endAt: 5,
    },
    transitionDuration: 0.8,
    rgbSplitOffset: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const stroboscopicSpinTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};