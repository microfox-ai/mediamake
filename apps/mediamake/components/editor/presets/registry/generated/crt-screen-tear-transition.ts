/**
 * CRT Screen Tear Transition Preset
 *
 * Simulates a CRT monitor malfunction with horizontal scan lines that tear across the screen
 * during video transitions. Creates a retro screen glitch effect with chromatic aberration,
 * static noise overlay, and segmented opacity animations that simulate horizontal screen sections
 * tearing away at different speeds.
 *
 * Features:
 * - **Horizontal Scan Lines**: 10-15 divs positioned absolutely across screen height
 * - **Segmented Tearing**: Outgoing video sections tear at different speeds (top/middle/bottom)
 * - **Sawtooth Opacity**: Scan line opacity oscillates between 0 and 1 during transition
 * - **Chromatic Aberration**: Red/blue channel offset via CSS filters on alternating lines
 * - **Static Noise**: Fades out as incoming video becomes visible
 * - **Screen Glitch**: Skewed scan lines with varying angles (-5deg to 5deg)
 * - **Hue Rotation**: Rapid color shifts during transition for extra glitch effect
 *
 * Use cases:
 * - Retro video transitions with CRT monitor aesthetic
 * - Glitch art video effects
 * - Transitions for tech/gaming content
 * - Nostalgic 80s/90s screen malfunction effects
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
      src: z.string().describe('Source URL of the first video'),
      duration: z.number().describe('Duration of the first video in seconds'),
    })
    .describe('First video (outgoing)'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second video'),
      duration: z.number().describe('Duration of the second video in seconds'),
    })
    .describe('Second video (incoming)'),
  transitionDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the screen tear transition overlap in seconds'),
  scanLineCount: z
    .number()
    .min(10)
    .max(15)
    .default(13)
    .describe('Number of horizontal scan line divs'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, scanLineCount } = params;

  // Calculate BaseLayout duration (sum minus overlap)
  const baseLayoutDuration =
    video1.duration + video2.duration - transitionDuration;

  // Helper: Create scan line data
  const createScanLineData = (
    index: number,
    total: number,
  ): RenderableComponentData => {
    const scanLineId = `scan-line-${index}`;
    const topPercent = (index / total) * 100;
    const heightPercent = 100 / total;

    // Varying skew angles between -5deg and 5deg
    const skewAngle = ((index % 5) - 2) * 2.5; // -5, -2.5, 0, 2.5, 5

    // Chromatic aberration on alternating lines
    const hasChromatic = index % 2 === 0;

    // Sawtooth opacity oscillation (varies start delay per line)
    const delayOffset = (index / total) * 0.2; // 0 to 0.2s stagger
    const oscillationDuration = transitionDuration - delayOffset;

    // Create sawtooth ranges: 0 → 1 → 0 → 1 → 0 (5 steps minimum)
    const sawtoothRanges = [];
    const steps = 11; // Number of keyframes for sawtooth
    for (let i = 0; i < steps; i++) {
      const prog = i / (steps - 1);
      const val = i % 2 === 0 ? 0 : 1;
      sawtoothRanges.push({ key: 'opacity', val, prog });
    }

    return {
      id: scanLineId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: rgba(0, 255, 0, 0.1); border-top: 1px solid rgba(0, 255, 0, 0.3);"></div>`,
        className: 'absolute w-full pointer-events-none',
        style: {
          top: `${topPercent}%`,
          height: `${heightPercent}%`,
          transform: `skewX(${skewAngle}deg)`,
          ...(hasChromatic
            ? {
                filter:
                  'drop-shadow(2px 0px 0px rgba(255, 0, 0, 0.5)) drop-shadow(-2px 0px 0px rgba(0, 0, 255, 0.5))',
              }
            : {}),
        },
      },
      context: {
        timing: {
          start: 0, // Relative to scan-line-layer
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `scan-flicker-${index}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: delayOffset,
            duration: oscillationDuration,
            mode: 'provider',
            targetIds: [scanLineId],
            ranges: sawtoothRanges,
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Create scan lines
  const scanLines: RenderableComponentData[] = [];
  for (let i = 0; i < scanLineCount; i++) {
    scanLines.push(createScanLineData(i, scanLineCount));
  }

  // Outgoing video (segments tear at different speeds)
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      muted: false,
      volume: 1,
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // Top section: tears away faster (starts early, fast easing)
      {
        id: 'segment-tear-top',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: video1.duration - transitionDuration,
          duration: transitionDuration * 0.6, // Faster tear
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'clipPath', val: 'inset(0% 0% 70% 0%)', prog: 0 },
            { key: 'clipPath', val: 'inset(0% 0% 100% 0%)', prog: 1 },
          ],
        },
      },
      // Middle section: moderate speed
      {
        id: 'segment-tear-middle',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: video1.duration - transitionDuration + 0.2,
          duration: transitionDuration * 0.7,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'clipPath', val: 'inset(30% 0% 40% 0%)', prog: 0 },
            { key: 'clipPath', val: 'inset(30% 0% 100% 0%)', prog: 1 },
          ],
        },
      },
      // Bottom section: tears away slower (lags behind)
      {
        id: 'segment-tear-bottom',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: video1.duration - transitionDuration + 0.3,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'clipPath', val: 'inset(70% 0% 0% 0%)', prog: 0 },
            { key: 'clipPath', val: 'inset(100% 0% 0% 0%)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Static noise overlay (fades out)
  const staticNoiseOverlay: RenderableComponentData = {
    id: 'static-noise-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuNSIvPjwvc3ZnPg=='); background-size: 200px 200px; pointer-events: none; mix-blend-mode: overlay;"></div>`,
      className: 'absolute inset-0',
      style: {},
    },
    context: {
      timing: {
        start: 0, // Relative to incoming-video-container
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'static-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['static-noise-overlay'],
          ranges: [
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      muted: false,
      volume: 1,
    },
    context: {
      timing: {
        start: 0, // Relative to incoming-video-container
        duration: video2.duration + transitionDuration,
      },
    },
  };

  // Incoming video container (starts at overlap)
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: video2.duration + transitionDuration,
      },
    },
    childrenData: [incomingVideo, staticNoiseOverlay],
  };

  // Scan line layer (hue rotation effect applied to container)
  const scanLineLayer: RenderableComponentData = {
    id: 'scan-line-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: video1.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'hue-rotate-layer',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['scan-line-layer'],
          ranges: [
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
            { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: scanLines,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'crt-screen-tear-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [outgoingVideo, incomingVideoContainer, scanLineLayer],
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
  id: 'crt-screen-tear-transition',
  title: 'CRT Screen Tear Transition',
  description:
    'Simulates a CRT monitor malfunction with horizontal scan lines that tear across the screen during video transitions. Features chromatic aberration, static noise overlay, and segmented opacity animations.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'crt', 'glitch', 'retro', 'screen', 'video'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 0.8,
    scanLineCount: 13,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crtScreenTearTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
