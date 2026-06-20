/**
 * Cyberpunk Hologram Glitch Transition
 *
 * A futuristic holographic glitch transition effect for videos featuring scan lines,
 * chromatic aberration, holographic flicker, and blue/cyan tinting. Videos transition
 * through holographic interference patterns with RGB channel separation and perspective distortion.
 *
 * Features:
 * - Holographic scan lines with vertical movement animation
 * - RGB chromatic aberration with dynamic channel offsets
 * - Holographic flicker with sharp on/off effect using steps easing
 * - Perspective rotation oscillation for depth effect
 * - Blue/cyan tinting and glow effects
 * - Smooth opacity transitions with glitch interference
 * - 1.3-second overlap period with synchronized effects
 *
 * Use cases:
 * - Tech/cyberpunk video transitions
 * - Futuristic content creation
 * - Gaming video effects
 * - Sci-fi storytelling
 * - Digital glitch aesthetics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video to transition from'),
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video to transition to'),
  transitionDuration: z
    .number()
    .default(1.3)
    .describe('Duration of the transition overlap in seconds'),
  flickerIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Intensity of holographic flicker effect (0-1)'),
  chromaticAberrationIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(3)
    .optional()
    .describe('Maximum pixel offset for RGB channel separation (0-5px)'),
  perspectiveRotation: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Maximum rotation angle in degrees for perspective effect (0-10)'),
  scanLineSpeed: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .optional()
    .describe('Speed multiplier for scan line animation (0.5-5)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration } = params;
  const flickerIntensity = params.flickerIntensity ?? 0.8;
  const chromaticIntensity = params.chromaticAberrationIntensity ?? 3;
  const perspectiveRotation = params.perspectiveRotation ?? 2;
  const scanLineSpeed = params.scanLineSpeed ?? 2;

  // Calculate total duration
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Transition timing
  const transitionStart = video1.duration - transitionDuration;

  // Build child components
  const childrenData: RenderableComponentData[] = [];

  // ===== OUTGOING VIDEO CONTAINER =====
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: [
      // Outgoing video
      {
        id: 'outgoing-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
        effects: [
          // Opacity fade with glitch keyframes
          {
            id: 'outgoing-opacity-fade',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: transitionStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.15 },
                { key: 'opacity', val: 0.3, prog: 0.5 },
                { key: 'opacity', val: 0.8, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
          // Blue tint filter
          {
            id: 'outgoing-blue-tint',
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: transitionStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'filter', val: 'hue-rotate(0deg) saturate(1)', prog: 0 },
                {
                  key: 'filter',
                  val: 'hue-rotate(180deg) saturate(1.5)',
                  prog: 1,
                },
              ],
            },
          },
          // Perspective rotation oscillation
          {
            id: 'outgoing-perspective-rotation',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: transitionStart,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-video'],
              ranges: [
                { key: 'rotateY', val: 0, prog: 0 },
                { key: 'rotateY', val: -perspectiveRotation, prog: 0.25 },
                { key: 'rotateY', val: perspectiveRotation, prog: 0.5 },
                { key: 'rotateY', val: -perspectiveRotation, prog: 0.75 },
                { key: 'rotateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Chromatic aberration layers for outgoing video
      {
        id: 'outgoing-chromatic-r',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width:100%;height:100%;"></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: 'rgba(255, 0, 0, 0.3)',
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: transitionStart,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'outgoing-chromatic-r-offset',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-chromatic-r'],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: chromaticIntensity, prog: 0.5 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -chromaticIntensity * 0.5, prog: 0.5 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      {
        id: 'outgoing-chromatic-g',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width:100%;height:100%;"></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: 'rgba(0, 255, 0, 0.3)',
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: transitionStart,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'outgoing-chromatic-g-offset',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-chromatic-g'],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: -chromaticIntensity * 0.5, prog: 0.5 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: chromaticIntensity * 0.7, prog: 0.5 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      {
        id: 'outgoing-chromatic-b',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width:100%;height:100%;"></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: 'rgba(0, 0, 255, 0.3)',
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: transitionStart,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'outgoing-chromatic-b-offset',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['outgoing-chromatic-b'],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: chromaticIntensity * 0.8, prog: 0.5 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: chromaticIntensity, prog: 0.5 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  childrenData.push(outgoingVideoContainer);

  // ===== INCOMING VIDEO CONTAINER =====
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: video2.duration + transitionDuration,
      },
    },
    childrenData: [
      // Incoming video
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          fit: 'cover',
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: video2.duration + transitionDuration,
          },
        },
        effects: [
          // Opacity fade-in with glitch
          {
            id: 'incoming-opacity-fade',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.2, prog: 0.3 },
                { key: 'opacity', val: 0.8, prog: 0.5 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          // Perspective rotation oscillation
          {
            id: 'incoming-perspective-rotation',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-video'],
              ranges: [
                { key: 'rotateY', val: perspectiveRotation, prog: 0 },
                { key: 'rotateY', val: -perspectiveRotation, prog: 0.33 },
                { key: 'rotateY', val: perspectiveRotation, prog: 0.66 },
                { key: 'rotateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Chromatic aberration layers for incoming video
      {
        id: 'incoming-chromatic-r',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width:100%;height:100%;"></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: 'rgba(255, 0, 0, 0.3)',
            mixBlendMode: 'screen',
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
            id: 'incoming-chromatic-r-offset',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-chromatic-r'],
              ranges: [
                { key: 'translateX', val: chromaticIntensity, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: -chromaticIntensity * 0.5, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      {
        id: 'incoming-chromatic-g',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width:100%;height:100%;"></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: 'rgba(0, 255, 0, 0.3)',
            mixBlendMode: 'screen',
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
            id: 'incoming-chromatic-g-offset',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-chromatic-g'],
              ranges: [
                { key: 'translateX', val: -chromaticIntensity * 0.5, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: chromaticIntensity * 0.7, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      {
        id: 'incoming-chromatic-b',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width:100%;height:100%;"></div>',
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: 'rgba(0, 0, 255, 0.3)',
            mixBlendMode: 'screen',
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
            id: 'incoming-chromatic-b-offset',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['incoming-chromatic-b'],
              ranges: [
                { key: 'translateX', val: chromaticIntensity * 0.8, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'translateY', val: chromaticIntensity, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  childrenData.push(incomingVideoContainer);

  // ===== SCAN LINES OVERLAY =====
  const scanLineAnimationDuration = 3 / scanLineSpeed;
  const scanLinesOverlay: RenderableComponentData = {
    id: 'scan-lines-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width:100%;height:100%;background:repeating-linear-gradient(0deg,transparent 0px,rgba(0,255,255,0.1) 2px,transparent 4px);"></div>',
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      // Scan line vertical movement (looping)
      {
        id: 'scan-lines-movement',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: scanLineAnimationDuration,
          mode: 'provider',
          targetIds: ['scan-lines-overlay'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: 100, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(scanLinesOverlay);

  // ===== HOLOGRAPHIC GLOW OVERLAY (during transition) =====
  const holographicGlowOverlay: RenderableComponentData = {
    id: 'holographic-glow-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width:100%;height:100%;"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        boxShadow: '0 0 30px rgba(0, 255, 255, 0.5)',
        backgroundColor: 'rgba(0, 255, 255, 0.05)',
      },
    },
    context: {
      timing: {
        start: transitionStart,
        duration: transitionDuration,
      },
    },
    effects: [
      // Holographic flicker with steps easing
      {
        id: 'holographic-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['holographic-glow-overlay'],
          ranges: [
            { key: 'opacity', val: flickerIntensity, prog: 0 },
            { key: 'opacity', val: 0.2, prog: 0.1 },
            { key: 'opacity', val: flickerIntensity, prog: 0.2 },
            { key: 'opacity', val: 0.2, prog: 0.3 },
            { key: 'opacity', val: flickerIntensity, prog: 0.4 },
            { key: 'opacity', val: 0.2, prog: 0.5 },
            { key: 'opacity', val: flickerIntensity, prog: 0.6 },
            { key: 'opacity', val: 0.2, prog: 0.7 },
            { key: 'opacity', val: flickerIntensity, prog: 0.8 },
            { key: 'opacity', val: 0.2, prog: 0.9 },
            { key: 'opacity', val: flickerIntensity, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(holographicGlowOverlay);

  // ===== ROOT CONTAINER =====
  const rootContainer: RenderableComponentData = {
    id: 'cyberpunk-hologram-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-gray-950 overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
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
  id: 'cyberpunk-hologram-glitch-transition',
  title: 'Cyberpunk Hologram Glitch Transition',
  description:
    'A futuristic holographic glitch transition effect for videos featuring scan lines, chromatic aberration, holographic flicker, and blue/cyan tinting. Videos transition through holographic interference patterns with RGB channel separation and perspective distortion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'cyberpunk',
    'hologram',
    'glitch',
    'futuristic',
    'sci-fi',
    'chromatic-aberration',
    'scan-lines',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 1.3,
    flickerIntensity: 0.8,
    chromaticAberrationIntensity: 3,
    perspectiveRotation: 2,
    scanLineSpeed: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const cyberpunkHologramGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
