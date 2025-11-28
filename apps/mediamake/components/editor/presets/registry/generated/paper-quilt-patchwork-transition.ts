/**
 * Paper Quilt Patchwork Transition Preset
 *
 * This preset creates a beautiful quilted transition effect where videos transition
 * through a diamond-shaped patchwork pattern. The screen divides into 24 diamond patches
 * (6x4 grid) that flip individually in a ripple pattern from center outward.
 *
 * Features:
 * - **Diamond Grid Layout**: 24 diamond-shaped patches in 6x4 grid
 * - **Individual Flip Animation**: Each diamond flips with rotateY transformation
 * - **Ripple Effect**: Diamonds flip outward from center based on distance
 * - **Dual-Sided Patches**: Each diamond shows outgoing video on front, incoming on back
 * - **Fabric Texture Overlay**: Optional fabric texture with blend mode
 * - **Stitching Effect**: Inset box-shadow creates quilted stitching appearance
 * - **Smooth Transitions**: 2.2s overlap with eased flip animations
 *
 * Use cases:
 * - Creating dynamic video transitions with artistic flair
 * - Building engaging content with unique visual effects
 * - Adding cinematic transitions between video segments
 * - Creating fabric-like, tessellated video experiences
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
    startFrom: z.number().optional().describe('Start time of outgoing video (seconds)'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
    startFrom: z.number().optional().describe('Start time of incoming video (seconds)'),
  }).describe('Incoming video configuration'),
  fabricTextureSrc: z.string().optional().describe('Optional fabric texture overlay image URL'),
  transitionDuration: z.number().default(2.2).describe('Duration of transition overlap (seconds)'),
  flipDuration: z.number().default(1.0).describe('Duration of each diamond flip animation (seconds)'),
  rippleDelay: z.number().default(0.05).describe('Delay multiplier per distance unit for ripple effect (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    fabricTextureSrc,
    transitionDuration,
    flipDuration,
    rippleDelay,
  } = params;

  // Calculate total duration
  // Assuming outgoing and incoming videos have similar durations for simplicity
  // If you need dynamic durations, you'd need to fetch video metadata
  const totalDuration = transitionDuration;

  // Grid configuration: 6 columns x 4 rows = 24 diamonds
  const gridCols = 6;
  const gridRows = 4;
  const totalDiamonds = gridCols * gridRows;

  // Calculate center position for ripple effect
  const centerCol = (gridCols - 1) / 2; // 2.5
  const centerRow = (gridRows - 1) / 2; // 1.5

  // Helper: Calculate distance from center
  const calculateDistance = (row: number, col: number): number => {
    const dx = col - centerCol;
    const dy = row - centerRow;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Helper: Create diamond patch data
  const createDiamondPatch = (index: number): RenderableComponentData => {
    const row = Math.floor(index / gridCols);
    const col = index % gridCols;
    const distance = calculateDistance(row, col);
    const delay = distance * rippleDelay;

    const diamondId = `diamond-patch-${index}`;
    const diamondInnerId = `diamond-inner-${index}`;
    const frontId = `diamond-front-${index}`;
    const backId = `diamond-back-${index}`;

    // Create the diamond patch structure
    return {
      id: diamondId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative overflow-hidden',
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
      childrenData: [
        {
          id: diamondInnerId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                transform: 'rotate(45deg)',
                transformStyle: 'preserve-3d',
                boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.2)',
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
              id: `flip-effect-${index}`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: delay,
                duration: flipDuration,
                mode: 'provider',
                targetIds: [diamondInnerId],
                ranges: [
                  { key: 'rotateY', val: 0, prog: 0 },
                  { key: 'rotateY', val: 180, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [
            // Front face (outgoing video)
            {
              id: frontId,
              type: 'atom',
              componentId: 'VideoAtom',
              data: {
                src: outgoingVideo.src,
                startFrom: outgoingVideo.startFrom || 0,
                className: 'absolute inset-0',
                fit: 'cover',
                style: {
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(0deg)',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: totalDuration,
                },
              },
            } as RenderableComponentData,
            // Back face (incoming video)
            {
              id: backId,
              type: 'atom',
              componentId: 'VideoAtom',
              data: {
                src: incomingVideo.src,
                startFrom: incomingVideo.startFrom || 0,
                className: 'absolute inset-0',
                fit: 'cover',
                style: {
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: totalDuration,
                },
              },
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  };

  // Generate all 24 diamond patches
  const diamondPatches: RenderableComponentData[] = [];
  for (let i = 0; i < totalDiamonds; i++) {
    diamondPatches.push(createDiamondPatch(i));
  }

  // Build diamond grid container
  const diamondGridContainer: RenderableComponentData = {
    id: 'diamond-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gridTemplateRows: `repeat(${gridRows}, 1fr)`,
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
    childrenData: diamondPatches,
  };

  // Build root container with all layers
  const childrenData: RenderableComponentData[] = [];

  // Layer 1: Outgoing video base (hidden, used for reference)
  childrenData.push({
    id: 'outgoing-video-base',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom || 0,
      className: 'absolute inset-0',
      fit: 'cover',
      style: {
        visibility: 'hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData);

  // Layer 2: Incoming video base (hidden, used for reference)
  childrenData.push({
    id: 'incoming-video-base',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom || 0,
      className: 'absolute inset-0',
      fit: 'cover',
      style: {
        visibility: 'hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData);

  // Layer 3: Diamond grid
  childrenData.push(diamondGridContainer);

  // Layer 4: Fabric texture overlay (optional)
  if (fabricTextureSrc) {
    childrenData.push({
      id: 'fabric-texture-overlay',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: fabricTextureSrc,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'multiply',
          opacity: 0.15,
          objectFit: 'cover',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'quilt-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1200px',
        },
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'paper-quilt-patchwork-transition',
  title: 'Paper Quilt Patchwork Transition',
  description: 'Creates a quilted transition effect where videos transition through diamond-shaped patches that flip individually in a ripple pattern from center outward',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'video', 'quilt', 'diamond', 'flip', 'ripple', 'fabric', 'tessellated'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    fabricTextureSrc: undefined,
    transitionDuration: 2.2,
    flipDuration: 1.0,
    rippleDelay: 0.05,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const paperQuiltPatchworkTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
