/**
 * Crystal Formation Transition Preset
 *
 * Creates a geometric crystal formation transition where triangular crystal shards grow from
 * the edges of the frame toward the center, replacing the outgoing video with the incoming one.
 * Each crystal has prismatic light refraction creating rainbow edges.
 *
 * Features:
 * - 32 triangular crystals positioned radially around frame edges
 * - Prismatic rainbow edges using multi-colored box-shadows
 * - Progressive crystallization wave effect (edge-to-center growth)
 * - 2-second overlap transition period
 * - Optional audio-reactive scaling for beat synchronization
 * - Smooth fade transitions within each crystal
 *
 * Use cases:
 * - Creating dramatic transitions between video clips
 * - Adding futuristic visual effects to video sequences
 * - Building music video transitions with audio reactivity
 * - Creating glass/crystal shatter effects between scenes
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    startFrom: z.number().optional().describe('Start time in seconds for outgoing video'),
    volume: z.number().optional().describe('Volume level for outgoing video (0-1)'),
    muted: z.boolean().optional().describe('Whether to mute the outgoing video'),
  }).describe('Configuration for the outgoing video'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time in seconds for incoming video'),
    volume: z.number().optional().describe('Volume level for incoming video (0-1)'),
    muted: z.boolean().optional().describe('Whether to mute the incoming video'),
  }).describe('Configuration for the incoming video'),
  
  transitionStart: z.number().describe('Time in seconds when the transition should start'),
  
  overlapDuration: z.number().default(2).describe('Duration of the transition overlap in seconds'),
  
  crystalCount: z.number().default(32).describe('Number of crystal shards (recommended: 24-40)'),
  
  audioReactive: z.boolean().default(false).describe('Enable audio-reactive scaling effects'),
  
  audioSrc: z.string().optional().describe('Audio source URL for audio-reactive effects (required if audioReactive is true)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionStart,
    overlapDuration,
    crystalCount,
    audioReactive,
    audioSrc,
  } = params;

  const { config } = props;
  const width = config?.width || 1920;
  const height = config?.height || 1080;

  // Helper function to generate crystal polygon points
  const generateCrystalPolygon = (index: number, total: number): string => {
    const angle = (index / total) * Math.PI * 2;
    const nextAngle = ((index + 1) / total) * Math.PI * 2;
    
    // Determine which edge the crystal originates from
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    
    // Calculate edge position (frame perimeter)
    let x1: number, y1: number;
    
    if (Math.abs(cos) > Math.abs(sin)) {
      // Left or right edge
      if (cos > 0) {
        // Right edge
        x1 = 100;
        y1 = 50 + sin * 50;
      } else {
        // Left edge
        x1 = 0;
        y1 = 50 - sin * 50;
      }
    } else {
      // Top or bottom edge
      if (sin > 0) {
        // Bottom edge
        x1 = 50 + cos * 50;
        y1 = 100;
      } else {
        // Top edge
        x1 = 50 - cos * 50;
        y1 = 0;
      }
    }
    
    // Calculate next edge position
    const nextSin = Math.sin(nextAngle);
    const nextCos = Math.cos(nextAngle);
    let x2: number, y2: number;
    
    if (Math.abs(nextCos) > Math.abs(nextSin)) {
      if (nextCos > 0) {
        x2 = 100;
        y2 = 50 + nextSin * 50;
      } else {
        x2 = 0;
        y2 = 50 - nextSin * 50;
      }
    } else {
      if (nextSin > 0) {
        x2 = 50 + nextCos * 50;
        y2 = 100;
      } else {
        x2 = 50 - nextCos * 50;
        y2 = 0;
      }
    }
    
    // Center point
    const centerX = 50;
    const centerY = 50;
    
    // Create triangle pointing toward center
    return `polygon(${x1}% ${y1}%, ${x2}% ${y2}%, ${centerX}% ${centerY}%)`;
  };

  // Helper function to generate prismatic box-shadow
  const generatePrismaticShadow = (): string => {
    const colors = [
      'rgba(255, 0, 0, 0.6)',     // Red
      'rgba(255, 127, 0, 0.5)',   // Orange
      'rgba(255, 255, 0, 0.4)',   // Yellow
      'rgba(0, 255, 0, 0.5)',     // Green
      'rgba(0, 0, 255, 0.6)',     // Blue
      'rgba(75, 0, 130, 0.5)',    // Indigo
      'rgba(148, 0, 211, 0.6)',   // Violet
    ];
    
    return colors
      .map((color, i) => `${i * 2}px ${i * 2}px ${4 + i * 2}px ${color}`)
      .join(', ');
  };

  // Generate crystal shards
  const crystalShards: RenderableComponentData[] = [];
  
  for (let i = 0; i < crystalCount; i++) {
    const clipPath = generateCrystalPolygon(i, crystalCount);
    const prismaticShadow = generatePrismaticShadow();
    
    // Calculate stagger delay based on radial position (edge crystals grow first)
    const angle = (i / crystalCount) * Math.PI * 2;
    const distanceFromEdge = 1; // All start from edge
    const staggerDelay = (i / crystalCount) * overlapDuration * 0.8; // Stagger over 80% of transition
    
    // Calculate transform origin based on edge position
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    let originX = '50%';
    let originY = '50%';
    
    if (Math.abs(cos) > Math.abs(sin)) {
      originX = cos > 0 ? '100%' : '0%';
      originY = `${50 + sin * 50}%`;
    } else {
      originX = `${50 + cos * 50}%`;
      originY = sin > 0 ? '100%' : '0%';
    }

    const crystalId = `crystal-${i}`;

    // Create crystal container with both videos clipped
    const crystalShard: RenderableComponentData = {
      id: crystalId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath,
            transformOrigin: `${originX} ${originY}`,
            boxShadow: prismaticShadow,
            filter: 'brightness(1.1) contrast(1.1)',
          },
        },
      },
      context: {
        timing: {
          start: transitionStart + staggerDelay,
          duration: overlapDuration - staggerDelay,
        },
      },
      effects: [
        // Crystal growth animation
        {
          id: `crystal-grow-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.5,
            mode: 'provider',
            targetIds: [crystalId],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Outgoing video (fades out)
        {
          id: `crystal-outgoing-${i}`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            startFrom: outgoingVideo.startFrom || 0,
            volume: outgoingVideo.volume || 0,
            muted: outgoingVideo.muted !== undefined ? outgoingVideo.muted : true,
            fit: 'cover',
            className: 'absolute inset-0 w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: overlapDuration - staggerDelay,
            },
          },
          effects: [
            {
              id: `outgoing-fade-${i}`,
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: overlapDuration - staggerDelay,
                mode: 'provider',
                targetIds: [`crystal-outgoing-${i}`],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: 0.8, prog: 1 },
                ],
              },
            },
          ],
        },
        // Incoming video (fades in)
        {
          id: `crystal-incoming-${i}`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            startFrom: incomingVideo.startFrom || 0,
            volume: incomingVideo.volume || 0,
            muted: incomingVideo.muted !== undefined ? incomingVideo.muted : true,
            fit: 'cover',
            className: 'absolute inset-0 w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: overlapDuration - staggerDelay,
            },
          },
          effects: [
            {
              id: `incoming-fade-${i}`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: overlapDuration - staggerDelay,
                mode: 'provider',
                targetIds: [`crystal-incoming-${i}`],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                  { key: 'scale', val: 1.2, prog: 0 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
          ],
        },
      ],
    };

    // Add audio-reactive effect if enabled
    if (audioReactive && audioSrc) {
      crystalShard.effects = crystalShard.effects || [];
      crystalShard.effects.push({
        id: `audio-reactive-${i}`,
        componentId: 'waveform',
        data: {
          audioSrc,
          effectType: 'scale',
          intensity: 0.15,
          baseScale: 1,
          sensitivity: 1.2,
          threshold: 0.3,
          audioProperty: 'bass',
          numberOfSamples: 128,
          useFrequencyData: true,
          smoothNormalisation: 1,
          mode: 'provider',
          targetIds: [crystalId],
          start: 0,
          duration: overlapDuration - staggerDelay,
        },
      });
    }

    crystalShards.push(crystalShard);
  }

  // Create base layer with outgoing video (full frame)
  const outgoingVideoBase: RenderableComponentData = {
    id: 'outgoing-video-base',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom || 0,
      volume: outgoingVideo.volume || 1,
      muted: outgoingVideo.muted || false,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionStart + overlapDuration,
      },
    },
  };

  // Create incoming video base (appears after transition)
  const incomingVideoBase: RenderableComponentData = {
    id: 'incoming-video-base',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom || 0,
      volume: incomingVideo.volume || 1,
      muted: incomingVideo.muted || false,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: transitionStart + overlapDuration,
        duration: 10, // Continue playing (adjust as needed)
      },
    },
  };

  const rootContainer: RenderableComponentData = {
    id: 'crystal-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionStart + overlapDuration + 10,
      },
    },
    childrenData: [
      outgoingVideoBase,
      ...crystalShards,
      incomingVideoBase,
    ] as RenderableComponentData[],
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
  id: 'crystal-transition',
  title: 'Crystal Formation Transition',
  description: 'A geometric crystal formation transition where triangular crystal shards grow from the edges of the frame toward the center, replacing the outgoing video with the incoming one. Features prismatic light refraction with rainbow edges and optional audio-reactive scaling.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'crystal', 'geometric', 'video', 'audio-reactive'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
      volume: 1,
      muted: false,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
      volume: 1,
      muted: false,
    },
    transitionStart: 5,
    overlapDuration: 2,
    crystalCount: 32,
    audioReactive: false,
    audioSrc: undefined,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crystalTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
