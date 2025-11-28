/**
 * Paper Rip Diagonal Transition Preset
 *
 * Creates a realistic diagonal paper tear transition from top-left to bottom-right.
 * The outgoing video tears into two triangular pieces that drift apart with rotation
 * and fade out, while the incoming video is revealed through the growing gap.
 *
 * Features:
 * - Diagonal tear line from top-left to bottom-right
 * - Two torn pieces (top-left and bottom-right triangles) with complementary clip-paths
 * - Each piece drifts in opposite directions with slight rotation
 * - Paper fiber texture along torn edges
 * - Particle effects (paper fragments) floating away from tear line
 * - Incoming video revealed underneath
 * - 1.6 second transition with dynamic ease-out timing
 * - GPU-accelerated transforms for smooth performance
 *
 * Use cases:
 * - Dramatic scene changes with paper tear aesthetic
 * - Documentary transitions with tactile feel
 * - Storytelling moments emphasizing "tearing away" the past
 * - Creative transitions for paper-themed content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of incoming video'),
  paperEdgeTextureSrc: z
    .string()
    .optional()
    .describe('Source URL for paper torn edge texture (horizontal jagged edge strip)'),
  paperFragmentSrc: z
    .string()
    .optional()
    .describe('Source URL for paper fragment texture (small paper chip/fiber texture)'),
  transitionDuration: z
    .number()
    .default(1.6)
    .describe('Duration of the transition in seconds'),
  outgoingDuration: z
    .number()
    .describe('Duration of outgoing video in seconds'),
  incomingDuration: z
    .number()
    .describe('Duration of incoming video in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    paperEdgeTextureSrc,
    paperFragmentSrc,
    transitionDuration,
    outgoingDuration,
    incomingDuration,
  } = params;

  // Total duration: outgoing video plays, then transition overlaps, then incoming continues
  const totalDuration = outgoingDuration + incomingDuration - transitionDuration;

  // Transition start time (when outgoing starts fading/splitting)
  const transitionStartTime = outgoingDuration - transitionDuration;

  // Incoming video starts during transition
  const incomingStartTime = transitionStartTime;

  const childrenData: RenderableComponentData[] = [];

  // 1. Incoming video (bottom layer, revealed through gap)
  childrenData.push({
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        inset: '0',
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingDuration,
      },
    },
  } as RenderableComponentData);

  // 2. Outgoing top-left piece (triangle: top-left corner)
  childrenData.push({
    id: 'outgoing-top-left',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        inset: '0',
        zIndex: 10,
        clipPath: 'polygon(0 0, 100% 0, 0 100%)',
        transformOrigin: 'top left',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    effects: [
      {
        id: 'top-left-move',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: transitionStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-top-left'],
          ranges: [
            // Translate up-left
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '-10%', prog: 1 },
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '-10%', prog: 1 },
            // Rotate counter-clockwise
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: -3, prog: 1 },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 3. Outgoing bottom-right piece (triangle: bottom-right corner)
  childrenData.push({
    id: 'outgoing-bottom-right',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        inset: '0',
        zIndex: 10,
        clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
        transformOrigin: 'bottom right',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    effects: [
      {
        id: 'bottom-right-move',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: transitionStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-bottom-right'],
          ranges: [
            // Translate down-right
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '10%', prog: 1 },
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '10%', prog: 1 },
            // Rotate clockwise
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 3, prog: 1 },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);

  // 4. Paper edge texture (top edge along tear line)
  if (paperEdgeTextureSrc) {
    childrenData.push({
      id: 'paper-edge-top',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: paperEdgeTextureSrc,
        className: 'absolute',
        style: {
          position: 'absolute',
          width: '150%',
          height: '20px',
          top: '50%',
          left: '-25%',
          transform: 'rotate(-45deg) translateY(-50%)',
          transformOrigin: 'center',
          zIndex: 15,
          objectFit: 'cover',
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'edge-top-fade',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['paper-edge-top'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);

    // 5. Paper edge texture (bottom edge along tear line)
    childrenData.push({
      id: 'paper-edge-bottom',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: paperEdgeTextureSrc,
        className: 'absolute',
        style: {
          position: 'absolute',
          width: '150%',
          height: '20px',
          top: '50%',
          left: '-25%',
          transform: 'rotate(-45deg) translateY(-50%) scaleY(-1)',
          transformOrigin: 'center',
          zIndex: 15,
          objectFit: 'cover',
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'edge-bottom-fade',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['paper-edge-bottom'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // 6. Particle effects (paper fragments)
  if (paperFragmentSrc) {
    const particleCount = 6;
    const particlePositions = [
      { top: '45%', left: '48%', width: '12px', height: '8px' },
      { top: '52%', left: '50%', width: '10px', height: '6px' },
      { top: '48%', left: '52%', width: '8px', height: '5px' },
      { top: '50%', left: '46%', width: '14px', height: '9px' },
      { top: '54%', left: '48%', width: '6px', height: '4px' },
      { top: '47%', left: '54%', width: '11px', height: '7px' },
    ];

    const particleChildren: RenderableComponentData[] = [];

    for (let i = 0; i < particleCount; i++) {
      const pos = particlePositions[i];
      const particleId = `particle-${i + 1}`;

      // Stagger start times
      const particleStartOffset = 0.1 + i * 0.05;
      const particleDuration = transitionDuration - particleStartOffset;

      // Random drift direction
      const driftX = (Math.random() - 0.5) * 100;
      const driftY = (Math.random() - 0.5) * 100;
      const driftRotate = (Math.random() - 0.5) * 180;

      particleChildren.push({
        id: particleId,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: paperFragmentSrc,
          className: 'absolute',
          style: {
            position: 'absolute',
            width: pos.width,
            height: pos.height,
            top: pos.top,
            left: pos.left,
            zIndex: 20,
          },
        },
        context: {
          timing: {
            start: transitionStartTime + particleStartOffset,
            duration: particleDuration,
          },
        },
        effects: [
          {
            id: `particle-${i + 1}-drift`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: particleDuration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: driftX, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: driftY, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: driftRotate, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    // Particle container
    childrenData.push({
      id: 'particle-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 20,
          },
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      childrenData: particleChildren,
    } as RenderableComponentData);
  }

  const rootContainer: RenderableComponentData = {
    id: 'paper-rip-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible',
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
  id: 'paper-rip-diagonal-transition',
  title: 'Paper Rip Diagonal Transition',
  description:
    'A realistic paper tear transition where the outgoing video rips diagonally from top-left to bottom-right. The video splits into two triangular pieces along the diagonal tear line, with each piece drifting apart in opposite directions (top-left piece moves up-left with counter-clockwise rotation, bottom-right piece moves down-right with clockwise rotation) while fading out. The incoming video is revealed through the growing gap. Features paper fiber texture along the torn edges and subtle particle effects of paper fragments floating away. Uses custom ease-out timing for natural paper-tear physics over 1.6 seconds.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'paper', 'tear', 'rip', 'diagonal', 'effects'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    paperEdgeTextureSrc: 'https://example.com/paper-edge-texture.png',
    paperFragmentSrc: 'https://example.com/paper-fragment.png',
    transitionDuration: 1.6,
    outgoingDuration: 5,
    incomingDuration: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const paperRipDiagonalTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
