/**
 * Frame-Skip Stutter Transition Preset
 *
 * A temporal glitch transition that simulates dropped frames and frame-skip effects.
 * Creates ghost layers representing past and future states with chaotic temporal jumping.
 * Features interpolation artifacts and timeline visualization showing frame positions.
 *
 * Features:
 * - **Frame-Skip Effect**: Stepped animations creating stuttering motion
 * - **Temporal Ghost Layers**: Past, present, and future states simultaneously visible
 * - **Interpolation Artifacts**: SVG displacement maps creating surreal in-between states
 * - **Timeline Visualization**: Bottom scrubber showing chaotic temporal jumping
 * - **Motion Blur**: Selective blur on specific frames for motion prediction artifacts
 * - **Performance Optimized**: Transform3d compositing with limited concurrent layers
 *
 * Technical Implementation:
 * - Uses steps() easing for frame-skip effect on present layer
 * - Past/future layers use scaled opacity (0.3) with slight scale differences
 * - SVG displacement filter for interpolation artifacts with animated turbulence
 * - Timeline markers jump positions using stepped transforms
 * - All animations use CSS transforms for GPU acceleration
 *
 * Use cases:
 * - Digital glitch transitions between scenes
 * - Tech/cyberpunk aesthetic transitions
 * - Retro VHS/corrupted footage effects
 * - Time-distortion narrative moments
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  image: z
    .object({
      src: z.string().describe('Image source URL or path'),
    })
    .describe('Image to apply frame-skip effect to'),
  duration: z
    .number()
    .default(2)
    .describe('Total duration of the transition in seconds'),
  frameSkipIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.7)
    .describe('Intensity of frame-skip effect (0.1-1, higher = more chaotic)'),
  ghostOpacity: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.3)
    .describe('Opacity of past/future ghost layers'),
  artifactIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.4)
    .describe('Intensity of interpolation artifacts'),
  showTimeline: z
    .boolean()
    .default(true)
    .describe('Show timeline visualization at bottom'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    image,
    duration,
    frameSkipIntensity,
    ghostOpacity,
    artifactIntensity,
    showTimeline,
  } = params;

  // Calculate frame-skip parameters
  const numberOfSteps = Math.round(5 * frameSkipIntensity);
  const skipDistance = 100 * frameSkipIntensity;

  // Main content area with 3 image layers
  const mainContentChildren: RenderableComponentData[] = [
    // Past layer (slightly scaled down, blurred)
    {
      id: 'past-layer',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image.src,
        className: 'absolute inset-0 object-cover',
        style: {
          transformOrigin: 'center center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'past-layer-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['past-layer'],
            ranges: [
              { key: 'opacity', val: ghostOpacity, prog: 0 },
              { key: 'opacity', val: ghostOpacity * 0.5, prog: 0.5 },
              { key: 'opacity', val: ghostOpacity, prog: 1 },
              { key: 'scale', val: 0.95, prog: 0 },
              { key: 'scale', val: 0.93, prog: 0.5 },
              { key: 'scale', val: 0.95, prog: 1 },
              { key: 'filter', val: 'blur(2px)', prog: 0 },
              { key: 'filter', val: 'blur(4px)', prog: 0.5 },
              { key: 'filter', val: 'blur(2px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Present layer (main stuttering effect)
    {
      id: 'present-layer',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image.src,
        className: 'absolute inset-0 object-cover',
        style: {
          transformOrigin: 'center center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'present-stutter-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['present-layer'],
            ranges: [
              // Frame-skip horizontal movement
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: skipDistance * 0.3, prog: 0.2 },
              { key: 'translateX', val: -skipDistance * 0.2, prog: 0.4 },
              { key: 'translateX', val: skipDistance * 0.4, prog: 0.6 },
              { key: 'translateX', val: -skipDistance * 0.1, prog: 0.8 },
              { key: 'translateX', val: 0, prog: 1 },
              // Scale variations
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: 1.05, prog: 0.25 },
              { key: 'scaleX', val: 0.98, prog: 0.5 },
              { key: 'scaleX', val: 1.03, prog: 0.75 },
              { key: 'scaleX', val: 1, prog: 1 },
              // Selective motion blur
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(8px)', prog: 0.15 },
              { key: 'filter', val: 'blur(0px)', prog: 0.2 },
              { key: 'filter', val: 'blur(6px)', prog: 0.45 },
              { key: 'filter', val: 'blur(0px)', prog: 0.5 },
              { key: 'filter', val: 'blur(10px)', prog: 0.75 },
              { key: 'filter', val: 'blur(0px)', prog: 0.8 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Future layer (slightly scaled up, blurred)
    {
      id: 'future-layer',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: image.src,
        className: 'absolute inset-0 object-cover',
        style: {
          transformOrigin: 'center center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'future-layer-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['future-layer'],
            ranges: [
              { key: 'opacity', val: ghostOpacity, prog: 0 },
              { key: 'opacity', val: ghostOpacity * 0.7, prog: 0.5 },
              { key: 'opacity', val: ghostOpacity, prog: 1 },
              { key: 'scale', val: 1.05, prog: 0 },
              { key: 'scale', val: 1.07, prog: 0.5 },
              { key: 'scale', val: 1.05, prog: 1 },
              { key: 'filter', val: 'blur(2px)', prog: 0 },
              { key: 'filter', val: 'blur(3px)', prog: 0.5 },
              { key: 'filter', val: 'blur(2px)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Interpolation artifacts (SVG displacement)
    {
      id: 'interpolation-artifacts',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<svg width='100%' height='100%' style='position: absolute; top: 0; left: 0; pointer-events: none; mix-blend-mode: screen;'>
          <defs>
            <filter id='displacement-filter'>
              <feTurbulence type='fractalNoise' baseFrequency='0.01' numOctaves='2' result='turbulence' seed='1'>
                <animate attributeName='baseFrequency' values='0.01;0.03;0.01;0.04;0.01' dur='${duration}s' repeatCount='1'/>
              </feTurbulence>
              <feDisplacementMap in2='turbulence' in='SourceGraphic' scale='20' xChannelSelector='R' yChannelSelector='G'>
                <animate attributeName='scale' values='20;50;20;40;20' dur='${duration}s' repeatCount='1'/>
              </feDisplacementMap>
            </filter>
          </defs>
          <rect width='100%' height='100%' filter='url(#displacement-filter)' fill='rgba(255,255,255,0.1)'/>
        </svg>`,
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'artifact-opacity-effect',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['interpolation-artifacts'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: artifactIntensity, prog: 0.1 },
              { key: 'opacity', val: artifactIntensity * 0.5, prog: 0.3 },
              { key: 'opacity', val: artifactIntensity * 0.8, prog: 0.5 },
              { key: 'opacity', val: artifactIntensity * 0.3, prog: 0.7 },
              { key: 'opacity', val: artifactIntensity, prog: 0.9 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Timeline visualization
  const timelineChildren: RenderableComponentData[] = [
    // Timeline bar
    {
      id: 'timeline-bar',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: "<div style='width: 100%; height: 4px; background: linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899); border-radius: 2px;'></div>",
        className: 'w-full',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData,
    // Timeline markers
    ...Array.from({ length: 5 }, (_, i) => {
      const baseLeft = 10 + i * 20; // 10%, 30%, 50%, 70%, 90%
      return {
        id: `marker-${i + 1}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width: 3px; height: 24px; background: white; border-radius: 1px;'></div>",
          className: 'absolute',
          style: {
            left: `${baseLeft}%`,
            top: '50%',
            transform: 'translateY(-50%)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `marker-${i + 1}-jump`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [`marker-${i + 1}`],
              ranges: [
                { key: 'translateX', val: '0px', prog: 0 },
                { key: 'translateX', val: `${(i % 2 === 0 ? 1 : -1) * 20}px`, prog: 0.2 },
                { key: 'translateX', val: `${(i % 2 === 0 ? -1 : 1) * 15}px`, prog: 0.4 },
                { key: 'translateX', val: `${(i % 2 === 0 ? 1 : -1) * 25}px`, prog: 0.6 },
                { key: 'translateX', val: `${(i % 2 === 0 ? -1 : 1) * 10}px`, prog: 0.8 },
                { key: 'translateX', val: '0px', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    }),
  ];

  // Build final structure
  const childrenData: RenderableComponentData[] = [
    // Main content area
    {
      id: 'main-content-area',
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
          duration: duration,
        },
      },
      childrenData: mainContentChildren,
    } as RenderableComponentData,
  ];

  // Add timeline if enabled
  if (showTimeline) {
    childrenData.push({
      id: 'timeline-scrubber',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute bottom-0 left-0 right-0 h-12 bg-gray-800/50 flex items-center px-4',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: timelineChildren,
    } as RenderableComponentData);
  }

  const rootContainer: RenderableComponentData = {
    id: 'frame-skip-stutter-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
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
  id: 'frame-skip-stutter-transition',
  title: 'Frame-Skip Stutter Transition',
  description:
    'A temporal glitch transition that simulates dropped frames and frame-skip effects. Creates ghost layers representing past and future states with chaotic temporal jumping. Features interpolation artifacts and timeline visualization showing frame positions. Optimized for performance with transform-based animations and limited concurrent layers.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'frame-skip',
    'temporal',
    'stutter',
    'tech',
    'cyberpunk',
    'artifacts',
  ],
  defaultInputParams: {
    image: {
      src: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1920&h=1080&fit=crop',
    },
    duration: 2,
    frameSkipIntensity: 0.7,
    ghostOpacity: 0.3,
    artifactIntensity: 0.4,
    showTimeline: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const frameSkipStutterTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};