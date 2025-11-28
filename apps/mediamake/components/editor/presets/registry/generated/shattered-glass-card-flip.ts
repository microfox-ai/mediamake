/**
 * Shattered Glass Card Flip Transition Preset
 *
 * This preset creates a dramatic card flip transition where the outgoing image
 * shatters into fragments that scatter and tumble away while the incoming image
 * fades in behind. Features:
 *
 * - Grid-based fragmentation (4x4 grid = 16 fragments)
 * - Staggered timing: edge pieces fly first, center pieces last
 * - 3D rotation with individual tumbling per fragment
 * - Scatter animation: edge pieces move ±200px, center pieces move less
 * - Incoming image fades in cleanly as fragments disperse
 * - Realistic 3D perspective and transform origins
 *
 * Use cases:
 * - Dramatic image transitions in presentations
 * - Breaking news reveal effects
 * - Album art transitions in music videos
 * - Product showcase transitions
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  outgoingImage: z.string().describe('URL or path of the outgoing image to shatter'),
  incomingImage: z.string().describe('URL or path of the incoming image to reveal'),
  duration: z.number().min(0.5).max(5).default(1.5).describe('Total transition duration in seconds'),
  gridSize: z.number().min(2).max(6).default(4).describe('Grid size for fragmentation (e.g., 4 = 4x4 = 16 fragments)'),
  edgeScatter: z.number().min(100).max(400).default(200).describe('Scatter distance for edge fragments in pixels'),
  centerScatter: z.number().min(20).max(150).default(50).describe('Scatter distance for center fragments in pixels'),
  perspective: z.number().min(500).max(2000).default(1200).describe('3D perspective value in pixels'),
  incomingFadeStart: z.number().min(0).max(1).default(0.3).describe('When incoming image starts fading in (0-1, relative to transition duration)'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingImage,
    incomingImage,
    duration,
    gridSize,
    edgeScatter,
    centerScatter,
    perspective,
    incomingFadeStart,
  } = params;

  // Helper: Calculate fragment position
  const getFragmentPosition = (row: number, col: number) => {
    const fragmentWidth = 100 / gridSize;
    const fragmentHeight = 100 / gridSize;
    return {
      left: `${col * fragmentWidth}%`,
      top: `${row * fragmentHeight}%`,
      width: `${fragmentWidth}%`,
      height: `${fragmentHeight}%`,
    };
  };

  // Helper: Calculate background position for fragment
  const getBackgroundPosition = (row: number, col: number) => {
    const bgX = (col * 100) / (gridSize - 1);
    const bgY = (row * 100) / (gridSize - 1);
    return `${bgX}% ${bgY}%`;
  };

  // Helper: Determine if fragment is edge, mid-ring, or center
  const getFragmentType = (row: number, col: number) => {
    const isEdgeRow = row === 0 || row === gridSize - 1;
    const isEdgeCol = col === 0 || col === gridSize - 1;
    const isCorner = isEdgeRow && isEdgeCol;
    const isEdge = isEdgeRow || isEdgeCol;
    const isMidRing =
      !isEdge &&
      (row === 1 || row === gridSize - 2 || col === 1 || col === gridSize - 2);
    const isCenter = !isEdge && !isMidRing;
    return { isCorner, isEdge, isMidRing, isCenter };
  };

  // Helper: Calculate scatter direction and delay
  const getFragmentAnimation = (row: number, col: number) => {
    const { isCorner, isEdge, isMidRing, isCenter } = getFragmentType(row, col);
    
    // Delay: edges 0s, mid-ring 0.05s, center 0.1s
    let delay = 0;
    if (isMidRing) delay = 0.05;
    if (isCenter) delay = 0.1;

    // Scatter distance
    let scatterDist = edgeScatter;
    if (isMidRing) scatterDist = (edgeScatter + centerScatter) / 2;
    if (isCenter) scatterDist = centerScatter;

    // Scatter direction based on position
    const centerRow = (gridSize - 1) / 2;
    const centerCol = (gridSize - 1) / 2;
    const dx = col - centerCol;
    const dy = row - centerRow;
    const angle = Math.atan2(dy, dx);
    const translateX = Math.cos(angle) * scatterDist;
    const translateY = Math.sin(angle) * scatterDist;

    // Rotation variations for tumbling
    const rotateX = isCorner ? -45 + Math.random() * 20 : -30 + Math.random() * 60;
    const rotateZ = isCorner ? -30 + Math.random() * 60 : -20 + Math.random() * 40;

    return {
      delay,
      translateX: Math.round(translateX),
      translateY: Math.round(translateY),
      translateZ: -100 - Math.random() * 50,
      rotateX,
      rotateZ,
    };
  };

  // Generate fragments
  const fragments: RenderableComponentData[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const fragmentId = `fragment-${row}-${col}`;
      const position = getFragmentPosition(row, col);
      const bgPosition = getBackgroundPosition(row, col);
      const animation = getFragmentAnimation(row, col);
      const effectDuration = duration - animation.delay;

      fragments.push({
        id: fragmentId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background-image: url('${outgoingImage}'); background-size: ${gridSize * 100}% ${gridSize * 100}%; background-position: ${bgPosition};"></div>`,
          className: 'absolute',
          style: {
            left: position.left,
            top: position.top,
            width: position.width,
            height: position.height,
            overflow: 'hidden',
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [
          {
            id: `${fragmentId}-rotation`,
            componentId: 'generic',
            data: {
              mode: 'provider',
              targetIds: [fragmentId],
              type: 'ease-out',
              start: animation.delay,
              duration: effectDuration,
              ranges: [
                // Base flip rotation
                { key: 'rotateY', val: 0, prog: 0 },
                { key: 'rotateY', val: 180, prog: 1 },
                // Individual tumbling
                { key: 'rotateX', val: 0, prog: 0 },
                { key: 'rotateX', val: animation.rotateX, prog: 1 },
                { key: 'rotateZ', val: 0, prog: 0 },
                { key: 'rotateZ', val: animation.rotateZ, prog: 1 },
                // Scatter translation
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: animation.translateX, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: animation.translateY, prog: 1 },
                { key: 'translateZ', val: 0, prog: 0 },
                { key: 'translateZ', val: animation.translateZ, prog: 1 },
                // Scale down
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0.5, prog: 1 },
                // Fade out
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  }

  // Incoming image (fades in behind fragments)
  const incomingImageNode: RenderableComponentData = {
    id: 'incoming-image',
    type: 'atom' as const,
    componentId: 'ImageAtom',
    data: {
      src: incomingImage,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'incoming-fade-in',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['incoming-image'],
          type: 'ease-out',
          start: duration * incomingFadeStart,
          duration: duration * (1 - incomingFadeStart),
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Fragment container
  const fragmentContainer: RenderableComponentData = {
    id: 'fragment-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: fragments,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'shattered-glass-transition',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: `${perspective}px`,
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [incomingImageNode, fragmentContainer],
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
  id: 'shattered-glass-card-flip',
  title: 'Shattered Glass Card Flip Transition',
  description:
    'A dramatic card flip transition where the outgoing image shatters into fragments that scatter and tumble away while the incoming image fades in behind. Features staggered timing (edge pieces fly first, center pieces last), realistic 3D rotation, and customizable fragment grid.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'shatter', 'glass', 'flip', '3d', 'dramatic'],
  defaultInputParams: {
    outgoingImage: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809',
    incomingImage: 'https://images.unsplash.com/photo-1557683316-973673baf926',
    duration: 1.5,
    gridSize: 4,
    edgeScatter: 200,
    centerScatter: 50,
    perspective: 1200,
    incomingFadeStart: 0.3,
  },
  dependencies: {},
};

// --- Export Preset ---
export const shatteredGlassCardFlipPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};