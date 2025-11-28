/**
 * Frosted Glass Accordion Fold Transition Preset
 *
 * This preset creates a sophisticated accordion fold transition effect where videos appear
 * printed on frosted glass panels that fold and unfold like an accordion. The outgoing video
 * is divided into 8 vertical strips that fold inward with alternating rotateY transforms
 * (even strips rotate right, odd strips rotate left). As strips fold, blur increases from
 * 0px to 12px concentrated at fold edges, creating a frosted glass effect. The incoming video
 * strips start folded and unfold with decreasing blur. Dynamic shadows change based on fold
 * angles to enhance the 3D glass panel illusion. A glass texture overlay using CSS noise
 * filter adds subtle transparency gradients at fold lines.
 *
 * Features:
 * - 8 vertical strip division for accordion effect
 * - Alternating rotateY transforms (even: 0→90deg, odd: 0→-90deg)
 * - Progressive blur from 0px to 12px at fold edges
 * - Dynamic shadows based on fold angles
 * - Glass texture overlay with CSS noise filter
 * - 2-second overlap between videos
 * - Staggered animations with 0.1s delay between strips
 *
 * Use cases:
 * - Creating elegant video transitions with 3D glass effects
 * - Building sophisticated video montages
 * - Adding premium transitions to video content
 * - Creating glass-themed visual effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Zod schema for preset parameters
const presetParams = z.object({
  video1: z
    .object({
      src: z.string().describe('Source URL of the first video'),
      duration: z.number().describe('Duration of the first video in seconds'),
    })
    .describe('First video configuration'),
  video2: z
    .object({
      src: z.string().describe('Source URL of the second video'),
      duration: z.number().describe('Duration of the second video in seconds'),
    })
    .describe('Second video configuration'),
  transitionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;

  // Calculate total duration with 2s overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Helper function to create strip structure
  const createStrip = (
    stripIndex: number,
    videoSrc: string,
    videoDuration: number,
    isOutgoing: boolean,
  ): RenderableComponentData => {
    const stripId = isOutgoing
      ? `out-strip-${stripIndex}`
      : `in-strip-${stripIndex}`;
    const videoId = isOutgoing
      ? `out-video-${stripIndex}`
      : `in-video-${stripIndex}`;

    // Determine if strip is even (rotates right) or odd (rotates left)
    const isEven = stripIndex % 2 === 0;
    const transformOrigin = isEven ? 'left center' : 'right center';
    const rotationDirection = isEven ? 90 : -90;

    // Calculate object position for video strip
    const positionPercent = stripIndex * 12.5;
    const marginLeft = -stripIndex * 100;

    if (isOutgoing) {
      // Outgoing strip configuration
      const foldStartTime = video1.duration - transitionDuration;
      const animationDelay = stripIndex * 0.1;

      return {
        id: stripId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative overflow-hidden',
            style: {
              width: '12.5%',
              height: '100%',
              transformOrigin,
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
        effects: [
          // Rotation effect
          {
            id: `${stripId}-fold`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: foldStartTime + animationDelay,
              duration: 1.6,
              mode: 'provider',
              targetIds: [stripId],
              ranges: [
                { key: 'rotateY', val: 0, prog: 0 },
                { key: 'rotateY', val: rotationDirection, prog: 1 },
              ],
            },
          },
          // Blur effect
          {
            id: `${stripId}-blur`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: foldStartTime + animationDelay,
              duration: 1.6,
              mode: 'provider',
              targetIds: [stripId],
              ranges: [
                { key: 'blur', val: 0, prog: 0 },
                { key: 'blur', val: 12, prog: 1 },
              ],
            },
          },
          // Shadow effect
          {
            id: `${stripId}-shadow`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: foldStartTime + animationDelay,
              duration: 1.6,
              mode: 'provider',
              targetIds: [stripId],
              ranges: [
                { key: 'boxShadow', val: '0px 0px 0px rgba(0,0,0,0)', prog: 0 },
                {
                  key: 'boxShadow',
                  val: isEven
                    ? '-20px 0px 40px rgba(0,0,0,0.5)'
                    : '20px 0px 40px rgba(0,0,0,0.5)',
                  prog: 1,
                },
              ],
            },
          },
          // Opacity fade out
          {
            id: `${stripId}-opacity`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: video1.duration - (0.8 - stripIndex * 0.1),
              duration: 0.8,
              mode: 'provider',
              targetIds: [stripId],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: videoId,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: videoSrc,
              className: 'w-full h-full object-cover',
              fit: 'cover',
              style: {
                width: '800%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `${positionPercent}% center`,
                marginLeft: `${marginLeft}%`,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: video1.duration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    } else {
      // Incoming strip configuration
      const unfoldStartTime = 0.4 + stripIndex * 0.1;
      const initialRotation = isEven ? -90 : 90;

      return {
        id: stripId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative overflow-hidden',
            style: {
              width: '12.5%',
              height: '100%',
              transformOrigin,
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration,
          },
        },
        effects: [
          // Rotation unfold effect
          {
            id: `${stripId}-unfold`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: unfoldStartTime,
              duration: 1.6,
              mode: 'provider',
              targetIds: [stripId],
              ranges: [
                { key: 'rotateY', val: initialRotation, prog: 0 },
                { key: 'rotateY', val: 0, prog: 1 },
              ],
            },
          },
          // Blur decrease effect
          {
            id: `${stripId}-blur`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: unfoldStartTime,
              duration: 1.0,
              mode: 'provider',
              targetIds: [stripId],
              ranges: [
                { key: 'blur', val: 12, prog: 0 },
                { key: 'blur', val: 0, prog: 1 },
              ],
            },
          },
          // Shadow fade effect
          {
            id: `${stripId}-shadow`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: unfoldStartTime,
              duration: 1.6,
              mode: 'provider',
              targetIds: [stripId],
              ranges: [
                {
                  key: 'boxShadow',
                  val: isEven
                    ? '-20px 0px 40px rgba(0,0,0,0.5)'
                    : '20px 0px 40px rgba(0,0,0,0.5)',
                  prog: 0,
                },
                { key: 'boxShadow', val: '0px 0px 0px rgba(0,0,0,0)', prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: videoId,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: videoSrc,
              className: 'w-full h-full object-cover',
              fit: 'cover',
              style: {
                width: '800%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: `${positionPercent}% center`,
                marginLeft: `${marginLeft}%`,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: video2.duration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    }
  };

  // Create all 8 outgoing strips
  const outgoingStrips: RenderableComponentData[] = [];
  for (let i = 0; i < 8; i++) {
    outgoingStrips.push(createStrip(i, video1.src, video1.duration, true));
  }

  // Create all 8 incoming strips
  const incomingStrips: RenderableComponentData[] = [];
  for (let i = 0; i < 8; i++) {
    incomingStrips.push(createStrip(i, video2.src, video2.duration, false));
  }

  // Create glass texture overlay
  const glassTextureOverlay: RenderableComponentData = {
    id: 'glass-texture-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg style="position:absolute;width:0;height:0"><defs><filter id="noise-filter"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs></svg><div style="position:absolute;inset:0;filter:url(#noise-filter);opacity:0.08;pointer-events:none;mix-blend-mode:overlay"></div>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 100,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData;

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'frosted-glass-accordion-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
          backgroundColor: '#000',
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
      // Outgoing video container
      {
        id: 'outgoing-video-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex flex-row',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
        childrenData: outgoingStrips,
      } as RenderableComponentData,
      // Incoming video container
      {
        id: 'incoming-video-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex flex-row',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: video1.duration - transitionDuration,
            duration: video2.duration,
          },
        },
        childrenData: incomingStrips,
      } as RenderableComponentData,
      // Glass texture overlay
      glassTextureOverlay,
    ],
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
  id: 'frosted-glass-accordion-fold-transition',
  title: 'Frosted Glass Accordion Fold Transition',
  description:
    'A sophisticated accordion fold transition effect where videos appear printed on frosted glass panels that fold and unfold. Features 8 vertical strips with alternating rotateY transforms, progressive blur at fold edges, dynamic shadows, and glass texture overlay with CSS noise filter. 2-second overlap between videos with staggered animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'accordion',
    'frosted-glass',
    'glass',
    'fold',
    'blur',
    '3d',
    'strips',
    'rotate',
    'shadow',
    'texture',
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
    transitionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const frostedGlassAccordionFoldTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: presetParams as any,
};
