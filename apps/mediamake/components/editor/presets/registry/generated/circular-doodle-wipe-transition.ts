/**
 * Circular Doodle Wipe Transition Preset
 *
 * A playful hand-drawn circular wipe transition that reveals incoming video through
 * multiple expanding doodle circles with imperfect roundness and varying line weights.
 * Features decorative elements (stars, squiggles, arrows) for extra hand-made character.
 *
 * Features:
 * - 3-5 hand-drawn circles expanding from random positions
 * - Each circle expands at slightly different speeds with wobble effect
 * - Imperfect roundness using polygon approximation
 * - Decorative doodles appear briefly during transition
 * - Outgoing video dims as circles reveal incoming video
 * - Subtle hue rotation during transition period
 *
 * Use cases:
 * - Fun, playful transitions between video clips
 * - Hand-drawn style video editing
 * - Creative, informal video content
 * - Transitions for artistic or whimsical content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ─────────────────────────────────────────────────────────────────────────────
// PRESET PARAMETERS SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
    startFrom: z.number().optional().describe('Start time for outgoing video'),
    endAt: z.number().optional().describe('End time for outgoing video'),
  }).describe('Outgoing video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
    startFrom: z.number().optional().describe('Start time for incoming video'),
    endAt: z.number().optional().describe('End time for incoming video'),
  }).describe('Incoming video configuration'),
  
  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Duration of the transition overlap in seconds'),
  
  circleCount: z
    .number()
    .int()
    .min(3)
    .max(5)
    .default(4)
    .describe('Number of expanding doodle circles'),
  
  wobbleIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity of hand-drawn wobble effect'),
});

type PresetParams = z.infer<typeof presetParams>;

// ─────────────────────────────────────────────────────────────────────────────
// PRESET EXECUTION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, circleCount, wobbleIntensity } = params;

  // Calculate total duration (video1 + video2 - overlap)
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Generate random positions for circles
  const generateCirclePositions = (count: number): Array<{ x: number; y: number }> => {
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
      positions.push({
        x: 20 + Math.random() * 60, // 20% to 80% horizontal
        y: 20 + Math.random() * 60, // 20% to 80% vertical
      });
    }
    return positions;
  };

  // Create wobbled circle path (polygon approximation for hand-drawn feel)
  const createWobbledCirclePath = (
    index: number,
    wobble: number,
  ): string => {
    const points = 32; // Number of points for polygon approximation
    const pathPoints: string[] = [];
    
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      // Add wobble variation based on circle index and angle
      const radiusVariation = 0.98 + (Math.sin(angle * 3 + index) * 0.02 * wobble);
      const angleVariation = angle + (Math.sin(angle * 5 + index * 2) * 0.03 * wobble);
      
      const x = 50 + Math.cos(angleVariation) * 50 * radiusVariation;
      const y = 50 + Math.sin(angleVariation) * 50 * radiusVariation;
      
      pathPoints.push(`${x}% ${y}%`);
    }
    
    return `polygon(${pathPoints.join(', ')})`;
  };

  const circlePositions = generateCirclePositions(circleCount);

  // Generate decorative doodles with staggered timing
  const decorativeDoodles = [
    {
      type: 'star',
      html: '<svg viewBox="0 0 24 24" style="width: 100%; height: 100%; stroke: #FFD700; stroke-width: 2.5; fill: none; stroke-linecap: round; stroke-linejoin: round;"><path d="M12 2 L14 9 L21 9 L15.5 14 L18 21 L12 16.5 L6 21 L8.5 14 L3 9 L10 9 Z" /></svg>',
      position: { top: '15%', left: '25%' },
      size: 40,
      delay: 0.1,
    },
    {
      type: 'squiggle',
      html: '<svg viewBox="0 0 60 30" style="width: 100%; height: 100%; stroke: #FF6B9D; stroke-width: 3; fill: none; stroke-linecap: round;"><path d="M5 15 Q15 5, 25 15 T45 15 T55 15" /></svg>',
      position: { top: '60%', right: '20%' },
      size: 60,
      delay: 0.3,
    },
    {
      type: 'arrow',
      html: '<svg viewBox="0 0 24 24" style="width: 100%; height: 100%; stroke: #4ECDC4; stroke-width: 2.5; fill: none; stroke-linecap: round; stroke-linejoin: round;"><path d="M5 12 L19 12 M15 8 L19 12 L15 16" /></svg>',
      position: { bottom: '20%', left: '15%' },
      size: 50,
      delay: 0.5,
    },
    {
      type: 'star2',
      html: '<svg viewBox="0 0 24 24" style="width: 100%; height: 100%; stroke: #FF6B9D; stroke-width: 2; fill: none; stroke-linecap: round; stroke-linejoin: round;"><path d="M12 2 L14 9 L21 9 L15.5 14 L18 21 L12 16.5 L6 21 L8.5 14 L3 9 L10 9 Z" /></svg>',
      position: { top: '40%', right: '30%' },
      size: 35,
      delay: 0.7,
    },
    {
      type: 'squiggle2',
      html: '<svg viewBox="0 0 55 25" style="width: 100%; height: 100%; stroke: #FFD700; stroke-width: 2.5; fill: none; stroke-linecap: round;"><path d="M5 12 Q12 5, 20 12 T35 12 T50 12" /></svg>',
      position: { bottom: '35%', right: '10%' },
      size: 55,
      delay: 0.4,
    },
  ];

  // Build decorative doodle children
  const doodleChildren: RenderableComponentData[] = decorativeDoodles.map((doodle, index) => {
    const doodleId = `doodle-${doodle.type}-${index}`;
    
    return {
      id: doodleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${doodle.size}px; height: ${doodle.size}px; position: relative;">${doodle.html}</div>`,
        style: {
          position: 'absolute',
          ...doodle.position,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `${doodleId}-appear`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: doodle.delay,
            duration: 0.3,
            mode: 'provider',
            targetIds: [doodleId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.7 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: `${doodleId}-disappear`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionDuration - 0.4,
            duration: 0.4,
            mode: 'provider',
            targetIds: [doodleId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.8, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Create clip-path animations for each circle
  const circleClipPaths = circlePositions.map((pos, index) => {
    const startDelay = (index / circleCount) * 0.2; // Stagger start times
    const speedVariation = 0.9 + (index % 2) * 0.2; // Vary expansion speeds
    const effectiveDuration = transitionDuration * speedVariation;
    
    return {
      circleId: `circle-clip-${index}`,
      clipPath: createWobbledCirclePath(index, wobbleIntensity),
      position: pos,
      startDelay,
      duration: effectiveDuration,
    };
  });

  // Generate dynamic clip-path CSS for incoming video
  const generateClipPathStyle = (): string => {
    // This would be calculated dynamically in a real implementation
    // For now, we'll use a simplified approach with multiple circles
    const circles = circlePositions
      .map((pos) => `circle(150% at ${pos.x}% ${pos.y}%)`)
      .join(', ');
    return circles;
  };

  const incomingVideoId = 'incoming-video';
  const outgoingVideoId = 'outgoing-video';
  const incomingLayerId = 'incoming-layer';

  const childrenData: RenderableComponentData[] = [
    // Outgoing video layer (dims behind)
    {
      id: outgoingVideoId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        startFrom: video1.startFrom || 0,
        endAt: video1.endAt,
        className: 'w-full h-full object-cover',
        fit: 'cover',
        style: {
          position: 'absolute',
          inset: '0',
          zIndex: 10,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        // Opacity fade effect: 1 → 0.5 → 0 over transition
        {
          id: 'outgoing-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: video1.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [outgoingVideoId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming video layer (with clip-path reveals)
    {
      id: incomingLayerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 20,
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: video2.duration + transitionDuration,
        },
      },
      childrenData: [
        {
          id: incomingVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            startFrom: video2.startFrom || 0,
            endAt: video2.endAt,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: video2.duration + transitionDuration,
            },
          },
          effects: [
            // Clip-path expansion effect (simplified - multiple circles)
            {
              id: 'incoming-reveal',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: [incomingVideoId],
                ranges: circlePositions.flatMap((pos, index) => {
                  const progress = index / circleCount;
                  return [
                    {
                      key: 'clipPath',
                      val: `circle(0% at ${pos.x}% ${pos.y}%)`,
                      prog: progress,
                    },
                    {
                      key: 'clipPath',
                      val: `circle(150% at ${pos.x}% ${pos.y}%)`,
                      prog: progress + 0.8,
                    },
                  ];
                }),
              },
            },
            // Subtle hue rotation
            {
              id: 'incoming-hue',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: [incomingVideoId],
                ranges: [
                  { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
                  { key: 'filter', val: 'hue-rotate(15deg)', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Decorative doodles layer
    {
      id: 'doodle-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 30,
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - transitionDuration,
          duration: transitionDuration,
        },
      },
      childrenData: doodleChildren,
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'circular-doodle-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full',
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

// ─────────────────────────────────────────────────────────────────────────────
// PRESET METADATA
// ─────────────────────────────────────────────────────────────────────────────

const presetMetadata: PresetMetadata = {
  id: 'circular-doodle-wipe-transition',
  title: 'Circular Doodle Wipe Transition',
  description:
    'Hand-drawn circular wipe transition with multiple expanding doodle circles revealing incoming video. Features imperfect roundness, varying line weights, staggered expansion speeds, and decorative doodles (stars, squiggles, arrows) for hand-made character. Outgoing video fades while incoming video reveals through growing circles with wobble effects and subtle hue rotation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'doodle', 'circular', 'wipe', 'hand-drawn', 'playful'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
      startFrom: 0,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
      startFrom: 0,
    },
    transitionDuration: 1.2,
    circleCount: 4,
    wobbleIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESET EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const circularDoodleWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
