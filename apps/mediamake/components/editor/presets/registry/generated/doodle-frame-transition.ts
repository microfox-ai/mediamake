/**
 * Doodle Frame Transition Preset
 *
 * Creates a playful hand-drawn frame transition where videos animate in sketchy rectangular frames
 * with a picture-in-picture effect. The outgoing video shrinks into a small wobbly frame at the top-left
 * while the incoming video expands from a small frame at the bottom-right. Hand-drawn frame borders with
 * varying line thickness and uneven corners create an organic, sketchy look. Small doodle annotations
 * (arrows, exclamation marks, underlines) appear to highlight and point to the transitioning videos.
 *
 * Features:
 * - **Wobbly Frame Animations**: Polygon clip-paths with 8-12 points create hand-drawn rectangular edges
 * - **Picture-in-Picture Effect**: Outgoing video shrinks to 30% at (10%, 10%), incoming expands from 30% at (60%, 60%)
 * - **Hand-Drawn Borders**: Animated stroke paths with variable thickness (3-6px) overlay the frames
 * - **Doodle Annotations**: Playful arrows, exclamation marks, and underlines appear/disappear during transition
 * - **Drop Shadows**: Frames have subtle drop-shadow(2px 2px 4px rgba(0,0,0,0.3)) for depth
 * - **Spring Easing**: Organic, bouncy movement for natural hand-drawn feel
 *
 * Use cases:
 * - Creating playful, organic video transitions
 * - Adding hand-drawn, sketchy aesthetic to video content
 * - Building creative picture-in-picture effects
 * - Adding personality to educational or explainer videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('First video (outgoing)'),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Second video (incoming)'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition overlap in seconds'),
  frameStrokeWidth: z
    .number()
    .min(3)
    .max(6)
    .default(4)
    .describe('Stroke width for hand-drawn frame borders in pixels'),
  frameColor: z
    .string()
    .default('#2c2c2c')
    .describe('Color of the hand-drawn frame borders'),
  showAnnotations: z
    .boolean()
    .default(true)
    .describe('Whether to show doodle annotations (arrows, exclamation marks, underlines)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, frameStrokeWidth, frameColor, showAnnotations } = params;

  // Helper: Create wobbly polygon clip-path with 8-12 points
  const createWobblyRectPath = (
    x: number,
    y: number,
    width: number,
    height: number,
    wobble: number = 2,
  ): string => {
    const points: string[] = [];
    const numPoints = 12; // 3 points per side

    // Top edge
    for (let i = 0; i < 3; i++) {
      const px = x + (width * i) / 2 + (Math.random() - 0.5) * wobble;
      const py = y + (Math.random() - 0.5) * wobble;
      points.push(`${px}% ${py}%`);
    }

    // Right edge
    for (let i = 0; i < 3; i++) {
      const px = x + width + (Math.random() - 0.5) * wobble;
      const py = y + (height * i) / 2 + (Math.random() - 0.5) * wobble;
      points.push(`${px}% ${py}%`);
    }

    // Bottom edge
    for (let i = 2; i >= 0; i--) {
      const px = x + (width * i) / 2 + (Math.random() - 0.5) * wobble;
      const py = y + height + (Math.random() - 0.5) * wobble;
      points.push(`${px}% ${py}%`);
    }

    // Left edge
    for (let i = 2; i >= 0; i--) {
      const px = x + (Math.random() - 0.5) * wobble;
      const py = y + (height * i) / 2 + (Math.random() - 0.5) * wobble;
      points.push(`${px}% ${py}%`);
    }

    return `polygon(${points.join(', ')})`;
  };

  // Calculate timing
  const baseLayoutDuration = video1.duration + video2.duration - transitionDuration;
  const transitionStart = video1.duration - transitionDuration;

  // Create wobbly clip-paths
  const outgoingFullClip = createWobblyRectPath(0, 0, 100, 100, 1);
  const outgoingSmallClip = createWobblyRectPath(10, 10, 30, 30, 2);
  const incomingSmallClip = createWobblyRectPath(60, 60, 30, 30, 2);
  const incomingFullClip = createWobblyRectPath(0, 0, 100, 100, 1);

  const childrenData: RenderableComponentData[] = [];

  // Outgoing video container with clip-path animation
  childrenData.push({
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
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
      {
        id: 'outgoing-clip-path',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: transitionStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'clipPath', val: outgoingFullClip, prog: 0 },
            { key: 'clipPath', val: outgoingSmallClip, prog: 0.7 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          className: 'w-full h-full object-cover',
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

  // Outgoing frame border (hand-drawn stroke)
  childrenData.push({
    id: 'outgoing-frame-border',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path 
            d="M 1,1 L 99,1 L 99,99 L 1,99 Z" 
            fill="none" 
            stroke="${frameColor}" 
            stroke-width="${frameStrokeWidth / 10}" 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            vector-effect="non-scaling-stroke"
            pathLength="100"
          />
        </svg>
      `,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-border-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-frame-border'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Incoming video container with clip-path animation
  childrenData.push({
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-clip-path',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'clipPath', val: incomingSmallClip, prog: 0 },
            { key: 'clipPath', val: incomingFullClip, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  } as RenderableComponentData);

  // Incoming frame border (hand-drawn stroke)
  childrenData.push({
    id: 'incoming-frame-border',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path 
            d="M 60,60 L 90,60 L 90,90 L 60,90 Z" 
            fill="none" 
            stroke="${frameColor}" 
            stroke-width="${frameStrokeWidth / 5}" 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            vector-effect="non-scaling-stroke"
            pathLength="100"
          />
        </svg>
      `,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-border-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-frame-border'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // Doodle annotations (if enabled)
  if (showAnnotations) {
    // Arrow annotation pointing to incoming video
    childrenData.push({
      id: 'annotation-arrow',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `
          <svg class="w-16 h-16" viewBox="0 0 64 64">
            <path 
              d="M 10,10 Q 25,20 40,15" 
              fill="none" 
              stroke="#ff6b6b" 
              stroke-width="3" 
              stroke-linecap="round"
            />
            <path 
              d="M 40,15 L 35,12 L 37,18 Z" 
              fill="#ff6b6b"
            />
          </svg>
        `,
        className: 'absolute',
        style: {
          top: '55%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        },
      },
      context: {
        timing: {
          start: transitionStart + 0.3,
          duration: 0.8,
        },
      },
      effects: [
        {
          id: 'arrow-animation',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 0.8,
            mode: 'provider',
            targetIds: ['annotation-arrow'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'rotate', val: -5, prog: 0 },
              { key: 'rotate', val: 5, prog: 0.5 },
              { key: 'rotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);

    // Exclamation mark annotation
    childrenData.push({
      id: 'annotation-exclamation',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `
          <svg class="w-8 h-12" viewBox="0 0 32 48">
            <line 
              x1="16" y1="8" x2="16" y2="28" 
              stroke="#4ecdc4" 
              stroke-width="4" 
              stroke-linecap="round"
            />
            <circle cx="16" cy="36" r="3" fill="#4ecdc4"/>
          </svg>
        `,
        className: 'absolute',
        style: {
          top: '50%',
          left: '75%',
        },
      },
      context: {
        timing: {
          start: transitionStart + 0.5,
          duration: 0.6,
        },
      },
      effects: [
        {
          id: 'exclamation-animation',
          componentId: 'generic',
          data: {
            type: 'spring',
            start: 0,
            duration: 0.6,
            mode: 'provider',
            targetIds: ['annotation-exclamation'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);

    // Underline annotation
    childrenData.push({
      id: 'annotation-underline',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `
          <svg class="w-24 h-4" viewBox="0 0 96 16">
            <path 
              d="M 4,8 Q 24,12 48,8 T 92,8" 
              fill="none" 
              stroke="#ffe66d" 
              stroke-width="3" 
              stroke-linecap="round"
            />
          </svg>
        `,
        className: 'absolute',
        style: {
          top: '25%',
          left: '10%',
        },
      },
      context: {
        timing: {
          start: transitionStart + 0.1,
          duration: 0.7,
        },
      },
      effects: [
        {
          id: 'underline-animation',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.7,
            mode: 'provider',
            targetIds: ['annotation-underline'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scaleX', val: 0, prog: 0 },
              { key: 'scaleX', val: 1, prog: 0.5 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  const rootContainer: RenderableComponentData = {
    id: 'doodle-frame-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#ffffff',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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
  id: 'doodle-frame-transition',
  title: 'Doodle Frame Transition',
  description:
    'Hand-drawn rectangular frame transition with wobbly edges for picture-in-picture effect. The outgoing video shrinks into a sketchy frame while the incoming video expands from a small doodle frame, with playful annotation elements (arrows, exclamation marks, underlines) that appear and disappear to highlight the transition.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'doodle', 'hand-drawn', 'frame', 'picture-in-picture', 'playful', 'annotations'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 3,
    },
    transitionDuration: 1.5,
    frameStrokeWidth: 4,
    frameColor: '#2c2c2c',
    showAnnotations: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const doodleFrameTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};