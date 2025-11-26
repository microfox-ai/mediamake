/**
 * CRT Channel Switch Transition Preset
 *
 * A retro-futuristic CRT monitor glitch transition that simulates switching between different
 * gaming channels or broadcasts. This preset recreates the aesthetic of old-school video editing
 * effects with modern neon gaming aesthetics.
 *
 * Features:
 * - **RGB Channel Separation**: Simulates chromatic aberration with separate red, green, and blue channels
 * - **Signal Degradation**: Horizontal hold issues, phosphor bloom, and image slipping effects
 * - **Channel Change Effect**: Brief static and color bar patterns during transition
 * - **VHS-Style Elements**: Tracking lines, scan lines, and noise textures
 * - **CRT Distortion**: Perspective transform and curved screen effect
 * - **Chromatic Aberration**: Edge distortion with RGB separation
 * - **On-Screen Display**: Channel indicator and signal strength bars in neon colors
 *
 * Use cases:
 * - Gaming montage transitions
 * - Retro-themed video content
 * - Broadcast-style channel switching effects
 * - 80s/90s aesthetic video production
 * - Glitch art and vaporwave visuals
 */

import { z } from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---
const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL for the outgoing video/image'),
  incomingVideoSrc: z.string().describe('Source URL for the incoming video/image'),
  channelNumber: z.string().default('02').describe('Channel number to display (e.g., "02", "05")'),
  transitionDuration: z.number().default(2.0).describe('Total duration of the transition effect in seconds'),
  rgbSeparationIntensity: z.number().default(1.0).describe('Intensity multiplier for RGB channel separation (0.5-2.0)'),
  staticIntensity: z.number().default(0.7).describe('Opacity intensity of static noise (0.0-1.0)'),
  glitchIntensity: z.number().default(1.0).describe('Overall intensity multiplier for glitch effects (0.5-2.0)'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    channelNumber,
    transitionDuration,
    rgbSeparationIntensity,
    staticIntensity,
    glitchIntensity,
  } = params;

  // Calculate phase timings (percentages of total duration)
  const phase1End = transitionDuration * 0.4; // Signal degradation: 0-40%
  const phase2Start = transitionDuration * 0.4; // Channel change: 40-60%
  const phase2End = transitionDuration * 0.6;
  const phase3Start = transitionDuration * 0.6; // Signal tuning: 60-100%

  // Base RGB separation offsets
  const baseRgbOffset = 3 * rgbSeparationIntensity;
  const maxRgbOffset = 10 * rgbSeparationIntensity;

  // Effect IDs
  const effectIdCounter = { current: 0 };
  const generateEffectId = () => `crt-effect-${effectIdCounter.current++}`;

  // --- Phase 1: Signal Degradation Effects (Outgoing Scene) ---
  
  // RGB separation increase on outgoing scene
  const outgoingRgbDegradationEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'ease-in',
      start: 0,
      duration: phase1End,
      mode: 'provider' as const,
      targetIds: ['outgoing-red-channel', 'outgoing-blue-channel'],
      ranges: [
        { key: 'transform', val: `translateX(-${baseRgbOffset}px)`, prog: 0 },
        { key: 'transform', val: `translateX(-${maxRgbOffset}px)`, prog: 1 },
      ],
    },
  };

  const outgoingBlueChannelEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'ease-in',
      start: 0,
      duration: phase1End,
      mode: 'provider' as const,
      targetIds: ['outgoing-blue-channel'],
      ranges: [
        { key: 'transform', val: `translateX(${baseRgbOffset}px)`, prog: 0 },
        { key: 'transform', val: `translateX(${maxRgbOffset}px)`, prog: 1 },
      ],
    },
  };

  // Phosphor bloom intensity increase
  const phosphorBloomEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'ease-in',
      start: 0,
      duration: phase1End,
      mode: 'provider' as const,
      targetIds: ['phosphor-bloom-layer'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.6 * glitchIntensity, prog: 1 },
      ],
    },
  };

  // Horizontal hold distortion animation
  const horizontalHoldEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: phase1End,
      mode: 'provider' as const,
      targetIds: ['horizontal-hold-distortion'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.8, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
        { key: 'transform', val: 'translateY(0px)', prog: 0 },
        { key: 'transform', val: 'translateY(200px)', prog: 1 },
      ],
    },
  };

  // Outgoing scene fade out
  const outgoingFadeEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: phase2Start,
      duration: phase2End - phase2Start,
      mode: 'provider' as const,
      targetIds: ['outgoing-scene-rgb'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // --- Phase 2: Channel Change Effects ---

  // Static layer flash
  const staticFlashEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'linear',
      start: phase2Start,
      duration: phase2End - phase2Start,
      mode: 'provider' as const,
      targetIds: ['static-layer'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: staticIntensity, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Color bars flash
  const colorBarsEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'linear',
      start: phase2Start,
      duration: phase2End - phase2Start,
      mode: 'provider' as const,
      targetIds: ['signal-bars-container'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 0.7 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // VHS tracking lines scroll
  const vhsTrackingEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'linear',
      start: phase2Start,
      duration: phase2End - phase2Start,
      mode: 'provider' as const,
      targetIds: ['vhs-tracking-lines'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.8, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
        { key: 'transform', val: 'translateY(0px)', prog: 0 },
        { key: 'transform', val: 'translateY(-100px)', prog: 1 },
      ],
    },
  };

  // --- Phase 3: Signal Tuning Effects (Incoming Scene) ---

  // Incoming scene fade in
  const incomingFadeEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: phase3Start,
      duration: transitionDuration - phase3Start,
      mode: 'provider' as const,
      targetIds: ['incoming-scene-rgb'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // RGB separation decrease on incoming scene
  const incomingRgbTuningEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: phase3Start,
      duration: transitionDuration - phase3Start,
      mode: 'provider' as const,
      targetIds: ['incoming-red-channel'],
      ranges: [
        { key: 'transform', val: `translateX(-${maxRgbOffset}px)`, prog: 0 },
        { key: 'transform', val: `translateX(-${baseRgbOffset}px)`, prog: 1 },
      ],
    },
  };

  const incomingBlueTuningEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: phase3Start,
      duration: transitionDuration - phase3Start,
      mode: 'provider' as const,
      targetIds: ['incoming-blue-channel'],
      ranges: [
        { key: 'transform', val: `translateX(${maxRgbOffset}px)`, prog: 0 },
        { key: 'transform', val: `translateX(${baseRgbOffset}px)`, prog: 1 },
      ],
    },
  };

  // Phosphor bloom fade out
  const phosphorFadeOutEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: phase3Start,
      duration: transitionDuration - phase3Start,
      mode: 'provider' as const,
      targetIds: ['phosphor-bloom-layer'],
      ranges: [
        { key: 'opacity', val: 0.6 * glitchIntensity, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Channel indicator reveal (typewriter style)
  const channelIndicatorEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: phase2Start,
      duration: 0.5,
      mode: 'provider' as const,
      targetIds: ['channel-indicator'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'transform', val: 'translateX(20px)', prog: 0 },
        { key: 'transform', val: 'translateX(0px)', prog: 1 },
      ],
    },
  };

  // Signal strength animation
  const signalStrengthEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: phase3Start,
      duration: transitionDuration - phase3Start,
      mode: 'provider' as const,
      targetIds: ['signal-bar-4', 'signal-bar-5'],
      ranges: [
        { key: 'opacity', val: 0.3, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Scanlines subtle animation (continuous)
  const scanlinesEffect = {
    id: generateEffectId(),
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: transitionDuration,
      mode: 'provider' as const,
      targetIds: ['scanlines-overlay'],
      ranges: [
        { key: 'transform', val: 'translateY(0px)', prog: 0 },
        { key: 'transform', val: 'translateY(4px)', prog: 1 },
      ],
    },
  };

  // --- Build Component Tree ---

  const rootContainer: RenderableComponentData = {
    id: 'crt-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden rounded-lg',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      outgoingRgbDegradationEffect,
      outgoingBlueChannelEffect,
      phosphorBloomEffect,
      horizontalHoldEffect,
      outgoingFadeEffect,
      staticFlashEffect,
      colorBarsEffect,
      vhsTrackingEffect,
      incomingFadeEffect,
      incomingRgbTuningEffect,
      incomingBlueTuningEffect,
      phosphorFadeOutEffect,
      channelIndicatorEffect,
      signalStrengthEffect,
      scanlinesEffect,
    ],
    childrenData: [
      {
        id: 'crt-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 origin-center',
            style: {
              perspective: '1000px',
              transform: 'rotateY(2deg) rotateX(1deg)',
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
          // Scene container with RGB channels
          {
            id: 'scene-container',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
            childrenData: [
              // Outgoing scene RGB channels
              {
                id: 'outgoing-scene-rgb',
                type: 'layout',
                componentId: 'BaseLayout',
                data: {
                  containerProps: {
                    className: 'absolute inset-0',
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
                    id: 'outgoing-red-channel',
                    type: 'atom',
                    componentId: 'VideoAtom',
                    data: {
                      src: outgoingVideoSrc,
                      containerProps: {
                        className: 'absolute inset-0 mix-blend-screen',
                        style: {
                          filter: 'hue-rotate(-30deg) saturate(2)',
                        },
                      },
                    },
                    context: {
                      timing: {
                        start: 0,
                        duration: transitionDuration,
                      },
                    },
                  },
                  {
                    id: 'outgoing-green-channel',
                    type: 'atom',
                    componentId: 'VideoAtom',
                    data: {
                      src: outgoingVideoSrc,
                      containerProps: {
                        className: 'absolute inset-0 mix-blend-screen',
                        style: {
                          filter: 'hue-rotate(90deg) saturate(1.5)',
                        },
                      },
                    },
                    context: {
                      timing: {
                        start: 0,
                        duration: transitionDuration,
                      },
                    },
                  },
                  {
                    id: 'outgoing-blue-channel',
                    type: 'atom',
                    componentId: 'VideoAtom',
                    data: {
                      src: outgoingVideoSrc,
                      containerProps: {
                        className: 'absolute inset-0 mix-blend-screen',
                        style: {
                          filter: 'hue-rotate(210deg) saturate(2)',
                        },
                      },
                    },
                    context: {
                      timing: {
                        start: 0,
                        duration: transitionDuration,
                      },
                    },
                  },
                ] as RenderableComponentData[],
              },
              // Incoming scene RGB channels
              {
                id: 'incoming-scene-rgb',
                type: 'layout',
                componentId: 'BaseLayout',
                data: {
                  containerProps: {
                    className: 'absolute inset-0 opacity-0',
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
                    id: 'incoming-red-channel',
                    type: 'atom',
                    componentId: 'VideoAtom',
                    data: {
                      src: incomingVideoSrc,
                      containerProps: {
                        className: 'absolute inset-0 mix-blend-screen',
                        style: {
                          filter: 'hue-rotate(-30deg) saturate(2)',
                        },
                      },
                    },
                    context: {
                      timing: {
                        start: 0,
                        duration: transitionDuration,
                      },
                    },
                  },
                  {
                    id: 'incoming-green-channel',
                    type: 'atom',
                    componentId: 'VideoAtom',
                    data: {
                      src: incomingVideoSrc,
                      containerProps: {
                        className: 'absolute inset-0 mix-blend-screen',
                        style: {
                          filter: 'hue-rotate(90deg) saturate(1.5)',
                        },
                      },
                    },
                    context: {
                      timing: {
                        start: 0,
                        duration: transitionDuration,
                      },
                    },
                  },
                  {
                    id: 'incoming-blue-channel',
                    type: 'atom',
                    componentId: 'VideoAtom',
                    data: {
                      src: incomingVideoSrc,
                      containerProps: {
                        className: 'absolute inset-0 mix-blend-screen',
                        style: {
                          filter: 'hue-rotate(210deg) saturate(2)',
                        },
                      },
                    },
                    context: {
                      timing: {
                        start: 0,
                        duration: transitionDuration,
                      },
                    },
                  },
                ] as RenderableComponentData[],
              },
            ] as RenderableComponentData[],
          },
          // Scanlines overlay
          {
            id: 'scanlines-overlay',
            type: 'atom',
            componentId: 'ShapeAtom',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none z-20 opacity-40',
                style: {
                  backgroundImage:
                    'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)',
                  backgroundSize: '100% 4px',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          },
          // Static layer
          {
            id: 'static-layer',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none z-30 opacity-0',
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
                id: 'static-noise-overlay',
                type: 'atom',
                componentId: 'ShapeAtom',
                data: {
                  containerProps: {
                    className: 'absolute inset-0',
                    style: {
                      backgroundImage:
                        'repeating-conic-gradient(from 0deg, rgba(255,255,255,0.1) 0deg 1deg, transparent 1deg 2deg)',
                      backgroundSize: '8px 8px',
                      mixBlendMode: 'overlay',
                    },
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              },
            ] as RenderableComponentData[],
          },
          // VHS tracking lines
          {
            id: 'vhs-tracking-lines',
            type: 'atom',
            componentId: 'ShapeAtom',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none z-20 opacity-0',
                style: {
                  backgroundImage:
                    'linear-gradient(to bottom, transparent 0%, transparent 45%, rgba(255,255,255,0.15) 50%, transparent 55%, transparent 100%)',
                  backgroundSize: '100% 20px',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          },
          // Phosphor bloom layer
          {
            id: 'phosphor-bloom-layer',
            type: 'atom',
            componentId: 'ShapeAtom',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none z-10 opacity-0',
                style: {
                  background: 'radial-gradient(ellipse at center, rgba(0,255,255,0.1) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          },
          // Signal bars (color bars)
          {
            id: 'signal-bars-container',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0 flex flex-row z-40 opacity-0',
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
                id: 'color-bar-1',
                type: 'atom',
                componentId: 'ShapeAtom',
                data: {
                  containerProps: {
                    className: 'flex-1 h-full',
                    style: { backgroundColor: '#c0c0c0' },
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              },
              {
                id: 'color-bar-2',
                type: 'atom',
                componentId: 'ShapeAtom',
                data: {
                  containerProps: {
                    className: 'flex-1 h-full',
                    style: { backgroundColor: '#c0c000' },
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              },
              {
                id: 'color-bar-3',
                type: 'atom',
                componentId: 'ShapeAtom',
                data: {
                  containerProps: {
                    className: 'flex-1 h-full',
                    style: { backgroundColor: '#00c0c0' },
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              },
              {
                id: 'color-bar-4',
                type: 'atom',
                componentId: 'ShapeAtom',
                data: {
                  containerProps: {
                    className: 'flex-1 h-full',
                    style: { backgroundColor: '#00c000' },
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              },
              {
                id: 'color-bar-5',
                type: 'atom',
                componentId: 'ShapeAtom',
                data: {
                  containerProps: {
                    className: 'flex-1 h-full',
                    style: { backgroundColor: '#c000c0' },
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              },
              {
                id: 'color-bar-6',
                type: 'atom',
                componentId: 'ShapeAtom',
                data: {
                  containerProps: {
                    className: 'flex-1 h-full',
                    style: { backgroundColor: '#c00000' },
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              },
              {
                id: 'color-bar-7',
                type: 'atom',
                componentId: 'ShapeAtom',
                data: {
                  containerProps: {
                    className: 'flex-1 h-full',
                    style: { backgroundColor: '#0000c0' },
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              },
            ] as RenderableComponentData[],
          },
          // Channel indicator
          {
            id: 'channel-indicator',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: `CHANNEL ${channelNumber}`,
              style: {
                fontSize: '20px',
                color: '#00ffff',
                textShadow: '0 0 10px rgba(0,255,255,0.8)',
              },
              font: {
                family: 'Courier New',
              },
              containerProps: {
                className: 'absolute top-4 right-4 font-mono text-cyan-400 text-xl z-50',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          },
          // Signal strength indicator
          {
            id: 'signal-strength-indicator',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute top-4 left-4 flex flex-row gap-1 z-50',
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
                id: 'signal-bar-1',
                type: 'atom',
                componentId: 'ShapeAtom',
                data: {
                  containerProps: {
                    className: 'w-1 h-2 bg-cyan-400 rounded-sm',
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              },
              {
                id: 'signal-bar-2',
                type: 'atom',
                componentId: 'ShapeAtom',
                data: {
                  containerProps: {
                    className: 'w-1 h-3 bg-cyan-400 rounded-sm',
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              },
              {
                id: 'signal-bar-3',
                type: 'atom',
                componentId: 'ShapeAtom',
                data: {
                  containerProps: {
                    className: 'w-1 h-4 bg-cyan-400 rounded-sm',
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              },
              {
                id: 'signal-bar-4',
                type: 'atom',
                componentId: 'ShapeAtom',
                data: {
                  containerProps: {
                    className: 'w-1 h-5 bg-cyan-400 rounded-sm opacity-50',
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              },
              {
                id: 'signal-bar-5',
                type: 'atom',
                componentId: 'ShapeAtom',
                data: {
                  containerProps: {
                    className: 'w-1 h-6 bg-cyan-400 rounded-sm opacity-30',
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: transitionDuration,
                  },
                },
              },
            ] as RenderableComponentData[],
          },
          // Chromatic aberration edges
          {
            id: 'chromatic-aberration-edges',
            type: 'atom',
            componentId: 'ShapeAtom',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none z-30',
                style: {
                  boxShadow:
                    'inset 0 0 60px 20px rgba(0,0,0,0.5), inset 3px 0 20px rgba(255,0,0,0.2), inset -3px 0 20px rgba(0,0,255,0.2)',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          },
          // Horizontal hold distortion
          {
            id: 'horizontal-hold-distortion',
            type: 'atom',
            componentId: 'ShapeAtom',
            data: {
              containerProps: {
                className: 'absolute left-0 right-0 h-8 pointer-events-none z-20 opacity-0',
                style: {
                  top: '30%',
                  background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.2), transparent)',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          },
        ] as RenderableComponentData[],
      },
    ] as RenderableComponentData[],
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'crt-channel-switch-transition',
  title: 'CRT Channel Switch Transition',
  description:
    'A retro-futuristic CRT monitor glitch transition that simulates switching between gaming channels or broadcasts. Features RGB separation, static noise, rolling scan lines, VHS tracking, chromatic aberration, horizontal hold distortion, phosphor bloom effects, and color bar patterns - all with modern neon gaming aesthetics. Includes on-screen channel indicators and signal strength displays.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'crt',
    'glitch',
    'retro',
    'gaming',
    'channel-switch',
    'rgb-separation',
    'vhs',
    'scanlines',
    'neon',
    'broadcast',
    'video',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing-video.mp4',
    incomingVideoSrc: 'https://example.com/incoming-video.mp4',
    channelNumber: '02',
    transitionDuration: 2.0,
    rgbSeparationIntensity: 1.0,
    staticIntensity: 0.7,
    glitchIntensity: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---
export const crtChannelSwitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
