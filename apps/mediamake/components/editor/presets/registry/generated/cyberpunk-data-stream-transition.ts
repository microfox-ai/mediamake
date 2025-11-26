/**
 * Cyberpunk Data Stream Transition Preset
 *
 * A sci-fi inspired transition effect where the outgoing scene decomposes into horizontal strips
 * that transform into flowing binary/hex data streams. Features depth-layered streams with varying
 * opacity and blur, glitch corruption effects with red error messages, a cyberpunk HUD overlay
 * with progress bars and status updates, and a reconstruction phase where data streams reassemble
 * into the new scene.
 *
 * Perfect for tech content, gaming videos, and futuristic aesthetics.
 *
 * Features:
 * - **Strip Decomposition**: Slices scene into 12 horizontal strips that fade out progressively
 * - **Data Stream Conversion**: Each strip transforms into scrolling hex/binary text at varying speeds
 * - **Depth Layering**: Foreground streams are sharp and bright, background streams are dimmer and blurred
 * - **Glitch Effects**: Random streams show error messages with red warnings
 * - **HUD Overlay**: Cyberpunk heads-up display with progress bars, loading spinners, and status messages
 * - **Reconstruction Phase**: Data streams fade out as new scene strips fade in with staggered timing
 *
 * Technical Details:
 * - Uses CSS animations for performant text scrolling
 * - Minimal DOM updates for smooth playback
 * - Three-phase timing: decomposition (0-40%), streaming (40-70%), reconstruction (70-100%)
 * - All timings are relative to transition duration
 */

