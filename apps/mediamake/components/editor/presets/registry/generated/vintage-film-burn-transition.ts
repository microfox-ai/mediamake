/**
 * Vintage Film Burn Transition Preset
 *
 * This preset simulates an authentic 16mm film burn transition between two videos.
 * During the transition, the outgoing video appears to burn away while revealing the
 * incoming video underneath, complete with burn overlay effects, sprocket holes,
 * dust/scratch textures, and organic shake effects.
 *
 * Features:
 * - **Film Burn Overlay**: Custom burn video with screen blend mode during transition
 * - **Sprocket Holes**: Authentic vintage sprocket overlays on left and right edges
 * - **Dust & Scratch Textures**: Multiple texture layers with multiply/overlay blend modes
 * - **Burn Effects**: Outgoing video develops contrast/brightness irregularities
 * - **Emerging Video**: Incoming video fades in with initial flickering and stabilization
 * - **Shake Effects**: Organic shake on both videos during the burn moment
 * - **Configurable Overlap**: Adjustable 1.5-second transition period
 *
 * Use cases:
 * - Creating vintage film aesthetics for transitions
 * - Simulating authentic film damage effects
 * - Adding organic, unpredictable transitions between clips
 * - Building retro-style video montages
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('Outgoing video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Incoming video configuration'),
  
  overlapDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the transition overlap period in seconds'),
  
  filmBurnOverlay: z.object({
    src: z.string().describe('Source URL of the film burn overlay video (MP4)'),
  }).describe('Film burn overlay video configuration'),
  
  sprocketHoles: z.object({
    leftSrc: z.string().describe('Source URL of left sprocket hole PNG'),
    rightSrc: z.string().describe('Source URL of right sprocket hole PNG'),
  }).describe('Sprocket hole overlay images'),
  
  dustTextures: z.object({
    texture1Src: z.string().describe('Source URL of first dust texture PNG'),
    texture2Src: z.string().describe('Source URL of second dust texture PNG'),
    scratchSrc: z.string().describe('Source URL of scratch texture PNG'),
  }).describe('Dust and scratch texture overlays'),
  
  burnIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for burn effects (0.5-2)'),
  
  shakeIntensity: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .optional()
    .describe('Intensity of shake effect in pixels (5-30)'),
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
    filmBurnOverlay,
    sprocketHoles,
    dustTextures,
    burnIntensity = 1,
    shakeIntensity = 15,
  } = params;

  // Calculate timing
  const baseLayoutDuration = video1.duration + video2.duration - overlapDuration;
  const transitionStart = video1.duration - overlapDuration;
  
  // Outgoing video (video1) - plays from 0 to video1.duration
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'w-full h-full object-cover',
      style: {
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // Burn effect: increasing brightness and contrast
      {
        id: 'burn-brightness-contrast',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: 1 + (0.5 * burnIntensity), prog: 1 },
            { key: 'contrast', val: 1, prog: 0 },
            { key: 'contrast', val: 1 + (1 * burnIntensity), prog: 1 },
          ],
        },
      },
      // Shake effect during burn
      {
        id: 'outgoing-shake',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: shakeIntensity * 0.5, prog: 0.1 },
            { key: 'translateX', val: -shakeIntensity * 0.3, prog: 0.2 },
            { key: 'translateX', val: shakeIntensity * 0.4, prog: 0.3 },
            { key: 'translateX', val: -shakeIntensity * 0.2, prog: 0.4 },
            { key: 'translateX', val: shakeIntensity * 0.3, prog: 0.5 },
            { key: 'translateX', val: -shakeIntensity * 0.4, prog: 0.6 },
            { key: 'translateX', val: shakeIntensity * 0.2, prog: 0.7 },
            { key: 'translateX', val: -shakeIntensity * 0.1, prog: 0.8 },
            { key: 'translateX', val: shakeIntensity * 0.15, prog: 0.9 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -shakeIntensity * 0.3, prog: 0.15 },
            { key: 'translateY', val: shakeIntensity * 0.4, prog: 0.25 },
            { key: 'translateY', val: -shakeIntensity * 0.2, prog: 0.35 },
            { key: 'translateY', val: shakeIntensity * 0.5, prog: 0.45 },
            { key: 'translateY', val: -shakeIntensity * 0.3, prog: 0.55 },
            { key: 'translateY', val: shakeIntensity * 0.25, prog: 0.65 },
            { key: 'translateY', val: -shakeIntensity * 0.15, prog: 0.75 },
            { key: 'translateY', val: shakeIntensity * 0.2, prog: 0.85 },
            { key: 'translateY', val: -shakeIntensity * 0.1, prog: 0.95 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video (video2) - starts at transitionStart, overlaps for transition
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'w-full h-full object-cover',
      style: {
        zIndex: 20,
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + overlapDuration,
      },
    },
    effects: [
      // Fade in during transition
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming video start
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Initial flicker effect
      {
        id: 'incoming-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration * 0.6,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'brightness', val: 0.7, prog: 0 },
            { key: 'brightness', val: 1.2, prog: 0.15 },
            { key: 'brightness', val: 0.8, prog: 0.3 },
            { key: 'brightness', val: 1.1, prog: 0.5 },
            { key: 'brightness', val: 0.9, prog: 0.7 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        },
      },
      // Shake effect that stabilizes
      {
        id: 'incoming-shake',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration * 0.7,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'translateX', val: shakeIntensity * 0.8, prog: 0 },
            { key: 'translateX', val: -shakeIntensity * 0.5, prog: 0.2 },
            { key: 'translateX', val: shakeIntensity * 0.3, prog: 0.4 },
            { key: 'translateX', val: -shakeIntensity * 0.15, prog: 0.6 },
            { key: 'translateX', val: shakeIntensity * 0.08, prog: 0.8 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: -shakeIntensity * 0.6, prog: 0 },
            { key: 'translateY', val: shakeIntensity * 0.4, prog: 0.3 },
            { key: 'translateY', val: -shakeIntensity * 0.2, prog: 0.5 },
            { key: 'translateY', val: shakeIntensity * 0.1, prog: 0.7 },
            { key: 'translateY', val: -shakeIntensity * 0.05, prog: 0.9 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Burn overlay - only visible during transition
  const burnOverlay: RenderableComponentData = {
    id: 'burn-overlay',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: filmBurnOverlay.src,
      className: 'w-full h-full object-cover',
      style: {
        zIndex: 30,
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: overlapDuration,
      },
    },
  };

  // Sprocket hole overlays
  const sprocketLeft: RenderableComponentData = {
    id: 'sprocket-left',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: sprocketHoles.leftSrc,
      className: 'absolute left-0 top-0 h-full',
      style: {
        width: '64px',
        zIndex: 40,
        opacity: 0.8,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
  };

  const sprocketRight: RenderableComponentData = {
    id: 'sprocket-right',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: sprocketHoles.rightSrc,
      className: 'absolute right-0 top-0 h-full',
      style: {
        width: '64px',
        zIndex: 40,
        opacity: 0.8,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
  };

  // Dust texture 1 (multiply blend)
  const dustTexture1: RenderableComponentData = {
    id: 'dust-texture-1',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: dustTextures.texture1Src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 50,
        mixBlendMode: 'multiply',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    effects: [
      {
        id: 'dust-1-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart - overlapDuration * 0.3,
          duration: overlapDuration * 1.6,
          mode: 'provider',
          targetIds: ['dust-texture-1'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Dust texture 2 (overlay blend)
  const dustTexture2: RenderableComponentData = {
    id: 'dust-texture-2',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: dustTextures.texture2Src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 51,
        mixBlendMode: 'overlay',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    effects: [
      {
        id: 'dust-2-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart - overlapDuration * 0.2,
          duration: overlapDuration * 1.4,
          mode: 'provider',
          targetIds: ['dust-texture-2'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Scratch texture (overlay blend)
  const scratchTexture: RenderableComponentData = {
    id: 'scratch-texture',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: dustTextures.scratchSrc,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 52,
        mixBlendMode: 'overlay',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    effects: [
      {
        id: 'scratch-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['scratch-texture'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vintage-film-burn-container',
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
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      outgoingVideo,
      incomingVideo,
      burnOverlay,
      sprocketLeft,
      sprocketRight,
      dustTexture1,
      dustTexture2,
      scratchTexture,
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
  id: 'vintage-film-burn-transition',
  title: 'Vintage Film Burn Transition',
  description:
    'Authentic 16mm film burn transition that simulates film damage with burn overlay, sprocket holes, dust/scratch textures, and organic shake effects during the transition period',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vintage',
    'film',
    'burn',
    'retro',
    '16mm',
    'damage',
    'sprocket',
    'dust',
    'scratch',
    'shake',
    'organic',
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
    filmBurnOverlay: {
      src: 'https://example.com/film-burn-overlay.mp4',
    },
    sprocketHoles: {
      leftSrc: 'https://example.com/sprocket-left.png',
      rightSrc: 'https://example.com/sprocket-right.png',
    },
    dustTextures: {
      texture1Src: 'https://example.com/dust-texture-1.png',
      texture2Src: 'https://example.com/dust-texture-2.png',
      scratchSrc: 'https://example.com/scratch-texture.png',
    },
    burnIntensity: 1,
    shakeIntensity: 15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vintageFilmBurnTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
