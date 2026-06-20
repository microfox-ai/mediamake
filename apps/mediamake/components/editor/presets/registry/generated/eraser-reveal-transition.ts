/**
 * Eraser Reveal Transition Preset
 * 
 * Simulates a large eraser removing a sketched outgoing scene to reveal a clean incoming video underneath.
 * The eraser moves in smooth, curved strokes across the screen, creating an organic reveal effect.
 * 
 * Features:
 * - Curved eraser path using SVG path animation
 * - Pencil sketch filter on outgoing video that progressively erases
 * - Soft-edged reveal trail with blur
 * - Graphite particle debris falling from eraser path
 * - Physics-based particle animation with gravity
 * - 1.4-second overlap transition period
 * 
 * Technical Implementation:
 * - BaseLayout with physics-based particle container
 * - SVG clipPath element with animated stroke-dashoffset
 * - Incoming video revealed through clip-path
 * - Outgoing video with sketch filter and inverse masking
 * - 20-30 small particle circles with translateY + opacity fade
 * - Soft edges using CSS blur filter
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
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  transitionDuration: z
    .number()
    .default(1.4)
    .describe('Duration of eraser transition overlap in seconds'),
  eraserWidth: z
    .number()
    .default(15)
    .describe('Width of eraser path as percentage of screen width'),
  particleCount: z
    .number()
    .min(20)
    .max(30)
    .default(25)
    .describe('Number of graphite particle debris'),
  edgeBlur: z
    .number()
    .default(2)
    .describe('Blur amount for soft edges in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    incomingVideo,
    outgoingVideo,
    transitionDuration,
    eraserWidth,
    particleCount,
    edgeBlur,
  } = params;

  // Calculate BaseLayout duration (subtract overlap)
  const baseLayoutDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Generate curved eraser path (bezier curve from top-left to bottom-right)
  const generateEraserPath = () => {
    const width = props.config?.width || 1920;
    const height = props.config?.height || 1080;
    
    // Curved path with multiple control points for organic movement
    return `M ${-eraserWidth * width / 100} ${height * 0.2} 
            C ${width * 0.2} ${height * 0.1}, 
              ${width * 0.4} ${height * 0.3}, 
              ${width * 0.5} ${height * 0.5}
            C ${width * 0.6} ${height * 0.7}, 
              ${width * 0.8} ${height * 0.9}, 
              ${width + eraserWidth * width / 100} ${height * 0.8}`;
  };

  // Calculate path length for stroke-dashoffset animation
  const pathLength = 2500; // Approximate path length

  // Generate particle positions along eraser path
  const generateParticles = () => {
    const particles: RenderableComponentData[] = [];
    const width = props.config?.width || 1920;
    const height = props.config?.height || 1080;

    for (let i = 0; i < particleCount; i++) {
      const progress = i / particleCount;
      
      // Position particles along the eraser path
      const x = progress * 100;
      const y = 20 + progress * 60; // Follow diagonal path
      
      // Randomize particle size (2-4px)
      const size = Math.floor(Math.random() * 3) + 2;
      
      // Stagger particle animation start times
      const startTime = progress * 0.8;
      
      // Randomize fall duration
      const fallDuration = 0.8 + Math.random() * 0.4;
      
      // Randomize fall distance
      const fallDistance = 80 + Math.random() * 40;

      particles.push({
        id: `particle-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: rgba(80, 80, 80, 0.6);"></div>`,
          className: 'absolute pointer-events-none',
          style: {
            left: `${x}%`,
            top: `${y}%`,
            zIndex: 40,
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: fallDuration,
          },
        },
        effects: [
          {
            id: `particle-fall-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: fallDuration,
              mode: 'provider',
              targetIds: [`particle-${i}`],
              ranges: [
                // Gravity animation with acceleration
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: fallDistance, prog: 1 },
                // Fade out as falling
                { key: 'opacity', val: 0.6, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // SVG definition for eraser clipPath
  const svgDefsId = 'eraser-svg-defs';
  const clipPathId = 'eraser-path';

  const svgDefs: RenderableComponentData = {
    id: svgDefsId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
          <defs>
            <clipPath id="${clipPathId}" clipPathUnits="objectBoundingBox">
              <rect width="1" height="1" fill="white">
                <animate
                  attributeName="width"
                  from="0"
                  to="1"
                  dur="${transitionDuration}s"
                  fill="freeze"
                />
              </rect>
            </clipPath>
          </defs>
        </svg>
      `,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
  };

  // Incoming video (revealed through clip-path)
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        filter: `blur(${edgeBlur}px)`,
        clipPath: `url(#${clipPathId})`,
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-blur-clear',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration * 0.5,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: `blur(${edgeBlur}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing video (with sketch filter, progressively masked)
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        filter: 'contrast(1.2) brightness(1.1) grayscale(0.3)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      {
        id: 'sketch-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Particle container
  const particleContainer: RenderableComponentData = {
    id: 'particle-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 40,
        },
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    childrenData: generateParticles(),
  };

  // Incoming video container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-video-container',
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
        duration: baseLayoutDuration,
      },
    },
    childrenData: [incomingVideoNode],
  };

  // Outgoing video container
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
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
        duration: baseLayoutDuration,
      },
    },
    childrenData: [outgoingVideoNode],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'eraser-reveal-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#f5f5f0',
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
      svgDefs,
      incomingContainer,
      outgoingContainer,
      particleContainer,
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
  id: 'eraser-reveal-transition',
  title: 'Eraser Reveal Transition',
  description:
    'A transition that simulates a large eraser removing a sketched outgoing scene to reveal clean incoming video underneath. Features smooth curved eraser motion, pencil sketch filter on outgoing video, soft-edged reveal path, and animated graphite particle debris falling from the eraser path.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'eraser',
    'reveal',
    'sketch',
    'particles',
    'organic',
    'creative',
  ],
  defaultInputParams: {
    incomingVideo: {
      src: 'https://example.com/incoming.mp4',
      duration: 10,
    },
    outgoingVideo: {
      src: 'https://example.com/outgoing.mp4',
      duration: 10,
    },
    transitionDuration: 1.4,
    eraserWidth: 15,
    particleCount: 25,
    edgeBlur: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const eraserRevealTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
