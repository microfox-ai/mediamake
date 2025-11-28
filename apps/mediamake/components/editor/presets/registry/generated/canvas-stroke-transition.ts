/**
 * Canvas Stroke Transition Preset
 *
 * A video transition effect where the outgoing video is progressively painted over with
 * ink brush strokes that reveal the incoming video beneath. Features 12-15 hand-painted
 * brush strokes sweeping across at different angles with varying thickness and opacity
 * during a 1.8-second overlap.
 *
 * Features:
 * - Multiple brush strokes (12-15) with varying dimensions and angles
 * - Randomized stroke properties for hand-painted quality
 * - Sectional reveal with mask-based fading for outgoing video
 * - Blur effect on incoming video that clears as strokes complete
 * - Staggered animations with cubic-bezier easing
 * - 1.8-second overlap transition period
 *
 * Use cases:
 * - Creating artistic transitions between video clips
 * - Building painterly video montages
 * - Adding creative ink brush style transitions
 * - Implementing hand-painted visual effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    startFrom: z.number().optional().describe('Start time for incoming video (seconds)'),
  }).describe('Incoming video configuration'),
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    startFrom: z.number().optional().describe('Start time for outgoing video (seconds)'),
  }).describe('Outgoing video configuration'),
  incomingVideoDuration: z.number().describe('Duration of incoming video in seconds'),
  outgoingVideoDuration: z.number().describe('Duration of outgoing video in seconds'),
  transitionDuration: z.number().default(1.8).describe('Duration of transition overlap in seconds'),
  strokeCount: z.number().min(12).max(15).default(15).describe('Number of brush strokes (12-15)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    incomingVideo,
    outgoingVideo,
    incomingVideoDuration,
    outgoingVideoDuration,
    transitionDuration,
    strokeCount,
  } = params;

  // Helper function: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Helper function: Generate random integer in range
  const randomIntInRange = (min: number, max: number): number => {
    return Math.floor(randomInRange(min, max));
  };

  // Calculate BaseLayout duration (sum minus overlap)
  const baseLayoutDuration = outgoingVideoDuration + incomingVideoDuration - transitionDuration;

  // Generate brush stroke data
  const brushStrokes: Array<{
    id: string;
    width: number;
    rotation: number;
    opacity: number;
    delay: number;
    leftPosition: number;
  }> = [];

  for (let i = 0; i < strokeCount; i++) {
    brushStrokes.push({
      id: `stroke-${i + 1}`,
      width: randomInRange(2, 8), // 2-8% width
      rotation: randomInRange(-15, 15), // -15 to 15 degrees
      opacity: randomInRange(0.7, 1.0), // 0.7-1.0 opacity
      delay: i * randomInRange(0.1, 0.2), // Stagger by 0.1-0.2s
      leftPosition: randomInRange(0, 100), // Random horizontal position
    });
  }

  // Create brush stroke child nodes
  const strokeChildren: RenderableComponentData[] = brushStrokes.map((stroke) => ({
    id: stroke.id,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute',
      style: {
        width: `${stroke.width}%`,
        height: '100%',
        backgroundColor: '#000000',
        left: `${stroke.leftPosition}%`,
        top: 0,
        transform: `translateX(-100%) rotate(${stroke.rotation}deg)`,
        opacity: stroke.opacity,
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: `${stroke.id}-slide`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          start: stroke.delay,
          duration: transitionDuration - stroke.delay,
          mode: 'provider',
          targetIds: [stroke.id],
          ranges: [
            { key: 'translateX', val: '-100%', prog: 0 },
            { key: 'translateX', val: '200%', prog: 1 },
          ],
        },
      },
    ],
  }));

  // Incoming video layer (z-0)
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom ?? 0,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: outgoingVideoDuration - transitionDuration,
        duration: incomingVideoDuration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-layer'],
          ranges: [
            { key: 'filter', val: 'blur(2px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing video layer (z-10)
  const outgoingVideoLayer: RenderableComponentData = {
    id: 'outgoing-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom ?? 0,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 10,
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
        id: 'outgoing-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingVideoDuration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Brush strokes container (z-20)
  const brushStrokesContainer: RenderableComponentData = {
    id: 'brush-strokes-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 20,
          pointerEvents: 'none',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideoDuration - transitionDuration,
        duration: transitionDuration,
      },
    },
    childrenData: strokeChildren,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'canvas-stroke-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      incomingVideoLayer,
      outgoingVideoLayer,
      brushStrokesContainer,
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
  id: 'canvas-stroke-transition',
  title: 'Canvas Stroke Transition',
  description:
    'A video transition effect where the outgoing video is progressively painted over with ink brush strokes that reveal the incoming video beneath. Features 12-15 hand-painted brush strokes sweeping across at different angles with varying thickness and opacity during a 1.8-second overlap. The outgoing video fades out in sections as strokes pass over, while the incoming video is revealed with a soft feathered blur effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'canvas', 'brush', 'stroke', 'painterly', 'artistic', 'ink'],
  defaultInputParams: {
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      startFrom: 0,
    },
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      startFrom: 0,
    },
    incomingVideoDuration: 10,
    outgoingVideoDuration: 10,
    transitionDuration: 1.8,
    strokeCount: 15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const canvasStrokeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
