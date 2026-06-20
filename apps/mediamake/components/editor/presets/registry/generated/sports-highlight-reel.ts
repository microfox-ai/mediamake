/**
 * Sports Highlight Reel Preset
 *
 * Creates high-energy sports broadcast style highlight reels with explosive visual effects.
 * 
 * Features:
 * - Impact zoom animations with motion blur (camera crash zoom simulation)
 * - Multi-angle replay system showing same moment from different perspectives
 * - Speed ramping effects (slow-motion emphasis with quick snap-back)
 * - Statistical overlays and player cards with sliding animations
 * - Energy bars, power meters, and trajectory line visualizations
 * - Camera flash effects for dramatic impact moments
 * - Constant motion and information delivery
 * 
 * Technical Implementation:
 * - Aggressive scale animations: 0.8 → 1.2 → 1.0 over 300ms with ease-out-expo
 * - Motion blur via filter: blur(5px) → blur(0px) during scale animation
 * - Replay effect using same image with different object-position crops
 * - Slow-mo effect via longer duration on emphasis moments
 * - Player cards with backdrop-blur and spring-easing slide-in animations
 * - Energy bars using scaleX animations on gradient fills
 * - Trajectory lines with staggered opacity fade-in on positioned dots
 * - Quick cross-fades (100ms) between replay angles with position shifts
 * - Camera flash overlay with brief opacity spike (0.8 → 0 over 150ms)
 * 
 * Use Cases:
 * - Sports highlight montages with dynamic replay angles
 * - Action sports content with statistical overlays
 * - Athletic performance showcases with metrics
 * - Game highlight reels with player information
 * - Training footage with trajectory analysis
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  highlights: z.array(z.object({
    mainImage: z.object({
      src: z.string().describe('Main highlight image source URL'),
    }),
    replayAngles: z.array(z.object({
      src: z.string().describe('Replay angle image source URL'),
      objectPosition: z.string().optional().describe('Object position for crop (e.g., "center top", "center", "center bottom")'),
    })).optional().describe('Array of replay angle images (up to 3 recommended)'),
    playerCard: z.object({
      name: z.string().describe('Player name'),
      stat1: z.string().optional().describe('First statistic line'),
      stat2: z.string().optional().describe('Second statistic line'),
    }).optional().describe('Player information card'),
    statOverlay: z.object({
      text: z.string().describe('Stat text to display (e.g., "32 PTS", "Game Winner")'),
    }).optional().describe('Large stat overlay text'),
    countdown: z.string().optional().describe('Countdown timer text (e.g., "3:45", "0:15")'),
    energyLevel: z.number().min(0).max(1).optional().describe('Energy bar fill level (0-1)'),
    trajectoryPath: z.array(z.object({
      x: z.string().describe('X position (e.g., "30%", "100px")'),
      y: z.string().describe('Y position (e.g., "40%", "100px")'),
    })).optional().describe('Trajectory path points'),
    duration: z.number().min(1).describe('Duration of this highlight moment in seconds'),
  })).min(1).describe('Array of highlight moments with images and overlays'),
  trackName: z.string().default('sports-highlight').describe('Track name for unique IDs'),
  impactIntensity: z.number().min(0.5).max(2).default(1).describe('Impact intensity multiplier for effects (0.5-2)'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { highlights, trackName, impactIntensity } = params;

  // Helper function to create impact zoom effect
  const createImpactZoom = (targetId: string, intensity: number = 1) => {
    const duration = 0.3 * intensity;
    return {
      id: `impact-zoom-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out-expo' as const,
        start: 0,
        duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1.2, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Helper function to create motion blur effect
  const createMotionBlur = (targetId: string, intensity: number = 1) => {
    const duration = 0.3 * intensity;
    const blurAmount = 5 * intensity;
    return {
      id: `motion-blur-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: 0,
        duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'filter', val: `blur(${blurAmount}px)`, prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    };
  };

  // Helper function to create camera flash effect
  const createCameraFlash = (flashId: string) => {
    return {
      id: flashId,
      componentId: 'HTMLBlockAtom',
      type: 'atom' as const,
      data: {
        html: "<div class='absolute inset-0 bg-white'></div>",
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: 0.15,
        },
      },
      effects: [
        {
          id: `flash-effect-${flashId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: 0,
            duration: 0.15,
            mode: 'provider' as const,
            targetIds: [flashId],
            ranges: [
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };
  };

  // Build highlight moments
  let cumulativeStart = 0;
  const highlightMoments = highlights.map((highlight, index) => {
    const momentId = `${trackName}-moment-${index}`;
    const mainImageId = `${momentId}-main`;
    const duration = highlight.duration;
    
    const children: RenderableComponentData[] = [];

    // Main image with impact zoom and motion blur
    children.push({
      id: mainImageId,
      componentId: 'ImageAtom',
      type: 'atom' as const,
      data: {
        src: highlight.mainImage.src,
        className: 'w-full h-full object-cover',
      },
      context: {
        timing: {
          start: 0,
          duration: Math.min(2, duration * 0.4),
        },
      },
      effects: [
        createImpactZoom(mainImageId, impactIntensity),
        createMotionBlur(mainImageId, impactIntensity),
      ],
    } as RenderableComponentData);

    // Replay angles (multi-angle system)
    if (highlight.replayAngles && highlight.replayAngles.length > 0) {
      let replayStart = Math.min(2, duration * 0.4);
      const replayDuration = (duration - replayStart) / highlight.replayAngles.length;

      highlight.replayAngles.forEach((replay, replayIndex) => {
        const replayId = `${momentId}-replay-${replayIndex}`;
        const objectPos = replay.objectPosition || 
          (replayIndex === 0 ? 'center top' : 
           replayIndex === 1 ? 'center center' : 'center bottom');

        children.push({
          id: replayId,
          componentId: 'ImageAtom',
          type: 'atom' as const,
          data: {
            src: replay.src,
            className: 'absolute inset-0 w-full h-full object-cover',
            style: {
              objectPosition: objectPos,
            },
          },
          context: {
            timing: {
              start: replayStart,
              duration: replayDuration * (replayIndex === 1 ? 1.2 : 1), // Slow-mo middle angle
            },
          },
          effects: [
            {
              id: `replay-zoom-${replayId}`,
              componentId: 'generic',
              data: {
                type: 'ease-out' as const,
                start: 0,
                duration: 0.1,
                mode: 'provider' as const,
                targetIds: [replayId],
                ranges: [
                  { key: 'scale', val: 0.9 - (replayIndex * 0.05), prog: 0 },
                  { key: 'scale', val: 1.05 + (replayIndex * 0.05), prog: 1 },
                ],
              },
            },
            {
              id: `cross-fade-${replayId}`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out' as const,
                start: 0,
                duration: 0.1,
                mode: 'provider' as const,
                targetIds: [replayId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData);

        replayStart += replayDuration;
      });
    }

    // Player card with stats
    if (highlight.playerCard) {
      const cardId = `${momentId}-player-card`;
      const cardChildren: RenderableComponentData[] = [
        {
          id: `${cardId}-name`,
          componentId: 'TextAtom',
          type: 'atom' as const,
          data: {
            text: highlight.playerCard.name,
            className: 'text-xl font-bold text-gray-900 mb-2',
          },
          context: {
            timing: {
              start: 0,
              duration: duration - 0.5,
            },
          },
        } as RenderableComponentData,
      ];

      if (highlight.playerCard.stat1) {
        cardChildren.push({
          id: `${cardId}-stat1`,
          componentId: 'TextAtom',
          type: 'atom' as const,
          data: {
            text: highlight.playerCard.stat1,
            className: 'text-sm text-gray-700',
          },
          context: {
            timing: {
              start: 0.2,
              duration: duration - 0.7,
            },
          },
          effects: [
            {
              id: `fade-stat1-${cardId}`,
              componentId: 'generic',
              data: {
                type: 'ease-out' as const,
                start: 0,
                duration: 0.3,
                mode: 'provider' as const,
                targetIds: [`${cardId}-stat1`],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData);
      }

      if (highlight.playerCard.stat2) {
        cardChildren.push({
          id: `${cardId}-stat2`,
          componentId: 'TextAtom',
          type: 'atom' as const,
          data: {
            text: highlight.playerCard.stat2,
            className: 'text-sm text-gray-700',
          },
          context: {
            timing: {
              start: 0.4,
              duration: duration - 0.9,
            },
          },
          effects: [
            {
              id: `fade-stat2-${cardId}`,
              componentId: 'generic',
              data: {
                type: 'ease-out' as const,
                start: 0,
                duration: 0.3,
                mode: 'provider' as const,
                targetIds: [`${cardId}-stat2`],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData);
      }

      children.push({
        id: cardId,
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'absolute left-4 bottom-4 w-64 bg-white/90 backdrop-blur rounded-lg p-4 shadow-2xl',
          },
        },
        context: {
          timing: {
            start: 0.5,
            duration: duration - 0.5,
          },
        },
        childrenData: cardChildren,
        effects: [
          {
            id: `slide-in-${cardId}`,
            componentId: 'generic',
            data: {
              type: 'spring' as const,
              start: 0,
              duration: 0.4,
              mode: 'provider' as const,
              targetIds: [cardId],
              ranges: [
                { key: 'translateX', val: -100, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    // Stat overlay
    if (highlight.statOverlay) {
      const statId = `${momentId}-stat-overlay`;
      children.push({
        id: statId,
        componentId: 'TextAtom',
        type: 'atom' as const,
        data: {
          text: highlight.statOverlay.text,
          className: 'absolute top-8 right-8 text-4xl font-black text-white drop-shadow-2xl',
        },
        context: {
          timing: {
            start: Math.min(1.5, duration * 0.3),
            duration: duration - Math.min(1.5, duration * 0.3),
          },
        },
        effects: [
          {
            id: `stat-popup-${statId}`,
            componentId: 'generic',
            data: {
              type: 'spring' as const,
              start: 0,
              duration: 0.5,
              mode: 'provider' as const,
              targetIds: [statId],
              ranges: [
                { key: 'scale', val: 0, prog: 0 },
                { key: 'scale', val: 1.3, prog: 0.6 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    // Countdown timer
    if (highlight.countdown) {
      const timerId = `${momentId}-countdown`;
      children.push({
        id: timerId,
        componentId: 'TextAtom',
        type: 'atom' as const,
        data: {
          text: highlight.countdown,
          className: 'absolute top-8 left-1/2 -translate-x-1/2 text-6xl font-black text-white drop-shadow-2xl',
          style: {
            fontVariantNumeric: 'tabular-nums',
          },
        },
        context: {
          timing: {
            start: Math.min(1, duration * 0.2),
            duration: duration - Math.min(1, duration * 0.2),
          },
        },
        effects: [
          {
            id: `countdown-pulse-${timerId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out' as const,
              start: 0,
              duration: 1,
              mode: 'provider' as const,
              targetIds: [timerId],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1.2, prog: 0.5 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    // Energy bar
    const energyLevel = highlight.energyLevel ?? 0.85;
    const energyBarId = `${momentId}-energy-bar`;
    const energyFillId = `${energyBarId}-fill`;
    
    children.push({
      id: energyBarId,
      componentId: 'BaseLayout',
      type: 'layout' as const,
      data: {
        containerProps: {
          className: 'absolute top-4 left-4 right-4 h-2 bg-gray-800/50 rounded-full overflow-hidden',
        },
      },
      context: {
        timing: {
          start: Math.min(2, duration * 0.4),
          duration: duration - Math.min(2, duration * 0.4),
        },
      },
      childrenData: [
        {
          id: energyFillId,
          componentId: 'HTMLBlockAtom',
          type: 'atom' as const,
          data: {
            html: "<div class='h-full bg-gradient-to-r from-green-400 to-red-600'></div>",
            className: 'h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: duration - Math.min(2, duration * 0.4),
            },
          },
          effects: [
            {
              id: `energy-scale-${energyFillId}`,
              componentId: 'generic',
              data: {
                type: 'ease-out' as const,
                start: 0,
                duration: 2,
                mode: 'provider' as const,
                targetIds: [energyFillId],
                ranges: [
                  { key: 'scaleX', val: 0, prog: 0 },
                  { key: 'scaleX', val: energyLevel, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData);

    // Trajectory lines
    if (highlight.trajectoryPath && highlight.trajectoryPath.length > 0) {
      const trajectoryId = `${momentId}-trajectory`;
      const trajectoryDots = highlight.trajectoryPath.map((point, pointIndex) => {
        const dotId = `${trajectoryId}-dot-${pointIndex}`;
        return {
          id: dotId,
          componentId: 'HTMLBlockAtom',
          type: 'atom' as const,
          data: {
            html: "<div class='w-3 h-3 bg-yellow-400 rounded-full shadow-lg'></div>",
            className: 'absolute',
            style: {
              left: point.x,
              top: point.y,
            },
          },
          context: {
            timing: {
              start: pointIndex * 0.15,
              duration: duration - (pointIndex * 0.15),
            },
          },
          effects: [
            {
              id: `dot-fade-${dotId}`,
              componentId: 'generic',
              data: {
                type: 'ease-out' as const,
                start: 0,
                duration: 0.2,
                mode: 'provider' as const,
                targetIds: [dotId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData;
      });

      children.push({
        id: trajectoryId,
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: Math.min(3, duration * 0.5),
            duration: duration - Math.min(3, duration * 0.5),
          },
        },
        childrenData: trajectoryDots,
      } as RenderableComponentData);
    }

    // Camera flash
    children.push(createCameraFlash(`${momentId}-flash`));

    // Return highlight moment container
    const momentContainer: RenderableComponentData = {
      id: momentId,
      componentId: 'BaseLayout',
      type: 'layout' as const,
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
        },
      },
      context: {
        timing: {
          start: cumulativeStart,
          duration,
        },
      },
      childrenData: children,
    };

    cumulativeStart += duration;
    return momentContainer;
  });

  // Build final composition
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gradient-to-br from-gray-900 to-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: cumulativeStart,
      },
    },
    childrenData: [
      {
        id: `${trackName}-sequence`,
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: cumulativeStart,
          },
        },
        childrenData: highlightMoments,
      } as RenderableComponentData,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'sportsHighlightReel',
  title: 'Sports Highlight Reel',
  description: 'High-energy sports broadcast preset with impact zoom, motion blur, multi-angle replays, stat overlays, player cards, energy bars, trajectory lines, and camera flash effects. Creates explosive sports highlight reels with constant motion and information delivery.',
  type: 'predefined',
  presetType: 'children',
  tags: ['sports', 'highlights', 'broadcast', 'action', 'replay', 'stats', 'energy', 'dynamic'],
  dependencies: {},
  defaultInputParams: {
    highlights: [
      {
        mainImage: { src: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1920&h=1080&fit=crop' },
        replayAngles: [
          { src: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1920&h=1080&fit=crop', objectPosition: 'center top' },
          { src: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1920&h=1080&fit=crop', objectPosition: 'center center' },
          { src: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1920&h=1080&fit=crop', objectPosition: 'center bottom' },
        ],
        playerCard: {
          name: 'PLAYER NAME',
          stat1: 'Position: Forward',
          stat2: 'Points: 28',
        },
        statOverlay: {
          text: 'GAME WINNER',
        },
        countdown: '0:03',
        energyLevel: 0.9,
        trajectoryPath: [
          { x: '30%', y: '40%' },
          { x: '45%', y: '35%' },
          { x: '60%', y: '45%' },
          { x: '75%', y: '50%' },
        ],
        duration: 6,
      },
      {
        mainImage: { src: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=1920&h=1080&fit=crop' },
        playerCard: {
          name: 'ATHLETE 2',
          stat1: 'Speed: 98 km/h',
        },
        countdown: '1:45',
        energyLevel: 0.75,
        duration: 5,
      },
    ],
    trackName: 'sports-highlight',
    impactIntensity: 1,
  },
};

// Export preset
export const sportsHighlightReelPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};