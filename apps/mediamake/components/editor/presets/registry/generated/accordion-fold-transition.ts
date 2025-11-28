/**
 * Paper Accordion Fold Transition Preset
 *
 * This preset creates a paper accordion fold transition where the outgoing video compresses
 * into vertical accordion folds that then expand to reveal the incoming video. Each fold has
 * realistic shadows and highlights to create depth, with bouncy elastic motion and subtle
 * paper texture overlay.
 *
 * Features:
 * - **8 Vertical Sections**: Creates 8 vertical accordion folds
 * - **Alternating Compression**: Odd sections compress (outgoing), even sections expand (incoming)
 * - **Realistic Shadows**: Gradient overlays create fold depth
 * - **Elastic Motion**: Spring physics easing with cubic-bezier for bouncy feel
 * - **Paper Texture**: Overlay with mix-blend-darken for handmade quality
 * - **Dynamic Rotation**: Container rotates during transition for visual interest
 * - **Progressive Stagger**: Each fold animates with slight delay for wave effect
 *
 * Use cases:
 * - Creating unique page-turn style transitions
 * - Adding handmade, organic feel to video transitions
 * - Building dynamic paper-fold effects between clips
 * - Creating attention-grabbing scene changes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  paperTexture: z
    .object({
      src: z.string().describe('Source URL of paper texture image'),
    })
    .optional()
    .describe('Optional paper texture overlay'),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, paperTexture, transitionDuration } =
    params;

  // Number of vertical sections for accordion
  const sectionCount = 8;
  const sectionWidth = 100 / sectionCount; // percentage

  // Calculate total duration (videos overlap during transition)
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Helper function to create fold section
  const createFoldSection = (
    index: number,
  ): RenderableComponentData => {
    const isOddSection = index % 2 === 0; // 0, 2, 4, 6 are "odd" visually
    const leftPosition = index * sectionWidth;
    const sectionId = `fold-section-${index}`;
    const outgoingVideoId = `outgoing-video-${index}`;
    const incomingVideoId = `incoming-video-${index}`;
    const shadowOverlayId = `shadow-overlay-${index}`;

    // Stagger effect start times slightly for wave effect
    const staggerDelay = index * 0.05;

    // Alternating transform origins for realistic fold
    const transformOrigin = isOddSection
      ? 'right center'
      : 'left center';

    // Z-index for proper layering (higher sections on top during fold)
    const zIndex = sectionCount - index;

    // Scale animation: odd sections compress (1 → 0.1 → 1), even sections expand (0.1 → 1 → 0.1)
    const scaleRanges = isOddSection
      ? [
          { key: 'scaleX', val: 1, prog: 0 },
          { key: 'scaleX', val: 0.1, prog: 0.5 },
          { key: 'scaleX', val: 1, prog: 1 },
        ]
      : [
          { key: 'scaleX', val: 0.1, prog: 0 },
          { key: 'scaleX', val: 1, prog: 0.5 },
          { key: 'scaleX', val: 0.1, prog: 1 },
        ];

    return {
      id: sectionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: `${leftPosition}%`,
            top: 0,
            width: `${sectionWidth}%`,
            height: '100%',
            overflow: 'hidden',
            zIndex: zIndex,
            transformOrigin: transformOrigin,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `fold-${index}-scale-effect`,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: staggerDelay,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [sectionId],
            ranges: scaleRanges,
          },
        },
      ],
      childrenData: [
        // Outgoing video slice (for odd sections, visible at start)
        {
          id: outgoingVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            className: 'absolute inset-0',
            style: {
              objectFit: 'cover',
              objectPosition: `${leftPosition}% center`,
              width: `${sectionCount * 100}%`,
              height: '100%',
              left: `-${index * 100}%`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideo.duration,
            },
          },
        } as RenderableComponentData,
        // Incoming video slice (for even sections, visible after transition)
        {
          id: incomingVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            className: 'absolute inset-0',
            style: {
              objectFit: 'cover',
              objectPosition: `${leftPosition}% center`,
              width: `${sectionCount * 100}%`,
              height: '100%',
              left: `-${index * 100}%`,
            },
          },
          context: {
            timing: {
              start: outgoingVideo.duration - transitionDuration,
              duration: incomingVideo.duration + transitionDuration,
            },
          },
        } as RenderableComponentData,
        // Shadow overlay for fold depth
        {
          id: shadowOverlayId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: "<div style='width: 100%; height: 100%; background: linear-gradient(90deg, rgba(0,0,0,0.2) 0%, transparent 50%, rgba(0,0,0,0.2) 100%);'></div>",
            className: 'absolute inset-0 pointer-events-none',
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        } as RenderableComponentData,
      ],
    };
  };

  // Create all fold sections
  const foldSections: RenderableComponentData[] = [];
  for (let i = 0; i < sectionCount; i++) {
    foldSections.push(createFoldSection(i));
  }

  // Paper texture overlay (optional)
  const paperTextureOverlay = paperTexture
    ? ({
        id: 'paper-texture-overlay',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: paperTexture.src,
          className:
            'absolute inset-0 pointer-events-none mix-blend-darken opacity-25',
          style: {
            objectFit: 'cover',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData)
    : null;

  // Rotation wrapper for dynamic movement
  const rotationWrapper: RenderableComponentData = {
    id: 'rotation-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'container-rotate-effect',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['rotation-wrapper'],
          ranges: [
            { key: 'rotateZ', val: -5, prog: 0 },
            { key: 'rotateZ', val: 5, prog: 0.5 },
            { key: 'rotateZ', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      ...foldSections,
      ...(paperTextureOverlay ? [paperTextureOverlay] : []),
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'accordion-fold-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [rotationWrapper],
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
  id: 'accordion-fold-transition',
  title: 'Paper Accordion Fold Transition',
  description:
    'A paper accordion fold transition where the outgoing video compresses into vertical accordion folds that then expand to reveal the incoming video. Features realistic shadows, highlights, bouncy elastic motion, paper texture overlay, and dynamic rotation during fold/unfold animation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'accordion',
    'fold',
    'paper',
    'video',
    'elastic',
    'spring',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    paperTexture: {
      src: 'https://example.com/paper-texture.jpg',
    },
    transitionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const accordionFoldTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
