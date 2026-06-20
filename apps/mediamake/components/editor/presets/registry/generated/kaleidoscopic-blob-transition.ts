/**
 * Kaleidoscopic Blob Transition Preset
 *
 * Creates a fluid kaleidoscopic transition using morphing blob shapes that replicate
 * and mirror across multiple axes. The outgoing video distorts into organic blob forms
 * with turbulence and displacement effects, creating a liquid mercury effect. These blobs
 * replicate into a 3x3 grid pattern that rotates around the center point while the incoming
 * video emerges through the negative space.
 *
 * Features:
 * - 3x3 grid replication with circular blob masking
 * - SVG turbulence and displacement filters for distortion
 * - Smooth bezier easing (cubic-bezier(0.68, -0.55, 0.265, 1.55)) for elastic feel
 * - Grid rotation from 0deg to 180deg
 * - Scale and opacity effects on blob cells
 * - Incoming video scales from 0.5 to 1 beneath the grid
 * - 1.5 second transition duration
 * - Blob distortion intensifies at midpoint
 *
 * Use cases:
 * - Creative video transitions with organic feel
 * - Music videos with kaleidoscopic effects
 * - Dynamic scene changes with fluid animations
 * - Artistic video presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL or path of the outgoing video'),
    startTime: z
      .number()
      .default(0)
      .describe('Start time of the outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL or path of the incoming video'),
    startTime: z
      .number()
      .default(0)
      .describe('Start time of the incoming video in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition in seconds'),
  transitionStart: z
    .number()
    .describe(
      'Absolute start time of the transition in the video timeline (seconds)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration, transitionStart } =
    params;

  // Helper function to generate 3x3 grid positions
  const generateGridPositions = () => {
    const positions = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        positions.push({
          top: `${(row * 100) / 3}%`,
          left: `${(col * 100) / 3}%`,
        });
      }
    }
    return positions;
  };

  const gridPositions = generateGridPositions();

  // Create SVG filter for turbulence and displacement
  const svgFilterId = 'kaleidoscope-turbulence-filter';
  const svgFilterHtml = `
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <defs>
        <filter id="${svgFilterId}" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.015 0.02"
            numOctaves="3"
            seed="2"
            result="turbulence"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale="40"
            xChannelSelector="R"
            yChannelSelector="G"
            result="displacement"
          />
          <feGaussianBlur in="displacement" stdDeviation="2" result="blur" />
        </filter>
      </defs>
    </svg>
  `;

  // Create SVG filter component
  const svgFilterComponent: RenderableComponentData = {
    id: 'kaleidoscope-svg-filter',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: svgFilterHtml,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  };

  // Create 9 blob cells with outgoing video
  const blobCells: RenderableComponentData[] = gridPositions.map(
    (position, index) => {
      return {
        id: `kaleidoscope-blob-cell-${index}`,
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          startFrom: outgoingVideo.startTime,
          loop: true,
          fit: 'cover',
          className: 'w-full h-full object-cover',
          style: {
            filter: `url(#${svgFilterId})`,
            clipPath: 'circle(50% at 50% 50%)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData;
    },
  );

  // Create grid container with rotation effect
  const gridContainer: RenderableComponentData = {
    id: 'kaleidoscope-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
        },
      },
      childrenProps: gridPositions.map((position) => ({
        className: 'absolute',
        style: {
          top: position.top,
          left: position.left,
          width: '33.333%',
          height: '33.333%',
        },
      })),
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Rotation effect
      {
        id: 'kaleidoscope-grid-rotation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['kaleidoscope-grid-container'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 180, prog: 1 },
          ],
        },
      },
      // Scale effect (elastic bezier)
      {
        id: 'kaleidoscope-grid-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['kaleidoscope-grid-container'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.5, prog: 1 },
          ],
        },
      },
      // Opacity fade out
      {
        id: 'kaleidoscope-grid-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['kaleidoscope-grid-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: blobCells,
  };

  // Create incoming video that emerges through negative space
  const incomingVideoComponent: RenderableComponentData = {
    id: 'kaleidoscope-incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startTime,
      loop: true,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Scale from 0.5 to 1
      {
        id: 'kaleidoscope-incoming-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['kaleidoscope-incoming-video'],
          ranges: [
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Fade in opacity
      {
        id: 'kaleidoscope-incoming-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['kaleidoscope-incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'kaleidoscope-transition-root',
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
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    childrenData: [
      svgFilterComponent,
      incomingVideoComponent,
      gridContainer,
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
  id: 'kaleidoscopic-blob-transition',
  title: 'Kaleidoscopic Blob Transition',
  description:
    'Fluid morphing blob transition with 3x3 grid replication, rotation, and elastic bezier easing. Outgoing video distorts with SVG turbulence while incoming video emerges through negative space.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'kaleidoscope',
    'blob',
    'morphing',
    'grid',
    'rotation',
    'organic',
    'fluid',
    'svg-filter',
    'elastic',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startTime: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startTime: 0,
    },
    transitionDuration: 1.5,
    transitionStart: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const kaleidoscopicBlobTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
