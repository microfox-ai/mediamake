/**
 * Frosted Glass Reveal Transition
 * 
 * A sophisticated transition effect where the outgoing video gradually becomes frosted 
 * and opaque while the incoming video emerges through organic clearing patterns, 
 * simulating breath fogging and clearing on a window.
 * 
 * Features:
 * - Progressive blur transitions (0px → 15px for outgoing, 20px → 0px for incoming)
 * - White frost overlay with animated opacity (0 → 0.7 → 0)
 * - Organic reveal using SVG noise-based masks with radial gradients
 * - Condensation droplet effects positioned at mask edges
 * - Layered z-index structure for proper depth effect
 * - 2.5s overlap showing both videos through varying frost levels
 * 
 * Use cases:
 * - Video transitions with organic feel
 * - Weather/winter themed transitions
 * - Dreamy, ethereal video crossfades
 * - Documentary-style scene changes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL of the outgoing video (fades out with frost effect)'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL of the incoming video (reveals through clearing frost)'),
  overlapDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the transition overlap in seconds'),
  frostColor: z
    .string()
    .default('rgba(255, 255, 255, 0.7)')
    .describe('Color of the frost overlay (default: semi-transparent white)'),
  maxBlur: z
    .number()
    .default(15)
    .describe('Maximum blur amount in pixels for outgoing video'),
  incomingStartBlur: z
    .number()
    .default(20)
    .describe('Initial blur amount in pixels for incoming video'),
  numberOfClearZones: z
    .number()
    .default(3)
    .describe('Number of organic clearing zones for reveal effect'),
  dropletCount: z
    .number()
    .default(8)
    .describe('Number of condensation droplets to display'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    overlapDuration,
    frostColor,
    maxBlur,
    incomingStartBlur,
    numberOfClearZones,
    dropletCount,
  } = params;

  // Helper: Generate random position for clearing zones and droplets
  const generateRandomPosition = () => {
    return {
      x: Math.random() * 80 + 10, // 10-90% to avoid edges
      y: Math.random() * 80 + 10,
    };
  };

  // Helper: Generate random size for droplets
  const generateDropletSize = () => {
    return Math.random() * 4 + 4; // 4-8px
  };

  // Helper: Generate staggered timing for droplets
  const generateDropletTiming = (index: number, total: number) => {
    return (index / total) * (overlapDuration * 0.6); // Stagger over first 60% of transition
  };

  // Create SVG filter for organic noise-based edges
  const svgFilterId = 'frosted-glass-noise-filter';
  const svgFilterHTML = `
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <defs>
        <filter id="${svgFilterId}">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="1" />
          <feDisplacementMap in="SourceGraphic" scale="20" />
        </filter>
      </defs>
    </svg>
  `;

  // Generate clearing zones (radial gradients at random positions)
  const clearingZones = Array.from({ length: numberOfClearZones }, (_, i) => {
    const pos = generateRandomPosition();
    const delay = (i / numberOfClearZones) * (overlapDuration * 0.3);
    const duration = overlapDuration * 0.7;

    return {
      id: `clearing-zone-${i}`,
      position: pos,
      delay,
      duration,
    };
  });

  // Generate condensation droplets
  const droplets = Array.from({ length: dropletCount }, (_, i) => {
    const pos = generateRandomPosition();
    const size = generateDropletSize();
    const startTime = generateDropletTiming(i, dropletCount);
    const duration = overlapDuration - startTime;

    return {
      id: `droplet-${i}`,
      position: pos,
      size,
      startTime,
      duration,
    };
  });

  // Create children data
  const childrenData: RenderableComponentData[] = [
    // SVG Filter Definition
    {
      id: 'svg-filter-def',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: svgFilterHTML,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
          zIndex: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
    },

    // Incoming Video Layer (z-index: 5)
    {
      id: 'incoming-video-layer',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover' as const,
        muted: true,
        volume: 0,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 5,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        // Blur decrease: 20px → 0px
        {
          id: 'incoming-blur-decrease',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['incoming-video-layer'],
            ranges: [
              { key: 'filter', val: `blur(${incomingStartBlur}px)`, prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
        // Opacity increase: 0 → 1
        {
          id: 'incoming-opacity-increase',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: overlapDuration * 0.6,
            mode: 'provider',
            targetIds: ['incoming-video-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    },

    // Outgoing Video Layer (z-index: 10)
    {
      id: 'outgoing-video-layer',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'w-full h-full object-cover',
        fit: 'cover' as const,
        muted: true,
        volume: 0,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        // Blur increase: 0px → 15px
        {
          id: 'outgoing-blur-increase',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['outgoing-video-layer'],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: `blur(${maxBlur}px)`, prog: 1 },
            ],
          },
        },
        // Opacity decrease: 1 → 0.3
        {
          id: 'outgoing-opacity-decrease',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: overlapDuration * 0.4,
            duration: overlapDuration * 0.6,
            mode: 'provider',
            targetIds: ['outgoing-video-layer'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    },

    // Frost Overlay Layer (z-index: 20)
    {
      id: 'frost-overlay-layer',
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `
          <div style="
            width: 100%;
            height: 100%;
            background: radial-gradient(
              circle at 35% 45%,
              rgba(255, 255, 255, 0.9) 0%,
              rgba(255, 255, 255, 0.7) 30%,
              rgba(255, 255, 255, 0.5) 60%,
              rgba(255, 255, 255, 0.3) 100%
            );
            filter: url(#${svgFilterId});
            backdrop-filter: blur(2px);
          "></div>
        `,
        className: 'absolute inset-0',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 20,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        // Frost opacity: 0 → 0.7 → 0
        {
          id: 'frost-opacity-animation',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: ['frost-overlay-layer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.3 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },

    // Clearing Zones Container (organic reveal masks)
    {
      id: 'clearing-zones-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 15,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      childrenData: clearingZones.map((zone) => ({
        id: zone.id,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `
            <div style="
              width: 200px;
              height: 200px;
              border-radius: 50%;
              background: radial-gradient(
                circle,
                rgba(255, 255, 255, 0) 0%,
                rgba(255, 255, 255, 0.1) 50%,
                rgba(255, 255, 255, 0.3) 100%
              );
              filter: blur(30px);
            "></div>
          `,
          className: 'absolute',
          style: {
            left: `${zone.position.x}%`,
            top: `${zone.position.y}%`,
            transform: 'translate(-50%, -50%)',
          },
        },
        context: {
          timing: {
            start: zone.delay,
            duration: zone.duration,
          },
        },
        effects: [
          // Scale up clearing zone
          {
            id: `${zone.id}-scale`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: zone.duration,
              mode: 'provider',
              targetIds: [zone.id],
              ranges: [
                { key: 'scale', val: 0.2, prog: 0 },
                { key: 'scale', val: 2.5, prog: 1 },
              ],
            },
          },
          // Fade in and out
          {
            id: `${zone.id}-opacity`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: zone.duration,
              mode: 'provider',
              targetIds: [zone.id],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.8 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      })) as RenderableComponentData[],
    },

    // Condensation Droplets Container (z-index: 25)
    {
      id: 'condensation-droplets-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 25,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      childrenData: droplets.map((droplet) => ({
        id: droplet.id,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `
            <div style="
              width: ${droplet.size}px;
              height: ${droplet.size}px;
              border-radius: 50%;
              background: rgba(255, 255, 255, 0.6);
              filter: blur(1px);
              box-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
            "></div>
          `,
          className: 'absolute',
          style: {
            left: `${droplet.position.x}%`,
            top: `${droplet.position.y}%`,
            transform: 'translate(-50%, -50%)',
          },
        },
        context: {
          timing: {
            start: droplet.startTime,
            duration: droplet.duration,
          },
        },
        effects: [
          // Fade in and slightly grow
          {
            id: `${droplet.id}-appear`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: Math.min(0.4, droplet.duration * 0.3),
              mode: 'provider',
              targetIds: [droplet.id],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.6, prog: 1 },
                { key: 'scale', val: 0.5, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
          // Slight slide down (gravity)
          {
            id: `${droplet.id}-slide`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: droplet.duration,
              mode: 'provider',
              targetIds: [droplet.id],
              ranges: [
                { key: 'translateY', val: '0px', prog: 0 },
                { key: 'translateY', val: '10px', prog: 1 },
              ],
            },
          },
        ],
      })) as RenderableComponentData[],
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: 'frosted-glass-reveal-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: overlapDuration,
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
  id: 'frosted-glass-reveal-transition',
  title: 'Frosted Glass Reveal Transition',
  description:
    'A sophisticated transition effect where the outgoing video gradually becomes frosted and opaque while the incoming video emerges through organic clearing patterns, simulating breath fogging and clearing on a window. Features noise-based masks, condensation droplet effects, and progressive blur transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'frosted-glass',
    'organic',
    'blur',
    'reveal',
    'condensation',
    'winter',
    'dreamy',
    'video',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    overlapDuration: 2.5,
    frostColor: 'rgba(255, 255, 255, 0.7)',
    maxBlur: 15,
    incomingStartBlur: 20,
    numberOfClearZones: 3,
    dropletCount: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const frostedGlassRevealTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
