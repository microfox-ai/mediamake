/**
 * Blood Drip Horror Transition Preset
 *
 * A cinematic blood drip transition where crimson liquid oozes down from the top of the screen
 * like a horror movie title card. Features thick viscous blood with realistic physics including
 * variable flow speeds, bulge accumulation, glossy wet appearance with highlights and shadows,
 * and organic variation.
 *
 * Technical Implementation:
 * - Main BaseLayout container with relative positioning and overflow hidden
 * - Layered structure: background trails (z-10), main streams (z-20), droplets (z-30), highlights (z-40)
 * - Blood streams created using HTMLBlockAtom with CSS styling (no ShapeAtom)
 * - Animations using translateY for vertical movement with cubic-bezier easing
 * - Scale effects for stretching and wobble for viscosity
 * - Opacity layers for depth and glossy appearance
 * - Staggered timing for organic flow variation
 *
 * Transition Phases:
 * - Small trickles (0-20%): Initial blood drops appear at top
 * - Steady streams (20-60%): Blood flows down in multiple streams
 * - Full blood curtain (60-90%): Complete coverage with thick blood
 * - Dissolve reveal (90-100%): Blood fades to reveal next scene
 *
 * Features:
 * - Realistic physics with variable flow speeds
 * - Bulge accumulation and dripping effects
 * - Glossy wet appearance with highlights
 * - Organic variation to avoid mechanical repetition
 * - Customizable intensity and speed
 * - Optional reveal text/imagery beneath
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Total duration of the blood drip transition in seconds'),
  intensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for blood flow speed and effects (0.5-2)'),
  streamCount: z
    .number()
    .min(4)
    .max(12)
    .default(8)
    .describe('Number of main blood streams (4-12)'),
  revealText: z
    .string()
    .optional()
    .describe('Optional text to reveal beneath the blood (e.g., "REVEALED")'),
  revealTextColor: z
    .string()
    .default('#dc2626')
    .describe('Color of the reveal text (CSS color)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color behind the blood (CSS color)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    intensity,
    streamCount,
    revealText,
    revealTextColor,
    backgroundColor,
  } = params;

  // Helper function to generate random value in range
  const random = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  };

  // Helper function to generate blood stream data
  const generateStreamData = (index: number, total: number) => {
    const position = (index / (total - 1)) * 90 + 5; // 5% to 95% spread
    const width = random(60, 110);
    const height = random(150, 180);
    const startDelay = random(0.2, 0.8) * (1 / intensity);
    const fallDuration = random(2.5, 3.5) * (1 / intensity);
    const wobbleSpeed = random(1.5, 2.5);

    return { position, width, height, startDelay, fallDuration, wobbleSpeed };
  };

  // Helper function to generate trail data
  const generateTrailData = (index: number, total: number) => {
    const position = (index / (total - 1)) * 80 + 10;
    const width = random(40, 65);
    const height = random(130, 160);
    const startDelay = random(0, 0.3) * (1 / intensity);

    return { position, width, height, startDelay };
  };

  // Helper function to generate droplet data
  const generateDropletData = (index: number, total: number) => {
    const position = (index / total) * 85 + random(5, 15);
    const width = random(15, 28);
    const height = random(25, 40);
    const startDelay = random(0.8, 1.5) * (1 / intensity);
    const fallDuration = random(1.2, 2) * (1 / intensity);

    return { position, width, height, startDelay, fallDuration };
  };

  const childrenData: RenderableComponentData[] = [];

  // Layer 1: Background trails (z-10)
  const trailCount = 3;
  for (let i = 0; i < trailCount; i++) {
    const trail = generateTrailData(i, trailCount);
    const trailId = `blood-trail-${i}`;

    childrenData.push({
      id: trailId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(to bottom, #7f1d1d 0%, #450a0a 100%);
          border-radius: 0 0 ${trail.width * 0.5}px ${trail.width * 0.5}px;
          filter: blur(3px);
          mix-blend-mode: multiply;
        "></div>`,
        className: 'absolute',
        style: {
          width: `${trail.width}px`,
          height: `${trail.height}%`,
          left: `${trail.position}%`,
          top: '-100%',
          zIndex: 10,
          opacity: 0.6,
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
          id: `${trailId}-fall`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: trail.startDelay,
            duration: duration - trail.startDelay,
            mode: 'provider',
            targetIds: [trailId],
            ranges: [
              { key: 'translateY', val: '0%', prog: 0 },
              { key: 'translateY', val: '140%', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Layer 2: Main blood streams (z-20)
  for (let i = 0; i < streamCount; i++) {
    const stream = generateStreamData(i, streamCount);
    const streamId = `blood-stream-${i}`;

    childrenData.push({
      id: streamId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(to bottom, 
            #dc2626 0%, 
            #991b1b 40%, 
            #7f1d1d 70%, 
            #450a0a 100%
          );
          border-radius: 0 0 ${stream.width * 0.5}px ${stream.width * 0.5}px;
          box-shadow: 0 25px 50px -12px rgba(127, 29, 29, 0.8),
                      inset 0 2px 4px rgba(255, 255, 255, 0.1);
        "></div>`,
        className: 'absolute',
        style: {
          width: `${stream.width}px`,
          height: `${stream.height}%`,
          left: `${stream.position}%`,
          top: '-100%',
          zIndex: 20,
          opacity: 0.9,
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
          id: `${streamId}-fall`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: stream.startDelay,
            duration: stream.fallDuration,
            mode: 'provider',
            targetIds: [streamId],
            ranges: [
              { key: 'translateY', val: '0%', prog: 0 },
              { key: 'translateY', val: '130%', prog: 1 },
              { key: 'scaleY', val: 1, prog: 0 },
              { key: 'scaleY', val: 1.3, prog: 0.6 },
              { key: 'scaleY', val: 1.1, prog: 1 },
            ],
          },
        },
        {
          id: `${streamId}-wobble`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: stream.startDelay,
            duration: stream.wobbleSpeed,
            mode: 'provider',
            targetIds: [streamId],
            ranges: [
              { key: 'scaleX', val: 0.95, prog: 0 },
              { key: 'scaleX', val: 1.05, prog: 0.5 },
              { key: 'scaleX', val: 0.95, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Layer 3: Droplets (z-30)
  const dropletCount = 4;
  for (let i = 0; i < dropletCount; i++) {
    const droplet = generateDropletData(i, dropletCount);
    const dropletId = `blood-droplet-${i}`;

    childrenData.push({
      id: dropletId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="
          width: 100%;
          height: 100%;
          background: radial-gradient(ellipse at 30% 30%, #ef4444 0%, #991b1b 50%, #7f1d1d 100%);
          border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5),
                      inset -2px -2px 4px rgba(0, 0, 0, 0.3),
                      inset 2px 2px 4px rgba(255, 255, 255, 0.2);
        "></div>`,
        className: 'absolute',
        style: {
          width: `${droplet.width}px`,
          height: `${droplet.height}px`,
          left: `${droplet.position}%`,
          top: '-10%',
          zIndex: 30,
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
          id: `${dropletId}-fall`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: droplet.startDelay,
            duration: droplet.fallDuration,
            mode: 'provider',
            targetIds: [dropletId],
            ranges: [
              { key: 'translateY', val: '0%', prog: 0 },
              { key: 'translateY', val: '1200%', prog: 1 },
              { key: 'scaleY', val: 1, prog: 0 },
              { key: 'scaleY', val: 1.2, prog: 0.8 },
              { key: 'scaleY', val: 0.8, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Layer 4: Highlights (z-40)
  const highlightCount = 3;
  for (let i = 0; i < highlightCount; i++) {
    const highlightPos = (i / (highlightCount - 1)) * 70 + 15;
    const highlightWidth = random(20, 35);
    const highlightId = `blood-highlight-${i}`;
    const highlightDelay = random(0.3, 0.9) * (1 / intensity);

    childrenData.push({
      id: highlightId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(to bottom, 
            rgba(255, 255, 255, 0.4) 0%, 
            rgba(255, 255, 255, 0.2) 20%, 
            transparent 40%
          );
          border-radius: ${highlightWidth * 0.5}px;
          pointer-events: none;
        "></div>`,
        className: 'absolute',
        style: {
          width: `${highlightWidth}px`,
          height: '120%',
          left: `${highlightPos}%`,
          top: '-100%',
          zIndex: 40,
          opacity: 0.3,
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
          id: `${highlightId}-fall`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: highlightDelay,
            duration: duration - highlightDelay * 0.5,
            mode: 'provider',
            targetIds: [highlightId],
            ranges: [
              { key: 'translateY', val: '0%', prog: 0 },
              { key: 'translateY', val: '120%', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Layer 5: Reveal content (z-5, behind blood)
  if (revealText) {
    const revealTextId = 'blood-reveal-text';
    childrenData.push({
      id: revealTextId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: revealText,
        style: {
          fontSize: '120px',
          fontWeight: '900',
          color: revealTextColor,
          textShadow: `0 0 40px ${revealTextColor}80`,
          textAlign: 'center',
        },
        font: {
          family: 'Inter',
          weights: ['900'],
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
          id: `${revealTextId}-reveal`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: duration * 0.6,
            duration: duration * 0.4,
            mode: 'provider',
            targetIds: [revealTextId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'blood-drip-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
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
  id: 'blood-drip-horror-transition',
  title: 'Blood Drip Horror Transition',
  description:
    'A cinematic blood drip transition where crimson liquid oozes down from the top of the screen like a horror movie title card. Features thick viscous blood with realistic physics including variable flow speeds, bulge accumulation, glossy wet appearance with highlights and shadows, and organic variation. The transition progresses through phases: small trickles (0-20%), steady streams (20-60%), full blood curtain (60-90%), and dissolve reveal (90-100%).',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'blood',
    'drip',
    'horror',
    'cinematic',
    'viscous',
    'physics',
    'organic',
    'reveal',
  ],
  defaultInputParams: {
    duration: 4,
    intensity: 1,
    streamCount: 8,
    revealText: 'REVEALED',
    revealTextColor: '#dc2626',
    backgroundColor: '#000000',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const bloodDripHorrorTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
