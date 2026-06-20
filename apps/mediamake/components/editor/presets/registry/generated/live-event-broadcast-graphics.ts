/**
 * Live Event Broadcast Graphics Preset
 *
 * This preset creates professional broadcast-quality graphics for live events
 * featuring modular components including main title bar, scrolling ticker,
 * countdown timer, and score display. Includes metallic shine effects, gradient
 * wipes, and particle celebration systems for confetti and fireworks. All text
 * is locked to frame with GPU-accelerated transforms for rock-solid stability.
 *
 * Features:
 * - **Main Title Bar**: Gradient background with metallic shine sweep effect
 * - **Scrolling Ticker**: Continuous horizontal scroll with news-style ticker
 * - **Countdown Timer**: Individual digit display with tabular-nums for stability
 * - **Score Display**: Team names and scores with styled containers
 * - **Particle Celebrations**: Confetti and firework particle systems
 * - **Animated Backgrounds**: Gradient wipes and animated overlays
 * - **Broadcast-Quality Motion**: Smooth, professional, perfectly timed animations
 * - **GPU Acceleration**: All animated elements use transform: translateZ(0)
 *
 * Use cases:
 * - Olympics coverage graphics packages
 * - Award show broadcast overlays
 * - Sports event score displays
 * - Live event countdowns and announcements
 * - Professional broadcast-quality motion graphics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  eventTitle: z
    .string()
    .default('LIVE EVENT')
    .describe('Main title text for the event'),
  tickerMessage: z
    .string()
    .default('Breaking News • Latest Updates • Live Coverage • Real-Time Information')
    .describe('Scrolling ticker message (use • to separate items)'),
  countdown: z
    .object({
      hours: z.string().default('02').describe('Countdown hours (2 digits)'),
      minutes: z.string().default('30').describe('Countdown minutes (2 digits)'),
      seconds: z.string().default('00').describe('Countdown seconds (2 digits)'),
    })
    .optional()
    .describe('Countdown timer values'),
  score: z
    .object({
      teamAName: z.string().default('TEAM A').describe('Team A name'),
      teamAScore: z.string().default('00').describe('Team A score'),
      teamBName: z.string().default('TEAM B').describe('Team B name'),
      teamBScore: z.string().default('00').describe('Team B score'),
    })
    .optional()
    .describe('Score display values'),
  showCountdown: z
    .boolean()
    .default(true)
    .describe('Show countdown timer'),
  showScore: z
    .boolean()
    .default(true)
    .describe('Show score display'),
  showTicker: z
    .boolean()
    .default(true)
    .describe('Show scrolling ticker'),
  enableParticles: z
    .boolean()
    .default(true)
    .describe('Enable particle celebration effects'),
  particleTriggerTime: z
    .number()
    .default(5)
    .describe('Time in seconds when particles trigger'),
  duration: z
    .number()
    .default(30)
    .describe('Total duration of the broadcast graphics in seconds'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    eventTitle,
    tickerMessage,
    countdown,
    score,
    showCountdown,
    showScore,
    showTicker,
    enableParticles,
    particleTriggerTime,
    duration,
  } = params;

  // Helper: Create confetti particles
  const createConfettiParticles = (count: number = 50) => {
    const particles: RenderableComponentData[] = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];

    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const startX = Math.random() * 100; // 0-100%
      const startY = -10; // Start above viewport
      const endY = 110; // End below viewport
      const rotation = Math.random() * 720 - 360; // Random rotation
      const delay = Math.random() * 0.5; // Stagger delay
      const fallDuration = 3 + Math.random() * 2; // 3-5 seconds fall

      particles.push({
        id: `confetti-${i}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 10px; height: 10px; background: ${color}; border-radius: 2px;"></div>`,
          className: 'absolute',
          style: {
            left: `${startX}%`,
            top: `${startY}%`,
            transform: 'translateZ(0)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: fallDuration,
          },
        },
        effects: [
          {
            id: `confetti-fall-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: delay,
              duration: fallDuration - delay,
              mode: 'provider',
              targetIds: [`confetti-${i}`],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: endY - startY, prog: 1 },
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: (Math.random() * 40 - 20), prog: 1 }, // Drift left/right
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: rotation, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // Helper: Create firework burst particles
  const createFireworkParticles = (count: number = 30, centerX: number = 50, centerY: number = 50) => {
    const particles: RenderableComponentData[] = [];
    const colors = ['#FFD700', '#FF6347', '#4169E1', '#32CD32', '#FF1493'];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const distance = 30 + Math.random() * 20; // 30-50% distance
      const endX = centerX + Math.cos(angle) * distance;
      const endY = centerY + Math.sin(angle) * distance;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const delay = 0.1 * Math.floor(i / 6); // Stagger in groups
      const burstDuration = 1.5;

      particles.push({
        id: `firework-${i}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 8px; height: 8px; background: ${color}; border-radius: 50%; box-shadow: 0 0 10px ${color};"></div>`,
          className: 'absolute',
          style: {
            left: `${centerX}%`,
            top: `${centerY}%`,
            transform: 'translateZ(0)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: burstDuration,
          },
        },
        effects: [
          {
            id: `firework-burst-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: delay,
              duration: burstDuration - delay,
              mode: 'provider',
              targetIds: [`firework-${i}`],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: (endX - centerX), prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: (endY - centerY), prog: 1 },
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0.5, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return particles;
  };

  // Build children array
  const childrenData: RenderableComponentData[] = [];

  // ============================================================================
  // ANIMATED BACKGROUND
  // ============================================================================

  childrenData.push({
    id: 'animated-background',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      // Base gradient
      {
        id: 'bg-gradient-base',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute inset-0',
          style: {
            background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #db2777 100%)',
            opacity: 0.8,
            transform: 'translateZ(0)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      } as RenderableComponentData,
      // Animated sweep overlay
      {
        id: 'bg-gradient-sweep',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute inset-0',
          style: {
            background: 'linear-gradient(45deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
            backgroundSize: '200% 200%',
            transform: 'translateZ(0)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [
          {
            id: 'sweep-animation',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: 4,
              mode: 'provider',
              targetIds: ['bg-gradient-sweep'],
              ranges: [
                { key: 'backgroundPositionX', val: '0%', prog: 0 },
                { key: 'backgroundPositionX', val: '100%', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ] as RenderableComponentData[],
  } as RenderableComponentData);

  // ============================================================================
  // MAIN TITLE BAR
  // ============================================================================

  childrenData.push({
    id: 'main-title-bar',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-0 left-0 right-0 h-24',
        style: {
          background: 'linear-gradient(to right, #2563eb, #7c3aed, #db2777)',
          zIndex: 10,
          transform: 'translateZ(0)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'title-bar-slide-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 1,
          mode: 'provider',
          targetIds: ['main-title-bar'],
          ranges: [
            { key: 'translateY', val: -100, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'title-bar-content',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex items-center justify-center h-full px-8',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: [
          {
            id: 'main-title-text',
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: eventTitle,
              className: 'text-5xl font-black text-white drop-shadow-lg',
              style: {
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transform: 'translateZ(0)',
              },
              font: {
                family: 'Inter',
                weights: ['900'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
          } as RenderableComponentData,
        ] as RenderableComponentData[],
      } as RenderableComponentData,
      // Metallic shine overlay
      {
        id: 'metallic-shine-overlay',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            mixBlendMode: 'overlay',
            transform: 'translateZ(0)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [
          {
            id: 'metallic-shine-sweep',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 2,
              duration: 2,
              mode: 'provider',
              targetIds: ['metallic-shine-overlay'],
              ranges: [
                { key: 'backgroundPositionX', val: '0%', prog: 0 },
                { key: 'backgroundPositionX', val: '100%', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ] as RenderableComponentData[],
  } as RenderableComponentData);

  // ============================================================================
  // SCROLLING TICKER
  // ============================================================================

  if (showTicker) {
    childrenData.push({
      id: 'scrolling-ticker',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute bottom-0 left-0 right-0 h-12 overflow-hidden',
          style: {
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 10,
            transform: 'translateZ(0)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'ticker-slide-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.8,
            mode: 'provider',
            targetIds: ['scrolling-ticker'],
            ranges: [
              { key: 'translateY', val: 100, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'ticker-content',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex items-center h-full whitespace-nowrap',
              style: {
                transform: 'translateZ(0)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
          effects: [
            {
              id: 'ticker-scroll',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 1,
                duration: duration - 1,
                mode: 'provider',
                targetIds: ['ticker-content'],
                ranges: [
                  { key: 'translateX', val: '100%', prog: 0 },
                  { key: 'translateX', val: '-100%', prog: 1 },
                ],
              },
            },
          ],
          childrenData: [
            {
              id: 'ticker-text',
              type: 'atom' as const,
              componentId: 'TextAtom',
              data: {
                text: tickerMessage,
                className: 'text-xl font-bold text-white',
                style: {
                  paddingLeft: '100%',
                },
                font: {
                  family: 'Inter',
                  weights: ['700'],
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration,
                },
              },
            } as RenderableComponentData,
          ] as RenderableComponentData[],
        } as RenderableComponentData,
      ] as RenderableComponentData[],
    } as RenderableComponentData);
  }

  // ============================================================================
  // COUNTDOWN TIMER
  // ============================================================================

  if (showCountdown && countdown) {
    childrenData.push({
      id: 'countdown-timer',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-32 right-8 flex gap-2',
          style: {
            zIndex: 20,
            transform: 'translateZ(0)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'countdown-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 1.5,
            duration: 0.8,
            mode: 'provider',
            targetIds: ['countdown-timer'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'countdown-hours',
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: countdown.hours,
            className: 'text-6xl font-black text-white',
            style: {
              fontVariantNumeric: 'tabular-nums',
              backgroundColor: 'rgba(0,0,0,0.6)',
              padding: '8px 16px',
              borderRadius: '8px',
              transform: 'translateZ(0)',
            },
            font: {
              family: 'Inter',
              weights: ['900'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
        } as RenderableComponentData,
        {
          id: 'countdown-separator-1',
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: ':',
            className: 'text-6xl font-black text-white',
            style: {
              transform: 'translateZ(0)',
            },
            font: {
              family: 'Inter',
              weights: ['900'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
        } as RenderableComponentData,
        {
          id: 'countdown-minutes',
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: countdown.minutes,
            className: 'text-6xl font-black text-white',
            style: {
              fontVariantNumeric: 'tabular-nums',
              backgroundColor: 'rgba(0,0,0,0.6)',
              padding: '8px 16px',
              borderRadius: '8px',
              transform: 'translateZ(0)',
            },
            font: {
              family: 'Inter',
              weights: ['900'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
        } as RenderableComponentData,
        {
          id: 'countdown-separator-2',
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: ':',
            className: 'text-6xl font-black text-white',
            style: {
              transform: 'translateZ(0)',
            },
            font: {
              family: 'Inter',
              weights: ['900'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
        } as RenderableComponentData,
        {
          id: 'countdown-seconds',
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: countdown.seconds,
            className: 'text-6xl font-black text-white',
            style: {
              fontVariantNumeric: 'tabular-nums',
              backgroundColor: 'rgba(0,0,0,0.6)',
              padding: '8px 16px',
              borderRadius: '8px',
              transform: 'translateZ(0)',
            },
            font: {
              family: 'Inter',
              weights: ['900'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
        } as RenderableComponentData,
      ] as RenderableComponentData[],
    } as RenderableComponentData);
  }

  // ============================================================================
  // SCORE DISPLAY
  // ============================================================================

  if (showScore && score) {
    childrenData.push({
      id: 'score-display',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-32 left-8 flex items-center gap-4',
          style: {
            zIndex: 20,
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: '16px 24px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            transform: 'translateZ(0)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'score-slide-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 1.5,
            duration: 0.8,
            mode: 'provider',
            targetIds: ['score-display'],
            ranges: [
              { key: 'translateX', val: -200, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'team-a-score',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-col items-center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
          childrenData: [
            {
              id: 'team-a-name',
              type: 'atom' as const,
              componentId: 'TextAtom',
              data: {
                text: score.teamAName,
                className: 'text-lg font-bold text-gray-300',
                style: {
                  textTransform: 'uppercase',
                },
                font: {
                  family: 'Inter',
                  weights: ['700'],
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration,
                },
              },
            } as RenderableComponentData,
            {
              id: 'team-a-points',
              type: 'atom' as const,
              componentId: 'TextAtom',
              data: {
                text: score.teamAScore,
                className: 'text-5xl font-black text-white',
                style: {
                  fontVariantNumeric: 'tabular-nums',
                },
                font: {
                  family: 'Inter',
                  weights: ['900'],
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration,
                },
              },
            } as RenderableComponentData,
          ] as RenderableComponentData[],
        } as RenderableComponentData,
        {
          id: 'score-separator',
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: '-',
            className: 'text-5xl font-bold text-gray-500 mx-4',
            font: {
              family: 'Inter',
              weights: ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
        } as RenderableComponentData,
        {
          id: 'team-b-score',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-col items-center',
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
          childrenData: [
            {
              id: 'team-b-name',
              type: 'atom' as const,
              componentId: 'TextAtom',
              data: {
                text: score.teamBName,
                className: 'text-lg font-bold text-gray-300',
                style: {
                  textTransform: 'uppercase',
                },
                font: {
                  family: 'Inter',
                  weights: ['700'],
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration,
                },
              },
            } as RenderableComponentData,
            {
              id: 'team-b-points',
              type: 'atom' as const,
              componentId: 'TextAtom',
              data: {
                text: score.teamBScore,
                className: 'text-5xl font-black text-white',
                style: {
                  fontVariantNumeric: 'tabular-nums',
                },
                font: {
                  family: 'Inter',
                  weights: ['900'],
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration,
                },
              },
            } as RenderableComponentData,
          ] as RenderableComponentData[],
        } as RenderableComponentData,
      ] as RenderableComponentData[],
    } as RenderableComponentData);
  }

  // ============================================================================
  // PARTICLE CELEBRATION LAYER
  // ============================================================================

  if (enableParticles) {
    const confettiParticles = createConfettiParticles(50);
    const fireworkParticles1 = createFireworkParticles(30, 30, 30);
    const fireworkParticles2 = createFireworkParticles(30, 70, 30);

    childrenData.push({
      id: 'particle-celebration-layer',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-hidden',
          style: {
            zIndex: 30,
            transform: 'translateZ(0)',
          },
        },
      },
      context: {
        timing: {
          start: particleTriggerTime,
          duration: 5, // Particles last 5 seconds
        },
      },
      childrenData: [
        {
          id: 'confetti-particle-group',
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
              duration: 5,
            },
          },
          childrenData: confettiParticles,
        } as RenderableComponentData,
        {
          id: 'firework-burst-group-1',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          context: {
            timing: {
              start: 0.5,
              duration: 2,
            },
          },
          childrenData: fireworkParticles1,
        } as RenderableComponentData,
        {
          id: 'firework-burst-group-2',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
            },
          },
          context: {
            timing: {
              start: 1,
              duration: 2,
            },
          },
          childrenData: fireworkParticles2,
        } as RenderableComponentData,
      ] as RenderableComponentData[],
    } as RenderableComponentData);
  }

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'live-event-broadcast-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          transform: 'translateZ(0)',
          backgroundColor: '#0a0a0a',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
        fitDurationTo: 'input',
      },
    },
    childrenData,
  };

  return {
    output: {
      childrenData: [rootContainer],
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
  id: 'live-event-broadcast-graphics',
  title: 'Live Event Broadcast Graphics',
  description:
    'Professional broadcast-quality graphics preset for live events featuring modular components including title bar, scrolling ticker, countdown timer, and score display. Includes metallic shine effects, gradient wipes, and particle celebration systems for confetti and fireworks. All text is locked to frame with GPU-accelerated transforms for rock-solid stability.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'broadcast',
    'live-event',
    'title-bar',
    'ticker',
    'countdown',
    'score',
    'particles',
    'professional',
    'motion-graphics',
    'olympics',
    'award-show',
    'sports',
  ],
  dependencies: {},
  defaultInputParams: {
    eventTitle: 'LIVE EVENT',
    tickerMessage: 'Breaking News • Latest Updates • Live Coverage • Real-Time Information',
    countdown: {
      hours: '02',
      minutes: '30',
      seconds: '00',
    },
    score: {
      teamAName: 'TEAM A',
      teamAScore: '00',
      teamBName: 'TEAM B',
      teamBScore: '00',
    },
    showCountdown: true,
    showScore: true,
    showTicker: true,
    enableParticles: true,
    particleTriggerTime: 5,
    duration: 30,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const liveEventBroadcastGraphicsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};