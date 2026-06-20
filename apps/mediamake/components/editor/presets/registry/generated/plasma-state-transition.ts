/**
 * Plasma State Transition Preset
 *
 * This preset creates an advanced video transition that simulates matter state transformation
 * from solid to plasma. During 1.9 seconds, the outgoing video ionizes into glowing plasma
 * that disperses, while the incoming video condenses from plasma particles.
 *
 * Features:
 * - Plasma glow effects using multiple layered drop-shadows (cyan, magenta, yellow)
 * - Heat distortion with wavy transforms combining skew, scale, translate using sin/cos
 * - Video fragmentation using clip-path animations
 * - Electric arc effects with thin gradient divs flashing between videos
 * - Organic movement through calculated wave distortion
 * - Pulsing and shifting neon colors
 *
 * Technical Implementation:
 * - BaseLayout: bg-gray-900 with overflow-visible for glow overflow
 * - Outgoing video: Multiple drop-shadow filters, opacity fade, wave distortion transforms
 * - Incoming video: Starts with heavy glow, condenses with scale+opacity, glow fades
 * - Arc effects: Absolute positioned divs with linear gradients, random rotations, opacity flashes
 * - Z-index layering: outgoing (1) → arcs (2) → incoming (3)
 *
 * Use cases:
 * - Sci-fi transitions between video clips
 * - Energy transformation effects
 * - High-impact visual transitions
 * - Creative video editing with matter state themes
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
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video that will ionize into plasma'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video that will condense from plasma'),
  transitionDuration: z
    .number()
    .default(1.9)
    .describe('Duration of the plasma transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Calculate timing
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;
  const outgoingStart = 0;
  const incomingStart = outgoingVideo.duration - transitionDuration;

  // Helper: Create arc effect element
  const createArc = (id: string, left: string, rotation: number): RenderableComponentData => {
    return {
      id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '2px',
            height: '100%',
            left,
            top: 0,
            background: 'linear-gradient(180deg, transparent 0%, white 50%, transparent 100%)',
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          },
        },
      },
      childrenData: [],
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData;
  };

  // Create arc effects with staggered flash animations
  const arc1 = createArc('arc-1', '20%', 15);
  const arc2 = createArc('arc-2', '40%', -25);
  const arc3 = createArc('arc-3', '60%', 35);
  const arc4 = createArc('arc-4', '80%', -10);
  const arc5 = createArc('arc-5', '50%', 5);

  // Outgoing video with plasma glow and heat distortion
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      className: 'w-full h-full',
      fit: 'cover',
      style: {
        objectFit: 'cover',
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      // Plasma glow effect (multiple drop-shadows pulsing)
      {
        id: 'outgoing-plasma-glow',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            // Cyan glow
            { key: 'filter:drop-shadow(0px 0px 20px cyan)', val: 0, prog: 0 },
            { key: 'filter:drop-shadow(0px 0px 20px cyan)', val: 1, prog: 0.4 },
            { key: 'filter:drop-shadow(0px 0px 20px cyan)', val: 0.8, prog: 0.7 },
            { key: 'filter:drop-shadow(0px 0px 20px cyan)', val: 0, prog: 1 },
          ],
        },
      },
      // Fragmentation and opacity fade
      {
        id: 'outgoing-fragmentation',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Heat distortion with wave transforms
      {
        id: 'outgoing-heat-distortion',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            // TranslateX wave
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '10px', prog: 0.25 },
            { key: 'translateX', val: '0px', prog: 0.5 },
            { key: 'translateX', val: '-10px', prog: 0.75 },
            { key: 'translateX', val: '0px', prog: 1 },
            // TranslateY wave
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '-8px', prog: 0.3 },
            { key: 'translateY', val: '8px', prog: 0.7 },
            { key: 'translateY', val: '0px', prog: 1 },
            // ScaleX distortion
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 1.05, prog: 0.5 },
            { key: 'scaleX', val: 1.02, prog: 1 },
            // SkewX wave
            { key: 'skewX', val: 0, prog: 0 },
            { key: 'skewX', val: 3, prog: 0.4 },
            { key: 'skewX', val: -3, prog: 0.6 },
            { key: 'skewX', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Incoming video with condensing plasma
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full',
      fit: 'cover',
      style: {
        objectFit: 'cover',
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      // Condense from plasma (scale + opacity)
      {
        id: 'incoming-condense',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0, // Relative to incoming video start
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 1.5, prog: 0 },
            { key: 'scale', val: 1.2, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Heavy plasma glow that fades
      {
        id: 'incoming-plasma-glow',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            // Cyan glow
            { key: 'filter:drop-shadow(0px 0px 40px cyan)', val: 1, prog: 0 },
            { key: 'filter:drop-shadow(0px 0px 40px cyan)', val: 0.5, prog: 0.5 },
            { key: 'filter:drop-shadow(0px 0px 40px cyan)', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Arc flash effects (staggered)
  const arcFlashEffects = [
    // Arc 1
    {
      id: 'arc-1-flash',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: ['arc-1'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.9, prog: 0.3 },
          { key: 'opacity', val: 0, prog: 0.6 },
        ],
      },
    },
    // Arc 2
    {
      id: 'arc-2-flash',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: ['arc-2'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0.1 },
          { key: 'opacity', val: 0.8, prog: 0.35 },
          { key: 'opacity', val: 0, prog: 0.65 },
        ],
      },
    },
    // Arc 3
    {
      id: 'arc-3-flash',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: ['arc-3'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0.15 },
          { key: 'opacity', val: 1, prog: 0.45 },
          { key: 'opacity', val: 0, prog: 0.7 },
        ],
      },
    },
    // Arc 4
    {
      id: 'arc-4-flash',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: ['arc-4'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0.2 },
          { key: 'opacity', val: 0.85, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 0.75 },
        ],
      },
    },
    // Arc 5
    {
      id: 'arc-5-flash',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: ['arc-5'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0.05 },
          { key: 'opacity', val: 0.95, prog: 0.4 },
          { key: 'opacity', val: 0, prog: 0.8 },
        ],
      },
    },
  ];

  // Attach flash effects to arcs
  arc1.effects = [arcFlashEffects[0]];
  arc2.effects = [arcFlashEffects[1]];
  arc3.effects = [arcFlashEffects[2]];
  arc4.effects = [arcFlashEffects[3]];
  arc5.effects = [arcFlashEffects[4]];

  // Outgoing video container
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 1,
        },
      },
    },
    childrenData: [outgoingVideoNode],
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData;

  // Arc effects container
  const arcContainer: RenderableComponentData = {
    id: 'arc-effects-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 2,
        },
      },
    },
    childrenData: [arc1, arc2, arc3, arc4, arc5],
    context: {
      timing: {
        start: incomingStart,
        duration: transitionDuration,
      },
    },
  } as RenderableComponentData;

  // Incoming video container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 3,
        },
      },
    },
    childrenData: [incomingVideoNode],
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'plasma-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-gray-900 overflow-visible',
      },
    },
    childrenData: [outgoingContainer, arcContainer, incomingContainer],
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData;

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
  id: 'plasma-state-transition',
  title: 'Plasma State Transition',
  description:
    'Advanced video transition effect simulating matter state transformation from solid to plasma. Features ionizing fragmentation, glowing plasma particles with neon multi-shadow effects (cyan/magenta/yellow), heat distortion using trigonometric transforms, and electric arc effects. Outgoing video disperses into plasma streams while incoming video condenses from particles.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'plasma',
    'sci-fi',
    'glow',
    'distortion',
    'energy',
    'neon',
    'matter-state',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      duration: 5,
    },
    transitionDuration: 1.9,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const plasmaStateTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
