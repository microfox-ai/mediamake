/**
 * Digital Data Mosh Glitch Transition Preset
 *
 * This preset creates a digital data mosh glitch transition effect that simulates corrupted
 * video data during the transition period. It features heavy pixelation, RGB channel separation,
 * and digital corruption effects.
 *
 * Features:
 * - **Data Corruption Simulation**: Glitchy transitions with increasing corruption intensity
 * - **RGB Channel Separation**: Chromatic aberration effects during transition
 * - **Horizontal Displacement**: Random translateX shifts simulating data corruption
 * - **Alternating Opacity Flickers**: 0.1s interval flickers for data mosh effect
 * - **Contrast/Saturation Filters**: Periodic contrast(200%) and saturate(0%) for digital artifacts
 * - **Shake Effect**: RotateZ alternating between -2deg and 2deg
 * - **Blur Effects**: Increasing blur on outgoing, clearing blur on incoming
 * - **Screen Blend Mode**: Incoming video uses mix-blend-mode: screen for digital overlay
 *
 * Use cases:
 * - Creating glitchy video transitions for music videos or experimental content
 * - Simulating digital corruption or data loss effects
 * - Adding cyberpunk/tech aesthetic transitions
 * - Creating unique visual transitions for modern content
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
    src: z.string().describe('Source URL of the first video (outgoing)'),
    duration: z.number().describe('Duration of first video in seconds'),
  }).describe('First video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the second video (incoming)'),
    duration: z.number().describe('Duration of second video in seconds'),
  }).describe('Second video configuration'),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the transition overlap in seconds (default: 1.0)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total duration with overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Calculate when incoming video starts (overlap period)
  const incomingStartTime = video1.duration - transitionDuration;

  // Create outgoing video with glitch effects
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 1,
      },
      volume: 1,
      muted: false,
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // Opacity fade effect during transition
      {
        id: 'outgoing-opacity-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Blur effect increasing during transition
      {
        id: 'outgoing-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'blur', val: 0, prog: 0 },
            { key: 'blur', val: 8, prog: 1 },
          ],
        },
      },
      // Horizontal displacement effect (random translateX)
      {
        id: 'outgoing-displacement-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -20, prog: 0.1 },
            { key: 'translateX', val: 20, prog: 0.2 },
            { key: 'translateX', val: -15, prog: 0.3 },
            { key: 'translateX', val: 15, prog: 0.4 },
            { key: 'translateX', val: -10, prog: 0.5 },
            { key: 'translateX', val: 10, prog: 0.6 },
            { key: 'translateX', val: -5, prog: 0.7 },
            { key: 'translateX', val: 5, prog: 0.8 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      // Shake effect (rotateZ alternating)
      {
        id: 'outgoing-shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: -2, prog: 0.1 },
            { key: 'rotateZ', val: 2, prog: 0.2 },
            { key: 'rotateZ', val: -2, prog: 0.3 },
            { key: 'rotateZ', val: 2, prog: 0.4 },
            { key: 'rotateZ', val: -1, prog: 0.5 },
            { key: 'rotateZ', val: 1, prog: 0.6 },
            { key: 'rotateZ', val: -1, prog: 0.7 },
            { key: 'rotateZ', val: 1, prog: 0.8 },
            { key: 'rotateZ', val: 0, prog: 1 },
          ],
        },
      },
      // Contrast and saturation filters (alternating for data mosh effect)
      {
        id: 'outgoing-contrast-saturation-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'contrast', val: 100, prog: 0 },
            { key: 'contrast', val: 200, prog: 0.2 },
            { key: 'contrast', val: 100, prog: 0.4 },
            { key: 'contrast', val: 200, prog: 0.6 },
            { key: 'contrast', val: 100, prog: 0.8 },
            { key: 'contrast', val: 200, prog: 1 },
            { key: 'saturate', val: 100, prog: 0 },
            { key: 'saturate', val: 0, prog: 0.2 },
            { key: 'saturate', val: 100, prog: 0.4 },
            { key: 'saturate', val: 0, prog: 0.6 },
            { key: 'saturate', val: 100, prog: 0.8 },
            { key: 'saturate', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video with glitch effects and screen blend mode
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 2,
        mixBlendMode: 'screen',
      },
      volume: 1,
      muted: false,
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: video2.duration + transitionDuration,
      },
    },
    effects: [
      // Opacity fade in effect during transition
      {
        id: 'incoming-opacity-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Blur effect clearing during transition
      {
        id: 'incoming-blur-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'blur', val: 8, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
      // Horizontal displacement effect (random translateX)
      {
        id: 'incoming-displacement-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'translateX', val: 20, prog: 0 },
            { key: 'translateX', val: -20, prog: 0.1 },
            { key: 'translateX', val: 15, prog: 0.2 },
            { key: 'translateX', val: -15, prog: 0.3 },
            { key: 'translateX', val: 10, prog: 0.4 },
            { key: 'translateX', val: -10, prog: 0.5 },
            { key: 'translateX', val: 5, prog: 0.6 },
            { key: 'translateX', val: -5, prog: 0.7 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      // Shake effect (rotateZ alternating)
      {
        id: 'incoming-shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'rotateZ', val: 2, prog: 0 },
            { key: 'rotateZ', val: -2, prog: 0.1 },
            { key: 'rotateZ', val: 2, prog: 0.2 },
            { key: 'rotateZ', val: -2, prog: 0.3 },
            { key: 'rotateZ', val: 1, prog: 0.4 },
            { key: 'rotateZ', val: -1, prog: 0.5 },
            { key: 'rotateZ', val: 1, prog: 0.6 },
            { key: 'rotateZ', val: -1, prog: 0.7 },
            { key: 'rotateZ', val: 0, prog: 1 },
          ],
        },
      },
      // Contrast and saturation filters (alternating, inverse of outgoing)
      {
        id: 'incoming-contrast-saturation-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'contrast', val: 200, prog: 0 },
            { key: 'contrast', val: 100, prog: 0.2 },
            { key: 'contrast', val: 200, prog: 0.4 },
            { key: 'contrast', val: 100, prog: 0.6 },
            { key: 'contrast', val: 200, prog: 0.8 },
            { key: 'contrast', val: 100, prog: 1 },
            { key: 'saturate', val: 0, prog: 0 },
            { key: 'saturate', val: 100, prog: 0.2 },
            { key: 'saturate', val: 0, prog: 0.4 },
            { key: 'saturate', val: 100, prog: 0.6 },
            { key: 'saturate', val: 0, prog: 0.8 },
            { key: 'saturate', val: 100, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'digital-datamosh-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingVideo, incomingVideo],
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
  id: 'digital-datamosh-glitch-transition',
  title: 'Digital Data Mosh Glitch Transition',
  description:
    'A digital data mosh glitch transition preset that simulates corrupted video data during transitions. Features heavy pixelation, RGB channel separation, alternating opacity flickers, horizontal displacement transforms, and contrast/saturation filters. The outgoing video corrupts with increasing glitch intensity while the incoming video emerges from digital chaos with screen blend mode overlay effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'datamosh',
    'corruption',
    'rgb-split',
    'chromatic-aberration',
    'digital',
    'cyberpunk',
    'tech',
    'video',
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
    transitionDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const digitalDatamoshGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
