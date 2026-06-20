/**
 * CRT Phosphor Burn-In Transition Preset
 *
 * This preset simulates the classic CRT monitor effect where bright areas of an outgoing video
 * leave a ghostly afterimage (phosphor burn-in) that slowly fades while the incoming video
 * materializes. The effect replicates the phosphor persistence of vintage CRT displays, complete
 * with horizontal scan lines, degaussing warps with color shifts, and electromagnetic interference.
 *
 * Features:
 * - **Phosphor Burn-In**: Duplicate outgoing video with brightness/contrast filter creates
 *   a ghostly afterimage that persists longer than the main outgoing video
 * - **Horizontal Scan Lines**: Repeating linear-gradient overlay that sweeps across during transition
 * - **Degaussing Effect**: Both videos use sinusoidal rotate3d transforms with hue-rotate filters
 *   that animate from 0 to 180deg back to 0, simulating magnetic field distortion
 * - **EMI Pattern**: SVG-based radial gradient with pulsing scale animation and color-dodge blend mode
 *   creates electromagnetic interference distortion throughout the 1.0s overlap
 * - **Provider Mode Effects**: All animations use provider mode with targetIds for synchronized effects
 *
 * Technical Implementation:
 * - BaseLayout duration accounts for 1.0s overlap between videos
 * - Outgoing video has two layers: main (fades 0.5s) and burn-in duplicate (fades 1.5s)
 * - Burn-in layer uses brightness(2) contrast(0.5) filter at lower z-index with screen blend
 * - Scan lines use translateY animation sweeping across frame
 * - Degaussing applies to both videos during first 0.6s with sinusoidal easing
 * - EMI pattern pulses with scale animation throughout 1.0s overlap
 *
 * Use Cases:
 * - Retro video transitions with vintage CRT aesthetics
 * - Nostalgic gaming or tech-themed content
 * - Creative transitions for retro/synthwave styled videos
 * - Simulating old monitor effects in modern compositions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Zod Parameter Schema ---

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('The video that is transitioning out'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('The video that is transitioning in'),
  
  overlapDuration: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.0)
    .describe('Duration of the overlap period where both videos are visible (seconds)'),
  
  trackName: z
    .string()
    .default('crt-transition')
    .optional()
    .describe('Name identifier for the transition track'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, overlapDuration, trackName } = params;
  
  // Calculate total duration: sum of both videos minus overlap
  const totalDuration = outgoingVideo.duration + incomingVideo.duration - overlapDuration;
  
  // Timing breakpoints
  const outgoingEnd = outgoingVideo.duration;
  const incomingStart = outgoingVideo.duration - overlapDuration;
  const transitionStart = incomingStart;
  const transitionEnd = outgoingEnd;
  
  // Effect durations
  const outgoingMainFadeDuration = 0.5;
  const outgoingBurnInFadeDuration = 1.5;
  const degaussDuration = 0.6;
  
  // --- Child Components ---
  
  const childrenData: RenderableComponentData[] = [];
  
  // 1. Outgoing Video - Main Layer
  childrenData.push({
    id: `${trackName}-outgoing-main`,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      // Fade out effect during last 0.5s
      {
        id: `${trackName}-outgoing-main-fadeout`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingVideo.duration - outgoingMainFadeDuration,
          duration: outgoingMainFadeDuration,
          mode: 'provider',
          targetIds: [`${trackName}-outgoing-main`],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Degaussing effect: rotate3d warp with hue-rotate
      {
        id: `${trackName}-outgoing-main-degauss`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStart,
          duration: degaussDuration,
          mode: 'provider',
          targetIds: [`${trackName}-outgoing-main`],
          ranges: [
            // Rotate3d sinusoidal warp
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: 2, prog: 0.25 },
            { key: 'rotateX', val: 0, prog: 0.5 },
            { key: 'rotateX', val: -2, prog: 0.75 },
            { key: 'rotateX', val: 0, prog: 1 },
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -3, prog: 0.25 },
            { key: 'rotateY', val: 0, prog: 0.5 },
            { key: 'rotateY', val: 3, prog: 0.75 },
            { key: 'rotateY', val: 0, prog: 1 },
            // Hue-rotate color shift: 0 → 180 → 0
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
            { key: 'filter', val: 'hue-rotate(180deg)', prog: 0.5 },
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);
  
  // 2. Outgoing Video - Burn-In Layer (Phosphor Ghost)
  childrenData.push({
    id: `${trackName}-outgoing-burnin`,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideo.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        zIndex: 5,
        filter: 'brightness(2) contrast(0.5)',
        mixBlendMode: 'screen',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      // Extended fade out over 1.5s (phosphor persistence)
      {
        id: `${trackName}-outgoing-burnin-fadeout`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: outgoingVideo.duration - outgoingBurnInFadeDuration,
          duration: outgoingBurnInFadeDuration,
          mode: 'provider',
          targetIds: [`${trackName}-outgoing-burnin`],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);
  
  // 3. Incoming Video
  childrenData.push({
    id: `${trackName}-incoming-main`,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideo.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
      style: {
        zIndex: 15,
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: incomingVideo.duration + overlapDuration,
      },
    },
    effects: [
      // Fade in during 1.0s overlap
      {
        id: `${trackName}-incoming-main-fadein`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [`${trackName}-incoming-main`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Degaussing effect
      {
        id: `${trackName}-incoming-main-degauss`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: degaussDuration,
          mode: 'provider',
          targetIds: [`${trackName}-incoming-main`],
          ranges: [
            // Rotate3d sinusoidal warp
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: -2, prog: 0.25 },
            { key: 'rotateX', val: 0, prog: 0.5 },
            { key: 'rotateX', val: 2, prog: 0.75 },
            { key: 'rotateX', val: 0, prog: 1 },
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 3, prog: 0.25 },
            { key: 'rotateY', val: 0, prog: 0.5 },
            { key: 'rotateY', val: -3, prog: 0.75 },
            { key: 'rotateY', val: 0, prog: 1 },
            // Hue-rotate color shift: 0 → 180 → 0
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
            { key: 'filter', val: 'hue-rotate(180deg)', prog: 0.5 },
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);
  
  // 4. Scan Lines Overlay
  childrenData.push({
    id: `${trackName}-scanlines`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 20,
          background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: overlapDuration,
      },
    },
    effects: [
      // Sweep across screen during transition
      {
        id: `${trackName}-scanlines-sweep`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [`${trackName}-scanlines`],
          ranges: [
            { key: 'translateY', val: '-100%', prog: 0 },
            { key: 'translateY', val: '100%', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  } as RenderableComponentData);
  
  // 5. EMI Pattern Overlay (Electromagnetic Interference)
  childrenData.push({
    id: `${trackName}-emi-pattern`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <svg width="100%" height="100%" style="position: absolute; top: 0; left: 0;">
          <defs>
            <radialGradient id="${trackName}-emi-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="rgba(100,200,255,0.15)" />
              <stop offset="70%" stop-color="rgba(100,200,255,0.05)" />
              <stop offset="100%" stop-color="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>
          <ellipse cx="50%" cy="50%" rx="40%" ry="40%" fill="url(#${trackName}-emi-gradient)" />
        </svg>
      `,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        zIndex: 25,
        mixBlendMode: 'color-dodge',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: overlapDuration,
      },
    },
    effects: [
      // Pulsing scale animation
      {
        id: `${trackName}-emi-pulse`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: [`${trackName}-emi-pattern`],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.15, prog: 0.25 },
            { key: 'scale', val: 0.95, prog: 0.5 },
            { key: 'scale', val: 1.1, prog: 0.75 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData);
  
  // --- Root Container ---
  
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-crt-transition-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000',
        },
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
  
  // --- Return Output ---
  
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
  id: 'crt-phosphor-burnin-transition',
  title: 'CRT Phosphor Burn-In Transition',
  description: 'A retro CRT monitor transition effect featuring phosphor burn-in afterimages, horizontal scan lines, degaussing warps with color shifts, and electromagnetic interference patterns. The outgoing video leaves a ghostly bright afterimage that persists longer than the main image, while the incoming video materializes through the CRT static. The 1.0 second overlap creates an authentic vintage monitor feel with pulsing EMI distortion.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'crt', 'retro', 'vintage', 'phosphor', 'burn-in', 'degauss', 'scanlines', 'emi', 'monitor', 'video'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 1.0,
    trackName: 'crt-transition',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const crtPhosphorBurninTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};