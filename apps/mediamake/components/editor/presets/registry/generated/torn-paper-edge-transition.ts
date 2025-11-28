/**
 * Torn Paper Edge Transition Preset
 *
 * This preset creates a scrapbook-style transition that simulates ripping through pages.
 * It features a jagged torn paper edge that progressively reveals from left to right using
 * SVG clip-path masking. The outgoing video tears away to reveal the incoming video underneath,
 * with subtle paper rotation wobble effects and a paper texture overlay with multiply blend mode
 * for authenticity. Includes drop shadow on the torn edge for depth.
 *
 * Features:
 * - **Torn Paper Edge**: Custom SVG path creates realistic torn paper effect
 * - **Progressive Reveal**: Left-to-right tear animation using translateX transform
 * - **Paper Texture Overlay**: Semi-transparent texture with multiply blend mode
 * - **Rotation Wobble**: Subtle rotation effects (-2 to 2 degrees) for organic feel
 * - **Drop Shadow**: Creates depth between video layers
 * - **1.5 Second Overlap**: Smooth transition period between videos
 *
 * Use cases:
 * - Creating scrapbook-style video transitions
 * - Building memory/photo album video sequences
 * - Adding organic, paper-based transitions
 * - Creating vintage or handcrafted video effects
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
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  paperTexture: z.object({
    src: z.string().describe('Source URL of the paper texture image (PNG recommended)'),
  }).describe('Paper texture overlay configuration'),
  
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of the transition overlap in seconds'),
  
  rotationIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Maximum rotation angle in degrees for wobble effect'),
  
  textureOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of the paper texture overlay'),
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
    paperTexture,
    transitionDuration,
    rotationIntensity,
    textureOpacity,
  } = params;

  // Calculate container duration (sum of videos minus overlap)
  const containerDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Calculate transition timing
  const transitionStart = outgoingVideo.duration - transitionDuration;

  // IDs for targeting
  const outgoingVideoId = 'torn-paper-outgoing-video';
  const incomingVideoId = 'torn-paper-incoming-video';
  const maskLayerId = 'torn-paper-mask-layer';
  const textureOverlayId = 'torn-paper-texture-overlay';

  // Create SVG torn paper edge path
  const tornPaperSVG = `
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;position:absolute;left:0;top:0;">
      <defs>
        <clipPath id="torn-paper-clip">
          <path d="M0,0 L100,0 L100,3 L98,7 L101,11 L99,16 L102,20 L98,24 L100,29 L97,33 L101,37 L99,42 L102,46 L98,50 L100,55 L97,59 L101,63 L99,68 L102,72 L98,76 L100,81 L97,85 L101,89 L99,94 L102,98 L100,100 L0,100 Z"/>
        </clipPath>
      </defs>
      <rect width="100%" height="100%" fill="white" clip-path="url(#torn-paper-clip)"/>
    </svg>
  `;

  const childrenData: RenderableComponentData[] = [
    // Incoming video (bottom layer, z-index: 0)
    {
      id: incomingVideoId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        fit: 'cover',
        className: 'absolute inset-0 w-full h-full',
        style: {
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        // Rotation wobble: 2deg to -2deg during transition
        {
          id: 'incoming-rotation-wobble',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [incomingVideoId],
            ranges: [
              { key: 'rotate', val: rotationIntensity, prog: 0 },
              { key: 'rotate', val: -rotationIntensity, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Outgoing video (middle layer, z-index: 10)
    {
      id: outgoingVideoId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'absolute inset-0 w-full h-full',
        style: {
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        // Rotation wobble: -2deg to 2deg during transition
        {
          id: 'outgoing-rotation-wobble',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: transitionStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [outgoingVideoId],
            ranges: [
              { key: 'rotate', val: -rotationIntensity, prog: 0 },
              { key: 'rotate', val: rotationIntensity, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Torn paper mask layer (top layer, z-index: 20)
    {
      id: maskLayerId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: tornPaperSVG,
        className: 'absolute inset-0 w-full h-full',
        style: {
          zIndex: 20,
          filter: 'drop-shadow(4px 0 8px rgba(0,0,0,0.4))',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
      effects: [
        // Slide mask from left to right (reveal incoming video)
        {
          id: 'mask-slide-reveal',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [maskLayerId],
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '100%', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Paper texture overlay (top-most layer, z-index: 30)
    {
      id: textureOverlayId,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: paperTexture.src,
        className: 'absolute inset-0 w-full h-full',
        style: {
          zIndex: 30,
          mixBlendMode: 'multiply',
          opacity: textureOpacity,
          objectFit: 'cover',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: transitionStart,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'torn-paper-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: containerDuration,
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
  id: 'torn-paper-edge-transition',
  title: 'Torn Paper Edge Transition',
  description:
    'A scrapbook-style transition that simulates ripping through pages. Features a jagged torn paper edge that progressively reveals from left to right using SVG clip-path masking. The outgoing video tears away to reveal the incoming video underneath, with subtle paper rotation wobble effects and a paper texture overlay with multiply blend mode for authenticity. Includes drop shadow on the torn edge for depth.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'torn-paper', 'scrapbook', 'organic', 'vintage'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    paperTexture: {
      src: 'https://example.com/paper-texture.png',
    },
    transitionDuration: 1.5,
    rotationIntensity: 2,
    textureOpacity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const tornPaperEdgeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
