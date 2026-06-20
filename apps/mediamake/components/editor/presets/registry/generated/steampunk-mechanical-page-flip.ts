/**
 * Steampunk Mechanical Page Flip Transition Preset
 *
 * This preset creates a mechanical page flip transition with steampunk aesthetics.
 * Features visible brass gears at corners that spin during the flip, brass hinges
 * along the fold line that rotate realistically, steam puff effects at the flip
 * midpoint, and precise mechanical motion with acceleration and deceleration phases.
 *
 * Technical Features:
 * - Mechanical page flip with rotateY animation using ease-in-out timing
 * - Brass decorative gears at corners with synchronized rotation
 * - Metallic brass hinges at fold line
 * - Steam puff effects with scale and opacity animations
 * - Aged metal appearance with contrast and sepia filters
 * - Metallic sheen effects that shift with rotation angle
 * - 1.8-second overlap between outgoing and incoming videos
 *
 * Use Cases:
 * - Steampunk-themed video transitions
 * - Mechanical book page turning effects
 * - Industrial/vintage video presentations
 * - Creative transitions for maker/DIY content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  duration: z
    .number()
    .min(1)
    .max(5)
    .default(2.4)
    .describe('Total duration of the transition in seconds'),
  flipDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.8)
    .describe('Duration of the page flip animation'),
  overlapDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(1.8)
    .describe('Duration of overlap between outgoing and incoming videos'),
  gearSize: z
    .number()
    .min(40)
    .max(150)
    .default(80)
    .describe('Size of corner gears in pixels'),
  hingeWidth: z
    .number()
    .min(20)
    .max(50)
    .default(30)
    .describe('Width of brass hinges in pixels'),
  steamIntensity: z
    .number()
    .min(0.3)
    .max(1)
    .default(0.6)
    .describe('Opacity intensity of steam puffs'),
  metalSheen: z
    .boolean()
    .default(true)
    .describe('Enable metallic sheen gradient effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    duration,
    flipDuration,
    overlapDuration,
    gearSize,
    hingeWidth,
    steamIntensity,
    metalSheen,
  } = params;

  // Calculate timing
  const incomingStart = flipDuration - overlapDuration;
  const steamStart = flipDuration * 0.5 - 0.15; // Steam appears slightly before midpoint

  // Helper function to create gear SVG as data URI
  const createGearSvg = (size: number): string => {
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="brassGradient">
            <stop offset="0%" style="stop-color:#f4d47c;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#d4a574;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#8b6914;stop-opacity:1" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="30" fill="url(#brassGradient)" stroke="#5d4715" stroke-width="2"/>
        ${Array.from({ length: 12 }, (_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const x1 = 50 + Math.cos(angle) * 25;
          const y1 = 50 + Math.sin(angle) * 25;
          const x2 = 50 + Math.cos(angle) * 35;
          const y2 = 50 + Math.sin(angle) * 35;
          return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8b6914" stroke-width="4" stroke-linecap="round"/>`;
        }).join('')}
        <circle cx="50" cy="50" r="12" fill="#5d4715" stroke="#3d2f0f" stroke-width="2"/>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const gearSvgSrc = createGearSvg(100);

  // Outgoing video container with flip effect
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
          filter: 'contrast(1.1) sepia(0.2)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: flipDuration,
      },
    },
    effects: [
      {
        id: 'outgoing-flip-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: flipDuration,
          mode: 'provider',
          targetIds: ['outgoing-video-container'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -180, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideoSrc,
          fit: 'cover',
          style: {
            width: '100%',
            height: '100%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: flipDuration,
          },
        },
      },
    ],
  };

  // Incoming video container with flip effect
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
        duration: flipDuration,
      },
    },
    effects: [
      {
        id: 'incoming-flip-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: flipDuration,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'rotateY', val: 180, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            { key: 'filter', val: 'brightness(0.8) blur(1px) contrast(1.1) sepia(0.2)', prog: 0 },
            { key: 'filter', val: 'brightness(1) blur(0px) contrast(1.1) sepia(0.2)', prog: 0.3 },
            { key: 'filter', val: 'contrast(1.1) sepia(0.2)', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: incomingVideoSrc,
          fit: 'cover',
          style: {
            width: '100%',
            height: '100%',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: flipDuration,
          },
        },
      },
    ],
  };

  // Create corner gears with rotation effects
  const gearTopLeft: RenderableComponentData = {
    id: 'gear-top-left',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: gearSvgSrc,
      style: {
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: `${gearSize}px`,
        height: `${gearSize}px`,
        opacity: 0.8,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'gear-top-left-spin',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: flipDuration,
          mode: 'provider',
          targetIds: ['gear-top-left'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 360, prog: 1 },
          ],
        },
      },
    ],
  };

  const gearTopRight: RenderableComponentData = {
    id: 'gear-top-right',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: gearSvgSrc,
      style: {
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: `${gearSize}px`,
        height: `${gearSize}px`,
        opacity: 0.8,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'gear-top-right-spin',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: flipDuration,
          mode: 'provider',
          targetIds: ['gear-top-right'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: -360, prog: 1 },
          ],
        },
      },
    ],
  };

  const gearBottomLeft: RenderableComponentData = {
    id: 'gear-bottom-left',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: gearSvgSrc,
      style: {
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        width: `${gearSize * 0.75}px`,
        height: `${gearSize * 0.75}px`,
        opacity: 0.8,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'gear-bottom-left-spin',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: flipDuration,
          mode: 'provider',
          targetIds: ['gear-bottom-left'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 360, prog: 1 },
          ],
        },
      },
    ],
  };

  const gearBottomRight: RenderableComponentData = {
    id: 'gear-bottom-right',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: gearSvgSrc,
      style: {
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: `${gearSize * 0.75}px`,
        height: `${gearSize * 0.75}px`,
        opacity: 0.8,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'gear-bottom-right-spin',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: flipDuration,
          mode: 'provider',
          targetIds: ['gear-bottom-right'],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: -360, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create brass hinges
  const hingeTop: RenderableComponentData = {
    id: 'hinge-top',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          left: '0',
          top: '15%',
          width: `${hingeWidth}px`,
          height: '60px',
          background: 'linear-gradient(135deg, #d4a574 0%, #8b6914 50%, #d4a574 100%)',
          borderRadius: '4px',
          boxShadow: '2px 2px 8px rgba(0,0,0,0.5)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'hinge-top-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: flipDuration,
          mode: 'provider',
          targetIds: ['hinge-top'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -15, prog: 0.5 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  const hingeCenter: RenderableComponentData = {
    id: 'hinge-center',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          left: '0',
          top: '50%',
          transform: 'translateY(-50%)',
          width: `${hingeWidth}px`,
          height: '80px',
          background: 'linear-gradient(135deg, #d4a574 0%, #8b6914 50%, #d4a574 100%)',
          borderRadius: '4px',
          boxShadow: '2px 2px 8px rgba(0,0,0,0.5)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'hinge-center-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: flipDuration,
          mode: 'provider',
          targetIds: ['hinge-center'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -20, prog: 0.5 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  const hingeBottom: RenderableComponentData = {
    id: 'hinge-bottom',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          left: '0',
          bottom: '15%',
          width: `${hingeWidth}px`,
          height: '60px',
          background: 'linear-gradient(135deg, #d4a574 0%, #8b6914 50%, #d4a574 100%)',
          borderRadius: '4px',
          boxShadow: '2px 2px 8px rgba(0,0,0,0.5)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'hinge-bottom-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: flipDuration,
          mode: 'provider',
          targetIds: ['hinge-bottom'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -15, prog: 0.5 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Steam puff effects
  const steamPuffLeft: RenderableComponentData = {
    id: 'steam-puff-left',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          left: '10%',
          top: '40%',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: steamStart,
        duration: 0.6,
      },
    },
    effects: [
      {
        id: 'steam-puff-left-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.6,
          mode: 'provider',
          targetIds: ['steam-puff-left'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: steamIntensity, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1.5, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -30, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  const steamPuffRight: RenderableComponentData = {
    id: 'steam-puff-right',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          left: '5%',
          top: '55%',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: steamStart + 0.1,
        duration: 0.5,
      },
    },
    effects: [
      {
        id: 'steam-puff-right-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.5,
          mode: 'provider',
          targetIds: ['steam-puff-right'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: steamIntensity * 0.8, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1.4, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -25, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'steampunk-page-flip-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gradient-to-br from-amber-900 to-zinc-800',
        style: {
          overflow: 'hidden',
          perspective: '1200px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      outgoingVideoContainer,
      incomingVideoContainer,
      gearTopLeft,
      gearTopRight,
      gearBottomLeft,
      gearBottomRight,
      hingeTop,
      hingeCenter,
      hingeBottom,
      steamPuffLeft,
      steamPuffRight,
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
  id: 'steampunk-mechanical-page-flip',
  title: 'Steampunk Mechanical Page Flip Transition',
  description:
    'A mechanical page flip transition with steampunk aesthetics featuring visible gears at corners that spin during the flip, brass hinges along the fold line, and steam puff effects at the flip midpoint. The outgoing video rotates away with precise mechanical motion while the incoming video appears with an aged metal/patina effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'steampunk',
    'mechanical',
    'page-flip',
    'gears',
    'hinges',
    'steam',
    'vintage',
    'industrial',
    'brass',
    'metal',
    'book',
  ],
  dependencies: {},
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    duration: 2.4,
    flipDuration: 1.8,
    overlapDuration: 1.8,
    gearSize: 80,
    hingeWidth: 30,
    steamIntensity: 0.6,
    metalSheen: true,
  },
};

export const steampunkMechanicalPageFlipPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
