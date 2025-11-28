/**
 * Broken CRT Screen Transition Preset
 *
 * Simulates a failing CRT monitor with vertical collapse, banding, blackouts, and 
 * geometry distortions on outgoing video. Incoming video appears in fragments as 
 * different quadrants "warm up" at different rates. Includes electrical buzz and 
 * high-pitched whine audio effects synchronized with visual glitches.
 *
 * Features:
 * - Vertical collapse with step-function flickering on outgoing video
 * - Multiple masked bands with independent animations
 * - Random blackouts at irregular intervals
 * - Quadrant-based fragment reveal for incoming video
 * - Perspective and rotation distortions
 * - Electrical buzz (60Hz) and high-pitched whine (15kHz) audio effects
 *
 * Use cases:
 * - Retro/VHS-style transitions
 * - Glitch art transitions
 * - Technical failure simulation
 * - Nostalgic CRT monitor effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  transitionDuration: z.number().default(1.8).describe('Duration of the transition overlap in seconds'),
  buzzerAudioSrc: z.string().optional().describe('Optional 60Hz electrical buzz audio source'),
  whineAudioSrc: z.string().optional().describe('Optional high-pitched whine audio source (15kHz range)'),
  outgoingVideoDuration: z.number().describe('Duration of the outgoing video in seconds'),
  incomingVideoDuration: z.number().describe('Duration of the incoming video in seconds'),
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
    buzzerAudioSrc,
    whineAudioSrc,
    outgoingVideoDuration,
    incomingVideoDuration,
  } = params;

  // Calculate total duration: outgoing + incoming - overlap
  const totalDuration = outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Create 4 bands for the outgoing video (each shows a quarter of the video)
  const createOutgoingBand = (bandIndex: number): RenderableComponentData => {
    const bandId = `outgoing-band-${bandIndex}`;
    const videoId = `outgoing-video-${bandIndex}`;
    
    // Calculate band position (0-25%, 25-50%, 50-75%, 75-100%)
    const topPercent = bandIndex * 25;
    const heightPercent = 25;
    
    // Stagger the collapse timing for each band
    const collapseStartOffset = bandIndex * 0.15; // Each band starts collapsing 0.15s after the previous
    const collapseStart = outgoingVideoDuration - transitionDuration + collapseStartOffset;
    const collapseDuration = transitionDuration - collapseStartOffset;

    return {
      id: bandId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-x-0',
          style: {
            top: `${topPercent}%`,
            height: `${heightPercent}%`,
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      effects: [
        // Vertical collapse effect with step function flickering
        {
          id: `collapse-${bandId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: collapseStart,
            duration: collapseDuration,
            mode: 'provider',
            targetIds: [bandId],
            ranges: [
              { key: 'scaleY', val: 1, prog: 0 },
              { key: 'scaleY', val: 0.7, prog: 0.3 },
              { key: 'scaleY', val: 0.4, prog: 0.6 },
              { key: 'scaleY', val: 0.2, prog: 0.85 },
              { key: 'scaleY', val: 0.1, prog: 1 },
            ],
          },
        },
        // Flickering opacity with step-like behavior
        {
          id: `flicker-${bandId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: collapseStart,
            duration: collapseDuration,
            mode: 'provider',
            targetIds: [bandId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.15 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'opacity', val: 0.5, prog: 0.35 },
              { key: 'opacity', val: 1, prog: 0.4 },
              { key: 'opacity', val: 0.3, prog: 0.55 },
              { key: 'opacity', val: 0.8, prog: 0.6 },
              { key: 'opacity', val: 0.2, prog: 0.75 },
              { key: 'opacity', val: 0.6, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Vertical shift/jitter
        {
          id: `shift-${bandId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: collapseStart,
            duration: collapseDuration,
            mode: 'provider',
            targetIds: [bandId],
            ranges: [
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: '-5px', prog: 0.2 },
              { key: 'translateY', val: '3px', prog: 0.4 },
              { key: 'translateY', val: '-8px', prog: 0.6 },
              { key: 'translateY', val: '10px', prog: 0.8 },
              { key: 'translateY', val: '0px', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideoSrc,
            fit: 'cover',
            muted: true,
            className: 'w-full h-full object-cover',
            style: {
              position: 'absolute',
              top: `-${topPercent}%`,
              left: 0,
              width: '100%',
              height: '400%', // 4x height to show only the band's portion
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
    } as RenderableComponentData;
  };

  // Create 4 quadrants for the incoming video (top-left, top-right, bottom-left, bottom-right)
  const createIncomingQuadrant = (
    quadrantId: string,
    position: 'tl' | 'tr' | 'bl' | 'br',
    delayOffset: number,
  ): RenderableComponentData => {
    const videoId = `incoming-video-${position}`;
    
    // Determine position and clip-path based on quadrant
    const positionStyles: Record<string, any> = {
      tl: { top: 0, left: 0, clipPath: 'inset(0 50% 50% 0)' },
      tr: { top: 0, right: 0, clipPath: 'inset(0 0 50% 50%)' },
      bl: { bottom: 0, left: 0, clipPath: 'inset(50% 50% 0 0)' },
      br: { bottom: 0, right: 0, clipPath: 'inset(50% 0 0 50%)' },
    };

    const fadeInStart = 0; // Relative to quadrant start
    const fadeInDuration = transitionDuration * 0.7; // 70% of transition duration

    return {
      id: quadrantId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            ...positionStyles[position],
            width: '50%',
            height: '50%',
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: outgoingVideoDuration - transitionDuration + delayOffset,
          duration: incomingVideoDuration + (transitionDuration - delayOffset),
        },
      },
      effects: [
        // Fade in from darkness
        {
          id: `fade-in-${quadrantId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: fadeInStart,
            duration: fadeInDuration,
            mode: 'provider',
            targetIds: [quadrantId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.3 },
              { key: 'opacity', val: 0.7, prog: 0.6 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Geometry distortion during warm-up
        {
          id: `distort-${quadrantId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: fadeInStart,
            duration: fadeInDuration,
            mode: 'provider',
            targetIds: [quadrantId],
            ranges: [
              { key: 'rotateX', val: 15, prog: 0 },
              { key: 'rotateX', val: 8, prog: 0.3 },
              { key: 'rotateX', val: 3, prog: 0.6 },
              { key: 'rotateX', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            fit: 'cover',
            muted: true,
            className: 'w-full h-full object-cover',
            style: {
              width: '200%', // 2x width to show only half
              height: '200%', // 2x height to show only half
              // Position to show correct quadrant
              ...(position === 'tl' && { top: 0, left: 0 }),
              ...(position === 'tr' && { top: 0, right: 0 }),
              ...(position === 'bl' && { bottom: 0, left: 0 }),
              ...(position === 'br' && { bottom: 0, right: 0 }),
            },
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideoDuration + (transitionDuration - delayOffset),
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  };

  // Create blackout overlay with random flashes
  const blackoutOverlay: RenderableComponentData = {
    id: 'blackout-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideoDuration - transitionDuration,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'blackout-flashes',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['blackout-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.15 }, // Blackout at 15%
            { key: 'opacity', val: 0, prog: 0.18 },
            { key: 'opacity', val: 0.8, prog: 0.3 }, // Blackout at 30%
            { key: 'opacity', val: 0, prog: 0.33 },
            { key: 'opacity', val: 1, prog: 0.45 }, // Blackout at 45%
            { key: 'opacity', val: 0, prog: 0.48 },
            { key: 'opacity', val: 0.9, prog: 0.6 }, // Blackout at 60%
            { key: 'opacity', val: 0, prog: 0.63 },
            { key: 'opacity', val: 1, prog: 0.75 }, // Blackout at 75%
            { key: 'opacity', val: 0, prog: 0.78 },
            { key: 'opacity', val: 0.7, prog: 0.9 }, // Blackout at 90%
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Build the complete child tree
  const childrenData: RenderableComponentData[] = [
    // Outgoing video container with 4 bands
    {
      id: 'outgoing-video-container',
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
        createOutgoingBand(0),
        createOutgoingBand(1),
        createOutgoingBand(2),
        createOutgoingBand(3),
      ],
    } as RenderableComponentData,

    // Blackout overlay
    blackoutOverlay,

    // Incoming video container with 4 quadrants (staggered timing)
    {
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
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [
        createIncomingQuadrant('incoming-quadrant-tl', 'tl', 0.3), // Top-left starts at 0.3s into transition
        createIncomingQuadrant('incoming-quadrant-tr', 'tr', 0.5), // Top-right starts at 0.5s
        createIncomingQuadrant('incoming-quadrant-bl', 'bl', 0.7), // Bottom-left starts at 0.7s
        createIncomingQuadrant('incoming-quadrant-br', 'br', 0.4), // Bottom-right starts at 0.4s
      ],
    } as RenderableComponentData,
  ];

  // Add audio effects if provided
  if (buzzerAudioSrc) {
    childrenData.push({
      id: 'audio-buzz',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: buzzerAudioSrc,
        volume: 0.6,
      },
      context: {
        timing: {
          start: outgoingVideoDuration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        // Volume modulation matching visual glitches
        {
          id: 'buzz-modulation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['audio-buzz'],
            ranges: [
              { key: 'volume', val: 0.3, prog: 0 },
              { key: 'volume', val: 0.8, prog: 0.15 },
              { key: 'volume', val: 0.4, prog: 0.3 },
              { key: 'volume', val: 0.9, prog: 0.45 },
              { key: 'volume', val: 0.5, prog: 0.6 },
              { key: 'volume', val: 1, prog: 0.75 },
              { key: 'volume', val: 0.6, prog: 0.9 },
              { key: 'volume', val: 0.2, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  if (whineAudioSrc) {
    childrenData.push({
      id: 'audio-whine',
      type: 'atom',
      componentId: 'AudioAtom',
      data: {
        src: whineAudioSrc,
        volume: 0.4,
      },
      context: {
        timing: {
          start: outgoingVideoDuration - transitionDuration,
          duration: transitionDuration,
        },
      },
      effects: [
        // High-pitched whine with pitch/volume variation
        {
          id: 'whine-modulation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['audio-whine'],
            ranges: [
              { key: 'volume', val: 0.2, prog: 0 },
              { key: 'volume', val: 0.6, prog: 0.2 },
              { key: 'volume', val: 0.3, prog: 0.4 },
              { key: 'volume', val: 0.8, prog: 0.6 },
              { key: 'volume', val: 0.5, prog: 0.8 },
              { key: 'volume', val: 0.1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  const rootContainer: RenderableComponentData = {
    id: 'broken-crt-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
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
  id: 'broken-crt-transition',
  title: 'Broken CRT Screen Transition',
  description: 'Simulates a failing CRT monitor transition with vertical collapse, banding, blackouts, geometry distortions on outgoing video, and quadrant-based warm-up on incoming video. Includes electrical buzz and high-pitched whine audio effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'crt', 'glitch', 'retro', 'vhs', 'vertical-collapse', 'distortion', 'audio-effects'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 1.8,
    outgoingVideoDuration: 5,
    incomingVideoDuration: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const brokenCrtTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};