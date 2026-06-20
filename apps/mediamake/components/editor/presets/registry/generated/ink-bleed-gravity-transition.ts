/**
 * Ink Bleed Gravity Transition
 * 
 * A bleeding-edge transition where the outgoing video edges bleed ink that flows 
 * downward with gravity-based physics, pooling at the bottom before the incoming 
 * video rises from the ink pool. Features chromatic aberration on bleeding edges 
 * for viscous liquid effect and surface tension effect on incoming video.
 * 
 * Features:
 * - Multiple ink drips with gravity-based acceleration
 * - Chromatic aberration for viscous liquid effect
 * - Ink pooling animation at bottom
 * - Surface tension effect on incoming video
 * - 3-second dramatic overlap with physics-based timing
 * 
 * Use cases:
 * - Dramatic video transitions with liquid effects
 * - Horror/thriller video sequences
 * - Artistic video presentations
 * - Creative video storytelling
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z
    .number()
    .default(3)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Calculate total duration (with overlap)
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Ink drip configurations (different start times and speeds)
  const inkDrips = [
    { id: 'ink-drip-1', left: '15%', top: '0px', width: 30, height: 60, startOffset: 0, duration: 3, direction: 'down' },
    { id: 'ink-drip-2', right: '20%', top: '0px', width: 40, height: 80, startOffset: 0.2, duration: 2.8, direction: 'down' },
    { id: 'ink-drip-3', left: '25%', bottom: '0px', width: 35, height: 70, startOffset: 0.1, duration: 2.9, direction: 'up' },
    { id: 'ink-drip-4', left: '60%', top: '0px', width: 28, height: 55, startOffset: 0.3, duration: 2.7, direction: 'down' },
    { id: 'ink-drip-5', right: '30%', bottom: '0px', width: 38, height: 75, startOffset: 0.15, duration: 2.85, direction: 'up' },
  ];

  // Create chromatic aberration SVG filter
  const chromaticAberrationSVG = `
    <svg width="0" height="0" style="position: absolute;">
      <defs>
        <filter id="chromatic-aberration">
          <feOffset in="SourceGraphic" dx="-3" dy="0" result="red"/>
          <feOffset in="SourceGraphic" dx="3" dy="0" result="blue"/>
          <feBlend mode="screen" in="red" in2="SourceGraphic" result="redBlend"/>
          <feBlend mode="screen" in="blue" in2="redBlend"/>
        </filter>
      </defs>
    </svg>
  `;

  // Create ink drip HTML blocks
  const inkDripChildren: RenderableComponentData[] = inkDrips.map((drip) => {
    const positionStyle: Record<string, any> = {
      willChange: 'transform',
    };
    if ('left' in drip) positionStyle.left = drip.left;
    if ('right' in drip) positionStyle.right = drip.right;
    if ('top' in drip) positionStyle.top = drip.top;
    if ('bottom' in drip) positionStyle.bottom = drip.bottom;

    const dripHTML = `
      <div style="
        width: ${drip.width}px; 
        height: ${drip.height}px; 
        background: linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 100%); 
        border-radius: 50% 50% 40% 40%; 
        filter: blur(2px);
      "></div>
    `;

    // Calculate translateY based on direction
    const translateYStart = drip.direction === 'down' ? 0 : 0;
    const translateYEnd = drip.direction === 'down' 
      ? `calc(100vh + ${drip.height}px)` 
      : `-${drip.height}px`;

    return {
      id: drip.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: dripHTML,
        className: 'absolute',
        style: positionStyle,
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration + drip.startOffset,
          duration: drip.duration,
        },
      },
      effects: [
        {
          id: `${drip.id}-gravity`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: drip.duration,
            mode: 'provider',
            targetIds: [drip.id],
            ranges: [
              { key: 'translateY', val: translateYStart, prog: 0 },
              { key: 'translateY', val: translateYEnd, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Outgoing video container
  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    childrenData: [
      // Outgoing video
      {
        id: 'outgoing-video',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: outgoingVideo.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          style: {
            willChange: 'transform, clip-path, filter',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
        effects: [
          // Clip-path animation (bleeding edges)
          {
            id: 'outgoing-clip-path',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: outgoingVideo.duration - transitionDuration,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'clipPath', val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', prog: 0 },
                { key: 'clipPath', val: 'polygon(5% 8%, 95% 6%, 92% 88%, 8% 90%)', prog: 0.3 },
                { key: 'clipPath', val: 'polygon(10% 15%, 90% 12%, 85% 75%, 15% 78%)', prog: 0.6 },
                { key: 'clipPath', val: 'polygon(20% 25%, 80% 22%, 75% 60%, 25% 65%)', prog: 1 },
              ],
            },
          },
          // Chromatic aberration effect
          {
            id: 'outgoing-chromatic',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: outgoingVideo.duration - transitionDuration + 0.4 * transitionDuration,
              duration: transitionDuration * 0.6,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'filter', val: 'url(#chromatic-aberration)', prog: 0 },
                { key: 'filter', val: 'url(#chromatic-aberration)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Chromatic aberration SVG
      {
        id: 'chromatic-aberration-svg',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: chromaticAberrationSVG,
          className: 'pointer-events-none absolute',
        },
        context: {
          timing: {
            start: 0,
            duration: outgoingVideo.duration,
          },
        },
      } as RenderableComponentData,
      // Ink drips
      ...inkDripChildren,
      // Ink pool at bottom
      {
        id: 'ink-pool',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `
            <div style="
              width: 100%; 
              height: 0px; 
              background: linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0) 100%); 
              filter: blur(4px);
            "></div>
          `,
          className: 'absolute bottom-0 left-0',
          style: {
            willChange: 'transform, height',
          },
        },
        context: {
          timing: {
            start: outgoingVideo.duration - transitionDuration + 0.5,
            duration: 2.5,
          },
        },
        effects: [
          {
            id: 'ink-pool-expand',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 1.5,
              mode: 'provider',
              targetIds: ['ink-pool'],
              ranges: [
                { key: 'height', val: '0px', prog: 0 },
                { key: 'height', val: '40vh', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Incoming video container
  const incomingContainer: RenderableComponentData = {
    id: 'incoming-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    childrenData: [
      // Incoming video with surface tension effect
      {
        id: 'incoming-video',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: incomingVideo.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          style: {
            willChange: 'transform, opacity',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: incomingVideo.duration + transitionDuration,
          },
        },
        effects: [
          // Rise with surface tension (squash and stretch)
          {
            id: 'incoming-rise',
            componentId: 'generic',
            data: {
              type: 'spring',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                // Translate Y (rise from bottom)
                { key: 'translateY', val: '20%', prog: 0 },
                { key: 'translateY', val: '0%', prog: 1 },
                // Scale X (horizontal squash/stretch)
                { key: 'scaleX', val: 1.1, prog: 0 },
                { key: 'scaleX', val: 1, prog: 1 },
                // Scale Y (vertical squash/stretch)
                { key: 'scaleY', val: 0.9, prog: 0 },
                { key: 'scaleY', val: 1, prog: 1 },
                // Opacity fade in
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'ink-bleed-gravity-transition-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative h-full w-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingContainer, incomingContainer],
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
  id: 'ink-bleed-gravity-transition',
  title: 'Ink Bleed Gravity Transition',
  description:
    'A bleeding-edge transition where the outgoing video edges bleed ink that flows downward with gravity-based physics, pooling at the bottom before the incoming video rises from the ink pool. Features chromatic aberration on bleeding edges for viscous liquid effect and surface tension effect on incoming video. 3-second dramatic overlap with physics-based animation timing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'ink',
    'bleed',
    'gravity',
    'liquid',
    'chromatic-aberration',
    'physics',
    'dramatic',
    'artistic',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const inkBleedGravityTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
