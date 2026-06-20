/**
 * Bit-Shift Corruption Transition Preset
 *
 * A 1.6-second digital transition that simulates binary data shifting and byte-level corruption.
 * Creates a glitchy, digital effect with horizontal bit-shifting patterns, RGB channel separation,
 * and test pattern overlays reminiscent of corrupted digital video.
 *
 * Features:
 * - **Horizontal Bit-Shifting**: Different rows shift by powers of 2 (1px, 2px, 4px, 8px, etc.)
 * - **Stepped Timing**: Digital, quantized movement using stepped easing functions
 * - **RGB Channel Separation**: Color channels split and shift independently
 * - **Test Pattern Overlay**: Corrupted color bars appear mid-transition
 * - **Binary Noise**: Random row inversions create glitch artifacts
 * - **Reconstruction**: Incoming video reassembles from shifted bits
 * - **Pixelated Rendering**: Alternating rows get pixelated styling for extra digital feel
 *
 * Use cases:
 * - Digital glitch transitions between video clips
 * - Simulating data corruption or signal loss
 * - Retro computer/VHS-style video effects
 * - Cyberpunk or tech-themed video transitions
 * - Creating dramatic scene changes with technical aesthetics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }).describe('Outgoing video/image to transition from'),

  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }).describe('Incoming video/image to transition to'),

  transitionDuration: z
    .number()
    .default(1.6)
    .describe('Total duration of the transition in seconds'),

  rowCount: z
    .number()
    .min(30)
    .max(60)
    .default(45)
    .describe('Number of horizontal rows to divide the video into (30-60)'),

  maxShiftDistance: z
    .number()
    .default(128)
    .describe('Maximum shift distance in pixels (powers of 2 up to this value)'),

  testPatternIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Opacity intensity of the test pattern overlay (0-1)'),

  rgbChannelShift: z
    .number()
    .default(4)
    .describe('Horizontal offset in pixels for RGB channel separation'),

  invertRowProbability: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Probability (0-1) that a row will receive a brief invert effect'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    rowCount,
    maxShiftDistance,
    testPatternIntensity,
    rgbChannelShift,
    invertRowProbability,
  } = params;

  const videoHeight = props.config?.height ?? 1080;
  const rowHeight = videoHeight / rowCount;

  // Helper: Calculate shift distance for a row (powers of 2)
  const getShiftDistance = (rowIndex: number): number => {
    const powerIndex = rowIndex % 8; // 0-7
    return Math.pow(2, powerIndex); // 1, 2, 4, 8, 16, 32, 64, 128
  };

  // Helper: Determine if row should invert
  const shouldInvertRow = (rowIndex: number): boolean => {
    // Use deterministic pseudo-random based on row index
    const pseudoRandom = (Math.sin(rowIndex * 12.9898) * 43758.5453) % 1;
    return Math.abs(pseudoRandom) < invertRowProbability;
  };

  // ============================================================================
  // OUTGOING VIDEO ROWS (with bit-shifting corruption)
  // ============================================================================

  const outgoingRows: RenderableComponentData[] = [];

  for (let i = 0; i < rowCount; i++) {
    const shiftPx = getShiftDistance(i);
    const shiftDirection = i % 2 === 0 ? -1 : 1; // Alternate left/right
    const finalShift = shiftPx * shiftDirection;
    const shouldInvert = shouldInvertRow(i);
    const shouldPixelate = i % 2 === 1; // Every other row

    const rowId = `outgoing-row-${i}`;

    outgoingRows.push({
      id: rowId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute overflow-hidden',
          style: {
            top: `${i * rowHeight}px`,
            left: 0,
            width: '100%',
            height: `${rowHeight}px`,
            ...(shouldPixelate ? { imageRendering: 'pixelated' } : {}),
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
          id: `${rowId}-video`,
          type: 'atom',
          componentId: outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom',
          data: {
            src: outgoingVideo.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              position: 'absolute',
              top: `${-i * rowHeight}px`,
              left: 0,
              width: '100%',
              height: `${videoHeight}px`,
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
      effects: [
        // Horizontal shift with stepped timing
        {
          id: `${rowId}-shift`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.6,
            mode: 'provider',
            targetIds: [rowId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: finalShift, prog: 1 },
            ],
          },
        },
        // Opacity fade out
        {
          id: `${rowId}-fade`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0.4,
            duration: 0.6,
            mode: 'provider',
            targetIds: [rowId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Conditional invert effect
        ...(shouldInvert
          ? [
              {
                id: `${rowId}-invert`,
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0.3,
                  duration: 0.2,
                  mode: 'provider',
                  targetIds: [rowId],
                  ranges: [
                    { key: 'filter', val: 'invert(0)', prog: 0 },
                    { key: 'filter', val: 'invert(1)', prog: 0.5 },
                    { key: 'filter', val: 'invert(0)', prog: 1 },
                  ],
                },
              },
            ]
          : []),
      ],
    } as RenderableComponentData);
  }

  // ============================================================================
  // TEST PATTERN OVERLAY (color bars)
  // ============================================================================

  const testPatternOverlay: RenderableComponentData = {
    id: 'test-pattern-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: linear-gradient(to right, #ff0000 0%, #ff0000 14.28%, #00ff00 14.28%, #00ff00 28.56%, #0000ff 28.56%, #0000ff 42.84%, #ffff00 42.84%, #ffff00 57.12%, #ff00ff 57.12%, #ff00ff 71.4%, #00ffff 71.4%, #00ffff 85.68%, #ffffff 85.68%, #ffffff 100%); pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
      },
    },
    context: {
      timing: {
        start: 0.5,
        duration: 0.6,
      },
    },
    effects: [
      {
        id: 'test-pattern-fade',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.6,
          mode: 'provider',
          targetIds: ['test-pattern-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: testPatternIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // ============================================================================
  // INCOMING VIDEO ROWS (reconstruct from shifted bits)
  // ============================================================================

  const incomingRows: RenderableComponentData[] = [];

  for (let i = 0; i < rowCount; i++) {
    const shiftPx = getShiftDistance(i);
    const shiftDirection = i % 2 === 0 ? 1 : -1; // Opposite of outgoing
    const initialShift = shiftPx * shiftDirection;
    const shouldPixelate = i % 2 === 1;

    const rowId = `incoming-row-${i}`;

    incomingRows.push({
      id: rowId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute overflow-hidden',
          style: {
            top: `${i * rowHeight}px`,
            left: 0,
            width: '100%',
            height: `${rowHeight}px`,
            ...(shouldPixelate ? { imageRendering: 'pixelated' } : {}),
          },
        },
      },
      context: {
        timing: {
          start: 1.0,
          duration: 0.6,
        },
      },
      childrenData: [
        {
          id: `${rowId}-video`,
          type: 'atom',
          componentId: incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom',
          data: {
            src: incomingVideo.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              position: 'absolute',
              top: `${-i * rowHeight}px`,
              left: 0,
              width: '100%',
              height: `${videoHeight}px`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: 0.6,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Shift from offset to aligned
        {
          id: `${rowId}-shift-in`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.6,
            mode: 'provider',
            targetIds: [rowId],
            ranges: [
              { key: 'translateX', val: initialShift, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
        // Opacity fade in
        {
          id: `${rowId}-fade-in`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.3,
            mode: 'provider',
            targetIds: [rowId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // ============================================================================
  // RGB CHANNEL SEPARATION (for both outgoing and incoming)
  // ============================================================================

  // Red channel (outgoing)
  const redChannelOutgoing: RenderableComponentData = {
    id: 'rgb-red-outgoing',
    type: 'atom',
    componentId: outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: outgoingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        mixBlendMode: 'screen',
        filter: 'brightness(1) contrast(1.5)',
      },
    },
    context: {
      timing: {
        start: 0.4,
        duration: 0.4,
      },
    },
    effects: [
      {
        id: 'red-channel-shift',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['rgb-red-outgoing'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -rgbChannelShift, prog: 1 },
            { key: 'filter', val: 'sepia(1) saturate(5) hue-rotate(310deg)', prog: 0 },
            { key: 'filter', val: 'sepia(1) saturate(5) hue-rotate(310deg)', prog: 1 },
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Green channel (incoming)
  const greenChannelIncoming: RenderableComponentData = {
    id: 'rgb-green-incoming',
    type: 'atom',
    componentId: incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: incomingVideo.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      style: {
        mixBlendMode: 'screen',
        filter: 'brightness(1) contrast(1.5)',
      },
    },
    context: {
      timing: {
        start: 1.0,
        duration: 0.4,
      },
    },
    effects: [
      {
        id: 'green-channel-shift',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.4,
          mode: 'provider',
          targetIds: ['rgb-green-incoming'],
          ranges: [
            { key: 'translateX', val: rgbChannelShift, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'filter', val: 'sepia(1) saturate(5) hue-rotate(90deg)', prog: 0 },
            { key: 'filter', val: 'sepia(1) saturate(5) hue-rotate(90deg)', prog: 1 },
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'bit-shift-corruption-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      ...outgoingRows,
      testPatternOverlay,
      redChannelOutgoing,
      ...incomingRows,
      greenChannelIncoming,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'bit-shift-corruption-transition',
  title: 'Bit-Shift Corruption Transition',
  description:
    'A 1.6-second digital transition simulating binary data shifting and byte-level corruption with horizontal bit-shifting patterns, RGB channel separation, and test pattern overlays',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'digital',
    'corruption',
    'bit-shift',
    'rgb',
    'test-pattern',
    'cyberpunk',
    'technical',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
    },
    transitionDuration: 1.6,
    rowCount: 45,
    maxShiftDistance: 128,
    testPatternIntensity: 0.8,
    rgbChannelShift: 4,
    invertRowProbability: 0.15,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const bitShiftCorruptionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
