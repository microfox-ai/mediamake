/**
 * Spiral Notebook Page Flip Transition
 *
 * Creates a realistic spiral-bound notebook page flip transition where videos appear as pages
 * in a spiral notebook. The outgoing video rotates around the spiral binding axis (left edge)
 * while showing spiral wire holes, and the incoming video flips in from behind.
 *
 * Features:
 * - **Realistic 3D Rotation**: Pages rotate around the left edge binding axis with perspective
 * - **Spiral Binding Graphics**: Metal spiral wire with circular rings along the left edge
 * - **Hole Punch Marks**: Realistic punch holes with shadows on each page
 * - **Lined Paper Overlay**: Subtle horizontal lines for notebook paper effect
 * - **Smooth Transitions**: 1.4s overlap with coordinated rotation and depth
 * - **3D Perspective**: Proper perspective transform for realistic page turning
 *
 * Use cases:
 * - Educational content with notebook aesthetic
 * - Journal or diary style video transitions
 * - School or study-themed presentations
 * - Memory book or scrapbook effects
 * - Creative storytelling with physical media feel
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS
// ============================================================================

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  outgoingStartFrom: z
    .number()
    .optional()
    .describe('Start time for outgoing video (seconds)'),
  outgoingEndAt: z
    .number()
    .optional()
    .describe('End time for outgoing video (seconds)'),
  incomingStartFrom: z
    .number()
    .optional()
    .describe('Start time for incoming video (seconds)'),
  incomingEndAt: z
    .number()
    .optional()
    .describe('End time for incoming video (seconds)'),
  transitionDuration: z
    .number()
    .default(2.0)
    .describe('Total transition duration in seconds'),
  overlapDuration: z
    .number()
    .default(1.4)
    .describe('Duration of overlap between videos in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingStartFrom,
    outgoingEndAt,
    incomingStartFrom,
    incomingEndAt,
    transitionDuration,
    overlapDuration,
  } = params;

  // Calculate timing for the outgoing video container
  const outgoingDuration = transitionDuration - 0.7; // Exits early to allow flip
  const incomingStart = transitionDuration - overlapDuration;

  // Helper: Create spiral wire ring
  const createSpiralWire = (id: string, topPercent: string) => ({
    id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style='width: 32px; height: 32px; border-radius: 50%; border: 3px solid #95a5a6; background: linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%); box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), 0 2px 4px rgba(255,255,255,0.3);'></div>`,
      className: 'absolute left-2',
      style: {
        top: topPercent,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'spiral-binding-container',
      },
    },
  });

  // Helper: Create hole punch mark
  const createHolePunch = (id: string, topPercent: string) => ({
    id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style='width: 20px; height: 20px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #555, #000); box-shadow: inset 0 2px 4px rgba(0,0,0,0.8), 0 1px 2px rgba(255,255,255,0.2);'></div>`,
      className: 'absolute left-1',
      style: {
        top: topPercent,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10, // Match parent container
      },
    },
  });

  // Helper: Create lined paper overlay
  const createLinedOverlay = (id: string, parentId: string) => ({
    id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style='width: 100%; height: 100%; background: repeating-linear-gradient(to bottom, transparent 0px, transparent 27px, rgba(100, 149, 237, 0.15) 27px, rgba(100, 149, 237, 0.15) 28px); pointer-events: none;'></div>`,
      className: 'absolute inset-0 z-5',
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: parentId,
      },
    },
  });

  // Spiral wire positions (8 rings along the binding)
  const spiralWirePositions = [
    '8%',
    '20%',
    '32%',
    '44%',
    '56%',
    '68%',
    '80%',
    '92%',
  ];

  // ============================================================================
  // SPIRAL BINDING CONTAINER
  // ============================================================================

  const spiralBindingContainer: RenderableComponentData = {
    id: 'spiral-binding-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute left-0 w-12 h-full z-40',
        style: {
          background:
            'linear-gradient(to right, #2c3e50 0%, #34495e 50%, #2c3e50 100%)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.3)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: spiralWirePositions.map((pos, index) =>
      createSpiralWire(`spiral-wire-${index + 1}`, pos),
    ) as RenderableComponentData[],
  };

  // ============================================================================
  // OUTGOING VIDEO CONTAINER
  // ============================================================================

  const outgoingHolePunches = spiralWirePositions.map((pos, index) =>
    createHolePunch(`outgoing-hole-${index + 1}`, pos),
  );

  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'left center',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    childrenData: [
      // Video
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          startFrom: outgoingStartFrom,
          endAt: outgoingEndAt,
          playbackRate: 1,
          volume: 1,
          muted: false,
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'outgoing-video-container',
          },
        },
      },
      // Hole punches container
      {
        id: 'outgoing-hole-punches',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'absolute left-12 top-0 w-8 h-full pointer-events-none z-10',
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'outgoing-video-container',
          },
        },
        childrenData: outgoingHolePunches as RenderableComponentData[],
      },
      // Lined overlay
      createLinedOverlay('outgoing-lined-overlay', 'outgoing-video-container'),
    ] as RenderableComponentData[],
    effects: [
      // Flip out effect
      {
        id: 'outgoing-flip-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -170, prog: 1 },
            { key: 'translateZ', val: 0, prog: 0 },
            { key: 'translateZ', val: -50, prog: 0.5 },
            { key: 'translateZ', val: -100, prog: 1 },
          ],
        },
      },
      // Shadow effect
      {
        id: 'outgoing-shadow-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: outgoingDuration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'box-shadow', val: '0 0 0 rgba(0,0,0,0)', prog: 0 },
            {
              key: 'box-shadow',
              val: '-10px 0 20px rgba(0,0,0,0.5)',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // INCOMING VIDEO CONTAINER
  // ============================================================================

  const incomingHolePunches = spiralWirePositions.map((pos, index) =>
    createHolePunch(`incoming-hole-${index + 1}`, pos),
  );

  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'left center',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: overlapDuration,
      },
    },
    childrenData: [
      // Video
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          className: 'absolute inset-0 w-full h-full object-cover',
          fit: 'cover',
          startFrom: incomingStartFrom,
          endAt: incomingEndAt,
          playbackRate: 1,
          volume: 1,
          muted: false,
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'incoming-video-container',
          },
        },
      },
      // Hole punches container
      {
        id: 'incoming-hole-punches',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className:
              'absolute left-12 top-0 w-8 h-full pointer-events-none z-10',
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'incoming-video-container',
          },
        },
        childrenData: incomingHolePunches as RenderableComponentData[],
      },
      // Lined overlay
      createLinedOverlay('incoming-lined-overlay', 'incoming-video-container'),
    ] as RenderableComponentData[],
    effects: [
      // Flip in effect
      {
        id: 'incoming-flip-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'rotateY', val: 170, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            { key: 'translateZ', val: -100, prog: 0 },
            { key: 'translateZ', val: -50, prog: 0.5 },
            { key: 'translateZ', val: 0, prog: 1 },
          ],
        },
      },
      // Shadow effect
      {
        id: 'incoming-shadow-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            {
              key: 'box-shadow',
              val: '-10px 0 20px rgba(0,0,0,0.5)',
              prog: 0,
            },
            { key: 'box-shadow', val: '0 0 0 rgba(0,0,0,0)', prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'spiral-notebook-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1200px',
          perspectiveOrigin: 'center center',
          backgroundColor: '#f5f5f0',
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
      outgoingVideoContainer,
      incomingVideoContainer,
      spiralBindingContainer,
    ] as RenderableComponentData[],
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'spiral-notebook-page-flip',
  title: 'Spiral Notebook Page Flip Transition',
  description:
    'A 3D page flip transition that simulates a spiral-bound notebook. Videos appear as pages that rotate around a left-edge spiral binding axis with realistic hole punch marks and lined paper overlay effects. The outgoing video flips away while the incoming video flips in from behind.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    '3d',
    'notebook',
    'spiral',
    'page-flip',
    'educational',
    'creative',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 2.0,
    overlapDuration: 1.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const spiralNotebookPageFlipPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
