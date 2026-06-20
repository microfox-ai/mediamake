/**
 * Charcoal Rubbing Texture Fade Transition Preset
 * 
 * This preset simulates the texture of charcoal being rubbed on textured paper,
 * gradually revealing the underlying image through the paper's grain pattern.
 * 
 * Features:
 * - Noise-based texture mask using SVG feTurbulence filter
 * - Paper curl effect at edges during transition peak (3deg top, -3deg bottom)
 * - Grayscale filter and slight blur on outgoing video
 * - Texture overlay using repeating-linear-gradient for paper grain
 * - Shadow effects with animated blur-radius during curl
 * - 3D perspective (1000px) for curl effect
 * - Performance optimization with 'contain: paint'
 * 
 * Technical Implementation:
 * - BaseLayout with perspective: 1000px for 3D curl
 * - Incoming VideoAtom with CSS mask-image using feTurbulence SVG filter
 *   (baseFrequency='0.02' numOctaves='4')
 * - Mask opacity animates from 0% to 100%
 * - Paper curl using transform: rotateX() on edges
 * - Outgoing VideoAtom with grayscale filter and blur
 * - Texture overlay with repeating-linear-gradient
 * - Shadow effects using box-shadow with animated blur-radius
 * 
 * Use Cases:
 * - Artistic video transitions with textured reveal
 * - Documentary-style transitions with paper texture aesthetic
 * - Creative video edits requiring irregular reveal patterns
 * - Vintage or hand-drawn styled video presentations
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
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    startFrom: z.number().optional().describe('Start time for outgoing video playback (seconds)'),
    endAt: z.number().optional().describe('End time for outgoing video playback (seconds)'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time for incoming video playback (seconds)'),
    endAt: z.number().optional().describe('End time for incoming video playback (seconds)'),
    volume: z.number().min(0).max(1).optional().describe('Volume level for incoming video (0-1)'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z.number().min(0.5).max(5).default(2).describe('Duration of the transition overlap (seconds)'),
  
  curlIntensity: z.number().min(0).max(1).default(1).describe('Intensity of the paper curl effect (0-1)'),
  
  textureOpacity: z.number().min(0).max(1).default(0.6).describe('Opacity of the paper grain texture overlay (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    curlIntensity,
    textureOpacity,
  } = params;

  // Calculate curl rotation values based on intensity
  const topCurlDeg = 3 * curlIntensity;
  const bottomCurlDeg = -3 * curlIntensity;

  // SVG noise texture for mask (base64 encoded)
  const noiseTextureSVG = `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4"/></filter></defs><rect width="100%" height="100%" filter="url(#noise)"/></svg>`;
  const noiseTextureDataURL = `data:image/svg+xml;base64,${btoa(noiseTextureSVG)}`;

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Outgoing video layer
    {
      id: 'charcoal-outgoing-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            contain: 'paint',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'charcoal-outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            startFrom: outgoingVideo.startFrom ?? 0,
            endAt: outgoingVideo.endAt,
            volume: 0,
            className: 'w-full h-full object-cover',
            style: {
              filter: 'grayscale(0.3) blur(1px)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Texture overlay layer
    {
      id: 'charcoal-texture-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,0.03) 0px,transparent 1px,transparent 2px,rgba(0,0,0,0.03) 3px);pointer-events:none;mix-blend-mode:multiply;opacity:${textureOpacity};"></div>`,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 10,
          contain: 'paint',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,

    // Incoming video layer (with 3 sections for curl effect)
    {
      id: 'charcoal-incoming-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            contain: 'paint',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        // Top edge (15% height) - curls up
        {
          id: 'charcoal-incoming-video-top',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            startFrom: incomingVideo.startFrom ?? 0,
            endAt: incomingVideo.endAt,
            volume: incomingVideo.volume !== undefined ? incomingVideo.volume : 1,
            className: 'absolute top-0 left-0 w-full object-cover',
            style: {
              height: '15%',
              clipPath: 'inset(0 0 85% 0)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: 'charcoal-top-curl-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['charcoal-incoming-video-top'],
                ranges: [
                  // Curl at midpoint
                  { key: 'rotateX', val: 0, prog: 0 },
                  { key: 'rotateX', val: topCurlDeg, prog: 0.5 },
                  { key: 'rotateX', val: 0, prog: 1 },
                  // Shadow during curl
                  { key: 'filter', val: 'drop-shadow(0 2px 0px rgba(0,0,0,0))', prog: 0 },
                  { key: 'filter', val: `drop-shadow(0 4px 8px rgba(0,0,0,${curlIntensity * 0.5}))`, prog: 0.5 },
                  { key: 'filter', val: 'drop-shadow(0 2px 0px rgba(0,0,0,0))', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Main section (70% height) - with mask reveal
        {
          id: 'charcoal-incoming-video-main',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            startFrom: incomingVideo.startFrom ?? 0,
            endAt: incomingVideo.endAt,
            volume: 0, // Main audio comes from top section
            className: 'absolute inset-0 w-full h-full object-cover',
            style: {
              maskImage: `url('${noiseTextureDataURL}')`,
              maskSize: 'cover',
              WebkitMaskImage: `url('${noiseTextureDataURL}')`,
              WebkitMaskSize: 'cover',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: 'charcoal-mask-reveal-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['charcoal-incoming-video-main'],
                ranges: [
                  // Mask opacity from 0 to 1
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // Bottom edge (15% height) - curls down
        {
          id: 'charcoal-incoming-video-bottom',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            startFrom: incomingVideo.startFrom ?? 0,
            endAt: incomingVideo.endAt,
            volume: 0,
            className: 'absolute bottom-0 left-0 w-full object-cover',
            style: {
              height: '15%',
              clipPath: 'inset(85% 0 0 0)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: 'charcoal-bottom-curl-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['charcoal-incoming-video-bottom'],
                ranges: [
                  // Curl at midpoint
                  { key: 'rotateX', val: 0, prog: 0 },
                  { key: 'rotateX', val: bottomCurlDeg, prog: 0.5 },
                  { key: 'rotateX', val: 0, prog: 1 },
                  // Shadow during curl
                  { key: 'filter', val: 'drop-shadow(0 -2px 0px rgba(0,0,0,0))', prog: 0 },
                  { key: 'filter', val: `drop-shadow(0 -4px 8px rgba(0,0,0,${curlIntensity * 0.5}))`, prog: 0.5 },
                  { key: 'filter', val: 'drop-shadow(0 -2px 0px rgba(0,0,0,0))', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'charcoal-rubbing-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
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
  id: 'charcoal-rubbing-transition',
  title: 'Charcoal Rubbing Texture Fade Transition',
  description: 'A sophisticated transition effect that simulates charcoal being rubbed on textured paper, revealing the underlying video through an animated noise-based texture mask. Features paper curl effects at edges, grayscale filtering on outgoing video, texture overlay for paper grain, and animated shadows during curl. Uses SVG feTurbulence for realistic texture pattern with subtle irregular reveal mimicking actual charcoal rubbing behavior.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'charcoal', 'texture', 'paper', 'artistic', 'mask', 'curl', '3d', 'noise', 'grain'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
      volume: 1,
    },
    transitionDuration: 2,
    curlIntensity: 1,
    textureOpacity: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const charcoalRubbingTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};