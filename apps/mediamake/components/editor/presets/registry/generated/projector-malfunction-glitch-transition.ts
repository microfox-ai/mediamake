/**
 * Projector Malfunction Glitch Transition Preset
 *
 * A chaotic yet controlled projector malfunction transition effect simulating a slide carousel jam.
 * Features rapid frame switching between outgoing and incoming videos (5-6 cuts over 0.6s), RGB channel
 * splitting with pixel offsets, horizontal scan line overlay, transform jitter on X/Y axes, and blend
 * mode alternation (screen, multiply, overlay). Includes synchronized mechanical clicking sounds for
 * authentic projector feel. The effect creates moments where both videos overlap as if slides are stuck
 * in the gate.
 *
 * Key Features:
 * - Rapid frame switching: 5-6 cuts over 0.6 seconds
 * - RGB channel split with pixel offsets
 * - Horizontal scan lines
 * - Transform jitter (small random translateX/Y)
 * - Blend mode alternation (screen, multiply, overlay)
 * - Mechanical click sound effects synced to visual glitches
 * - Overlapping video moments simulating slides stuck in gate
 *
 * Technical approach:
 * - Single BaseLayout container with all video layers
 * - Outgoing and incoming videos overlap during transition
 * - RGB split layers use separate VideoAtoms with color filters and offsets
 * - Generic effects control rapid opacity switching and transform jitter
 * - Scanline overlay using gradient background
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of outgoing video/image'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Outgoing media configuration'),
  media2: z
    .object({
      src: z.string().describe('Source URL of incoming video/image'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Incoming media configuration'),
  transitionDuration: z
    .number()
    .default(0.8)
    .describe('Total duration of transition glitch effect in seconds'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for glitch effects'),
  mechanicalClickSrc: z
    .string()
    .optional()
    .describe('Optional audio source for mechanical click sound effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    transitionDuration,
    glitchIntensity,
    mechanicalClickSrc,
  } = params;

  // Calculate timing
  const totalDuration = media1.duration + media2.duration - transitionDuration;
  const transitionStart = media1.duration - transitionDuration;

  // Determine component IDs
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Helper: Create rapid opacity switches (5-6 cuts over 0.6s of the transition)
  const createRapidCuts = (
    targetId: string,
    isOutgoing: boolean,
  ): Array<{ key: string; val: number; prog: number }> => {
    const cutCount = 6;
    const ranges: Array<{ key: string; val: number; prog: number }> = [];

    for (let i = 0; i <= cutCount; i++) {
      const prog = i / cutCount;
      let opacity = 1;

      if (isOutgoing) {
        // Outgoing: starts visible, flickers to invisible
        opacity = i % 2 === 0 ? 1 : 0;
      } else {
        // Incoming: starts invisible, flickers to visible
        opacity = i % 2 === 0 ? 0 : 1;
      }

      ranges.push({ key: 'opacity', val: opacity, prog });
    }

    return ranges;
  };

  // Helper: Create jitter effect (small random translateX/Y)
  const createJitterRanges = (): Array<{
    key: string;
    val: string;
    prog: number;
  }> => {
    const jitterRanges: Array<{ key: string; val: string; prog: number }> = [];
    const jitterSteps = 12;
    const maxJitter = 10 * glitchIntensity;

    for (let i = 0; i <= jitterSteps; i++) {
      const prog = i / jitterSteps;
      const jitterX = (Math.random() - 0.5) * maxJitter;
      const jitterY = (Math.random() - 0.5) * maxJitter;

      jitterRanges.push(
        { key: 'translateX', val: `${jitterX}px`, prog },
        { key: 'translateY', val: `${jitterY}px`, prog },
      );
    }

    return jitterRanges;
  };

  // Helper: Create RGB split ranges
  const createRGBSplitRanges = (
    channel: 'red' | 'green' | 'blue',
  ): Array<{ key: string; val: string; prog: number }> => {
    const offsetMultiplier = glitchIntensity * 5;
    let offsetX = 0;
    let offsetY = 0;

    if (channel === 'red') {
      offsetX = -offsetMultiplier;
    } else if (channel === 'green') {
      offsetX = offsetMultiplier;
    } else if (channel === 'blue') {
      offsetY = offsetMultiplier;
    }

    return [
      { key: 'translateX', val: `${offsetX}px`, prog: 0 },
      { key: 'translateY', val: `${offsetY}px`, prog: 0 },
      { key: 'translateX', val: `${offsetX}px`, prog: 1 },
      { key: 'translateY', val: `${offsetY}px`, prog: 1 },
    ];
  };

  const childrenData: RenderableComponentData[] = [];

  // --- Outgoing Video Layer ---
  childrenData.push({
    id: 'video-out-layer',
    type: 'atom',
    componentId: media1ComponentId,
    data: {
      src: media1.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      muted: true,
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-rapid-cuts',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStart,
          duration: transitionDuration * 0.75,
          mode: 'provider',
          targetIds: ['video-out-layer'],
          ranges: createRapidCuts('video-out-layer', true),
        },
      },
      {
        id: 'outgoing-jitter',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['video-out-layer'],
          ranges: createJitterRanges(),
        },
      },
    ],
  } as RenderableComponentData);

  // --- Incoming Video Layer ---
  childrenData.push({
    id: 'video-in-layer',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      muted: true,
    },
    context: {
      timing: {
        start: transitionStart,
        duration: media2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-rapid-cuts',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration * 0.75,
          mode: 'provider',
          targetIds: ['video-in-layer'],
          ranges: createRapidCuts('video-in-layer', false),
        },
      },
      {
        id: 'incoming-jitter',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['video-in-layer'],
          ranges: createJitterRanges(),
        },
      },
    ],
  } as RenderableComponentData);

  // --- RGB Split Layers (Red, Green, Blue) ---
  // These layers create chromatic aberration effect during glitch
  const rgbSplitStart = transitionStart + transitionDuration * 0.3;
  const rgbSplitDuration = transitionDuration * 0.4;

  // Red channel
  childrenData.push({
    id: 'rgb-red-layer',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      muted: true,
      style: {
        mixBlendMode: 'screen',
        filter: 'brightness(1.5) contrast(1.5)',
      },
    },
    context: {
      timing: {
        start: rgbSplitStart,
        duration: rgbSplitDuration,
      },
    },
    effects: [
      {
        id: 'rgb-red-offset',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: rgbSplitDuration,
          mode: 'provider',
          targetIds: ['rgb-red-layer'],
          ranges: [
            ...createRGBSplitRanges('red'),
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 0.7, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Green channel
  childrenData.push({
    id: 'rgb-green-layer',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      muted: true,
      style: {
        mixBlendMode: 'screen',
        filter: 'brightness(1.5) contrast(1.5)',
      },
    },
    context: {
      timing: {
        start: rgbSplitStart,
        duration: rgbSplitDuration,
      },
    },
    effects: [
      {
        id: 'rgb-green-offset',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: rgbSplitDuration,
          mode: 'provider',
          targetIds: ['rgb-green-layer'],
          ranges: [
            ...createRGBSplitRanges('green'),
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 0.7, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Blue channel
  childrenData.push({
    id: 'rgb-blue-layer',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full',
      muted: true,
      style: {
        mixBlendMode: 'screen',
        filter: 'brightness(1.5) contrast(1.5)',
      },
    },
    context: {
      timing: {
        start: rgbSplitStart,
        duration: rgbSplitDuration,
      },
    },
    effects: [
      {
        id: 'rgb-blue-offset',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: rgbSplitDuration,
          mode: 'provider',
          targetIds: ['rgb-blue-layer'],
          ranges: [
            ...createRGBSplitRanges('blue'),
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 0.7, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // --- Scanline Overlay ---
  childrenData.push({
    id: 'scanline-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full pointer-events-none',
        style: {
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          mixBlendMode: 'multiply',
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    childrenData: [],
    effects: [
      {
        id: 'scanline-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['scanline-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // --- Audio Click (if provided) ---
  if (mechanicalClickSrc) {
    // Create multiple clicks synced with glitch hits
    const clickTimestamps = [
      transitionStart,
      transitionStart + transitionDuration * 0.2,
      transitionStart + transitionDuration * 0.35,
      transitionStart + transitionDuration * 0.5,
      transitionStart + transitionDuration * 0.7,
    ];

    clickTimestamps.forEach((timestamp, index) => {
      childrenData.push({
        id: `audio-click-${index}`,
        type: 'atom',
        componentId: 'AudioAtom',
        data: {
          src: mechanicalClickSrc,
          volume: 0.8,
        },
        context: {
          timing: {
            start: timestamp,
            duration: 0.1,
          },
        },
      } as RenderableComponentData);
    });
  }

  const rootContainer: RenderableComponentData = {
    id: 'projector-glitch-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData,
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
  id: 'projector-malfunction-glitch-transition',
  title: 'Projector Malfunction Glitch Transition',
  description:
    'A chaotic yet controlled projector malfunction transition effect simulating a slide carousel jam. Features rapid frame switching between outgoing and incoming videos (5-6 cuts over 0.6s), RGB channel splitting with pixel offsets, horizontal scan line overlay, transform jitter on X/Y axes, and blend mode alternation (screen, multiply, overlay). Includes synchronized mechanical clicking sounds for authentic projector feel. The effect creates moments where both videos overlap as if slides are stuck in the gate.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'projector',
    'malfunction',
    'rgb-split',
    'scanline',
    'mechanical',
    'chaotic',
    'vintage',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 3,
    },
    transitionDuration: 0.8,
    glitchIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const projectorMalfunctionGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
