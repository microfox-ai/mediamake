/**
 * Stop Motion Projector Transition Preset
 *
 * Creates a jittery stop motion transition that mimics old film projector frame advances
 * with rapid micro-movements. Features 5 quick position jumps during a 0.5s overlap,
 * where each jump moves the frame 5-10 pixels in random directions with stepped opacity
 * changes. Includes film grain overlay and pulsing vignette for vintage projector aesthetics.
 *
 * Features:
 * - 5 rapid position jumps (0.1s each) during 0.5s transition overlap
 * - Stepped opacity transitions (100% → 80% → 60% → 40% → 20% → 0%)
 * - Mirrored jitter pattern for incoming video with inverse opacity
 * - Film grain overlay with pulsing effect
 * - Vignette overlay with brightness/contrast pulsing
 * - Authentic stop motion projector feel
 *
 * Use cases:
 * - Creating vintage film projector transitions
 * - Mimicking old-school stop motion effects
 * - Adding retro aesthetic to video content
 * - Building nostalgic video presentations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of outgoing media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration of outgoing media in seconds'),
  }).describe('Outgoing media configuration'),
  media2: z.object({
    src: z.string().describe('Source URL of incoming media'),
    type: z.enum(['image', 'video']).describe('Media type'),
    duration: z.number().describe('Duration of incoming media in seconds'),
  }).describe('Incoming media configuration'),
  transitionDuration: z.number().default(0.5).describe('Duration of transition overlap in seconds (5 jumps x 0.1s each)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate BaseLayout duration (media1 + media2 - overlap)
  const baseLayoutDuration = media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Jitter pattern: translateX and translateY values for each jump
  const jitterPattern = [
    { x: 0, y: 0 },      // prog: 0
    { x: 8, y: -5 },     // prog: 0.2
    { x: -5, y: 7 },     // prog: 0.4
    { x: 10, y: -8 },    // prog: 0.6
    { x: -7, y: 6 },     // prog: 0.8
    { x: 0, y: 0 },      // prog: 1.0
  ];

  // Opacity pattern for outgoing media (stepping down)
  const opacityOutgoing = [1, 0.8, 0.6, 0.4, 0.2, 0];

  // Opacity pattern for incoming media (stepping up)
  const opacityIncoming = [0, 0.2, 0.4, 0.6, 0.8, 1];

  // Build ranges for outgoing media jitter effect
  const outgoingRanges = jitterPattern.flatMap((pos, index) => {
    const prog = index / (jitterPattern.length - 1);
    return [
      { key: 'translateX', val: pos.x, prog },
      { key: 'translateY', val: pos.y, prog },
      { key: 'opacity', val: opacityOutgoing[index], prog },
    ];
  });

  // Build ranges for incoming media jitter effect
  const incomingRanges = jitterPattern.flatMap((pos, index) => {
    const prog = index / (jitterPattern.length - 1);
    return [
      { key: 'translateX', val: pos.x, prog },
      { key: 'translateY', val: pos.y, prog },
      { key: 'opacity', val: opacityIncoming[index], prog },
    ];
  });

  // Grain pulse effect ranges (oscillates between 0.15 and 0.25 at each jump)
  const grainPulseRanges = [
    { key: 'opacity', val: 0.15, prog: 0 },
    { key: 'opacity', val: 0.25, prog: 0.1 },
    { key: 'opacity', val: 0.15, prog: 0.2 },
    { key: 'opacity', val: 0.25, prog: 0.3 },
    { key: 'opacity', val: 0.15, prog: 0.4 },
    { key: 'opacity', val: 0.25, prog: 0.5 },
    { key: 'opacity', val: 0.15, prog: 0.6 },
    { key: 'opacity', val: 0.25, prog: 0.7 },
    { key: 'opacity', val: 0.15, prog: 0.8 },
    { key: 'opacity', val: 0.25, prog: 0.9 },
    { key: 'opacity', val: 0.15, prog: 1 },
  ];

  // Vignette pulse effect ranges (brightness and contrast oscillate)
  const vignettePulseRanges = [
    { key: 'filter', val: 'brightness(1) contrast(1)', prog: 0 },
    { key: 'filter', val: 'brightness(0.95) contrast(1.1)', prog: 0.1 },
    { key: 'filter', val: 'brightness(1) contrast(1)', prog: 0.2 },
    { key: 'filter', val: 'brightness(0.95) contrast(1.1)', prog: 0.3 },
    { key: 'filter', val: 'brightness(1) contrast(1)', prog: 0.4 },
    { key: 'filter', val: 'brightness(0.95) contrast(1.1)', prog: 0.5 },
    { key: 'filter', val: 'brightness(1) contrast(1)', prog: 0.6 },
    { key: 'filter', val: 'brightness(0.95) contrast(1.1)', prog: 0.7 },
    { key: 'filter', val: 'brightness(1) contrast(1)', prog: 0.8 },
    { key: 'filter', val: 'brightness(0.95) contrast(1.1)', prog: 0.9 },
    { key: 'filter', val: 'brightness(1) contrast(1)', prog: 1 },
  ];

  // Create film grain overlay (using HTMLBlockAtom with CSS noise pattern)
  const grainOverlay: RenderableComponentData = {
    id: 'grain-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <div style="
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background-image: 
            repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px),
            repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px);
          pointer-events: none;
          mix-blend-mode: screen;
        "></div>
      `,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: media1.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'grain-pulse-effect',
        componentId: 'generic',
        data: {
          type: 'steps',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['grain-overlay'],
          ranges: grainPulseRanges,
        },
      },
    ],
  };

  // Create vignette overlay
  const vignetteOverlay: RenderableComponentData = {
    id: 'vignette-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <div style="
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%);
          pointer-events: none;
        "></div>
      `,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: media1.duration - transitionDuration,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'vignette-pulse-effect',
        componentId: 'generic',
        data: {
          type: 'steps',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['vignette-overlay'],
          ranges: vignettePulseRanges,
        },
      },
    ],
  };

  // Create outgoing media atom
  const outgoingMedia: RenderableComponentData = {
    id: 'outgoing-media',
    type: 'atom',
    componentId: media1ComponentId,
    data: {
      src: media1.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-jitter-effect',
        componentId: 'generic',
        data: {
          type: 'steps',
          start: media1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-media'],
          ranges: outgoingRanges,
        },
      },
    ],
  };

  // Create incoming media atom
  const incomingMedia: RenderableComponentData = {
    id: 'incoming-media',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: media1.duration - transitionDuration,
        duration: media2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-jitter-effect',
        componentId: 'generic',
        data: {
          type: 'steps',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-media'],
          ranges: incomingRanges,
        },
      },
    ],
  };

  // Build children data
  const childrenData: RenderableComponentData[] = [
    outgoingMedia,
    incomingMedia,
    grainOverlay,
    vignetteOverlay,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'stop-motion-projector-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-neutral-900',
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'stop-motion-projector-transition',
  title: 'Stop Motion Projector Transition',
  description: 'A jittery stop motion transition mimicking old film projector frame advances with rapid micro-movements. Features 5 quick position jumps (0.1s each) during a 0.5s overlap with stepped opacity changes, film grain overlay, and pulsing vignette for vintage projector aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vintage', 'projector', 'stop-motion', 'jitter', 'film-grain', 'retro'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 3,
    },
    transitionDuration: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const stopMotionProjectorTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};