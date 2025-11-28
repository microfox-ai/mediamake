/**
 * Torn Paper Edge Transition Preset
 *
 * This preset simulates stop-motion paper cutouts being ripped away with a torn paper edge effect.
 * The outgoing video appears to be torn from right to left with a jagged paper edge mask,
 * revealing the incoming video underneath.
 *
 * Features:
 * - **Torn Paper Edge Effect**: Custom SVG mask or clip-path creates realistic torn paper edges
 * - **Stop-Motion Animation**: Step-based easing creates hand-held paper movement feel
 * - **Rotation Wobble**: Outgoing video rotates 2-3 degrees during tear for realistic motion
 * - **Paper Texture Overlay**: Semi-transparent PNG with multiply blend mode on both videos
 * - **Drop Shadow**: Incoming video has subtle drop shadow visible as paper tears away
 * - **Configurable Overlap**: 1.5 second transition overlap where tear progresses across screen
 *
 * Use cases:
 * - Creating organic, handmade transitions between video clips
 * - Stop-motion style video editing
 * - Craft/DIY video presentations
 * - Creative storytelling with tactile feel
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
      src: z.string().describe('Source URL of the outgoing video'),
      duration: z.number().describe('Duration of outgoing video in seconds'),
    })
    .describe('Outgoing video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      duration: z.number().describe('Duration of incoming video in seconds'),
    })
    .describe('Incoming video configuration'),
  overlapDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of transition overlap in seconds'),
  paperTextureSrc: z
    .string()
    .optional()
    .describe('Optional paper texture overlay PNG source URL'),
  rotationIntensity: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Maximum rotation wobble in degrees'),
  stopMotionSteps: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Number of steps for stop-motion easing effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    overlapDuration,
    paperTextureSrc,
    rotationIntensity,
    stopMotionSteps,
  } = params;

  // Calculate total composition duration
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Calculate transition timing points
  const transitionStartTime = video1.duration - overlapDuration;

  // Generate torn edge SVG path for clip-path animation
  const generateTornEdgePath = (progress: number) => {
    // Create jagged torn paper edge that moves from right to left
    // Progress: 0 = full coverage, 1 = fully torn away
    const rightEdge = 100 - progress * 100;
    
    // Generate random jagged points for torn edge effect
    const jaggedPoints: string[] = [];
    const numPoints = 20;
    for (let i = 0; i <= numPoints; i++) {
      const y = (i / numPoints) * 100;
      const xOffset = Math.sin(i * 1.3) * 3 + Math.cos(i * 2.1) * 2; // Jagged variation
      const x = rightEdge + xOffset;
      jaggedPoints.push(`${x}% ${y}%`);
    }

    return `polygon(0 0, ${jaggedPoints.join(', ')}, ${rightEdge}% 100%, 0 100%)`;
  };

  // Build child components
  const childrenData: RenderableComponentData[] = [];

  // Incoming video (underneath, with drop shadow)
  const incomingVideoId = 'torn-paper-incoming-video';
  childrenData.push({
    id: incomingVideoId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 drop-shadow-2xl',
      fit: 'cover',
      style: {
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: video2.duration,
      },
    },
  } as RenderableComponentData);

  // Outgoing video container (with rotation wobble)
  const outgoingContainerId = 'torn-paper-outgoing-container';
  const outgoingVideoId = 'torn-paper-outgoing-video';

  childrenData.push({
    id: outgoingContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // Rotation wobble effect (stop-motion style)
      {
        id: 'rotation-wobble-effect',
        componentId: 'generic',
        data: {
          type: `steps(${stopMotionSteps})`,
          start: transitionStartTime,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [outgoingContainerId],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: rotationIntensity, prog: 0.3 },
            { key: 'rotate', val: -rotationIntensity * 0.7, prog: 0.6 },
            { key: 'rotate', val: rotationIntensity * 0.3, prog: 0.8 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
      // Opacity fade during tear
      {
        id: 'outgoing-opacity-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: transitionStartTime,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [outgoingContainerId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Torn edge reveal via clip-path
      {
        id: 'torn-edge-clip-path',
        componentId: 'generic',
        data: {
          type: `steps(${stopMotionSteps})`,
          start: transitionStartTime,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [outgoingContainerId],
          ranges: [
            { key: 'clipPath', val: generateTornEdgePath(0), prog: 0 },
            { key: 'clipPath', val: generateTornEdgePath(0.25), prog: 0.25 },
            { key: 'clipPath', val: generateTornEdgePath(0.5), prog: 0.5 },
            { key: 'clipPath', val: generateTornEdgePath(0.75), prog: 0.75 },
            { key: 'clipPath', val: generateTornEdgePath(1), prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: outgoingVideoId,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          className: 'absolute inset-0',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
      } as RenderableComponentData,
    ],
  } as RenderableComponentData);

  // Paper texture overlay (optional)
  if (paperTextureSrc) {
    childrenData.push({
      id: 'paper-texture-overlay',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: paperTextureSrc,
        className: 'absolute inset-0 pointer-events-none opacity-30',
        style: {
          zIndex: 20,
          mixBlendMode: 'multiply',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'torn-paper-transition-root',
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
  id: 'torn-paper-transition',
  title: 'Torn Paper Edge Transition',
  description:
    'A stop-motion style torn paper transition that reveals incoming video by tearing away the outgoing video from right to left with jagged edges, paper texture overlay, rotation wobble, and drop shadow effects',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'paper',
    'torn',
    'stop-motion',
    'handmade',
    'organic',
    'creative',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 1.5,
    paperTextureSrc: 'https://example.com/paper-texture.png',
    rotationIntensity: 3,
    stopMotionSteps: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const tornPaperTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};