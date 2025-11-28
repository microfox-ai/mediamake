/**
 * Scan Line Corruption Transition Preset
 *
 * This preset creates a horizontal scan line corruption transition reminiscent of analog TV interference
 * and digital streaming errors. The transition features horizontal bands of video that corrupt and slide
 * out of sync, creating a shearing effect with chromatic aberration (RGB split).
 *
 * Features:
 * - **Horizontal Strip Corruption**: 25 horizontal strips with independent transform and opacity animations
 * - **Shearing Effect**: Each strip has slightly different timing and displacement (translateX, skewX)
 * - **Organic Corruption Pattern**: Staggered animations with incremental delays create wave-like corruption
 * - **Chromatic Aberration**: RGB channels split horizontally during peak corruption (0.7-1.1s)
 * - **Reverse Reconstruction**: Incoming video appears through corrupted scan lines with inverse animations
 * - **1.8-second Duration**: Total transition time with peak corruption at midpoint
 *
 * Technical Implementation:
 * - 25 horizontal strips for both outgoing and incoming video
 * - Each strip: calculated top position and height, video positioned via translateY
 * - Outgoing strips: animate translateX (-100px to 100px), skewX (-5deg to 5deg), opacity flicker (0.5-1)
 * - Incoming strips: inverse animations from displaced state to normal
 * - RGB split layer: 3 video copies with mix-blend-mode: screen, translateX offsets (-2px, 0, +2px)
 * - All animations use provider mode with targetIds
 *
 * Use cases:
 * - Glitch transitions between video clips
 * - Retro analog TV interference effects
 * - Digital streaming error simulations
 * - Cyberpunk/tech-themed video transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Total duration of the transition in seconds'),
  stripCount: z
    .number()
    .default(25)
    .describe('Number of horizontal strips (20-30 recommended)'),
  maxDisplacement: z
    .number()
    .default(100)
    .describe('Maximum horizontal displacement in pixels'),
  maxSkew: z
    .number()
    .default(5)
    .describe('Maximum skew angle in degrees'),
  rgbSplitOffset: z
    .number()
    .default(2)
    .describe('RGB channel horizontal offset in pixels'),
  rgbSplitIntensity: z
    .number()
    .default(0.6)
    .describe('Peak opacity of RGB split effect (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    stripCount,
    maxDisplacement,
    maxSkew,
    rgbSplitOffset,
    rgbSplitIntensity,
  } = params;

  const { config } = props;
  const videoHeight = config?.height || 1080;
  const videoWidth = config?.width || 1920;

  // Calculate strip dimensions
  const stripHeight = videoHeight / stripCount;

  // Helper: Generate random displacement for each strip
  const generateRandomDisplacement = (index: number): number => {
    // Use index as seed for pseudo-random but consistent values
    const seed = (index * 2654435761) % 2147483647;
    const normalized = seed / 2147483647;
    return (normalized - 0.5) * 2 * maxDisplacement;
  };

  // Helper: Generate random skew for each strip
  const generateRandomSkew = (index: number): number => {
    const seed = ((index + 100) * 2654435761) % 2147483647;
    const normalized = seed / 2147483647;
    return (normalized - 0.5) * 2 * maxSkew;
  };

  // Create outgoing video strips (corrupt and slide out)
  const outgoingStrips: RenderableComponentData[] = [];
  for (let i = 0; i < stripCount; i++) {
    const stripId = `outgoing-strip-${i}`;
    const videoId = `outgoing-video-${i}`;
    const topPosition = i * stripHeight;
    const staggerDelay = i * 0.02; // 20ms stagger per strip

    const displacement = generateRandomDisplacement(i);
    const skew = generateRandomSkew(i);

    outgoingStrips.push({
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute overflow-hidden',
          style: {
            top: `${topPosition}px`,
            left: '0px',
            width: `${videoWidth}px`,
            height: `${stripHeight}px`,
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
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideoSrc,
            className: 'absolute left-0',
            style: {
              width: `${videoWidth}px`,
              height: `${videoHeight}px`,
              top: `${-topPosition}px`,
            },
            fit: 'cover',
            muted: true,
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: `outgoing-corrupt-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: staggerDelay,
            duration: 0.9 - staggerDelay,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: `${displacement}px`, prog: 1 },
              { key: 'skewX', val: '0deg', prog: 0 },
              { key: 'skewX', val: `${skew}deg`, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.3 },
              { key: 'opacity', val: 0.8, prog: 0.6 },
              { key: 'opacity', val: 0.6, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create incoming video strips (reconstruct from corruption)
  const incomingStrips: RenderableComponentData[] = [];
  for (let i = 0; i < stripCount; i++) {
    const stripId = `incoming-strip-${i}`;
    const videoId = `incoming-video-${i}`;
    const topPosition = i * stripHeight;
    const staggerDelay = i * 0.02;

    const displacement = generateRandomDisplacement(i);
    const skew = generateRandomSkew(i);

    incomingStrips.push({
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute overflow-hidden',
          style: {
            top: `${topPosition}px`,
            left: '0px',
            width: `${videoWidth}px`,
            height: `${stripHeight}px`,
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
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            className: 'absolute left-0',
            style: {
              width: `${videoWidth}px`,
              height: `${videoHeight}px`,
              top: `${-topPosition}px`,
            },
            fit: 'cover',
            muted: true,
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: `incoming-reconstruct-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0.9 + staggerDelay,
            duration: 0.9 - staggerDelay,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'translateX', val: `${displacement}px`, prog: 0 },
              { key: 'translateX', val: '0px', prog: 1 },
              { key: 'skewX', val: `${skew}deg`, prog: 0 },
              { key: 'skewX', val: '0deg', prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create RGB split layer (chromatic aberration during peak corruption)
  const rgbRedChannel: RenderableComponentData = {
    id: 'rgb-red-channel',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      className: 'absolute inset-0',
      style: {
        mixBlendMode: 'screen',
        filter: 'hue-rotate(0deg) saturate(200%) grayscale(0.5)',
      },
      fit: 'cover',
      muted: true,
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'rgb-red-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.7,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['rgb-red-channel'],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: `${-rgbSplitOffset}px`, prog: 0.5 },
            { key: 'translateX', val: '0px', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: rgbSplitIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const rgbGreenChannel: RenderableComponentData = {
    id: 'rgb-green-channel',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      className: 'absolute inset-0',
      style: {
        mixBlendMode: 'screen',
        filter: 'hue-rotate(120deg) saturate(200%) grayscale(0.5)',
      },
      fit: 'cover',
      muted: true,
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'rgb-green-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.7,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['rgb-green-channel'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: rgbSplitIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const rgbBlueChannel: RenderableComponentData = {
    id: 'rgb-blue-channel',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      className: 'absolute inset-0',
      style: {
        mixBlendMode: 'screen',
        filter: 'hue-rotate(240deg) saturate(200%) grayscale(0.5)',
      },
      fit: 'cover',
      muted: true,
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'rgb-blue-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.7,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['rgb-blue-channel'],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: `${rgbSplitOffset}px`, prog: 0.5 },
            { key: 'translateX', val: '0px', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: rgbSplitIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Assemble the complete transition structure
  const rootContainer: RenderableComponentData = {
    id: 'scan-line-corruption-container',
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
        duration: transitionDuration,
      },
    },
    childrenData: [
      // Outgoing video layer
      {
        id: 'outgoing-video-layer',
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
            duration: transitionDuration,
          },
        },
        childrenData: outgoingStrips,
      } as RenderableComponentData,
      // Incoming video layer
      {
        id: 'incoming-video-layer',
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
            duration: transitionDuration,
          },
        },
        childrenData: incomingStrips,
      } as RenderableComponentData,
      // RGB split layer
      {
        id: 'rgb-split-layer',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: [rgbRedChannel, rgbGreenChannel, rgbBlueChannel],
      } as RenderableComponentData,
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
  id: 'scan-line-corruption-transition',
  title: 'Scan Line Corruption Transition',
  description:
    'Horizontal scan line corruption transition with analog TV interference and digital streaming error effects. Features independent strip animations with shearing, chromatic aberration (RGB split), and organic corruption patterns for a 1.8-second transition between video sources.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'corruption',
    'scan-line',
    'analog',
    'tv',
    'chromatic-aberration',
    'rgb-split',
    'shearing',
    'retro',
    'cyberpunk',
    'tech',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 1.8,
    stripCount: 25,
    maxDisplacement: 100,
    maxSkew: 5,
    rgbSplitOffset: 2,
    rgbSplitIntensity: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const scanLineCorruptionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
