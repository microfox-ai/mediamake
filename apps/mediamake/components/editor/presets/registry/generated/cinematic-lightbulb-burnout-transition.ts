/**
 * Cinematic Lightbulb Burnout Transition Preset
 *
 * A dramatic transition effect simulating an old incandescent bulb failing between scenes.
 * The outgoing video gradually loses brightness from edges inward (vignette effect increasing)
 * while flickering desperately, culminating in a bright flash before going dark.
 * The incoming video then 'turns on' with a warm tungsten glow that starts from center and
 * expands outward, with initial startup flickers that stabilize.
 *
 * Features:
 * - Radial vignette effect increasing on outgoing video
 * - Desperate flicker pattern before burnout
 * - Bright flash at transition point
 * - Warm tungsten glow expanding from center on incoming video
 * - Filament-like overlay graphics that glow and dim
 * - Swinging bulb shadow simulation
 * - Startup flickers that stabilize on incoming video
 *
 * Technical Implementation:
 * - BaseLayout with radial gradient overlay using HTMLBlockAtom
 * - Outgoing VideoAtom with increasing vignette via filter animation
 * - Opacity flicker effects (100ms intervals) getting more frequent
 * - Flash effect at transition point (1.8s mark)
 * - Incoming video with reverse vignette: center bright expanding outward via clip-path circle
 * - Filament graphic using HTMLBlockAtom with SVG and glow filter
 * - Swinging motion via rotation transform (-2deg to 2deg)
 * - Shadow simulation using offset VideoAtom with blur
 *
 * Use Cases:
 * - Dramatic scene transitions in narrative videos
 * - Vintage-style film effects
 * - Power outage / electricity themed content
 * - Retro aesthetic video projects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z
    .object({
      src: z.string().describe('Source URL of the outgoing video'),
      startFrom: z
        .number()
        .optional()
        .describe('Start time of outgoing video in seconds'),
      endAt: z.number().optional().describe('End time of outgoing video'),
      volume: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Volume of outgoing video (0-1)'),
    })
    .describe('Outgoing video configuration'),

  incomingVideo: z
    .object({
      src: z.string().describe('Source URL of the incoming video'),
      startFrom: z
        .number()
        .optional()
        .describe('Start time of incoming video in seconds'),
      endAt: z.number().optional().describe('End time of incoming video'),
      volume: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Volume of incoming video (0-1)'),
    })
    .describe('Incoming video configuration'),

  transitionDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Total transition duration in seconds'),

  burnoutDuration: z
    .number()
    .min(1)
    .max(4)
    .default(2)
    .describe('Duration of burnout phase (outgoing video)'),

  overlapDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.5)
    .describe('Overlap between outgoing and incoming videos'),

  flickerIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.7)
    .describe('Intensity of flickering effect (0.1-1)'),

  flashIntensity: z
    .number()
    .min(0.5)
    .max(1)
    .default(1)
    .describe('Intensity of the flash effect (0.5-1)'),

  glowColor: z
    .string()
    .default('rgba(255, 200, 100, 0.8)')
    .describe('Color of the tungsten glow'),

  swingIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Intensity of the swinging motion in degrees'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    burnoutDuration,
    overlapDuration,
    flickerIntensity,
    flashIntensity,
    glowColor,
    swingIntensity,
  } = params;

  // Calculate timing
  const flashStart = burnoutDuration - 0.2;
  const flashDuration = 0.2;
  const incomingStart = burnoutDuration - overlapDuration;
  const incomingExpandDuration = transitionDuration - burnoutDuration + overlapDuration;

  // Helper function to create flicker keyframes
  const createFlickerKeyframes = (): Array<{ key: string; val: number; prog: number }> => {
    const keyframes: Array<{ key: string; val: number; prog: number }> = [];
    const flickerCount = 12;
    
    for (let i = 0; i <= flickerCount; i++) {
      const prog = i / flickerCount;
      const intensity = prog * flickerIntensity;
      const randomFlicker = Math.random() * 0.3 * intensity;
      const opacity = 1 - randomFlicker;
      keyframes.push({ key: 'opacity', val: Math.max(0.3, opacity), prog });
    }
    
    return keyframes;
  };

  // Create outgoing video with vignette and flicker
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom || 0,
      endAt: outgoingVideo.endAt,
      volume: outgoingVideo.volume || 1,
      fit: 'cover',
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: burnoutDuration,
      },
    },
    effects: [
      // Vignette effect (brightness decreasing)
      {
        id: 'outgoing-vignette',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: burnoutDuration - 0.5,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter', val: 'brightness(100%) contrast(100%)', prog: 0 },
            { key: 'filter', val: 'brightness(20%) contrast(150%)', prog: 1 },
          ],
        },
      },
      // Desperate flicker
      {
        id: 'outgoing-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: burnoutDuration - 1,
          duration: 1,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: createFlickerKeyframes(),
        },
      },
      // Final fade to black before flash
      {
        id: 'outgoing-fade',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: flashStart - 0.1,
          duration: 0.1,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing vignette overlay
  const outgoingVignetteOverlay: RenderableComponentData = {
    id: 'outgoing-vignette-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 0%, transparent 20%, rgba(0,0,0,0.9) 100%); pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: { pointerEvents: 'none' },
    },
    context: {
      timing: {
        start: 0,
        duration: burnoutDuration,
      },
    },
    effects: [
      {
        id: 'vignette-increase',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: burnoutDuration - 0.5,
          mode: 'provider',
          targetIds: ['outgoing-vignette-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Flash overlay
  const flashOverlay: RenderableComponentData = {
    id: 'flash-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="position: absolute; inset: 0; background: white; pointer-events: none;"></div>',
      className: 'absolute inset-0',
      style: { pointerEvents: 'none' },
    },
    context: {
      timing: {
        start: flashStart,
        duration: flashDuration,
      },
    },
    effects: [
      {
        id: 'flash-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: flashDuration,
          mode: 'provider',
          targetIds: ['flash-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: flashIntensity, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video with reverse vignette (expanding from center)
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      startFrom: incomingVideo.startFrom || 0,
      endAt: incomingVideo.endAt,
      volume: incomingVideo.volume || 1,
      fit: 'cover',
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingExpandDuration,
      },
    },
    effects: [
      // Expand from center using clip-path
      {
        id: 'incoming-expand',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: incomingExpandDuration * 0.6,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'clipPath', val: 'circle(0% at center)', prog: 0 },
            { key: 'clipPath', val: 'circle(100% at center)', prog: 1 },
          ],
        },
      },
      // Startup flickers
      {
        id: 'incoming-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.5,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 0.8, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.9, prog: 0.7 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming glow overlay
  const incomingGlowOverlay: RenderableComponentData = {
    id: 'incoming-glow-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background: radial-gradient(circle at center, ${glowColor} 0%, transparent 50%); pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: { pointerEvents: 'none' },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingExpandDuration,
      },
    },
    effects: [
      {
        id: 'glow-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: incomingExpandDuration,
          mode: 'provider',
          targetIds: ['incoming-glow-overlay'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Filament overlay graphic
  const filamentGraphic: RenderableComponentData = {
    id: 'filament-graphic',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg width="200" height="200" viewBox="0 0 200 200" style="filter: drop-shadow(0 0 10px rgba(255,165,0,0.8));">
        <path d="M100,50 Q110,75 100,100 Q90,125 100,150" stroke="rgba(255,200,100,0.9)" stroke-width="3" fill="none"/>
        <path d="M95,50 Q85,75 95,100 Q105,125 95,150" stroke="rgba(255,200,100,0.7)" stroke-width="2" fill="none"/>
      </svg>`,
      className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
      style: { pointerEvents: 'none' },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Filament dimming during burnout
      {
        id: 'filament-dim',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: burnoutDuration,
          mode: 'provider',
          targetIds: ['filament-graphic'],
          ranges: [
            { key: 'opacity', val: 0.9, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Filament glowing during incoming
      {
        id: 'filament-glow',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: incomingStart,
          duration: incomingExpandDuration,
          mode: 'provider',
          targetIds: ['filament-graphic'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 0.5, prog: 1 },
          ],
        },
      },
      // Swinging motion
      {
        id: 'filament-swing',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['filament-graphic'],
          ranges: [
            { key: 'rotate', val: -swingIntensity, prog: 0 },
            { key: 'rotate', val: swingIntensity, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Shadow simulation using duplicate video
  const shadowSimulation: RenderableComponentData = {
    id: 'shadow-duplicate-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      startFrom: outgoingVideo.startFrom || 0,
      endAt: outgoingVideo.endAt,
      muted: true,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        filter: 'blur(20px) brightness(0)',
        opacity: 0.5,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: burnoutDuration,
      },
    },
    effects: [
      {
        id: 'shadow-swing',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['shadow-duplicate-video'],
          ranges: [
            { key: 'translateX', val: -10, prog: 0 },
            { key: 'translateX', val: 10, prog: 0.5 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 5, prog: 0 },
            { key: 'translateY', val: -5, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const rootContainer: RenderableComponentData = {
    id: 'lightbulb-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      shadowSimulation,
      outgoingVideoNode,
      outgoingVignetteOverlay,
      flashOverlay,
      incomingVideoNode,
      incomingGlowOverlay,
      filamentGraphic,
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

const presetMetadata: PresetMetadata = {
  id: 'cinematic-lightbulb-burnout-transition',
  title: 'Cinematic Lightbulb Burnout Transition',
  description:
    'A dramatic transition effect simulating an old incandescent bulb failing between scenes. The outgoing video loses brightness from edges inward with desperate flickering, culminating in a bright flash before going dark. The incoming video "turns on" with a warm tungsten glow expanding from center with startup flickers that stabilize. Features filament-like overlay graphics, swinging bulb shadow play, and complete control over timing, intensity, and visual parameters.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'cinematic',
    'lightbulb',
    'burnout',
    'vintage',
    'dramatic',
    'flash',
    'glow',
    'filament',
    'retro',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      volume: 1,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      volume: 1,
    },
    transitionDuration: 2.5,
    burnoutDuration: 2,
    overlapDuration: 0.5,
    flickerIntensity: 0.7,
    flashIntensity: 1,
    glowColor: 'rgba(255, 200, 100, 0.8)',
    swingIntensity: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicLightbulbBurnoutTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
