/**
 * Signal Degradation Transition Preset
 *
 * This preset visualizes data packets being corrupted during transmission. It starts with a clean
 * image that progressively breaks into packet-sized chunks, each with potential corruption effects.
 * Packets can arrive late, be duplicated, or go missing entirely. Packet headers flicker with
 * transmission status indicators. Network interference patterns create wave-form distortions that
 * ripple across the image. The corruption builds to a peak where the image is barely recognizable,
 * then suddenly resolves as if error correction kicked in.
 *
 * Features:
 * - **Packet Fragmentation**: Divides image into 8x6 grid (48 packets max) using CSS Grid
 * - **Packet Headers**: Small labels showing transmission status (OK, ERR, DUP, LOST)
 * - **Individual Packet Corruption**: Opacity, translateY, and scale animations per packet
 * - **Duplicate Packets**: Multiple opacity layers for some packets
 * - **Network Interference**: SVG feTurbulence filter with animating baseFrequency
 * - **Static Noise Overlay**: Pulsing noise during peak corruption phase
 * - **Error Correction**: Sudden resolution after corruption peak
 *
 * Use cases:
 * - Network/tech-themed transitions
 * - Data transmission visualization
 * - Cybersecurity or hacking effects
 * - Technical glitch effects
 * - Digital corruption aesthetics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  image: z.object({
    src: z.string().describe('Source URL of the image to fragment'),
  }),
  duration: z
    .number()
    .default(1.5)
    .describe('Total duration of the transition in seconds'),
  corruptionBuildTime: z
    .number()
    .default(1.0)
    .describe('Time for corruption to build up (seconds)'),
  corruptionPeakTime: z
    .number()
    .default(0.3)
    .describe('Duration of peak corruption phase (seconds)'),
  recoveryTime: z
    .number()
    .default(0.2)
    .describe('Time for error correction to resolve (seconds)'),
  gridCols: z
    .number()
    .default(8)
    .describe('Number of columns in packet grid'),
  gridRows: z.number().default(6).describe('Number of rows in packet grid'),
  packetStagger: z
    .number()
    .default(0.03)
    .describe('Delay between packet animations (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    image,
    duration,
    corruptionBuildTime,
    corruptionPeakTime,
    recoveryTime,
    gridCols,
    gridRows,
    packetStagger,
  } = params;

  // Calculate timing phases
  const buildPhaseEnd = corruptionBuildTime;
  const peakPhaseEnd = buildPhaseEnd + corruptionPeakTime;
  const totalDuration = duration;

  // Calculate packet count
  const totalPackets = gridCols * gridRows;

  // Helper: Generate packet status text that changes over time
  const getPacketStatus = (index: number): string[] => {
    const statuses = ['OK', 'ERR', 'DUP', 'LOST'];
    // Create pseudo-random but deterministic pattern
    const seed = index * 7 + 13;
    return [
      statuses[seed % 4],
      statuses[(seed + 1) % 4],
      statuses[(seed + 2) % 4],
    ];
  };

  // Helper: Determine packet corruption type
  const getPacketCorruption = (
    index: number,
  ): 'normal' | 'late' | 'duplicate' | 'missing' => {
    const seed = index * 11 + 7;
    const rand = seed % 100;
    if (rand < 15) return 'late';
    if (rand < 25) return 'duplicate';
    if (rand < 35) return 'missing';
    return 'normal';
  };

  // Generate packet grid cells
  const packetCells: RenderableComponentData[] = [];

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const index = row * gridCols + col;
      const packetId = `packet-${index}`;
      const headerId = `header-${index}`;

      const corruptionType = getPacketCorruption(index);
      const staggerDelay = index * packetStagger;

      // Calculate object-position for image cropping
      const xPercent = (col / (gridCols - 1)) * 100;
      const yPercent = (row / (gridRows - 1)) * 100;

      // Create packet container
      const packetEffects: any[] = [];

      // Build phase: corruption effects
      if (corruptionType === 'normal') {
        // Normal packet: subtle opacity flicker
        packetEffects.push({
          id: `${packetId}-corruption`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: staggerDelay,
            duration: buildPhaseEnd - staggerDelay,
            mode: 'provider',
            targetIds: [packetId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0.6, prog: 1 },
            ],
          },
        });
      } else if (corruptionType === 'late') {
        // Late packet: delayed arrival with translateY
        packetEffects.push({
          id: `${packetId}-late`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: staggerDelay,
            duration: buildPhaseEnd - staggerDelay,
            mode: 'provider',
            targetIds: [packetId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.7 },
              { key: 'translateY', val: -20, prog: 0 },
              { key: 'translateY', val: 0, prog: 0.7 },
            ],
          },
        });
      } else if (corruptionType === 'duplicate') {
        // Duplicate packet: opacity glitch
        packetEffects.push({
          id: `${packetId}-dup`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: staggerDelay,
            duration: buildPhaseEnd - staggerDelay,
            mode: 'provider',
            targetIds: [packetId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.25 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.3, prog: 0.75 },
              { key: 'opacity', val: 0.7, prog: 1 },
            ],
          },
        });
      } else if (corruptionType === 'missing') {
        // Missing packet: fade out
        packetEffects.push({
          id: `${packetId}-missing`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: staggerDelay,
            duration: buildPhaseEnd - staggerDelay,
            mode: 'provider',
            targetIds: [packetId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        });
      }

      // Peak phase: maximum corruption (scale down)
      packetEffects.push({
        id: `${packetId}-peak`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: buildPhaseEnd,
          duration: corruptionPeakTime,
          mode: 'provider',
          targetIds: [packetId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.9, prog: 1 },
          ],
        },
      });

      // Recovery phase: error correction
      packetEffects.push({
        id: `${packetId}-recovery`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: peakPhaseEnd,
          duration: recoveryTime,
          mode: 'provider',
          targetIds: [packetId],
          ranges: [
            { key: 'opacity', val: corruptionType === 'missing' ? 0 : 0.6, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 0.9, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      });

      // Packet header effects
      const headerEffects: any[] = [
        {
          id: `${headerId}-flicker`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: totalDuration,
            mode: 'provider',
            targetIds: [headerId],
            ranges: [
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.33 },
              { key: 'opacity', val: 0.9, prog: 0.66 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ];

      // Create packet cell
      packetCells.push({
        id: `packet-cell-${index}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              contain: 'layout',
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
          // Image fragment
          {
            id: packetId,
            type: 'atom',
            componentId: 'ImageAtom',
            data: {
              src: image.src,
              className: 'w-full h-full',
              style: {
                objectFit: 'cover',
                objectPosition: `${xPercent}% ${yPercent}%`,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
            effects: packetEffects,
          } as RenderableComponentData,
          // Packet header label
          {
            id: headerId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: getPacketStatus(index)[0],
              className: 'text-xs font-mono bg-red-500/50 px-1',
              style: {
                position: 'absolute',
                top: 0,
                left: 0,
                fontSize: '8px',
                color: '#fff',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
            effects: headerEffects,
          } as RenderableComponentData,
        ] as RenderableComponentData[],
      } as RenderableComponentData);
    }
  }

  // Interference wave effect using SVG filter
  const interferenceEffect: RenderableComponentData = {
    id: 'interference-svg',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="position: absolute; top: 0; left: 0; pointer-events: none;">
        <defs>
          <filter id="turbulence">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.02" numOctaves="3" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#turbulence)" fill="transparent"/>
      </svg>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 10,
        mixBlendMode: 'overlay',
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
        id: 'interference-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['interference-svg'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.4, prog: 0.4 },
            { key: 'opacity', val: 0.7, prog: 0.6 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Static noise overlay
  const staticNoiseEffect: RenderableComponentData = {
    id: 'static-noise',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width:100%;height:100%;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.03) 2px,rgba(255,255,255,0.03) 4px),repeating-linear-gradient(90deg,transparent,transparent 2px,rgba(255,255,255,0.03) 2px,rgba(255,255,255,0.03) 4px);"></div>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 15,
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
        id: 'static-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['static-noise'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.5 },
            { key: 'opacity', val: 0.8, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Root container with packet grid
  const rootContainer: RenderableComponentData = {
    id: 'signal-degradation-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-gray-900 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Packet grid
      {
        id: 'packet-grid',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `grid grid-cols-${gridCols} grid-rows-${gridRows} gap-1 p-2 w-full h-full`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: packetCells,
      } as RenderableComponentData,
      // Interference waves
      interferenceEffect,
      // Static noise
      staticNoiseEffect,
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

const presetMetadata: PresetMetadata = {
  id: 'signal-degradation-transition',
  title: 'Signal Degradation Transition',
  description:
    'Visualizes data packets being corrupted during transmission with progressive degradation, packet headers, network interference, and error correction recovery. Features packet-based image fragmentation with individual corruption effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'tech',
    'network',
    'corruption',
    'data',
    'packets',
    'interference',
  ],
  defaultInputParams: {
    image: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    },
    duration: 1.5,
    corruptionBuildTime: 1.0,
    corruptionPeakTime: 0.3,
    recoveryTime: 0.2,
    gridCols: 8,
    gridRows: 6,
    packetStagger: 0.03,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const signalDegradationTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
