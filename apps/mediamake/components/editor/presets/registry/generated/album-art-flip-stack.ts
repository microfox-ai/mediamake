/**
 * Album Art Flip Stack Transition
 *
 * Creates a 3D horizontal flip transition inspired by vinyl record browsing. 
 * Images flip like flipping through a record collection bin with a 700ms overlap.
 * The outgoing image performs a 3D flip (rotateY 0 to -90deg) while scaling down slightly (to 0.95), 
 * then the incoming image continues the flip motion (rotateY 90deg to 0deg) creating a seamless flip-through effect.
 * 
 * Features:
 * - 3D perspective transformation with preserve-3d styling
 * - Distinct transition phases: first 350ms for outgoing flip, last 350ms for incoming flip
 * - Subtle blur (0-2px) during the mid-flip moment when images are edge-on to viewer
 * - Elastic overshoot at the end of incoming flip using cubic-bezier easing
 * - Uses backface-visibility hidden to hide images when flipped away
 * 
 * Technical Details:
 * - Overlap duration: 700ms
 * - Outgoing flip: rotateY 0deg to -90deg (starts at 50% of outgoing duration, lasts 35% of duration)
 * - Incoming flip: rotateY 90deg to 0deg (starts at 15% of incoming duration, lasts 35% of duration)
 * - Elastic easing: cubic-bezier(0.34, 1.56, 0.64, 1) for incoming flip bounce effect
 * - Blur peaks at mid-flip for both images to enhance depth perception
 * 
 * Use cases:
 * - Creating vinyl record-style image transitions
 * - Building music album art slideshows
 * - Creating nostalgic browsing experiences
 * - Transitioning between media with a tactile flip effect
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of outgoing media (image or video)'),
    type: z.enum(['image', 'video']).optional().describe('Media type (auto-detected if not provided)'),
    duration: z.number().describe('Duration in seconds for the outgoing media'),
  }).describe('Outgoing media item'),
  
  media2: z.object({
    src: z.string().describe('Source URL of incoming media (image or video)'),
    type: z.enum(['image', 'video']).optional().describe('Media type (auto-detected if not provided)'),
    duration: z.number().describe('Duration in seconds for the incoming media'),
  }).describe('Incoming media item'),
  
  overlapDuration: z.number()
    .default(0.7)
    .describe('Duration of transition overlap in seconds (default: 0.7s = 700ms)'),
  
  perspective: z.number()
    .default(1000)
    .describe('Perspective value in pixels for 3D transformation (default: 1000px)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration, perspective } = params;

  // Calculate timing
  const baseLayoutDuration = media1.duration + media2.duration - overlapDuration;
  
  // Phase timings (relative to parent container)
  // Outgoing flip: starts at 50% of outgoing duration, lasts 35% of duration
  const outgoingFlipStart = media1.duration * 0.5;
  const outgoingFlipDuration = media1.duration * 0.35;
  
  // Incoming starts overlapping at (media1.duration - overlapDuration)
  const incomingStart = media1.duration - overlapDuration;
  const incomingTotalDuration = media2.duration + overlapDuration;
  
  // Incoming flip: starts at 15% of incoming duration, lasts 35% of duration
  const incomingFlipStart = incomingTotalDuration * 0.15;
  const incomingFlipDuration = incomingTotalDuration * 0.35;
  
  // Blur timing: peaks at 70% of outgoing flip
  const outgoingBlurPeak = 0.7;

  // Determine component IDs
  const getComponentId = (src: string, type?: string): string => {
    if (type === 'video') return 'VideoAtom';
    if (type === 'image') return 'ImageAtom';
    
    // Auto-detect from extension
    if (src.match(/\.(mp4|webm|mov|avi|mkv)$/i)) return 'VideoAtom';
    if (src.match(/\.(png|jpg|jpeg|gif|webp|svg|avif)$/i)) return 'ImageAtom';
    
    return 'ImageAtom'; // Default
  };

  const media1ComponentId = getComponentId(media1.src, media1.type);
  const media2ComponentId = getComponentId(media2.src, media2.type);

  const childrenData: RenderableComponentData[] = [
    // Outgoing media container
    {
      id: 'outgoing-image-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        // Outgoing flip effect (rotateY and scale)
        {
          id: 'outgoing-flip-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingFlipStart,
            duration: outgoingFlipDuration,
            mode: 'provider',
            targetIds: ['outgoing-image-container'],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: -90, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.95, prog: 1 },
            ],
          },
        },
        // Outgoing blur effect
        {
          id: 'outgoing-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: outgoingFlipStart,
            duration: outgoingFlipDuration,
            mode: 'provider',
            targetIds: ['outgoing-image-container'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(2px)', prog: outgoingBlurPeak },
              { key: 'filter', val: 'blur(2px)', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Outgoing image/video atom
        {
          id: 'outgoing-image',
          type: 'atom',
          componentId: media1ComponentId,
          data: {
            src: media1.src,
            className: 'w-full h-full',
            fit: 'cover',
            style: {
              backfaceVisibility: 'hidden',
            },
            ...(media1ComponentId === 'VideoAtom' && {
              volume: 0,
              muted: true,
            }),
          },
          context: {
            timing: {
              start: 0,
              duration: media1.duration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
    
    // Incoming media container
    {
      id: 'incoming-image-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingTotalDuration,
        },
      },
      effects: [
        // Incoming flip effect with elastic overshoot
        {
          id: 'incoming-flip-effect',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Elastic overshoot
            start: incomingFlipStart,
            duration: incomingFlipDuration,
            mode: 'provider',
            targetIds: ['incoming-image-container'],
            ranges: [
              { key: 'rotateY', val: 90, prog: 0 },
              { key: 'rotateY', val: 0, prog: 1 },
              { key: 'scale', val: 0.95, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        // Incoming blur effect (clears as flip completes)
        {
          id: 'incoming-blur-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: incomingFlipStart,
            duration: incomingFlipDuration,
            mode: 'provider',
            targetIds: ['incoming-image-container'],
            ranges: [
              { key: 'filter', val: 'blur(2px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Incoming image/video atom
        {
          id: 'incoming-image',
          type: 'atom',
          componentId: media2ComponentId,
          data: {
            src: media2.src,
            className: 'w-full h-full',
            fit: 'cover',
            style: {
              backfaceVisibility: 'hidden',
            },
            ...(media2ComponentId === 'VideoAtom' && {
              volume: 0,
              muted: true,
            }),
          },
          context: {
            timing: {
              start: 0,
              duration: incomingTotalDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'album-art-flip-stack-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: `${perspective}px`,
          transformStyle: 'preserve-3d',
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
  id: 'album-art-flip-stack',
  title: 'Album Art Flip Stack Transition',
  description: 'Creates a 3D horizontal flip transition inspired by vinyl record browsing. Images flip like flipping through a record collection bin with a 700ms overlap, creating a seamless flip-through effect with subtle blur during mid-flip and elastic overshoot on landing.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'flip', '3d', 'album-art', 'vinyl', 'record', 'image', 'media'],
  defaultInputParams: {
    media1: {
      src: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=800&fit=crop',
      type: 'image',
      duration: 5,
    },
    media2: {
      src: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=800&fit=crop',
      type: 'image',
      duration: 5,
    },
    overlapDuration: 0.7,
    perspective: 1000,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const albumArtFlipStackPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
