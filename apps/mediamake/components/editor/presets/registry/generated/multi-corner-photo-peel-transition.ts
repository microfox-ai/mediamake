/**
 * Multi-Corner Photo Peel Transition
 *
 * A nostalgic video transition where all four corners of the outgoing video simultaneously
 * curl inward like an old photograph being removed from a vintage album. Features staggered
 * corner peel timing for organic movement, glossy photo paper finish with dynamic light
 * reflections, vintage album texture reveal, and subtle edge yellowing/aging effect.
 *
 * Features:
 * - **Simultaneous Four-Corner Peel**: All corners curl inward at once with staggered timing
 * - **Organic Movement**: Each corner peels at slightly different rates for natural feel
 * - **Photo Paper Thickness**: Realistic paper thickness with glossy finish
 * - **Dynamic Light Reflection**: Glossy finish that reflects light differently as corners curl
 * - **Vintage Album Texture**: Reveals textured album page behind peeling photo
 * - **Edge Aging Effect**: Subtle yellowing at edges simulating aging photo
 * - **Smooth Transition**: Incoming video fades in with scale animation behind the peel
 *
 * Use cases:
 * - Creating nostalgic photo album-style video transitions
 * - Building vintage memory/scrapbook video sequences
 * - Adding organic, handcrafted feel to video transitions
 * - Creating sentimental family video montages
 * - Simulating physical photo removal effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  // Video sources
  outgoingVideoSrc: z
    .string()
    .describe('Source URL or path for the outgoing video (the photo being peeled)'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL or path for the incoming video (revealed behind)'),
  
  // Vintage album texture
  vintageAlbumTextureSrc: z
    .string()
    .optional()
    .describe('Source URL for vintage album page texture (optional, uses default if not provided)'),
  
  // Timing configuration
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2.2)
    .describe('Total duration of the transition in seconds'),
  
  cornerStaggerDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Delay offset between each corner peel start (seconds)'),
  
  incomingVideoDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Delay before incoming video starts fading in (seconds)'),
  
  // Visual effects
  curlIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for corner curl effect'),
  
  agingIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of edge yellowing/aging effect (0-1)'),
  
  glossIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of glossy photo finish reflection (0-1)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    vintageAlbumTextureSrc,
    transitionDuration = 2.2,
    cornerStaggerDelay = 0.1,
    incomingVideoDelay = 0.3,
    curlIntensity = 1,
    agingIntensity = 0.3,
    glossIntensity = 0.3,
  } = params;

  // Calculate individual corner animation durations
  // Each corner has same duration but starts at different times
  const cornerAnimationDuration = transitionDuration - cornerStaggerDelay * 3;

  // Helper: Create corner peel effect for a specific corner
  const createCornerPeelEffect = (
    cornerPosition: 'tl' | 'tr' | 'bl' | 'br',
    startDelay: number,
  ) => {
    const cornerId = `corner-peel-${cornerPosition}`;
    const shadowId = `corner-shadow-${cornerPosition}`;
    
    // Determine transform origin based on corner
    const transformOrigins = {
      tl: 'top left',
      tr: 'top right',
      bl: 'bottom left',
      br: 'bottom right',
    };
    
    // Determine corner position styles
    const cornerPositions = {
      tl: { top: 0, left: 0 },
      tr: { top: 0, right: 0 },
      bl: { bottom: 0, left: 0 },
      br: { bottom: 0, right: 0 },
    };

    return {
      id: cornerId,
      componentId: 'BaseLayout',
      type: 'layout' as const,
      data: {
        containerProps: {
          className: 'absolute pointer-events-none',
          style: {
            ...cornerPositions[cornerPosition],
            width: '30%',
            height: '30%',
            transformOrigin: transformOrigins[cornerPosition],
            transformStyle: 'preserve-3d',
          },
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
          id: `${cornerId}-curl`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: startDelay,
            duration: cornerAnimationDuration,
            mode: 'provider',
            targetIds: [cornerId],
            ranges: [
              // Curl effect - rotate and translate
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: 45 * curlIntensity, prog: 1 },
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: 45 * curlIntensity, prog: 1 },
              { key: 'translateZ', val: 0, prog: 0 },
              { key: 'translateZ', val: 50 * curlIntensity, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Shadow overlay that appears as corner curls
        {
          id: shadowId,
          componentId: 'BaseLayout',
          type: 'layout' as const,
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                background: `linear-gradient(${
                  cornerPosition === 'tl' ? '135deg' :
                  cornerPosition === 'tr' ? '-135deg' :
                  cornerPosition === 'bl' ? '45deg' : '-45deg'
                }, rgba(0,0,0,0.4) 0%, transparent 60%)`,
              },
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
              id: `${shadowId}-fade`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: startDelay,
                duration: cornerAnimationDuration * 0.6,
                mode: 'provider',
                targetIds: [shadowId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    };
  };

  // Build the composition structure
  const rootContainer = {
    id: 'multi-corner-peel-root',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-amber-50/20',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      // 1. Vintage album texture background
      {
        id: 'vintage-album-texture',
        componentId: vintageAlbumTextureSrc ? 'ImageAtom' : 'BaseLayout',
        type: 'atom' as const,
        data: vintageAlbumTextureSrc ? {
          src: vintageAlbumTextureSrc,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            opacity: 0.6,
            filter: 'sepia(0.4) contrast(0.9)',
          },
        } : {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              background: 'linear-gradient(135deg, #f5e6d3 0%, #e8d5b9 50%, #d4c4a8 100%)',
              opacity: 0.6,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,

      // 2. Incoming video container (fades in behind)
      {
        id: 'incoming-video-container',
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'absolute inset-0',
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
            id: 'incoming-fade-scale',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: incomingVideoDelay,
              duration: transitionDuration - incomingVideoDelay,
              mode: 'provider',
              targetIds: ['incoming-video-container'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                { key: 'scale', val: 0.9, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: 'incoming-video',
            componentId: 'VideoAtom',
            type: 'atom' as const,
            data: {
              src: incomingVideoSrc,
              className: 'absolute inset-0 w-full h-full object-cover',
              fit: 'cover',
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

      // 3. Outgoing video container (the peeling photo)
      {
        id: 'outgoing-video-container',
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              transformStyle: 'preserve-3d',
              perspective: '1500px',
              mixBlendMode: 'multiply',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          // Overall photo curl effect
          {
            id: 'photo-curl-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-video-container'],
              ranges: [
                // Subtle overall rotation as corners peel
                { key: 'rotateX', val: 0, prog: 0 },
                { key: 'rotateX', val: 5 * curlIntensity, prog: 0.5 },
                { key: 'rotateX', val: 10 * curlIntensity, prog: 1 },
                { key: 'rotateY', val: 0, prog: 0 },
                { key: 'rotateY', val: 3 * curlIntensity, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          // The outgoing video
          {
            id: 'outgoing-video',
            componentId: 'VideoAtom',
            type: 'atom' as const,
            data: {
              src: outgoingVideoSrc,
              className: 'absolute inset-0 w-full h-full object-cover',
              fit: 'cover',
              style: {
                boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          } as RenderableComponentData,

          // Photo gloss layer (dynamic light reflection)
          {
            id: 'photo-gloss-layer',
            componentId: 'BaseLayout',
            type: 'layout' as const,
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none',
                style: {
                  background: `linear-gradient(135deg, rgba(255,255,255,${glossIntensity}) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,${glossIntensity * 0.3}) 60%, rgba(255,255,255,0) 100%)`,
                  mixBlendMode: 'overlay',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          } as RenderableComponentData,

          // Edge aging overlay (yellowing at edges)
          {
            id: 'edge-aging-overlay',
            componentId: 'BaseLayout',
            type: 'layout' as const,
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none',
                style: {
                  background: `radial-gradient(ellipse at center, transparent 50%, rgba(139,90,43,${agingIntensity}) 80%, rgba(101,67,33,${agingIntensity * 1.5}) 100%)`,
                },
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
                id: 'aging-intensify',
                componentId: 'generic',
                data: {
                  type: 'ease-in',
                  start: 0,
                  duration: transitionDuration,
                  mode: 'provider',
                  targetIds: ['edge-aging-overlay'],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 1 },
                    { key: 'filter', val: 'sepia(0)', prog: 0 },
                    { key: 'filter', val: `sepia(${agingIntensity})`, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,

      // 4. Corner peel overlays (staggered)
      createCornerPeelEffect('tl', 0) as RenderableComponentData,
      createCornerPeelEffect('tr', cornerStaggerDelay) as RenderableComponentData,
      createCornerPeelEffect('bl', cornerStaggerDelay * 2) as RenderableComponentData,
      createCornerPeelEffect('br', cornerStaggerDelay * 3) as RenderableComponentData,

      // 5. Overall vignette overlay
      {
        id: 'vignette-overlay',
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%)',
              opacity: 0.4,
            },
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
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'multi-corner-photo-peel-transition',
  title: 'Multi-Corner Photo Peel Transition',
  description:
    'A nostalgic video transition where all four corners of the outgoing video simultaneously curl inward like an old photograph being removed from a vintage album. Features staggered corner peel timing for organic movement, glossy photo paper finish with dynamic light reflections, vintage album texture reveal, and subtle edge yellowing/aging effect. The incoming video fades in with slight scale animation behind the peeling photo.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'photo',
    'peel',
    'nostalgic',
    'vintage',
    'album',
    '3d',
    'curl',
    'organic',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    transitionDuration: 2.2,
    cornerStaggerDelay: 0.1,
    incomingVideoDelay: 0.3,
    curlIntensity: 1,
    agingIntensity: 0.3,
    glossIntensity: 0.3,
  },
  dependencies: {},
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const multiCornerPhotoPeelTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