import { BaseEffect } from '@microfox/datamotion';
import { RenderableComponentData } from '@microfox/datamotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  duration: z
    .number()
    .default(3)
    .describe('Total transition duration in seconds (recommended 2-3 seconds)'),
  stripCount: z
    .number()
    .default(12)
    .describe('Number of horizontal strips to decompose scene into (10-15 recommended)'),
  streamSpeed: z
    .object({
      min: z.number().default(2).describe('Minimum animation duration for streams in seconds'),
      max: z.number().default(5).describe('Maximum animation duration for streams in seconds'),
    })
    .describe('Speed range for data stream scrolling animations'),
  glitchIntensity: z
    .number()
    .default(0.3)
    .describe('Probability of glitch/error streams appearing (0-1)'),
  hudEnabled: z
    .boolean()
    .default(true)
    .describe('Whether to show the HUD overlay with progress bars and status messages'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { duration, stripCount, streamSpeed, glitchIntensity, hudEnabled } = params;

  // Helper function to generate random data stream text
  const generateStreamText = (isGlitch: boolean): string => {
    if (isGlitch) {
      const glitchMessages = [
        '⚠ ERR_CORRUPT ⚠ CHECKSUM_FAIL ⚠ RETRY_0x00 ⚠ ',
        '!!! PACKET_LOSS !!! TIMEOUT !!! RETRY_0x03 !!! ',
        '⚠ DATA_CORRUPT ⚠ BUFFER_OVERFLOW ⚠ ABORT ⚠ ',
        '!!! SYNC_FAIL !!! CRC_ERROR !!! RESET_0xFF !!! ',
      ];
      return glitchMessages[Math.floor(Math.random() * glitchMessages.length)].repeat(10);
    }

    const hex = ['0x7F3A', '0xFF2B', '0xAC91', '0xDEAD', '0xBEEF', '0xCAFE', '0xF00D', '0xBABE'];
    const binary = ['1011', '01001101', '11001010', '10110011', '11110000', '00110011'];
    const keywords = ['DATA_PKT', 'TRANSFER', 'PACKET_OK', 'SYNC_FRAME', 'BUFFER_OK', 'LOAD_SEQ', 'STREAM_ID', 'VALID', 'RECV_ACK', 'DONE', 'END_BLOCK', 'FINAL_PKT', 'COMMIT'];

    let text = '';
    for (let i = 0; i < 30; i++) {
      const choice = Math.random();
      if (choice < 0.4) {
        text += hex[Math.floor(Math.random() * hex.length)] + ' ';
      } else if (choice < 0.7) {
        text += binary[Math.floor(Math.random() * binary.length)] + ' ';
      } else {
        text += keywords[Math.floor(Math.random() * keywords.length)] + ' ';
      }
    }
    return text + '... ';
  };

  // Helper function to calculate stream depth properties
  const getStreamDepth = (index: number, total: number): { opacity: number; blur: string; className: string } => {
    // Create depth layers: front (bright, sharp), mid (medium), back (dim, blurred)
    const normalizedPosition = index / total;
    
    if (normalizedPosition < 0.3) {
      // Front layer
      return {
        opacity: 1.0,
        blur: '0px',
        className: 'text-cyan-400',
      };
    } else if (normalizedPosition < 0.6) {
      // Mid layer
      return {
        opacity: 0.8 - (normalizedPosition - 0.3) * 0.3,
        blur: '0.5px',
        className: Math.random() > 0.5 ? 'text-cyan-300' : 'text-green-300',
      };
    } else {
      // Back layer
      return {
        opacity: 0.5 - (normalizedPosition - 0.6) * 0.3,
        blur: normalizedPosition > 0.8 ? '2px' : '1.5px',
        className: Math.random() > 0.5 ? 'text-cyan-400' : 'text-green-400',
      };
    }
  };

  // ============================================================================
  // BUILD STRIP COMPONENTS
  // ============================================================================

  const outgoingStrips: RenderableComponentData[] = [];
  const incomingStrips: RenderableComponentData[] = [];
  const dataStreams: RenderableComponentData[] = [];

  const stripHeight = 100 / stripCount;

  for (let i = 0; i < stripCount; i++) {
    const stripTop = i * stripHeight;
    const stripId = `strip-${i}`;
    const isGlitch = Math.random() < glitchIntensity;
    const depth = getStreamDepth(i, stripCount);
    const animDuration = streamSpeed.min + Math.random() * (streamSpeed.max - streamSpeed.min);

    // Outgoing scene strip (fades out in phase 1)
    const outgoingStripEffects: BaseEffect[] = [
      {
        id: `outgoing-fade-${stripId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration * 0.4,
          mode: 'provider',
          targetIds: [`outgoing-${stripId}`],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ];

    outgoingStrips.push({
      id: `outgoing-${stripId}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute left-0 right-0 overflow-hidden',
          style: {
            top: `${stripTop}%`,
            height: `${stripHeight}%`,
          },
        },
      },
      effects: outgoingStripEffects,
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [],
    } as RenderableComponentData);

    // Data stream (appears in phase 1, scrolls in phase 2, fades in phase 3)
    const streamEffects: BaseEffect[] = [
      // Fade in
      {
        id: `stream-fade-in-${stripId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: duration * 0.2,
          mode: 'provider',
          targetIds: [`stream-${stripId}`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: depth.opacity, prog: 1 },
          ],
        },
      },
      // Scroll animation
      {
        id: `stream-scroll-${stripId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.1,
          duration: animDuration,
          mode: 'provider',
          targetIds: [`stream-${stripId}`],
          ranges: [
            { key: 'translateX', val: 100, prog: 0 },
            { key: 'translateX', val: -100, prog: 1 },
          ],
        },
      },
      // Fade out
      {
        id: `stream-fade-out-${stripId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: duration * 0.7,
          duration: duration * 0.3,
          mode: 'provider',
          targetIds: [`stream-${stripId}`],
          ranges: [
            { key: 'opacity', val: depth.opacity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ];

    // Add glitch pulse effect if glitch stream
    if (isGlitch) {
      streamEffects.push({
        id: `stream-glitch-pulse-${stripId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: duration * 0.4,
          duration: duration * 0.3,
          mode: 'provider',
          targetIds: [`stream-${stripId}`],
          ranges: [
            { key: 'opacity', val: depth.opacity, prog: 0 },
            { key: 'opacity', val: 1.0, prog: 0.25 },
            { key: 'opacity', val: depth.opacity, prog: 0.5 },
            { key: 'opacity', val: 1.0, prog: 0.75 },
            { key: 'opacity', val: depth.opacity, prog: 1 },
          ],
        },
      });
    }

    dataStreams.push({
      id: `stream-${stripId}`,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: generateStreamText(isGlitch),
        style: {
          fontSize: '12px',
          color: isGlitch ? '#ef4444' : undefined,
          fontWeight: isGlitch ? 'bold' : 'normal',
          filter: depth.blur !== '0px' ? `blur(${depth.blur})` : undefined,
          whiteSpace: 'nowrap',
        },
        font: {
          family: 'Courier New',
        },
        containerProps: {
          className: `absolute left-0 font-mono text-xs whitespace-nowrap ${isGlitch ? 'text-red-500 font-bold' : depth.className}`,
          style: {
            top: `${stripTop + stripHeight / 2}%`,
            transform: 'translateY(-50%)',
          },
        },
      },
      effects: streamEffects,
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData);

    // Incoming scene strip (fades in in phase 3)
    const incomingStripEffects: BaseEffect[] = [
      {
        id: `incoming-fade-${stripId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: duration * 0.7 + (i * 0.05), // Staggered fade-in
          duration: duration * 0.25,
          mode: 'provider',
          targetIds: [`incoming-${stripId}`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ];

    incomingStrips.push({
      id: `incoming-${stripId}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute left-0 right-0 overflow-hidden',
          style: {
            top: `${stripTop}%`,
            height: `${stripHeight}%`,
          },
        },
      },
      effects: incomingStripEffects,
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [],
    } as RenderableComponentData);
  }

  // ============================================================================
  // BUILD HUD OVERLAY
  // ============================================================================

  const hudChildren: RenderableComponentData[] = [];

  if (hudEnabled) {
    // Top bar with system label and timestamp
    hudChildren.push(
      {
        id: 'hud-top-bar',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute top-4 left-4 right-4 flex justify-between items-center',
          },
        },
        context: {
          timing: { start: 0, duration: duration },
        },
        childrenData: [
          {
            id: 'hud-system-label',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: 'SYSTEM: DATA_TRANSFER v2.1',
              style: {
                fontSize: '12px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              },
              font: { family: 'Courier New' },
              containerProps: {
                className: 'font-mono text-xs text-cyan-400 uppercase tracking-widest',
              },
            },
            context: {
              timing: { start: 0, duration: duration },
            },
          } as RenderableComponentData,
          {
            id: 'hud-timestamp',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: '2087.11.21 // 14:32:07',
              style: {
                fontSize: '12px',
              },
              font: { family: 'Courier New' },
              containerProps: {
                className: 'font-mono text-xs text-green-400',
              },
            },
            context: {
              timing: { start: 0, duration: duration },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    );

    // Progress bar
    const progressBarEffects: BaseEffect[] = [
      {
        id: 'progress-bar-fill',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['hud-progress-fill'],
          ranges: [
            { key: 'width', val: 0, prog: 0 },
            { key: 'width', val: 100, prog: 1 },
          ],
        },
      },
    ];

    hudChildren.push(
      {
        id: 'hud-progress-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute bottom-16 left-8 right-8',
          },
        },
        context: {
          timing: { start: 0, duration: duration },
        },
        childrenData: [
          {
            id: 'hud-progress-label',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: 'TRANSFER PROGRESS:',
              style: { fontSize: '12px' },
              font: { family: 'Courier New' },
              containerProps: {
                className: 'font-mono text-xs text-cyan-300 mb-1',
              },
            },
            context: {
              timing: { start: 0, duration: duration },
            },
          } as RenderableComponentData,
          {
            id: 'hud-progress-track',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'w-full h-2 bg-gray-800 border border-cyan-500/50 rounded-sm overflow-hidden relative',
              },
            },
            context: {
              timing: { start: 0, duration: duration },
            },
            childrenData: [
              {
                id: 'hud-progress-fill',
                type: 'layout',
                componentId: 'BaseLayout',
                data: {
                  containerProps: {
                    className: 'absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-green-400',
                    style: {
                      width: '0%',
                    },
                  },
                },
                effects: progressBarEffects,
                context: {
                  timing: { start: 0, duration: duration },
                },
                childrenData: [],
              } as RenderableComponentData,
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    );

    // Loading spinner
    const spinnerEffects: BaseEffect[] = [
      {
        id: 'spinner-rotation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 1,
          mode: 'provider',
          targetIds: ['hud-loading-spinner'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 360, prog: 1 },
          ],
        },
      },
    ];

    hudChildren.push(
      {
        id: 'hud-loading-spinner',
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          type: 'circle',
          containerProps: {
            className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            style: {
              width: '40px',
              height: '40px',
              border: '2px solid transparent',
              borderTopColor: '#22d3ee',
              borderRadius: '50%',
            },
          },
        },
        effects: spinnerEffects,
        context: {
          timing: { start: 0, duration: duration },
        },
      } as RenderableComponentData,
    );

    // Status messages
    const statusMessages = [
      { id: 'status-msg-1', text: '> Initializing data stream...', delay: 0, color: 'text-green-400' },
      { id: 'status-msg-2', text: '> Decoding scene matrix...', delay: duration * 0.4, color: 'text-cyan-400' },
      { id: 'status-msg-3', text: '> Reconstruction complete.', delay: duration * 0.7, color: 'text-green-300' },
    ];

    const statusMessagesChildren = statusMessages.map((msg) => {
      const msgEffects: BaseEffect[] = [
        {
          id: `${msg.id}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: msg.delay,
            duration: 0.3,
            mode: 'provider',
            targetIds: [msg.id],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ];

      return {
        id: msg.id,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: msg.text,
          style: { fontSize: '12px' },
          font: { family: 'Courier New' },
          containerProps: {
            className: `font-mono text-xs ${msg.color}`,
          },
        },
        effects: msgEffects,
        context: {
          timing: { start: 0, duration: duration },
        },
      } as RenderableComponentData;
    });

    hudChildren.push(
      {
        id: 'hud-status-messages',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute bottom-4 left-8 flex flex-col gap-1',
          },
        },
        context: {
          timing: { start: 0, duration: duration },
        },
        childrenData: statusMessagesChildren,
      } as RenderableComponentData,
    );
  }

  // ============================================================================
  // BUILD ROOT CONTAINER
  // ============================================================================

  const rootContainer = {
    id: 'cyberpunk-data-stream-transition-root',
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
        duration: duration,
      },
    },
    childrenData: [
      // Outgoing scene strips container
      {
        id: 'outgoing-scene-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: { start: 0, duration: duration },
        },
        childrenData: outgoingStrips,
      } as RenderableComponentData,
      // Data streams layer
      {
        id: 'data-streams-layer',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: { start: 0, duration: duration },
        },
        childrenData: dataStreams,
      } as RenderableComponentData,
      // Incoming scene strips container
      {
        id: 'incoming-scene-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: { start: 0, duration: duration },
        },
        childrenData: incomingStrips,
      } as RenderableComponentData,
      // HUD overlay
      ...(hudEnabled
        ? [
            {
              id: 'hud-overlay',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'absolute inset-0 pointer-events-none z-50',
                },
              },
              context: {
                timing: { start: 0, duration: duration },
              },
              childrenData: hudChildren,
            } as RenderableComponentData,
          ]
        : []),
    ],
  } as RenderableComponentData;

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
  id: 'cyberpunk-data-stream-transition',
  title: 'Cyberpunk Data Stream Transition',
  description:
    'A sci-fi inspired transition effect where the outgoing scene decomposes into horizontal strips that transform into flowing binary/hex data streams. Features depth-layered streams with varying opacity and blur, glitch corruption effects with red error messages, a cyberpunk HUD overlay with progress bars and status updates, and a reconstruction phase where data streams reassemble into the new scene. Perfect for tech content, gaming videos, and futuristic aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'cyberpunk',
    'data-stream',
    'sci-fi',
    'glitch',
    'hud',
    'tech',
    'futuristic',
    'binary',
    'hex',
    'loading',
    'deconstruction',
  ],
  defaultInputParams: {
    duration: 3,
    stripCount: 12,
    streamSpeed: {
      min: 2,
      max: 5,
    },
    glitchIntensity: 0.3,
    hudEnabled: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const cyberpunkDataStreamTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
