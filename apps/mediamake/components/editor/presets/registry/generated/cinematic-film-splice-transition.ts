/**
 * Cinematic Film Splice Transition Preset
 *
 * This preset creates an authentic film splice transition effect that mimics the physical cutting
 * and splicing of celluloid film strips. It produces the illusion that the outgoing video is being
 * physically cut with visible splice marks, tape edges, and frame jumps characteristic of hand-spliced film.
 *
 * Features:
 * - **Frame Stutter Effect**: Last few frames of outgoing video appear to stutter and jump with rapid opacity flickers and position shifts
 * - **Black Film Leader**: 2-3 frames of black/clear film leader appear during the splice moment
 * - **Splice Tape Overlay**: Semi-transparent procedural splice tape texture with gradient and shadow effects
 * - **Registration Marks**: Brief frame registration marks that flash during the splice
 * - **Gate Weave Movement**: Subtle sine-wave movement on both videos simulating film projector gate weave
 * - **Dust Particles**: Period-appropriate dust particles that accumulate and drift near the splice point
 * - **Hard Cut Feel**: Quick 0.3-second transition with minimal overlap for authentic film cutting experience
 *
 * Technical Specifications:
 * - BaseLayout with minimal 0.3s transition window for hard-cut feel
 * - Outgoing VideoAtom plays until splice point with stutter effect: opacity keyframes [100%, 0%, 100%, 50%, 0%] over final 0.2s
 * - Position shifts: transform translateX random shifts (-2px to 2px) during stutter
 * - Black leader: HTMLBlockAtom with black fill, appears for 0.1s during transition
 * - Incoming VideoAtom starts immediately after leader
 * - Splice tape overlay: HTMLBlockAtom with procedural CSS gradient tape texture, absolute positioning at transition point, opacity 0.6
 * - Gate weave: Both videos have subtle transform animations (translateX and translateY ±1-2px on sine wave pattern)
 * - Dust particles: 3-4 small HTMLBlockAtom elements with procedural dust, animated opacity and drift movement
 *
 * Use cases:
 * - Creating retro film transition effects
 * - Building vintage documentary-style edits
 * - Adding authentic analog film aesthetics to digital videos
 * - Simulating hand-edited film reels
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
    fit: z
      .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
      .default('cover')
      .optional()
      .describe('How the outgoing video should fit in the container'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
    fit: z
      .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
      .default('cover')
      .optional()
      .describe('How the incoming video should fit in the container'),
  }),
  transitionDuration: z
    .number()
    .default(0.3)
    .describe(
      'Duration of the transition window in seconds (includes stutter + black leader)',
    ),
  stutterDuration: z
    .number()
    .default(0.2)
    .describe('Duration of the frame stutter effect at the end of outgoing video'),
  blackLeaderDuration: z
    .number()
    .default(0.1)
    .describe('Duration of black film leader frames'),
  gateWeaveIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .optional()
    .describe('Intensity multiplier for gate weave movement (0-3)'),
  dustParticleCount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .optional()
    .describe('Number of dust particles near splice point (0-10)'),
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
    stutterDuration,
    blackLeaderDuration,
    gateWeaveIntensity = 1,
    dustParticleCount = 3,
  } = params;

  // Calculate timing
  const outgoingDuration = outgoingVideo.duration;
  const incomingDuration = incomingVideo.duration;
  const spliceStartTime = outgoingDuration - stutterDuration;
  const blackLeaderStartTime = outgoingDuration;
  const incomingStartTime = outgoingDuration + blackLeaderDuration;

  // Total composition duration
  const totalDuration = outgoingDuration + blackLeaderDuration + incomingDuration;

  // Gate weave parameters
  const weaveAmplitudeX = 1.5 * gateWeaveIntensity;
  const weaveAmplitudeY = 1.0 * gateWeaveIntensity;

  // Helper: Create gate weave effect for a video
  const createGateWeaveEffect = (targetId: string, duration: number) => {
    return [
      {
        id: `gate-weave-x-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: duration,
          mode: 'provider' as const,
          targetIds: [targetId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: weaveAmplitudeX, prog: 0.25 },
            { key: 'translateX', val: 0, prog: 0.5 },
            { key: 'translateX', val: -weaveAmplitudeX, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: `gate-weave-y-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: duration,
          mode: 'provider' as const,
          targetIds: [targetId],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -weaveAmplitudeY, prog: 0.33 },
            { key: 'translateY', val: 0, prog: 0.66 },
            { key: 'translateY', val: weaveAmplitudeY, prog: 1 },
          ],
        },
      },
    ];
  };

  // Outgoing video with stutter effect
  const outgoingVideoNode: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      fit: outgoingVideo.fit ?? 'cover',
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingDuration,
      },
    },
    effects: [
      // Stutter opacity effect
      {
        id: 'stutter-opacity',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: spliceStartTime,
          duration: stutterDuration,
          mode: 'provider' as const,
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.25 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.5, prog: 0.75 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Stutter position shift
      {
        id: 'stutter-position',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: spliceStartTime,
          duration: stutterDuration,
          mode: 'provider' as const,
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -2, prog: 0.2 },
            { key: 'translateX', val: 2, prog: 0.4 },
            { key: 'translateX', val: -1, prog: 0.6 },
            { key: 'translateX', val: 1, prog: 0.8 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      // Gate weave effects
      ...createGateWeaveEffect('outgoing-video', outgoingDuration),
    ],
  };

  // Black film leader
  const blackLeaderNode: RenderableComponentData = {
    id: 'black-leader',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 100%; height: 100%; background: #000000;'></div>",
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: blackLeaderStartTime,
        duration: blackLeaderDuration,
      },
    },
  };

  // Incoming video
  const incomingVideoNode: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      fit: incomingVideo.fit ?? 'cover',
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingDuration,
      },
    },
    effects: [
      // Gate weave effects
      ...createGateWeaveEffect('incoming-video', incomingDuration),
    ],
  };

  // Splice overlay container (appears during transition)
  const spliceOverlayStartTime = spliceStartTime - 0.05;
  const spliceOverlayDuration = 0.15;

  // Splice tape overlay
  const spliceTapeNode: RenderableComponentData = {
    id: 'splice-tape-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style='width: 100%; height: 8px; background: linear-gradient(90deg, rgba(220,220,180,0.6) 0%, rgba(240,240,200,0.7) 20%, rgba(220,220,180,0.6) 40%, rgba(200,200,160,0.5) 60%, rgba(220,220,180,0.6) 80%, rgba(240,240,200,0.7) 100%); box-shadow: inset 0 1px 2px rgba(0,0,0,0.3), 0 1px 1px rgba(255,255,255,0.2); border-top: 1px solid rgba(180,180,140,0.4); border-bottom: 1px solid rgba(180,180,140,0.4);'></div>`,
      className: 'absolute left-0 right-0',
      style: {
        top: '50%',
        transform: 'translateY(-50%)',
      },
    },
    context: {
      timing: {
        start: spliceOverlayStartTime,
        duration: spliceOverlayDuration,
      },
    },
    effects: [
      {
        id: 'splice-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: spliceOverlayDuration,
          mode: 'provider' as const,
          targetIds: ['splice-tape-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6, prog: 0.3 },
            { key: 'opacity', val: 0.6, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Registration marks
  const registrationMarksNode: RenderableComponentData = {
    id: 'registration-marks',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style='width: 100%; height: 100%;'><div style='position: absolute; left: 2%; top: 50%; width: 20px; height: 2px; background: rgba(255,255,255,0.6); transform: translateY(-50%);'></div><div style='position: absolute; right: 2%; top: 50%; width: 20px; height: 2px; background: rgba(255,255,255,0.6); transform: translateY(-50%);'></div></div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: spliceOverlayStartTime,
        duration: 0.08,
      },
    },
    effects: [
      {
        id: 'registration-flash',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: 0.08,
          mode: 'provider' as const,
          targetIds: ['registration-marks'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Dust particles
  const dustParticles: RenderableComponentData[] = [];
  for (let i = 0; i < dustParticleCount; i++) {
    const dustId = `dust-particle-${i + 1}`;
    const leftPos = 48 + (i * 2) % 5;
    const topPos = 48 + (i * 3) % 7;
    const size = 2 + (i % 2) * 0.5;
    const driftX = (i % 2 === 0 ? 1 : -1) * (3 + i);
    const driftY = (i % 3) - 1;

    dustParticles.push({
      id: dustId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width: ${size}px; height: ${size}px; background: rgba(200, 200, 200, 0.4); border-radius: 50%;'></div>`,
        className: 'absolute',
        style: {
          left: `${leftPos}%`,
          top: `${topPos}%`,
        },
      },
      context: {
        timing: {
          start: spliceOverlayStartTime,
          duration: spliceOverlayDuration,
        },
      },
      effects: [
        {
          id: `dust-drift-${i + 1}`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: 0,
            duration: spliceOverlayDuration,
            mode: 'provider' as const,
            targetIds: [dustId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5 + i * 0.05, prog: 0.2 },
              { key: 'opacity', val: 0.3 + i * 0.05, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: driftX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: driftY, prog: 1 },
            ],
          },
        },
      ],
    });
  }

  // Splice overlay container
  const spliceOverlayContainer: RenderableComponentData = {
    id: 'splice-overlay-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: spliceOverlayStartTime,
        duration: spliceOverlayDuration,
      },
    },
    childrenData: [spliceTapeNode, registrationMarksNode, ...dustParticles],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'film-splice-transition-container',
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
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideoNode,
      spliceOverlayContainer,
      blackLeaderNode,
      incomingVideoNode,
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
  id: 'cinematic-film-splice-transition',
  title: 'Cinematic Film Splice Transition',
  description:
    'Creates an authentic film splice transition effect with stuttering frames, black film leader, procedural splice tape texture, gate weave movement, and dust particles. All visual effects are generated procedurally without external assets using HTMLBlockAtom components.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'film', 'splice', 'cinematic', 'vintage', 'retro'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
      fit: 'cover',
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
      fit: 'cover',
    },
    transitionDuration: 0.3,
    stutterDuration: 0.2,
    blackLeaderDuration: 0.1,
    gateWeaveIntensity: 1,
    dustParticleCount: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cinematicFilmSpliceTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
