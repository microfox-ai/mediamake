/**
 * Vintage Photo Album Transition Preset
 *
 * This preset creates a nostalgic scrapbook-style transition where videos appear as instant camera
 * photographs being removed and replaced in an album. Features:
 *
 * - **Compound Animations**: Outgoing video tilts, lifts with growing shadow, then slides out
 * - **Bounce Drop-In**: Incoming video drops from bottom with bounce easing
 * - **Photo Frame Effect**: White borders create instant camera photo aesthetic
 * - **Handwritten Labels**: TextAtoms with handwriting font fade in/out with media
 * - **Decorative Corners**: Static triangular corner holders throughout transition
 * - **Scrapbook Background**: Warm amber gradient mimics aged album pages
 *
 * Use cases:
 * - Creating nostalgic photo album presentations
 * - Memory lane style video transitions
 * - Vintage-themed content with handwritten notes
 * - Scrapbook-inspired video montages
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
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    label: z.string().optional().describe('Handwritten label text for outgoing video'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    label: z.string().optional().describe('Handwritten label text for incoming video'),
  }).describe('Incoming video configuration'),
  overlapDuration: z.number().default(1.8).describe('Duration of transition overlap in seconds'),
  outgoingDuration: z.number().describe('Duration of outgoing video in seconds'),
  incomingDuration: z.number().describe('Duration of incoming video in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    overlapDuration,
    outgoingDuration,
    incomingDuration,
  } = params;

  // Calculate total duration (overlap reduces total time)
  const totalDuration = outgoingDuration + incomingDuration - overlapDuration;

  // Timing breakpoints for outgoing animation
  const tiltStart = 0;
  const tiltEnd = 0.3;
  const liftStart = 0.3;
  const liftEnd = 0.6;
  const slideStart = 0.6;
  const slideEnd = overlapDuration;

  // Timing for incoming animation (starts at slideStart, ends at overlapDuration)
  const incomingStart = slideStart;
  const incomingAnimDuration = overlapDuration - slideStart; // 1.2s

  // Create corner holders (static throughout)
  const cornerHolders: RenderableComponentData[] = [
    {
      id: 'corner-holder-tl',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background-color: #8B4513;"></div>',
        className: 'absolute top-4 left-4 w-8 h-8',
        style: {
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    },
    {
      id: 'corner-holder-tr',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background-color: #8B4513;"></div>',
        className: 'absolute top-4 right-4 w-8 h-8',
        style: {
          clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    },
    {
      id: 'corner-holder-bl',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background-color: #8B4513;"></div>',
        className: 'absolute bottom-4 left-4 w-8 h-8',
        style: {
          clipPath: 'polygon(0 0, 0 100%, 100% 100%)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    },
    {
      id: 'corner-holder-br',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 100%; height: 100%; background-color: #8B4513;"></div>',
        className: 'absolute bottom-4 right-4 w-8 h-8',
        style: {
          clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    },
  ] as RenderableComponentData[];

  // Create outgoing photo frame with video
  const outgoingPhotoFrame: RenderableComponentData = {
    id: 'outgoing-photo-frame',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'p-4 bg-white shadow-xl',
        style: {
          transformOrigin: 'center bottom',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Phase 1: Tilt (0-0.3s)
      {
        id: 'outgoing-tilt',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: tiltStart,
          duration: tiltEnd - tiltStart,
          mode: 'provider',
          targetIds: ['outgoing-photo-frame'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 5, prog: 1 },
          ],
        },
      },
      // Phase 2: Lift with shadow (0.3-0.6s)
      {
        id: 'outgoing-lift',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: liftStart,
          duration: liftEnd - liftStart,
          mode: 'provider',
          targetIds: ['outgoing-photo-frame'],
          ranges: [
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '-10px', prog: 1 },
            { key: 'filter', val: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))', prog: 0 },
            { key: 'filter', val: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))', prog: 1 },
          ],
        },
      },
      // Phase 3: Slide out and fade (0.6-1.8s)
      {
        id: 'outgoing-slide-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: slideStart,
          duration: slideEnd - slideStart,
          mode: 'provider',
          targetIds: ['outgoing-photo-frame'],
          ranges: [
            { key: 'translateY', val: '-10px', prog: 0 },
            { key: 'translateY', val: '-150%', prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Create outgoing label
  const outgoingLabel: RenderableComponentData = {
    id: 'outgoing-label',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: outgoingVideo.label || 'Memory',
      className: 'mt-4 text-gray-700',
      style: {
        fontFamily: "'Caveat', cursive",
        fontSize: '24px',
      },
      font: {
        family: 'Caveat',
        weights: ['400', '700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-label-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: slideStart,
          duration: slideEnd - slideStart,
          mode: 'provider',
          targetIds: ['outgoing-label'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Create outgoing photo container
  const outgoingPhotoContainer: RenderableComponentData = {
    id: 'outgoing-photo-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    childrenData: [outgoingPhotoFrame, outgoingLabel],
  } as RenderableComponentData;

  // Create incoming photo frame with video
  const incomingPhotoFrame: RenderableComponentData = {
    id: 'incoming-photo-frame',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'p-4 bg-white shadow-xl',
        style: {
          transformOrigin: 'center top',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: incomingDuration,
      },
    },
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Drop in with bounce (relative to incoming container start)
      {
        id: 'incoming-drop-in',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: incomingAnimDuration,
          mode: 'provider',
          targetIds: ['incoming-photo-frame'],
          ranges: [
            { key: 'translateY', val: '150%', prog: 0 },
            { key: 'translateY', val: '0%', prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Create incoming label
  const incomingLabel: RenderableComponentData = {
    id: 'incoming-label',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: incomingVideo.label || 'New Memory',
      className: 'mt-4 text-gray-700',
      style: {
        fontFamily: "'Caveat', cursive",
        fontSize: '24px',
      },
      font: {
        family: 'Caveat',
        weights: ['400', '700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: incomingDuration,
      },
    },
    effects: [
      {
        id: 'incoming-label-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: incomingAnimDuration * 0.5,
          duration: incomingAnimDuration * 0.5,
          mode: 'provider',
          targetIds: ['incoming-label'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Create incoming photo container
  const incomingPhotoContainer: RenderableComponentData = {
    id: 'incoming-photo-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col items-center justify-center',
      },
    },
    context: {
      timing: {
        start: outgoingDuration - overlapDuration + incomingStart,
        duration: incomingDuration + overlapDuration - incomingStart,
      },
    },
    childrenData: [incomingPhotoFrame, incomingLabel],
  } as RenderableComponentData;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'vintage-photo-album-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-gradient-to-br from-amber-100 to-yellow-50',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      ...cornerHolders,
      outgoingPhotoContainer,
      incomingPhotoContainer,
    ],
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
  id: 'vintage-photo-album-transition',
  title: 'Vintage Photo Album Transition',
  description:
    'A nostalgic scrapbook-style transition where videos appear as instant camera photographs being removed and replaced in an album. Features compound animations with tilt, lift, and slide-out for outgoing content, and a bounce drop-in for incoming content. Includes handwritten labels and decorative corner holders for authentic album aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'vintage', 'photo-album', 'scrapbook', 'nostalgic'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      label: 'Summer Memories',
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      label: 'New Adventures',
    },
    overlapDuration: 1.8,
    outgoingDuration: 5,
    incomingDuration: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vintagePhotoAlbumTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
