/**
 * Masking Tape Peel-Off Transition Preset
 *
 * Creates a realistic masking tape peel-off transition effect where the outgoing video
 * appears to have masking tape pieces stuck on top that get peeled away one by one to
 * reveal the incoming video underneath.
 *
 * Features:
 * - Realistic paper texture overlay with slightly torn edges
 * - Subtle shadows cast by tape pieces
 * - Staggered peel animation with 3D rotation effect (rotateY and rotateZ)
 * - Tape pieces start from different corners and edges
 * - Slight spring bounce as each piece peels away
 * - Incoming video visible underneath from the start
 * - Gradually increases brightness as tape pieces are removed
 * - Synchronized paper tearing sound effects for each peel
 *
 * Use cases:
 * - Creative transitions between video clips or images
 * - Scrapbook-style video presentations
 * - DIY or crafting video content
 * - Memory/nostalgia-themed transitions
 * - Artistic reveal effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of the outgoing media (video or image)'),
    type: z.enum(['video', 'image']).describe('Type of outgoing media'),
    duration: z.number().describe('Duration of outgoing media in seconds'),
  }).describe('Outgoing media configuration'),
  
  media2: z.object({
    src: z.string().describe('Source URL of the incoming media (video or image)'),
    type: z.enum(['video', 'image']).describe('Type of incoming media'),
    duration: z.number().describe('Duration of incoming media in seconds'),
  }).describe('Incoming media configuration'),
  
  overlapDuration: z.number().default(1.5).describe('Duration of the transition overlap in seconds'),
  
  paperTearSound: z.string().optional().describe('Optional audio source URL for paper tearing sound effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration, paperTearSound } = params;

  // Calculate total duration: media1 + media2 - overlap
  const totalDuration = media1.duration + media2.duration - overlapDuration;

  // Determine component IDs based on media types
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Tape piece configurations: position, size, rotation, and timing
  const tapePieces = [
    {
      id: 'tape-piece-1',
      width: '200px',
      height: '80px',
      top: '10%',
      left: '5%',
      initialRotate: -5,
      finalRotateY: 90,
      finalRotateZ: 20,
      delay: 0,
    },
    {
      id: 'tape-piece-2',
      width: '180px',
      height: '90px',
      top: '20%',
      right: '8%',
      initialRotate: 8,
      finalRotateY: 90,
      finalRotateZ: -15,
      delay: 0.25,
    },
    {
      id: 'tape-piece-3',
      width: '220px',
      height: '70px',
      top: '45%',
      left: '15%',
      initialRotate: -12,
      finalRotateY: 90,
      finalRotateZ: 10,
      delay: 0.5,
    },
    {
      id: 'tape-piece-4',
      width: '160px',
      height: '85px',
      top: '55%',
      right: '12%',
      initialRotate: 6,
      finalRotateY: 90,
      finalRotateZ: -18,
      delay: 0.75,
    },
    {
      id: 'tape-piece-5',
      width: '190px',
      height: '75px',
      bottom: '15%',
      left: '10%',
      initialRotate: -8,
      finalRotateY: 90,
      finalRotateZ: 12,
      delay: 1.0,
    },
    {
      id: 'tape-piece-6',
      width: '210px',
      height: '80px',
      bottom: '10%',
      right: '6%',
      initialRotate: 10,
      finalRotateY: 90,
      finalRotateZ: -22,
      delay: 1.25,
    },
  ];

  // Create tape piece components with peel animations
  const tapeComponents: RenderableComponentData[] = tapePieces.map((tape) => ({
    id: tape.id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute bg-yellow-100/90 shadow-md',
      style: {
        zIndex: 15,
        width: tape.width,
        height: tape.height,
        ...(tape.top ? { top: tape.top } : {}),
        ...(tape.bottom ? { bottom: tape.bottom } : {}),
        ...(tape.left ? { left: tape.left } : {}),
        ...(tape.right ? { right: tape.right } : {}),
        transform: `rotate(${tape.initialRotate}deg)`,
        backgroundImage:
          'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        borderRadius: '2px',
        border: '1px solid rgba(0,0,0,0.05)',
      },
    },
    context: {
      timing: {
        start: media1.duration - overlapDuration,
        duration: overlapDuration,
      },
    },
    effects: [
      {
        id: `tape-peel-${tape.id}`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          start: tape.delay,
          duration: 0.4,
          mode: 'provider',
          targetIds: [tape.id],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: tape.finalRotateY, prog: 1 },
            { key: 'rotateZ', val: tape.initialRotate, prog: 0 },
            { key: 'rotateZ', val: tape.finalRotateZ, prog: 1 },
            { key: 'translateZ', val: 0, prog: 0 },
            { key: 'translateZ', val: 200, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.75 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  }));

  // Create audio components for paper tear sounds (if provided)
  const audioComponents: RenderableComponentData[] = paperTearSound
    ? tapePieces.map((tape, index) => ({
        id: `audio-tear-${index + 1}`,
        type: 'atom' as const,
        componentId: 'AudioAtom',
        data: {
          src: paperTearSound,
          volume: 0.5,
        },
        context: {
          timing: {
            start: media1.duration - overlapDuration + tape.delay,
            duration: 0.5,
          },
        },
      }))
    : [];

  // Build the composition
  const childrenData: RenderableComponentData[] = [
    // Outgoing media (video or image at z-10)
    {
      id: 'outgoing-media',
      type: 'atom' as const,
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 10,
        },
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
    },
    // Incoming media (video or image at z-0)
    {
      id: 'incoming-media',
      type: 'atom' as const,
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 0,
        },
        fit: 'cover',
      },
      context: {
        timing: {
          start: media1.duration - overlapDuration,
          duration: media2.duration,
        },
      },
      effects: [
        {
          id: 'brightness-fade-in',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-media'],
            ranges: [
              { key: 'brightness', val: 0.5, prog: 0 },
              { key: 'brightness', val: 1, prog: 1 },
            ],
          },
        },
      ],
    },
    // Tape pieces
    ...tapeComponents,
    // Audio tear sounds
    ...audioComponents,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'masking-tape-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
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
  id: 'masking-tape-peel-transition',
  title: 'Masking Tape Peel-Off Transition',
  description:
    'A creative transition effect where masking tape pieces stuck on the outgoing video peel away one by one with 3D rotation to reveal the incoming video underneath. Features realistic paper textures, torn edges, subtle shadows, staggered animations with spring bounce, and synchronized paper tearing sound effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'tape', 'peel', 'creative', '3d', 'realistic', 'scrapbook'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    overlapDuration: 1.5,
    paperTearSound: 'https://example.com/paper-tear.mp3',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const maskingTapePeelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
