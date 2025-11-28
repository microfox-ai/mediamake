/**
 * Crash Zoom Transition with Impact Effects
 *
 * This preset creates an aggressive crash zoom transition that combines Ken Burns effects
 * with violent impact elements. Features include:
 * - Outgoing video: Rapid acceleration from 100% to 200% scale with exponential blur (0-25px)
 * - Impact moment: Violent shake effect with brief white flash at overlap start
 * - Incoming video: Crashes in from 250% scale with 25px blur, decelerating with bounce-back
 * - Motion trails: 3 duplicate semi-transparent video layers with frame delays
 * - 0.6s aggressive overlap period with decreasing shake amplitude
 *
 * Technical implementation:
 * - Outgoing zoom: cubic-bezier(0.7,0,0.9,0.1) easing in final 0.5s
 * - Flash overlay: White div with 0→1→0 opacity over 0.1s
 * - Shake: Random translateX/Y ±20px→±5px over 0.6s overlap
 * - Incoming: ease-out-bounce from 250%→100% over 0.8s
 * - Trails: 0.3/0.2/0.1 opacity with 2/4/6 frame delays (at 30fps)
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    type: z
      .enum(['video', 'image'])
      .default('video')
      .describe('Type of outgoing media'),
  }),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z
      .enum(['video', 'image'])
      .default('video')
      .describe('Type of incoming media'),
  }),
  overlapDuration: z
    .number()
    .default(0.6)
    .describe('Duration of the overlap/transition period in seconds'),
  outgoingZoomDuration: z
    .number()
    .default(0.5)
    .describe('Duration of outgoing video zoom acceleration in seconds'),
  incomingZoomDuration: z
    .number()
    .default(0.8)
    .describe('Duration of incoming video zoom deceleration in seconds'),
  flashDuration: z
    .number()
    .default(0.1)
    .describe('Duration of the white flash effect in seconds'),
  shakeIntensityStart: z
    .number()
    .default(20)
    .describe('Initial shake amplitude in pixels (±20px)'),
  shakeIntensityEnd: z
    .number()
    .default(5)
    .describe('Final shake amplitude in pixels (±5px)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    overlapDuration,
    outgoingZoomDuration,
    incomingZoomDuration,
    flashDuration,
    shakeIntensityStart,
    shakeIntensityEnd,
  } = params;

  // Helper: Determine component ID based on media type
  const getComponentId = (type: 'video' | 'image'): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  // Helper: Generate random shake values for keyframes
  const generateShakeKeyframes = (
    startIntensity: number,
    endIntensity: number,
    progressPoints: number[],
  ): Array<{ key: string; val: string; prog: number }> => {
    const keyframes: Array<{ key: string; val: string; prog: number }> = [];

    progressPoints.forEach((prog) => {
      const intensity =
        startIntensity + (endIntensity - startIntensity) * prog;
      const randomX = (Math.random() - 0.5) * 2 * intensity;
      const randomY = (Math.random() - 0.5) * 2 * intensity;
      keyframes.push({
        key: 'translateX',
        val: `${randomX}px`,
        prog,
      });
      keyframes.push({
        key: 'translateY',
        val: `${randomY}px`,
        prog,
      });
    });

    return keyframes;
  };

  // Calculate timing
  const outgoingContainerDuration = overlapDuration + outgoingZoomDuration;
  const incomingContainerStart = outgoingZoomDuration; // Start of overlap
  const incomingContainerDuration = Math.max(incomingZoomDuration, overlapDuration);
  const totalDuration =
    outgoingZoomDuration + Math.max(overlapDuration, incomingZoomDuration);

  // Frame delays for trails at 30fps
  const frameDelay1 = 2 / 30; // 2 frames = 0.067s
  const frameDelay2 = 4 / 30; // 4 frames = 0.133s
  const frameDelay3 = 6 / 30; // 6 frames = 0.2s

  // ============================================================================
  // OUTGOING VIDEO EFFECTS
  // ============================================================================

  // Outgoing main video: zoom 100%→200%, blur 0→25px, shake
  const outgoingMainEffects = [
    // Zoom effect (cubic-bezier approximated with ease-out)
    {
      id: 'outgoing-zoom',
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: outgoingContainerDuration - outgoingZoomDuration,
        duration: outgoingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['outgoing-video-main'],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 2, prog: 1 },
        ],
      },
    },
    // Blur effect (exponential approximation)
    {
      id: 'outgoing-blur',
      componentId: 'generic' as const,
      data: {
        type: 'ease-in' as const,
        start: outgoingContainerDuration - outgoingZoomDuration,
        duration: outgoingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['outgoing-video-main'],
        ranges: [
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: 'blur(25px)', prog: 1 },
        ],
      },
    },
    // Shake effect during overlap
    {
      id: 'outgoing-shake',
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start: outgoingContainerDuration - overlapDuration,
        duration: overlapDuration,
        mode: 'provider' as const,
        targetIds: ['outgoing-video-main'],
        ranges: generateShakeKeyframes(
          shakeIntensityStart,
          shakeIntensityEnd,
          [0, 0.2, 0.4, 0.6, 0.8, 1],
        ),
      },
    },
  ];

  // Outgoing trail effects (similar but with delays)
  const outgoingTrail1Effects = [
    {
      id: 'outgoing-trail1-zoom',
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: outgoingContainerDuration - outgoingZoomDuration + frameDelay1,
        duration: outgoingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['outgoing-trail-1'],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 2, prog: 1 },
        ],
      },
    },
    {
      id: 'outgoing-trail1-blur',
      componentId: 'generic' as const,
      data: {
        type: 'ease-in' as const,
        start: outgoingContainerDuration - outgoingZoomDuration + frameDelay1,
        duration: outgoingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['outgoing-trail-1'],
        ranges: [
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: 'blur(25px)', prog: 1 },
        ],
      },
    },
  ];

  const outgoingTrail2Effects = [
    {
      id: 'outgoing-trail2-zoom',
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: outgoingContainerDuration - outgoingZoomDuration + frameDelay2,
        duration: outgoingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['outgoing-trail-2'],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 2, prog: 1 },
        ],
      },
    },
    {
      id: 'outgoing-trail2-blur',
      componentId: 'generic' as const,
      data: {
        type: 'ease-in' as const,
        start: outgoingContainerDuration - outgoingZoomDuration + frameDelay2,
        duration: outgoingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['outgoing-trail-2'],
        ranges: [
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: 'blur(25px)', prog: 1 },
        ],
      },
    },
  ];

  const outgoingTrail3Effects = [
    {
      id: 'outgoing-trail3-zoom',
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: outgoingContainerDuration - outgoingZoomDuration + frameDelay3,
        duration: outgoingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['outgoing-trail-3'],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 2, prog: 1 },
        ],
      },
    },
    {
      id: 'outgoing-trail3-blur',
      componentId: 'generic' as const,
      data: {
        type: 'ease-in' as const,
        start: outgoingContainerDuration - outgoingZoomDuration + frameDelay3,
        duration: outgoingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['outgoing-trail-3'],
        ranges: [
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: 'blur(25px)', prog: 1 },
        ],
      },
    },
  ];

  // ============================================================================
  // INCOMING VIDEO EFFECTS
  // ============================================================================

  // Incoming main video: zoom 250%→100%, blur 25px→0, shake
  const incomingMainEffects = [
    // Bounce-back zoom (using spring type)
    {
      id: 'incoming-zoom',
      componentId: 'generic' as const,
      data: {
        type: 'spring' as const,
        start: 0,
        duration: incomingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['incoming-video-main'],
        ranges: [
          { key: 'scale', val: 2.5, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    },
    // Blur deceleration
    {
      id: 'incoming-blur',
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: 0,
        duration: incomingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['incoming-video-main'],
        ranges: [
          { key: 'filter', val: 'blur(25px)', prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    },
    // Shake during overlap
    {
      id: 'incoming-shake',
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start: 0,
        duration: overlapDuration,
        mode: 'provider' as const,
        targetIds: ['incoming-video-main'],
        ranges: generateShakeKeyframes(
          shakeIntensityStart,
          shakeIntensityEnd,
          [0, 0.2, 0.4, 0.6, 0.8, 1],
        ),
      },
    },
  ];

  // Incoming trail effects
  const incomingTrail1Effects = [
    {
      id: 'incoming-trail1-zoom',
      componentId: 'generic' as const,
      data: {
        type: 'spring' as const,
        start: frameDelay1,
        duration: incomingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['incoming-trail-1'],
        ranges: [
          { key: 'scale', val: 2.5, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    },
    {
      id: 'incoming-trail1-blur',
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: frameDelay1,
        duration: incomingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['incoming-trail-1'],
        ranges: [
          { key: 'filter', val: 'blur(25px)', prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    },
  ];

  const incomingTrail2Effects = [
    {
      id: 'incoming-trail2-zoom',
      componentId: 'generic' as const,
      data: {
        type: 'spring' as const,
        start: frameDelay2,
        duration: incomingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['incoming-trail-2'],
        ranges: [
          { key: 'scale', val: 2.5, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    },
    {
      id: 'incoming-trail2-blur',
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: frameDelay2,
        duration: incomingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['incoming-trail-2'],
        ranges: [
          { key: 'filter', val: 'blur(25px)', prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    },
  ];

  const incomingTrail3Effects = [
    {
      id: 'incoming-trail3-zoom',
      componentId: 'generic' as const,
      data: {
        type: 'spring' as const,
        start: frameDelay3,
        duration: incomingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['incoming-trail-3'],
        ranges: [
          { key: 'scale', val: 2.5, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    },
    {
      id: 'incoming-trail3-blur',
      componentId: 'generic' as const,
      data: {
        type: 'ease-out' as const,
        start: frameDelay3,
        duration: incomingZoomDuration,
        mode: 'provider' as const,
        targetIds: ['incoming-trail-3'],
        ranges: [
          { key: 'filter', val: 'blur(25px)', prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    },
  ];

  // ============================================================================
  // FLASH OVERLAY EFFECT
  // ============================================================================

  const flashEffect = {
    id: 'flash-effect',
    componentId: 'generic' as const,
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: flashDuration,
      mode: 'provider' as const,
      targetIds: ['flash-overlay'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // ============================================================================
  // BUILD COMPONENT TREE
  // ============================================================================

  // Outgoing video trails and main
  const outgoingTrail3: RenderableComponentData = {
    id: 'outgoing-trail-3',
    type: 'atom' as const,
    componentId: getComponentId(outgoingVideo.type),
    data: {
      src: outgoingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        opacity: 0.1,
      },
    },
    context: {
      timing: {
        start: frameDelay3,
        duration: outgoingContainerDuration - frameDelay3,
      },
    },
    effects: outgoingTrail3Effects,
  };

  const outgoingTrail2: RenderableComponentData = {
    id: 'outgoing-trail-2',
    type: 'atom' as const,
    componentId: getComponentId(outgoingVideo.type),
    data: {
      src: outgoingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        opacity: 0.2,
      },
    },
    context: {
      timing: {
        start: frameDelay2,
        duration: outgoingContainerDuration - frameDelay2,
      },
    },
    effects: outgoingTrail2Effects,
  };

  const outgoingTrail1: RenderableComponentData = {
    id: 'outgoing-trail-1',
    type: 'atom' as const,
    componentId: getComponentId(outgoingVideo.type),
    data: {
      src: outgoingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        opacity: 0.3,
      },
    },
    context: {
      timing: {
        start: frameDelay1,
        duration: outgoingContainerDuration - frameDelay1,
      },
    },
    effects: outgoingTrail1Effects,
  };

  const outgoingVideoMain: RenderableComponentData = {
    id: 'outgoing-video-main',
    type: 'atom' as const,
    componentId: getComponentId(outgoingVideo.type),
    data: {
      src: outgoingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingContainerDuration,
      },
    },
    effects: outgoingMainEffects,
  };

  const outgoingContainer: RenderableComponentData = {
    id: 'outgoing-video-container',
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
        duration: outgoingContainerDuration,
      },
    },
    childrenData: [
      outgoingTrail3,
      outgoingTrail2,
      outgoingTrail1,
      outgoingVideoMain,
    ],
  };

  // Flash overlay
  const flashOverlay: RenderableComponentData = {
    id: 'flash-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 100%; height: 100%; background: white;'></div>",
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: incomingContainerStart,
        duration: flashDuration,
      },
    },
    effects: [flashEffect],
  };

  // Incoming video trails and main
  const incomingTrail3: RenderableComponentData = {
    id: 'incoming-trail-3',
    type: 'atom' as const,
    componentId: getComponentId(incomingVideo.type),
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        opacity: 0.1,
      },
    },
    context: {
      timing: {
        start: frameDelay3,
        duration: incomingContainerDuration - frameDelay3,
      },
    },
    effects: incomingTrail3Effects,
  };

  const incomingTrail2: RenderableComponentData = {
    id: 'incoming-trail-2',
    type: 'atom' as const,
    componentId: getComponentId(incomingVideo.type),
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        opacity: 0.2,
      },
    },
    context: {
      timing: {
        start: frameDelay2,
        duration: incomingContainerDuration - frameDelay2,
      },
    },
    effects: incomingTrail2Effects,
  };

  const incomingTrail1: RenderableComponentData = {
    id: 'incoming-trail-1',
    type: 'atom' as const,
    componentId: getComponentId(incomingVideo.type),
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        opacity: 0.3,
      },
    },
    context: {
      timing: {
        start: frameDelay1,
        duration: incomingContainerDuration - frameDelay1,
      },
    },
    effects: incomingTrail1Effects,
  };

  const incomingVideoMain: RenderableComponentData = {
    id: 'incoming-video-main',
    type: 'atom' as const,
    componentId: getComponentId(incomingVideo.type),
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: incomingContainerDuration,
      },
    },
    effects: incomingMainEffects,
  };

  const incomingContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: incomingContainerStart,
        duration: incomingContainerDuration,
      },
    },
    childrenData: [
      incomingTrail3,
      incomingTrail2,
      incomingTrail1,
      incomingVideoMain,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'crash-zoom-transition-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [outgoingContainer, flashOverlay, incomingContainer],
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'crash-zoom-transition',
  title: 'Crash Zoom Transition with Impact Effects',
  description:
    'Aggressive crash zoom transition combining Ken Burns with impact effects. Features outgoing video rapidly accelerating from 100% to 200% scale with exponential blur, violent shake at impact moment with white flash, and incoming video crashing in from 250% scale with bounce-back deceleration. Includes motion trail effects using semi-transparent duplicate video layers with frame delays during 0.6s overlap period.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'crash-zoom',
    'ken-burns',
    'impact',
    'shake',
    'flash',
    'motion-trails',
    'aggressive',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
    },
    overlapDuration: 0.6,
    outgoingZoomDuration: 0.5,
    incomingZoomDuration: 0.8,
    flashDuration: 0.1,
    shakeIntensityStart: 20,
    shakeIntensityEnd: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const crashZoomTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
