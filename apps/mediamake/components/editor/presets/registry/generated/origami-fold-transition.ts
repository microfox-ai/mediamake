/**
 * Origami Fold Transition Preset
 *
 * This preset creates a paper crane-inspired video transition where the outgoing video
 * folds into 8 triangular origami sections with realistic shadows and paper texture.
 * At peak fold, the entire shape rotates 360 degrees before unfolding to reveal the incoming video.
 *
 * Features:
 * - **Origami Folding**: Video splits into 8 triangular sections that fold with 3D transforms
 * - **Mountain/Valley Folds**: Simulated using rotateX, rotateY, and translateZ transformations
 * - **Realistic Shading**: Brightness filters darken folded areas based on fold angle
 * - **Paper Texture**: Noise texture overlay with soft-light blend mode
 * - **360° Rotation**: Full origami shape rotates at peak fold moment
 * - **Crinkle Effects**: Subtle paper crinkle lines at fold edges
 * - **Reverse Unfolding**: Incoming video unfolds in reverse order
 * - **2.5-second Overlap**: Complex 5-phase animation sequence
 *
 * Use cases:
 * - Creating artistic video transitions with paper/origami aesthetic
 * - Building unique transitions for creative projects
 * - Adding physical material simulation to video transitions
 * - Creating memorable transition effects for presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      type: z.enum(['video', 'image']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Outgoing video configuration'),

  incomingVideo: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      type: z.enum(['video', 'image']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Incoming video configuration'),

  paperTexture: z
    .string()
    .optional()
    .describe('URL for paper/noise texture overlay (optional)'),

  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Total duration of the origami transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, paperTexture, transitionDuration } =
    params;

  // Calculate timing
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Phase timings (all relative to transition start)
  const phaseStart1 = 0; // Corner folds begin
  const phaseStart2 = 0.5; // Valley/mountain folds
  const phaseStart3 = 1.0; // Peak fold + 360° rotation
  const phaseStart4 = 1.5; // Unfolding begins
  const phaseStart5 = 2.0; // Complete unfold

  const phaseDuration = 0.5; // Each phase is 0.5 seconds

  // Transition starts when outgoing video is about to end
  const transitionStartTime = outgoingVideo.duration - transitionDuration;

  // Helper: Get component ID based on media type
  const getComponentId = (type: 'video' | 'image'): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  // Helper: Create triangular section component
  const createSection = (
    id: string,
    mediaSrc: string,
    mediaType: 'video' | 'image',
    clipPath: string,
    isOutgoing: boolean,
  ): RenderableComponentData => {
    return {
      id,
      type: 'atom',
      componentId: getComponentId(mediaType),
      data: {
        src: mediaSrc,
        fit: 'cover',
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          clipPath,
          transformOrigin: '50% 50%',
        },
      },
    } as RenderableComponentData;
  };

  // Define clip paths for 8 triangular sections (based on plan)
  const clipPaths = {
    topLeft: 'polygon(0 0, 50% 0, 50% 50%)',
    topRight: 'polygon(50% 0, 100% 0, 50% 50%)',
    rightTop: 'polygon(100% 0, 100% 50%, 50% 50%)',
    rightBottom: 'polygon(100% 50%, 100% 100%, 50% 50%)',
    bottomRight: 'polygon(100% 100%, 50% 100%, 50% 50%)',
    bottomLeft: 'polygon(50% 100%, 0 100%, 50% 50%)',
    leftBottom: 'polygon(0 100%, 0 50%, 50% 50%)',
    leftTop: 'polygon(0 50%, 0 0, 50% 50%)',
  };

  // Create outgoing video sections with fold effects
  const outgoingSections: RenderableComponentData[] = [
    createSection(
      'outgoing-section-top-left',
      outgoingVideo.src,
      outgoingVideo.type,
      clipPaths.topLeft,
      true,
    ),
    createSection(
      'outgoing-section-top-right',
      outgoingVideo.src,
      outgoingVideo.type,
      clipPaths.topRight,
      true,
    ),
    createSection(
      'outgoing-section-right-top',
      outgoingVideo.src,
      outgoingVideo.type,
      clipPaths.rightTop,
      true,
    ),
    createSection(
      'outgoing-section-right-bottom',
      outgoingVideo.src,
      outgoingVideo.type,
      clipPaths.rightBottom,
      true,
    ),
    createSection(
      'outgoing-section-bottom-right',
      outgoingVideo.src,
      outgoingVideo.type,
      clipPaths.bottomRight,
      true,
    ),
    createSection(
      'outgoing-section-bottom-left',
      outgoingVideo.src,
      outgoingVideo.type,
      clipPaths.bottomLeft,
      true,
    ),
    createSection(
      'outgoing-section-left-bottom',
      outgoingVideo.src,
      outgoingVideo.type,
      clipPaths.leftBottom,
      true,
    ),
    createSection(
      'outgoing-section-left-top',
      outgoingVideo.src,
      outgoingVideo.type,
      clipPaths.leftTop,
      true,
    ),
  ];

  // Add fold effects to outgoing sections
  const sectionFoldAngles = [45, 90, 60, 75, 45, 90, 60, 75]; // Different angles for each section
  outgoingSections.forEach((section, index) => {
    const foldAngle = sectionFoldAngles[index];
    const sectionId = section.id;

    section.effects = [
      // Phase 1: Corner folds begin
      {
        id: `${sectionId}-fold-start`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStartTime + phaseStart1,
          duration: phaseDuration,
          mode: 'provider',
          targetIds: [sectionId],
          ranges: [
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: foldAngle * 0.3, prog: 1 },
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: foldAngle * 0.2, prog: 1 },
            { key: 'translateZ', val: 0, prog: 0 },
            { key: 'translateZ', val: -20, prog: 1 },
            { key: 'brightness', val: 1, prog: 0 },
            { key: 'brightness', val: 0.9, prog: 1 },
          ],
        },
      },
      // Phase 2: Valley/mountain folds
      {
        id: `${sectionId}-fold-valley`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStartTime + phaseStart2,
          duration: phaseDuration,
          mode: 'provider',
          targetIds: [sectionId],
          ranges: [
            { key: 'rotateX', val: foldAngle * 0.3, prog: 0 },
            { key: 'rotateX', val: foldAngle, prog: 1 },
            { key: 'rotateY', val: foldAngle * 0.2, prog: 0 },
            { key: 'rotateY', val: foldAngle * 0.5, prog: 1 },
            { key: 'translateZ', val: -20, prog: 0 },
            { key: 'translateZ', val: -50, prog: 1 },
            { key: 'brightness', val: 0.9, prog: 0 },
            { key: 'brightness', val: 0.6, prog: 1 },
          ],
        },
      },
      // Phase 3: Hold at peak fold
      {
        id: `${sectionId}-fold-hold`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStartTime + phaseStart3,
          duration: phaseDuration,
          mode: 'provider',
          targetIds: [sectionId],
          ranges: [
            { key: 'rotateX', val: foldAngle, prog: 0 },
            { key: 'rotateX', val: foldAngle, prog: 1 },
            { key: 'rotateY', val: foldAngle * 0.5, prog: 0 },
            { key: 'rotateY', val: foldAngle * 0.5, prog: 1 },
            { key: 'translateZ', val: -50, prog: 0 },
            { key: 'translateZ', val: -50, prog: 1 },
            { key: 'brightness', val: 0.6, prog: 0 },
            { key: 'brightness', val: 0.6, prog: 1 },
          ],
        },
      },
      // Phase 4 & 5: Fade out (replaced by incoming video)
      {
        id: `${sectionId}-fade-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: transitionStartTime + phaseStart4,
          duration: phaseDuration * 2,
          mode: 'provider',
          targetIds: [sectionId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ];
  });

  // Outgoing video layer container
  const outgoingVideoLayer: RenderableComponentData = {
    id: 'outgoing-video-layer',
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
        duration: outgoingVideo.duration,
      },
    },
    childrenData: outgoingSections,
    effects: [
      // 360° rotation during peak fold (Phase 3)
      {
        id: 'outgoing-360-rotation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: transitionStartTime + phaseStart3,
          duration: phaseDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-layer'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 360, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming video sections with unfold effects
  const incomingSections: RenderableComponentData[] = [
    createSection(
      'incoming-section-top-left',
      incomingVideo.src,
      incomingVideo.type,
      clipPaths.topLeft,
      false,
    ),
    createSection(
      'incoming-section-top-right',
      incomingVideo.src,
      incomingVideo.type,
      clipPaths.topRight,
      false,
    ),
    createSection(
      'incoming-section-right-top',
      incomingVideo.src,
      incomingVideo.type,
      clipPaths.rightTop,
      false,
    ),
    createSection(
      'incoming-section-right-bottom',
      incomingVideo.src,
      incomingVideo.type,
      clipPaths.rightBottom,
      false,
    ),
    createSection(
      'incoming-section-bottom-right',
      incomingVideo.src,
      incomingVideo.type,
      clipPaths.bottomRight,
      false,
    ),
    createSection(
      'incoming-section-bottom-left',
      incomingVideo.src,
      incomingVideo.type,
      clipPaths.bottomLeft,
      false,
    ),
    createSection(
      'incoming-section-left-bottom',
      incomingVideo.src,
      incomingVideo.type,
      clipPaths.leftBottom,
      false,
    ),
    createSection(
      'incoming-section-left-top',
      incomingVideo.src,
      incomingVideo.type,
      clipPaths.leftTop,
      false,
    ),
  ];

  // Add unfold effects to incoming sections (reverse order)
  incomingSections.forEach((section, index) => {
    const foldAngle = sectionFoldAngles[index];
    const sectionId = section.id;

    section.effects = [
      // Start folded and fade in during Phase 4
      {
        id: `${sectionId}-unfold-start`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming video start
          duration: phaseDuration,
          mode: 'provider',
          targetIds: [sectionId],
          ranges: [
            { key: 'rotateX', val: foldAngle, prog: 0 },
            { key: 'rotateX', val: foldAngle * 0.3, prog: 1 },
            { key: 'rotateY', val: foldAngle * 0.5, prog: 0 },
            { key: 'rotateY', val: foldAngle * 0.2, prog: 1 },
            { key: 'translateZ', val: -50, prog: 0 },
            { key: 'translateZ', val: -20, prog: 1 },
            { key: 'brightness', val: 0.6, prog: 0 },
            { key: 'brightness', val: 0.9, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Phase 5: Complete unfold
      {
        id: `${sectionId}-unfold-complete`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: phaseDuration,
          duration: phaseDuration,
          mode: 'provider',
          targetIds: [sectionId],
          ranges: [
            { key: 'rotateX', val: foldAngle * 0.3, prog: 0 },
            { key: 'rotateX', val: 0, prog: 1 },
            { key: 'rotateY', val: foldAngle * 0.2, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            { key: 'translateZ', val: -20, prog: 0 },
            { key: 'translateZ', val: 0, prog: 1 },
            { key: 'brightness', val: 0.9, prog: 0 },
            { key: 'brightness', val: 1, prog: 1 },
          ],
        },
      },
    ];
  });

  // Incoming video layer container
  const incomingVideoLayer: RenderableComponentData = {
    id: 'incoming-video-layer',
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
        start: transitionStartTime + phaseStart4,
        duration: incomingVideo.duration,
      },
    },
    childrenData: incomingSections,
  };

  // Paper texture overlay (if provided)
  const paperTextureOverlay: RenderableComponentData | null = paperTexture
    ? ({
        id: 'paper-texture-overlay',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: paperTexture,
          className: 'absolute inset-0 w-full h-full pointer-events-none',
          fit: 'cover',
          style: {
            mixBlendMode: 'soft-light',
            opacity: 0,
          },
        },
        context: {
          timing: {
            start: transitionStartTime,
            duration: transitionDuration,
          },
        },
        effects: [
          // Fade in during fold
          {
            id: 'paper-texture-fade-in',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: phaseDuration * 2,
              mode: 'provider',
              targetIds: ['paper-texture-overlay'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 1 },
              ],
            },
          },
          // Fade out during unfold
          {
            id: 'paper-texture-fade-out',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: phaseDuration * 3,
              duration: phaseDuration * 2,
              mode: 'provider',
              targetIds: ['paper-texture-overlay'],
              ranges: [
                { key: 'opacity', val: 0.8, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData)
    : null;

  // Crinkle lines (subtle paper fold lines)
  const crinkleLinesContainer: RenderableComponentData = {
    id: 'fold-crinkle-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: transitionStartTime,
        duration: transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'crinkle-line-horizontal',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 100%; height: 2px; background: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.3) 50%, transparent 100%); box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>',
          className: 'absolute left-0 right-0 top-1/2 -translate-y-1/2',
        },
      } as RenderableComponentData,
      {
        id: 'crinkle-line-vertical',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 2px; height: 100%; background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 50%, transparent 100%); box-shadow: 1px 0 3px rgba(0,0,0,0.2);"></div>',
          className: 'absolute top-0 bottom-0 left-1/2 -translate-x-1/2',
        },
      } as RenderableComponentData,
      {
        id: 'crinkle-line-diagonal-1',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 141.42%; height: 2px; background: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 50%, transparent 100%); transform-origin: 0 0; transform: rotate(45deg);"></div>',
          className: 'absolute top-0 left-0',
        },
      } as RenderableComponentData,
      {
        id: 'crinkle-line-diagonal-2',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 141.42%; height: 2px; background: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.2) 50%, transparent 100%); transform-origin: 100% 0; transform: rotate(-45deg);"></div>',
          className: 'absolute top-0 right-0',
        },
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'origami-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '800px',
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
    childrenData: [
      outgoingVideoLayer,
      incomingVideoLayer,
      ...(paperTextureOverlay ? [paperTextureOverlay] : []),
      crinkleLinesContainer,
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

const presetMetadata: PresetMetadata = {
  id: 'origami-fold-transition',
  title: 'Origami Fold Transition',
  description:
    'A paper crane-inspired video transition where the outgoing video folds into 8 triangular origami sections with realistic shadows and paper texture. At peak fold, the entire shape rotates 360 degrees before unfolding to reveal the incoming video. Features valley/mountain fold simulation via 3D transforms, brightness-based shading, and subtle crinkle line effects at fold edges.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'origami',
    'paper',
    'fold',
    '3d',
    'creative',
    'artistic',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    paperTexture: 'https://example.com/paper-texture.jpg',
    transitionDuration: 2.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const origamiFoldTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
